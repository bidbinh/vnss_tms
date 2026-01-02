from sqlmodel import SQLModel, Field
from .base import BaseUUIDModel, TimestampMixin, TenantScoped

class RateCustomer(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Junction table linking rates to specific customers"""
    __tablename__ = "rate_customers"

    rate_id: str = Field(foreign_key="rates.id", index=True, nullable=False)
    customer_id: str = Field(foreign_key="customers.id", index=True, nullable=False)
