"""
Unified Orders API Routes

Provides CRUD operations for UnifiedOrders - supporting both
Tenant orders and Dispatcher orders in a single unified interface.
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, and_
from sqlmodel import Session, select
from pydantic import BaseModel
import uuid

from app.db.session import get_session
from app.models.unified_order import (
    UnifiedOrder, OrderSourceType, OrderStatus, PaymentStatus,
    OrderAssignment, UnifiedOrderSequence, OrderStatusHistory
)
from app.models.actor import Actor, ActorRelationship

router = APIRouter(prefix="/unified-orders", tags=["Unified Orders"])


# ============================================
# SCHEMAS
# ============================================

class OrderCreate(BaseModel):
    source_type: str = OrderSourceType.TENANT.value
    order_code: Optional[str] = None  # Auto-generate if not provided
    external_code: Optional[str] = None

    # Customer
    customer_actor_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_company: Optional[str] = None
    customer_email: Optional[str] = None

    # Pickup
    pickup_location_id: Optional[str] = None
    pickup_address: Optional[str] = None
    pickup_city: Optional[str] = None
    pickup_district: Optional[str] = None
    pickup_contact: Optional[str] = None
    pickup_phone: Optional[str] = None
    pickup_time: Optional[datetime] = None
    pickup_notes: Optional[str] = None

    # Delivery
    delivery_location_id: Optional[str] = None
    delivery_address: Optional[str] = None
    delivery_city: Optional[str] = None
    delivery_district: Optional[str] = None
    delivery_contact: Optional[str] = None
    delivery_phone: Optional[str] = None
    delivery_time: Optional[datetime] = None
    delivery_notes: Optional[str] = None

    # Cargo
    equipment_type: Optional[str] = None
    container_code: Optional[str] = None
    seal_number: Optional[str] = None
    cargo_description: Optional[str] = None
    weight_kg: Optional[float] = None
    cbm: Optional[float] = None
    package_count: Optional[int] = None
    commodity_type: Optional[str] = None
    is_hazardous: bool = False
    temperature_required: Optional[str] = None

    # Financials
    currency: str = "VND"
    freight_charge: Optional[float] = None
    additional_charges: Optional[float] = None
    driver_payment: Optional[float] = None

    # Notes
    internal_notes: Optional[str] = None
    customer_notes: Optional[str] = None

    # Metadata
    metadata: Optional[dict] = None
    tags: Optional[list] = None


class OrderUpdate(BaseModel):
    status: Optional[str] = None
    external_code: Optional[str] = None

    # Customer
    customer_actor_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_company: Optional[str] = None
    customer_email: Optional[str] = None

    # Pickup
    pickup_location_id: Optional[str] = None
    pickup_address: Optional[str] = None
    pickup_city: Optional[str] = None
    pickup_district: Optional[str] = None
    pickup_contact: Optional[str] = None
    pickup_phone: Optional[str] = None
    pickup_time: Optional[datetime] = None
    pickup_notes: Optional[str] = None

    # Delivery
    delivery_location_id: Optional[str] = None
    delivery_address: Optional[str] = None
    delivery_city: Optional[str] = None
    delivery_district: Optional[str] = None
    delivery_contact: Optional[str] = None
    delivery_phone: Optional[str] = None
    delivery_time: Optional[datetime] = None
    delivery_notes: Optional[str] = None

    # Cargo
    equipment_type: Optional[str] = None
    container_code: Optional[str] = None
    seal_number: Optional[str] = None
    cargo_description: Optional[str] = None
    weight_kg: Optional[float] = None
    cbm: Optional[float] = None
    package_count: Optional[int] = None
    commodity_type: Optional[str] = None
    is_hazardous: Optional[bool] = None
    temperature_required: Optional[str] = None

    # Financials
    freight_charge: Optional[float] = None
    additional_charges: Optional[float] = None
    driver_payment: Optional[float] = None
    payment_status: Optional[str] = None
    driver_payment_status: Optional[str] = None

    # Notes
    internal_notes: Optional[str] = None
    driver_notes: Optional[str] = None
    customer_notes: Optional[str] = None

    # Assignment
    primary_driver_actor_id: Optional[str] = None
    primary_vehicle_id: Optional[str] = None

    # Metadata
    metadata: Optional[dict] = None
    tags: Optional[list] = None


class OrderAssignRequest(BaseModel):
    driver_actor_id: str
    vehicle_id: Optional[str] = None
    payment_amount: Optional[float] = None
    segment_number: int = 1
    segment_type: Optional[str] = None


class OrderResponse(BaseModel):
    id: str
    source_type: str
    owner_actor_id: str
    order_code: str
    external_code: Optional[str]
    status: str

    # Customer
    customer_actor_id: Optional[str]
    customer_name: Optional[str]
    customer_phone: Optional[str]
    customer_company: Optional[str]

    # Pickup
    pickup_address: Optional[str]
    pickup_city: Optional[str]
    pickup_contact: Optional[str]
    pickup_phone: Optional[str]
    pickup_time: Optional[datetime]

    # Delivery
    delivery_address: Optional[str]
    delivery_city: Optional[str]
    delivery_contact: Optional[str]
    delivery_phone: Optional[str]
    delivery_time: Optional[datetime]

    # Cargo
    equipment_type: Optional[str]
    container_code: Optional[str]
    cargo_description: Optional[str]
    weight_kg: Optional[float]

    # Financials
    freight_charge: Optional[float]
    driver_payment: Optional[float]
    payment_status: str
    driver_payment_status: str

    # Assignment
    primary_driver_actor_id: Optional[str]

    # Timeline
    created_at: datetime
    updated_at: datetime
    assigned_at: Optional[datetime]
    accepted_at: Optional[datetime]
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


# ============================================
# HELPER FUNCTIONS
# ============================================

def generate_order_code(session: Session, owner_actor_id: str, prefix: str = "ORD") -> str:
    """Generate a unique order code for an owner"""
    # Get or create sequence
    seq = session.exec(
        select(UnifiedOrderSequence).where(
            and_(
                UnifiedOrderSequence.actor_id == owner_actor_id,
                UnifiedOrderSequence.prefix == prefix
            )
        )
    ).first()

    if not seq:
        seq = UnifiedOrderSequence(
            id=str(uuid.uuid4()),
            actor_id=owner_actor_id,
            prefix=prefix,
            last_seq=0,
            year=datetime.utcnow().year
        )
        session.add(seq)

    seq.last_seq += 1
    session.add(seq)
    session.flush()

    return f"{prefix}-{seq.last_seq:05d}"


def log_status_change(
    session: Session,
    order_id: str,
    from_status: Optional[str],
    to_status: str,
    actor_id: Optional[str] = None,
    notes: Optional[str] = None
):
    """Log a status change for an order"""
    history = OrderStatusHistory(
        id=str(uuid.uuid4()),
        order_id=order_id,
        from_status=from_status,
        to_status=to_status,
        changed_by_actor_id=actor_id,
        changed_at=datetime.utcnow(),
        notes=notes
    )
    session.add(history)


# ============================================
# ORDER ENDPOINTS
# ============================================

@router.get("", response_model=List[OrderResponse])
async def list_orders(
    owner_actor_id: str = Query(..., description="Owner actor ID (required)"),
    source_type: Optional[str] = Query(None, description="Filter by source type"),
    status: Optional[str] = Query(None, description="Filter by status (comma-separated for multiple)"),
    driver_actor_id: Optional[str] = Query(None, description="Filter by assigned driver"),
    customer_name: Optional[str] = Query(None, description="Search by customer name"),
    container_code: Optional[str] = Query(None, description="Search by container code"),
    date_from: Optional[str] = Query(None, description="Filter by created date from (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Filter by created date to (YYYY-MM-DD)"),
    limit: int = Query(50, le=100),
    offset: int = Query(0),
    session: Session = Depends(get_session),
):
    """List orders for an owner actor"""
    query = select(UnifiedOrder).where(UnifiedOrder.owner_actor_id == owner_actor_id)

    if source_type:
        query = query.where(UnifiedOrder.source_type == source_type)

    if status:
        statuses = [s.strip() for s in status.split(",")]
        if len(statuses) == 1:
            query = query.where(UnifiedOrder.status == statuses[0])
        else:
            query = query.where(UnifiedOrder.status.in_(statuses))

    if driver_actor_id:
        query = query.where(UnifiedOrder.primary_driver_actor_id == driver_actor_id)

    if customer_name:
        query = query.where(UnifiedOrder.customer_name.ilike(f"%{customer_name}%"))

    if container_code:
        query = query.where(UnifiedOrder.container_code.ilike(f"%{container_code}%"))

    if date_from:
        query = query.where(UnifiedOrder.created_at >= date_from)

    if date_to:
        query = query.where(UnifiedOrder.created_at <= f"{date_to}T23:59:59")

    query = query.order_by(UnifiedOrder.created_at.desc()).offset(offset).limit(limit)
    orders = session.exec(query).all()
    return orders


@router.get("/assigned-to-me", response_model=List[OrderResponse])
async def list_orders_assigned_to_me(
    driver_actor_id: str = Query(..., description="Driver actor ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    session: Session = Depends(get_session),
):
    """List orders assigned to a driver"""
    query = select(UnifiedOrder).where(UnifiedOrder.primary_driver_actor_id == driver_actor_id)

    if status:
        statuses = [s.strip() for s in status.split(",")]
        if len(statuses) == 1:
            query = query.where(UnifiedOrder.status == statuses[0])
        else:
            query = query.where(UnifiedOrder.status.in_(statuses))

    query = query.order_by(UnifiedOrder.created_at.desc())
    orders = session.exec(query).all()
    return orders


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: str,
    session: Session = Depends(get_session),
):
    """Get a single order by ID"""
    order = session.get(UnifiedOrder, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.post("", response_model=OrderResponse)
async def create_order(
    owner_actor_id: str = Query(..., description="Owner actor ID"),
    data: OrderCreate = None,
    session: Session = Depends(get_session),
):
    """Create a new order"""
    # Verify owner exists
    owner = session.get(Actor, owner_actor_id)
    if not owner:
        raise HTTPException(status_code=404, detail="Owner actor not found")

    now = datetime.utcnow()

    # Generate order code if not provided
    order_code = data.order_code
    if not order_code:
        prefix = "DO" if data.source_type == OrderSourceType.DISPATCHER.value else "ORD"
        order_code = generate_order_code(session, owner_actor_id, prefix)

    # Calculate total
    total_charge = (data.freight_charge or 0) + (data.additional_charges or 0)

    order = UnifiedOrder(
        id=str(uuid.uuid4()),
        created_at=now,
        updated_at=now,
        source_type=data.source_type,
        owner_actor_id=owner_actor_id,
        order_code=order_code,
        external_code=data.external_code,
        status=OrderStatus.DRAFT.value,

        # Customer
        customer_actor_id=data.customer_actor_id,
        customer_name=data.customer_name,
        customer_phone=data.customer_phone,
        customer_company=data.customer_company,
        customer_email=data.customer_email,

        # Pickup
        pickup_location_id=data.pickup_location_id,
        pickup_address=data.pickup_address,
        pickup_city=data.pickup_city,
        pickup_district=data.pickup_district,
        pickup_contact=data.pickup_contact,
        pickup_phone=data.pickup_phone,
        pickup_time=data.pickup_time,
        pickup_notes=data.pickup_notes,

        # Delivery
        delivery_location_id=data.delivery_location_id,
        delivery_address=data.delivery_address,
        delivery_city=data.delivery_city,
        delivery_district=data.delivery_district,
        delivery_contact=data.delivery_contact,
        delivery_phone=data.delivery_phone,
        delivery_time=data.delivery_time,
        delivery_notes=data.delivery_notes,

        # Cargo
        equipment_type=data.equipment_type,
        container_code=data.container_code,
        seal_number=data.seal_number,
        cargo_description=data.cargo_description,
        weight_kg=data.weight_kg,
        cbm=data.cbm,
        package_count=data.package_count,
        commodity_type=data.commodity_type,
        is_hazardous=data.is_hazardous,
        temperature_required=data.temperature_required,

        # Financials
        currency=data.currency,
        freight_charge=data.freight_charge,
        additional_charges=data.additional_charges,
        total_charge=total_charge if total_charge > 0 else None,
        driver_payment=data.driver_payment,

        # Notes
        internal_notes=data.internal_notes,
        customer_notes=data.customer_notes,

        # Metadata
        metadata=data.metadata,
        tags=data.tags,
    )

    session.add(order)
    log_status_change(session, order.id, None, OrderStatus.DRAFT.value)
    session.commit()
    session.refresh(order)
    return order


@router.patch("/{order_id}", response_model=OrderResponse)
async def update_order(
    order_id: str,
    data: OrderUpdate,
    session: Session = Depends(get_session),
):
    """Update an order"""
    order = session.get(UnifiedOrder, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    old_status = order.status
    update_data = data.dict(exclude_unset=True)

    for key, value in update_data.items():
        setattr(order, key, value)

    # Update total if charges changed
    if "freight_charge" in update_data or "additional_charges" in update_data:
        order.total_charge = (order.freight_charge or 0) + (order.additional_charges or 0)

    order.updated_at = datetime.utcnow()

    # Log status change if status was updated
    if "status" in update_data and update_data["status"] != old_status:
        log_status_change(session, order_id, old_status, update_data["status"])

    session.add(order)
    session.commit()
    session.refresh(order)
    return order


@router.delete("/{order_id}")
async def delete_order(
    order_id: str,
    session: Session = Depends(get_session),
):
    """Delete an order (soft delete - sets status to CANCELLED)"""
    order = session.get(UnifiedOrder, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    old_status = order.status
    order.status = OrderStatus.CANCELLED.value
    order.cancelled_at = datetime.utcnow()
    order.updated_at = datetime.utcnow()

    log_status_change(session, order_id, old_status, OrderStatus.CANCELLED.value, notes="Order deleted")

    session.add(order)
    session.commit()
    return {"message": "Order cancelled successfully"}


# ============================================
# ASSIGNMENT ENDPOINTS
# ============================================

@router.post("/{order_id}/assign", response_model=OrderResponse)
async def assign_order(
    order_id: str,
    data: OrderAssignRequest,
    session: Session = Depends(get_session),
):
    """Assign an order to a driver"""
    order = session.get(UnifiedOrder, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Verify driver exists
    driver = session.get(Actor, data.driver_actor_id)
    if not driver:
        raise HTTPException(status_code=404, detail="Driver actor not found")

    now = datetime.utcnow()
    old_status = order.status

    # Update order
    order.primary_driver_actor_id = data.driver_actor_id
    order.primary_vehicle_id = data.vehicle_id
    if data.payment_amount is not None:
        order.driver_payment = data.payment_amount
    order.status = OrderStatus.ASSIGNED.value
    order.assigned_at = now
    order.updated_at = now

    # Create assignment record
    assignment = OrderAssignment(
        id=str(uuid.uuid4()),
        created_at=now,
        updated_at=now,
        order_id=order_id,
        driver_actor_id=data.driver_actor_id,
        vehicle_id=data.vehicle_id,
        assigned_by_actor_id=order.owner_actor_id,
        segment_number=data.segment_number,
        segment_type=data.segment_type,
        status="PENDING",
        payment_amount=data.payment_amount,
    )

    session.add(assignment)
    log_status_change(session, order_id, old_status, OrderStatus.ASSIGNED.value)

    session.add(order)
    session.commit()
    session.refresh(order)
    return order


@router.post("/{order_id}/unassign", response_model=OrderResponse)
async def unassign_order(
    order_id: str,
    session: Session = Depends(get_session),
):
    """Unassign an order from a driver"""
    order = session.get(UnifiedOrder, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if not order.primary_driver_actor_id:
        raise HTTPException(status_code=400, detail="Order is not assigned")

    old_status = order.status

    order.primary_driver_actor_id = None
    order.primary_vehicle_id = None
    order.status = OrderStatus.PENDING.value
    order.assigned_at = None
    order.updated_at = datetime.utcnow()

    log_status_change(session, order_id, old_status, OrderStatus.PENDING.value, notes="Driver unassigned")

    session.add(order)
    session.commit()
    session.refresh(order)
    return order


# ============================================
# STATUS WORKFLOW ENDPOINTS
# ============================================

@router.post("/{order_id}/accept", response_model=OrderResponse)
async def accept_order(
    order_id: str,
    driver_actor_id: str = Query(...),
    session: Session = Depends(get_session),
):
    """Driver accepts an assigned order"""
    order = session.get(UnifiedOrder, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.primary_driver_actor_id != driver_actor_id:
        raise HTTPException(status_code=403, detail="Not authorized - order not assigned to this driver")

    if order.status != OrderStatus.ASSIGNED.value:
        raise HTTPException(status_code=400, detail=f"Cannot accept order in status {order.status}")

    old_status = order.status
    order.status = OrderStatus.ACCEPTED.value
    order.accepted_at = datetime.utcnow()
    order.updated_at = datetime.utcnow()

    log_status_change(session, order_id, old_status, OrderStatus.ACCEPTED.value, actor_id=driver_actor_id)

    session.add(order)
    session.commit()
    session.refresh(order)
    return order


@router.post("/{order_id}/start", response_model=OrderResponse)
async def start_order(
    order_id: str,
    driver_actor_id: str = Query(...),
    session: Session = Depends(get_session),
):
    """Driver starts an order (begins transit)"""
    order = session.get(UnifiedOrder, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.primary_driver_actor_id != driver_actor_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    if order.status != OrderStatus.ACCEPTED.value:
        raise HTTPException(status_code=400, detail=f"Cannot start order in status {order.status}")

    old_status = order.status
    order.status = OrderStatus.IN_TRANSIT.value
    order.started_at = datetime.utcnow()
    order.updated_at = datetime.utcnow()

    log_status_change(session, order_id, old_status, OrderStatus.IN_TRANSIT.value, actor_id=driver_actor_id)

    session.add(order)
    session.commit()
    session.refresh(order)
    return order


@router.post("/{order_id}/pickup", response_model=OrderResponse)
async def pickup_order(
    order_id: str,
    driver_actor_id: str = Query(...),
    session: Session = Depends(get_session),
):
    """Driver picked up cargo"""
    order = session.get(UnifiedOrder, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.primary_driver_actor_id != driver_actor_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    order.picked_up_at = datetime.utcnow()
    order.updated_at = datetime.utcnow()

    session.add(order)
    session.commit()
    session.refresh(order)
    return order


@router.post("/{order_id}/deliver", response_model=OrderResponse)
async def deliver_order(
    order_id: str,
    driver_actor_id: str = Query(...),
    session: Session = Depends(get_session),
):
    """Driver delivered cargo"""
    order = session.get(UnifiedOrder, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.primary_driver_actor_id != driver_actor_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    if order.status != OrderStatus.IN_TRANSIT.value:
        raise HTTPException(status_code=400, detail=f"Cannot deliver order in status {order.status}")

    old_status = order.status
    order.status = OrderStatus.DELIVERED.value
    order.delivered_at = datetime.utcnow()
    order.updated_at = datetime.utcnow()

    log_status_change(session, order_id, old_status, OrderStatus.DELIVERED.value, actor_id=driver_actor_id)

    session.add(order)
    session.commit()
    session.refresh(order)
    return order


@router.post("/{order_id}/complete", response_model=OrderResponse)
async def complete_order(
    order_id: str,
    session: Session = Depends(get_session),
):
    """Mark order as completed (by owner/dispatcher)"""
    order = session.get(UnifiedOrder, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    old_status = order.status
    order.status = OrderStatus.COMPLETED.value
    order.completed_at = datetime.utcnow()
    order.updated_at = datetime.utcnow()

    log_status_change(session, order_id, old_status, OrderStatus.COMPLETED.value)

    session.add(order)
    session.commit()
    session.refresh(order)
    return order


# ============================================
# PAYMENT ENDPOINTS
# ============================================

@router.post("/{order_id}/mark-paid", response_model=OrderResponse)
async def mark_driver_paid(
    order_id: str,
    session: Session = Depends(get_session),
):
    """Mark driver payment as paid"""
    order = session.get(UnifiedOrder, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.driver_payment_status = PaymentStatus.PAID.value
    order.updated_at = datetime.utcnow()

    session.add(order)
    session.commit()
    session.refresh(order)
    return order


@router.post("/{order_id}/mark-customer-paid", response_model=OrderResponse)
async def mark_customer_paid(
    order_id: str,
    amount: Optional[float] = Query(None),
    session: Session = Depends(get_session),
):
    """Mark customer payment as paid"""
    order = session.get(UnifiedOrder, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if amount:
        order.amount_paid = amount
    order.payment_status = PaymentStatus.PAID.value
    order.updated_at = datetime.utcnow()

    session.add(order)
    session.commit()
    session.refresh(order)
    return order


# ============================================
# HISTORY ENDPOINTS
# ============================================

@router.get("/{order_id}/history")
async def get_order_history(
    order_id: str,
    session: Session = Depends(get_session),
):
    """Get status history for an order"""
    order = session.get(UnifiedOrder, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    history = session.exec(
        select(OrderStatusHistory)
        .where(OrderStatusHistory.order_id == order_id)
        .order_by(OrderStatusHistory.changed_at.desc())
    ).all()

    return history
