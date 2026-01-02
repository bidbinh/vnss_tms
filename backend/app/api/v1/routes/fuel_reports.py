from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from app.db.session import get_session
from app.models import FuelLog, Vehicle, User
from app.core.security import get_current_user
from datetime import date as date_type
from typing import Optional

router = APIRouter(prefix="/fuel-reports", tags=["fuel-reports"])


@router.get("/consumption")
def get_fuel_consumption_report(
    vehicle_id: Optional[str] = None,
    start_date: Optional[date_type] = None,
    end_date: Optional[date_type] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Get fuel consumption report with metrics:
    - Average fuel consumption (liters/100km)
    - Fuel cost per km
    - Total fuel, distance, cost
    Report can be filtered by vehicle and date range
    """
    tenant_id = str(current_user.tenant_id)

    # Build query
    stmt = select(FuelLog).where(FuelLog.tenant_id == tenant_id)

    if vehicle_id:
        stmt = stmt.where(FuelLog.vehicle_id == vehicle_id)
    if start_date:
        stmt = stmt.where(FuelLog.date >= start_date)
    if end_date:
        stmt = stmt.where(FuelLog.date <= end_date)

    # Get all fuel logs in the period
    fuel_logs = session.exec(stmt.order_by(FuelLog.vehicle_id, FuelLog.date)).all()

    # Get all vehicles for mapping
    vehicle_ids = {log.vehicle_id for log in fuel_logs}
    vehicles = session.exec(select(Vehicle).where(Vehicle.id.in_(vehicle_ids))).all()
    vehicle_map = {v.id: v for v in vehicles}

    # Group by vehicle and calculate metrics
    vehicle_stats = {}

    for log in fuel_logs:
        vid = log.vehicle_id
        if vid not in vehicle_stats:
            vehicle_stats[vid] = {
                "vehicle_id": vid,
                "vehicle_plate": vehicle_map.get(vid).plate_no if vehicle_map.get(vid) else None,
                "logs": [],
                "total_fuel_liters": 0,
                "total_cost": 0,
                "total_distance_km": 0,
                "first_odometer": None,
                "last_odometer": None,
            }

        vehicle_stats[vid]["logs"].append(log)
        vehicle_stats[vid]["total_fuel_liters"] += log.actual_liters
        vehicle_stats[vid]["total_cost"] += log.total_amount

        # Track first and last odometer readings
        if vehicle_stats[vid]["first_odometer"] is None:
            vehicle_stats[vid]["first_odometer"] = log.odometer_km
        vehicle_stats[vid]["last_odometer"] = log.odometer_km

    # Calculate metrics for each vehicle
    results = []
    total_fuel = 0
    total_cost = 0
    total_distance = 0

    for vid, stats in vehicle_stats.items():
        # Calculate distance and fuel consumption
        # IMPORTANT: Each fill-up is full tank. The fuel amount shows how much was consumed
        # since the PREVIOUS fill-up, not how much is currently in the tank.
        #
        # Example:
        # Fill 1: odometer=1000km, fuel=50L (we don't know distance before this)
        # Fill 2: odometer=1500km, fuel=40L -> consumed 40L in 500km
        # Fill 3: odometer=2000km, fuel=45L -> consumed 45L in 500km
        # Total: 1000km traveled, consumed 85L (Fill 2 + Fill 3)

        logs = sorted(stats["logs"], key=lambda x: x.odometer_km)

        if len(logs) >= 2:
            # Calculate from 2nd fill-up onwards
            distance = logs[-1].odometer_km - logs[0].odometer_km
            # Sum fuel from 2nd fill-up to last (fuel consumed between fills)
            fuel_consumed = sum(log.actual_liters for log in logs[1:])
            cost_consumed = sum(log.total_amount for log in logs[1:])
        else:
            # Not enough data (need at least 2 fill-ups)
            distance = 0
            fuel_consumed = 0
            cost_consumed = 0

        stats["total_distance_km"] = distance
        stats["total_fuel_liters"] = fuel_consumed
        stats["total_cost"] = cost_consumed

        # Calculate consumption metrics
        if distance > 0 and fuel_consumed > 0:
            # Liters per 100km
            consumption_per_100km = (fuel_consumed / distance) * 100
            # Cost per km
            cost_per_km = cost_consumed / distance
        else:
            consumption_per_100km = 0
            cost_per_km = 0

        result = {
            "vehicle_id": stats["vehicle_id"],
            "vehicle_plate": stats["vehicle_plate"],
            "total_fuel_liters": round(stats["total_fuel_liters"], 2),
            "total_cost": stats["total_cost"],
            "total_distance_km": distance,
            "consumption_per_100km": round(consumption_per_100km, 2),
            "cost_per_km": round(cost_per_km, 2),
            "fuel_log_count": len(stats["logs"]),
            "first_odometer": stats["first_odometer"],
            "last_odometer": stats["last_odometer"],
        }

        results.append(result)

        # Accumulate for fleet totals
        total_fuel += stats["total_fuel_liters"]
        total_cost += stats["total_cost"]
        total_distance += distance

    # Calculate fleet-wide metrics
    if total_distance > 0:
        fleet_consumption_per_100km = (total_fuel / total_distance) * 100
        fleet_cost_per_km = total_cost / total_distance
    else:
        fleet_consumption_per_100km = 0
        fleet_cost_per_km = 0

    fleet_summary = {
        "total_vehicles": len(results),
        "total_fuel_liters": round(total_fuel, 2),
        "total_cost": total_cost,
        "total_distance_km": total_distance,
        "avg_consumption_per_100km": round(fleet_consumption_per_100km, 2),
        "avg_cost_per_km": round(fleet_cost_per_km, 2),
    }

    return {
        "fleet_summary": fleet_summary,
        "vehicles": results,
        "period": {
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None,
        }
    }


@router.get("/trend")
def get_fuel_consumption_trend(
    vehicle_id: Optional[str] = None,
    start_date: Optional[date_type] = None,
    end_date: Optional[date_type] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Get fuel consumption trend over time
    Shows consumption metrics per fuel log entry
    """
    tenant_id = str(current_user.tenant_id)

    # Build query
    stmt = select(FuelLog).where(FuelLog.tenant_id == tenant_id)

    if vehicle_id:
        stmt = stmt.where(FuelLog.vehicle_id == vehicle_id)
    if start_date:
        stmt = stmt.where(FuelLog.date >= start_date)
    if end_date:
        stmt = stmt.where(FuelLog.date <= end_date)

    fuel_logs = session.exec(stmt.order_by(FuelLog.vehicle_id, FuelLog.date)).all()

    # Get vehicle info
    vehicle_ids = {log.vehicle_id for log in fuel_logs}
    vehicles = session.exec(select(Vehicle).where(Vehicle.id.in_(vehicle_ids))).all()
    vehicle_map = {v.id: v for v in vehicles}

    # Track previous odometer reading for each vehicle to calculate distance
    prev_odometer = {}
    results = []

    for log in fuel_logs:
        vid = log.vehicle_id

        # Calculate distance since last fill-up
        if vid in prev_odometer:
            distance = log.odometer_km - prev_odometer[vid]
        else:
            distance = 0

        # Calculate metrics for this fill-up
        if distance > 0:
            consumption_per_100km = (log.actual_liters / distance) * 100
            cost_per_km = log.total_amount / distance
        else:
            consumption_per_100km = 0
            cost_per_km = 0

        results.append({
            "date": log.date.isoformat(),
            "vehicle_id": vid,
            "vehicle_plate": vehicle_map.get(vid).plate_no if vehicle_map.get(vid) else None,
            "odometer_km": log.odometer_km,
            "distance_since_last": distance,
            "fuel_liters": log.actual_liters,
            "total_cost": log.total_amount,
            "consumption_per_100km": round(consumption_per_100km, 2) if distance > 0 else None,
            "cost_per_km": round(cost_per_km, 2) if distance > 0 else None,
        })

        # Update previous odometer
        prev_odometer[vid] = log.odometer_km

    return results
