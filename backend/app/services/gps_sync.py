"""
GPS Sync Service - Service để đồng bộ dữ liệu GPS từ các nhà cung cấp
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import httpx
import json
import asyncio
import hashlib
from sqlmodel import Session, select
from app.models import (
    GPSProvider, GPSProviderType, GPSAuthType, GPSProviderStatus,
    GPSVehicleMapping, GPSSyncLog, Vehicle
)


class GPSSyncService:
    """Service để đồng bộ dữ liệu GPS từ các nhà cung cấp"""

    def __init__(self, db: Session):
        self.db = db
        self.timeout = httpx.Timeout(30.0)  # 30 seconds timeout

    async def sync_provider(self, provider: GPSProvider) -> Dict[str, Any]:
        """Đồng bộ dữ liệu từ một provider"""
        sync_log = GPSSyncLog(
            tenant_id=provider.tenant_id,
            provider_id=provider.id,
            sync_type="manual",
            started_at=datetime.utcnow(),
            success=False,
            vehicles_synced=0,
        )
        self.db.add(sync_log)

        start_time = datetime.utcnow()

        try:
            # Lấy client phù hợp với provider type
            locations = await self._fetch_locations(provider)

            # Cập nhật vehicle mappings
            vehicles_synced = await self._update_vehicle_locations(
                provider, locations
            )

            # Cập nhật sync log
            sync_log.completed_at = datetime.utcnow()
            sync_log.success = True
            sync_log.vehicles_synced = vehicles_synced
            sync_log.response_time_ms = int(
                (datetime.utcnow() - start_time).total_seconds() * 1000
            )

            # Cập nhật provider status
            provider.status = GPSProviderStatus.ACTIVE.value
            provider.last_sync_at = datetime.utcnow()
            provider.last_error = None
            provider.error_count = 0

            self.db.commit()

            return {
                "success": True,
                "vehicles_synced": vehicles_synced,
                "response_time_ms": sync_log.response_time_ms,
            }

        except Exception as e:
            # Log error
            sync_log.completed_at = datetime.utcnow()
            sync_log.success = False
            sync_log.error_message = str(e)[:500]
            sync_log.response_time_ms = int(
                (datetime.utcnow() - start_time).total_seconds() * 1000
            )

            # Update provider error status
            provider.last_error = str(e)[:500]
            provider.error_count = (provider.error_count or 0) + 1
            if provider.error_count >= 5:
                provider.status = GPSProviderStatus.ERROR.value

            self.db.commit()

            return {
                "success": False,
                "error": str(e),
                "response_time_ms": sync_log.response_time_ms,
            }

    async def _fetch_locations(self, provider: GPSProvider) -> List[Dict[str, Any]]:
        """Fetch locations từ provider API"""

        # Xử lý riêng cho từng loại provider
        if provider.provider_type == GPSProviderType.BINH_ANH.value:
            return await self._fetch_binh_anh_locations(provider)

        # Tạo headers và params cho các provider khác
        headers = self._build_headers(provider)
        params = self._build_params(provider)

        # Endpoint để lấy vị trí xe
        endpoint = provider.endpoint_location or "/vehicles/location"
        url = f"{provider.api_base_url.rstrip('/')}{endpoint}"

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            # Nếu cần authenticate trước
            if provider.auth_type == GPSAuthType.TOKEN.value:
                await self._refresh_token_if_needed(client, provider)
                headers["Authorization"] = f"Bearer {provider.access_token}"

            response = await client.get(url, headers=headers, params=params)
            response.raise_for_status()

            data = response.json()

            # Parse response dựa theo provider type
            return self._parse_locations_response(provider, data)

    async def _fetch_binh_anh_locations(self, provider: GPSProvider) -> List[Dict[str, Any]]:
        """
        Fetch locations từ Bình Anh GPS API.
        API Bình Anh sử dụng Web Service với endpoint GetOnlineVehicle.

        Params:
        - CustomerCode: Mã khách hàng (lưu trong username)
        - Key: API Key/Password (lưu trong api_key hoặc password)
        - IsFuel: Có tính nhiên liệu không (true/false)
        """
        # Bình Anh API base URL
        base_url = provider.api_base_url.rstrip('/')

        # Endpoint lấy vị trí online
        endpoint = provider.endpoint_location or "/api/GetOnlineVehicle"
        url = f"{base_url}{endpoint}"

        # Params theo API Bình Anh
        # CustomerCode = username, Key = api_key hoặc password
        params = {
            "CustomerCode": provider.username,
            "Key": provider.api_key or provider.password,
            "IsFuel": "true",  # Lấy cả thông tin nhiên liệu
        }

        # Thêm custom params nếu có
        if provider.custom_params:
            try:
                custom = json.loads(provider.custom_params)
                params.update(custom)
            except:
                pass

        async with httpx.AsyncClient(timeout=self.timeout, verify=False) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()

            data = response.json()

            # Parse response theo format Bình Anh
            return self._parse_binh_anh_response(data)

    def _parse_binh_anh_response(self, data: Any) -> List[Dict[str, Any]]:
        """
        Parse response từ Bình Anh GPS API.

        Response format từ GetOnlineVehicle:
        {
            "Data": [
                {
                    "VehiclePlate": "51C-12345",
                    "Latitude": 10.7769,
                    "Longitude": 106.7009,
                    "Speed": 45,
                    "Direction": 180,
                    "Address": "123 Nguyen Hue, Q1, HCM",
                    "GPSTime": "2024-01-01 10:30:00",
                    "State": 1,
                    "DailyKm": 150.5,
                    "DriverName": "Nguyen Van A",
                    "FuelTankCapacity": 60,
                    "CurrentFuel": 45,
                    "Temperature": 25,
                    "DeviceID": "123456789"
                }
            ],
            "Status": 1,
            "Message": "Success"
        }
        """
        locations = []

        # Lấy mảng xe từ response
        vehicles = []
        if isinstance(data, dict):
            # Thử các key phổ biến
            vehicles = (
                data.get("Data") or
                data.get("data") or
                data.get("Result") or
                data.get("result") or
                data.get("Vehicles") or
                data.get("vehicles") or
                []
            )
        elif isinstance(data, list):
            vehicles = data

        for v in vehicles:
            # Map các trường từ Bình Anh sang format chuẩn
            device_id = str(
                v.get("DeviceID") or
                v.get("deviceId") or
                v.get("IMEI") or
                v.get("imei") or
                v.get("VehiclePlate") or  # Fallback to plate as ID
                ""
            )

            if not device_id:
                continue

            locations.append({
                "device_id": device_id,
                "vehicle_name": (
                    v.get("VehiclePlate") or
                    v.get("vehiclePlate") or
                    v.get("PlateNumber") or
                    v.get("plate_number") or
                    v.get("Name") or
                    ""
                ),
                "latitude": float(
                    v.get("Latitude") or
                    v.get("latitude") or
                    v.get("Lat") or
                    v.get("lat") or
                    0
                ),
                "longitude": float(
                    v.get("Longitude") or
                    v.get("longitude") or
                    v.get("Lng") or
                    v.get("lng") or
                    v.get("Long") or
                    0
                ),
                "speed": float(
                    v.get("Speed") or
                    v.get("speed") or
                    0
                ),
                "heading": float(
                    v.get("Direction") or
                    v.get("direction") or
                    v.get("Heading") or
                    v.get("heading") or
                    0
                ),
                "address": (
                    v.get("Address") or
                    v.get("address") or
                    v.get("Location") or
                    ""
                ),
                "timestamp": (
                    v.get("GPSTime") or
                    v.get("gpsTime") or
                    v.get("UpdateTime") or
                    v.get("Time") or
                    v.get("time") or
                    ""
                ),
                # Thông tin bổ sung từ Bình Anh
                "state": v.get("State") or v.get("state"),  # 0-6: trạng thái xe
                "daily_km": v.get("DailyKm") or v.get("dailyKm"),
                "driver_name": v.get("DriverName") or v.get("driverName"),
                "fuel_capacity": v.get("FuelTankCapacity") or v.get("fuelTankCapacity"),
                "current_fuel": v.get("CurrentFuel") or v.get("currentFuel"),
                "temperature": v.get("Temperature") or v.get("temperature"),
            })

        return locations

    def _build_headers(self, provider: GPSProvider) -> Dict[str, str]:
        """Build request headers"""
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        # Add custom headers
        if provider.custom_headers:
            try:
                custom = json.loads(provider.custom_headers)
                headers.update(custom)
            except:
                pass

        # Add auth headers
        if provider.auth_type == GPSAuthType.API_KEY.value and provider.api_key:
            headers["X-API-Key"] = provider.api_key
        elif provider.auth_type == GPSAuthType.BASIC.value:
            import base64
            credentials = f"{provider.username}:{provider.password}"
            encoded = base64.b64encode(credentials.encode()).decode()
            headers["Authorization"] = f"Basic {encoded}"

        return headers

    def _build_params(self, provider: GPSProvider) -> Dict[str, str]:
        """Build request params"""
        params = {}

        if provider.custom_params:
            try:
                custom = json.loads(provider.custom_params)
                params.update(custom)
            except:
                pass

        return params

    async def _refresh_token_if_needed(
        self, client: httpx.AsyncClient, provider: GPSProvider
    ):
        """Refresh access token nếu hết hạn"""
        if provider.token_expires_at and provider.token_expires_at > datetime.utcnow():
            return  # Token still valid

        if not provider.refresh_token:
            # Need to login again
            await self._login(client, provider)
            return

        # Try to refresh
        try:
            refresh_url = f"{provider.api_base_url.rstrip('/')}/auth/refresh"
            response = await client.post(
                refresh_url,
                json={"refresh_token": provider.refresh_token}
            )
            response.raise_for_status()
            data = response.json()

            provider.access_token = data.get("access_token")
            provider.refresh_token = data.get("refresh_token", provider.refresh_token)
            expires_in = data.get("expires_in", 3600)
            provider.token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

        except:
            # Fallback to login
            await self._login(client, provider)

    async def _login(self, client: httpx.AsyncClient, provider: GPSProvider):
        """Login để lấy access token"""
        login_url = f"{provider.api_base_url.rstrip('/')}/auth/login"

        response = await client.post(
            login_url,
            json={
                "username": provider.username,
                "password": provider.password,
            }
        )
        response.raise_for_status()
        data = response.json()

        provider.access_token = data.get("access_token")
        provider.refresh_token = data.get("refresh_token")
        expires_in = data.get("expires_in", 3600)
        provider.token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

    def _parse_locations_response(
        self, provider: GPSProvider, data: Any
    ) -> List[Dict[str, Any]]:
        """Parse response từ provider thành format chuẩn"""
        locations = []

        # Tùy theo provider type mà parse khác nhau
        if provider.provider_type == GPSProviderType.BINH_ANH.value:
            # Bình Anh GPS format
            vehicles = data.get("data", data.get("vehicles", []))
            if isinstance(vehicles, dict):
                vehicles = vehicles.get("items", [])

            for v in vehicles:
                locations.append({
                    "device_id": str(v.get("device_id") or v.get("imei") or v.get("id")),
                    "vehicle_name": v.get("vehicle_name") or v.get("name"),
                    "latitude": float(v.get("lat") or v.get("latitude") or 0),
                    "longitude": float(v.get("lng") or v.get("longitude") or 0),
                    "speed": float(v.get("speed") or 0),
                    "heading": float(v.get("heading") or v.get("direction") or 0),
                    "address": v.get("address") or v.get("location"),
                    "timestamp": v.get("time") or v.get("timestamp") or v.get("updated_at"),
                })

        elif provider.provider_type == GPSProviderType.VIETMAP.value:
            # Vietmap GPS format
            vehicles = data.get("result", data.get("data", []))

            for v in vehicles:
                locations.append({
                    "device_id": str(v.get("device_id") or v.get("imei")),
                    "vehicle_name": v.get("plate_number") or v.get("name"),
                    "latitude": float(v.get("latitude") or 0),
                    "longitude": float(v.get("longitude") or 0),
                    "speed": float(v.get("speed") or 0),
                    "heading": float(v.get("direction") or 0),
                    "address": v.get("address"),
                    "timestamp": v.get("gps_time") or v.get("update_time"),
                })

        elif provider.provider_type == GPSProviderType.VANG_GPS.value:
            # Vàng GPS format
            vehicles = data if isinstance(data, list) else data.get("vehicles", [])

            for v in vehicles:
                locations.append({
                    "device_id": str(v.get("serial") or v.get("device_serial")),
                    "vehicle_name": v.get("vehicle_number") or v.get("name"),
                    "latitude": float(v.get("lat") or 0),
                    "longitude": float(v.get("lon") or v.get("lng") or 0),
                    "speed": float(v.get("speed") or 0),
                    "heading": float(v.get("heading") or 0),
                    "address": v.get("address"),
                    "timestamp": v.get("datetime") or v.get("time"),
                })

        else:
            # Custom/generic format - try to parse common fields
            vehicles = (
                data.get("data", data.get("vehicles", data.get("items", [])))
                if isinstance(data, dict) else data
            )
            if not isinstance(vehicles, list):
                vehicles = [data]

            for v in vehicles:
                locations.append({
                    "device_id": str(
                        v.get("device_id") or v.get("imei") or
                        v.get("serial") or v.get("id")
                    ),
                    "vehicle_name": (
                        v.get("vehicle_name") or v.get("plate_number") or
                        v.get("name") or v.get("vehicle_number")
                    ),
                    "latitude": float(
                        v.get("latitude") or v.get("lat") or 0
                    ),
                    "longitude": float(
                        v.get("longitude") or v.get("lng") or
                        v.get("lon") or 0
                    ),
                    "speed": float(v.get("speed") or 0),
                    "heading": float(
                        v.get("heading") or v.get("direction") or 0
                    ),
                    "address": v.get("address") or v.get("location"),
                    "timestamp": (
                        v.get("timestamp") or v.get("time") or
                        v.get("datetime") or v.get("updated_at")
                    ),
                })

        return locations

    async def _update_vehicle_locations(
        self, provider: GPSProvider, locations: List[Dict[str, Any]]
    ) -> int:
        """Cập nhật vị trí xe từ GPS data"""
        updated_count = 0

        # Lấy tất cả mappings của provider này
        stmt = select(GPSVehicleMapping).where(
            GPSVehicleMapping.provider_id == provider.id,
            GPSVehicleMapping.is_active == True
        )
        mappings = self.db.exec(stmt).all()

        # Create lookup by device_id
        mapping_by_device = {m.gps_device_id: m for m in mappings}

        for loc in locations:
            device_id = loc.get("device_id")
            if not device_id or device_id not in mapping_by_device:
                continue

            mapping = mapping_by_device[device_id]

            # Update mapping with latest location
            mapping.last_latitude = loc.get("latitude")
            mapping.last_longitude = loc.get("longitude")
            mapping.last_speed = loc.get("speed")
            mapping.last_heading = loc.get("heading")
            mapping.last_address = loc.get("address")
            mapping.gps_vehicle_name = loc.get("vehicle_name")

            # Parse timestamp
            timestamp = loc.get("timestamp")
            if timestamp:
                if isinstance(timestamp, str):
                    try:
                        mapping.last_location_at = datetime.fromisoformat(
                            timestamp.replace("Z", "+00:00")
                        )
                    except:
                        mapping.last_location_at = datetime.utcnow()
                else:
                    mapping.last_location_at = datetime.utcnow()
            else:
                mapping.last_location_at = datetime.utcnow()

            mapping.updated_at = datetime.utcnow()
            updated_count += 1

        return updated_count

    async def test_connection(self, provider: GPSProvider) -> Dict[str, Any]:
        """Test kết nối với provider"""
        start_time = datetime.utcnow()

        try:
            # Test riêng cho Bình Anh
            if provider.provider_type == GPSProviderType.BINH_ANH.value:
                return await self._test_binh_anh_connection(provider)

            headers = self._build_headers(provider)
            params = self._build_params(provider)

            # Test endpoint - try vehicles list first
            test_endpoint = provider.endpoint_vehicles or "/vehicles"
            url = f"{provider.api_base_url.rstrip('/')}{test_endpoint}"

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # Handle token auth
                if provider.auth_type == GPSAuthType.TOKEN.value:
                    if provider.username and provider.password:
                        await self._login(client, provider)
                        self.db.commit()
                    headers["Authorization"] = f"Bearer {provider.access_token}"

                response = await client.get(url, headers=headers, params=params)

                response_time = int(
                    (datetime.utcnow() - start_time).total_seconds() * 1000
                )

                if response.status_code == 200:
                    data = response.json()
                    vehicle_count = 0

                    # Try to count vehicles
                    if isinstance(data, dict):
                        items = (
                            data.get("data", data.get("vehicles",
                            data.get("items", data.get("result", []))))
                        )
                        if isinstance(items, list):
                            vehicle_count = len(items)
                        elif isinstance(items, dict):
                            vehicle_count = len(items.get("items", []))
                    elif isinstance(data, list):
                        vehicle_count = len(data)

                    return {
                        "success": True,
                        "status_code": 200,
                        "response_time_ms": response_time,
                        "vehicle_count": vehicle_count,
                        "message": f"Kết nối thành công. Tìm thấy {vehicle_count} thiết bị GPS.",
                    }
                else:
                    return {
                        "success": False,
                        "status_code": response.status_code,
                        "response_time_ms": response_time,
                        "message": f"Server trả về lỗi: {response.status_code}",
                        "error": response.text[:200] if response.text else None,
                    }

        except httpx.TimeoutException:
            return {
                "success": False,
                "message": "Kết nối timeout. Vui lòng kiểm tra URL và network.",
                "response_time_ms": 30000,
            }
        except httpx.ConnectError as e:
            return {
                "success": False,
                "message": f"Không thể kết nối: {str(e)}",
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Lỗi: {str(e)}",
            }

    async def _test_binh_anh_connection(self, provider: GPSProvider) -> Dict[str, Any]:
        """Test kết nối với Bình Anh GPS API"""
        start_time = datetime.utcnow()

        try:
            base_url = provider.api_base_url.rstrip('/')
            endpoint = provider.endpoint_location or "/api/GetOnlineVehicle"
            url = f"{base_url}{endpoint}"

            params = {
                "CustomerCode": provider.username,
                "Key": provider.api_key or provider.password,
                "IsFuel": "false",  # Không cần fuel khi test
            }

            async with httpx.AsyncClient(timeout=self.timeout, verify=False) as client:
                response = await client.get(url, params=params)

                response_time = int(
                    (datetime.utcnow() - start_time).total_seconds() * 1000
                )

                if response.status_code == 200:
                    try:
                        data = response.json()

                        # Kiểm tra response status từ Bình Anh
                        status = data.get("Status") or data.get("status")
                        message = data.get("Message") or data.get("message") or ""

                        # Nếu có lỗi từ API
                        if status == 0 or "error" in message.lower() or "fail" in message.lower():
                            return {
                                "success": False,
                                "status_code": 200,
                                "response_time_ms": response_time,
                                "message": f"API trả về lỗi: {message}",
                                "error": message,
                            }

                        # Đếm số xe
                        vehicles = self._parse_binh_anh_response(data)
                        vehicle_count = len(vehicles)

                        # Lấy mẫu biển số để hiển thị
                        sample_plates = [v["vehicle_name"] for v in vehicles[:3]]

                        return {
                            "success": True,
                            "status_code": 200,
                            "response_time_ms": response_time,
                            "vehicle_count": vehicle_count,
                            "message": f"Kết nối thành công! Tìm thấy {vehicle_count} xe.",
                            "sample_plates": sample_plates,
                        }

                    except json.JSONDecodeError:
                        return {
                            "success": False,
                            "status_code": 200,
                            "response_time_ms": response_time,
                            "message": "Response không phải JSON. Kiểm tra lại endpoint.",
                            "error": response.text[:200],
                        }
                else:
                    return {
                        "success": False,
                        "status_code": response.status_code,
                        "response_time_ms": response_time,
                        "message": f"Server trả về lỗi HTTP {response.status_code}",
                        "error": response.text[:200] if response.text else None,
                    }

        except httpx.TimeoutException:
            return {
                "success": False,
                "message": "Kết nối timeout (30s). Vui lòng kiểm tra URL và network.",
                "response_time_ms": 30000,
            }
        except httpx.ConnectError as e:
            return {
                "success": False,
                "message": f"Không thể kết nối đến server: {str(e)}",
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Lỗi: {str(e)}",
            }

    def get_vehicle_gps_data(
        self, tenant_id: str, vehicle_ids: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Lấy dữ liệu GPS của các xe"""
        stmt = select(GPSVehicleMapping).where(
            GPSVehicleMapping.tenant_id == tenant_id,
            GPSVehicleMapping.is_active == True
        )

        if vehicle_ids:
            stmt = stmt.where(GPSVehicleMapping.vehicle_id.in_(vehicle_ids))

        mappings = self.db.exec(stmt).all()

        result = []
        for m in mappings:
            result.append({
                "vehicle_id": m.vehicle_id,
                "gps_device_id": m.gps_device_id,
                "latitude": m.last_latitude,
                "longitude": m.last_longitude,
                "speed": m.last_speed,
                "heading": m.last_heading,
                "address": m.last_address,
                "gps_timestamp": m.last_location_at.isoformat() if m.last_location_at else None,
            })

        return result


async def sync_all_active_providers(db: Session, tenant_id: str):
    """Đồng bộ tất cả providers active của một tenant"""
    stmt = select(GPSProvider).where(
        GPSProvider.tenant_id == tenant_id,
        GPSProvider.status == GPSProviderStatus.ACTIVE.value,
        GPSProvider.is_active == True
    )
    providers = db.exec(stmt).all()

    service = GPSSyncService(db)
    results = []

    for provider in providers:
        result = await service.sync_provider(provider)
        results.append({
            "provider_id": provider.id,
            "provider_name": provider.name,
            **result
        })

    return results
