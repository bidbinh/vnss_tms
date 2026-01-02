"""
Billing Alert Service
Tạo và quản lý cảnh báo usage, quota, payment
"""
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional
from sqlmodel import Session, select

from app.models.billing import (
    TenantSubscription,
    BillingPlan,
    BillingInvoice,
    UsageAlert,
    SubscriptionStatus,
    InvoiceStatus,
    AlertType,
)
from app.models.tenant import Tenant


# Alert configuration
ALERT_RULES = [
    {
        "type": AlertType.QUOTA_80,
        "threshold": 80,
        "message": "Đã sử dụng 80% quota tháng này",
    },
    {
        "type": AlertType.QUOTA_100,
        "threshold": 100,
        "message": "Đã hết quota! Phí vượt gói sẽ được tính.",
    },
    {
        "type": AlertType.TRIAL_ENDING,
        "days": 7,
        "message": "Thời gian dùng thử còn 7 ngày",
    },
    {
        "type": AlertType.TRIAL_ENDING,
        "days": 1,
        "message": "Thời gian dùng thử còn 1 ngày",
    },
    {
        "type": AlertType.PAYMENT_OVERDUE,
        "days": 7,
        "message": "Hóa đơn đã quá hạn 7 ngày",
    },
    {
        "type": AlertType.PAYMENT_OVERDUE,
        "days": 30,
        "message": "Hóa đơn quá hạn 30 ngày - tài khoản sẽ bị suspend",
    },
]


def check_quota_alerts(
    session: Session,
    subscription: TenantSubscription,
) -> list[UsageAlert]:
    """
    Check and create quota-based alerts for a subscription.

    Args:
        session: Database session
        subscription: The subscription to check

    Returns:
        List of created alerts
    """
    plan = session.get(BillingPlan, subscription.plan_id)
    if not plan or plan.monthly_credits == 0:
        return []  # Unlimited plan, no quota alerts

    credits_limit = Decimal(str(subscription.credits_limit or plan.monthly_credits))
    usage_percent = (subscription.credits_used / credits_limit * 100) if credits_limit > 0 else 0

    created_alerts = []

    # Check 80% threshold
    if usage_percent >= 80:
        existing = session.exec(
            select(UsageAlert)
            .where(UsageAlert.subscription_id == str(subscription.id))
            .where(UsageAlert.alert_type == AlertType.QUOTA_80.value)
            .where(UsageAlert.alert_threshold == 80)
        ).first()

        if not existing:
            alert = UsageAlert(
                tenant_id=subscription.tenant_id,
                subscription_id=str(subscription.id),
                alert_type=AlertType.QUOTA_80.value,
                alert_threshold=80,
                triggered_at=datetime.utcnow(),
            )
            session.add(alert)
            created_alerts.append(alert)

    # Check 100% threshold
    if usage_percent >= 100:
        existing = session.exec(
            select(UsageAlert)
            .where(UsageAlert.subscription_id == str(subscription.id))
            .where(UsageAlert.alert_type == AlertType.QUOTA_100.value)
            .where(UsageAlert.alert_threshold == 100)
        ).first()

        if not existing:
            alert = UsageAlert(
                tenant_id=subscription.tenant_id,
                subscription_id=str(subscription.id),
                alert_type=AlertType.QUOTA_100.value,
                alert_threshold=100,
                triggered_at=datetime.utcnow(),
            )
            session.add(alert)
            created_alerts.append(alert)

    if created_alerts:
        session.commit()

    return created_alerts


def check_trial_alerts(
    session: Session,
    subscription: TenantSubscription,
) -> list[UsageAlert]:
    """
    Check and create trial ending alerts.

    Args:
        session: Database session
        subscription: The subscription to check

    Returns:
        List of created alerts
    """
    if subscription.status != SubscriptionStatus.TRIAL.value:
        return []

    if not subscription.trial_ends_at:
        return []

    now = datetime.utcnow()
    days_remaining = (subscription.trial_ends_at - now).days

    created_alerts = []

    # Check 7 days warning
    if days_remaining <= 7 and days_remaining > 1:
        existing = session.exec(
            select(UsageAlert)
            .where(UsageAlert.subscription_id == str(subscription.id))
            .where(UsageAlert.alert_type == AlertType.TRIAL_ENDING.value)
            .where(UsageAlert.alert_threshold == 7)
        ).first()

        if not existing:
            alert = UsageAlert(
                tenant_id=subscription.tenant_id,
                subscription_id=str(subscription.id),
                alert_type=AlertType.TRIAL_ENDING.value,
                alert_threshold=7,
                triggered_at=datetime.utcnow(),
            )
            session.add(alert)
            created_alerts.append(alert)

    # Check 1 day warning
    if days_remaining <= 1:
        existing = session.exec(
            select(UsageAlert)
            .where(UsageAlert.subscription_id == str(subscription.id))
            .where(UsageAlert.alert_type == AlertType.TRIAL_ENDING.value)
            .where(UsageAlert.alert_threshold == 1)
        ).first()

        if not existing:
            alert = UsageAlert(
                tenant_id=subscription.tenant_id,
                subscription_id=str(subscription.id),
                alert_type=AlertType.TRIAL_ENDING.value,
                alert_threshold=1,
                triggered_at=datetime.utcnow(),
            )
            session.add(alert)
            created_alerts.append(alert)

    if created_alerts:
        session.commit()

    return created_alerts


