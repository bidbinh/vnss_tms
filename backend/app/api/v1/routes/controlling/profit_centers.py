"""
Controlling - Profit Centers API Routes
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
    ProfitCenter, ProfitAnalysis, SegmentReport,
    ProfitCenterType, SegmentType
)
from app.core.security import get_current_user

router = APIRouter()


# =====================
# PYDANTIC SCHEMAS
# =====================

class ProfitCenterCreate(BaseModel):
    code: str
    name: str
    profit_center_type: str = ProfitCenterType.BUSINESS_UNIT.value
    parent_id: Optional[str] = None
    manager_id: Optional[str] = None
    currency: str = "VND"
    revenue_target: Decimal = Decimal("0")
    cost_target: Decimal = Decimal("0")
    profit_target: Decimal = Decimal("0")
    margin_target_percent: Decimal = Decimal("0")
    notes: Optional[str] = None


class ProfitAnalysisCreate(BaseModel):
    profit_center_id: str
    fiscal_year_id: str
    fiscal_period_id: str
    revenue: Decimal = Decimal("0")
    direct_costs: Decimal = Decimal("0")
    indirect_costs: Decimal = Decimal("0")
    allocated_overhead: Decimal = Decimal("0")


class SegmentReportCreate(BaseModel):
    profit_center_id: str
    fiscal_year_id: str
    segment_type: str = SegmentType.OPERATING.value
    segment_name: str
    external_revenue: Decimal = Decimal("0")
    inter_segment_revenue: Decimal = Decimal("0")
    segment_expenses: Decimal = Decimal("0")
    segment_assets: Decimal = Decimal("0")
    segment_liabilities: Decimal = Decimal("0")
    capital_expenditure: Decimal = Decimal("0")
    depreciation: Decimal = Decimal("0")
    notes: Optional[str] = None


# =====================
# PROFIT CENTERS
# =====================

@router.get("/profit-centers")
def list_profit_centers(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    profit_center_type: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
):
    """List all profit centers"""
    tenant_id = str(current_user.tenant_id)

    query = select(ProfitCenter).where(ProfitCenter.tenant_id == tenant_id)

    if profit_center_type:
        query = query.where(ProfitCenter.profit_center_type == profit_center_type)

    if is_active is not None:
        query = query.where(ProfitCenter.is_active == is_active)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    query = query.order_by(ProfitCenter.code)
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.post("/profit-centers")
def create_profit_center(
    payload: ProfitCenterCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new profit center"""
    tenant_id = str(current_user.tenant_id)

    # Check unique code
    existing = session.exec(
        select(ProfitCenter).where(
            ProfitCenter.tenant_id == tenant_id,
            ProfitCenter.code == payload.code
        )
    ).first()
    if existing:
        raise HTTPException(400, f"Profit center code '{payload.code}' already exists")

    # Calculate level
    level = 1
    if payload.parent_id:
        parent = session.get(ProfitCenter, payload.parent_id)
        if parent:
            level = parent.level + 1

    profit_center = ProfitCenter(
        tenant_id=tenant_id,
        **payload.model_dump(),
        level=level,
        created_by=str(current_user.id),
    )

    session.add(profit_center)
    session.commit()
    session.refresh(profit_center)

    return profit_center.model_dump()


