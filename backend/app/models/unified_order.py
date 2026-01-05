"""
Unified Order Model - Đơn hàng thống nhất

Một bảng orders duy nhất cho tất cả các loại đơn:
- TENANT_ORDER: Đơn từ Tenant (công ty vận tải)
- DISPATCHER_ORDER: Đơn từ Dispatcher (điều phối viên tự do)
- MARKETPLACE_ORDER: Đơn từ sàn giao dịch (tương lai)
"""
from typing import Optional, List
from datetime import datetime
from enum import Enum
from sqlmodel import SQLModel, Field, Column, JSON
from app.models.base import BaseUUIDModel, TimestampMixin


class OrderSourceType(str, Enum):
    """Nguồn gốc đơn hàng"""
    TENANT = "TENANT"           # Đơn từ công ty (tenant)
    DISPATCHER = "DISPATCHER"   # Đơn từ dispatcher tự do
    MARKETPLACE = "MARKETPLACE" # Đơn từ sàn (tương lai)


class OrderStatus(str, Enum):
    """Trạng thái đơn hàng"""
    DRAFT = "DRAFT"             # Nháp
    PENDING = "PENDING"         # Chờ giao
    ASSIGNED = "ASSIGNED"       # Đã giao cho tài xế
    ACCEPTED = "ACCEPTED"       # Tài xế đã nhận
    IN_TRANSIT = "IN_TRANSIT"   # Đang vận chuyển
    DELIVERED = "DELIVERED"     # Đã giao hàng
    COMPLETED = "COMPLETED"     # Hoàn thành
    CANCELLED = "CANCELLED"     # Đã hủy
    ON_HOLD = "ON_HOLD"         # Tạm giữ


class PaymentStatus(str, Enum):
    """Trạng thái thanh toán"""
    PENDING = "PENDING"
    PARTIAL = "PARTIAL"
    PAID = "PAID"
    OVERDUE = "OVERDUE"
    REFUNDED = "REFUNDED"


class EquipmentType(str, Enum):
    """Loại container/thiết bị"""
    CONT_20 = "20"
    CONT_40 = "40"
    CONT_45 = "45"
    TRUCK = "TRUCK"
    OTHER = "OTHER"


class UnifiedOrder(BaseUUIDModel, TimestampMixin, SQLModel, table=True):
    """
    Unified Order - Đơn hàng thống nhất

    Hỗ trợ tất cả các loại đơn: Tenant, Dispatcher, Marketplace
    """
    __tablename__ = "unified_orders"

    # === Source & Owner ===
    source_type: str = Field(default=OrderSourceType.TENANT.value, index=True)
    owner_actor_id: str = Field(index=True)  # Actor sở hữu đơn (Tenant hoặc Dispatcher)

    # === Order Identification ===
    order_code: str = Field(index=True)  # Mã đơn (unique per owner)
    external_code: Optional[str] = Field(default=None, index=True)  # Mã đơn từ KH

    # === Status ===
    status: str = Field(default=OrderStatus.DRAFT.value, index=True)

    # === Customer Info (Actor reference or inline) ===
    customer_actor_id: Optional[str] = Field(default=None, index=True)  # Nếu là Actor
    # Inline customer info (khi không có Actor)
    customer_name: Optional[str] = Field(default=None)
    customer_phone: Optional[str] = Field(default=None)
    customer_company: Optional[str] = Field(default=None)
    customer_email: Optional[str] = Field(default=None)

    # === Pickup Location ===
    pickup_location_id: Optional[str] = Field(default=None, index=True)  # Nếu là Location
    pickup_address: Optional[str] = Field(default=None)
    pickup_city: Optional[str] = Field(default=None)
    pickup_district: Optional[str] = Field(default=None)
    pickup_contact: Optional[str] = Field(default=None)
    pickup_phone: Optional[str] = Field(default=None)
    pickup_time: Optional[datetime] = Field(default=None)
    pickup_notes: Optional[str] = Field(default=None)

    # === Delivery Location ===
    delivery_location_id: Optional[str] = Field(default=None, index=True)  # Nếu là Location
    delivery_address: Optional[str] = Field(default=None)
    delivery_city: Optional[str] = Field(default=None)
    delivery_district: Optional[str] = Field(default=None)
    delivery_contact: Optional[str] = Field(default=None)
    delivery_phone: Optional[str] = Field(default=None)
    delivery_time: Optional[datetime] = Field(default=None)
    delivery_notes: Optional[str] = Field(default=None)

    # === Cargo Details ===
    equipment_type: Optional[str] = Field(default=None)  # 20, 40, 45, TRUCK
    container_code: Optional[str] = Field(default=None, index=True)
    seal_number: Optional[str] = Field(default=None)
    cargo_description: Optional[str] = Field(default=None)
    weight_kg: Optional[float] = Field(default=None)
    cbm: Optional[float] = Field(default=None)  # Cubic meters
    package_count: Optional[int] = Field(default=None)
    commodity_type: Optional[str] = Field(default=None)
    is_hazardous: bool = Field(default=False)
    temperature_required: Optional[str] = Field(default=None)

    # === Financials ===
    currency: str = Field(default="VND")
    freight_charge: Optional[float] = Field(default=None)  # Cước phí từ KH
    additional_charges: Optional[float] = Field(default=None)
    total_charge: Optional[float] = Field(default=None)  # Tổng thu từ KH
    cost_estimate: Optional[float] = Field(default=None)  # Chi phí ước tính
    profit_estimate: Optional[float] = Field(default=None)

    # Payment tracking
    payment_status: str = Field(default=PaymentStatus.PENDING.value, index=True)
    payment_due_date: Optional[datetime] = Field(default=None)
    amount_paid: float = Field(default=0)
    payment_notes: Optional[str] = Field(default=None)

    # === Assignment ===
    # Có thể giao cho nhiều tài xế qua OrderAssignment
    primary_driver_actor_id: Optional[str] = Field(default=None, index=True)
    primary_vehicle_id: Optional[str] = Field(default=None)
    driver_payment: Optional[float] = Field(default=None)  # Tiền trả cho tài xế
    driver_payment_status: str = Field(default=PaymentStatus.PENDING.value)

    # === Timeline ===
    assigned_at: Optional[datetime] = Field(default=None)
    accepted_at: Optional[datetime] = Field(default=None)
    started_at: Optional[datetime] = Field(default=None)
    picked_up_at: Optional[datetime] = Field(default=None)
    delivered_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)
    cancelled_at: Optional[datetime] = Field(default=None)

    # === Notes ===
    internal_notes: Optional[str] = Field(default=None)  # Ghi chú nội bộ
    driver_notes: Optional[str] = Field(default=None)    # Ghi chú từ tài xế
    customer_notes: Optional[str] = Field(default=None)  # Ghi chú từ KH

    # === Documents & Attachments ===
    attachments: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    # Ví dụ: {"pod": "url", "bol": "url", "photos": ["url1", "url2"]}

    # === Metadata ===
    extra_data: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    tags: Optional[list] = Field(default=None, sa_column=Column(JSON))

    # === Legacy references (để backward compatible) ===
    legacy_order_id: Optional[str] = Field(default=None, index=True)
    legacy_dispatcher_order_id: Optional[str] = Field(default=None, index=True)
    legacy_tenant_id: Optional[str] = Field(default=None, index=True)


