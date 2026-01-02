"""
Tenant Billing APIs
- View subscription & usage
- View invoices
- View payment history
- For Tenant Admins to track their own billing
"""
import json
from datetime import datetime
from decimal import Decimal
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlmodel import Session, select, func

from app.db.session import get_session
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.billing import (
    BillingPlan,
    TenantSubscription,
    TransactionLog,
    BillingInvoice,
    BillingInvoiceLine,
    PaymentTransaction,
    UsageAlert,
    SubscriptionStatus,
    InvoiceStatus,
)
from app.models.tenant import Tenant
from app.services.billing import (
    get_usage_breakdown,
    get_current_billing_period,
)

router = APIRouter(prefix="/billing", tags=["Tenant Billing"])


# ==================== AUTH DEPENDENCY ====================

def require_tenant_admin(user: User = Depends(get_current_user)):
    """Require ADMIN role within tenant"""
    if user.role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Tenant Admin can access billing information"
        )
    return user


# ==================== SCHEMAS ====================

class TenantSubscriptionResponse(BaseModel):
    id: str
    plan_code: str
    plan_name: str
    plan_description: Optional[str]

    # Pricing
    price_per_month: Decimal
    price_per_year: Decimal

    # Period
    billing_cycle: str
    current_period_start: datetime
    current_period_end: datetime

    # Status
    status: str
    trial_ends_at: Optional[datetime]

    # Usage
    credits_used: Decimal
    credits_limit: int
    overage_credits: Decimal
    usage_percent: float

    # Grace period
    is_in_grace: bool
    blocked_at: Optional[datetime]

    # Renewal
    auto_renew: bool
    next_billing_date: Optional[datetime]


class UsageBreakdownItem(BaseModel):
    transaction_type_code: str
    transaction_type_name: str
    count: int
    credits: Decimal
    unit_price: Decimal


class TenantUsageSummary(BaseModel):
    billing_period: str
    total_credits_used: Decimal
    credits_limit: int
    usage_percent: float
    overage_credits: Decimal
    estimated_overage_cost: Decimal
    breakdown: List[UsageBreakdownItem]


class InvoiceResponse(BaseModel):
    id: str
    invoice_number: str
    invoice_date: datetime
    due_date: datetime
    billing_period: str

    # Amounts
    base_amount: Decimal
    overage_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal

    # Status
    status: str
    paid_amount: Decimal
    paid_at: Optional[datetime]

    # Details
    transactions_count: int
    included_transactions: int
    overage_transactions: int


class InvoiceDetailResponse(InvoiceResponse):
    lines: List[dict]
    notes: Optional[str]


class PaymentHistoryItem(BaseModel):
    id: str
    amount: Decimal
    currency: str
    payment_method: str
    status: str
    created_at: datetime
    paid_at: Optional[datetime]
    invoice_number: Optional[str]


class AlertResponse(BaseModel):
    id: str
    alert_type: str
    message: Optional[str]
    triggered_at: datetime
    acknowledged_at: Optional[datetime]


class BillingOverviewResponse(BaseModel):
    # Subscription info
    has_subscription: bool
    subscription: Optional[TenantSubscriptionResponse]

    # Current usage
    current_usage: Optional[TenantUsageSummary]

    # Recent invoices
    recent_invoices: List[InvoiceResponse]

    # Pending amount
    total_pending: Decimal
    total_overdue: Decimal

    # Alerts
    active_alerts: List[AlertResponse]


# ==================== ENDPOINTS ====================

