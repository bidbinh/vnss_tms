from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from .base import BaseUUIDModel, TimestampMixin, TenantScoped

class VehicleAssignment(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    __tablename__ = "vehicle_assignments"

    driver_id: str = Field(index=True, nullable=False)
    vehicle_id: str = Field(index=True, nullable=False)
    vehicle_type: str = Field(nullable=False)  # TRACTOR or TRAILER

    assigned_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    assigned_by: str = Field(nullable=False)  # User ID who assigned

    unassigned_at: Optional[datetime] = Field(default=None)  # NULL if still assigned
    unassigned_by: Optional[str] = Field(default=None)  # User ID who unassigned

    notes: Optional[str] = Field(default=None)  # Optional notes
