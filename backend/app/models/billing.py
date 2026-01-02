"""
Billing Models for Multi-tenant SaaS Platform
- Credits-based pricing with tiered transaction types
- Subscription management
- Invoice generation
- Payment tracking (VNPay integration)
"""
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional
from sqlmodel import SQLModel, Field
from app.models.base import BaseUUIDModel, TimestampMixin


# ==================== ENUMS ====================

class TransactionTier(str, Enum):
    """Transaction complexity tiers"""
    BASIC = "BASIC"           # Simple CRUD operations
    STANDARD = "STANDARD"     # Business transactions
    ADVANCED = "ADVANCED"     # Complex calculations
    WAREHOUSE = "WAREHOUSE"   # Lot/serial tracking
    AI_POWERED = "AI_POWERED" # AI/OCR processing
    STORAGE = "STORAGE"       # File uploads


class BillingCycle(str, Enum):
    """Billing cycle options"""
    MONTHLY = "MONTHLY"
    YEARLY = "YEARLY"


class SubscriptionStatus(str, Enum):
    """Subscription status"""
    ACTIVE = "ACTIVE"
    TRIAL = "TRIAL"
    PAST_DUE = "PAST_DUE"
    CANCELLED = "CANCELLED"
    SUSPENDED = "SUSPENDED"


class InvoiceStatus(str, Enum):
    """Invoice status"""
    DRAFT = "DRAFT"
    SENT = "SENT"
    PAID = "PAID"
    PARTIAL = "PARTIAL"
    OVERDUE = "OVERDUE"
    CANCELLED = "CANCELLED"


class BillingPaymentStatus(str, Enum):
    """Billing payment transaction status"""
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    REFUNDED = "REFUNDED"


class AlertType(str, Enum):
    """Alert types"""
    QUOTA_80 = "QUOTA_80"
    QUOTA_100 = "QUOTA_100"
    TRIAL_ENDING = "TRIAL_ENDING"  # Generic trial ending alert
    TRIAL_ENDING_7 = "TRIAL_ENDING_7"
    TRIAL_ENDING_1 = "TRIAL_ENDING_1"
    PAYMENT_OVERDUE = "PAYMENT_OVERDUE"
    PAYMENT_OVERDUE_BLOCK = "PAYMENT_OVERDUE_BLOCK"


# ==================== TRANSACTION TYPES ====================

class TransactionType(BaseUUIDModel, TimestampMixin, SQLModel, table=True):
    """
    Phân loại giao dịch theo độ phức tạp
    Mỗi tier có đơn giá khác nhau
    """
    __tablename__ = "billing_transaction_types"

    code: str = Field(index=True, unique=True)  # BASIC, STANDARD, etc.
    name: str                                    # "Giao dịch cơ bản"
    description: Optional[str] = None

    tier: int = Field(default=1)                 # 1-6 (tier cao = phức tạp hơn)

    # Pricing (VND)
    unit_price: Decimal = Field(default=Decimal("0"), max_digits=15, decimal_places=2)

    # Document types trong tier này (JSON array)
    document_types_json: str = Field(default="[]")  # ["ORDER", "TRIP", "SHIPMENT"]

    # Cost factors (để giải thích giá)
    has_file_upload: bool = Field(default=False)
    has_ai_processing: bool = Field(default=False)
    complexity_score: int = Field(default=1)     # 1-10

    is_active: bool = Field(default=True)
    sort_order: int = Field(default=0)


# ==================== BILLING PLANS ====================

class BillingPlan(BaseUUIDModel, TimestampMixin, SQLModel, table=True):
    """
    Gói cước cho tenant
    Credits-based pricing
    """
    __tablename__ = "billing_plans"

    code: str = Field(index=True, unique=True)   # FREE, STARTER, PRO, ENTERPRISE
    name: str                                     # "Gói Miễn phí"
    description: Optional[str] = None

    # Base fee (VND/tháng)
    price_per_month: Decimal = Field(default=Decimal("0"), max_digits=15, decimal_places=2)
    price_per_year: Decimal = Field(default=Decimal("0"), max_digits=15, decimal_places=2)  # Optional discount

    # Quota (credits-based)
    monthly_credits: int = Field(default=0)      # 0 = unlimited
    overage_discount: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=2)  # % giảm giá khi vượt
    grace_percent: int = Field(default=10)       # % cho phép vượt trước khi block (FREE)

    # Limits
    max_users: int = Field(default=0)            # 0 = unlimited
    max_storage_gb: Decimal = Field(default=Decimal("0"), max_digits=10, decimal_places=2)  # 0 = unlimited

    # Features (JSON)
    features_json: str = Field(default="{}")     # {"api_access": true, "ai_enabled": false}

    # Metadata
    is_active: bool = Field(default=True)
    is_public: bool = Field(default=True)        # Show on pricing page
    sort_order: int = Field(default=0)


