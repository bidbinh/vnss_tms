"""
Driver Payroll Management API
API endpoints for creating, managing, and approving driver payrolls with workflow integration
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from typing import List, Optional

from app.db.session import get_session
from app.models import User, Driver
from app.models.hrm import DriverPayroll, DriverPayrollStatus
from app.models import Order, Site
from app.models.order import OrderStatus
from app.schemas.driver_payroll import (
    DriverPayrollCreate, DriverPayrollUpdate, DriverPayrollAction,
    DriverPayrollRead, DriverPayrollListItem
)
from app.core.security import get_current_user
from app.services.order_status_logger import get_delivered_date
from app.services.salary_calculator import calculate_trip_salary
from app.services.distance_calculator import get_distance_from_rates
from app.services.workflow_integration import submit_for_approval
from app.models import DriverSalarySetting

router = APIRouter(prefix="/hrm/driver-payroll", tags=["driver-payroll"])


def get_driver_name(session: Session, driver_id: str) -> Optional[str]:
    """Get driver name from ID"""
    driver = session.get(Driver, driver_id)
    return driver.short_name or driver.name if driver else None


def get_user_name(session: Session, user_id: str) -> Optional[str]:
    """Get user full name from ID"""
    user = session.get(User, user_id)
    return user.full_name if user else None


@router.post("/create", response_model=DriverPayrollRead)
def create_driver_payroll(
    payload: DriverPayrollCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new driver payroll for a specific month/year.
    This will:
    1. Query all delivered orders for the driver in that month
    2. Calculate salary for each trip with current distance_km
    3. Create a snapshot (lock distance_km values)
    4. Create workflow instance for approval process

    Role: DISPATCHER or ADMIN
    """
    if current_user.role not in ("DISPATCHER", "ADMIN"):
        raise HTTPException(403, "Only DISPATCHER or ADMIN can create driver payroll")

    tenant_id = str(current_user.tenant_id)

    # Check if payroll already exists for this period
    existing = session.exec(
        select(DriverPayroll).where(
            DriverPayroll.tenant_id == tenant_id,
            DriverPayroll.driver_id == payload.driver_id,
            DriverPayroll.year == payload.year,
            DriverPayroll.month == payload.month,
        )
    ).first()

    if existing:
        raise HTTPException(400, f"Payroll already exists for this driver and period. ID: {existing.id}")

    # Verify driver exists and belongs to tenant
    driver = session.get(Driver, payload.driver_id)
    if not driver or str(driver.tenant_id) != tenant_id:
        raise HTTPException(404, "Driver not found")

    # Get salary settings
    settings = session.exec(
        select(DriverSalarySetting).where(
            DriverSalarySetting.tenant_id == tenant_id,
            DriverSalarySetting.status == "ACTIVE"
        )
    ).first()

    if not settings:
        raise HTTPException(400, "No active salary settings found. Please configure salary settings first.")

    # Query all delivered orders in this month
    from app.models import OrderStatusLog
    from sqlalchemy import cast, Date

    delivered_orders_subquery = (
        select(OrderStatusLog.order_id)
        .where(
            OrderStatusLog.tenant_id == tenant_id,
            OrderStatusLog.to_status == OrderStatus.DELIVERED,
            func.extract('year', OrderStatusLog.changed_at) == payload.year,
            func.extract('month', OrderStatusLog.changed_at) == payload.month,
        )
        .distinct()
    )

    orders = session.exec(
        select(Order).where(
            Order.id.in_(delivered_orders_subquery),
            Order.driver_id == payload.driver_id,
        ).order_by(Order.created_at)
    ).all()

    if not orders:
        raise HTTPException(400, f"No delivered orders found for driver in {payload.year}/{payload.month:02d}")

    # Build trip snapshot with current distance_km and salary calculations
    trip_snapshot = []
    total_salary = 0
    total_distance_km = 0
    bonus_applied_keys = set()

    for order in orders:
        delivered_date = get_delivered_date(session, order.id)
        delivered_date_only = delivered_date.date() if delivered_date else None

        # Get distance_km (current value)
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
            )

        # Get site names
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

        # Count trips per day
        trips_per_day = 0
        if delivered_date_only:
            delivered_on_date = session.exec(
                select(OrderStatusLog.order_id).where(
                    OrderStatusLog.tenant_id == tenant_id,
                    OrderStatusLog.to_status == OrderStatus.DELIVERED,
                    cast(OrderStatusLog.changed_at, Date) == delivered_date_only
                ).distinct()
            ).all()
            trips_per_day = session.exec(
                select(func.count(Order.id)).where(
                    Order.id.in_(delivered_on_date),
                    Order.driver_id == payload.driver_id
                )
            ).one()

        # Check if from port
        is_from_port = False
        if order.pickup_site_id:
            pickup_site = session.get(Site, order.pickup_site_id)
            if pickup_site:
                is_from_port = pickup_site.site_type == "PORT"

        # Calculate salary
        calculated_salary = 0
        breakdown_dict = None
        if distance_km and delivered_date_only:
            order.distance_km = distance_km  # Temporarily set for calculation
            bonus_key = (order.driver_id, delivered_date_only)
            is_bonus_applied_trip = False
            if trips_per_day >= 2 and bonus_key not in bonus_applied_keys:
                is_bonus_applied_trip = True
                bonus_applied_keys.add(bonus_key)

            breakdown_dict = calculate_trip_salary(
                session=session,
                order=order,
                settings=settings,
                trip_number_in_day=trips_per_day,
                delivered_date=delivered_date_only,
                is_bonus_applied_trip=is_bonus_applied_trip
            )
            calculated_salary = breakdown_dict["total"]

        # Add to snapshot
        trip_snapshot.append({
            "order_id": order.id,
            "order_code": order.order_code,
            "customer_requested_date": order.customer_requested_date.isoformat() if order.customer_requested_date else None,
            "delivered_date": delivered_date.isoformat() if delivered_date else None,
            "pickup_site_name": pickup_site_name,
            "delivery_site_name": delivery_site_name,
            "container_code": order.container_code,
            "distance_km": distance_km,
            "is_from_port": is_from_port,
            "is_flatbed": order.is_flatbed,
            "is_internal_cargo": order.is_internal_cargo,
            "is_holiday": order.is_holiday,
            "trips_per_day": trips_per_day,
            "calculated_salary": calculated_salary,
            "salary_breakdown": breakdown_dict,
        })

        total_salary += calculated_salary
        if distance_km:
            total_distance_km += distance_km

    # Calculate monthly bonus based on total trips
    total_trips = len(orders)
    monthly_bonus = 0
    if total_trips >= 55:
        monthly_bonus = settings.bonus_55_plus_trips
    elif total_trips >= 51:
        monthly_bonus = settings.bonus_51_54_trips
    elif total_trips >= 45:
        monthly_bonus = settings.bonus_45_50_trips

    # Create payroll record
    payroll = DriverPayroll(
        tenant_id=tenant_id,
        driver_id=payload.driver_id,
        year=payload.year,
        month=payload.month,
        status=DriverPayrollStatus.DRAFT.value,
        trip_snapshot={"trips": trip_snapshot},
        total_trips=total_trips,
        total_distance_km=total_distance_km,
        total_salary=total_salary,
        total_bonuses=monthly_bonus,
        total_deductions=0,  # Will be calculated separately
        net_salary=total_salary + monthly_bonus,
        created_by_id=str(current_user.id),
        notes=payload.notes,
    )

    session.add(payroll)
    session.commit()
    session.refresh(payroll)

    # Submit for workflow approval
    try:
        workflow_instance = submit_for_approval(
            session=session,
            entity_module="HRM",
            entity_type="DriverPayroll",
            entity_id=payroll.id,
            entity_data={
                "driver_id": payload.driver_id,
                "year": payload.year,
                "month": payload.month,
                "total_trips": total_trips,
                "net_salary": payroll.net_salary,
            },
            tenant_id=tenant_id,
            submitted_by_id=str(current_user.id),
        )

        if workflow_instance:
            payroll.workflow_instance_id = workflow_instance.id
            payroll.status = DriverPayrollStatus.PENDING_HR_REVIEW.value
            session.add(payroll)
            session.commit()
            session.refresh(payroll)
    except Exception as e:
        # Workflow creation failed, but payroll record exists
        print(f"Warning: Workflow creation failed: {e}")

    # Build response
    return DriverPayrollRead(
        **payroll.model_dump(),
        driver_name=get_driver_name(session, payroll.driver_id),
        created_by_name=get_user_name(session, payroll.created_by_id),
    )


