from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.db.session import get_session
from app.models.order import Order, OrderStatus
from app.models.user import User
from app.schemas.order import OrderRead
from app.core.security import get_current_user

router = APIRouter(prefix="", tags=["orders"])  # No prefix, will be added by parent


@router.post("/{order_id}/pickup", response_model=OrderRead)
def start_pickup(
    order_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Start pickup (change status to IN_TRANSIT - picking up)"""
    tenant_id = str(current_user.tenant_id)

    order = session.get(Order, order_id)
    if not order or str(order.tenant_id) != tenant_id:
        raise HTTPException(404, "Order not found")

    if order.status != OrderStatus.ASSIGNED:
        raise HTTPException(400, f"Cannot start pickup from status {order.status}")

    order.status = OrderStatus.IN_TRANSIT
    session.add(order)
    session.commit()
    session.refresh(order)
    return order


@router.post("/{order_id}/delivering", response_model=OrderRead)
def start_delivery(
    order_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Start delivery (status remains IN_TRANSIT but indicates delivering phase)"""
    tenant_id = str(current_user.tenant_id)

    order = session.get(Order, order_id)
    if not order or str(order.tenant_id) != tenant_id:
        raise HTTPException(404, "Order not found")

    if order.status != OrderStatus.IN_TRANSIT:
        raise HTTPException(400, f"Cannot start delivery from status {order.status}")

    # Keep status as IN_TRANSIT, just acknowledge transition
    session.add(order)
    session.commit()
    session.refresh(order)
    return order


@router.post("/{order_id}/delivered", response_model=OrderRead)
def mark_delivered(
    order_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Mark as delivered (waiting for empty return)"""
    tenant_id = str(current_user.tenant_id)

    order = session.get(Order, order_id)
    if not order or str(order.tenant_id) != tenant_id:
        raise HTTPException(404, "Order not found")

    if order.status != OrderStatus.IN_TRANSIT:
        raise HTTPException(400, f"Cannot mark delivered from status {order.status}")

    order.status = OrderStatus.DELIVERED
    session.add(order)
    session.commit()
    session.refresh(order)
    return order


@router.post("/{order_id}/complete", response_model=OrderRead)
def mark_completed(
    order_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Mark as completed (all done including empty return)"""
    tenant_id = str(current_user.tenant_id)

    order = session.get(Order, order_id)
    if not order or str(order.tenant_id) != tenant_id:
        raise HTTPException(404, "Order not found")

    if order.status != OrderStatus.DELIVERED:
        raise HTTPException(400, f"Cannot complete from status {order.status}")

    order.status = OrderStatus.COMPLETED
    session.add(order)
    session.commit()
    session.refresh(order)
    return order
