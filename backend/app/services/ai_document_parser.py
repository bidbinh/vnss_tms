"""
AI-powered Document Parser for Customs Documents
Sử dụng LLM (Gemini/Claude/OpenAI) để trích xuất dữ liệu từ PDF chứng từ

Ưu điểm so với regex:
- Hiểu ngữ cảnh, không phụ thuộc vào format cố định
- Xử lý được các file có cấu trúc khác nhau
- Tự động mapping fields theo ngữ nghĩa

V2: Sử dụng AI config từ database để quản lý API keys và provider priority
V3: Tích hợp AI Training System - per-customer rules + audit trail
"""
import os
import json
import base64
import httpx
import logging
import time
import uuid
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass, asdict, field
from datetime import datetime
from decimal import Decimal
from dotenv import load_dotenv

# Load .env file from backend directory (fallback)
env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(env_path)

logger = logging.getLogger(__name__)

# Feature code for this parser
FEATURE_CODE = "document_parser"


@dataclass
class AIParseResult:
    """Kết quả parse từ AI"""
    success: bool = False
    error: Optional[str] = None
    confidence: float = 0.0
    provider_used: Optional[str] = None  # Which provider was used
    latency_ms: int = 0  # API latency in milliseconds

    # Token tracking for billing
    input_tokens: int = 0
    output_tokens: int = 0

    # Session tracking for audit trail
    session_id: Optional[str] = None  # AIParsingSession ID
    rules_applied: List[str] = field(default_factory=list)  # List of rule IDs applied

    # Document type
    document_type: Optional[str] = None  # INVOICE, BILL_OF_LADING, PACKING_LIST, ARRIVAL_NOTICE

    # Header info
    invoice_no: Optional[str] = None
    invoice_date: Optional[str] = None
    bl_no: Optional[str] = None
    bl_date: Optional[str] = None

    # Parties - Người xuất khẩu
    exporter_name: Optional[str] = None
    exporter_address: Optional[str] = None
    exporter_tax_code: Optional[str] = None
    exporter_country: Optional[str] = None  # ISO code: HK, CN, US, etc.

    # Parties - Người nhập khẩu
    importer_name: Optional[str] = None
    importer_address: Optional[str] = None
    importer_tax_code: Optional[str] = None

    # Transport - Vận chuyển
    vessel_name: Optional[str] = None
    voyage_no: Optional[str] = None
    flight_no: Optional[str] = None
    loading_port: Optional[str] = None  # Port code: CNTAO, HKHKG, etc.
    loading_port_name: Optional[str] = None
    discharge_port: Optional[str] = None  # Port code: VNMPC, VNHPH, etc.
    discharge_port_name: Optional[str] = None
    eta: Optional[str] = None

    # Cargo summary
    total_packages: int = 0
    package_unit: Optional[str] = None  # PP, CT, PL, etc.
    gross_weight: float = 0.0
    net_weight: float = 0.0
    volume_cbm: float = 0.0
    container_numbers: Optional[str] = None
    container_count: int = 0

    # Values
    currency: str = "USD"
    total_value: float = 0.0
    incoterms: Optional[str] = None  # DAP, FOB, CIF, etc.
    exchange_rate: float = 0.0

    # Items / HS Codes
    items: List[Dict[str, Any]] = None

    # Partner matching results
    exporter_match: Optional[Dict[str, Any]] = None  # PartnerMatchResponse
    importer_match: Optional[Dict[str, Any]] = None  # PartnerMatchResponse

    def __post_init__(self):
        if self.items is None:
            self.items = []
        if self.rules_applied is None:
            self.rules_applied = []


# Prompt template cho việc extract dữ liệu từ chứng từ
EXTRACTION_PROMPT = """Bạn là chuyên gia phân tích chứng từ hải quan Việt Nam (VNACCS/VCIS).

Nhiệm vụ: Trích xuất thông tin từ chứng từ gửi kèm và trả về JSON.

HƯỚNG DẪN MAPPING QUAN TRỌNG (theo Guider.csv):

1. INVOICE:
   - Seller/Shipper/Exporter (1) → exporter_name, exporter_address
   - Consignee/Buyer/Ship To (2) → importer_name, importer_address
   - Invoice No. & Date (6) → invoice_no, invoice_date
   - PO No. (7) → contract_no (nếu có)
   - Terms of Delivery (10) → incoterms (DAP, FOB, CIF, etc.)
   - Gross Weight → gross_weight
   - Description of Goods / Part Number (12):
     * Tên sản phẩm (VD: TFT-LCD MODULE) → product_name
     * DELL PN / Customer PN (VD: G2DHY) → product_code (mã người NK yêu cầu)
     * Supplier PN / Model (VD: MV270FHM-NX4-4D50) → supplier_code (mã NCC)
   - Quantity (13) → quantity
   - Unit Price (14) → unit_price
   - Amount (15) → total_value

2. BILL OF LADING:
   - B/L No. → bl_no
   - Date of Issue → bl_date
   - Shipper → exporter_name
   - Consignee → importer_name
   - Vessel/Ship → vessel_name
   - Port of Loading → loading_port, loading_port_name
   - Port of Discharge → discharge_port, discharge_port_name
   - Gross Weight → gross_weight
   - Container No. → container_numbers

3. ARRIVAL NOTICE:
   - ETA → eta
   - MBL → emanifest_no (nếu có)
   - HBL → bl_no
   - First Vessel → vessel_name
   - Port of Loading → loading_port
   - Port of Discharge → discharge_port
   - Warehouse → warehouse_name (nếu có)
   - Pallets/Cartons → total_packages
   - KGS → gross_weight
   - CBM → volume_cbm

4. PACKING LIST:
   - Description → product_name
   - Part Number → product_code, supplier_code
   - Quantity → quantity
   - Net Weight → net_weight
   - Gross Weight → gross_weight
   - Measurement → volume (nếu có)

QUY TẮC:
- Ngày tháng: format YYYY-MM-DD
- Trọng lượng: đơn vị KG
- Số tiền: không có ký tự tiền tệ, chỉ số
- Port code: sử dụng UN/LOCODE nếu biết (VD: CNTAO, VNHPH, VNMPC)
- Country code: ISO 2-letter (VD: CN, HK, VN, US)
- Nếu không chắc chắn giá trị, để null

TRẢ VỀ JSON THEO CẤU TRÚC SAU:
{
  "document_type": "INVOICE" | "BILL_OF_LADING" | "PACKING_LIST" | "ARRIVAL_NOTICE",
  "confidence": 0.0-1.0,

  "invoice_no": "string or null",
  "invoice_date": "YYYY-MM-DD or null",
  "bl_no": "string or null",
  "bl_date": "YYYY-MM-DD or null",

  "exporter_name": "Tên người xuất khẩu",
  "exporter_address": "Địa chỉ người XK",
  "exporter_country": "HK",

  "importer_name": "Tên người nhập khẩu",
  "importer_address": "Địa chỉ người NK",
  "importer_tax_code": "Mã số thuế nếu có",

  "vessel_name": "Tên tàu",
  "voyage_no": "Số chuyến",
  "loading_port": "CNTAO",
  "loading_port_name": "QINGDAO, CHINA",
  "discharge_port": "VNMPC",
  "discharge_port_name": "MPC PORT, VIETNAM",
  "eta": "YYYY-MM-DD",

  "total_packages": 240,
  "package_unit": "PP",
  "gross_weight": 42222.7,
  "net_weight": 40000.0,
  "volume_cbm": 150.5,
  "container_numbers": "CMAU1234567,CMAU7654321",
  "container_count": 4,

  "currency": "USD",
  "total_value": 648000.0,
  "incoterms": "DAP",

  "items": [
    {
      "item_no": 1,
      "hs_code": "85249100",
      "product_name": "Mô-đun màn hình LCD 27'' bằng tinh thể lỏng",
      "product_code": "G2DHY",
      "supplier_code": "MV270FHM-NX4-4D50",
      "quantity": 12960,
      "unit": "PCE",
      "unit_price": 50.0,
      "total_value": 648000.0,
      "gross_weight": 42222.7,
      "net_weight": 40000.0,
      "country_of_origin": "CN"
    }
  ]
}

CHỈ TRẢ VỀ JSON, KHÔNG CÓ TEXT KHÁC.
"""


