"""
Financial Models - Quản lý tài chính

Bao gồm:
- Invoice: Hóa đơn
- Payment: Thanh toán
- PaymentTerm: Điều khoản thanh toán
- FinancialSummary: Tổng hợp tài chính
"""
from typing import Optional
from datetime import datetime, date
from enum import Enum
from sqlmodel import SQLModel, Field, Column, JSON
from app.models.base import BaseUUIDModel, TimestampMixin


class InvoiceType(str, Enum):
    """Loại hóa đơn"""
    RECEIVABLE = "RECEIVABLE"  # Phải thu (từ khách hàng)
    PAYABLE = "PAYABLE"        # Phải trả (cho tài xế, đối tác)


class InvoiceStatus(str, Enum):
    """Trạng thái hóa đơn"""
    DRAFT = "DRAFT"
    PENDING = "PENDING"
    SENT = "SENT"
    PARTIAL = "PARTIAL"
    PAID = "PAID"
    OVERDUE = "OVERDUE"
    CANCELLED = "CANCELLED"


class PaymentMethod(str, Enum):
    """Phương thức thanh toán"""
    CASH = "CASH"
    BANK_TRANSFER = "BANK_TRANSFER"
    MOMO = "MOMO"
    VNPAY = "VNPAY"
    ZALO_PAY = "ZALO_PAY"
    CREDIT = "CREDIT"  # Công nợ
    OTHER = "OTHER"


class Invoice(BaseUUIDModel, TimestampMixin, SQLModel, table=True):
    """
    Invoice - Hóa đơn

    Quản lý hóa đơn phải thu và phải trả
    """
    __tablename__ = "invoices"

    # === Owner & Type ===
    owner_actor_id: str = Field(index=True)  # Ai tạo hóa đơn
    invoice_type: str = Field(index=True)    # RECEIVABLE, PAYABLE
    counterpart_actor_id: str = Field(index=True)  # Khách hàng hoặc Tài xế

    # === Invoice Info ===
    invoice_number: str = Field(index=True)
    status: str = Field(default=InvoiceStatus.DRAFT.value, index=True)
    invoice_date: date
    due_date: Optional[date] = Field(default=None)

    # === Amounts ===
    currency: str = Field(default="VND")
    subtotal: float = Field(default=0)
    tax_rate: Optional[float] = Field(default=None)  # %
    tax_amount: float = Field(default=0)
    discount_amount: float = Field(default=0)
    total_amount: float = Field(default=0)
    amount_paid: float = Field(default=0)
    amount_due: float = Field(default=0)

    # === References ===
    order_ids: Optional[list] = Field(default=None, sa_column=Column(JSON))
    # Danh sách order_id gắn với hóa đơn này

    # === Notes ===
    notes: Optional[str] = Field(default=None)
    internal_notes: Optional[str] = Field(default=None)

    # === Documents ===
    attachments: Optional[list] = Field(default=None, sa_column=Column(JSON))

    # === Metadata ===
    extra_data: Optional[dict] = Field(default=None, sa_column=Column(JSON))


class InvoiceItem(BaseUUIDModel, SQLModel, table=True):
    """
    Invoice Item - Chi tiết hóa đơn
    """
    __tablename__ = "invoice_items"

    invoice_id: str = Field(index=True)
    order_id: Optional[str] = Field(default=None, index=True)

    # === Item Details ===
    description: str
    quantity: float = Field(default=1)
    unit_price: float
    amount: float

    # === Notes ===
    notes: Optional[str] = Field(default=None)

    # === Metadata ===
    extra_data: Optional[dict] = Field(default=None, sa_column=Column(JSON))


class Payment(BaseUUIDModel, TimestampMixin, SQLModel, table=True):
    """
    Payment - Thanh toán

    Ghi nhận các khoản thanh toán
    """
    __tablename__ = "payments"

    # === References ===
    owner_actor_id: str = Field(index=True)  # Ai ghi nhận
    invoice_id: Optional[str] = Field(default=None, index=True)
    payer_actor_id: Optional[str] = Field(default=None, index=True)  # Người trả
    payee_actor_id: Optional[str] = Field(default=None, index=True)  # Người nhận

    # === Payment Info ===
    payment_number: Optional[str] = Field(default=None, index=True)
    payment_date: datetime = Field(default_factory=datetime.utcnow)
    payment_method: str = Field(default=PaymentMethod.BANK_TRANSFER.value)

    # === Amount ===
    currency: str = Field(default="VND")
    amount: float

    # === Bank Info (nếu chuyển khoản) ===
    bank_name: Optional[str] = Field(default=None)
    bank_account: Optional[str] = Field(default=None)
    bank_reference: Optional[str] = Field(default=None)

    # === Status ===
    status: str = Field(default="COMPLETED")  # PENDING, COMPLETED, FAILED, REFUNDED

    # === Notes ===
    notes: Optional[str] = Field(default=None)

    # === Receipt ===
    receipt_image: Optional[str] = Field(default=None)

    # === Metadata ===
    extra_data: Optional[dict] = Field(default=None, sa_column=Column(JSON))


