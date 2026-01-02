from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select, func
from app.db.session import get_session
from app.models import MaintenanceRecord, Vehicle, User
from app.core.security import get_current_user
from datetime import datetime, date as date_type
from typing import Optional, List, Dict
import calendar

router = APIRouter(prefix="/maintenance-reports", tags=["maintenance-reports"])


@router.get("/summary")
def get_maintenance_summary(
    year: int = Query(..., description="Year (e.g., 2025)"),
    month: int = Query(..., ge=1, le=12, description="Month (1-12)"),
    vehicle_id: Optional[str] = None,
    maintenance_type: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Get maintenance cost summary report for a given month
    Grouped by: vehicle, maintenance type
    """
    tenant_id = str(current_user.tenant_id)

    # Build query for completed maintenance records
    query = select(MaintenanceRecord).where(
        MaintenanceRecord.tenant_id == tenant_id,
        MaintenanceRecord.status == "COMPLETED",
        func.extract('year', MaintenanceRecord.service_date) == year,
        func.extract('month', MaintenanceRecord.service_date) == month
    )

    if vehicle_id:
        query = query.where(MaintenanceRecord.vehicle_id == vehicle_id)

    if maintenance_type:
        query = query.where(MaintenanceRecord.maintenance_type == maintenance_type)

    records = session.exec(query).all()

    # Get all vehicles for enrichment
    vehicle_ids = {r.vehicle_id for r in records}
    vehicles_map = {}
    if vehicle_ids:
        vehicles = session.exec(select(Vehicle).where(Vehicle.id.in_(vehicle_ids))).all()
        vehicles_map = {v.id: v for v in vehicles}

    # Calculate overall summary
    total_cost = sum(r.total_cost or 0 for r in records)
    total_records = len(records)
    average_cost_per_service = total_cost / total_records if total_records > 0 else 0

    # Group by vehicle
    vehicle_costs: Dict[str, Dict] = {}
    for record in records:
        if record.vehicle_id not in vehicle_costs:
            vehicle = vehicles_map.get(record.vehicle_id)
            vehicle_costs[record.vehicle_id] = {
                "vehicle_id": record.vehicle_id,
                "vehicle_plate": vehicle.plate_no if vehicle else "Unknown",
                "vehicle_code": vehicle.code if vehicle else "",
                "total_cost": 0,
                "service_count": 0
            }

        vehicle_costs[record.vehicle_id]["total_cost"] += record.total_cost or 0
        vehicle_costs[record.vehicle_id]["service_count"] += 1

    # Sort by cost descending
    by_vehicle = sorted(vehicle_costs.values(), key=lambda x: x["total_cost"], reverse=True)

    # Group by maintenance type
    type_costs: Dict[str, Dict] = {}
    for record in records:
        if record.maintenance_type not in type_costs:
            type_costs[record.maintenance_type] = {
                "maintenance_type": record.maintenance_type,
                "total_cost": 0,
                "service_count": 0
            }

        type_costs[record.maintenance_type]["total_cost"] += record.total_cost or 0
        type_costs[record.maintenance_type]["service_count"] += 1

    # Sort by cost descending
    by_type = sorted(type_costs.values(), key=lambda x: x["total_cost"], reverse=True)

    # Group by garage
    garage_costs: Dict[str, Dict] = {}
    for record in records:
        garage_key = record.garage_name or "Unknown"

        if garage_key not in garage_costs:
            garage_costs[garage_key] = {
                "garage_name": garage_key,
                "total_cost": 0,
                "service_count": 0
            }

        garage_costs[garage_key]["total_cost"] += record.total_cost or 0
        garage_costs[garage_key]["service_count"] += 1

    # Sort by cost descending
    by_garage = sorted(garage_costs.values(), key=lambda x: x["total_cost"], reverse=True)

    return {
        "year": year,
        "month": month,
        "summary": {
            "total_cost": total_cost,
            "total_services": total_records,
            "average_cost_per_service": int(average_cost_per_service)
        },
        "by_vehicle": by_vehicle,
        "by_type": by_type,
        "by_garage": by_garage
    }


@router.get("/monthly-trend")
def get_monthly_trend(
    year: int = Query(..., description="Year (e.g., 2025)"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Get monthly maintenance cost trend for the entire year
    Returns cost for each month (1-12)
    """
    tenant_id = str(current_user.tenant_id)

    monthly_data = []

    for month in range(1, 13):
        # Get maintenance records for this month
        records = session.exec(
            select(MaintenanceRecord).where(
                MaintenanceRecord.tenant_id == tenant_id,
                MaintenanceRecord.status == "COMPLETED",
                func.extract('year', MaintenanceRecord.service_date) == year,
                func.extract('month', MaintenanceRecord.service_date) == month
            )
        ).all()

        if not records:
            monthly_data.append({
                "month": month,
                "total_cost": 0,
                "service_count": 0,
                "average_cost": 0
            })
            continue

        total_cost = sum(r.total_cost or 0 for r in records)
        service_count = len(records)
        average_cost = total_cost / service_count if service_count > 0 else 0

        monthly_data.append({
            "month": month,
            "total_cost": total_cost,
            "service_count": service_count,
            "average_cost": int(average_cost)
        })

    return {
        "year": year,
        "monthly_data": monthly_data,
        "total_year_cost": sum(m["total_cost"] for m in monthly_data),
        "total_year_services": sum(m["service_count"] for m in monthly_data)
    }


@router.get("/by-type-detail")
def get_maintenance_by_type_detail(
    year: int = Query(..., description="Year (e.g., 2025)"),
    month: int = Query(..., ge=1, le=12, description="Month (1-12)"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Get detailed breakdown by maintenance type
    Shows which vehicles had which types of maintenance
    """
    tenant_id = str(current_user.tenant_id)

    records = session.exec(
        select(MaintenanceRecord).where(
            MaintenanceRecord.tenant_id == tenant_id,
            MaintenanceRecord.status == "COMPLETED",
            func.extract('year', MaintenanceRecord.service_date) == year,
            func.extract('month', MaintenanceRecord.service_date) == month
        )
    ).all()

    # Get vehicles
    vehicle_ids = {r.vehicle_id for r in records}
    vehicles_map = {}
    if vehicle_ids:
        vehicles = session.exec(select(Vehicle).where(Vehicle.id.in_(vehicle_ids))).all()
        vehicles_map = {v.id: v for v in vehicles}

    # Build detailed breakdown
    details = []
    for record in records:
        vehicle = vehicles_map.get(record.vehicle_id)
        details.append({
            "service_date": str(record.service_date),
            "vehicle_plate": vehicle.plate_no if vehicle else "Unknown",
            "vehicle_code": vehicle.code if vehicle else "",
            "maintenance_type": record.maintenance_type,
            "description": record.description,
            "garage_name": record.garage_name or "Unknown",
            "total_cost": record.total_cost or 0,
            "mileage": record.mileage
        })

    # Sort by date descending
    details.sort(key=lambda x: x["service_date"], reverse=True)

    return {
        "year": year,
        "month": month,
        "details": details
    }
