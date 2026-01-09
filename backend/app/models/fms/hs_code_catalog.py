"""
FMS HS Code Catalog - Bảng tra cứu mã HS từ mã hàng
Sử dụng để VLOOKUP: product_code -> hs_code, tax rates, etc.
"""
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
import uuid


class HSCodeCatalog(SQLModel, table=True):
    """
    HS Code Catalog - Danh mục mã HS
    Dùng để tra cứu tự động khi nhập mã hàng của doanh nghiệp
    """
    __tablename__ = "fms_hs_code_catalog"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # === MÃ HÀNG CỦA DOANH NGHIỆP ===
    product_code: str = Field(index=True)  # Mã hàng DN (Customer PN / DELL PN)
    supplier_code: Optional[str] = None  # Mã nhà cung cấp (Supplier PN)
    product_name: Optional[str] = None  # Tên hàng tiếng Việt
    product_name_en: Optional[str] = None  # Tên hàng tiếng Anh

    # === HS CODE MAPPING ===
    hs_code: str = Field(index=True)  # Mã HS 8 hoặc 10 số
    hs_description: Optional[str] = None  # Mô tả theo biểu thuế VN
    hs_description_en: Optional[str] = None  # Mô tả tiếng Anh

    # === THUẾ SUẤT MẶC ĐỊNH ===
    import_duty_rate: float = Field(default=0)  # % Thuế nhập khẩu
    vat_rate: float = Field(default=10)  # % Thuế GTGT
    special_consumption_rate: float = Field(default=0)  # % Thuế TTĐB
    environmental_rate: float = Field(default=0)  # % Thuế BVMT

    # === ƯU ĐÃI FTA ===
    preferential_code: Optional[str] = None  # CPTPP, EVFTA, ACFTA, AKFTA...
    preferential_rate: Optional[float] = None  # % Thuế ưu đãi
    special_preferential_rate: Optional[float] = None  # % Thuế đặc biệt ưu đãi
    co_form_required: Optional[str] = None  # Form C/O yêu cầu: D, E, AK, CPTPP...

    # === QUY CÁCH ===
    unit: Optional[str] = None  # Đơn vị tính chính
    unit_code: Optional[str] = None  # Mã ĐVT VNACCS (KGM, MTR, PCE...)
    unit_2: Optional[str] = None  # Đơn vị tính phụ
    unit_2_code: Optional[str] = None  # Mã ĐVT phụ

    # === THÔNG TIN BỔ SUNG ===
    brand: Optional[str] = None  # Nhãn hiệu
    model: Optional[str] = None  # Model/Kiểu
    specification: Optional[str] = None  # Quy cách chi tiết
    country_of_origin: Optional[str] = None  # Mã nước xuất xứ mặc định

    # === YÊU CẦU GIẤY PHÉP ===
    license_required: bool = Field(default=False)  # Có cần giấy phép không
    license_type: Optional[str] = None  # Loại GP: NK, CQ, VSATTP, KTNN...
    license_issuer: Optional[str] = None  # Cơ quan cấp

    # === PHÂN LOẠI ===
    category: Optional[str] = None  # Phân loại hàng hóa
    sub_category: Optional[str] = None  # Phân loại phụ

    # === TRẠNG THÁI ===
    is_active: bool = Field(default=True)
    notes: Optional[str] = None

    # === AUDIT ===
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class Country(SQLModel, table=True):
    """
    Country Master Data - Danh mục quốc gia
    """
    __tablename__ = "fms_countries"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)

    code: str = Field(index=True, unique=True)  # ISO 2-letter code: VN, CN, US...
    code_3: Optional[str] = None  # ISO 3-letter code: VNM, CHN, USA...
    name_vi: str  # Tên tiếng Việt
    name_en: str  # Tên tiếng Anh

    # VNACCS specific
    vnaccs_code: Optional[str] = None  # Mã VNACCS nếu khác ISO

    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Port(SQLModel, table=True):
    """
    Port Master Data - Danh mục cảng
    """
    __tablename__ = "fms_ports"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)

    code: str = Field(index=True, unique=True)  # UN/LOCODE: VNSGN, VNHPH, CNTAO...
    name_vi: str  # Tên tiếng Việt
    name_en: str  # Tên tiếng Anh

    country_code: str = Field(index=True)  # VN, CN, US...
    port_type: str = Field(default="SEA")  # SEA, AIR, ROAD, RAIL

    # Địa chỉ
    city: Optional[str] = None
    province: Optional[str] = None

    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CustomsOffice(SQLModel, table=True):
    """
    Customs Office Master Data - Danh mục chi cục hải quan
    """
    __tablename__ = "fms_customs_offices"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)

    code: str = Field(index=True, unique=True)  # Mã chi cục: 03CES14, HQHANAM...
    name: str  # Tên chi cục

    parent_code: Optional[str] = None  # Mã cục hải quan (parent)
    parent_name: Optional[str] = None  # Tên cục hải quan

    province: Optional[str] = None  # Tỉnh/TP
    address: Optional[str] = None
    phone: Optional[str] = None
    fax: Optional[str] = None

    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Unit(SQLModel, table=True):
    """
    Unit of Measurement Master Data - Danh mục đơn vị tính
    """
    __tablename__ = "fms_units"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)

    code: str = Field(index=True, unique=True)  # Mã VNACCS: KGM, MTR, PCE, LTR...
    name_vi: str  # Tên tiếng Việt
    name_en: str  # Tên tiếng Anh

    unit_type: Optional[str] = None  # WEIGHT, LENGTH, VOLUME, QUANTITY...

    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
