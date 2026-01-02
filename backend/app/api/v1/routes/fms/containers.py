"""
FMS Containers API Routes
Quản lý container trong lô hàng
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from typing import Optional, List
from datetime import datetime, date
from pydantic import BaseModel

from app.db.session import get_session
from app.models.fms import FMSContainer, ContainerType, ContainerSize, ContainerStatus
from app.models import User
from app.core.security import get_current_user

router = APIRouter(prefix="/containers", tags=["FMS Containers"])


class ContainerCreate(BaseModel):
    shipment_id: str
    container_no: str
    seal_no: Optional[str] = None
    second_seal_no: Optional[str] = None
    container_type: str = ContainerType.DRY.value
    container_size: str = ContainerSize.C20GP.value
    tare_weight: float = 0
    package_qty: int = 0
    gross_weight: float = 0
    net_weight: float = 0
    volume: float = 0
    vgm: Optional[float] = None
    is_reefer: bool = False
    temperature: Optional[float] = None
    is_dg: bool = False
    dg_class: Optional[str] = None
    un_number: Optional[str] = None
    pickup_depot: Optional[str] = None
    stuffing_location: Optional[str] = None
    remarks: Optional[str] = None


class ContainerUpdate(BaseModel):
    container_no: Optional[str] = None
    seal_no: Optional[str] = None
    status: Optional[str] = None
    gross_weight: Optional[float] = None
    net_weight: Optional[float] = None
    volume: Optional[float] = None
    vgm: Optional[float] = None
    temperature: Optional[float] = None
    empty_pickup_date: Optional[datetime] = None
    stuffing_date: Optional[datetime] = None
    gate_in_date: Optional[datetime] = None
    loaded_date: Optional[datetime] = None
    discharged_date: Optional[datetime] = None
    gate_out_date: Optional[datetime] = None
    delivery_date: Optional[datetime] = None
    empty_return_date: Optional[datetime] = None
    pickup_depot: Optional[str] = None
    return_depot: Optional[str] = None
    detention_days: Optional[int] = None
    demurrage_days: Optional[int] = None
    remarks: Optional[str] = None


class ContainerResponse(BaseModel):
    id: str
    shipment_id: str
    container_no: str
    seal_no: Optional[str]
    container_type: str
    container_size: str
    status: str
    package_qty: int
    gross_weight: float
    volume: float
    vgm: Optional[float]
    is_reefer: bool
    temperature: Optional[float]
    is_dg: bool
    dg_class: Optional[str]
    empty_pickup_date: Optional[datetime]
    gate_in_date: Optional[datetime]
    loaded_date: Optional[datetime]
    discharged_date: Optional[datetime]
    delivery_date: Optional[datetime]
    empty_return_date: Optional[datetime]
    detention_days: int
    demurrage_days: int
    detention_cost: float
    demurrage_cost: float
    created_at: datetime


class ContainerListResponse(BaseModel):
    items: List[ContainerResponse]
    total: int


@router.get("", response_model=ContainerListResponse)
def list_containers(
    shipment_id: Optional[str] = None,
    status: Optional[str] = None,
    container_no: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List containers"""
    tenant_id = str(current_user.tenant_id)

    query = select(FMSContainer).where(FMSContainer.tenant_id == tenant_id)

    if shipment_id:
        query = query.where(FMSContainer.shipment_id == shipment_id)
    if status:
        query = query.where(FMSContainer.status == status)
    if container_no:
        query = query.where(FMSContainer.container_no.ilike(f"%{container_no}%"))

    query = query.order_by(FMSContainer.created_at.desc())
    containers = session.exec(query).all()

    return ContainerListResponse(
        items=[ContainerResponse(
            id=c.id,
            shipment_id=c.shipment_id,
            container_no=c.container_no,
            seal_no=c.seal_no,
            container_type=c.container_type,
            container_size=c.container_size,
            status=c.status,
            package_qty=c.package_qty,
            gross_weight=c.gross_weight,
            volume=c.volume,
            vgm=c.vgm,
            is_reefer=c.is_reefer,
            temperature=c.temperature,
            is_dg=c.is_dg,
            dg_class=c.dg_class,
            empty_pickup_date=c.empty_pickup_date,
            gate_in_date=c.gate_in_date,
            loaded_date=c.loaded_date,
            discharged_date=c.discharged_date,
            delivery_date=c.delivery_date,
            empty_return_date=c.empty_return_date,
            detention_days=c.detention_days,
            demurrage_days=c.demurrage_days,
            detention_cost=c.detention_cost,
            demurrage_cost=c.demurrage_cost,
            created_at=c.created_at,
        ) for c in containers],
        total=len(containers),
    )


