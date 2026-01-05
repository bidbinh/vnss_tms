"""
Super Admin Billing APIs
- Dashboard tổng quan revenue & usage
- Quản lý tenant subscriptions
- Quản lý billing plans
- Quản lý invoices
"""
import json
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlmodel import Session, select, func, and_

from app.db.session import get_session
from app.models.user import UserSystemRole
from app.models import User
from app.models.billing import (
    TransactionType,
    BillingPlan,
    TenantSubscription,
    TransactionLog,
    BillingInvoice,
    UsageAlert,
    SubscriptionStatus,
    InvoiceStatus,
    AlertType,
    BillingCycle,
)
from app.models.tenant import Tenant
from app.models.activity_log import ActivityLog
from app.services.billing import (
    seed_billing_data,
    get_usage_breakdown,
    estimate_monthly_cost,
    get_current_billing_period,
)

router = APIRouter(prefix="/admin/billing", tags=["Super Admin - Billing"])


# ==================== AUTH DEPENDENCY ====================

from app.core.security import get_current_user

def require_super_admin(user: User = Depends(get_current_user)):
    """Require SUPER_ADMIN system role"""
    if user.system_role != UserSystemRole.SUPER_ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Only Super Admin can access billing management. Your role: {user.system_role}"
        )
    return user


# ==================== SCHEMAS ====================

class BillingDashboardResponse(BaseModel):
    # Revenue
    total_mrr: Decimal = Field(description="Monthly Recurring Revenue")
    total_this_month: Decimal = Field(description="Revenue tháng này")
    total_overdue: Decimal = Field(description="Số tiền quá hạn")
    growth_percent: Decimal = Field(description="% tăng trưởng so với tháng trước")

    # Customers
    total_tenants: int
    active_subscriptions: int
    trial_subscriptions: int
    churned_this_month: int

    # Usage
    total_credits_this_month: Decimal
    total_transactions_this_month: int

    # Alerts
    pending_alerts: int

    # Top tenants
    top_tenants_by_usage: list


class TenantBillingInfo(BaseModel):
    tenant_id: str
    tenant_name: str
    tenant_code: str
    plan_code: Optional[str]
    plan_name: Optional[str]
    subscription_status: Optional[str]
    billing_cycle: Optional[str]
    credits_used: Decimal
    credits_limit: int
    usage_percent: Decimal
    overage_credits: Decimal
    is_in_grace: bool
    next_billing_date: Optional[datetime]
    amount_due: Decimal


class PlanCreate(BaseModel):
    code: str
    name: str
    description: str
    price_per_month: Decimal
    price_per_year: Optional[Decimal] = None
    monthly_credits: int
    overage_discount: Decimal = Decimal("0")
    grace_percent: int = 0
    max_users: int = 0
    max_storage_gb: Decimal = Decimal("0")
    features: dict = {}
    is_public: bool = True
    sort_order: int = 0


class PlanUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price_per_month: Optional[Decimal] = None
    price_per_year: Optional[Decimal] = None
    monthly_credits: Optional[int] = None
    overage_discount: Optional[Decimal] = None
    grace_percent: Optional[int] = None
    max_users: Optional[int] = None
    max_storage_gb: Optional[Decimal] = None
    features: Optional[dict] = None
    is_public: Optional[bool] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class SubscriptionCreate(BaseModel):
    tenant_id: str
    plan_id: str
    billing_cycle: str = BillingCycle.MONTHLY.value
    trial_days: Optional[int] = None


class SubscriptionUpdate(BaseModel):
    plan_id: Optional[str] = None
    status: Optional[str] = None
    billing_cycle: Optional[str] = None
    auto_renew: Optional[bool] = None


class UsageBreakdownResponse(BaseModel):
    tenant_id: str
    tenant_name: str
    billing_period: str
    total_credits: Decimal
    total_transactions: int
    breakdown: list


# ==================== DASHBOARD ====================

