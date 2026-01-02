from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field, UniqueConstraint

from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class Shipment(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    __tablename__ = "shipments"
    __table_args__ = (
        UniqueConstraint("tenant_id", "order_id", "booking_no", name="uq_shipments_order_booking"),
    )

    order_id: str = Field(foreign_key="orders.id", index=True, nullable=False)

    booking_no: Optional[str] = Field(default=None, index=True)
    bl_no: Optional[str] = Field(default=None, index=True)

    vessel: Optional[str] = Field(default=None)
    etd: Optional[datetime] = Field(default=None, index=True)
    eta: Optional[datetime] = Field(default=None, index=True)

    free_time_days: Optional[int] = Field(default=None)
    from_port: bool = Field(default=False, index=True)
    requires_empty_return: bool = Field(default=False)
    status: str = Field(default="pending", index=True, nullable=False)
    notes: Optional[str] = Field(default=None)
