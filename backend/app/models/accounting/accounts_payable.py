"""
Accounting - Accounts Payable Models
Công nợ phải trả nhà cung cấp
"""
from typing import Optional
from sqlmodel import SQLModel, Field
from enum import Enum
from decimal import Decimal
from datetime import datetime
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class VendorInvoiceType(str, Enum):
    """Loại hóa đơn mua hàng"""
    PURCHASE = "PURCHASE"               # Hóa đơn mua hàng
    SERVICE = "SERVICE"                 # Hóa đơn dịch vụ
    EXPENSE = "EXPENSE"                 # Hóa đơn chi phí
    DEBIT_NOTE = "DEBIT_NOTE"          # Phiếu ghi nợ từ NCC
    CREDIT_NOTE = "CREDIT_NOTE"        # Phiếu ghi có từ NCC


class VendorInvoiceStatus(str, Enum):
    """Trạng thái hóa đơn mua"""
    DRAFT = "DRAFT"                     # Nháp
    PENDING_APPROVAL = "PENDING_APPROVAL"  # Chờ duyệt
    APPROVED = "APPROVED"               # Đã duyệt
    PARTIAL = "PARTIAL"                 # Thanh toán một phần
    PAID = "PAID"                       # Đã thanh toán đủ
    OVERDUE = "OVERDUE"                 # Quá hạn
    CANCELLED = "CANCELLED"             # Đã hủy


class PaymentVoucherStatus(str, Enum):
    """Trạng thái phiếu chi"""
    DRAFT = "DRAFT"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    POSTED = "POSTED"
    CANCELLED = "CANCELLED"


