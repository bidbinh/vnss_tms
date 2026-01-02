"""
FMS Bill of Lading API Routes
Quản lý vận đơn đường biển (Master BL, House BL)
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from typing import Optional, List
from datetime import datetime, date
from pydantic import BaseModel

from app.db.session import get_session
from app.models.fms import BillOfLading, BLType, BLStatus, FreightTerms
from app.models import User
from app.core.security import get_current_user

router = APIRouter(prefix="/bills-of-lading", tags=["FMS Bill of Lading"])


class BLCreate(BaseModel):
    shipment_id: str
    bl_no: str
    bl_type: str = BLType.HOUSE.value
    master_bl_no: Optional[str] = None

    shipper_name: Optional[str] = None
    shipper_address: Optional[str] = None
    consignee_name: Optional[str] = None
    consignee_address: Optional[str] = None
    notify_party_name: Optional[str] = None
    notify_party_address: Optional[str] = None

    vessel_name: Optional[str] = None
    voyage_no: Optional[str] = None
    port_of_loading: Optional[str] = None
    port_of_loading_name: Optional[str] = None
    port_of_discharge: Optional[str] = None
    port_of_discharge_name: Optional[str] = None
    place_of_delivery: Optional[str] = None

    description_of_goods: Optional[str] = None
    marks_and_numbers: Optional[str] = None
    number_of_packages: int = 0
    kind_of_packages: Optional[str] = None
    gross_weight: float = 0
    measurement: float = 0

    freight_terms: str = FreightTerms.PREPAID.value
    number_of_original_bls: int = 3
    place_of_issue: Optional[str] = None
    date_of_issue: Optional[date] = None


class BLUpdate(BaseModel):
    status: Optional[str] = None
    shipper_name: Optional[str] = None
    shipper_address: Optional[str] = None
    consignee_name: Optional[str] = None
    consignee_address: Optional[str] = None
    notify_party_name: Optional[str] = None

    vessel_name: Optional[str] = None
    voyage_no: Optional[str] = None
    port_of_loading: Optional[str] = None
    port_of_discharge: Optional[str] = None

    description_of_goods: Optional[str] = None
    number_of_packages: Optional[int] = None
    gross_weight: Optional[float] = None
    measurement: Optional[float] = None

    freight_terms: Optional[str] = None
    date_of_issue: Optional[date] = None
    shipped_on_board_date: Optional[date] = None

    is_surrendered: Optional[bool] = None
    surrendered_date: Optional[datetime] = None

    bl_file: Optional[str] = None
    internal_notes: Optional[str] = None


class BLResponse(BaseModel):
    id: str
    shipment_id: str
    bl_no: str
    bl_type: str
    status: str
    master_bl_no: Optional[str]

    shipper_name: Optional[str]
    consignee_name: Optional[str]
    notify_party_name: Optional[str]

    vessel_name: Optional[str]
    voyage_no: Optional[str]
    port_of_loading: Optional[str]
    port_of_loading_name: Optional[str]
    port_of_discharge: Optional[str]
    port_of_discharge_name: Optional[str]

    description_of_goods: Optional[str]
    number_of_packages: int
    gross_weight: float
    measurement: float

    freight_terms: str
    date_of_issue: Optional[date]
    shipped_on_board_date: Optional[date]

    is_surrendered: bool
    surrendered_date: Optional[datetime]

    created_at: datetime


class BLListResponse(BaseModel):
    items: List[BLResponse]
    total: int


@router.get("", response_model=BLListResponse)
def list_bills_of_lading(
    shipment_id: Optional[str] = None,
    bl_type: Optional[str] = None,
    status: Optional[str] = None,
    bl_no: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all bills of lading"""
    tenant_id = str(current_user.tenant_id)

    query = select(BillOfLading).where(BillOfLading.tenant_id == tenant_id)

    if shipment_id:
        query = query.where(BillOfLading.shipment_id == shipment_id)
    if bl_type:
        query = query.where(BillOfLading.bl_type == bl_type)
    if status:
        query = query.where(BillOfLading.status == status)
    if bl_no:
        query = query.where(BillOfLading.bl_no.ilike(f"%{bl_no}%"))

    query = query.order_by(BillOfLading.created_at.desc())
    bls = session.exec(query).all()

    return BLListResponse(
        items=[BLResponse(
            id=bl.id,
            shipment_id=bl.shipment_id,
            bl_no=bl.bl_no,
            bl_type=bl.bl_type,
            status=bl.status,
            master_bl_no=bl.master_bl_no,
            shipper_name=bl.shipper_name,
            consignee_name=bl.consignee_name,
            notify_party_name=bl.notify_party_name,
            vessel_name=bl.vessel_name,
            voyage_no=bl.voyage_no,
            port_of_loading=bl.port_of_loading,
            port_of_loading_name=bl.port_of_loading_name,
            port_of_discharge=bl.port_of_discharge,
            port_of_discharge_name=bl.port_of_discharge_name,
            description_of_goods=bl.description_of_goods,
            number_of_packages=bl.number_of_packages,
            gross_weight=bl.gross_weight,
            measurement=bl.measurement,
            freight_terms=bl.freight_terms,
            date_of_issue=bl.date_of_issue,
            shipped_on_board_date=bl.shipped_on_board_date,
            is_surrendered=bl.is_surrendered,
            surrendered_date=bl.surrendered_date,
            created_at=bl.created_at,
        ) for bl in bls],
        total=len(bls),
    )


