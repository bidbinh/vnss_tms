"""
Credit Calculator Service
Tính credits cho mỗi document dựa trên transaction type
"""
import json
from decimal import Decimal
from typing import Optional
from sqlmodel import Session, select

from app.models.billing import TransactionType, BillingPlan, TenantSubscription


# Cache document type to transaction type mapping
_DOCUMENT_TYPE_CACHE: dict[str, TransactionType] = {}


def get_transaction_type_for_document(
    session: Session,
    document_type: str,
    use_cache: bool = True
) -> Optional[TransactionType]:
    """
    Get the transaction type for a given document type.

    Args:
        session: Database session
        document_type: Document type code (e.g., "ORDER", "CUSTOMER_INVOICE")
        use_cache: Whether to use cached mapping

    Returns:
        TransactionType or None if not found
    """
    global _DOCUMENT_TYPE_CACHE

    # Check cache first
    if use_cache and document_type in _DOCUMENT_TYPE_CACHE:
        return _DOCUMENT_TYPE_CACHE[document_type]

    # Query all active transaction types
    tx_types = session.exec(
        select(TransactionType).where(TransactionType.is_active == True)
    ).all()

    # Build cache and find matching type
    for tx_type in tx_types:
        doc_types = json.loads(tx_type.document_types_json or "[]")
        for doc_type in doc_types:
            _DOCUMENT_TYPE_CACHE[doc_type] = tx_type

    return _DOCUMENT_TYPE_CACHE.get(document_type)


def calculate_credits(
    session: Session,
    document_type: str,
    file_size_mb: Optional[float] = None
) -> dict:
    """
    Calculate credits for a document.

    Args:
        session: Database session
        document_type: Document type code
        file_size_mb: File size in MB (for STORAGE type)

    Returns:
        dict with:
            - credits: Number of credits to charge
            - unit_price: Price per unit
            - transaction_type_code: Code of the transaction type
            - transaction_type_id: ID of the transaction type
            - is_storage: Whether this is a storage transaction
    """
    tx_type = get_transaction_type_for_document(session, document_type)

    if not tx_type:
        # Default to BASIC if document type not found
        tx_type = session.exec(
            select(TransactionType).where(TransactionType.code == "BASIC")
        ).first()

        if not tx_type:
            # Fallback if no transaction types exist
            return {
                "credits": Decimal("200"),  # Default BASIC price
                "unit_price": Decimal("200"),
                "transaction_type_code": "BASIC",
                "transaction_type_id": None,
                "is_storage": False,
            }

    # For storage type, calculate based on file size
    is_storage = tx_type.code == "STORAGE"
    if is_storage and file_size_mb:
        credits = tx_type.unit_price * Decimal(str(file_size_mb))
    else:
        credits = tx_type.unit_price

    return {
        "credits": credits,
        "unit_price": tx_type.unit_price,
        "transaction_type_code": tx_type.code,
        "transaction_type_id": str(tx_type.id),
        "is_storage": is_storage,
    }


def calculate_overage_cost(
    session: Session,
    subscription: TenantSubscription,
    overage_credits: Decimal
) -> Decimal:
    """
    Calculate the cost of overage credits based on plan discount.

    Args:
        session: Database session
        subscription: The tenant's subscription
        overage_credits: Number of credits over quota

    Returns:
        Cost in VND for the overage credits
    """
    if overage_credits <= 0:
        return Decimal("0")

    # Get the plan
    plan = session.get(BillingPlan, subscription.plan_id)
    if not plan:
        # No discount if plan not found
        return overage_credits

    # Apply discount
    discount_percent = plan.overage_discount / Decimal("100")
    cost = overage_credits * (Decimal("1") - discount_percent)

    return cost


def get_usage_breakdown(
    session: Session,
    tenant_id: str,
    billing_period: str
) -> list[dict]:
    """
    Get usage breakdown by transaction type for a billing period.

    Args:
        session: Database session
        tenant_id: Tenant ID
        billing_period: Period string (e.g., "2024-12")

    Returns:
        List of dicts with:
            - transaction_type_code: Code of transaction type
            - transaction_type_name: Name of transaction type
            - count: Number of transactions
            - credits: Total credits charged
    """
    from app.models.billing import TransactionLog
    from sqlalchemy import func

    # Query grouped by transaction type
    results = session.exec(
        select(
            TransactionLog.transaction_type_code,
            func.count(TransactionLog.id).label("count"),
            func.sum(TransactionLog.credits_charged).label("credits")
        )
        .where(TransactionLog.tenant_id == tenant_id)
        .where(TransactionLog.billing_period == billing_period)
        .group_by(TransactionLog.transaction_type_code)
    ).all()

    # Get transaction type names
    tx_types = session.exec(select(TransactionType)).all()
    tx_type_names = {t.code: t.name for t in tx_types}

    breakdown = []
    for row in results:
        breakdown.append({
            "transaction_type_code": row[0],
            "transaction_type_name": tx_type_names.get(row[0], row[0]),
            "count": row[1],
            "credits": Decimal(str(row[2])) if row[2] else Decimal("0"),
        })

    return breakdown


def estimate_monthly_cost(
    session: Session,
    plan_code: str,
    estimated_transactions: dict[str, int]
) -> dict:
    """
    Estimate monthly cost based on plan and estimated transactions.

    Args:
        session: Database session
        plan_code: Plan code (FREE, STARTER, PRO, ENTERPRISE)
        estimated_transactions: Dict of document_type -> count
            e.g., {"ORDER": 100, "CUSTOMER_INVOICE": 50}

    Returns:
        dict with:
            - plan_name: Name of the plan
            - base_cost: Monthly fee
            - estimated_credits: Total credits estimated
            - included_credits: Credits included in plan
            - overage_credits: Credits over quota
            - overage_cost: Cost of overage
            - total_cost: Total monthly cost
    """
    # Get plan
    plan = session.exec(
        select(BillingPlan).where(BillingPlan.code == plan_code)
    ).first()

    if not plan:
        return {"error": f"Plan {plan_code} not found"}

    # Calculate total credits
    total_credits = Decimal("0")
    for doc_type, count in estimated_transactions.items():
        calc = calculate_credits(session, doc_type)
        total_credits += calc["credits"] * count

    # Calculate overage
    included = Decimal(str(plan.monthly_credits))
    overage = max(Decimal("0"), total_credits - included) if included > 0 else Decimal("0")

    # Calculate overage cost with discount
    discount = plan.overage_discount / Decimal("100")
    overage_cost = overage * (Decimal("1") - discount)

    # Total
    total = plan.price_per_month + overage_cost

    return {
        "plan_name": plan.name,
        "plan_code": plan.code,
        "base_cost": plan.price_per_month,
        "estimated_credits": total_credits,
        "included_credits": included,
        "overage_credits": overage,
        "overage_discount_percent": plan.overage_discount,
        "overage_cost": overage_cost,
        "total_cost": total,
    }


def clear_cache():
    """Clear the document type cache (useful for testing or after updates)"""
    global _DOCUMENT_TYPE_CACHE
    _DOCUMENT_TYPE_CACHE = {}
