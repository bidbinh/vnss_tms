from typing import Optional
from pydantic import BaseModel

class LocationBase(BaseModel):
    type: str
    code: Optional[str] = None
    name: str

    address: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    ward: Optional[str] = None
    country: Optional[str] = "VN"
    lat: Optional[float] = None
    lng: Optional[float] = None
    notes: Optional[str] = None

class LocationCreate(LocationBase):
    pass

class LocationUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    type: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    ward: Optional[str] = None
    country: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    notes: Optional[str] = None

class LocationRead(LocationBase):
    id: str
    tenant_id: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
from typing import Optional
from sqlmodel import SQLModel


class LocationCreate(SQLModel):
    code: Optional[str] = None
    name: str
    type: str
    address: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    ward: Optional[str] = None
    country: Optional[str] = "VN"
    lat: Optional[float] = None
    lng: Optional[float] = None
    notes: Optional[str] = None
class LocationCreate(BaseModel):
    code: Optional[str] = None
    name: str
    type: str
    address: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    ward: Optional[str] = None
    country: Optional[str] = "VN"
    lat: Optional[float] = None
    lng: Optional[float] = None
    notes: Optional[str] = None

class LocationRead(LocationCreate):
    id: str
    tenant_id: str