@router.post("", response_model=BLResponse)
def create_bill_of_lading(
    payload: BLCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new Bill of Lading"""
    tenant_id = str(current_user.tenant_id)

    bl = BillOfLading(
        tenant_id=tenant_id,
        created_by=str(current_user.id),
        **payload.model_dump()
    )

    session.add(bl)
    session.commit()
    session.refresh(bl)

    return BLResponse(
        id=bl.id,
        shipment_id=bl.shipment_id,
        bl_no=bl.bl_no,
        bl_type=bl.bl_type,
        status=bl.status,
        master_bl_no=bl.master_bl_no,
        shipper_name=bl.shipper_name,
        consignee_name=bl.consignee_name,
        notify_party_name=bl.notify_party_name,
        vessel_name=bl.vessel_name,
        voyage_no=bl.voyage_no,
        port_of_loading=bl.port_of_loading,
        port_of_loading_name=bl.port_of_loading_name,
        port_of_discharge=bl.port_of_discharge,
        port_of_discharge_name=bl.port_of_discharge_name,
        description_of_goods=bl.description_of_goods,
        number_of_packages=bl.number_of_packages,
        gross_weight=bl.gross_weight,
        measurement=bl.measurement,
        freight_terms=bl.freight_terms,
        date_of_issue=bl.date_of_issue,
        shipped_on_board_date=bl.shipped_on_board_date,
        is_surrendered=bl.is_surrendered,
        surrendered_date=bl.surrendered_date,
        created_at=bl.created_at,
    )


@router.get("/{bl_id}", response_model=BLResponse)
def get_bill_of_lading(
    bl_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get Bill of Lading by ID"""
    tenant_id = str(current_user.tenant_id)

    bl = session.exec(
        select(BillOfLading).where(
            BillOfLading.id == bl_id,
            BillOfLading.tenant_id == tenant_id
        )
    ).first()

    if not bl:
        raise HTTPException(status_code=404, detail="Bill of Lading not found")

    return BLResponse(
        id=bl.id,
        shipment_id=bl.shipment_id,
        bl_no=bl.bl_no,
        bl_type=bl.bl_type,
        status=bl.status,
        master_bl_no=bl.master_bl_no,
        shipper_name=bl.shipper_name,
        consignee_name=bl.consignee_name,
        notify_party_name=bl.notify_party_name,
        vessel_name=bl.vessel_name,
        voyage_no=bl.voyage_no,
        port_of_loading=bl.port_of_loading,
        port_of_loading_name=bl.port_of_loading_name,
        port_of_discharge=bl.port_of_discharge,
        port_of_discharge_name=bl.port_of_discharge_name,
        description_of_goods=bl.description_of_goods,
        number_of_packages=bl.number_of_packages,
        gross_weight=bl.gross_weight,
        measurement=bl.measurement,
        freight_terms=bl.freight_terms,
        date_of_issue=bl.date_of_issue,
        shipped_on_board_date=bl.shipped_on_board_date,
        is_surrendered=bl.is_surrendered,
        surrendered_date=bl.surrendered_date,
        created_at=bl.created_at,
    )


@router.put("/{bl_id}", response_model=BLResponse)
def update_bill_of_lading(
    bl_id: str,
    payload: BLUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a Bill of Lading"""
    tenant_id = str(current_user.tenant_id)

    bl = session.exec(
        select(BillOfLading).where(
            BillOfLading.id == bl_id,
            BillOfLading.tenant_id == tenant_id
        )
    ).first()

    if not bl:
        raise HTTPException(status_code=404, detail="Bill of Lading not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(bl, key, value)

    bl.updated_at = datetime.utcnow()
    bl.updated_by = str(current_user.id)

    # Track amendments
    if update_data and bl.status == BLStatus.ISSUED.value:
        bl.is_amended = True
        bl.amendment_count += 1
        bl.last_amendment_date = datetime.utcnow()

    session.add(bl)
    session.commit()
    session.refresh(bl)

    return BLResponse(
        id=bl.id,
        shipment_id=bl.shipment_id,
        bl_no=bl.bl_no,
        bl_type=bl.bl_type,
        status=bl.status,
        master_bl_no=bl.master_bl_no,
        shipper_name=bl.shipper_name,
        consignee_name=bl.consignee_name,
        notify_party_name=bl.notify_party_name,
        vessel_name=bl.vessel_name,
        voyage_no=bl.voyage_no,
        port_of_loading=bl.port_of_loading,
        port_of_loading_name=bl.port_of_loading_name,
        port_of_discharge=bl.port_of_discharge,
        port_of_discharge_name=bl.port_of_discharge_name,
        description_of_goods=bl.description_of_goods,
        number_of_packages=bl.number_of_packages,
        gross_weight=bl.gross_weight,
        measurement=bl.measurement,
        freight_terms=bl.freight_terms,
        date_of_issue=bl.date_of_issue,
        shipped_on_board_date=bl.shipped_on_board_date,
        is_surrendered=bl.is_surrendered,
        surrendered_date=bl.surrendered_date,
        created_at=bl.created_at,
    )


@router.post("/{bl_id}/issue")
def issue_bill_of_lading(
    bl_id: str,
    place_of_issue: str,
    date_of_issue: Optional[date] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Issue the Bill of Lading"""
    tenant_id = str(current_user.tenant_id)

    bl = session.exec(
        select(BillOfLading).where(
            BillOfLading.id == bl_id,
            BillOfLading.tenant_id == tenant_id
        )
    ).first()

    if not bl:
        raise HTTPException(status_code=404, detail="Bill of Lading not found")

    bl.status = BLStatus.ISSUED.value
    bl.place_of_issue = place_of_issue
    bl.date_of_issue = date_of_issue or date.today()
    bl.updated_at = datetime.utcnow()
    bl.updated_by = str(current_user.id)

    session.add(bl)
    session.commit()

    return {"message": "Bill of Lading issued successfully"}


@router.post("/{bl_id}/surrender")
def surrender_bill_of_lading(
    bl_id: str,
    surrendered_at: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Surrender/Telex release the Bill of Lading"""
    tenant_id = str(current_user.tenant_id)

    bl = session.exec(
        select(BillOfLading).where(
            BillOfLading.id == bl_id,
            BillOfLading.tenant_id == tenant_id
        )
    ).first()

    if not bl:
        raise HTTPException(status_code=404, detail="Bill of Lading not found")

    bl.status = BLStatus.SURRENDERED.value
    bl.is_surrendered = True
    bl.surrendered_date = datetime.utcnow()
    bl.surrendered_at = surrendered_at
    bl.updated_at = datetime.utcnow()
    bl.updated_by = str(current_user.id)

    session.add(bl)
    session.commit()

    return {"message": "Bill of Lading surrendered successfully"}


@router.post("/{bl_id}/release")
def release_bill_of_lading(
    bl_id: str,
    released_to: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Release the Bill of Lading to customer"""
    tenant_id = str(current_user.tenant_id)

    bl = session.exec(
        select(BillOfLading).where(
            BillOfLading.id == bl_id,
            BillOfLading.tenant_id == tenant_id
        )
    ).first()

    if not bl:
        raise HTTPException(status_code=404, detail="Bill of Lading not found")

    bl.status = BLStatus.RELEASED.value
    bl.released_to = released_to
    bl.release_date = datetime.utcnow()
    bl.release_by = str(current_user.id)
    bl.updated_at = datetime.utcnow()
    bl.updated_by = str(current_user.id)

    session.add(bl)
    session.commit()

    return {"message": f"Bill of Lading released to {released_to}"}
