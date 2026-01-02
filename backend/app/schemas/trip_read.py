from __future__ import annotations
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

class TripStopRead(BaseModel):
    id: str
    trip_id: str
    seq: int
    stop_type: str
    location_id: str
    planned_at: Optional[datetime] = None
    arrived_at: Optional[datetime] = None
    departed_at: Optional[datetime] = None
    notes: Optional[str] = None

class TripReadWithStops(BaseModel):
    id: str
    shipment_id: str
    vehicle_id: Optional[str] = None
    driver_id: Optional[str] = None
    trailer_id: Optional[str] = None
    trip_type: str
    status: str
    dispatched_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    route_code: Optional[str] = None
    distance_km: Optional[float] = None

    stops: List[TripStopRead] = []
