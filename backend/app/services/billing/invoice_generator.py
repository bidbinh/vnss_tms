"""
Invoice Generator Service
Tự động tạo hóa đơn hàng tháng cho các tenants
"""
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional
from sqlmodel import Session, select, func

from app.models.billing import (
    TenantSubscription,
    BillingPlan,
    BillingInvoice,
    BillingInvoiceLine,
    TransactionLog,
    SubscriptionStatus,
    InvoiceStatus,
)
from app.models.tenant import Tenant
from app.services.billing.credit_calculator import get_usage_breakdown


def get_next_invoice_number(session: Session) -> str:
    """Generate next invoice number: INV-YYYY-NNNNNN"""
    year = datetime.utcnow().year
    prefix = f"INV-{year}-"

    # Find max invoice number for this year
    last_invoice = session.exec(
        select(BillingInvoice)
        .where(BillingInvoice.invoice_number.like(f"{prefix}%"))
        .order_by(BillingInvoice.invoice_number.desc())
    ).first()

    if last_invoice:
        # Extract the number part and increment
        last_num = int(last_invoice.invoice_number.split("-")[-1])
        next_num = last_num + 1
    else:
        next_num = 1

    return f"{prefix}{next_num:06d}"


def calculate_invoice_for_subscription(
    session: Session,
    subscription: TenantSubscription,
    billing_period: str,
) -> dict:
    """
    Calculate invoice amounts for a subscription.

    Args:
        session: Database session
        subscription: The subscription to calculate for
        billing_period: Period string "YYYY-MM"

    Returns:
        dict with invoice calculation details
    """
    plan = session.get(BillingPlan, subscription.plan_id)
    if not plan:
        return {"error": "Plan not found"}

    # Get usage breakdown by transaction type
    breakdown = get_usage_breakdown(session, subscription.tenant_id, billing_period)

    # Calculate totals
    total_credits = sum(b["credits"] for b in breakdown)
    total_transactions = sum(b["count"] for b in breakdown)
    included_credits = Decimal(str(plan.monthly_credits))

    # Base amount (monthly fee)
    base_amount = plan.price_per_month

    # Calculate overage
    overage_credits = max(Decimal("0"), total_credits - included_credits) if included_credits > 0 else Decimal("0")

    # Apply overage discount
    discount_percent = plan.overage_discount / Decimal("100")
    overage_amount = overage_credits * (Decimal("1") - discount_percent)

    # Subtotal
    subtotal = base_amount + overage_amount

    # Tax (VAT 10%)
    tax_rate = Decimal("0.1")
    tax_amount = subtotal * tax_rate

    # Total
    total_amount = subtotal + tax_amount

    return {
        "plan_code": plan.code,
        "plan_name": plan.name,
        "base_amount": base_amount,
        "usage_breakdown": breakdown,
        "total_credits_used": total_credits,
        "total_transactions": total_transactions,
        "included_credits": included_credits,
        "overage_credits": overage_credits,
        "overage_discount_percent": plan.overage_discount,
        "overage_amount": overage_amount,
        "subtotal": subtotal,
        "tax_rate": tax_rate * 100,
        "tax_amount": tax_amount,
        "total_amount": total_amount,
    }


def generate_invoice_for_subscription(
    session: Session,
    subscription: TenantSubscription,
    billing_period: str,
    due_days: int = 15,
) -> Optional[BillingInvoice]:
    """
    Generate an invoice for a subscription.

    Args:
        session: Database session
        subscription: The subscription
        billing_period: Period string "YYYY-MM"
        due_days: Days until invoice is due

    Returns:
        Created BillingInvoice or None if skipped
    """
    # Check if invoice already exists for this period
    existing = session.exec(
        select(BillingInvoice)
        .where(BillingInvoice.subscription_id == str(subscription.id))
        .where(BillingInvoice.billing_period == billing_period)
    ).first()

    if existing:
        return existing  # Don't create duplicate

    # Get tenant
    tenant = session.get(Tenant, subscription.tenant_id)
    if not tenant:
        return None

    # Calculate invoice
    calc = calculate_invoice_for_subscription(session, subscription, billing_period)
    if "error" in calc:
        return None

    # Skip if nothing to invoice (FREE plan with no overage)
    if calc["base_amount"] == 0 and calc["overage_amount"] == 0:
        return None

    # Parse billing period to get dates
    year, month = map(int, billing_period.split("-"))
    period_start = datetime(year, month, 1)
    if month == 12:
        period_end = datetime(year + 1, 1, 1) - timedelta(days=1)
    else:
        period_end = datetime(year, month + 1, 1) - timedelta(days=1)

    # Create invoice
    now = datetime.utcnow()
    invoice = BillingInvoice(
        tenant_id=subscription.tenant_id,
        subscription_id=str(subscription.id),
        invoice_number=get_next_invoice_number(session),
        invoice_date=now,
        due_date=now + timedelta(days=due_days),
        period_start=period_start,
        period_end=period_end,
        billing_period=billing_period,
        base_amount=calc["base_amount"],
        transactions_count=calc["total_transactions"],
        included_transactions=int(calc["included_credits"]),  # Using credits as proxy
        overage_transactions=int(calc["overage_credits"]),
        overage_amount=calc["overage_amount"],
        tax_amount=calc["tax_amount"],
        total_amount=calc["total_amount"],
        status=InvoiceStatus.SENT.value,
        paid_amount=Decimal("0"),
        notes=f"Invoice for {tenant.name} - {billing_period}",
    )
    session.add(invoice)

    # Create invoice lines for each transaction type with usage
    for breakdown in calc["usage_breakdown"]:
        if breakdown["count"] > 0:
            line = BillingInvoiceLine(
                invoice_id=str(invoice.id),
                description=f"{breakdown['transaction_type_name']} ({breakdown['count']} transactions)",
                quantity=breakdown["count"],
                unit_price=breakdown["credits"] / breakdown["count"] if breakdown["count"] > 0 else Decimal("0"),
                amount=breakdown["credits"],
            )
            session.add(line)

    session.commit()
    session.refresh(invoice)

    return invoice