@router.get("/dashboard", response_model=BillingDashboardResponse)
def get_billing_dashboard(
    session: Session = Depends(get_session),
    _: dict = Depends(require_super_admin)
):
    """Get billing dashboard overview"""
    current_period = get_current_billing_period()
    now = datetime.utcnow()
    first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Get all active subscriptions with plans
    subscriptions = session.exec(
        select(TenantSubscription)
        .where(TenantSubscription.status.in_([
            SubscriptionStatus.ACTIVE.value,
            SubscriptionStatus.TRIAL.value,
            SubscriptionStatus.PAST_DUE.value,
        ]))
    ).all()

    # Calculate MRR (Monthly Recurring Revenue)
    total_mrr = Decimal("0")
    for sub in subscriptions:
        plan = session.get(BillingPlan, sub.plan_id)
        if plan and sub.status == SubscriptionStatus.ACTIVE.value:
            total_mrr += plan.price_per_month

    # Total revenue this month (from invoices)
    revenue_this_month = session.exec(
        select(func.coalesce(func.sum(BillingInvoice.paid_amount), 0))
        .where(BillingInvoice.paid_at >= first_of_month)
    ).first() or Decimal("0")

    # Overdue amount
    overdue_amount = session.exec(
        select(func.coalesce(func.sum(BillingInvoice.total_amount - BillingInvoice.paid_amount), 0))
        .where(BillingInvoice.status == InvoiceStatus.OVERDUE.value)
    ).first() or Decimal("0")

    # Count subscriptions by status
    active_count = sum(1 for s in subscriptions if s.status == SubscriptionStatus.ACTIVE.value)
    trial_count = sum(1 for s in subscriptions if s.status == SubscriptionStatus.TRIAL.value)

    # Churned this month (cancelled)
    churned_count = session.exec(
        select(func.count(TenantSubscription.id))
        .where(TenantSubscription.status == SubscriptionStatus.CANCELLED.value)
        .where(TenantSubscription.updated_at >= first_of_month)
    ).first() or 0

    # Total tenants
    total_tenants = session.exec(
        select(func.count(Tenant.id)).where(Tenant.is_active == True)
    ).first() or 0

    # Usage this month
    usage_stats = session.exec(
        select(
            func.coalesce(func.sum(TransactionLog.credits_charged), 0),
            func.count(TransactionLog.id)
        )
        .where(TransactionLog.billing_period == current_period)
    ).first()
    total_credits = Decimal(str(usage_stats[0])) if usage_stats else Decimal("0")
    total_transactions = usage_stats[1] if usage_stats else 0

    # Pending alerts
    pending_alerts = session.exec(
        select(func.count(UsageAlert.id))
        .where(UsageAlert.acknowledged_at == None)
    ).first() or 0

    # Top tenants by usage
    top_tenants_query = session.exec(
        select(
            TransactionLog.tenant_id,
            func.sum(TransactionLog.credits_charged).label("total_credits"),
            func.count(TransactionLog.id).label("tx_count")
        )
        .where(TransactionLog.billing_period == current_period)
        .group_by(TransactionLog.tenant_id)
        .order_by(func.sum(TransactionLog.credits_charged).desc())
        .limit(10)
    ).all()

    top_tenants = []
    for row in top_tenants_query:
        tenant = session.get(Tenant, row[0])
        if tenant:
            top_tenants.append({
                "tenant_id": row[0],
                "tenant_name": tenant.name,
                "credits": Decimal(str(row[1])),
                "transactions": row[2],
            })

    # Growth calculation (simplified - compare with last month)
    # For now, return 0 if no historical data
    growth_percent = Decimal("0")

    return BillingDashboardResponse(
        total_mrr=total_mrr,
        total_this_month=Decimal(str(revenue_this_month)),
        total_overdue=Decimal(str(overdue_amount)),
        growth_percent=growth_percent,
        total_tenants=total_tenants,
        active_subscriptions=active_count,
        trial_subscriptions=trial_count,
        churned_this_month=churned_count,
        total_credits_this_month=total_credits,
        total_transactions_this_month=total_transactions,
        pending_alerts=pending_alerts,
        top_tenants_by_usage=top_tenants,
    )


# ==================== TENANTS BILLING ====================

