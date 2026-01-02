"""
Distance Calculator Service
Auto-calculate distance_km from Rates table based on pickup and delivery locations
"""

from sqlmodel import Session, select
from app.models import Rate, Site, Location
from typing import Optional
from datetime import date as date_type


def get_distance_from_rates(
    session: Session,
    pickup_location_id: Optional[str],
    delivery_location_id: Optional[str],
    pickup_site_id: Optional[str],
    delivery_site_id: Optional[str],
    tenant_id: str,
    order_date: Optional[date_type] = None
) -> Optional[int]:
    """
    Get distance_km from Rates table.

    Logic:
    1. If pickup/delivery location IDs are provided, use them directly
    2. If only site IDs are provided, get locations from sites
    3. Query Rate table for matching pickup_location_id + delivery_location_id
    4. Return distance_km from the active rate

    Returns:
        distance_km (int) if found, None otherwise
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
        return None

    # Query Rate table for matching locations
    # Find active rate that covers the order date
    rate = session.exec(
        select(Rate).where(
            Rate.tenant_id == tenant_id,
            Rate.pickup_location_id == final_pickup_location_id,
            Rate.delivery_location_id == final_delivery_location_id,
            Rate.status == "ACTIVE",
            Rate.effective_date <= order_date,
            # end_date is NULL or >= order_date
            ((Rate.end_date.is_(None)) | (Rate.end_date >= order_date))
        ).order_by(Rate.effective_date.desc())  # Get most recent rate
    ).first()

    if rate and rate.distance_km:
        return rate.distance_km

    return None
