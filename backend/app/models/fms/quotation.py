"""
FMS Quotation Model - Freight quotation management
Báo giá cước vận chuyển
"""
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime, date
from enum import Enum
import uuid


class QuotationStatus(str, Enum):
    """Trạng thái báo giá"""
    DRAFT = "DRAFT"  # Bản nháp
    PENDING = "PENDING"  # Chờ duyệt
    APPROVED = "APPROVED"  # Đã duyệt
    SENT = "SENT"  # Đã gửi khách
    ACCEPTED = "ACCEPTED"  # Khách chấp nhận
    REJECTED = "REJECTED"  # Khách từ chối
    EXPIRED = "EXPIRED"  # Hết hạn
    CANCELLED = "CANCELLED"  # Đã hủy
    CONVERTED = "CONVERTED"  # Đã chuyển thành shipment


class ChargeType(str, Enum):
    """Loại phí"""
    # Sea Freight
    OCEAN_FREIGHT = "OCEAN_FREIGHT"  # Cước biển
    THC = "THC"  # Terminal Handling Charge
    CFS = "CFS"  # Container Freight Station
    DOC_FEE = "DOC_FEE"  # Documentation fee
    BL_FEE = "BL_FEE"  # Bill of Lading fee
    SEAL_FEE = "SEAL_FEE"  # Seal fee
    AMS = "AMS"  # Automated Manifest System (US)
    ENS = "ENS"  # Entry Summary Declaration (EU)
    AFR = "AFR"  # Advance Filing Rules (Japan)
    VGM = "VGM"  # Verified Gross Mass
    ISPS = "ISPS"  # International Ship and Port Facility Security
    LSS = "LSS"  # Low Sulphur Surcharge
    EBS = "EBS"  # Emergency Bunker Surcharge
    BAF = "BAF"  # Bunker Adjustment Factor
    CAF = "CAF"  # Currency Adjustment Factor
    PSS = "PSS"  # Peak Season Surcharge
    GRI = "GRI"  # General Rate Increase
    DETENTION = "DETENTION"  # Phí lưu container
    DEMURRAGE = "DEMURRAGE"  # Phí lưu bãi
    STORAGE = "STORAGE"  # Phí lưu kho

    # Air Freight
    AIR_FREIGHT = "AIR_FREIGHT"  # Cước hàng không
    AWB_FEE = "AWB_FEE"  # Airway Bill fee
    FUEL_SURCHARGE = "FUEL_SURCHARGE"  # Phụ phí nhiên liệu
    SECURITY_SURCHARGE = "SECURITY_SURCHARGE"  # Phụ phí an ninh
    SCREENING_FEE = "SCREENING_FEE"  # Phí soi chiếu
    HANDLING_FEE = "HANDLING_FEE"  # Phí xử lý

    # Trucking
    TRUCKING = "TRUCKING"  # Cước nội địa
    PICKUP = "PICKUP"  # Phí lấy hàng
    DELIVERY = "DELIVERY"  # Phí giao hàng
    LIFT_ON_OFF = "LIFT_ON_OFF"  # Phí nâng hạ

    # Customs
    CUSTOMS_CLEARANCE = "CUSTOMS_CLEARANCE"  # Phí thông quan
    CUSTOMS_INSPECTION = "CUSTOMS_INSPECTION"  # Phí kiểm hóa
    CO_FEE = "CO_FEE"  # Phí C/O
    FUMIGATION = "FUMIGATION"  # Phí hun trùng
    QUARANTINE = "QUARANTINE"  # Phí kiểm dịch

    # Insurance
    INSURANCE = "INSURANCE"  # Bảo hiểm

    # Other
    AGENCY_FEE = "AGENCY_FEE"  # Phí đại lý
    TELEX_RELEASE = "TELEX_RELEASE"  # Phí telex release
    D_O_FEE = "D_O_FEE"  # Delivery Order fee
    OTHER = "OTHER"  # Phí khác


