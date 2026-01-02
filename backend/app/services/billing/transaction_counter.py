"""
Transaction Counter Service
Decorator và utilities để auto-log transactions khi tạo document
"""
import functools
from datetime import datetime
from decimal import Decimal
from typing import Any, Callable, Optional
from sqlmodel import Session, select

from app.models.billing import (
    TransactionLog,
    TenantSubscription,
    BillingPlan,
    SubscriptionStatus,
)
from app.services.billing.credit_calculator import calculate_credits


class QuotaExceededException(Exception):
    """Raised when tenant has exceeded their quota and is blocked"""

    def __init__(
        self,
        tenant_id: str,
        credits_used: Decimal,
        credits_limit: int,
        grace_percent: int,
        message: str = "Quota exceeded"
    ):
        self.tenant_id = tenant_id
        self.credits_used = credits_used
        self.credits_limit = credits_limit
        self.grace_percent = grace_percent
        super().__init__(message)


def get_current_billing_period() -> str:
    """Get current billing period in YYYY-MM format"""
    return datetime.utcnow().strftime("%Y-%m")


def get_tenant_subscription(
    session: Session,
    tenant_id: str
) -> Optional[TenantSubscription]:
    """Get active subscription for a tenant"""
    return session.exec(
        select(TenantSubscription)
        .where(TenantSubscription.tenant_id == tenant_id)
        .where(TenantSubscription.status.in_([
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.TRIAL,
            SubscriptionStatus.PAST_DUE,
        ]))
    ).first()


def check_quota(
    session: Session,
    tenant_id: str,
    credits_to_charge: Decimal
) -> dict:
    """
    Check if tenant has quota for the transaction.

    Returns:
        dict with:
            - can_proceed: Whether transaction can proceed
            - is_overage: Whether this is an overage transaction
            - is_in_grace: Whether tenant is in grace period
            - warning: Optional warning message
            - subscription: The subscription if exists
            - plan: The plan if exists
    """
    subscription = get_tenant_subscription(session, tenant_id)

    # No subscription = allow (for system tenants or during setup)
    if not subscription:
        return {
            "can_proceed": True,
            "is_overage": False,
            "is_in_grace": False,
            "warning": None,
            "subscription": None,
            "plan": None,
        }

    plan = session.get(BillingPlan, subscription.plan_id)
    if not plan:
        return {
            "can_proceed": True,
            "is_overage": False,
            "is_in_grace": False,
            "warning": None,
            "subscription": subscription,
            "plan": None,
        }

    # Enterprise/unlimited plan
    if plan.monthly_credits == 0:
        return {
            "can_proceed": True,
            "is_overage": False,
            "is_in_grace": False,
            "warning": None,
            "subscription": subscription,
            "plan": plan,
        }

    # Calculate usage
    current_usage = subscription.credits_used
    credits_limit = Decimal(str(subscription.credits_limit or plan.monthly_credits))
    new_usage = current_usage + credits_to_charge

    # Check if within limit
    if new_usage <= credits_limit:
        # Check if approaching limit (80%)
        warning = None
        if new_usage >= credits_limit * Decimal("0.8"):
            usage_percent = (new_usage / credits_limit * 100).quantize(Decimal("0.1"))
            warning = f"Đã sử dụng {usage_percent}% quota ({new_usage:,.0f}/{credits_limit:,.0f} credits)"

        return {
            "can_proceed": True,
            "is_overage": False,
            "is_in_grace": False,
            "warning": warning,
            "subscription": subscription,
            "plan": plan,
        }

    # Over limit - check plan type
    grace_percent = plan.grace_percent

    if grace_percent > 0:
        # FREE plan with grace period
        grace_limit = credits_limit * (1 + Decimal(str(grace_percent)) / 100)

        if new_usage <= grace_limit:
            # Within grace period
            return {
                "can_proceed": True,
                "is_overage": True,
                "is_in_grace": True,
                "warning": f"Đã vượt quota! Còn {grace_percent}% dung lượng dự phòng.",
                "subscription": subscription,
                "plan": plan,
            }
        else:
            # Exceeded grace period - BLOCK
            raise QuotaExceededException(
                tenant_id=tenant_id,
                credits_used=current_usage,
                credits_limit=int(credits_limit),
                grace_percent=grace_percent,
                message=f"Đã hết quota ({credits_limit:,.0f} credits + {grace_percent}% dự phòng). "
                        f"Vui lòng nâng cấp gói để tiếp tục sử dụng."
            )
    else:
        # Paid plan - allow overage with warning
        return {
            "can_proceed": True,
            "is_overage": True,
            "is_in_grace": False,
            "warning": f"Đã vượt quota! Phí vượt gói sẽ được tính vào cuối kỳ.",
            "subscription": subscription,
            "plan": plan,
        }


