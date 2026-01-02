"""
Accounting - Banking & Cash Management Models
Quản lý ngân hàng và tiền mặt
"""
from typing import Optional
from sqlmodel import SQLModel, Field
from enum import Enum
from decimal import Decimal
from datetime import datetime
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class BankAccountType(str, Enum):
    """Loại tài khoản ngân hàng"""
    CURRENT = "CURRENT"                 # Tài khoản thanh toán
    SAVINGS = "SAVINGS"                 # Tài khoản tiết kiệm
    DEPOSIT = "DEPOSIT"                 # Tiền gửi có kỳ hạn
    LOAN = "LOAN"                       # Tài khoản vay
    CASH = "CASH"                       # Quỹ tiền mặt


class BankAccountStatus(str, Enum):
    """Trạng thái tài khoản"""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    CLOSED = "CLOSED"


class TransactionType(str, Enum):
    """Loại giao dịch ngân hàng"""
    CREDIT = "CREDIT"                   # Tiền vào
    DEBIT = "DEBIT"                     # Tiền ra


class TransactionStatus(str, Enum):
    """Trạng thái giao dịch"""
    PENDING = "PENDING"                 # Chờ xử lý
    POSTED = "POSTED"                   # Đã ghi sổ
    RECONCILED = "RECONCILED"           # Đã đối chiếu
    CANCELLED = "CANCELLED"             # Đã hủy


