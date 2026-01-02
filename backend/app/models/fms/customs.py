"""
FMS Customs Model - Customs declaration management
Hải quan xuất nhập khẩu
"""
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime, date
from enum import Enum
import uuid


class DeclarationType(str, Enum):
    """Loại tờ khai"""
    EXPORT = "EXPORT"  # Tờ khai xuất khẩu
    IMPORT = "IMPORT"  # Tờ khai nhập khẩu
    TRANSIT = "TRANSIT"  # Tờ khai quá cảnh
    TEMPORARY_IMPORT = "TEMPORARY_IMPORT"  # Tạm nhập
    TEMPORARY_EXPORT = "TEMPORARY_EXPORT"  # Tạm xuất
    RE_IMPORT = "RE_IMPORT"  # Tái nhập
    RE_EXPORT = "RE_EXPORT"  # Tái xuất


class DeclarationStatus(str, Enum):
    """Trạng thái tờ khai"""
    DRAFT = "DRAFT"  # Bản nháp
    SUBMITTED = "SUBMITTED"  # Đã nộp
    PROCESSING = "PROCESSING"  # Đang xử lý
    DOCUMENT_CHECK = "DOCUMENT_CHECK"  # Kiểm tra hồ sơ (Luồng vàng)
    PHYSICAL_CHECK = "PHYSICAL_CHECK"  # Kiểm tra thực tế (Luồng đỏ)
    APPROVED = "APPROVED"  # Đã duyệt (Luồng xanh)
    DUTY_PAID = "DUTY_PAID"  # Đã nộp thuế
    RELEASED = "RELEASED"  # Đã thông quan
    CANCELLED = "CANCELLED"  # Đã hủy
    REJECTED = "REJECTED"  # Bị từ chối


