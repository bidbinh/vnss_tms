"""
Accounting - Chart of Accounts Models
Hệ thống tài khoản kế toán theo chuẩn VAS (Thông tư 200/2014/TT-BTC)
"""
from typing import Optional
from sqlmodel import SQLModel, Field
from enum import Enum
from decimal import Decimal
from datetime import datetime
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class AccountClassification(str, Enum):
    """Phân loại tài khoản theo VAS"""
    ASSET = "ASSET"                     # Tài sản (1xx)
    LIABILITY = "LIABILITY"             # Nợ phải trả (3xx)
    EQUITY = "EQUITY"                   # Vốn chủ sở hữu (4xx)
    REVENUE = "REVENUE"                 # Doanh thu (5xx, 7xx)
    EXPENSE = "EXPENSE"                 # Chi phí (6xx, 8xx)
    CONTRA = "CONTRA"                   # Tài khoản điều chỉnh


class AccountNature(str, Enum):
    """Tính chất tài khoản"""
    DEBIT = "DEBIT"                     # Bên Nợ
    CREDIT = "CREDIT"                   # Bên Có
    BOTH = "BOTH"                       # Cả hai (có thể có số dư bên nào)


class AccountCategory(str, Enum):
    """Nhóm tài khoản chi tiết"""
    # Assets - Tài sản
    CASH = "CASH"                           # Tiền mặt (111)
    BANK = "BANK"                           # Tiền gửi ngân hàng (112)
    IN_TRANSIT = "IN_TRANSIT"               # Tiền đang chuyển (113)
    RECEIVABLE = "RECEIVABLE"               # Phải thu (131, 136, 138)
    ADVANCE_TO_SUPPLIER = "ADVANCE_TO_SUPPLIER"  # Trả trước cho người bán (331)
    INVENTORY = "INVENTORY"                  # Hàng tồn kho (15x)
    FIXED_ASSET = "FIXED_ASSET"             # Tài sản cố định (21x)
    DEPRECIATION = "DEPRECIATION"           # Khấu hao (214)
    PREPAID_EXPENSE = "PREPAID_EXPENSE"     # Chi phí trả trước (242)

    # Liabilities - Nợ phải trả
    PAYABLE = "PAYABLE"                     # Phải trả (331)
    ADVANCE_FROM_CUSTOMER = "ADVANCE_FROM_CUSTOMER"  # Người mua trả tiền trước (131)
    TAX_PAYABLE = "TAX_PAYABLE"             # Thuế và các khoản phải nộp (333)
    SALARY_PAYABLE = "SALARY_PAYABLE"       # Phải trả người lao động (334)
    ACCRUED_EXPENSE = "ACCRUED_EXPENSE"     # Chi phí phải trả (335)
    OTHER_PAYABLE = "OTHER_PAYABLE"         # Phải trả khác (338)

    # Equity - Vốn chủ sở hữu
    OWNER_CAPITAL = "OWNER_CAPITAL"         # Vốn đầu tư chủ sở hữu (411)
    SHARE_PREMIUM = "SHARE_PREMIUM"         # Thặng dư vốn cổ phần (412)
    RETAINED_EARNINGS = "RETAINED_EARNINGS" # Lợi nhuận chưa phân phối (421)
    RESERVES = "RESERVES"                   # Quỹ dự trữ (414-418)

    # Revenue - Doanh thu
    SALES_REVENUE = "SALES_REVENUE"         # Doanh thu bán hàng (511)
    SALES_DEDUCTION = "SALES_DEDUCTION"     # Các khoản giảm trừ (521)
    FINANCIAL_INCOME = "FINANCIAL_INCOME"   # Doanh thu tài chính (515)
    OTHER_INCOME = "OTHER_INCOME"           # Thu nhập khác (711)

    # Expense - Chi phí
    COGS = "COGS"                           # Giá vốn hàng bán (632)
    SELLING_EXPENSE = "SELLING_EXPENSE"     # Chi phí bán hàng (641)
    ADMIN_EXPENSE = "ADMIN_EXPENSE"         # Chi phí quản lý (642)
    FINANCIAL_EXPENSE = "FINANCIAL_EXPENSE" # Chi phí tài chính (635)
    OTHER_EXPENSE = "OTHER_EXPENSE"         # Chi phí khác (811)
    CIT_EXPENSE = "CIT_EXPENSE"             # Chi phí thuế TNDN (821)


