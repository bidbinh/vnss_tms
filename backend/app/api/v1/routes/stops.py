from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.db.session import get_session
from app.models import Shipment, Stop, User
from app.schemas.stop import StopCreate, StopRead
from app.core.security import get_current_user

router = APIRouter(prefix="/stops", tags=["stops"])


@router.post("", response_model=StopRead)
def create_stop(
    payload: StopCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    tenant_id = str(current_user.tenant_id)

    shp = session.exec(
        select(Shipment).where(Shipment.tenant_id == tenant_id, Shipment.id == payload.shipment_id)
    ).first()
    if not shp:
        raise HTTPException(status_code=404, detail="Shipment not found")

    if payload.seq <= 0:
        raise HTTPException(status_code=400, detail="seq must be >= 1")

    st = Stop(
        tenant_id=tenant_id,
        shipment_id=payload.shipment_id,
        seq=payload.seq,
        location_id=payload.location_id,
        stop_type=payload.stop_type,
        planned_time=payload.planned_time,
        note=payload.note,
    )
    session.add(st)
    session.commit()
    session.refresh(st)

    return StopRead(
        id=st.id,
        shipment_id=st.shipment_id,
        seq=st.seq,
        location_id=st.location_id,
        stop_type=st.stop_type,
        planned_time=st.planned_time,
        actual_time=st.actual_time,
        status=st.status,
    )