@router.get("/overview", response_model=BillingOverviewResponse)
def get_billing_overview(
    user: User = Depends(require_tenant_admin),
    session: Session = Depends(get_session),
):
    """
    Get billing overview for current tenant.
    Includes subscription, current usage, recent invoices, and alerts.
    """
    tenant_id = user.tenant_id

    # Get subscription
    subscription = session.exec(
        select(TenantSubscription)
        .where(TenantSubscription.tenant_id == tenant_id)
        .where(TenantSubscription.status.in_([
            SubscriptionStatus.ACTIVE.value,
            SubscriptionStatus.TRIAL.value,
            SubscriptionStatus.PAST_DUE.value,
        ]))
    ).first()

    subscription_response = None
    current_usage = None

    if subscription:
        # Get plan
        plan = session.get(BillingPlan, subscription.plan_id)

        # Calculate usage percent
        usage_percent = 0.0
        if subscription.credits_limit > 0:
            usage_percent = float(subscription.credits_used) / subscription.credits_limit * 100

        subscription_response = TenantSubscriptionResponse(
            id=str(subscription.id),
            plan_code=plan.code if plan else "UNKNOWN",
            plan_name=plan.name if plan else "Unknown Plan",
            plan_description=plan.description if plan else None,
            price_per_month=plan.price_per_month if plan else Decimal("0"),
            price_per_year=plan.price_per_year if plan else Decimal("0"),
            billing_cycle=subscription.billing_cycle,
            current_period_start=subscription.current_period_start,
            current_period_end=subscription.current_period_end,
            status=subscription.status,
            trial_ends_at=subscription.trial_ends_at,
            credits_used=subscription.credits_used,
            credits_limit=subscription.credits_limit,
            overage_credits=subscription.overage_credits,
            usage_percent=usage_percent,
            is_in_grace=subscription.is_in_grace,
            blocked_at=subscription.blocked_at,
            auto_renew=subscription.auto_renew,
            next_billing_date=subscription.next_billing_date,
        )

        # Get current usage breakdown
        billing_period = get_current_billing_period()
        breakdown = get_usage_breakdown(session, tenant_id, billing_period)

        total_credits = sum(Decimal(str(b["credits"])) for b in breakdown)
        overage = max(Decimal("0"), total_credits - subscription.credits_limit) if subscription.credits_limit > 0 else Decimal("0")

        # Estimate overage cost (with discount if applicable)
        overage_discount = plan.overage_discount if plan else Decimal("0")
        estimated_overage = overage * (Decimal("1") - overage_discount / Decimal("100"))

        current_usage = TenantUsageSummary(
            billing_period=billing_period,
            total_credits_used=total_credits,
            credits_limit=subscription.credits_limit,
            usage_percent=usage_percent,
            overage_credits=overage,
            estimated_overage_cost=estimated_overage,
            breakdown=[
                UsageBreakdownItem(
                    transaction_type_code=b["transaction_type_code"],
                    transaction_type_name=b["transaction_type_name"],
                    count=b["count"],
                    credits=Decimal(str(b["credits"])),
                    unit_price=Decimal(str(b.get("unit_price", 0))),
                )
                for b in breakdown
            ],
        )

    # Get recent invoices
    invoices = session.exec(
        select(BillingInvoice)
        .where(BillingInvoice.tenant_id == tenant_id)
        .order_by(BillingInvoice.invoice_date.desc())
        .limit(5)
    ).all()

    recent_invoices = [
        InvoiceResponse(
            id=str(inv.id),
            invoice_number=inv.invoice_number,
            invoice_date=inv.invoice_date,
            due_date=inv.due_date,
            billing_period=inv.billing_period,
            base_amount=inv.base_amount,
            overage_amount=inv.overage_amount,
            tax_amount=inv.tax_amount,
            total_amount=inv.total_amount,
            status=inv.status,
            paid_amount=inv.paid_amount,
            paid_at=inv.paid_at,
            transactions_count=inv.transactions_count,
            included_transactions=inv.included_transactions,
            overage_transactions=inv.overage_transactions,
        )
        for inv in invoices
    ]

    # Calculate pending/overdue amounts
    pending_invoices = session.exec(
        select(BillingInvoice)
        .where(BillingInvoice.tenant_id == tenant_id)
        .where(BillingInvoice.status.in_([
            InvoiceStatus.SENT.value,
            InvoiceStatus.PARTIAL.value,
        ]))
    ).all()

    total_pending = sum(inv.total_amount - inv.paid_amount for inv in pending_invoices)

    overdue_invoices = session.exec(
        select(BillingInvoice)
        .where(BillingInvoice.tenant_id == tenant_id)
        .where(BillingInvoice.status == InvoiceStatus.OVERDUE.value)
    ).all()

    total_overdue = sum(inv.total_amount - inv.paid_amount for inv in overdue_invoices)

    # Get active alerts
    alerts = session.exec(
        select(UsageAlert)
        .where(UsageAlert.tenant_id == tenant_id)
        .where(UsageAlert.acknowledged_at == None)
        .order_by(UsageAlert.triggered_at.desc())
        .limit(10)
    ).all()

    active_alerts = [
        AlertResponse(
            id=str(alert.id),
            alert_type=alert.alert_type,
            message=alert.message,
            triggered_at=alert.triggered_at,
            acknowledged_at=alert.acknowledged_at,
        )
        for alert in alerts
    ]

    return BillingOverviewResponse(
        has_subscription=subscription is not None,
        subscription=subscription_response,
        current_usage=current_usage,
        recent_invoices=recent_invoices,
        total_pending=total_pending,
        total_overdue=total_overdue,
        active_alerts=active_alerts,
    )


