from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.db.session import get_session
from app.models import MaintenanceSchedule, Vehicle, User
from app.core.security import get_current_user
from datetime import date, timedelta

router = APIRouter(prefix="/maintenance/schedules", tags=["maintenance"])


@router.get("")
def list_schedules(
    vehicle_id: str = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all maintenance schedules with vehicle info"""
    tenant_id = str(current_user.tenant_id)

    stmt = select(MaintenanceSchedule).where(MaintenanceSchedule.tenant_id == tenant_id)

    if vehicle_id:
        stmt = stmt.where(MaintenanceSchedule.vehicle_id == vehicle_id)

    schedules = session.exec(stmt.order_by(MaintenanceSchedule.created_at.desc())).all()

    # Enrich with vehicle info
    vehicle_ids = {s.vehicle_id for s in schedules}
    vehicles = session.exec(select(Vehicle).where(Vehicle.id.in_(vehicle_ids))).all()
    vehicle_map = {v.id: v for v in vehicles}

    result = []
    for schedule in schedules:
        vehicle = vehicle_map.get(schedule.vehicle_id)
        schedule_dict = schedule.model_dump()
        schedule_dict["vehicle_plate"] = vehicle.plate_no if vehicle else None
        schedule_dict["vehicle_model"] = vehicle.model if vehicle else None

        # Calculate alert status
        alert_status = "OK"
        if schedule.next_due_date:
            days_until = (schedule.next_due_date - date.today()).days
            if days_until < 0:
                alert_status = "OVERDUE"
            elif days_until <= (schedule.alert_before_days or 7):
                alert_status = "DUE_SOON"

        schedule_dict["alert_status"] = alert_status
        result.append(schedule_dict)

    return result


@router.post("")
def create_schedule(
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create new maintenance schedule"""
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can create schedules")

    tenant_id = str(current_user.tenant_id)

    # Validate vehicle
    vehicle = session.get(Vehicle, payload["vehicle_id"])
    if not vehicle or str(vehicle.tenant_id) != tenant_id:
        raise HTTPException(404, "Vehicle not found")

    # Calculate next due date/mileage
    next_due_date = None
    next_due_mileage = None

    if payload.get("last_service_date") and payload.get("interval_days"):
        last_date = date.fromisoformat(payload["last_service_date"])
        next_due_date = last_date + timedelta(days=payload["interval_days"])

    if payload.get("last_service_mileage") and payload.get("interval_km"):
        next_due_mileage = payload["last_service_mileage"] + payload["interval_km"]

    schedule = MaintenanceSchedule(
        tenant_id=tenant_id,
        vehicle_id=payload["vehicle_id"],
        maintenance_type=payload["maintenance_type"],
        interval_type=payload["interval_type"],
        interval_km=payload.get("interval_km"),
        interval_days=payload.get("interval_days"),
        last_service_date=payload.get("last_service_date"),
        last_service_mileage=payload.get("last_service_mileage"),
        next_due_date=next_due_date,
        next_due_mileage=next_due_mileage,
        alert_before_days=payload.get("alert_before_days", 7),
        alert_before_km=payload.get("alert_before_km", 500),
        description=payload.get("description"),
        status=payload.get("status", "ACTIVE"),
    )

    session.add(schedule)
    session.commit()
    session.refresh(schedule)
    return schedule


@router.put("/{schedule_id}")
def update_schedule(
    schedule_id: str,
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update maintenance schedule"""
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can update schedules")

    tenant_id = str(current_user.tenant_id)
    schedule = session.get(MaintenanceSchedule, schedule_id)
    if not schedule:
        raise HTTPException(404, "Schedule not found")
    if str(schedule.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    # Update fields
    if "maintenance_type" in payload:
        schedule.maintenance_type = payload["maintenance_type"]
    if "interval_type" in payload:
        schedule.interval_type = payload["interval_type"]
    if "interval_km" in payload:
        schedule.interval_km = payload["interval_km"]
    if "interval_days" in payload:
        schedule.interval_days = payload["interval_days"]
    if "last_service_date" in payload:
        schedule.last_service_date = payload["last_service_date"]
    if "last_service_mileage" in payload:
        schedule.last_service_mileage = payload["last_service_mileage"]
    if "alert_before_days" in payload:
        schedule.alert_before_days = payload["alert_before_days"]
    if "alert_before_km" in payload:
        schedule.alert_before_km = payload["alert_before_km"]
    if "description" in payload:
        schedule.description = payload["description"]
    if "status" in payload:
        schedule.status = payload["status"]

    # Recalculate next due
    if schedule.last_service_date and schedule.interval_days:
        schedule.next_due_date = schedule.last_service_date + timedelta(days=schedule.interval_days)

    if schedule.last_service_mileage and schedule.interval_km:
        schedule.next_due_mileage = schedule.last_service_mileage + schedule.interval_km

    session.add(schedule)
    session.commit()
    session.refresh(schedule)
    return schedule


@router.delete("/{schedule_id}")
def delete_schedule(
    schedule_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete maintenance schedule"""
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can delete schedules")

    tenant_id = str(current_user.tenant_id)
    schedule = session.get(MaintenanceSchedule, schedule_id)
    if not schedule:
        raise HTTPException(404, "Schedule not found")
    if str(schedule.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    session.delete(schedule)
    session.commit()
    return {"ok": True}


@router.get("/alerts")
def get_alerts(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get maintenance alerts (overdue and due soon)"""
    tenant_id = str(current_user.tenant_id)

    schedules = session.exec(
        select(MaintenanceSchedule)
        .where(MaintenanceSchedule.tenant_id == tenant_id)
        .where(MaintenanceSchedule.status == "ACTIVE")
    ).all()

    # Get vehicle info
    vehicle_ids = {s.vehicle_id for s in schedules}
    vehicles = session.exec(select(Vehicle).where(Vehicle.id.in_(vehicle_ids))).all()
    vehicle_map = {v.id: v for v in vehicles}

    alerts = []
    today = date.today()

    for schedule in schedules:
        vehicle = vehicle_map.get(schedule.vehicle_id)
        if not vehicle:
            continue

        alert = None

        # Check date-based alert
        if schedule.next_due_date:
            days_until = (schedule.next_due_date - today).days
            if days_until < 0:
                alert = {
                    "schedule_id": schedule.id,
                    "vehicle_id": schedule.vehicle_id,
                    "vehicle_plate": vehicle.plate_no,
                    "maintenance_type": schedule.maintenance_type,
                    "alert_type": "OVERDUE",
                    "days_overdue": abs(days_until),
                    "next_due_date": schedule.next_due_date.isoformat(),
                }
            elif days_until <= (schedule.alert_before_days or 7):
                alert = {
                    "schedule_id": schedule.id,
                    "vehicle_id": schedule.vehicle_id,
                    "vehicle_plate": vehicle.plate_no,
                    "maintenance_type": schedule.maintenance_type,
                    "alert_type": "DUE_SOON",
                    "days_until": days_until,
                    "next_due_date": schedule.next_due_date.isoformat(),
                }

        # Note: Mileage-based alerts disabled - Vehicle model doesn't have current_mileage field
        # To enable, add current_mileage field to Vehicle model

        if alert:
            alerts.append(alert)

    return alerts