class ReconciliationStatus(str, Enum):
    """Trạng thái đối chiếu"""
    DRAFT = "DRAFT"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class BankAccount(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Tài khoản ngân hàng / Quỹ tiền mặt
    """
    __tablename__ = "acc_bank_accounts"

    # Account identification
    code: str = Field(index=True, nullable=False)               # BANK001, CASH001
    name: str = Field(nullable=False)

    account_type: str = Field(default=BankAccountType.CURRENT.value, index=True)

    # Bank info
    bank_name: Optional[str] = Field(default=None)
    bank_branch: Optional[str] = Field(default=None)
    account_number: Optional[str] = Field(default=None, index=True)
    account_holder: Optional[str] = Field(default=None)
    swift_code: Optional[str] = Field(default=None)

    # Currency
    currency: str = Field(default="VND")
    is_primary: bool = Field(default=False)                     # Tài khoản chính

    # Balance
    current_balance: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    available_balance: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Opening balance
    opening_balance: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    opening_date: Optional[datetime] = Field(default=None)

    # Linked GL account
    gl_account_id: Optional[str] = Field(default=None, foreign_key="acc_chart_of_accounts.id")

    # Status
    status: str = Field(default=BankAccountStatus.ACTIVE.value, index=True)

    # Last reconciliation
    last_reconcile_date: Optional[datetime] = Field(default=None)
    last_reconcile_balance: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class BankTransaction(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Giao dịch ngân hàng / Tiền mặt
    """
    __tablename__ = "acc_bank_transactions"

    bank_account_id: str = Field(foreign_key="acc_bank_accounts.id", nullable=False, index=True)

    # Transaction identification
    transaction_number: str = Field(index=True, nullable=False)
    transaction_date: datetime = Field(nullable=False, index=True)
    value_date: Optional[datetime] = Field(default=None)        # Ngày giá trị

    transaction_type: str = Field(default=TransactionType.CREDIT.value, index=True)

    # Amount
    amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    currency: str = Field(default="VND")
    exchange_rate: Decimal = Field(default=Decimal("1"), max_digits=15, decimal_places=6)
    amount_vnd: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Balance after transaction
    running_balance: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Partner
    partner_id: Optional[str] = Field(default=None, index=True)
    partner_name: Optional[str] = Field(default=None)
    partner_bank_account: Optional[str] = Field(default=None)

    # Reference
    reference: Optional[str] = Field(default=None)              # Bank reference number
    description: str = Field(nullable=False)

    # Source document
    source_type: Optional[str] = Field(default=None)            # RECEIPT, VOUCHER, TRANSFER
    source_id: Optional[str] = Field(default=None)

    # Category for reporting
    category: Optional[str] = Field(default=None)               # OPERATING, INVESTING, FINANCING

    # Status
    status: str = Field(default=TransactionStatus.PENDING.value, index=True)

    # Reconciliation
    is_reconciled: bool = Field(default=False, index=True)
    reconciliation_id: Optional[str] = Field(default=None, foreign_key="acc_bank_reconciliations.id")
    reconciled_date: Optional[datetime] = Field(default=None)

    # Accounting
    journal_entry_id: Optional[str] = Field(default=None, foreign_key="acc_journal_entries.id")

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class BankStatement(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Sao kê ngân hàng (Import từ file)
    """
    __tablename__ = "acc_bank_statements"

    bank_account_id: str = Field(foreign_key="acc_bank_accounts.id", nullable=False, index=True)

    # Statement period
    statement_number: str = Field(index=True, nullable=False)
    statement_date: datetime = Field(nullable=False)
    start_date: datetime = Field(nullable=False)
    end_date: datetime = Field(nullable=False)

    # Balances
    opening_balance: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    closing_balance: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    total_credit: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    total_debit: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    transaction_count: int = Field(default=0)

    # Import info
    import_file: Optional[str] = Field(default=None)
    imported_at: Optional[datetime] = Field(default=None)
    imported_by: Optional[str] = Field(default=None)

    # Reconciliation status
    is_reconciled: bool = Field(default=False)
    reconciliation_id: Optional[str] = Field(default=None)

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class BankStatementLine(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Chi tiết sao kê ngân hàng
    """
    __tablename__ = "acc_bank_statement_lines"

    statement_id: str = Field(foreign_key="acc_bank_statements.id", nullable=False, index=True)

    line_number: int = Field(default=1)
    transaction_date: datetime = Field(nullable=False, index=True)
    value_date: Optional[datetime] = Field(default=None)

    # Amount
    credit_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    debit_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    running_balance: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Reference
    reference: Optional[str] = Field(default=None)
    description: str = Field(nullable=False)
    partner_info: Optional[str] = Field(default=None)

    # Matching
    is_matched: bool = Field(default=False)
    matched_transaction_id: Optional[str] = Field(default=None, foreign_key="acc_bank_transactions.id")
    match_confidence: Optional[Decimal] = Field(default=None, max_digits=5, decimal_places=2)  # % confidence


class BankReconciliation(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Đối chiếu ngân hàng
    """
    __tablename__ = "acc_bank_reconciliations"

    bank_account_id: str = Field(foreign_key="acc_bank_accounts.id", nullable=False, index=True)

    # Reconciliation period
    reconciliation_date: datetime = Field(nullable=False, index=True)
    period_start: datetime = Field(nullable=False)
    period_end: datetime = Field(nullable=False)

    # Balances
    statement_balance: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)  # Số dư sao kê
    book_balance: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)       # Số dư sổ sách

    # Adjustments
    deposits_in_transit: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)  # Tiền đang chuyển đến
    outstanding_checks: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)   # Séc chưa thanh toán
    bank_charges: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)         # Phí ngân hàng
    bank_interest: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)        # Lãi ngân hàng
    other_adjustments: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Adjusted balances
    adjusted_statement_balance: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    adjusted_book_balance: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Difference (should be 0 when completed)
    difference: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Status
    status: str = Field(default=ReconciliationStatus.DRAFT.value, index=True)

    # Completion
    completed_at: Optional[datetime] = Field(default=None)
    completed_by: Optional[str] = Field(default=None)

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class BankTransfer(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Chuyển tiền nội bộ (giữa các tài khoản)
    """
    __tablename__ = "acc_bank_transfers"

    transfer_number: str = Field(index=True, nullable=False)
    transfer_date: datetime = Field(nullable=False, index=True)

    # Source
    from_account_id: str = Field(foreign_key="acc_bank_accounts.id", nullable=False)
    from_transaction_id: Optional[str] = Field(default=None, foreign_key="acc_bank_transactions.id")

    # Destination
    to_account_id: str = Field(foreign_key="acc_bank_accounts.id", nullable=False)
    to_transaction_id: Optional[str] = Field(default=None, foreign_key="acc_bank_transactions.id")

    # Amount
    amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    from_currency: str = Field(default="VND")
    to_currency: str = Field(default="VND")
    exchange_rate: Decimal = Field(default=Decimal("1"), max_digits=15, decimal_places=6)

    # If different currencies
    from_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    to_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    exchange_gain_loss: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Status
    status: str = Field(default="DRAFT")                        # DRAFT, POSTED, CANCELLED

    # Accounting
    journal_entry_id: Optional[str] = Field(default=None, foreign_key="acc_journal_entries.id")

    description: Optional[str] = Field(default=None)
    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class CashCount(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Kiểm kê quỹ tiền mặt
    """
    __tablename__ = "acc_cash_counts"

    cash_account_id: str = Field(foreign_key="acc_bank_accounts.id", nullable=False, index=True)

    count_date: datetime = Field(nullable=False, index=True)
    count_number: str = Field(index=True, nullable=False)

    # Book balance
    book_balance: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Counted amounts by denomination
    denominations: Optional[str] = Field(default=None)          # JSON: {"500000": 10, "200000": 5, ...}

    # Actual count
    actual_balance: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Difference
    difference: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    difference_reason: Optional[str] = Field(default=None)

    # Status
    status: str = Field(default="DRAFT")                        # DRAFT, CONFIRMED

    # Audit
    counted_by: Optional[str] = Field(default=None)
    verified_by: Optional[str] = Field(default=None)
    confirmed_at: Optional[datetime] = Field(default=None)

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)