@router.get("/subscription", response_model=Optional[TenantSubscriptionResponse])
def get_subscription(
    user: User = Depends(require_tenant_admin),
    session: Session = Depends(get_session),
):
    """Get current subscription details"""
    subscription = session.exec(
        select(TenantSubscription)
        .where(TenantSubscription.tenant_id == user.tenant_id)
        .where(TenantSubscription.status.in_([
            SubscriptionStatus.ACTIVE.value,
            SubscriptionStatus.TRIAL.value,
            SubscriptionStatus.PAST_DUE.value,
        ]))
    ).first()

    if not subscription:
        return None

    plan = session.get(BillingPlan, subscription.plan_id)

    usage_percent = 0.0
    if subscription.credits_limit > 0:
        usage_percent = float(subscription.credits_used) / subscription.credits_limit * 100

    return TenantSubscriptionResponse(
        id=str(subscription.id),
        plan_code=plan.code if plan else "UNKNOWN",
        plan_name=plan.name if plan else "Unknown Plan",
        plan_description=plan.description if plan else None,
        price_per_month=plan.price_per_month if plan else Decimal("0"),
        price_per_year=plan.price_per_year if plan else Decimal("0"),
        billing_cycle=subscription.billing_cycle,
        current_period_start=subscription.current_period_start,
        current_period_end=subscription.current_period_end,
        status=subscription.status,
        trial_ends_at=subscription.trial_ends_at,
        credits_used=subscription.credits_used,
        credits_limit=subscription.credits_limit,
        overage_credits=subscription.overage_credits,
        usage_percent=usage_percent,
        is_in_grace=subscription.is_in_grace,
        blocked_at=subscription.blocked_at,
        auto_renew=subscription.auto_renew,
        next_billing_date=subscription.next_billing_date,
    )


@router.get("/usage", response_model=TenantUsageSummary)
def get_usage(
    billing_period: Optional[str] = Query(None, description="Billing period YYYY-MM"),
    user: User = Depends(require_tenant_admin),
    session: Session = Depends(get_session),
):
    """Get usage breakdown for a billing period"""
    if not billing_period:
        billing_period = get_current_billing_period()

    # Get subscription
    subscription = session.exec(
        select(TenantSubscription)
        .where(TenantSubscription.tenant_id == user.tenant_id)
    ).first()

    credits_limit = subscription.credits_limit if subscription else 0

    # Get plan for discount info
    plan = session.get(BillingPlan, subscription.plan_id) if subscription else None
    overage_discount = plan.overage_discount if plan else Decimal("0")

    # Get breakdown
    breakdown = get_usage_breakdown(session, user.tenant_id, billing_period)

    total_credits = sum(Decimal(str(b["credits"])) for b in breakdown)

    usage_percent = 0.0
    if credits_limit > 0:
        usage_percent = float(total_credits) / credits_limit * 100

    overage = max(Decimal("0"), total_credits - credits_limit) if credits_limit > 0 else Decimal("0")
    estimated_overage = overage * (Decimal("1") - overage_discount / Decimal("100"))

    return TenantUsageSummary(
        billing_period=billing_period,
        total_credits_used=total_credits,
        credits_limit=credits_limit,
        usage_percent=usage_percent,
        overage_credits=overage,
        estimated_overage_cost=estimated_overage,
        breakdown=[
            UsageBreakdownItem(
                transaction_type_code=b["transaction_type_code"],
                transaction_type_name=b["transaction_type_name"],
                count=b["count"],
                credits=Decimal(str(b["credits"])),
                unit_price=Decimal(str(b.get("unit_price", 0))),
            )
            for b in breakdown
        ],
    )


@router.get("/invoices", response_model=List[InvoiceResponse])
def get_invoices(
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: User = Depends(require_tenant_admin),
    session: Session = Depends(get_session),
):
    """Get invoices for current tenant"""
    query = select(BillingInvoice).where(BillingInvoice.tenant_id == user.tenant_id)

    if status:
        query = query.where(BillingInvoice.status == status)

    query = query.order_by(BillingInvoice.invoice_date.desc()).offset(offset).limit(limit)

    invoices = session.exec(query).all()

    return [
        InvoiceResponse(
            id=str(inv.id),
            invoice_number=inv.invoice_number,
            invoice_date=inv.invoice_date,
            due_date=inv.due_date,
            billing_period=inv.billing_period,
            base_amount=inv.base_amount,
            overage_amount=inv.overage_amount,
            tax_amount=inv.tax_amount,
            total_amount=inv.total_amount,
            status=inv.status,
            paid_amount=inv.paid_amount,
            paid_at=inv.paid_at,
            transactions_count=inv.transactions_count,
            included_transactions=inv.included_transactions,
            overage_transactions=inv.overage_transactions,
        )
        for inv in invoices
    ]


