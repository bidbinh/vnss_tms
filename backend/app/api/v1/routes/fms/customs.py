"""
FMS Customs API Routes
Quản lý tờ khai hải quan
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import Optional, List
from datetime import datetime, date
from pydantic import BaseModel

from app.db.session import get_session
from app.models.fms import CustomsDeclaration, DeclarationType, DeclarationStatus, HSCode
from app.models import User
from app.core.security import get_current_user

router = APIRouter(prefix="/customs", tags=["FMS Customs"])


class CustomsCreate(BaseModel):
    shipment_id: str
    declaration_type: str = DeclarationType.EXPORT.value

    customs_office_code: Optional[str] = None
    customs_office_name: Optional[str] = None

    declarant_name: Optional[str] = None
    declarant_tax_code: Optional[str] = None
    trader_name: Optional[str] = None
    trader_tax_code: Optional[str] = None

    transport_mode: Optional[str] = None
    bl_no: Optional[str] = None
    vessel_name: Optional[str] = None

    loading_port: Optional[str] = None
    discharge_port: Optional[str] = None
    border_gate: Optional[str] = None

    country_of_origin: Optional[str] = None
    country_of_destination: Optional[str] = None

    incoterms: Optional[str] = None
    currency_code: str = "USD"
    exchange_rate: Optional[float] = None

    fob_value: float = 0
    cif_value: float = 0
    customs_value: float = 0

    total_packages: int = 0
    gross_weight: float = 0

    description: Optional[str] = None


class CustomsResponse(BaseModel):
    id: str
    shipment_id: str
    declaration_no: Optional[str]
    declaration_type: str
    status: str
    customs_channel: Optional[str]

    customs_office_name: Optional[str]
    trader_name: Optional[str]
    trader_tax_code: Optional[str]

    bl_no: Optional[str]
    vessel_name: Optional[str]
    loading_port: Optional[str]
    discharge_port: Optional[str]

    customs_value: float
    total_packages: int
    gross_weight: float

    import_duty: float
    vat: float
    total_tax: float

    registration_date: Optional[date]
    release_date: Optional[datetime]

    created_at: datetime


class CustomsListResponse(BaseModel):
    items: List[CustomsResponse]
    total: int


class HSCodeCreate(BaseModel):
    declaration_id: str
    item_no: int = 1
    hs_code: str
    product_name: Optional[str] = None
    country_of_origin: Optional[str] = None
    quantity: float = 0
    unit: Optional[str] = None
    unit_price: float = 0
    currency_code: str = "USD"
    total_value: float = 0
    import_duty_rate: float = 0
    vat_rate: float = 10


class HSCodeResponse(BaseModel):
    id: str
    declaration_id: str
    item_no: int
    hs_code: str
    product_name: Optional[str]
    quantity: float
    unit: Optional[str]
    unit_price: float
    total_value: float
    customs_value: float
    import_duty_rate: float
    import_duty_amount: float
    vat_rate: float
    vat_amount: float
    total_tax_amount: float


@router.get("", response_model=CustomsListResponse)
def list_customs_declarations(
    shipment_id: Optional[str] = None,
    declaration_type: Optional[str] = None,
    status: Optional[str] = None,
    declaration_no: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List customs declarations"""
    tenant_id = str(current_user.tenant_id)

    query = select(CustomsDeclaration).where(CustomsDeclaration.tenant_id == tenant_id)

    if shipment_id:
        query = query.where(CustomsDeclaration.shipment_id == shipment_id)
    if declaration_type:
        query = query.where(CustomsDeclaration.declaration_type == declaration_type)
    if status:
        query = query.where(CustomsDeclaration.status == status)
    if declaration_no:
        query = query.where(CustomsDeclaration.declaration_no.ilike(f"%{declaration_no}%"))

    declarations = session.exec(query.order_by(CustomsDeclaration.created_at.desc())).all()

    return CustomsListResponse(
        items=[CustomsResponse(
            id=d.id,
            shipment_id=d.shipment_id,
            declaration_no=d.declaration_no,
            declaration_type=d.declaration_type,
            status=d.status,
            customs_channel=d.customs_channel,
            customs_office_name=d.customs_office_name,
            trader_name=d.trader_name,
            trader_tax_code=d.trader_tax_code,
            bl_no=d.bl_no,
            vessel_name=d.vessel_name,
            loading_port=d.loading_port,
            discharge_port=d.discharge_port,
            customs_value=d.customs_value,
            total_packages=d.total_packages,
            gross_weight=d.gross_weight,
            import_duty=d.import_duty,
            vat=d.vat,
            total_tax=d.total_tax,
            registration_date=d.registration_date,
            release_date=d.release_date,
            created_at=d.created_at,
        ) for d in declarations],
        total=len(declarations),
    )


