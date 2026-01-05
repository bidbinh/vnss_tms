from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.db.session import get_session
from app.models import Shipment, Container, User
from app.schemas.container import ContainerCreate, ContainerRead
from app.core.security import get_current_user

router = APIRouter(prefix="/containers", tags=["containers"])


@router.post("", response_model=ContainerRead)
def create_container(
    payload: ContainerCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    tenant_id = str(current_user.tenant_id)

    shp = session.exec(
        select(Shipment).where(Shipment.tenant_id == tenant_id, Shipment.id == payload.shipment_id)
    ).first()
    if not shp:
        raise HTTPException(status_code=404, detail="Shipment not found")

    cont = Container(
        tenant_id=tenant_id,
        shipment_id=payload.shipment_id,
        container_no=payload.container_no.strip().upper(),
        size=payload.size,
        type=payload.type,
        seal_no=payload.seal_no,
    )
    session.add(cont)
    session.commit()
    session.refresh(cont)

    return ContainerRead(
        id=cont.id,
        shipment_id=cont.shipment_id,
        container_no=cont.container_no,
        size=cont.size,
        type=cont.type,
        seal_no=cont.seal_no,
    )
