"""
GPS Provider Models - Cấu hình kết nối với các nhà cung cấp GPS
Hỗ trợ nhiều provider: Bình Anh (BA GPS), Vàng GPS, Vietmap, v.v.
"""
from typing import Optional, List
from datetime import datetime
from enum import Enum
from sqlmodel import SQLModel, Field, Relationship
import uuid


class GPSProviderType(str, Enum):
    """Loại nhà cung cấp GPS"""
    BINH_ANH = "binh_anh"       # BA GPS - Bình Anh
    VIETMAP = "vietmap"         # Vietmap
    VANG_GPS = "vang_gps"       # Vàng GPS
    BINH_MINH = "binh_minh"     # Bình Minh GPS
    SMART_MOTOR = "smart_motor" # Smart Motor
    CUSTOM = "custom"           # Custom API


class GPSAuthType(str, Enum):
    """Phương thức xác thực"""
    API_KEY = "api_key"
    BASIC_AUTH = "basic_auth"
    OAUTH2 = "oauth2"
    TOKEN = "token"
    NONE = "none"


class GPSProviderStatus(str, Enum):
    """Trạng thái kết nối"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    TESTING = "testing"


class GPSProvider(SQLModel, table=True):
    """
    Cấu hình nhà cung cấp GPS
    Mỗi tenant có thể cấu hình nhiều provider
    """
    __tablename__ = "gps_providers"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    tenant_id: str = Field(index=True)

    # Provider info
    name: str = Field(description="Tên hiển thị, vd: 'GPS Bình Anh - Tài khoản chính'")
    provider_type: str = Field(default=GPSProviderType.BINH_ANH.value, description="Loại provider")
    description: Optional[str] = Field(default=None)

    # API Configuration
    api_base_url: str = Field(description="URL gốc của API, vd: https://api.bagps.vn")
    api_version: Optional[str] = Field(default="v1", description="Phiên bản API")

    # Authentication
    auth_type: str = Field(default=GPSAuthType.API_KEY.value)
    api_key: Optional[str] = Field(default=None, description="API Key (nếu dùng api_key auth)")
    username: Optional[str] = Field(default=None, description="Username (nếu dùng basic_auth)")
    password: Optional[str] = Field(default=None, description="Password (encrypted)")
    access_token: Optional[str] = Field(default=None, description="Access token (nếu dùng oauth2/token)")
    refresh_token: Optional[str] = Field(default=None)
    token_expires_at: Optional[datetime] = Field(default=None)

    # Custom headers/params
    custom_headers: Optional[str] = Field(default=None, description="JSON string of custom headers")
    custom_params: Optional[str] = Field(default=None, description="JSON string of custom params")

    # Endpoints (có thể override mặc định của từng provider)
    endpoint_vehicles: Optional[str] = Field(default=None, description="Endpoint lấy danh sách xe")
    endpoint_location: Optional[str] = Field(default=None, description="Endpoint lấy vị trí xe")
    endpoint_history: Optional[str] = Field(default=None, description="Endpoint lấy lịch sử di chuyển")
    endpoint_alerts: Optional[str] = Field(default=None, description="Endpoint lấy cảnh báo")

    # Sync settings
    sync_interval_seconds: int = Field(default=30, description="Khoảng thời gian sync (giây)")
    is_realtime: bool = Field(default=False, description="Có hỗ trợ WebSocket/realtime không")
    websocket_url: Optional[str] = Field(default=None)

    # Status
    status: str = Field(default=GPSProviderStatus.INACTIVE.value)
    last_sync_at: Optional[datetime] = Field(default=None)
    last_error: Optional[str] = Field(default=None)
    error_count: int = Field(default=0)

    # Soft delete
    is_active: bool = Field(default=True)

    # Relationships
    vehicle_mappings: List["GPSVehicleMapping"] = Relationship(back_populates="provider")


class GPSVehicleMapping(SQLModel, table=True):
    """
    Mapping giữa xe trong hệ thống và ID xe trên GPS provider
    Vì mỗi provider có ID xe riêng (IMEI, device ID, v.v.)
    """
    __tablename__ = "gps_vehicle_mappings"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    tenant_id: str = Field(index=True)

    # References
    provider_id: str = Field(foreign_key="gps_providers.id", index=True)
    vehicle_id: str = Field(foreign_key="vehicles.id", index=True)

    # GPS Provider's vehicle identifier
    gps_device_id: str = Field(description="ID thiết bị GPS trên provider (IMEI, serial, v.v.)")
    gps_vehicle_name: Optional[str] = Field(default=None, description="Tên xe trên hệ thống GPS")

    # Sync status
    is_active: bool = Field(default=True)
    last_location_at: Optional[datetime] = Field(default=None)
    last_latitude: Optional[float] = Field(default=None)
    last_longitude: Optional[float] = Field(default=None)
    last_speed: Optional[float] = Field(default=None)
    last_heading: Optional[float] = Field(default=None)
    last_address: Optional[str] = Field(default=None)

    # Relationships
    provider: Optional[GPSProvider] = Relationship(back_populates="vehicle_mappings")


class GPSSyncLog(SQLModel, table=True):
    """Log các lần đồng bộ GPS"""
    __tablename__ = "gps_sync_logs"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    tenant_id: str = Field(index=True)

    provider_id: str = Field(foreign_key="gps_providers.id", index=True)

    # Sync info
    sync_type: str = Field(description="full, incremental, realtime")
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = Field(default=None)

    # Results
    success: bool = Field(default=False)
    vehicles_synced: int = Field(default=0)
    error_message: Optional[str] = Field(default=None)
    response_time_ms: Optional[int] = Field(default=None)


# Default endpoint configurations for known providers
GPS_PROVIDER_DEFAULTS = {
    GPSProviderType.BINH_ANH.value: {
        "api_base_url": "https://gps.binhanh.vn",
        "api_version": "",
        "auth_type": GPSAuthType.API_KEY.value,  # Sử dụng CustomerCode + Key
        "endpoint_vehicles": "/api/GetOnlineVehicle",
        "endpoint_location": "/api/GetOnlineVehicle",  # Cùng endpoint với vehicles
        "endpoint_history": "/api/GetRoute",
        "endpoint_alerts": "/api/GetWarning",
        "sync_interval_seconds": 30,
        "description": "Nhập CustomerCode vào Username, API Key vào API Key",
    },
    GPSProviderType.VIETMAP.value: {
        "api_base_url": "https://api.vietmap.vn/gps",
        "api_version": "v2",
        "auth_type": GPSAuthType.API_KEY.value,
        "endpoint_vehicles": "/fleet/vehicles",
        "endpoint_location": "/fleet/vehicles/{device_id}/position",
        "endpoint_history": "/fleet/vehicles/{device_id}/trips",
        "endpoint_alerts": "/fleet/alerts",
        "sync_interval_seconds": 30,
    },
    GPSProviderType.VANG_GPS.value: {
        "api_base_url": "https://api.vanggps.vn",
        "api_version": "v1",
        "auth_type": GPSAuthType.BASIC_AUTH.value,
        "endpoint_vehicles": "/api/vehicles",
        "endpoint_location": "/api/location",
        "endpoint_history": "/api/history",
        "endpoint_alerts": "/api/warnings",
        "sync_interval_seconds": 60,
    },
    GPSProviderType.CUSTOM.value: {
        "api_base_url": "",
        "api_version": "",
        "auth_type": GPSAuthType.API_KEY.value,
        "endpoint_vehicles": "",
        "endpoint_location": "",
        "endpoint_history": "",
        "endpoint_alerts": "",
        "sync_interval_seconds": 60,
    },
}