def log_transaction(
    session: Session,
    tenant_id: str,
    document_type: str,
    document_id: str,
    document_code: str,
    module: str,
    file_size_bytes: Optional[int] = None,
    metadata: Optional[dict] = None,
) -> TransactionLog:
    """
    Log a billable transaction.

    Args:
        session: Database session
        tenant_id: Tenant ID
        document_type: Document type (ORDER, INVOICE, etc.)
        document_id: UUID of the document
        document_code: Human-readable code of the document
        module: Module name (tms, wms, accounting, etc.)
        file_size_bytes: File size in bytes (for STORAGE type)
        metadata: Optional metadata dict

    Returns:
        Created TransactionLog
    """
    import json

    # Calculate file size in MB if provided
    file_size_mb = None
    if file_size_bytes:
        file_size_mb = file_size_bytes / (1024 * 1024)

    # Calculate credits
    calc = calculate_credits(session, document_type, file_size_mb)

    # Get subscription
    subscription = get_tenant_subscription(session, tenant_id)

    # Check quota (will raise QuotaExceededException if blocked)
    quota_check = check_quota(session, tenant_id, calc["credits"])

    # Create log entry
    log = TransactionLog(
        tenant_id=tenant_id,
        subscription_id=str(subscription.id) if subscription else None,
        transaction_type_id=calc["transaction_type_id"],
        transaction_type_code=calc["transaction_type_code"],
        document_type=document_type,
        document_id=document_id,
        document_code=document_code,
        module=module,
        credits_charged=calc["credits"],
        unit_price=calc["unit_price"],
        file_size_bytes=file_size_bytes,
        billing_period=get_current_billing_period(),
        is_overage=quota_check["is_overage"],
        metadata_json=json.dumps(metadata) if metadata else None,
    )
    session.add(log)

    # Update subscription usage
    if subscription:
        subscription.credits_used += calc["credits"]
        if quota_check["is_overage"]:
            subscription.overage_credits += calc["credits"]
        if quota_check["is_in_grace"] and not subscription.is_in_grace:
            subscription.is_in_grace = True
        session.add(subscription)

    session.commit()
    session.refresh(log)

    return log


def count_transaction(document_type: str, module: str):
    """
    Decorator để tự động log transaction khi tạo document.

    Usage:
        @count_transaction("ORDER", "tms")
        async def create_order(session: Session, tenant_id: str, data: OrderCreate):
            order = Order(**data.dict())
            session.add(order)
            session.commit()
            return order

    The decorated function MUST:
    - Have 'session' as first parameter
    - Have 'tenant_id' as parameter (or get_current_tenant_id dependency)
    - Return an object with 'id' and 'code' (or similar) attributes
    """

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            result = await func(*args, **kwargs)

            # Extract session and tenant_id from args/kwargs
            session = kwargs.get("session") or (args[0] if args else None)
            tenant_id = kwargs.get("tenant_id") or kwargs.get("current_user", {}).get("tenant_id")

            if session and tenant_id and result:
                try:
                    doc_id = str(getattr(result, "id", result))
                    doc_code = getattr(result, "code", None) or getattr(result, "order_number", None) or doc_id

                    log_transaction(
                        session=session,
                        tenant_id=tenant_id,
                        document_type=document_type,
                        document_id=doc_id,
                        document_code=doc_code,
                        module=module,
                    )
                except QuotaExceededException:
                    # Re-raise quota exceptions
                    raise
                except Exception as e:
                    # Log error but don't fail the main operation
                    print(f"Error logging transaction: {e}")

            return result

        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            result = func(*args, **kwargs)

            # Extract session and tenant_id from args/kwargs
            session = kwargs.get("session") or (args[0] if args else None)
            tenant_id = kwargs.get("tenant_id") or kwargs.get("current_user", {}).get("tenant_id")

            if session and tenant_id and result:
                try:
                    doc_id = str(getattr(result, "id", result))
                    doc_code = getattr(result, "code", None) or getattr(result, "order_number", None) or doc_id

                    log_transaction(
                        session=session,
                        tenant_id=tenant_id,
                        document_type=document_type,
                        document_id=doc_id,
                        document_code=doc_code,
                        module=module,
                    )
                except QuotaExceededException:
                    # Re-raise quota exceptions
                    raise
                except Exception as e:
                    # Log error but don't fail the main operation
                    print(f"Error logging transaction: {e}")

            return result

        # Return appropriate wrapper based on function type
        if functools.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper

    return decorator


# Helper function for direct logging without decorator
def log_document_creation(
    session: Session,
    tenant_id: str,
    document_type: str,
    document: Any,
    module: str,
    file_size_bytes: Optional[int] = None,
    metadata: Optional[dict] = None,
) -> Optional[TransactionLog]:
    """
    Helper function to log document creation.
    Call this after successfully creating a document.

    Args:
        session: Database session
        tenant_id: Tenant ID
        document_type: Document type
        document: The created document object (must have .id attribute)
        module: Module name
        file_size_bytes: Optional file size for storage transactions
        metadata: Optional metadata

    Returns:
        TransactionLog or None if logging failed
    """
    try:
        doc_id = str(getattr(document, "id", document))
        doc_code = (
            getattr(document, "code", None)
            or getattr(document, "order_number", None)
            or getattr(document, "invoice_number", None)
            or getattr(document, "trip_number", None)
            or doc_id
        )

        return log_transaction(
            session=session,
            tenant_id=tenant_id,
            document_type=document_type,
            document_id=doc_id,
            document_code=doc_code,
            module=module,
            file_size_bytes=file_size_bytes,
            metadata=metadata,
        )
    except QuotaExceededException:
        raise
    except Exception as e:
        print(f"Error logging document creation: {e}")
        return None
