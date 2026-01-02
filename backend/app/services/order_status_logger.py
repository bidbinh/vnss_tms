"""
Order Status Logger Service
Automatically log status changes to order_status_logs table
"""

from sqlmodel import Session
from app.models import OrderStatusLog
from datetime import datetime
from typing import Optional
import uuid


def log_status_change(
    session: Session,
    tenant_id: str,
    order_id: str,
    from_status: Optional[str],
    to_status: str,
    changed_by_user_id: Optional[str] = None,
    note: Optional[str] = None
) -> OrderStatusLog:
    """
    Log a status change to order_status_logs table

    Args:
        session: Database session
        tenant_id: Tenant ID
        order_id: Order ID
        from_status: Previous status (None for initial status)
        to_status: New status
        changed_by_user_id: User who made the change
        note: Optional note about the change

    Returns:
        Created OrderStatusLog instance
    """
    log = OrderStatusLog(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        order_id=order_id,
        from_status=from_status,
        to_status=to_status,
        changed_at=datetime.utcnow(),
        changed_by_user_id=changed_by_user_id,
        note=note
    )

    session.add(log)
    # Don't commit here - let the caller handle transaction

    return log


def get_delivered_date(session: Session, order_id: str) -> Optional[datetime]:
    """
    Get the datetime when order was marked as DELIVERED

    Returns:
        Datetime when status changed to DELIVERED, or None if not delivered yet
    """
    from sqlmodel import select
    from app.models.order import OrderStatus

    log = session.exec(
        select(OrderStatusLog)
        .where(
            OrderStatusLog.order_id == order_id,
            OrderStatusLog.to_status == OrderStatus.DELIVERED
        )
        .order_by(OrderStatusLog.changed_at.asc())  # Get first DELIVERED log
    ).first()

    return log.changed_at if log else None
