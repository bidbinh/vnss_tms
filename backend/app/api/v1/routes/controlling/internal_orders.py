"""
Controlling - Internal Orders API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

from app.db.session import get_session
from app.models import User
from app.models.controlling import (
    InternalOrder, InternalOrderLine,
    InternalOrderType, InternalOrderStatus
)
from app.core.security import get_current_user

router = APIRouter()


# =====================
# PYDANTIC SCHEMAS
# =====================

class InternalOrderCreate(BaseModel):
    order_type: str = InternalOrderType.OVERHEAD.value
    name: str
    cost_center_id: Optional[str] = None
    profit_center_id: Optional[str] = None
    responsible_id: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    planned_cost: Decimal = Decimal("0")
    currency: str = "VND"
    notes: Optional[str] = None


class InternalOrderLineCreate(BaseModel):
    internal_order_id: str
    account_id: str
    account_code: str
    cost_element: Optional[str] = None
    description: str
    planned_amount: Decimal = Decimal("0")
    actual_amount: Decimal = Decimal("0")
    posting_date: Optional[datetime] = None
    source_type: Optional[str] = None
    source_id: Optional[str] = None
    notes: Optional[str] = None


# =====================
# INTERNAL ORDERS
# =====================

@router.get("/internal-orders")
def list_internal_orders(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    order_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    cost_center_id: Optional[str] = Query(None),
):
    """List all internal orders"""
    tenant_id = str(current_user.tenant_id)

    query = select(InternalOrder).where(InternalOrder.tenant_id == tenant_id)

    if order_type:
        query = query.where(InternalOrder.order_type == order_type)

    if status:
        query = query.where(InternalOrder.status == status)

    if cost_center_id:
        query = query.where(InternalOrder.cost_center_id == cost_center_id)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    query = query.order_by(InternalOrder.order_number.desc())
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.post("/internal-orders")
def create_internal_order(
    payload: InternalOrderCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new internal order"""
    tenant_id = str(current_user.tenant_id)

    # Generate order number
    count = session.exec(
        select(func.count(InternalOrder.id)).where(
            InternalOrder.tenant_id == tenant_id
        )
    ).one() or 0

    order_number = f"IO-{datetime.now().year}-{count + 1:05d}"

    order = InternalOrder(
        tenant_id=tenant_id,
        order_number=order_number,
        **payload.model_dump(),
        status=InternalOrderStatus.CREATED.value,
        created_by=str(current_user.id),
    )

    session.add(order)
    session.commit()
    session.refresh(order)

    return order.model_dump()


