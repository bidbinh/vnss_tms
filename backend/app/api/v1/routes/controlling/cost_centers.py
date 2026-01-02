"""
Controlling - Cost Centers API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

from app.db.session import get_session
from app.models import User
from app.models.accounting import CostCenter
from app.models.controlling import (
    CostCenterHierarchy, CostCenterType, CostAllocationRule, CostAllocation, AllocationMethod
)
from app.core.security import get_current_user

router = APIRouter()


# =====================
# PYDANTIC SCHEMAS
# =====================

class CostCenterCreate(BaseModel):
    code: str
    name: str
    parent_id: Optional[str] = None
    manager_id: Optional[str] = None
    department_id: Optional[str] = None
    budget_amount: Decimal = Decimal("0")
    notes: Optional[str] = None


class CostCenterHierarchyCreate(BaseModel):
    cost_center_id: str
    cost_center_type: str = CostCenterType.ADMINISTRATION.value
    responsible_user_id: Optional[str] = None
    budget_control_enabled: bool = True
    budget_warning_threshold: Decimal = Decimal("80")
    budget_block_threshold: Decimal = Decimal("100")
    allow_posting: bool = True
    is_statistical: bool = False
    notes: Optional[str] = None


class AllocationRuleCreate(BaseModel):
    code: str
    name: str
    sender_cost_center_id: str
    allocation_method: str = AllocationMethod.FIXED_PERCENTAGE.value
    account_from: Optional[str] = None
    account_to: Optional[str] = None
    valid_from: datetime
    valid_to: Optional[datetime] = None
    execution_frequency: str = "MONTHLY"
    notes: Optional[str] = None


class AllocationCreate(BaseModel):
    rule_id: str
    receiver_cost_center_id: str
    allocation_percentage: Decimal = Decimal("0")
    allocation_base_value: Decimal = Decimal("0")
    fixed_amount: Optional[Decimal] = None
    notes: Optional[str] = None


# =====================
# COST CENTERS
# =====================

@router.get("/cost-centers")
def list_cost_centers(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
):
    """List all cost centers"""
    tenant_id = str(current_user.tenant_id)

    query = select(CostCenter).where(CostCenter.tenant_id == tenant_id)

    if search:
        query = query.where(
            (CostCenter.code.ilike(f"%{search}%")) |
            (CostCenter.name.ilike(f"%{search}%"))
        )

    if is_active is not None:
        query = query.where(CostCenter.is_active == is_active)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    query = query.order_by(CostCenter.code)
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.post("/cost-centers")
def create_cost_center(
    payload: CostCenterCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new cost center"""
    tenant_id = str(current_user.tenant_id)

    # Check unique code
    existing = session.exec(
        select(CostCenter).where(
            CostCenter.tenant_id == tenant_id,
            CostCenter.code == payload.code
        )
    ).first()
    if existing:
        raise HTTPException(400, f"Cost center code '{payload.code}' already exists")

    cost_center = CostCenter(
        tenant_id=tenant_id,
        **payload.model_dump(),
        is_active=True,
        created_by=str(current_user.id),
    )

    session.add(cost_center)
    session.commit()
    session.refresh(cost_center)

    return cost_center.model_dump()


@router.get("/cost-centers/{cost_center_id}")
def get_cost_center(
    cost_center_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get cost center by ID"""
    tenant_id = str(current_user.tenant_id)

    cost_center = session.get(CostCenter, cost_center_id)
    if not cost_center or str(cost_center.tenant_id) != tenant_id:
        raise HTTPException(404, "Cost center not found")

    # Get hierarchy info
    hierarchy = session.exec(
        select(CostCenterHierarchy).where(
            CostCenterHierarchy.tenant_id == tenant_id,
            CostCenterHierarchy.cost_center_id == cost_center_id
        )
    ).first()

    result = cost_center.model_dump()
    if hierarchy:
        result["hierarchy"] = hierarchy.model_dump()

    return result


@router.put("/cost-centers/{cost_center_id}")
def update_cost_center(
    cost_center_id: str,
    payload: CostCenterCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a cost center"""
    tenant_id = str(current_user.tenant_id)

    cost_center = session.get(CostCenter, cost_center_id)
    if not cost_center or str(cost_center.tenant_id) != tenant_id:
        raise HTTPException(404, "Cost center not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(cost_center, key, value)

    cost_center.updated_at = datetime.utcnow()

    session.add(cost_center)
    session.commit()
    session.refresh(cost_center)

    return cost_center.model_dump()


# =====================
# COST CENTER HIERARCHY
# =====================

@router.post("/cost-center-hierarchy")
def create_hierarchy(
    payload: CostCenterHierarchyCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create or update cost center hierarchy settings"""
    tenant_id = str(current_user.tenant_id)

    # Check if exists
    existing = session.exec(
        select(CostCenterHierarchy).where(
            CostCenterHierarchy.tenant_id == tenant_id,
            CostCenterHierarchy.cost_center_id == payload.cost_center_id
        )
    ).first()

    if existing:
        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(existing, key, value)
        existing.updated_at = datetime.utcnow()
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing.model_dump()

    hierarchy = CostCenterHierarchy(
        tenant_id=tenant_id,
        **payload.model_dump(),
        created_by=str(current_user.id),
    )

    session.add(hierarchy)
    session.commit()
    session.refresh(hierarchy)

    return hierarchy.model_dump()


# =====================
# ALLOCATION RULES
# =====================

@router.get("/allocation-rules")
def list_allocation_rules(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    is_active: Optional[bool] = Query(None),
):
    """List allocation rules"""
    tenant_id = str(current_user.tenant_id)

    query = select(CostAllocationRule).where(CostAllocationRule.tenant_id == tenant_id)

    if is_active is not None:
        query = query.where(CostAllocationRule.is_active == is_active)

    query = query.order_by(CostAllocationRule.code)

    rules = session.exec(query).all()

    return {"items": [r.model_dump() for r in rules]}


@router.post("/allocation-rules")
def create_allocation_rule(
    payload: AllocationRuleCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create an allocation rule"""
    tenant_id = str(current_user.tenant_id)

    rule = CostAllocationRule(
        tenant_id=tenant_id,
        **payload.model_dump(),
        is_active=True,
        created_by=str(current_user.id),
    )

    session.add(rule)
    session.commit()
    session.refresh(rule)

    return rule.model_dump()


@router.get("/allocation-rules/{rule_id}")
def get_allocation_rule(
    rule_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get allocation rule with allocations"""
    tenant_id = str(current_user.tenant_id)

    rule = session.get(CostAllocationRule, rule_id)
    if not rule or str(rule.tenant_id) != tenant_id:
        raise HTTPException(404, "Allocation rule not found")

    # Get allocations
    allocations = session.exec(
        select(CostAllocation).where(
            CostAllocation.tenant_id == tenant_id,
            CostAllocation.rule_id == rule_id
        )
    ).all()

    result = rule.model_dump()
    result["allocations"] = [a.model_dump() for a in allocations]

    return result


@router.post("/allocations")
def create_allocation(
    payload: AllocationCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create an allocation entry"""
    tenant_id = str(current_user.tenant_id)

    allocation = CostAllocation(
        tenant_id=tenant_id,
        **payload.model_dump(),
        is_active=True,
    )

    session.add(allocation)
    session.commit()
    session.refresh(allocation)

    return allocation.model_dump()
