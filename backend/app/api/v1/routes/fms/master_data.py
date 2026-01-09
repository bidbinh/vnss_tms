"""
FMS Master Data API Routes
Quản lý danh mục dữ liệu cho khai báo hải quan
"""
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlmodel import Session, select, func, or_
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
import json

from app.db.session import get_session
from app.models.fms import (
    Country, Port, PortType, CustomsOffice, HSCodeCatalog,
    Currency, UnitOfMeasure, DeclarationTypeCode, ExemptionCode
)
from app.models import User
from app.core.security import get_current_user

router = APIRouter(prefix="/master-data", tags=["FMS Master Data"])


# ============================================================
# Country APIs
# ============================================================

class CountryCreate(BaseModel):
    code: str
    code_alpha3: Optional[str] = None
    name_en: str
    name_vi: Optional[str] = None
    name_local: Optional[str] = None
    region: Optional[str] = None
    currency_code: Optional[str] = None
    phone_code: Optional[str] = None
    customs_code: Optional[str] = None
    is_fta_partner: bool = False
    fta_codes: Optional[str] = None


class CountryResponse(BaseModel):
    id: str
    code: str
    code_alpha3: Optional[str]
    name_en: str
    name_vi: Optional[str]
    name_local: Optional[str]
    region: Optional[str]
    currency_code: Optional[str]
    phone_code: Optional[str]
    customs_code: Optional[str]
    is_fta_partner: bool
    fta_codes: Optional[str]
    is_active: bool
    created_at: datetime


class CountryListResponse(BaseModel):
    items: List[CountryResponse]
    total: int
    page: int
    page_size: int


