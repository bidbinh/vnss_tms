from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field

from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class Trip(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    __tablename__ = "trips"

    shipment_id: Optional[str] = Field(default=None, foreign_key="shipments.id", index=True)

    vehicle_id: Optional[str] = Field(default=None, foreign_key="vehicles.id", index=True)
    driver_id: Optional[str] = Field(default=None, foreign_key="drivers.id", index=True)
    trailer_id: Optional[str] = Field(default=None, foreign_key="trailers.id", index=True)

    trip_type: Optional[str] = Field(default=None, index=True)  # IMPORT / EXPORT / ROUNDTRIP
    status: str = Field(default="assigned", index=True, nullable=False)

    assigned_by: Optional[str] = None
    assigned_at: Optional[datetime] = None
    dispatched_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    route_code: Optional[str] = Field(default=None, index=True)
    distance_km: Optional[float] = Field(default=None)
    notes: Optional[str] = None