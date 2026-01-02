from datetime import datetime
from sqlmodel import Session, select
from app.models.order_sequence import OrderSequence

def _yymm(dt: datetime) -> str:
    return dt.strftime("%y%m")  # 2512

def next_order_code(session: Session, tenant_id: str, customer_code: str, order_date: datetime) -> str:
    # Use simple sequence per customer (no date grouping)
    # Format: ADG-129

    seq = session.exec(
        select(OrderSequence)
        .where(
            OrderSequence.tenant_id == tenant_id,
            OrderSequence.customer_code == customer_code,
            OrderSequence.yymm == "ALL",  # Use ALL for global sequence
        )
    ).first()

    if seq is None:
        seq = OrderSequence(tenant_id=tenant_id, customer_code=customer_code, yymm="ALL", last_seq=0)
        session.add(seq)
        session.flush()

    seq.last_seq += 1
    session.add(seq)
    session.flush()

    return f"{customer_code}-{seq.last_seq}"
