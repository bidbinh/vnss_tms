"""
OMS - Shipments API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from typing import Optional
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel

from app.db.session import get_session
from app.models import User
from app.models.oms import (
    OMSShipment, OMSShipmentItem, ShipmentType, ShipmentStatus,
    OMSOrder, OMSOrderItem
)
from app.services.oms.order_calculator import generate_shipment_number
from app.services.oms.status_logger import log_status_change
from app.core.security import get_current_user

router = APIRouter(prefix="/shipments", tags=["OMS - Shipments"])


# ============================================
# Schemas
# ============================================

class ShipmentItemCreate(BaseModel):
    order_item_id: str
    allocation_id: Optional[str] = None
    quantity: Decimal


class ShipmentCreate(BaseModel):
    order_id: str
    shipment_type: str
    pickup_location_id: Optional[str] = None
    pickup_location_name: Optional[str] = None
    pickup_address: Optional[str] = None
    pickup_date: Optional[datetime] = None
    delivery_address: Optional[str] = None
    delivery_contact_name: Optional[str] = None
    delivery_contact_phone: Optional[str] = None
    planned_delivery_date: Optional[datetime] = None
    carrier_name: Optional[str] = None
    carrier_contact: Optional[str] = None
    tracking_number: Optional[str] = None
    notes: Optional[str] = None
    items: list[ShipmentItemCreate]


@router.get("")
def list_shipments(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    order_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List shipments"""
    tenant_id = str(current_user.tenant_id)

    query = select(OMSShipment).where(OMSShipment.tenant_id == tenant_id)

    if order_id:
        query = query.where(OMSShipment.order_id == order_id)

    if status:
        query = query.where(OMSShipment.status == status)

    total = session.exec(
        select(func.count(OMSShipment.id)).where(OMSShipment.tenant_id == tenant_id)
    ).one()

    shipments = session.exec(
        query.order_by(OMSShipment.created_at.desc())
        .offset(skip)
        .limit(limit)
    ).all()

    return {
        "data": [s.model_dump() for s in shipments],
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.post("")
def create_shipment(
    payload: ShipmentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create shipment"""
    tenant_id = str(current_user.tenant_id)

    # Verify order
    order = session.get(OMSOrder, payload.order_id)
    if not order or str(order.tenant_id) != tenant_id:
        raise HTTPException(status_code=404, detail="Order not found")

    # Generate shipment number
    shipment_number = generate_shipment_number(tenant_id)

    # Create shipment
    shipment = OMSShipment(
        tenant_id=tenant_id,
        order_id=payload.order_id,
        shipment_number=shipment_number,
        shipment_type=payload.shipment_type,
        status=ShipmentStatus.PENDING.value,
        pickup_location_id=payload.pickup_location_id,
        pickup_location_name=payload.pickup_location_name,
        pickup_address=payload.pickup_address,
        pickup_date=payload.pickup_date,
        delivery_address=payload.delivery_address or order.delivery_address_text,
        delivery_contact_name=payload.delivery_contact_name or order.delivery_contact_name,
        delivery_contact_phone=payload.delivery_contact_phone or order.delivery_contact_phone,
        planned_delivery_date=payload.planned_delivery_date,
        carrier_name=payload.carrier_name,
        carrier_contact=payload.carrier_contact,
        tracking_number=payload.tracking_number,
        notes=payload.notes,
        created_by_id=str(current_user.id)
    )

    session.add(shipment)
    session.flush()

    # Create shipment items
    for item_data in payload.items:
        order_item = session.get(OMSOrderItem, item_data.order_item_id)
        if not order_item:
            continue

        shipment_item = OMSShipmentItem(
            tenant_id=tenant_id,
            shipment_id=shipment.id,
            order_item_id=item_data.order_item_id,
            allocation_id=item_data.allocation_id,
            quantity=item_data.quantity,
            product_id=order_item.product_id,
            product_code=order_item.product_code,
            product_name=order_item.product_name,
            product_unit=order_item.product_unit
        )
        session.add(shipment_item)

        # Update order item shipped quantity
        order_item.quantity_shipped += item_data.quantity

    # Log status
    log_status_change(
        session, "SHIPMENT", shipment.id,
        None, ShipmentStatus.PENDING.value,
        "Shipment created", tenant_id,
        str(current_user.id), current_user.role
    )

    session.commit()
    session.refresh(shipment)

    return shipment.model_dump()


@router.get("/{shipment_id}")
def get_shipment(
    shipment_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get shipment detail"""
    tenant_id = str(current_user.tenant_id)

    shipment = session.get(OMSShipment, shipment_id)
    if not shipment or str(shipment.tenant_id) != tenant_id:
        raise HTTPException(status_code=404, detail="Shipment not found")

    # Get items
    items = session.exec(
        select(OMSShipmentItem).where(OMSShipmentItem.shipment_id == shipment_id)
    ).all()

    result = shipment.model_dump()
    result["items"] = [item.model_dump() for item in items]

    return result
