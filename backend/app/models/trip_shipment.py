from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4
from sqlmodel import SQLModel, Field


class TripShipment(SQLModel, table=True):
    __tablename__ = "trip_shipments"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    tenant_id: str = Field(index=True)

    trip_id: UUID = Field(index=True)
    shipment_id: UUID = Field(index=True)

    seq: int = Field(default=1)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
