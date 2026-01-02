"""
Trip Revenue Management API
Quản lý doanh thu chuyến - View and manage freight charges for orders
"""

from datetime import datetime, date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from pydantic import BaseModel

from app.db.session import get_session
from app.models import Order, Customer, Site, Location, Rate, RateCustomer, User, Driver
from app.core.security import get_current_user
from app.services.freight_calculator import get_freight_from_rates, calculate_freight_for_order

router = APIRouter(prefix="/trip-revenue", tags=["trip-revenue"])


class FreightUpdatePayload(BaseModel):
    freight_charge: int


class BulkCalculatePayload(BaseModel):
    order_ids: List[str]


class OrderRevenueItem(BaseModel):
    id: str
    order_code: str
    order_date: Optional[datetime]
    customer_id: str
    customer_name: Optional[str]
    customer_code: Optional[str]
    pickup_site_name: Optional[str]
    delivery_site_name: Optional[str]
    pickup_location_name: Optional[str]
    delivery_location_name: Optional[str]
    equipment: Optional[str]
    container_code: Optional[str]
    status: str
    driver_name: Optional[str]
    freight_charge: Optional[int]
    suggested_freight: Optional[int]  # From Rate lookup
    rate_matched: bool  # Whether a rate was found
    distance_km: Optional[int]


