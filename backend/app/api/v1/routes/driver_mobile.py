from datetime import datetime
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlmodel import Session, select

from app.db.session import get_session
from app.models import Trip, Shipment, Container, Stop, TripDocument


router = APIRouter(prefix="/driver", tags=["driver_mobile"])

def tenant() -> str:
    return "TENANT_DEMO"

def require_driver_id(x_driver_id: str | None = Header(default=None)) -> str:
    if not x_driver_id:
        raise HTTPException(401, "Missing X-Driver-Id header")
    return x_driver_id

@router.get("/trips")
def list_my_trips(
    status: str | None = None,
    x_driver_id: str = Depends(require_driver_id),
    session: Session = Depends(get_session),
):
    q = select(Trip).where(
        Trip.tenant_id == tenant(),
        Trip.driver_id == x_driver_id,
    )
    if status:
        q = q.where(Trip.status == status)
    q = q.order_by(Trip.created_at.desc())
    return session.exec(q).all()

@router.get("/trips/{trip_id}")
def get_trip_detail(
    trip_id: str,
    x_driver_id: str = Depends(require_driver_id),
    session: Session = Depends(get_session),
):
    trip = session.get(Trip, trip_id)
    if not trip or trip.tenant_id != tenant():
        raise HTTPException(404, "Trip not found")
    if trip.driver_id != x_driver_id:
        raise HTTPException(403, "Not your trip")

    shipment = session.get(Shipment, trip.shipment_id)
    containers = session.exec(
        select(Container).where(Container.shipment_id == trip.shipment_id).order_by(Container.container_no)
    ).all()
    stops = session.exec(
        select(Stop).where(Stop.shipment_id == trip.shipment_id).order_by(Stop.seq)
    ).all()
    docs = session.exec(
        select(TripDocument).where(TripDocument.trip_id == trip_id, TripDocument.tenant_id == tenant())
        .order_by(TripDocument.uploaded_at.desc())
    ).all()

    return {
        "trip": trip,
        "shipment": shipment,
        "containers": containers,
        "stops": stops,
        "documents": [
            {
                "id": d.id,
                "doc_type": d.doc_type,
                "original_name": d.original_name,
                "uploaded_at": d.uploaded_at,
            } for d in docs
        ],
    }

@router.post("/trips/{trip_id}/start")
def start_my_trip(
    trip_id: str,
    x_driver_id: str = Depends(require_driver_id),
    session: Session = Depends(get_session),
):
    trip = session.get(Trip, trip_id)
    if not trip or trip.tenant_id != tenant():
        raise HTTPException(404, "Trip not found")
    if trip.driver_id != x_driver_id:
        raise HTTPException(403, "Not your trip")

    trip.status = "IN_PROGRESS"
    trip.started_at = datetime.utcnow()
    session.commit()
    session.refresh(trip)
    return trip

@router.post("/trips/{trip_id}/complete")
def complete_my_trip(
    trip_id: str,
    x_driver_id: str = Depends(require_driver_id),
    session: Session = Depends(get_session),
):
    trip = session.get(Trip, trip_id)
    if not trip or trip.tenant_id != tenant():
        raise HTTPException(404, "Trip not found")
    if trip.driver_id != x_driver_id:
        raise HTTPException(403, "Not your trip")

    # rule: bắt buộc đủ EIR + POD
    doc_types = set(session.exec(
        select(TripDocument.doc_type).where(
            TripDocument.tenant_id == tenant(),
            TripDocument.trip_id == trip_id,
        )
    ).all())
    missing = [x for x in ("EIR", "POD") if x not in doc_types]
    if missing:
        raise HTTPException(400, f"Missing documents: {', '.join(missing)}")

    trip.status = "COMPLETED"
    trip.completed_at = datetime.utcnow()
    session.commit()
    session.refresh(trip)
    return trip

@router.post("/trips/{trip_id}/stops/{stop_id}/arrive")
def arrive_stop(
    trip_id: str,
    stop_id: str,
    x_driver_id: str = Depends(require_driver_id),
    session: Session = Depends(get_session),
):
    trip = session.get(Trip, trip_id)
    if not trip or trip.tenant_id != tenant():
        raise HTTPException(404, "Trip not found")
    if trip.driver_id != x_driver_id:
        raise HTTPException(403, "Not your trip")

    st = session.get(Stop, stop_id)
    if not st or st.shipment_id != trip.shipment_id:
        raise HTTPException(404, "Stop not found")

    st.status = "Arrived"
    if not st.actual_time:
        st.actual_time = datetime.utcnow()
    session.commit()
    session.refresh(st)
    return st

@router.post("/trips/{trip_id}/stops/{stop_id}/done")
def done_stop(
    trip_id: str,
    stop_id: str,
    x_driver_id: str = Depends(require_driver_id),
    session: Session = Depends(get_session),
):
    trip = session.get(Trip, trip_id)
    if not trip or trip.tenant_id != tenant():
        raise HTTPException(404, "Trip not found")
    if trip.driver_id != x_driver_id:
        raise HTTPException(403, "Not your trip")

    st = session.get(Stop, stop_id)
    if not st or st.shipment_id != trip.shipment_id:
        raise HTTPException(404, "Stop not found")

    st.status = "Done"
    if not st.actual_time:
        st.actual_time = datetime.utcnow()
    session.commit()
    session.refresh(st)
    return st
