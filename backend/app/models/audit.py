"""
Audit Models - Theo dõi hoạt động và thay đổi

Bao gồm:
- AuditLog: Log tất cả các thay đổi
- ActorSession: Quản lý phiên đăng nhập
"""
from typing import Optional
from datetime import datetime
from enum import Enum
from sqlmodel import SQLModel, Field, Column, JSON
from app.models.base import BaseUUIDModel


class AuditAction(str, Enum):
    """Loại hành động"""
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    VIEW = "VIEW"
    EXPORT = "EXPORT"
    IMPORT = "IMPORT"
    APPROVE = "APPROVE"
    REJECT = "REJECT"
    ASSIGN = "ASSIGN"
    UNASSIGN = "UNASSIGN"


class AuditLog(BaseUUIDModel, SQLModel, table=True):
    """
    Audit Log - Log hoạt động

    Ghi lại tất cả các thay đổi quan trọng trong hệ thống
    """
    __tablename__ = "audit_logs"

    # === Actor ===
    actor_id: Optional[str] = Field(default=None, index=True)  # Null = system
    actor_type: Optional[str] = Field(default=None)  # PERSON, ORGANIZATION, SYSTEM

    # === Action ===
    action: str = Field(index=True)
    resource_type: str = Field(index=True)  # order, vehicle, driver...
    resource_id: Optional[str] = Field(default=None, index=True)

    # === Context ===
    context_actor_id: Optional[str] = Field(default=None, index=True)  # Tenant context

    # === Changes ===
    old_values: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    new_values: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    changed_fields: Optional[list] = Field(default=None, sa_column=Column(JSON))

    # === Request Info ===
    ip_address: Optional[str] = Field(default=None)
    user_agent: Optional[str] = Field(default=None)
    request_id: Optional[str] = Field(default=None)

    # === Timestamp ===
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)

    # === Description ===
    description: Optional[str] = Field(default=None)

    # === Metadata ===
    extra_data: Optional[dict] = Field(default=None, sa_column=Column(JSON))


class ActorSession(BaseUUIDModel, SQLModel, table=True):
    """
    Actor Session - Phiên đăng nhập

    Quản lý các phiên đăng nhập của Actor
    """
    __tablename__ = "actor_sessions"

    actor_id: str = Field(index=True)

    # === Session Token ===
    token_hash: str = Field(index=True)  # Hash của token
    refresh_token_hash: Optional[str] = Field(default=None)

    # === Device Info ===
    device_id: Optional[str] = Field(default=None)
    device_name: Optional[str] = Field(default=None)
    device_type: Optional[str] = Field(default=None)  # MOBILE, WEB, DESKTOP
    platform: Optional[str] = Field(default=None)  # IOS, ANDROID, WEB
    app_version: Optional[str] = Field(default=None)

    # === Location ===
    ip_address: Optional[str] = Field(default=None)
    country: Optional[str] = Field(default=None)
    city: Optional[str] = Field(default=None)

    # === Status ===
    is_active: bool = Field(default=True, index=True)

    # === Timestamps ===
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_active_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    revoked_at: Optional[datetime] = Field(default=None)
    revoked_reason: Optional[str] = Field(default=None)

    # === Metadata ===
    extra_data: Optional[dict] = Field(default=None, sa_column=Column(JSON))


class LoginAttempt(BaseUUIDModel, SQLModel, table=True):
    """
    Login Attempt - Lịch sử đăng nhập

    Ghi lại các lần đăng nhập (thành công và thất bại)
    """
    __tablename__ = "login_attempts"

    # === Identity ===
    identifier: str = Field(index=True)  # email, phone, username
    actor_id: Optional[str] = Field(default=None, index=True)  # Null nếu không tìm thấy

    # === Result ===
    success: bool = Field(index=True)
    failure_reason: Optional[str] = Field(default=None)
    # INVALID_PASSWORD, ACCOUNT_LOCKED, ACCOUNT_SUSPENDED, NOT_FOUND

    # === Request Info ===
    ip_address: Optional[str] = Field(default=None, index=True)
    user_agent: Optional[str] = Field(default=None)
    device_id: Optional[str] = Field(default=None)

    # === Location ===
    country: Optional[str] = Field(default=None)
    city: Optional[str] = Field(default=None)

    # === Timestamp ===
    attempted_at: datetime = Field(default_factory=datetime.utcnow, index=True)

    # === Metadata ===
    extra_data: Optional[dict] = Field(default=None, sa_column=Column(JSON))
