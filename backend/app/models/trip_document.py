from __future__ import annotations
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field, UniqueConstraint
from .base import BaseUUIDModel, TimestampMixin, TenantScoped

class TripDocument(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    __tablename__ = "trip_documents"
    __table_args__ = (
        UniqueConstraint("tenant_id", "trip_id", "doc_type", "file_path", name="uq_trip_doc_file"),
    )

    trip_id: str = Field(index=True, nullable=False)

    doc_type: str = Field(index=True, nullable=False)   # "EIR" | "POD"
    original_name: str = Field(nullable=False)
    content_type: str = Field(nullable=False)
    size_bytes: int = Field(nullable=False)

    file_path: str = Field(nullable=False)              # path tương đối trong storage
    uploaded_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    note: Optional[str] = Field(default=None)
