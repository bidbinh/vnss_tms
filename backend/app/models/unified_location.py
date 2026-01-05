"""
Unified Location Model - Địa điểm thống nhất

Mở rộng từ Location hiện tại, hỗ trợ:
- Global locations (cảng, depot...)
- Actor-owned locations
- Location aliases
- Rate tables
"""
from typing import Optional
from enum import Enum
from sqlmodel import SQLModel, Field, Column, JSON
from app.models.base import BaseUUIDModel, TimestampMixin


class UnifiedLocationType(str, Enum):
    """Loại địa điểm"""
    PORT = "PORT"
    WAREHOUSE = "WAREHOUSE"
    DEPOT = "DEPOT"
    ICD = "ICD"
    INDUSTRIAL_ZONE = "INDUSTRIAL_ZONE"
    CUSTOMER_SITE = "CUSTOMER_SITE"
    FACTORY = "FACTORY"
    TERMINAL = "TERMINAL"
    WARD = "WARD"
    OTHER = "OTHER"


class UnifiedLocationStatus(str, Enum):
    """Trạng thái địa điểm"""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    DELETED = "DELETED"


class UnifiedLocation(BaseUUIDModel, TimestampMixin, SQLModel, table=True):
    """
    Unified Location - Địa điểm mở rộng

    Có thể thuộc về:
    - System (is_global=True): Địa điểm chung (cảng, depot...)
    - Actor (owner_actor_id): Địa điểm riêng của Tenant/Dispatcher
    """
    __tablename__ = "unified_locations"

    # === Ownership ===
    owner_actor_id: Optional[str] = Field(default=None, index=True)  # None = global
    is_global: bool = Field(default=False)  # Địa điểm chung

    # === Basic Info ===
    code: Optional[str] = Field(default=None, index=True)  # Mã địa điểm
    name: str = Field(index=True)
    type: str = Field(default=UnifiedLocationType.OTHER.value, index=True)
    status: str = Field(default=UnifiedLocationStatus.ACTIVE.value, index=True)

    # === Address ===
    address: Optional[str] = Field(default=None)
    ward: Optional[str] = Field(default=None, index=True)
    district: Optional[str] = Field(default=None, index=True)
    city: Optional[str] = Field(default=None, index=True)
    province: Optional[str] = Field(default=None, index=True)
    country: str = Field(default="VN")
    postal_code: Optional[str] = Field(default=None)

    # === Coordinates ===
    latitude: Optional[float] = Field(default=None)
    longitude: Optional[float] = Field(default=None)

    # === Contact ===
    contact_name: Optional[str] = Field(default=None)
    contact_phone: Optional[str] = Field(default=None)
    contact_email: Optional[str] = Field(default=None)

    # === Operating Hours ===
    operating_hours: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    # {"mon": {"open": "08:00", "close": "17:00"}, ...}

    # === Capacity & Features ===
    capacity: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    # {"max_containers": 100, "has_crane": true, ...}
    features: Optional[list] = Field(default=None, sa_column=Column(JSON))
    # ["24/7", "cold_storage", "hazmat_certified"]

    # === Notes ===
    notes: Optional[str] = Field(default=None)
    directions: Optional[str] = Field(default=None)  # Hướng dẫn đi

    # === Metadata ===
    extra_data: Optional[dict] = Field(default=None, sa_column=Column(JSON))

    # === Legacy references ===
    legacy_location_id: Optional[str] = Field(default=None, index=True)
    legacy_site_id: Optional[str] = Field(default=None, index=True)


class LocationAlias(BaseUUIDModel, SQLModel, table=True):
    """
    Location Alias - Tên khác của địa điểm

    Cho phép tìm kiếm theo nhiều tên:
    - Tên tiếng Việt/tiếng Anh
    - Tên viết tắt
    - Tên phổ biến
    """
    __tablename__ = "location_aliases"

    location_id: str = Field(index=True)
    alias: str = Field(index=True)
    language: str = Field(default="vi")  # vi, en, zh...


class UnifiedRate(BaseUUIDModel, TimestampMixin, SQLModel, table=True):
    """
    Unified Rate - Bảng giá theo tuyến

    Giá vận chuyển từ A đến B
    """
    __tablename__ = "unified_rates"

    # === Ownership ===
    owner_actor_id: str = Field(index=True)  # Tenant/Dispatcher sở hữu bảng giá

    # === Route ===
    from_location_id: Optional[str] = Field(default=None, index=True)
    to_location_id: Optional[str] = Field(default=None, index=True)
    # Hoặc theo city/district
    from_city: Optional[str] = Field(default=None, index=True)
    to_city: Optional[str] = Field(default=None, index=True)

    # === Equipment ===
    equipment_type: Optional[str] = Field(default=None)  # 20, 40, 45, TRUCK

    # === Rates ===
    currency: str = Field(default="VND")
    base_rate: float = Field(default=0)
    rate_per_km: Optional[float] = Field(default=None)
    min_charge: Optional[float] = Field(default=None)
    max_charge: Optional[float] = Field(default=None)

    # === Additional Charges ===
    additional_charges: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    # {"detention": 200000, "waiting": 100000, ...}

    # === Validity ===
    valid_from: Optional[str] = Field(default=None)
    valid_until: Optional[str] = Field(default=None)
    is_active: bool = Field(default=True)

    # === Notes ===
    notes: Optional[str] = Field(default=None)

    # === Legacy references ===
    legacy_rate_id: Optional[str] = Field(default=None, index=True)

    # === Metadata ===
    extra_data: Optional[dict] = Field(default=None, sa_column=Column(JSON))