class FMSQuotation(SQLModel, table=True):
    """
    FMS Quotation - Báo giá cước vận chuyển
    """
    __tablename__ = "fms_quotations"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Quotation info
    quotation_no: str = Field(index=True)  # QT-2024-00001
    quotation_date: date = Field(default_factory=date.today)
    status: str = Field(default=QuotationStatus.DRAFT.value)

    # Validity
    valid_from: Optional[date] = None
    valid_until: Optional[date] = None

    # Customer
    customer_id: Optional[str] = Field(default=None, index=True)
    customer_name: Optional[str] = None
    customer_contact: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None

    # CRM integration
    lead_id: Optional[str] = None
    opportunity_id: Optional[str] = None

    # Shipment type
    shipment_type: Optional[str] = None  # EXPORT, IMPORT
    shipment_mode: Optional[str] = None  # SEA_FCL, SEA_LCL, AIR

    # Route
    origin_port: Optional[str] = None
    origin_port_name: Optional[str] = None
    origin_country: Optional[str] = None
    destination_port: Optional[str] = None
    destination_port_name: Optional[str] = None
    destination_country: Optional[str] = None
    final_destination: Optional[str] = None

    # Pickup/Delivery
    pickup_address: Optional[str] = None
    delivery_address: Optional[str] = None

    # Incoterms
    incoterms: Optional[str] = None
    incoterms_place: Optional[str] = None

    # Service level
    service_type: Optional[str] = None  # PORT_TO_PORT, DOOR_TO_DOOR, etc.

    # Carrier preference
    preferred_carrier: Optional[str] = None
    carrier_name: Optional[str] = None
    transit_time: Optional[str] = None  # e.g., "25-30 days"

    # Cargo info
    commodity: Optional[str] = None
    commodity_code: Optional[str] = None
    package_qty: int = Field(default=0)
    package_type: Optional[str] = None
    gross_weight: float = Field(default=0)
    volume: float = Field(default=0)
    chargeable_weight: float = Field(default=0)

    # Container info (for FCL)
    container_qty: int = Field(default=0)
    container_type: Optional[str] = None  # 20GP, 40GP, 40HC

    # Special requirements
    is_dangerous_goods: bool = Field(default=False)
    is_reefer: bool = Field(default=False)
    temperature: Optional[str] = None
    is_oversize: bool = Field(default=False)
    special_requirements: Optional[str] = None

    # Currency
    currency_code: str = Field(default="USD")

    # Totals (calculated from items)
    subtotal: float = Field(default=0)
    discount_amount: float = Field(default=0)
    discount_percent: float = Field(default=0)
    tax_amount: float = Field(default=0)
    total_amount: float = Field(default=0)

    # Profit calculation
    total_buy_rate: float = Field(default=0)  # Giá mua
    total_sell_rate: float = Field(default=0)  # Giá bán
    profit_amount: float = Field(default=0)  # Lợi nhuận
    profit_margin: float = Field(default=0)  # % lợi nhuận

    # Terms & Conditions
    payment_terms: Optional[str] = None
    terms_conditions: Optional[str] = None
    notes: Optional[str] = None
    internal_notes: Optional[str] = None

    # Approval
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    approval_notes: Optional[str] = None

    # Customer response
    customer_response: Optional[str] = None  # ACCEPTED, REJECTED, NEGOTIATING
    response_date: Optional[datetime] = None
    response_notes: Optional[str] = None

    # Conversion to shipment
    converted_shipment_id: Optional[str] = None
    converted_at: Optional[datetime] = None

    # Sales
    sales_person_id: Optional[str] = None
    sales_person_name: Optional[str] = None

    # Version control
    version: int = Field(default=1)
    parent_quotation_id: Optional[str] = None  # Báo giá gốc (nếu là revision)

    # File attachment
    quotation_file: Optional[str] = None

    # Workflow
    workflow_instance_id: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    # Soft delete
    is_deleted: bool = Field(default=False)
    deleted_at: Optional[datetime] = None


class QuotationItem(SQLModel, table=True):
    """
    Quotation Item - Chi tiết báo giá từng loại phí
    """
    __tablename__ = "fms_quotation_items"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    quotation_id: str = Field(index=True)
    item_no: int = Field(default=1)  # Thứ tự

    # Charge info
    charge_type: str = Field(default=ChargeType.OTHER.value)
    charge_code: Optional[str] = None  # Mã phí
    charge_name: str  # Tên phí
    description: Optional[str] = None

    # Rate
    unit: Optional[str] = None  # Per container, per kg, per shipment
    quantity: float = Field(default=1)
    unit_price: float = Field(default=0)  # Đơn giá
    currency_code: str = Field(default="USD")
    amount: float = Field(default=0)  # Thành tiền

    # Buy/Sell rate
    buy_rate: float = Field(default=0)  # Giá mua
    sell_rate: float = Field(default=0)  # Giá bán
    profit: float = Field(default=0)  # Lợi nhuận

    # Category
    charge_category: Optional[str] = None  # ORIGIN, FREIGHT, DESTINATION
    is_included: bool = Field(default=True)  # Có tính vào tổng không
    is_optional: bool = Field(default=False)  # Phí tùy chọn

    # Payment
    payment_terms: Optional[str] = None  # PREPAID, COLLECT
    payable_to: Optional[str] = None  # Carrier, Agent, etc.

    # Notes
    notes: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
