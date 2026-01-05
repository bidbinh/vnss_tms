from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, TYPE_CHECKING
from datetime import date
from .base import BaseUUIDModel, TimestampMixin, TenantScoped

if TYPE_CHECKING:
    from .vehicle import Vehicle


class TractorTrailerPairing(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Ghép cặp Đầu kéo - Rơ mooc (1-1)
    Một đầu kéo chỉ được ghép với 1 rơ mooc trong một khoảng thời gian
    """
    __tablename__ = "tractor_trailer_pairings"

    tractor_id: str = Field(index=True, nullable=False, foreign_key="vehicles.id")
    trailer_id: str = Field(index=True, nullable=False, foreign_key="vehicles.id")

    effective_date: date = Field(nullable=False)  # Ngày bắt đầu hiệu lực
    end_date: Optional[date] = Field(default=None)  # Ngày kết thúc (NULL = đang hiệu lực)

    notes: Optional[str] = Field(default=None)

    # Relationships
    tractor: Optional["Vehicle"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[TractorTrailerPairing.tractor_id]"}
    )
    trailer: Optional["Vehicle"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[TractorTrailerPairing.trailer_id]"}
    )
