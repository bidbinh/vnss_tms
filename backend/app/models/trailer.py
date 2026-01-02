from sqlmodel import SQLModel, Field
from .base import BaseUUIDModel, TimestampMixin, TenantScoped

class Trailer(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    __tablename__ = "trailers"
    plate_no: str = Field(index=True, nullable=False)
    status: str = Field(default="ACTIVE")
