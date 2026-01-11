"""
FMS Customs API Routes
Quản lý tờ khai hải quan
"""
from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile, File, Form
from sqlmodel import Session, select
from typing import Optional, List
from datetime import datetime, date
from pydantic import BaseModel

from app.db.session import get_session
from app.models.fms import CustomsDeclaration, DeclarationType, DeclarationStatus, HSCode
from app.models.fms.master_data import HSCodeCatalog
from app.models import User
from app.core.security import get_current_user
from app.services.vnaccs_xml_export import export_to_vnaccs_xml

router = APIRouter(prefix="/customs", tags=["FMS Customs"])


class CustomsCreate(BaseModel):
    shipment_id: str
    declaration_type: str = DeclarationType.EXPORT.value

    customs_office_code: Optional[str] = None
    customs_office_name: Optional[str] = None
    customs_office: Optional[str] = None  # Alias for customs_office_code

    declarant_name: Optional[str] = None
    declarant_tax_code: Optional[str] = None
    trader_name: Optional[str] = None
    trader_tax_code: Optional[str] = None
    trader_address: Optional[str] = None

    foreign_partner_name: Optional[str] = None
    foreign_partner_address: Optional[str] = None

    transport_mode: Optional[str] = None
    bl_no: Optional[str] = None
    bl_date: Optional[date] = None
    vessel_name: Optional[str] = None
    voyage_no: Optional[str] = None

    loading_port: Optional[str] = None
    loading_port_name: Optional[str] = None
    discharge_port: Optional[str] = None
    discharge_port_name: Optional[str] = None
    border_gate: Optional[str] = None
    border_gate_name: Optional[str] = None

    country_of_origin: Optional[str] = None
    country_of_destination: Optional[str] = None

    invoice_no: Optional[str] = None
    invoice_date: Optional[date] = None

    incoterms: Optional[str] = None
    currency_code: str = "USD"
    exchange_rate: Optional[float] = None

    fob_value: float = 0
    cif_value: float = 0
    customs_value: float = 0

    total_packages: int = 0
    gross_weight: float = 0
    container_numbers: Optional[str] = None

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

    # Exporter (foreign partner)
    foreign_partner_name: Optional[str] = None
    foreign_partner_country: Optional[str] = None

    invoice_no: Optional[str] = None
    bl_no: Optional[str] = None
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
    product_code: Optional[str] = None      # Customer PN / DELL PN
    supplier_code: Optional[str] = None     # Supplier PN / Model
    product_name: Optional[str] = None      # Description of Goods
    hs_description: Optional[str] = None    # HS code description
    country_of_origin: Optional[str] = None
    quantity: float = 0
    unit: Optional[str] = None
    quantity_2: Optional[float] = None      # Secondary quantity
    unit_2: Optional[str] = None            # Secondary unit
    unit_price: float = 0
    currency_code: str = "USD"
    total_value: float = 0
    gross_weight: Optional[float] = None
    net_weight: Optional[float] = None
    customs_value: float = 0
    import_duty_rate: float = 0
    import_duty_amount: float = 0
    vat_rate: float = 10
    vat_amount: float = 0
    special_consumption_rate: Optional[float] = None
    special_consumption_amount: Optional[float] = None
    exemption_code: Optional[str] = None
    exemption_amount: Optional[float] = None


class HSCodeResponse(BaseModel):
    id: str
    declaration_id: str
    item_no: int
    hs_code: str
    product_code: Optional[str] = None      # Customer PN / DELL PN
    supplier_code: Optional[str] = None     # Supplier PN / Model
    product_name: Optional[str] = None      # Description of Goods
    hs_description: Optional[str] = None    # HS code description
    quantity: float
    unit: Optional[str] = None
    quantity_2: Optional[float] = None
    unit_2: Optional[str] = None
    unit_price: float
    total_value: float
    gross_weight: Optional[float] = None
    net_weight: Optional[float] = None
    country_of_origin: Optional[str] = None
    customs_value: float
    import_duty_rate: float
    import_duty_amount: float
    vat_rate: float
    vat_amount: float
    special_consumption_rate: Optional[float] = None
    special_consumption_amount: Optional[float] = None
    exemption_code: Optional[str] = None
    vat_exemption_code: Optional[str] = None
    total_tax_amount: float


# Request model for XML preview generation
class XMLPreviewItem(BaseModel):
    item_no: int = 1
    hs_code: str = ""
    product_code: Optional[str] = None
    supplier_code: Optional[str] = None
    product_name: Optional[str] = None
    quantity: float = 0
    unit: str = "PCE"
    unit_price: float = 0
    total_value: float = 0
    gross_weight: float = 0
    net_weight: float = 0
    country_of_origin: Optional[str] = None


class XMLPreviewRequest(BaseModel):
    # Declaration header
    declaration_type: str = "C11"
    classification_code: str = "1"
    customs_office_code: str = ""
    customs_office_name: str = ""
    registration_date: Optional[str] = None

    # Importer
    importer_tax_code: str = ""
    importer_name: str = ""
    importer_address: str = ""
    importer_phone: str = ""

    # Exporter
    exporter_name: str = ""
    exporter_address: str = ""
    exporter_country: str = ""

    # Documents
    invoice_no: str = ""
    invoice_date: Optional[str] = None
    bl_no: str = ""
    bl_date: Optional[str] = None

    # Transport
    transport_mode: str = "1"
    vessel_name: str = ""
    voyage_no: str = ""
    loading_port: str = ""
    loading_port_name: str = ""
    discharge_port: str = ""
    discharge_port_name: str = ""
    arrival_date: Optional[str] = None

    # Cargo
    total_packages: int = 0
    package_unit: str = "PKG"
    gross_weight: float = 0
    container_numbers: str = ""
    container_count: int = 0

    # Values
    currency_code: str = "USD"
    exchange_rate: float = 0
    total_value: float = 0
    customs_value: float = 0
    incoterms: str = "FOB"

    # HS code representative
    representative_hs_code: str = ""

    # Border gate
    border_gate: str = ""
    border_gate_name: str = ""

    # Items
    items: List[XMLPreviewItem] = []


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
            foreign_partner_name=d.foreign_partner_name,
            foreign_partner_country=d.foreign_partner_country,
            invoice_no=d.invoice_no,
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
        foreign_partner_name=declaration.foreign_partner_name,
        foreign_partner_country=declaration.foreign_partner_country,
        invoice_no=declaration.invoice_no,
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


