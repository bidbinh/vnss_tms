"""
CRM - Account Models
Accounts (Companies/Customers) and Customer Groups
"""
from typing import Optional
from sqlmodel import SQLModel, Field
from enum import Enum
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class AccountType(str, Enum):
    """Loại khách hàng"""
    CUSTOMER = "CUSTOMER"           # Khách hàng
    VENDOR = "VENDOR"               # Nhà cung cấp
    PARTNER = "PARTNER"             # Đối tác
    BOTH = "BOTH"                   # Vừa khách hàng vừa nhà cung cấp


class AccountStatus(str, Enum):
    """Trạng thái khách hàng"""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    PROSPECT = "PROSPECT"
    SUSPENDED = "SUSPENDED"
    BLACKLISTED = "BLACKLISTED"


class AccountIndustry(str, Enum):
    """Ngành nghề"""
    LOGISTICS = "LOGISTICS"
    MANUFACTURING = "MANUFACTURING"
    RETAIL = "RETAIL"
    WHOLESALE = "WHOLESALE"
    ECOMMERCE = "ECOMMERCE"
    IMPORT_EXPORT = "IMPORT_EXPORT"
    FOOD_BEVERAGE = "FOOD_BEVERAGE"
    CONSTRUCTION = "CONSTRUCTION"
    AGRICULTURE = "AGRICULTURE"
    TECHNOLOGY = "TECHNOLOGY"
    HEALTHCARE = "HEALTHCARE"
    OTHER = "OTHER"


class CustomerGroup(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Nhóm khách hàng"""
    __tablename__ = "crm_customer_groups"

    code: str = Field(index=True, nullable=False)  # VIP, GOLD, SILVER
    name: str = Field(nullable=False)
    description: Optional[str] = Field(default=None)

    # Pricing
    discount_percent: float = Field(default=0)  # % giảm giá mặc định
    credit_limit_default: float = Field(default=0)  # Hạn mức tín dụng mặc định
    payment_terms_default: Optional[str] = Field(default=None)  # Điều khoản thanh toán mặc định
    priority: int = Field(default=0)  # Độ ưu tiên

    is_active: bool = Field(default=True)
    created_by: Optional[str] = Field(default=None)


class Account(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Khách hàng / Đối tác"""
    __tablename__ = "crm_accounts"

    # Basic Info
    code: str = Field(index=True, nullable=False)  # KH001, NCC001
    name: str = Field(nullable=False, index=True)

    account_type: str = Field(default=AccountType.CUSTOMER.value, index=True)
    status: str = Field(default=AccountStatus.ACTIVE.value, index=True)
    industry: Optional[str] = Field(default=None)

    # Customer Group
    customer_group_id: Optional[str] = Field(default=None, foreign_key="crm_customer_groups.id")

    # Legal Info
    tax_code: Optional[str] = Field(default=None, index=True)  # MST
    business_license: Optional[str] = Field(default=None)

    # Contact Info
    phone: Optional[str] = Field(default=None)
    fax: Optional[str] = Field(default=None)
    email: Optional[str] = Field(default=None)
    website: Optional[str] = Field(default=None)

    # Address
    address: Optional[str] = Field(default=None)
    city: Optional[str] = Field(default=None)
    province: Optional[str] = Field(default=None)
    country: str = Field(default="VN")
    postal_code: Optional[str] = Field(default=None)

    # Financial
    payment_terms: Optional[str] = Field(default=None)  # COD, NET30, NET60
    credit_limit: float = Field(default=0)
    credit_days: int = Field(default=30)
    currency: str = Field(default="VND")
    bank_name: Optional[str] = Field(default=None)
    bank_branch: Optional[str] = Field(default=None)
    bank_account: Optional[str] = Field(default=None)
    bank_account_name: Optional[str] = Field(default=None)

    # Business Details for Logistics
    default_pickup_address: Optional[str] = Field(default=None)
    default_delivery_address: Optional[str] = Field(default=None)
    commodity_types: Optional[str] = Field(default=None)  # JSON array
    volume_category: Optional[str] = Field(default=None)  # Phân loại theo khối lượng
    service_preferences: Optional[str] = Field(default=None)  # Sở thích dịch vụ

    # Sales
    assigned_to: Optional[str] = Field(default=None)  # Nhân viên phụ trách
    source: Optional[str] = Field(default=None)  # Nguồn khách hàng

    # TMS Integration
    tms_customer_id: Optional[str] = Field(default=None, index=True)  # Link to TMS customers table
    synced_to_tms: bool = Field(default=False)  # Whether this account has been synced to TMS
    synced_at: Optional[str] = Field(default=None)  # Last sync timestamp

    # Notes
    notes: Optional[str] = Field(default=None)

    # Audit
    created_by: Optional[str] = Field(default=None)
