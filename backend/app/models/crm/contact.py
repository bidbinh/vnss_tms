"""
CRM - Contact Models
Contacts (People) associated with Accounts
"""
from typing import Optional
from sqlmodel import SQLModel, Field
from enum import Enum
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class ContactStatus(str, Enum):
    """Trạng thái liên hệ"""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class Contact(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Người liên hệ"""
    __tablename__ = "crm_contacts"

    # Associated Account
    account_id: str = Field(foreign_key="crm_accounts.id", nullable=False, index=True)

    # Basic Info
    first_name: str = Field(nullable=False)
    last_name: Optional[str] = Field(default=None)
    full_name: Optional[str] = Field(default=None, index=True)  # Computed

    # Role
    title: Optional[str] = Field(default=None)  # Chức danh: Giám đốc, Kế toán...
    department: Optional[str] = Field(default=None)  # Phòng ban

    # Contact Info
    email: Optional[str] = Field(default=None, index=True)
    phone: Optional[str] = Field(default=None)
    mobile: Optional[str] = Field(default=None)
    fax: Optional[str] = Field(default=None)

    # Address (if different from account)
    address: Optional[str] = Field(default=None)
    city: Optional[str] = Field(default=None)

    # Role in decision making
    is_primary: bool = Field(default=False)  # Liên hệ chính
    is_billing_contact: bool = Field(default=False)  # Liên hệ thanh toán
    is_shipping_contact: bool = Field(default=False)  # Liên hệ giao hàng
    decision_maker: bool = Field(default=False)  # Người quyết định

    # Status
    status: str = Field(default=ContactStatus.ACTIVE.value)

    # Social
    linkedin: Optional[str] = Field(default=None)
    zalo: Optional[str] = Field(default=None)

    # Preferences
    preferred_contact_method: Optional[str] = Field(default=None)
    preferred_language: Optional[str] = Field(default=None)

    # Birthday for relationship building
    birthday: Optional[str] = Field(default=None)

    # Notes
    notes: Optional[str] = Field(default=None)

    # Audit
    created_by: Optional[str] = Field(default=None)
