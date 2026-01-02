"""
Accounting - Chart of Accounts API Routes
Hệ thống tài khoản kế toán
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func, or_
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.db.session import get_session
from app.models import User
from app.models.accounting import (
    ChartOfAccounts, FiscalYear, FiscalPeriod, CostCenter, AccountingProject
)
from app.core.security import get_current_user

router = APIRouter()


# =====================
# PYDANTIC SCHEMAS
# =====================

class ChartOfAccountsCreate(BaseModel):
    account_code: str
    account_name: str
    account_name_en: Optional[str] = None
    parent_id: Optional[str] = None
    classification: str = "ASSET"
    nature: str = "DEBIT"
    category: Optional[str] = None
    currency: str = "VND"
    allow_posting: bool = True
    require_partner: bool = False
    require_cost_center: bool = False
    require_project: bool = False
    notes: Optional[str] = None


class ChartOfAccountsUpdate(BaseModel):
    account_name: Optional[str] = None
    account_name_en: Optional[str] = None
    classification: Optional[str] = None
    nature: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None
    allow_posting: Optional[bool] = None
    require_partner: Optional[bool] = None
    require_cost_center: Optional[bool] = None
    require_project: Optional[bool] = None
    notes: Optional[str] = None


class FiscalYearCreate(BaseModel):
    code: str
    name: str
    start_date: datetime
    end_date: datetime
    notes: Optional[str] = None


class FiscalPeriodCreate(BaseModel):
    fiscal_year_id: str
    period_number: int
    name: str
    start_date: datetime
    end_date: datetime
    is_adjustment: bool = False


class CostCenterCreate(BaseModel):
    code: str
    name: str
    parent_id: Optional[str] = None
    manager_id: Optional[str] = None
    department_id: Optional[str] = None
    budget_amount: float = 0
    notes: Optional[str] = None


# =====================
# CHART OF ACCOUNTS
# =====================

@router.get("/chart-of-accounts")
def list_accounts(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    classification: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
):
    """List all chart of accounts"""
    tenant_id = str(current_user.tenant_id)

    query = select(ChartOfAccounts).where(ChartOfAccounts.tenant_id == tenant_id)

    if classification:
        query = query.where(ChartOfAccounts.classification == classification)

    if category:
        query = query.where(ChartOfAccounts.category == category)

    if is_active is not None:
        query = query.where(ChartOfAccounts.is_active == is_active)

    if search:
        search_filter = or_(
            ChartOfAccounts.account_code.ilike(f"%{search}%"),
            ChartOfAccounts.account_name.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(ChartOfAccounts.account_code).offset(offset).limit(page_size)

    accounts = session.exec(query).all()

    return {
        "items": [acc.model_dump() for acc in accounts],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("/chart-of-accounts")
def create_account(
    payload: ChartOfAccountsCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new account"""
    tenant_id = str(current_user.tenant_id)

    # Check unique code
    existing = session.exec(
        select(ChartOfAccounts).where(
            ChartOfAccounts.tenant_id == tenant_id,
            ChartOfAccounts.account_code == payload.account_code
        )
    ).first()
    if existing:
        raise HTTPException(400, f"Account code '{payload.account_code}' already exists")

    # Determine level and full_path
    level = 1
    full_path = payload.account_code
    is_parent_account = False

    if payload.parent_id:
        parent = session.get(ChartOfAccounts, payload.parent_id)
        if not parent or str(parent.tenant_id) != tenant_id:
            raise HTTPException(400, "Invalid parent_id")
        level = parent.level + 1
        full_path = f"{parent.full_path}/{payload.account_code}"

        # Mark parent as having children
        parent.is_parent = True
        session.add(parent)

    account = ChartOfAccounts(
        tenant_id=tenant_id,
        **payload.model_dump(),
        level=level,
        full_path=full_path,
        is_parent=False,
        is_active=True,
        is_system=False,
        created_by=str(current_user.id),
    )

    session.add(account)
    session.commit()
    session.refresh(account)

    return account


