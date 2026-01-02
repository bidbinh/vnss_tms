from __future__ import annotations
from typing import Optional
from sqlmodel import SQLModel, Field
from datetime import date
from .base import BaseUUIDModel, TimestampMixin, TenantScoped

class MaintenanceRecord(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Lịch sử bảo trì đã thực hiện
    Ghi nhận mỗi lần xe được bảo trì/sửa chữa
    """
    __tablename__ = "maintenance_records"

    vehicle_id: str = Field(foreign_key="vehicles.id", index=True, nullable=False)
    schedule_id: Optional[str] = Field(
        foreign_key="maintenance_schedules.id",
        index=True,
        default=None
    )  # NULL nếu là sửa chữa đột xuất

    # Thông tin bảo trì
    maintenance_type: str = Field(index=True, nullable=False)
    # Giống như maintenance_type trong schedule

    service_date: date = Field(index=True, nullable=False)
    mileage: Optional[int] = Field(default=None)  # Số km lúc bảo trì

    # Mô tả công việc
    description: str = Field(nullable=False)  # Mô tả chi tiết công việc đã làm

    # Thông tin garage/thợ
    garage_name: Optional[str] = Field(default=None)
    mechanic_name: Optional[str] = Field(default=None)
    garage_address: Optional[str] = Field(default=None)
    garage_phone: Optional[str] = Field(default=None)
    driver_name: Optional[str] = Field(default=None)

    # Chi phí tổng
    total_cost: Optional[int] = Field(default=None)  # Tổng chi phí

    # File đính kèm (hóa đơn, ảnh...)
    attachments: Optional[str] = Field(default=None)  # JSON array of file paths

    note: Optional[str] = Field(default=None)
    status: str = Field(default="COMPLETED")  # COMPLETED, CANCELLED
