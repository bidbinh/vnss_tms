from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db.session import get_session
from app.models import Order, Shipment, Container, Stop
from app.schemas.shipment import ShipmentCreate, ShipmentRead
from app.schemas.shipment_full import ShipmentFull

router = APIRouter(prefix="/shipments", tags=["shipments"])


def get_tenant_id_stub() -> str:
    return "TENANT_DEMO"


@router.post("", response_model=ShipmentRead)
def create_shipment(payload: ShipmentCreate, session: Session = Depends(get_session)):
    tenant_id = get_tenant_id_stub()

    order = session.exec(
        select(Order).where(Order.tenant_id == tenant_id, Order.id == payload.order_id)
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    shp = Shipment(
        tenant_id=tenant_id,
        order_id=payload.order_id,
        booking_no=payload.booking_no,
        bl_no=payload.bl_no,
        vessel=payload.vessel,
        etd=payload.etd,
        eta=payload.eta,
        free_time_days=payload.free_time_days,
        notes=payload.notes,
    )
    session.add(shp)
    session.commit()
    session.refresh(shp)

    return ShipmentRead(
        id=shp.id,
        order_id=shp.order_id,
        booking_no=shp.booking_no,
        bl_no=shp.bl_no,
        etd=shp.etd,
        eta=shp.eta,
        free_time_days=shp.free_time_days,
    )


@router.get("/{shipment_id}", response_model=ShipmentFull)
def get_shipment_full(shipment_id: str, session: Session = Depends(get_session)):
    tenant_id = get_tenant_id_stub()

    shp = session.exec(
        select(Shipment).where(
            Shipment.tenant_id == tenant_id,
            Shipment.id == shipment_id
        )
    ).first()

    if not shp:
        raise HTTPException(status_code=404, detail="Shipment not found")

    containers = session.exec(
        select(Container)
        .where(Container.shipment_id == shipment_id)
        .order_by(Container.container_no)
    ).all()

    stops = session.exec(
        select(Stop)
        .where(Stop.shipment_id == shipment_id)
        .order_by(Stop.seq)
    ).all()

    return ShipmentFull(
        shipment=shp,
        containers=containers,
        stops=stops,
    )


@router.get("", response_model=List[ShipmentRead])
def list_shipments(
    order_id: Optional[str] = None,
    session: Session = Depends(get_session)
):
    tenant_id = get_tenant_id_stub()

    q = select(Shipment).where(Shipment.tenant_id == tenant_id)

    if order_id:
        q = q.where(Shipment.order_id == order_id)

    q = q.order_by(Shipment.created_at.desc())

    return session.exec(q).all()
