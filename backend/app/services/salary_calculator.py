"""
Driver Salary Calculation Service

Calculates trip-based salary using:
- delivered_date (from OrderStatusLog) instead of order_date
- Override flags (is_flatbed, is_internal_cargo, is_holiday) with fallback to auto-detection
"""

from datetime import date as date_type
from sqlmodel import Session
from app.models import Order, DriverSalarySetting, Site
from typing import Optional


def is_holiday_auto(date: date_type) -> bool:
    """Auto-detect if a date is a Vietnamese holiday (simplified)"""
    # Check weekends
    if date.weekday() >= 5:  # Saturday or Sunday
        return True

    # Major holidays (simplified - Vietnamese calendar)
    holidays = [
        (1, 1),   # New Year
        (4, 30),  # Reunification Day
        (5, 1),   # Labour Day
        (9, 2),   # National Day
    ]

    return (date.month, date.day) in holidays


def get_is_from_port(session: Session, order: Order) -> bool:
    """Check if pickup site is a port (site_type='PORT')"""
    if not order.pickup_site_id:
        return False

    pickup_site = session.get(Site, order.pickup_site_id)
    if not pickup_site:
        return False

    return pickup_site.site_type == "PORT"


def get_is_flatbed(order: Order) -> bool:
    """
    Check if trip uses flatbed (Mooc sàn)
    Priority:
    1. is_flatbed override flag (if not None)
    2. Auto-detect from equipment field
    """
    # Check override flag first
    if order.is_flatbed is not None:
        return order.is_flatbed

    # Auto-detect from equipment
    if order.equipment and "sàn" in order.equipment.lower():
        return True

    return False


def get_is_internal_cargo(order: Order) -> bool:
    """
    Check if cargo is internal warehouse cargo (Hàng xá)
    Priority:
    1. is_internal_cargo override flag (if not None)
    2. Auto-detect from cargo_note field
    """
    # Check override flag first
    if order.is_internal_cargo is not None:
        return order.is_internal_cargo

    # Auto-detect from cargo_note
    if order.cargo_note and "hàng xá" in order.cargo_note.lower():
        return True

    return False


def get_is_holiday(order: Order, delivered_date: Optional[date_type]) -> bool:
    """
    Check if trip is on a holiday (Ngày lễ)
    Priority:
    1. is_holiday override flag (if not None)
    2. Auto-detect from delivered_date
    """
    # Check override flag first
    if order.is_holiday is not None:
        return order.is_holiday

    # Auto-detect from delivered_date
    if delivered_date:
        return is_holiday_auto(delivered_date)

    return False


