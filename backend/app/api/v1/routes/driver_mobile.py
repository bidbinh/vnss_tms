from datetime import datetime
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import Optional

from app.db.session import get_session
from app.models import Trip, Shipment, Container, Stop, TripDocument, Driver
from app.models.hrm import DriverPayroll, DriverPayrollStatus


router = APIRouter(prefix="/driver", tags=["driver_mobile"])


def require_driver_id(x_driver_id: str | None = Header(default=None)) -> str:
    if not x_driver_id:
        raise HTTPException(401, "Missing X-Driver-Id header")
    return x_driver_id


def get_driver_tenant_id(driver_id: str, session: Session) -> str:
    """Get tenant_id from driver"""
    driver = session.get(Driver, driver_id)
    if not driver:
        raise HTTPException(404, "Driver not found")
    return str(driver.tenant_id)


@router.get("/trips")
def list_my_trips(
    status: str | None = None,
    x_driver_id: str = Depends(require_driver_id),
    session: Session = Depends(get_session),
):
    tenant_id = get_driver_tenant_id(x_driver_id, session)
    q = select(Trip).where(
        Trip.tenant_id == tenant_id,
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
    tenant_id = get_driver_tenant_id(x_driver_id, session)
    trip = session.get(Trip, trip_id)
    if not trip or trip.tenant_id != tenant_id:
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
        select(TripDocument).where(TripDocument.trip_id == trip_id, TripDocument.tenant_id == tenant_id)
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
    tenant_id = get_driver_tenant_id(x_driver_id, session)
    trip = session.get(Trip, trip_id)
    if not trip or trip.tenant_id != tenant_id:
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
    tenant_id = get_driver_tenant_id(x_driver_id, session)
    trip = session.get(Trip, trip_id)
    if not trip or trip.tenant_id != tenant_id:
        raise HTTPException(404, "Trip not found")
    if trip.driver_id != x_driver_id:
        raise HTTPException(403, "Not your trip")

    # rule: bắt buộc đủ EIR + POD
    doc_types = set(session.exec(
        select(TripDocument.doc_type).where(
            TripDocument.tenant_id == tenant_id,
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
    tenant_id = get_driver_tenant_id(x_driver_id, session)
    trip = session.get(Trip, trip_id)
    if not trip or trip.tenant_id != tenant_id:
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
    tenant_id = get_driver_tenant_id(x_driver_id, session)
    trip = session.get(Trip, trip_id)
    if not trip or trip.tenant_id != tenant_id:
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


# =============================================================================
# DRIVER PAYROLL ENDPOINTS
# =============================================================================

class DriverPayrollConfirmRequest(BaseModel):
    """Request body for driver payroll confirmation"""
    action: str  # "confirm" or "reject"
    notes: Optional[str] = None


@router.get("/payroll")
def list_my_payrolls(
    status: str | None = None,
    year: int | None = None,
    month: int | None = None,
    x_driver_id: str = Depends(require_driver_id),
    session: Session = Depends(get_session),
):
    """
    List driver's own payrolls (for mobile app).
    Filter by status (typically show PENDING_DRIVER_CONFIRM).
    """
    tenant_id = get_driver_tenant_id(x_driver_id, session)

    query = select(DriverPayroll).where(
        DriverPayroll.tenant_id == tenant_id,
        DriverPayroll.driver_id == x_driver_id,
    )

    if status:
        query = query.where(DriverPayroll.status == status)
    if year:
        query = query.where(DriverPayroll.year == year)
    if month:
        query = query.where(DriverPayroll.month == month)

    query = query.order_by(DriverPayroll.created_at.desc())

    payrolls = session.exec(query).all()

    # Return simplified response for mobile
    return [
        {
            "id": p.id,
            "year": p.year,
            "month": p.month,
            "status": p.status,
            "total_trips": p.total_trips,
            "total_distance_km": p.total_distance_km,
            "net_salary": p.net_salary,
            "created_at": p.created_at,
            "confirmed_by_driver_at": p.confirmed_by_driver_at,
        }
        for p in payrolls
    ]


@router.get("/payroll/{payroll_id}")
def get_my_payroll_detail(
    payroll_id: str,
    x_driver_id: str = Depends(require_driver_id),
    session: Session = Depends(get_session),
):
    """
    Get detailed payroll with trip breakdown for driver to review.
    """
    tenant_id = get_driver_tenant_id(x_driver_id, session)

    payroll = session.get(DriverPayroll, payroll_id)
    if not payroll or str(payroll.tenant_id) != tenant_id:
        raise HTTPException(404, "Payroll not found")

    if payroll.driver_id != x_driver_id:
        raise HTTPException(403, "Not your payroll")

    # Return full payroll details including trip snapshot
    return {
        "id": payroll.id,
        "year": payroll.year,
        "month": payroll.month,
        "status": payroll.status,
        "total_trips": payroll.total_trips,
        "total_distance_km": payroll.total_distance_km,
        "total_salary": payroll.total_salary,
        "total_bonuses": payroll.total_bonuses,
        "total_deductions": payroll.total_deductions,
        "net_salary": payroll.net_salary,
        "trip_snapshot": payroll.trip_snapshot,
        "notes": payroll.notes,
        "driver_notes": payroll.driver_notes,
        "created_at": payroll.created_at,
        "confirmed_by_driver_at": payroll.confirmed_by_driver_at,
        "paid_at": payroll.paid_at,
    }


@router.post("/payroll/{payroll_id}/confirm")
def confirm_my_payroll(
    payroll_id: str,
    payload: DriverPayrollConfirmRequest,
    x_driver_id: str = Depends(require_driver_id),
    session: Session = Depends(get_session),
):
    """
    Driver confirms or rejects payroll via mobile app.
    Actions: "confirm" or "reject"

    Once confirmed, distance_km is LOCKED and won't change even if rates are updated.
    """
    tenant_id = get_driver_tenant_id(x_driver_id, session)

    payroll = session.get(DriverPayroll, payroll_id)
    if not payroll or str(payroll.tenant_id) != tenant_id:
        raise HTTPException(404, "Payroll not found")

    if payroll.driver_id != x_driver_id:
        raise HTTPException(403, "Not your payroll")

    if payroll.status != DriverPayrollStatus.PENDING_DRIVER_CONFIRM.value:
        raise HTTPException(400, f"Cannot confirm payroll in status: {payroll.status}")

    if payload.action == "confirm":
        # LOCK distance_km - payroll is now confirmed
        payroll.status = DriverPayrollStatus.CONFIRMED.value
        payroll.confirmed_by_driver_at = datetime.utcnow()
        if payload.notes:
            payroll.driver_notes = payload.notes

        message = "Payroll confirmed successfully. Distance values are now locked."
    elif payload.action == "reject":
        # Driver rejects - needs to go back to HR for review
        payroll.status = DriverPayrollStatus.REJECTED.value
        payroll.driver_notes = payload.notes or "Rejected by driver"

        message = "Payroll rejected. HR will review your comments."
    else:
        raise HTTPException(400, "Invalid action. Must be 'confirm' or 'reject'")

    session.add(payroll)
    session.commit()

    return {
        "message": message,
        "status": payroll.status,
        "confirmed_at": payroll.confirmed_by_driver_at,
    }