@router.get("/invoices/{invoice_id}", response_model=InvoiceDetailResponse)
def get_invoice_detail(
    invoice_id: str,
    user: User = Depends(require_tenant_admin),
    session: Session = Depends(get_session),
):
    """Get invoice detail with line items"""
    invoice = session.exec(
        select(BillingInvoice)
        .where(BillingInvoice.id == invoice_id)
        .where(BillingInvoice.tenant_id == user.tenant_id)
    ).first()

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )

    # Get invoice lines
    lines = session.exec(
        select(BillingInvoiceLine)
        .where(BillingInvoiceLine.invoice_id == invoice_id)
        .order_by(BillingInvoiceLine.line_number)
    ).all()

    return InvoiceDetailResponse(
        id=str(invoice.id),
        invoice_number=invoice.invoice_number,
        invoice_date=invoice.invoice_date,
        due_date=invoice.due_date,
        billing_period=invoice.billing_period,
        base_amount=invoice.base_amount,
        overage_amount=invoice.overage_amount,
        tax_amount=invoice.tax_amount,
        total_amount=invoice.total_amount,
        status=invoice.status,
        paid_amount=invoice.paid_amount,
        paid_at=invoice.paid_at,
        transactions_count=invoice.transactions_count,
        included_transactions=invoice.included_transactions,
        overage_transactions=invoice.overage_transactions,
        lines=[
            {
                "line_number": line.line_number,
                "description": line.description,
                "quantity": line.quantity,
                "unit_price": str(line.unit_price),
                "amount": str(line.amount),
                "discount_amount": str(line.discount_amount),
                "line_total": str(line.line_total),
            }
            for line in lines
        ],
        notes=invoice.notes,
    )


@router.get("/payments", response_model=List[PaymentHistoryItem])
def get_payment_history(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: User = Depends(require_tenant_admin),
    session: Session = Depends(get_session),
):
    """Get payment history for current tenant"""
    payments = session.exec(
        select(PaymentTransaction)
        .where(PaymentTransaction.tenant_id == user.tenant_id)
        .order_by(PaymentTransaction.created_at.desc())
        .offset(offset)
        .limit(limit)
    ).all()

    result = []
    for payment in payments:
        # Get invoice number if linked
        invoice_number = None
        if payment.invoice_id:
            invoice = session.get(BillingInvoice, payment.invoice_id)
            if invoice:
                invoice_number = invoice.invoice_number

        result.append(PaymentHistoryItem(
            id=str(payment.id),
            amount=payment.amount,
            currency=payment.currency,
            payment_method=payment.payment_method,
            status=payment.status,
            created_at=payment.created_at,
            paid_at=payment.paid_at,
            invoice_number=invoice_number,
        ))

    return result


@router.put("/alerts/{alert_id}/acknowledge")
def acknowledge_alert(
    alert_id: str,
    user: User = Depends(require_tenant_admin),
    session: Session = Depends(get_session),
):
    """Acknowledge a billing alert"""
    alert = session.exec(
        select(UsageAlert)
        .where(UsageAlert.id == alert_id)
        .where(UsageAlert.tenant_id == user.tenant_id)
    ).first()

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )

    alert.acknowledged_at = datetime.utcnow()
    alert.acknowledged_by = str(user.id)
    session.add(alert)
    session.commit()

    return {"message": "Alert acknowledged"}


@router.get("/plans", response_model=List[dict])
def get_available_plans(
    session: Session = Depends(get_session),
):
    """Get all available billing plans (public endpoint for plan comparison)"""
    plans = session.exec(
        select(BillingPlan)
        .where(BillingPlan.is_active == True)
        .where(BillingPlan.is_public == True)
        .order_by(BillingPlan.sort_order)
    ).all()

    return [
        {
            "id": str(plan.id),
            "code": plan.code,
            "name": plan.name,
            "description": plan.description,
            "price_per_month": str(plan.price_per_month),
            "price_per_year": str(plan.price_per_year),
            "monthly_credits": plan.monthly_credits,
            "overage_discount": str(plan.overage_discount),
            "grace_percent": plan.grace_percent,
            "max_users": plan.max_users,
            "max_storage_gb": str(plan.max_storage_gb),
            "features": json.loads(plan.features_json) if plan.features_json else {},
        }
        for plan in plans
    ]
