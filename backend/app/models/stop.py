from __future__ import annotations
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field, UniqueConstraint
from .base import BaseUUIDModel, TimestampMixin, TenantScoped

class Stop(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    __tablename__ = "stops"
    __table_args__ = (
        UniqueConstraint("tenant_id", "shipment_id", "seq", name="uq_stops_shipment_seq"),
    )

    shipment_id: str = Field(index=True, nullable=False)
    seq: int = Field(nullable=False)  # 1..n

    location_id: str = Field(index=True, nullable=False)

    stop_type: str = Field(index=True, nullable=False)
    # gợi ý stop_type:
    # PICK_EMPTY, STUFF, GATE_IN, GATE_OUT, DELIVER, RETURN_EMPTY

    planned_time: Optional[datetime] = Field(default=None, index=True)
    actual_time: Optional[datetime] = Field(default=None, index=True)

    status: str = Field(default="Planned", index=True)  # Planned/Arrived/Done/Skipped
    note: Optional[str] = Field(default=None)
