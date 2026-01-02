
from datetime import datetime
from pydantic import BaseModel

class StopCreate(BaseModel):
    shipment_id: str
    seq: int
    location_id: str
    stop_type: str
    planned_time: datetime | None = None
    note: str | None = None

class StopRead(BaseModel):
    id: str
    shipment_id: str
    seq: int
    location_id: str
    stop_type: str
    planned_time: datetime | None
    actual_time: datetime | None
    status: str
