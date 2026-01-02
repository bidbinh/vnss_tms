"""
WMS - Inventory Models
Kiểm kê và điều chỉnh tồn kho
"""
from typing import Optional
from sqlmodel import SQLModel, Field
from enum import Enum
from decimal import Decimal
from datetime import datetime
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class CountType(str, Enum):
    """Loại kiểm kê"""
    FULL = "FULL"                   # Kiểm kê toàn bộ
    PARTIAL = "PARTIAL"             # Kiểm kê một phần
    CYCLE = "CYCLE"                 # Kiểm kê luân chuyển (ABC)
    ANNUAL = "ANNUAL"               # Kiểm kê cuối năm
    RANDOM = "RANDOM"               # Kiểm kê ngẫu nhiên


class CountStatus(str, Enum):
    """Trạng thái kiểm kê"""
    DRAFT = "DRAFT"                 # Nháp
    IN_PROGRESS = "IN_PROGRESS"     # Đang thực hiện
    COMPLETED = "COMPLETED"         # Hoàn thành đếm
    APPROVED = "APPROVED"           # Đã duyệt
    ADJUSTED = "ADJUSTED"           # Đã điều chỉnh
    CANCELLED = "CANCELLED"         # Đã hủy


class AdjustmentType(str, Enum):
    """Loại điều chỉnh"""
    PHYSICAL_COUNT = "PHYSICAL_COUNT"   # Từ kiểm kê
    DAMAGE = "DAMAGE"                   # Hư hỏng
    THEFT = "THEFT"                     # Mất cắp
    EXPIRY = "EXPIRY"                   # Hết hạn
    ERROR_CORRECTION = "ERROR_CORRECTION"  # Sửa lỗi
    OTHER = "OTHER"                     # Khác


class InventoryCount(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Phiếu kiểm kê
    Kiểm đếm hàng hóa thực tế trong kho
    """
    __tablename__ = "wms_inventory_counts"

    count_number: str = Field(index=True, nullable=False)    # IC-2024-000001
    count_date: datetime = Field(nullable=False, index=True)
    count_type: str = Field(default=CountType.FULL.value, index=True)
    status: str = Field(default=CountStatus.DRAFT.value, index=True)

    # Scope
    warehouse_id: str = Field(foreign_key="wms_warehouses.id", nullable=False, index=True)
    zone_id: Optional[str] = Field(default=None, foreign_key="wms_warehouse_zones.id")
    location_id: Optional[str] = Field(default=None, foreign_key="wms_storage_locations.id")
    category_id: Optional[str] = Field(default=None, foreign_key="wms_product_categories.id")

    # Description
    description: Optional[str] = Field(default=None)

    # Freeze stock during count
    is_stock_frozen: bool = Field(default=False)
    frozen_at: Optional[datetime] = Field(default=None)

    # Quantities (summary)
    total_lines: int = Field(default=0)
    lines_counted: int = Field(default=0)
    lines_with_variance: int = Field(default=0)

    # Value
    total_system_value: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    total_counted_value: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    total_variance_value: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    currency: str = Field(default="VND")

    # Counters
    counter_id: Optional[str] = Field(default=None)  # Primary counter
    verifier_id: Optional[str] = Field(default=None)  # Verifier

    # Processing
    started_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)
    approved_at: Optional[datetime] = Field(default=None)
    approved_by: Optional[str] = Field(default=None)

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class InventoryCountLine(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Chi tiết phiếu kiểm kê
    Từng dòng sản phẩm cần kiểm kê
    """
    __tablename__ = "wms_inventory_count_lines"

    count_id: str = Field(foreign_key="wms_inventory_counts.id", nullable=False, index=True)
    line_number: int = Field(default=1)

    # Product
    product_id: str = Field(foreign_key="wms_products.id", nullable=False, index=True)
    product_code: str = Field(nullable=False)
    product_name: str = Field(nullable=False)
    unit_id: Optional[str] = Field(default=None, foreign_key="wms_product_units.id")
    unit_name: Optional[str] = Field(default=None)

    # Location
    location_id: Optional[str] = Field(default=None, foreign_key="wms_storage_locations.id")
    location_code: Optional[str] = Field(default=None)

    # Lot/Serial
    lot_id: Optional[str] = Field(default=None, foreign_key="wms_product_lots.id")
    lot_number: Optional[str] = Field(default=None)

    # Quantities
    system_quantity: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    counted_quantity: Optional[Decimal] = Field(default=None, max_digits=18, decimal_places=4)
    variance_quantity: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)

    # Value
    unit_cost: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    system_value: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    counted_value: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    variance_value: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)

    # Count info
    counted_by: Optional[str] = Field(default=None)
    counted_at: Optional[datetime] = Field(default=None)
    verified_by: Optional[str] = Field(default=None)
    verified_at: Optional[datetime] = Field(default=None)

    # Variance reason
    variance_reason: Optional[str] = Field(default=None)

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class StockAdjustment(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Phiếu điều chỉnh tồn kho
    Điều chỉnh số lượng tồn kho
    """
    __tablename__ = "wms_stock_adjustments"

    adjustment_number: str = Field(index=True, nullable=False)  # ADJ-2024-000001
    adjustment_date: datetime = Field(nullable=False, index=True)
    adjustment_type: str = Field(default=AdjustmentType.PHYSICAL_COUNT.value, index=True)
    status: str = Field(default="DRAFT", index=True)

    # Warehouse
    warehouse_id: str = Field(foreign_key="wms_warehouses.id", nullable=False, index=True)

    # Source
    source_document_type: Optional[str] = Field(default=None)  # INVENTORY_COUNT, MANUAL
    source_document_id: Optional[str] = Field(default=None)
    source_document_number: Optional[str] = Field(default=None)

    # Product
    product_id: str = Field(foreign_key="wms_products.id", nullable=False, index=True)
    product_code: str = Field(nullable=False)
    product_name: str = Field(nullable=False)
    unit_id: Optional[str] = Field(default=None, foreign_key="wms_product_units.id")

    # Location
    location_id: Optional[str] = Field(default=None, foreign_key="wms_storage_locations.id")

    # Lot
    lot_id: Optional[str] = Field(default=None, foreign_key="wms_product_lots.id")
    lot_number: Optional[str] = Field(default=None)

    # Quantities
    quantity_before: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    adjustment_quantity: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)  # Can be negative
    quantity_after: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)

    # Value
    unit_cost: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    adjustment_value: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)

    # Accounting
    inventory_account_id: Optional[str] = Field(default=None)
    adjustment_account_id: Optional[str] = Field(default=None)
    journal_entry_id: Optional[str] = Field(default=None)

    # Reason
    reason: str = Field(nullable=False)

    # Approval
    approved_at: Optional[datetime] = Field(default=None)
    approved_by: Optional[str] = Field(default=None)

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)