@router.post("", response_model=ContainerResponse)
def create_container(
    payload: ContainerCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new container"""
    tenant_id = str(current_user.tenant_id)

    container = FMSContainer(
        tenant_id=tenant_id,
        created_by=str(current_user.id),
        **payload.model_dump()
    )

    session.add(container)
    session.commit()
    session.refresh(container)

    return ContainerResponse(
        id=container.id,
        shipment_id=container.shipment_id,
        container_no=container.container_no,
        seal_no=container.seal_no,
        container_type=container.container_type,
        container_size=container.container_size,
        status=container.status,
        package_qty=container.package_qty,
        gross_weight=container.gross_weight,
        volume=container.volume,
        vgm=container.vgm,
        is_reefer=container.is_reefer,
        temperature=container.temperature,
        is_dg=container.is_dg,
        dg_class=container.dg_class,
        empty_pickup_date=container.empty_pickup_date,
        gate_in_date=container.gate_in_date,
        loaded_date=container.loaded_date,
        discharged_date=container.discharged_date,
        delivery_date=container.delivery_date,
        empty_return_date=container.empty_return_date,
        detention_days=container.detention_days,
        demurrage_days=container.demurrage_days,
        detention_cost=container.detention_cost,
        demurrage_cost=container.demurrage_cost,
        created_at=container.created_at,
    )


@router.get("/{container_id}", response_model=ContainerResponse)
def get_container(
    container_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get container by ID"""
    tenant_id = str(current_user.tenant_id)

    container = session.exec(
        select(FMSContainer).where(
            FMSContainer.id == container_id,
            FMSContainer.tenant_id == tenant_id
        )
    ).first()

    if not container:
        raise HTTPException(status_code=404, detail="Container not found")

    return ContainerResponse(
        id=container.id,
        shipment_id=container.shipment_id,
        container_no=container.container_no,
        seal_no=container.seal_no,
        container_type=container.container_type,
        container_size=container.container_size,
        status=container.status,
        package_qty=container.package_qty,
        gross_weight=container.gross_weight,
        volume=container.volume,
        vgm=container.vgm,
        is_reefer=container.is_reefer,
        temperature=container.temperature,
        is_dg=container.is_dg,
        dg_class=container.dg_class,
        empty_pickup_date=container.empty_pickup_date,
        gate_in_date=container.gate_in_date,
        loaded_date=container.loaded_date,
        discharged_date=container.discharged_date,
        delivery_date=container.delivery_date,
        empty_return_date=container.empty_return_date,
        detention_days=container.detention_days,
        demurrage_days=container.demurrage_days,
        detention_cost=container.detention_cost,
        demurrage_cost=container.demurrage_cost,
        created_at=container.created_at,
    )


@router.put("/{container_id}", response_model=ContainerResponse)
def update_container(
    container_id: str,
    payload: ContainerUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a container"""
    tenant_id = str(current_user.tenant_id)

    container = session.exec(
        select(FMSContainer).where(
            FMSContainer.id == container_id,
            FMSContainer.tenant_id == tenant_id
        )
    ).first()

    if not container:
        raise HTTPException(status_code=404, detail="Container not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(container, key, value)

    container.updated_at = datetime.utcnow()
    container.updated_by = str(current_user.id)

    session.add(container)
    session.commit()
    session.refresh(container)

    return ContainerResponse(
        id=container.id,
        shipment_id=container.shipment_id,
        container_no=container.container_no,
        seal_no=container.seal_no,
        container_type=container.container_type,
        container_size=container.container_size,
        status=container.status,
        package_qty=container.package_qty,
        gross_weight=container.gross_weight,
        volume=container.volume,
        vgm=container.vgm,
        is_reefer=container.is_reefer,
        temperature=container.temperature,
        is_dg=container.is_dg,
        dg_class=container.dg_class,
        empty_pickup_date=container.empty_pickup_date,
        gate_in_date=container.gate_in_date,
        loaded_date=container.loaded_date,
        discharged_date=container.discharged_date,
        delivery_date=container.delivery_date,
        empty_return_date=container.empty_return_date,
        detention_days=container.detention_days,
        demurrage_days=container.demurrage_days,
        detention_cost=container.detention_cost,
        demurrage_cost=container.demurrage_cost,
        created_at=container.created_at,
    )


@router.delete("/{container_id}")
def delete_container(
    container_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete a container"""
    tenant_id = str(current_user.tenant_id)

    container = session.exec(
        select(FMSContainer).where(
            FMSContainer.id == container_id,
            FMSContainer.tenant_id == tenant_id
        )
    ).first()

    if not container:
        raise HTTPException(status_code=404, detail="Container not found")

    session.delete(container)
    session.commit()

    return {"message": "Container deleted successfully"}


@router.post("/{container_id}/update-status")
def update_container_status(
    container_id: str,
    status: str,
    event_date: Optional[datetime] = None,
    location: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update container status with timestamp"""
    tenant_id = str(current_user.tenant_id)

    container = session.exec(
        select(FMSContainer).where(
            FMSContainer.id == container_id,
            FMSContainer.tenant_id == tenant_id
        )
    ).first()

    if not container:
        raise HTTPException(status_code=404, detail="Container not found")

    event_time = event_date or datetime.utcnow()

    # Update status and corresponding date field
    container.status = status

    if status == ContainerStatus.EMPTY.value:
        container.empty_pickup_date = event_time
        if location:
            container.pickup_depot = location
    elif status == ContainerStatus.LOADED.value:
        container.stuffing_date = event_time
        if location:
            container.stuffing_location = location
    elif status == ContainerStatus.GATE_IN.value:
        container.gate_in_date = event_time
        if location:
            container.origin_terminal = location
    elif status == ContainerStatus.ON_VESSEL.value:
        container.loaded_date = event_time
    elif status == ContainerStatus.DISCHARGED.value:
        container.discharged_date = event_time
        if location:
            container.destination_terminal = location
    elif status == ContainerStatus.GATE_OUT.value:
        container.gate_out_date = event_time
    elif status == ContainerStatus.DELIVERED.value:
        container.delivery_date = event_time
    elif status == ContainerStatus.RETURNED.value:
        container.empty_return_date = event_time
        if location:
            container.return_depot = location

    container.updated_at = datetime.utcnow()
    container.updated_by = str(current_user.id)

    session.add(container)
    session.commit()

    return {"message": f"Container status updated to {status}"}