@router.get("/countries", response_model=CountryListResponse)
def list_countries(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    search: Optional[str] = None,
    region: Optional[str] = None,
    is_fta_partner: Optional[bool] = None,
    is_active: Optional[bool] = True,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List countries"""
    tenant_id = str(current_user.tenant_id)

    query = select(Country).where(Country.tenant_id == tenant_id)

    if search:
        query = query.where(
            or_(
                Country.code.ilike(f"%{search}%"),
                Country.name_en.ilike(f"%{search}%"),
                Country.name_vi.ilike(f"%{search}%"),
            )
        )
    if region:
        query = query.where(Country.region == region)
    if is_fta_partner is not None:
        query = query.where(Country.is_fta_partner == is_fta_partner)
    if is_active is not None:
        query = query.where(Country.is_active == is_active)

    total = session.exec(select(func.count()).select_from(query.subquery())).one()

    query = query.order_by(Country.code)
    query = query.offset((page - 1) * page_size).limit(page_size)

    items = session.exec(query).all()

    return CountryListResponse(
        items=[CountryResponse(**c.model_dump()) for c in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/countries", response_model=CountryResponse)
def create_country(
    payload: CountryCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new country"""
    tenant_id = str(current_user.tenant_id)

    # Check duplicate
    existing = session.exec(
        select(Country).where(
            Country.tenant_id == tenant_id,
            Country.code == payload.code.upper()
        )
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Country code already exists")

    country = Country(
        tenant_id=tenant_id,
        code=payload.code.upper(),
        code_alpha3=payload.code_alpha3.upper() if payload.code_alpha3 else None,
        name_en=payload.name_en,
        name_vi=payload.name_vi,
        name_local=payload.name_local,
        region=payload.region,
        currency_code=payload.currency_code,
        phone_code=payload.phone_code,
        customs_code=payload.customs_code,
        is_fta_partner=payload.is_fta_partner,
        fta_codes=payload.fta_codes,
        created_by=str(current_user.id),
    )

    session.add(country)
    session.commit()
    session.refresh(country)

    return CountryResponse(**country.model_dump())


@router.get("/countries/{country_id}", response_model=CountryResponse)
def get_country(
    country_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get country by ID"""
    tenant_id = str(current_user.tenant_id)

    country = session.exec(
        select(Country).where(
            Country.id == country_id,
            Country.tenant_id == tenant_id
        )
    ).first()

    if not country:
        raise HTTPException(status_code=404, detail="Country not found")

    return CountryResponse(**country.model_dump())


@router.put("/countries/{country_id}", response_model=CountryResponse)
def update_country(
    country_id: str,
    payload: CountryCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update country"""
    tenant_id = str(current_user.tenant_id)

    country = session.exec(
        select(Country).where(
            Country.id == country_id,
            Country.tenant_id == tenant_id
        )
    ).first()

    if not country:
        raise HTTPException(status_code=404, detail="Country not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        if key == "code":
            value = value.upper()
        setattr(country, key, value)

    country.updated_at = datetime.utcnow()
    country.updated_by = str(current_user.id)

    session.add(country)
    session.commit()
    session.refresh(country)

    return CountryResponse(**country.model_dump())


@router.delete("/countries/{country_id}")
def delete_country(
    country_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete country"""
    tenant_id = str(current_user.tenant_id)

    country = session.exec(
        select(Country).where(
            Country.id == country_id,
            Country.tenant_id == tenant_id
        )
    ).first()

    if not country:
        raise HTTPException(status_code=404, detail="Country not found")

    session.delete(country)
    session.commit()

    return {"message": "Country deleted"}


# ============================================================
# Port APIs
# ============================================================

class PortCreate(BaseModel):
    code: str
    country_code: str
    name_en: str
    name_vi: Optional[str] = None
    name_local: Optional[str] = None
    port_type: str = PortType.SEAPORT.value
    city: Optional[str] = None
    province: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    customs_office_code: Optional[str] = None
    is_customs_clearance: bool = True


class PortResponse(BaseModel):
    id: str
    code: str
    country_code: str
    name_en: str
    name_vi: Optional[str]
    name_local: Optional[str]
    port_type: str
    city: Optional[str]
    province: Optional[str]
    address: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    customs_office_code: Optional[str]
    is_customs_clearance: bool
    is_active: bool
    created_at: datetime


class PortListResponse(BaseModel):
    items: List[PortResponse]
    total: int
    page: int
    page_size: int


@router.get("/ports", response_model=PortListResponse)
def list_ports(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    search: Optional[str] = None,
    country_code: Optional[str] = None,
    port_type: Optional[str] = None,
    is_active: Optional[bool] = True,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List ports"""
    tenant_id = str(current_user.tenant_id)

    query = select(Port).where(Port.tenant_id == tenant_id)

    if search:
        query = query.where(
            or_(
                Port.code.ilike(f"%{search}%"),
                Port.name_en.ilike(f"%{search}%"),
                Port.name_vi.ilike(f"%{search}%"),
                Port.city.ilike(f"%{search}%"),
            )
        )
    if country_code:
        query = query.where(Port.country_code == country_code.upper())
    if port_type:
        query = query.where(Port.port_type == port_type)
    if is_active is not None:
        query = query.where(Port.is_active == is_active)

    total = session.exec(select(func.count()).select_from(query.subquery())).one()

    query = query.order_by(Port.code)
    query = query.offset((page - 1) * page_size).limit(page_size)

    items = session.exec(query).all()

    return PortListResponse(
        items=[PortResponse(**p.model_dump()) for p in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/ports", response_model=PortResponse)
def create_port(
    payload: PortCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new port"""
    tenant_id = str(current_user.tenant_id)

    existing = session.exec(
        select(Port).where(
            Port.tenant_id == tenant_id,
            Port.code == payload.code.upper()
        )
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Port code already exists")

    port = Port(
        tenant_id=tenant_id,
        code=payload.code.upper(),
        country_code=payload.country_code.upper(),
        name_en=payload.name_en,
        name_vi=payload.name_vi,
        name_local=payload.name_local,
        port_type=payload.port_type,
        city=payload.city,
        province=payload.province,
        address=payload.address,
        latitude=payload.latitude,
        longitude=payload.longitude,
        customs_office_code=payload.customs_office_code,
        is_customs_clearance=payload.is_customs_clearance,
        created_by=str(current_user.id),
    )

    session.add(port)
    session.commit()
    session.refresh(port)

    return PortResponse(**port.model_dump())


@router.get("/ports/{port_id}", response_model=PortResponse)
def get_port(
    port_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get port by ID"""
    tenant_id = str(current_user.tenant_id)

    port = session.exec(
        select(Port).where(
            Port.id == port_id,
            Port.tenant_id == tenant_id
        )
    ).first()

    if not port:
        raise HTTPException(status_code=404, detail="Port not found")

    return PortResponse(**port.model_dump())


@router.put("/ports/{port_id}", response_model=PortResponse)
def update_port(
    port_id: str,
    payload: PortCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update port"""
    tenant_id = str(current_user.tenant_id)

    port = session.exec(
        select(Port).where(
            Port.id == port_id,
            Port.tenant_id == tenant_id
        )
    ).first()

    if not port:
        raise HTTPException(status_code=404, detail="Port not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        if key in ["code", "country_code"]:
            value = value.upper()
        setattr(port, key, value)

    port.updated_at = datetime.utcnow()
    port.updated_by = str(current_user.id)

    session.add(port)
    session.commit()
    session.refresh(port)

    return PortResponse(**port.model_dump())


@router.delete("/ports/{port_id}")
def delete_port(
    port_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete port"""
    tenant_id = str(current_user.tenant_id)

    port = session.exec(
        select(Port).where(
            Port.id == port_id,
            Port.tenant_id == tenant_id
        )
    ).first()

    if not port:
        raise HTTPException(status_code=404, detail="Port not found")

    session.delete(port)
    session.commit()

    return {"message": "Port deleted"}


@router.get("/ports/types/list")
def get_port_types():
    """Get list of port types"""
    return [{"value": t.value, "label": t.value.replace("_", " ").title()} for t in PortType]


# ============================================================
# Customs Office APIs
# ============================================================

class CustomsOfficeCreate(BaseModel):
    code: str
    parent_code: Optional[str] = None
    name: str
    name_short: Optional[str] = None
    name_en: Optional[str] = None
    office_type: Optional[str] = None
    level: int = 2
    province: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    fax: Optional[str] = None
    email: Optional[str] = None
    managed_ports: Optional[str] = None


class CustomsOfficeResponse(BaseModel):
    id: str
    code: str
    parent_code: Optional[str]
    name: str
    name_short: Optional[str]
    name_en: Optional[str]
    office_type: Optional[str]
    level: int
    province: Optional[str]
    address: Optional[str]
    phone: Optional[str]
    fax: Optional[str]
    email: Optional[str]
    managed_ports: Optional[str]
    is_active: bool
    created_at: datetime


class CustomsOfficeListResponse(BaseModel):
    items: List[CustomsOfficeResponse]
    total: int
    page: int
    page_size: int


@router.get("/customs-offices", response_model=CustomsOfficeListResponse)
def list_customs_offices(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    search: Optional[str] = None,
    province: Optional[str] = None,
    level: Optional[int] = None,
    is_active: Optional[bool] = True,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List customs offices"""
    tenant_id = str(current_user.tenant_id)

    query = select(CustomsOffice).where(CustomsOffice.tenant_id == tenant_id)

    if search:
        query = query.where(
            or_(
                CustomsOffice.code.ilike(f"%{search}%"),
                CustomsOffice.name.ilike(f"%{search}%"),
                CustomsOffice.name_short.ilike(f"%{search}%"),
            )
        )
    if province:
        query = query.where(CustomsOffice.province == province)
    if level is not None:
        query = query.where(CustomsOffice.level == level)
    if is_active is not None:
        query = query.where(CustomsOffice.is_active == is_active)

    total = session.exec(select(func.count()).select_from(query.subquery())).one()

    query = query.order_by(CustomsOffice.code)
    query = query.offset((page - 1) * page_size).limit(page_size)

    items = session.exec(query).all()

    return CustomsOfficeListResponse(
        items=[CustomsOfficeResponse(**c.model_dump()) for c in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/customs-offices", response_model=CustomsOfficeResponse)
def create_customs_office(
    payload: CustomsOfficeCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new customs office"""
    tenant_id = str(current_user.tenant_id)

    existing = session.exec(
        select(CustomsOffice).where(
            CustomsOffice.tenant_id == tenant_id,
            CustomsOffice.code == payload.code.upper()
        )
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Customs office code already exists")

    office = CustomsOffice(
        tenant_id=tenant_id,
        code=payload.code.upper(),
        parent_code=payload.parent_code,
        name=payload.name,
        name_short=payload.name_short,
        name_en=payload.name_en,
        office_type=payload.office_type,
        level=payload.level,
        province=payload.province,
        address=payload.address,
        phone=payload.phone,
        fax=payload.fax,
        email=payload.email,
        managed_ports=payload.managed_ports,
        created_by=str(current_user.id),
    )

    session.add(office)
    session.commit()
    session.refresh(office)

    return CustomsOfficeResponse(**office.model_dump())


@router.get("/customs-offices/{office_id}", response_model=CustomsOfficeResponse)
def get_customs_office(
    office_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get customs office by ID"""
    tenant_id = str(current_user.tenant_id)

    office = session.exec(
        select(CustomsOffice).where(
            CustomsOffice.id == office_id,
            CustomsOffice.tenant_id == tenant_id
        )
    ).first()

    if not office:
        raise HTTPException(status_code=404, detail="Customs office not found")

    return CustomsOfficeResponse(**office.model_dump())


@router.put("/customs-offices/{office_id}", response_model=CustomsOfficeResponse)
def update_customs_office(
    office_id: str,
    payload: CustomsOfficeCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update customs office"""
    tenant_id = str(current_user.tenant_id)

    office = session.exec(
        select(CustomsOffice).where(
            CustomsOffice.id == office_id,
            CustomsOffice.tenant_id == tenant_id
        )
    ).first()

    if not office:
        raise HTTPException(status_code=404, detail="Customs office not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        if key == "code":
            value = value.upper()
        setattr(office, key, value)

    office.updated_at = datetime.utcnow()
    office.updated_by = str(current_user.id)

    session.add(office)
    session.commit()
    session.refresh(office)

    return CustomsOfficeResponse(**office.model_dump())


@router.delete("/customs-offices/{office_id}")
def delete_customs_office(
    office_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete customs office"""
    tenant_id = str(current_user.tenant_id)

    office = session.exec(
        select(CustomsOffice).where(
            CustomsOffice.id == office_id,
            CustomsOffice.tenant_id == tenant_id
        )
    ).first()

    if not office:
        raise HTTPException(status_code=404, detail="Customs office not found")

    session.delete(office)
    session.commit()

    return {"message": "Customs office deleted"}


# ============================================================
# HS Code Catalog APIs
# ============================================================

class HSCodeCatalogCreate(BaseModel):
    hs_code: str
    hs_code_parent: Optional[str] = None
    product_code: Optional[str] = None  # Mã hàng nội bộ
    description_en: Optional[str] = None
    description_vi: str
    unit_code: Optional[str] = None
    unit_name: Optional[str] = None
    unit_code_2: Optional[str] = None
    unit_name_2: Optional[str] = None
    import_duty_rate: float = 0
    preferential_rate: Optional[float] = None
    vat_rate: float = 10
    special_consumption_rate: float = 0
    environmental_rate: float = 0
    export_duty_rate: float = 0
    acfta_rate: Optional[float] = None
    akfta_rate: Optional[float] = None
    ajcep_rate: Optional[float] = None
    vkfta_rate: Optional[float] = None
    evfta_rate: Optional[float] = None
    cptpp_rate: Optional[float] = None
    rcep_rate: Optional[float] = None
    requires_license: bool = False
    requires_inspection: bool = False
    inspection_agency: Optional[str] = None
    special_notes: Optional[str] = None
    chapter: Optional[str] = None
    heading: Optional[str] = None
    subheading: Optional[str] = None


class HSCodeCatalogResponse(BaseModel):
    id: str
    hs_code: str
    hs_code_parent: Optional[str]
    product_code: Optional[str] = None  # Mã hàng nội bộ
    description_en: Optional[str]
    description_vi: str
    unit_code: Optional[str]
    unit_name: Optional[str]
    import_duty_rate: float
    preferential_rate: Optional[float]
    vat_rate: float
    special_consumption_rate: float
    environmental_rate: float
    export_duty_rate: float
    requires_license: bool
    requires_inspection: bool
    inspection_agency: Optional[str]
    special_notes: Optional[str]
    chapter: Optional[str]
    heading: Optional[str]
    subheading: Optional[str]
    is_active: bool
    created_at: datetime


class HSCodeCatalogListResponse(BaseModel):
    items: List[HSCodeCatalogResponse]
    total: int
    page: int
    page_size: int


@router.get("/hs-codes", response_model=HSCodeCatalogListResponse)
def list_hs_codes(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    search: Optional[str] = None,
    chapter: Optional[str] = None,
    heading: Optional[str] = None,
    is_active: Optional[bool] = True,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List HS codes from catalog"""
    tenant_id = str(current_user.tenant_id)

    query = select(HSCodeCatalog).where(HSCodeCatalog.tenant_id == tenant_id)

    if search:
        query = query.where(
            or_(
                HSCodeCatalog.hs_code.ilike(f"%{search}%"),
                HSCodeCatalog.product_code.ilike(f"%{search}%"),
                HSCodeCatalog.description_vi.ilike(f"%{search}%"),
                HSCodeCatalog.description_en.ilike(f"%{search}%"),
            )
        )
    if chapter:
        query = query.where(HSCodeCatalog.chapter == chapter)
    if heading:
        query = query.where(HSCodeCatalog.heading == heading)
    if is_active is not None:
        query = query.where(HSCodeCatalog.is_active == is_active)

    total = session.exec(select(func.count()).select_from(query.subquery())).one()

    query = query.order_by(HSCodeCatalog.hs_code)
    query = query.offset((page - 1) * page_size).limit(page_size)

    items = session.exec(query).all()

    return HSCodeCatalogListResponse(
        items=[HSCodeCatalogResponse(**h.model_dump()) for h in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/hs-codes", response_model=HSCodeCatalogResponse)
def create_hs_code(
    payload: HSCodeCatalogCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new HS code entry"""
    tenant_id = str(current_user.tenant_id)

    existing = session.exec(
        select(HSCodeCatalog).where(
            HSCodeCatalog.tenant_id == tenant_id,
            HSCodeCatalog.hs_code == payload.hs_code
        )
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="HS code already exists")

    hs = HSCodeCatalog(
        tenant_id=tenant_id,
        created_by=str(current_user.id),
        **payload.model_dump()
    )

    session.add(hs)
    session.commit()
    session.refresh(hs)

    return HSCodeCatalogResponse(**hs.model_dump())


@router.get("/hs-codes/{hs_id}", response_model=HSCodeCatalogResponse)
def get_hs_code(
    hs_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get HS code by ID"""
    tenant_id = str(current_user.tenant_id)

    hs = session.exec(
        select(HSCodeCatalog).where(
            HSCodeCatalog.id == hs_id,
            HSCodeCatalog.tenant_id == tenant_id
        )
    ).first()

    if not hs:
        raise HTTPException(status_code=404, detail="HS code not found")

    return HSCodeCatalogResponse(**hs.model_dump())


@router.get("/hs-codes/lookup/{hs_code}")
def lookup_hs_code(
    hs_code: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Lookup HS code by code string"""
    tenant_id = str(current_user.tenant_id)

    hs = session.exec(
        select(HSCodeCatalog).where(
            HSCodeCatalog.tenant_id == tenant_id,
            HSCodeCatalog.hs_code == hs_code,
            HSCodeCatalog.is_active == True
        )
    ).first()

    if not hs:
        return {"found": False, "hs_code": hs_code}

    return {
        "found": True,
        "hs_code": hs.hs_code,
        "description_vi": hs.description_vi,
        "description_en": hs.description_en,
        "unit_code": hs.unit_code,
        "unit_name": hs.unit_name,
        "import_duty_rate": hs.import_duty_rate,
        "preferential_rate": hs.preferential_rate,
        "vat_rate": hs.vat_rate,
        "special_consumption_rate": hs.special_consumption_rate,
        "requires_license": hs.requires_license,
        "requires_inspection": hs.requires_inspection,
    }


@router.get("/hs-code-catalog/lookup")
def lookup_hs_by_product_code(
    product_code: str = Query(..., description="Mã hàng doanh nghiệp (Customer PN)"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Lookup HS code by product_code (Customer PN).
    Dùng để auto-fill mã HS khi nhập mã hàng trong form khai báo.
    """
    tenant_id = str(current_user.tenant_id)

    # Tìm theo product_code chính xác
    hs = session.exec(
        select(HSCodeCatalog).where(
            HSCodeCatalog.tenant_id == tenant_id,
            HSCodeCatalog.product_code == product_code,
            HSCodeCatalog.is_active == True
        )
    ).first()

    if not hs:
        # Thử tìm theo product_code gần đúng (starts with)
        hs = session.exec(
            select(HSCodeCatalog).where(
                HSCodeCatalog.tenant_id == tenant_id,
                HSCodeCatalog.product_code.ilike(f"{product_code}%"),
                HSCodeCatalog.is_active == True
            )
        ).first()

    if not hs:
        return {"found": False, "product_code": product_code}

    return {
        "found": True,
        "hs_code": hs.hs_code,
        "product_name": hs.description_vi,
        "hs_description": hs.description_en,
        "import_duty_rate": hs.import_duty_rate,
        "vat_rate": hs.vat_rate,
        "unit_code": hs.unit_code,
        "product_code": product_code,
    }


@router.put("/hs-codes/{hs_id}", response_model=HSCodeCatalogResponse)
def update_hs_code(
    hs_id: str,
    payload: HSCodeCatalogCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update HS code entry"""
    tenant_id = str(current_user.tenant_id)

    hs = session.exec(
        select(HSCodeCatalog).where(
            HSCodeCatalog.id == hs_id,
            HSCodeCatalog.tenant_id == tenant_id
        )
    ).first()

    if not hs:
        raise HTTPException(status_code=404, detail="HS code not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(hs, key, value)

    hs.updated_at = datetime.utcnow()
    hs.updated_by = str(current_user.id)

    session.add(hs)
    session.commit()
    session.refresh(hs)

    return HSCodeCatalogResponse(**hs.model_dump())


@router.delete("/hs-codes/{hs_id}")
def delete_hs_code(
    hs_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete HS code entry"""
    tenant_id = str(current_user.tenant_id)

    hs = session.exec(
        select(HSCodeCatalog).where(
            HSCodeCatalog.id == hs_id,
            HSCodeCatalog.tenant_id == tenant_id
        )
    ).first()

    if not hs:
        raise HTTPException(status_code=404, detail="HS code not found")

    session.delete(hs)
    session.commit()

    return {"message": "HS code deleted"}


@router.post("/hs-codes/fix-columns")
def fix_hs_code_columns(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Fix swapped columns in HS code catalog.
    Current state (wrong):
    - hs_code contains product_code values
    - description_en contains hs_code values

    Target state (correct):
    - hs_code: actual HS codes
    - product_code: product codes
    """
    tenant_id = str(current_user.tenant_id)

    # Get all HS codes for this tenant
    hs_codes = session.exec(
        select(HSCodeCatalog).where(HSCodeCatalog.tenant_id == tenant_id)
    ).all()

    updated_count = 0
    for hs in hs_codes:
        # Only swap if description_en has a value (contains actual HS code)
        if hs.description_en:
            old_hs_code = hs.hs_code  # This is actually product_code
            old_desc_en = hs.description_en  # This is actually hs_code

            # Swap values
            hs.product_code = old_hs_code  # Save product code
            hs.hs_code = old_desc_en  # Fix HS code
            hs.description_en = None  # Clear

            session.add(hs)
            updated_count += 1

    session.commit()

    return {
        "message": f"Fixed {updated_count} HS code entries",
        "total_processed": len(hs_codes),
        "updated": updated_count
    }


# ============================================================
# Currency APIs
# ============================================================

class CurrencyCreate(BaseModel):
    code: str
    numeric_code: Optional[str] = None
    name_en: str
    name_vi: Optional[str] = None
    symbol: Optional[str] = None
    exchange_rate: Optional[float] = None
    rate_date: Optional[datetime] = None
    decimal_places: int = 2


class CurrencyResponse(BaseModel):
    id: str
    code: str
    numeric_code: Optional[str]
    name_en: str
    name_vi: Optional[str]
    symbol: Optional[str]
    exchange_rate: Optional[float]
    rate_date: Optional[datetime]
    decimal_places: int
    is_active: bool
    created_at: datetime


class CurrencyListResponse(BaseModel):
    items: List[CurrencyResponse]
    total: int
    page: int
    page_size: int


@router.get("/currencies", response_model=CurrencyListResponse)
def list_currencies(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    search: Optional[str] = None,
    is_active: Optional[bool] = True,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List currencies"""
    tenant_id = str(current_user.tenant_id)

    query = select(Currency).where(Currency.tenant_id == tenant_id)

    if search:
        query = query.where(
            or_(
                Currency.code.ilike(f"%{search}%"),
                Currency.name_en.ilike(f"%{search}%"),
                Currency.name_vi.ilike(f"%{search}%"),
            )
        )
    if is_active is not None:
        query = query.where(Currency.is_active == is_active)

    total = session.exec(select(func.count()).select_from(query.subquery())).one()

    query = query.order_by(Currency.code)
    query = query.offset((page - 1) * page_size).limit(page_size)

    items = session.exec(query).all()

    return CurrencyListResponse(
        items=[CurrencyResponse(**c.model_dump()) for c in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/currencies", response_model=CurrencyResponse)
def create_currency(
    payload: CurrencyCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new currency"""
    tenant_id = str(current_user.tenant_id)

    existing = session.exec(
        select(Currency).where(
            Currency.tenant_id == tenant_id,
            Currency.code == payload.code.upper()
        )
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Currency code already exists")

    currency = Currency(
        tenant_id=tenant_id,
        code=payload.code.upper(),
        numeric_code=payload.numeric_code,
        name_en=payload.name_en,
        name_vi=payload.name_vi,
        symbol=payload.symbol,
        exchange_rate=payload.exchange_rate,
        rate_date=payload.rate_date,
        decimal_places=payload.decimal_places,
        created_by=str(current_user.id),
    )

    session.add(currency)
    session.commit()
    session.refresh(currency)

    return CurrencyResponse(**currency.model_dump())


@router.put("/currencies/{currency_id}", response_model=CurrencyResponse)
def update_currency(
    currency_id: str,
    payload: CurrencyCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update currency"""
    tenant_id = str(current_user.tenant_id)

    currency = session.exec(
        select(Currency).where(
            Currency.id == currency_id,
            Currency.tenant_id == tenant_id
        )
    ).first()

    if not currency:
        raise HTTPException(status_code=404, detail="Currency not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        if key == "code":
            value = value.upper()
        setattr(currency, key, value)

    currency.updated_at = datetime.utcnow()
    currency.updated_by = str(current_user.id)

    session.add(currency)
    session.commit()
    session.refresh(currency)

    return CurrencyResponse(**currency.model_dump())


@router.delete("/currencies/{currency_id}")
def delete_currency(
    currency_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete currency"""
    tenant_id = str(current_user.tenant_id)

    currency = session.exec(
        select(Currency).where(
            Currency.id == currency_id,
            Currency.tenant_id == tenant_id
        )
    ).first()

    if not currency:
        raise HTTPException(status_code=404, detail="Currency not found")

    session.delete(currency)
    session.commit()

    return {"message": "Currency deleted"}