# ==================== TENANT SUBSCRIPTIONS ====================

class TenantSubscription(BaseUUIDModel, TimestampMixin, SQLModel, table=True):
    """
    Đăng ký gói cước của từng tenant
    Tracks usage và billing period
    """
    __tablename__ = "tenant_subscriptions"

    tenant_id: str = Field(index=True, foreign_key="tenants.id")
    plan_id: str = Field(foreign_key="billing_plans.id")

    # Billing cycle
    billing_cycle: str = Field(default=BillingCycle.MONTHLY.value)
    current_period_start: datetime
    current_period_end: datetime

    # Status
    status: str = Field(default=SubscriptionStatus.ACTIVE.value, index=True)

    # Usage tracking (credits-based)
    credits_used: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    credits_limit: int = Field(default=0)        # Copy từ plan khi tạo/renew
    overage_credits: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Trial
    trial_ends_at: Optional[datetime] = None

    # Auto-renewal
    auto_renew: bool = Field(default=True)
    next_billing_date: Optional[datetime] = None

    # Grace period tracking (FREE plan)
    is_in_grace: bool = Field(default=False)
    blocked_at: Optional[datetime] = None
    block_reason: Optional[str] = None

    # Cancellation
    cancelled_at: Optional[datetime] = None
    cancellation_reason: Optional[str] = None


# ==================== TRANSACTION LOGS ====================

class TransactionLog(BaseUUIDModel, SQLModel, table=True):
    """
    Log mỗi giao dịch để đếm credits
    Immutable - không sửa, chỉ tạo mới
    """
    __tablename__ = "billing_transaction_logs"

    tenant_id: str = Field(index=True, foreign_key="tenants.id")
    subscription_id: str = Field(index=True, foreign_key="tenant_subscriptions.id")

    # Transaction type reference
    transaction_type_id: str = Field(foreign_key="billing_transaction_types.id")
    transaction_type_code: str = Field(index=True)  # Denormalized for query

    # Document info
    document_type: str = Field(index=True)       # ORDER, SHIPMENT, etc.
    document_id: str                              # UUID của document
    document_code: Optional[str] = None          # Mã document (để tra cứu)

    # Module
    module: str = Field(index=True)              # tms, wms, fms, etc.

    # Credits
    credits_charged: Decimal = Field(max_digits=15, decimal_places=2)
    unit_price: Decimal = Field(max_digits=15, decimal_places=2)  # Đơn giá tại thời điểm

    # For storage type
    file_size_bytes: Optional[int] = None

    # Billing period
    billing_period: str = Field(index=True)      # "2024-12" (YYYY-MM)

    # Overage flag
    is_overage: bool = Field(default=False)      # True if charged as overage

    # Timestamp
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)

    # Metadata (JSON)
    metadata_json: Optional[str] = None          # {"amount": 1000000, "customer": "ABC"}


# ==================== BILLING INVOICES ====================