# Template for customer-specific rules injection (old system)
CUSTOMER_RULES_TEMPLATE = """
CUSTOMER-SPECIFIC RULES (Apply these FIRST):
{rules}

KNOWN PATTERNS FROM HISTORY:
{patterns}
"""

# Template for text-based parsing instructions (new system - better)
PARSING_INSTRUCTIONS_TEMPLATE = """
╔══════════════════════════════════════════════════════════════════════════════╗
║                    HƯỚNG DẪN PARSE RIÊNG CHO KHÁCH HÀNG                      ║
╚══════════════════════════════════════════════════════════════════════════════╝

{instructions}

ÁP DỤNG CÁC HƯỚNG DẪN TRÊN TRƯỚC KHI PARSE. NẾU CÓ XUNG ĐỘT VỚI QUY TẮC CHUNG,
ƯU TIÊN HƯỚNG DẪN RIÊNG CỦA KHÁCH HÀNG.

══════════════════════════════════════════════════════════════════════════════

"""


class AIDocumentParser:
    """AI-powered document parser using Gemini/Claude/OpenAI with database config"""

    def __init__(self, db_session=None):
        """
        Initialize parser.
        Args:
            db_session: SQLAlchemy session for reading AI config from database
        """
        self.db = db_session
        self._config_service = None
        self._rule_service = None
        self._partner_service = None
        # Current parsing context - set before each parse
        self._current_prompt = EXTRACTION_PROMPT
        self._current_instruction_ids = []

    def _get_config_service(self):
        """Get AI config service (lazy load)"""
        if self._config_service is None and self.db is not None:
            from app.services.ai_config_service import AIConfigService
            self._config_service = AIConfigService(self.db)
        return self._config_service

    def _get_rule_service(self):
        """Get rule learning service (lazy load)"""
        if self._rule_service is None and self.db is not None:
            from app.services.rule_learning_service import RuleLearningService
            self._rule_service = RuleLearningService(self.db)
        return self._rule_service

    def _get_partner_service(self):
        """Get partner matching service (lazy load)"""
        if self._partner_service is None and self.db is not None:
            from app.services.partner_matching_service import PartnerMatchingService
            self._partner_service = PartnerMatchingService(self.db)
        return self._partner_service

    def _get_parsing_instructions(
        self,
        tenant_id: str,
        shipper_name: Optional[str] = None
    ) -> Tuple[str, List[str]]:
        """
        Get matching parsing instructions for a shipper.
        Returns (combined_prompt_text, list_of_instruction_ids)
        """
        if not self.db or not shipper_name:
            return "", []

        try:
            from sqlmodel import select
            from app.models.fms.parsing_instructions import ParsingInstruction

            # Get all active instructions for this tenant
            instructions = self.db.exec(
                select(ParsingInstruction).where(
                    ParsingInstruction.tenant_id == tenant_id,
                    ParsingInstruction.is_active == True
                ).order_by(ParsingInstruction.priority.desc())
            ).all()

            # Find matching instructions
            matching = []
            instruction_ids = []
            for inst in instructions:
                if inst.matches_shipper(shipper_name):
                    matching.append(inst)
                    instruction_ids.append(inst.id)
                    logger.info(f"Matched parsing instruction: {inst.name} for shipper {shipper_name}")

            if not matching:
                return "", []

            # Combine prompt texts
            combined_text = "\n\n".join([inst.to_prompt_text() for inst in matching])
            return combined_text, instruction_ids

        except Exception as e:
            logger.error(f"Failed to get parsing instructions: {e}")
            return "", []

    def _get_api_keys_from_db(self) -> Dict[str, Any]:
        """Get API keys from database"""
        config_service = self._get_config_service()
        if not config_service:
            return {}

        providers = config_service.get_providers_for_feature(FEATURE_CODE)
        return {
            "providers": providers,
            "feature": config_service.get_feature_config(FEATURE_CODE)
        }

    def _get_api_keys_from_env(self) -> Dict[str, str]:
        """Fallback: Get API keys from environment"""
        env_path = Path(__file__).parent.parent.parent / ".env"
        load_dotenv(env_path, override=True)

        return {
            "gemini": os.environ.get("GEMINI_API_KEY"),
            "anthropic": os.environ.get("ANTHROPIC_API_KEY"),
            "openai": os.environ.get("OPENAI_API_KEY"),
        }

    def _build_enhanced_prompt(
        self,
        tenant_id: str,
        shipper_name: Optional[str] = None,
        document_type: Optional[str] = None
    ) -> Tuple[str, List[str]]:
        """
        Build enhanced prompt with:
        1. Text-based parsing instructions (new system - better, user-friendly)
        2. Customer-specific rules from learning system (legacy)

        Returns (enhanced_prompt, list_of_instruction_ids_applied)
        """
        prompt_parts = []
        instruction_ids = []

        # ============================================================
        # 1. NEW SYSTEM: Text-based parsing instructions
        # User writes instructions in Vietnamese, we inject directly
        # ============================================================
        if shipper_name and tenant_id:
            instructions_text, inst_ids = self._get_parsing_instructions(tenant_id, shipper_name)
            if instructions_text:
                prompt_parts.append(PARSING_INSTRUCTIONS_TEMPLATE.format(instructions=instructions_text))
                instruction_ids.extend(inst_ids)
                logger.info(f"Injected {len(inst_ids)} parsing instructions for shipper: {shipper_name}")

        # ============================================================
        # 2. LEGACY SYSTEM: Rules learned from corrections
        # Auto-generated rules from MIN_OCCURRENCES corrections
        # ============================================================
        rule_service = self._get_rule_service()
        if rule_service and shipper_name:
            rules = rule_service.get_rules_for_shipper(tenant_id, shipper_name, document_type)
            if rules:
                rules_text = []
                patterns_text = []

                for rule in rules:
                    logic = rule.get_transform_logic()
                    if not logic:
                        continue

                    if rule.rule_type == "FIELD_MAPPING":
                        rules_text.append(
                            f"- For this shipper: '{rule.source_field}' maps to '{rule.target_field}'"
                        )
                    elif rule.rule_type == "VALUE_TRANSFORM":
                        patterns_text.append(
                            f"- Field '{rule.target_field}': When AI extracts \"{logic.get('from_value', '')[:50]}\", "
                            f"correct is \"{logic.get('to_value', '')[:50]}\""
                        )
                    elif rule.rule_type == "DEFAULT_VALUE":
                        rules_text.append(
                            f"- For this shipper: '{rule.target_field}' default value is \"{logic.get('default_value', '')[:50]}\""
                        )

                if rules_text or patterns_text:
                    customer_context = CUSTOMER_RULES_TEMPLATE.format(
                        rules="\n".join(rules_text) if rules_text else "None",
                        patterns="\n".join(patterns_text) if patterns_text else "None"
                    )
                    prompt_parts.append(customer_context)
                    logger.info(f"Injected {len(rules)} learned rules for shipper: {shipper_name}")

        # ============================================================
        # 3. Base extraction prompt (always included)
        # ============================================================
        prompt_parts.append(EXTRACTION_PROMPT)

        return "\n".join(prompt_parts), instruction_ids

    def _create_parsing_session(
        self,
        tenant_id: str,
        user_id: str,
        filename: str,
        shipper_name: Optional[str] = None,
        customer_id: Optional[str] = None,
    ) -> Optional[str]:
        """
        Create a new AI parsing session for audit trail.
        Returns session_id.
        """
        if not self.db:
            return None

        try:
            from app.models.fms.ai_training import AIParsingSession

            session = AIParsingSession(
                tenant_id=tenant_id,
                created_by=user_id,
                original_files=json.dumps([{"filename": filename}]),
                shipper_name=shipper_name,
                customer_id=customer_id,
            )

            self.db.add(session)
            self.db.commit()
            self.db.refresh(session)

            logger.info(f"Created AI parsing session: {session.id} ({session.session_code})")
            return session.id

        except Exception as e:
            logger.error(f"Failed to create parsing session: {e}")
            try:
                self.db.rollback()
            except Exception:
                pass
            return None

    def _update_session_with_result(
        self,
        session_id: str,
        result: "AIParseResult",
        latency_ms: int
    ) -> None:
        """Update session with parse result for audit trail."""
        if not self.db or not session_id:
            return

        try:
            from app.models.fms.ai_training import AIParsingSession, AIParsingOutput

            session = self.db.get(AIParsingSession, session_id)
            if not session:
                return

            # Update session metadata
            session.ai_provider_used = result.provider_used
            session.ai_confidence = Decimal(str(result.confidence)) if result.confidence else None
            session.ai_latency_ms = latency_ms

            # Detect shipper name from result
            if result.exporter_name and not session.shipper_name:
                session.shipper_name = result.exporter_name
                session.shipper_pattern_hash = AIParsingSession.compute_shipper_hash(
                    result.exporter_name
                )

            # Count fields parsed
            field_count = 0
            result_dict = asdict(result)

            # Store each parsed field as AIParsingOutput
            header_fields = [
                "document_type", "invoice_no", "invoice_date", "bl_no", "bl_date",
                "incoterms", "currency", "total_value", "exchange_rate",
                "total_packages", "package_unit", "gross_weight", "net_weight",
                "volume_cbm", "container_numbers", "container_count"
            ]
            exporter_fields = [
                "exporter_name", "exporter_address", "exporter_tax_code", "exporter_country"
            ]
            importer_fields = [
                "importer_name", "importer_address", "importer_tax_code"
            ]
            transport_fields = [
                "vessel_name", "voyage_no", "flight_no", "loading_port",
                "loading_port_name", "discharge_port", "discharge_port_name", "eta"
            ]

            # Save header fields
            for field in header_fields:
                value = result_dict.get(field)
                if value is not None:
                    output = AIParsingOutput(
                        session_id=session_id,
                        field_category="header",
                        field_name=field,
                        ai_extracted_value=str(value) if value else None,
                        ai_confidence=Decimal(str(result.confidence)) if result.confidence else None,
                    )
                    self.db.add(output)
                    field_count += 1

            # Save exporter fields
            for field in exporter_fields:
                value = result_dict.get(field)
                if value is not None:
                    output = AIParsingOutput(
                        session_id=session_id,
                        field_category="exporter",
                        field_name=field,
                        ai_extracted_value=str(value) if value else None,
                        ai_confidence=Decimal(str(result.confidence)) if result.confidence else None,
                    )
                    self.db.add(output)
                    field_count += 1

            # Save importer fields
            for field in importer_fields:
                value = result_dict.get(field)
                if value is not None:
                    output = AIParsingOutput(
                        session_id=session_id,
                        field_category="importer",
                        field_name=field,
                        ai_extracted_value=str(value) if value else None,
                        ai_confidence=Decimal(str(result.confidence)) if result.confidence else None,
                    )
                    self.db.add(output)
                    field_count += 1

            # Save transport fields
            for field in transport_fields:
                value = result_dict.get(field)
                if value is not None:
                    output = AIParsingOutput(
                        session_id=session_id,
                        field_category="transport",
                        field_name=field,
                        ai_extracted_value=str(value) if value else None,
                        ai_confidence=Decimal(str(result.confidence)) if result.confidence else None,
                    )
                    self.db.add(output)
                    field_count += 1

            # Save item fields
            for idx, item in enumerate(result.items or []):
                for field_name, value in item.items():
                    if value is not None:
                        output = AIParsingOutput(
                            session_id=session_id,
                            field_category="item",
                            field_name=field_name,
                            item_index=idx,
                            ai_extracted_value=str(value) if value else None,
                            ai_confidence=Decimal(str(result.confidence)) if result.confidence else None,
                        )
                        self.db.add(output)
                        field_count += 1

            session.total_fields_parsed = field_count
            self.db.add(session)
            self.db.commit()

            logger.info(f"Updated session {session_id}: {field_count} fields parsed")

        except Exception as e:
            logger.error(f"Failed to update session with result: {e}")
            try:
                self.db.rollback()
            except Exception:
                pass

    def _apply_partner_matching(
        self,
        result: "AIParseResult",
        tenant_id: str
    ) -> "AIParseResult":
        """
        Apply partner matching to the parse result.
        Auto-fills partner details from database when match found.
        """
        partner_service = self._get_partner_service()
        if not partner_service:
            return result

        # Match exporter
        if result.exporter_name:
            try:
                match = partner_service.match_exporter(
                    name=result.exporter_name,
                    address=result.exporter_address,
                    country_code=result.exporter_country,
                    tenant_id=tenant_id
                )
                if match:
                    result.exporter_match = {
                        "partner_id": match.partner_id,
                        "confidence": match.confidence,
                        "match_type": match.match_type,
                        "should_auto_select": match.should_auto_select,
                        "alternatives": [
                            {"id": alt.id, "name": alt.name, "address": alt.address}
                            for alt in (match.alternatives or [])
                        ]
                    }
                    # Auto-fill if high confidence
                    if match.should_auto_select and match.partner:
                        result.exporter_address = result.exporter_address or match.partner.address
                        result.exporter_country = result.exporter_country or match.partner.country_code
                        logger.info(f"Auto-selected exporter: {match.partner.name} (confidence: {match.confidence})")
            except Exception as e:
                logger.error(f"Exporter matching failed: {e}")

        # Match importer
        if result.importer_name:
            try:
                match = partner_service.match_importer(
                    name=result.importer_name,
                    address=result.importer_address,
                    tax_code=result.importer_tax_code,
                    tenant_id=tenant_id
                )
                if match:
                    result.importer_match = {
                        "partner_id": match.partner_id,
                        "confidence": match.confidence,
                        "match_type": match.match_type,
                        "should_auto_select": match.should_auto_select,
                        "alternatives": [
                            {"id": alt.id, "name": alt.name, "address": alt.address}
                            for alt in (match.alternatives or [])
                        ]
                    }
                    # Auto-fill if high confidence
                    if match.should_auto_select and match.partner:
                        result.importer_address = result.importer_address or match.partner.address
                        result.importer_tax_code = result.importer_tax_code or match.partner.tax_code
                        logger.info(f"Auto-selected importer: {match.partner.name} (confidence: {match.confidence})")
            except Exception as e:
                logger.error(f"Importer matching failed: {e}")

        return result

    def _apply_customer_rules(
        self,
        result: "AIParseResult",
        tenant_id: str,
        shipper_name: Optional[str] = None
    ) -> "AIParseResult":
        """
        Apply post-parse customer rules to transform the result.
        This handles rules that weren't injected into the prompt.
        """
        rule_service = self._get_rule_service()
        if not rule_service:
            return result

        shipper = shipper_name or result.exporter_name
        if not shipper:
            return result

        rules = rule_service.get_rules_for_shipper(tenant_id, shipper)
        if not rules:
            return result

        # Convert result to dict for rule application
        result_dict = asdict(result)
        modified_dict = rule_service.apply_rules_to_result(result_dict, rules)

        # Track which rules were applied
        applied_rule_ids = []
        for rule in rules:
            if rule.times_applied > 0:  # Rule was applied
                applied_rule_ids.append(str(rule.id))

        # Update result with modified values
        for field in ["exporter_name", "exporter_address", "exporter_country",
                      "importer_name", "importer_address", "importer_tax_code"]:
            if modified_dict.get(field) != result_dict.get(field):
                setattr(result, field, modified_dict.get(field))

        result.rules_applied = applied_rule_ids
        return result

    async def parse_pdf_with_ai(
        self,
        pdf_content: bytes,
        filename: str = "",
        tenant_id: Optional[str] = None,
        user_id: Optional[str] = None,
        shipper_name: Optional[str] = None,
        customer_id: Optional[str] = None,
        create_session: bool = True,
        apply_rules: bool = True,
        apply_partner_matching: bool = True,
    ) -> AIParseResult:
        """
        Parse PDF document using AI with training system integration.

        Args:
            pdf_content: Raw PDF bytes
            filename: Original filename
            tenant_id: Tenant ID for multi-tenancy
            user_id: User ID for audit trail
            shipper_name: Known shipper name for rule lookup (optional) - if provided,
                         will inject matching parsing instructions into prompt
            customer_id: Customer ID for rule association (optional)
            create_session: Whether to create AI parsing session for audit trail
            apply_rules: Whether to apply customer-specific rules
            apply_partner_matching: Whether to run partner matching

        Returns:
            AIParseResult with parsed data, session_id, and partner matches
        """
        result = AIParseResult()
        errors = []
        session_id = None
        overall_start = time.time()
        instruction_ids_applied = []

        logger.info(f"parse_pdf_with_ai: Starting parse for {filename}")

        # Build enhanced prompt if shipper_name is known
        # This injects customer-specific parsing instructions
        self._current_prompt = EXTRACTION_PROMPT
        self._current_instruction_ids = []
        if shipper_name and tenant_id:
            self._current_prompt, self._current_instruction_ids = self._build_enhanced_prompt(
                tenant_id=tenant_id,
                shipper_name=shipper_name,
            )
            if self._current_instruction_ids:
                logger.info(f"parse_pdf_with_ai: Using enhanced prompt with {len(self._current_instruction_ids)} instructions")

        # Create parsing session for audit trail
        if create_session and tenant_id and user_id:
            session_id = self._create_parsing_session(
                tenant_id=tenant_id,
                user_id=user_id,
                filename=filename,
                shipper_name=shipper_name,
                customer_id=customer_id,
            )

        # Try to get config from database first
        db_config = self._get_api_keys_from_db()

        if db_config.get("providers"):
            # Use database config with priority order
            logger.info(f"parse_pdf_with_ai: Using database config, {len(db_config['providers'])} providers available")

            for provider in db_config["providers"]:
                start_time = time.time()
                try:
                    logger.info(f"parse_pdf_with_ai: Trying {provider.provider_code}...")

                    if provider.provider_code == "gemini":
                        result = await self._parse_with_gemini(
                            pdf_content, filename, provider.api_key,
                            provider.default_model or "gemini-2.0-flash"
                        )
                    elif provider.provider_code == "claude":
                        result = await self._parse_with_claude(
                            pdf_content, filename, provider.api_key,
                            provider.default_model or "claude-sonnet-4-20250514"
                        )
                    elif provider.provider_code == "openai":
                        result = await self._parse_with_openai(
                            pdf_content, filename, provider.api_key,
                            provider.default_model or "gpt-4o-mini"
                        )
                    elif provider.provider_code == "deepseek":
                        result = await self._parse_with_openai_compatible(
                            pdf_content, filename, provider.api_key,
                            provider.default_model or "deepseek-chat",
                            provider.api_endpoint or "https://api.deepseek.com/v1"
                        )
                    elif provider.provider_code == "mistral":
                        result = await self._parse_with_openai_compatible(
                            pdf_content, filename, provider.api_key,
                            provider.default_model or "mistral-large-latest",
                            provider.api_endpoint or "https://api.mistral.ai/v1"
                        )
                    elif provider.provider_code == "groq":
                        result = await self._parse_with_openai_compatible(
                            pdf_content, filename, provider.api_key,
                            provider.default_model or "llama-3.3-70b-versatile",
                            provider.api_endpoint or "https://api.groq.com/openai/v1"
                        )
                    elif provider.provider_code == "xai":
                        result = await self._parse_with_openai_compatible(
                            pdf_content, filename, provider.api_key,
                            provider.default_model or "grok-2-latest",
                            provider.api_endpoint or "https://api.x.ai/v1"
                        )
                    elif provider.provider_code == "together":
                        result = await self._parse_with_openai_compatible(
                            pdf_content, filename, provider.api_key,
                            provider.default_model or "meta-llama/Llama-3.3-70B-Instruct-Turbo",
                            provider.api_endpoint or "https://api.together.xyz/v1"
                        )
                    elif provider.provider_code == "openrouter":
                        result = await self._parse_with_openai_compatible(
                            pdf_content, filename, provider.api_key,
                            provider.default_model or "anthropic/claude-3.5-sonnet",
                            provider.api_endpoint or "https://openrouter.ai/api/v1"
                        )
                    elif provider.provider_code == "perplexity":
                        result = await self._parse_with_openai_compatible(
                            pdf_content, filename, provider.api_key,
                            provider.default_model or "llama-3.1-sonar-large-128k-online",
                            provider.api_endpoint or "https://api.perplexity.ai"
                        )
                    elif provider.api_endpoint:
                        # Generic OpenAI-compatible provider
                        result = await self._parse_with_openai_compatible(
                            pdf_content, filename, provider.api_key,
                            provider.default_model or "default",
                            provider.api_endpoint
                        )

                    latency_ms = int((time.time() - start_time) * 1000)

                    if result.success:
                        result.provider_used = provider.provider_code
                        result.latency_ms = latency_ms
                        result.session_id = session_id
                        logger.info(f"parse_pdf_with_ai: {provider.provider_code} success! doc_type={result.document_type}")

                        # Log usage with token counts
                        if self._get_config_service():
                            self._get_config_service().log_usage(
                                feature_code=FEATURE_CODE,
                                provider_code=provider.provider_code,
                                model_used=provider.default_model or "unknown",
                                input_tokens=result.input_tokens,
                                output_tokens=result.output_tokens,
                                latency_ms=latency_ms,
                                success=True,
                                tenant_id=tenant_id,
                                user_id=user_id,
                            )

                        # Post-processing: Apply customer rules
                        if apply_rules and tenant_id:
                            result = self._apply_customer_rules(
                                result, tenant_id, shipper_name
                            )

                        # Post-processing: Apply partner matching
                        if apply_partner_matching and tenant_id:
                            result = self._apply_partner_matching(result, tenant_id)

                        # Update session with result
                        if session_id:
                            self._update_session_with_result(session_id, result, latency_ms)

                        return result
                    else:
                        logger.warning(f"parse_pdf_with_ai: {provider.provider_code} failed: {result.error}")
                        errors.append(f"{provider.provider_code}: {result.error}")

                except Exception as e:
                    logger.exception(f"parse_pdf_with_ai: {provider.provider_code} exception: {e}")
                    errors.append(f"{provider.provider_code} exception: {str(e)}")

                # Check if fallback is disabled
                feature = db_config.get("feature")
                if feature and not feature.fallback_enabled:
                    break

        else:
            # Fallback to environment variables
            logger.info("parse_pdf_with_ai: No database config, falling back to environment variables")
            env_keys = self._get_api_keys_from_env()

            # Default priority: Gemini first (cheaper), then Claude, then OpenAI
            providers_to_try = [
                ("gemini", env_keys.get("gemini"), "gemini-1.5-flash"),
                ("claude", env_keys.get("anthropic"), "claude-sonnet-4-5-20250929"),
                ("openai", env_keys.get("openai"), "gpt-4o-mini"),
            ]

            for provider_code, api_key, model in providers_to_try:
                if not api_key:
                    continue

                start_time = time.time()
                try:
                    logger.info(f"parse_pdf_with_ai: Trying {provider_code} (from env)...")

                    if provider_code == "gemini":
                        result = await self._parse_with_gemini(pdf_content, filename, api_key, model)
                    elif provider_code == "claude":
                        result = await self._parse_with_claude(pdf_content, filename, api_key, model)
                    elif provider_code == "openai":
                        result = await self._parse_with_openai(pdf_content, filename, api_key, model)

                    latency_ms = int((time.time() - start_time) * 1000)

                    if result.success:
                        result.provider_used = provider_code
                        result.latency_ms = latency_ms
                        result.session_id = session_id
                        logger.info(f"parse_pdf_with_ai: {provider_code} success!")

                        # Post-processing: Apply customer rules
                        if apply_rules and tenant_id:
                            result = self._apply_customer_rules(
                                result, tenant_id, shipper_name
                            )

                        # Post-processing: Apply partner matching
                        if apply_partner_matching and tenant_id:
                            result = self._apply_partner_matching(result, tenant_id)

                        # Update session with result
                        if session_id:
                            self._update_session_with_result(session_id, result, latency_ms)

                        return result
                    else:
                        errors.append(f"{provider_code}: {result.error}")

                except Exception as e:
                    logger.exception(f"parse_pdf_with_ai: {provider_code} exception: {e}")
                    errors.append(f"{provider_code} exception: {str(e)}")

        if not result.success:
            if errors:
                result.error = "; ".join(errors)
            else:
                result.error = "No AI provider configured. Please set up API keys in AI Settings."

        result.session_id = session_id
        logger.error(f"parse_pdf_with_ai: All AI providers failed: {result.error}")
        return result

    async def _parse_with_gemini(
        self,
        pdf_content: bytes,
        filename: str,
        api_key: str,
        model: str = "gemini-1.5-flash"
    ) -> AIParseResult:
        """Parse using Google Gemini API (supports PDF directly)"""
        result = AIParseResult()

        # Use Gemini 1.5 Flash for cost efficiency or 2.0 Flash for better quality
        # gemini-1.5-flash: $0.075/1M input, $0.30/1M output
        # gemini-2.0-flash: Higher quality but more expensive
        if "2.0" in model or "2-" in model:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        else:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

        logger.info(f"_parse_with_gemini: PDF size={len(pdf_content)} bytes, model={model}")

        # Encode PDF as base64
        pdf_base64 = base64.standard_b64encode(pdf_content).decode("utf-8")
        logger.info(f"_parse_with_gemini: Base64 size={len(pdf_base64)} chars")

        # Prepare request - use current prompt (may include custom instructions)
        prompt_to_use = self._current_prompt if hasattr(self, '_current_prompt') else EXTRACTION_PROMPT
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "inline_data": {
                                "mime_type": "application/pdf",
                                "data": pdf_base64
                            }
                        },
                        {
                            "text": prompt_to_use
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 8192,
                "responseMimeType": "application/json"
            }
        }

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                logger.info(f"_parse_with_gemini: Sending request...")
                response = await client.post(url, json=payload)
                logger.info(f"_parse_with_gemini: Response status={response.status_code}")

                if response.status_code != 200:
                    result.error = f"Gemini API error: {response.status_code} - {response.text[:500]}"
                    logger.error(f"_parse_with_gemini: {result.error}")
                    return result

                data = response.json()

                # Extract text from response
                try:
                    text = data["candidates"][0]["content"]["parts"][0]["text"]
                    logger.info(f"_parse_with_gemini: Got response text, length={len(text)}")
                    # Parse JSON from response
                    parsed = json.loads(text)
                    result = self._map_to_result(parsed)
                    result.success = True
                    # Extract token usage from Gemini response
                    usage_metadata = data.get("usageMetadata", {})
                    result.input_tokens = usage_metadata.get("promptTokenCount", 0)
                    result.output_tokens = usage_metadata.get("candidatesTokenCount", 0)
                    logger.info(f"_parse_with_gemini: Successfully parsed, doc_type={result.document_type}, tokens={result.input_tokens}+{result.output_tokens}")
                except (KeyError, json.JSONDecodeError) as e:
                    result.error = f"Failed to parse Gemini response: {str(e)}"
                    logger.error(f"_parse_with_gemini: Parse error: {result.error}")
                    if "candidates" in data:
                        logger.error(f"_parse_with_gemini: Response data: {json.dumps(data)[:1000]}")
        except httpx.TimeoutException as e:
            result.error = f"Gemini API timeout: {str(e)}"
            logger.error(f"_parse_with_gemini: {result.error}")
        except Exception as e:
            result.error = f"Gemini API exception: {str(e)}"
            logger.exception(f"_parse_with_gemini: {result.error}")

        return result

    async def _parse_with_claude(
        self,
        pdf_content: bytes,
        filename: str,
        api_key: str,
        model: str = "claude-sonnet-4-5-20250929"
    ) -> AIParseResult:
        """Parse using Anthropic Claude API"""
        result = AIParseResult()

        # Claude API endpoint
        url = "https://api.anthropic.com/v1/messages"

        pdf_base64 = base64.standard_b64encode(pdf_content).decode("utf-8")

        logger.info(f"_parse_with_claude: PDF size={len(pdf_content)} bytes, model={model}")
        logger.info(f"_parse_with_claude: Base64 size={len(pdf_base64)} chars")

        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "anthropic-beta": "pdfs-2024-09-25",  # Enable PDF support beta
            "content-type": "application/json"
        }

        payload = {
            "model": model,
            "max_tokens": 8192,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "document",
                            "source": {
                                "type": "base64",
                                "media_type": "application/pdf",
                                "data": pdf_base64
                            }
                        },
                        {
                            "type": "text",
                            "text": self._current_prompt if hasattr(self, '_current_prompt') else EXTRACTION_PROMPT
                        }
                    ]
                }
            ]
        }

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                logger.info(f"_parse_with_claude: Sending request...")
                response = await client.post(url, json=payload, headers=headers)
                logger.info(f"_parse_with_claude: Response status={response.status_code}")

                if response.status_code != 200:
                    result.error = f"Claude API error: {response.status_code} - {response.text[:500]}"
                    logger.error(f"_parse_with_claude: {result.error}")
                    return result

                data = response.json()

                try:
                    text = data["content"][0]["text"]
                    logger.info(f"_parse_with_claude: Got response, length={len(text)}")
                    # Clean up JSON if wrapped in markdown
                    if "```json" in text:
                        text = text.split("```json")[1].split("```")[0]
                    elif "```" in text:
                        text = text.split("```")[1].split("```")[0]

                    parsed = json.loads(text.strip())
                    result = self._map_to_result(parsed)
                    result.success = True
                    # Extract token usage from Claude response
                    usage = data.get("usage", {})
                    result.input_tokens = usage.get("input_tokens", 0)
                    result.output_tokens = usage.get("output_tokens", 0)
                    logger.info(f"_parse_with_claude: Successfully parsed, doc_type={result.document_type}, tokens={result.input_tokens}+{result.output_tokens}")
                except (KeyError, json.JSONDecodeError) as e:
                    result.error = f"Failed to parse Claude response: {str(e)}"
                    logger.error(f"_parse_with_claude: Parse error: {result.error}")
                    if "content" in data:
                        logger.error(f"_parse_with_claude: Response data: {json.dumps(data)[:1000]}")
        except httpx.TimeoutException as e:
            result.error = f"Claude API timeout: {str(e)}"
            logger.error(f"_parse_with_claude: {result.error}")
        except Exception as e:
            result.error = f"Claude API exception: {str(e)}"
            logger.exception(f"_parse_with_claude: {result.error}")

        return result

    async def _parse_with_openai(
        self,
        pdf_content: bytes,
        filename: str,
        api_key: str,
        model: str = "gpt-4o-mini"
    ) -> AIParseResult:
        """Parse using OpenAI GPT-4 Vision API (converts PDF pages to images)"""
        result = AIParseResult()

        # OpenAI doesn't support PDF directly, need to convert to images
        try:
            import pdfplumber
        except ImportError:
            result.error = "pdfplumber not installed for PDF text extraction"
            return result

        # Extract text from PDF using pdfplumber
        import io
        text_content = ""
        try:
            with pdfplumber.open(io.BytesIO(pdf_content)) as pdf:
                for page in pdf.pages[:10]:  # Limit to first 10 pages
                    page_text = page.extract_text()
                    if page_text:
                        text_content += page_text + "\n\n"
        except Exception as e:
            result.error = f"Failed to extract PDF text: {str(e)}"
            return result

        if not text_content.strip():
            result.error = "No text extracted from PDF"
            return result

        logger.info(f"_parse_with_openai: Extracted {len(text_content)} chars from PDF, model={model}")

        # OpenAI API endpoint
        url = "https://api.openai.com/v1/chat/completions"

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert at parsing customs documents. Always respond with valid JSON only."
                },
                {
                    "role": "user",
                    "content": f"{self._current_prompt if hasattr(self, '_current_prompt') else EXTRACTION_PROMPT}\n\nDocument content:\n{text_content[:15000]}"
                }
            ],
            "temperature": 0.1,
            "max_tokens": 4096,
            "response_format": {"type": "json_object"}
        }

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                logger.info(f"_parse_with_openai: Sending request...")
                response = await client.post(url, json=payload, headers=headers)
                logger.info(f"_parse_with_openai: Response status={response.status_code}")

                if response.status_code != 200:
                    result.error = f"OpenAI API error: {response.status_code} - {response.text[:500]}"
                    return result

                data = response.json()

                try:
                    text = data["choices"][0]["message"]["content"]
                    logger.info(f"_parse_with_openai: Got response, length={len(text)}")
                    parsed = json.loads(text)
                    result = self._map_to_result(parsed)
                    result.success = True
                    # Extract token usage for billing
                    usage = data.get("usage", {})
                    result.input_tokens = usage.get("prompt_tokens", 0)
                    result.output_tokens = usage.get("completion_tokens", 0)
                    logger.info(f"_parse_with_openai: Successfully parsed, doc_type={result.document_type}, tokens={result.input_tokens}+{result.output_tokens}")
                except (KeyError, json.JSONDecodeError) as e:
                    result.error = f"Failed to parse OpenAI response: {str(e)}"
                    logger.error(f"_parse_with_openai: Parse error: {result.error}")
        except httpx.TimeoutException as e:
            result.error = f"OpenAI API timeout: {str(e)}"
            logger.error(f"_parse_with_openai: {result.error}")
        except Exception as e:
            result.error = f"OpenAI API exception: {str(e)}"
            logger.exception(f"_parse_with_openai: {result.error}")

        return result

    async def _parse_with_openai_compatible(
        self,
        pdf_content: bytes,
        filename: str,
        api_key: str,
        model: str,
        base_url: str
    ) -> AIParseResult:
        """
        Parse using OpenAI-compatible API (DeepSeek, Mistral, Groq, xAI, Together, OpenRouter, etc.)
        These providers don't support PDF directly, so we extract text first.
        """
        result = AIParseResult()

        # Extract text from PDF using pdfplumber
        try:
            import pdfplumber
        except ImportError:
            result.error = "pdfplumber not installed for PDF text extraction"
            return result

        import io
        text_content = ""
        try:
            with pdfplumber.open(io.BytesIO(pdf_content)) as pdf:
                for page in pdf.pages[:10]:  # Limit to first 10 pages
                    page_text = page.extract_text()
                    if page_text:
                        text_content += page_text + "\n\n"
        except Exception as e:
            result.error = f"Failed to extract PDF text: {str(e)}"
            return result

        if not text_content.strip():
            result.error = "No text extracted from PDF"
            return result

        logger.info(f"_parse_with_openai_compatible: Extracted {len(text_content)} chars, model={model}, base_url={base_url}")

        # Normalize base_url - ensure it ends with /chat/completions path or /v1
        if not base_url.endswith('/'):
            base_url = base_url.rstrip('/')

        # Build the full URL
        if '/chat/completions' in base_url:
            url = base_url
        elif base_url.endswith('/v1'):
            url = f"{base_url}/chat/completions"
        else:
            url = f"{base_url}/chat/completions"

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        # Some providers need specific headers
        if "openrouter" in base_url:
            headers["HTTP-Referer"] = "https://9log.tech"
            headers["X-Title"] = "9Log TMS"

        payload = {
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert at parsing customs documents. Always respond with valid JSON only."
                },
                {
                    "role": "user",
                    "content": f"{self._current_prompt if hasattr(self, '_current_prompt') else EXTRACTION_PROMPT}\n\nDocument content:\n{text_content[:15000]}"
                }
            ],
            "temperature": 0.1,
            "max_tokens": 4096,
        }

        # Add JSON response format for providers that support it
        if any(x in base_url for x in ["openai", "together", "groq", "deepseek"]):
            payload["response_format"] = {"type": "json_object"}

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                logger.info(f"_parse_with_openai_compatible: Sending request to {url}...")
                response = await client.post(url, json=payload, headers=headers)
                logger.info(f"_parse_with_openai_compatible: Response status={response.status_code}")

                if response.status_code != 200:
                    result.error = f"API error: {response.status_code} - {response.text[:500]}"
                    return result

                data = response.json()

                try:
                    text = data["choices"][0]["message"]["content"]
                    logger.info(f"_parse_with_openai_compatible: Got response, length={len(text)}")

                    # Clean up JSON if wrapped in markdown
                    if "```json" in text:
                        text = text.split("```json")[1].split("```")[0]
                    elif "```" in text:
                        text = text.split("```")[1].split("```")[0]

                    parsed = json.loads(text.strip())
                    result = self._map_to_result(parsed)
                    result.success = True
                    # Extract token usage for billing
                    usage = data.get("usage", {})
                    result.input_tokens = usage.get("prompt_tokens", 0)
                    result.output_tokens = usage.get("completion_tokens", 0)
                    logger.info(f"_parse_with_openai_compatible: Successfully parsed, doc_type={result.document_type}, tokens={result.input_tokens}+{result.output_tokens}")
                except (KeyError, json.JSONDecodeError) as e:
                    result.error = f"Failed to parse response: {str(e)}"
                    logger.error(f"_parse_with_openai_compatible: Parse error: {result.error}")
        except httpx.TimeoutException as e:
            result.error = f"API timeout: {str(e)}"
            logger.error(f"_parse_with_openai_compatible: {result.error}")
        except Exception as e:
            result.error = f"API exception: {str(e)}"
            logger.exception(f"_parse_with_openai_compatible: {result.error}")

        return result

    def _map_to_result(self, data: Dict[str, Any]) -> AIParseResult:
        """Map parsed JSON to AIParseResult"""
        result = AIParseResult(success=True)

        # Basic fields
        result.document_type = data.get("document_type")
        result.confidence = data.get("confidence", 0.8)

        # Document numbers
        result.invoice_no = data.get("invoice_no")
        result.invoice_date = data.get("invoice_date")
        result.bl_no = data.get("bl_no")
        result.bl_date = data.get("bl_date")

        # Exporter (foreign partner)
        result.exporter_name = data.get("exporter_name")
        result.exporter_address = data.get("exporter_address")
        result.exporter_tax_code = data.get("exporter_tax_code")
        result.exporter_country = data.get("exporter_country")

        # Importer
        result.importer_name = data.get("importer_name")
        result.importer_address = data.get("importer_address")
        result.importer_tax_code = data.get("importer_tax_code")

        # Transport
        result.vessel_name = data.get("vessel_name")
        result.voyage_no = data.get("voyage_no")
        result.flight_no = data.get("flight_no")
        result.loading_port = data.get("loading_port")
        result.loading_port_name = data.get("loading_port_name")
        result.discharge_port = data.get("discharge_port")
        result.discharge_port_name = data.get("discharge_port_name")
        result.eta = data.get("eta")

        # Cargo
        result.total_packages = data.get("total_packages", 0) or 0
        result.package_unit = data.get("package_unit")
        result.gross_weight = data.get("gross_weight", 0) or 0
        result.net_weight = data.get("net_weight", 0) or 0
        result.volume_cbm = data.get("volume_cbm", 0) or 0
        result.container_numbers = data.get("container_numbers")
        result.container_count = data.get("container_count", 0) or 0

        # Values
        result.currency = data.get("currency", "USD")
        result.total_value = data.get("total_value", 0) or 0
        result.incoterms = data.get("incoterms")
        result.exchange_rate = data.get("exchange_rate", 0) or 0

        # Items
        result.items = data.get("items", [])

        return result

    def to_customs_data(self, result: AIParseResult) -> Dict[str, Any]:
        """Convert AI parse result to customs declaration create payload"""
        return {
            "declaration_type": "IMPORT",

            # Document references
            "invoice_no": result.invoice_no,
            "invoice_date": result.invoice_date,
            "bl_no": result.bl_no,
            "bl_date": result.bl_date,

            # Parties
            "foreign_partner_name": result.exporter_name,
            "foreign_partner_address": result.exporter_address,
            "foreign_partner_country": result.exporter_country,
            "trader_name": result.importer_name,
            "trader_address": result.importer_address,
            "trader_tax_code": result.importer_tax_code,

            # Transport
            "vessel_name": result.vessel_name,
            "voyage_no": result.voyage_no,
            "flight_no": result.flight_no,
            "loading_port": result.loading_port,
            "loading_port_name": result.loading_port_name,
            "discharge_port": result.discharge_port,
            "discharge_port_name": result.discharge_port_name,

            # Cargo
            "total_packages": result.total_packages,
            "package_unit": result.package_unit,
            "gross_weight": result.gross_weight,
            "net_weight": result.net_weight,
            "container_numbers": result.container_numbers,
            "container_count": result.container_count,

            # Values
            "currency_code": result.currency,
            "fob_value": result.total_value,
            "incoterms": result.incoterms,
            "exchange_rate": result.exchange_rate,
        }

    def to_hs_items(self, result: AIParseResult) -> List[Dict[str, Any]]:
        """Convert AI parsed items to HS code create payloads"""
        return [
            {
                "item_no": item.get("item_no", idx + 1),
                "hs_code": item.get("hs_code", ""),
                "product_code": item.get("product_code"),      # Customer PN / DELL PN
                "supplier_code": item.get("supplier_code"),    # Supplier PN / Model
                "product_name": item.get("product_name"),      # Description of Goods
                "quantity": item.get("quantity", 0),
                "unit": item.get("unit"),
                "unit_price": item.get("unit_price", 0),
                "total_value": item.get("total_value", 0),
                "gross_weight": item.get("gross_weight", 0),
                "net_weight": item.get("net_weight", 0),
                "country_of_origin": item.get("country_of_origin"),
            }
            for idx, item in enumerate(result.items)
        ]


