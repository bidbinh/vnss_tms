from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


# ---------- Trip ----------
class TripCreate(BaseModel):
    shipment_id: str
    driver_id: str
    vehicle_id: str
    trip_type: Optional[str] = None
    route_code: Optional[str] = None
    distance_km: Optional[float] = None


class TripUpdate(BaseModel):
    vehicle_id: Optional[str] = None
    driver_id: Optional[str] = None
    trailer_id: Optional[str] = None

    trip_type: Optional[str] = None
    status: Optional[str] = None

    dispatched_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    route_code: Optional[str] = None
    distance_km: Optional[float] = None


class TripRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    tenant_id: str

    shipment_id: str
    vehicle_id: Optional[str] = None
    driver_id: Optional[str] = None
    trailer_id: Optional[str] = None

    trip_type: Optional[str] = None
    status: str

    dispatched_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    route_code: Optional[str] = None
    distance_km: Optional[float] = None


# ---------- Stops ----------
class TripStopIn(BaseModel):
    seq: int = Field(..., ge=1)
    stop_type: str
    location_id: str
    planned_at: Optional[datetime] = None
    notes: Optional[str] = None


class TripStopRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    tenant_id: str
    trip_id: str

    seq: int
    stop_type: str
    location_id: str

    planned_at: Optional[datetime] = None
    arrived_at: Optional[datetime] = None
    departed_at: Optional[datetime] = None
    notes: Optional[str] = None

    created_at: datetime
    updated_at: datetime


class TripAssignRequest(BaseModel):
    vehicle_id: Optional[str] = None
    driver_id: Optional[str] = None
    trailer_id: Optional[str] = None
    stops: List[TripStopIn]


class TripReadWithStops(TripRead):
    stops: List[TripStopRead] = []
