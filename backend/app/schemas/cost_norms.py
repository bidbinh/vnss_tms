from pydantic import BaseModel

class CostNormCreate(BaseModel):
    type: str                 # FUEL/DRIVER/TOLL/FIXED
    apply_level: str          # VEHICLE/ROUTE/TRIP
    vehicle_id: str | None = None
    route_code: str | None = None
    unit_cost: float
    unit: str                 # KM/TRIP/ROUTE
    note: str | None = None

class CostNormRead(BaseModel):
    id: str
    type: str
    apply_level: str
    vehicle_id: str | None
    route_code: str | None
    unit_cost: float
    unit: str
    note: str | None
