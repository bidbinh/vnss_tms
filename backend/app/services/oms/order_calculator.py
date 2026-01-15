"""
OMS Order Calculator Service
"""
from decimal import Decimal
from typing import Dict, List
from app.models.oms import OMSOrder, OMSOrderItem


def calculate_order_totals(order: OMSOrder, items: List[OMSOrderItem]) -> Dict:
    """
    Calculate order totals based on items

    Returns:
        {
            "total_product_amount": Decimal,
            "total_shipping_cost": Decimal,
            "total_tax": Decimal,
            "total_discount": Decimal,
            "grand_total": Decimal
        }
    """
    total_product = Decimal("0")
    total_shipping = Decimal("0")
    total_tax = Decimal("0")

    for item in items:
        # Calculate line total
        unit_price = item.approved_unit_price or item.quoted_unit_price
        shipping_cost = item.shipping_unit_cost or Decimal("0")

        line_total = (unit_price + shipping_cost) * item.quantity
        item.line_total = line_total

        # Calculate tax (VAT 10%)
        tax = line_total * Decimal("0.1")
        item.tax_amount = tax

        # Calculate net amount
        item.net_amount = line_total + tax - item.discount_amount

        # Sum
        total_product += unit_price * item.quantity
        total_shipping += shipping_cost * item.quantity
        total_tax += tax

    grand_total = total_product + total_shipping + total_tax - (order.total_discount or Decimal("0"))

    return {
        "total_product_amount": total_product,
        "total_shipping_cost": total_shipping,
        "total_tax": total_tax,
        "grand_total": grand_total
    }


def compare_with_cs_price(
    quoted_price: Decimal,
    cs_price: Decimal
) -> Dict:
    """
    Compare quoted price with CS price

    Returns:
        {
            "difference": Decimal,
            "difference_percent": float,
            "requires_approval": bool
        }
    """
    difference = quoted_price - cs_price
    difference_percent = float((difference / cs_price) * 100) if cs_price > 0 else 0

    # Require approval if price is lower than CS price
    requires_approval = difference < 0

    return {
        "difference": difference,
        "difference_percent": difference_percent,
        "requires_approval": requires_approval
    }


def generate_order_number(tenant_id: str) -> str:
    """
    Generate unique order number
    Format: ORD-YYYYMMDD-XXXX
    """
    from datetime import datetime
    import random

    date_str = datetime.now().strftime("%Y%m%d")
    random_suffix = f"{random.randint(0, 9999):04d}"

    return f"ORD-{date_str}-{random_suffix}"


def generate_shipment_number(tenant_id: str) -> str:
    """
    Generate unique shipment number
    Format: SHP-YYYYMMDD-XXXX
    """
    from datetime import datetime
    import random

    date_str = datetime.now().strftime("%Y%m%d")
    random_suffix = f"{random.randint(0, 9999):04d}"

    return f"SHP-{date_str}-{random_suffix}"
