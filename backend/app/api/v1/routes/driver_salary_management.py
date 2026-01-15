from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from typing import List, Optional
from pydantic import BaseModel

from app.db.session import get_session
from app.models import Order, User, Site, DriverSalarySetting, Driver
from app.models.order import OrderStatus
from app.models.hrm import DriverPayroll, DriverPayrollStatus
from app.schemas.driver_salary_trip import DriverSalaryTripUpdate, DriverSalaryTripRead, SalaryBreakdown
from app.core.security import get_current_user
from app.services.order_status_logger import get_delivered_date
from app.services.salary_calculator import calculate_trip_salary
from app.services.distance_calculator import get_distance_from_rates


# === Schemas ===

class AdjustmentItem(BaseModel):
    reason: str
    amount: int  # Positive = bonus, Negative = deduction


class PayrollCreate(BaseModel):
    driver_id: str
    year: int
    month: int
    adjustments: Optional[List[AdjustmentItem]] = []
    notes: Optional[str] = None


class PayrollUpdate(BaseModel):
    adjustments: Optional[List[AdjustmentItem]] = None
    notes: Optional[str] = None


class PayrollRead(BaseModel):
    id: str
    driver_id: str
    driver_name: Optional[str] = None
    driver_code: Optional[str] = None
    year: int
    month: int
    status: str
    trip_snapshot: dict
    adjustments: list
    total_trips: int
    total_distance_km: int
    total_trip_salary: int
    total_adjustments: int
    total_bonuses: int
    total_deductions: int
    net_salary: int
    submitted_at: Optional[datetime] = None
    confirmed_by_driver_at: Optional[datetime] = None
    confirmed_by_hr_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    notes: Optional[str] = None
    driver_notes: Optional[str] = None
    hr_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

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

    # Check if payroll is locked for this period and driver
    locked_payroll = None
    if driver_id:
        locked_payroll = session.exec(
            select(DriverPayroll).where(
                DriverPayroll.tenant_id == tenant_id,
                DriverPayroll.driver_id == driver_id,
                DriverPayroll.year == year,
                DriverPayroll.month == month,
                DriverPayroll.status.in_([
                    DriverPayrollStatus.PENDING_DRIVER_CONFIRM.value,
                    DriverPayrollStatus.CONFIRMED.value,
                    DriverPayrollStatus.PAID.value
                ])
            )
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

        # DISTANCE LOCKING LOGIC
        # If payroll is locked (status >= PENDING_DRIVER_CONFIRM), use snapshot distance
        # Otherwise, calculate dynamically from rates
        distance_km = order.distance_km
        is_distance_locked = False

        if locked_payroll and locked_payroll.trip_snapshot:
            # Payroll exists and is locked - use snapshot distance
            trips_in_snapshot = locked_payroll.trip_snapshot.get("trips", [])
            trip_in_snapshot = next((t for t in trips_in_snapshot if t.get("order_id") == order.id), None)
            if trip_in_snapshot and trip_in_snapshot.get("distance_km"):
                distance_km = trip_in_snapshot["distance_km"]
                is_distance_locked = True

        # If not locked and distance not set, calculate from rates
        if not is_distance_locked and not distance_km and order.pickup_site_id and order.delivery_site_id:
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


# === Payroll Management Endpoints ===

def build_trip_snapshot(session: Session, tenant_id: str, driver_id: str, year: int, month: int, settings: DriverSalarySetting) -> dict:
    """Build trip snapshot with locked distance_km values for payroll"""
    from app.models import OrderStatusLog

    # Get all order IDs that were marked DELIVERED in this month
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
        return {"trips": [], "generated_at": datetime.utcnow().isoformat()}

    # Get orders for this driver
    orders = session.exec(
        select(Order).where(
            Order.tenant_id == tenant_id,
            Order.id.in_(delivered_order_ids),
            Order.driver_id == driver_id,
            Order.status.in_([OrderStatus.DELIVERED, OrderStatus.COMPLETED])
        ).order_by(Order.created_at.asc())
    ).all()

    trips = []
    total_salary = 0
    total_distance = 0
    bonus_applied_keys = set()

    for order in orders:
        delivered_date = get_delivered_date(session, order.id)
        delivered_date_only = delivered_date.date() if delivered_date else None

        # Get distance (from order or calculate from rates)
        distance_km = order.distance_km
        if not distance_km and order.pickup_site_id and order.delivery_site_id:
            distance_km = get_distance_from_rates(
                session=session,
                pickup_location_id=None,
                delivery_location_id=None,
                pickup_site_id=order.pickup_site_id,
                delivery_site_id=order.delivery_site_id,
                tenant_id=tenant_id,
                order_date=delivered_date_only
            ) or 0

        # Count trips per day
        trips_per_day = count_trips_on_date(session, tenant_id, driver_id, delivered_date_only) if delivered_date_only else 0

        # Check if from port
        is_from_port = get_is_from_port(session, order)

        # Calculate salary
        trip_salary = 0
        breakdown = {}
        if settings and delivered_date_only:
            order_copy = order
            if distance_km:
                order_copy.distance_km = distance_km

            bonus_key = (driver_id, delivered_date_only)
            is_bonus_applied_trip = False
            if trips_per_day >= 2 and bonus_key not in bonus_applied_keys:
                is_bonus_applied_trip = True
                bonus_applied_keys.add(bonus_key)

            breakdown = calculate_trip_salary(
                session=session,
                order=order_copy,
                settings=settings,
                trip_number_in_day=trips_per_day,
                delivered_date=delivered_date_only,
                is_bonus_applied_trip=is_bonus_applied_trip
            )
            trip_salary = breakdown.get("total", 0)

        total_salary += trip_salary
        total_distance += distance_km or 0

        # Get site names
        pickup_site_name = None
        delivery_site_name = None
        if order.pickup_site_id:
            pickup_site = session.get(Site, order.pickup_site_id)
            pickup_site_name = pickup_site.company_name if pickup_site else None
        if order.delivery_site_id:
            delivery_site = session.get(Site, order.delivery_site_id)
            delivery_site_name = delivery_site.company_name if delivery_site else None

        trips.append({
            "order_id": str(order.id),
            "order_code": order.order_code,
            "pickup_site_name": pickup_site_name,
            "delivery_site_name": delivery_site_name,
            "equipment": order.equipment,
            "container_code": order.container_code,
            "distance_km": distance_km,
            "delivered_date": delivered_date.isoformat() if delivered_date else None,
            "is_from_port": is_from_port,
            "is_flatbed": order.is_flatbed,
            "is_internal_cargo": order.is_internal_cargo,
            "is_holiday": order.is_holiday,
            "trip_salary": trip_salary,
            "breakdown": breakdown
        })

    return {
        "trips": trips,
        "total_trips": len(trips),
        "total_distance_km": total_distance,
        "total_trip_salary": total_salary,
        "generated_at": datetime.utcnow().isoformat()
    }


@router.get("/payrolls", response_model=List[PayrollRead])
def list_payrolls(
    year: int = Query(..., description="Year"),
    month: int = Query(..., ge=1, le=12, description="Month"),
    driver_id: Optional[str] = None,
    status: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all driver payrolls for a month"""
    if current_user.role not in ("DISPATCHER", "ADMIN", "HR_MANAGER"):
        raise HTTPException(403, "Access denied")

    tenant_id = str(current_user.tenant_id)

    query = select(DriverPayroll).where(
        DriverPayroll.tenant_id == tenant_id,
        DriverPayroll.year == year,
        DriverPayroll.month == month
    )

    if driver_id:
        query = query.where(DriverPayroll.driver_id == driver_id)
    if status:
        query = query.where(DriverPayroll.status == status)

    payrolls = session.exec(query.order_by(DriverPayroll.created_at.desc())).all()

    result = []
    for p in payrolls:
        driver = session.get(Driver, p.driver_id)
        result.append(PayrollRead(
            id=str(p.id),
            driver_id=str(p.driver_id),
            driver_name=driver.name if driver else None,
            driver_code=driver.short_name if driver else None,
            year=p.year,
            month=p.month,
            status=p.status,
            trip_snapshot=p.trip_snapshot or {},
            adjustments=p.adjustments or [],
            total_trips=p.total_trips,
            total_distance_km=p.total_distance_km,
            total_trip_salary=p.total_trip_salary,
            total_adjustments=p.total_adjustments,
            total_bonuses=p.total_bonuses,
            total_deductions=p.total_deductions,
            net_salary=p.net_salary,
            submitted_at=p.submitted_at,
            confirmed_by_driver_at=p.confirmed_by_driver_at,
            confirmed_by_hr_at=p.confirmed_by_hr_at,
            paid_at=p.paid_at,
            notes=p.notes,
            driver_notes=p.driver_notes,
            hr_notes=p.hr_notes,
            created_at=p.created_at,
            updated_at=p.updated_at
        ))

    return result


@router.get("/payrolls/{payroll_id}", response_model=PayrollRead)
def get_payroll(
    payroll_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get a single driver payroll by ID"""
    if current_user.role not in ("DISPATCHER", "ADMIN", "HR_MANAGER", "DRIVER"):
        raise HTTPException(403, "Access denied")

    tenant_id = str(current_user.tenant_id)

    payroll = session.get(DriverPayroll, payroll_id)
    if not payroll or str(payroll.tenant_id) != tenant_id:
        raise HTTPException(404, "Payroll not found")

    # If driver, check they can only see their own payroll
    if current_user.role == "DRIVER":
        driver = session.get(Driver, payroll.driver_id)
        if not driver or str(driver.user_id) != str(current_user.id):
            raise HTTPException(403, "You can only view your own payroll")

    driver = session.get(Driver, payroll.driver_id)

    return PayrollRead(
        id=str(payroll.id),
        driver_id=str(payroll.driver_id),
        driver_name=driver.name if driver else None,
        driver_code=driver.short_name if driver else None,
        year=payroll.year,
        month=payroll.month,
        status=payroll.status,
        trip_snapshot=payroll.trip_snapshot or {},
        adjustments=payroll.adjustments or [],
        total_trips=payroll.total_trips,
        total_distance_km=payroll.total_distance_km,
        total_trip_salary=payroll.total_trip_salary,
        total_adjustments=payroll.total_adjustments,
        total_bonuses=payroll.total_bonuses,
        total_deductions=payroll.total_deductions,
        net_salary=payroll.net_salary,
        submitted_at=payroll.submitted_at,
        confirmed_by_driver_at=payroll.confirmed_by_driver_at,
        confirmed_by_hr_at=payroll.confirmed_by_hr_at,
        paid_at=payroll.paid_at,
        notes=payroll.notes,
        driver_notes=payroll.driver_notes,
        hr_notes=payroll.hr_notes,
        created_at=payroll.created_at,
        updated_at=payroll.updated_at
    )


@router.post("/payrolls", response_model=PayrollRead)
def create_payroll(
    payload: PayrollCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create driver payroll for a month (DRAFT status)"""
    if current_user.role not in ("DISPATCHER", "ADMIN"):
        raise HTTPException(403, "Only DISPATCHER or ADMIN can create payroll")

    tenant_id = str(current_user.tenant_id)

    # Check if payroll already exists
    existing = session.exec(
        select(DriverPayroll).where(
            DriverPayroll.tenant_id == tenant_id,
            DriverPayroll.driver_id == payload.driver_id,
            DriverPayroll.year == payload.year,
            DriverPayroll.month == payload.month
        )
    ).first()

    if existing:
        raise HTTPException(400, f"Payroll for driver {payload.driver_id} in {payload.month}/{payload.year} already exists")

    # Validate driver
    driver = session.get(Driver, payload.driver_id)
    if not driver or str(driver.tenant_id) != tenant_id:
        raise HTTPException(404, "Driver not found")

    # Get salary settings
    settings = session.exec(
        select(DriverSalarySetting).where(
            DriverSalarySetting.tenant_id == tenant_id,
            DriverSalarySetting.status == "ACTIVE"
        ).limit(1)
    ).first()

    # Build trip snapshot
    snapshot = build_trip_snapshot(session, tenant_id, payload.driver_id, payload.year, payload.month, settings)

    # Calculate totals
    adjustments_list = [adj.model_dump() for adj in (payload.adjustments or [])]
    total_adjustments = sum(adj["amount"] for adj in adjustments_list)

    # Calculate monthly bonus (based on total trips)
    total_trips = snapshot.get("total_trips", 0)
    total_bonuses = 0
    if settings:
        if total_trips >= 55:
            total_bonuses = settings.monthly_bonus_55_plus or 0
        elif total_trips >= 51:
            total_bonuses = settings.monthly_bonus_51_54 or 0
        elif total_trips >= 45:
            total_bonuses = settings.monthly_bonus_45_50 or 0

    total_trip_salary = snapshot.get("total_trip_salary", 0)
    net_salary = total_trip_salary + total_adjustments + total_bonuses

    payroll = DriverPayroll(
        tenant_id=tenant_id,
        driver_id=payload.driver_id,
        year=payload.year,
        month=payload.month,
        status=DriverPayrollStatus.DRAFT.value,
        trip_snapshot=snapshot,
        adjustments=adjustments_list,
        total_trips=total_trips,
        total_distance_km=snapshot.get("total_distance_km", 0),
        total_trip_salary=total_trip_salary,
        total_adjustments=total_adjustments,
        total_bonuses=total_bonuses,
        total_deductions=0,  # TODO: integrate with deductions
        net_salary=net_salary,
        notes=payload.notes,
        created_by_id=str(current_user.id)
    )

    session.add(payroll)
    session.commit()
    session.refresh(payroll)

    return PayrollRead(
        id=str(payroll.id),
        driver_id=str(payroll.driver_id),
        driver_name=driver.name,
        driver_code=driver.short_name,
        year=payroll.year,
        month=payroll.month,
        status=payroll.status,
        trip_snapshot=payroll.trip_snapshot or {},
        adjustments=payroll.adjustments or [],
        total_trips=payroll.total_trips,
        total_distance_km=payroll.total_distance_km,
        total_trip_salary=payroll.total_trip_salary,
        total_adjustments=payroll.total_adjustments,
        total_bonuses=payroll.total_bonuses,
        total_deductions=payroll.total_deductions,
        net_salary=payroll.net_salary,
        submitted_at=payroll.submitted_at,
        confirmed_by_driver_at=payroll.confirmed_by_driver_at,
        confirmed_by_hr_at=payroll.confirmed_by_hr_at,
        paid_at=payroll.paid_at,
        notes=payroll.notes,
        driver_notes=payroll.driver_notes,
        hr_notes=payroll.hr_notes,
        created_at=payroll.created_at,
        updated_at=payroll.updated_at
    )


@router.patch("/payrolls/{payroll_id}", response_model=PayrollRead)
def update_payroll(
    payroll_id: str,
    payload: PayrollUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update payroll adjustments and notes (only in DRAFT status)"""
    if current_user.role not in ("DISPATCHER", "ADMIN"):
        raise HTTPException(403, "Only DISPATCHER or ADMIN can update payroll")

    tenant_id = str(current_user.tenant_id)

    payroll = session.get(DriverPayroll, payroll_id)
    if not payroll or str(payroll.tenant_id) != tenant_id:
        raise HTTPException(404, "Payroll not found")

    if payroll.status != DriverPayrollStatus.DRAFT.value:
        raise HTTPException(400, "Can only update payroll in DRAFT status")

    # Update adjustments
    if payload.adjustments is not None:
        adjustments_list = [adj.model_dump() for adj in payload.adjustments]
        payroll.adjustments = adjustments_list
        payroll.total_adjustments = sum(adj["amount"] for adj in adjustments_list)

        # Recalculate net salary
        payroll.net_salary = payroll.total_trip_salary + payroll.total_adjustments + payroll.total_bonuses - payroll.total_deductions

    if payload.notes is not None:
        payroll.notes = payload.notes

    session.add(payroll)
    session.commit()
    session.refresh(payroll)

    driver = session.get(Driver, payroll.driver_id)

    return PayrollRead(
        id=str(payroll.id),
        driver_id=str(payroll.driver_id),
        driver_name=driver.name if driver else None,
        driver_code=driver.short_name if driver else None,
        year=payroll.year,
        month=payroll.month,
        status=payroll.status,
        trip_snapshot=payroll.trip_snapshot or {},
        adjustments=payroll.adjustments or [],
        total_trips=payroll.total_trips,
        total_distance_km=payroll.total_distance_km,
        total_trip_salary=payroll.total_trip_salary,
        total_adjustments=payroll.total_adjustments,
        total_bonuses=payroll.total_bonuses,
        total_deductions=payroll.total_deductions,
        net_salary=payroll.net_salary,
        submitted_at=payroll.submitted_at,
        confirmed_by_driver_at=payroll.confirmed_by_driver_at,
        confirmed_by_hr_at=payroll.confirmed_by_hr_at,
        paid_at=payroll.paid_at,
        notes=payroll.notes,
        driver_notes=payroll.driver_notes,
        hr_notes=payroll.hr_notes,
        created_at=payroll.created_at,
        updated_at=payroll.updated_at
    )


@router.post("/payrolls/{payroll_id}/submit")
def submit_payroll(
    payroll_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Submit payroll for review (DRAFT -> PENDING_REVIEW)"""
    if current_user.role not in ("DISPATCHER", "ADMIN"):
        raise HTTPException(403, "Only DISPATCHER or ADMIN can submit payroll")

    tenant_id = str(current_user.tenant_id)

    payroll = session.get(DriverPayroll, payroll_id)
    if not payroll or str(payroll.tenant_id) != tenant_id:
        raise HTTPException(404, "Payroll not found")

    if payroll.status != DriverPayrollStatus.DRAFT.value:
        raise HTTPException(400, "Can only submit payroll in DRAFT status")

    payroll.status = DriverPayrollStatus.PENDING_REVIEW.value
    payroll.submitted_at = datetime.utcnow()

    session.add(payroll)
    session.commit()

    # TODO: Send notification to driver (mobile push) and HR

    return {"message": "Payroll submitted for review", "status": payroll.status}


@router.post("/payrolls/{payroll_id}/confirm-driver")
def driver_confirm_payroll(
    payroll_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Driver confirms payroll (PENDING_REVIEW -> CONFIRMED)"""
    tenant_id = str(current_user.tenant_id)

    payroll = session.get(DriverPayroll, payroll_id)
    if not payroll or str(payroll.tenant_id) != tenant_id:
        raise HTTPException(404, "Payroll not found")

    # Check if current user is the driver (via employee link) or admin
    driver = session.get(Driver, payroll.driver_id)
    if not driver:
        raise HTTPException(404, "Driver not found")

    # Check driver ownership via employee_id -> user link
    is_driver_owner = False
    if driver.employee_id:
        from app.models.hrm import Employee
        employee = session.get(Employee, driver.employee_id)
        if employee and employee.user_id and str(employee.user_id) == str(current_user.id):
            is_driver_owner = True

    is_admin = current_user.role in ("ADMIN", "HR_MANAGER", "DISPATCHER")

    if not is_driver_owner and not is_admin:
        raise HTTPException(403, "Only the driver or admin can confirm")

    if payroll.status != DriverPayrollStatus.PENDING_REVIEW.value:
        raise HTTPException(
            400,
            f"Chỉ có thể xác nhận bảng lương ở trạng thái 'Chờ xác nhận'. Trạng thái hiện tại: {payroll.status}"
        )

    payroll.status = DriverPayrollStatus.CONFIRMED.value
    payroll.confirmed_by_driver_at = datetime.utcnow()

    session.add(payroll)
    session.commit()

    return {"message": "Payroll confirmed by driver", "status": payroll.status}


@router.post("/payrolls/{payroll_id}/dispute")
def driver_dispute_payroll(
    payroll_id: str,
    notes: str = Query(..., description="Lý do khiếu nại"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Driver disputes payroll (PENDING_REVIEW -> DISPUTED)"""
    tenant_id = str(current_user.tenant_id)

    payroll = session.get(DriverPayroll, payroll_id)
    if not payroll or str(payroll.tenant_id) != tenant_id:
        raise HTTPException(404, "Payroll not found")

    # Check if current user is the driver or admin
    driver = session.get(Driver, payroll.driver_id)
    if not driver:
        raise HTTPException(404, "Driver not found")

    # Check driver ownership via employee_id -> user link
    is_driver_owner = False
    if driver.employee_id:
        from app.models.hrm import Employee
        employee = session.get(Employee, driver.employee_id)
        if employee and employee.user_id and str(employee.user_id) == str(current_user.id):
            is_driver_owner = True

    is_admin = current_user.role in ("ADMIN", "HR_MANAGER", "DISPATCHER")

    if not is_driver_owner and not is_admin:
        raise HTTPException(403, "Only the driver or admin can dispute")

    if payroll.status != DriverPayrollStatus.PENDING_REVIEW.value:
        raise HTTPException(400, "Can only dispute payroll in PENDING_REVIEW status")

    payroll.status = DriverPayrollStatus.DISPUTED.value
    payroll.driver_notes = notes

    session.add(payroll)
    session.commit()

    # TODO: Notify dispatcher about dispute

    return {"message": "Payroll disputed", "status": payroll.status}


@router.post("/payrolls/{payroll_id}/resolve-dispute")
def resolve_dispute(
    payroll_id: str,
    action: str = Query(..., description="Action: 'back_to_draft' or 'force_confirm'"),
    hr_notes: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Resolve disputed payroll (DISPATCHER/HR)"""
    if current_user.role not in ("DISPATCHER", "ADMIN", "HR_MANAGER"):
        raise HTTPException(403, "Only DISPATCHER, ADMIN or HR can resolve disputes")

    tenant_id = str(current_user.tenant_id)

    payroll = session.get(DriverPayroll, payroll_id)
    if not payroll or str(payroll.tenant_id) != tenant_id:
        raise HTTPException(404, "Payroll not found")

    if payroll.status != DriverPayrollStatus.DISPUTED.value:
        raise HTTPException(400, "Payroll is not in DISPUTED status")

    if action == "back_to_draft":
        payroll.status = DriverPayrollStatus.DRAFT.value
        payroll.submitted_at = None
    elif action == "force_confirm":
        payroll.status = DriverPayrollStatus.CONFIRMED.value
        payroll.confirmed_by_hr_at = datetime.utcnow()
    else:
        raise HTTPException(400, "Invalid action. Use 'back_to_draft' or 'force_confirm'")

    if hr_notes:
        payroll.hr_notes = hr_notes

    session.add(payroll)
    session.commit()

    return {"message": f"Dispute resolved: {action}", "status": payroll.status}


@router.post("/payrolls/{payroll_id}/mark-paid")
def mark_payroll_paid(
    payroll_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Mark payroll as paid (CONFIRMED -> PAID) - Only Accounting can do this"""
    if current_user.role not in ("ADMIN", "ACCOUNTANT"):
        raise HTTPException(403, "Chỉ Kế toán (ACCOUNTANT) hoặc Admin mới được đánh dấu đã thanh toán")

    tenant_id = str(current_user.tenant_id)

    payroll = session.get(DriverPayroll, payroll_id)
    if not payroll or str(payroll.tenant_id) != tenant_id:
        raise HTTPException(404, "Payroll not found")

    if payroll.status != DriverPayrollStatus.CONFIRMED.value:
        raise HTTPException(400, "Can only mark CONFIRMED payroll as paid")

    payroll.status = DriverPayrollStatus.PAID.value
    payroll.paid_at = datetime.utcnow()

    session.add(payroll)
    session.commit()

    return {"message": "Payroll marked as paid", "status": payroll.status}


@router.delete("/payrolls/{payroll_id}")
def delete_payroll(
    payroll_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete payroll (only in DRAFT status)"""
    if current_user.role not in ("DISPATCHER", "ADMIN"):
        raise HTTPException(403, "Only DISPATCHER or ADMIN can delete payroll")

    tenant_id = str(current_user.tenant_id)

    payroll = session.get(DriverPayroll, payroll_id)
    if not payroll or str(payroll.tenant_id) != tenant_id:
        raise HTTPException(404, "Payroll not found")

    if payroll.status != DriverPayrollStatus.DRAFT.value:
        raise HTTPException(400, "Can only delete payroll in DRAFT status")

    session.delete(payroll)
    session.commit()

    return {"message": "Payroll deleted"}


@router.get("/payrolls/validate-trips")
def validate_trips_for_payroll(
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Validate all trips for the month before generating payrolls.
    Returns list of trips with missing km grouped by driver.
    """
    if current_user.role not in ("DISPATCHER", "ADMIN"):
        raise HTTPException(403, "Only DISPATCHER or ADMIN can validate trips")

    tenant_id = str(current_user.tenant_id)

    # Find all delivered orders in this month
    from app.models import OrderStatusLog

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
        return {"valid": True, "missing_km_trips": [], "total_missing": 0}

    # Get orders
    orders = session.exec(
        select(Order).where(
            Order.tenant_id == tenant_id,
            Order.id.in_(delivered_order_ids),
            Order.driver_id.isnot(None),
            Order.status.in_([OrderStatus.DELIVERED, OrderStatus.COMPLETED])
        )
    ).all()

    # Check each order for missing km
    missing_km_trips = []

    for order in orders:
        # Get delivered date
        delivered_date = get_delivered_date(session, order.id)
        delivered_date_only = delivered_date.date() if delivered_date else None

        # Check if km is set or can be calculated from rates
        distance_km = order.distance_km

        if not distance_km and order.pickup_site_id and order.delivery_site_id:
            # Try to calculate from rates
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

        # If still no km, add to missing list
        if not distance_km:
            driver = session.get(Driver, order.driver_id)

            # Get site names
            pickup_site_name = None
            delivery_site_name = None
            if order.pickup_site_id:
                pickup_site = session.get(Site, order.pickup_site_id)
                pickup_site_name = pickup_site.company_name if pickup_site else None
            if order.delivery_site_id:
                delivery_site = session.get(Site, order.delivery_site_id)
                delivery_site_name = delivery_site.company_name if delivery_site else None

            missing_km_trips.append({
                "order_id": str(order.id),
                "order_code": order.order_code,
                "driver_id": str(order.driver_id),
                "driver_name": driver.name if driver else "Unknown",
                "driver_code": driver.short_name if driver else None,
                "pickup_site": pickup_site_name or order.pickup_text,
                "delivery_site": delivery_site_name or order.delivery_text,
                "delivered_date": delivered_date.isoformat() if delivered_date else None,
                "container_code": order.container_code,
            })

    # Group by driver for better display
    by_driver = {}
    for trip in missing_km_trips:
        driver_id = trip["driver_id"]
        if driver_id not in by_driver:
            by_driver[driver_id] = {
                "driver_id": driver_id,
                "driver_name": trip["driver_name"],
                "driver_code": trip["driver_code"],
                "trips": []
            }
        by_driver[driver_id]["trips"].append(trip)

    return {
        "valid": len(missing_km_trips) == 0,
        "missing_km_trips": list(by_driver.values()),
        "total_missing": len(missing_km_trips)
    }


@router.post("/payrolls/generate-all")
def generate_all_payrolls(
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    force: bool = Query(False, description="Force generate even with missing km"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Generate payrolls for all drivers who have trips in the month"""
    if current_user.role not in ("DISPATCHER", "ADMIN"):
        raise HTTPException(403, "Only DISPATCHER or ADMIN can generate payrolls")

    tenant_id = str(current_user.tenant_id)

    # Get salary settings
    settings = session.exec(
        select(DriverSalarySetting).where(
            DriverSalarySetting.tenant_id == tenant_id,
            DriverSalarySetting.status == "ACTIVE"
        ).limit(1)
    ).first()

    if not settings:
        raise HTTPException(400, "No active salary settings found")

    # First, validate trips for missing km (unless force=True)
    if not force:
        # Find all delivered orders in this month
        from app.models import OrderStatusLog

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

        if delivered_order_ids:
            orders = session.exec(
                select(Order).where(
                    Order.tenant_id == tenant_id,
                    Order.id.in_(delivered_order_ids),
                    Order.driver_id.isnot(None),
                    Order.status.in_([OrderStatus.DELIVERED, OrderStatus.COMPLETED])
                )
            ).all()

            missing_km_trips = []

            for order in orders:
                delivered_date = get_delivered_date(session, order.id)
                delivered_date_only = delivered_date.date() if delivered_date else None

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

                if not distance_km:
                    driver = session.get(Driver, order.driver_id)

                    pickup_site_name = None
                    delivery_site_name = None
                    if order.pickup_site_id:
                        pickup_site = session.get(Site, order.pickup_site_id)
                        pickup_site_name = pickup_site.company_name if pickup_site else None
                    if order.delivery_site_id:
                        delivery_site = session.get(Site, order.delivery_site_id)
                        delivery_site_name = delivery_site.company_name if delivery_site else None

                    missing_km_trips.append({
                        "order_id": str(order.id),
                        "order_code": order.order_code,
                        "driver_id": str(order.driver_id),
                        "driver_name": driver.name if driver else "Unknown",
                        "driver_code": driver.short_name if driver else None,
                        "pickup_site": pickup_site_name or order.pickup_text,
                        "delivery_site": delivery_site_name or order.delivery_text,
                        "delivered_date": delivered_date.isoformat() if delivered_date else None,
                        "container_code": order.container_code,
                    })

            if missing_km_trips:
                # Group by driver
                by_driver = {}
                for trip in missing_km_trips:
                    driver_id = trip["driver_id"]
                    if driver_id not in by_driver:
                        by_driver[driver_id] = {
                            "driver_id": driver_id,
                            "driver_name": trip["driver_name"],
                            "driver_code": trip["driver_code"],
                            "trips": []
                        }
                    by_driver[driver_id]["trips"].append(trip)

                raise HTTPException(
                    status_code=400,
                    detail={
                        "code": "MISSING_KM",
                        "message": f"Có {len(missing_km_trips)} chuyến thiếu thông tin km. Vui lòng cập nhật trước khi tạo bảng lương.",
                        "missing_km_trips": list(by_driver.values()),
                        "total_missing": len(missing_km_trips)
                    }
                )

    # Find all drivers with delivered orders in this month
    from app.models import OrderStatusLog

    driver_ids = session.exec(
        select(Order.driver_id)
        .join(OrderStatusLog, Order.id == OrderStatusLog.order_id)
        .where(
            Order.tenant_id == tenant_id,
            Order.driver_id.isnot(None),
            OrderStatusLog.to_status == OrderStatus.DELIVERED,
            func.extract('year', OrderStatusLog.changed_at) == year,
            func.extract('month', OrderStatusLog.changed_at) == month
        )
        .distinct()
    ).all()

    created = 0
    skipped = 0
    errors = []

    for driver_id in driver_ids:
        try:
            # Check if payroll already exists
            existing = session.exec(
                select(DriverPayroll).where(
                    DriverPayroll.tenant_id == tenant_id,
                    DriverPayroll.driver_id == driver_id,
                    DriverPayroll.year == year,
                    DriverPayroll.month == month
                )
            ).first()

            if existing:
                skipped += 1
                continue

            driver = session.get(Driver, driver_id)
            if not driver:
                continue

            # Build trip snapshot
            snapshot = build_trip_snapshot(session, tenant_id, driver_id, year, month, settings)

            if snapshot.get("total_trips", 0) == 0:
                continue

            # Calculate monthly bonus
            total_trips = snapshot.get("total_trips", 0)
            total_bonuses = 0
            if total_trips >= 55:
                total_bonuses = settings.monthly_bonus_55_plus or 0
            elif total_trips >= 51:
                total_bonuses = settings.monthly_bonus_51_54 or 0
            elif total_trips >= 45:
                total_bonuses = settings.monthly_bonus_45_50 or 0

            total_trip_salary = snapshot.get("total_trip_salary", 0)
            net_salary = total_trip_salary + total_bonuses

            payroll = DriverPayroll(
                tenant_id=tenant_id,
                driver_id=driver_id,
                year=year,
                month=month,
                status=DriverPayrollStatus.DRAFT.value,
                trip_snapshot=snapshot,
                adjustments=[],
                total_trips=total_trips,
                total_distance_km=snapshot.get("total_distance_km", 0),
                total_trip_salary=total_trip_salary,
                total_adjustments=0,
                total_bonuses=total_bonuses,
                total_deductions=0,
                net_salary=net_salary,
                created_by_id=str(current_user.id)
            )

            session.add(payroll)
            created += 1

        except Exception as e:
            errors.append(f"Driver {driver_id}: {str(e)}")

    session.commit()

    return {
        "message": f"Generated {created} payrolls, skipped {skipped} existing",
        "created": created,
        "skipped": skipped,
        "errors": errors
    }