@router.get("/list")
def list_order_revenues(
    status: Optional[str] = None,
    customer_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    has_freight: Optional[bool] = None,  # Filter orders with/without freight
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    List orders with revenue information.
    Shows current freight_charge and suggested freight from Rate lookup.
    """
    tenant_id = str(current_user.tenant_id)

    # Build query
    query = select(Order).where(Order.tenant_id == tenant_id)

    # Filter by status - default to completed statuses for revenue
    if status:
        query = query.where(Order.status == status)
    else:
        # Show DELIVERED and COMPLETED orders by default for revenue
        query = query.where(Order.status.in_([
            "DELIVERED",
            "COMPLETED",
            "EMPTY_RETURN",
            "IN_TRANSIT",
            "ASSIGNED"
        ]))

    if customer_id:
        query = query.where(Order.customer_id == customer_id)

    if start_date:
        query = query.where(Order.order_date >= datetime.fromisoformat(start_date))

    if end_date:
        # Add 1 day to include the end date
        end_dt = datetime.fromisoformat(end_date)
        end_dt = end_dt.replace(hour=23, minute=59, second=59)
        query = query.where(Order.order_date <= end_dt)

    if has_freight is not None:
        if has_freight:
            query = query.where(Order.freight_charge.isnot(None))
            query = query.where(Order.freight_charge > 0)
        else:
            query = query.where(
                (Order.freight_charge.is_(None)) | (Order.freight_charge == 0)
            )

    # Order by date desc
    query = query.order_by(Order.order_date.desc())

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Paginate
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    orders = session.exec(query).all()

    # Collect IDs for batch loading
    customer_ids = set()
    site_ids = set()
    driver_ids = set()

    for order in orders:
        if order.customer_id:
            customer_ids.add(order.customer_id)
        if order.pickup_site_id:
            site_ids.add(order.pickup_site_id)
        if order.delivery_site_id:
            site_ids.add(order.delivery_site_id)
        if order.driver_id:
            driver_ids.add(order.driver_id)

    # Batch load customers
    customers = {}
    if customer_ids:
        customer_objs = session.exec(
            select(Customer).where(Customer.id.in_(customer_ids))
        ).all()
        customers = {str(c.id): c for c in customer_objs}

    # Batch load sites
    sites = {}
    if site_ids:
        site_objs = session.exec(
            select(Site).where(Site.id.in_(site_ids))
        ).all()
        sites = {str(s.id): s for s in site_objs}

    # Get location IDs from sites
    location_ids = set()
    for site in sites.values():
        if site.location_id:
            location_ids.add(site.location_id)

    # Batch load locations
    locations = {}
    if location_ids:
        location_objs = session.exec(
            select(Location).where(Location.id.in_(location_ids))
        ).all()
        locations = {str(loc.id): loc for loc in location_objs}

    # Batch load drivers
    drivers = {}
    if driver_ids:
        driver_objs = session.exec(
            select(Driver).where(Driver.id.in_(driver_ids))
        ).all()
        drivers = {str(d.id): d for d in driver_objs}

    # Build result
    result = []
    for order in orders:
        customer = customers.get(str(order.customer_id)) if order.customer_id else None
        pickup_site = sites.get(str(order.pickup_site_id)) if order.pickup_site_id else None
        delivery_site = sites.get(str(order.delivery_site_id)) if order.delivery_site_id else None
        driver = drivers.get(str(order.driver_id)) if order.driver_id else None

        # Get location names from sites
        pickup_location = None
        delivery_location = None
        if pickup_site and pickup_site.location_id:
            pickup_location = locations.get(str(pickup_site.location_id))
        if delivery_site and delivery_site.location_id:
            delivery_location = locations.get(str(delivery_site.location_id))

        # Calculate suggested freight from Rate
        suggested_freight, rate_id = get_freight_from_rates(
            session=session,
            pickup_location_id=pickup_location.id if pickup_location else None,
            delivery_location_id=delivery_location.id if delivery_location else None,
            pickup_site_id=order.pickup_site_id,
            delivery_site_id=order.delivery_site_id,
            tenant_id=tenant_id,
            customer_id=order.customer_id,
            equipment=order.equipment,
            order_date=order.order_date.date() if order.order_date else None
        )

        # Get toll_stations from rate if available
        toll_stations = None
        if rate_id:
            rate_obj = session.get(Rate, rate_id)
            if rate_obj:
                toll_stations = rate_obj.toll_stations

        result.append({
            "id": order.id,
            "order_code": order.order_code,
            "order_date": order.order_date.isoformat() if order.order_date else None,
            "customer_id": order.customer_id,
            "customer_name": customer.name if customer else None,
            "customer_code": customer.code if customer else None,
            "pickup_site_name": pickup_site.company_name if pickup_site else order.pickup_text,
            "delivery_site_name": delivery_site.company_name if delivery_site else order.delivery_text,
            "pickup_location_name": pickup_location.name if pickup_location else None,
            "delivery_location_name": delivery_location.name if delivery_location else None,
            "equipment": order.equipment,
            "container_code": order.container_code,
            "status": order.status,
            "driver_name": driver.name if driver else None,
            "driver_short_name": driver.short_name if driver else None,
            "freight_charge": order.freight_charge,
            "suggested_freight": suggested_freight,
            "rate_matched": rate_id is not None,
            "distance_km": order.distance_km,
            "toll_stations": toll_stations,
        })

    return {
        "items": result,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.get("/summary")
def get_revenue_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Get revenue summary statistics.
    """
    tenant_id = str(current_user.tenant_id)

    # Base query for completed orders
    query = (
        select(Order)
        .where(Order.tenant_id == tenant_id)
        .where(Order.status.in_([
            "DELIVERED",
            "COMPLETED",
            "EMPTY_RETURN"
        ]))
    )

    if start_date:
        query = query.where(Order.order_date >= datetime.fromisoformat(start_date))

    if end_date:
        end_dt = datetime.fromisoformat(end_date)
        end_dt = end_dt.replace(hour=23, minute=59, second=59)
        query = query.where(Order.order_date <= end_dt)

    orders = session.exec(query).all()

    # Calculate statistics
    total_orders = len(orders)
    orders_with_freight = sum(1 for o in orders if o.freight_charge and o.freight_charge > 0)
    orders_without_freight = total_orders - orders_with_freight
    total_revenue = sum(o.freight_charge or 0 for o in orders)

    # Calculate potential revenue from rates for orders without freight
    potential_revenue = 0
    for order in orders:
        if not order.freight_charge or order.freight_charge == 0:
            suggested, _ = get_freight_from_rates(
                session=session,
                pickup_location_id=order.pickup_location_id,
                delivery_location_id=order.delivery_location_id,
                pickup_site_id=order.pickup_site_id,
                delivery_site_id=order.delivery_site_id,
                tenant_id=tenant_id,
                customer_id=order.customer_id,
                equipment=order.equipment,
                order_date=order.order_date.date() if order.order_date else None
            )
            if suggested:
                potential_revenue += suggested

    return {
        "total_orders": total_orders,
        "orders_with_freight": orders_with_freight,
        "orders_without_freight": orders_without_freight,
        "total_revenue": total_revenue,
        "potential_revenue": potential_revenue,
        "coverage_percent": round((orders_with_freight / total_orders * 100) if total_orders > 0 else 0, 1),
    }


@router.patch("/{order_id}/freight")
def update_freight_charge(
    order_id: str,
    payload: FreightUpdatePayload,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Update freight_charge for an order.
    """
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can update freight charges")

    tenant_id = str(current_user.tenant_id)

    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(404, "Order not found")
    if str(order.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    order.freight_charge = payload.freight_charge
    session.add(order)
    session.commit()
    session.refresh(order)

    return {"ok": True, "freight_charge": order.freight_charge}


@router.post("/calculate-suggested/{order_id}")
def calculate_suggested_freight(
    order_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Calculate and return suggested freight for an order from Rate lookup.
    Does not update the order.
    """
    tenant_id = str(current_user.tenant_id)

    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(404, "Order not found")
    if str(order.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    suggested_freight = calculate_freight_for_order(session, order)

    return {
        "order_id": order_id,
        "current_freight": order.freight_charge,
        "suggested_freight": suggested_freight,
        "rate_found": suggested_freight is not None,
    }


@router.post("/apply-suggested/{order_id}")
def apply_suggested_freight(
    order_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Calculate suggested freight from Rate and apply to order.
    """
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can apply freight charges")

    tenant_id = str(current_user.tenant_id)

    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(404, "Order not found")
    if str(order.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    suggested_freight = calculate_freight_for_order(session, order)

    if suggested_freight is None:
        raise HTTPException(404, "No matching rate found for this order")

    order.freight_charge = suggested_freight
    session.add(order)
    session.commit()
    session.refresh(order)

    return {
        "ok": True,
        "order_id": order_id,
        "freight_charge": order.freight_charge,
    }


@router.post("/bulk-apply")
def bulk_apply_suggested_freight(
    payload: BulkCalculatePayload,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Apply suggested freight to multiple orders at once.
    """
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can apply freight charges")

    tenant_id = str(current_user.tenant_id)

    updated = 0
    skipped = 0
    errors = []

    for order_id in payload.order_ids:
        order = session.get(Order, order_id)
        if not order or str(order.tenant_id) != tenant_id:
            errors.append({"order_id": order_id, "error": "Not found"})
            continue

        suggested_freight = calculate_freight_for_order(session, order)

        if suggested_freight is None:
            skipped += 1
            continue

        order.freight_charge = suggested_freight
        session.add(order)
        updated += 1

    session.commit()

    return {
        "ok": True,
        "updated": updated,
        "skipped": skipped,
        "errors": errors,
    }


@router.post("/recalculate-all")
def recalculate_all_freights(
    overwrite: bool = Query(default=False, description="Overwrite existing freight charges"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Recalculate freight for all orders (optionally overwriting existing values).
    Use with caution!
    """
    if current_user.role != "ADMIN":
        raise HTTPException(403, "Only ADMIN can recalculate all freights")

    tenant_id = str(current_user.tenant_id)

    # Query orders
    query = select(Order).where(Order.tenant_id == tenant_id)

    if not overwrite:
        # Only orders without freight
        query = query.where(
            (Order.freight_charge.is_(None)) | (Order.freight_charge == 0)
        )

    orders = session.exec(query).all()

    updated = 0
    skipped = 0

    for order in orders:
        suggested_freight = calculate_freight_for_order(session, order)

        if suggested_freight is None:
            skipped += 1
            continue

        order.freight_charge = suggested_freight
        session.add(order)
        updated += 1

    session.commit()

    return {
        "ok": True,
        "updated": updated,
        "skipped": skipped,
        "total_processed": len(orders),
    }
