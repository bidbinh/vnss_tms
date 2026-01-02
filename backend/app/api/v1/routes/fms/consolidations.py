"""
FMS Consolidation API Routes
Quản lý gom hàng LCL/Air
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from typing import Optional, List
from datetime import datetime, date
from pydantic import BaseModel

from app.db.session import get_session
from app.models.fms import (
    Consolidation, ConsolidationItem, ConsolidationType, ConsolidationStatus,
    FMSShipment
)
from app.models import User
from app.core.security import get_current_user

router = APIRouter(prefix="/consolidations", tags=["FMS Consolidations"])


class ConsolidationCreate(BaseModel):
    consol_type: str = ConsolidationType.LCL.value
    origin_port: str
    origin_port_name: Optional[str] = None
    destination_port: str
    destination_port_name: Optional[str] = None

    carrier_name: Optional[str] = None
    vessel_name: Optional[str] = None
    voyage_no: Optional[str] = None
    flight_no: Optional[str] = None

    etd: Optional[date] = None
    eta: Optional[date] = None

    master_bl_no: Optional[str] = None
    master_awb_no: Optional[str] = None

    remarks: Optional[str] = None


class ConsolidationResponse(BaseModel):
    id: str
    consol_no: str
    consol_type: str
    status: str

    origin_port: str
    origin_port_name: Optional[str]
    destination_port: str
    destination_port_name: Optional[str]

    carrier_name: Optional[str]
    vessel_name: Optional[str]
    voyage_no: Optional[str]
    flight_no: Optional[str]

    etd: Optional[date]
    eta: Optional[date]
    atd: Optional[date]
    ata: Optional[date]

    master_bl_no: Optional[str]
    master_awb_no: Optional[str]

    total_packages: int
    total_gross_weight: float
    total_volume: float
    total_chargeable_weight: float

    house_count: int

    created_at: datetime


class ConsolidationListResponse(BaseModel):
    items: List[ConsolidationResponse]
    total: int
    page: int
    page_size: int


class ConsolidationItemCreate(BaseModel):
    shipment_id: str
    house_bl_no: Optional[str] = None
    house_awb_no: Optional[str] = None
    packages: int = 0
    gross_weight: float = 0
    volume: float = 0
    chargeable_weight: float = 0
    remarks: Optional[str] = None


class ConsolidationItemResponse(BaseModel):
    id: str
    consolidation_id: str
    shipment_id: str
    house_bl_no: Optional[str]
    house_awb_no: Optional[str]
    packages: int
    gross_weight: float
    volume: float
    chargeable_weight: float
    remarks: Optional[str]

    # Shipment info
    shipment_no: Optional[str] = None
    shipper_name: Optional[str] = None
    consignee_name: Optional[str] = None


def generate_consol_no(session: Session, tenant_id: str, consol_type: str) -> str:
    """Generate consolidation number"""
    year = datetime.now().year
    prefix = "CL" if consol_type == ConsolidationType.LCL.value else "CA"

    # Count existing consols this year
    count = session.exec(
        select(func.count(Consolidation.id)).where(
            Consolidation.tenant_id == tenant_id,
            Consolidation.consol_no.like(f"{prefix}-{year}-%"),
        )
    ).one()

    return f"{prefix}-{year}-{(count + 1):05d}"


@router.get("", response_model=ConsolidationListResponse)
def list_consolidations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    consol_type: Optional[str] = None,
    status: Optional[str] = None,
    origin_port: Optional[str] = None,
    destination_port: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List consolidations"""
    tenant_id = str(current_user.tenant_id)

    query = select(Consolidation).where(
        Consolidation.tenant_id == tenant_id,
        Consolidation.is_deleted == False,
    )

    if consol_type:
        query = query.where(Consolidation.consol_type == consol_type)
    if status:
        query = query.where(Consolidation.status == status)
    if origin_port:
        query = query.where(Consolidation.origin_port == origin_port)
    if destination_port:
        query = query.where(Consolidation.destination_port == destination_port)

    total = session.exec(select(func.count()).select_from(query.subquery())).one()

    query = query.order_by(Consolidation.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    consols = session.exec(query).all()

    # Get house counts
    consol_ids = [c.id for c in consols]
    house_counts = {}
    if consol_ids:
        counts = session.exec(
            select(
                ConsolidationItem.consolidation_id,
                func.count(ConsolidationItem.id)
            ).where(
                ConsolidationItem.consolidation_id.in_(consol_ids),
                ConsolidationItem.is_deleted == False,
            ).group_by(ConsolidationItem.consolidation_id)
        ).all()
        house_counts = {c[0]: c[1] for c in counts}

    return ConsolidationListResponse(
        items=[ConsolidationResponse(
            id=c.id,
            consol_no=c.consol_no,
            consol_type=c.consol_type,
            status=c.status,
            origin_port=c.origin_port,
            origin_port_name=c.origin_port_name,
            destination_port=c.destination_port,
            destination_port_name=c.destination_port_name,
            carrier_name=c.carrier_name,
            vessel_name=c.vessel_name,
            voyage_no=c.voyage_no,
            flight_no=c.flight_no,
            etd=c.etd,
            eta=c.eta,
            atd=c.atd,
            ata=c.ata,
            master_bl_no=c.master_bl_no,
            master_awb_no=c.master_awb_no,
            total_packages=c.total_packages or 0,
            total_gross_weight=c.total_gross_weight or 0,
            total_volume=c.total_volume or 0,
            total_chargeable_weight=c.total_chargeable_weight or 0,
            house_count=house_counts.get(c.id, 0),
            created_at=c.created_at,
        ) for c in consols],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=ConsolidationResponse)
def create_consolidation(
    payload: ConsolidationCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new consolidation"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    consol_no = generate_consol_no(session, tenant_id, payload.consol_type)

    consol = Consolidation(
        tenant_id=tenant_id,
        consol_no=consol_no,
        created_by=user_id,
        **payload.model_dump()
    )

    session.add(consol)
    session.commit()
    session.refresh(consol)

    return ConsolidationResponse(
        id=consol.id,
        consol_no=consol.consol_no,
        consol_type=consol.consol_type,
        status=consol.status,
        origin_port=consol.origin_port,
        origin_port_name=consol.origin_port_name,
        destination_port=consol.destination_port,
        destination_port_name=consol.destination_port_name,
        carrier_name=consol.carrier_name,
        vessel_name=consol.vessel_name,
        voyage_no=consol.voyage_no,
        flight_no=consol.flight_no,
        etd=consol.etd,
        eta=consol.eta,
        atd=consol.atd,
        ata=consol.ata,
        master_bl_no=consol.master_bl_no,
        master_awb_no=consol.master_awb_no,
        total_packages=consol.total_packages or 0,
        total_gross_weight=consol.total_gross_weight or 0,
        total_volume=consol.total_volume or 0,
        total_chargeable_weight=consol.total_chargeable_weight or 0,
        house_count=0,
        created_at=consol.created_at,
    )


@router.get("/{consol_id}", response_model=ConsolidationResponse)
def get_consolidation(
    consol_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get consolidation by ID"""
    tenant_id = str(current_user.tenant_id)

    consol = session.exec(
        select(Consolidation).where(
            Consolidation.id == consol_id,
            Consolidation.tenant_id == tenant_id,
            Consolidation.is_deleted == False,
        )
    ).first()

    if not consol:
        raise HTTPException(status_code=404, detail="Consolidation not found")

    # Count houses
    house_count = session.exec(
        select(func.count(ConsolidationItem.id)).where(
            ConsolidationItem.consolidation_id == consol_id,
            ConsolidationItem.is_deleted == False,
        )
    ).one()

    return ConsolidationResponse(
        id=consol.id,
        consol_no=consol.consol_no,
        consol_type=consol.consol_type,
        status=consol.status,
        origin_port=consol.origin_port,
        origin_port_name=consol.origin_port_name,
        destination_port=consol.destination_port,
        destination_port_name=consol.destination_port_name,
        carrier_name=consol.carrier_name,
        vessel_name=consol.vessel_name,
        voyage_no=consol.voyage_no,
        flight_no=consol.flight_no,
        etd=consol.etd,
        eta=consol.eta,
        atd=consol.atd,
        ata=consol.ata,
        master_bl_no=consol.master_bl_no,
        master_awb_no=consol.master_awb_no,
        total_packages=consol.total_packages or 0,
        total_gross_weight=consol.total_gross_weight or 0,
        total_volume=consol.total_volume or 0,
        total_chargeable_weight=consol.total_chargeable_weight or 0,
        house_count=house_count,
        created_at=consol.created_at,
    )


@router.put("/{consol_id}", response_model=ConsolidationResponse)
def update_consolidation(
    consol_id: str,
    payload: ConsolidationCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a consolidation"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    consol = session.exec(
        select(Consolidation).where(
            Consolidation.id == consol_id,
            Consolidation.tenant_id == tenant_id,
            Consolidation.is_deleted == False,
        )
    ).first()

    if not consol:
        raise HTTPException(status_code=404, detail="Consolidation not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(consol, key, value)

    consol.updated_at = datetime.utcnow()
    consol.updated_by = user_id

    session.add(consol)
    session.commit()
    session.refresh(consol)

    house_count = session.exec(
        select(func.count(ConsolidationItem.id)).where(
            ConsolidationItem.consolidation_id == consol_id,
            ConsolidationItem.is_deleted == False,
        )
    ).one()

    return ConsolidationResponse(
        id=consol.id,
        consol_no=consol.consol_no,
        consol_type=consol.consol_type,
        status=consol.status,
        origin_port=consol.origin_port,
        origin_port_name=consol.origin_port_name,
        destination_port=consol.destination_port,
        destination_port_name=consol.destination_port_name,
        carrier_name=consol.carrier_name,
        vessel_name=consol.vessel_name,
        voyage_no=consol.voyage_no,
        flight_no=consol.flight_no,
        etd=consol.etd,
        eta=consol.eta,
        atd=consol.atd,
        ata=consol.ata,
        master_bl_no=consol.master_bl_no,
        master_awb_no=consol.master_awb_no,
        total_packages=consol.total_packages or 0,
        total_gross_weight=consol.total_gross_weight or 0,
        total_volume=consol.total_volume or 0,
        total_chargeable_weight=consol.total_chargeable_weight or 0,
        house_count=house_count,
        created_at=consol.created_at,
    )


@router.delete("/{consol_id}")
def delete_consolidation(
    consol_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete a consolidation"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    consol = session.exec(
        select(Consolidation).where(
            Consolidation.id == consol_id,
            Consolidation.tenant_id == tenant_id,
            Consolidation.is_deleted == False,
        )
    ).first()

    if not consol:
        raise HTTPException(status_code=404, detail="Consolidation not found")

    consol.is_deleted = True
    consol.deleted_at = datetime.utcnow()
    consol.deleted_by = user_id

    session.add(consol)
    session.commit()

    return {"message": "Consolidation deleted"}


@router.post("/{consol_id}/items", response_model=ConsolidationItemResponse)
def add_consolidation_item(
    consol_id: str,
    payload: ConsolidationItemCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Add a shipment to consolidation"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    consol = session.exec(
        select(Consolidation).where(
            Consolidation.id == consol_id,
            Consolidation.tenant_id == tenant_id,
            Consolidation.is_deleted == False,
        )
    ).first()

    if not consol:
        raise HTTPException(status_code=404, detail="Consolidation not found")

    # Verify shipment
    shipment = session.exec(
        select(FMSShipment).where(
            FMSShipment.id == payload.shipment_id,
            FMSShipment.tenant_id == tenant_id,
        )
    ).first()

    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    # Check if already added
    existing = session.exec(
        select(ConsolidationItem).where(
            ConsolidationItem.consolidation_id == consol_id,
            ConsolidationItem.shipment_id == payload.shipment_id,
            ConsolidationItem.is_deleted == False,
        )
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Shipment already in consolidation")

    item = ConsolidationItem(
        tenant_id=tenant_id,
        consolidation_id=consol_id,
        created_by=user_id,
        **payload.model_dump()
    )

    session.add(item)

    # Update totals
    consol.total_packages = (consol.total_packages or 0) + payload.packages
    consol.total_gross_weight = (consol.total_gross_weight or 0) + payload.gross_weight
    consol.total_volume = (consol.total_volume or 0) + payload.volume
    consol.total_chargeable_weight = (consol.total_chargeable_weight or 0) + payload.chargeable_weight

    session.add(consol)
    session.commit()
    session.refresh(item)

    return ConsolidationItemResponse(
        id=item.id,
        consolidation_id=item.consolidation_id,
        shipment_id=item.shipment_id,
        house_bl_no=item.house_bl_no,
        house_awb_no=item.house_awb_no,
        packages=item.packages,
        gross_weight=item.gross_weight,
        volume=item.volume,
        chargeable_weight=item.chargeable_weight,
        remarks=item.remarks,
        shipment_no=shipment.shipment_no,
        shipper_name=shipment.shipper_name,
        consignee_name=shipment.consignee_name,
    )


@router.get("/{consol_id}/items", response_model=List[ConsolidationItemResponse])
def get_consolidation_items(
    consol_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get items in a consolidation"""
    tenant_id = str(current_user.tenant_id)

    consol = session.exec(
        select(Consolidation).where(
            Consolidation.id == consol_id,
            Consolidation.tenant_id == tenant_id,
            Consolidation.is_deleted == False,
        )
    ).first()

    if not consol:
        raise HTTPException(status_code=404, detail="Consolidation not found")

    items = session.exec(
        select(ConsolidationItem).where(
            ConsolidationItem.consolidation_id == consol_id,
            ConsolidationItem.is_deleted == False,
        )
    ).all()

    # Get shipment info
    shipment_ids = [i.shipment_id for i in items]
    shipments = {}
    if shipment_ids:
        ships = session.exec(
            select(FMSShipment).where(FMSShipment.id.in_(shipment_ids))
        ).all()
        shipments = {s.id: s for s in ships}

    return [ConsolidationItemResponse(
        id=i.id,
        consolidation_id=i.consolidation_id,
        shipment_id=i.shipment_id,
        house_bl_no=i.house_bl_no,
        house_awb_no=i.house_awb_no,
        packages=i.packages,
        gross_weight=i.gross_weight,
        volume=i.volume,
        chargeable_weight=i.chargeable_weight,
        remarks=i.remarks,
        shipment_no=shipments.get(i.shipment_id, {}).shipment_no if i.shipment_id in shipments else None,
        shipper_name=shipments.get(i.shipment_id, {}).shipper_name if i.shipment_id in shipments else None,
        consignee_name=shipments.get(i.shipment_id, {}).consignee_name if i.shipment_id in shipments else None,
    ) for i in items]


@router.delete("/{consol_id}/items/{item_id}")
def remove_consolidation_item(
    consol_id: str,
    item_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Remove a shipment from consolidation"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    consol = session.exec(
        select(Consolidation).where(
            Consolidation.id == consol_id,
            Consolidation.tenant_id == tenant_id,
            Consolidation.is_deleted == False,
        )
    ).first()

    if not consol:
        raise HTTPException(status_code=404, detail="Consolidation not found")

    item = session.exec(
        select(ConsolidationItem).where(
            ConsolidationItem.id == item_id,
            ConsolidationItem.consolidation_id == consol_id,
            ConsolidationItem.is_deleted == False,
        )
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Update totals
    consol.total_packages = max(0, (consol.total_packages or 0) - item.packages)
    consol.total_gross_weight = max(0, (consol.total_gross_weight or 0) - item.gross_weight)
    consol.total_volume = max(0, (consol.total_volume or 0) - item.volume)
    consol.total_chargeable_weight = max(0, (consol.total_chargeable_weight or 0) - item.chargeable_weight)

    item.is_deleted = True
    item.deleted_at = datetime.utcnow()
    item.deleted_by = user_id

    session.add(item)
    session.add(consol)
    session.commit()

    return {"message": "Item removed from consolidation"}


@router.post("/{consol_id}/depart")
def depart_consolidation(
    consol_id: str,
    atd: date,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Mark consolidation as departed"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    consol = session.exec(
        select(Consolidation).where(
            Consolidation.id == consol_id,
            Consolidation.tenant_id == tenant_id,
            Consolidation.is_deleted == False,
        )
    ).first()

    if not consol:
        raise HTTPException(status_code=404, detail="Consolidation not found")

    consol.status = ConsolidationStatus.DEPARTED.value
    consol.atd = atd
    consol.updated_at = datetime.utcnow()
    consol.updated_by = user_id

    session.add(consol)
    session.commit()

    return {"message": "Consolidation marked as departed"}


@router.post("/{consol_id}/arrive")
def arrive_consolidation(
    consol_id: str,
    ata: date,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Mark consolidation as arrived"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    consol = session.exec(
        select(Consolidation).where(
            Consolidation.id == consol_id,
            Consolidation.tenant_id == tenant_id,
            Consolidation.is_deleted == False,
        )
    ).first()

    if not consol:
        raise HTTPException(status_code=404, detail="Consolidation not found")

    consol.status = ConsolidationStatus.ARRIVED.value
    consol.ata = ata
    consol.updated_at = datetime.utcnow()
    consol.updated_by = user_id

    session.add(consol)
    session.commit()

    return {"message": "Consolidation marked as arrived"}


@router.get("/types/list")
def get_consolidation_types():
    """Get list of consolidation types"""
    return [{"value": t.value, "label": t.value} for t in ConsolidationType]


@router.get("/statuses/list")
def get_consolidation_statuses():
    """Get list of consolidation statuses"""
    return [{"value": s.value, "label": s.value.replace("_", " ").title()} for s in ConsolidationStatus]