@router.get("", response_model=List[DriverPayrollListItem])
def list_driver_payrolls(
    driver_id: Optional[str] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
    status: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    List driver payrolls with optional filtering.
    - DISPATCHER/ADMIN: See all payrolls for tenant
    - HR: See all payrolls
    - DRIVER: See only own payrolls
    """
    tenant_id = str(current_user.tenant_id)

    query = select(DriverPayroll).where(DriverPayroll.tenant_id == tenant_id)

    # Role-based filtering
    if current_user.role == "DRIVER":
        # Drivers can only see their own payrolls
        # Assuming driver is linked to user (need to implement driver-user link)
        if not driver_id:
            raise HTTPException(400, "driver_id is required for DRIVER role")
        query = query.where(DriverPayroll.driver_id == driver_id)
    elif driver_id:
        query = query.where(DriverPayroll.driver_id == driver_id)

    if year:
        query = query.where(DriverPayroll.year == year)
    if month:
        query = query.where(DriverPayroll.month == month)
    if status:
        query = query.where(DriverPayroll.status == status)

    query = query.order_by(DriverPayroll.created_at.desc())

    payrolls = session.exec(query).all()

    # Build response with driver names
    result = []
    for payroll in payrolls:
        result.append(DriverPayrollListItem(
            **payroll.model_dump(),
            driver_name=get_driver_name(session, payroll.driver_id),
        ))

    return result


@router.get("/{payroll_id}", response_model=DriverPayrollRead)
def get_driver_payroll(
    payroll_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get detailed driver payroll with trip snapshot"""
    tenant_id = str(current_user.tenant_id)

    payroll = session.get(DriverPayroll, payroll_id)
    if not payroll or str(payroll.tenant_id) != tenant_id:
        raise HTTPException(404, "Payroll not found")

    # Role-based access: drivers can only see their own
    if current_user.role == "DRIVER":
        # TODO: Implement driver-user link check
        pass

    return DriverPayrollRead(
        **payroll.model_dump(),
        driver_name=get_driver_name(session, payroll.driver_id),
        created_by_name=get_user_name(session, payroll.created_by_id),
    )


@router.post("/{payroll_id}/hr-review")
def hr_review_payroll(
    payroll_id: str,
    payload: DriverPayrollAction,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    HR reviews and approves/rejects payroll.
    Actions: "approve", "reject"
    Role: HR or ADMIN
    """
    if current_user.role not in ("HR", "ADMIN"):
        raise HTTPException(403, "Only HR or ADMIN can review payroll")

    tenant_id = str(current_user.tenant_id)
    payroll = session.get(DriverPayroll, payroll_id)

    if not payroll or str(payroll.tenant_id) != tenant_id:
        raise HTTPException(404, "Payroll not found")

    if payroll.status != DriverPayrollStatus.PENDING_HR_REVIEW.value:
        raise HTTPException(400, f"Cannot review payroll in status: {payroll.status}")

    if payload.action == "approve":
        payroll.status = DriverPayrollStatus.PENDING_DRIVER_CONFIRM.value
        payroll.confirmed_by_hr_at = datetime.utcnow()
        payroll.hr_notes = payload.notes
    elif payload.action == "reject":
        payroll.status = DriverPayrollStatus.REJECTED.value
        payroll.hr_notes = payload.notes
    else:
        raise HTTPException(400, "Invalid action. Must be 'approve' or 'reject'")

    session.add(payroll)
    session.commit()

    return {"message": f"Payroll {payload.action}d successfully", "status": payroll.status}


@router.post("/{payroll_id}/mark-paid")
def mark_payroll_paid(
    payroll_id: str,
    payload: DriverPayrollAction,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Mark payroll as paid.
    Role: HR or ADMIN
    """
    if current_user.role not in ("HR", "ADMIN"):
        raise HTTPException(403, "Only HR or ADMIN can mark payroll as paid")

    tenant_id = str(current_user.tenant_id)
    payroll = session.get(DriverPayroll, payroll_id)

    if not payroll or str(payroll.tenant_id) != tenant_id:
        raise HTTPException(404, "Payroll not found")

    if payroll.status != DriverPayrollStatus.CONFIRMED.value:
        raise HTTPException(400, f"Can only mark confirmed payrolls as paid. Current status: {payroll.status}")

    payroll.status = DriverPayrollStatus.PAID.value
    payroll.paid_at = datetime.utcnow()
    if payload.notes:
        payroll.hr_notes = (payroll.hr_notes or "") + "\n" + payload.notes

    session.add(payroll)
    session.commit()

    return {"message": "Payroll marked as paid successfully", "status": payroll.status}


@router.delete("/{payroll_id}")
def delete_driver_payroll(
    payroll_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Delete driver payroll (only if status = DRAFT).
    Role: DISPATCHER or ADMIN
    """
    if current_user.role not in ("DISPATCHER", "ADMIN"):
        raise HTTPException(403, "Only DISPATCHER or ADMIN can delete payroll")

    tenant_id = str(current_user.tenant_id)
    payroll = session.get(DriverPayroll, payroll_id)

    if not payroll or str(payroll.tenant_id) != tenant_id:
        raise HTTPException(404, "Payroll not found")

    if payroll.status != DriverPayrollStatus.DRAFT.value:
        raise HTTPException(400, f"Can only delete DRAFT payrolls. Current status: {payroll.status}")

    session.delete(payroll)
    session.commit()

    return {"message": "Payroll deleted successfully"}
