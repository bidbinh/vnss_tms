"""
Order Validation Service
Validates orders for auto-acceptance
Calculates confidence score for automation decisions
"""
import logging
from typing import Dict, Optional, Tuple
from datetime import datetime
from sqlmodel import Session
from app.models import Order, Customer, Site, Location

logger = logging.getLogger(__name__)


class OrderValidationResult:
    """Result of order validation"""

    def __init__(
        self,
        is_valid: bool,
        confidence: float,
        action: str,  # ACCEPT, REJECT, PENDING_APPROVAL
        reasons: list,
        errors: list
    ):
        self.is_valid = is_valid
        self.confidence = confidence  # 0-100
        self.action = action
        self.reasons = reasons
        self.errors = errors


class OrderValidator:
    """Order validation service for auto-acceptance"""

    def __init__(self):
        self.min_confidence_auto_accept = 90.0
        self.min_confidence_auto_reject = 50.0
        self.min_price_threshold = 0  # Can be configured per customer

    def validate_order(
        self,
        order: Order,
        session: Session
    ) -> OrderValidationResult:
        """
        Validate an order and calculate confidence score

        Args:
            order: Order object to validate
            session: Database session

        Returns:
            OrderValidationResult with validation outcome
        """
        reasons = []
        errors = []
        confidence = 100.0

        # Check 1: Required fields
        if not order.customer_id:
            errors.append("Missing customer_id")
            confidence -= 20.0

        if not order.pickup_site_id and not order.pickup_location_id and not order.pickup_text:
            errors.append("Missing pickup location")
            confidence -= 15.0

        if not order.delivery_site_id and not order.delivery_location_id and not order.delivery_text:
            errors.append("Missing delivery location")
            confidence -= 15.0

        if not order.equipment:
            errors.append("Missing equipment type")
            confidence -= 10.0

        # Check 2: Customer validation
        customer = session.get(Customer, order.customer_id) if order.customer_id else None
        if not customer:
            errors.append("Customer not found")
            confidence -= 30.0
        else:
            if not customer.is_active:
                errors.append("Customer is inactive")
                confidence -= 25.0
            else:
                reasons.append(f"Customer {customer.name} is active")

            # Check credit limit (optional)
            if customer.credit_limit > 0:
                # TODO: Check current debt vs credit_limit
                pass

        # Check 3: Location/Site validation
        if order.pickup_site_id:
            pickup_site = session.get(Site, order.pickup_site_id)
            if not pickup_site:
                errors.append("Pickup site not found")
                confidence -= 10.0
            elif pickup_site.status != "ACTIVE":
                errors.append("Pickup site is inactive")
                confidence -= 10.0
            else:
                reasons.append(f"Pickup site {pickup_site.company_name} is active")

        if order.delivery_site_id:
            delivery_site = session.get(Site, order.delivery_site_id)
            if not delivery_site:
                errors.append("Delivery site not found")
                confidence -= 10.0
            elif delivery_site.status != "ACTIVE":
                errors.append("Delivery site is inactive")
                confidence -= 10.0
            else:
                reasons.append(f"Delivery site {delivery_site.company_name} is active")

        # Check 4: Equipment validation
        valid_equipment = ["20", "40", "45", "TRUCK"]
        if order.equipment and order.equipment not in valid_equipment:
            errors.append(f"Invalid equipment type: {order.equipment}")
            confidence -= 5.0
        else:
            reasons.append(f"Equipment type {order.equipment} is valid")

        # Check 5: Distance validation
        if order.distance_km:
            if order.distance_km <= 0:
                errors.append("Invalid distance (must be > 0)")
                confidence -= 5.0
            elif order.distance_km > 5000:  # Sanity check
                errors.append(f"Distance too large: {order.distance_km} km")
                confidence -= 5.0
            else:
                reasons.append(f"Distance {order.distance_km} km is valid")

        # Check 6: Price validation
        if order.freight_charge:
            if order.freight_charge < self.min_price_threshold:
                errors.append(f"Price too low: {order.freight_charge} < {self.min_price_threshold}")
                confidence -= 10.0
            else:
                reasons.append(f"Price {order.freight_charge} is acceptable")

        # Check 7: Date validation
        if order.customer_requested_date:
            if order.customer_requested_date < datetime.utcnow():
                errors.append("Requested date is in the past")
                confidence -= 5.0

        # Ensure confidence is within bounds
        confidence = max(0.0, min(100.0, confidence))

        # Determine action
        if errors:
            if confidence < self.min_confidence_auto_reject:
                action = "REJECT"
            else:
                action = "PENDING_APPROVAL"
        else:
            if confidence >= self.min_confidence_auto_accept:
                action = "ACCEPT"
            else:
                action = "PENDING_APPROVAL"

        is_valid = len(errors) == 0 and confidence >= self.min_confidence_auto_accept

        return OrderValidationResult(
            is_valid=is_valid,
            confidence=confidence,
            action=action,
            reasons=reasons,
            errors=errors
        )

    def should_auto_accept(
        self,
        order: Order,
        session: Session
    ) -> Tuple[bool, float, str]:
        """
        Check if order should be auto-accepted

        Args:
            order: Order object
            session: Database session

        Returns:
            Tuple of (should_accept, confidence, reason)
        """
        result = self.validate_order(order, session)

        # Check customer auto-accept config
        if order.customer_id:
            customer = session.get(Customer, order.customer_id)
            if customer:
                if not customer.auto_accept_enabled:
                    return (False, result.confidence, "Customer auto-accept is disabled")

                # Use customer's confidence threshold
                threshold = customer.auto_accept_confidence_threshold
                if result.confidence >= threshold and result.action == "ACCEPT":
                    return (True, result.confidence, f"Confidence {result.confidence}% >= threshold {threshold}%")
                else:
                    return (False, result.confidence, f"Confidence {result.confidence}% < threshold {threshold}%")

        # Default threshold
        if result.confidence >= self.min_confidence_auto_accept and result.action == "ACCEPT":
            return (True, result.confidence, f"Confidence {result.confidence}% >= threshold {self.min_confidence_auto_accept}%")
        else:
            return (False, result.confidence, f"Confidence {result.confidence}% < threshold {self.min_confidence_auto_accept}%")


# Singleton instance
_order_validator: Optional[OrderValidator] = None


def get_order_validator() -> OrderValidator:
    """Get singleton order validator instance"""
    global _order_validator
    if _order_validator is None:
        _order_validator = OrderValidator()
    return _order_validator
