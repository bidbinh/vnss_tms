from __future__ import annotations

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db.session import get_session
from app.models.trip import Trip
from app.models.shipment import Shipment
from app.models.location import Location
from app.models.trip_stop import TripStop
from app.schemas.trip import (
    TripCreate,
    TripUpdate,
    TripRead,
    TripReadWithStops,
    TripAssignRequest,
    TripStopRead,
)
from app.models.trip_shipment import TripShipment
from app.schemas.trip_shipment import TripShipmentRead, TripShipmentsSetRequest

router = APIRouter(prefix="/trips", tags=["trips"])


def get_tenant_id_stub() -> str:
    return "TENANT_DEMO"


@router.get("", response_model=list[TripRead])
@router.get("/", response_model=list[TripRead])
def list_trips(session: Session = Depends(get_session)):
    tenant_id = get_tenant_id_stub()
    q = select(Trip).where(Trip.tenant_id == tenant_id).order_by(Trip.updated_at.desc())
    return session.exec(q).all()


@router.post("", response_model=TripRead)
@router.post("/", response_model=TripRead)
def create_trip(payload: TripCreate, session: Session = Depends(get_session)):
    tenant_id = get_tenant_id_stub()

    shp = session.exec(
        select(Shipment).where(Shipment.id == payload.shipment_id, Shipment.tenant_id == tenant_id)
    ).first()
    if not shp:
        raise HTTPException(400, "Shipment not found")

    trip = Trip(
        tenant_id=tenant_id,
        shipment_id=payload.shipment_id,
        trip_type=payload.trip_type,
        status="DRAFT",
        route_code=payload.route_code,
        distance_km=payload.distance_km,
    )
    session.add(trip)
    session.commit()
    session.refresh(trip)
    return trip


@router.get("/{trip_id}", response_model=TripReadWithStops)
def get_trip(trip_id: str, session: Session = Depends(get_session)):
    tenant_id = get_tenant_id_stub()

    trip = session.exec(select(Trip).where(Trip.id == trip_id, Trip.tenant_id == tenant_id)).first()
    if not trip:
        raise HTTPException(404, "Trip not found")

    stops = session.exec(
        select(TripStop)
        .where(TripStop.trip_id == trip_id, TripStop.tenant_id == tenant_id)
        .order_by(TripStop.seq)
    ).all()

    return TripReadWithStops(
        **trip.model_dump(),
        stops=[TripStopRead(**s.model_dump()) for s in stops],
    )


@router.put("/{trip_id}", response_model=TripRead)
def update_trip(trip_id: str, payload: TripUpdate, session: Session = Depends(get_session)):
    tenant_id = get_tenant_id_stub()
    trip = session.exec(select(Trip).where(Trip.id == trip_id, Trip.tenant_id == tenant_id)).first()
    if not trip:
        raise HTTPException(404, "Trip not found")

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(trip, k, v)

    trip.updated_at = datetime.utcnow()
    session.add(trip)
    session.commit()
    session.refresh(trip)
    return trip


@router.post("/{trip_id}/assign")
def assign_trip(trip_id: str, payload: TripAssignRequest, session: Session = Depends(get_session)):
    tenant_id = get_tenant_id_stub()

    trip = session.exec(select(Trip).where(Trip.id == trip_id, Trip.tenant_id == tenant_id)).first()
    if not trip:
        raise HTTPException(404, "Trip not found")

    if not payload.stops:
        raise HTTPException(400, "stops is required")

    # validate seq unique
    seqs = [s.seq for s in payload.stops]
    if len(seqs) != len(set(seqs)):
        raise HTTPException(400, "Duplicate seq in stops")

    # validate locations exist
    location_ids = [s.location_id for s in payload.stops]
    existing = session.exec(
        select(Location.id).where(Location.tenant_id == tenant_id, Location.id.in_(location_ids))
    ).all()
    if len(existing) != len(set(location_ids)):
        raise HTTPException(400, "One or more location_id not found")

    # assign resources
    if payload.vehicle_id is not None:
        trip.vehicle_id = payload.vehicle_id
    if payload.driver_id is not None:
        trip.driver_id = payload.driver_id
    if payload.trailer_id is not None:
        trip.trailer_id = payload.trailer_id

    # delete-old stops
    old = session.exec(
        select(TripStop).where(TripStop.trip_id == trip_id, TripStop.tenant_id == tenant_id)
    ).all()
    for s in old:
        session.delete(s)

    # insert new stops
    for s in sorted(payload.stops, key=lambda x: x.seq):
        session.add(
            TripStop(
                tenant_id=tenant_id,
                trip_id=trip_id,
                seq=s.seq,
                stop_type=s.stop_type,
                location_id=s.location_id,
                planned_at=s.planned_at,
                notes=s.notes,
            )
        )

    if trip.status == "DRAFT":
        trip.status = "DISPATCHED"
        trip.dispatched_at = trip.dispatched_at or datetime.utcnow()

    trip.updated_at = datetime.utcnow()
    session.add(trip)
    session.commit()

    return {"ok": True, "trip_id": trip_id, "stops": len(payload.stops)}

@router.get("/{trip_id}/shipments", response_model=list[TripShipmentRead])
def list_trip_shipments(trip_id: str, session: Session = Depends(get_session)):
    tenant_id = get_tenant_id_stub()

    trip = session.exec(select(Trip).where(Trip.id == trip_id, Trip.tenant_id == tenant_id)).first()
    if not trip:
        raise HTTPException(404, "Trip not found")

    q = (
        select(TripShipment)
        .where(TripShipment.trip_id == trip_id, TripShipment.tenant_id == tenant_id)
        .order_by(TripShipment.seq)
    )
    return session.exec(q).all()

@router.post("/{trip_id}/shipments")
def set_trip_shipments(trip_id: str, payload: TripShipmentsSetRequest, session: Session = Depends(get_session)):
    tenant_id = get_tenant_id_stub()

    trip = session.exec(select(Trip).where(Trip.id == trip_id, Trip.tenant_id == tenant_id)).first()
    if not trip:
        raise HTTPException(404, "Trip not found")

    if not payload.items:
        raise HTTPException(400, "items is required")

    # validate shipment tồn tại
    shipment_ids = [str(i.shipment_id) for i in payload.items]
    existing = session.exec(
        select(Shipment.id).where(Shipment.tenant_id == tenant_id, Shipment.id.in_(shipment_ids))
    ).all()
    if len(existing) != len(set(shipment_ids)):
        raise HTTPException(400, "One or more shipment_id not found")

    # xoá hết cũ
    old = session.exec(
        select(TripShipment).where(TripShipment.trip_id == trip_id, TripShipment.tenant_id == tenant_id)
    ).all()
    for x in old:
        session.delete(x)

    # insert mới
    for item in sorted(payload.items, key=lambda x: x.seq):
        session.add(
            TripShipment(
                tenant_id=tenant_id,
                trip_id=trip_id,
                shipment_id=item.shipment_id,
                seq=item.seq,
            )
        )

    trip.updated_at = datetime.utcnow()
    session.add(trip)
    session.commit()

    return {"ok": True, "trip_id": trip_id, "count": len(payload.items)}



