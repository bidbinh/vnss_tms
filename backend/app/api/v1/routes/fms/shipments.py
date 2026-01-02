"""
FMS Shipments API Routes
Quản lý lô hàng giao nhận quốc tế
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func, or_
from typing import Optional, List
from datetime import datetime, date
from pydantic import BaseModel

from app.db.session import get_session
from app.models.fms import (
    FMSShipment, ShipmentType, ShipmentMode, ShipmentStatus, IncotermsType
)
from app.models import User
from app.core.security import get_current_user

router = APIRouter(prefix="/shipments", tags=["FMS Shipments"])


# ============================================================================
# SCHEMAS
# ============================================================================

class ShipmentCreate(BaseModel):
    reference_no: Optional[str] = None
    shipment_type: str = ShipmentType.EXPORT.value
    shipment_mode: str = ShipmentMode.SEA_FCL.value
    incoterms: Optional[str] = None
    incoterms_place: Optional[str] = None

    # Customer
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_contact: Optional[str] = None
    customer_email: Optional[str] = None

    # Shipper
    shipper_name: Optional[str] = None
    shipper_address: Optional[str] = None
    shipper_contact: Optional[str] = None

    # Consignee
    consignee_name: Optional[str] = None
    consignee_address: Optional[str] = None
    consignee_contact: Optional[str] = None

    # Notify Party
    notify_party_name: Optional[str] = None
    notify_party_address: Optional[str] = None

    # Route
    origin_port: Optional[str] = None
    origin_port_name: Optional[str] = None
    origin_country: Optional[str] = None
    destination_port: Optional[str] = None
    destination_port_name: Optional[str] = None
    destination_country: Optional[str] = None
    final_destination: Optional[str] = None

    # Carrier
    carrier_id: Optional[str] = None
    carrier_name: Optional[str] = None
    carrier_booking_no: Optional[str] = None
    vessel_name: Optional[str] = None
    voyage_no: Optional[str] = None
    flight_no: Optional[str] = None

    # Dates
    booking_date: Optional[date] = None
    cargo_ready_date: Optional[date] = None
    etd: Optional[datetime] = None
    eta: Optional[datetime] = None
    cut_off_date: Optional[datetime] = None

    # Cargo
    commodity: Optional[str] = None
    commodity_code: Optional[str] = None
    package_qty: int = 0
    package_type: Optional[str] = None
    gross_weight: float = 0
    net_weight: float = 0
    volume: float = 0
    chargeable_weight: float = 0
    container_qty: int = 0
    container_type: Optional[str] = None

    # Financial
    freight_amount: float = 0
    freight_currency: str = "USD"

    # Notes
    description: Optional[str] = None
    special_instructions: Optional[str] = None

    # Sales
    sales_person_id: Optional[str] = None
    quotation_id: Optional[str] = None


class ShipmentUpdate(BaseModel):
    status: Optional[str] = None
    reference_no: Optional[str] = None
    shipment_type: Optional[str] = None
    shipment_mode: Optional[str] = None
    incoterms: Optional[str] = None
    incoterms_place: Optional[str] = None

    customer_id: Optional[str] = None
    customer_name: Optional[str] = None

    shipper_name: Optional[str] = None
    shipper_address: Optional[str] = None
    consignee_name: Optional[str] = None
    consignee_address: Optional[str] = None
    notify_party_name: Optional[str] = None

    origin_port: Optional[str] = None
    origin_port_name: Optional[str] = None
    destination_port: Optional[str] = None
    destination_port_name: Optional[str] = None

    carrier_name: Optional[str] = None
    carrier_booking_no: Optional[str] = None
    vessel_name: Optional[str] = None
    voyage_no: Optional[str] = None
    flight_no: Optional[str] = None

    etd: Optional[datetime] = None
    eta: Optional[datetime] = None
    atd: Optional[datetime] = None
    ata: Optional[datetime] = None

    commodity: Optional[str] = None
    package_qty: Optional[int] = None
    gross_weight: Optional[float] = None
    volume: Optional[float] = None
    container_qty: Optional[int] = None

    freight_amount: Optional[float] = None
    total_charges: Optional[float] = None
    total_cost: Optional[float] = None

    master_bl_no: Optional[str] = None
    house_bl_no: Optional[str] = None
    mawb_no: Optional[str] = None
    hawb_no: Optional[str] = None
    customs_dec_no: Optional[str] = None

    description: Optional[str] = None
    internal_notes: Optional[str] = None


class ShipmentResponse(BaseModel):
    id: str
    shipment_no: str
    reference_no: Optional[str]
    shipment_type: str
    shipment_mode: str
    status: str
    incoterms: Optional[str]

    customer_name: Optional[str]
    shipper_name: Optional[str]
    consignee_name: Optional[str]

    origin_port: Optional[str]
    origin_port_name: Optional[str]
    destination_port: Optional[str]
    destination_port_name: Optional[str]

    carrier_name: Optional[str]
    vessel_name: Optional[str]
    voyage_no: Optional[str]
    flight_no: Optional[str]

    etd: Optional[datetime]
    eta: Optional[datetime]

    commodity: Optional[str]
    package_qty: int
    gross_weight: float
    volume: float
    container_qty: int
    container_type: Optional[str]

    master_bl_no: Optional[str]
    house_bl_no: Optional[str]
    mawb_no: Optional[str]
    hawb_no: Optional[str]

    freight_amount: float
    freight_currency: str
    total_charges: float
    profit: float

    sales_person_name: Optional[str]

    created_at: datetime
    updated_at: datetime


class ShipmentListResponse(BaseModel):
    items: List[ShipmentResponse]
    total: int
    page: int
    page_size: int


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def generate_shipment_no(session: Session, tenant_id: str) -> str:
    """Generate unique shipment number"""
    year = datetime.now().year
    count = session.exec(
        select(func.count(FMSShipment.id)).where(
            FMSShipment.tenant_id == tenant_id,
            FMSShipment.shipment_no.like(f"FMS-{year}-%")
        )
    ).one() or 0
    return f"FMS-{year}-{count + 1:05d}"


# ============================================================================
# ROUTES
# ============================================================================

@router.get("", response_model=ShipmentListResponse)
def list_shipments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[str] = None,
    shipment_type: Optional[str] = None,
    shipment_mode: Optional[str] = None,
    customer_id: Optional[str] = None,
    origin_port: Optional[str] = None,
    destination_port: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all shipments with filters"""
    tenant_id = str(current_user.tenant_id)

    query = select(FMSShipment).where(
        FMSShipment.tenant_id == tenant_id,
        FMSShipment.is_deleted == False
    )

    if search:
        query = query.where(
            or_(
                FMSShipment.shipment_no.ilike(f"%{search}%"),
                FMSShipment.reference_no.ilike(f"%{search}%"),
                FMSShipment.customer_name.ilike(f"%{search}%"),
                FMSShipment.shipper_name.ilike(f"%{search}%"),
                FMSShipment.consignee_name.ilike(f"%{search}%"),
                FMSShipment.master_bl_no.ilike(f"%{search}%"),
                FMSShipment.house_bl_no.ilike(f"%{search}%"),
                FMSShipment.mawb_no.ilike(f"%{search}%"),
                FMSShipment.hawb_no.ilike(f"%{search}%"),
            )
        )

    if status:
        query = query.where(FMSShipment.status == status)
    if shipment_type:
        query = query.where(FMSShipment.shipment_type == shipment_type)
    if shipment_mode:
        query = query.where(FMSShipment.shipment_mode == shipment_mode)
    if customer_id:
        query = query.where(FMSShipment.customer_id == customer_id)
    if origin_port:
        query = query.where(FMSShipment.origin_port == origin_port)
    if destination_port:
        query = query.where(FMSShipment.destination_port == destination_port)
    if date_from:
        query = query.where(FMSShipment.created_at >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        query = query.where(FMSShipment.created_at <= datetime.combine(date_to, datetime.max.time()))

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Paginate
    query = query.order_by(FMSShipment.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    shipments = session.exec(query).all()

    return ShipmentListResponse(
        items=[ShipmentResponse(
            id=s.id,
            shipment_no=s.shipment_no,
            reference_no=s.reference_no,
            shipment_type=s.shipment_type,
            shipment_mode=s.shipment_mode,
            status=s.status,
            incoterms=s.incoterms,
            customer_name=s.customer_name,
            shipper_name=s.shipper_name,
            consignee_name=s.consignee_name,
            origin_port=s.origin_port,
            origin_port_name=s.origin_port_name,
            destination_port=s.destination_port,
            destination_port_name=s.destination_port_name,
            carrier_name=s.carrier_name,
            vessel_name=s.vessel_name,
            voyage_no=s.voyage_no,
            flight_no=s.flight_no,
            etd=s.etd,
            eta=s.eta,
            commodity=s.commodity,
            package_qty=s.package_qty,
            gross_weight=s.gross_weight,
            volume=s.volume,
            container_qty=s.container_qty,
            container_type=s.container_type,
            master_bl_no=s.master_bl_no,
            house_bl_no=s.house_bl_no,
            mawb_no=s.mawb_no,
            hawb_no=s.hawb_no,
            freight_amount=s.freight_amount,
            freight_currency=s.freight_currency,
            total_charges=s.total_charges,
            profit=s.profit,
            sales_person_name=s.sales_person_name,
            created_at=s.created_at,
            updated_at=s.updated_at,
        ) for s in shipments],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=ShipmentResponse)
def create_shipment(
    payload: ShipmentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new shipment"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    shipment = FMSShipment(
        tenant_id=tenant_id,
        shipment_no=generate_shipment_no(session, tenant_id),
        created_by=user_id,
        **payload.model_dump()
    )

    session.add(shipment)
    session.commit()
    session.refresh(shipment)

    return ShipmentResponse(
        id=shipment.id,
        shipment_no=shipment.shipment_no,
        reference_no=shipment.reference_no,
        shipment_type=shipment.shipment_type,
        shipment_mode=shipment.shipment_mode,
        status=shipment.status,
        incoterms=shipment.incoterms,
        customer_name=shipment.customer_name,
        shipper_name=shipment.shipper_name,
        consignee_name=shipment.consignee_name,
        origin_port=shipment.origin_port,
        origin_port_name=shipment.origin_port_name,
        destination_port=shipment.destination_port,
        destination_port_name=shipment.destination_port_name,
        carrier_name=shipment.carrier_name,
        vessel_name=shipment.vessel_name,
        voyage_no=shipment.voyage_no,
        flight_no=shipment.flight_no,
        etd=shipment.etd,
        eta=shipment.eta,
        commodity=shipment.commodity,
        package_qty=shipment.package_qty,
        gross_weight=shipment.gross_weight,
        volume=shipment.volume,
        container_qty=shipment.container_qty,
        container_type=shipment.container_type,
        master_bl_no=shipment.master_bl_no,
        house_bl_no=shipment.house_bl_no,
        mawb_no=shipment.mawb_no,
        hawb_no=shipment.hawb_no,
        freight_amount=shipment.freight_amount,
        freight_currency=shipment.freight_currency,
        total_charges=shipment.total_charges,
        profit=shipment.profit,
        sales_person_name=shipment.sales_person_name,
        created_at=shipment.created_at,
        updated_at=shipment.updated_at,
    )


@router.get("/{shipment_id}", response_model=ShipmentResponse)
def get_shipment(
    shipment_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get shipment by ID"""
    tenant_id = str(current_user.tenant_id)

    shipment = session.exec(
        select(FMSShipment).where(
            FMSShipment.id == shipment_id,
            FMSShipment.tenant_id == tenant_id,
            FMSShipment.is_deleted == False
        )
    ).first()

    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    return ShipmentResponse(
        id=shipment.id,
        shipment_no=shipment.shipment_no,
        reference_no=shipment.reference_no,
        shipment_type=shipment.shipment_type,
        shipment_mode=shipment.shipment_mode,
        status=shipment.status,
        incoterms=shipment.incoterms,
        customer_name=shipment.customer_name,
        shipper_name=shipment.shipper_name,
        consignee_name=shipment.consignee_name,
        origin_port=shipment.origin_port,
        origin_port_name=shipment.origin_port_name,
        destination_port=shipment.destination_port,
        destination_port_name=shipment.destination_port_name,
        carrier_name=shipment.carrier_name,
        vessel_name=shipment.vessel_name,
        voyage_no=shipment.voyage_no,
        flight_no=shipment.flight_no,
        etd=shipment.etd,
        eta=shipment.eta,
        commodity=shipment.commodity,
        package_qty=shipment.package_qty,
        gross_weight=shipment.gross_weight,
        volume=shipment.volume,
        container_qty=shipment.container_qty,
        container_type=shipment.container_type,
        master_bl_no=shipment.master_bl_no,
        house_bl_no=shipment.house_bl_no,
        mawb_no=shipment.mawb_no,
        hawb_no=shipment.hawb_no,
        freight_amount=shipment.freight_amount,
        freight_currency=shipment.freight_currency,
        total_charges=shipment.total_charges,
        profit=shipment.profit,
        sales_person_name=shipment.sales_person_name,
        created_at=shipment.created_at,
        updated_at=shipment.updated_at,
    )


@router.put("/{shipment_id}", response_model=ShipmentResponse)
def update_shipment(
    shipment_id: str,
    payload: ShipmentUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a shipment"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    shipment = session.exec(
        select(FMSShipment).where(
            FMSShipment.id == shipment_id,
            FMSShipment.tenant_id == tenant_id,
            FMSShipment.is_deleted == False
        )
    ).first()

    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(shipment, key, value)

    shipment.updated_at = datetime.utcnow()
    shipment.updated_by = user_id

    session.add(shipment)
    session.commit()
    session.refresh(shipment)

    return ShipmentResponse(
        id=shipment.id,
        shipment_no=shipment.shipment_no,
        reference_no=shipment.reference_no,
        shipment_type=shipment.shipment_type,
        shipment_mode=shipment.shipment_mode,
        status=shipment.status,
        incoterms=shipment.incoterms,
        customer_name=shipment.customer_name,
        shipper_name=shipment.shipper_name,
        consignee_name=shipment.consignee_name,
        origin_port=shipment.origin_port,
        origin_port_name=shipment.origin_port_name,
        destination_port=shipment.destination_port,
        destination_port_name=shipment.destination_port_name,
        carrier_name=shipment.carrier_name,
        vessel_name=shipment.vessel_name,
        voyage_no=shipment.voyage_no,
        flight_no=shipment.flight_no,
        etd=shipment.etd,
        eta=shipment.eta,
        commodity=shipment.commodity,
        package_qty=shipment.package_qty,
        gross_weight=shipment.gross_weight,
        volume=shipment.volume,
        container_qty=shipment.container_qty,
        container_type=shipment.container_type,
        master_bl_no=shipment.master_bl_no,
        house_bl_no=shipment.house_bl_no,
        mawb_no=shipment.mawb_no,
        hawb_no=shipment.hawb_no,
        freight_amount=shipment.freight_amount,
        freight_currency=shipment.freight_currency,
        total_charges=shipment.total_charges,
        profit=shipment.profit,
        sales_person_name=shipment.sales_person_name,
        created_at=shipment.created_at,
        updated_at=shipment.updated_at,
    )


@router.delete("/{shipment_id}")
def delete_shipment(
    shipment_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Soft delete a shipment"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    shipment = session.exec(
        select(FMSShipment).where(
            FMSShipment.id == shipment_id,
            FMSShipment.tenant_id == tenant_id,
            FMSShipment.is_deleted == False
        )
    ).first()

    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    shipment.is_deleted = True
    shipment.deleted_at = datetime.utcnow()
    shipment.deleted_by = user_id

    session.add(shipment)
    session.commit()

    return {"message": "Shipment deleted successfully"}


@router.post("/{shipment_id}/update-status")
def update_shipment_status(
    shipment_id: str,
    status: str,
    notes: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update shipment status"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    shipment = session.exec(
        select(FMSShipment).where(
            FMSShipment.id == shipment_id,
            FMSShipment.tenant_id == tenant_id,
            FMSShipment.is_deleted == False
        )
    ).first()

    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    # Validate status
    valid_statuses = [s.value for s in ShipmentStatus]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    shipment.status = status
    shipment.updated_at = datetime.utcnow()
    shipment.updated_by = user_id

    if notes:
        shipment.internal_notes = (shipment.internal_notes or "") + f"\n[{datetime.utcnow()}] {status}: {notes}"

    session.add(shipment)
    session.commit()

    return {"message": f"Shipment status updated to {status}"}


@router.get("/stats/summary")
def get_shipment_stats(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get shipment statistics"""
    tenant_id = str(current_user.tenant_id)

    query = select(FMSShipment).where(
        FMSShipment.tenant_id == tenant_id,
        FMSShipment.is_deleted == False
    )

    if date_from:
        query = query.where(FMSShipment.created_at >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        query = query.where(FMSShipment.created_at <= datetime.combine(date_to, datetime.max.time()))

    shipments = session.exec(query).all()

    # Calculate stats
    stats = {
        "total": len(shipments),
        "by_status": {},
        "by_type": {},
        "by_mode": {},
        "total_revenue": 0,
        "total_cost": 0,
        "total_profit": 0,
    }

    for s in shipments:
        # By status
        stats["by_status"][s.status] = stats["by_status"].get(s.status, 0) + 1
        # By type
        stats["by_type"][s.shipment_type] = stats["by_type"].get(s.shipment_type, 0) + 1
        # By mode
        stats["by_mode"][s.shipment_mode] = stats["by_mode"].get(s.shipment_mode, 0) + 1
        # Financials
        stats["total_revenue"] += s.total_charges or 0
        stats["total_cost"] += s.total_cost or 0
        stats["total_profit"] += s.profit or 0

    return stats
