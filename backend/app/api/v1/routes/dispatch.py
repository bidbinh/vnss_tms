"""
Dispatch Center API
- Dashboard data (vehicles, alerts, AI decisions, stats)
- GPS tracking management
- Alert management
- AI decision approval/rejection
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional, List
import json
import random

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func, and_, or_
from pydantic import BaseModel

from app.db.session import get_session
from app.models import (
    Vehicle, Driver, Order, Trip, User,
    GPSProvider, GPSProviderStatus, GPSVehicleMapping,
)
from app.models.dispatch import (
    VehicleGPS, VehicleWorkStatus,
    DispatchLog, DispatchLogType,
    DispatchAlert, AlertSeverity, AlertType,
    AIDecision,
)
from app.core.security import get_current_user
from app.services.gps_sync import GPSSyncService, sync_all_active_providers


router = APIRouter(prefix="/dispatch", tags=["Dispatch Center"])


# ============ Response Models ============

class VehicleDispatchInfo(BaseModel):
    """Vehicle with GPS and dispatch info"""
    id: str
    plate_number: str
    vehicle_type: str
    status: str
    work_status: str

    # Driver info
    driver_id: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None

    # GPS info
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    speed: Optional[float] = None
    address: Optional[str] = None
    gps_timestamp: Optional[datetime] = None

    # Current trip
    current_trip_id: Optional[str] = None
    current_order_id: Optional[str] = None
    destination: Optional[str] = None
    eta: Optional[datetime] = None
    remaining_km: Optional[float] = None


class AlertInfo(BaseModel):
    """Alert info for dispatch"""
    id: str
    alert_type: str
    severity: str
    title: str
    message: str
    vehicle_id: Optional[str] = None
    plate_number: Optional[str] = None
    driver_name: Optional[str] = None
    order_id: Optional[str] = None
    created_at: datetime
    is_resolved: bool


class AIDecisionInfo(BaseModel):
    """AI decision pending approval"""
    id: str
    decision_type: str
    title: str
    description: str
    confidence: float
    reasoning: Optional[str] = None
    vehicle_id: Optional[str] = None
    plate_number: Optional[str] = None
    driver_name: Optional[str] = None
    order_id: Optional[str] = None
    order_code: Optional[str] = None
    status: str
    created_at: datetime


class DispatchActivityLog(BaseModel):
    """Activity log entry"""
    id: str
    log_type: str
    title: str
    description: Optional[str] = None
    is_ai: bool
    created_at: datetime
    plate_number: Optional[str] = None
    driver_name: Optional[str] = None


class DispatchStats(BaseModel):
    """Dashboard KPIs"""
    total_vehicles: int
    active_vehicles: int
    available_vehicles: int
    on_trip_vehicles: int

    total_drivers: int
    active_drivers: int

    pending_orders: int
    in_transit_orders: int
    delivered_today: int

    active_alerts: int
    pending_ai_decisions: int

    ai_auto_rate: float  # % orders handled by AI


class DispatchDashboard(BaseModel):
    """Full dispatch dashboard data"""
    stats: DispatchStats
    vehicles: List[VehicleDispatchInfo]
    alerts: List[AlertInfo]
    ai_decisions: List[AIDecisionInfo]
    recent_activity: List[DispatchActivityLog]
    unassigned_orders: List[dict]


# ============ API Endpoints ============

@router.get("/dashboard", response_model=DispatchDashboard)
def get_dispatch_dashboard(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get all dispatch dashboard data in one call"""
    tenant_id = str(current_user.tenant_id)

    # Get stats
    stats = _get_dispatch_stats(session, tenant_id)

    # Get vehicles with GPS
    vehicles = _get_vehicles_with_gps(session, tenant_id)

    # Get active alerts
    alerts = _get_active_alerts(session, tenant_id, limit=20)

    # Get pending AI decisions
    ai_decisions = _get_pending_ai_decisions(session, tenant_id, limit=10)

    # Get recent activity
    recent_activity = _get_recent_activity(session, tenant_id, limit=20)

    # Get unassigned orders
    unassigned_orders = _get_unassigned_orders(session, tenant_id, limit=20)

    return DispatchDashboard(
        stats=stats,
        vehicles=vehicles,
        alerts=alerts,
        ai_decisions=ai_decisions,
        recent_activity=recent_activity,
        unassigned_orders=unassigned_orders,
    )


