"""
CRM - Sales Order Model
Manage sales orders from customers
"""
from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime, date
from enum import Enum
from decimal import Decimal

from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped

if TYPE_CHECKING:
    from app.models.crm.account import Account
    from app.models.crm.contact import Contact
    from app.models.crm.quote import Quote
    from app.models.crm.contract import Contract


class SalesOrderStatus(str, Enum):
    DRAFT = "DRAFT"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    CONFIRMED = "CONFIRMED"
    PROCESSING = "PROCESSING"
    PARTIALLY_SHIPPED = "PARTIALLY_SHIPPED"
    SHIPPED = "SHIPPED"
    DELIVERED = "DELIVERED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    ON_HOLD = "ON_HOLD"
    RETURNED = "RETURNED"


class SalesOrderPaymentStatus(str, Enum):
    """Sales Order payment status"""
    UNPAID = "UNPAID"
    PARTIAL = "PARTIAL"
    PAID = "PAID"
    OVERDUE = "OVERDUE"
    REFUNDED = "REFUNDED"


class ShippingMethod(str, Enum):
    STANDARD = "STANDARD"
    EXPRESS = "EXPRESS"
    OVERNIGHT = "OVERNIGHT"
    PICKUP = "PICKUP"
    FREIGHT = "FREIGHT"
    OTHER = "OTHER"


class PaymentMethod(str, Enum):
    CASH = "CASH"
    BANK_TRANSFER = "BANK_TRANSFER"
    CREDIT_CARD = "CREDIT_CARD"
    CHECK = "CHECK"
    COD = "COD"
    CREDIT = "CREDIT"
    OTHER = "OTHER"


class SalesOrder(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Sales Order model for managing customer orders"""
    __tablename__ = "crm_sales_orders"

    # Basic Information
    code: str = Field(index=True, max_length=50)
    reference_number: Optional[str] = Field(default=None, max_length=100)
    po_number: Optional[str] = Field(default=None, max_length=100)  # Customer PO

    # Foreign Keys with proper constraints
    account_id: str = Field(foreign_key="crm_accounts.id", index=True)
    contact_id: Optional[str] = Field(default=None, foreign_key="crm_contacts.id", index=True)
    quote_id: Optional[str] = Field(default=None, foreign_key="crm_quotes.id", index=True)
    contract_id: Optional[str] = Field(default=None, foreign_key="crm_contracts.id", index=True)

    # Dates - using date type instead of str
    order_date: date = Field(default_factory=date.today, index=True)
    delivery_date: Optional[date] = Field(default=None, index=True)
    expected_delivery_date: Optional[date] = None
    shipped_date: Optional[date] = None
    actual_delivery_date: Optional[date] = None
    due_date: Optional[date] = Field(default=None, index=True)  # Payment due date

    # Status
    status: str = Field(default=SalesOrderStatus.DRAFT.value, index=True)
    payment_status: str = Field(default=SalesOrderPaymentStatus.UNPAID.value, index=True)

    # Pricing - using Decimal for currency
    subtotal: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)
    tax_amount: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)
    discount_amount: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)
    discount_percent: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=2)
    shipping_cost: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)
    total_amount: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)
    amount_paid: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)
    amount_due: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)
    currency: str = Field(default="VND", max_length=3)

    # Addresses
    shipping_address: Optional[str] = Field(default=None, max_length=500)
    shipping_city: Optional[str] = Field(default=None, max_length=100)
    shipping_state: Optional[str] = Field(default=None, max_length=100)
    shipping_postal_code: Optional[str] = Field(default=None, max_length=20)
    shipping_country: Optional[str] = Field(default=None, max_length=100)

    billing_address: Optional[str] = Field(default=None, max_length=500)
    billing_city: Optional[str] = Field(default=None, max_length=100)
    billing_state: Optional[str] = Field(default=None, max_length=100)
    billing_postal_code: Optional[str] = Field(default=None, max_length=20)
    billing_country: Optional[str] = Field(default=None, max_length=100)

    # Shipping
    shipping_method: Optional[str] = Field(default=None, max_length=50)
    tracking_number: Optional[str] = Field(default=None, max_length=100)
    carrier: Optional[str] = Field(default=None, max_length=100)

    # Payment
    payment_method: Optional[str] = Field(default=None, max_length=50)
    payment_terms: Optional[str] = Field(default=None, max_length=50)
    payment_reference: Optional[str] = Field(default=None, max_length=100)

    # Notes
    notes: Optional[str] = Field(default=None, max_length=2000)
    internal_notes: Optional[str] = Field(default=None, max_length=2000)
    special_instructions: Optional[str] = Field(default=None, max_length=1000)

    # Audit Fields
    created_by: Optional[str] = Field(default=None, foreign_key="users.id", index=True)
    updated_by: Optional[str] = Field(default=None, foreign_key="users.id")
    approved_by: Optional[str] = Field(default=None, foreign_key="users.id")
    approved_at: Optional[datetime] = None
    confirmed_by: Optional[str] = Field(default=None, foreign_key="users.id")
    confirmed_at: Optional[datetime] = None

    # TMS Integration
    tms_order_id: Optional[str] = Field(default=None, index=True)
    tms_synced_at: Optional[datetime] = None

    # Relationships (optional, uncomment if needed)
    # account: Optional["Account"] = Relationship(back_populates="sales_orders")
    # contact: Optional["Contact"] = Relationship()
    # quote: Optional["Quote"] = Relationship()
    # contract: Optional["Contract"] = Relationship()
    # items: List["SalesOrderItem"] = Relationship(back_populates="sales_order")

    class Config:
        use_enum_values = True


class SalesOrderItem(BaseUUIDModel, SQLModel, table=True):
    """Sales Order Item model"""
    __tablename__ = "crm_sales_order_items"

    sales_order_id: str = Field(foreign_key="crm_sales_orders.id", index=True)

    # Product Details
    product_id: Optional[str] = Field(default=None, index=True)
    product_code: Optional[str] = Field(default=None, max_length=50)
    product_name: str = Field(max_length=255)
    sku: Optional[str] = Field(default=None, max_length=50)
    description: Optional[str] = Field(default=None, max_length=1000)

    # Quantity & Pricing - using Decimal
    quantity: Decimal = Field(default=Decimal("1"), max_digits=12, decimal_places=4)
    quantity_shipped: Decimal = Field(default=Decimal("0"), max_digits=12, decimal_places=4)
    quantity_delivered: Decimal = Field(default=Decimal("0"), max_digits=12, decimal_places=4)
    quantity_returned: Decimal = Field(default=Decimal("0"), max_digits=12, decimal_places=4)
    unit: Optional[str] = Field(default=None, max_length=20)
    unit_price: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)
    discount_percent: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=2)
    discount_amount: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)
    tax_percent: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=2)
    tax_amount: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)
    line_total: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)

    # Status
    status: Optional[str] = Field(default=None, max_length=50)

    # Notes
    notes: Optional[str] = Field(default=None, max_length=500)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    # Relationships (optional)
    # sales_order: Optional["SalesOrder"] = Relationship(back_populates="items")

    class Config:
        use_enum_values = True
