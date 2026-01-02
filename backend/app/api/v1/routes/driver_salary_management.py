from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from typing import List, Optional

from app.db.session import get_session
from app.models import Order, User, Site, DriverSalarySetting
from app.models.order import OrderStatus
from app.schemas.driver_salary_trip import DriverSalaryTripUpdate, DriverSalaryTripRead, SalaryBreakdown
from app.core.security import get_current_user
from app.services.order_status_logger import get_delivered_date
from app.services.salary_calculator import calculate_trip_salary
from app.services.distance_calculator import get_distance_from_rates

router = APIRouter(prefix="/driver-salary-management", tags=["driver-salary-management"])


def get_is_from_port(session: Session, order: Order) -> Optional[bool]:
    """Check if pickup site is a port (site_type='PORT')"""
    if not order.pickup_site_id:
        return None

    pickup_site = session.get(Site, order.pickup_site_id)
    if not pickup_site:
        return None

    return pickup_site.site_type == "PORT"


def count_trips_on_date(session: Session, tenant_id: str, driver_id: str, delivered_date: date) -> int:
    """Count trips delivered by driver on a specific date"""
    # Query orders with DELIVERED status on the same date
    from app.models import OrderStatusLog
    from sqlalchemy import cast, Date

    # Get all order IDs delivered on this date
    delivered_orders = session.exec(
        select(OrderStatusLog.order_id)
        .where(
            OrderStatusLog.tenant_id == tenant_id,
            OrderStatusLog.to_status == OrderStatus.DELIVERED,
            cast(OrderStatusLog.changed_at, Date) == delivered_date
        )
        .distinct()
    ).all()

    if not delivered_orders:
        return 0

    # Count how many of those orders belong to this driver
    count = session.exec(
        select(func.count(Order.id))
        .where(
            Order.id.in_(delivered_orders),
            Order.driver_id == driver_id
        )
    ).one()

    return count


def is_first_trip_on_date(session: Session, tenant_id: str, driver_id: str, delivered_date: date, order_id: str) -> bool:
    """
    Check if this order is the first trip (by created_at) for this driver on this date.
    Used to determine which trip receives the daily bonus.
    """
    from app.models import OrderStatusLog
    from sqlalchemy import cast, Date

    # Get all order IDs delivered on this date for this driver
    delivered_orders = session.exec(
        select(OrderStatusLog.order_id)
        .where(
            OrderStatusLog.tenant_id == tenant_id,
            OrderStatusLog.to_status == OrderStatus.DELIVERED,
            cast(OrderStatusLog.changed_at, Date) == delivered_date
        )
        .distinct()
    ).all()

    if not delivered_orders:
        return False

    # Get the first order (by created_at) for this driver on this date
    first_order = session.exec(
        select(Order.id)
        .where(
            Order.id.in_(delivered_orders),
            Order.driver_id == driver_id
        )
        .order_by(Order.created_at.asc())
        .limit(1)
    ).first()

    return first_order == order_id


def count_trips_in_month(session: Session, tenant_id: str, driver_id: str, year: int, month: int) -> int:
    """Count total trips delivered by driver in a month"""
    from app.models import OrderStatusLog

    # Get all order IDs delivered in this month
    delivered_orders = session.exec(
        select(OrderStatusLog.order_id)
        .where(
            OrderStatusLog.tenant_id == tenant_id,
            OrderStatusLog.to_status == OrderStatus.DELIVERED,
            func.extract('year', OrderStatusLog.changed_at) == year,
            func.extract('month', OrderStatusLog.changed_at) == month
        )
        .distinct()
    ).all()

    if not delivered_orders:
        return 0

    # Count how many of those orders belong to this driver
    count = session.exec(
        select(func.count(Order.id))
        .where(
            Order.id.in_(delivered_orders),
            Order.driver_id == driver_id
        )
    ).one()

    return count


