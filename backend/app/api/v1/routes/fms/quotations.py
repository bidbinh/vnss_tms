"""
FMS Quotation API Routes
Quản lý báo giá cước vận chuyển
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from typing import Optional, List
from datetime import datetime, date
from pydantic import BaseModel

from app.db.session import get_session
from app.models.fms import FMSQuotation, QuotationItem, QuotationStatus, ChargeType
from app.models import User
from app.core.security import get_current_user

router = APIRouter(prefix="/quotations", tags=["FMS Quotations"])


class QuotationItemCreate(BaseModel):
    charge_type: str = ChargeType.OTHER.value
    charge_name: str
    description: Optional[str] = None
    unit: Optional[str] = None
    quantity: float = 1
    unit_price: float = 0
    currency_code: str = "USD"
    buy_rate: float = 0
    sell_rate: float = 0
    charge_category: Optional[str] = None
    is_included: bool = True
    is_optional: bool = False
    notes: Optional[str] = None


class QuotationCreate(BaseModel):
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None

    shipment_type: Optional[str] = None
    shipment_mode: Optional[str] = None

    origin_port: Optional[str] = None
    origin_port_name: Optional[str] = None
    destination_port: Optional[str] = None
    destination_port_name: Optional[str] = None

    incoterms: Optional[str] = None
    service_type: Optional[str] = None

    carrier_name: Optional[str] = None
    transit_time: Optional[str] = None

    commodity: Optional[str] = None
    package_qty: int = 0
    gross_weight: float = 0
    volume: float = 0
    container_qty: int = 0
    container_type: Optional[str] = None

    currency_code: str = "USD"
    valid_from: Optional[date] = None
    valid_until: Optional[date] = None

    payment_terms: Optional[str] = None
    terms_conditions: Optional[str] = None
    notes: Optional[str] = None

    items: Optional[List[QuotationItemCreate]] = None


class QuotationResponse(BaseModel):
    id: str
    quotation_no: str
    quotation_date: date
    status: str

    customer_name: Optional[str]
    customer_email: Optional[str]

    shipment_type: Optional[str]
    shipment_mode: Optional[str]

    origin_port: Optional[str]
    origin_port_name: Optional[str]
    destination_port: Optional[str]
    destination_port_name: Optional[str]

    incoterms: Optional[str]
    carrier_name: Optional[str]
    transit_time: Optional[str]

    commodity: Optional[str]
    container_qty: int
    container_type: Optional[str]
    gross_weight: float
    volume: float

    currency_code: str
    subtotal: float
    total_amount: float
    profit_amount: float
    profit_margin: float

    valid_from: Optional[date]
    valid_until: Optional[date]

    sales_person_name: Optional[str]
    converted_shipment_id: Optional[str]

    created_at: datetime


class QuotationListResponse(BaseModel):
    items: List[QuotationResponse]
    total: int
    page: int
    page_size: int


def generate_quotation_no(session: Session, tenant_id: str) -> str:
    """Generate unique quotation number"""
    year = datetime.now().year
    count = session.exec(
        select(func.count(FMSQuotation.id)).where(
            FMSQuotation.tenant_id == tenant_id,
            FMSQuotation.quotation_no.like(f"QT-{year}-%")
        )
    ).one() or 0
    return f"QT-{year}-{count + 1:05d}"


@router.get("", response_model=QuotationListResponse)
def list_quotations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    customer_id: Optional[str] = None,
    search: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List quotations"""
    tenant_id = str(current_user.tenant_id)

    query = select(FMSQuotation).where(
        FMSQuotation.tenant_id == tenant_id,
        FMSQuotation.is_deleted == False
    )

    if status:
        query = query.where(FMSQuotation.status == status)
    if customer_id:
        query = query.where(FMSQuotation.customer_id == customer_id)
    if search:
        query = query.where(
            FMSQuotation.quotation_no.ilike(f"%{search}%") |
            FMSQuotation.customer_name.ilike(f"%{search}%")
        )

    total = session.exec(select(func.count()).select_from(query.subquery())).one()

    query = query.order_by(FMSQuotation.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    quotations = session.exec(query).all()

    return QuotationListResponse(
        items=[QuotationResponse(
            id=q.id,
            quotation_no=q.quotation_no,
            quotation_date=q.quotation_date,
            status=q.status,
            customer_name=q.customer_name,
            customer_email=q.customer_email,
            shipment_type=q.shipment_type,
            shipment_mode=q.shipment_mode,
            origin_port=q.origin_port,
            origin_port_name=q.origin_port_name,
            destination_port=q.destination_port,
            destination_port_name=q.destination_port_name,
            incoterms=q.incoterms,
            carrier_name=q.carrier_name,
            transit_time=q.transit_time,
            commodity=q.commodity,
            container_qty=q.container_qty,
            container_type=q.container_type,
            gross_weight=q.gross_weight,
            volume=q.volume,
            currency_code=q.currency_code,
            subtotal=q.subtotal,
            total_amount=q.total_amount,
            profit_amount=q.profit_amount,
            profit_margin=q.profit_margin,
            valid_from=q.valid_from,
            valid_until=q.valid_until,
            sales_person_name=q.sales_person_name,
            converted_shipment_id=q.converted_shipment_id,
            created_at=q.created_at,
        ) for q in quotations],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=QuotationResponse)
def create_quotation(
    payload: QuotationCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new quotation"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    quotation_data = payload.model_dump(exclude={"items"})
    quotation = FMSQuotation(
        tenant_id=tenant_id,
        quotation_no=generate_quotation_no(session, tenant_id),
        sales_person_id=user_id,
        sales_person_name="",
        created_by=user_id,
        **quotation_data
    )

    session.add(quotation)
    session.flush()

    # Add items
    total_buy = 0
    total_sell = 0
    if payload.items:
        for i, item_data in enumerate(payload.items):
            item = QuotationItem(
                tenant_id=tenant_id,
                quotation_id=quotation.id,
                item_no=i + 1,
                amount=item_data.quantity * item_data.unit_price,
                profit=item_data.sell_rate - item_data.buy_rate,
                created_by=user_id,
                **item_data.model_dump()
            )
            session.add(item)
            total_buy += item_data.buy_rate * item_data.quantity
            total_sell += item_data.sell_rate * item_data.quantity

    # Update totals
    quotation.total_buy_rate = total_buy
    quotation.total_sell_rate = total_sell
    quotation.subtotal = total_sell
    quotation.total_amount = total_sell
    quotation.profit_amount = total_sell - total_buy
    quotation.profit_margin = (quotation.profit_amount / total_sell * 100) if total_sell > 0 else 0

    session.add(quotation)
    session.commit()
    session.refresh(quotation)

    return QuotationResponse(
        id=quotation.id,
        quotation_no=quotation.quotation_no,
        quotation_date=quotation.quotation_date,
        status=quotation.status,
        customer_name=quotation.customer_name,
        customer_email=quotation.customer_email,
        shipment_type=quotation.shipment_type,
        shipment_mode=quotation.shipment_mode,
        origin_port=quotation.origin_port,
        origin_port_name=quotation.origin_port_name,
        destination_port=quotation.destination_port,
        destination_port_name=quotation.destination_port_name,
        incoterms=quotation.incoterms,
        carrier_name=quotation.carrier_name,
        transit_time=quotation.transit_time,
        commodity=quotation.commodity,
        container_qty=quotation.container_qty,
        container_type=quotation.container_type,
        gross_weight=quotation.gross_weight,
        volume=quotation.volume,
        currency_code=quotation.currency_code,
        subtotal=quotation.subtotal,
        total_amount=quotation.total_amount,
        profit_amount=quotation.profit_amount,
        profit_margin=quotation.profit_margin,
        valid_from=quotation.valid_from,
        valid_until=quotation.valid_until,
        sales_person_name=quotation.sales_person_name,
        converted_shipment_id=quotation.converted_shipment_id,
        created_at=quotation.created_at,
    )


@router.get("/{quotation_id}", response_model=QuotationResponse)
def get_quotation(
    quotation_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get quotation by ID"""
    tenant_id = str(current_user.tenant_id)

    quotation = session.exec(
        select(FMSQuotation).where(
            FMSQuotation.id == quotation_id,
            FMSQuotation.tenant_id == tenant_id,
            FMSQuotation.is_deleted == False
        )
    ).first()

    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    return QuotationResponse(
        id=quotation.id,
        quotation_no=quotation.quotation_no,
        quotation_date=quotation.quotation_date,
        status=quotation.status,
        customer_name=quotation.customer_name,
        customer_email=quotation.customer_email,
        shipment_type=quotation.shipment_type,
        shipment_mode=quotation.shipment_mode,
        origin_port=quotation.origin_port,
        origin_port_name=quotation.origin_port_name,
        destination_port=quotation.destination_port,
        destination_port_name=quotation.destination_port_name,
        incoterms=quotation.incoterms,
        carrier_name=quotation.carrier_name,
        transit_time=quotation.transit_time,
        commodity=quotation.commodity,
        container_qty=quotation.container_qty,
        container_type=quotation.container_type,
        gross_weight=quotation.gross_weight,
        volume=quotation.volume,
        currency_code=quotation.currency_code,
        subtotal=quotation.subtotal,
        total_amount=quotation.total_amount,
        profit_amount=quotation.profit_amount,
        profit_margin=quotation.profit_margin,
        valid_from=quotation.valid_from,
        valid_until=quotation.valid_until,
        sales_person_name=quotation.sales_person_name,
        converted_shipment_id=quotation.converted_shipment_id,
        created_at=quotation.created_at,
    )


@router.post("/{quotation_id}/send")
def send_quotation(
    quotation_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Mark quotation as sent to customer"""
    tenant_id = str(current_user.tenant_id)

    quotation = session.exec(
        select(FMSQuotation).where(
            FMSQuotation.id == quotation_id,
            FMSQuotation.tenant_id == tenant_id
        )
    ).first()

    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    quotation.status = QuotationStatus.SENT.value
    quotation.updated_at = datetime.utcnow()

    session.add(quotation)
    session.commit()

    return {"message": "Quotation sent successfully"}


@router.post("/{quotation_id}/accept")
def accept_quotation(
    quotation_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Mark quotation as accepted by customer"""
    tenant_id = str(current_user.tenant_id)

    quotation = session.exec(
        select(FMSQuotation).where(
            FMSQuotation.id == quotation_id,
            FMSQuotation.tenant_id == tenant_id
        )
    ).first()

    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    quotation.status = QuotationStatus.ACCEPTED.value
    quotation.customer_response = "ACCEPTED"
    quotation.response_date = datetime.utcnow()
    quotation.updated_at = datetime.utcnow()

    session.add(quotation)
    session.commit()

    return {"message": "Quotation accepted"}


@router.post("/{quotation_id}/convert-to-shipment")
def convert_to_shipment(
    quotation_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Convert quotation to shipment"""
    from app.models.fms import FMSShipment

    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    quotation = session.exec(
        select(FMSQuotation).where(
            FMSQuotation.id == quotation_id,
            FMSQuotation.tenant_id == tenant_id
        )
    ).first()

    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    if quotation.converted_shipment_id:
        raise HTTPException(status_code=400, detail="Quotation already converted")

    # Create shipment from quotation
    year = datetime.now().year
    count = session.exec(
        select(func.count(FMSShipment.id)).where(FMSShipment.tenant_id == tenant_id)
    ).one() or 0

    shipment = FMSShipment(
        tenant_id=tenant_id,
        shipment_no=f"FMS-{year}-{count + 1:05d}",
        customer_id=quotation.customer_id,
        customer_name=quotation.customer_name,
        shipment_type=quotation.shipment_type,
        shipment_mode=quotation.shipment_mode,
        origin_port=quotation.origin_port,
        origin_port_name=quotation.origin_port_name,
        destination_port=quotation.destination_port,
        destination_port_name=quotation.destination_port_name,
        incoterms=quotation.incoterms,
        carrier_name=quotation.carrier_name,
        commodity=quotation.commodity,
        package_qty=quotation.package_qty,
        gross_weight=quotation.gross_weight,
        volume=quotation.volume,
        container_qty=quotation.container_qty,
        container_type=quotation.container_type,
        freight_currency=quotation.currency_code,
        quotation_id=quotation.id,
        quotation_no=quotation.quotation_no,
        sales_person_id=quotation.sales_person_id,
        sales_person_name=quotation.sales_person_name,
        created_by=user_id,
    )

    session.add(shipment)
    session.flush()

    # Update quotation
    quotation.status = QuotationStatus.CONVERTED.value
    quotation.converted_shipment_id = shipment.id
    quotation.converted_at = datetime.utcnow()
    quotation.updated_at = datetime.utcnow()

    session.add(quotation)
    session.commit()

    return {"message": "Shipment created", "shipment_id": shipment.id, "shipment_no": shipment.shipment_no}
