"""
Unified Vehicle Model - Xe/Phương tiện thống nhất

Quản lý tất cả các loại xe:
- Xe đầu kéo (Tractor)
- Rơ moóc (Trailer)
- Xe tải (Truck)

Có thể thuộc về:
- Tenant (công ty vận tải)
- Driver (tài xế sở hữu)
- Fleet owner (chủ đội xe)
"""
from typing import Optional
from datetime import datetime, date
from enum import Enum
from sqlmodel import SQLModel, Field, Column, JSON
from app.models.base import BaseUUIDModel, TimestampMixin


class VehicleType(str, Enum):
    """Loại phương tiện"""
    TRACTOR = "TRACTOR"     # Đầu kéo
    TRAILER = "TRAILER"     # Rơ moóc
    TRUCK = "TRUCK"         # Xe tải
    CONTAINER = "CONTAINER" # Container (nếu tự sở hữu)


class VehicleStatus(str, Enum):
    """Trạng thái xe"""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    IN_MAINTENANCE = "IN_MAINTENANCE"
    RETIRED = "RETIRED"
    DELETED = "DELETED"


class VehicleOwnershipType(str, Enum):
    """Loại sở hữu"""
    COMPANY = "COMPANY"     # Công ty sở hữu
    DRIVER = "DRIVER"       # Tài xế sở hữu
    LEASED = "LEASED"       # Thuê
    PARTNER = "PARTNER"     # Xe đối tác


class UnifiedVehicle(BaseUUIDModel, TimestampMixin, SQLModel, table=True):
    """
    Unified Vehicle - Phương tiện thống nhất

    Hỗ trợ nhiều hình thức sở hữu và quản lý
    """
    __tablename__ = "unified_vehicles"

    # === Ownership ===
    owner_actor_id: str = Field(index=True)  # Actor sở hữu (Tenant, Driver, Fleet)
    ownership_type: str = Field(default=VehicleOwnershipType.COMPANY.value)
    operator_actor_id: Optional[str] = Field(default=None, index=True)  # Actor vận hành (nếu khác owner)

    # === Basic Info ===
    vehicle_type: str = Field(index=True)  # TRACTOR, TRAILER, TRUCK
    code: Optional[str] = Field(default=None, index=True)  # Mã nội bộ
    license_plate: str = Field(index=True)  # Biển số
    status: str = Field(default=VehicleStatus.ACTIVE.value, index=True)

    # === Vehicle Details ===
    brand: Optional[str] = Field(default=None)
    model: Optional[str] = Field(default=None)
    year_manufactured: Optional[int] = Field(default=None)
    color: Optional[str] = Field(default=None)
    vin_number: Optional[str] = Field(default=None)  # Số khung
    engine_number: Optional[str] = Field(default=None)

    # === Capacity (for trucks/trailers) ===
    capacity_type: Optional[str] = Field(default=None)  # 20, 40, 45
    max_weight_kg: Optional[float] = Field(default=None)
    max_cbm: Optional[float] = Field(default=None)
    axles: Optional[int] = Field(default=None)

    # === Registration & Insurance ===
    registration_number: Optional[str] = Field(default=None)
    registration_expiry: Optional[date] = Field(default=None)
    insurance_number: Optional[str] = Field(default=None)
    insurance_expiry: Optional[date] = Field(default=None)
    inspection_expiry: Optional[date] = Field(default=None)

    # === GPS & Tracking ===
    gps_device_id: Optional[str] = Field(default=None)
    last_known_lat: Optional[float] = Field(default=None)
    last_known_lng: Optional[float] = Field(default=None)
    last_location_update: Optional[datetime] = Field(default=None)

    # === Fuel & Maintenance ===
    fuel_type: Optional[str] = Field(default=None)  # DIESEL, GASOLINE, CNG
    fuel_capacity_liters: Optional[float] = Field(default=None)
    average_fuel_consumption: Optional[float] = Field(default=None)  # L/100km
    last_maintenance_date: Optional[date] = Field(default=None)
    next_maintenance_date: Optional[date] = Field(default=None)
    total_mileage_km: Optional[float] = Field(default=None)

    # === Current Assignment ===
    current_driver_actor_id: Optional[str] = Field(default=None, index=True)
    current_paired_vehicle_id: Optional[str] = Field(default=None)  # Trailer nếu là Tractor

    # === Costs ===
    purchase_cost: Optional[float] = Field(default=None)
    monthly_lease_cost: Optional[float] = Field(default=None)
    depreciation_per_month: Optional[float] = Field(default=None)

    # === Photos & Documents ===
    photos: Optional[list] = Field(default=None, sa_column=Column(JSON))
    documents: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    # {"registration": "url", "insurance": "url", "inspection": "url"}

    # === Notes ===
    notes: Optional[str] = Field(default=None)

    # === Metadata ===
    extra_data: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    tags: Optional[list] = Field(default=None, sa_column=Column(JSON))

    # === Legacy references ===
    legacy_vehicle_id: Optional[str] = Field(default=None, index=True)
    legacy_tenant_id: Optional[str] = Field(default=None, index=True)