@router.get("/tenants", response_model=list[TenantBillingInfo])
def list_tenant_billing(
    session: Session = Depends(get_session),
    _: dict = Depends(require_super_admin),
    status_filter: Optional[str] = Query(None, description="Filter by subscription status"),
    plan_filter: Optional[str] = Query(None, description="Filter by plan code"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """List all tenants with their billing info (including Activity Logs usage)"""
    # Get all active tenants
    query = select(Tenant).where(Tenant.is_active == True)
    tenants = session.exec(query.offset(skip).limit(limit)).all()

    # Get current month date range
    now = datetime.utcnow()
    start_of_month = datetime(now.year, now.month, 1)
    if now.month == 12:
        end_of_month = datetime(now.year + 1, 1, 1)
    else:
        end_of_month = datetime(now.year, now.month + 1, 1)

    # Get activity usage per tenant for current month
    activity_usage_query = select(
        ActivityLog.tenant_id,
        func.count(ActivityLog.id).label("total_actions"),
        func.coalesce(func.sum(ActivityLog.cost_tokens), 0).label("total_tokens")
    ).where(
        and_(
            ActivityLog.created_at >= start_of_month,
            ActivityLog.created_at < end_of_month,
            ActivityLog.success == True
        )
    ).group_by(ActivityLog.tenant_id)

    activity_usage = {
        str(row[0]): {"actions": row[1], "tokens": int(row[2] or 0)}
        for row in session.exec(activity_usage_query).all()
    }

    # Token pricing config
    TOKEN_PRICE_VND = 10
    MIN_CHARGE_VND = 50000

    result = []
    for tenant in tenants:
        tenant_id_str = str(tenant.id)

        # Get subscription
        subscription = session.exec(
            select(TenantSubscription)
            .where(TenantSubscription.tenant_id == tenant_id_str)
            .order_by(TenantSubscription.created_at.desc())
        ).first()

        plan = None
        if subscription:
            plan = session.get(BillingPlan, subscription.plan_id)

            # Apply filters
            if status_filter and subscription.status != status_filter:
                continue
            if plan_filter and plan and plan.code != plan_filter:
                continue

        # Get activity usage for this tenant
        tenant_activity = activity_usage.get(tenant_id_str, {"actions": 0, "tokens": 0})
        activity_tokens = tenant_activity["tokens"]

        # Use activity tokens as credits_used
        credits_used = Decimal(str(activity_tokens))
        credits_limit = subscription.credits_limit if subscription else 0
        usage_percent = (credits_used / credits_limit * 100) if credits_limit > 0 else Decimal("0")

        # Calculate amount due from activity tokens
        token_cost = activity_tokens * TOKEN_PRICE_VND
        amount_due = Decimal(str(max(token_cost, MIN_CHARGE_VND) if activity_tokens > 0 else 0))

        result.append(TenantBillingInfo(
            tenant_id=tenant_id_str,
            tenant_name=tenant.name,
            tenant_code=tenant.code,
            plan_code=plan.code if plan else None,
            plan_name=plan.name if plan else None,
            subscription_status=subscription.status if subscription else None,
            billing_cycle=subscription.billing_cycle if subscription else None,
            credits_used=credits_used,
            credits_limit=credits_limit,
            usage_percent=usage_percent.quantize(Decimal("0.1")) if credits_limit > 0 else Decimal("0"),
            overage_credits=subscription.overage_credits if subscription else Decimal("0"),
            is_in_grace=subscription.is_in_grace if subscription else False,
            next_billing_date=subscription.next_billing_date if subscription else None,
            amount_due=amount_due,
        ))

    return result


@router.get("/tenants/{tenant_id}/usage", response_model=UsageBreakdownResponse)
def get_tenant_usage(
    tenant_id: str,
    session: Session = Depends(get_session),
    _: dict = Depends(require_super_admin),
    billing_period: Optional[str] = Query(None, description="Period YYYY-MM (default: current)"),
):
    """Get detailed usage breakdown for a tenant"""
    tenant = session.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    period = billing_period or get_current_billing_period()

    # Get usage breakdown
    breakdown = get_usage_breakdown(session, tenant_id, period)

    # Calculate totals
    total_credits = sum(b["credits"] for b in breakdown)
    total_transactions = sum(b["count"] for b in breakdown)

    return UsageBreakdownResponse(
        tenant_id=tenant_id,
        tenant_name=tenant.name,
        billing_period=period,
        total_credits=total_credits,
        total_transactions=total_transactions,
        breakdown=breakdown,
    )


# ==================== BILLING PLANS ====================

@router.get("/plans", response_model=list[dict])
def list_plans(
    session: Session = Depends(get_session),
    _: dict = Depends(require_super_admin),
    include_inactive: bool = Query(False),
):
    """List all billing plans"""
    query = select(BillingPlan)
    if not include_inactive:
        query = query.where(BillingPlan.is_active == True)
    query = query.order_by(BillingPlan.sort_order)

    plans = session.exec(query).all()
    return [
        {
            "id": str(p.id),
            "code": p.code,
            "name": p.name,
            "description": p.description,
            "price_per_month": p.price_per_month,
            "price_per_year": p.price_per_year,
            "monthly_credits": p.monthly_credits,
            "overage_discount": p.overage_discount,
            "grace_percent": p.grace_percent,
            "max_users": p.max_users,
            "max_storage_gb": p.max_storage_gb,
            "features": json.loads(p.features_json) if p.features_json else {},
            "is_public": p.is_public,
            "is_active": p.is_active,
            "sort_order": p.sort_order,
        }
        for p in plans
    ]


@router.post("/plans", response_model=dict, status_code=201)
def create_plan(
    data: PlanCreate,
    session: Session = Depends(get_session),
    _: dict = Depends(require_super_admin),
):
    """Create a new billing plan"""
    # Check if code exists
    existing = session.exec(
        select(BillingPlan).where(BillingPlan.code == data.code)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Plan code '{data.code}' already exists")

    plan = BillingPlan(
        code=data.code,
        name=data.name,
        description=data.description,
        price_per_month=data.price_per_month,
        price_per_year=data.price_per_year or data.price_per_month * 10,
        monthly_credits=data.monthly_credits,
        overage_discount=data.overage_discount,
        grace_percent=data.grace_percent,
        max_users=data.max_users,
        max_storage_gb=data.max_storage_gb,
        features_json=json.dumps(data.features),
        is_public=data.is_public,
        sort_order=data.sort_order,
        is_active=True,
    )
    session.add(plan)
    session.commit()
    session.refresh(plan)

    return {"id": str(plan.id), "code": plan.code, "message": "Plan created successfully"}


@router.put("/plans/{plan_id}", response_model=dict)
def update_plan(
    plan_id: str,
    data: PlanUpdate,
    session: Session = Depends(get_session),
    _: dict = Depends(require_super_admin),
):
    """Update a billing plan"""
    plan = session.get(BillingPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    # Update fields
    if data.name is not None:
        plan.name = data.name
    if data.description is not None:
        plan.description = data.description
    if data.price_per_month is not None:
        plan.price_per_month = data.price_per_month
    if data.price_per_year is not None:
        plan.price_per_year = data.price_per_year
    if data.monthly_credits is not None:
        plan.monthly_credits = data.monthly_credits
    if data.overage_discount is not None:
        plan.overage_discount = data.overage_discount
    if data.grace_percent is not None:
        plan.grace_percent = data.grace_percent
    if data.max_users is not None:
        plan.max_users = data.max_users
    if data.max_storage_gb is not None:
        plan.max_storage_gb = data.max_storage_gb
    if data.features is not None:
        plan.features_json = json.dumps(data.features)
    if data.is_public is not None:
        plan.is_public = data.is_public
    if data.is_active is not None:
        plan.is_active = data.is_active
    if data.sort_order is not None:
        plan.sort_order = data.sort_order

    session.add(plan)
    session.commit()

    return {"id": str(plan.id), "message": "Plan updated successfully"}


# ==================== TRANSACTION TYPES ====================

@router.get("/transaction-types", response_model=list[dict])
def list_transaction_types(
    session: Session = Depends(get_session),
    _: dict = Depends(require_super_admin),
):
    """List all transaction types"""
    tx_types = session.exec(
        select(TransactionType).order_by(TransactionType.sort_order)
    ).all()

    return [
        {
            "id": str(t.id),
            "code": t.code,
            "name": t.name,
            "description": t.description,
            "tier": t.tier,
            "unit_price": t.unit_price,
            "document_types": json.loads(t.document_types_json) if t.document_types_json else [],
            "has_file_upload": t.has_file_upload,
            "has_ai_processing": t.has_ai_processing,
            "complexity_score": t.complexity_score,
            "is_active": t.is_active,
        }
        for t in tx_types
    ]


# ==================== SUBSCRIPTIONS ====================

@router.post("/subscriptions", response_model=dict, status_code=201)
def create_subscription(
    data: SubscriptionCreate,
    session: Session = Depends(get_session),
    _: dict = Depends(require_super_admin),
):
    """Create a subscription for a tenant"""
    # Validate tenant
    tenant = session.get(Tenant, data.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Validate plan
    plan = session.get(BillingPlan, data.plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    # Check for existing active subscription
    existing = session.exec(
        select(TenantSubscription)
        .where(TenantSubscription.tenant_id == data.tenant_id)
        .where(TenantSubscription.status.in_([
            SubscriptionStatus.ACTIVE.value,
            SubscriptionStatus.TRIAL.value,
        ]))
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Tenant already has an active subscription"
        )

    now = datetime.utcnow()
    period_end = now + timedelta(days=30 if data.billing_cycle == BillingCycle.MONTHLY.value else 365)

    # Determine status
    status = SubscriptionStatus.ACTIVE.value
    trial_ends = None
    if data.trial_days and data.trial_days > 0:
        status = SubscriptionStatus.TRIAL.value
        trial_ends = now + timedelta(days=data.trial_days)

    subscription = TenantSubscription(
        tenant_id=data.tenant_id,
        plan_id=data.plan_id,
        billing_cycle=data.billing_cycle,
        current_period_start=now,
        current_period_end=period_end,
        status=status,
        credits_used=Decimal("0"),
        credits_limit=plan.monthly_credits,
        overage_credits=Decimal("0"),
        trial_ends_at=trial_ends,
        auto_renew=True,
        next_billing_date=period_end,
        is_in_grace=False,
    )
    session.add(subscription)
    session.commit()
    session.refresh(subscription)

    return {
        "id": str(subscription.id),
        "tenant_id": data.tenant_id,
        "plan_code": plan.code,
        "status": status,
        "message": "Subscription created successfully"
    }


@router.put("/subscriptions/{subscription_id}", response_model=dict)
def update_subscription(
    subscription_id: str,
    data: SubscriptionUpdate,
    session: Session = Depends(get_session),
    _: dict = Depends(require_super_admin),
):
    """Update a subscription"""
    subscription = session.get(TenantSubscription, subscription_id)
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")

    if data.plan_id is not None:
        plan = session.get(BillingPlan, data.plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")
        subscription.plan_id = data.plan_id
        subscription.credits_limit = plan.monthly_credits

    if data.status is not None:
        subscription.status = data.status

    if data.billing_cycle is not None:
        subscription.billing_cycle = data.billing_cycle

    if data.auto_renew is not None:
        subscription.auto_renew = data.auto_renew

    session.add(subscription)
    session.commit()

    return {"id": str(subscription.id), "message": "Subscription updated successfully"}


# ==================== INVOICES ====================

@router.get("/invoices", response_model=list[dict])
def list_invoices(
    session: Session = Depends(get_session),
    _: dict = Depends(require_super_admin),
    tenant_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    billing_period: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """List invoices"""
    query = select(BillingInvoice)

    if tenant_id:
        query = query.where(BillingInvoice.tenant_id == tenant_id)
    if status_filter:
        query = query.where(BillingInvoice.status == status_filter)
    if billing_period:
        query = query.where(BillingInvoice.billing_period == billing_period)

    query = query.order_by(BillingInvoice.created_at.desc())
    invoices = session.exec(query.offset(skip).limit(limit)).all()

    result = []
    for inv in invoices:
        tenant = session.get(Tenant, inv.tenant_id)
        result.append({
            "id": str(inv.id),
            "invoice_number": inv.invoice_number,
            "tenant_id": inv.tenant_id,
            "tenant_name": tenant.name if tenant else None,
            "billing_period": inv.billing_period,
            "invoice_date": inv.invoice_date.isoformat() if inv.invoice_date else None,
            "due_date": inv.due_date.isoformat() if inv.due_date else None,
            "base_amount": inv.base_amount,
            "overage_amount": inv.overage_amount,
            "tax_amount": inv.tax_amount,
            "total_amount": inv.total_amount,
            "paid_amount": inv.paid_amount,
            "status": inv.status,
            "paid_at": inv.paid_at.isoformat() if inv.paid_at else None,
        })

    return result


@router.put("/invoices/{invoice_id}/pay", response_model=dict)
def mark_invoice_paid(
    invoice_id: str,
    session: Session = Depends(get_session),
    _: dict = Depends(require_super_admin),
    amount: Decimal = Query(..., description="Amount paid"),
    payment_method: str = Query("BANK_TRANSFER", description="Payment method"),
    payment_reference: Optional[str] = Query(None, description="Payment reference"),
):
    """Mark invoice as paid (manual payment recording)"""
    invoice = session.get(BillingInvoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    invoice.paid_amount = amount
    invoice.paid_at = datetime.utcnow()
    invoice.payment_method = payment_method
    invoice.payment_reference = payment_reference

    if amount >= invoice.total_amount:
        invoice.status = InvoiceStatus.PAID.value
    else:
        invoice.status = InvoiceStatus.PARTIAL.value

    session.add(invoice)
    session.commit()

    return {"id": str(invoice.id), "status": invoice.status, "message": "Payment recorded"}


# ==================== ALERTS ====================

@router.get("/alerts", response_model=list[dict])
def list_alerts(
    session: Session = Depends(get_session),
    _: dict = Depends(require_super_admin),
    acknowledged: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """List usage alerts"""
    query = select(UsageAlert)

    if acknowledged is not None:
        if acknowledged:
            query = query.where(UsageAlert.acknowledged_at != None)
        else:
            query = query.where(UsageAlert.acknowledged_at == None)

    query = query.order_by(UsageAlert.created_at.desc())
    alerts = session.exec(query.offset(skip).limit(limit)).all()

    result = []
    for alert in alerts:
        tenant = session.get(Tenant, alert.tenant_id)
        result.append({
            "id": str(alert.id),
            "tenant_id": alert.tenant_id,
            "tenant_name": tenant.name if tenant else None,
            "alert_type": alert.alert_type,
            "alert_threshold": alert.alert_threshold,
            "triggered_at": alert.triggered_at.isoformat() if alert.triggered_at else None,
            "acknowledged_at": alert.acknowledged_at.isoformat() if alert.acknowledged_at else None,
            "acknowledged_by": alert.acknowledged_by,
            "email_sent": alert.email_sent,
        })

    return result


@router.put("/alerts/{alert_id}/acknowledge", response_model=dict)
def acknowledge_alert(
    alert_id: str,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_super_admin),
):
    """Acknowledge an alert"""
    alert = session.get(UsageAlert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.acknowledged_at = datetime.utcnow()
    alert.acknowledged_by = current_user.get("sub")
    session.add(alert)
    session.commit()

    return {"id": str(alert.id), "message": "Alert acknowledged"}


# ==================== UTILITIES ====================

@router.post("/seed-data", response_model=dict)
def seed_billing_data_endpoint(
    session: Session = Depends(get_session),
    _: dict = Depends(require_super_admin),
):
    """Seed default billing data (transaction types and plans)"""
    result = seed_billing_data(session)
    return {
        "message": "Billing data seeded successfully",
        "transaction_types": result["transaction_types"],
        "billing_plans": result["billing_plans"],
    }


@router.post("/estimate", response_model=dict)
def estimate_cost(
    session: Session = Depends(get_session),
    _: dict = Depends(require_super_admin),
    plan_code: str = Query(..., description="Plan code"),
    estimated_transactions: dict = None,
):
    """Estimate monthly cost for a plan with given transaction counts"""
    if not estimated_transactions:
        estimated_transactions = {}

    result = estimate_monthly_cost(session, plan_code, estimated_transactions)
    return result
