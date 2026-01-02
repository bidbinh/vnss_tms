"""
Accounting - Fixed Assets Models
Quản lý tài sản cố định và khấu hao
"""
from typing import Optional
from sqlmodel import SQLModel, Field
from enum import Enum
from decimal import Decimal
from datetime import datetime
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class AssetCategory(str, Enum):
    """Nhóm tài sản cố định"""
    BUILDING = "BUILDING"               # Nhà cửa, vật kiến trúc
    MACHINERY = "MACHINERY"             # Máy móc, thiết bị
    VEHICLE = "VEHICLE"                 # Phương tiện vận tải
    OFFICE_EQUIPMENT = "OFFICE_EQUIPMENT"  # Thiết bị văn phòng
    COMPUTER = "COMPUTER"               # Thiết bị tin học
    FURNITURE = "FURNITURE"             # Bàn ghế, nội thất
    LAND = "LAND"                       # Quyền sử dụng đất
    INTANGIBLE = "INTANGIBLE"           # TSCĐ vô hình
    OTHER = "OTHER"                     # Khác


class AssetStatus(str, Enum):
    """Trạng thái tài sản"""
    DRAFT = "DRAFT"                     # Nháp
    ACTIVE = "ACTIVE"                   # Đang sử dụng
    SUSPENDED = "SUSPENDED"             # Tạm ngừng khấu hao
    DISPOSED = "DISPOSED"               # Đã thanh lý
    SOLD = "SOLD"                       # Đã bán
    FULLY_DEPRECIATED = "FULLY_DEPRECIATED"  # Đã khấu hao hết


class DepreciationMethod(str, Enum):
    """Phương pháp khấu hao"""
    STRAIGHT_LINE = "STRAIGHT_LINE"     # Đường thẳng
    DECLINING = "DECLINING"             # Số dư giảm dần
    DOUBLE_DECLINING = "DOUBLE_DECLINING"  # Số dư giảm dần kép
    UNITS_OF_PRODUCTION = "UNITS_OF_PRODUCTION"  # Theo sản lượng
    SUM_OF_YEARS = "SUM_OF_YEARS"       # Tổng số năm


class DisposalType(str, Enum):
    """Hình thức thanh lý"""
    SALE = "SALE"                       # Bán
    SCRAP = "SCRAP"                     # Thanh lý phế liệu
    DONATION = "DONATION"               # Tặng/cho
    LOSS = "LOSS"                       # Mất mát
    TRANSFER = "TRANSFER"               # Chuyển nhượng


