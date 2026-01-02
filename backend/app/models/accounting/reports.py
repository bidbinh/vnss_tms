"""
Accounting - Financial Reports Models
Báo cáo tài chính
"""
from typing import Optional
from sqlmodel import SQLModel, Field
from enum import Enum
from decimal import Decimal
from datetime import datetime
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class ReportType(str, Enum):
    """Loại báo cáo"""
    BALANCE_SHEET = "BALANCE_SHEET"             # Bảng cân đối kế toán
    INCOME_STATEMENT = "INCOME_STATEMENT"       # Báo cáo kết quả kinh doanh
    CASH_FLOW = "CASH_FLOW"                     # Báo cáo lưu chuyển tiền tệ
    TRIAL_BALANCE = "TRIAL_BALANCE"             # Bảng cân đối phát sinh
    GENERAL_LEDGER = "GENERAL_LEDGER"           # Sổ cái
    SUBSIDIARY_LEDGER = "SUBSIDIARY_LEDGER"     # Sổ chi tiết
    AR_AGING = "AR_AGING"                       # Tuổi nợ phải thu
    AP_AGING = "AP_AGING"                       # Tuổi nợ phải trả


class ReportStatus(str, Enum):
    """Trạng thái báo cáo"""
    DRAFT = "DRAFT"
    GENERATED = "GENERATED"
    APPROVED = "APPROVED"
    PUBLISHED = "PUBLISHED"