class VendorInvoice(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Hóa đơn mua hàng / Công nợ phải trả
    """
    __tablename__ = "acc_vendor_invoices"

    # Invoice identification
    invoice_number: str = Field(index=True, nullable=False)     # PM2024/000001 (internal)
    invoice_date: datetime = Field(nullable=False, index=True)
    due_date: datetime = Field(nullable=False, index=True)

    # Type
    invoice_type: str = Field(default=VendorInvoiceType.PURCHASE.value, index=True)

    # Vendor (from CRM)
    vendor_id: str = Field(nullable=False, index=True)          # crm_accounts.id (type=VENDOR)
    vendor_code: Optional[str] = Field(default=None)
    vendor_name: str = Field(nullable=False)
    vendor_tax_code: Optional[str] = Field(default=None)
    vendor_address: Optional[str] = Field(default=None)

    # Vendor's invoice info
    vendor_invoice_number: str = Field(nullable=False)          # Số hóa đơn của NCC
    vendor_invoice_date: Optional[datetime] = Field(default=None)
    vendor_invoice_series: Optional[str] = Field(default=None)  # Ký hiệu hóa đơn

    # Source reference (PO, Contract)
    source_type: Optional[str] = Field(default=None)            # PURCHASE_ORDER, CONTRACT
    source_id: Optional[str] = Field(default=None)

    # 3-Way Matching (PO - Receipt - Invoice)
    purchase_order_id: Optional[str] = Field(default=None)
    goods_receipt_id: Optional[str] = Field(default=None)
    is_matched: bool = Field(default=False)                     # 3-way match completed

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
    status: str = Field(default=VendorInvoiceStatus.DRAFT.value, index=True)

    # Payment terms
    payment_terms: Optional[str] = Field(default=None)
    payment_method: Optional[str] = Field(default=None)

    # Accounting
    journal_entry_id: Optional[str] = Field(default=None, foreign_key="acc_journal_entries.id")
    payable_account_id: Optional[str] = Field(default=None, foreign_key="acc_chart_of_accounts.id")
    expense_account_id: Optional[str] = Field(default=None, foreign_key="acc_chart_of_accounts.id")

    # Notes
    notes: Optional[str] = Field(default=None)
    internal_notes: Optional[str] = Field(default=None)

    # Approval workflow
    approved_at: Optional[datetime] = Field(default=None)
    approved_by: Optional[str] = Field(default=None)

    # Audit
    created_by: Optional[str] = Field(default=None)


class VendorInvoiceLine(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Chi tiết hóa đơn mua hàng"""
    __tablename__ = "acc_vendor_invoice_lines"

    invoice_id: str = Field(foreign_key="acc_vendor_invoices.id", nullable=False, index=True)

    line_number: int = Field(default=1)

    # Product/Service/Expense
    product_id: Optional[str] = Field(default=None)
    product_code: Optional[str] = Field(default=None)
    description: str = Field(nullable=False)

    # Unit
    unit: Optional[str] = Field(default=None)
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

    # 3-Way Matching
    po_line_id: Optional[str] = Field(default=None)
    receipt_line_id: Optional[str] = Field(default=None)
    received_quantity: Decimal = Field(default=Decimal("0"), max_digits=15, decimal_places=4)

    # Accounting
    expense_account_id: Optional[str] = Field(default=None, foreign_key="acc_chart_of_accounts.id")
    cost_center_id: Optional[str] = Field(default=None, foreign_key="acc_cost_centers.id")


class PaymentVoucher(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Phiếu chi tiền cho nhà cung cấp
    """
    __tablename__ = "acc_payment_vouchers"

    # Voucher identification
    voucher_number: str = Field(index=True, nullable=False)     # PC2024/000001
    voucher_date: datetime = Field(nullable=False, index=True)

    # Vendor
    vendor_id: str = Field(nullable=False, index=True)
    vendor_code: Optional[str] = Field(default=None)
    vendor_name: str = Field(nullable=False)

    # Payment method
    payment_method: str = Field(default="BANK_TRANSFER")        # CASH, BANK_TRANSFER, CHECK
    bank_account_id: Optional[str] = Field(default=None, foreign_key="acc_bank_accounts.id")

    # Bank transfer details
    beneficiary_bank: Optional[str] = Field(default=None)
    beneficiary_account: Optional[str] = Field(default=None)
    beneficiary_name: Optional[str] = Field(default=None)
    bank_reference: Optional[str] = Field(default=None)

    # Amount
    amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    currency: str = Field(default="VND")
    exchange_rate: Decimal = Field(default=Decimal("1"), max_digits=15, decimal_places=6)
    amount_vnd: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Allocation tracking
    allocated_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    unallocated_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Status
    status: str = Field(default=PaymentVoucherStatus.DRAFT.value, index=True)

    # Accounting
    journal_entry_id: Optional[str] = Field(default=None, foreign_key="acc_journal_entries.id")
    debit_account_id: Optional[str] = Field(default=None, foreign_key="acc_chart_of_accounts.id")  # AP
    credit_account_id: Optional[str] = Field(default=None, foreign_key="acc_chart_of_accounts.id")  # Cash/Bank

    # Notes
    description: Optional[str] = Field(default=None)
    notes: Optional[str] = Field(default=None)

    # Approval workflow
    approved_at: Optional[datetime] = Field(default=None)
    approved_by: Optional[str] = Field(default=None)

    # Audit
    posted_at: Optional[datetime] = Field(default=None)
    posted_by: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class PaymentVoucherAllocation(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Phân bổ thanh toán vào các hóa đơn mua
    """
    __tablename__ = "acc_payment_voucher_allocations"

    voucher_id: str = Field(foreign_key="acc_payment_vouchers.id", nullable=False, index=True)
    invoice_id: str = Field(foreign_key="acc_vendor_invoices.id", nullable=False, index=True)

    # Allocation amount
    allocated_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    allocation_date: datetime = Field(nullable=False)

    notes: Optional[str] = Field(default=None)


class DebitNote(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Phiếu ghi nợ (Giảm công nợ với NCC - VD: hàng trả lại)
    """
    __tablename__ = "acc_debit_notes"

    # Debit note identification
    debit_note_number: str = Field(index=True, nullable=False)
    debit_note_date: datetime = Field(nullable=False, index=True)

    # Vendor
    vendor_id: str = Field(nullable=False, index=True)
    vendor_code: Optional[str] = Field(default=None)
    vendor_name: str = Field(nullable=False)

    # Reference invoice
    invoice_id: Optional[str] = Field(default=None, foreign_key="acc_vendor_invoices.id")

    # Reason
    reason: str = Field(nullable=False)                         # Lý do ghi nợ

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


class APAgingSnapshot(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Báo cáo tuổi nợ phải trả - Snapshot
    """
    __tablename__ = "acc_ap_aging_snapshots"

    snapshot_date: datetime = Field(nullable=False, index=True)

    vendor_id: str = Field(nullable=False, index=True)
    vendor_code: Optional[str] = Field(default=None)
    vendor_name: Optional[str] = Field(default=None)

    # Aging buckets
    current_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    days_1_30: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    days_31_60: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    days_61_90: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    days_over_90: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    total_payable: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
