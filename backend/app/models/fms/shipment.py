"""
FMS Shipment Model - Core shipment management for freight forwarding
Supports: Sea Freight (FCL/LCL), Air Freight, Express, Cross-border
"""
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime, date
from enum import Enum
import uuid


class ShipmentType(str, Enum):
    """Loại lô hàng"""
    EXPORT = "EXPORT"  # Xuất khẩu
    IMPORT = "IMPORT"  # Nhập khẩu
    CROSS_TRADE = "CROSS_TRADE"  # Hàng qua cảng (không nhập VN)
    DOMESTIC = "DOMESTIC"  # Nội địa


class ShipmentMode(str, Enum):
    """Phương thức vận chuyển"""
    SEA_FCL = "SEA_FCL"  # Đường biển - Full Container Load
    SEA_LCL = "SEA_LCL"  # Đường biển - Less than Container Load
    SEA_BULK = "SEA_BULK"  # Đường biển - Hàng rời
    AIR = "AIR"  # Đường hàng không
    EXPRESS = "EXPRESS"  # Chuyển phát nhanh
    ROAD = "ROAD"  # Đường bộ
    RAIL = "RAIL"  # Đường sắt
    MULTIMODAL = "MULTIMODAL"  # Đa phương thức


class ShipmentStatus(str, Enum):
    """Trạng thái lô hàng"""
    DRAFT = "DRAFT"  # Bản nháp
    BOOKED = "BOOKED"  # Đã booking
    CONFIRMED = "CONFIRMED"  # Đã xác nhận
    DOCS_RECEIVED = "DOCS_RECEIVED"  # Đã nhận chứng từ
    CUSTOMS_PENDING = "CUSTOMS_PENDING"  # Chờ thông quan
    CUSTOMS_CLEARED = "CUSTOMS_CLEARED"  # Đã thông quan
    CARGO_RECEIVED = "CARGO_RECEIVED"  # Đã nhận hàng
    LOADED = "LOADED"  # Đã xếp hàng
    DEPARTED = "DEPARTED"  # Đã khởi hành
    IN_TRANSIT = "IN_TRANSIT"  # Đang vận chuyển
    ARRIVED = "ARRIVED"  # Đã đến
    DISCHARGED = "DISCHARGED"  # Đã dỡ hàng
    DELIVERED = "DELIVERED"  # Đã giao hàng
    COMPLETED = "COMPLETED"  # Hoàn thành
    CANCELLED = "CANCELLED"  # Đã hủy
    ON_HOLD = "ON_HOLD"  # Tạm giữ


class IncotermsType(str, Enum):
    """Điều kiện giao hàng quốc tế (Incoterms 2020)"""
    # Any mode of transport
    EXW = "EXW"  # Ex Works
    FCA = "FCA"  # Free Carrier
    CPT = "CPT"  # Carriage Paid To
    CIP = "CIP"  # Carriage and Insurance Paid To
    DAP = "DAP"  # Delivered at Place
    DPU = "DPU"  # Delivered at Place Unloaded
    DDP = "DDP"  # Delivered Duty Paid
    # Sea and inland waterway only
    FAS = "FAS"  # Free Alongside Ship
    FOB = "FOB"  # Free on Board
    CFR = "CFR"  # Cost and Freight
    CIF = "CIF"  # Cost, Insurance and Freight