@router.get("/stats", response_model=DispatchStats)
def get_stats(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get dispatch KPIs"""
    tenant_id = str(current_user.tenant_id)
    return _get_dispatch_stats(session, tenant_id)


@router.get("/vehicles", response_model=List[VehicleDispatchInfo])
def get_vehicles(
    status: Optional[str] = None,
    work_status: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get vehicles with GPS and dispatch info"""
    tenant_id = str(current_user.tenant_id)
    return _get_vehicles_with_gps(session, tenant_id, status, work_status)


@router.get("/alerts", response_model=List[AlertInfo])
def get_alerts(
    include_resolved: bool = False,
    severity: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get dispatch alerts"""
    tenant_id = str(current_user.tenant_id)
    return _get_active_alerts(session, tenant_id, limit, include_resolved, severity)


@router.post("/alerts/{alert_id}/resolve")
def resolve_alert(
    alert_id: str,
    note: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Resolve an alert"""
    tenant_id = str(current_user.tenant_id)

    alert = session.get(DispatchAlert, alert_id)
    if not alert or str(alert.tenant_id) != tenant_id:
        raise HTTPException(404, "Alert not found")

    alert.is_resolved = True
    alert.resolved_at = datetime.utcnow()
    alert.resolved_by = current_user.id
    alert.resolution_note = note

    session.add(alert)
    session.commit()

    # Log the action
    _log_dispatch_action(
        session, tenant_id, current_user.id,
        log_type=DispatchLogType.ALERT_RESOLVED.value,
        title=f"Đã xử lý cảnh báo: {alert.title}",
        description=note,
        alert_id=alert_id,
        vehicle_id=alert.vehicle_id,
        driver_id=alert.driver_id,
    )

    return {"message": "Alert resolved", "alert_id": alert_id}


@router.get("/ai-decisions", response_model=List[AIDecisionInfo])
def get_ai_decisions(
    status: str = "pending",
    limit: int = Query(default=20, le=100),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get AI decisions (default: pending approval)"""
    tenant_id = str(current_user.tenant_id)
    return _get_pending_ai_decisions(session, tenant_id, limit, status)


@router.post("/ai-decisions/{decision_id}/approve")
def approve_ai_decision(
    decision_id: str,
    note: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Approve an AI decision"""
    tenant_id = str(current_user.tenant_id)

    decision = session.get(AIDecision, decision_id)
    if not decision or str(decision.tenant_id) != tenant_id:
        raise HTTPException(404, "Decision not found")
    if decision.status != "pending":
        raise HTTPException(400, f"Decision already {decision.status}")

    decision.status = "approved"
    decision.reviewed_by = current_user.id
    decision.reviewed_at = datetime.utcnow()
    decision.review_note = note

    session.add(decision)
    session.commit()

    # Log the action
    _log_dispatch_action(
        session, tenant_id, current_user.id,
        log_type=DispatchLogType.AI_APPROVED.value,
        title=f"Đã duyệt: {decision.title}",
        description=note,
        is_ai=False,
        vehicle_id=decision.vehicle_id,
        driver_id=decision.driver_id,
        order_id=decision.order_id,
    )

    # TODO: Execute the approved decision (assign driver, etc.)

    return {"message": "Decision approved", "decision_id": decision_id}


@router.post("/ai-decisions/{decision_id}/reject")
def reject_ai_decision(
    decision_id: str,
    note: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Reject an AI decision"""
    tenant_id = str(current_user.tenant_id)

    decision = session.get(AIDecision, decision_id)
    if not decision or str(decision.tenant_id) != tenant_id:
        raise HTTPException(404, "Decision not found")
    if decision.status != "pending":
        raise HTTPException(400, f"Decision already {decision.status}")

    decision.status = "rejected"
    decision.reviewed_by = current_user.id
    decision.reviewed_at = datetime.utcnow()
    decision.review_note = note

    session.add(decision)
    session.commit()

    # Log the action
    _log_dispatch_action(
        session, tenant_id, current_user.id,
        log_type=DispatchLogType.AI_REJECTED.value,
        title=f"Đã từ chối: {decision.title}",
        description=note,
        is_ai=False,
        vehicle_id=decision.vehicle_id,
        driver_id=decision.driver_id,
        order_id=decision.order_id,
    )

    return {"message": "Decision rejected", "decision_id": decision_id}


@router.get("/activity", response_model=List[DispatchActivityLog])
def get_activity_logs(
    limit: int = Query(default=50, le=200),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get recent dispatch activity logs"""
    tenant_id = str(current_user.tenant_id)
    return _get_recent_activity(session, tenant_id, limit)


@router.get("/unassigned-orders")
def get_unassigned_orders(
    limit: int = Query(default=50, le=200),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get orders without assigned vehicle/driver"""
    tenant_id = str(current_user.tenant_id)
    return _get_unassigned_orders(session, tenant_id, limit)


@router.post("/assign")
def assign_order(
    order_id: str,
    vehicle_id: str,
    driver_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Manually assign vehicle/driver to order"""
    tenant_id = str(current_user.tenant_id)

    # Validate order
    order = session.get(Order, order_id)
    if not order or str(order.tenant_id) != tenant_id:
        raise HTTPException(404, "Order not found")

    # Validate vehicle
    vehicle = session.get(Vehicle, vehicle_id)
    if not vehicle or str(vehicle.tenant_id) != tenant_id:
        raise HTTPException(404, "Vehicle not found")

    # Validate driver
    driver = session.get(Driver, driver_id)
    if not driver or str(driver.tenant_id) != tenant_id:
        raise HTTPException(404, "Driver not found")

    # Update order
    order.driver_id = driver_id
    order.status = "ASSIGNED"

    session.add(order)
    session.commit()

    # Log the action
    _log_dispatch_action(
        session, tenant_id, current_user.id,
        log_type=DispatchLogType.MANUAL_ASSIGN.value,
        title=f"Phân công đơn {order.order_code} cho {driver.name}",
        description=f"Xe: {vehicle.plate_no}",
        is_ai=False,
        vehicle_id=vehicle_id,
        driver_id=driver_id,
        order_id=order_id,
    )

    return {
        "message": "Order assigned",
        "order_id": order_id,
        "vehicle_id": vehicle_id,
        "driver_id": driver_id,
    }


@router.post("/gps/update")
def update_vehicle_gps(
    vehicle_id: str,
    latitude: float,
    longitude: float,
    speed: Optional[float] = None,
    heading: Optional[float] = None,
    address: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update or create GPS record for vehicle (for testing/manual input)"""
    tenant_id = str(current_user.tenant_id)

    # Validate vehicle
    vehicle = session.get(Vehicle, vehicle_id)
    if not vehicle or str(vehicle.tenant_id) != tenant_id:
        raise HTTPException(404, "Vehicle not found")

    # Find existing GPS record
    gps = session.exec(
        select(VehicleGPS)
        .where(VehicleGPS.tenant_id == tenant_id)
        .where(VehicleGPS.vehicle_id == vehicle_id)
    ).first()

    if gps:
        gps.latitude = latitude
        gps.longitude = longitude
        gps.speed = speed
        gps.heading = heading
        gps.address = address
        gps.gps_timestamp = datetime.utcnow()
    else:
        gps = VehicleGPS(
            tenant_id=tenant_id,
            vehicle_id=vehicle_id,
            latitude=latitude,
            longitude=longitude,
            speed=speed,
            heading=heading,
            address=address,
            gps_timestamp=datetime.utcnow(),
        )

    session.add(gps)
    session.commit()

    return {"message": "GPS updated", "vehicle_id": vehicle_id}


@router.post("/sync-gps")
async def sync_gps_from_providers(
    provider_id: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Đồng bộ dữ liệu GPS từ các nhà cung cấp đã cấu hình.
    - Nếu không truyền provider_id, sẽ sync tất cả providers active
    - Nếu truyền provider_id, chỉ sync provider đó
    """
    tenant_id = str(current_user.tenant_id)

    if provider_id:
        # Sync single provider
        provider = session.get(GPSProvider, provider_id)
        if not provider or str(provider.tenant_id) != tenant_id:
            raise HTTPException(404, "Provider not found")

        service = GPSSyncService(session)
        result = await service.sync_provider(provider)

        # After sync, update VehicleGPS table from mappings
        _update_vehicle_gps_from_mappings(session, tenant_id, provider_id)

        return {
            "message": "GPS sync completed",
            "provider_id": provider_id,
            "provider_name": provider.name,
            **result
        }
    else:
        # Sync all active providers
        results = await sync_all_active_providers(session, tenant_id)

        # Update VehicleGPS for all providers
        for r in results:
            if r.get("success"):
                _update_vehicle_gps_from_mappings(session, tenant_id, r.get("provider_id"))

        return {
            "message": f"Synced {len(results)} providers",
            "results": results
        }


@router.get("/gps-providers-status")
def get_gps_providers_status(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Lấy trạng thái các GPS providers"""
    tenant_id = str(current_user.tenant_id)

    providers = session.exec(
        select(GPSProvider)
        .where(GPSProvider.tenant_id == tenant_id)
        .where(GPSProvider.is_active == True)
    ).all()

    # Count mapped vehicles per provider
    result = []
    for p in providers:
        mapped_count = session.exec(
            select(func.count(GPSVehicleMapping.id))
            .where(GPSVehicleMapping.provider_id == p.id)
            .where(GPSVehicleMapping.is_active == True)
        ).one()

        result.append({
            "id": p.id,
            "name": p.name,
            "provider_type": p.provider_type,
            "status": p.status,
            "last_sync_at": p.last_sync_at.isoformat() if p.last_sync_at else None,
            "last_error": p.last_error,
            "error_count": p.error_count,
            "mapped_vehicles": mapped_count,
            "sync_interval_seconds": p.sync_interval_seconds,
            "is_realtime": p.is_realtime,
        })

    return result


@router.post("/seed-sample-data")
def seed_sample_data(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Seed sample dispatch data for testing"""
    tenant_id = str(current_user.tenant_id)

    # Get existing vehicles and drivers
    vehicles = session.exec(
        select(Vehicle)
        .where(Vehicle.tenant_id == tenant_id)
        .where(Vehicle.status == "ACTIVE")
    ).all()

    drivers = session.exec(
        select(Driver)
        .where(Driver.tenant_id == tenant_id)
        .where(Driver.status == "ACTIVE")
    ).all()

    if not vehicles:
        raise HTTPException(400, "No vehicles found. Please create vehicles first.")
    if not drivers:
        raise HTTPException(400, "No drivers found. Please create drivers first.")

    # Sample locations in Ho Chi Minh City area
    hcm_locations = [
        (10.7769, 106.7009, "Quận 1, TP.HCM"),
        (10.8231, 106.6297, "Tân Bình, TP.HCM"),
        (10.7503, 106.6345, "Quận 7, TP.HCM"),
        (10.8700, 106.8017, "Quận 9, TP.HCM"),
        (10.9590, 106.8427, "Dĩ An, Bình Dương"),
        (10.8046, 106.7145, "Gò Vấp, TP.HCM"),
        (10.7628, 106.6820, "Quận 4, TP.HCM"),
        (10.8419, 106.7628, "Thủ Đức, TP.HCM"),
    ]

    work_statuses = [
        VehicleWorkStatus.AVAILABLE.value,
        VehicleWorkStatus.ON_TRIP.value,
        VehicleWorkStatus.LOADING.value,
        VehicleWorkStatus.RETURNING.value,
    ]

    # Build a map of vehicle_id -> assigned driver
    vehicle_driver_map = {}
    for d in drivers:
        if d.tractor_id:
            vehicle_driver_map[d.tractor_id] = d

    # Create GPS records for vehicles
    gps_created = 0
    for i, vehicle in enumerate(vehicles):
        loc = hcm_locations[i % len(hcm_locations)]

        # Get assigned driver for this vehicle (via tractor_id relationship)
        assigned_driver = vehicle_driver_map.get(vehicle.id)

        # Check if GPS exists
        existing = session.exec(
            select(VehicleGPS)
            .where(VehicleGPS.tenant_id == tenant_id)
            .where(VehicleGPS.vehicle_id == vehicle.id)
        ).first()

        if existing:
            existing.latitude = loc[0] + random.uniform(-0.01, 0.01)
            existing.longitude = loc[1] + random.uniform(-0.01, 0.01)
            existing.speed = random.uniform(0, 60)
            existing.address = loc[2]
            existing.work_status = random.choice(work_statuses)
            existing.gps_timestamp = datetime.utcnow()
            # Use assigned driver if available
            if assigned_driver:
                existing.driver_id = assigned_driver.id
            session.add(existing)
        else:
            gps = VehicleGPS(
                tenant_id=tenant_id,
                vehicle_id=vehicle.id,
                driver_id=assigned_driver.id if assigned_driver else None,
                latitude=loc[0] + random.uniform(-0.01, 0.01),
                longitude=loc[1] + random.uniform(-0.01, 0.01),
                speed=random.uniform(0, 60),
                address=loc[2],
                work_status=random.choice(work_statuses),
                gps_timestamp=datetime.utcnow(),
            )
            session.add(gps)
            gps_created += 1

    # Create sample alerts
    alert_samples = [
        (AlertType.DELAY.value, AlertSeverity.WARNING.value, "Trễ tiến độ", "Xe trễ 15 phút so với lịch trình"),
        (AlertType.UNASSIGNED_ORDER.value, AlertSeverity.CRITICAL.value, "Đơn chưa có xe", "Đơn hàng cấp bách chưa được phân công"),
        (AlertType.MAINTENANCE_DUE.value, AlertSeverity.INFO.value, "Sắp đến hạn bảo dưỡng", "Còn 500km nữa đến định kỳ bảo dưỡng"),
        (AlertType.LONG_STOP.value, AlertSeverity.WARNING.value, "Dừng quá lâu", "Xe dừng tại vị trí không xác định > 2 giờ"),
    ]

    alerts_created = 0
    for i, (atype, sev, title, msg) in enumerate(alert_samples):
        if i < len(vehicles):
            vehicle = vehicles[i]
            assigned_driver = vehicle_driver_map.get(vehicle.id)
            alert = DispatchAlert(
                tenant_id=tenant_id,
                alert_type=atype,
                severity=sev,
                title=title,
                message=msg,
                vehicle_id=vehicle.id,
                driver_id=assigned_driver.id if assigned_driver else None,
            )
            session.add(alert)
            alerts_created += 1

    # Create sample AI decisions
    ai_decision_samples = [
        ("assign", "Gợi ý phân công", "Gợi ý phân công đơn hàng cho tài xế", 92),
        ("reassign", "Đổi tài xế", "Đề xuất đổi tài xế do lộ trình tối ưu hơn", 85),
        ("route_change", "Tối ưu lộ trình", "Phát hiện đường tắc, đề xuất đổi lộ trình", 78),
    ]

    decisions_created = 0
    for i, (dtype, title, desc, conf) in enumerate(ai_decision_samples):
        if i < len(vehicles):
            vehicle = vehicles[i]
            assigned_driver = vehicle_driver_map.get(vehicle.id)
            decision = AIDecision(
                tenant_id=tenant_id,
                decision_type=dtype,
                title=title,
                description=desc,
                confidence=conf,
                reasoning="AI phân tích dựa trên vị trí hiện tại, lịch trình và khả năng tải.",
                vehicle_id=vehicle.id,
                driver_id=assigned_driver.id if assigned_driver else None,
                status="pending",
            )
            session.add(decision)
            decisions_created += 1

    # Create sample activity logs
    log_samples = [
        (DispatchLogType.AUTO_ASSIGN.value, "AI phân công đơn DH001", True),
        (DispatchLogType.ROUTE_OPTIMIZE.value, "AI tối ưu lộ trình 5 xe", True),
        (DispatchLogType.ALERT_CREATED.value, "Phát hiện xe dừng quá lâu", True),
        (DispatchLogType.MANUAL_ASSIGN.value, "Điều phối viên phân công đơn DH002", False),
    ]

    logs_created = 0
    for ltype, title, is_ai in log_samples:
        log = DispatchLog(
            tenant_id=tenant_id,
            log_type=ltype,
            title=title,
            is_ai=is_ai,
            user_id=None if is_ai else current_user.id,
        )
        session.add(log)
        logs_created += 1

    session.commit()

    return {
        "message": "Sample data created",
        "gps_records": gps_created,
        "alerts": alerts_created,
        "ai_decisions": decisions_created,
        "activity_logs": logs_created,
        "vehicles_count": len(vehicles),
        "drivers_count": len(drivers),
    }


# ============ Helper Functions ============

def _get_dispatch_stats(session: Session, tenant_id: str) -> DispatchStats:
    """Calculate dispatch KPIs"""
    # Vehicle counts
    total_vehicles = session.exec(
        select(func.count(Vehicle.id))
        .where(Vehicle.tenant_id == tenant_id)
    ).one()

    active_vehicles = session.exec(
        select(func.count(Vehicle.id))
        .where(Vehicle.tenant_id == tenant_id)
        .where(Vehicle.status == "ACTIVE")
    ).one()

    # GPS-based counts (for vehicles with GPS records)
    gps_available_count = session.exec(
        select(func.count(VehicleGPS.id))
        .where(VehicleGPS.tenant_id == tenant_id)
        .where(VehicleGPS.work_status == VehicleWorkStatus.AVAILABLE.value)
    ).one()

    gps_on_trip_count = session.exec(
        select(func.count(VehicleGPS.id))
        .where(VehicleGPS.tenant_id == tenant_id)
        .where(VehicleGPS.work_status == VehicleWorkStatus.ON_TRIP.value)
    ).one()

    # For vehicles without GPS, count active vehicles as potentially available
    vehicles_with_gps = session.exec(
        select(func.count(VehicleGPS.id))
        .where(VehicleGPS.tenant_id == tenant_id)
    ).one()

    # If no GPS data at all, treat all active vehicles as available
    if vehicles_with_gps == 0:
        available_count = active_vehicles
        on_trip_count = 0
    else:
        available_count = gps_available_count
        on_trip_count = gps_on_trip_count

    # Driver counts
    total_drivers = session.exec(
        select(func.count(Driver.id))
        .where(Driver.tenant_id == tenant_id)
    ).one()

    active_drivers = session.exec(
        select(func.count(Driver.id))
        .where(Driver.tenant_id == tenant_id)
        .where(Driver.status == "ACTIVE")
    ).one()

    # Order counts
    pending_orders = session.exec(
        select(func.count(Order.id))
        .where(Order.tenant_id == tenant_id)
        .where(or_(Order.status == "NEW", Order.status == "ACCEPTED"))
    ).one()

    in_transit_orders = session.exec(
        select(func.count(Order.id))
        .where(Order.tenant_id == tenant_id)
        .where(Order.status == "IN_TRANSIT")
    ).one()

    # Delivered today
    today = datetime.utcnow().date()
    delivered_today = session.exec(
        select(func.count(Order.id))
        .where(Order.tenant_id == tenant_id)
        .where(Order.status == "DELIVERED")
        .where(func.date(Order.updated_at) == today)
    ).one()

    # Alerts count
    active_alerts = session.exec(
        select(func.count(DispatchAlert.id))
        .where(DispatchAlert.tenant_id == tenant_id)
        .where(DispatchAlert.is_resolved == False)
    ).one()

    # Pending AI decisions
    pending_ai = session.exec(
        select(func.count(AIDecision.id))
        .where(AIDecision.tenant_id == tenant_id)
        .where(AIDecision.status == "pending")
    ).one()

    # AI auto rate (mock for now)
    ai_auto_rate = 87.5

    return DispatchStats(
        total_vehicles=total_vehicles or 0,
        active_vehicles=active_vehicles or 0,
        available_vehicles=available_count or 0,
        on_trip_vehicles=on_trip_count or 0,
        total_drivers=total_drivers or 0,
        active_drivers=active_drivers or 0,
        pending_orders=pending_orders or 0,
        in_transit_orders=in_transit_orders or 0,
        delivered_today=delivered_today or 0,
        active_alerts=active_alerts or 0,
        pending_ai_decisions=pending_ai or 0,
        ai_auto_rate=ai_auto_rate,
    )


def _get_vehicles_with_gps(
    session: Session,
    tenant_id: str,
    status: Optional[str] = None,
    work_status: Optional[str] = None,
) -> List[VehicleDispatchInfo]:
    """Get vehicles with their GPS data and assigned drivers"""

    # Build query - Join Driver directly with Vehicle via tractor_id
    # This shows real vehicle-driver assignments from the database
    query = (
        select(Vehicle, VehicleGPS, Driver)
        .outerjoin(VehicleGPS, and_(
            VehicleGPS.vehicle_id == Vehicle.id,
            VehicleGPS.tenant_id == tenant_id
        ))
        .outerjoin(Driver, and_(
            Driver.tractor_id == Vehicle.id,
            Driver.tenant_id == tenant_id,
            Driver.status == "ACTIVE"
        ))
        .where(Vehicle.tenant_id == tenant_id)
    )

    if status:
        query = query.where(Vehicle.status == status)
    if work_status:
        query = query.where(VehicleGPS.work_status == work_status)

    query = query.order_by(Vehicle.plate_no)

    results = session.exec(query).all()

    vehicles = []
    for vehicle, gps, driver in results:
        # Use driver from GPS record if available, otherwise use assigned driver
        gps_driver_id = gps.driver_id if gps and gps.driver_id else None
        actual_driver = driver

        # If GPS has a different driver_id, try to fetch that driver
        if gps_driver_id and (not driver or driver.id != gps_driver_id):
            gps_driver = session.get(Driver, gps_driver_id)
            if gps_driver and str(gps_driver.tenant_id) == tenant_id:
                actual_driver = gps_driver

        vehicles.append(VehicleDispatchInfo(
            id=vehicle.id,
            plate_number=vehicle.plate_no,
            vehicle_type=vehicle.type,
            status=vehicle.status,
            work_status=gps.work_status if gps else VehicleWorkStatus.OFF_DUTY.value,
            driver_id=actual_driver.id if actual_driver else None,
            driver_name=actual_driver.name if actual_driver else None,
            driver_phone=actual_driver.phone if actual_driver else None,
            latitude=gps.latitude if gps else None,
            longitude=gps.longitude if gps else None,
            speed=gps.speed if gps else None,
            address=gps.address if gps else None,
            gps_timestamp=gps.gps_timestamp if gps else None,
            current_trip_id=gps.current_trip_id if gps else None,
            current_order_id=gps.current_order_id if gps else None,
            destination=gps.destination_address if gps else None,
            eta=gps.eta_destination if gps else None,
            remaining_km=gps.remaining_km if gps else None,
        ))

    return vehicles


def _get_active_alerts(
    session: Session,
    tenant_id: str,
    limit: int = 50,
    include_resolved: bool = False,
    severity: Optional[str] = None,
) -> List[AlertInfo]:
    """Get dispatch alerts"""

    query = (
        select(DispatchAlert, Vehicle, Driver)
        .outerjoin(Vehicle, Vehicle.id == DispatchAlert.vehicle_id)
        .outerjoin(Driver, Driver.id == DispatchAlert.driver_id)
        .where(DispatchAlert.tenant_id == tenant_id)
    )

    if not include_resolved:
        query = query.where(DispatchAlert.is_resolved == False)
    if severity:
        query = query.where(DispatchAlert.severity == severity)

    query = query.order_by(DispatchAlert.created_at.desc()).limit(limit)

    results = session.exec(query).all()

    alerts = []
    for alert, vehicle, driver in results:
        alerts.append(AlertInfo(
            id=alert.id,
            alert_type=alert.alert_type,
            severity=alert.severity,
            title=alert.title,
            message=alert.message,
            vehicle_id=alert.vehicle_id,
            plate_number=vehicle.plate_no if vehicle else None,
            driver_name=driver.name if driver else None,
            order_id=alert.order_id,
            created_at=alert.created_at,
            is_resolved=alert.is_resolved,
        ))

    return alerts


def _get_pending_ai_decisions(
    session: Session,
    tenant_id: str,
    limit: int = 20,
    status: str = "pending",
) -> List[AIDecisionInfo]:
    """Get AI decisions"""

    query = (
        select(AIDecision, Vehicle, Driver, Order)
        .outerjoin(Vehicle, Vehicle.id == AIDecision.vehicle_id)
        .outerjoin(Driver, Driver.id == AIDecision.driver_id)
        .outerjoin(Order, Order.id == AIDecision.order_id)
        .where(AIDecision.tenant_id == tenant_id)
        .where(AIDecision.status == status)
        .order_by(AIDecision.created_at.desc())
        .limit(limit)
    )

    results = session.exec(query).all()

    decisions = []
    for decision, vehicle, driver, order in results:
        decisions.append(AIDecisionInfo(
            id=decision.id,
            decision_type=decision.decision_type,
            title=decision.title,
            description=decision.description,
            confidence=decision.confidence,
            reasoning=decision.reasoning,
            vehicle_id=decision.vehicle_id,
            plate_number=vehicle.plate_no if vehicle else None,
            driver_name=driver.name if driver else None,
            order_id=decision.order_id,
            order_code=order.order_code if order else None,
            status=decision.status,
            created_at=decision.created_at,
        ))

    return decisions


def _get_recent_activity(
    session: Session,
    tenant_id: str,
    limit: int = 50,
) -> List[DispatchActivityLog]:
    """Get recent dispatch activity"""

    query = (
        select(DispatchLog, Vehicle, Driver)
        .outerjoin(Vehicle, Vehicle.id == DispatchLog.vehicle_id)
        .outerjoin(Driver, Driver.id == DispatchLog.driver_id)
        .where(DispatchLog.tenant_id == tenant_id)
        .order_by(DispatchLog.created_at.desc())
        .limit(limit)
    )

    results = session.exec(query).all()

    logs = []
    for log, vehicle, driver in results:
        logs.append(DispatchActivityLog(
            id=log.id,
            log_type=log.log_type,
            title=log.title,
            description=log.description,
            is_ai=log.is_ai,
            created_at=log.created_at,
            plate_number=vehicle.plate_no if vehicle else None,
            driver_name=driver.name if driver else None,
        ))

    return logs


def _get_unassigned_orders(
    session: Session,
    tenant_id: str,
    limit: int = 50,
) -> List[dict]:
    """Get orders without assigned driver/vehicle"""

    orders = session.exec(
        select(Order)
        .where(Order.tenant_id == tenant_id)
        .where(or_(Order.status == "NEW", Order.status == "ACCEPTED"))
        .where(or_(Order.driver_id == None, Order.driver_id == ""))
        .order_by(Order.order_date.desc())
        .limit(limit)
    ).all()

    return [
        {
            "id": o.id,
            "order_code": o.order_code,
            "status": o.status,
            "pickup_text": o.pickup_text,
            "delivery_text": o.delivery_text,
            "equipment": o.equipment,
            "customer_requested_date": o.customer_requested_date.isoformat() if o.customer_requested_date else None,
            "order_date": o.order_date.isoformat() if o.order_date else None,
        }
        for o in orders
    ]


def _log_dispatch_action(
    session: Session,
    tenant_id: str,
    user_id: Optional[str],
    log_type: str,
    title: str,
    description: Optional[str] = None,
    is_ai: bool = False,
    vehicle_id: Optional[str] = None,
    driver_id: Optional[str] = None,
    order_id: Optional[str] = None,
    trip_id: Optional[str] = None,
    alert_id: Optional[str] = None,
    ai_confidence: Optional[float] = None,
):
    """Create dispatch activity log"""
    log = DispatchLog(
        tenant_id=tenant_id,
        log_type=log_type,
        title=title,
        description=description,
        is_ai=is_ai,
        user_id=user_id,
        vehicle_id=vehicle_id,
        driver_id=driver_id,
        order_id=order_id,
        trip_id=trip_id,
        ai_confidence=ai_confidence,
    )
    session.add(log)
    session.commit()
    return log


def _update_vehicle_gps_from_mappings(
    session: Session,
    tenant_id: str,
    provider_id: Optional[str] = None,
):
    """
    Cập nhật VehicleGPS table từ GPSVehicleMapping.
    Điều này giúp merge dữ liệu GPS từ providers vào hệ thống dispatch.
    """
    # Get mappings with latest location data
    query = (
        select(GPSVehicleMapping)
        .where(GPSVehicleMapping.tenant_id == tenant_id)
        .where(GPSVehicleMapping.is_active == True)
        .where(GPSVehicleMapping.last_latitude != None)
    )

    if provider_id:
        query = query.where(GPSVehicleMapping.provider_id == provider_id)

    mappings = session.exec(query).all()

    updated_count = 0
    for mapping in mappings:
        # Find or create VehicleGPS record
        gps = session.exec(
            select(VehicleGPS)
            .where(VehicleGPS.tenant_id == tenant_id)
            .where(VehicleGPS.vehicle_id == mapping.vehicle_id)
        ).first()

        if gps:
            # Update existing record
            gps.latitude = mapping.last_latitude
            gps.longitude = mapping.last_longitude
            gps.speed = mapping.last_speed
            gps.heading = mapping.last_heading
            gps.address = mapping.last_address
            gps.gps_timestamp = mapping.last_location_at
            gps.updated_at = datetime.utcnow()
        else:
            # Create new GPS record
            # Try to get driver assigned to this vehicle
            vehicle = session.get(Vehicle, mapping.vehicle_id)
            driver_id = None
            if vehicle:
                # Find active driver for this vehicle (if any)
                # This is simplified - in reality might need more complex logic
                pass

            gps = VehicleGPS(
                tenant_id=tenant_id,
                vehicle_id=mapping.vehicle_id,
                driver_id=driver_id,
                latitude=mapping.last_latitude,
                longitude=mapping.last_longitude,
                speed=mapping.last_speed,
                heading=mapping.last_heading,
                address=mapping.last_address,
                gps_timestamp=mapping.last_location_at,
                work_status=VehicleWorkStatus.AVAILABLE.value,
            )

        session.add(gps)
        updated_count += 1

    if updated_count > 0:
        session.commit()

    return updated_count
