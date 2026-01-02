from __future__ import annotations
from typing import Optional
from sqlmodel import SQLModel, Field, UniqueConstraint
from .base import BaseUUIDModel, TimestampMixin, TenantScoped

class Location(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Location = Địa điểm dùng để tính giá cước (KCN hoặc Phường/Xã level)
    Không chứa thông tin công ty cụ thể
    """
    __tablename__ = "locations"
    __table_args__ = (
        UniqueConstraint("tenant_id", "code", name="uq_locations_tenant_code"),
    )

    code: str = Field(index=True, nullable=False)  # VD: KCN_TB, PH_12_TB
    name: str = Field(nullable=False)  # Tên hiển thị: "KCN Tân Bình", "Phường 12"

    type: str = Field(index=True, nullable=False)
    # INDUSTRIAL_ZONE (KCN), WARD (Phường/Xã), PORT, ICD

    # Geographic info (for rate matching)
    ward: Optional[str] = Field(default=None, index=True)  # Xã/Phường
    district: Optional[str] = Field(default=None, index=True)  # Quận/Huyện
    province: Optional[str] = Field(default=None, index=True)  # Tỉnh/TP

    note: Optional[str] = Field(default=None)

    # Soft delete
    is_active: bool = Field(default=True, index=True)
