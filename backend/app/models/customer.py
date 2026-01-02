from sqlmodel import SQLModel, Field, UniqueConstraint
from .base import BaseUUIDModel, TimestampMixin, TenantScoped

class Customer(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    __tablename__ = "customers"
    __table_args__ = (
        UniqueConstraint("tenant_id", "code", name="uq_customers_tenant_code"),
    )

    code: str = Field(index=True, nullable=False)   # ADG
    name: str = Field(nullable=False)
    tax_code: str | None = Field(default=None)
    contacts_json: str | None = Field(default=None)