@router.get("/profit-centers/{profit_center_id}")
def get_profit_center(
    profit_center_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get profit center details"""
    tenant_id = str(current_user.tenant_id)

    profit_center = session.get(ProfitCenter, profit_center_id)
    if not profit_center or str(profit_center.tenant_id) != tenant_id:
        raise HTTPException(404, "Profit center not found")

    return profit_center.model_dump()


@router.put("/profit-centers/{profit_center_id}")
def update_profit_center(
    profit_center_id: str,
    payload: ProfitCenterCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a profit center"""
    tenant_id = str(current_user.tenant_id)

    profit_center = session.get(ProfitCenter, profit_center_id)
    if not profit_center or str(profit_center.tenant_id) != tenant_id:
        raise HTTPException(404, "Profit center not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(profit_center, key, value)

    profit_center.updated_at = datetime.utcnow()

    session.add(profit_center)
    session.commit()
    session.refresh(profit_center)

    return profit_center.model_dump()


@router.delete("/profit-centers/{profit_center_id}")
def delete_profit_center(
    profit_center_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Deactivate a profit center"""
    tenant_id = str(current_user.tenant_id)

    profit_center = session.get(ProfitCenter, profit_center_id)
    if not profit_center or str(profit_center.tenant_id) != tenant_id:
        raise HTTPException(404, "Profit center not found")

    profit_center.is_active = False
    profit_center.updated_at = datetime.utcnow()

    session.add(profit_center)
    session.commit()

    return {"success": True, "message": "Profit center deactivated"}


# =====================
# PROFIT ANALYSIS
# =====================

@router.get("/profit-analysis")
def list_profit_analysis(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    profit_center_id: Optional[str] = Query(None),
    fiscal_year_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
):
    """List profit analysis records"""
    tenant_id = str(current_user.tenant_id)

    query = select(ProfitAnalysis).where(ProfitAnalysis.tenant_id == tenant_id)

    if profit_center_id:
        query = query.where(ProfitAnalysis.profit_center_id == profit_center_id)

    if fiscal_year_id:
        query = query.where(ProfitAnalysis.fiscal_year_id == fiscal_year_id)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    query = query.order_by(ProfitAnalysis.analysis_date.desc())
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.post("/profit-analysis")
def create_profit_analysis(
    payload: ProfitAnalysisCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create or update profit analysis"""
    tenant_id = str(current_user.tenant_id)

    # Calculate derived fields
    gross_profit = payload.revenue - payload.direct_costs
    operating_profit = gross_profit - payload.indirect_costs - payload.allocated_overhead
    total_costs = payload.direct_costs + payload.indirect_costs + payload.allocated_overhead
    net_profit = payload.revenue - total_costs

    gross_margin_percent = Decimal("0")
    operating_margin_percent = Decimal("0")
    net_margin_percent = Decimal("0")

    if payload.revenue > 0:
        gross_margin_percent = (gross_profit / payload.revenue) * 100
        operating_margin_percent = (operating_profit / payload.revenue) * 100
        net_margin_percent = (net_profit / payload.revenue) * 100

    # Get profit center for variance calculation
    profit_center = session.get(ProfitCenter, payload.profit_center_id)
    revenue_variance = Decimal("0")
    cost_variance = Decimal("0")
    profit_variance = Decimal("0")

    if profit_center:
        revenue_variance = payload.revenue - profit_center.revenue_target
        cost_variance = total_costs - profit_center.cost_target
        profit_variance = net_profit - profit_center.profit_target

    analysis = ProfitAnalysis(
        tenant_id=tenant_id,
        profit_center_id=payload.profit_center_id,
        fiscal_year_id=payload.fiscal_year_id,
        fiscal_period_id=payload.fiscal_period_id,
        analysis_date=datetime.utcnow(),
        revenue=payload.revenue,
        direct_costs=payload.direct_costs,
        indirect_costs=payload.indirect_costs,
        allocated_overhead=payload.allocated_overhead,
        gross_profit=gross_profit,
        operating_profit=operating_profit,
        net_profit=net_profit,
        gross_margin_percent=gross_margin_percent,
        operating_margin_percent=operating_margin_percent,
        net_margin_percent=net_margin_percent,
        revenue_variance=revenue_variance,
        cost_variance=cost_variance,
        profit_variance=profit_variance,
        created_by=str(current_user.id),
    )

    session.add(analysis)
    session.commit()
    session.refresh(analysis)

    # Update profit center YTD
    if profit_center:
        profit_center.revenue_ytd = payload.revenue
        profit_center.cost_ytd = total_costs
        profit_center.profit_ytd = net_profit
        session.add(profit_center)
        session.commit()

    return analysis.model_dump()


# =====================
# SEGMENT REPORTS
# =====================

@router.get("/segment-reports")
def list_segment_reports(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    fiscal_year_id: Optional[str] = Query(None),
    segment_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
):
    """List segment reports (IFRS 8)"""
    tenant_id = str(current_user.tenant_id)

    query = select(SegmentReport).where(SegmentReport.tenant_id == tenant_id)

    if fiscal_year_id:
        query = query.where(SegmentReport.fiscal_year_id == fiscal_year_id)

    if segment_type:
        query = query.where(SegmentReport.segment_type == segment_type)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    query = query.order_by(SegmentReport.segment_name)
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.post("/segment-reports")
def create_segment_report(
    payload: SegmentReportCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create segment report"""
    tenant_id = str(current_user.tenant_id)

    # Calculate totals
    total_revenue = payload.external_revenue + payload.inter_segment_revenue
    segment_profit = total_revenue - payload.segment_expenses

    report = SegmentReport(
        tenant_id=tenant_id,
        **payload.model_dump(),
        total_revenue=total_revenue,
        segment_profit=segment_profit,
        created_by=str(current_user.id),
    )

    session.add(report)
    session.commit()
    session.refresh(report)

    return report.model_dump()


@router.get("/segment-reports/{report_id}")
def get_segment_report(
    report_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get segment report details"""
    tenant_id = str(current_user.tenant_id)

    report = session.get(SegmentReport, report_id)
    if not report or str(report.tenant_id) != tenant_id:
        raise HTTPException(404, "Segment report not found")

    return report.model_dump()