class ChartOfAccounts(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Hệ thống tài khoản kế toán
    Theo chuẩn VAS - Thông tư 200/2014/TT-BTC
    """
    __tablename__ = "acc_chart_of_accounts"

    # Account Identity
    account_code: str = Field(index=True, nullable=False)       # Số hiệu TK: 111, 1111, 11111
    account_name: str = Field(nullable=False)                   # Tên tài khoản
    account_name_en: Optional[str] = Field(default=None)        # Tên tiếng Anh

    # Hierarchy
    parent_id: Optional[str] = Field(default=None, foreign_key="acc_chart_of_accounts.id")
    level: int = Field(default=1)                               # Cấp TK: 1, 2, 3
    is_parent: bool = Field(default=False)                      # Có TK con không
    full_path: Optional[str] = Field(default=None)              # Đường dẫn đầy đủ: 111/1111/11111

    # Classification
    classification: str = Field(default=AccountClassification.ASSET.value, index=True)
    nature: str = Field(default=AccountNature.DEBIT.value)      # Tính chất bên Nợ/Có
    category: Optional[str] = Field(default=None, index=True)   # Nhóm chi tiết

    # Control Flags
    is_active: bool = Field(default=True, index=True)
    is_system: bool = Field(default=False)                      # TK hệ thống (không xóa)
    allow_posting: bool = Field(default=True)                   # Cho phép hạch toán trực tiếp
    require_partner: bool = Field(default=False)                # Bắt buộc chọn đối tác (131, 331)
    require_cost_center: bool = Field(default=False)            # Bắt buộc chọn trung tâm chi phí
    require_project: bool = Field(default=False)                # Bắt buộc chọn dự án

    # Currency
    currency: str = Field(default="VND")                        # Loại tiền
    allow_multi_currency: bool = Field(default=False)           # Cho phép đa tiền tệ

    # Opening Balance (Số dư đầu kỳ)
    opening_debit: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    opening_credit: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Current Balance (Số dư hiện tại - computed)
    current_debit: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    current_credit: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Audit
    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class FiscalYear(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Năm tài chính"""
    __tablename__ = "acc_fiscal_years"

    code: str = Field(index=True, nullable=False)               # FY2024
    name: str = Field(nullable=False)                           # Năm tài chính 2024

    start_date: datetime = Field(nullable=False)
    end_date: datetime = Field(nullable=False)

    is_active: bool = Field(default=True)
    is_closed: bool = Field(default=False)                      # Đã khóa sổ
    closed_at: Optional[datetime] = Field(default=None)
    closed_by: Optional[str] = Field(default=None)

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class FiscalPeriod(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Kỳ kế toán (tháng)"""
    __tablename__ = "acc_fiscal_periods"

    fiscal_year_id: str = Field(foreign_key="acc_fiscal_years.id", nullable=False)

    period_number: int = Field(nullable=False)                  # 1-12 hoặc 13 (kỳ điều chỉnh)
    name: str = Field(nullable=False)                           # Tháng 01/2024

    start_date: datetime = Field(nullable=False)
    end_date: datetime = Field(nullable=False)

    is_open: bool = Field(default=True)                         # Có thể hạch toán
    is_adjustment: bool = Field(default=False)                  # Kỳ điều chỉnh (kỳ 13)

    closed_at: Optional[datetime] = Field(default=None)
    closed_by: Optional[str] = Field(default=None)

    notes: Optional[str] = Field(default=None)


class CostCenter(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Trung tâm chi phí"""
    __tablename__ = "acc_cost_centers"

    code: str = Field(index=True, nullable=False)               # CC001
    name: str = Field(nullable=False)

    parent_id: Optional[str] = Field(default=None, foreign_key="acc_cost_centers.id")

    manager_id: Optional[str] = Field(default=None)             # Người quản lý
    department_id: Optional[str] = Field(default=None)          # Phòng ban

    budget_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    is_active: bool = Field(default=True)
    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class AccountingProject(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Dự án kế toán (theo dõi chi phí/doanh thu theo dự án)"""
    __tablename__ = "acc_projects"

    code: str = Field(index=True, nullable=False)               # PRJ001
    name: str = Field(nullable=False)

    customer_id: Optional[str] = Field(default=None)            # Khách hàng liên quan

    start_date: Optional[datetime] = Field(default=None)
    end_date: Optional[datetime] = Field(default=None)

    budget_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    actual_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    status: str = Field(default="ACTIVE")                       # ACTIVE, COMPLETED, CANCELLED

    is_active: bool = Field(default=True)
    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)