@router.post("", response_model=CustomsResponse)
def create_customs_declaration(
    payload: CustomsCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a customs declaration"""
    tenant_id = str(current_user.tenant_id)

    declaration = CustomsDeclaration(
        tenant_id=tenant_id,
        created_by=str(current_user.id),
        **payload.model_dump()
    )

    session.add(declaration)
    session.commit()
    session.refresh(declaration)

    return CustomsResponse(
        id=declaration.id,
        shipment_id=declaration.shipment_id,
        declaration_no=declaration.declaration_no,
        declaration_type=declaration.declaration_type,
        status=declaration.status,
        customs_channel=declaration.customs_channel,
        customs_office_name=declaration.customs_office_name,
        trader_name=declaration.trader_name,
        trader_tax_code=declaration.trader_tax_code,
        bl_no=declaration.bl_no,
        vessel_name=declaration.vessel_name,
        loading_port=declaration.loading_port,
        discharge_port=declaration.discharge_port,
        customs_value=declaration.customs_value,
        total_packages=declaration.total_packages,
        gross_weight=declaration.gross_weight,
        import_duty=declaration.import_duty,
        vat=declaration.vat,
        total_tax=declaration.total_tax,
        registration_date=declaration.registration_date,
        release_date=declaration.release_date,
        created_at=declaration.created_at,
    )


@router.get("/{declaration_id}", response_model=CustomsResponse)
def get_customs_declaration(
    declaration_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get customs declaration by ID"""
    tenant_id = str(current_user.tenant_id)

    declaration = session.exec(
        select(CustomsDeclaration).where(
            CustomsDeclaration.id == declaration_id,
            CustomsDeclaration.tenant_id == tenant_id
        )
    ).first()

    if not declaration:
        raise HTTPException(status_code=404, detail="Customs declaration not found")

    return CustomsResponse(
        id=declaration.id,
        shipment_id=declaration.shipment_id,
        declaration_no=declaration.declaration_no,
        declaration_type=declaration.declaration_type,
        status=declaration.status,
        customs_channel=declaration.customs_channel,
        customs_office_name=declaration.customs_office_name,
        trader_name=declaration.trader_name,
        trader_tax_code=declaration.trader_tax_code,
        bl_no=declaration.bl_no,
        vessel_name=declaration.vessel_name,
        loading_port=declaration.loading_port,
        discharge_port=declaration.discharge_port,
        customs_value=declaration.customs_value,
        total_packages=declaration.total_packages,
        gross_weight=declaration.gross_weight,
        import_duty=declaration.import_duty,
        vat=declaration.vat,
        total_tax=declaration.total_tax,
        registration_date=declaration.registration_date,
        release_date=declaration.release_date,
        created_at=declaration.created_at,
    )


@router.post("/{declaration_id}/submit")
def submit_customs_declaration(
    declaration_id: str,
    declaration_no: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Submit customs declaration"""
    tenant_id = str(current_user.tenant_id)

    declaration = session.exec(
        select(CustomsDeclaration).where(
            CustomsDeclaration.id == declaration_id,
            CustomsDeclaration.tenant_id == tenant_id
        )
    ).first()

    if not declaration:
        raise HTTPException(status_code=404, detail="Customs declaration not found")

    declaration.declaration_no = declaration_no
    declaration.status = DeclarationStatus.SUBMITTED.value
    declaration.registration_date = date.today()
    declaration.updated_at = datetime.utcnow()

    session.add(declaration)
    session.commit()

    return {"message": "Customs declaration submitted", "declaration_no": declaration_no}


@router.post("/{declaration_id}/release")
def release_customs_declaration(
    declaration_id: str,
    customs_channel: Optional[str] = "GREEN",
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Release/clear customs declaration"""
    tenant_id = str(current_user.tenant_id)

    declaration = session.exec(
        select(CustomsDeclaration).where(
            CustomsDeclaration.id == declaration_id,
            CustomsDeclaration.tenant_id == tenant_id
        )
    ).first()

    if not declaration:
        raise HTTPException(status_code=404, detail="Customs declaration not found")

    declaration.status = DeclarationStatus.RELEASED.value
    declaration.customs_channel = customs_channel
    declaration.release_date = datetime.utcnow()
    declaration.updated_at = datetime.utcnow()

    session.add(declaration)
    session.commit()

    return {"message": "Customs declaration released", "channel": customs_channel}


# HS Code Items
@router.get("/{declaration_id}/hs-codes", response_model=List[HSCodeResponse])
def list_hs_codes(
    declaration_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List HS codes for a declaration"""
    tenant_id = str(current_user.tenant_id)

    hs_codes = session.exec(
        select(HSCode).where(
            HSCode.declaration_id == declaration_id,
            HSCode.tenant_id == tenant_id
        ).order_by(HSCode.item_no)
    ).all()

    return [HSCodeResponse(
        id=h.id,
        declaration_id=h.declaration_id,
        item_no=h.item_no,
        hs_code=h.hs_code,
        product_name=h.product_name,
        quantity=h.quantity,
        unit=h.unit,
        unit_price=h.unit_price,
        total_value=h.total_value,
        customs_value=h.customs_value,
        import_duty_rate=h.import_duty_rate,
        import_duty_amount=h.import_duty_amount,
        vat_rate=h.vat_rate,
        vat_amount=h.vat_amount,
        total_tax_amount=h.total_tax_amount,
    ) for h in hs_codes]


@router.post("/{declaration_id}/hs-codes", response_model=HSCodeResponse)
def create_hs_code(
    declaration_id: str,
    payload: HSCodeCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Add HS code item to declaration"""
    tenant_id = str(current_user.tenant_id)

    # Calculate taxes
    customs_value = payload.total_value
    import_duty = customs_value * (payload.import_duty_rate / 100)
    vat = (customs_value + import_duty) * (payload.vat_rate / 100)
    total_tax = import_duty + vat

    hs_code = HSCode(
        tenant_id=tenant_id,
        declaration_id=declaration_id,
        customs_value=customs_value,
        import_duty_amount=import_duty,
        vat_amount=vat,
        total_tax_amount=total_tax,
        created_by=str(current_user.id),
        **payload.model_dump(exclude={"declaration_id"})
    )

    session.add(hs_code)
    session.commit()
    session.refresh(hs_code)

    # Update declaration totals
    declaration = session.exec(
        select(CustomsDeclaration).where(CustomsDeclaration.id == declaration_id)
    ).first()
    if declaration:
        all_hs = session.exec(
            select(HSCode).where(HSCode.declaration_id == declaration_id)
        ).all()
        declaration.customs_value = sum(h.customs_value for h in all_hs)
        declaration.import_duty = sum(h.import_duty_amount for h in all_hs)
        declaration.vat = sum(h.vat_amount for h in all_hs)
        declaration.total_tax = sum(h.total_tax_amount for h in all_hs)
        session.add(declaration)
        session.commit()

    return HSCodeResponse(
        id=hs_code.id,
        declaration_id=hs_code.declaration_id,
        item_no=hs_code.item_no,
        hs_code=hs_code.hs_code,
        product_name=hs_code.product_name,
        quantity=hs_code.quantity,
        unit=hs_code.unit,
        unit_price=hs_code.unit_price,
        total_value=hs_code.total_value,
        customs_value=hs_code.customs_value,
        import_duty_rate=hs_code.import_duty_rate,
        import_duty_amount=hs_code.import_duty_amount,
        vat_rate=hs_code.vat_rate,
        vat_amount=hs_code.vat_amount,
        total_tax_amount=hs_code.total_tax_amount,
    )
