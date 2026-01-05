"""
Actor-Based Model - Core của hệ thống

Actor là thực thể trung tâm, có thể là:
- PERSON: Cá nhân (tài xế, dispatcher, owner, nhân viên...)
- ORGANIZATION: Tổ chức (công ty, tenant, đối tác...)

Mỗi Actor có thể có nhiều vai trò thông qua Relationships.
"""
from typing import Optional, List
from datetime import datetime
from enum import Enum
from sqlmodel import SQLModel, Field, Relationship, Column, JSON
from app.models.base import BaseUUIDModel, TimestampMixin
import uuid


class ActorType(str, Enum):
    """Loại Actor"""
    PERSON = "PERSON"           # Cá nhân
    ORGANIZATION = "ORGANIZATION"  # Tổ chức/Công ty


class ActorStatus(str, Enum):
    """Trạng thái Actor"""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    SUSPENDED = "SUSPENDED"
    DELETED = "DELETED"


class Actor(BaseUUIDModel, TimestampMixin, SQLModel, table=True):
    """
    Actor - Thực thể trung tâm của hệ thống

    Có thể là Person hoặc Organization.
    Tất cả các thực thể khác (Worker, Tenant, Customer, Driver...)
    sẽ được map về Actor.
    """
    __tablename__ = "actors"

    # === Basic Info ===
    type: str = Field(default=ActorType.PERSON.value, index=True)
    status: str = Field(default=ActorStatus.ACTIVE.value, index=True)

    # === Identification ===
    code: Optional[str] = Field(default=None, index=True)  # Mã định danh (tenant_code, employee_code...)
    name: str = Field(index=True)  # Tên hiển thị
    slug: Optional[str] = Field(default=None, index=True)  # URL-friendly name (username cho person, subdomain cho org)

    # === Contact Info ===
    email: Optional[str] = Field(default=None, index=True)
    phone: Optional[str] = Field(default=None, index=True)

    # === Profile ===
    avatar_url: Optional[str] = Field(default=None)
    bio: Optional[str] = Field(default=None)

    # === Address ===
    address: Optional[str] = Field(default=None)
    city: Optional[str] = Field(default=None)
    district: Optional[str] = Field(default=None)
    country: Optional[str] = Field(default="VN")

    # === Organization specific ===
    tax_code: Optional[str] = Field(default=None)  # MST
    business_type: Optional[str] = Field(default=None)  # Loại hình kinh doanh

    # === Person specific ===
    id_number: Optional[str] = Field(default=None)  # CCCD/CMND
    date_of_birth: Optional[str] = Field(default=None)
    gender: Optional[str] = Field(default=None)

    # === Auth (for persons who can login) ===
    password_hash: Optional[str] = Field(default=None)

    # === Flexible metadata ===
    extra_data: Optional[dict] = Field(default=None, sa_column=Column(JSON))

    # === Legacy references (để backward compatible) ===
    legacy_worker_id: Optional[str] = Field(default=None, index=True)
    legacy_tenant_id: Optional[str] = Field(default=None, index=True)
    legacy_driver_id: Optional[str] = Field(default=None, index=True)
    legacy_user_id: Optional[str] = Field(default=None, index=True)


class RelationshipType(str, Enum):
    """Loại quan hệ giữa các Actor"""

    # Organization relationships
    OWNS = "OWNS"           # Person owns Organization (owner)
    EMPLOYS = "EMPLOYS"     # Organization employs Person
    PARTNERS = "PARTNERS"   # Organization partners with Organization

    # Business relationships
    CUSTOMER_OF = "CUSTOMER_OF"   # Actor is customer of another Actor
    SUPPLIER_OF = "SUPPLIER_OF"   # Actor is supplier of another Actor

    # Network relationships (worker-to-worker)
    CONNECTS = "CONNECTS"   # Person connects with Person (dispatcher <-> driver)

    # Contract/Assignment relationships
    CONTRACTS = "CONTRACTS"  # Actor has contract with Actor
    ASSIGNS = "ASSIGNS"      # Actor assigns work to Actor


class RelationshipStatus(str, Enum):
    """Trạng thái quan hệ"""
    PENDING = "PENDING"      # Đang chờ chấp nhận
    ACTIVE = "ACTIVE"        # Đang hoạt động
    SUSPENDED = "SUSPENDED"  # Tạm ngưng
    TERMINATED = "TERMINATED"  # Đã kết thúc
    DECLINED = "DECLINED"    # Bị từ chối
    BLOCKED = "BLOCKED"      # Bị chặn


class RelationshipRole(str, Enum):
    """Vai trò trong quan hệ"""
    # Employment roles
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    DISPATCHER = "DISPATCHER"
    DRIVER = "DRIVER"
    ACCOUNTANT = "ACCOUNTANT"
    WAREHOUSE = "WAREHOUSE"
    EMPLOYEE = "EMPLOYEE"

    # Business roles
    CUSTOMER = "CUSTOMER"
    SUPPLIER = "SUPPLIER"
    PARTNER = "PARTNER"
    CARRIER = "CARRIER"
    FORWARDER = "FORWARDER"
    AGENT = "AGENT"


class ActorRelationship(BaseUUIDModel, TimestampMixin, SQLModel, table=True):
    """
    Quan hệ giữa các Actor

    Ví dụ:
    - Person A (EMPLOYS) -> Organization B với role=DRIVER
    - Organization A (PARTNERS) -> Organization B với role=CARRIER
    - Person A (CONNECTS) -> Person B với role=DRIVER (network)
    """
    __tablename__ = "actor_relationships"

    # === Relationship Parties ===
    actor_id: str = Field(index=True)       # Actor chủ động (employer, customer, dispatcher...)
    related_actor_id: str = Field(index=True)  # Actor bị động (employee, supplier, driver...)

    # === Relationship Definition ===
    type: str = Field(index=True)           # RelationshipType
    role: Optional[str] = Field(default=None, index=True)  # RelationshipRole
    status: str = Field(default=RelationshipStatus.PENDING.value, index=True)

    # === Permissions (for employment relationships) ===
    permissions: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    # Ví dụ: {"orders": ["view", "create"], "drivers": ["view"]}

    # === Payment Terms (for business/contract relationships) ===
    payment_terms: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    # Ví dụ: {"default_rate": 500000, "payment_cycle": "WEEKLY", "currency": "VND"}

    # === Communication ===
    message: Optional[str] = Field(default=None)  # Lời nhắn khi tạo relationship
    decline_reason: Optional[str] = Field(default=None)

    # === Validity ===
    valid_from: Optional[datetime] = Field(default=None)
    valid_until: Optional[datetime] = Field(default=None)

    # === Stats (for network relationships) ===
    total_orders_completed: int = Field(default=0)
    total_amount_paid: float = Field(default=0.0)
    total_amount_pending: float = Field(default=0.0)
    rating: Optional[float] = Field(default=None)
    total_ratings: int = Field(default=0)

    # === Metadata ===
    extra_data: Optional[dict] = Field(default=None, sa_column=Column(JSON))

    # === Legacy references ===
    legacy_worker_tenant_access_id: Optional[str] = Field(default=None)
    legacy_worker_connection_id: Optional[str] = Field(default=None)

    class Config:
        # Unique constraint: mỗi cặp actor chỉ có 1 relationship cùng type
        # Được xử lý trong migration
        pass
