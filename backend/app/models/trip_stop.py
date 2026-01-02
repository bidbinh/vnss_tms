from __future__ import annotations

from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field, UniqueConstraint

from .base import BaseUUIDModel, TimestampMixin, TenantScoped


class TripStop(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    __tablename__ = "trip_stops"
    __table_args__ = (
        UniqueConstraint("tenant_id", "trip_id", "seq", name="uq_trip_stops_tenant_trip_seq"),
    )

    trip_id: str = Field(index=True, nullable=False)
    seq: int = Field(index=True, nullable=False)  # 1..n

    stop_type: str = Field(index=True, nullable=False)  # PORT/PICKUP/DELIVERY/DEPOT_EMPTY/...
    location_id: str = Field(index=True, nullable=False)

    planned_at: Optional[datetime] = Field(default=None, index=True)
    arrived_at: Optional[datetime] = Field(default=None)
    departed_at: Optional[datetime] = Field(default=None)

    notes: Optional[str] = Field(default=None)
