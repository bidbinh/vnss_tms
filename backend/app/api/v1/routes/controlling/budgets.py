"""
Controlling - Budgets API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

from app.db.session import get_session
from app.models import User
from app.models.accounting import FiscalYear
from app.models.controlling import (
    Budget, BudgetVersion, BudgetLine, BudgetTransfer, BudgetRevision,
    BudgetType, BudgetStatus
)
from app.core.security import get_current_user

router = APIRouter()


# =====================
# PYDANTIC SCHEMAS
# =====================

class BudgetCreate(BaseModel):
    code: str
    name: str
    budget_type: str = BudgetType.OPERATING.value
    fiscal_year_id: str
    period_from: datetime
    period_to: datetime
    cost_center_id: Optional[str] = None
    department_id: Optional[str] = None
    project_id: Optional[str] = None
    currency: str = "VND"
    allow_overspend: bool = False
    overspend_limit_percent: Decimal = Decimal("0")
    notes: Optional[str] = None


class BudgetLineCreate(BaseModel):
    budget_id: str
    version_id: Optional[str] = None
    account_id: str
    account_code: str
    cost_center_id: Optional[str] = None
    project_id: Optional[str] = None
    period_01: Decimal = Decimal("0")
    period_02: Decimal = Decimal("0")
    period_03: Decimal = Decimal("0")
    period_04: Decimal = Decimal("0")
    period_05: Decimal = Decimal("0")
    period_06: Decimal = Decimal("0")
    period_07: Decimal = Decimal("0")
    period_08: Decimal = Decimal("0")
    period_09: Decimal = Decimal("0")
    period_10: Decimal = Decimal("0")
    period_11: Decimal = Decimal("0")
    period_12: Decimal = Decimal("0")
    notes: Optional[str] = None


class BudgetTransferCreate(BaseModel):
    from_budget_line_id: str
    to_budget_line_id: str
    transfer_amount: Decimal
    reason: str
    notes: Optional[str] = None


class BudgetRevisionCreate(BaseModel):
    budget_id: str
    budget_line_id: str
    revision_type: str  # INCREASE, DECREASE
    revision_amount: Decimal
    period_number: Optional[int] = None
    reason: str
    notes: Optional[str] = None


# =====================
# BUDGETS
# =====================

@router.get("/budgets")
def list_budgets(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    budget_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    fiscal_year_id: Optional[str] = Query(None),
):
    """List all budgets"""
    tenant_id = str(current_user.tenant_id)

    query = select(Budget).where(Budget.tenant_id == tenant_id)

    if budget_type:
        query = query.where(Budget.budget_type == budget_type)

    if status:
        query = query.where(Budget.status == status)

    if fiscal_year_id:
        query = query.where(Budget.fiscal_year_id == fiscal_year_id)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    query = query.order_by(Budget.code.desc())
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.post("/budgets")
def create_budget(
    payload: BudgetCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new budget"""
    tenant_id = str(current_user.tenant_id)

    # Check unique code
    existing = session.exec(
        select(Budget).where(
            Budget.tenant_id == tenant_id,
            Budget.code == payload.code
        )
    ).first()
    if existing:
        raise HTTPException(400, f"Budget code '{payload.code}' already exists")

    budget = Budget(
        tenant_id=tenant_id,
        **payload.model_dump(),
        status=BudgetStatus.DRAFT.value,
        created_by=str(current_user.id),
    )

    session.add(budget)
    session.commit()
    session.refresh(budget)

    return budget.model_dump()


