from typing import Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime


class ShipmentCreate(BaseModel):
    order_id: str
    booking_no: Optional[str] = None
    bl_no: Optional[str] = None
    vessel: Optional[str] = None
    from_port: Optional[bool] = False
    requires_empty_return: Optional[bool] = False
    etd: Optional[datetime] = None
    eta: Optional[datetime] = None
    free_time_days: Optional[int] = None
    notes: Optional[str] = None


class ShipmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    order_id: str
    booking_no: Optional[str] = None
    bl_no: Optional[str] = None
    vessel: Optional[str] = None
    from_port: bool
    requires_empty_return: bool
    etd: Optional[datetime] = None
    eta: Optional[datetime] = None
    free_time_days: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None
