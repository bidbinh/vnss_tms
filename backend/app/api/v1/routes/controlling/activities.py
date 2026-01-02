"""
Controlling - Activity-Based Costing API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

from app.db.session import get_session
from app.models import User
from app.models.controlling import (
    ControllingActivity as Activity, ActivityRate, ActivityAllocation,
    ControllingActivityType as ActivityType
)
from app.core.security import get_current_user

router = APIRouter()


# =====================
# PYDANTIC SCHEMAS
# =====================

class ActivityCreate(BaseModel):
    code: str
    name: str
    activity_type_id: Optional[str] = None
    cost_center_id: Optional[str] = None
    cost_driver: str = "LABOR_HOURS"
    unit_of_measure: str = "HOUR"
    planned_quantity: Decimal = Decimal("0")
    planned_rate: Decimal = Decimal("0")
    currency: str = "VND"
    notes: Optional[str] = None


class ActivityRateCreate(BaseModel):
    activity_id: str
    fiscal_year_id: str
    fiscal_period_id: Optional[str] = None
    rate_type: str = "PLAN"
    fixed_costs: Decimal = Decimal("0")
    variable_costs: Decimal = Decimal("0")
    planned_quantity: Decimal = Decimal("0")


class ActivityAllocationCreate(BaseModel):
    activity_id: str
    fiscal_period_id: str
    receiver_type: str
    receiver_id: str
    quantity: Decimal = Decimal("0")
    rate: Decimal = Decimal("0")
    notes: Optional[str] = None


# =====================
# ACTIVITIES
# =====================

@router.get("/activities")
def list_activities(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    activity_type: Optional[str] = Query(None),
    cost_center_id: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
):
    """List all activities"""
    tenant_id = str(current_user.tenant_id)

    query = select(Activity).where(Activity.tenant_id == tenant_id)

    if activity_type:
        query = query.where(Activity.activity_type == activity_type)

    if cost_center_id:
        query = query.where(Activity.cost_center_id == cost_center_id)

    if is_active is not None:
        query = query.where(Activity.is_active == is_active)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    query = query.order_by(Activity.code)
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.post("/activities")
def create_activity(
    payload: ActivityCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new activity"""
    tenant_id = str(current_user.tenant_id)

    # Check unique code
    existing = session.exec(
        select(Activity).where(
            Activity.tenant_id == tenant_id,
            Activity.code == payload.code
        )
    ).first()
    if existing:
        raise HTTPException(400, f"Activity code '{payload.code}' already exists")

    # Calculate planned cost
    planned_cost = payload.planned_quantity * payload.planned_rate

    activity = Activity(
        tenant_id=tenant_id,
        **payload.model_dump(),
        planned_cost=planned_cost,
        created_by=str(current_user.id),
    )

    session.add(activity)
    session.commit()
    session.refresh(activity)

    return activity.model_dump()


