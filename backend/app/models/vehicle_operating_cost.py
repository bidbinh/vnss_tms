"""
Vehicle Operating Cost Models - Chi phí vận hành xe
Quản lý các loại chi phí: Khấu hao, Bảo hiểm, Đăng kiểm, Thuế, GPS, ETC, v.v.
Hỗ trợ phân bổ chi phí theo tháng để tính P&L
"""
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
from enum import Enum
from sqlmodel import SQLModel, Field, Relationship
import uuid


class CostCategory(str, Enum):
    """Nhóm chi phí"""
    DEPRECIATION = "depreciation"      # Khấu hao
    INSURANCE = "insurance"            # Bảo hiểm
    REGISTRATION = "registration"      # Đăng kiểm
    ROAD_TAX = "road_tax"              # Thuế đường bộ
    GPS_FEE = "gps_fee"                # Phí GPS
    LOAN_INTEREST = "loan_interest"    # Lãi vay
    ETC_TOLL = "etc_toll"              # Phí cầu đường ETC
    PARKING = "parking"                # Phí đỗ xe
    OTHER = "other"                    # Khác


class CostType(str, Enum):
    """Loại chi phí theo cách nhập"""
    RECURRING = "recurring"    # Định kỳ - nhập 1 lần, hệ thống tự phân bổ
    VARIABLE = "variable"      # Phát sinh - nhập theo lần hoặc tổng tháng


class AllocationMethod(str, Enum):
    """Phương pháp phân bổ chi phí định kỳ"""
    MONTHLY = "monthly"            # Chia đều theo tháng
    DAILY = "daily"                # Chia đều theo ngày
    STRAIGHT_LINE = "straight_line"  # Khấu hao đường thẳng


class VehicleOperatingCost(SQLModel, table=True):
    """
    Chi phí vận hành xe
    - RECURRING: Nhập tổng giá trị + thời gian hiệu lực → hệ thống tự tính phân bổ/tháng
    - VARIABLE: Nhập từng lần phát sinh hoặc tổng tháng
    """
    __tablename__ = "vehicle_operating_costs"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    tenant_id: str = Field(index=True)

    # Xe liên quan (có thể null nếu là chi phí chung cho tất cả xe)
    vehicle_id: Optional[str] = Field(default=None, foreign_key="vehicles.id", index=True)

    # Phân loại chi phí
    category: str = Field(default=CostCategory.OTHER.value, description="Nhóm chi phí")
    cost_type: str = Field(default=CostType.VARIABLE.value, description="Loại: recurring hoặc variable")
    name: str = Field(description="Tên chi phí, vd: 'Bảo hiểm TNDS 2024', 'ETC tháng 1/2024'")
    description: Optional[str] = Field(default=None)

    # Giá trị chi phí
    amount: float = Field(description="Tổng giá trị chi phí (VND)")
    currency: str = Field(default="VND")

    # Thời gian hiệu lực (cho RECURRING)
    effective_date: date = Field(description="Ngày bắt đầu hiệu lực")
    expiry_date: Optional[date] = Field(default=None, description="Ngày hết hiệu lực (cho recurring)")

    # Phương pháp phân bổ (cho RECURRING)
    allocation_method: str = Field(default=AllocationMethod.MONTHLY.value)
    allocation_months: Optional[int] = Field(default=None, description="Số tháng phân bổ (nếu không dùng expiry_date)")

    # Cho chi phí VARIABLE theo tháng cụ thể
    cost_month: Optional[int] = Field(default=None, description="Tháng áp dụng (1-12)")
    cost_year: Optional[int] = Field(default=None, description="Năm áp dụng")

    # Thông tin bổ sung
    reference_no: Optional[str] = Field(default=None, description="Số hợp đồng/hóa đơn")
    vendor: Optional[str] = Field(default=None, description="Nhà cung cấp")
    payment_status: str = Field(default="unpaid", description="unpaid, partial, paid")
    paid_amount: float = Field(default=0, description="Số tiền đã thanh toán")
    paid_date: Optional[date] = Field(default=None)

    # File đính kèm
    attachments: Optional[str] = Field(default=None, description="JSON array of file URLs")

    # Trạng thái
    is_active: bool = Field(default=True)

    # Relationships
    # vehicle: Optional["Vehicle"] = Relationship(back_populates="operating_costs")


