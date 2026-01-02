from __future__ import annotations
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field
import uuid

def uuid4_str() -> str:
    return str(uuid.uuid4())

class TimestampMixin(SQLModel):
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

class TenantScoped(SQLModel):
    tenant_id: str = Field(index=True, nullable=False)

class BaseUUIDModel(SQLModel):
    id: str = Field(default_factory=uuid4_str, primary_key=True, index=True)
