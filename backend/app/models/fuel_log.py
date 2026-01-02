from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import date as date_type
from .base import BaseUUIDModel, TimestampMixin, TenantScoped

class FuelLog(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    __tablename__ = "fuel_logs"

    # Basic info
    date: date_type = Field(index=True, nullable=False)  # Ngày
    vehicle_id: str = Field(foreign_key="vehicles.id", index=True, nullable=False)  # Số xe
    driver_id: str = Field(foreign_key="drivers.id", index=True, nullable=False)  # Tài xế

    # Kilometer reading
    odometer_km: int = Field(nullable=False)  # Chỉ số đồng hồ Km xe

    # Fuel amounts
    actual_liters: float = Field(nullable=False)  # Đổ thực tế (lít)
    gps_liters: Optional[float] = Field(default=None)  # Đổ trên định vị (lít)
    difference_liters: Optional[float] = Field(default=None)  # Chênh lệch (lít) = actual - gps

    # Pricing
    unit_price: int = Field(nullable=False)  # Đơn giá (VND/lít)
    discount_price: Optional[int] = Field(default=None)  # Giá chiết khấu (VND/lít)
    total_amount: int = Field(nullable=False)  # Tổng tiền (VND)

    # Additional info
    note: Optional[str] = Field(default=None)  # Ghi chú
    payment_status: str = Field(default="UNPAID", index=True)  # Trạng thái thanh toán: UNPAID, PAID

    # Station info (optional)
    station_name: Optional[str] = Field(default=None)  # Tên trạm xăng
    station_location: Optional[str] = Field(default=None)  # Địa điểm trạm

    # Image attachments (file paths)
    pump_image: Optional[str] = Field(default=None)  # Ảnh màn hình bơm xăng
    plate_image: Optional[str] = Field(default=None)  # Ảnh biển số xe
    odometer_image: Optional[str] = Field(default=None)  # Ảnh đồng hồ km
