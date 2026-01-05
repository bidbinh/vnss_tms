"""
Worker Connection Models

Kết nối giữa các Worker (Dispatcher <-> Driver).
Cho phép Dispatcher xây dựng mạng lưới tài xế riêng.
"""
from typing import Optional
from enum import Enum
from sqlmodel import SQLModel, Field, UniqueConstraint
from app.models.base import BaseUUIDModel, TimestampMixin


class ConnectionStatus(str, Enum):
    """Trạng thái kết nối"""
    PENDING = "PENDING"      # Đang chờ phản hồi
    ACCEPTED = "ACCEPTED"    # Đã chấp nhận
    DECLINED = "DECLINED"    # Đã từ chối
    BLOCKED = "BLOCKED"      # Đã chặn


class ConnectionInitiator(str, Enum):
    """Ai khởi tạo kết nối"""
    DISPATCHER = "DISPATCHER"  # Dispatcher mời Driver
    DRIVER = "DRIVER"          # Driver xin gia nhập


class WorkerConnection(BaseUUIDModel, TimestampMixin, SQLModel, table=True):
    """
    Kết nối giữa Dispatcher và Driver.

    Đây KHÔNG phải là tenant-scoped - đây là quan hệ cá nhân giữa 2 workers.
    Một Dispatcher có thể kết nối với nhiều Driver.
    Một Driver có thể kết nối với nhiều Dispatcher.
    """
    __tablename__ = "worker_connections"
    __table_args__ = (
        # Mỗi cặp dispatcher-driver chỉ có 1 connection
        UniqueConstraint("dispatcher_id", "driver_id", name="uq_worker_connection_pair"),
    )

    # === Quan hệ chính ===
    dispatcher_id: str = Field(index=True, nullable=False)  # Worker đóng vai Dispatcher
    driver_id: str = Field(index=True, nullable=False)      # Worker đóng vai Driver

    # === Ai khởi tạo ===
    initiated_by: str = Field(default=ConnectionInitiator.DISPATCHER.value)

    # === Trạng thái ===
    status: str = Field(default=ConnectionStatus.PENDING.value, index=True)

    # === Lời nhắn khi kết nối ===
    message: Optional[str] = Field(default=None)

    # === Phản hồi ===
    responded_at: Optional[str] = Field(default=None)
    decline_reason: Optional[str] = Field(default=None)

    # === Cài đặt thanh toán ===
    enable_payment_tracking: bool = Field(default=False)
    default_payment_per_order: Optional[float] = Field(default=None)

    # === Thống kê ===
    total_orders_completed: int = Field(default=0)
    total_amount_paid: float = Field(default=0.0)
    total_amount_pending: float = Field(default=0.0)

    # === Đánh giá (Dispatcher đánh giá Driver) ===
    rating: Optional[float] = Field(default=None)
    total_ratings: int = Field(default=0)