class FMSShipment(SQLModel, table=True):
    """
    FMS Shipment - Lô hàng giao nhận quốc tế
    Core entity của FMS module
    """
    __tablename__ = "fms_shipments"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Mã lô hàng
    shipment_no: str = Field(index=True)  # Auto-generated: FMS-2024-00001
    reference_no: Optional[str] = None  # Mã tham chiếu khách hàng

    # Loại và trạng thái
    shipment_type: str = Field(default=ShipmentType.EXPORT.value)
    shipment_mode: str = Field(default=ShipmentMode.SEA_FCL.value)
    status: str = Field(default=ShipmentStatus.DRAFT.value)

    # Điều kiện giao hàng
    incoterms: Optional[str] = None  # EXW, FOB, CIF, etc.
    incoterms_place: Optional[str] = None  # Địa điểm áp dụng incoterms

    # Khách hàng
    customer_id: Optional[str] = Field(default=None, index=True)
    customer_name: Optional[str] = None
    customer_contact: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None

    # Shipper (Người gửi)
    shipper_name: Optional[str] = None
    shipper_address: Optional[str] = None
    shipper_contact: Optional[str] = None
    shipper_phone: Optional[str] = None
    shipper_email: Optional[str] = None

    # Consignee (Người nhận)
    consignee_name: Optional[str] = None
    consignee_address: Optional[str] = None
    consignee_contact: Optional[str] = None
    consignee_phone: Optional[str] = None
    consignee_email: Optional[str] = None

    # Notify Party
    notify_party_name: Optional[str] = None
    notify_party_address: Optional[str] = None
    notify_party_contact: Optional[str] = None

    # Agent tại điểm đi/đến
    origin_agent_id: Optional[str] = None
    destination_agent_id: Optional[str] = None

    # Địa điểm
    origin_port: Optional[str] = None  # Port of Loading (POL)
    origin_port_name: Optional[str] = None
    origin_country: Optional[str] = None
    destination_port: Optional[str] = None  # Port of Discharge (POD)
    destination_port_name: Optional[str] = None
    destination_country: Optional[str] = None
    final_destination: Optional[str] = None  # Place of Delivery

    # Pickup/Delivery Address
    pickup_address: Optional[str] = None
    delivery_address: Optional[str] = None

    # Carrier/Vessel Information
    carrier_id: Optional[str] = None
    carrier_name: Optional[str] = None  # Shipping line / Airline
    carrier_booking_no: Optional[str] = None
    vessel_name: Optional[str] = None  # Tên tàu
    voyage_no: Optional[str] = None  # Số chuyến
    flight_no: Optional[str] = None  # Số chuyến bay (Air)

    # Thời gian
    booking_date: Optional[date] = None
    cargo_ready_date: Optional[date] = None
    etd: Optional[datetime] = None  # Estimated Time of Departure
    eta: Optional[datetime] = None  # Estimated Time of Arrival
    atd: Optional[datetime] = None  # Actual Time of Departure
    ata: Optional[datetime] = None  # Actual Time of Arrival
    cut_off_date: Optional[datetime] = None  # Hạn đóng hàng
    doc_cut_off: Optional[datetime] = None  # Hạn nộp chứng từ

    # Thông tin hàng hóa
    commodity: Optional[str] = None  # Tên hàng hóa
    commodity_code: Optional[str] = None  # Mã HS
    package_qty: int = Field(default=0)  # Số kiện
    package_type: Optional[str] = None  # Loại kiện (Carton, Pallet, etc.)
    gross_weight: float = Field(default=0)  # Tổng trọng lượng (KG)
    net_weight: float = Field(default=0)  # Trọng lượng tịnh (KG)
    volume: float = Field(default=0)  # Thể tích (CBM)
    chargeable_weight: float = Field(default=0)  # Trọng lượng tính cước

    # Container information (for FCL)
    container_qty: int = Field(default=0)
    container_type: Optional[str] = None  # 20GP, 40GP, 40HC, etc.

    # Thông tin tài chính
    freight_amount: float = Field(default=0)  # Cước vận chuyển
    freight_currency: str = Field(default="USD")
    total_charges: float = Field(default=0)  # Tổng phí
    total_cost: float = Field(default=0)  # Tổng chi phí
    profit: float = Field(default=0)  # Lợi nhuận

    # Billing
    invoice_no: Optional[str] = None
    invoice_date: Optional[date] = None
    payment_terms: Optional[str] = None

    # Related documents
    master_bl_no: Optional[str] = None  # Master Bill of Lading
    house_bl_no: Optional[str] = None  # House Bill of Lading
    mawb_no: Optional[str] = None  # Master Air Waybill
    hawb_no: Optional[str] = None  # House Air Waybill
    customs_dec_no: Optional[str] = None  # Số tờ khai hải quan

    # Insurance
    is_insured: bool = Field(default=False)
    insurance_value: float = Field(default=0)
    insurance_company: Optional[str] = None
    insurance_policy_no: Optional[str] = None

    # Ghi chú
    description: Optional[str] = None
    internal_notes: Optional[str] = None
    special_instructions: Optional[str] = None

    # Sales
    sales_person_id: Optional[str] = None
    sales_person_name: Optional[str] = None

    # Quotation reference
    quotation_id: Optional[str] = None
    quotation_no: Optional[str] = None

    # CRM Integration
    opportunity_id: Optional[str] = None

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
    deleted_by: Optional[str] = None
