from __future__ import annotations

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class TripStopIn(BaseModel):
    seq: int = Field(..., ge=1)
    stop_type: str
    location_id: str

    planned_at: Optional[datetime] = None
    notes: Optional[str] = None


class TripAssignRequest(BaseModel):
    vehicle_id: Optional[str] = None
    driver_id: Optional[str] = None
    trailer_id: Optional[str] = None

    # linh hoạt số stop
    stops: List[TripStopIn]
