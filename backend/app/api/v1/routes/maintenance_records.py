from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.db.session import get_session
from app.models import MaintenanceRecord, MaintenanceItem, MaintenanceSchedule, Vehicle, User
from app.core.security import get_current_user
from datetime import date, timedelta

router = APIRouter(prefix="/maintenance/records", tags=["maintenance"])


@router.get("")
def list_records(
    vehicle_id: str = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all maintenance records with vehicle and items info"""
    tenant_id = str(current_user.tenant_id)

    stmt = select(MaintenanceRecord).where(MaintenanceRecord.tenant_id == tenant_id)

    if vehicle_id:
        stmt = stmt.where(MaintenanceRecord.vehicle_id == vehicle_id)

    records = session.exec(stmt.order_by(MaintenanceRecord.service_date.desc())).all()

    # Enrich with vehicle info
    vehicle_ids = {r.vehicle_id for r in records}
    vehicles = session.exec(select(Vehicle).where(Vehicle.id.in_(vehicle_ids))).all()
    vehicle_map = {v.id: v for v in vehicles}

    # Get items for each record
    record_ids = {r.id for r in records}
    items = session.exec(
        select(MaintenanceItem).where(MaintenanceItem.record_id.in_(record_ids))
    ).all()
    items_by_record = {}
    for item in items:
        if item.record_id not in items_by_record:
            items_by_record[item.record_id] = []
        items_by_record[item.record_id].append(item.model_dump())

    result = []
    for record in records:
        vehicle = vehicle_map.get(record.vehicle_id)
        record_dict = record.model_dump()
        record_dict["vehicle_plate"] = vehicle.plate_no if vehicle else None
        record_dict["vehicle_model"] = vehicle.model if vehicle else None
        record_dict["items"] = items_by_record.get(record.id, [])
        record_dict["items_count"] = len(items_by_record.get(record.id, []))
        result.append(record_dict)

    return result


@router.get("/{record_id}")
def get_record(
    record_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get single maintenance record with all items"""
    tenant_id = str(current_user.tenant_id)

    record = session.get(MaintenanceRecord, record_id)
    if not record:
        raise HTTPException(404, "Record not found")
    if str(record.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    # Get items
    items = session.exec(
        select(MaintenanceItem).where(MaintenanceItem.record_id == record_id)
    ).all()

    # Get vehicle info
    vehicle = session.get(Vehicle, record.vehicle_id)

    record_dict = record.model_dump()
    record_dict["vehicle_plate"] = vehicle.plate_no if vehicle else None
    record_dict["vehicle_model"] = vehicle.model if vehicle else None
    record_dict["items"] = [item.model_dump() for item in items]

    return record_dict


@router.post("")
def create_record(
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create new maintenance record with items"""
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can create records")

    tenant_id = str(current_user.tenant_id)

    # Validate vehicle
    vehicle = session.get(Vehicle, payload["vehicle_id"])
    if not vehicle or str(vehicle.tenant_id) != tenant_id:
        raise HTTPException(404, "Vehicle not found")

    # Validate schedule if provided
    if payload.get("schedule_id"):
        schedule = session.get(MaintenanceSchedule, payload["schedule_id"])
        if not schedule or str(schedule.tenant_id) != tenant_id:
            raise HTTPException(404, "Schedule not found")

    # Create record
    record = MaintenanceRecord(
        tenant_id=tenant_id,
        vehicle_id=payload["vehicle_id"],
        schedule_id=payload.get("schedule_id"),
        maintenance_type=payload["maintenance_type"],
        service_date=payload["service_date"],
        mileage=payload.get("mileage"),
        description=payload["description"],
        garage_name=payload.get("garage_name"),
        mechanic_name=payload.get("mechanic_name"),
        garage_address=payload.get("garage_address"),
        garage_phone=payload.get("garage_phone"),
        driver_name=payload.get("driver_name"),
        total_cost=payload.get("total_cost", 0),
        attachments=payload.get("attachments"),
        note=payload.get("note"),
        status=payload.get("status", "COMPLETED"),
    )

    session.add(record)
    session.commit()
    session.refresh(record)

    # Create items if provided
    items_data = payload.get("items", [])
    for item_data in items_data:
        item = MaintenanceItem(
            tenant_id=tenant_id,
            record_id=record.id,
            item_type=item_data["item_type"],
            item_name=item_data["item_name"],
            quantity=item_data.get("quantity", 1),
            unit=item_data.get("unit"),
            unit_price=item_data["unit_price"],
            total_price=item_data["total_price"],
            supplier=item_data.get("supplier"),
            part_number=item_data.get("part_number"),
            warranty_months=item_data.get("warranty_months"),
            note=item_data.get("note"),
        )
        session.add(item)

    session.commit()

    # Update schedule if linked
    if payload.get("schedule_id"):
        schedule = session.get(MaintenanceSchedule, payload["schedule_id"])
        if schedule:
            schedule.last_service_date = record.service_date
            schedule.last_service_mileage = record.mileage

            # Calculate next due
            if schedule.interval_days:
                schedule.next_due_date = record.service_date + timedelta(days=schedule.interval_days)
            if schedule.interval_km and record.mileage:
                schedule.next_due_mileage = record.mileage + schedule.interval_km

            session.add(schedule)
            session.commit()

    return record


@router.put("/{record_id}")
def update_record(
    record_id: str,
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update maintenance record"""
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can update records")

    tenant_id = str(current_user.tenant_id)
    record = session.get(MaintenanceRecord, record_id)
    if not record:
        raise HTTPException(404, "Record not found")
    if str(record.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    # Update fields
    if "maintenance_type" in payload:
        record.maintenance_type = payload["maintenance_type"]
    if "service_date" in payload:
        record.service_date = payload["service_date"]
    if "mileage" in payload:
        record.mileage = payload["mileage"]
    if "description" in payload:
        record.description = payload["description"]
    if "garage_name" in payload:
        record.garage_name = payload["garage_name"]
    if "mechanic_name" in payload:
        record.mechanic_name = payload["mechanic_name"]
    if "garage_address" in payload:
        record.garage_address = payload["garage_address"]
    if "garage_phone" in payload:
        record.garage_phone = payload["garage_phone"]
    if "driver_name" in payload:
        record.driver_name = payload["driver_name"]
    if "total_cost" in payload:
        record.total_cost = payload["total_cost"]
    if "attachments" in payload:
        record.attachments = payload["attachments"]
    if "note" in payload:
        record.note = payload["note"]
    if "status" in payload:
        record.status = payload["status"]

    # Update items if provided
    if "items" in payload:
        # Delete existing items
        existing_items = session.exec(
            select(MaintenanceItem).where(MaintenanceItem.record_id == record_id)
        ).all()
        for item in existing_items:
            session.delete(item)

        session.flush()

        # Create new items
        for item_data in payload["items"]:
            item = MaintenanceItem(
                tenant_id=tenant_id,
                record_id=record.id,
                item_type=item_data["item_type"],
                item_name=item_data["item_name"],
                quantity=item_data.get("quantity", 1),
                unit=item_data.get("unit"),
                unit_price=item_data["unit_price"],
                total_price=item_data["total_price"],
                supplier=item_data.get("supplier"),
                part_number=item_data.get("part_number"),
                warranty_months=item_data.get("warranty_months"),
                note=item_data.get("note"),
            )
            session.add(item)

    session.add(record)
    session.commit()
    session.refresh(record)
    return record


@router.delete("/{record_id}")
def delete_record(
    record_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete maintenance record and all its items"""
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can delete records")

    tenant_id = str(current_user.tenant_id)
    record = session.get(MaintenanceRecord, record_id)
    if not record:
        raise HTTPException(404, "Record not found")
    if str(record.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    session.delete(record)
    session.commit()
    return {"ok": True}


@router.get("/stats/by-vehicle")
def get_stats_by_vehicle(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get maintenance statistics by vehicle"""
    tenant_id = str(current_user.tenant_id)

    records = session.exec(
        select(MaintenanceRecord).where(MaintenanceRecord.tenant_id == tenant_id)
    ).all()

    # Group by vehicle
    stats_by_vehicle = {}
    for record in records:
        if record.vehicle_id not in stats_by_vehicle:
            stats_by_vehicle[record.vehicle_id] = {
                "total_records": 0,
                "total_cost": 0,
                "by_type": {},
            }

        stats_by_vehicle[record.vehicle_id]["total_records"] += 1
        stats_by_vehicle[record.vehicle_id]["total_cost"] += record.total_cost or 0

        if record.maintenance_type not in stats_by_vehicle[record.vehicle_id]["by_type"]:
            stats_by_vehicle[record.vehicle_id]["by_type"][record.maintenance_type] = {
                "count": 0,
                "total_cost": 0,
            }

        stats_by_vehicle[record.vehicle_id]["by_type"][record.maintenance_type]["count"] += 1
        stats_by_vehicle[record.vehicle_id]["by_type"][record.maintenance_type]["total_cost"] += record.total_cost or 0

    # Enrich with vehicle info
    vehicle_ids = list(stats_by_vehicle.keys())
    vehicles = session.exec(select(Vehicle).where(Vehicle.id.in_(vehicle_ids))).all()
    vehicle_map = {v.id: v for v in vehicles}

    result = []
    for vehicle_id, stats in stats_by_vehicle.items():
        vehicle = vehicle_map.get(vehicle_id)
        if vehicle:
            result.append({
                "vehicle_id": vehicle_id,
                "vehicle_plate": vehicle.plate_no,
                "vehicle_model": vehicle.model,
                **stats,
            })

    return result
