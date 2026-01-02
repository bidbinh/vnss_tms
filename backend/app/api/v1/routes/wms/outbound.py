"""
WMS - Outbound API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

from app.db.session import get_session
from app.models import User
from app.models.wms import (
    DeliveryOrder, DeliveryOrderLine, DeliveryType, DeliveryStatus,
    PickingTask, PackingTask, StockLevel
)
from app.core.security import get_current_user

router = APIRouter()


# =====================
# PYDANTIC SCHEMAS
# =====================

class DeliveryOrderCreate(BaseModel):
    delivery_type: str = DeliveryType.SALES.value
    warehouse_id: str
    shipping_zone_id: Optional[str] = None
    source_document_type: Optional[str] = None
    source_document_id: Optional[str] = None
    source_document_number: Optional[str] = None
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    ship_to_name: Optional[str] = None
    ship_to_address: Optional[str] = None
    ship_to_city: Optional[str] = None
    ship_to_phone: Optional[str] = None
    carrier_id: Optional[str] = None
    carrier_name: Optional[str] = None
    shipping_method: Optional[str] = None
    expected_delivery_date: Optional[datetime] = None
    notes: Optional[str] = None


class DeliveryLineCreate(BaseModel):
    delivery_id: str
    product_id: str
    product_code: str
    product_name: str
    unit_id: Optional[str] = None
    unit_name: Optional[str] = None
    ordered_quantity: Decimal
    lot_id: Optional[str] = None
    lot_number: Optional[str] = None
    source_location_id: Optional[str] = None
    unit_price: Decimal = Decimal("0")
    notes: Optional[str] = None


# =====================
# DELIVERY ORDERS
# =====================

@router.get("/delivery-orders")
def list_delivery_orders(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    warehouse_id: Optional[str] = Query(None),
    delivery_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    customer_id: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
):
    """List delivery orders"""
    tenant_id = str(current_user.tenant_id)

    query = select(DeliveryOrder).where(DeliveryOrder.tenant_id == tenant_id)

    if warehouse_id:
        query = query.where(DeliveryOrder.warehouse_id == warehouse_id)

    if delivery_type:
        query = query.where(DeliveryOrder.delivery_type == delivery_type)

    if status:
        query = query.where(DeliveryOrder.status == status)

    if customer_id:
        query = query.where(DeliveryOrder.customer_id == customer_id)

    if date_from:
        query = query.where(DeliveryOrder.delivery_date >= date_from)

    if date_to:
        query = query.where(DeliveryOrder.delivery_date <= date_to)

    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    query = query.order_by(DeliveryOrder.delivery_date.desc())
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.post("/delivery-orders")
def create_delivery_order(
    payload: DeliveryOrderCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a delivery order"""
    tenant_id = str(current_user.tenant_id)

    # Generate delivery number
    count = session.exec(
        select(func.count(DeliveryOrder.id)).where(
            DeliveryOrder.tenant_id == tenant_id
        )
    ).one() or 0

    delivery = DeliveryOrder(
        tenant_id=tenant_id,
        delivery_number=f"DO-{datetime.now().year}-{count + 1:06d}",
        delivery_date=datetime.utcnow(),
        **payload.model_dump(),
        status=DeliveryStatus.DRAFT.value,
        created_by=str(current_user.id),
    )

    session.add(delivery)
    session.commit()
    session.refresh(delivery)

    return delivery.model_dump()