class OrderAssignment(BaseUUIDModel, TimestampMixin, SQLModel, table=True):
    """
    Order Assignment - Phân công đơn hàng

    Hỗ trợ:
    - Giao đơn cho nhiều tài xế (chia chặng)
    - Theo dõi trạng thái từng assignment
    - Thanh toán riêng cho từng tài xế
    """
    __tablename__ = "order_assignments"

    # === References ===
    order_id: str = Field(index=True)
    driver_actor_id: str = Field(index=True)  # Tài xế được giao
    vehicle_id: Optional[str] = Field(default=None)

    # === Assignment Context ===
    assigned_by_actor_id: str = Field(index=True)  # Người giao (dispatcher/owner)
    connection_id: Optional[str] = Field(default=None)  # Nếu giao qua connection

    # === Segment (nếu chia chặng) ===
    segment_number: int = Field(default=1)
    segment_type: Optional[str] = Field(default=None)  # PICKUP, DELIVERY, FULL
    segment_from: Optional[str] = Field(default=None)
    segment_to: Optional[str] = Field(default=None)

    # === Status ===
    status: str = Field(default="PENDING", index=True)
    # PENDING, ACCEPTED, DECLINED, IN_PROGRESS, COMPLETED, CANCELLED

    # === Response ===
    responded_at: Optional[datetime] = Field(default=None)
    decline_reason: Optional[str] = Field(default=None)

    # === Timeline ===
    accepted_at: Optional[datetime] = Field(default=None)
    started_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)

    # === Payment ===
    payment_amount: Optional[float] = Field(default=None)
    payment_status: str = Field(default=PaymentStatus.PENDING.value)
    paid_at: Optional[datetime] = Field(default=None)

    # === Notes & Proof ===
    driver_notes: Optional[str] = Field(default=None)
    proof_of_delivery: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    # {"photos": [], "signature": "", "notes": ""}

    # === Metadata ===
    extra_data: Optional[dict] = Field(default=None, sa_column=Column(JSON))


class UnifiedOrderSequence(BaseUUIDModel, SQLModel, table=True):
    """
    Unified Order Sequence - Quản lý mã đơn tự động

    Mỗi Actor (Tenant/Dispatcher) có sequence riêng
    """
    __tablename__ = "unified_order_sequences"

    actor_id: str = Field(index=True)  # Actor sở hữu sequence
    prefix: str = Field(default="ORD")  # Prefix cho mã đơn
    last_seq: int = Field(default=0)
    year: int = Field(default=2026)  # Reset theo năm nếu cần

    class Config:
        # Unique constraint: actor_id + prefix + year
        pass


class OrderStatusHistory(BaseUUIDModel, SQLModel, table=True):
    """
    Order Status History - Lịch sử trạng thái đơn
    """
    __tablename__ = "order_status_history"

    order_id: str = Field(index=True)
    from_status: Optional[str] = Field(default=None)
    to_status: str
    changed_by_actor_id: Optional[str] = Field(default=None)
    changed_at: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = Field(default=None)
    extra_data: Optional[dict] = Field(default=None, sa_column=Column(JSON))
