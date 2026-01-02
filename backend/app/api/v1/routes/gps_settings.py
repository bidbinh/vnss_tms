"""
GPS Settings API - Quản lý cấu hình kết nối GPS Provider
"""
from typing import List, Optional
from datetime import datetime
import json
import httpx

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlmodel import Session, select
from pydantic import BaseModel

from app.db.session import get_session
from app.models import (
    Vehicle, User,
    GPSProvider, GPSProviderType, GPSAuthType, GPSProviderStatus,
    GPSVehicleMapping, GPSSyncLog,
    GPS_PROVIDER_DEFAULTS,
)
from app.core.security import get_current_user
from app.services.gps_sync import GPSSyncService


router = APIRouter(prefix="/gps-settings", tags=["GPS Settings"])


# ============================================================================
# SCHEMAS
# ============================================================================

class GPSProviderCreate(BaseModel):
    name: str
    provider_type: str = GPSProviderType.BINH_ANH.value
    description: Optional[str] = None
    api_base_url: str
    api_version: Optional[str] = "v1"
    auth_type: str = GPSAuthType.API_KEY.value
    api_key: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    access_token: Optional[str] = None
    custom_headers: Optional[dict] = None
    custom_params: Optional[dict] = None
    endpoint_vehicles: Optional[str] = None
    endpoint_location: Optional[str] = None
    endpoint_history: Optional[str] = None
    endpoint_alerts: Optional[str] = None
    sync_interval_seconds: int = 30
    is_realtime: bool = False
    websocket_url: Optional[str] = None


class GPSProviderUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    api_base_url: Optional[str] = None
    api_version: Optional[str] = None
    auth_type: Optional[str] = None
    api_key: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    access_token: Optional[str] = None
    custom_headers: Optional[dict] = None
    custom_params: Optional[dict] = None
    endpoint_vehicles: Optional[str] = None
    endpoint_location: Optional[str] = None
    endpoint_history: Optional[str] = None
    endpoint_alerts: Optional[str] = None
    sync_interval_seconds: Optional[int] = None
    is_realtime: Optional[bool] = None
    websocket_url: Optional[str] = None
    status: Optional[str] = None


class GPSVehicleMappingCreate(BaseModel):
    vehicle_id: str
    gps_device_id: str
    gps_vehicle_name: Optional[str] = None


class GPSVehicleMappingUpdate(BaseModel):
    gps_device_id: Optional[str] = None
    gps_vehicle_name: Optional[str] = None
    is_active: Optional[bool] = None


class GPSProviderResponse(BaseModel):
    id: str
    name: str
    provider_type: str
    description: Optional[str]
    api_base_url: str
    api_version: Optional[str]
    auth_type: str
    status: str
    sync_interval_seconds: int
    is_realtime: bool
    last_sync_at: Optional[datetime]
    last_error: Optional[str]
    error_count: int
    is_active: bool
    created_at: datetime
    vehicle_count: int = 0


class GPSVehicleMappingResponse(BaseModel):
    id: str
    provider_id: str
    vehicle_id: str
    gps_device_id: str
    gps_vehicle_name: Optional[str]
    is_active: bool
    last_location_at: Optional[datetime]
    last_latitude: Optional[float]
    last_longitude: Optional[float]
    last_speed: Optional[float]
    # Vehicle info
    plate_number: Optional[str] = None
    vehicle_type: Optional[str] = None


# ============================================================================
# GPS PROVIDER ENDPOINTS
# ============================================================================

@router.get("/provider-types")
def get_provider_types():
    """Lấy danh sách loại GPS provider và cấu hình mặc định"""
    return {
        "types": [
            {"value": t.value, "label": t.name.replace("_", " ").title()}
            for t in GPSProviderType
        ],
        "auth_types": [
            {"value": a.value, "label": a.name.replace("_", " ").title()}
            for a in GPSAuthType
        ],
        "defaults": GPS_PROVIDER_DEFAULTS,
    }


