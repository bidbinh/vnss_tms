from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select, func
from app.db.session import get_session
from app.models import (
    Vehicle, Driver, Order, MaintenanceRecord, MaintenanceSchedule,
    Trip, User, FuelLog, Customer
)
from app.core.security import get_current_user
from datetime import date, timedelta, datetime
from typing import Optional
from decimal import Decimal

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
def get_dashboard_stats(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get overall dashboard statistics"""
    tenant_id = str(current_user.tenant_id)
    today = date.today()
    month_start = today.replace(day=1)

    # Vehicle stats - separated by type (TRACTOR/TRAILER)
    # Tractors (Đầu kéo)
    total_tractors = session.exec(
        select(func.count(Vehicle.id))
        .where(Vehicle.tenant_id == tenant_id)
        .where(Vehicle.type == "TRACTOR")
    ).one()

    active_tractors = session.exec(
        select(func.count(Vehicle.id))
        .where(Vehicle.tenant_id == tenant_id)
        .where(Vehicle.type == "TRACTOR")
        .where(Vehicle.status == "ACTIVE")
    ).one()

    # Trailers (Rơ mooc)
    total_trailers = session.exec(
        select(func.count(Vehicle.id))
        .where(Vehicle.tenant_id == tenant_id)
        .where(Vehicle.type == "TRAILER")
    ).one()

    active_trailers = session.exec(
        select(func.count(Vehicle.id))
        .where(Vehicle.tenant_id == tenant_id)
        .where(Vehicle.type == "TRAILER")
        .where(Vehicle.status == "ACTIVE")
    ).one()

    # Driver stats - only active drivers
    active_drivers = session.exec(
        select(func.count(Driver.id))
        .where(Driver.tenant_id == tenant_id)
        .where(Driver.status == "ACTIVE")
    ).one()

    # Order stats for today
    total_orders_today = session.exec(
        select(func.count(Order.id))
        .where(Order.tenant_id == tenant_id)
        .where(func.date(Order.created_at) == today)
    ).one()

    completed_orders_today = session.exec(
        select(func.count(Order.id))
        .where(Order.tenant_id == tenant_id)
        .where(func.date(Order.created_at) == today)
        .where(Order.status == "COMPLETED")
    ).one()

    # Maintenance cost this month - only for TRACTOR vehicles
    tractor_ids = session.exec(
        select(Vehicle.id)
        .where(Vehicle.tenant_id == tenant_id)
        .where(Vehicle.type == "TRACTOR")
    ).all()

    if tractor_ids:
        maintenance_cost_month = session.exec(
            select(func.coalesce(func.sum(MaintenanceRecord.total_cost), 0))
            .where(MaintenanceRecord.tenant_id == tenant_id)
            .where(MaintenanceRecord.service_date >= month_start)
            .where(MaintenanceRecord.vehicle_id.in_(tractor_ids))
        ).one()
    else:
        maintenance_cost_month = 0

    return {
        "tractors": {
            "total": total_tractors,
            "active": active_tractors,
            "inactive": total_tractors - active_tractors,
        },
        "trailers": {
            "total": total_trailers,
            "active": active_trailers,
            "inactive": total_trailers - active_trailers,
        },
        "drivers": {
            "active": active_drivers,
        },
        "orders_today": {
            "total": total_orders_today,
            "completed": completed_orders_today,
            "in_progress": total_orders_today - completed_orders_today,
        },
        "maintenance_cost_month": maintenance_cost_month,
    }


@router.get("/alerts")
def get_dashboard_alerts(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get critical alerts for dashboard"""
    tenant_id = str(current_user.tenant_id)
    today = date.today()
    in_30_days = today + timedelta(days=30)

    # Maintenance overdue/due soon
    schedules = session.exec(
        select(MaintenanceSchedule)
        .where(MaintenanceSchedule.tenant_id == tenant_id)
        .where(MaintenanceSchedule.status == "ACTIVE")
    ).all()

    maintenance_overdue = []
    maintenance_due_soon = []

    for schedule in schedules:
        if schedule.next_due_date:
            days_until = (schedule.next_due_date - today).days
            vehicle = session.get(Vehicle, schedule.vehicle_id)

            alert_data = {
                "schedule_id": schedule.id,
                "vehicle_plate": vehicle.plate_no if vehicle else None,
                "maintenance_type": schedule.maintenance_type,
                "next_due_date": schedule.next_due_date.isoformat(),
            }

            if days_until < 0:
                alert_data["days_overdue"] = abs(days_until)
                maintenance_overdue.append(alert_data)
            elif days_until <= 7:
                alert_data["days_until"] = days_until
                maintenance_due_soon.append(alert_data)

    # Registration expiring soon
    vehicles_registration_expiring = session.exec(
        select(Vehicle)
        .where(Vehicle.tenant_id == tenant_id)
        .where(Vehicle.registration_expiry.isnot(None))
        .where(Vehicle.registration_expiry <= in_30_days)
        .where(Vehicle.registration_expiry >= today)
    ).all()

    registration_alerts = [
        {
            "vehicle_id": v.id,
            "vehicle_plate": v.plate_no,
            "registration_expiry": v.registration_expiry.isoformat(),
            "days_until": (v.registration_expiry - today).days,
        }
        for v in vehicles_registration_expiring
    ]

    # Inactive vehicles count
    inactive_vehicles_count = session.exec(
        select(func.count(Vehicle.id))
        .where(Vehicle.tenant_id == tenant_id)
        .where(Vehicle.status == "INACTIVE")
    ).one()

    return {
        "maintenance_overdue": maintenance_overdue,
        "maintenance_due_soon": maintenance_due_soon,
        "registration_expiring": registration_alerts,
        "inactive_vehicles_count": inactive_vehicles_count,
    }


@router.get("/charts/orders-trend")
def get_orders_trend(
    days: int = 30,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get order trend data for chart"""
    tenant_id = str(current_user.tenant_id)
    today = date.today()
    start_date = today - timedelta(days=days - 1)

    # Get orders grouped by date
    orders = session.exec(
        select(Order)
        .where(Order.tenant_id == tenant_id)
        .where(func.date(Order.created_at) >= start_date)
    ).all()

    # Group by date
    date_counts = {}
    for order in orders:
        order_date = order.created_at.date() if isinstance(order.created_at, datetime) else order.created_at
        date_str = order_date.isoformat()
        if date_str not in date_counts:
            date_counts[date_str] = {"total": 0, "completed": 0}
        date_counts[date_str]["total"] += 1
        if order.status == "COMPLETED":
            date_counts[date_str]["completed"] += 1

    # Fill in missing dates with 0
    result = []
    for i in range(days):
        current_date = start_date + timedelta(days=i)
        date_str = current_date.isoformat()
        result.append({
            "date": date_str,
            "total": date_counts.get(date_str, {}).get("total", 0),
            "completed": date_counts.get(date_str, {}).get("completed", 0),
        })

    return result


@router.get("/charts/vehicle-distribution")
def get_vehicle_distribution(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get vehicle distribution by type"""
    tenant_id = str(current_user.tenant_id)

    vehicles = session.exec(
        select(Vehicle).where(Vehicle.tenant_id == tenant_id)
    ).all()

    distribution = {}
    for vehicle in vehicles:
        vtype = vehicle.type or "UNKNOWN"
        if vtype not in distribution:
            distribution[vtype] = {"active": 0, "inactive": 0}

        if vehicle.status == "ACTIVE":
            distribution[vtype]["active"] += 1
        else:
            distribution[vtype]["inactive"] += 1

    return [
        {
            "type": vtype,
            "active": counts["active"],
            "inactive": counts["inactive"],
            "total": counts["active"] + counts["inactive"],
        }
        for vtype, counts in distribution.items()
    ]


@router.get("/charts/maintenance-cost")
def get_maintenance_cost_breakdown(
    months: int = 3,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get maintenance cost breakdown by type"""
    tenant_id = str(current_user.tenant_id)
    today = date.today()
    start_date = today - timedelta(days=months * 30)

    records = session.exec(
        select(MaintenanceRecord)
        .where(MaintenanceRecord.tenant_id == tenant_id)
        .where(MaintenanceRecord.service_date >= start_date)
    ).all()

    cost_by_type = {}
    for record in records:
        mtype = record.maintenance_type
        if mtype not in cost_by_type:
            cost_by_type[mtype] = 0
        cost_by_type[mtype] += record.total_cost or 0

    return [
        {
            "maintenance_type": mtype,
            "total_cost": cost,
        }
        for mtype, cost in cost_by_type.items()
    ]


@router.get("/recent-activities")
def get_recent_activities(
    limit: int = 10,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get recent activities (orders, trips, maintenance)"""
    tenant_id = str(current_user.tenant_id)

    # Recent orders
    recent_orders = session.exec(
        select(Order)
        .where(Order.tenant_id == tenant_id)
        .order_by(Order.created_at.desc())
        .limit(5)
    ).all()

    # Recent maintenance
    recent_maintenance = session.exec(
        select(MaintenanceRecord)
        .where(MaintenanceRecord.tenant_id == tenant_id)
        .order_by(MaintenanceRecord.service_date.desc())
        .limit(5)
    ).all()

    # Get vehicle info for maintenance
    vehicle_ids = {m.vehicle_id for m in recent_maintenance}
    vehicles = session.exec(select(Vehicle).where(Vehicle.id.in_(vehicle_ids))).all()
    vehicle_map = {v.id: v for v in vehicles}

    return {
        "recent_orders": [
            {
                "id": order.id,
                "order_code": order.order_code,
                "created_at": order.created_at.isoformat() if order.created_at else None,
                "status": order.status,
                "pickup_address": order.pickup_text or "",
                "delivery_address": order.delivery_text or "",
            }
            for order in recent_orders
        ],
        "recent_maintenance": [
            {
                "id": record.id,
                "vehicle_plate": vehicle_map.get(record.vehicle_id).plate_no if vehicle_map.get(record.vehicle_id) else None,
                "maintenance_type": record.maintenance_type,
                "service_date": record.service_date.isoformat(),
                "total_cost": record.total_cost,
            }
            for record in recent_maintenance
        ],
    }


@router.get("/top-vehicles")
def get_top_vehicles(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get top performing vehicles"""
    tenant_id = str(current_user.tenant_id)
    today = date.today()
    month_start = today.replace(day=1)

    # Get maintenance costs by vehicle this month
    records = session.exec(
        select(MaintenanceRecord)
        .where(MaintenanceRecord.tenant_id == tenant_id)
        .where(MaintenanceRecord.service_date >= month_start)
    ).all()

    cost_by_vehicle = {}
    for record in records:
        vid = record.vehicle_id
        if vid not in cost_by_vehicle:
            cost_by_vehicle[vid] = 0
        cost_by_vehicle[vid] += record.total_cost or 0

    # Get vehicle info
    vehicle_ids = list(cost_by_vehicle.keys())
    vehicles = session.exec(select(Vehicle).where(Vehicle.id.in_(vehicle_ids))).all()
    vehicle_map = {v.id: v for v in vehicles}

    # Sort by cost descending
    top_costly = sorted(cost_by_vehicle.items(), key=lambda x: x[1], reverse=True)[:5]

    return {
        "top_costly_maintenance": [
            {
                "vehicle_id": vid,
                "vehicle_plate": vehicle_map.get(vid).plate_no if vehicle_map.get(vid) else None,
                "total_cost": cost,
            }
            for vid, cost in top_costly
        ],
    }


@router.get("/fuel-consumption")
def get_fuel_consumption_stats(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get fuel consumption statistics - 30 days, liters per 100km, and vehicle rankings with last 7 refuels consumption"""
    tenant_id = str(current_user.tenant_id)
    today = date.today()

    # 30 days stats
    start_30_days = today - timedelta(days=30)
    fuel_logs_30 = session.exec(
        select(FuelLog)
        .where(FuelLog.tenant_id == tenant_id)
        .where(FuelLog.date >= start_30_days)
        .order_by(FuelLog.vehicle_id, FuelLog.date)
    ).all()

    # Group logs by vehicle
    logs_by_vehicle = {}
    for log in fuel_logs_30:
        vid = log.vehicle_id
        if vid not in logs_by_vehicle:
            logs_by_vehicle[vid] = []
        logs_by_vehicle[vid].append(log)

    # Calculate lít/100km for each vehicle using proper logic:
    # - Fuel consumed = sum of fuel from 2nd fill-up onwards (fuel shows what was consumed since previous fill)
    # - Distance = last_odometer - first_odometer
    liters_per_100km_by_vehicle = {}
    vehicle_stats = {}

    for vid, logs in logs_by_vehicle.items():
        sorted_logs = sorted(logs, key=lambda x: x.odometer_km)

        if len(sorted_logs) >= 2:
            distance = sorted_logs[-1].odometer_km - sorted_logs[0].odometer_km
            # Sum fuel from 2nd fill-up to last (fuel consumed between fills)
            fuel_consumed = sum(log.actual_liters for log in sorted_logs[1:])

            if distance > 0 and fuel_consumed > 0:
                liters_per_100km_by_vehicle[vid] = (fuel_consumed / distance) * 100
            else:
                liters_per_100km_by_vehicle[vid] = 0

            vehicle_stats[vid] = {
                "total_liters": fuel_consumed,
                "distance": distance,
            }
        else:
            liters_per_100km_by_vehicle[vid] = 0
            vehicle_stats[vid] = {
                "total_liters": sum(log.actual_liters for log in sorted_logs),
                "distance": 0,
            }

    # Calculate totals for 30 days
    total_fuel_30 = sum(stats["total_liters"] for stats in vehicle_stats.values())
    total_km_30 = sum(stats["distance"] for stats in vehicle_stats.values())
    overall_liters_per_100km = (total_fuel_30 / total_km_30 * 100) if total_km_30 > 0 else 0

    # Get vehicle info for all vehicles with consumption
    vehicle_ids = list(logs_by_vehicle.keys())
    vehicles = session.exec(select(Vehicle).where(Vehicle.id.in_(vehicle_ids))).all() if vehicle_ids else []
    vehicle_map = {v.id: v for v in vehicles}

    # Calculate lít/100km for last 7 refuels for each vehicle
    last_7_consumption_by_vehicle = {}
    for vid in vehicle_ids:
        # Get last 8 logs to calculate consumption for last 7 (need previous reference)
        last_8_logs = session.exec(
            select(FuelLog)
            .where(FuelLog.tenant_id == tenant_id)
            .where(FuelLog.vehicle_id == vid)
            .order_by(FuelLog.date.desc())
            .limit(8)
        ).all()

        if len(last_8_logs) >= 2:
            # Sort by odometer ascending
            sorted_logs = sorted(last_8_logs, key=lambda x: x.odometer_km)
            distance = sorted_logs[-1].odometer_km - sorted_logs[0].odometer_km
            # Fuel consumed from 2nd fill onwards
            fuel_consumed = sum(log.actual_liters for log in sorted_logs[1:])

            if distance > 0 and fuel_consumed > 0:
                last_7_consumption_by_vehicle[vid] = (fuel_consumed / distance) * 100
            else:
                last_7_consumption_by_vehicle[vid] = 0
        else:
            last_7_consumption_by_vehicle[vid] = 0

    # Top 5 vehicles by consumption (sorted by liters_per_100km in 30 days - highest first)
    top_consuming_vehicles = sorted(
        [(vid, stats) for vid, stats in vehicle_stats.items() if liters_per_100km_by_vehicle.get(vid, 0) > 0],
        key=lambda x: liters_per_100km_by_vehicle.get(x[0], 0),
        reverse=True
    )[:5]

    top_vehicles_list = [
        {
            "vehicle_id": vid,
            "vehicle_plate": vehicle_map.get(vid).plate_no if vehicle_map.get(vid) else None,
            "total_liters": round(stats["total_liters"], 2),
            "liters_per_100km": round(liters_per_100km_by_vehicle.get(vid, 0), 2),
            "last_7_consumption": round(last_7_consumption_by_vehicle.get(vid, 0), 2),
        }
        for vid, stats in top_consuming_vehicles
    ]

    return {
        "period_30_days": {
            "total_liters": round(total_fuel_30, 2),
            "total_amount": sum(log.total_amount or 0 for log in fuel_logs_30),
            "total_km": total_km_30,
            "liters_per_100km": round(overall_liters_per_100km, 2),
        },
        "top_consuming_vehicles": top_vehicles_list,
        "total_vehicles_with_fuel": len(logs_by_vehicle),
    }


@router.get("/maintenance-avg-cost")
def get_maintenance_avg_cost(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get average maintenance cost per vehicle for last 6 months"""
    tenant_id = str(current_user.tenant_id)
    today = date.today()
    start_6_months = today - timedelta(days=180)

    # Get all maintenance records in last 6 months
    records = session.exec(
        select(MaintenanceRecord)
        .where(MaintenanceRecord.tenant_id == tenant_id)
        .where(MaintenanceRecord.service_date >= start_6_months)
    ).all()

    # Calculate total cost and unique vehicles
    total_cost = sum(r.total_cost or 0 for r in records)
    vehicles_with_maintenance = set(r.vehicle_id for r in records)

    # Get total active vehicles
    total_vehicles = session.exec(
        select(func.count(Vehicle.id))
        .where(Vehicle.tenant_id == tenant_id)
        .where(Vehicle.status == "ACTIVE")
    ).one() or 1

    avg_cost_per_vehicle = total_cost / total_vehicles if total_vehicles > 0 else 0

    # Cost breakdown by month
    monthly_costs = {}
    for record in records:
        month_key = record.service_date.strftime("%Y-%m")
        if month_key not in monthly_costs:
            monthly_costs[month_key] = 0
        monthly_costs[month_key] += record.total_cost or 0

    return {
        "total_cost_6_months": total_cost,
        "avg_cost_per_vehicle": round(avg_cost_per_vehicle, 0),
        "total_vehicles": total_vehicles,
        "vehicles_with_maintenance": len(vehicles_with_maintenance),
        "monthly_breakdown": [
            {"month": month, "cost": cost}
            for month, cost in sorted(monthly_costs.items())
        ],
    }


@router.get("/trip-stats")
def get_trip_stats(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get trip statistics - total trips and average per driver for last 30 days"""
    tenant_id = str(current_user.tenant_id)
    today = date.today()
    start_30_days = today - timedelta(days=30)

    # Get completed orders in last 30 days (orders represent trips)
    orders = session.exec(
        select(Order)
        .where(Order.tenant_id == tenant_id)
        .where(Order.order_date >= datetime.combine(start_30_days, datetime.min.time()))
        .where(Order.status.in_(["COMPLETED", "DELIVERED", "EMPTY_RETURN"]))
    ).all()

    total_trips = len(orders)

    # Calculate trips per driver
    trips_by_driver = {}
    for order in orders:
        if order.driver_id:
            if order.driver_id not in trips_by_driver:
                trips_by_driver[order.driver_id] = 0
            trips_by_driver[order.driver_id] += 1

    # Get total active drivers
    total_drivers = session.exec(
        select(func.count(Driver.id))
        .where(Driver.tenant_id == tenant_id)
        .where(Driver.status == "ACTIVE")
    ).one() or 1

    avg_trips_per_driver = total_trips / total_drivers if total_drivers > 0 else 0

    # Get driver info for ranking
    driver_ids = list(trips_by_driver.keys())
    drivers = session.exec(select(Driver).where(Driver.id.in_(driver_ids))).all() if driver_ids else []
    driver_map = {d.id: d for d in drivers}

    # Top drivers by trip count
    top_drivers = sorted(trips_by_driver.items(), key=lambda x: x[1], reverse=True)[:5]

    return {
        "total_trips": total_trips,
        "total_active_drivers": total_drivers,
        "avg_trips_per_driver": round(avg_trips_per_driver, 1),
        "drivers_with_trips": len(trips_by_driver),
        "top_drivers": [
            {
                "driver_id": did,
                "driver_name": driver_map.get(did).name if driver_map.get(did) else None,
                "trip_count": count,
            }
            for did, count in top_drivers
        ],
    }


@router.get("/revenue")
def get_revenue_stats(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get revenue statistics with date range - default from month start"""
    tenant_id = str(current_user.tenant_id)
    today = date.today()

    # Default date range: from start of current month
    if start_date:
        start_dt = datetime.strptime(start_date, "%Y-%m-%d").date()
    else:
        start_dt = today.replace(day=1)

    if end_date:
        end_dt = datetime.strptime(end_date, "%Y-%m-%d").date()
    else:
        end_dt = today

    # Get completed orders in date range
    orders = session.exec(
        select(Order)
        .where(Order.tenant_id == tenant_id)
        .where(Order.order_date >= datetime.combine(start_dt, datetime.min.time()))
        .where(Order.order_date <= datetime.combine(end_dt, datetime.max.time()))
        .where(Order.status.in_(["COMPLETED", "DELIVERED", "EMPTY_RETURN"]))
    ).all()

    # Calculate revenue (freight_charge is after-tax revenue)
    total_revenue = sum(o.freight_charge or 0 for o in orders)
    total_orders = len(orders)

    # Get active vehicles
    total_vehicles = session.exec(
        select(func.count(Vehicle.id))
        .where(Vehicle.tenant_id == tenant_id)
        .where(Vehicle.status == "ACTIVE")
    ).one() or 1

    avg_revenue_per_vehicle = total_revenue / total_vehicles if total_vehicles > 0 else 0
    avg_revenue_per_order = total_revenue / total_orders if total_orders > 0 else 0

    # Daily breakdown
    daily_revenue = {}
    for order in orders:
        order_date = order.order_date.date() if isinstance(order.order_date, datetime) else order.order_date
        date_str = order_date.isoformat()
        if date_str not in daily_revenue:
            daily_revenue[date_str] = {"revenue": 0, "orders": 0}
        daily_revenue[date_str]["revenue"] += order.freight_charge or 0
        daily_revenue[date_str]["orders"] += 1

    return {
        "period": {
            "start_date": start_dt.isoformat(),
            "end_date": end_dt.isoformat(),
        },
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "avg_revenue_per_vehicle": round(avg_revenue_per_vehicle, 0),
        "avg_revenue_per_order": round(avg_revenue_per_order, 0),
        "daily_breakdown": [
            {"date": d, "revenue": data["revenue"], "orders": data["orders"]}
            for d, data in sorted(daily_revenue.items())
        ],
    }


@router.get("/profit")
def get_profit_stats(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get gross and net profit statistics"""
    tenant_id = str(current_user.tenant_id)
    today = date.today()

    # Default date range: from start of current month
    if start_date:
        start_dt = datetime.strptime(start_date, "%Y-%m-%d").date()
    else:
        start_dt = today.replace(day=1)

    if end_date:
        end_dt = datetime.strptime(end_date, "%Y-%m-%d").date()
    else:
        end_dt = today

    # Revenue from completed orders
    orders = session.exec(
        select(Order)
        .where(Order.tenant_id == tenant_id)
        .where(Order.order_date >= datetime.combine(start_dt, datetime.min.time()))
        .where(Order.order_date <= datetime.combine(end_dt, datetime.max.time()))
        .where(Order.status.in_(["COMPLETED", "DELIVERED", "EMPTY_RETURN"]))
    ).all()

    total_revenue = sum(o.freight_charge or 0 for o in orders)

    # Fuel costs
    fuel_logs = session.exec(
        select(FuelLog)
        .where(FuelLog.tenant_id == tenant_id)
        .where(FuelLog.date >= start_dt)
        .where(FuelLog.date <= end_dt)
    ).all()

    total_fuel_cost = sum(f.total_amount or 0 for f in fuel_logs)

    # Maintenance costs
    maintenance_records = session.exec(
        select(MaintenanceRecord)
        .where(MaintenanceRecord.tenant_id == tenant_id)
        .where(MaintenanceRecord.service_date >= start_dt)
        .where(MaintenanceRecord.service_date <= end_dt)
    ).all()

    total_maintenance_cost = sum(m.total_cost or 0 for m in maintenance_records)

    # Calculate profits
    # Gross profit = Revenue - Direct costs (Fuel)
    gross_profit = total_revenue - total_fuel_cost

    # Net profit = Gross profit - Other operating costs (Maintenance)
    net_profit = gross_profit - total_maintenance_cost

    # Profit margins
    gross_margin = (gross_profit / total_revenue * 100) if total_revenue > 0 else 0
    net_margin = (net_profit / total_revenue * 100) if total_revenue > 0 else 0

    return {
        "period": {
            "start_date": start_dt.isoformat(),
            "end_date": end_dt.isoformat(),
        },
        "revenue": total_revenue,
        "costs": {
            "fuel": total_fuel_cost,
            "maintenance": total_maintenance_cost,
            "total": total_fuel_cost + total_maintenance_cost,
        },
        "gross_profit": gross_profit,
        "net_profit": net_profit,
        "margins": {
            "gross_margin_percent": round(gross_margin, 1),
            "net_margin_percent": round(net_margin, 1),
        },
    }


@router.get("/customer-revenue")
def get_customer_revenue_distribution(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get revenue distribution by customer"""
    tenant_id = str(current_user.tenant_id)
    today = date.today()

    # Default date range: from start of current month
    if start_date:
        start_dt = datetime.strptime(start_date, "%Y-%m-%d").date()
    else:
        start_dt = today.replace(day=1)

    if end_date:
        end_dt = datetime.strptime(end_date, "%Y-%m-%d").date()
    else:
        end_dt = today

    # Get completed orders in date range
    orders = session.exec(
        select(Order)
        .where(Order.tenant_id == tenant_id)
        .where(Order.order_date >= datetime.combine(start_dt, datetime.min.time()))
        .where(Order.order_date <= datetime.combine(end_dt, datetime.max.time()))
        .where(Order.status.in_(["COMPLETED", "DELIVERED", "EMPTY_RETURN"]))
    ).all()

    # Calculate revenue by customer
    revenue_by_customer = {}
    orders_by_customer = {}
    total_revenue = 0

    for order in orders:
        cid = order.customer_id
        revenue = order.freight_charge or 0
        total_revenue += revenue

        if cid not in revenue_by_customer:
            revenue_by_customer[cid] = 0
            orders_by_customer[cid] = 0
        revenue_by_customer[cid] += revenue
        orders_by_customer[cid] += 1

    # Get customer info
    customer_ids = list(revenue_by_customer.keys())
    customers = session.exec(select(Customer).where(Customer.id.in_(customer_ids))).all() if customer_ids else []
    customer_map = {c.id: c for c in customers}

    # Calculate percentages and build result
    distribution = []
    for cid, revenue in revenue_by_customer.items():
        customer = customer_map.get(cid)
        percentage = (revenue / total_revenue * 100) if total_revenue > 0 else 0
        distribution.append({
            "customer_id": cid,
            "customer_code": customer.code if customer else None,
            "customer_name": customer.name if customer else None,
            "revenue": revenue,
            "order_count": orders_by_customer[cid],
            "percentage": round(percentage, 1),
        })

    # Sort by revenue descending
    distribution.sort(key=lambda x: x["revenue"], reverse=True)

    return {
        "period": {
            "start_date": start_dt.isoformat(),
            "end_date": end_dt.isoformat(),
        },
        "total_revenue": total_revenue,
        "total_customers": len(distribution),
        "distribution": distribution,
    }
