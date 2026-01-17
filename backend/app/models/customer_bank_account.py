from __future__ import annotations
from typing import Optional
from sqlmodel import SQLModel, Field
from .base import BaseUUIDModel, TimestampMixin, TenantScoped


class CustomerBankAccount(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Tài khoản ngân hàng của khách hàng.
    Hỗ trợ nhiều tài khoản ngân hàng với một tài khoản chính (is_primary).
    Bank info tương thích với BankSelect component (45 ngân hàng VN).
    """
    __tablename__ = "customer_bank_accounts"

    # Primary FK to CRM Account (new unified approach)
    account_id: Optional[str] = Field(default=None, foreign_key="crm_accounts.id", index=True)

    # Legacy FK to TMS Customer (kept for backward compatibility during migration)
    customer_id: Optional[str] = Field(default=None, foreign_key="customers.id", index=True)

    # Bank info - matches VIETNAM_BANKS in BankSelect.tsx
    bank_name: str = Field(nullable=False, max_length=200)       # Tên đầy đủ (e.g., "Ngân hàng TMCP Ngoại Thương Việt Nam")
    bank_code: Optional[str] = Field(default=None, max_length=20)  # Short code (e.g., VCB, TCB)
    bank_bin: Optional[str] = Field(default=None, max_length=20)   # BIN code for VietQR
    bank_branch: Optional[str] = Field(default=None, max_length=200)  # Chi nhánh

    # Account info
    account_number: str = Field(nullable=False, max_length=50)
    account_holder: str = Field(nullable=False, max_length=100)  # Tên chủ tài khoản

    # Flags
    is_primary: bool = Field(default=False, index=True)  # Tài khoản chính

    # Notes
    notes: Optional[str] = Field(default=None)

    # Soft delete
    is_active: bool = Field(default=True, index=True)
