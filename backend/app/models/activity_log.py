"""
Activity Log Model - Track all mutation operations for audit and billing
"""
from datetime import datetime
from typing import Optional
from enum import Enum
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import Text
from app.models.base import BaseUUIDModel, TenantScoped


class ActionType(str, Enum):
    """Types of actions that can be logged"""
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    BULK_CREATE = "BULK_CREATE"
    BULK_UPDATE = "BULK_UPDATE"
    BULK_DELETE = "BULK_DELETE"


class ActivityLog(BaseUUIDModel, TenantScoped, SQLModel, table=True):
    """
    Activity Log - Immutable record of all mutation operations.
    Stored permanently for audit and billing purposes.
    Only logs POST, PUT, PATCH, DELETE operations.
    """
    __tablename__ = "activity_logs"

    # User Information (denormalized for historical accuracy)
    user_id: str = Field(index=True, nullable=False)
    user_name: str = Field(nullable=False)  # Snapshot at time of action
    user_role: str = Field(nullable=False)  # Snapshot at time of action
    user_email: Optional[str] = Field(default=None)

    # Action Details
    action: str = Field(index=True, nullable=False)  # CREATE, UPDATE, DELETE
    module: str = Field(index=True, nullable=False)  # tms, hrm, crm, wms, etc.
    resource_type: str = Field(index=True, nullable=False)  # orders, drivers, vehicles
    resource_id: Optional[str] = Field(default=None, index=True)  # ID of affected resource
    resource_code: Optional[str] = Field(default=None)  # Human-readable code (e.g., order_code)

    # Request Information
    endpoint: str = Field(nullable=False)  # /api/v1/orders
    method: str = Field(nullable=False)  # POST, PUT, PATCH, DELETE

    # Request Summary (JSON - key fields for quick reference)
    # Example: {"customer_id": "xxx", "status": "ASSIGNED", "changed_fields": ["status", "driver_id"]}
    request_summary: Optional[str] = Field(default=None, sa_column=Column(Text))

    # Response Information
    response_status: int = Field(default=200)  # HTTP status code
    success: bool = Field(default=True)
    error_message: Optional[str] = Field(default=None)

    # Client Information
    ip_address: Optional[str] = Field(default=None, index=True)
    user_agent: Optional[str] = Field(default=None)

    # Cost/Billing
    cost_tokens: int = Field(default=1, index=True)  # Token cost for this action

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)

    # Optional: Link to billing transaction
    billing_transaction_id: Optional[str] = Field(default=None)
