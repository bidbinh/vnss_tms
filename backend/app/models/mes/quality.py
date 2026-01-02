"""
Quality Control Models
Kiểm tra chất lượng trong sản xuất
"""

from __future__ import annotations
from datetime import datetime
from typing import Optional
from decimal import Decimal
from enum import Enum
from sqlmodel import SQLModel, Field

from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class QCStatus(str, Enum):
    """Trạng thái kiểm tra"""
    PENDING = "PENDING"              # Chờ kiểm tra
    IN_PROGRESS = "IN_PROGRESS"      # Đang kiểm tra
    PASSED = "PASSED"                # Đạt
    FAILED = "FAILED"                # Không đạt
    PARTIAL = "PARTIAL"              # Đạt một phần
    ON_HOLD = "ON_HOLD"              # Tạm giữ


class QCType(str, Enum):
    """Loại kiểm tra"""
    INCOMING = "INCOMING"            # Kiểm tra đầu vào (NVL)
    IN_PROCESS = "IN_PROCESS"        # Kiểm tra trong quá trình SX
    FINAL = "FINAL"                  # Kiểm tra thành phẩm
    RANDOM = "RANDOM"                # Kiểm tra ngẫu nhiên


class DefectType(str, Enum):
    """Loại lỗi"""
    DIMENSIONAL = "DIMENSIONAL"      # Lỗi kích thước
    VISUAL = "VISUAL"                # Lỗi ngoại quan
    FUNCTIONAL = "FUNCTIONAL"        # Lỗi chức năng
    MATERIAL = "MATERIAL"            # Lỗi nguyên vật liệu
    ASSEMBLY = "ASSEMBLY"            # Lỗi lắp ráp
    PACKAGING = "PACKAGING"          # Lỗi đóng gói
    OTHER = "OTHER"


class QualityControl(BaseUUIDModel, TimestampMixin, TenantScoped, table=True):
    """Phiếu kiểm tra chất lượng trong sản xuất"""
    __tablename__ = "mes_quality_controls"

    # QC Info
    qc_number: str = Field(index=True)            # Số phiếu QC
    qc_date: datetime = Field(default_factory=datetime.utcnow)
    description: Optional[str] = Field(default=None)

    # Type & Status
    qc_type: QCType = Field(default=QCType.IN_PROCESS)
    status: QCStatus = Field(default=QCStatus.PENDING)

    # Source
    source_type: str = Field(index=True)          # PRODUCTION_ORDER, WORK_ORDER
    source_id: str = Field(index=True)
    source_number: Optional[str] = Field(default=None)

    # Production Context
    production_order_id: Optional[str] = Field(default=None)
    work_order_id: Optional[str] = Field(default=None)
    routing_step_id: Optional[str] = Field(default=None)

    # Product
    product_id: str = Field(index=True)
    product_code: Optional[str] = Field(default=None)
    product_name: Optional[str] = Field(default=None)

    # Lot
    lot_id: Optional[str] = Field(default=None)
    lot_number: Optional[str] = Field(default=None)

    # Quantity
    sample_size: Decimal = Field(default=Decimal("1"))    # Số mẫu kiểm tra
    total_quantity: Decimal = Field(default=Decimal("1")) # Tổng số lượng
    passed_quantity: Decimal = Field(default=Decimal("0"))
    failed_quantity: Decimal = Field(default=Decimal("0"))
    unit_name: Optional[str] = Field(default=None)

    # Result
    pass_rate: Decimal = Field(default=Decimal("0"))      # Tỷ lệ đạt (%)
    result: Optional[str] = Field(default=None)           # PASS, FAIL, CONDITIONAL

    # Inspector
    inspector_id: Optional[str] = Field(default=None)     # FK → hrm_employees.id
    inspector_name: Optional[str] = Field(default=None)
    inspection_method: Optional[str] = Field(default=None)

    # Disposition (xử lý)
    disposition: Optional[str] = Field(default=None)      # ACCEPT, REJECT, REWORK, SCRAP
    disposition_notes: Optional[str] = Field(default=None)

    # Timestamps
    started_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)

    # Notes
    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class QualityControlLine(BaseUUIDModel, TimestampMixin, TenantScoped, table=True):
    """Chi tiết kiểm tra - Các tiêu chí QC"""
    __tablename__ = "mes_quality_control_lines"

    # Parent QC
    quality_control_id: str = Field(index=True)   # FK → mes_quality_controls.id

    # Line Number
    line_number: int = Field(default=1)

    # Check Point
    check_point: str                              # Tiêu chí kiểm tra
    check_description: Optional[str] = Field(default=None)

    # Specification
    specification: Optional[str] = Field(default=None)  # Yêu cầu kỹ thuật
    min_value: Optional[Decimal] = Field(default=None)
    max_value: Optional[Decimal] = Field(default=None)
    target_value: Optional[Decimal] = Field(default=None)
    unit: Optional[str] = Field(default=None)

    # Actual Result
    measured_value: Optional[Decimal] = Field(default=None)
    is_passed: Optional[bool] = Field(default=None)

    # Defect Info
    defect_type: Optional[DefectType] = Field(default=None)
    defect_description: Optional[str] = Field(default=None)
    defect_quantity: Decimal = Field(default=Decimal("0"))

    # Notes
    notes: Optional[str] = Field(default=None)
