from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional
from .base import BaseUUIDModel, TenantScoped

class OrderStatusLog(BaseUUIDModel, TenantScoped, SQLModel, table=True):
    """
    Order Status Change Log - Track status history with timestamps
    Used for salary calculation (delivered_date = when status changed to DELIVERED)
    """
    __tablename__ = "order_status_logs"

    order_id: str = Field(foreign_key="orders.id", index=True)

    # Status change
    from_status: Optional[str] = Field(default=None)  # Previous status (NULL for first status)
    to_status: str = Field(index=True)  # New status

    # When this status change happened
    changed_at: datetime = Field(default_factory=datetime.utcnow, index=True)

    # Who made the change
    changed_by_user_id: Optional[str] = Field(default=None, foreign_key="users.id")

    # Optional note about the change
    note: Optional[str] = Field(default=None)
