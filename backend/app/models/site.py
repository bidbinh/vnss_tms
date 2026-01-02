from __future__ import annotations
from typing import Optional
from sqlmodel import SQLModel, Field
from .base import BaseUUIDModel, TimestampMixin, TenantScoped

class Site(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Site = Địa điểm cụ thể để nhận/giao hàng
    Chứa địa chỉ chi tiết, công ty, người liên hệ
    Link với Location để tính giá
    """
    __tablename__ = "sites"

    # Link to Location (for rate calculation)
    location_id: str = Field(foreign_key="locations.id", index=True, nullable=False)

    # Company/Site info
    company_name: str = Field(nullable=False)  # Tên công ty
    code: Optional[str] = Field(default=None, index=True)  # Mã site (optional, auto-gen if null)

    # Site type classification
    site_type: str = Field(default="CUSTOMER", index=True, nullable=False)
    # PORT (Cảng), WAREHOUSE (Kho Nội bộ), CUSTOMER (Khách hàng)

    # Detailed address
    detailed_address: str = Field(nullable=False)  # Số nhà, đường, ...

    # Contact info
    contact_name: Optional[str] = Field(default=None)  # Tên người liên hệ
    contact_phone: Optional[str] = Field(default=None)  # SĐT người liên hệ

    # Additional info
    note: Optional[str] = Field(default=None)
    status: str = Field(default="ACTIVE")  # ACTIVE, INACTIVE