class PaymentTerm(BaseUUIDModel, TimestampMixin, SQLModel, table=True):
    """
    Payment Term - Điều khoản thanh toán

    Định nghĩa điều khoản thanh toán với đối tác
    """
    __tablename__ = "payment_terms"

    # === Parties ===
    owner_actor_id: str = Field(index=True)      # Tenant/Dispatcher
    counterpart_actor_id: str = Field(index=True)  # Khách hàng/Tài xế

    # === Terms ===
    payment_cycle: str = Field(default="ON_DELIVERY")
    # ON_DELIVERY, WEEKLY, BI_WEEKLY, MONTHLY, NET_7, NET_15, NET_30

    credit_limit: Optional[float] = Field(default=None)
    current_balance: float = Field(default=0)  # Số dư hiện tại

    # === Default Rates (cho tài xế) ===
    default_rate_per_order: Optional[float] = Field(default=None)
    default_rate_per_km: Optional[float] = Field(default=None)
    default_rate_per_container: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    # {"20": 500000, "40": 800000}

    # === Currency ===
    currency: str = Field(default="VND")

    # === Status ===
    is_active: bool = Field(default=True)

    # === Notes ===
    notes: Optional[str] = Field(default=None)

    # === Metadata ===
    extra_data: Optional[dict] = Field(default=None, sa_column=Column(JSON))


class FinancialSummary(BaseUUIDModel, TimestampMixin, SQLModel, table=True):
    """
    Financial Summary - Tổng hợp tài chính

    Cache tổng hợp tài chính theo kỳ
    """
    __tablename__ = "financial_summaries"

    # === Owner ===
    owner_actor_id: str = Field(index=True)

    # === Period ===
    period_type: str = Field(index=True)  # DAILY, WEEKLY, MONTHLY, YEARLY
    period_start: date = Field(index=True)
    period_end: date

    # === Revenue ===
    total_orders: int = Field(default=0)
    total_revenue: float = Field(default=0)
    total_freight_charges: float = Field(default=0)
    total_additional_charges: float = Field(default=0)

    # === Costs ===
    total_driver_payments: float = Field(default=0)
    total_fuel_costs: float = Field(default=0)
    total_maintenance_costs: float = Field(default=0)
    total_other_costs: float = Field(default=0)
    total_costs: float = Field(default=0)

    # === Profit ===
    gross_profit: float = Field(default=0)
    profit_margin: Optional[float] = Field(default=None)  # %

    # === Receivables ===
    total_receivables: float = Field(default=0)
    total_received: float = Field(default=0)
    outstanding_receivables: float = Field(default=0)

    # === Payables ===
    total_payables: float = Field(default=0)
    total_paid: float = Field(default=0)
    outstanding_payables: float = Field(default=0)

    # === Currency ===
    currency: str = Field(default="VND")

    # === Metadata ===
    extra_data: Optional[dict] = Field(default=None, sa_column=Column(JSON))


class DriverEarning(BaseUUIDModel, TimestampMixin, SQLModel, table=True):
    """
    Driver Earning - Thu nhập tài xế

    Theo dõi thu nhập của tài xế theo kỳ
    """
    __tablename__ = "driver_earnings"

    # === Driver ===
    driver_actor_id: str = Field(index=True)
    employer_actor_id: str = Field(index=True)  # Tenant hoặc Dispatcher

    # === Period ===
    period_type: str = Field(index=True)  # WEEKLY, BI_WEEKLY, MONTHLY
    period_start: date = Field(index=True)
    period_end: date

    # === Orders ===
    total_orders: int = Field(default=0)
    total_distance_km: Optional[float] = Field(default=None)

    # === Earnings ===
    currency: str = Field(default="VND")
    gross_earnings: float = Field(default=0)
    deductions: float = Field(default=0)
    net_earnings: float = Field(default=0)

    # === Breakdown ===
    earnings_breakdown: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    # {"base": 5000000, "bonus": 500000, "overtime": 200000}
    deductions_breakdown: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    # {"fuel_advance": 1000000, "damage": 0}

    # === Payment ===
    payment_status: str = Field(default="PENDING")  # PENDING, PARTIAL, PAID
    amount_paid: float = Field(default=0)
    paid_at: Optional[datetime] = Field(default=None)

    # === Notes ===
    notes: Optional[str] = Field(default=None)

    # === Metadata ===
    extra_data: Optional[dict] = Field(default=None, sa_column=Column(JSON))