@router.get("/delivery-orders/{delivery_id}")
def get_delivery_order(
    delivery_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get delivery order with lines"""
    tenant_id = str(current_user.tenant_id)

    delivery = session.get(DeliveryOrder, delivery_id)
    if not delivery or str(delivery.tenant_id) != tenant_id:
        raise HTTPException(404, "Delivery order not found")

    lines = session.exec(
        select(DeliveryOrderLine).where(
            DeliveryOrderLine.tenant_id == tenant_id,
            DeliveryOrderLine.delivery_id == delivery_id
        ).order_by(DeliveryOrderLine.line_number)
    ).all()

    result = delivery.model_dump()
    result["lines"] = [line.model_dump() for line in lines]

    return result


@router.post("/delivery-orders/{delivery_id}/lines")
def add_delivery_line(
    delivery_id: str,
    payload: DeliveryLineCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Add a line to delivery order"""
    tenant_id = str(current_user.tenant_id)

    delivery = session.get(DeliveryOrder, delivery_id)
    if not delivery or str(delivery.tenant_id) != tenant_id:
        raise HTTPException(404, "Delivery order not found")

    if delivery.status != DeliveryStatus.DRAFT.value:
        raise HTTPException(400, "Cannot add lines in current status")

    # Get line number
    max_line = session.exec(
        select(func.max(DeliveryOrderLine.line_number)).where(
            DeliveryOrderLine.tenant_id == tenant_id,
            DeliveryOrderLine.delivery_id == delivery_id
        )
    ).one() or 0

    line = DeliveryOrderLine(
        tenant_id=tenant_id,
        delivery_id=delivery_id,
        line_number=max_line + 1,
        product_id=payload.product_id,
        product_code=payload.product_code,
        product_name=payload.product_name,
        unit_id=payload.unit_id,
        unit_name=payload.unit_name,
        ordered_quantity=payload.ordered_quantity,
        lot_id=payload.lot_id,
        lot_number=payload.lot_number,
        source_location_id=payload.source_location_id,
        unit_price=payload.unit_price,
        total_price=payload.ordered_quantity * payload.unit_price,
        notes=payload.notes,
        created_by=str(current_user.id),
    )

    session.add(line)

    # Update delivery totals
    delivery.total_lines += 1
    delivery.total_ordered_qty += payload.ordered_quantity
    delivery.total_value += payload.ordered_quantity * payload.unit_price
    session.add(delivery)

    session.commit()
    session.refresh(line)

    return line.model_dump()


@router.post("/delivery-orders/{delivery_id}/confirm")
def confirm_delivery_order(
    delivery_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Confirm delivery order and create picking tasks"""
    tenant_id = str(current_user.tenant_id)

    delivery = session.get(DeliveryOrder, delivery_id)
    if not delivery or str(delivery.tenant_id) != tenant_id:
        raise HTTPException(404, "Delivery order not found")

    if delivery.status != DeliveryStatus.DRAFT.value:
        raise HTTPException(400, "Only draft orders can be confirmed")

    # Check stock availability
    lines = session.exec(
        select(DeliveryOrderLine).where(
            DeliveryOrderLine.delivery_id == delivery_id
        )
    ).all()

    for line in lines:
        stock = session.exec(
            select(StockLevel).where(
                StockLevel.tenant_id == tenant_id,
                StockLevel.product_id == line.product_id,
                StockLevel.warehouse_id == delivery.warehouse_id
            )
        ).first()

        if not stock or stock.quantity_available < line.ordered_quantity:
            raise HTTPException(
                400,
                f"Insufficient stock for {line.product_code}. Available: {stock.quantity_available if stock else 0}"
            )

    # Create picking tasks
    task_count = session.exec(
        select(func.count(PickingTask.id)).where(
            PickingTask.tenant_id == tenant_id
        )
    ).one() or 0

    for line in lines:
        task = PickingTask(
            tenant_id=tenant_id,
            task_number=f"PICK-{datetime.now().year}-{task_count + 1:06d}",
            status="PENDING",
            delivery_id=delivery_id,
            delivery_line_id=str(line.id),
            product_id=line.product_id,
            lot_id=line.lot_id,
            source_location_id=line.source_location_id or "",
            quantity=line.ordered_quantity,
            created_by=str(current_user.id),
        )
        session.add(task)
        task_count += 1

    delivery.status = DeliveryStatus.CONFIRMED.value
    session.add(delivery)

    session.commit()
    session.refresh(delivery)

    return {"success": True, "delivery": delivery.model_dump()}


@router.post("/delivery-orders/{delivery_id}/start-picking")
def start_picking(
    delivery_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Start picking process"""
    tenant_id = str(current_user.tenant_id)

    delivery = session.get(DeliveryOrder, delivery_id)
    if not delivery or str(delivery.tenant_id) != tenant_id:
        raise HTTPException(404, "Delivery order not found")

    delivery.status = DeliveryStatus.PICKING.value
    delivery.picker_id = str(current_user.id)

    session.add(delivery)
    session.commit()
    session.refresh(delivery)

    return {"success": True, "delivery": delivery.model_dump()}


@router.post("/delivery-orders/{delivery_id}/complete-picking")
def complete_picking(
    delivery_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Complete picking and move to packing"""
    tenant_id = str(current_user.tenant_id)

    delivery = session.get(DeliveryOrder, delivery_id)
    if not delivery or str(delivery.tenant_id) != tenant_id:
        raise HTTPException(404, "Delivery order not found")

    # Update picked quantities from tasks
    tasks = session.exec(
        select(PickingTask).where(
            PickingTask.delivery_id == delivery_id
        )
    ).all()

    for task in tasks:
        if task.delivery_line_id:
            line = session.get(DeliveryOrderLine, task.delivery_line_id)
            if line:
                line.picked_quantity = task.quantity_done
                session.add(line)

    delivery.status = DeliveryStatus.PACKING.value
    delivery.total_picked_qty = sum(task.quantity_done for task in tasks)

    session.add(delivery)
    session.commit()
    session.refresh(delivery)

    return {"success": True, "delivery": delivery.model_dump()}


@router.post("/delivery-orders/{delivery_id}/ship")
def ship_delivery(
    delivery_id: str,
    tracking_number: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Ship the delivery"""
    tenant_id = str(current_user.tenant_id)

    delivery = session.get(DeliveryOrder, delivery_id)
    if not delivery or str(delivery.tenant_id) != tenant_id:
        raise HTTPException(404, "Delivery order not found")

    # Update stock (reduce)
    lines = session.exec(
        select(DeliveryOrderLine).where(
            DeliveryOrderLine.delivery_id == delivery_id
        )
    ).all()

    for line in lines:
        stock = session.exec(
            select(StockLevel).where(
                StockLevel.tenant_id == tenant_id,
                StockLevel.product_id == line.product_id,
                StockLevel.warehouse_id == delivery.warehouse_id
            )
        ).first()

        if stock:
            stock.quantity_on_hand -= line.picked_quantity
            stock.quantity_available = stock.quantity_on_hand - stock.quantity_reserved
            stock.total_value = stock.quantity_on_hand * stock.unit_cost
            stock.last_move_date = datetime.utcnow()
            session.add(stock)

        line.shipped_quantity = line.picked_quantity
        session.add(line)

    delivery.status = DeliveryStatus.IN_TRANSIT.value
    delivery.tracking_number = tracking_number
    delivery.shipped_at = datetime.utcnow()
    delivery.total_shipped_qty = sum(line.shipped_quantity for line in lines)

    session.add(delivery)
    session.commit()
    session.refresh(delivery)

    return {"success": True, "delivery": delivery.model_dump()}


@router.post("/delivery-orders/{delivery_id}/deliver")
def mark_delivered(
    delivery_id: str,
    pod_signature: Optional[str] = None,
    pod_photo: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Mark as delivered"""
    tenant_id = str(current_user.tenant_id)

    delivery = session.get(DeliveryOrder, delivery_id)
    if not delivery or str(delivery.tenant_id) != tenant_id:
        raise HTTPException(404, "Delivery order not found")

    delivery.status = DeliveryStatus.DELIVERED.value
    delivery.actual_delivery_date = datetime.utcnow()
    delivery.delivered_at = datetime.utcnow()
    delivery.pod_signature = pod_signature
    delivery.pod_photo = pod_photo

    session.add(delivery)
    session.commit()
    session.refresh(delivery)

    return {"success": True, "delivery": delivery.model_dump()}


# =====================
# PICKING TASKS
# =====================

@router.get("/picking-tasks")
def list_picking_tasks(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    status: Optional[str] = Query(None),
    assigned_to: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
):
    """List picking tasks"""
    tenant_id = str(current_user.tenant_id)

    query = select(PickingTask).where(PickingTask.tenant_id == tenant_id)

    if status:
        query = query.where(PickingTask.status == status)

    if assigned_to:
        query = query.where(PickingTask.assigned_to == assigned_to)

    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    query = query.order_by(PickingTask.priority.desc(), PickingTask.created_at)
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.post("/picking-tasks/{task_id}/complete")
def complete_picking_task(
    task_id: str,
    quantity_done: Decimal,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Complete a picking task"""
    tenant_id = str(current_user.tenant_id)

    task = session.get(PickingTask, task_id)
    if not task or str(task.tenant_id) != tenant_id:
        raise HTTPException(404, "Picking task not found")

    task.quantity_done = quantity_done
    task.status = "COMPLETED"
    task.completed_at = datetime.utcnow()

    session.add(task)
    session.commit()
    session.refresh(task)

    return {"success": True, "task": task.model_dump()}
