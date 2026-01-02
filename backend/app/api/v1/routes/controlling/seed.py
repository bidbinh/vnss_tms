"""
Controlling - Seed Data API
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from datetime import datetime, timedelta
from decimal import Decimal

from app.db.session import get_session
from app.models import User
from app.models.accounting import CostCenter, FiscalYear, FiscalPeriod, ChartOfAccounts
from app.models.controlling import (
    Budget, BudgetLine, BudgetStatus, BudgetType,
    ProfitCenter, ProfitCenterType,
    InternalOrder, InternalOrderType, InternalOrderStatus,
    ControllingActivity as Activity, ControllingActivityType as ActivityType, ActivityRate,
    CostCenterHierarchy, CostCenterType, CostAllocationRule, AllocationMethod
)
from app.core.security import get_current_user

router = APIRouter()


@router.post("/seed")
def seed_controlling_data(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Seed sample controlling data for testing"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    results = {
        "cost_center_hierarchies": 0,
        "allocation_rules": 0,
        "profit_centers": 0,
        "budgets": 0,
        "budget_lines": 0,
        "internal_orders": 0,
        "activities": 0,
        "activity_rates": 0,
    }

    # Get fiscal year
    fiscal_year = session.exec(
        select(FiscalYear).where(
            FiscalYear.tenant_id == tenant_id,
            FiscalYear.is_active == True
        )
    ).first()

    if not fiscal_year:
        raise HTTPException(400, "No active fiscal year found. Please create one first.")

    # Get cost centers
    cost_centers = session.exec(
        select(CostCenter).where(
            CostCenter.tenant_id == tenant_id,
            CostCenter.is_active == True
        )
    ).all()

    if not cost_centers:
        raise HTTPException(400, "No cost centers found. Please create cost centers in Accounting module first.")

    # Get expense accounts for budgets
    expense_accounts = session.exec(
        select(ChartOfAccounts).where(
            ChartOfAccounts.tenant_id == tenant_id,
            ChartOfAccounts.classification == "EXPENSE",
            ChartOfAccounts.is_active == True
        ).limit(10)
    ).all()

    # =====================
    # COST CENTER HIERARCHIES
    # =====================
    hierarchies_data = [
        {"code": "CC-ROOT", "name": "Tập đoàn", "cost_center_type": CostCenterType.ADMINISTRATION.value, "level": 1},
        {"code": "CC-OPS", "name": "Khối Vận hành", "cost_center_type": CostCenterType.PRODUCTION.value, "level": 2},
        {"code": "CC-SALES", "name": "Khối Kinh doanh", "cost_center_type": CostCenterType.SALES.value, "level": 2},
        {"code": "CC-ADMIN", "name": "Khối Hành chính", "cost_center_type": CostCenterType.ADMINISTRATION.value, "level": 2},
        {"code": "CC-IT", "name": "Phòng CNTT", "cost_center_type": CostCenterType.SERVICE.value, "level": 3},
    ]

    parent_id = None
    for data in hierarchies_data:
        existing = session.exec(
            select(CostCenterHierarchy).where(
                CostCenterHierarchy.tenant_id == tenant_id,
                CostCenterHierarchy.code == data["code"]
            )
        ).first()

        if not existing:
            hierarchy = CostCenterHierarchy(
                tenant_id=tenant_id,
                code=data["code"],
                name=data["name"],
                cost_center_type=data["cost_center_type"],
                parent_id=parent_id,
                level=data["level"],
                is_active=True,
                created_by=user_id,
            )
            session.add(hierarchy)
            session.commit()
            session.refresh(hierarchy)
            results["cost_center_hierarchies"] += 1

            if data["level"] == 1:
                parent_id = str(hierarchy.id)

    # =====================
    # ALLOCATION RULES
    # =====================
    if len(cost_centers) >= 2:
        rules_data = [
            {
                "rule_name": "Phân bổ CP IT theo headcount",
                "from_cost_center_id": str(cost_centers[0].id),
                "to_cost_center_id": str(cost_centers[1].id) if len(cost_centers) > 1 else None,
                "allocation_method": AllocationMethod.HEADCOUNT.value,
                "allocation_percent": Decimal("30"),
            },
        ]

        for data in rules_data:
            if data["to_cost_center_id"]:
                existing = session.exec(
                    select(CostAllocationRule).where(
                        CostAllocationRule.tenant_id == tenant_id,
                        CostAllocationRule.rule_name == data["rule_name"]
                    )
                ).first()

                if not existing:
                    rule = CostAllocationRule(
                        tenant_id=tenant_id,
                        rule_name=data["rule_name"],
                        from_cost_center_id=data["from_cost_center_id"],
                        to_cost_center_id=data["to_cost_center_id"],
                        allocation_method=data["allocation_method"],
                        allocation_percent=data["allocation_percent"],
                        is_active=True,
                        valid_from=datetime.utcnow(),
                        created_by=user_id,
                    )
                    session.add(rule)
                    results["allocation_rules"] += 1

    session.commit()

    # =====================
    # PROFIT CENTERS
    # =====================
    profit_centers_data = [
        {
            "code": "PC-001",
            "name": "Vận tải đường bộ",
            "profit_center_type": ProfitCenterType.BUSINESS_UNIT.value,
            "revenue_target": Decimal("5000000000"),
            "cost_target": Decimal("4000000000"),
            "profit_target": Decimal("1000000000"),
            "margin_target_percent": Decimal("20"),
        },
        {
            "code": "PC-002",
            "name": "Vận tải đường biển",
            "profit_center_type": ProfitCenterType.BUSINESS_UNIT.value,
            "revenue_target": Decimal("3000000000"),
            "cost_target": Decimal("2400000000"),
            "profit_target": Decimal("600000000"),
            "margin_target_percent": Decimal("20"),
        },
        {
            "code": "PC-003",
            "name": "Dịch vụ Logistics",
            "profit_center_type": ProfitCenterType.SERVICE_LINE.value,
            "revenue_target": Decimal("2000000000"),
            "cost_target": Decimal("1500000000"),
            "profit_target": Decimal("500000000"),
            "margin_target_percent": Decimal("25"),
        },
    ]

    created_profit_centers = []
    for data in profit_centers_data:
        existing = session.exec(
            select(ProfitCenter).where(
                ProfitCenter.tenant_id == tenant_id,
                ProfitCenter.code == data["code"]
            )
        ).first()

        if not existing:
            pc = ProfitCenter(
                tenant_id=tenant_id,
                **data,
                level=1,
                is_active=True,
                created_by=user_id,
            )
            session.add(pc)
            session.commit()
            session.refresh(pc)
            created_profit_centers.append(pc)
            results["profit_centers"] += 1
        else:
            created_profit_centers.append(existing)

    # =====================
    # BUDGETS
    # =====================
    budgets_data = [
        {
            "code": f"BUD-{fiscal_year.year_name}-OPS",
            "name": f"Ngân sách vận hành {fiscal_year.year_name}",
            "budget_type": BudgetType.OPERATING.value,
        },
        {
            "code": f"BUD-{fiscal_year.year_name}-CAPEX",
            "name": f"Ngân sách đầu tư {fiscal_year.year_name}",
            "budget_type": BudgetType.CAPITAL.value,
        },
    ]

    created_budgets = []
    for data in budgets_data:
        existing = session.exec(
            select(Budget).where(
                Budget.tenant_id == tenant_id,
                Budget.code == data["code"]
            )
        ).first()

        if not existing:
            budget = Budget(
                tenant_id=tenant_id,
                code=data["code"],
                name=data["name"],
                budget_type=data["budget_type"],
                fiscal_year_id=str(fiscal_year.id),
                period_from=fiscal_year.start_date,
                period_to=fiscal_year.end_date,
                currency="VND",
                status=BudgetStatus.DRAFT.value,
                allow_overspend=False,
                overspend_limit_percent=Decimal("0"),
                created_by=user_id,
            )
            session.add(budget)
            session.commit()
            session.refresh(budget)
            created_budgets.append(budget)
            results["budgets"] += 1
        else:
            created_budgets.append(existing)

    # Budget Lines
    if created_budgets and expense_accounts:
        for budget in created_budgets:
            # Check if budget already has lines
            existing_lines = session.exec(
                select(BudgetLine).where(
                    BudgetLine.tenant_id == tenant_id,
                    BudgetLine.budget_id == str(budget.id)
                )
            ).first()

            if not existing_lines:
                for i, account in enumerate(expense_accounts[:5]):
                    monthly_budget = Decimal("50000000") + (i * Decimal("10000000"))
                    line = BudgetLine(
                        tenant_id=tenant_id,
                        budget_id=str(budget.id),
                        account_id=str(account.id),
                        account_code=account.code,
                        cost_center_id=str(cost_centers[0].id) if cost_centers else None,
                        period_01=monthly_budget,
                        period_02=monthly_budget,
                        period_03=monthly_budget,
                        period_04=monthly_budget,
                        period_05=monthly_budget,
                        period_06=monthly_budget,
                        period_07=monthly_budget,
                        period_08=monthly_budget,
                        period_09=monthly_budget,
                        period_10=monthly_budget,
                        period_11=monthly_budget,
                        period_12=monthly_budget,
                        annual_budget=monthly_budget * 12,
                        created_by=user_id,
                    )
                    session.add(line)
                    results["budget_lines"] += 1

                # Update budget total
                budget.total_budget = sum([
                    (Decimal("50000000") + (i * Decimal("10000000"))) * 12
                    for i in range(min(5, len(expense_accounts)))
                ])
                budget.total_remaining = budget.total_budget
                session.add(budget)

    session.commit()

    # =====================
    # INTERNAL ORDERS
    # =====================
    orders_data = [
        {
            "name": "Sự kiện Hội nghị Khách hàng 2024",
            "order_type": InternalOrderType.MARKETING.value,
            "planned_cost": Decimal("500000000"),
        },
        {
            "name": "Bảo trì Hệ thống IT Q1",
            "order_type": InternalOrderType.MAINTENANCE.value,
            "planned_cost": Decimal("200000000"),
        },
        {
            "name": "Dự án Nâng cấp Phần mềm",
            "order_type": InternalOrderType.PROJECT.value,
            "planned_cost": Decimal("1000000000"),
        },
    ]

    for i, data in enumerate(orders_data):
        order_number = f"IO-{datetime.now().year}-{i + 1:05d}"
        existing = session.exec(
            select(InternalOrder).where(
                InternalOrder.tenant_id == tenant_id,
                InternalOrder.order_number == order_number
            )
        ).first()

        if not existing:
            order = InternalOrder(
                tenant_id=tenant_id,
                order_number=order_number,
                name=data["name"],
                order_type=data["order_type"],
                status=InternalOrderStatus.CREATED.value,
                planned_cost=data["planned_cost"],
                actual_cost=Decimal("0"),
                commitment=Decimal("0"),
                variance=Decimal("0") - data["planned_cost"],
                available_budget=data["planned_cost"],
                cost_center_id=str(cost_centers[0].id) if cost_centers else None,
                start_date=datetime.utcnow(),
                end_date=datetime.utcnow() + timedelta(days=90),
                currency="VND",
                created_by=user_id,
            )
            session.add(order)
            results["internal_orders"] += 1

    session.commit()

    # =====================
    # ACTIVITIES (ABC)
    # =====================
    activities_data = [
        {
            "code": "ACT-001",
            "name": "Vận chuyển Container",
            "activity_type": ActivityType.PRIMARY.value,
            "cost_driver": "CONTAINER_COUNT",
            "unit_of_measure": "CONTAINER",
            "planned_quantity": Decimal("1000"),
            "planned_rate": Decimal("5000000"),
        },
        {
            "code": "ACT-002",
            "name": "Xử lý Đơn hàng",
            "activity_type": ActivityType.PRIMARY.value,
            "cost_driver": "ORDER_COUNT",
            "unit_of_measure": "ORDER",
            "planned_quantity": Decimal("5000"),
            "planned_rate": Decimal("100000"),
        },
        {
            "code": "ACT-003",
            "name": "Hỗ trợ IT",
            "activity_type": ActivityType.SUPPORT.value,
            "cost_driver": "LABOR_HOURS",
            "unit_of_measure": "HOUR",
            "planned_quantity": Decimal("2000"),
            "planned_rate": Decimal("200000"),
        },
        {
            "code": "ACT-004",
            "name": "Quản lý Kho",
            "activity_type": ActivityType.PRIMARY.value,
            "cost_driver": "SQUARE_METERS",
            "unit_of_measure": "SQM",
            "planned_quantity": Decimal("500"),
            "planned_rate": Decimal("1000000"),
        },
    ]

    created_activities = []
    for data in activities_data:
        existing = session.exec(
            select(Activity).where(
                Activity.tenant_id == tenant_id,
                Activity.code == data["code"]
            )
        ).first()

        if not existing:
            activity = Activity(
                tenant_id=tenant_id,
                code=data["code"],
                name=data["name"],
                activity_type=data["activity_type"],
                cost_center_id=str(cost_centers[0].id) if cost_centers else None,
                cost_driver=data["cost_driver"],
                unit_of_measure=data["unit_of_measure"],
                planned_quantity=data["planned_quantity"],
                planned_rate=data["planned_rate"],
                planned_cost=data["planned_quantity"] * data["planned_rate"],
                actual_quantity=Decimal("0"),
                actual_rate=Decimal("0"),
                actual_cost=Decimal("0"),
                currency="VND",
                is_active=True,
                created_by=user_id,
            )
            session.add(activity)
            session.commit()
            session.refresh(activity)
            created_activities.append(activity)
            results["activities"] += 1
        else:
            created_activities.append(existing)

    # Activity Rates
    for activity in created_activities:
        existing_rate = session.exec(
            select(ActivityRate).where(
                ActivityRate.tenant_id == tenant_id,
                ActivityRate.activity_id == str(activity.id),
                ActivityRate.fiscal_year_id == str(fiscal_year.id)
            )
        ).first()

        if not existing_rate:
            fixed_costs = activity.planned_cost * Decimal("0.4")  # 40% fixed
            variable_costs = activity.planned_cost * Decimal("0.6")  # 60% variable

            rate = ActivityRate(
                tenant_id=tenant_id,
                activity_id=str(activity.id),
                fiscal_year_id=str(fiscal_year.id),
                rate_type="PLAN",
                valid_from=fiscal_year.start_date,
                fixed_costs=fixed_costs,
                variable_costs=variable_costs,
                total_costs=activity.planned_cost,
                planned_quantity=activity.planned_quantity,
                activity_rate=activity.planned_rate,
                fixed_rate=fixed_costs / activity.planned_quantity if activity.planned_quantity > 0 else Decimal("0"),
                variable_rate=variable_costs / activity.planned_quantity if activity.planned_quantity > 0 else Decimal("0"),
                currency="VND",
                created_by=user_id,
            )
            session.add(rate)
            results["activity_rates"] += 1

    session.commit()

    return {
        "success": True,
        "message": "Controlling seed data created successfully",
        "results": results,
    }
