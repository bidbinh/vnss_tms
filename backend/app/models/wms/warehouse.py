"""
WMS - Warehouse & Location Models
Kho và vị trí lưu trữ
"""
from typing import Optional
from sqlmodel import SQLModel, Field
from enum import Enum
from decimal import Decimal
from datetime import datetime
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class WarehouseType(str, Enum):
    """Loại kho"""
    MAIN = "MAIN"                   # Kho chính
    BRANCH = "BRANCH"               # Kho chi nhánh
    TRANSIT = "TRANSIT"             # Kho trung chuyển
    CONSIGNMENT = "CONSIGNMENT"     # Kho ký gửi
    VIRTUAL = "VIRTUAL"             # Kho ảo (dropship)


class ZoneType(str, Enum):
    """Loại khu vực trong kho"""
    RECEIVING = "RECEIVING"         # Khu nhận hàng
    STORAGE = "STORAGE"             # Khu lưu trữ
    PICKING = "PICKING"             # Khu lấy hàng
    PACKING = "PACKING"             # Khu đóng gói
    SHIPPING = "SHIPPING"           # Khu xuất hàng
    QUARANTINE = "QUARANTINE"       # Khu cách ly/kiểm tra
    RETURNS = "RETURNS"             # Khu hàng trả về
    DAMAGED = "DAMAGED"             # Khu hàng hỏng


class LocationType(str, Enum):
    """Loại vị trí lưu trữ"""
    SHELF = "SHELF"                 # Kệ
    RACK = "RACK"                   # Giá
    BIN = "BIN"                     # Thùng/Ô
    FLOOR = "FLOOR"                 # Sàn
    PALLET = "PALLET"               # Pallet
    BULK = "BULK"                   # Khu hàng rời


class Warehouse(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Kho hàng
    Đơn vị quản lý tồn kho cấp cao nhất
    """
    __tablename__ = "wms_warehouses"

    code: str = Field(index=True, nullable=False)           # WH001
    name: str = Field(nullable=False)                        # Kho Bình Dương
    warehouse_type: str = Field(default=WarehouseType.MAIN.value, index=True)

    # Address
    address: Optional[str] = Field(default=None)
    city: Optional[str] = Field(default=None)
    province: Optional[str] = Field(default=None)
    country: str = Field(default="VN")
    postal_code: Optional[str] = Field(default=None)

    # Contact
    phone: Optional[str] = Field(default=None)
    email: Optional[str] = Field(default=None)
    manager_id: Optional[str] = Field(default=None, index=True)  # Employee ID

    # Capacity
    total_area_sqm: Decimal = Field(default=Decimal("0"), max_digits=12, decimal_places=2)
    storage_capacity: Decimal = Field(default=Decimal("0"), max_digits=12, decimal_places=2)
    used_capacity: Decimal = Field(default=Decimal("0"), max_digits=12, decimal_places=2)

    # Settings
    allow_negative_stock: bool = Field(default=False)
    use_lots: bool = Field(default=True)
    use_serial_numbers: bool = Field(default=False)
    use_expiry_dates: bool = Field(default=True)

    # Operating hours
    operating_hours: Optional[str] = Field(default=None)  # JSON: {"mon": "08:00-17:00", ...}

    is_active: bool = Field(default=True)
    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class WarehouseZone(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Khu vực trong kho
    Phân chia kho thành các khu vực chức năng
    """
    __tablename__ = "wms_warehouse_zones"

    warehouse_id: str = Field(foreign_key="wms_warehouses.id", nullable=False, index=True)

    code: str = Field(index=True, nullable=False)           # Z-A, Z-B, RECV
    name: str = Field(nullable=False)                        # Zone A, Receiving Area
    zone_type: str = Field(default=ZoneType.STORAGE.value, index=True)

    # Capacity
    area_sqm: Decimal = Field(default=Decimal("0"), max_digits=12, decimal_places=2)
    storage_capacity: Decimal = Field(default=Decimal("0"), max_digits=12, decimal_places=2)

    # Temperature control
    is_temperature_controlled: bool = Field(default=False)
    min_temperature: Optional[Decimal] = Field(default=None, max_digits=5, decimal_places=2)
    max_temperature: Optional[Decimal] = Field(default=None, max_digits=5, decimal_places=2)

    # Humidity control
    is_humidity_controlled: bool = Field(default=False)
    min_humidity: Optional[Decimal] = Field(default=None, max_digits=5, decimal_places=2)
    max_humidity: Optional[Decimal] = Field(default=None, max_digits=5, decimal_places=2)

    # Access
    restricted_access: bool = Field(default=False)

    is_active: bool = Field(default=True)
    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class StorageLocation(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Vị trí lưu trữ cụ thể
    Ô/kệ/bin lưu trữ hàng hóa
    """
    __tablename__ = "wms_storage_locations"

    warehouse_id: str = Field(foreign_key="wms_warehouses.id", nullable=False, index=True)
    zone_id: Optional[str] = Field(default=None, foreign_key="wms_warehouse_zones.id", index=True)

    # Location identifier (e.g., A-01-02-03 = Aisle-Rack-Shelf-Bin)
    code: str = Field(index=True, nullable=False)           # A-01-02-03
    barcode: Optional[str] = Field(default=None, index=True)

    location_type: str = Field(default=LocationType.BIN.value, index=True)

    # Position
    aisle: Optional[str] = Field(default=None)              # A, B, C
    rack: Optional[str] = Field(default=None)               # 01, 02
    shelf: Optional[str] = Field(default=None)              # 01, 02
    bin: Optional[str] = Field(default=None)                # 01, 02

    # Dimensions
    width_cm: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=2)
    depth_cm: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=2)
    height_cm: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=2)
    max_weight_kg: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=2)

    # Capacity
    max_items: Optional[int] = Field(default=None)
    current_items: int = Field(default=0)

    # Priority
    picking_priority: int = Field(default=0)  # Higher = pick first
    putaway_priority: int = Field(default=0)  # Higher = put first

    # Restrictions
    allowed_product_categories: Optional[str] = Field(default=None)  # JSON array of category IDs
    is_reserved: bool = Field(default=False)
    reserved_for_product_id: Optional[str] = Field(default=None)

    is_active: bool = Field(default=True)
    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)