class FinancialReportTemplate(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Mẫu báo cáo tài chính
    Định nghĩa cấu trúc báo cáo
    """
    __tablename__ = "acc_report_templates"

    code: str = Field(index=True, nullable=False)
    name: str = Field(nullable=False)

    report_type: str = Field(default=ReportType.BALANCE_SHEET.value, index=True)

    # Template structure (JSON)
    structure: Optional[str] = Field(default=None)              # JSON defining rows/sections

    is_system: bool = Field(default=False)                      # System template
    is_active: bool = Field(default=True)

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class FinancialReportLine(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Chi tiết dòng báo cáo (Template)
    """
    __tablename__ = "acc_report_template_lines"

    template_id: str = Field(foreign_key="acc_report_templates.id", nullable=False, index=True)

    line_number: int = Field(default=1)
    line_code: str = Field(nullable=False)                      # A, B, I, II, 1, 2, ...

    name: str = Field(nullable=False)
    name_en: Optional[str] = Field(default=None)

    # Hierarchy
    parent_id: Optional[str] = Field(default=None, foreign_key="acc_report_template_lines.id")
    level: int = Field(default=1)

    # Calculation
    formula_type: str = Field(default="ACCOUNT")                # ACCOUNT, SUM, FORMULA
    account_codes: Optional[str] = Field(default=None)          # JSON array of account codes
    formula: Optional[str] = Field(default=None)                # Formula for calculated fields
    sign: int = Field(default=1)                                # 1 or -1

    # Display
    is_bold: bool = Field(default=False)
    is_italic: bool = Field(default=False)
    is_total: bool = Field(default=False)
    indent: int = Field(default=0)

    notes: Optional[str] = Field(default=None)


class GeneratedReport(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Báo cáo đã tạo
    """
    __tablename__ = "acc_generated_reports"

    template_id: str = Field(foreign_key="acc_report_templates.id", nullable=False)

    report_number: str = Field(index=True, nullable=False)
    report_type: str = Field(default=ReportType.BALANCE_SHEET.value, index=True)
    report_name: str = Field(nullable=False)

    # Period
    fiscal_year_id: str = Field(foreign_key="acc_fiscal_years.id", nullable=False)
    period_type: str = Field(default="MONTHLY")                 # MONTHLY, QUARTERLY, YEARLY
    period_from: datetime = Field(nullable=False)
    period_to: datetime = Field(nullable=False)

    # Comparison
    compare_period_from: Optional[datetime] = Field(default=None)
    compare_period_to: Optional[datetime] = Field(default=None)

    # Data (JSON)
    report_data: Optional[str] = Field(default=None)            # JSON of report values

    # Status
    status: str = Field(default=ReportStatus.DRAFT.value, index=True)

    generated_at: datetime = Field(default_factory=datetime.utcnow)
    generated_by: Optional[str] = Field(default=None)

    approved_at: Optional[datetime] = Field(default=None)
    approved_by: Optional[str] = Field(default=None)

    notes: Optional[str] = Field(default=None)


class TrialBalanceReport(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Bảng cân đối phát sinh (Chi tiết)
    """
    __tablename__ = "acc_trial_balance_reports"

    report_id: str = Field(foreign_key="acc_generated_reports.id", nullable=False, index=True)

    account_id: str = Field(foreign_key="acc_chart_of_accounts.id", nullable=False)
    account_code: str = Field(nullable=False)
    account_name: str = Field(nullable=False)

    # Opening balance
    opening_debit: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    opening_credit: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Period movements
    period_debit: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    period_credit: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # YTD movements
    ytd_debit: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    ytd_credit: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Closing balance
    closing_debit: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    closing_credit: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)


class BudgetPeriod(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Kỳ ngân sách
    """
    __tablename__ = "acc_budget_periods"

    code: str = Field(index=True, nullable=False)
    name: str = Field(nullable=False)

    fiscal_year_id: str = Field(foreign_key="acc_fiscal_years.id", nullable=False)

    start_date: datetime = Field(nullable=False)
    end_date: datetime = Field(nullable=False)

    status: str = Field(default="DRAFT")                        # DRAFT, APPROVED, ACTIVE, CLOSED

    approved_at: Optional[datetime] = Field(default=None)
    approved_by: Optional[str] = Field(default=None)

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class BudgetLine(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Chi tiết ngân sách theo tài khoản
    """
    __tablename__ = "acc_budget_lines"

    budget_period_id: str = Field(foreign_key="acc_budget_periods.id", nullable=False, index=True)

    account_id: str = Field(foreign_key="acc_chart_of_accounts.id", nullable=False, index=True)
    cost_center_id: Optional[str] = Field(default=None, foreign_key="acc_cost_centers.id")

    # Budget amounts by month
    jan: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    feb: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    mar: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    apr: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    may: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    jun: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    jul: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    aug: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    sep: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    oct: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    nov: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    dec: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    total_budget: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    notes: Optional[str] = Field(default=None)


class BudgetVsActual(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    So sánh ngân sách và thực tế
    """
    __tablename__ = "acc_budget_vs_actual"

    budget_period_id: str = Field(foreign_key="acc_budget_periods.id", nullable=False, index=True)
    fiscal_period_id: str = Field(foreign_key="acc_fiscal_periods.id", nullable=False)

    account_id: str = Field(foreign_key="acc_chart_of_accounts.id", nullable=False, index=True)
    cost_center_id: Optional[str] = Field(default=None, foreign_key="acc_cost_centers.id")

    budget_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    actual_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    variance: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    variance_percent: Decimal = Field(default=Decimal("0"), max_digits=8, decimal_places=2)

    # YTD
    ytd_budget: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    ytd_actual: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    ytd_variance: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)


class CurrencyRate(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Tỷ giá hối đoái
    """
    __tablename__ = "acc_currency_rates"

    currency_code: str = Field(index=True, nullable=False)      # USD, EUR, JPY
    currency_name: str = Field(nullable=False)

    rate_date: datetime = Field(nullable=False, index=True)

    # Rates
    buying_rate: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=6)
    selling_rate: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=6)
    average_rate: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=6)

    source: str = Field(default="MANUAL")                       # MANUAL, BANK, API

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class AuditLog(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Nhật ký audit kế toán
    """
    __tablename__ = "acc_audit_logs"

    # What changed
    table_name: str = Field(nullable=False, index=True)
    record_id: str = Field(nullable=False, index=True)

    action: str = Field(nullable=False)                         # CREATE, UPDATE, DELETE, POST, REVERSE

    # Change details
    old_values: Optional[str] = Field(default=None)             # JSON
    new_values: Optional[str] = Field(default=None)             # JSON
    changed_fields: Optional[str] = Field(default=None)         # JSON array

    # Context
    reason: Optional[str] = Field(default=None)

    # User
    user_id: str = Field(nullable=False, index=True)
    user_name: Optional[str] = Field(default=None)
    ip_address: Optional[str] = Field(default=None)

    timestamp: datetime = Field(default_factory=datetime.utcnow, index=True)
