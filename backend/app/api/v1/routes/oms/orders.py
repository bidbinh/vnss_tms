"""
OMS - Orders API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func, or_
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

from app.db.session import get_session
from app.models import User
from app.models.oms import (
    OMSOrder, OMSOrderItem, OMSOrderStatus,
    OMSAllocation, OMSShipment, OMSStatusLog
)
from app.schemas.oms import (
    OMSOrderCreate, OMSOrderUpdate, OMSOrderRead, OMSOrderDetail,
    OMSOrderItemCreate, OMSOrderItemRead,
    OMSOrderWithItemsCreate, OMSOrderListResponse
)
from app.services.oms.order_calculator import (
    calculate_order_totals,
    compare_with_cs_price,
    generate_order_number
)
from app.services.oms.status_logger import log_status_change
from app.core.security import get_current_user

router = APIRouter(prefix="/orders", tags=["OMS - Orders"])


# ============================================
# List & Search
# ============================================

@router.get("", response_model=OMSOrderListResponse)
def list_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    customer_id: Optional[str] = Query(None),
    from_date: Optional[datetime] = Query(None),
    to_date: Optional[datetime] = Query(None),
    search: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List orders with filtering and pagination"""
    tenant_id = str(current_user.tenant_id)

    # Base query
    query = select(OMSOrder).where(OMSOrder.tenant_id == tenant_id)

    # Filters
    if status:
        query = query.where(OMSOrder.status == status)

    if customer_id:
        query = query.where(OMSOrder.customer_id == customer_id)

    if from_date:
        query = query.where(OMSOrder.order_date >= from_date)

    if to_date:
        query = query.where(OMSOrder.order_date <= to_date)

    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                OMSOrder.order_number.like(search_pattern),
                OMSOrder.customer_name.like(search_pattern),
                OMSOrder.external_reference.like(search_pattern)
            )
        )

    # Count total
    count_query = select(func.count(OMSOrder.id)).where(OMSOrder.tenant_id == tenant_id)
    if status:
        count_query = count_query.where(OMSOrder.status == status)
    if customer_id:
        count_query = count_query.where(OMSOrder.customer_id == customer_id)
    if from_date:
        count_query = count_query.where(OMSOrder.order_date >= from_date)
    if to_date:
        count_query = count_query.where(OMSOrder.order_date <= to_date)
    if search:
        search_pattern = f"%{search}%"
        count_query = count_query.where(
            or_(
                OMSOrder.order_number.like(search_pattern),
                OMSOrder.customer_name.like(search_pattern),
                OMSOrder.external_reference.like(search_pattern)
            )
        )

    total = session.exec(count_query).one()

    # Get orders
    orders = session.exec(
        query.order_by(OMSOrder.created_at.desc())
        .offset(skip)
        .limit(limit)
    ).all()

    return OMSOrderListResponse(
        data=orders,
        total=total,
        skip=skip,
        limit=limit
    )


# ============================================
# Get Detail
# ============================================