class UnifiedVehicleAssignment(BaseUUIDModel, TimestampMixin, SQLModel, table=True):
    """
    Unified Vehicle Assignment - Phân công xe cho tài xế

    Theo dõi lịch sử phân công xe
    """
    __tablename__ = "unified_vehicle_assignments"

    vehicle_id: str = Field(index=True)
    driver_actor_id: str = Field(index=True)
    assigned_by_actor_id: str = Field(index=True)

    # === Period ===
    assigned_at: datetime = Field(default_factory=datetime.utcnow)
    unassigned_at: Optional[datetime] = Field(default=None)
    is_current: bool = Field(default=True, index=True)

    # === Notes ===
    notes: Optional[str] = Field(default=None)

    # === Metadata ===
    extra_data: Optional[dict] = Field(default=None, sa_column=Column(JSON))


class VehiclePairing(BaseUUIDModel, TimestampMixin, SQLModel, table=True):
    """
    Vehicle Pairing - Ghép đầu kéo với rơ moóc
    """
    __tablename__ = "vehicle_pairings"

    tractor_id: str = Field(index=True)
    trailer_id: str = Field(index=True)
    paired_by_actor_id: str = Field(index=True)

    # === Period ===
    paired_at: datetime = Field(default_factory=datetime.utcnow)
    unpaired_at: Optional[datetime] = Field(default=None)
    is_current: bool = Field(default=True, index=True)

    # === Notes ===
    notes: Optional[str] = Field(default=None)


class VehicleMaintenanceLog(BaseUUIDModel, TimestampMixin, SQLModel, table=True):
    """
    Vehicle Maintenance Log - Nhật ký bảo dưỡng xe
    """
    __tablename__ = "vehicle_maintenance_logs"

    vehicle_id: str = Field(index=True)
    performed_by: Optional[str] = Field(default=None)  # Garage/Người thực hiện
    approved_by_actor_id: Optional[str] = Field(default=None)

    # === Maintenance Details ===
    maintenance_type: str  # SCHEDULED, REPAIR, INSPECTION, EMERGENCY
    description: str
    mileage_at_maintenance: Optional[float] = Field(default=None)

    # === Date & Cost ===
    maintenance_date: date
    completion_date: Optional[date] = Field(default=None)
    cost: Optional[float] = Field(default=None)
    currency: str = Field(default="VND")

    # === Parts ===
    parts_replaced: Optional[list] = Field(default=None, sa_column=Column(JSON))
    # [{"name": "Oil Filter", "quantity": 1, "cost": 100000}]

    # === Documents ===
    documents: Optional[list] = Field(default=None, sa_column=Column(JSON))
    # ["invoice_url", "photo_url"]

    # === Notes ===
    notes: Optional[str] = Field(default=None)

    # === Metadata ===
    extra_data: Optional[dict] = Field(default=None, sa_column=Column(JSON))


class VehicleFuelLog(BaseUUIDModel, TimestampMixin, SQLModel, table=True):
    """
    Vehicle Fuel Log - Nhật ký nhiên liệu
    """
    __tablename__ = "vehicle_fuel_logs"

    vehicle_id: str = Field(index=True)
    driver_actor_id: Optional[str] = Field(default=None, index=True)
    order_id: Optional[str] = Field(default=None, index=True)  # Nếu gắn với đơn hàng

    # === Fuel Details ===
    fuel_type: str  # DIESEL, GASOLINE
    liters: float
    price_per_liter: float
    total_cost: float
    currency: str = Field(default="VND")

    # === Location ===
    station_name: Optional[str] = Field(default=None)
    station_address: Optional[str] = Field(default=None)
    latitude: Optional[float] = Field(default=None)
    longitude: Optional[float] = Field(default=None)

    # === Mileage ===
    mileage_at_fill: Optional[float] = Field(default=None)
    distance_since_last_fill: Optional[float] = Field(default=None)
    consumption_l_per_100km: Optional[float] = Field(default=None)

    # === Receipt ===
    receipt_number: Optional[str] = Field(default=None)
    receipt_image: Optional[str] = Field(default=None)

    # === Date ===
    filled_at: datetime = Field(default_factory=datetime.utcnow)

    # === Notes ===
    notes: Optional[str] = Field(default=None)

    # === Metadata ===
    extra_data: Optional[dict] = Field(default=None, sa_column=Column(JSON))
