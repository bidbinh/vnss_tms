from __future__ import annotations
from typing import Optional
from sqlmodel import SQLModel, Field
from .base import BaseUUIDModel, TimestampMixin, TenantScoped

class MaintenanceItem(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Chi tiết chi phí từng hạng mục trong một lần bảo trì
    VD: Dầu nhớt, lọc dầu, công thay dầu...
    """
    __tablename__ = "maintenance_items"

    record_id: str = Field(
        foreign_key="maintenance_records.id",
        index=True,
        nullable=False
    )

    # Loại hạng mục
    item_type: str = Field(nullable=False)
    # PARTS (phụ tùng), LABOR (công lao động), MATERIAL (vật tư), OTHER (khác)

    item_name: str = Field(nullable=False)  # Tên phụ tùng/công việc
    quantity: int = Field(default=1)  # Số lượng
    unit: Optional[str] = Field(default=None)  # Đơn vị: lít, cái, giờ...
    unit_price: int = Field(nullable=False)  # Đơn giá
    total_price: int = Field(nullable=False)  # Thành tiền = quantity * unit_price

    supplier: Optional[str] = Field(default=None)  # Nhà cung cấp (nếu có)
    part_number: Optional[str] = Field(default=None)  # Mã phụ tùng (nếu có)
    warranty_months: Optional[int] = Field(default=None)  # Bảo hành (tháng)

    note: Optional[str] = Field(default=None)
