"""
Controlling - Profit Center & Segment Reporting Models
Trung tâm lợi nhuận và báo cáo theo phân khúc
"""
from typing import Optional
from sqlmodel import SQLModel, Field
from enum import Enum
from decimal import Decimal
from datetime import datetime
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class ProfitCenterType(str, Enum):
    """Loại trung tâm lợi nhuận"""
    BUSINESS_UNIT = "BUSINESS_UNIT"     # Đơn vị kinh doanh
    PRODUCT_LINE = "PRODUCT_LINE"       # Dòng sản phẩm
    REGION = "REGION"                   # Khu vực
    CHANNEL = "CHANNEL"                 # Kênh phân phối
    CUSTOMER_SEGMENT = "CUSTOMER_SEGMENT"  # Phân khúc khách hàng
    SERVICE = "SERVICE"                 # Dịch vụ


class SegmentType(str, Enum):
    """Loại phân khúc báo cáo (theo IFRS 8)"""
    OPERATING = "OPERATING"             # Phân khúc hoạt động
    GEOGRAPHIC = "GEOGRAPHIC"           # Phân khúc địa lý
    PRODUCT = "PRODUCT"                 # Phân khúc sản phẩm
    CUSTOMER = "CUSTOMER"               # Phân khúc khách hàng


class ProfitCenter(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Trung tâm lợi nhuận
    """
    __tablename__ = "ctrl_profit_centers"

    code: str = Field(index=True, nullable=False)           # PC001
    name: str = Field(nullable=False)

    profit_center_type: str = Field(default=ProfitCenterType.BUSINESS_UNIT.value, index=True)

    # Hierarchy
    parent_id: Optional[str] = Field(default=None, foreign_key="ctrl_profit_centers.id")
    level: int = Field(default=1)

    # Responsible
    manager_id: Optional[str] = Field(default=None, foreign_key="users.id")
    department_id: Optional[str] = Field(default=None)

    # Related cost centers
    primary_cost_center_id: Optional[str] = Field(default=None, foreign_key="acc_cost_centers.id")

    # Targets
    revenue_target: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    profit_target: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    margin_target_percent: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=2)

    # Period actuals (computed)
    ytd_revenue: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    ytd_cost: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    ytd_profit: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    ytd_margin_percent: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=2)

    is_active: bool = Field(default=True)
    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class ProfitAnalysis(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Phân tích lợi nhuận theo kỳ
    """
    __tablename__ = "ctrl_profit_analysis"

    profit_center_id: str = Field(foreign_key="ctrl_profit_centers.id", nullable=False, index=True)

    # Period
    fiscal_year_id: str = Field(foreign_key="acc_fiscal_years.id", nullable=False)
    fiscal_period_id: str = Field(foreign_key="acc_fiscal_periods.id", nullable=False)
    period_date: datetime = Field(nullable=False)

    # Revenue
    gross_revenue: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    discounts: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    net_revenue: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Costs
    direct_costs: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    indirect_costs: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    allocated_costs: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    total_costs: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Margins
    gross_profit: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    gross_margin_percent: Decimal = Field(default=Decimal("0"), max_digits=10, decimal_places=2)

    operating_profit: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    operating_margin_percent: Decimal = Field(default=Decimal("0"), max_digits=10, decimal_places=2)

    net_profit: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    net_margin_percent: Decimal = Field(default=Decimal("0"), max_digits=10, decimal_places=2)

    # Comparison
    budget_revenue: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    budget_profit: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    variance_revenue: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    variance_profit: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Previous period
    prev_revenue: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    prev_profit: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    growth_revenue_percent: Decimal = Field(default=Decimal("0"), max_digits=10, decimal_places=2)
    growth_profit_percent: Decimal = Field(default=Decimal("0"), max_digits=10, decimal_places=2)

    calculated_at: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = Field(default=None)


class SegmentReport(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Báo cáo theo phân khúc (IFRS 8)
    """
    __tablename__ = "ctrl_segment_reports"

    report_code: str = Field(index=True, nullable=False)
    report_name: str = Field(nullable=False)

    segment_type: str = Field(default=SegmentType.OPERATING.value, index=True)

    # Period
    fiscal_year_id: str = Field(foreign_key="acc_fiscal_years.id", nullable=False)
    period_from: datetime = Field(nullable=False)
    period_to: datetime = Field(nullable=False)

    # Segment identifier
    segment_id: str = Field(nullable=False)  # ID của profit center, region, product line...
    segment_name: str = Field(nullable=False)

    # Financials
    external_revenue: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    inter_segment_revenue: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    total_revenue: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    segment_expenses: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    depreciation: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    segment_profit: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Assets & Liabilities
    segment_assets: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    segment_liabilities: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Capital expenditure
    capital_expenditure: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Percentages
    revenue_share_percent: Decimal = Field(default=Decimal("0"), max_digits=10, decimal_places=2)
    profit_share_percent: Decimal = Field(default=Decimal("0"), max_digits=10, decimal_places=2)

    generated_at: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)
