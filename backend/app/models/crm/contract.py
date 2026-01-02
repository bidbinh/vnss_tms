"""
CRM - Contract Model
Manage contracts with customers
"""
from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime, date
from enum import Enum
from decimal import Decimal

from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped

if TYPE_CHECKING:
    from app.models.crm.account import Account
    from app.models.crm.opportunity import Opportunity
    from app.models.crm.quote import Quote
    from app.models.crm.contact import Contact


class ContractStatus(str, Enum):
    DRAFT = "DRAFT"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    ACTIVE = "ACTIVE"
    ON_HOLD = "ON_HOLD"
    EXPIRED = "EXPIRED"
    TERMINATED = "TERMINATED"
    CANCELLED = "CANCELLED"
    RENEWED = "RENEWED"


class ContractType(str, Enum):
    SERVICE = "SERVICE"
    PRODUCT = "PRODUCT"
    MAINTENANCE = "MAINTENANCE"
    SUBSCRIPTION = "SUBSCRIPTION"
    FRAMEWORK = "FRAMEWORK"
    SLA = "SLA"
    NDA = "NDA"
    OTHER = "OTHER"


class BillingFrequency(str, Enum):
    ONE_TIME = "ONE_TIME"
    WEEKLY = "WEEKLY"
    BI_WEEKLY = "BI_WEEKLY"
    MONTHLY = "MONTHLY"
    QUARTERLY = "QUARTERLY"
    SEMI_ANNUAL = "SEMI_ANNUAL"
    YEARLY = "YEARLY"


class PaymentTerms(str, Enum):
    NET_7 = "NET_7"
    NET_15 = "NET_15"
    NET_30 = "NET_30"
    NET_45 = "NET_45"
    NET_60 = "NET_60"
    NET_90 = "NET_90"
    DUE_ON_RECEIPT = "DUE_ON_RECEIPT"
    ADVANCE = "ADVANCE"


class Contract(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Contract model for managing customer contracts"""
    __tablename__ = "crm_contracts"

    # Basic Information
    code: str = Field(index=True, max_length=50)
    name: str = Field(max_length=255)
    description: Optional[str] = Field(default=None, max_length=2000)

    # Foreign Keys with proper constraints
    account_id: str = Field(foreign_key="crm_accounts.id", index=True)
    contact_id: Optional[str] = Field(default=None, foreign_key="crm_contacts.id", index=True)
    opportunity_id: Optional[str] = Field(default=None, foreign_key="crm_opportunities.id", index=True)
    quote_id: Optional[str] = Field(default=None, foreign_key="crm_quotes.id", index=True)

    # Contract Details
    contract_type: str = Field(default=ContractType.SERVICE.value, index=True)
    status: str = Field(default=ContractStatus.DRAFT.value, index=True)

    # Date Fields - using date type instead of str
    start_date: Optional[date] = Field(default=None, index=True)
    end_date: Optional[date] = Field(default=None, index=True)
    signed_date: Optional[date] = None
    effective_date: Optional[date] = None
    termination_date: Optional[date] = None

    # Value Fields - using Decimal for currency
    total_value: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)
    monthly_value: Optional[Decimal] = Field(default=None, max_digits=18, decimal_places=2)
    currency: str = Field(default="VND", max_length=3)

    # Payment & Billing
    payment_terms: Optional[str] = Field(default=None, max_length=50)
    billing_frequency: Optional[str] = Field(default=None, max_length=50)

    # Renewal Settings
    auto_renew: bool = Field(default=False)
    renewal_terms: Optional[str] = Field(default=None, max_length=500)
    renewal_notice_days: int = Field(default=30)

    # Terms & Conditions
    terms_conditions: Optional[str] = Field(default=None, max_length=10000)
    special_terms: Optional[str] = Field(default=None, max_length=2000)

    # Signatures
    signed_by: Optional[str] = Field(default=None, max_length=255)
    signed_by_title: Optional[str] = Field(default=None, max_length=100)
    customer_signed_by: Optional[str] = Field(default=None, max_length=255)
    customer_signed_date: Optional[date] = None

    # Attachments
    attachment_url: Optional[str] = Field(default=None, max_length=500)
    document_urls: Optional[str] = Field(default=None, max_length=2000)  # JSON array

    # Notes
    notes: Optional[str] = Field(default=None, max_length=2000)
    internal_notes: Optional[str] = Field(default=None, max_length=2000)

    # Audit Fields
    created_by: Optional[str] = Field(default=None, foreign_key="users.id", index=True)
    updated_by: Optional[str] = Field(default=None, foreign_key="users.id")
    approved_by: Optional[str] = Field(default=None, foreign_key="users.id")
    approved_at: Optional[datetime] = None

    # Relationships (optional, uncomment if needed)
    # account: Optional["Account"] = Relationship(back_populates="contracts")
    # contact: Optional["Contact"] = Relationship()
    # opportunity: Optional["Opportunity"] = Relationship()
    # quote: Optional["Quote"] = Relationship()

    class Config:
        use_enum_values = True


class ContractItem(BaseUUIDModel, SQLModel, table=True):
    """Contract line items"""
    __tablename__ = "crm_contract_items"

    contract_id: str = Field(foreign_key="crm_contracts.id", index=True)

    # Product/Service details
    product_id: Optional[str] = Field(default=None, index=True)
    product_code: Optional[str] = Field(default=None, max_length=50)
    product_name: str = Field(max_length=255)
    description: Optional[str] = Field(default=None, max_length=1000)

    # Quantity & Pricing
    quantity: Decimal = Field(default=Decimal("1"), max_digits=12, decimal_places=4)
    unit: Optional[str] = Field(default=None, max_length=20)
    unit_price: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)
    discount_percent: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=2)
    tax_percent: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=2)
    line_total: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)

    # Billing
    billing_start_date: Optional[date] = None
    billing_end_date: Optional[date] = None
    billing_frequency: Optional[str] = Field(default=None, max_length=50)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    class Config:
        use_enum_values = True