@router.get("/{declaration_id}")
def get_customs_declaration(
    declaration_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get customs declaration by ID - returns full data for edit page"""
    tenant_id = str(current_user.tenant_id)

    declaration = session.exec(
        select(CustomsDeclaration).where(
            CustomsDeclaration.id == declaration_id,
            CustomsDeclaration.tenant_id == tenant_id
        )
    ).first()

    if not declaration:
        raise HTTPException(status_code=404, detail="Customs declaration not found")

    # Return full declaration data as dict for edit page
    return declaration.model_dump()


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
    from sqlalchemy import text

    tenant_id = str(current_user.tenant_id)

    # Use raw SQL with SELECT * to get all available columns
    # Note: Database uses 'line_no' column for item ordering
    sql = text("""
        SELECT * FROM fms_hs_codes
        WHERE declaration_id = :declaration_id AND tenant_id = :tenant_id
        ORDER BY line_no
    """)

    # Use the underlying connection for raw SQL
    connection = session.connection()
    result = connection.execute(sql, {
        "declaration_id": declaration_id,
        "tenant_id": tenant_id
    })

    hs_codes = result.fetchall()

    # Helper to safely get column value
    def get_col(row, col_name, default=None):
        try:
            return getattr(row, col_name, default) if hasattr(row, col_name) else row._mapping.get(col_name, default)
        except:
            return default

    return [HSCodeResponse(
        id=get_col(row, 'id', ''),
        declaration_id=get_col(row, 'declaration_id', ''),
        item_no=get_col(row, 'line_no', 0) or get_col(row, 'item_no', 0) or 0,
        hs_code=get_col(row, 'hs_code', ''),
        product_code=get_col(row, 'product_code'),
        supplier_code=get_col(row, 'supplier_code'),
        product_name=get_col(row, 'product_name') or get_col(row, 'description'),
        hs_description=get_col(row, 'hs_description') or get_col(row, 'description'),
        quantity=get_col(row, 'quantity', 0) or 0,
        unit=get_col(row, 'unit'),
        quantity_2=get_col(row, 'quantity_2'),
        unit_2=get_col(row, 'unit_2'),
        unit_price=get_col(row, 'unit_price', 0) or 0,
        total_value=get_col(row, 'total_value', 0) or 0,
        gross_weight=get_col(row, 'gross_weight'),
        net_weight=get_col(row, 'net_weight'),
        country_of_origin=get_col(row, 'country_of_origin'),
        customs_value=get_col(row, 'customs_value', 0) or 0,
        import_duty_rate=get_col(row, 'import_duty_rate', 0) or 0,
        import_duty_amount=get_col(row, 'import_duty_amount', 0) or 0,
        vat_rate=get_col(row, 'vat_rate', 0) or 0,
        vat_amount=get_col(row, 'vat_amount', 0) or 0,
        special_consumption_rate=get_col(row, 'special_consumption_rate'),
        special_consumption_amount=get_col(row, 'special_consumption_amount'),
        exemption_code=get_col(row, 'exemption_code'),
        vat_exemption_code=get_col(row, 'exemption_code'),
        total_tax_amount=get_col(row, 'total_tax_amount', 0) or 0,
    ) for row in hs_codes]


@router.post("/{declaration_id}/hs-codes", response_model=HSCodeResponse)
def create_hs_code(
    declaration_id: str,
    payload: HSCodeCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Add HS code item to declaration"""
    tenant_id = str(current_user.tenant_id)

    # Use values from payload if provided, otherwise calculate
    customs_value = payload.customs_value if payload.customs_value else payload.total_value
    import_duty = payload.import_duty_amount if payload.import_duty_amount else (customs_value * (payload.import_duty_rate / 100))
    vat = payload.vat_amount if payload.vat_amount else ((customs_value + import_duty) * (payload.vat_rate / 100))
    special_consumption = payload.special_consumption_amount or 0
    total_tax = import_duty + vat + special_consumption

    # Exclude fields we're setting manually to avoid conflicts
    # Note: API uses 'item_no' but database uses 'line_no', so we exclude item_no and set line_no manually
    exclude_fields = {"declaration_id", "customs_value", "import_duty_amount", "vat_amount", "item_no"}
    payload_data = payload.model_dump(exclude=exclude_fields)

    hs_code = HSCode(
        tenant_id=tenant_id,
        declaration_id=declaration_id,
        line_no=payload.item_no,  # Map item_no from API to line_no in database
        customs_value=customs_value,
        import_duty_amount=import_duty,
        vat_amount=vat,
        total_tax_amount=total_tax,
        created_by=str(current_user.id),
        **payload_data
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
        item_no=hs_code.line_no,  # Map line_no from DB back to item_no for API
        hs_code=hs_code.hs_code,
        product_code=hs_code.product_code,
        supplier_code=hs_code.supplier_code,
        product_name=hs_code.product_name,
        hs_description=hs_code.hs_description,
        quantity=hs_code.quantity,
        unit=hs_code.unit,
        quantity_2=hs_code.quantity_2,
        unit_2=hs_code.unit_2,
        unit_price=hs_code.unit_price,
        total_value=hs_code.total_value,
        gross_weight=hs_code.gross_weight,
        net_weight=hs_code.net_weight,
        country_of_origin=hs_code.country_of_origin,
        customs_value=hs_code.customs_value,
        import_duty_rate=hs_code.import_duty_rate,
        import_duty_amount=hs_code.import_duty_amount,
        vat_rate=hs_code.vat_rate,
        vat_amount=hs_code.vat_amount,
        special_consumption_rate=hs_code.special_consumption_rate,
        special_consumption_amount=hs_code.special_consumption_amount,
        exemption_code=hs_code.exemption_code,
        vat_exemption_code=hs_code.exemption_code,
        total_tax_amount=hs_code.total_tax_amount,
    )


# Additional endpoints for UPDATE, DELETE, and XML export

class CustomsUpdate(BaseModel):
    """Update schema for customs declaration"""
    # Declaration type & status
    declaration_type_code: Optional[str] = None
    customs_channel: Optional[str] = None  # 1=Green, 2=Yellow, 3=Red
    representative_hs_code: Optional[str] = None

    # Customs office
    customs_office_code: Optional[str] = None
    customs_office_name: Optional[str] = None

    # Declarant
    declarant_name: Optional[str] = None
    declarant_tax_code: Optional[str] = None
    declarant_code: Optional[str] = None

    # Importer (trader)
    importer_code: Optional[str] = None
    trader_name: Optional[str] = None
    trader_tax_code: Optional[str] = None
    trader_address: Optional[str] = None
    trader_phone: Optional[str] = None
    importer_postal_code: Optional[str] = None

    # Broker (Customs agent)
    broker_code: Optional[str] = None
    broker_name: Optional[str] = None

    # Exporter (foreign partner)
    foreign_partner_name: Optional[str] = None
    foreign_partner_address: Optional[str] = None
    foreign_partner_country: Optional[str] = None

    # Transport
    transport_mode: Optional[str] = None
    bl_no: Optional[str] = None
    bl_date: Optional[date] = None
    vessel_name: Optional[str] = None
    voyage_no: Optional[str] = None
    loading_port: Optional[str] = None
    loading_port_name: Optional[str] = None
    discharge_port: Optional[str] = None
    discharge_port_name: Optional[str] = None
    border_gate: Optional[str] = None
    border_gate_name: Optional[str] = None
    country_of_origin: Optional[str] = None
    country_of_destination: Optional[str] = None
    incoterms: Optional[str] = None
    currency_code: Optional[str] = None
    exchange_rate: Optional[float] = None
    fob_value: Optional[float] = None
    cif_value: Optional[float] = None
    freight_value: Optional[float] = None
    insurance_value: Optional[float] = None
    customs_value: Optional[float] = None
    total_packages: Optional[int] = None
    package_unit: Optional[str] = None
    gross_weight: Optional[float] = None
    net_weight: Optional[float] = None
    container_numbers: Optional[str] = None
    invoice_no: Optional[str] = None
    invoice_date: Optional[date] = None
    description: Optional[str] = None


class HSCodeUpdate(BaseModel):
    """Update schema for HS code item"""
    hs_code: Optional[str] = None
    product_code: Optional[str] = None       # Customer PN / DELL PN
    supplier_code: Optional[str] = None      # Supplier PN / Model
    product_name: Optional[str] = None       # Description of Goods
    hs_description: Optional[str] = None
    country_of_origin: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    unit_price: Optional[float] = None
    total_value: Optional[float] = None
    import_duty_rate: Optional[float] = None
    vat_rate: Optional[float] = None
    exemption_code: Optional[str] = None
    gross_weight: Optional[float] = None
    net_weight: Optional[float] = None


@router.put("/{declaration_id}", response_model=CustomsResponse)
def update_customs_declaration(
    declaration_id: str,
    payload: CustomsUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a customs declaration"""
    tenant_id = str(current_user.tenant_id)

    declaration = session.exec(
        select(CustomsDeclaration).where(
            CustomsDeclaration.id == declaration_id,
            CustomsDeclaration.tenant_id == tenant_id
        )
    ).first()

    if not declaration:
        raise HTTPException(status_code=404, detail="Customs declaration not found")

    # Only allow updates if not yet released
    if declaration.status == DeclarationStatus.RELEASED.value:
        raise HTTPException(status_code=400, detail="Cannot update released declaration")

    # Update fields
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(declaration, field):
            setattr(declaration, field, value)

    declaration.updated_at = datetime.utcnow()
    declaration.updated_by = str(current_user.id)

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
        foreign_partner_name=declaration.foreign_partner_name,
        foreign_partner_country=declaration.foreign_partner_country,
        invoice_no=declaration.invoice_no,
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


@router.delete("/{declaration_id}")
def delete_customs_declaration(
    declaration_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete (soft) a customs declaration"""
    tenant_id = str(current_user.tenant_id)

    declaration = session.exec(
        select(CustomsDeclaration).where(
            CustomsDeclaration.id == declaration_id,
            CustomsDeclaration.tenant_id == tenant_id
        )
    ).first()

    if not declaration:
        raise HTTPException(status_code=404, detail="Customs declaration not found")

    # Only allow deletion if in DRAFT status
    if declaration.status not in [DeclarationStatus.DRAFT.value, DeclarationStatus.PENDING.value]:
        raise HTTPException(status_code=400, detail="Can only delete draft declarations")

    # Soft delete
    declaration.status = "DELETED"
    declaration.updated_at = datetime.utcnow()
    declaration.updated_by = str(current_user.id)

    session.add(declaration)
    session.commit()

    return {"message": "Customs declaration deleted"}


@router.put("/{declaration_id}/hs-codes/{item_id}", response_model=HSCodeResponse)
def update_hs_code(
    declaration_id: str,
    item_id: str,
    payload: HSCodeUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update an HS code item"""
    tenant_id = str(current_user.tenant_id)

    hs_code = session.exec(
        select(HSCode).where(
            HSCode.id == item_id,
            HSCode.declaration_id == declaration_id,
            HSCode.tenant_id == tenant_id
        )
    ).first()

    if not hs_code:
        raise HTTPException(status_code=404, detail="HS code item not found")

    # Update fields
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(hs_code, field):
            setattr(hs_code, field, value)

    # Recalculate taxes if rates or values changed
    if "total_value" in update_data or "import_duty_rate" in update_data or "vat_rate" in update_data:
        hs_code.customs_value = hs_code.total_value
        hs_code.import_duty_amount = hs_code.customs_value * (hs_code.import_duty_rate / 100)
        hs_code.vat_amount = (hs_code.customs_value + hs_code.import_duty_amount) * (hs_code.vat_rate / 100)
        hs_code.total_tax_amount = hs_code.import_duty_amount + hs_code.vat_amount

    hs_code.updated_at = datetime.utcnow()
    hs_code.updated_by = str(current_user.id)

    session.add(hs_code)
    session.commit()
    session.refresh(hs_code)

    # Update declaration totals
    _update_declaration_totals(session, declaration_id)

    return HSCodeResponse(
        id=hs_code.id,
        declaration_id=hs_code.declaration_id,
        item_no=hs_code.line_no,  # Map line_no from DB back to item_no for API
        hs_code=hs_code.hs_code,
        product_code=hs_code.product_code,
        supplier_code=hs_code.supplier_code,
        product_name=hs_code.product_name,
        hs_description=hs_code.hs_description,
        quantity=hs_code.quantity,
        unit=hs_code.unit,
        quantity_2=hs_code.quantity_2,
        unit_2=hs_code.unit_2,
        unit_price=hs_code.unit_price,
        total_value=hs_code.total_value,
        gross_weight=hs_code.gross_weight,
        net_weight=hs_code.net_weight,
        country_of_origin=hs_code.country_of_origin,
        customs_value=hs_code.customs_value,
        import_duty_rate=hs_code.import_duty_rate,
        import_duty_amount=hs_code.import_duty_amount,
        vat_rate=hs_code.vat_rate,
        vat_amount=hs_code.vat_amount,
        special_consumption_rate=hs_code.special_consumption_rate,
        special_consumption_amount=hs_code.special_consumption_amount,
        exemption_code=hs_code.exemption_code,
        vat_exemption_code=hs_code.exemption_code,
        total_tax_amount=hs_code.total_tax_amount,
    )


@router.delete("/{declaration_id}/hs-codes/{item_id}")
def delete_hs_code(
    declaration_id: str,
    item_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete an HS code item"""
    tenant_id = str(current_user.tenant_id)

    hs_code = session.exec(
        select(HSCode).where(
            HSCode.id == item_id,
            HSCode.declaration_id == declaration_id,
            HSCode.tenant_id == tenant_id
        )
    ).first()

    if not hs_code:
        raise HTTPException(status_code=404, detail="HS code item not found")

    session.delete(hs_code)
    session.commit()

    # Update declaration totals
    _update_declaration_totals(session, declaration_id)

    return {"message": "HS code item deleted"}


@router.get("/{declaration_id}/export/xml")
def export_customs_xml(
    declaration_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Export customs declaration to VNACCS XML format.
    Returns downloadable XML file.
    """
    tenant_id = str(current_user.tenant_id)

    declaration = session.exec(
        select(CustomsDeclaration).where(
            CustomsDeclaration.id == declaration_id,
            CustomsDeclaration.tenant_id == tenant_id
        )
    ).first()

    if not declaration:
        raise HTTPException(status_code=404, detail="Customs declaration not found")

    # Get HS code items
    hs_codes = session.exec(
        select(HSCode).where(
            HSCode.declaration_id == declaration_id,
            HSCode.tenant_id == tenant_id
        ).order_by(HSCode.line_no)
    ).all()

    # Prepare declaration data
    declaration_data = {
        "declaration_no": declaration.declaration_no or "",
        "declaration_type": declaration.declaration_type,
        "declaration_type_code": "C11" if declaration.declaration_type == "IMPORT" else "B11",
        "customs_office_code": declaration.customs_office_code or "",
        "customs_office_name": declaration.customs_office_name or "",
        "registration_date": declaration.registration_date,
        "customs_channel": declaration.customs_channel or "1",
        "trader_tax_code": declaration.trader_tax_code or "",
        "trader_name": declaration.trader_name or "",
        "trader_address": declaration.trader_address if hasattr(declaration, "trader_address") else "",
        "foreign_partner_name": declaration.foreign_partner_name if hasattr(declaration, "foreign_partner_name") else "",
        "foreign_partner_address": declaration.foreign_partner_address if hasattr(declaration, "foreign_partner_address") else "",
        "country_of_origin": declaration.country_of_origin or "",
        "bl_no": declaration.bl_no or "",
        "bl_date": declaration.bl_date if hasattr(declaration, "bl_date") else None,
        "vessel_name": declaration.vessel_name or "",
        "voyage_no": declaration.voyage_no if hasattr(declaration, "voyage_no") else "",
        "loading_port": declaration.loading_port or "",
        "loading_port_name": declaration.loading_port_name if hasattr(declaration, "loading_port_name") else "",
        "discharge_port": declaration.discharge_port or "",
        "discharge_port_name": declaration.discharge_port_name if hasattr(declaration, "discharge_port_name") else "",
        "border_gate": declaration.border_gate or "",
        "border_gate_name": declaration.border_gate_name if hasattr(declaration, "border_gate_name") else "",
        "total_packages": declaration.total_packages,
        "gross_weight": declaration.gross_weight,
        "net_weight": declaration.net_weight if hasattr(declaration, "net_weight") else declaration.gross_weight,
        "container_numbers": declaration.container_numbers if hasattr(declaration, "container_numbers") else "",
        "invoice_no": declaration.invoice_no if hasattr(declaration, "invoice_no") else "",
        "invoice_date": declaration.invoice_date if hasattr(declaration, "invoice_date") else None,
        "currency_code": declaration.currency_code,
        "exchange_rate": declaration.exchange_rate or 0,
        "fob_value": declaration.fob_value,
        "freight_value": declaration.freight_value if hasattr(declaration, "freight_value") else 0,
        "insurance_value": declaration.insurance_value if hasattr(declaration, "insurance_value") else 0,
        "incoterms": declaration.incoterms or "FOB",
        "customs_value": declaration.customs_value,
        "import_duty": declaration.import_duty,
        "vat": declaration.vat,
        "total_tax": declaration.total_tax,
    }

    # Prepare items data
    items_data = [
        {
            "item_no": hs.line_no,  # Map line_no from DB to item_no for XML
            "hs_code": hs.hs_code,
            "product_name": hs.product_name,
            "hs_description": hs.hs_description if hasattr(hs, "hs_description") else hs.product_name,
            "product_code": hs.product_code if hasattr(hs, "product_code") else None,
            "quantity": hs.quantity,
            "unit": hs.unit or "PCE",
            "unit_price": hs.unit_price,
            "currency_code": hs.currency_code,
            "total_value": hs.total_value,
            "customs_value": hs.customs_value,
            "country_of_origin": hs.country_of_origin or "",
            "import_duty_rate": hs.import_duty_rate,
            "vat_rate": hs.vat_rate,
            "exemption_code": hs.exemption_code if hasattr(hs, "exemption_code") else None,
            "gross_weight": hs.gross_weight if hasattr(hs, "gross_weight") else 0,
            "net_weight": hs.net_weight if hasattr(hs, "net_weight") else 0,
        }
        for hs in hs_codes
    ]

    # Generate XML
    xml_content = export_to_vnaccs_xml(declaration_data, items_data)

    # Return as downloadable file
    filename = f"customs_{declaration.declaration_no or declaration_id}.xml"
    return Response(
        content=xml_content,
        media_type="application/xml",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.post("/preview-xml")
def preview_customs_xml(
    request: XMLPreviewRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Generate VNACCS XML preview from form data without saving to database.
    Useful for reviewing XML before creating declaration.
    """
    from datetime import datetime

    # Parse dates
    def parse_date(date_str):
        if not date_str:
            return None
        try:
            return datetime.strptime(date_str, "%Y-%m-%d").date()
        except:
            return None

    # Determine declaration type
    is_import = request.declaration_type.startswith("C") or request.declaration_type.startswith("E")

    # Prepare declaration data
    declaration_data = {
        "declaration_no": "",  # Preview has no number
        "declaration_type": "IMPORT" if is_import else "EXPORT",
        "declaration_type_code": request.declaration_type,
        "customs_office_code": request.customs_office_code,
        "customs_office_name": request.customs_office_name,
        "registration_date": parse_date(request.registration_date) or datetime.now().date(),
        "customs_channel": request.classification_code,
        "trader_tax_code": request.importer_tax_code,
        "trader_name": request.importer_name,
        "trader_address": request.importer_address,
        "trader_phone": request.importer_phone,
        "foreign_partner_name": request.exporter_name,
        "foreign_partner_address": request.exporter_address,
        "country_of_origin": request.exporter_country,
        "bl_no": request.bl_no,
        "bl_date": parse_date(request.bl_date),
        "vessel_name": request.vessel_name,
        "voyage_no": request.voyage_no,
        "loading_port": request.loading_port,
        "loading_port_name": request.loading_port_name,
        "discharge_port": request.discharge_port,
        "discharge_port_name": request.discharge_port_name,
        "arrival_date": parse_date(request.arrival_date),
        "border_gate": request.border_gate,
        "border_gate_name": request.border_gate_name,
        "total_packages": request.total_packages,
        "package_unit": request.package_unit,
        "gross_weight": request.gross_weight,
        "net_weight": request.gross_weight,  # Use gross as net for preview
        "container_count": request.container_count,
        "container_numbers": request.container_numbers,
        "invoice_no": request.invoice_no,
        "invoice_date": parse_date(request.invoice_date),
        "currency_code": request.currency_code,
        "exchange_rate": request.exchange_rate,
        "fob_value": request.total_value,
        "freight_value": 0,
        "insurance_value": 0,
        "incoterms": request.incoterms,
        "customs_value": request.customs_value or (request.total_value * request.exchange_rate),
        "import_duty": 0,
        "vat": 0,
        "total_tax": 0,
    }

    # Prepare items data
    items_data = [
        {
            "item_no": item.item_no,
            "hs_code": item.hs_code,
            "product_name": item.product_name or "",
            "hs_description": item.product_name or "",
            "product_code": item.product_code,
            "quantity": item.quantity,
            "unit": item.unit,
            "unit_price": item.unit_price,
            "currency_code": request.currency_code,
            "total_value": item.total_value,
            "customs_value": item.total_value * request.exchange_rate,
            "country_of_origin": item.country_of_origin or "",
            "import_duty_rate": 0,
            "vat_rate": 10,
            "exemption_code": None,
            "gross_weight": item.gross_weight,
            "net_weight": item.net_weight,
        }
        for item in request.items
    ]

    # Generate XML
    xml_content = export_to_vnaccs_xml(declaration_data, items_data)

    # Return as downloadable file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"customs_preview_{timestamp}.xml"
    return Response(
        content=xml_content,
        media_type="application/xml",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


def _update_declaration_totals(session: Session, declaration_id: str):
    """Update declaration totals from HS code items."""
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
        declaration.updated_at = datetime.utcnow()

        session.add(declaration)
        session.commit()


# ============================================================
# HS CODE CATALOG / MASTER DATA
# ============================================================

class HSCodeCatalogItem(BaseModel):
    """HS Code catalog item for listing"""
    id: str
    hs_code: str
    description: str
    description_vi: Optional[str] = None
    description_en: Optional[str] = None
    product_code: Optional[str] = None
    unit_code: Optional[str] = None
    unit_name: Optional[str] = None
    import_duty_rate: float = 0
    vat_rate: float = 10
    is_active: bool = True
    created_at: datetime

    class Config:
        from_attributes = True


class HSCodeCatalogListResponse(BaseModel):
    """Response for HS Code catalog listing"""
    items: List[HSCodeCatalogItem]
    total: int


@router.get("/hs-codes/catalog", response_model=HSCodeCatalogListResponse)
def list_hs_code_catalog(
    skip: int = 0,
    limit: int = 25,
    search: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    List HS codes from master data catalog with pagination and search.
    """
    from sqlalchemy import or_, func

    tenant_id = str(current_user.tenant_id)

    # Base query
    query = select(HSCodeCatalog).where(HSCodeCatalog.tenant_id == tenant_id)

    # Apply search filter
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                HSCodeCatalog.hs_code.ilike(search_pattern),
                HSCodeCatalog.description_vi.ilike(search_pattern),
                HSCodeCatalog.description_en.ilike(search_pattern),
            )
        )

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Apply pagination and ordering
    query = query.order_by(HSCodeCatalog.hs_code).offset(skip).limit(limit)
    items = session.exec(query).all()

    # Map to response
    result_items = []
    for item in items:
        result_items.append(HSCodeCatalogItem(
            id=item.id,
            hs_code=item.hs_code,
            description=item.description_vi or "",
            description_vi=item.description_vi,
            description_en=item.description_en,
            product_code=item.description_en,  # Product code stored in description_en
            unit_code=item.unit_code,
            unit_name=item.unit_name,
            import_duty_rate=item.import_duty_rate or 0,
            vat_rate=item.vat_rate or 10,
            is_active=item.is_active,
            created_at=item.created_at,
        ))

    return HSCodeCatalogListResponse(items=result_items, total=total)


# ============================================================
# HS CODE SEARCH / AUTOCOMPLETE
# ============================================================

class HSCodeSearchResult(BaseModel):
    """HS Code search result item"""
    code: str
    description: str
    description_vi: Optional[str] = None
    product_code: Optional[str] = None
    tax_rate: Optional[float] = None
    import_duty_rate: Optional[float] = None
    vat_rate: Optional[float] = None


@router.get("/hs-codes/search", response_model=List[HSCodeSearchResult])
def search_hs_codes(
    q: str,
    limit: int = 10,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Search HS codes from master data (HSCodeCatalog) and historical declarations (HSCode).
    Returns unique HS codes that match the query string.
    Search is performed on hs_code and product_name/description fields.
    Priority: Master data first, then historical data.
    """
    from sqlalchemy import or_
    tenant_id = str(current_user.tenant_id)

    if len(q) < 2:
        return []

    seen_codes = set()
    response = []

    # 1. Search in HSCodeCatalog (master data) first
    master_results = session.exec(
        select(
            HSCodeCatalog.hs_code,
            HSCodeCatalog.description_vi,
            HSCodeCatalog.description_en,
            HSCodeCatalog.product_code,
            HSCodeCatalog.import_duty_rate,
            HSCodeCatalog.vat_rate
        ).where(
            HSCodeCatalog.tenant_id == tenant_id,
            HSCodeCatalog.is_active == True,
            or_(
                HSCodeCatalog.hs_code.ilike(f"{q}%"),  # Starts with query
                HSCodeCatalog.hs_code.ilike(f"%{q}%"),  # Contains query
                HSCodeCatalog.description_vi.ilike(f"%{q}%"),  # Vietnamese description
                HSCodeCatalog.description_en.ilike(f"%{q}%"),  # English description
                HSCodeCatalog.product_code.ilike(f"%{q}%"),  # Product code
            )
        ).limit(limit)
    ).all()

    for hs_code, desc_vi, desc_en, product_code, import_duty, vat in master_results:
        if hs_code and hs_code not in seen_codes:
            seen_codes.add(hs_code)
            response.append(HSCodeSearchResult(
                code=hs_code,
                description=desc_en or desc_vi or "",
                description_vi=desc_vi,
                product_code=product_code,
                tax_rate=import_duty,
                import_duty_rate=import_duty,
                vat_rate=vat
            ))

    # 2. If not enough results, search in HSCode (historical data)
    if len(response) < limit:
        remaining = limit - len(response)
        historical_results = session.exec(
            select(
                HSCode.hs_code,
                HSCode.product_name,
                HSCode.import_duty_rate
            ).where(
                HSCode.tenant_id == tenant_id,
                or_(
                    HSCode.hs_code.ilike(f"{q}%"),
                    HSCode.hs_code.ilike(f"%{q}%"),
                    HSCode.product_name.ilike(f"%{q}%"),
                )
            ).distinct().limit(remaining + 10)  # Get extra in case of duplicates
        ).all()

        for hs_code, product_name, import_duty_rate in historical_results:
            if hs_code and hs_code not in seen_codes and len(response) < limit:
                seen_codes.add(hs_code)
                response.append(HSCodeSearchResult(
                    code=hs_code,
                    description=product_name or "",
                    description_vi=product_name,  # Use product name as Vietnamese name
                    tax_rate=import_duty_rate,
                    import_duty_rate=import_duty_rate
                ))

    return response


# ============================================================
# HSCODE MASTER DATA IMPORT
# ============================================================

class HSCodeImportRequest(BaseModel):
    """Request to import HS codes from column data"""
    hs_code: str  # Column U - HS Code (8 digits)
    description_vi: str  # Column V - Vietnamese description
    product_code: Optional[str] = None  # Column W - Product code (optional)
    import_duty_rate: float = 0
    vat_rate: float = 10


class HSCodeImportResponse(BaseModel):
    success: bool
    imported: int
    skipped: int
    errors: List[str]


@router.post("/hs-codes/import", response_model=HSCodeImportResponse)
def import_hs_codes(
    items: List[HSCodeImportRequest],
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Import HS codes into the master data catalog.
    Used to populate HSCodeCatalog from Excel file (columns U, V, W).
    """
    tenant_id = str(current_user.tenant_id)
    imported = 0
    skipped = 0
    errors = []

    for item in items:
        try:
            # Validate HS code format (should be 8-10 digits)
            hs_code = item.hs_code.strip()
            if not hs_code or len(hs_code) < 4:
                skipped += 1
                continue

            # Check if HS code already exists
            existing = session.exec(
                select(HSCodeCatalog).where(
                    HSCodeCatalog.tenant_id == tenant_id,
                    HSCodeCatalog.hs_code == hs_code
                )
            ).first()

            if existing:
                # Update existing record
                existing.description_vi = item.description_vi
                if item.product_code:
                    existing.description_en = item.product_code  # Store product code in description_en
                existing.import_duty_rate = item.import_duty_rate
                existing.vat_rate = item.vat_rate
                existing.updated_at = datetime.utcnow()
                existing.updated_by = current_user.id
                session.add(existing)
            else:
                # Create new record
                new_hs = HSCodeCatalog(
                    tenant_id=tenant_id,
                    hs_code=hs_code,
                    hs_code_parent=hs_code[:4] if len(hs_code) >= 4 else None,
                    description_vi=item.description_vi,
                    description_en=item.product_code,  # Store product code in description_en
                    import_duty_rate=item.import_duty_rate,
                    vat_rate=item.vat_rate,
                    chapter=hs_code[:2] if len(hs_code) >= 2 else None,
                    heading=hs_code[:4] if len(hs_code) >= 4 else None,
                    subheading=hs_code[:6] if len(hs_code) >= 6 else None,
                    is_active=True,
                    created_by=current_user.id,
                    updated_by=current_user.id,
                )
                session.add(new_hs)

            imported += 1

        except Exception as e:
            errors.append(f"Error importing {item.hs_code}: {str(e)}")

    try:
        session.commit()
    except Exception as e:
        session.rollback()
        errors.append(f"Database commit error: {str(e)}")
        return HSCodeImportResponse(success=False, imported=0, skipped=skipped, errors=errors)

    return HSCodeImportResponse(
        success=True,
        imported=imported,
        skipped=skipped,
        errors=errors
    )


@router.post("/hs-codes/import-excel")
async def import_hs_codes_from_excel(
    file: UploadFile = File(...),
    hs_code_column: str = Form(default="U"),  # Column containing HS code
    description_column: str = Form(default="W"),  # Column containing Vietnamese description
    product_code_column: str = Form(default="V"),  # Column containing product code (optional)
    header_row: int = Form(default=1),  # Row number of header (1-based)
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Import HS codes from an Excel file.
    Reads specified columns and imports into HSCodeCatalog.

    Default columns:
    - U: HS Code (8 digits)
    - V: Product code (Mã sản phẩm)
    - W: Vietnamese description (Tên hàng tiếng Việt)
    """
    import pandas as pd
    import io
    import logging
    logger = logging.getLogger(__name__)

    logger.info(f"import-excel: Starting import from file {file.filename}")
    logger.info(f"import-excel: Columns - HS={hs_code_column}, Desc={description_column}, Prod={product_code_column}, Header={header_row}")

    tenant_id = str(current_user.tenant_id)

    # Ensure table exists by creating model metadata
    try:
        from sqlmodel import SQLModel
        from app.db.session import engine
        # Create table if not exists
        HSCodeCatalog.__table__.create(engine, checkfirst=True)
        logger.info("import-excel: Ensured HSCodeCatalog table exists")
    except Exception as table_err:
        logger.warning(f"import-excel: Table check warning: {table_err}")

    try:
        # Read the uploaded file
        contents = await file.read()

        # Determine file type and read
        try:
            if file.filename.endswith('.xlsx'):
                df = pd.read_excel(io.BytesIO(contents), header=header_row - 1, engine='openpyxl')
            elif file.filename.endswith('.xls'):
                # Try xlrd first (for old .xls format), fallback to openpyxl
                try:
                    df = pd.read_excel(io.BytesIO(contents), header=header_row - 1, engine='xlrd')
                except Exception:
                    # If xlrd fails, try without specifying engine
                    df = pd.read_excel(io.BytesIO(contents), header=header_row - 1)
            elif file.filename.endswith('.csv'):
                df = pd.read_csv(io.BytesIO(contents), header=header_row - 1)
            else:
                return {
                    "success": False,
                    "message": "Định dạng file không hỗ trợ. Vui lòng sử dụng .xlsx, .xls hoặc .csv",
                    "imported_count": 0,
                    "skipped_count": 0,
                    "errors": ["Unsupported file format"]
                }
        except Exception as read_error:
            return {
                "success": False,
                "message": f"Không thể đọc file Excel: {str(read_error)}",
                "imported_count": 0,
                "skipped_count": 0,
                "errors": [f"File read error: {str(read_error)}"]
            }

        # Convert column letters to indices
        def col_letter_to_index(letter: str) -> int:
            result = 0
            for char in letter.upper():
                result = result * 26 + (ord(char) - ord('A') + 1)
            return result - 1

        hs_idx = col_letter_to_index(hs_code_column)
        desc_idx = col_letter_to_index(description_column)
        prod_idx = col_letter_to_index(product_code_column) if product_code_column else None

        imported = 0
        skipped = 0
        errors = []

        for idx, row in df.iterrows():
            try:
                # Get values from columns
                hs_code = str(row.iloc[hs_idx]).strip() if pd.notna(row.iloc[hs_idx]) else ""
                description = str(row.iloc[desc_idx]).strip() if pd.notna(row.iloc[desc_idx]) else ""
                product_code = str(row.iloc[prod_idx]).strip() if prod_idx is not None and pd.notna(row.iloc[prod_idx]) else None

                # Skip if no HS code or description
                if not hs_code or hs_code == 'nan' or len(hs_code) < 4:
                    skipped += 1
                    continue
                if not description or description == 'nan':
                    skipped += 1
                    continue

                # Clean HS code (remove dots, spaces)
                hs_code = hs_code.replace('.', '').replace(' ', '')

                # Check if entry already exists by product_code (unique per product)
                # If product_code exists, check by product_code; otherwise check by hs_code + description
                existing = None
                if product_code:
                    existing = session.exec(
                        select(HSCodeCatalog).where(
                            HSCodeCatalog.tenant_id == tenant_id,
                            HSCodeCatalog.product_code == product_code
                        )
                    ).first()

                if not existing:
                    # Also check by hs_code + description_vi combination
                    existing = session.exec(
                        select(HSCodeCatalog).where(
                            HSCodeCatalog.tenant_id == tenant_id,
                            HSCodeCatalog.hs_code == hs_code,
                            HSCodeCatalog.description_vi == description
                        )
                    ).first()

                if existing:
                    # Update existing entry
                    existing.description_vi = description
                    existing.hs_code = hs_code
                    if product_code:
                        existing.product_code = product_code
                    existing.updated_at = datetime.utcnow()
                    existing.updated_by = current_user.id
                    session.add(existing)
                else:
                    new_hs = HSCodeCatalog(
                        tenant_id=tenant_id,
                        hs_code=hs_code,
                        hs_code_parent=hs_code[:4] if len(hs_code) >= 4 else None,
                        description_vi=description,
                        product_code=product_code,
                        chapter=hs_code[:2] if len(hs_code) >= 2 else None,
                        heading=hs_code[:4] if len(hs_code) >= 4 else None,
                        subheading=hs_code[:6] if len(hs_code) >= 6 else None,
                        is_active=True,
                        created_by=current_user.id,
                        updated_by=current_user.id,
                    )
                    session.add(new_hs)

                imported += 1

            except Exception as e:
                errors.append(f"Row {idx + header_row + 1}: {str(e)}")

        session.commit()

        return {
            "success": True,
            "message": f"Import thành công {imported} mã HS",
            "imported_count": imported,
            "skipped_count": skipped,
            "total_rows": len(df),
            "errors": errors[:10] if errors else []  # Return first 10 errors only
        }

    except Exception as e:
        import traceback
        logger.exception(f"import-excel: Exception occurred: {e}")
        logger.error(traceback.format_exc())
        session.rollback()
        return {
            "success": False,
            "message": f"Import thất bại: {str(e)}",
            "imported_count": 0,
            "skipped_count": 0,
            "errors": [str(e)]
        }


@router.get("/sync-hs-codes-schema")
def sync_hs_codes_schema(
    session: Session = Depends(get_session),
):
    """
    Sync fms_hs_codes table schema - add missing columns.
    Run this once if you get 'column does not exist' errors.
    """
    from sqlalchemy import text, inspect

    # Get current columns
    connection = session.connection()
    inspector = inspect(connection)
    existing_cols = [c['name'] for c in inspector.get_columns('fms_hs_codes')]

    # Columns to add with their SQL types
    columns_to_add = [
        ('shipment_id', 'VARCHAR(50)'),
        ('product_specification', 'TEXT'),
        ('origin_criteria', 'VARCHAR(20)'),
        ('unit_code', 'VARCHAR(10)'),
        ('unit_2_code', 'VARCHAR(10)'),
        ('currency_code', 'VARCHAR(5)'),
        ('preferential_rate', 'DOUBLE PRECISION'),
        ('special_preferential_rate', 'DOUBLE PRECISION'),
        ('applied_rate', 'DOUBLE PRECISION'),
        ('environmental_rate', 'DOUBLE PRECISION'),
        ('environmental_amount', 'DOUBLE PRECISION'),
        ('legal_document', 'VARCHAR(200)'),
        ('preferential_code', 'VARCHAR(20)'),
        ('co_form', 'VARCHAR(20)'),
        ('co_no_line', 'VARCHAR(50)'),
        ('license_no', 'VARCHAR(50)'),
        ('license_date', 'DATE'),
        ('license_issuer', 'VARCHAR(200)'),
        ('license_expiry', 'DATE'),
        ('created_by', 'VARCHAR(50)'),
        ('notes', 'TEXT'),
        ('created_at', 'TIMESTAMP'),
        ('updated_at', 'TIMESTAMP'),
    ]

    added = []
    skipped = []
    errors = []

    for col_name, col_type in columns_to_add:
        if col_name not in existing_cols:
            try:
                sql = text(f'ALTER TABLE fms_hs_codes ADD COLUMN {col_name} {col_type}')
                connection.execute(sql)
                added.append(col_name)
            except Exception as e:
                errors.append(f"{col_name}: {str(e)}")
        else:
            skipped.append(col_name)

    session.commit()

    return {
        "success": True,
        "message": f"Added {len(added)} columns",
        "added": added,
        "skipped": skipped,
        "errors": errors,
        "existing_columns": existing_cols
    }
