from __future__ import annotations

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel


class TripShipmentRead(BaseModel):
    id: UUID
    tenant_id: str
    trip_id: UUID
    shipment_id: UUID
    seq: int
    created_at: datetime
    updated_at: datetime


class TripShipmentItem(BaseModel):
    shipment_id: UUID
    seq: int = 1


class TripShipmentsSetRequest(BaseModel):
    items: List[TripShipmentItem]
