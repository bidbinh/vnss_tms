"""
Accounting - Journal & General Ledger Models
Sổ nhật ký và Sổ cái
"""
from typing import Optional
from sqlmodel import SQLModel, Field
from enum import Enum
from decimal import Decimal
from datetime import datetime
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class JournalType(str, Enum):
    """Loại sổ nhật ký"""
    GENERAL = "GENERAL"                 # Sổ nhật ký chung
    CASH = "CASH"                       # Sổ quỹ tiền mặt
    BANK = "BANK"                       # Sổ tiền gửi ngân hàng
    SALES = "SALES"                     # Sổ bán hàng
    PURCHASE = "PURCHASE"               # Sổ mua hàng
    RECEIVABLE = "RECEIVABLE"           # Sổ công nợ phải thu
    PAYABLE = "PAYABLE"                 # Sổ công nợ phải trả
    INVENTORY = "INVENTORY"             # Sổ kho
    FIXED_ASSET = "FIXED_ASSET"         # Sổ tài sản cố định
    SALARY = "SALARY"                   # Sổ tiền lương
    TAX = "TAX"                         # Sổ thuế
    ADJUSTMENT = "ADJUSTMENT"           # Sổ điều chỉnh


class JournalEntryStatus(str, Enum):
    """Trạng thái bút toán"""
    DRAFT = "DRAFT"                     # Nháp
    PENDING = "PENDING"                 # Chờ duyệt
    POSTED = "POSTED"                   # Đã ghi sổ
    CANCELLED = "CANCELLED"             # Đã hủy
    REVERSED = "REVERSED"               # Đã đảo ngược


class Journal(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Sổ nhật ký
    Mỗi loại nghiệp vụ có một sổ nhật ký riêng
    """
    __tablename__ = "acc_journals"

    code: str = Field(index=True, nullable=False)               # NKC, TM, TGNH
    name: str = Field(nullable=False)                           # Nhật ký chung, Tiền mặt, ...

    journal_type: str = Field(default=JournalType.GENERAL.value, index=True)

    # Default accounts
    default_debit_account_id: Optional[str] = Field(default=None, foreign_key="acc_chart_of_accounts.id")
    default_credit_account_id: Optional[str] = Field(default=None, foreign_key="acc_chart_of_accounts.id")

    # Sequence
    sequence_prefix: str = Field(default="JE")                  # JE, PC, PT, ...
    next_sequence: int = Field(default=1)
    sequence_padding: int = Field(default=6)                    # JE000001

    is_active: bool = Field(default=True)
    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class JournalEntry(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Bút toán nhật ký (Header)
    Mỗi bút toán có nhiều dòng chi tiết
    """
    __tablename__ = "acc_journal_entries"

    # Journal reference
    journal_id: str = Field(foreign_key="acc_journals.id", nullable=False, index=True)

    # Entry identification
    entry_number: str = Field(index=True, nullable=False)       # JE2024/000001
    entry_date: datetime = Field(nullable=False, index=True)    # Ngày hạch toán

    fiscal_year_id: str = Field(foreign_key="acc_fiscal_years.id", nullable=False)
    fiscal_period_id: str = Field(foreign_key="acc_fiscal_periods.id", nullable=False)

    # Description
    description: str = Field(nullable=False)                    # Diễn giải
    reference: Optional[str] = Field(default=None)              # Số chứng từ gốc

    # Source document
    source_type: Optional[str] = Field(default=None)            # INVOICE, PAYMENT, RECEIPT, ...
    source_id: Optional[str] = Field(default=None)              # ID chứng từ gốc

    # Totals (computed from lines)
    total_debit: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    total_credit: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Currency
    currency: str = Field(default="VND")
    exchange_rate: Decimal = Field(default=Decimal("1"), max_digits=15, decimal_places=6)

    # Status & Workflow
    status: str = Field(default=JournalEntryStatus.DRAFT.value, index=True)

    posted_at: Optional[datetime] = Field(default=None)
    posted_by: Optional[str] = Field(default=None)

    reversed_entry_id: Optional[str] = Field(default=None)      # Link to reversed entry
    reversal_of_id: Optional[str] = Field(default=None)         # Link to original entry

    # Approval
    approved_at: Optional[datetime] = Field(default=None)
    approved_by: Optional[str] = Field(default=None)

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class JournalEntryLine(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Chi tiết bút toán (Lines)
    Double-entry: Tổng Nợ = Tổng Có
    """
    __tablename__ = "acc_journal_entry_lines"

    # Header reference
    journal_entry_id: str = Field(foreign_key="acc_journal_entries.id", nullable=False, index=True)

    # Line sequence
    line_number: int = Field(default=1)

    # Account
    account_id: str = Field(foreign_key="acc_chart_of_accounts.id", nullable=False, index=True)
    account_code: str = Field(nullable=False)                   # Denormalized for performance

    # Amount
    debit_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    credit_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Foreign currency
    currency: str = Field(default="VND")
    amount_currency: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    exchange_rate: Decimal = Field(default=Decimal("1"), max_digits=15, decimal_places=6)

    # Partner (for receivable/payable)
    partner_id: Optional[str] = Field(default=None, index=True)  # CRM Account ID
    partner_type: Optional[str] = Field(default=None)            # CUSTOMER, VENDOR

    # Analytics
    cost_center_id: Optional[str] = Field(default=None, foreign_key="acc_cost_centers.id")
    project_id: Optional[str] = Field(default=None, foreign_key="acc_projects.id")

    # Description
    description: Optional[str] = Field(default=None)

    # Tax (if applicable)
    tax_id: Optional[str] = Field(default=None)
    tax_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Reconciliation (for bank/AR/AP)
    is_reconciled: bool = Field(default=False)
    reconcile_id: Optional[str] = Field(default=None)           # Group ID for reconciliation


class GeneralLedger(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Sổ cái tổng hợp
    View tổng hợp từ Journal Entry Lines theo tài khoản và kỳ
    """
    __tablename__ = "acc_general_ledger"

    # Account
    account_id: str = Field(foreign_key="acc_chart_of_accounts.id", nullable=False, index=True)
    account_code: str = Field(nullable=False, index=True)

    # Period
    fiscal_year_id: str = Field(foreign_key="acc_fiscal_years.id", nullable=False)
    fiscal_period_id: str = Field(foreign_key="acc_fiscal_periods.id", nullable=False)

    # Opening balance (Số dư đầu kỳ)
    opening_debit: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    opening_credit: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Period movements (Phát sinh trong kỳ)
    period_debit: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    period_credit: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Closing balance (Số dư cuối kỳ)
    closing_debit: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    closing_credit: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Partner breakdowns (for sub-ledger)
    partner_id: Optional[str] = Field(default=None, index=True)

    # Last updated
    last_entry_id: Optional[str] = Field(default=None)
    last_entry_date: Optional[datetime] = Field(default=None)


class AccountBalance(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Số dư tài khoản theo ngày
    Dùng để truy vấn nhanh số dư tại một thời điểm
    """
    __tablename__ = "acc_account_balances"

    account_id: str = Field(foreign_key="acc_chart_of_accounts.id", nullable=False, index=True)

    balance_date: datetime = Field(nullable=False, index=True)

    debit_balance: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    credit_balance: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # For foreign currency accounts
    currency: str = Field(default="VND")
    currency_debit: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    currency_credit: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
