from __future__ import annotations
from typing import Optional
from enum import Enum
from sqlmodel import SQLModel, Field
from .base import BaseUUIDModel, TimestampMixin, TenantScoped


class AddressType(str, Enum):
    OPERATING = "OPERATING"                          # Địa chỉ hoạt động
    BUSINESS_REGISTRATION = "BUSINESS_REGISTRATION"  # Địa chỉ ĐKKD
    BILLING = "BILLING"                              # Địa chỉ hoá đơn
    SHIPPING = "SHIPPING"                            # Địa chỉ giao hàng
    BRANCH = "BRANCH"                                # Chi nhánh
    WAREHOUSE = "WAREHOUSE"                          # Kho hàng


class CustomerAddress(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Địa chỉ của khách hàng - hỗ trợ nhiều loại địa chỉ:
    - OPERATING: Địa chỉ hoạt động chính
    - BUSINESS_REGISTRATION: Địa chỉ ĐKKD (có thể trùng với hoạt động)
    - BILLING: Địa chỉ hoá đơn (có thể trùng với hoạt động)
    - SHIPPING: Địa chỉ giao hàng (có thể có nhiều)
    - BRANCH: Chi nhánh
    - WAREHOUSE: Kho hàng
    """
    __tablename__ = "customer_addresses"

    # Primary FK to CRM Account (new unified approach)
    account_id: Optional[str] = Field(default=None, foreign_key="crm_accounts.id", index=True)

    # Legacy FK to TMS Customer (kept for backward compatibility during migration)
    customer_id: Optional[str] = Field(default=None, foreign_key="customers.id", index=True)

    # Address type
    address_type: str = Field(default=AddressType.SHIPPING.value, index=True)

    # Optional name/label for the address (e.g., "Kho Bình Dương", "CN Hà Nội")
    name: Optional[str] = Field(default=None, max_length=100)

    # Address details
    address: str = Field(nullable=False, max_length=500)
    ward: Optional[str] = Field(default=None, max_length=100, index=True)      # Xã/Phường
    district: Optional[str] = Field(default=None, max_length=100, index=True)  # Quận/Huyện
    city: Optional[str] = Field(default=None, max_length=100, index=True)      # Tỉnh/TP
    country: str = Field(default="Việt Nam", max_length=100)
    postal_code: Optional[str] = Field(default=None, max_length=20)

    # Contact for this address (especially for shipping addresses)
    contact_name: Optional[str] = Field(default=None, max_length=100)
    contact_phone: Optional[str] = Field(default=None, max_length=20)
    contact_email: Optional[str] = Field(default=None, max_length=100)

    # Flags
    is_default: bool = Field(default=False, index=True)  # Default shipping address
    is_same_as_operating: bool = Field(default=False)    # For BILLING/BUSINESS_REGISTRATION types

    # Notes
    notes: Optional[str] = Field(default=None)

    # Soft delete
    is_active: bool = Field(default=True, index=True)
