"""
Notification Models - Quản lý thông báo

Hệ thống thông báo cho tất cả các Actor
"""
from typing import Optional
from datetime import datetime
from enum import Enum
from sqlmodel import SQLModel, Field, Column, JSON
from app.models.base import BaseUUIDModel, TimestampMixin


class NotificationType(str, Enum):
    """Loại thông báo"""
    # Order related
    ORDER_CREATED = "ORDER_CREATED"
    ORDER_ASSIGNED = "ORDER_ASSIGNED"
    ORDER_ACCEPTED = "ORDER_ACCEPTED"
    ORDER_STARTED = "ORDER_STARTED"
    ORDER_COMPLETED = "ORDER_COMPLETED"
    ORDER_CANCELLED = "ORDER_CANCELLED"

    # Connection related
    CONNECTION_REQUEST = "CONNECTION_REQUEST"
    CONNECTION_ACCEPTED = "CONNECTION_ACCEPTED"
    CONNECTION_DECLINED = "CONNECTION_DECLINED"

    # Payment related
    PAYMENT_RECEIVED = "PAYMENT_RECEIVED"
    PAYMENT_DUE = "PAYMENT_DUE"
    PAYMENT_OVERDUE = "PAYMENT_OVERDUE"

    # Vehicle related
    VEHICLE_MAINTENANCE_DUE = "VEHICLE_MAINTENANCE_DUE"
    VEHICLE_DOCUMENT_EXPIRING = "VEHICLE_DOCUMENT_EXPIRING"

    # System
    SYSTEM_ANNOUNCEMENT = "SYSTEM_ANNOUNCEMENT"
    ACCOUNT_UPDATE = "ACCOUNT_UPDATE"

    # General
    INFO = "INFO"
    WARNING = "WARNING"
    ALERT = "ALERT"


class NotificationChannel(str, Enum):
    """Kênh gửi thông báo"""
    IN_APP = "IN_APP"
    PUSH = "PUSH"
    EMAIL = "EMAIL"
    SMS = "SMS"
    ZALO = "ZALO"


class NotificationPriority(str, Enum):
    """Mức độ ưu tiên"""
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    URGENT = "URGENT"


class Notification(BaseUUIDModel, TimestampMixin, SQLModel, table=True):
    """
    Notification - Thông báo

    Thông báo cho Actor (cả PERSON và ORGANIZATION)
    """
    __tablename__ = "notifications"

    # === Target ===
    recipient_actor_id: str = Field(index=True)  # Người nhận

    # === Notification Info ===
    type: str = Field(index=True)
    priority: str = Field(default=NotificationPriority.NORMAL.value)
    title: str
    message: str
    short_message: Optional[str] = Field(default=None)  # For SMS/Push

    # === Reference ===
    reference_type: Optional[str] = Field(default=None)  # order, connection, payment...
    reference_id: Optional[str] = Field(default=None, index=True)

    # === Sender ===
    sender_actor_id: Optional[str] = Field(default=None)  # Null = system

    # === Status ===
    is_read: bool = Field(default=False, index=True)
    read_at: Optional[datetime] = Field(default=None)

    # === Channels ===
    channels: Optional[list] = Field(default=None, sa_column=Column(JSON))
    # ["IN_APP", "PUSH", "EMAIL"]
    channel_statuses: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    # {"IN_APP": "SENT", "PUSH": "DELIVERED", "EMAIL": "FAILED"}

    # === Action ===
    action_url: Optional[str] = Field(default=None)  # Deep link
    action_data: Optional[dict] = Field(default=None, sa_column=Column(JSON))

    # === Expiry ===
    expires_at: Optional[datetime] = Field(default=None)

    # === Metadata ===
    extra_data: Optional[dict] = Field(default=None, sa_column=Column(JSON))


class NotificationPreference(BaseUUIDModel, TimestampMixin, SQLModel, table=True):
    """
    Notification Preference - Cài đặt thông báo

    Mỗi Actor có thể tùy chỉnh loại thông báo muốn nhận
    """
    __tablename__ = "notification_preferences"

    actor_id: str = Field(index=True)
    notification_type: str = Field(index=True)

    # === Channels ===
    in_app_enabled: bool = Field(default=True)
    push_enabled: bool = Field(default=True)
    email_enabled: bool = Field(default=False)
    sms_enabled: bool = Field(default=False)

    # === Schedule ===
    quiet_hours_start: Optional[str] = Field(default=None)  # "22:00"
    quiet_hours_end: Optional[str] = Field(default=None)    # "07:00"

    # === Metadata ===
    extra_data: Optional[dict] = Field(default=None, sa_column=Column(JSON))


class NotificationTemplate(BaseUUIDModel, TimestampMixin, SQLModel, table=True):
    """
    Notification Template - Mẫu thông báo

    Mẫu thông báo cho từng loại và kênh
    """
    __tablename__ = "notification_templates"

    notification_type: str = Field(index=True)
    channel: str = Field(index=True)  # IN_APP, PUSH, EMAIL, SMS
    language: str = Field(default="vi", index=True)

    # === Template ===
    title_template: str
    message_template: str
    short_message_template: Optional[str] = Field(default=None)

    # === For Email ===
    email_subject_template: Optional[str] = Field(default=None)
    email_html_template: Optional[str] = Field(default=None)

    # === Status ===
    is_active: bool = Field(default=True)

    # === Metadata ===
    extra_data: Optional[dict] = Field(default=None, sa_column=Column(JSON))


class PushToken(BaseUUIDModel, TimestampMixin, SQLModel, table=True):
    """
    Push Token - Token FCM/APNs

    Lưu push token của devices
    """
    __tablename__ = "push_tokens"

    actor_id: str = Field(index=True)
    device_id: str = Field(index=True)
    token: str = Field(index=True)

    # === Device Info ===
    platform: str  # IOS, ANDROID, WEB
    device_name: Optional[str] = Field(default=None)
    device_model: Optional[str] = Field(default=None)
    app_version: Optional[str] = Field(default=None)

    # === Status ===
    is_active: bool = Field(default=True)
    last_used_at: Optional[datetime] = Field(default=None)

    # === Metadata ===
    extra_data: Optional[dict] = Field(default=None, sa_column=Column(JSON))
