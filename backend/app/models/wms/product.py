"""
WMS - Product Models
Sản phẩm và thông tin liên quan
"""
from typing import Optional
from sqlmodel import SQLModel, Field
from enum import Enum
from decimal import Decimal
from datetime import datetime
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class LotStatus(str, Enum):
    """Trạng thái lô hàng"""
    AVAILABLE = "AVAILABLE"         # Có thể sử dụng
    QUARANTINE = "QUARANTINE"       # Đang cách ly/kiểm tra
    EXPIRED = "EXPIRED"             # Hết hạn
    DAMAGED = "DAMAGED"             # Hư hỏng
    RESERVED = "RESERVED"           # Đã đặt trước


class ProductCategory(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Danh mục sản phẩm
    Phân loại sản phẩm theo nhóm
    """
    __tablename__ = "wms_product_categories"

    code: str = Field(index=True, nullable=False)           # CAT001
    name: str = Field(nullable=False)                        # Linh kiện điện tử
    parent_id: Optional[str] = Field(default=None, foreign_key="wms_product_categories.id", index=True)
    level: int = Field(default=1)

    # Settings
    requires_lot: bool = Field(default=False)
    requires_serial: bool = Field(default=False)
    requires_expiry: bool = Field(default=False)

    # Storage conditions
    temperature_min: Optional[Decimal] = Field(default=None, max_digits=5, decimal_places=2)
    temperature_max: Optional[Decimal] = Field(default=None, max_digits=5, decimal_places=2)
    humidity_max: Optional[Decimal] = Field(default=None, max_digits=5, decimal_places=2)

    # Default accounts
    inventory_account_id: Optional[str] = Field(default=None)  # TK 152, 153, 155, 156
    cogs_account_id: Optional[str] = Field(default=None)       # TK 632
    revenue_account_id: Optional[str] = Field(default=None)    # TK 511

    is_active: bool = Field(default=True)
    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class Product(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Sản phẩm
    Hàng hóa/vật tư/nguyên vật liệu
    """
    __tablename__ = "wms_products"

    # Identification
    code: str = Field(index=True, nullable=False)           # SKU001
    name: str = Field(nullable=False)
    short_name: Optional[str] = Field(default=None)
    description: Optional[str] = Field(default=None)

    category_id: Optional[str] = Field(default=None, foreign_key="wms_product_categories.id", index=True)

    # Tracking
    track_lot: bool = Field(default=False)
    track_serial: bool = Field(default=False)
    track_expiry: bool = Field(default=False)

    # Units
    base_unit_id: Optional[str] = Field(default=None, foreign_key="wms_product_units.id")
    purchase_unit_id: Optional[str] = Field(default=None, foreign_key="wms_product_units.id")
    sales_unit_id: Optional[str] = Field(default=None, foreign_key="wms_product_units.id")

    # Dimensions
    weight_kg: Decimal = Field(default=Decimal("0"), max_digits=12, decimal_places=4)
    length_cm: Decimal = Field(default=Decimal("0"), max_digits=10, decimal_places=2)
    width_cm: Decimal = Field(default=Decimal("0"), max_digits=10, decimal_places=2)
    height_cm: Decimal = Field(default=Decimal("0"), max_digits=10, decimal_places=2)
    volume_cbm: Decimal = Field(default=Decimal("0"), max_digits=12, decimal_places=6)

    # Pricing
    standard_cost: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    list_price: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    currency: str = Field(default="VND")

    # Stock settings
    min_stock: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    max_stock: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    reorder_point: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    reorder_quantity: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)

    # Lead time
    lead_time_days: int = Field(default=0)

    # Storage
    default_location_id: Optional[str] = Field(default=None)
    shelf_life_days: Optional[int] = Field(default=None)

    # Vendor
    default_vendor_id: Optional[str] = Field(default=None)

    # Images
    image_url: Optional[str] = Field(default=None)

    is_active: bool = Field(default=True)
    is_sellable: bool = Field(default=True)
    is_purchasable: bool = Field(default=True)

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class ProductUnit(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Đơn vị tính sản phẩm
    Hỗ trợ nhiều đơn vị tính cho một sản phẩm
    """
    __tablename__ = "wms_product_units"

    product_id: str = Field(foreign_key="wms_products.id", nullable=False, index=True)

    code: str = Field(index=True, nullable=False)           # PCS, BOX, CARTON
    name: str = Field(nullable=False)                        # Chiếc, Hộp, Thùng

    # Conversion
    is_base_unit: bool = Field(default=False)
    conversion_factor: Decimal = Field(default=Decimal("1"), max_digits=18, decimal_places=6)  # e.g., 12 (1 BOX = 12 PCS)

    # Dimensions (for this unit)
    weight_kg: Decimal = Field(default=Decimal("0"), max_digits=12, decimal_places=4)
    length_cm: Decimal = Field(default=Decimal("0"), max_digits=10, decimal_places=2)
    width_cm: Decimal = Field(default=Decimal("0"), max_digits=10, decimal_places=2)
    height_cm: Decimal = Field(default=Decimal("0"), max_digits=10, decimal_places=2)

    # Barcode
    barcode: Optional[str] = Field(default=None, index=True)

    is_active: bool = Field(default=True)
    created_by: Optional[str] = Field(default=None)


class ProductBarcode(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Barcode sản phẩm
    Hỗ trợ nhiều barcode cho một sản phẩm
    """
    __tablename__ = "wms_product_barcodes"

    product_id: str = Field(foreign_key="wms_products.id", nullable=False, index=True)
    unit_id: Optional[str] = Field(default=None, foreign_key="wms_product_units.id")

    barcode: str = Field(index=True, nullable=False)
    barcode_type: str = Field(default="EAN13")  # EAN13, EAN8, UPC, CODE128, QR

    is_primary: bool = Field(default=False)
    is_active: bool = Field(default=True)
    created_by: Optional[str] = Field(default=None)


class ProductLot(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Lô hàng (Lot/Batch)
    Theo dõi sản phẩm theo lô
    """
    __tablename__ = "wms_product_lots"

    product_id: str = Field(foreign_key="wms_products.id", nullable=False, index=True)

    lot_number: str = Field(index=True, nullable=False)     # LOT2024001
    serial_number: Optional[str] = Field(default=None, index=True)

    # Dates
    production_date: Optional[datetime] = Field(default=None)
    expiry_date: Optional[datetime] = Field(default=None, index=True)
    received_date: Optional[datetime] = Field(default=None)

    # Source
    supplier_lot_number: Optional[str] = Field(default=None)
    supplier_id: Optional[str] = Field(default=None)
    purchase_order_id: Optional[str] = Field(default=None)

    # Status
    status: str = Field(default=LotStatus.AVAILABLE.value, index=True)

    # Quantity
    initial_quantity: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    current_quantity: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)

    # Cost
    unit_cost: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)
