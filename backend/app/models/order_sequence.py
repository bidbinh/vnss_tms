from __future__ import annotations

from sqlmodel import SQLModel, Field, UniqueConstraint
from .base import BaseUUIDModel, TimestampMixin, TenantScoped

class OrderSequence(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    __tablename__ = "order_sequences"
    __table_args__ = (
        UniqueConstraint("tenant_id", "customer_code", "yymm", name="uq_order_seq_key"),
    )

    customer_code: str = Field(index=True, nullable=False)  # ADG
    yymm: str = Field(index=True, nullable=False)           # 2512
    last_seq: int = Field(default=0, nullable=False)
