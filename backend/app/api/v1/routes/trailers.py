from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from app.db.session import get_session
from app.models import Trailer, User
from app.core.security import get_current_user

router = APIRouter(prefix="/trailers", tags=["trailers"])


@router.post("")
def create_trailer(
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    tenant_id = str(current_user.tenant_id)
    t = Trailer(tenant_id=tenant_id, plate_no=payload["plate_no"])
    session.add(t)
    session.commit()
    session.refresh(t)
    return t


@router.get("")
def list_trailers(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    tenant_id = str(current_user.tenant_id)
    return session.exec(select(Trailer).where(Trailer.tenant_id == tenant_id)).all()