@router.get("/chart-of-accounts/{account_id}")
def get_account(
    account_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get account by ID"""
    tenant_id = str(current_user.tenant_id)

    account = session.get(ChartOfAccounts, account_id)
    if not account or str(account.tenant_id) != tenant_id:
        raise HTTPException(404, "Account not found")

    return account.model_dump()


@router.put("/chart-of-accounts/{account_id}")
def update_account(
    account_id: str,
    payload: ChartOfAccountsUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update an account"""
    tenant_id = str(current_user.tenant_id)

    account = session.get(ChartOfAccounts, account_id)
    if not account or str(account.tenant_id) != tenant_id:
        raise HTTPException(404, "Account not found")

    if account.is_system:
        raise HTTPException(400, "Cannot modify system account")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(account, key, value)

    account.updated_at = datetime.utcnow()

    session.add(account)
    session.commit()
    session.refresh(account)

    return account


@router.delete("/chart-of-accounts/{account_id}")
def delete_account(
    account_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete an account (soft delete - deactivate)"""
    tenant_id = str(current_user.tenant_id)

    account = session.get(ChartOfAccounts, account_id)
    if not account or str(account.tenant_id) != tenant_id:
        raise HTTPException(404, "Account not found")

    if account.is_system:
        raise HTTPException(400, "Cannot delete system account")

    if account.is_parent:
        raise HTTPException(400, "Cannot delete account with children")

    # Check if has transactions
    # TODO: Add check for journal entry lines

    account.is_active = False
    account.updated_at = datetime.utcnow()

    session.add(account)
    session.commit()

    return {"success": True, "message": "Account deactivated"}


# =====================
# FISCAL YEARS
# =====================

@router.get("/fiscal-years")
def list_fiscal_years(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all fiscal years"""
    tenant_id = str(current_user.tenant_id)

    query = select(FiscalYear).where(
        FiscalYear.tenant_id == tenant_id
    ).order_by(FiscalYear.start_date.desc())

    years = session.exec(query).all()

    return {"items": [y.model_dump() for y in years]}


@router.post("/fiscal-years")
def create_fiscal_year(
    payload: FiscalYearCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new fiscal year"""
    tenant_id = str(current_user.tenant_id)

    # Check unique code
    existing = session.exec(
        select(FiscalYear).where(
            FiscalYear.tenant_id == tenant_id,
            FiscalYear.code == payload.code
        )
    ).first()
    if existing:
        raise HTTPException(400, f"Fiscal year '{payload.code}' already exists")

    year = FiscalYear(
        tenant_id=tenant_id,
        **payload.model_dump(),
        is_active=True,
        is_closed=False,
        created_by=str(current_user.id),
    )

    session.add(year)
    session.commit()
    session.refresh(year)

    return year


@router.get("/fiscal-years/{year_id}")
def get_fiscal_year(
    year_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get fiscal year with periods"""
    tenant_id = str(current_user.tenant_id)

    year = session.get(FiscalYear, year_id)
    if not year or str(year.tenant_id) != tenant_id:
        raise HTTPException(404, "Fiscal year not found")

    periods = session.exec(
        select(FiscalPeriod).where(
            FiscalPeriod.fiscal_year_id == year_id
        ).order_by(FiscalPeriod.period_number)
    ).all()

    return {
        **year.model_dump(),
        "periods": [p.model_dump() for p in periods]
    }


@router.post("/fiscal-years/{year_id}/generate-periods")
def generate_periods(
    year_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Generate monthly periods for fiscal year"""
    tenant_id = str(current_user.tenant_id)

    year = session.get(FiscalYear, year_id)
    if not year or str(year.tenant_id) != tenant_id:
        raise HTTPException(404, "Fiscal year not found")

    # Check if periods already exist
    existing = session.exec(
        select(FiscalPeriod).where(FiscalPeriod.fiscal_year_id == year_id)
    ).first()
    if existing:
        raise HTTPException(400, "Periods already exist for this fiscal year")

    from dateutil.relativedelta import relativedelta

    periods = []
    current_start = year.start_date

    for i in range(1, 13):
        current_end = current_start + relativedelta(months=1, days=-1)
        if current_end > year.end_date:
            current_end = year.end_date

        period = FiscalPeriod(
            tenant_id=tenant_id,
            fiscal_year_id=year_id,
            period_number=i,
            name=f"Tháng {i:02d}/{year.start_date.year}",
            start_date=current_start,
            end_date=current_end,
            is_open=True,
            is_adjustment=False,
        )
        session.add(period)
        periods.append(period)

        current_start = current_end + relativedelta(days=1)
        if current_start > year.end_date:
            break

    session.commit()

    return {"message": f"Generated {len(periods)} periods", "periods": len(periods)}


# =====================
# COST CENTERS
# =====================

@router.get("/cost-centers")
def list_cost_centers(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    is_active: Optional[bool] = Query(None),
):
    """List all cost centers"""
    tenant_id = str(current_user.tenant_id)

    query = select(CostCenter).where(CostCenter.tenant_id == tenant_id)

    if is_active is not None:
        query = query.where(CostCenter.is_active == is_active)

    query = query.order_by(CostCenter.code)

    centers = session.exec(query).all()

    return {"items": [c.model_dump() for c in centers]}


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
        raise HTTPException(400, f"Cost center '{payload.code}' already exists")

    center = CostCenter(
        tenant_id=tenant_id,
        **payload.model_dump(),
        is_active=True,
        created_by=str(current_user.id),
    )

    session.add(center)
    session.commit()
    session.refresh(center)

    return center


@router.get("/cost-centers/{center_id}")
def get_cost_center(
    center_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get cost center by ID"""
    tenant_id = str(current_user.tenant_id)

    center = session.get(CostCenter, center_id)
    if not center or str(center.tenant_id) != tenant_id:
        raise HTTPException(404, "Cost center not found")

    return center.model_dump()


@router.put("/cost-centers/{center_id}")
def update_cost_center(
    center_id: str,
    payload: CostCenterCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a cost center"""
    tenant_id = str(current_user.tenant_id)

    center = session.get(CostCenter, center_id)
    if not center or str(center.tenant_id) != tenant_id:
        raise HTTPException(404, "Cost center not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(center, key, value)

    center.updated_at = datetime.utcnow()

    session.add(center)
    session.commit()
    session.refresh(center)

    return center
