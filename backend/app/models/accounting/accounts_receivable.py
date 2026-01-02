"""
Accounting - Accounts Receivable Models
Công nợ phải thu khách hàng
"""
from typing import Optional
from sqlmodel import SQLModel, Field
from enum import Enum
from decimal import Decimal
from datetime import datetime
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class InvoiceType(str, Enum):
    """Loại hóa đơn"""
    SALES = "SALES"                     # Hóa đơn bán hàng
    SERVICE = "SERVICE"                 # Hóa đơn dịch vụ
    TRANSPORT = "TRANSPORT"             # Hóa đơn vận chuyển
    DEBIT_NOTE = "DEBIT_NOTE"          # Phiếu ghi nợ
    CREDIT_NOTE = "CREDIT_NOTE"        # Phiếu ghi có


class InvoiceStatus(str, Enum):
    """Trạng thái hóa đơn"""
    DRAFT = "DRAFT"                     # Nháp
    VALIDATED = "VALIDATED"             # Đã xác nhận
    SENT = "SENT"                       # Đã gửi khách hàng
    PARTIAL = "PARTIAL"                 # Thanh toán một phần
    PAID = "PAID"                       # Đã thanh toán đủ
    OVERDUE = "OVERDUE"                 # Quá hạn
    CANCELLED = "CANCELLED"             # Đã hủy
    WRITTEN_OFF = "WRITTEN_OFF"         # Đã xóa nợ


class PaymentReceiptStatus(str, Enum):
    """Trạng thái phiếu thu"""
    DRAFT = "DRAFT"
    CONFIRMED = "CONFIRMED"
    POSTED = "POSTED"
    CANCELLED = "CANCELLED"


class CustomerInvoice(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Hóa đơn bán hàng / Công nợ phải thu
    """
    __tablename__ = "acc_customer_invoices"

    # Invoice identification
    invoice_number: str = Field(index=True, nullable=False)     # HD2024/000001
    invoice_date: datetime = Field(nullable=False, index=True)
    due_date: datetime = Field(nullable=False, index=True)

    # Type
    invoice_type: str = Field(default=InvoiceType.SALES.value, index=True)

    # Customer (from CRM)
    customer_id: str = Field(nullable=False, index=True)        # crm_accounts.id
    customer_code: Optional[str] = Field(default=None)
    customer_name: str = Field(nullable=False)
    customer_tax_code: Optional[str] = Field(default=None)
    customer_address: Optional[str] = Field(default=None)

    # VAT Invoice info
    vat_invoice_number: Optional[str] = Field(default=None)     # Số hóa đơn VAT
    vat_invoice_date: Optional[datetime] = Field(default=None)
    vat_invoice_series: Optional[str] = Field(default=None)     # Ký hiệu hóa đơn

    # Source reference
    source_type: Optional[str] = Field(default=None)            # SALES_ORDER, TRIP, CONTRACT
    source_id: Optional[str] = Field(default=None)

    # Amounts
    subtotal: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    discount_percent: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=2)
    discount_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    tax_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    total_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Currency
    currency: str = Field(default="VND")
    exchange_rate: Decimal = Field(default=Decimal("1"), max_digits=15, decimal_places=6)
    total_amount_vnd: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Payment tracking
    paid_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    balance_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Status
    status: str = Field(default=InvoiceStatus.DRAFT.value, index=True)

    # Payment terms
    payment_terms: Optional[str] = Field(default=None)          # NET30, COD, etc.
    payment_method: Optional[str] = Field(default=None)         # CASH, BANK, etc.

    # Accounting
    journal_entry_id: Optional[str] = Field(default=None, foreign_key="acc_journal_entries.id")
    receivable_account_id: Optional[str] = Field(default=None, foreign_key="acc_chart_of_accounts.id")
    revenue_account_id: Optional[str] = Field(default=None, foreign_key="acc_chart_of_accounts.id")

    # Notes
    notes: Optional[str] = Field(default=None)
    internal_notes: Optional[str] = Field(default=None)

    # Audit
    validated_at: Optional[datetime] = Field(default=None)
    validated_by: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class CustomerInvoiceLine(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Chi tiết hóa đơn bán hàng"""
    __tablename__ = "acc_customer_invoice_lines"

    invoice_id: str = Field(foreign_key="acc_customer_invoices.id", nullable=False, index=True)

    line_number: int = Field(default=1)

    # Product/Service
    product_id: Optional[str] = Field(default=None)
    product_code: Optional[str] = Field(default=None)
    description: str = Field(nullable=False)

    # Unit
    unit: Optional[str] = Field(default=None)                   # Đơn vị tính
    quantity: Decimal = Field(default=Decimal("1"), max_digits=15, decimal_places=4)
    unit_price: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Discount
    discount_percent: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=2)
    discount_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Tax
    tax_id: Optional[str] = Field(default=None, foreign_key="acc_tax_rates.id")
    tax_rate: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=2)
    tax_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Amount
    line_total: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Accounting
    revenue_account_id: Optional[str] = Field(default=None, foreign_key="acc_chart_of_accounts.id")


