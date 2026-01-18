from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field, UniqueConstraint

from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class OrderStatus(str):
    NEW = "NEW"
    REJECTED = "REJECTED"
    ACCEPTED = "ACCEPTED"
    ASSIGNED = "ASSIGNED"
    IN_TRANSIT = "IN_TRANSIT"
    DELIVERED = "DELIVERED"
    EMPTY_RETURN = "EMPTY_RETURN"  # Trả container rỗng (cho hàng cảng)
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class Order(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    __tablename__ = "orders"
    __table_args__ = (
        UniqueConstraint("tenant_id", "order_code", name="uq_orders_tenant_order_code"),
    )

    # Core identification
    order_code: str = Field(index=True, nullable=False)
    customer_id: str = Field(foreign_key="customers.id", index=True, nullable=False)
    created_by_user_id: Optional[str] = Field(default=None, index=True, nullable=True)

    # Status workflow
    status: str = Field(default=OrderStatus.NEW, index=True, nullable=False)
    priority: str = Field(default="NORMAL", index=True, nullable=False)  # URGENT, HIGH, NORMAL, LOW
    order_date: datetime = Field(default_factory=datetime.utcnow, index=True, nullable=False)
    customer_requested_date: Optional[datetime] = Field(default=None, nullable=True)  # Ngày KH yêu cầu giao hàng

    # Pickup & Delivery (text-based initially)
    pickup_text: Optional[str] = Field(default=None, nullable=True)
    delivery_text: Optional[str] = Field(default=None, nullable=True)

    # Site-based pickup & delivery (preferred)
    pickup_site_id: Optional[str] = Field(default=None, foreign_key="sites.id", index=True, nullable=True)
    delivery_site_id: Optional[str] = Field(default=None, foreign_key="sites.id", index=True, nullable=True)

    # Legacy location IDs (for backward compatibility)
    pickup_location_id: Optional[str] = Field(default=None, index=True, nullable=True)
    delivery_location_id: Optional[str] = Field(default=None, index=True, nullable=True)

    # Container & cargo details
    equipment: Optional[str] = Field(default=None, nullable=True)  # "20", "40", "45"
    qty: int = Field(default=1, nullable=False)
    container_code: Optional[str] = Field(default=None, nullable=True)
    cargo_note: Optional[str] = Field(default=None, nullable=True)
    empty_return_note: Optional[str] = Field(default=None, nullable=True)

    # Documents (Chứng từ)
    container_receipt: Optional[str] = Field(default=None, nullable=True)  # Phiếu giao nhận container
    delivery_order_no: Optional[str] = Field(default=None, nullable=True)  # DO - Delivery Order
    handover_report: Optional[str] = Field(default=None, nullable=True)  # Biên bản bàn giao hàng
    seal_no: Optional[str] = Field(default=None, nullable=True)  # Số seal

    # Empty return port (Site where container is returned)
    port_site_id: Optional[str] = Field(default=None, foreign_key="sites.id", index=True, nullable=True)

    # Distance for salary calculation
    distance_km: Optional[int] = Field(default=None, nullable=True)  # Số km hành trình

    # Revenue
    freight_charge: Optional[int] = Field(default=None, nullable=True)  # Cước vận chuyển (VND)

    # Salary calculation flags (editable in Driver Salary Management)
    is_flatbed: Optional[bool] = Field(default=None, nullable=True)  # Mooc sàn (override equipment check)
    is_internal_cargo: Optional[bool] = Field(default=None, nullable=True)  # Hàng xá (override cargo_note check)
    is_holiday: Optional[bool] = Field(default=None, nullable=True)  # Ngày lễ (override auto holiday check)

    # Assignment
    dispatcher_id: Optional[str] = Field(default=None, index=True, nullable=True)
    driver_id: Optional[str] = Field(default=None, index=True, nullable=True)

    # ETAs (estimated time of arrival)
    eta_pickup_at: Optional[datetime] = Field(default=None, nullable=True)
    eta_delivery_at: Optional[datetime] = Field(default=None, nullable=True)
    original_eta_pickup_at: Optional[datetime] = Field(default=None, nullable=True)  # Original ETA (for delay comparison)
    original_eta_delivery_at: Optional[datetime] = Field(default=None, nullable=True)  # Original ETA (for delay comparison)

    # Actual times (from GPS detection or manual entry)
    actual_pickup_at: Optional[datetime] = Field(default=None, nullable=True)  # Actual pickup time
    actual_delivery_at: Optional[datetime] = Field(default=None, nullable=True)  # Actual delivery time
    arrived_at_pickup_at: Optional[datetime] = Field(default=None, nullable=True)  # GPS detected arrival at pickup
    arrived_at_delivery_at: Optional[datetime] = Field(default=None, nullable=True)  # GPS detected arrival at delivery

    # Cargo weight (for capacity check)
    weight_kg: Optional[float] = Field(default=None, nullable=True)  # Weight in kg

    # Rejection
    reject_reason: Optional[str] = Field(default=None, nullable=True)

    # Legacy branch support
    branch_id: Optional[str] = Field(default=None, index=True, nullable=True)
