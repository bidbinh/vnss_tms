from __future__ import annotations
from typing import Optional
from enum import Enum
from sqlmodel import SQLModel, Field
from .base import BaseUUIDModel, TimestampMixin, TenantScoped


class ContactType(str, Enum):
    GENERAL = "GENERAL"           # Liên hệ chung
    BILLING = "BILLING"           # Liên hệ thanh toán
    SHIPPING = "SHIPPING"         # Liên hệ giao hàng
    SALES = "SALES"               # Liên hệ kinh doanh
    PURCHASING = "PURCHASING"     # Liên hệ mua hàng
    TECHNICAL = "TECHNICAL"       # Liên hệ kỹ thuật
    MANAGEMENT = "MANAGEMENT"     # Ban lãnh đạo


class CustomerContact(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Người liên hệ của khách hàng.
    Hỗ trợ nhiều người liên hệ với các vai trò khác nhau.
    """
    __tablename__ = "customer_contacts"

    # Primary FK to CRM Account (new unified approach)
    account_id: Optional[str] = Field(default=None, foreign_key="crm_accounts.id", index=True)

    # Legacy FK to TMS Customer (kept for backward compatibility during migration)
    customer_id: Optional[str] = Field(default=None, foreign_key="customers.id", index=True)

    # Personal info
    name: str = Field(nullable=False, max_length=100)
    title: Optional[str] = Field(default=None, max_length=100)        # Chức danh (Giám đốc, Kế toán...)
    department: Optional[str] = Field(default=None, max_length=100)   # Phòng ban

    # Contact info
    phone: Optional[str] = Field(default=None, max_length=20)
    mobile: Optional[str] = Field(default=None, max_length=20)
    email: Optional[str] = Field(default=None, max_length=100)

    # Social/Other contact methods
    zalo: Optional[str] = Field(default=None, max_length=20)

    # Contact type and flags
    contact_type: str = Field(default=ContactType.GENERAL.value, index=True)
    is_primary: bool = Field(default=False, index=True)           # Liên hệ chính
    is_decision_maker: bool = Field(default=False)                # Người quyết định

    # Notes
    notes: Optional[str] = Field(default=None)

    # Soft delete
    is_active: bool = Field(default=True, index=True)
