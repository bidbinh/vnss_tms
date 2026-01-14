"""
AI-powered order parsing service with automatic customer assignment and site creation.

This service uses multi-provider AI (Gemini/Claude/OpenAI) to parse order text
and automatically match customers based on pickup/delivery locations.
"""

import logging
from typing import Dict, List, Optional
from uuid import uuid4

from sqlmodel import Session, select

from app.models.site import Site
from app.models.customer import Customer
from app.services.ai_assistant import AIAssistant

logger = logging.getLogger(__name__)


class OrderAIParser:
    """
    Specialized parser for order text extraction with AI-powered customer matching.

    Features:
    - Multi-provider AI support (Gemini Flash for cost optimization)
    - Automatic customer assignment based on site matching
    - Auto-create sites for new locations
    - Fuzzy matching for addresses and company names
    """

    def __init__(self, db_session: Session, tenant_id: str, user_id: str):
        self.ai = AIAssistant(db_session=db_session, tenant_id=tenant_id, user_id=user_id)
        self.db = db_session
        self.tenant_id = tenant_id
        self.user_id = user_id

    async def parse_orders_with_customer_match(
        self,
        text: str,
        customers: List[Dict],
        sites: List[Dict],
        preferred_provider: str = "gemini"
    ) -> Dict:
        """
        Parse order text with AI and auto-assign customers based on site matching.

        Args:
            text: Raw order text (can be multiple orders, one per line)
            customers: List of customer dicts with id, code, name, address
            sites: List of site dicts with id, code, company_name, detailed_address
            preferred_provider: "gemini" (default), "claude", or "openai"

        Returns:
            {
                "success": True,
                "order_data": [
                    {
                        "line_number": 1,
                        "driver_name": "A Tuyến",
                        "pickup_text": "CHÙA VẼ",
                        "delivery_text": "An Tảo, Hưng Yên",
                        "container_code": "GAOU6458814",
                        "equipment": "40",
                        "customer_id": "uuid-123",  # AUTO-ASSIGNED
                        "customer_match_confidence": 0.95,
                        "ambiguous": False,
                        "pickup_site_id": "site-uuid-1",
                        "delivery_site_id": "site-uuid-2",
                        "pickup_date": "2024-12-23",
                        "delivery_date": "2024-12-24",
                        "delivery_shift": "morning",
                        "cargo_note": "HDPE-VN H5604F; 24.75T/cont",
                        ...
                    }
                ],
                "provider_used": "gemini",
                "cost_estimate": 0.0001
            }
        """
        try:
            # Build enriched context for AI
            enriched_customers = self._enrich_customers_with_sites(customers, sites)
            context = {
                "customers": enriched_customers,
                "sites": sites,
                "task": "order_extraction_with_customer_match",
                "auto_create_sites": True  # Enable site auto-creation
            }

            # Call AI with cost optimization (default to Gemini Flash)
            logger.info(f"Parsing orders with AI (provider: {preferred_provider})")
            result = self.ai.extract_order_info(
                message=text,
                context=context
            )

            if not result.get("success"):
                return {
                    "success": False,
                    "error": result.get("error", "AI parsing failed"),
                    "order_data": []
                }

            # Post-process: validate and enrich
            orders = result.get("order_data", [])
            for order in orders:
                # Validate customer exists
                if order.get("customer_id"):
                    if not self._validate_customer_exists(order["customer_id"], customers):
                        logger.warning(f"Invalid customer_id: {order['customer_id']}")
                        order["customer_id"] = None
                        order["ambiguous"] = True

                # Handle site matching/creation
                await self._process_sites(order, sites)

            return {
                "success": True,
                "order_data": orders,
                "provider_used": result.get("provider", "unknown"),
                "cost_estimate": result.get("cost", 0.0)
            }

        except Exception as e:
            logger.error(f"Error parsing orders with AI: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "order_data": []
            }

    async def _process_sites(self, order: Dict, sites: List[Dict]):
        """Process pickup and delivery sites - match existing or create new."""
        for site_type in ["pickup", "delivery"]:
            site_text = order.get(f"{site_type}_text", "")
            if not site_text:
                continue

            # Try to match existing site
            matched_site = self._fuzzy_match_site(site_text, sites)

            if matched_site:
                order[f"{site_type}_site_id"] = matched_site["id"]
            else:
                # Auto-create new site
                site_data = order.get(f"{site_type}_site_data", {})
                if site_data:
                    new_site = await self._create_site_from_ai_data(
                        site_data,
                        site_text,
                        site_type.upper()
                    )
                    if new_site:
                        order[f"{site_type}_site_id"] = str(new_site.id)
                        logger.info(f"Created new {site_type} site: {new_site.company_name}")

    def _fuzzy_match_site(self, site_text: str, sites: List[Dict]) -> Optional[Dict]:
        """Fuzzy match site text to existing sites."""
        site_text_lower = site_text.lower().strip()

        # First: try exact code match
        for site in sites:
            if site.get("code", "").lower() == site_text_lower:
                return site

        # Second: try company name contains
        for site in sites:
            company_name = site.get("company_name", "").lower()
            if company_name and company_name in site_text_lower:
                return site
            if site_text_lower in company_name:
                return site

        # Third: try address contains
        for site in sites:
            address = site.get("detailed_address", "").lower()
            if address and address in site_text_lower:
                return site

        return None

    async def _create_site_from_ai_data(
        self,
        site_data: Dict,
        fallback_text: str,
        site_type: str
    ) -> Optional[Site]:
        """
        Auto-create Site from AI-extracted data.

        Args:
            site_data: AI-extracted site info (company_name, address, city, etc.)
            fallback_text: Original text if AI data is incomplete
            site_type: "PICKUP" or "DELIVERY"
        """
        try:
            company_name = site_data.get("company_name") or fallback_text
            if not company_name:
                logger.warning("Cannot create site without company name")
                return None

            # Generate unique site code
            site_code = self._generate_site_code(company_name)

            # Create site
            site = Site(
                id=uuid4(),
                tenant_id=self.tenant_id,
                code=site_code,
                company_name=company_name,
                detailed_address=site_data.get("address", ""),
                site_type="CUSTOMER",  # Default to customer site
                status="ON",
                # Optional fields from AI
                city=site_data.get("city"),
                district=site_data.get("district"),
                phone=site_data.get("phone"),
            )

            self.db.add(site)
            self.db.commit()
            self.db.refresh(site)

            return site

        except Exception as e:
            logger.error(f"Failed to create site: {e}", exc_info=True)
            self.db.rollback()
            return None

    def _generate_site_code(self, company_name: str) -> str:
        """Generate unique site code from company name."""
        # Take first 3-4 chars of company name
        prefix = "".join(
            c for c in company_name.upper() if c.isalnum()
        )[:4] or "SITE"

        # Add random suffix
        suffix = str(uuid4())[:4].upper()
        code = f"{prefix}-{suffix}"

        # Ensure uniqueness
        existing = self.db.exec(
            select(Site).where(
                Site.tenant_id == self.tenant_id,
                Site.code == code
            )
        ).first()

        if existing:
            # Retry with different suffix
            suffix = str(uuid4())[:6].upper()
            code = f"{prefix}-{suffix}"

        return code

    def _enrich_customers_with_sites(
        self,
        customers: List[Dict],
        sites: List[Dict]
    ) -> List[Dict]:
        """
        Add common delivery/pickup sites to each customer for better AI matching.

        This helps AI understand which sites belong to which customers.
        """
        customer_map = {c["id"]: {**c, "common_sites": []} for c in customers}

        # Group sites by customer
        for site in sites:
            # Check if site has customer association
            # (Note: Add customer_id field to Site model if not exists)
            customer_id = site.get("customer_id")
            if customer_id and customer_id in customer_map:
                customer_map[customer_id]["common_sites"].append({
                    "name": site["company_name"],
                    "address": site.get("detailed_address", ""),
                    "code": site["code"]
                })

        return list(customer_map.values())

    def _validate_customer_exists(
        self,
        customer_id: str,
        customers: List[Dict]
    ) -> bool:
        """Validate that customer_id exists in provided customer list."""
        return any(c["id"] == customer_id for c in customers)