@router.get("/{order_id}", response_model=OMSOrderDetail)
def get_order(
    order_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get order detail with items"""
    tenant_id = str(current_user.tenant_id)

    order = session.get(OMSOrder, order_id)
    if not order or str(order.tenant_id) != tenant_id:
        raise HTTPException(status_code=404, detail="Order not found")

    # Get items
    items = session.exec(
        select(OMSOrderItem).where(OMSOrderItem.order_id == order_id)
    ).all()

    order_dict = order.model_dump()
    order_dict["items"] = [item.model_dump() for item in items]

    return order_dict


# ============================================
# Create
# ============================================

@router.post("", response_model=OMSOrderRead)
def create_order(
    payload: OMSOrderWithItemsCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create new order with items"""
    tenant_id = str(current_user.tenant_id)

    # TODO: Fetch customer info from CRM
    customer_name = f"Customer {payload.customer_id}"
    delivery_address_text = "Address placeholder"

    # Generate order number
    order_number = generate_order_number(tenant_id)

    # Create order
    order = OMSOrder(
        tenant_id=tenant_id,
        order_number=order_number,
        external_reference=payload.external_reference,
        status=OMSOrderStatus.DRAFT.value,
        customer_id=payload.customer_id,
        customer_name=customer_name,
        delivery_address_id=payload.delivery_address_id,
        delivery_address_text=delivery_address_text,
        delivery_contact_name=payload.delivery_contact_name,
        delivery_contact_phone=payload.delivery_contact_phone,
        required_delivery_date=payload.required_delivery_date,
        sales_notes=payload.sales_notes,
        customer_notes=payload.customer_notes,
        created_by_id=str(current_user.id),
        base_price_type="CS_PRICE",
        currency="VND"
    )

    session.add(order)
    session.flush()

    # Create items
    items = []
    for item_data in payload.items:
        item = OMSOrderItem(
            tenant_id=tenant_id,
            order_id=order.id,
            product_id=item_data.product_id,
            product_code=item_data.product_code,
            product_name=item_data.product_name,
            product_unit=item_data.product_unit,
            quantity=item_data.quantity,
            cs_unit_price=item_data.cs_unit_price,
            quoted_unit_price=item_data.quoted_unit_price,
            shipping_unit_cost=item_data.shipping_unit_cost,
            notes=item_data.notes
        )
        session.add(item)
        items.append(item)

    session.flush()

    # Calculate totals
    totals = calculate_order_totals(order, items)
    order.total_product_amount = totals["total_product_amount"]
    order.total_shipping_cost = totals["total_shipping_cost"]
    order.total_tax = totals["total_tax"]
    order.grand_total = totals["grand_total"]

    # Log status
    log_status_change(
        session, "ORDER", order.id,
        None, OMSOrderStatus.DRAFT.value,
        "Order created", tenant_id,
        str(current_user.id), current_user.role
    )

    session.commit()
    session.refresh(order)

    return order


# ============================================
# Update
# ============================================

@router.put("/{order_id}", response_model=OMSOrderRead)
def update_order(
    order_id: str,
    payload: OMSOrderUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update order (only DRAFT status)"""
    tenant_id = str(current_user.tenant_id)

    order = session.get(OMSOrder, order_id)
    if not order or str(order.tenant_id) != tenant_id:
        raise HTTPException(status_code=404, detail="Order not found")

    # Only allow update for DRAFT
    if order.status != OMSOrderStatus.DRAFT.value:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot update order with status {order.status}"
        )

    # Update fields
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(order, field, value)

    order.updated_at = datetime.utcnow()

    session.add(order)
    session.commit()
    session.refresh(order)

    return order


# ============================================
# Delete
# ============================================

@router.delete("/{order_id}")
def delete_order(
    order_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete order (only DRAFT status)"""
    tenant_id = str(current_user.tenant_id)

    order = session.get(OMSOrder, order_id)
    if not order or str(order.tenant_id) != tenant_id:
        raise HTTPException(status_code=404, detail="Order not found")

    # Only allow delete for DRAFT
    if order.status != OMSOrderStatus.DRAFT.value:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete order with status {order.status}"
        )

    # Delete items first
    items = session.exec(
        select(OMSOrderItem).where(OMSOrderItem.order_id == order_id)
    ).all()
    for item in items:
        session.delete(item)

    # Delete order
    session.delete(order)
    session.commit()

    return {"success": True}


# ============================================
# Status History
# ============================================

@router.get("/{order_id}/status-history")
def get_status_history(
    order_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get order status change history"""
    tenant_id = str(current_user.tenant_id)

    order = session.get(OMSOrder, order_id)
    if not order or str(order.tenant_id) != tenant_id:
        raise HTTPException(status_code=404, detail="Order not found")

    logs = session.exec(
        select(OMSStatusLog).where(
            OMSStatusLog.entity_type == "ORDER",
            OMSStatusLog.entity_id == order_id
        ).order_by(OMSStatusLog.changed_at.desc())
    ).all()

    return [log.model_dump() for log in logs]


# ============================================
# Get Allocations
# ============================================

@router.get("/{order_id}/allocations")
def get_order_allocations(
    order_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get order allocations"""
    tenant_id = str(current_user.tenant_id)

    order = session.get(OMSOrder, order_id)
    if not order or str(order.tenant_id) != tenant_id:
        raise HTTPException(status_code=404, detail="Order not found")

    allocations = session.exec(
        select(OMSAllocation).where(OMSAllocation.order_id == order_id)
    ).all()

    return [alloc.model_dump() for alloc in allocations]


# ============================================
# Get Shipments
# ============================================

@router.get("/{order_id}/shipments")
def get_order_shipments(
    order_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get order shipments"""
    tenant_id = str(current_user.tenant_id)

    order = session.get(OMSOrder, order_id)
    if not order or str(order.tenant_id) != tenant_id:
        raise HTTPException(status_code=404, detail="Order not found")

    shipments = session.exec(
        select(OMSShipment).where(OMSShipment.order_id == order_id)
    ).all()

    return [shipment.model_dump() for shipment in shipments]
