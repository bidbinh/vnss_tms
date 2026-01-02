"""
FMS Tracking Model - Real-time shipment tracking
Theo dõi lô hàng theo thời gian thực
"""
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum
import uuid


class TrackingSource(str, Enum):
    """Nguồn tracking"""
    MANUAL = "MANUAL"  # Nhập tay
    CARRIER_API = "CARRIER_API"  # API hãng tàu/hàng không
    SHIPPING_LINE = "SHIPPING_LINE"  # Hãng tàu
    AIRLINE = "AIRLINE"  # Hãng hàng không
    TERMINAL = "TERMINAL"  # Cảng/Terminal
    CUSTOMS = "CUSTOMS"  # Hải quan
    TRUCKER = "TRUCKER"  # Đối tác nội địa
    AGENT = "AGENT"  # Đại lý
    GPS = "GPS"  # Thiết bị GPS


class TrackingEvent(str, Enum):
    """Loại sự kiện tracking"""
    # Booking stage
    BOOKING_CONFIRMED = "BOOKING_CONFIRMED"
    BOOKING_AMENDED = "BOOKING_AMENDED"
    BOOKING_CANCELLED = "BOOKING_CANCELLED"

    # Document stage
    DOCS_RECEIVED = "DOCS_RECEIVED"
    DOCS_SUBMITTED = "DOCS_SUBMITTED"
    BL_DRAFTED = "BL_DRAFTED"
    BL_ISSUED = "BL_ISSUED"
    BL_RELEASED = "BL_RELEASED"
    AWB_ISSUED = "AWB_ISSUED"

    # Customs stage
    CUSTOMS_DOCS_SUBMITTED = "CUSTOMS_DOCS_SUBMITTED"
    CUSTOMS_PROCESSING = "CUSTOMS_PROCESSING"
    CUSTOMS_CLEARED = "CUSTOMS_CLEARED"
    CUSTOMS_HOLD = "CUSTOMS_HOLD"
    CUSTOMS_INSPECTION = "CUSTOMS_INSPECTION"

    # Origin stage (Sea)
    EMPTY_PICKUP = "EMPTY_PICKUP"  # Lấy container rỗng
    CONTAINER_STUFFED = "CONTAINER_STUFFED"  # Đóng hàng
    CARGO_RECEIVED = "CARGO_RECEIVED"  # Đã nhận hàng
    GATE_IN_ORIGIN = "GATE_IN_ORIGIN"  # Vào cảng đi
    LOADED_ON_VESSEL = "LOADED_ON_VESSEL"  # Xếp lên tàu

    # Origin stage (Air)
    CARGO_ACCEPTED = "CARGO_ACCEPTED"  # Đã nhận hàng
    SECURITY_CLEARED = "SECURITY_CLEARED"  # Đã soi chiếu
    MANIFESTED = "MANIFESTED"  # Đã lên manifest
    DEPARTED = "DEPARTED"  # Đã khởi hành

    # In-transit stage
    VESSEL_DEPARTED = "VESSEL_DEPARTED"  # Tàu rời cảng
    IN_TRANSIT = "IN_TRANSIT"  # Đang vận chuyển
    TRANSSHIPMENT = "TRANSSHIPMENT"  # Chuyển tải
    ARRIVED_TRANSHIP_PORT = "ARRIVED_TRANSHIP_PORT"  # Đến cảng trung chuyển
    DEPARTED_TRANSHIP_PORT = "DEPARTED_TRANSHIP_PORT"  # Rời cảng trung chuyển
    VESSEL_ARRIVED = "VESSEL_ARRIVED"  # Tàu đến
    FLIGHT_ARRIVED = "FLIGHT_ARRIVED"  # Máy bay đến

    # Destination stage
    DISCHARGED = "DISCHARGED"  # Dỡ hàng
    GATE_OUT_DEST = "GATE_OUT_DEST"  # Ra cảng đến
    OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY"  # Đang giao hàng
    DELIVERED = "DELIVERED"  # Đã giao hàng
    POD_RECEIVED = "POD_RECEIVED"  # Đã nhận POD

    # Container return
    EMPTY_RETURNED = "EMPTY_RETURNED"  # Đã trả rỗng

    # Exceptions
    DELAY = "DELAY"  # Chậm trễ
    DAMAGE = "DAMAGE"  # Hư hỏng
    LOST = "LOST"  # Thất lạc
    HOLD = "HOLD"  # Giữ hàng
    EXCEPTION = "EXCEPTION"  # Ngoại lệ khác

    # Other
    NOTE = "NOTE"  # Ghi chú
    UPDATE = "UPDATE"  # Cập nhật thông tin


class ShipmentTracking(SQLModel, table=True):
    """
    Shipment Tracking - Theo dõi lô hàng
    Mỗi record là một sự kiện tracking
    """
    __tablename__ = "fms_shipment_tracking"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Liên kết
    shipment_id: str = Field(index=True)
    container_id: Optional[str] = None  # Liên kết container cụ thể
    bl_id: Optional[str] = None
    awb_id: Optional[str] = None

    # Tracking info
    event_type: str = Field(default=TrackingEvent.UPDATE.value)
    event_code: Optional[str] = None  # Mã sự kiện từ carrier
    event_description: str  # Mô tả sự kiện

    # Time
    event_date: datetime  # Thời gian xảy ra sự kiện
    reported_date: datetime = Field(default_factory=datetime.utcnow)  # Thời gian ghi nhận

    # Location
    location_code: Optional[str] = None  # Port/Airport code
    location_name: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    terminal: Optional[str] = None

    # Vessel/Flight info
    vessel_name: Optional[str] = None
    voyage_no: Optional[str] = None
    flight_no: Optional[str] = None

    # Container/Cargo status
    container_no: Optional[str] = None
    status: Optional[str] = None

    # Source
    source: str = Field(default=TrackingSource.MANUAL.value)
    source_reference: Optional[str] = None  # Reference from carrier API

    # ETA update
    new_eta: Optional[datetime] = None
    eta_change_reason: Optional[str] = None

    # Exception details
    is_exception: bool = Field(default=False)
    exception_type: Optional[str] = None
    exception_details: Optional[str] = None
    resolution: Optional[str] = None
    resolved_at: Optional[datetime] = None

    # Notification
    notify_customer: bool = Field(default=False)
    customer_notified: bool = Field(default=False)
    notification_date: Optional[datetime] = None

    # Internal
    is_milestone: bool = Field(default=False)  # Sự kiện quan trọng
    is_visible_to_customer: bool = Field(default=True)

    # Notes
    notes: Optional[str] = None
    internal_notes: Optional[str] = None

    # Attachments
    document_url: Optional[str] = None  # Photo/POD attachment

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