# Singleton instance (without db session - will need to be passed)
ai_parser = AIDocumentParser()


async def parse_document_with_ai(
    pdf_content: bytes,
    filename: str = "",
    db_session=None,
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None,
    shipper_name: Optional[str] = None,
    customer_id: Optional[str] = None,
    create_session: bool = True,
    apply_rules: bool = True,
    apply_partner_matching: bool = True,
) -> AIParseResult:
    """
    Convenience function to parse PDF with AI and training system integration.

    Args:
        pdf_content: Raw PDF bytes
        filename: Original filename
        db_session: SQLAlchemy session
        tenant_id: Tenant ID for multi-tenancy
        user_id: User ID for audit trail
        shipper_name: Known shipper name for rule lookup (optional)
        customer_id: Customer ID for rule association (optional)
        create_session: Whether to create AI parsing session for audit trail
        apply_rules: Whether to apply customer-specific rules
        apply_partner_matching: Whether to run partner matching

    Returns:
        AIParseResult with parsed data, session_id, and partner matches
    """
    parser = AIDocumentParser(db_session)
    return await parser.parse_pdf_with_ai(
        pdf_content=pdf_content,
        filename=filename,
        tenant_id=tenant_id,
        user_id=user_id,
        shipper_name=shipper_name,
        customer_id=customer_id,
        create_session=create_session,
        apply_rules=apply_rules,
        apply_partner_matching=apply_partner_matching,
    )
