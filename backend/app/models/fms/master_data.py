"""
FMS Master Data Models - Customs Declaration Reference Data
Dữ liệu danh mục cho khai báo hải quan
"""
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum
import uuid


class PortType(str, Enum):
    """Loại cảng/địa điểm"""
    SEAPORT = "SEAPORT"  # Cảng biển
    AIRPORT = "AIRPORT"  # Sân bay
    ICD = "ICD"  # Cảng cạn (Inland Container Depot)
    BORDER = "BORDER"  # Cửa khẩu biên giới
    BONDED_WAREHOUSE = "BONDED_WAREHOUSE"  # Kho ngoại quan


class Country(SQLModel, table=True):
    """
    Country Master - Danh mục quốc gia
    ISO 3166-1 alpha-2 codes
    """
    __tablename__ = "fms_countries"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Country code (ISO 3166-1 alpha-2)
    code: str = Field(index=True, max_length=2)  # VN, CN, US, HK, etc.
    code_alpha3: Optional[str] = Field(default=None, max_length=3)  # VNM, CHN, USA

    # Names
    name_en: str  # English name
    name_vi: Optional[str] = None  # Vietnamese name
    name_local: Optional[str] = None  # Local name

    # Additional info
    region: Optional[str] = None  # Asia, Europe, Americas, etc.
    currency_code: Optional[str] = None  # VND, USD, CNY
    phone_code: Optional[str] = None  # +84, +86, +1

    # Customs specific
    customs_code: Optional[str] = None  # Mã hải quan (if different from ISO)
    is_fta_partner: bool = Field(default=False)  # Có FTA với VN không
    fta_codes: Optional[str] = None  # JSON list: ["ACFTA", "VKFTA", "EVFTA"]

    # Status
    is_active: bool = Field(default=True)

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class Port(SQLModel, table=True):
    """
    Port/Location Master - Danh mục cảng và địa điểm
    UN/LOCODE standard
    """
    __tablename__ = "fms_ports"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Port code (UN/LOCODE)
    code: str = Field(index=True, max_length=10)  # VNCLI, VNHPH, CNTAO, CNSHA
    country_code: str = Field(max_length=2)  # VN, CN, etc.

    # Names
    name_en: str  # English name
    name_vi: Optional[str] = None  # Vietnamese name
    name_local: Optional[str] = None  # Local name

    # Type
    port_type: str = Field(default=PortType.SEAPORT.value)

    # Location
    city: Optional[str] = None
    province: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    # Customs specific
    customs_office_code: Optional[str] = None  # Mã chi cục HQ quản lý
    is_customs_clearance: bool = Field(default=True)  # Có thể thông quan không

    # Status
    is_active: bool = Field(default=True)

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class CustomsOffice(SQLModel, table=True):
    """
    Customs Office Master - Danh mục chi cục hải quan
    Vietnamese customs administration hierarchy
    """
    __tablename__ = "fms_customs_offices"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Office code
    code: str = Field(index=True, max_length=20)  # HQHANAM, 03CES14
    parent_code: Optional[str] = None  # Mã cơ quan cấp trên

    # Names
    name: str  # Tên chi cục
    name_short: Optional[str] = None  # Tên viết tắt
    name_en: Optional[str] = None  # English name

    # Type/Level
    office_type: Optional[str] = None  # CUSTOMS_DEPT (Cục), SUB_DEPT (Chi cục), TEAM (Đội)
    level: int = Field(default=2)  # 1: Cục, 2: Chi cục, 3: Đội

    # Location
    province: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    fax: Optional[str] = None
    email: Optional[str] = None

    # Ports managed
    managed_ports: Optional[str] = None  # JSON list of port codes

    # Status
    is_active: bool = Field(default=True)

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class HSCodeCatalog(SQLModel, table=True):
    """
    HS Code Catalog - Biểu thuế hàng hóa
    Harmonized System codes with tax rates
    """
    __tablename__ = "fms_hs_code_catalog"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # HS Code
    hs_code: str = Field(index=True, max_length=12)  # 8-10-12 digits
    hs_code_parent: Optional[str] = None  # Parent code (4-6 digits)
    product_code: Optional[str] = Field(default=None, index=True)  # Mã hàng nội bộ (internal product code)

    # Description
    description_en: Optional[str] = None  # English description
    description_vi: str  # Vietnamese description (Mô tả hàng hóa)

    # Unit
    unit_code: Optional[str] = None  # PCE, KGM, MTR, etc.
    unit_name: Optional[str] = None  # Cái, Kg, Mét
    unit_code_2: Optional[str] = None  # Secondary unit
    unit_name_2: Optional[str] = None

    # Tax rates (default/MFN rates)
    import_duty_rate: float = Field(default=0)  # % Thuế nhập khẩu thông thường
    preferential_rate: Optional[float] = None  # % Thuế ưu đãi (MFN)
    vat_rate: float = Field(default=10)  # % Thuế GTGT
    special_consumption_rate: float = Field(default=0)  # % Thuế TTĐB
    environmental_rate: float = Field(default=0)  # % Thuế BVMT
    export_duty_rate: float = Field(default=0)  # % Thuế xuất khẩu

    # Special rates by FTA
    acfta_rate: Optional[float] = None  # ASEAN-China FTA
    akfta_rate: Optional[float] = None  # ASEAN-Korea FTA
    ajcep_rate: Optional[float] = None  # ASEAN-Japan
    vkfta_rate: Optional[float] = None  # Vietnam-Korea FTA
    evfta_rate: Optional[float] = None  # EU-Vietnam FTA
    cptpp_rate: Optional[float] = None  # CPTPP
    rcep_rate: Optional[float] = None  # RCEP

    # Regulations
    requires_license: bool = Field(default=False)  # Cần giấy phép
    requires_inspection: bool = Field(default=False)  # Cần kiểm tra chuyên ngành
    inspection_agency: Optional[str] = None  # Cơ quan kiểm tra
    special_notes: Optional[str] = None  # Ghi chú đặc biệt

    # Classification
    chapter: Optional[str] = None  # Chương (2 digits)
    heading: Optional[str] = None  # Nhóm (4 digits)
    subheading: Optional[str] = None  # Phân nhóm (6 digits)

    # Validity
    valid_from: Optional[datetime] = None
    valid_to: Optional[datetime] = None

    # Status
    is_active: bool = Field(default=True)

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class Currency(SQLModel, table=True):
    """
    Currency Master - Danh mục tiền tệ
    ISO 4217 currency codes
    """
    __tablename__ = "fms_currencies"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Currency code (ISO 4217)
    code: str = Field(index=True, max_length=3)  # USD, VND, EUR, CNY
    numeric_code: Optional[str] = None  # 840, 704, 978, 156

    # Names
    name_en: str  # US Dollar, Vietnamese Dong
    name_vi: Optional[str] = None  # Đô la Mỹ, Đồng Việt Nam
    symbol: Optional[str] = None  # $, ₫, €, ¥

    # Exchange rate (to VND)
    exchange_rate: Optional[float] = None  # Tỷ giá hải quan
    rate_date: Optional[datetime] = None  # Ngày áp dụng tỷ giá

    # Decimal places
    decimal_places: int = Field(default=2)

    # Status
    is_active: bool = Field(default=True)

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class UnitOfMeasure(SQLModel, table=True):
    """
    Unit of Measure Master - Danh mục đơn vị tính
    UN/CEFACT codes
    """
    __tablename__ = "fms_units"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Unit code (UN/CEFACT)
    code: str = Field(index=True, max_length=5)  # PCE, KGM, MTR, LTR, etc.

    # Names
    name_en: str  # Piece, Kilogram, Meter
    name_vi: Optional[str] = None  # Cái, Kg, Mét
    symbol: Optional[str] = None  # kg, m, L

    # Category
    category: Optional[str] = None  # QUANTITY, WEIGHT, LENGTH, VOLUME, AREA

    # Conversion (to base unit)
    base_unit: Optional[str] = None  # Base unit code
    conversion_factor: float = Field(default=1)  # To base unit

    # Status
    is_active: bool = Field(default=True)

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class DeclarationTypeCode(SQLModel, table=True):
    """
    Declaration Type Code Master - Mã loại hình tờ khai
    Vietnamese customs declaration types
    """
    __tablename__ = "fms_declaration_types"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Type code
    code: str = Field(index=True, max_length=10)  # A11, A12, B11, C11, etc.

    # Names
    name: str  # Tên loại hình
    name_en: Optional[str] = None  # English name
    description: Optional[str] = None  # Mô tả chi tiết

    # Category
    category: str  # IMPORT, EXPORT, TRANSIT, TEMPORARY, BONDED
    sub_category: Optional[str] = None

    # Regulations
    requires_license: bool = Field(default=False)
    requires_co: bool = Field(default=False)  # Cần C/O
    special_handling: Optional[str] = None

    # Status
    is_active: bool = Field(default=True)

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class ExemptionCode(SQLModel, table=True):
    """
    Tax Exemption Code Master - Mã miễn/giảm thuế
    Vietnamese customs tax exemption codes
    """
    __tablename__ = "fms_exemption_codes"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Exemption code
    code: str = Field(index=True, max_length=10)  # XNK32, VK130, etc.

    # Names
    name: str  # Tên mã miễn giảm
    name_en: Optional[str] = None  # English name
    description: Optional[str] = None  # Mô tả chi tiết

    # Type
    exemption_type: str  # IMPORT_DUTY, VAT, SPECIAL_CONSUMPTION, ALL

    # Legal basis
    legal_reference: Optional[str] = None  # Căn cứ pháp lý

    # Status
    is_active: bool = Field(default=True)

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
