"""
Freight Calculator Service
Auto-calculate freight_charge from Rates table based on pickup and delivery locations
"""

from sqlmodel import Session, select
from app.models import Rate, RateCustomer, Site, Location
from typing import Optional, Tuple
from datetime import date as date_type


def get_freight_from_rates(
    session: Session,
    pickup_location_id: Optional[str],
    delivery_location_id: Optional[str],
    pickup_site_id: Optional[str],
    delivery_site_id: Optional[str],
    tenant_id: str,
    customer_id: Optional[str] = None,
    equipment: Optional[str] = None,  # "20", "40", "45" for container type
    order_date: Optional[date_type] = None
) -> Tuple[Optional[int], Optional[str]]:
    """
    Get freight_charge from Rates table.

    Logic:
    1. If pickup/delivery location IDs are provided, use them directly
    2. If only site IDs are provided, get locations from sites
    3. Query Rate table for matching pickup_location_id + delivery_location_id
    4. Priority: customer-specific rate > default rate
    5. Return freight_charge based on equipment type (20/40) or per_trip

    Returns:
        Tuple of (freight_charge (int), rate_id (str)) if found, (None, None) otherwise
    """

    # If order_date not provided, use today
    if not order_date:
        order_date = date_type.today()

    # Get location IDs from sites if needed
    final_pickup_location_id = pickup_location_id
    final_delivery_location_id = delivery_location_id

    if not final_pickup_location_id and pickup_site_id:
        pickup_site = session.get(Site, pickup_site_id)
        if pickup_site and pickup_site.location_id:
            final_pickup_location_id = pickup_site.location_id

    if not final_delivery_location_id and delivery_site_id:
        delivery_site = session.get(Site, delivery_site_id)
        if delivery_site and delivery_site.location_id:
            final_delivery_location_id = delivery_site.location_id

    # If we still don't have both location IDs, return None
    if not final_pickup_location_id or not final_delivery_location_id:
        return None, None

    # Query Rate table for matching locations
    # Find active rates that cover the order date
    candidate_rates = session.exec(
        select(Rate).where(
            Rate.tenant_id == tenant_id,
            Rate.pickup_location_id == final_pickup_location_id,
            Rate.delivery_location_id == final_delivery_location_id,
            Rate.status == "ACTIVE",
            Rate.effective_date <= order_date,
            # end_date is NULL or >= order_date
            ((Rate.end_date.is_(None)) | (Rate.end_date >= order_date))
        ).order_by(Rate.effective_date.desc())  # Get most recent rate first
    ).all()

    if not candidate_rates:
        return None, None

    # Priority: customer-specific > default
    selected_rate = None

    if customer_id:
        for rate in candidate_rates:
            rate_customer = session.exec(
                select(RateCustomer)
                .where(RateCustomer.rate_id == rate.id)
                .where(RateCustomer.customer_id == customer_id)
            ).first()
            if rate_customer:
                selected_rate = rate
                break

    # Fall back to default rate (no customer assignments)
    if not selected_rate:
        for rate in candidate_rates:
            has_customers = session.exec(
                select(RateCustomer).where(RateCustomer.rate_id == rate.id)
            ).first()
            if not has_customers:
                selected_rate = rate
                break

    if not selected_rate:
        return None, None

    # Determine price based on pricing_type and equipment
    price = None

    if selected_rate.pricing_type == "CONTAINER":
        # Map equipment to container type
        if equipment in ("20",):
            price = selected_rate.price_cont_20
        elif equipment in ("40", "45"):
            # 45ft uses same price as 40ft
            price = selected_rate.price_cont_40
        else:
            # Default to 20ft if not specified
            price = selected_rate.price_cont_20
    else:  # TRIP
        price = selected_rate.price_per_trip

    return price, selected_rate.id


def calculate_freight_for_order(session: Session, order) -> Optional[int]:
    """
    Calculate freight_charge for a given order using the rate lookup.

    Args:
        session: Database session
        order: Order object with pickup/delivery site IDs and equipment

    Returns:
        freight_charge (int) if found, None otherwise
    """
    from datetime import datetime

    order_date = None
    if order.order_date:
        order_date = order.order_date.date() if isinstance(order.order_date, datetime) else order.order_date

    freight, rate_id = get_freight_from_rates(
        session=session,
        pickup_location_id=order.pickup_location_id,
        delivery_location_id=order.delivery_location_id,
        pickup_site_id=order.pickup_site_id,
        delivery_site_id=order.delivery_site_id,
        tenant_id=str(order.tenant_id),
        customer_id=order.customer_id,
        equipment=order.equipment,
        order_date=order_date
    )

    return freight