@router.get("/providers", response_model=List[GPSProviderResponse])
def list_providers(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Lấy danh sách GPS providers của tenant"""
    tenant_id = str(current_user.tenant_id)

    providers = session.exec(
        select(GPSProvider)
        .where(GPSProvider.tenant_id == tenant_id)
        .where(GPSProvider.is_active == True)
        .order_by(GPSProvider.created_at.desc())
    ).all()

    result = []
    for p in providers:
        # Count vehicles mapped to this provider
        vehicle_count = session.exec(
            select(GPSVehicleMapping)
            .where(GPSVehicleMapping.provider_id == p.id)
            .where(GPSVehicleMapping.is_active == True)
        ).all()

        result.append(GPSProviderResponse(
            id=p.id,
            name=p.name,
            provider_type=p.provider_type,
            description=p.description,
            api_base_url=p.api_base_url,
            api_version=p.api_version,
            auth_type=p.auth_type,
            status=p.status,
            sync_interval_seconds=p.sync_interval_seconds,
            is_realtime=p.is_realtime,
            last_sync_at=p.last_sync_at,
            last_error=p.last_error,
            error_count=p.error_count,
            is_active=p.is_active,
            created_at=p.created_at,
            vehicle_count=len(vehicle_count),
        ))

    return result


@router.post("/providers", response_model=GPSProviderResponse)
def create_provider(
    payload: GPSProviderCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Tạo GPS provider mới"""
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Chỉ ADMIN hoặc DISPATCHER được tạo GPS provider")

    tenant_id = str(current_user.tenant_id)

    provider = GPSProvider(
        tenant_id=tenant_id,
        name=payload.name,
        provider_type=payload.provider_type,
        description=payload.description,
        api_base_url=payload.api_base_url,
        api_version=payload.api_version,
        auth_type=payload.auth_type,
        api_key=payload.api_key,
        username=payload.username,
        password=payload.password,  # TODO: Encrypt password
        access_token=payload.access_token,
        custom_headers=json.dumps(payload.custom_headers) if payload.custom_headers else None,
        custom_params=json.dumps(payload.custom_params) if payload.custom_params else None,
        endpoint_vehicles=payload.endpoint_vehicles,
        endpoint_location=payload.endpoint_location,
        endpoint_history=payload.endpoint_history,
        endpoint_alerts=payload.endpoint_alerts,
        sync_interval_seconds=payload.sync_interval_seconds,
        is_realtime=payload.is_realtime,
        websocket_url=payload.websocket_url,
        status=GPSProviderStatus.INACTIVE.value,
    )

    session.add(provider)
    session.commit()
    session.refresh(provider)

    return GPSProviderResponse(
        id=provider.id,
        name=provider.name,
        provider_type=provider.provider_type,
        description=provider.description,
        api_base_url=provider.api_base_url,
        api_version=provider.api_version,
        auth_type=provider.auth_type,
        status=provider.status,
        sync_interval_seconds=provider.sync_interval_seconds,
        is_realtime=provider.is_realtime,
        last_sync_at=provider.last_sync_at,
        last_error=provider.last_error,
        error_count=provider.error_count,
        is_active=provider.is_active,
        created_at=provider.created_at,
        vehicle_count=0,
    )


@router.get("/providers/{provider_id}")
def get_provider(
    provider_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Lấy chi tiết GPS provider (bao gồm cả thông tin nhạy cảm cho ADMIN)"""
    tenant_id = str(current_user.tenant_id)

    provider = session.get(GPSProvider, provider_id)
    if not provider or provider.tenant_id != tenant_id:
        raise HTTPException(404, "Provider không tồn tại")

    result = {
        "id": provider.id,
        "name": provider.name,
        "provider_type": provider.provider_type,
        "description": provider.description,
        "api_base_url": provider.api_base_url,
        "api_version": provider.api_version,
        "auth_type": provider.auth_type,
        "endpoint_vehicles": provider.endpoint_vehicles,
        "endpoint_location": provider.endpoint_location,
        "endpoint_history": provider.endpoint_history,
        "endpoint_alerts": provider.endpoint_alerts,
        "sync_interval_seconds": provider.sync_interval_seconds,
        "is_realtime": provider.is_realtime,
        "websocket_url": provider.websocket_url,
        "status": provider.status,
        "last_sync_at": provider.last_sync_at,
        "last_error": provider.last_error,
        "error_count": provider.error_count,
        "is_active": provider.is_active,
        "created_at": provider.created_at,
        "custom_headers": json.loads(provider.custom_headers) if provider.custom_headers else None,
        "custom_params": json.loads(provider.custom_params) if provider.custom_params else None,
    }

    # Only show sensitive data to ADMIN
    if current_user.role == "ADMIN":
        result["api_key"] = provider.api_key
        result["username"] = provider.username
        result["password"] = "********" if provider.password else None
        result["access_token"] = provider.access_token[:20] + "..." if provider.access_token else None

    return result


@router.put("/providers/{provider_id}")
def update_provider(
    provider_id: str,
    payload: GPSProviderUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Cập nhật GPS provider"""
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Chỉ ADMIN hoặc DISPATCHER được cập nhật GPS provider")

    tenant_id = str(current_user.tenant_id)

    provider = session.get(GPSProvider, provider_id)
    if not provider or provider.tenant_id != tenant_id:
        raise HTTPException(404, "Provider không tồn tại")

    update_data = payload.model_dump(exclude_unset=True)

    if "custom_headers" in update_data and update_data["custom_headers"]:
        update_data["custom_headers"] = json.dumps(update_data["custom_headers"])
    if "custom_params" in update_data and update_data["custom_params"]:
        update_data["custom_params"] = json.dumps(update_data["custom_params"])

    for key, value in update_data.items():
        setattr(provider, key, value)

    provider.updated_at = datetime.utcnow()
    session.add(provider)
    session.commit()
    session.refresh(provider)

    return {"success": True, "message": "Cập nhật thành công"}


@router.delete("/providers/{provider_id}")
def delete_provider(
    provider_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Xóa GPS provider (soft delete)"""
    if current_user.role != "ADMIN":
        raise HTTPException(403, "Chỉ ADMIN được xóa GPS provider")

    tenant_id = str(current_user.tenant_id)

    provider = session.get(GPSProvider, provider_id)
    if not provider or provider.tenant_id != tenant_id:
        raise HTTPException(404, "Provider không tồn tại")

    provider.is_active = False
    provider.updated_at = datetime.utcnow()
    session.add(provider)
    session.commit()

    return {"success": True, "message": "Đã xóa provider"}


@router.post("/providers/{provider_id}/test")
async def test_provider_connection(
    provider_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Test kết nối đến GPS provider"""
    tenant_id = str(current_user.tenant_id)

    provider = session.get(GPSProvider, provider_id)
    if not provider or provider.tenant_id != tenant_id:
        raise HTTPException(404, "Provider không tồn tại")

    # Sử dụng GPSSyncService để test connection
    service = GPSSyncService(session)
    result = await service.test_connection(provider)

    # Update provider status based on result
    if result.get("success"):
        provider.status = GPSProviderStatus.ACTIVE.value
        provider.last_error = None
        provider.error_count = 0
    else:
        provider.status = GPSProviderStatus.ERROR.value
        provider.last_error = result.get("message") or result.get("error")
        provider.error_count = (provider.error_count or 0) + 1

    session.add(provider)
    session.commit()

    return result


@router.post("/providers/{provider_id}/sync")
async def sync_provider(
    provider_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Đồng bộ dữ liệu GPS từ provider"""
    tenant_id = str(current_user.tenant_id)

    provider = session.get(GPSProvider, provider_id)
    if not provider or provider.tenant_id != tenant_id:
        raise HTTPException(404, "Provider không tồn tại")

    # Sử dụng GPSSyncService để sync
    service = GPSSyncService(session)
    result = await service.sync_provider(provider)

    return {
        "success": result.get("success", False),
        "message": "Đồng bộ hoàn tất" if result.get("success") else result.get("error", "Lỗi đồng bộ"),
        "vehicles_synced": result.get("vehicles_synced", 0),
        "response_time_ms": result.get("response_time_ms"),
    }


# ============================================================================
# VEHICLE MAPPING ENDPOINTS
# ============================================================================

@router.get("/providers/{provider_id}/vehicles", response_model=List[GPSVehicleMappingResponse])
def list_vehicle_mappings(
    provider_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Lấy danh sách xe đã mapping với provider"""
    tenant_id = str(current_user.tenant_id)

    provider = session.get(GPSProvider, provider_id)
    if not provider or provider.tenant_id != tenant_id:
        raise HTTPException(404, "Provider không tồn tại")

    mappings = session.exec(
        select(GPSVehicleMapping)
        .where(GPSVehicleMapping.provider_id == provider_id)
        .order_by(GPSVehicleMapping.created_at.desc())
    ).all()

    result = []
    for m in mappings:
        vehicle = session.get(Vehicle, m.vehicle_id)
        result.append(GPSVehicleMappingResponse(
            id=m.id,
            provider_id=m.provider_id,
            vehicle_id=m.vehicle_id,
            gps_device_id=m.gps_device_id,
            gps_vehicle_name=m.gps_vehicle_name,
            is_active=m.is_active,
            last_location_at=m.last_location_at,
            last_latitude=m.last_latitude,
            last_longitude=m.last_longitude,
            last_speed=m.last_speed,
            plate_number=vehicle.plate_no if vehicle else None,
            vehicle_type=vehicle.type if vehicle else None,
        ))

    return result


@router.post("/providers/{provider_id}/vehicles")
def create_vehicle_mapping(
    provider_id: str,
    payload: GPSVehicleMappingCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Mapping xe với GPS device"""
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Chỉ ADMIN hoặc DISPATCHER được mapping xe")

    tenant_id = str(current_user.tenant_id)

    provider = session.get(GPSProvider, provider_id)
    if not provider or provider.tenant_id != tenant_id:
        raise HTTPException(404, "Provider không tồn tại")

    # Check vehicle exists
    vehicle = session.get(Vehicle, payload.vehicle_id)
    if not vehicle or vehicle.tenant_id != tenant_id:
        raise HTTPException(404, "Xe không tồn tại")

    # Check if already mapped
    existing = session.exec(
        select(GPSVehicleMapping)
        .where(GPSVehicleMapping.provider_id == provider_id)
        .where(GPSVehicleMapping.vehicle_id == payload.vehicle_id)
    ).first()

    if existing:
        raise HTTPException(400, "Xe này đã được mapping với provider này")

    mapping = GPSVehicleMapping(
        tenant_id=tenant_id,
        provider_id=provider_id,
        vehicle_id=payload.vehicle_id,
        gps_device_id=payload.gps_device_id,
        gps_vehicle_name=payload.gps_vehicle_name,
    )

    session.add(mapping)
    session.commit()
    session.refresh(mapping)

    return {
        "success": True,
        "id": mapping.id,
        "message": f"Đã mapping xe {vehicle.plate_no} với device {payload.gps_device_id}",
    }


@router.put("/providers/{provider_id}/vehicles/{mapping_id}")
def update_vehicle_mapping(
    provider_id: str,
    mapping_id: str,
    payload: GPSVehicleMappingUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Cập nhật vehicle mapping"""
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Chỉ ADMIN hoặc DISPATCHER được cập nhật mapping")

    tenant_id = str(current_user.tenant_id)

    mapping = session.get(GPSVehicleMapping, mapping_id)
    if not mapping or mapping.tenant_id != tenant_id or mapping.provider_id != provider_id:
        raise HTTPException(404, "Mapping không tồn tại")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(mapping, key, value)

    mapping.updated_at = datetime.utcnow()
    session.add(mapping)
    session.commit()

    return {"success": True, "message": "Cập nhật thành công"}


@router.delete("/providers/{provider_id}/vehicles/{mapping_id}")
def delete_vehicle_mapping(
    provider_id: str,
    mapping_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Xóa vehicle mapping"""
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Chỉ ADMIN hoặc DISPATCHER được xóa mapping")

    tenant_id = str(current_user.tenant_id)

    mapping = session.get(GPSVehicleMapping, mapping_id)
    if not mapping or mapping.tenant_id != tenant_id or mapping.provider_id != provider_id:
        raise HTTPException(404, "Mapping không tồn tại")

    session.delete(mapping)
    session.commit()

    return {"success": True, "message": "Đã xóa mapping"}


# ============================================================================
# UNMAPPED VEHICLES
# ============================================================================

@router.get("/unmapped-vehicles")
def get_unmapped_vehicles(
    provider_id: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Lấy danh sách xe chưa được mapping với GPS provider nào"""
    tenant_id = str(current_user.tenant_id)

    # Get all vehicles
    vehicles = session.exec(
        select(Vehicle)
        .where(Vehicle.tenant_id == tenant_id)
        .where(Vehicle.status == "ACTIVE")
    ).all()

    # Get mapped vehicle IDs
    if provider_id:
        mapped = session.exec(
            select(GPSVehicleMapping.vehicle_id)
            .where(GPSVehicleMapping.provider_id == provider_id)
            .where(GPSVehicleMapping.is_active == True)
        ).all()
    else:
        mapped = session.exec(
            select(GPSVehicleMapping.vehicle_id)
            .where(GPSVehicleMapping.tenant_id == tenant_id)
            .where(GPSVehicleMapping.is_active == True)
        ).all()

    mapped_ids = set(mapped)

    unmapped = [
        {
            "id": v.id,
            "plate_no": v.plate_no,
            "type": v.type,
            "code": v.code,
        }
        for v in vehicles
        if v.id not in mapped_ids
    ]

    return unmapped


# ============================================================================
# SYNC LOGS
# ============================================================================

@router.get("/providers/{provider_id}/logs")
def get_sync_logs(
    provider_id: str,
    limit: int = Query(default=50, le=200),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Lấy lịch sử đồng bộ của provider"""
    tenant_id = str(current_user.tenant_id)

    provider = session.get(GPSProvider, provider_id)
    if not provider or provider.tenant_id != tenant_id:
        raise HTTPException(404, "Provider không tồn tại")

    logs = session.exec(
        select(GPSSyncLog)
        .where(GPSSyncLog.provider_id == provider_id)
        .order_by(GPSSyncLog.created_at.desc())
        .limit(limit)
    ).all()

    return logs
