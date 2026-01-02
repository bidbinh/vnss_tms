from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from app.db.session import get_session
from app.models import Trailer

router = APIRouter(prefix="/trailers", tags=["trailers"])
def tenant(): return "TENANT_DEMO"

@router.post("")
def create_trailer(payload: dict, session: Session = Depends(get_session)):
    t = Trailer(tenant_id=tenant(), plate_no=payload["plate_no"])
    session.add(t); session.commit(); session.refresh(t); return t

@router.get("")
def list_trailers(session: Session = Depends(get_session)):
    return session.exec(select(Trailer).where(Trailer.tenant_id==tenant())).all()