class BillingInvoice(BaseUUIDModel, TimestampMixin, SQLModel, table=True):
    """
    Hóa đơn hàng tháng cho tenant
    """
    __tablename__ = "billing_invoices"

    tenant_id: str = Field(index=True, foreign_key="tenants.id")
    subscription_id: str = Field(foreign_key="tenant_subscriptions.id")

    # Invoice info
    invoice_number: str = Field(index=True, unique=True)  # INV-2024-000001
    invoice_date: datetime
    due_date: datetime

    # Period
    period_start: datetime
    period_end: datetime
    billing_period: str = Field(index=True)      # "2024-12"

    # Amounts (VND)
    base_amount: Decimal = Field(default=Decimal("0"), max_digits=15, decimal_places=2)

    # Transaction counts
    transactions_count: int = Field(default=0)       # Tổng số GD trong kỳ
    included_transactions: int = Field(default=0)    # GD trong gói
    overage_transactions: int = Field(default=0)     # GD vượt quota

    overage_amount: Decimal = Field(default=Decimal("0"), max_digits=15, decimal_places=2)
    tax_amount: Decimal = Field(default=Decimal("0"), max_digits=15, decimal_places=2)
    total_amount: Decimal = Field(default=Decimal("0"), max_digits=15, decimal_places=2)

    # Status
    status: str = Field(default=InvoiceStatus.DRAFT.value, index=True)

    # Payment tracking
    paid_at: Optional[datetime] = None
    paid_amount: Decimal = Field(default=Decimal("0"), max_digits=15, decimal_places=2)
    payment_method: Optional[str] = None
    payment_reference: Optional[str] = None

    # Notes
    notes: Optional[str] = None

    # Email tracking
    sent_at: Optional[datetime] = None
    reminder_sent_at: Optional[datetime] = None


# ==================== BILLING INVOICE LINES ====================

class BillingInvoiceLine(BaseUUIDModel, SQLModel, table=True):
    """
    Chi tiết từng dòng trong hóa đơn
    """
    __tablename__ = "billing_invoice_lines"

    invoice_id: str = Field(index=True, foreign_key="billing_invoices.id")

    # Line info
    line_number: int = Field(default=1)
    description: str

    # Transaction type (if applicable)
    transaction_type_code: Optional[str] = None
    transaction_type_name: Optional[str] = None

    # Quantities
    quantity: int = Field(default=0)
    unit_price: Decimal = Field(default=Decimal("0"), max_digits=15, decimal_places=2)

    # Amounts
    amount: Decimal = Field(default=Decimal("0"), max_digits=15, decimal_places=2)
    discount_amount: Decimal = Field(default=Decimal("0"), max_digits=15, decimal_places=2)
    line_total: Decimal = Field(default=Decimal("0"), max_digits=15, decimal_places=2)


# ==================== USAGE ALERTS ====================

class UsageAlert(BaseUUIDModel, TimestampMixin, SQLModel, table=True):
    """
    Cảnh báo usage và payment
    """
    __tablename__ = "billing_usage_alerts"

    tenant_id: str = Field(index=True, foreign_key="tenants.id")
    subscription_id: str = Field(foreign_key="tenant_subscriptions.id")

    # Alert info
    alert_type: str = Field(index=True)          # QUOTA_80, QUOTA_100, etc.
    alert_threshold: int = Field(default=0)      # % hoặc số ngày
    message: Optional[str] = None                # Auto-generated if not provided

    # Status
    triggered_at: datetime = Field(default_factory=datetime.utcnow)
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None

    # Notification tracking
    email_sent: bool = Field(default=False)
    email_sent_at: Optional[datetime] = None
    in_app_shown: bool = Field(default=False)


# ==================== PAYMENT TRANSACTIONS ====================

class PaymentTransaction(BaseUUIDModel, TimestampMixin, SQLModel, table=True):
    """
    Giao dịch thanh toán (VNPay, Bank transfer, etc.)
    """
    __tablename__ = "billing_payment_transactions"

    tenant_id: str = Field(index=True, foreign_key="tenants.id")
    invoice_id: Optional[str] = Field(default=None, foreign_key="billing_invoices.id")

    # Payment info
    amount: Decimal = Field(max_digits=15, decimal_places=2)
    currency: str = Field(default="VND")

    # Payment method
    payment_method: str = Field(default="VNPAY")  # VNPAY, BANK_TRANSFER, MANUAL

    # VNPay fields
    vnp_txn_ref: str = Field(index=True, unique=True)  # Mã GD của mình
    vnp_transaction_no: Optional[str] = None           # Mã GD VNPay trả về
    vnp_bank_code: Optional[str] = None
    vnp_bank_tran_no: Optional[str] = None
    vnp_card_type: Optional[str] = None
    vnp_pay_date: Optional[str] = None
    vnp_order_info: Optional[str] = None

    # Status
    status: str = Field(default=BillingPaymentStatus.PENDING.value, index=True)

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    paid_at: Optional[datetime] = None
    expired_at: Optional[datetime] = None

    # Response data (full JSON)
    request_json: Optional[str] = None
    response_json: Optional[str] = None

    # Notes
    notes: Optional[str] = None
