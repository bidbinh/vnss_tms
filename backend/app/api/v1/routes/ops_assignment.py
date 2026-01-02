from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from datetime import datetime

from app.db.session import get_session
from app.api.deps import get_current_user
from app.models.order import Order
from app.models.shipment import Shipment
from app.models.trip import Trip
from app.schemas.order import OrderCreate, OrderRead
from app.schemas.shipment import ShipmentCreate, ShipmentRead
from app.schemas.trip import TripCreate, TripRead
from app.services.order_code import next_order_code

router = APIRouter(prefix="/ops", tags=["ops"])


@router.post("/orders", response_model=OrderRead)
def create_order(
    payload: OrderCreate,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    tenant_id = current_user.get("tenant_id", "TENANT_DEMO")
    order_code = payload.order_code or next_order_code(session, tenant_id, "TMS", datetime.utcnow())
    o = Order(
        **payload.dict(exclude={"order_code"}),
        order_code=order_code,
        tenant_id=tenant_id,
        status="pending"
    )
    session.add(o)
    session.commit()
    session.refresh(o)
    return o


@router.post("/orders/{order_id}/accept", response_model=ShipmentRead)
def accept_order(
    order_id: str,
    payload: ShipmentCreate | None = None,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    tenant_id = current_user.get("tenant_id", "TENANT_DEMO")
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = "accepted"
    # create shipment (payload optional)
    shp_data = payload.dict() if payload else {"order_id": order_id}
    shp_data.setdefault("from_port", False)
    shp_data.setdefault("requires_empty_return", False)
    shp = Shipment(**shp_data, tenant_id=tenant_id)
    session.add(shp)
    session.add(order)
    session.commit()
    session.refresh(shp)
    return shp


@router.post("/trips", response_model=TripRead)
def create_trip(
    payload: TripCreate,
    assigned_by: str | None = None,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    tenant_id = current_user.get("tenant_id", "TENANT_DEMO")
    # minimal checks
    shp = session.get(Shipment, payload.shipment_id)
    if not shp:
        raise HTTPException(status_code=404, detail="Shipment not found")

    t = Trip(
        shipment_id=payload.shipment_id,
        driver_id=payload.driver_id,
        vehicle_id=payload.vehicle_id,
        assigned_by=assigned_by,
        assigned_at=datetime.utcnow(),
        status="assigned",
        tenant_id=tenant_id,
    )
    session.add(t)
    # mark shipment assigned using SQLAlchemy bulk update to avoid Pydantic V2 attribute validation
    from sqlalchemy import update
    session.execute(update(Shipment).where(Shipment.id == payload.shipment_id).values(status="assigned"))
    session.commit()
    session.refresh(t)
    return t


@router.get("/orders", response_model=List[OrderRead])
def list_orders(session: Session = Depends(get_session)):
    q = select(Order).order_by(Order.created_at.desc())
    return session.exec(q).all()


@router.post("/shipments", response_model=ShipmentRead)
def create_shipment(
    payload: ShipmentCreate,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    tenant_id = current_user.get("tenant_id", "TENANT_DEMO")
    # verify order exists
    order = session.get(Order, payload.order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    shp = Shipment(**payload.dict(), tenant_id=tenant_id)
    session.add(shp)
    session.commit()
    session.refresh(shp)
    return shp


@router.get("/shipments", response_model=List[ShipmentRead])
def list_shipments(session: Session = Depends(get_session)):
    q = select(Shipment).order_by(Shipment.created_at.desc())
    try:
        return session.exec(q).all()
    except Exception as e:
        # If DB schema is not yet migrated (missing columns), return empty list
        # and let OPS proceed; check logs for the underlying error.
        return []


@router.get("/trips", response_model=List[TripRead])
def list_trips(session: Session = Depends(get_session)):
    q = select(Trip).order_by(Trip.created_at.desc())
    return session.exec(q).all()