class VehicleCostAllocation(SQLModel, table=True):
    """
    Chi phí phân bổ theo tháng - được tự động tạo từ VehicleOperatingCost
    Dùng để báo cáo P&L nhanh chóng
    """
    __tablename__ = "vehicle_cost_allocations"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    tenant_id: str = Field(index=True)

    # References
    cost_id: str = Field(foreign_key="vehicle_operating_costs.id", index=True)
    vehicle_id: Optional[str] = Field(default=None, foreign_key="vehicles.id", index=True)

    # Tháng/năm phân bổ
    year: int = Field(index=True)
    month: int = Field(index=True)

    # Số tiền phân bổ trong tháng này
    allocated_amount: float = Field(description="Số tiền phân bổ cho tháng này")

    # Nhóm chi phí (denormalized for fast query)
    category: str = Field(index=True)


# ============================================================================
# COST CATEGORY CONFIGS - Cấu hình mặc định cho từng loại chi phí
# ============================================================================

COST_CATEGORY_CONFIGS = {
    CostCategory.DEPRECIATION.value: {
        "name": "Khấu hao xe",
        "cost_type": CostType.RECURRING.value,
        "allocation_method": AllocationMethod.STRAIGHT_LINE.value,
        "default_months": 60,  # 5 năm
        "description": "Khấu hao tài sản cố định theo đường thẳng",
        "requires_vehicle": True,
    },
    CostCategory.INSURANCE.value: {
        "name": "Bảo hiểm xe",
        "cost_type": CostType.RECURRING.value,
        "allocation_method": AllocationMethod.MONTHLY.value,
        "default_months": 12,
        "description": "BHTNDS, BHVC, Bảo hiểm hàng hóa",
        "requires_vehicle": True,
    },
    CostCategory.REGISTRATION.value: {
        "name": "Đăng kiểm",
        "cost_type": CostType.RECURRING.value,
        "allocation_method": AllocationMethod.MONTHLY.value,
        "default_months": 6,  # hoặc 12 tùy loại xe
        "description": "Phí đăng kiểm định kỳ",
        "requires_vehicle": True,
    },
    CostCategory.ROAD_TAX.value: {
        "name": "Thuế đường bộ",
        "cost_type": CostType.RECURRING.value,
        "allocation_method": AllocationMethod.MONTHLY.value,
        "default_months": 12,
        "description": "Phí sử dụng đường bộ hàng năm",
        "requires_vehicle": True,
    },
    CostCategory.GPS_FEE.value: {
        "name": "Phí GPS",
        "cost_type": CostType.VARIABLE.value,  # Nhập theo tháng
        "allocation_method": AllocationMethod.MONTHLY.value,
        "default_months": 1,
        "description": "Phí thuê bao thiết bị GPS hàng tháng",
        "requires_vehicle": True,
    },
    CostCategory.LOAN_INTEREST.value: {
        "name": "Lãi vay",
        "cost_type": CostType.VARIABLE.value,  # Nhập theo tháng
        "allocation_method": AllocationMethod.MONTHLY.value,
        "default_months": 1,
        "description": "Lãi vay mua xe hàng tháng",
        "requires_vehicle": True,
    },
    CostCategory.ETC_TOLL.value: {
        "name": "Phí cầu đường ETC",
        "cost_type": CostType.VARIABLE.value,
        "allocation_method": AllocationMethod.MONTHLY.value,
        "default_months": 1,
        "description": "Phí ETC theo tháng hoặc theo vé",
        "requires_vehicle": False,  # Có thể nhập chung hoặc theo xe
    },
    CostCategory.PARKING.value: {
        "name": "Phí đỗ xe",
        "cost_type": CostType.VARIABLE.value,
        "allocation_method": AllocationMethod.MONTHLY.value,
        "default_months": 1,
        "description": "Phí đỗ xe tại cảng, kho, bãi",
        "requires_vehicle": False,
    },
    CostCategory.OTHER.value: {
        "name": "Chi phí khác",
        "cost_type": CostType.VARIABLE.value,
        "allocation_method": AllocationMethod.MONTHLY.value,
        "default_months": 1,
        "description": "Các chi phí vận hành khác",
        "requires_vehicle": False,
    },
}