def check_payment_alerts(
    session: Session,
    invoice: BillingInvoice,
) -> list[UsageAlert]:
    """
    Check and create payment overdue alerts.

    Args:
        session: Database session
        invoice: The invoice to check

    Returns:
        List of created alerts
    """
    if invoice.status not in [InvoiceStatus.SENT.value, InvoiceStatus.OVERDUE.value]:
        return []

    now = datetime.utcnow()
    if invoice.due_date >= now:
        return []  # Not overdue yet

    days_overdue = (now - invoice.due_date).days

    created_alerts = []

    # Check 7 days overdue
    if days_overdue >= 7 and days_overdue < 30:
        existing = session.exec(
            select(UsageAlert)
            .where(UsageAlert.tenant_id == invoice.tenant_id)
            .where(UsageAlert.alert_type == AlertType.PAYMENT_OVERDUE.value)
            .where(UsageAlert.alert_threshold == 7)
        ).first()

        if not existing:
            alert = UsageAlert(
                tenant_id=invoice.tenant_id,
                subscription_id=invoice.subscription_id,
                alert_type=AlertType.PAYMENT_OVERDUE.value,
                alert_threshold=7,
                triggered_at=datetime.utcnow(),
            )
            session.add(alert)
            created_alerts.append(alert)

            # Update invoice status to OVERDUE
            if invoice.status != InvoiceStatus.OVERDUE.value:
                invoice.status = InvoiceStatus.OVERDUE.value
                session.add(invoice)

    # Check 30 days overdue
    if days_overdue >= 30:
        existing = session.exec(
            select(UsageAlert)
            .where(UsageAlert.tenant_id == invoice.tenant_id)
            .where(UsageAlert.alert_type == AlertType.PAYMENT_OVERDUE.value)
            .where(UsageAlert.alert_threshold == 30)
        ).first()

        if not existing:
            alert = UsageAlert(
                tenant_id=invoice.tenant_id,
                subscription_id=invoice.subscription_id,
                alert_type=AlertType.PAYMENT_OVERDUE.value,
                alert_threshold=30,
                triggered_at=datetime.utcnow(),
            )
            session.add(alert)
            created_alerts.append(alert)

            # Suspend subscription
            subscription = session.get(TenantSubscription, invoice.subscription_id)
            if subscription and subscription.status != SubscriptionStatus.SUSPENDED.value:
                subscription.status = SubscriptionStatus.SUSPENDED.value
                session.add(subscription)

    if created_alerts:
        session.commit()

    return created_alerts


def run_alert_checks(session: Session) -> dict:
    """
    Run all alert checks for all tenants.
    This should be called periodically (e.g., daily cron job).

    Returns:
        dict with check results
    """
    results = {
        "quota_alerts": 0,
        "trial_alerts": 0,
        "payment_alerts": 0,
        "errors": [],
    }

    # Check all active subscriptions for quota and trial alerts
    subscriptions = session.exec(
        select(TenantSubscription)
        .where(TenantSubscription.status.in_([
            SubscriptionStatus.ACTIVE.value,
            SubscriptionStatus.TRIAL.value,
        ]))
    ).all()

    for subscription in subscriptions:
        try:
            quota_alerts = check_quota_alerts(session, subscription)
            results["quota_alerts"] += len(quota_alerts)

            trial_alerts = check_trial_alerts(session, subscription)
            results["trial_alerts"] += len(trial_alerts)
        except Exception as e:
            results["errors"].append({
                "subscription_id": str(subscription.id),
                "error": str(e),
            })

    # Check all unpaid invoices for payment alerts
    unpaid_invoices = session.exec(
        select(BillingInvoice)
        .where(BillingInvoice.status.in_([
            InvoiceStatus.SENT.value,
            InvoiceStatus.OVERDUE.value,
        ]))
    ).all()

    for invoice in unpaid_invoices:
        try:
            payment_alerts = check_payment_alerts(session, invoice)
            results["payment_alerts"] += len(payment_alerts)
        except Exception as e:
            results["errors"].append({
                "invoice_id": str(invoice.id),
                "error": str(e),
            })

    return results


def get_pending_alerts(
    session: Session,
    tenant_id: Optional[str] = None,
) -> list[UsageAlert]:
    """
    Get all unacknowledged alerts.

    Args:
        session: Database session
        tenant_id: Optional filter by tenant

    Returns:
        List of pending alerts
    """
    query = select(UsageAlert).where(UsageAlert.acknowledged_at == None)

    if tenant_id:
        query = query.where(UsageAlert.tenant_id == tenant_id)

    query = query.order_by(UsageAlert.triggered_at.desc())

    return list(session.exec(query).all())


def acknowledge_alert(
    session: Session,
    alert_id: str,
    acknowledged_by: str,
) -> UsageAlert:
    """
    Acknowledge an alert.

    Args:
        session: Database session
        alert_id: The alert ID
        acknowledged_by: User ID who acknowledged

    Returns:
        Updated alert
    """
    alert = session.get(UsageAlert, alert_id)
    if not alert:
        raise ValueError(f"Alert {alert_id} not found")

    alert.acknowledged_at = datetime.utcnow()
    alert.acknowledged_by = acknowledged_by
    session.add(alert)
    session.commit()
    session.refresh(alert)

    return alert


def get_alert_message(alert: UsageAlert) -> str:
    """Get human-readable message for an alert."""
    messages = {
        AlertType.QUOTA_80.value: f"Đã sử dụng {alert.alert_threshold}% quota",
        AlertType.QUOTA_100.value: "Đã hết quota! Phí vượt gói sẽ được tính.",
        AlertType.TRIAL_ENDING.value: f"Thời gian dùng thử còn {alert.alert_threshold} ngày",
        AlertType.PAYMENT_OVERDUE.value: f"Hóa đơn quá hạn {alert.alert_threshold} ngày",
    }
    return messages.get(alert.alert_type, "Alert triggered")