@router.get("/trips", response_model=List[DriverSalaryTripRead])
def list_driver_salary_trips(
    driver_id: Optional[str] = None,
    year: int = Query(..., description="Year (e.g., 2025)"),
    month: int = Query(..., ge=1, le=12, description="Month (1-12)"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    List all trips for all drivers (or specific driver) in a specific month for salary calculation.
    Only includes orders with DELIVERED or COMPLETED status.
    """
    if current_user.role not in ("DISPATCHER", "ADMIN"):
        raise HTTPException(403, "Only DISPATCHER or ADMIN can access salary management")

    tenant_id = str(current_user.tenant_id)

    # Get all orders for this driver that were DELIVERED in the specified month
    from app.models import OrderStatusLog

    # First, get all order IDs that were marked DELIVERED in this month
    delivered_orders_subquery = (
        select(OrderStatusLog.order_id)
        .where(
            OrderStatusLog.tenant_id == tenant_id,
            OrderStatusLog.to_status == OrderStatus.DELIVERED,
            func.extract('year', OrderStatusLog.changed_at) == year,
            func.extract('month', OrderStatusLog.changed_at) == month
        )
        .distinct()
    )

    delivered_order_ids = session.exec(delivered_orders_subquery).all()

    if not delivered_order_ids:
        return []

    # Now get the full Order objects (all drivers or specific driver)
    query = select(Order).where(
        Order.tenant_id == tenant_id,
        Order.id.in_(delivered_order_ids),
        Order.status.in_([OrderStatus.DELIVERED, OrderStatus.COMPLETED])
    )

    # Filter by driver_id only if provided
    if driver_id:
        query = query.where(Order.driver_id == driver_id)

    query = query.order_by(Order.created_at.desc())

    orders = session.exec(query).all()

    # Get active salary settings for calculations
    settings = session.exec(
        select(DriverSalarySetting).where(
            DriverSalarySetting.tenant_id == tenant_id,
            DriverSalarySetting.status == "ACTIVE"
        ).limit(1)
    ).first()

    # Build response with calculated fields
    result = []

    # Track which (driver_id, delivered_date) combinations have already received daily bonus
    # Only ONE trip per driver per day should receive the bonus
    bonus_applied_keys = set()  # Set of (driver_id, delivered_date) tuples

    for order in orders:
        # Get delivered date from status logs
        delivered_date = get_delivered_date(session, order.id)
        delivered_date_only = delivered_date.date() if delivered_date else None

        # Get site information for pickup and delivery
        pickup_site_name = None
        delivery_site_name = None
        if order.pickup_site_id:
            pickup_site = session.get(Site, order.pickup_site_id)
            if pickup_site:
                pickup_site_name = pickup_site.company_name

        if order.delivery_site_id:
            delivery_site = session.get(Site, order.delivery_site_id)
            if delivery_site:
                delivery_site_name = delivery_site.company_name

        # Auto-calculate distance from Rates if not already set
        distance_km = order.distance_km
        if not distance_km and order.pickup_site_id and order.delivery_site_id:
            # Get distance from Rates table based on site locations
            calculated_distance = get_distance_from_rates(
                session=session,
                pickup_location_id=None,  # Will be derived from sites
                delivery_location_id=None,
                pickup_site_id=order.pickup_site_id,
                delivery_site_id=order.delivery_site_id,
                tenant_id=tenant_id,
                order_date=delivered_date_only
            )
            if calculated_distance:
                distance_km = calculated_distance

        # Calculate trips per day and month
        trips_per_day = 0
        trips_per_month = 0
        if delivered_date_only and order.driver_id:
            trips_per_day = count_trips_on_date(session, tenant_id, order.driver_id, delivered_date_only)
            trips_per_month = count_trips_in_month(session, tenant_id, order.driver_id, year, month)

        # Check if from port
        is_from_port = get_is_from_port(session, order)

        # Calculate salary if settings available
        calculated_salary = None
        breakdown_dict = None
        if settings and delivered_date_only:
            # Use calculated distance for salary calculation
            order_with_distance = order
            if distance_km and not order.distance_km:
                # Temporarily set distance for calculation
                order_with_distance.distance_km = distance_km

            # Determine if this trip should receive the daily bonus
            # Only ONE trip per driver per day gets the bonus
            bonus_key = (order.driver_id, delivered_date_only)
            is_bonus_applied_trip = False
            if trips_per_day >= 2 and bonus_key not in bonus_applied_keys:
                is_bonus_applied_trip = True
                bonus_applied_keys.add(bonus_key)

            breakdown_dict = calculate_trip_salary(
                session=session,
                order=order_with_distance,
                settings=settings,
                trip_number_in_day=trips_per_day,
                delivered_date=delivered_date_only,
                is_bonus_applied_trip=is_bonus_applied_trip
            )
            calculated_salary = breakdown_dict["total"]

        trip_data = DriverSalaryTripRead(
            id=order.id,
            order_code=order.order_code,
            customer_id=order.customer_id,
            driver_id=order.driver_id,
            pickup_text=order.pickup_text,
            delivery_text=order.delivery_text,
            pickup_site_id=order.pickup_site_id,
            delivery_site_id=order.delivery_site_id,
            pickup_site_name=pickup_site_name,
            delivery_site_name=delivery_site_name,
            equipment=order.equipment,
            qty=order.qty,
            container_code=order.container_code,
            cargo_note=order.cargo_note,
            distance_km=distance_km,  # Use calculated distance
            is_flatbed=order.is_flatbed,
            is_internal_cargo=order.is_internal_cargo,
            is_holiday=order.is_holiday,
            customer_requested_date=order.customer_requested_date,  # Cust Date
            delivered_date=delivered_date,
            is_from_port=is_from_port,
            trips_per_day=trips_per_day,
            trips_per_month=trips_per_month,
            calculated_salary=calculated_salary,
            salary_breakdown=SalaryBreakdown(**breakdown_dict) if breakdown_dict else None,
            created_at=order.created_at,
            updated_at=order.updated_at,
        )
        result.append(trip_data)

    return result


@router.patch("/trips/{order_id}", response_model=DriverSalaryTripRead)
def update_trip_salary_flags(
    order_id: str,
    payload: DriverSalaryTripUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Update salary calculation flags for a trip.
    Allows editing is_flatbed, is_internal_cargo, is_holiday.
    """
    if current_user.role not in ("DISPATCHER", "ADMIN"):
        raise HTTPException(403, "Only DISPATCHER or ADMIN can update salary flags")

    tenant_id = str(current_user.tenant_id)

    order = session.get(Order, order_id)
    if not order or str(order.tenant_id) != tenant_id:
        raise HTTPException(404, "Order not found")

    # Update salary flags
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(order, field, value)

    session.add(order)
    session.commit()
    session.refresh(order)

    # Get delivered date for response
    delivered_date = get_delivered_date(session, order.id)
    delivered_date_only = delivered_date.date() if delivered_date else None

    # Get site information for pickup and delivery
    pickup_site_name = None
    delivery_site_name = None
    if order.pickup_site_id:
        pickup_site = session.get(Site, order.pickup_site_id)
        if pickup_site:
            pickup_site_name = pickup_site.company_name

    if order.delivery_site_id:
        delivery_site = session.get(Site, order.delivery_site_id)
        if delivery_site:
            delivery_site_name = delivery_site.company_name

    # Auto-calculate distance from Rates if not already set
    distance_km = order.distance_km
    if not distance_km and order.pickup_site_id and order.delivery_site_id:
        calculated_distance = get_distance_from_rates(
            session=session,
            pickup_location_id=None,
            delivery_location_id=None,
            pickup_site_id=order.pickup_site_id,
            delivery_site_id=order.delivery_site_id,
            tenant_id=tenant_id,
            order_date=delivered_date_only
        )
        if calculated_distance:
            distance_km = calculated_distance

    # Calculate trips per day and month
    trips_per_day = 0
    trips_per_month = 0
    if delivered_date_only and order.driver_id:
        trips_per_day = count_trips_on_date(session, tenant_id, order.driver_id, delivered_date_only)
        trips_per_month = count_trips_in_month(
            session, tenant_id, order.driver_id,
            delivered_date.year, delivered_date.month
        )

    # Check if from port
    is_from_port = get_is_from_port(session, order)

    # Get active salary settings for calculation
    settings = session.exec(
        select(DriverSalarySetting).where(
            DriverSalarySetting.tenant_id == tenant_id,
            DriverSalarySetting.status == "ACTIVE"
        ).limit(1)
    ).first()

    # Calculate salary if settings available
    calculated_salary = None
    breakdown_dict = None
    if settings and delivered_date_only:
        # Use calculated distance for salary calculation
        order_with_distance = order
        if distance_km and not order.distance_km:
            order_with_distance.distance_km = distance_km

        # Determine if this trip should receive the daily bonus
        # Only the first trip of the day (by created_at) gets the bonus
        is_bonus_applied_trip = False
        if trips_per_day >= 2:
            is_bonus_applied_trip = is_first_trip_on_date(
                session, tenant_id, order.driver_id, delivered_date_only, order.id
            )

        breakdown_dict = calculate_trip_salary(
            session=session,
            order=order_with_distance,
            settings=settings,
            trip_number_in_day=trips_per_day,
            delivered_date=delivered_date_only,
            is_bonus_applied_trip=is_bonus_applied_trip
        )
        calculated_salary = breakdown_dict["total"]

    return DriverSalaryTripRead(
        id=order.id,
        order_code=order.order_code,
        customer_id=order.customer_id,
        driver_id=order.driver_id,
        pickup_text=order.pickup_text,
        delivery_text=order.delivery_text,
        pickup_site_id=order.pickup_site_id,
        delivery_site_id=order.delivery_site_id,
        pickup_site_name=pickup_site_name,
        delivery_site_name=delivery_site_name,
        equipment=order.equipment,
        qty=order.qty,
        container_code=order.container_code,
        cargo_note=order.cargo_note,
        distance_km=distance_km,  # Use calculated distance
        is_flatbed=order.is_flatbed,
        is_internal_cargo=order.is_internal_cargo,
        is_holiday=order.is_holiday,
        customer_requested_date=order.customer_requested_date,  # Cust Date
        delivered_date=delivered_date,
        is_from_port=is_from_port,
        trips_per_day=trips_per_day,
        trips_per_month=trips_per_month,
        calculated_salary=calculated_salary,
        salary_breakdown=SalaryBreakdown(**breakdown_dict) if breakdown_dict else None,
        created_at=order.created_at,
        updated_at=order.updated_at,
    )