class PaymentReceipt(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Phiếu thu tiền khách hàng
    """
    __tablename__ = "acc_payment_receipts"

    # Receipt identification
    receipt_number: str = Field(index=True, nullable=False)     # PT2024/000001
    receipt_date: datetime = Field(nullable=False, index=True)

    # Customer
    customer_id: str = Field(nullable=False, index=True)
    customer_code: Optional[str] = Field(default=None)
    customer_name: str = Field(nullable=False)

    # Payment method
    payment_method: str = Field(default="CASH")                 # CASH, BANK_TRANSFER, CHECK
    bank_account_id: Optional[str] = Field(default=None, foreign_key="acc_bank_accounts.id")

    # For bank transfer
    bank_reference: Optional[str] = Field(default=None)
    bank_transaction_date: Optional[datetime] = Field(default=None)

    # Amount
    amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    currency: str = Field(default="VND")
    exchange_rate: Decimal = Field(default=Decimal("1"), max_digits=15, decimal_places=6)
    amount_vnd: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Allocation tracking
    allocated_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    unallocated_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Status
    status: str = Field(default=PaymentReceiptStatus.DRAFT.value, index=True)

    # Accounting
    journal_entry_id: Optional[str] = Field(default=None, foreign_key="acc_journal_entries.id")
    debit_account_id: Optional[str] = Field(default=None, foreign_key="acc_chart_of_accounts.id")  # Cash/Bank
    credit_account_id: Optional[str] = Field(default=None, foreign_key="acc_chart_of_accounts.id")  # AR

    # Notes
    description: Optional[str] = Field(default=None)
    notes: Optional[str] = Field(default=None)

    # Audit
    confirmed_at: Optional[datetime] = Field(default=None)
    confirmed_by: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class PaymentReceiptAllocation(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Phân bổ thanh toán vào các hóa đơn
    """
    __tablename__ = "acc_payment_receipt_allocations"

    receipt_id: str = Field(foreign_key="acc_payment_receipts.id", nullable=False, index=True)
    invoice_id: str = Field(foreign_key="acc_customer_invoices.id", nullable=False, index=True)

    # Allocation amount
    allocated_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    allocation_date: datetime = Field(nullable=False)

    notes: Optional[str] = Field(default=None)


class CreditNote(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Phiếu ghi có (Giảm nợ khách hàng)
    """
    __tablename__ = "acc_credit_notes"

    # Credit note identification
    credit_note_number: str = Field(index=True, nullable=False)
    credit_note_date: datetime = Field(nullable=False, index=True)

    # Customer
    customer_id: str = Field(nullable=False, index=True)
    customer_code: Optional[str] = Field(default=None)
    customer_name: str = Field(nullable=False)

    # Reference invoice
    invoice_id: Optional[str] = Field(default=None, foreign_key="acc_customer_invoices.id")

    # Reason
    reason: str = Field(nullable=False)                         # Lý do ghi có

    # Amount
    amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    tax_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    total_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    currency: str = Field(default="VND")

    # Status
    status: str = Field(default="DRAFT")                        # DRAFT, VALIDATED, APPLIED, CANCELLED

    # Accounting
    journal_entry_id: Optional[str] = Field(default=None, foreign_key="acc_journal_entries.id")

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class ARAgingSnapshot(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Báo cáo tuổi nợ phải thu - Snapshot
    Chạy định kỳ để lưu trạng thái aging
    """
    __tablename__ = "acc_ar_aging_snapshots"

    snapshot_date: datetime = Field(nullable=False, index=True)

    customer_id: str = Field(nullable=False, index=True)
    customer_code: Optional[str] = Field(default=None)
    customer_name: Optional[str] = Field(default=None)

    # Aging buckets
    current_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)      # Chưa đến hạn
    days_1_30: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)           # 1-30 ngày
    days_31_60: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)          # 31-60 ngày
    days_61_90: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)          # 61-90 ngày
    days_over_90: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)        # >90 ngày

    total_receivable: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Credit info
    credit_limit: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    available_credit: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
