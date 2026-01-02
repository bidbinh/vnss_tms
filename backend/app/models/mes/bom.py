"""
Bill of Materials (BOM) Models
Định mức nguyên vật liệu - công thức sản xuất
"""

from __future__ import annotations
from datetime import datetime, date
from typing import Optional, List
from decimal import Decimal
from enum import Enum
from sqlmodel import SQLModel, Field, Relationship

from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class BOMStatus(str, Enum):
    """Trạng thái BOM"""
    DRAFT = "DRAFT"              # Bản nháp
    ACTIVE = "ACTIVE"            # Đang sử dụng
    INACTIVE = "INACTIVE"        # Ngừng sử dụng
    OBSOLETE = "OBSOLETE"        # Lỗi thời


class BOMType(str, Enum):
    """Loại BOM"""
    STANDARD = "STANDARD"        # BOM tiêu chuẩn
    PHANTOM = "PHANTOM"          # BOM ảo (không tồn kho riêng)
    ENGINEERING = "ENGINEERING"  # BOM kỹ thuật
    MANUFACTURING = "MANUFACTURING"  # BOM sản xuất


class BillOfMaterials(BaseUUIDModel, TimestampMixin, TenantScoped, table=True):
    """Định mức nguyên vật liệu - BOM"""
    __tablename__ = "mes_bill_of_materials"

    # Basic Info
    bom_code: str = Field(index=True)             # Mã BOM
    bom_name: str = Field(index=True)             # Tên BOM
    description: Optional[str] = Field(default=None)
    version: str = Field(default="1.0")           # Phiên bản

    # Product
    product_id: str = Field(index=True)           # FK → wms_products.id (Thành phẩm)
    product_code: Optional[str] = Field(default=None)  # Denormalized
    product_name: Optional[str] = Field(default=None)  # Denormalized

    # Quantity
    base_quantity: Decimal = Field(default=Decimal("1"))  # Số lượng cơ sở
    unit_id: Optional[str] = Field(default=None)  # Đơn vị tính
    unit_name: Optional[str] = Field(default=None)

    # Type & Status
    bom_type: BOMType = Field(default=BOMType.STANDARD)
    status: BOMStatus = Field(default=BOMStatus.DRAFT)

    # Validity
    valid_from: Optional[date] = Field(default=None)
    valid_to: Optional[date] = Field(default=None)

    # Routing Reference
    routing_id: Optional[str] = Field(default=None)  # FK → mes_routings.id

    # Cost Info
    standard_cost: Decimal = Field(default=Decimal("0"))  # Chi phí tiêu chuẩn

    # Metadata
    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)
    approved_by: Optional[str] = Field(default=None)
    approved_at: Optional[datetime] = Field(default=None)


class BOMLine(BaseUUIDModel, TimestampMixin, TenantScoped, table=True):
    """Chi tiết định mức - BOM Line"""
    __tablename__ = "mes_bom_lines"

    # Parent BOM
    bom_id: str = Field(index=True)  # FK → mes_bill_of_materials.id

    # Line Number
    line_number: int = Field(default=1)

    # Component (Material)
    component_id: str = Field(index=True)         # FK → wms_products.id
    component_code: Optional[str] = Field(default=None)
    component_name: Optional[str] = Field(default=None)

    # Quantity
    quantity: Decimal = Field(default=Decimal("1"))  # Số lượng cần
    unit_id: Optional[str] = Field(default=None)
    unit_name: Optional[str] = Field(default=None)

    # Scrap/Waste
    scrap_rate: Decimal = Field(default=Decimal("0"))  # Tỷ lệ hao hụt (%)

    # Position in routing
    operation_id: Optional[str] = Field(default=None)  # FK → mes_routing_steps.id

    # Substitution
    is_critical: bool = Field(default=False)      # Nguyên liệu quan trọng
    substitute_allowed: bool = Field(default=True)  # Cho phép thay thế
    substitute_component_id: Optional[str] = Field(default=None)  # NVL thay thế

    # Cost
    unit_cost: Decimal = Field(default=Decimal("0"))
    total_cost: Decimal = Field(default=Decimal("0"))

    # Validity
    valid_from: Optional[date] = Field(default=None)
    valid_to: Optional[date] = Field(default=None)

    # Notes
    notes: Optional[str] = Field(default=None)
