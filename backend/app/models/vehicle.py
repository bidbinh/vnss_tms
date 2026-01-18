from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import date
from .base import BaseUUIDModel, TimestampMixin, TenantScoped

class Vehicle(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    __tablename__ = "vehicles"

    # Basic info
    code: Optional[str] = Field(default=None, index=True)  # Mã phương tiện (TT)
    plate_no: str = Field(index=True, nullable=False)      # Biển số xe
    type: str = Field(default="TRACTOR")                   # TRACTOR (đầu kéo) / TRAILER (rơ mooc)
    vehicle_type_name: Optional[str] = Field(default=None) # Loại phương tiện (Romooc, Đầu kéo, etc)

    # Manufacturer info
    manufacturer: Optional[str] = Field(default=None)      # Hãng xe (Hyundai, etc)
    model: Optional[str] = Field(default=None)             # Dòng xe (HD700, etc)
    country_of_origin: Optional[str] = Field(default=None) # Nước SX (VN, HQ, etc)
    year_of_manufacture: Optional[int] = Field(default=None) # Thời gian mua (năm)

    # Technical specifications
    chassis_number: Optional[str] = Field(default=None)    # Số Khung
    engine_number: Optional[str] = Field(default=None)     # Số máy
    curb_weight: Optional[int] = Field(default=None)       # Khối lượng bản thân (kg)
    payload_capacity: Optional[int] = Field(default=None)  # Khối lượng hàng (kg)
    gross_weight: Optional[int] = Field(default=None)      # Khối lượng toàn bộ (kg)
    dimensions: Optional[str] = Field(default=None)        # Kích thước bao (e.g., "12310x2500x1490")

    # Registration & inspection
    registration_expiry: Optional[date] = Field(default=None) # Hạn đăng kiểm

    # Maintenance (for auto-scheduling)
    current_mileage: Optional[int] = Field(default=None)  # Current mileage in km
    maintenance_interval_km: Optional[int] = Field(default=None)  # Maintenance interval in km (e.g., 10000)
    maintenance_interval_days: Optional[int] = Field(default=None)  # Maintenance interval in days (e.g., 90)

    # Status
    status: str = Field(default="ACTIVE")                  # ACTIVE, INACTIVE
    inactive_reason: Optional[str] = Field(default=None)   # Lý do ngừng hoạt động