@router.get("/activities/{activity_id}")
def get_activity(
    activity_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get activity details"""
    tenant_id = str(current_user.tenant_id)

    activity = session.get(Activity, activity_id)
    if not activity or str(activity.tenant_id) != tenant_id:
        raise HTTPException(404, "Activity not found")

    # Get rates
    rates = session.exec(
        select(ActivityRate).where(
            ActivityRate.tenant_id == tenant_id,
            ActivityRate.activity_id == activity_id
        ).order_by(ActivityRate.valid_from.desc())
    ).all()

    result = activity.model_dump()
    result["rates"] = [rate.model_dump() for rate in rates]

    return result


@router.put("/activities/{activity_id}")
def update_activity(
    activity_id: str,
    payload: ActivityCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update an activity"""
    tenant_id = str(current_user.tenant_id)

    activity = session.get(Activity, activity_id)
    if not activity or str(activity.tenant_id) != tenant_id:
        raise HTTPException(404, "Activity not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(activity, key, value)

    activity.planned_cost = activity.planned_quantity * activity.planned_rate
    activity.updated_at = datetime.utcnow()

    session.add(activity)
    session.commit()
    session.refresh(activity)

    return activity.model_dump()


@router.delete("/activities/{activity_id}")
def delete_activity(
    activity_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Deactivate an activity"""
    tenant_id = str(current_user.tenant_id)

    activity = session.get(Activity, activity_id)
    if not activity or str(activity.tenant_id) != tenant_id:
        raise HTTPException(404, "Activity not found")

    activity.is_active = False
    activity.updated_at = datetime.utcnow()

    session.add(activity)
    session.commit()

    return {"success": True, "message": "Activity deactivated"}


# =====================
# ACTIVITY RATES
# =====================

@router.post("/activity-rates")
def create_activity_rate(
    payload: ActivityRateCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create activity rate for a period"""
    tenant_id = str(current_user.tenant_id)

    # Calculate rates
    total_costs = payload.fixed_costs + payload.variable_costs
    activity_rate = Decimal("0")
    fixed_rate = Decimal("0")
    variable_rate = Decimal("0")

    if payload.planned_quantity > 0:
        activity_rate = total_costs / payload.planned_quantity
        fixed_rate = payload.fixed_costs / payload.planned_quantity
        variable_rate = payload.variable_costs / payload.planned_quantity

    rate = ActivityRate(
        tenant_id=tenant_id,
        activity_id=payload.activity_id,
        fiscal_year_id=payload.fiscal_year_id,
        fiscal_period_id=payload.fiscal_period_id,
        rate_type=payload.rate_type,
        valid_from=datetime.utcnow(),
        fixed_costs=payload.fixed_costs,
        variable_costs=payload.variable_costs,
        total_costs=total_costs,
        planned_quantity=payload.planned_quantity,
        activity_rate=activity_rate,
        fixed_rate=fixed_rate,
        variable_rate=variable_rate,
        currency="VND",
        created_by=str(current_user.id),
    )

    session.add(rate)
    session.commit()
    session.refresh(rate)

    return rate.model_dump()


@router.get("/activity-rates")
def list_activity_rates(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    activity_id: Optional[str] = Query(None),
    fiscal_year_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
):
    """List activity rates"""
    tenant_id = str(current_user.tenant_id)

    query = select(ActivityRate).where(ActivityRate.tenant_id == tenant_id)

    if activity_id:
        query = query.where(ActivityRate.activity_id == activity_id)

    if fiscal_year_id:
        query = query.where(ActivityRate.fiscal_year_id == fiscal_year_id)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    query = query.order_by(ActivityRate.valid_from.desc())
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


# =====================
# ACTIVITY ALLOCATIONS
# =====================

@router.post("/activity-allocations")
def create_activity_allocation(
    payload: ActivityAllocationCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Allocate activity costs to cost objects"""
    tenant_id = str(current_user.tenant_id)

    # Calculate amount
    allocated_amount = payload.quantity * payload.rate

    allocation = ActivityAllocation(
        tenant_id=tenant_id,
        activity_id=payload.activity_id,
        fiscal_period_id=payload.fiscal_period_id,
        allocation_date=datetime.utcnow(),
        receiver_type=payload.receiver_type,
        receiver_id=payload.receiver_id,
        quantity=payload.quantity,
        rate=payload.rate,
        allocated_amount=allocated_amount,
        notes=payload.notes,
        created_by=str(current_user.id),
    )

    session.add(allocation)
    session.commit()
    session.refresh(allocation)

    # Update activity actual quantity
    activity = session.get(Activity, payload.activity_id)
    if activity:
        total_qty = session.exec(
            select(func.sum(ActivityAllocation.quantity)).where(
                ActivityAllocation.tenant_id == tenant_id,
                ActivityAllocation.activity_id == payload.activity_id
            )
        ).one() or Decimal("0")

        activity.actual_quantity = total_qty
        activity.actual_cost = total_qty * activity.planned_rate
        session.add(activity)
        session.commit()

    return allocation.model_dump()


@router.get("/activity-allocations")
def list_activity_allocations(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    activity_id: Optional[str] = Query(None),
    receiver_type: Optional[str] = Query(None),
    receiver_id: Optional[str] = Query(None),
    fiscal_period_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
):
    """List activity allocations"""
    tenant_id = str(current_user.tenant_id)

    query = select(ActivityAllocation).where(ActivityAllocation.tenant_id == tenant_id)

    if activity_id:
        query = query.where(ActivityAllocation.activity_id == activity_id)

    if receiver_type:
        query = query.where(ActivityAllocation.receiver_type == receiver_type)

    if receiver_id:
        query = query.where(ActivityAllocation.receiver_id == receiver_id)

    if fiscal_period_id:
        query = query.where(ActivityAllocation.fiscal_period_id == fiscal_period_id)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    query = query.order_by(ActivityAllocation.allocation_date.desc())
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }
