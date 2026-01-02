"""
FMS Airway Bill API Routes
Quản lý vận đơn hàng không (MAWB, HAWB)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import Optional, List
from datetime import datetime, date
from pydantic import BaseModel

from app.db.session import get_session
from app.models.fms import AirwayBill, AWBType, AWBStatus
from app.models import User
from app.core.security import get_current_user

router = APIRouter(prefix="/airway-bills", tags=["FMS Airway Bill"])


class AWBCreate(BaseModel):
    shipment_id: str
    awb_no: str
    awb_type: str = AWBType.HOUSE.value
    master_awb_no: Optional[str] = None

    airline_code: Optional[str] = None
    airline_name: Optional[str] = None

    shipper_name: Optional[str] = None
    shipper_address: Optional[str] = None
    consignee_name: Optional[str] = None
    consignee_address: Optional[str] = None

    airport_of_departure: Optional[str] = None
    airport_of_departure_name: Optional[str] = None
    airport_of_destination: Optional[str] = None
    airport_of_destination_name: Optional[str] = None

    first_flight_no: Optional[str] = None
    first_flight_date: Optional[date] = None

    nature_of_goods: Optional[str] = None
    no_of_pieces: int = 0
    gross_weight: float = 0
    chargeable_weight: float = 0

    weight_charge: float = 0
    total_prepaid: float = 0
    total_collect: float = 0

    date_of_issue: Optional[date] = None
    place_of_issue: Optional[str] = None


class AWBResponse(BaseModel):
    id: str
    shipment_id: str
    awb_no: str
    awb_type: str
    status: str
    master_awb_no: Optional[str]
    airline_name: Optional[str]
    shipper_name: Optional[str]
    consignee_name: Optional[str]
    airport_of_departure: Optional[str]
    airport_of_destination: Optional[str]
    first_flight_no: Optional[str]
    nature_of_goods: Optional[str]
    no_of_pieces: int
    gross_weight: float
    chargeable_weight: float
    total_prepaid: float
    total_collect: float
    date_of_issue: Optional[date]
    created_at: datetime


class AWBListResponse(BaseModel):
    items: List[AWBResponse]
    total: int


@router.get("", response_model=AWBListResponse)
def list_airway_bills(
    shipment_id: Optional[str] = None,
    awb_type: Optional[str] = None,
    awb_no: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all airway bills"""
    tenant_id = str(current_user.tenant_id)

    query = select(AirwayBill).where(AirwayBill.tenant_id == tenant_id)

    if shipment_id:
        query = query.where(AirwayBill.shipment_id == shipment_id)
    if awb_type:
        query = query.where(AirwayBill.awb_type == awb_type)
    if awb_no:
        query = query.where(AirwayBill.awb_no.ilike(f"%{awb_no}%"))

    awbs = session.exec(query.order_by(AirwayBill.created_at.desc())).all()

    return AWBListResponse(
        items=[AWBResponse(
            id=a.id,
            shipment_id=a.shipment_id,
            awb_no=a.awb_no,
            awb_type=a.awb_type,
            status=a.status,
            master_awb_no=a.master_awb_no,
            airline_name=a.airline_name,
            shipper_name=a.shipper_name,
            consignee_name=a.consignee_name,
            airport_of_departure=a.airport_of_departure,
            airport_of_destination=a.airport_of_destination,
            first_flight_no=a.first_flight_no,
            nature_of_goods=a.nature_of_goods,
            no_of_pieces=a.no_of_pieces,
            gross_weight=a.gross_weight,
            chargeable_weight=a.chargeable_weight,
            total_prepaid=a.total_prepaid,
            total_collect=a.total_collect,
            date_of_issue=a.date_of_issue,
            created_at=a.created_at,
        ) for a in awbs],
        total=len(awbs),
    )


@router.post("", response_model=AWBResponse)
def create_airway_bill(
    payload: AWBCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new Airway Bill"""
    tenant_id = str(current_user.tenant_id)

    awb = AirwayBill(
        tenant_id=tenant_id,
        created_by=str(current_user.id),
        **payload.model_dump()
    )

    session.add(awb)
    session.commit()
    session.refresh(awb)

    return AWBResponse(
        id=awb.id,
        shipment_id=awb.shipment_id,
        awb_no=awb.awb_no,
        awb_type=awb.awb_type,
        status=awb.status,
        master_awb_no=awb.master_awb_no,
        airline_name=awb.airline_name,
        shipper_name=awb.shipper_name,
        consignee_name=awb.consignee_name,
        airport_of_departure=awb.airport_of_departure,
        airport_of_destination=awb.airport_of_destination,
        first_flight_no=awb.first_flight_no,
        nature_of_goods=awb.nature_of_goods,
        no_of_pieces=awb.no_of_pieces,
        gross_weight=awb.gross_weight,
        chargeable_weight=awb.chargeable_weight,
        total_prepaid=awb.total_prepaid,
        total_collect=awb.total_collect,
        date_of_issue=awb.date_of_issue,
        created_at=awb.created_at,
    )


@router.get("/{awb_id}", response_model=AWBResponse)
def get_airway_bill(
    awb_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get Airway Bill by ID"""
    tenant_id = str(current_user.tenant_id)

    awb = session.exec(
        select(AirwayBill).where(
            AirwayBill.id == awb_id,
            AirwayBill.tenant_id == tenant_id
        )
    ).first()

    if not awb:
        raise HTTPException(status_code=404, detail="Airway Bill not found")

    return AWBResponse(
        id=awb.id,
        shipment_id=awb.shipment_id,
        awb_no=awb.awb_no,
        awb_type=awb.awb_type,
        status=awb.status,
        master_awb_no=awb.master_awb_no,
        airline_name=awb.airline_name,
        shipper_name=awb.shipper_name,
        consignee_name=awb.consignee_name,
        airport_of_departure=awb.airport_of_departure,
        airport_of_destination=awb.airport_of_destination,
        first_flight_no=awb.first_flight_no,
        nature_of_goods=awb.nature_of_goods,
        no_of_pieces=awb.no_of_pieces,
        gross_weight=awb.gross_weight,
        chargeable_weight=awb.chargeable_weight,
        total_prepaid=awb.total_prepaid,
        total_collect=awb.total_collect,
        date_of_issue=awb.date_of_issue,
        created_at=awb.created_at,
    )


@router.post("/{awb_id}/issue")
def issue_airway_bill(
    awb_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Issue the Airway Bill"""
    tenant_id = str(current_user.tenant_id)

    awb = session.exec(
        select(AirwayBill).where(
            AirwayBill.id == awb_id,
            AirwayBill.tenant_id == tenant_id
        )
    ).first()

    if not awb:
        raise HTTPException(status_code=404, detail="Airway Bill not found")

    awb.status = AWBStatus.ISSUED.value
    awb.date_of_issue = date.today()
    awb.updated_at = datetime.utcnow()
    awb.updated_by = str(current_user.id)

    session.add(awb)
    session.commit()

    return {"message": "Airway Bill issued successfully"}
