from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from app.db.session import get_session
from app.models import Order, Driver, DriverSalarySetting, Site, User, OrderStatusLog, IncomeTaxSetting
from app.models.order import OrderStatus
from app.core.security import get_current_user
from app.services.order_status_logger import get_delivered_date
from app.services.salary_calculator import calculate_trip_salary
from app.services.income_tax_calculator import (
    calculate_seniority_bonus,
    calculate_salary_deductions
)
from datetime import datetime, date as date_type
from typing import Optional, List
import calendar

router = APIRouter(prefix="/driver-salary-reports", tags=["driver-salary-reports"])


@router.get("/monthly")
def get_monthly_salary_report(
    year: int = Query(..., description="Year (e.g., 2025)"),
    month: int = Query(..., ge=1, le=12, description="Month (1-12)"),
    driver_id: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Get monthly salary report for drivers
    Includes trip-based calculations and monthly bonuses
    """
    tenant_id = str(current_user.tenant_id)

    # Get active salary settings
    settings = session.exec(
        select(DriverSalarySetting).where(
            DriverSalarySetting.tenant_id == tenant_id,
            DriverSalarySetting.status == "ACTIVE"
        ).limit(1)
    ).first()

    if not settings:
        raise HTTPException(400, "Không tìm thấy cài đặt lương. Vui lòng tạo cài đặt lương trước.")

    # Get all order IDs that were DELIVERED in this month (using delivered_date from status logs)
    delivered_orders_subquery = (
        select(OrderStatusLog.order_id)
        .where(
            OrderStatusLog.tenant_id == tenant_id,
            OrderStatusLog.to_status == OrderStatus.DELIVERED,
            func.extract('year', OrderStatusLog.changed_at) == year,
            func.extract('month', OrderStatusLog.changed_at) == month
        )
        .distinct()
    )

    delivered_order_ids = session.exec(delivered_orders_subquery).all()

    if not delivered_order_ids:
        return {
            "year": year,
            "month": month,
            "settings_used": settings.model_dump(),
            "drivers": []
        }

    # Build query for orders
    query = select(Order).where(
        Order.tenant_id == tenant_id,
        Order.id.in_(delivered_order_ids),
        Order.status.in_([OrderStatus.DELIVERED, OrderStatus.COMPLETED]),
        Order.driver_id.isnot(None)
    )

    if driver_id:
        query = query.where(Order.driver_id == driver_id)

    orders = session.exec(query.order_by(Order.driver_id)).all()

    # Get all drivers
    driver_ids = {o.driver_id for o in orders}
    drivers_map = {}
    if driver_ids:
        drivers = session.exec(select(Driver).where(Driver.id.in_(driver_ids))).all()
        drivers_map = {d.id: d for d in drivers}

    # Get all sites for pickup/delivery codes
    site_ids = set()
    for o in orders:
        if o.pickup_site_id:
            site_ids.add(o.pickup_site_id)
        if o.delivery_site_id:
            site_ids.add(o.delivery_site_id)

    sites_map = {}
    if site_ids:
        sites = session.exec(select(Site).where(Site.id.in_(site_ids))).all()
        sites_map = {str(s.id): s for s in sites}

    # Group orders by driver and calculate salaries
    driver_reports = {}

    # First pass: count total trips per driver per day
    driver_daily_counts = {}  # {driver_id: {date_str: count}}
    for order in orders:
        delivered_datetime = get_delivered_date(session, order.id)
        if not delivered_datetime:
            continue
        delivered_date_str = delivered_datetime.date().isoformat()

        if order.driver_id not in driver_daily_counts:
            driver_daily_counts[order.driver_id] = {}
        if delivered_date_str not in driver_daily_counts[order.driver_id]:
            driver_daily_counts[order.driver_id][delivered_date_str] = 0
        driver_daily_counts[order.driver_id][delivered_date_str] += 1

    # Track which (driver_id, date) has already received daily bonus
    bonus_applied_keys = set()

    for order in orders:
        # Get delivered_date from status logs (CRITICAL for salary calculation)
        delivered_datetime = get_delivered_date(session, order.id)
        if not delivered_datetime:
            # Skip orders without delivered date
            continue

        delivered_date = delivered_datetime.date()
        delivered_date_str = delivered_date.isoformat()

        if order.driver_id not in driver_reports:
            driver = drivers_map.get(order.driver_id)
            driver_reports[order.driver_id] = {
                "driver_id": order.driver_id,
                "driver_name": driver.name if driver else "Unknown",
                "base_salary": driver.base_salary if driver else 5000000,
                "trips": [],
                "trip_count": 0,
                "total_trip_salary": 0,
                "monthly_bonus": 0,
                "total_salary": 0,
                "daily_trip_counts": {}  # Track trips per delivered_date
            }

        # Get total trips for this driver on this date
        trips_per_day = driver_daily_counts.get(order.driver_id, {}).get(delivered_date_str, 1)

        # Determine if this trip should receive the daily bonus
        # Only ONE trip per driver per day gets the bonus
        bonus_key = (order.driver_id, delivered_date_str)
        is_bonus_applied_trip = False
        if trips_per_day >= 2 and bonus_key not in bonus_applied_keys:
            is_bonus_applied_trip = True
            bonus_applied_keys.add(bonus_key)

        # Calculate trip salary using new salary calculator
        trip_salary = calculate_trip_salary(
            session=session,
            order=order,
            settings=settings,
            trip_number_in_day=trips_per_day,
            delivered_date=delivered_date,
            is_bonus_applied_trip=is_bonus_applied_trip
        )

        # Get pickup and delivery site codes
        pickup_site = sites_map.get(order.pickup_site_id) if order.pickup_site_id else None
        delivery_site = sites_map.get(order.delivery_site_id) if order.delivery_site_id else None

        # Add trip to report
        driver_reports[order.driver_id]["trips"].append({
            "order_id": order.id,
            "order_code": order.order_code,
            "delivered_date": delivered_date_str,  # Changed from order_date
            "pickup_site_code": pickup_site.code if pickup_site else None,
            "delivery_site_code": delivery_site.code if delivery_site else None,
            "distance_km": order.distance_km,
            "is_holiday": trip_salary.get("holiday_multiplier", 1.0) > 1.0,
            "trips_per_day": trips_per_day,
            **trip_salary
        })

        driver_reports[order.driver_id]["trip_count"] += 1
        driver_reports[order.driver_id]["total_trip_salary"] += trip_salary["total"]

    # Get active tax setting
    tax_setting = session.exec(
        select(IncomeTaxSetting).where(
            IncomeTaxSetting.tenant_id == tenant_id,
            IncomeTaxSetting.status == "ACTIVE"
        ).limit(1)
    ).first()

    # Calculate monthly bonuses, seniority bonus, deductions, and final salary
    report_date = date_type(year, month, 1)

    for driver_id, report in driver_reports.items():
        driver = drivers_map.get(driver_id)
        if not driver:
            continue

        trip_count = report["trip_count"]

        # Calculate monthly bonus based on trip count
        if trip_count >= 55:
            report["monthly_bonus"] = settings.bonus_55_plus_trips
        elif trip_count >= 51:
            report["monthly_bonus"] = settings.bonus_51_54_trips
        elif trip_count >= 45:
            report["monthly_bonus"] = settings.bonus_45_50_trips

        # Calculate seniority bonus (Thưởng thâm niên)
        seniority_bonus = calculate_seniority_bonus(driver, report_date)
        report["seniority_bonus"] = seniority_bonus

        # Calculate gross salary before deductions
        gross_salary = (
            report["base_salary"] +
            report["total_trip_salary"] +
            report["monthly_bonus"] +
            seniority_bonus
        )
        report["gross_salary"] = gross_salary

        # Calculate all deductions (BHXH, BHYT, BHTN, Thuế TNCN, Tạm ứng)
        deductions = calculate_salary_deductions(
            session=session,
            driver=driver,
            base_salary=report["base_salary"],
            trip_salary=report["total_trip_salary"],
            monthly_bonus=report["monthly_bonus"],
            seniority_bonus=seniority_bonus,
            tenant_id=tenant_id,
            year=year,
            month=month,
            tax_setting=tax_setting
        )

        # Add deduction details to report
        report["deductions"] = deductions

        # Calculate final net salary
        report["total_salary"] = deductions["net_salary"]

        # Sort trips by delivered_date and order_code
        report["trips"].sort(key=lambda t: (t["delivered_date"], t["order_code"]))

        # Remove daily_trip_counts from final output (internal tracking only)
        del report["daily_trip_counts"]

    return {
        "year": year,
        "month": month,
        "settings_used": settings.model_dump(),
        "drivers": list(driver_reports.values())
    }
