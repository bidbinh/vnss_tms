"""
Dispatch Center Models
- VehicleGPS: Real-time GPS tracking for vehicles
- DispatchLog: AI/Manual dispatch activity logs
- DispatchAlert: System alerts (delays, exceptions, etc.)
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional
from enum import Enum

from sqlmodel import SQLModel, Field

from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class VehicleWorkStatus(str, Enum):
    """Current work status of a vehicle"""
    AVAILABLE = "available"       # Sẵn sàng nhận việc
    ON_TRIP = "on_trip"          # Đang chạy chuyến
    LOADING = "loading"          # Đang xếp hàng
    UNLOADING = "unloading"      # Đang dỡ hàng
    RETURNING = "returning"      # Đang về bãi
    MAINTENANCE = "maintenance"  # Đang bảo dưỡng
    OFF_DUTY = "off_duty"        # Nghỉ


class VehicleGPS(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Real-time GPS tracking for vehicles"""
    __tablename__ = "vehicle_gps"

    vehicle_id: str = Field(foreign_key="vehicles.id", index=True, nullable=False)
    driver_id: Optional[str] = Field(default=None, foreign_key="drivers.id", index=True)

    # GPS Data
    latitude: float = Field(nullable=False)
    longitude: float = Field(nullable=False)
    speed: Optional[float] = Field(default=None)  # km/h
    heading: Optional[float] = Field(default=None)  # 0-360 degrees

    # Address (reverse geocoded)
    address: Optional[str] = Field(default=None)

    # Work status
    work_status: str = Field(default=VehicleWorkStatus.AVAILABLE.value, index=True)

    # Current trip info
    current_trip_id: Optional[str] = Field(default=None, foreign_key="trips.id", index=True)
    current_order_id: Optional[str] = Field(default=None, foreign_key="orders.id", index=True)

    # ETA info
    eta_destination: Optional[datetime] = Field(default=None)
    destination_address: Optional[str] = Field(default=None)
    remaining_km: Optional[float] = Field(default=None)

    # Last updated
    gps_timestamp: datetime = Field(default_factory=datetime.utcnow)


class DispatchLogType(str, Enum):
    """Type of dispatch activity"""
    AUTO_ASSIGN = "auto_assign"          # AI tự động phân công
    MANUAL_ASSIGN = "manual_assign"      # Người điều phối assign
    REASSIGN = "reassign"                # Đổi tài xế/xe
    ROUTE_OPTIMIZE = "route_optimize"    # AI tối ưu lộ trình
    ALERT_CREATED = "alert_created"      # Tạo cảnh báo
    ALERT_RESOLVED = "alert_resolved"    # Xử lý xong cảnh báo
    STATUS_CHANGE = "status_change"      # Đổi trạng thái
    PRIORITY_CHANGE = "priority_change"  # Đổi độ ưu tiên
    AI_SUGGESTION = "ai_suggestion"      # AI gợi ý (chờ duyệt)
    AI_APPROVED = "ai_approved"          # Duyệt gợi ý AI
    AI_REJECTED = "ai_rejected"          # Từ chối gợi ý AI


class DispatchLog(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """AI/Manual dispatch activity logs"""
    __tablename__ = "dispatch_logs"

    log_type: str = Field(index=True, nullable=False)  # DispatchLogType

    # Related entities
    order_id: Optional[str] = Field(default=None, foreign_key="orders.id", index=True)
    trip_id: Optional[str] = Field(default=None, foreign_key="trips.id", index=True)
    vehicle_id: Optional[str] = Field(default=None, foreign_key="vehicles.id", index=True)
    driver_id: Optional[str] = Field(default=None, foreign_key="drivers.id", index=True)

    # Log content
    title: str = Field(nullable=False)  # Short title
    description: Optional[str] = Field(default=None)  # Detailed description

    # AI specific
    is_ai: bool = Field(default=False)  # True if action by AI
    ai_confidence: Optional[float] = Field(default=None)  # 0-100 confidence score
    ai_reason: Optional[str] = Field(default=None)  # AI reasoning

    # User action (for manual or approval)
    user_id: Optional[str] = Field(default=None, foreign_key="users.id", index=True)

    # Status for AI suggestions
    status: Optional[str] = Field(default=None, index=True)  # pending, approved, rejected


class AlertSeverity(str, Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class AlertType(str, Enum):
    """Type of dispatch alerts"""
    DELAY = "delay"                    # Trễ tiến độ
    ROUTE_DEVIATION = "route_deviation"  # Lệch lộ trình
    LONG_STOP = "long_stop"           # Dừng quá lâu
    SPEED_VIOLATION = "speed_violation"  # Vi phạm tốc độ
    MAINTENANCE_DUE = "maintenance_due"  # Đến hạn bảo dưỡng
    LICENSE_EXPIRY = "license_expiry"    # Bằng lái sắp hết hạn
    UNASSIGNED_ORDER = "unassigned_order"  # Đơn chưa có xe
    CAPACITY_WARNING = "capacity_warning"  # Cảnh báo tải trọng
    WEATHER = "weather"                # Thời tiết xấu
    TRAFFIC = "traffic"                # Kẹt xe
    GEOFENCE = "geofence"              # Ra/vào vùng
    DRIVER_FATIGUE = "driver_fatigue"  # Tài xế mệt mỏi
    CUSTOM = "custom"                  # Tùy chỉnh


class DispatchAlert(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Dispatch alerts - warnings, exceptions, issues"""
    __tablename__ = "dispatch_alerts"

    alert_type: str = Field(index=True, nullable=False)  # AlertType
    severity: str = Field(default=AlertSeverity.WARNING.value, index=True)

    # Related entities
    order_id: Optional[str] = Field(default=None, foreign_key="orders.id", index=True)
    trip_id: Optional[str] = Field(default=None, foreign_key="trips.id", index=True)
    vehicle_id: Optional[str] = Field(default=None, foreign_key="vehicles.id", index=True)
    driver_id: Optional[str] = Field(default=None, foreign_key="drivers.id", index=True)

    # Alert content
    title: str = Field(nullable=False)
    message: str = Field(nullable=False)

    # Status
    is_resolved: bool = Field(default=False, index=True)
    resolved_at: Optional[datetime] = Field(default=None)
    resolved_by: Optional[str] = Field(default=None, foreign_key="users.id")
    resolution_note: Optional[str] = Field(default=None)

    # Auto-generated by AI
    is_auto: bool = Field(default=True)


class AIDecision(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """AI decisions pending human approval"""
    __tablename__ = "ai_decisions"

    decision_type: str = Field(index=True, nullable=False)  # assign, reassign, route_change, etc.

    # Related entities
    order_id: Optional[str] = Field(default=None, foreign_key="orders.id", index=True)
    trip_id: Optional[str] = Field(default=None, foreign_key="trips.id", index=True)
    vehicle_id: Optional[str] = Field(default=None, foreign_key="vehicles.id", index=True)
    driver_id: Optional[str] = Field(default=None, foreign_key="drivers.id", index=True)

    # Decision content
    title: str = Field(nullable=False)
    description: str = Field(nullable=False)

    # AI info
    confidence: float = Field(nullable=False)  # 0-100
    reasoning: Optional[str] = Field(default=None)

    # Decision data (JSON)
    decision_data: Optional[str] = Field(default=None)  # JSON with proposed changes

    # Status
    status: str = Field(default="pending", index=True)  # pending, approved, rejected
    reviewed_by: Optional[str] = Field(default=None, foreign_key="users.id")
    reviewed_at: Optional[datetime] = Field(default=None)
    review_note: Optional[str] = Field(default=None)