def generate_monthly_invoices(
    session: Session,
    billing_period: Optional[str] = None,
) -> dict:
    """
    Generate invoices for all active subscriptions.

    Args:
        session: Database session
        billing_period: Period string "YYYY-MM" (default: previous month)

    Returns:
        dict with generation results
    """
    # Default to previous month
    if not billing_period:
        now = datetime.utcnow()
        if now.month == 1:
            billing_period = f"{now.year - 1}-12"
        else:
            billing_period = f"{now.year}-{now.month - 1:02d}"

    # Get all active/trial subscriptions
    subscriptions = session.exec(
        select(TenantSubscription)
        .where(TenantSubscription.status.in_([
            SubscriptionStatus.ACTIVE.value,
            SubscriptionStatus.TRIAL.value,
            SubscriptionStatus.PAST_DUE.value,
        ]))
    ).all()

    results = {
        "billing_period": billing_period,
        "total_subscriptions": len(subscriptions),
        "invoices_created": 0,
        "invoices_skipped": 0,
        "total_amount": Decimal("0"),
        "errors": [],
    }

    for subscription in subscriptions:
        try:
            invoice = generate_invoice_for_subscription(
                session, subscription, billing_period
            )
            if invoice:
                results["invoices_created"] += 1
                results["total_amount"] += invoice.total_amount
            else:
                results["invoices_skipped"] += 1
        except Exception as e:
            results["errors"].append({
                "subscription_id": str(subscription.id),
                "tenant_id": subscription.tenant_id,
                "error": str(e),
            })

    return results


def reset_subscription_usage(
    session: Session,
    subscription: TenantSubscription,
) -> None:
    """
    Reset subscription usage counters for new billing period.

    Args:
        session: Database session
        subscription: The subscription to reset
    """
    subscription.credits_used = Decimal("0")
    subscription.overage_credits = Decimal("0")
    subscription.is_in_grace = False

    # Update period dates
    now = datetime.utcnow()
    subscription.current_period_start = now
    if subscription.billing_cycle == "YEARLY":
        subscription.current_period_end = now + timedelta(days=365)
    else:
        subscription.current_period_end = now + timedelta(days=30)
    subscription.next_billing_date = subscription.current_period_end

    session.add(subscription)
    session.commit()


def process_end_of_month(session: Session) -> dict:
    """
    Process end-of-month billing tasks:
    1. Generate invoices for the ending month
    2. Reset usage counters for active subscriptions

    This should be called by a scheduled job on the 1st of each month.
    """
    now = datetime.utcnow()

    # Calculate previous month period
    if now.month == 1:
        billing_period = f"{now.year - 1}-12"
    else:
        billing_period = f"{now.year}-{now.month - 1:02d}"

    # Generate invoices
    invoice_results = generate_monthly_invoices(session, billing_period)

    # Reset usage for all active subscriptions
    subscriptions = session.exec(
        select(TenantSubscription)
        .where(TenantSubscription.status.in_([
            SubscriptionStatus.ACTIVE.value,
            SubscriptionStatus.TRIAL.value,
        ]))
    ).all()

    reset_count = 0
    for subscription in subscriptions:
        reset_subscription_usage(session, subscription)
        reset_count += 1

    return {
        "invoice_generation": invoice_results,
        "usage_reset_count": reset_count,
    }