def calculate_trip_salary(
    session: Session,
    order: Order,
    settings: DriverSalarySetting,
    trip_number_in_day: int,
    delivered_date: Optional[date_type] = None,
    is_bonus_applied_trip: bool = False
) -> dict:
    """
    Calculate salary for a single trip/order

    Args:
        session: Database session
        order: Order object
        settings: Active DriverSalarySetting
        trip_number_in_day: Total number of trips for this driver on this day
        delivered_date: Date when order was delivered (from OrderStatusLog)
        is_bonus_applied_trip: True if this trip should receive the daily bonus
                              (only ONE trip per day should have this = True)

    Returns:
        dict with breakdown of salary components
    """
    salary_breakdown = {
        "distance_salary": 0,
        "port_gate_fee": 0,
        "flatbed_tarp_fee": 0,
        "warehouse_bonus": 0,
        "daily_trip_bonus": 0,
        "holiday_multiplier": 1.0,
        "total": 0
    }

    # 1. Distance-based salary
    distance = order.distance_km or 0

    # Check if pickup is from PORT (always auto-detect, no override)
    pickup_is_port = get_is_from_port(session, order)

    # Select appropriate distance bracket using configurable thresholds (12 brackets)
    if pickup_is_port:
        if distance <= settings.distance_bracket_1:
            salary_breakdown["distance_salary"] = settings.port_bracket_1
        elif distance <= settings.distance_bracket_2:
            salary_breakdown["distance_salary"] = settings.port_bracket_2
        elif distance <= settings.distance_bracket_3:
            salary_breakdown["distance_salary"] = settings.port_bracket_3
        elif distance <= settings.distance_bracket_4:
            salary_breakdown["distance_salary"] = settings.port_bracket_4
        elif distance <= settings.distance_bracket_5:
            salary_breakdown["distance_salary"] = settings.port_bracket_5
        elif distance <= settings.distance_bracket_6:
            salary_breakdown["distance_salary"] = settings.port_bracket_6
        elif distance <= settings.distance_bracket_7:
            salary_breakdown["distance_salary"] = settings.port_bracket_7
        elif distance <= settings.distance_bracket_8:
            salary_breakdown["distance_salary"] = settings.port_bracket_8
        elif distance <= settings.distance_bracket_9:
            salary_breakdown["distance_salary"] = settings.port_bracket_9
        elif distance <= settings.distance_bracket_10:
            salary_breakdown["distance_salary"] = settings.port_bracket_10
        elif distance <= settings.distance_bracket_11:
            salary_breakdown["distance_salary"] = settings.port_bracket_11
        elif distance <= settings.distance_bracket_12:
            salary_breakdown["distance_salary"] = settings.port_bracket_12
        else:
            salary_breakdown["distance_salary"] = settings.port_bracket_13

        # 2. Port gate fee
        salary_breakdown["port_gate_fee"] = settings.port_gate_fee
    else:
        if distance <= settings.distance_bracket_1:
            salary_breakdown["distance_salary"] = settings.warehouse_bracket_1
        elif distance <= settings.distance_bracket_2:
            salary_breakdown["distance_salary"] = settings.warehouse_bracket_2
        elif distance <= settings.distance_bracket_3:
            salary_breakdown["distance_salary"] = settings.warehouse_bracket_3
        elif distance <= settings.distance_bracket_4:
            salary_breakdown["distance_salary"] = settings.warehouse_bracket_4
        elif distance <= settings.distance_bracket_5:
            salary_breakdown["distance_salary"] = settings.warehouse_bracket_5
        elif distance <= settings.distance_bracket_6:
            salary_breakdown["distance_salary"] = settings.warehouse_bracket_6
        elif distance <= settings.distance_bracket_7:
            salary_breakdown["distance_salary"] = settings.warehouse_bracket_7
        elif distance <= settings.distance_bracket_8:
            salary_breakdown["distance_salary"] = settings.warehouse_bracket_8
        elif distance <= settings.distance_bracket_9:
            salary_breakdown["distance_salary"] = settings.warehouse_bracket_9
        elif distance <= settings.distance_bracket_10:
            salary_breakdown["distance_salary"] = settings.warehouse_bracket_10
        elif distance <= settings.distance_bracket_11:
            salary_breakdown["distance_salary"] = settings.warehouse_bracket_11
        elif distance <= settings.distance_bracket_12:
            salary_breakdown["distance_salary"] = settings.warehouse_bracket_12
        else:
            salary_breakdown["distance_salary"] = settings.warehouse_bracket_13

    # 3. Flatbed tarp fee (check override flag first, then auto-detect)
    if get_is_flatbed(order):
        salary_breakdown["flatbed_tarp_fee"] = settings.flatbed_tarp_fee

    # 4. Warehouse to customer bonus (check override flag first, then auto-detect)
    if get_is_internal_cargo(order):
        salary_breakdown["warehouse_bonus"] = settings.warehouse_to_customer_bonus

    # 5. Daily trip bonus - only apply to ONE trip per day (is_bonus_applied_trip=True)
    # If driver has 2 trips/day -> 100k bonus for the whole day (applied to 1 trip)
    # If driver has 3+ trips/day -> 200k bonus for the whole day (applied to 1 trip)
    if is_bonus_applied_trip:
        if trip_number_in_day == 2:
            salary_breakdown["daily_trip_bonus"] = settings.second_trip_bonus
        elif trip_number_in_day >= 3:
            salary_breakdown["daily_trip_bonus"] = settings.third_trip_bonus

    # Calculate subtotal before holiday multiplier
    subtotal = (
        salary_breakdown["distance_salary"] +
        salary_breakdown["port_gate_fee"] +
        salary_breakdown["flatbed_tarp_fee"] +
        salary_breakdown["warehouse_bonus"] +
        salary_breakdown["daily_trip_bonus"]
    )

    # 6. Holiday multiplier (check override flag first, then auto-detect from delivered_date)
    if get_is_holiday(order, delivered_date):
        salary_breakdown["holiday_multiplier"] = settings.holiday_multiplier
        subtotal = int(subtotal * settings.holiday_multiplier)

    salary_breakdown["total"] = subtotal

    return salary_breakdown
