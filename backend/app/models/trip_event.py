from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field

class TripEvent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    trip_id: str = Field(index=True, foreign_key="trip.id")
    event_type: str                     # ví dụ: CHECKIN_PICKUP, DEPART_PICKUP, ARRIVE_DROPOFF, POD
    ts: datetime = Field(default_factory=datetime.utcnow)
    lat: Optional[float] = None
    lng: Optional[float] = None
    note: Optional[str] = None
