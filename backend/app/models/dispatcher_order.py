"""
Dispatcher Order Models

Đơn hàng của Dispatcher - không thuộc Tenant nào.
Dispatcher tạo đơn riêng và giao cho Driver trong mạng lưới của mình.
"""
from typing import Optional
from enum import Enum
from sqlmodel import SQLModel, Field
from app.models.base import BaseUUIDModel, TimestampMixin


class DispatcherOrderStatus(str, Enum):
    """Trạng thái đơn hàng"""
    DRAFT = "DRAFT"              # Nháp, chưa giao
    PENDING = "PENDING"          # Đã giao, chờ Driver nhận
    ACCEPTED = "ACCEPTED"        # Driver đã nhận
    IN_TRANSIT = "IN_TRANSIT"    # Đang vận chuyển
    DELIVERED = "DELIVERED"      # Đã giao hàng
    COMPLETED = "COMPLETED"      # Hoàn thành (đã thanh toán)
    CANCELLED = "CANCELLED"      # Đã hủy


class PaymentStatus(str, Enum):
    """Trạng thái thanh toán cho Driver"""
    PENDING = "PENDING"    # Chưa thanh toán
    PAID = "PAID"          # Đã thanh toán


class DispatcherOrder(BaseUUIDModel, TimestampMixin, SQLModel, table=True):
    """
    Đơn hàng của Dispatcher.

    Đây KHÔNG phải là tenant-scoped - đây là đơn hàng cá nhân của Dispatcher.
    Dispatcher thu xếp đơn hàng từ khách quen và giao cho Driver trong mạng lưới.
    """
    __tablename__ = "dispatcher_orders"

    # === Chủ đơn (Dispatcher) ===
    dispatcher_id: str = Field(index=True, nullable=False)

    # === Tài xế được giao ===
    driver_id: Optional[str] = Field(default=None, index=True)
    connection_id: Optional[str] = Field(default=None)  # Link đến WorkerConnection

    # === Mã đơn ===
    order_code: str = Field(index=True, nullable=False)

    # === Trạng thái ===
    status: str = Field(default=DispatcherOrderStatus.DRAFT.value, index=True)

    # === Thông tin khách hàng (text đơn giản, không FK) ===
    customer_name: Optional[str] = Field(default=None, max_length=255)
    customer_phone: Optional[str] = Field(default=None, max_length=50)
    customer_company: Optional[str] = Field(default=None, max_length=255)

    # === Điểm lấy hàng ===
    pickup_address: Optional[str] = Field(default=None)
    pickup_contact: Optional[str] = Field(default=None, max_length=100)
    pickup_phone: Optional[str] = Field(default=None, max_length=50)
    pickup_time: Optional[str] = Field(default=None)  # ISO datetime string

    # === Điểm giao hàng ===
    delivery_address: Optional[str] = Field(default=None)
    delivery_contact: Optional[str] = Field(default=None, max_length=100)
    delivery_phone: Optional[str] = Field(default=None, max_length=50)
    delivery_time: Optional[str] = Field(default=None)  # ISO datetime string

    # === Thông tin hàng hóa ===
    equipment: Optional[str] = Field(default=None, max_length=10)  # "20", "40", "45"
    container_code: Optional[str] = Field(default=None, max_length=50)
    cargo_description: Optional[str] = Field(default=None)
    weight_kg: Optional[float] = Field(default=None)

    # === Doanh thu (Dispatcher thu từ khách) ===
    freight_charge: Optional[float] = Field(default=None)

    # === Thanh toán cho Driver ===
    driver_payment: Optional[float] = Field(default=None)
    payment_status: str = Field(default=PaymentStatus.PENDING.value)
    paid_at: Optional[str] = Field(default=None)

    # === Ghi chú ===
    dispatcher_notes: Optional[str] = Field(default=None)
    driver_notes: Optional[str] = Field(default=None)

    # === Timeline ===
    assigned_at: Optional[str] = Field(default=None)    # Khi giao cho Driver
    accepted_at: Optional[str] = Field(default=None)    # Khi Driver nhận
    started_at: Optional[str] = Field(default=None)     # Khi bắt đầu chạy
    completed_at: Optional[str] = Field(default=None)   # Khi hoàn thành


class DispatcherOrderSequence(BaseUUIDModel, SQLModel, table=True):
    """
    Sequence để tạo mã đơn cho mỗi Dispatcher.
    Mỗi Dispatcher có sequence riêng: DO-001, DO-002, ...
    """
    __tablename__ = "dispatcher_order_sequences"

    dispatcher_id: str = Field(index=True, nullable=False)
    prefix: str = Field(default="DO", max_length=10)
    last_seq: int = Field(default=0)
