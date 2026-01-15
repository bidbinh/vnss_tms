"""
OMS Status Log Models
"""
from datetime import datetime
from enum import Enum
from typing import Optional

from sqlmodel import Field, SQLModel, Column, JSON

from app.models.base import BaseUUIDModel, TenantScoped


class StatusLogEntityType(str, Enum):
    """Entity type for status log"""
    ORDER = "ORDER"
    SHIPMENT = "SHIPMENT"


class OMSStatusLog(BaseUUIDModel, TenantScoped, SQLModel, table=True):
    """OMS Status Log - Track status changes"""
    __tablename__ = "oms_status_logs"

    # Entity
    entity_type: str = Field(nullable=False, max_length=50, index=True)
    entity_id: str = Field(nullable=False, index=True)

    # Status Change
    from_status: Optional[str] = Field(default=None, max_length=50)
    to_status: str = Field(nullable=False, max_length=50)
    change_reason: Optional[str] = Field(default=None)

    # Metadata
    changed_by_id: Optional[str] = Field(default=None, foreign_key="users.id")
    changed_by_role: Optional[str] = Field(default=None, max_length=50)
    changed_at: datetime = Field(
        default_factory=datetime.utcnow,
        nullable=False,
        index=True
    )

    # Additional data (renamed from 'metadata' to avoid SQLAlchemy conflict)
    extra_data: dict = Field(default={}, sa_column=Column(JSON))
