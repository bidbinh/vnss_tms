"""
Controlling - Reports API Routes
Budget vs Actual, Profitability Analysis, Cost Analysis
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

from app.db.session import get_session
from app.models import User
from app.models.accounting import CostCenter, FiscalYear, FiscalPeriod
from app.models.accounting.journal import JournalEntryLine, JournalEntry, JournalEntryStatus
from app.models.controlling import (
    Budget, BudgetLine, BudgetStatus,
    ProfitCenter, ProfitAnalysis,
    InternalOrder, InternalOrderLine,
    ControllingActivity as Activity, ActivityAllocation,
    CostCenterHierarchy, CostAllocation
)
from app.core.security import get_current_user

router = APIRouter()


# =====================
# BUDGET VS ACTUAL REPORT
# =====================

@router.get("/reports/budget-vs-actual")
def get_budget_vs_actual(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    budget_id: str = Query(...),
    fiscal_period_id: Optional[str] = Query(None),
):
    """
    Budget vs Actual comparison report
    Shows planned vs actual for each budget line
    """
    tenant_id = str(current_user.tenant_id)

    # Get budget
    budget = session.get(Budget, budget_id)
    if not budget or str(budget.tenant_id) != tenant_id:
        raise HTTPException(404, "Budget not found")

    # Get budget lines
    lines = session.exec(
        select(BudgetLine).where(
            BudgetLine.tenant_id == tenant_id,
            BudgetLine.budget_id == budget_id
        ).order_by(BudgetLine.account_code)
    ).all()

    report_lines = []
    total_budget = Decimal("0")
    total_actual = Decimal("0")

    for line in lines:
        # Get actual from journal entries for this account
        actual_query = select(func.sum(
            JournalEntryLine.debit_amount - JournalEntryLine.credit_amount
        )).join(
            JournalEntry,
            JournalEntryLine.journal_entry_id == JournalEntry.id
        ).where(
            JournalEntryLine.tenant_id == tenant_id,
            JournalEntryLine.account_id == line.account_id,
            JournalEntry.status == JournalEntryStatus.POSTED.value,
            JournalEntry.fiscal_year_id == budget.fiscal_year_id
        )

        if line.cost_center_id:
            actual_query = actual_query.where(
                JournalEntryLine.cost_center_id == line.cost_center_id
            )

        if fiscal_period_id:
            actual_query = actual_query.where(
                JournalEntry.fiscal_period_id == fiscal_period_id
            )

        actual = session.exec(actual_query).one() or Decimal("0")

        variance = line.annual_budget - actual
        variance_percent = Decimal("0")
        if line.annual_budget > 0:
            variance_percent = (variance / line.annual_budget) * 100

        report_lines.append({
            "account_id": line.account_id,
            "account_code": line.account_code,
            "cost_center_id": line.cost_center_id,
            "budget_amount": float(line.annual_budget),
            "actual_amount": float(actual),
            "variance": float(variance),
            "variance_percent": float(variance_percent),
            "utilization_percent": float(100 - variance_percent) if line.annual_budget > 0 else 0,
        })

        total_budget += line.annual_budget
        total_actual += actual

    total_variance = total_budget - total_actual
    total_variance_percent = Decimal("0")
    if total_budget > 0:
        total_variance_percent = (total_variance / total_budget) * 100

    return {
        "budget": budget.model_dump(),
        "lines": report_lines,
        "summary": {
            "total_budget": float(total_budget),
            "total_actual": float(total_actual),
            "total_variance": float(total_variance),
            "total_variance_percent": float(total_variance_percent),
            "utilization_percent": float(100 - total_variance_percent) if total_budget > 0 else 0,
        }
    }


# =====================
# COST CENTER REPORT
# =====================

@router.get("/reports/cost-center-analysis")
def get_cost_center_analysis(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    fiscal_year_id: str = Query(...),
    fiscal_period_id: Optional[str] = Query(None),
):
    """
    Cost center analysis report
    Shows costs by cost center with breakdown
    """
    tenant_id = str(current_user.tenant_id)

    # Get all cost centers
    cost_centers = session.exec(
        select(CostCenter).where(
            CostCenter.tenant_id == tenant_id,
            CostCenter.is_active == True
        ).order_by(CostCenter.code)
    ).all()

    report_items = []
    grand_total = Decimal("0")

    for cc in cost_centers:
        # Get actual costs from journal entries
        cost_query = select(func.sum(
            JournalEntryLine.debit_amount - JournalEntryLine.credit_amount
        )).join(
            JournalEntry,
            JournalEntryLine.journal_entry_id == JournalEntry.id
        ).where(
            JournalEntryLine.tenant_id == tenant_id,
            JournalEntryLine.cost_center_id == str(cc.id),
            JournalEntry.status == JournalEntryStatus.POSTED.value,
            JournalEntry.fiscal_year_id == fiscal_year_id
        )

        if fiscal_period_id:
            cost_query = cost_query.where(
                JournalEntry.fiscal_period_id == fiscal_period_id
            )

        total_cost = session.exec(cost_query).one() or Decimal("0")

        # Get allocated costs (costs allocated TO this cost center)
        allocated_in = session.exec(
            select(func.sum(CostAllocation.allocated_amount)).where(
                CostAllocation.tenant_id == tenant_id,
                CostAllocation.to_cost_center_id == str(cc.id)
            )
        ).one() or Decimal("0")

        # Get allocated out costs (costs allocated FROM this cost center)
        allocated_out = session.exec(
            select(func.sum(CostAllocation.allocated_amount)).where(
                CostAllocation.tenant_id == tenant_id,
                CostAllocation.from_cost_center_id == str(cc.id)
            )
        ).one() or Decimal("0")

        net_cost = total_cost + allocated_in - allocated_out

        report_items.append({
            "cost_center_id": str(cc.id),
            "cost_center_code": cc.code,
            "cost_center_name": cc.name,
            "direct_costs": float(total_cost),
            "allocated_in": float(allocated_in),
            "allocated_out": float(allocated_out),
            "net_cost": float(net_cost),
        })

        grand_total += net_cost

    return {
        "fiscal_year_id": fiscal_year_id,
        "fiscal_period_id": fiscal_period_id,
        "items": report_items,
        "grand_total": float(grand_total),
    }


# =====================
# PROFITABILITY REPORT
# =====================

@router.get("/reports/profitability")
def get_profitability_report(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    fiscal_year_id: str = Query(...),
):
    """
    Profitability report by profit center
    """
    tenant_id = str(current_user.tenant_id)

    # Get profit analysis records
    analyses = session.exec(
        select(ProfitAnalysis).where(
            ProfitAnalysis.tenant_id == tenant_id,
            ProfitAnalysis.fiscal_year_id == fiscal_year_id
        ).order_by(ProfitAnalysis.analysis_date.desc())
    ).all()

    # Get profit centers for names
    profit_centers = session.exec(
        select(ProfitCenter).where(
            ProfitCenter.tenant_id == tenant_id
        )
    ).all()
    pc_map = {str(pc.id): pc for pc in profit_centers}

    report_items = []
    totals = {
        "revenue": Decimal("0"),
        "direct_costs": Decimal("0"),
        "indirect_costs": Decimal("0"),
        "allocated_overhead": Decimal("0"),
        "gross_profit": Decimal("0"),
        "operating_profit": Decimal("0"),
        "net_profit": Decimal("0"),
    }

    for analysis in analyses:
        pc = pc_map.get(analysis.profit_center_id)
        report_items.append({
            "profit_center_id": analysis.profit_center_id,
            "profit_center_code": pc.code if pc else "",
            "profit_center_name": pc.name if pc else "",
            "revenue": float(analysis.revenue),
            "direct_costs": float(analysis.direct_costs),
            "indirect_costs": float(analysis.indirect_costs),
            "allocated_overhead": float(analysis.allocated_overhead),
            "gross_profit": float(analysis.gross_profit),
            "gross_margin_percent": float(analysis.gross_margin_percent),
            "operating_profit": float(analysis.operating_profit),
            "operating_margin_percent": float(analysis.operating_margin_percent),
            "net_profit": float(analysis.net_profit),
            "net_margin_percent": float(analysis.net_margin_percent),
            "revenue_variance": float(analysis.revenue_variance),
            "cost_variance": float(analysis.cost_variance),
            "profit_variance": float(analysis.profit_variance),
        })

        totals["revenue"] += analysis.revenue
        totals["direct_costs"] += analysis.direct_costs
        totals["indirect_costs"] += analysis.indirect_costs
        totals["allocated_overhead"] += analysis.allocated_overhead
        totals["gross_profit"] += analysis.gross_profit
        totals["operating_profit"] += analysis.operating_profit
        totals["net_profit"] += analysis.net_profit

    # Calculate total margins
    total_gross_margin = Decimal("0")
    total_operating_margin = Decimal("0")
    total_net_margin = Decimal("0")

    if totals["revenue"] > 0:
        total_gross_margin = (totals["gross_profit"] / totals["revenue"]) * 100
        total_operating_margin = (totals["operating_profit"] / totals["revenue"]) * 100
        total_net_margin = (totals["net_profit"] / totals["revenue"]) * 100

    return {
        "fiscal_year_id": fiscal_year_id,
        "items": report_items,
        "totals": {
            "revenue": float(totals["revenue"]),
            "direct_costs": float(totals["direct_costs"]),
            "indirect_costs": float(totals["indirect_costs"]),
            "allocated_overhead": float(totals["allocated_overhead"]),
            "gross_profit": float(totals["gross_profit"]),
            "gross_margin_percent": float(total_gross_margin),
            "operating_profit": float(totals["operating_profit"]),
            "operating_margin_percent": float(total_operating_margin),
            "net_profit": float(totals["net_profit"]),
            "net_margin_percent": float(total_net_margin),
        }
    }


# =====================
# INTERNAL ORDER REPORT
# =====================

@router.get("/reports/internal-orders")
def get_internal_orders_report(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    status: Optional[str] = Query(None),
    cost_center_id: Optional[str] = Query(None),
):
    """
    Internal orders status report
    """
    tenant_id = str(current_user.tenant_id)

    query = select(InternalOrder).where(
        InternalOrder.tenant_id == tenant_id
    )

    if status:
        query = query.where(InternalOrder.status == status)

    if cost_center_id:
        query = query.where(InternalOrder.cost_center_id == cost_center_id)

    orders = session.exec(query.order_by(InternalOrder.order_number)).all()

    report_items = []
    totals = {
        "planned": Decimal("0"),
        "actual": Decimal("0"),
        "commitment": Decimal("0"),
        "available": Decimal("0"),
        "variance": Decimal("0"),
    }

    for order in orders:
        report_items.append({
            "order_number": order.order_number,
            "name": order.name,
            "order_type": order.order_type,
            "status": order.status,
            "cost_center_id": order.cost_center_id,
            "planned_cost": float(order.planned_cost),
            "actual_cost": float(order.actual_cost),
            "commitment": float(order.commitment),
            "available_budget": float(order.available_budget),
            "variance": float(order.variance),
            "start_date": order.start_date.isoformat() if order.start_date else None,
            "end_date": order.end_date.isoformat() if order.end_date else None,
        })

        totals["planned"] += order.planned_cost
        totals["actual"] += order.actual_cost
        totals["commitment"] += order.commitment
        totals["available"] += order.available_budget
        totals["variance"] += order.variance

    return {
        "items": report_items,
        "totals": {
            "planned_cost": float(totals["planned"]),
            "actual_cost": float(totals["actual"]),
            "commitment": float(totals["commitment"]),
            "available_budget": float(totals["available"]),
            "variance": float(totals["variance"]),
        },
        "count": len(report_items),
    }


# =====================
# ACTIVITY ANALYSIS REPORT
# =====================

@router.get("/reports/activity-analysis")
def get_activity_analysis(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    fiscal_year_id: Optional[str] = Query(None),
    cost_center_id: Optional[str] = Query(None),
):
    """
    Activity-based costing analysis report
    """
    tenant_id = str(current_user.tenant_id)

    query = select(Activity).where(
        Activity.tenant_id == tenant_id,
        Activity.is_active == True
    )

    if cost_center_id:
        query = query.where(Activity.cost_center_id == cost_center_id)

    activities = session.exec(query.order_by(Activity.code)).all()

    report_items = []
    totals = {
        "planned_qty": Decimal("0"),
        "actual_qty": Decimal("0"),
        "planned_cost": Decimal("0"),
        "actual_cost": Decimal("0"),
    }

    for activity in activities:
        qty_variance = activity.actual_quantity - activity.planned_quantity
        cost_variance = activity.actual_cost - activity.planned_cost
        efficiency = Decimal("0")
        if activity.planned_quantity > 0:
            efficiency = (activity.actual_quantity / activity.planned_quantity) * 100

        report_items.append({
            "activity_id": str(activity.id),
            "activity_code": activity.code,
            "activity_name": activity.name,
            "activity_type": activity.activity_type,
            "cost_driver": activity.cost_driver,
            "unit_of_measure": activity.unit_of_measure,
            "planned_quantity": float(activity.planned_quantity),
            "actual_quantity": float(activity.actual_quantity),
            "quantity_variance": float(qty_variance),
            "planned_rate": float(activity.planned_rate),
            "actual_rate": float(activity.actual_rate),
            "planned_cost": float(activity.planned_cost),
            "actual_cost": float(activity.actual_cost),
            "cost_variance": float(cost_variance),
            "efficiency_percent": float(efficiency),
        })

        totals["planned_qty"] += activity.planned_quantity
        totals["actual_qty"] += activity.actual_quantity
        totals["planned_cost"] += activity.planned_cost
        totals["actual_cost"] += activity.actual_cost

    return {
        "items": report_items,
        "totals": {
            "planned_quantity": float(totals["planned_qty"]),
            "actual_quantity": float(totals["actual_qty"]),
            "planned_cost": float(totals["planned_cost"]),
            "actual_cost": float(totals["actual_cost"]),
            "total_variance": float(totals["actual_cost"] - totals["planned_cost"]),
        },
        "count": len(report_items),
    }


# =====================
# DASHBOARD SUMMARY
# =====================

@router.get("/reports/dashboard")
def get_controlling_dashboard(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    fiscal_year_id: Optional[str] = Query(None),
):
    """
    Controlling dashboard summary
    """
    tenant_id = str(current_user.tenant_id)

    # Budget summary
    budget_count = session.exec(
        select(func.count(Budget.id)).where(
            Budget.tenant_id == tenant_id
        )
    ).one() or 0

    active_budgets = session.exec(
        select(func.count(Budget.id)).where(
            Budget.tenant_id == tenant_id,
            Budget.status == BudgetStatus.ACTIVE.value
        )
    ).one() or 0

    total_budget = session.exec(
        select(func.sum(Budget.total_budget)).where(
            Budget.tenant_id == tenant_id,
            Budget.status == BudgetStatus.ACTIVE.value
        )
    ).one() or Decimal("0")

    # Cost center count
    cost_center_count = session.exec(
        select(func.count(CostCenter.id)).where(
            CostCenter.tenant_id == tenant_id,
            CostCenter.is_active == True
        )
    ).one() or 0

    # Profit center count
    profit_center_count = session.exec(
        select(func.count(ProfitCenter.id)).where(
            ProfitCenter.tenant_id == tenant_id,
            ProfitCenter.is_active == True
        )
    ).one() or 0

    # Internal orders
    active_orders = session.exec(
        select(func.count(InternalOrder.id)).where(
            InternalOrder.tenant_id == tenant_id,
            InternalOrder.status.in_(["CREATED", "RELEASED"])
        )
    ).one() or 0

    total_order_planned = session.exec(
        select(func.sum(InternalOrder.planned_cost)).where(
            InternalOrder.tenant_id == tenant_id,
            InternalOrder.status.in_(["CREATED", "RELEASED"])
        )
    ).one() or Decimal("0")

    total_order_actual = session.exec(
        select(func.sum(InternalOrder.actual_cost)).where(
            InternalOrder.tenant_id == tenant_id,
            InternalOrder.status.in_(["CREATED", "RELEASED"])
        )
    ).one() or Decimal("0")

    # Activity count
    activity_count = session.exec(
        select(func.count(Activity.id)).where(
            Activity.tenant_id == tenant_id,
            Activity.is_active == True
        )
    ).one() or 0

    return {
        "budgets": {
            "total_count": budget_count,
            "active_count": active_budgets,
            "total_amount": float(total_budget),
        },
        "cost_centers": {
            "count": cost_center_count,
        },
        "profit_centers": {
            "count": profit_center_count,
        },
        "internal_orders": {
            "active_count": active_orders,
            "total_planned": float(total_order_planned),
            "total_actual": float(total_order_actual),
            "variance": float(total_order_actual - total_order_planned),
        },
        "activities": {
            "count": activity_count,
        },
    }
