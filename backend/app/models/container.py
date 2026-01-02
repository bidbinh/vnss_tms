from __future__ import annotations
from typing import Optional
from sqlmodel import SQLModel, Field, UniqueConstraint
from .base import BaseUUIDModel, TimestampMixin, TenantScoped

class Container(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    __tablename__ = "containers"
    __table_args__ = (
        UniqueConstraint("tenant_id", "container_no", name="uq_containers_tenant_container_no"),
    )

    shipment_id: str = Field(index=True, nullable=False)

    container_no: str = Field(index=True, nullable=False)  # ABCD1234567
    size: str = Field(default="40", index=True)            # 20/40/45
    type: str = Field(default="DC", index=True)            # DC/HC/OT...
    seal_no: Optional[str] = Field(default=None, index=True)
    status: str = Field(default="Active", index=True)