class FixedAssetCategory(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Danh mục nhóm TSCĐ
    """
    __tablename__ = "acc_fixed_asset_categories"

    code: str = Field(index=True, nullable=False)
    name: str = Field(nullable=False)

    category_type: str = Field(default=AssetCategory.MACHINERY.value)

    # Default depreciation settings
    default_useful_life: int = Field(default=60)                # Tháng
    default_depreciation_method: str = Field(default=DepreciationMethod.STRAIGHT_LINE.value)
    default_salvage_percent: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=2)

    # GL Accounts
    asset_account_id: Optional[str] = Field(default=None, foreign_key="acc_chart_of_accounts.id")  # TK 211, 213
    depreciation_account_id: Optional[str] = Field(default=None, foreign_key="acc_chart_of_accounts.id")  # TK 214
    expense_account_id: Optional[str] = Field(default=None, foreign_key="acc_chart_of_accounts.id")  # TK 627, 641, 642

    is_active: bool = Field(default=True)
    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class FixedAsset(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Tài sản cố định
    """
    __tablename__ = "acc_fixed_assets"

    # Asset identification
    asset_code: str = Field(index=True, nullable=False)         # TS001
    name: str = Field(nullable=False)
    description: Optional[str] = Field(default=None)

    # Category
    category_id: str = Field(foreign_key="acc_fixed_asset_categories.id", nullable=False, index=True)
    category_code: Optional[str] = Field(default=None)

    # Specifications
    serial_number: Optional[str] = Field(default=None)
    model: Optional[str] = Field(default=None)
    manufacturer: Optional[str] = Field(default=None)
    specifications: Optional[str] = Field(default=None)         # JSON for details

    # Location & Assignment
    location: Optional[str] = Field(default=None)
    department_id: Optional[str] = Field(default=None)          # HRM Department
    assigned_to: Optional[str] = Field(default=None)            # Employee ID
    cost_center_id: Optional[str] = Field(default=None, foreign_key="acc_cost_centers.id")

    # For vehicles (link to TMS)
    vehicle_id: Optional[str] = Field(default=None, index=True)

    # Acquisition
    acquisition_date: datetime = Field(nullable=False)
    in_service_date: Optional[datetime] = Field(default=None)   # Ngày bắt đầu sử dụng

    # Purchase info
    purchase_order_id: Optional[str] = Field(default=None)
    vendor_id: Optional[str] = Field(default=None)
    invoice_number: Optional[str] = Field(default=None)
    invoice_date: Optional[datetime] = Field(default=None)

    # Values
    purchase_price: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    additional_costs: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)  # Chi phí lắp đặt, vận chuyển
    original_cost: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)     # Nguyên giá
    revalued_cost: Optional[Decimal] = Field(default=None, max_digits=20, decimal_places=2)   # Giá trị đánh giá lại

    salvage_value: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)     # Giá trị thanh lý
    depreciable_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)  # Giá trị phải khấu hao

    currency: str = Field(default="VND")

    # Depreciation settings
    depreciation_method: str = Field(default=DepreciationMethod.STRAIGHT_LINE.value)
    useful_life_months: int = Field(default=60)                 # Số tháng sử dụng
    remaining_life_months: int = Field(default=60)              # Số tháng còn lại

    # Depreciation calculation
    depreciation_start_date: Optional[datetime] = Field(default=None)
    monthly_depreciation: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Accumulated values
    accumulated_depreciation: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    book_value: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)  # Giá trị còn lại

    # Disposal
    disposal_date: Optional[datetime] = Field(default=None)
    disposal_type: Optional[str] = Field(default=None)
    disposal_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    disposal_gain_loss: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Status
    status: str = Field(default=AssetStatus.DRAFT.value, index=True)
    is_fully_depreciated: bool = Field(default=False)

    # Insurance
    insured_value: Optional[Decimal] = Field(default=None, max_digits=20, decimal_places=2)
    insurance_policy: Optional[str] = Field(default=None)
    insurance_expiry: Optional[datetime] = Field(default=None)

    # Warranty
    warranty_expiry: Optional[datetime] = Field(default=None)

    # GL Accounts (override category defaults)
    asset_account_id: Optional[str] = Field(default=None, foreign_key="acc_chart_of_accounts.id")
    depreciation_account_id: Optional[str] = Field(default=None, foreign_key="acc_chart_of_accounts.id")
    expense_account_id: Optional[str] = Field(default=None, foreign_key="acc_chart_of_accounts.id")

    # Audit
    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class AssetDepreciation(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Lịch sử khấu hao TSCĐ
    """
    __tablename__ = "acc_asset_depreciations"

    asset_id: str = Field(foreign_key="acc_fixed_assets.id", nullable=False, index=True)

    # Period
    fiscal_year_id: str = Field(foreign_key="acc_fiscal_years.id", nullable=False)
    fiscal_period_id: str = Field(foreign_key="acc_fiscal_periods.id", nullable=False)
    depreciation_date: datetime = Field(nullable=False, index=True)

    # Amounts
    opening_book_value: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    depreciation_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    accumulated_depreciation: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    closing_book_value: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Accounting
    journal_entry_id: Optional[str] = Field(default=None, foreign_key="acc_journal_entries.id")

    # Status
    is_posted: bool = Field(default=False)
    posted_at: Optional[datetime] = Field(default=None)
    posted_by: Optional[str] = Field(default=None)

    notes: Optional[str] = Field(default=None)


class AssetRevaluation(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Đánh giá lại TSCĐ
    """
    __tablename__ = "acc_asset_revaluations"

    asset_id: str = Field(foreign_key="acc_fixed_assets.id", nullable=False, index=True)

    revaluation_date: datetime = Field(nullable=False, index=True)

    # Values before revaluation
    previous_cost: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    previous_accumulated_depreciation: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    previous_book_value: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Revalued amounts
    new_cost: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    new_accumulated_depreciation: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    new_book_value: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Difference
    revaluation_surplus: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # New depreciation
    new_useful_life_months: Optional[int] = Field(default=None)
    new_monthly_depreciation: Optional[Decimal] = Field(default=None, max_digits=20, decimal_places=2)

    # Reason
    reason: str = Field(nullable=False)
    appraiser: Optional[str] = Field(default=None)              # Người định giá

    # Accounting
    journal_entry_id: Optional[str] = Field(default=None, foreign_key="acc_journal_entries.id")

    approved_at: Optional[datetime] = Field(default=None)
    approved_by: Optional[str] = Field(default=None)

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class AssetDisposal(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Thanh lý TSCĐ
    """
    __tablename__ = "acc_asset_disposals"

    asset_id: str = Field(foreign_key="acc_fixed_assets.id", nullable=False, index=True)

    disposal_number: str = Field(index=True, nullable=False)
    disposal_date: datetime = Field(nullable=False, index=True)

    disposal_type: str = Field(default=DisposalType.SALE.value)

    # Values at disposal
    original_cost: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    accumulated_depreciation: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    book_value: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Disposal
    disposal_proceeds: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)  # Tiền thu từ thanh lý
    disposal_costs: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)     # Chi phí thanh lý
    gain_loss: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)          # Lãi/lỗ thanh lý

    # Buyer info (if sold)
    buyer_id: Optional[str] = Field(default=None)
    buyer_name: Optional[str] = Field(default=None)
    invoice_number: Optional[str] = Field(default=None)

    reason: str = Field(nullable=False)

    # Status
    status: str = Field(default="DRAFT")                        # DRAFT, APPROVED, COMPLETED

    # Accounting
    journal_entry_id: Optional[str] = Field(default=None, foreign_key="acc_journal_entries.id")

    approved_at: Optional[datetime] = Field(default=None)
    approved_by: Optional[str] = Field(default=None)

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class AssetTransfer(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Điều chuyển TSCĐ
    """
    __tablename__ = "acc_asset_transfers"

    asset_id: str = Field(foreign_key="acc_fixed_assets.id", nullable=False, index=True)

    transfer_number: str = Field(index=True, nullable=False)
    transfer_date: datetime = Field(nullable=False, index=True)

    # From
    from_location: Optional[str] = Field(default=None)
    from_department_id: Optional[str] = Field(default=None)
    from_cost_center_id: Optional[str] = Field(default=None)
    from_assigned_to: Optional[str] = Field(default=None)

    # To
    to_location: Optional[str] = Field(default=None)
    to_department_id: Optional[str] = Field(default=None)
    to_cost_center_id: Optional[str] = Field(default=None)
    to_assigned_to: Optional[str] = Field(default=None)

    reason: str = Field(nullable=False)

    # Status
    status: str = Field(default="DRAFT")                        # DRAFT, APPROVED, COMPLETED

    approved_at: Optional[datetime] = Field(default=None)
    approved_by: Optional[str] = Field(default=None)

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class AssetMaintenance(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Sửa chữa, bảo trì TSCĐ
    """
    __tablename__ = "acc_asset_maintenances"

    asset_id: str = Field(foreign_key="acc_fixed_assets.id", nullable=False, index=True)

    maintenance_number: str = Field(index=True, nullable=False)
    maintenance_date: datetime = Field(nullable=False, index=True)

    maintenance_type: str = Field(default="REPAIR")             # REPAIR, UPGRADE, OVERHAUL

    description: str = Field(nullable=False)

    # Costs
    labor_cost: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    parts_cost: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    other_cost: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    total_cost: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Capitalization (if upgrade increases value)
    is_capitalized: bool = Field(default=False)
    capitalized_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    extended_life_months: int = Field(default=0)

    # Vendor
    vendor_id: Optional[str] = Field(default=None)
    vendor_invoice: Optional[str] = Field(default=None)

    # Status
    status: str = Field(default="DRAFT")

    # Accounting
    journal_entry_id: Optional[str] = Field(default=None, foreign_key="acc_journal_entries.id")

    completed_at: Optional[datetime] = Field(default=None)
    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)