class CustomsDeclaration(SQLModel, table=True):
    """
    Customs Declaration - Tờ khai hải quan
    """
    __tablename__ = "fms_customs_declarations"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Liên kết
    shipment_id: str = Field(index=True)

    # Declaration info
    declaration_no: Optional[str] = Field(default=None, index=True)  # Số tờ khai
    declaration_type: str = Field(default=DeclarationType.EXPORT.value)
    status: str = Field(default=DeclarationStatus.DRAFT.value)

    # Reference
    reference_no: Optional[str] = None  # Số tham chiếu nội bộ

    # Registration
    registration_date: Optional[date] = None  # Ngày đăng ký
    registration_time: Optional[datetime] = None

    # Customs office
    customs_office_code: Optional[str] = None  # Mã chi cục hải quan
    customs_office_name: Optional[str] = None
    customs_sub_dept: Optional[str] = None  # Đội/Tổ nghiệp vụ

    # Channel/Lane
    customs_channel: Optional[str] = None  # GREEN, YELLOW, RED
    check_result: Optional[str] = None

    # Declarant (Người khai)
    declarant_name: Optional[str] = None
    declarant_tax_code: Optional[str] = None
    declarant_address: Optional[str] = None

    # Importer/Exporter
    trader_name: Optional[str] = None  # Tên doanh nghiệp XNK
    trader_tax_code: Optional[str] = None
    trader_address: Optional[str] = None

    # Customs broker
    broker_name: Optional[str] = None  # Đại lý hải quan
    broker_code: Optional[str] = None
    broker_tax_code: Optional[str] = None

    # Counterparty (đối tác nước ngoài)
    foreign_partner_name: Optional[str] = None
    foreign_partner_country: Optional[str] = None

    # Contract/Invoice
    contract_no: Optional[str] = None
    contract_date: Optional[date] = None
    invoice_no: Optional[str] = None
    invoice_date: Optional[date] = None

    # Transport
    transport_mode: Optional[str] = None  # SEA, AIR, ROAD, RAIL
    bl_no: Optional[str] = None  # Số vận đơn
    bl_date: Optional[date] = None
    vessel_name: Optional[str] = None
    voyage_no: Optional[str] = None

    # Port/Place
    loading_port: Optional[str] = None  # Cảng xếp hàng
    loading_port_name: Optional[str] = None
    discharge_port: Optional[str] = None  # Cảng dỡ hàng
    discharge_port_name: Optional[str] = None
    border_gate: Optional[str] = None  # Cửa khẩu
    border_gate_name: Optional[str] = None

    # Origin/Destination
    country_of_origin: Optional[str] = None  # Nước xuất xứ
    country_of_destination: Optional[str] = None  # Nước đích

    # Trade terms
    incoterms: Optional[str] = None
    incoterms_place: Optional[str] = None

    # Payment method
    payment_method: Optional[str] = None  # L/C, T/T, D/P, etc.
    payment_terms: Optional[str] = None

    # Currency
    currency_code: str = Field(default="USD")
    exchange_rate: Optional[float] = None

    # Values
    fob_value: float = Field(default=0)  # Trị giá FOB
    cif_value: float = Field(default=0)  # Trị giá CIF
    freight_value: float = Field(default=0)  # Cước vận chuyển
    insurance_value: float = Field(default=0)  # Phí bảo hiểm
    other_costs: float = Field(default=0)  # Chi phí khác
    customs_value: float = Field(default=0)  # Trị giá tính thuế

    # Packages
    total_packages: int = Field(default=0)
    package_unit: Optional[str] = None  # Kiện, thùng, pallet
    gross_weight: float = Field(default=0)  # KG
    net_weight: float = Field(default=0)  # KG

    # Container
    container_numbers: Optional[str] = None  # Danh sách container (JSON)
    container_count: int = Field(default=0)

    # Tax calculation
    import_duty: float = Field(default=0)  # Thuế nhập khẩu
    special_consumption_tax: float = Field(default=0)  # Thuế TTĐB
    vat: float = Field(default=0)  # Thuế GTGT
    environmental_tax: float = Field(default=0)  # Thuế BVMT
    anti_dumping_tax: float = Field(default=0)  # Thuế chống bán phá giá
    safeguard_tax: float = Field(default=0)  # Thuế tự vệ
    other_tax: float = Field(default=0)
    total_tax: float = Field(default=0)  # Tổng thuế

    # Tax payment
    tax_payment_deadline: Optional[date] = None
    tax_payment_date: Optional[date] = None
    tax_receipt_no: Optional[str] = None

    # Release
    release_date: Optional[datetime] = None
    release_by: Optional[str] = None

    # E-Manifest
    emanifest_no: Optional[str] = None
    emanifest_date: Optional[datetime] = None

    # C/O (Certificate of Origin)
    co_no: Optional[str] = None
    co_form: Optional[str] = None  # Form A, D, E, etc.
    co_date: Optional[date] = None
    co_issuing_country: Optional[str] = None

    # Attached documents (JSON list)
    attached_documents: Optional[str] = None

    # HS Codes summary
    hs_codes_summary: Optional[str] = None  # JSON array of HS codes

    # Notes
    description: Optional[str] = None
    notes: Optional[str] = None
    customs_notes: Optional[str] = None

    # File
    declaration_file: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class HSCode(SQLModel, table=True):
    """
    HS Code - Mã số hàng hóa
    Chi tiết từng mặt hàng trong tờ khai
    """
    __tablename__ = "fms_hs_codes"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Liên kết
    declaration_id: str = Field(index=True)
    shipment_id: Optional[str] = None

    # Item number
    item_no: int = Field(default=1)  # Số thứ tự dòng hàng

    # HS Code
    hs_code: str = Field(index=True)  # 8-10 digits
    hs_description: Optional[str] = None  # Mô tả theo biểu thuế

    # Product info
    product_name: Optional[str] = None  # Tên hàng
    product_code: Optional[str] = None  # Mã hàng nội bộ
    product_specification: Optional[str] = None  # Quy cách

    # Origin
    country_of_origin: Optional[str] = None
    origin_criteria: Optional[str] = None  # WO, PE, etc.

    # Quantity
    quantity: float = Field(default=0)
    unit: Optional[str] = None  # Đơn vị tính
    quantity_2: Optional[float] = None  # Số lượng 2
    unit_2: Optional[str] = None  # Đơn vị tính 2

    # Weight
    gross_weight: float = Field(default=0)  # KG
    net_weight: float = Field(default=0)  # KG

    # Price
    unit_price: float = Field(default=0)  # Đơn giá
    currency_code: str = Field(default="USD")
    total_value: float = Field(default=0)  # Tổng trị giá

    # Customs value
    customs_value: float = Field(default=0)  # Trị giá tính thuế

    # Tax rates
    import_duty_rate: float = Field(default=0)  # % thuế NK
    preferential_rate: Optional[float] = None  # % thuế ưu đãi
    special_preferential_rate: Optional[float] = None  # % thuế đặc biệt ưu đãi
    vat_rate: float = Field(default=10)  # % thuế GTGT
    special_consumption_rate: float = Field(default=0)  # % thuế TTĐB
    environmental_rate: float = Field(default=0)  # % thuế BVMT

    # Tax amounts
    import_duty_amount: float = Field(default=0)
    vat_amount: float = Field(default=0)
    special_consumption_amount: float = Field(default=0)
    environmental_amount: float = Field(default=0)
    total_tax_amount: float = Field(default=0)

    # Preferential treatment
    preferential_code: Optional[str] = None  # FTA code
    co_form: Optional[str] = None  # Form of C/O

    # License/Permit
    license_no: Optional[str] = None
    license_date: Optional[date] = None
    license_issuer: Optional[str] = None

    # Notes
    notes: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