@router.get("/internal-orders/{order_id}")
def get_internal_order(
    order_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get internal order with lines"""
    tenant_id = str(current_user.tenant_id)

    order = session.get(InternalOrder, order_id)
    if not order or str(order.tenant_id) != tenant_id:
        raise HTTPException(404, "Internal order not found")

    # Get lines
    lines = session.exec(
        select(InternalOrderLine).where(
            InternalOrderLine.tenant_id == tenant_id,
            InternalOrderLine.internal_order_id == order_id
        ).order_by(InternalOrderLine.created_at)
    ).all()

    result = order.model_dump()
    result["lines"] = [line.model_dump() for line in lines]

    return result


@router.put("/internal-orders/{order_id}")
def update_internal_order(
    order_id: str,
    payload: InternalOrderCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update an internal order"""
    tenant_id = str(current_user.tenant_id)

    order = session.get(InternalOrder, order_id)
    if not order or str(order.tenant_id) != tenant_id:
        raise HTTPException(404, "Internal order not found")

    if order.status in [InternalOrderStatus.CLOSED.value, InternalOrderStatus.SETTLED.value]:
        raise HTTPException(400, "Cannot update closed or settled order")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(order, key, value)

    order.updated_at = datetime.utcnow()

    session.add(order)
    session.commit()
    session.refresh(order)

    return order.model_dump()


@router.post("/internal-orders/{order_id}/release")
def release_internal_order(
    order_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Release an internal order for posting"""
    tenant_id = str(current_user.tenant_id)

    order = session.get(InternalOrder, order_id)
    if not order or str(order.tenant_id) != tenant_id:
        raise HTTPException(404, "Internal order not found")

    if order.status != InternalOrderStatus.CREATED.value:
        raise HTTPException(400, "Only created orders can be released")

    order.status = InternalOrderStatus.RELEASED.value
    order.updated_at = datetime.utcnow()

    session.add(order)
    session.commit()
    session.refresh(order)

    return {"success": True, "order": order.model_dump()}


@router.post("/internal-orders/{order_id}/close")
def close_internal_order(
    order_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Close an internal order"""
    tenant_id = str(current_user.tenant_id)

    order = session.get(InternalOrder, order_id)
    if not order or str(order.tenant_id) != tenant_id:
        raise HTTPException(404, "Internal order not found")

    if order.status not in [InternalOrderStatus.RELEASED.value]:
        raise HTTPException(400, "Only released orders can be closed")

    order.status = InternalOrderStatus.CLOSED.value
    order.updated_at = datetime.utcnow()

    session.add(order)
    session.commit()
    session.refresh(order)

    return {"success": True, "order": order.model_dump()}


@router.post("/internal-orders/{order_id}/settle")
def settle_internal_order(
    order_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Settle an internal order (transfer costs to receiver)"""
    tenant_id = str(current_user.tenant_id)

    order = session.get(InternalOrder, order_id)
    if not order or str(order.tenant_id) != tenant_id:
        raise HTTPException(404, "Internal order not found")

    if order.status != InternalOrderStatus.CLOSED.value:
        raise HTTPException(400, "Only closed orders can be settled")

    order.status = InternalOrderStatus.SETTLED.value
    order.settlement_date = datetime.utcnow()
    order.updated_at = datetime.utcnow()

    session.add(order)
    session.commit()
    session.refresh(order)

    return {"success": True, "order": order.model_dump()}


# =====================
# INTERNAL ORDER LINES
# =====================

@router.post("/internal-order-lines")
def create_internal_order_line(
    payload: InternalOrderLineCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create an internal order line (cost posting)"""
    tenant_id = str(current_user.tenant_id)

    # Check order exists and is released
    order = session.get(InternalOrder, payload.internal_order_id)
    if not order or str(order.tenant_id) != tenant_id:
        raise HTTPException(404, "Internal order not found")

    if order.status not in [InternalOrderStatus.CREATED.value, InternalOrderStatus.RELEASED.value]:
        raise HTTPException(400, "Cannot post to this order")

    line = InternalOrderLine(
        tenant_id=tenant_id,
        **payload.model_dump(),
        variance_amount=payload.actual_amount - payload.planned_amount,
        created_by=str(current_user.id),
    )

    session.add(line)
    session.commit()
    session.refresh(line)

    # Update order totals
    total_actual = session.exec(
        select(func.sum(InternalOrderLine.actual_amount)).where(
            InternalOrderLine.tenant_id == tenant_id,
            InternalOrderLine.internal_order_id == payload.internal_order_id
        )
    ).one() or Decimal("0")

    order.actual_cost = total_actual
    order.variance = total_actual - order.planned_cost
    order.commitment = Decimal("0")  # Would be calculated from purchase orders
    order.available_budget = order.planned_cost - total_actual

    session.add(order)
    session.commit()

    return line.model_dump()


@router.get("/internal-order-lines")
def list_internal_order_lines(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    internal_order_id: str = Query(...),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
):
    """List lines for an internal order"""
    tenant_id = str(current_user.tenant_id)

    query = select(InternalOrderLine).where(
        InternalOrderLine.tenant_id == tenant_id,
        InternalOrderLine.internal_order_id == internal_order_id
    )

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    query = query.order_by(InternalOrderLine.posting_date.desc())
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }
