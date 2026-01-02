"""
Billing Services for Multi-tenant SaaS Platform
"""
from .seed_data import seed_billing_data, seed_transaction_types, seed_billing_plans
from .credit_calculator import (
    calculate_credits,
    calculate_overage_cost,
    get_transaction_type_for_document,
    get_usage_breakdown,
    estimate_monthly_cost,
    clear_cache,
)
from .transaction_counter import (
    QuotaExceededException,
    get_current_billing_period,
    get_tenant_subscription,
    check_quota,
    log_transaction,
    count_transaction,
    log_document_creation,
)
from .invoice_generator import (
    generate_invoice_for_subscription,
    generate_monthly_invoices,
    calculate_invoice_for_subscription,
    process_end_of_month,
    reset_subscription_usage,
)
from .alert_service import (
    check_quota_alerts,
    check_trial_alerts,
    check_payment_alerts,
    run_alert_checks,
    get_pending_alerts,
    acknowledge_alert,
    get_alert_message,
)
from .vnpay_service import (
    create_payment_url,
    verify_return_url,
    process_payment_return,
    process_ipn,
    get_transaction_status,
    refund_transaction,
)

__all__ = [
    # Seed data
    "seed_billing_data",
    "seed_transaction_types",
    "seed_billing_plans",
    # Credit calculator
    "calculate_credits",
    "calculate_overage_cost",
    "get_transaction_type_for_document",
    "get_usage_breakdown",
    "estimate_monthly_cost",
    "clear_cache",
    # Transaction counter
    "QuotaExceededException",
    "get_current_billing_period",
    "get_tenant_subscription",
    "check_quota",
    "log_transaction",
    "count_transaction",
    "log_document_creation",
    # Invoice generator
    "generate_invoice_for_subscription",
    "generate_monthly_invoices",
    "calculate_invoice_for_subscription",
    "process_end_of_month",
    "reset_subscription_usage",
    # Alert service
    "check_quota_alerts",
    "check_trial_alerts",
    "check_payment_alerts",
    "run_alert_checks",
    "get_pending_alerts",
    "acknowledge_alert",
    "get_alert_message",
    # VNPay
    "create_payment_url",
    "verify_return_url",
    "process_payment_return",
    "process_ipn",
    "get_transaction_status",
    "refund_transaction",
]