@router.get("/budgets/{budget_id}")
def get_budget(
    budget_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get budget with lines"""
    tenant_id = str(current_user.tenant_id)

    budget = session.get(Budget, budget_id)
    if not budget or str(budget.tenant_id) != tenant_id:
        raise HTTPException(404, "Budget not found")

    # Get lines
    lines = session.exec(
        select(BudgetLine).where(
            BudgetLine.tenant_id == tenant_id,
            BudgetLine.budget_id == budget_id
        ).order_by(BudgetLine.account_code)
    ).all()

    result = budget.model_dump()
    result["lines"] = [line.model_dump() for line in lines]

    return result


@router.put("/budgets/{budget_id}")
def update_budget(
    budget_id: str,
    payload: BudgetCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a budget"""
    tenant_id = str(current_user.tenant_id)

    budget = session.get(Budget, budget_id)
    if not budget or str(budget.tenant_id) != tenant_id:
        raise HTTPException(404, "Budget not found")

    if budget.status not in [BudgetStatus.DRAFT.value, BudgetStatus.REJECTED.value]:
        raise HTTPException(400, "Cannot update budget in current status")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(budget, key, value)

    budget.updated_at = datetime.utcnow()

    session.add(budget)
    session.commit()
    session.refresh(budget)

    return budget.model_dump()


@router.post("/budgets/{budget_id}/submit")
def submit_budget(
    budget_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Submit budget for approval"""
    tenant_id = str(current_user.tenant_id)

    budget = session.get(Budget, budget_id)
    if not budget or str(budget.tenant_id) != tenant_id:
        raise HTTPException(404, "Budget not found")

    if budget.status != BudgetStatus.DRAFT.value:
        raise HTTPException(400, "Only draft budgets can be submitted")

    budget.status = BudgetStatus.SUBMITTED.value
    budget.submitted_at = datetime.utcnow()
    budget.submitted_by = str(current_user.id)
    budget.updated_at = datetime.utcnow()

    session.add(budget)
    session.commit()
    session.refresh(budget)

    return {"success": True, "budget": budget.model_dump()}


@router.post("/budgets/{budget_id}/approve")
def approve_budget(
    budget_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Approve a budget"""
    tenant_id = str(current_user.tenant_id)

    budget = session.get(Budget, budget_id)
    if not budget or str(budget.tenant_id) != tenant_id:
        raise HTTPException(404, "Budget not found")

    if budget.status != BudgetStatus.SUBMITTED.value:
        raise HTTPException(400, "Only submitted budgets can be approved")

    budget.status = BudgetStatus.APPROVED.value
    budget.approved_at = datetime.utcnow()
    budget.approved_by = str(current_user.id)
    budget.updated_at = datetime.utcnow()

    session.add(budget)
    session.commit()
    session.refresh(budget)

    return {"success": True, "budget": budget.model_dump()}


@router.post("/budgets/{budget_id}/activate")
def activate_budget(
    budget_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Activate an approved budget"""
    tenant_id = str(current_user.tenant_id)

    budget = session.get(Budget, budget_id)
    if not budget or str(budget.tenant_id) != tenant_id:
        raise HTTPException(404, "Budget not found")

    if budget.status != BudgetStatus.APPROVED.value:
        raise HTTPException(400, "Only approved budgets can be activated")

    budget.status = BudgetStatus.ACTIVE.value
    budget.updated_at = datetime.utcnow()

    session.add(budget)
    session.commit()
    session.refresh(budget)

    return {"success": True, "budget": budget.model_dump()}


# =====================
# BUDGET LINES
# =====================

@router.post("/budget-lines")
def create_budget_line(
    payload: BudgetLineCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a budget line"""
    tenant_id = str(current_user.tenant_id)

    # Calculate annual total
    annual_budget = sum([
        payload.period_01, payload.period_02, payload.period_03, payload.period_04,
        payload.period_05, payload.period_06, payload.period_07, payload.period_08,
        payload.period_09, payload.period_10, payload.period_11, payload.period_12,
    ])

    line = BudgetLine(
        tenant_id=tenant_id,
        **payload.model_dump(),
        annual_budget=annual_budget,
        created_by=str(current_user.id),
    )

    session.add(line)
    session.commit()
    session.refresh(line)

    # Update budget total
    budget = session.get(Budget, payload.budget_id)
    if budget:
        total = session.exec(
            select(func.sum(BudgetLine.annual_budget)).where(
                BudgetLine.tenant_id == tenant_id,
                BudgetLine.budget_id == payload.budget_id
            )
        ).one() or Decimal("0")
        budget.total_budget = total
        budget.total_remaining = total - budget.total_actual
        session.add(budget)
        session.commit()

    return line.model_dump()


@router.put("/budget-lines/{line_id}")
def update_budget_line(
    line_id: str,
    payload: BudgetLineCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a budget line"""
    tenant_id = str(current_user.tenant_id)

    line = session.get(BudgetLine, line_id)
    if not line or str(line.tenant_id) != tenant_id:
        raise HTTPException(404, "Budget line not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(line, key, value)

    # Recalculate annual
    line.annual_budget = sum([
        line.period_01, line.period_02, line.period_03, line.period_04,
        line.period_05, line.period_06, line.period_07, line.period_08,
        line.period_09, line.period_10, line.period_11, line.period_12,
    ])

    session.add(line)
    session.commit()
    session.refresh(line)

    return line.model_dump()


# =====================
# BUDGET TRANSFERS
# =====================

@router.post("/budget-transfers")
def create_transfer(
    payload: BudgetTransferCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a budget transfer request"""
    tenant_id = str(current_user.tenant_id)

    # Get from/to lines
    from_line = session.get(BudgetLine, payload.from_budget_line_id)
    to_line = session.get(BudgetLine, payload.to_budget_line_id)

    if not from_line or not to_line:
        raise HTTPException(404, "Budget line not found")

    # Generate number
    count = session.exec(
        select(func.count(BudgetTransfer.id)).where(
            BudgetTransfer.tenant_id == tenant_id
        )
    ).one() or 0

    transfer = BudgetTransfer(
        tenant_id=tenant_id,
        transfer_number=f"BT-{datetime.now().year}-{count + 1:04d}",
        transfer_date=datetime.utcnow(),
        from_budget_line_id=payload.from_budget_line_id,
        from_account_code=from_line.account_code,
        from_cost_center_id=from_line.cost_center_id,
        to_budget_line_id=payload.to_budget_line_id,
        to_account_code=to_line.account_code,
        to_cost_center_id=to_line.cost_center_id,
        transfer_amount=payload.transfer_amount,
        reason=payload.reason,
        status="DRAFT",
        notes=payload.notes,
        created_by=str(current_user.id),
    )

    session.add(transfer)
    session.commit()
    session.refresh(transfer)

    return transfer.model_dump()


@router.post("/budget-transfers/{transfer_id}/approve")
def approve_transfer(
    transfer_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Approve a budget transfer"""
    tenant_id = str(current_user.tenant_id)

    transfer = session.get(BudgetTransfer, transfer_id)
    if not transfer or str(transfer.tenant_id) != tenant_id:
        raise HTTPException(404, "Transfer not found")

    if transfer.status != "DRAFT":
        raise HTTPException(400, "Transfer already processed")

    # Update from line
    from_line = session.get(BudgetLine, transfer.from_budget_line_id)
    if from_line:
        from_line.annual_budget -= transfer.transfer_amount
        session.add(from_line)

    # Update to line
    to_line = session.get(BudgetLine, transfer.to_budget_line_id)
    if to_line:
        to_line.annual_budget += transfer.transfer_amount
        session.add(to_line)

    transfer.status = "APPROVED"
    transfer.approved_at = datetime.utcnow()
    transfer.approved_by = str(current_user.id)

    session.add(transfer)
    session.commit()
    session.refresh(transfer)

    return {"success": True, "transfer": transfer.model_dump()}


# =====================
# BUDGET REVISIONS
# =====================

@router.post("/budget-revisions")
def create_revision(
    payload: BudgetRevisionCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a budget revision request"""
    tenant_id = str(current_user.tenant_id)

    line = session.get(BudgetLine, payload.budget_line_id)
    if not line:
        raise HTTPException(404, "Budget line not found")

    # Generate number
    count = session.exec(
        select(func.count(BudgetRevision.id)).where(
            BudgetRevision.tenant_id == tenant_id
        )
    ).one() or 0

    original_amount = line.annual_budget
    if payload.revision_type == "INCREASE":
        new_amount = original_amount + payload.revision_amount
    else:
        new_amount = original_amount - payload.revision_amount

    revision = BudgetRevision(
        tenant_id=tenant_id,
        revision_number=f"BR-{datetime.now().year}-{count + 1:04d}",
        revision_date=datetime.utcnow(),
        budget_id=payload.budget_id,
        budget_line_id=payload.budget_line_id,
        revision_type=payload.revision_type,
        original_amount=original_amount,
        revision_amount=payload.revision_amount,
        new_amount=new_amount,
        period_number=payload.period_number,
        reason=payload.reason,
        status="DRAFT",
        notes=payload.notes,
        created_by=str(current_user.id),
    )

    session.add(revision)
    session.commit()
    session.refresh(revision)

    return revision.model_dump()
