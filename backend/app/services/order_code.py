from datetime import datetime
from sqlmodel import Session, select, text
from app.models.order_sequence import OrderSequence

def _yymm(dt: datetime) -> str:
    return dt.strftime("%y%m")  # 2512

def _get_max_order_number(session: Session, tenant_id: str, customer_code: str) -> int:
    """Get the maximum order number from existing orders for this customer"""
    # Query to find max order number from orders table
    # Example: "ADG-225" -> extract 225
    query = text("""
        SELECT MAX(CAST(SPLIT_PART(order_code, '-', 2) AS INTEGER)) as max_seq
        FROM orders
        WHERE tenant_id = :tenant_id
          AND order_code LIKE :pattern
          AND order_code ~ :regex
    """)

    result = session.execute(
        query,
        {
            "tenant_id": tenant_id,
            "pattern": f"{customer_code}-%",
            "regex": f"^{customer_code}-[0-9]+$"  # Only match ADG-123, not ADG-2.01
        }
    ).first()

    return result[0] if result and result[0] else 0

def next_order_code(session: Session, tenant_id: str, customer_code: str, order_date: datetime) -> str:
    # Use simple sequence per customer (no date grouping)
    # Format: ADG-129

    # Always get the actual max from orders table (handles manual entries)
    max_from_orders = _get_max_order_number(session, tenant_id, customer_code)

    # Lock the row with FOR UPDATE to prevent race conditions
    seq = session.exec(
        select(OrderSequence)
        .where(
            OrderSequence.tenant_id == tenant_id,
            OrderSequence.customer_code == customer_code,
            OrderSequence.yymm == "ALL",  # Use ALL for global sequence
        )
        .with_for_update()  # Lock row until transaction commits
    ).first()

    if seq is None:
        # First time - create sequence record
        seq = OrderSequence(
            tenant_id=tenant_id,
            customer_code=customer_code,
            yymm="ALL",
            last_seq=max_from_orders
        )
        session.add(seq)
        session.flush()
    elif max_from_orders > seq.last_seq:
        # Sync sequence with actual max (handles manual order code entries)
        seq.last_seq = max_from_orders

    seq.last_seq += 1
    session.add(seq)
    session.commit()  # COMMIT immediately to release lock and persist sequence

    return f"{customer_code}-{seq.last_seq}"
