from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select
from sqlalchemy import func, case

from app.db.session import get_session
from app.models import Driver, Trip, TripFinanceItem, CostNorm, Vehicle, User
from app.core.security import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/profit")
def profit_report(
    from_date: str | None = Query(default=None, alias="from"),
    to_date: str | None = Query(default=None, alias="to"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    tenant_id = str(current_user.tenant_id)

    if from_date:
        start = datetime.fromisoformat(from_date)
    else:
        start = datetime.min

    if to_date:
        end = datetime.fromisoformat(to_date) + timedelta(days=1)
    else:
        end = datetime.utcnow()

    base = [
        TripFinanceItem.tenant_id == tenant_id,
        TripFinanceItem.created_at >= start,
        TripFinanceItem.created_at < end,
    ]

    income = session.exec(
        select(func.coalesce(func.sum(TripFinanceItem.amount), 0))
        .where(*base, TripFinanceItem.direction == "INCOME")
    ).one()

    expense = session.exec(
        select(func.coalesce(func.sum(TripFinanceItem.amount), 0))
        .where(*base, TripFinanceItem.direction == "EXPENSE")
    ).one()

    cod = session.exec(
        select(func.coalesce(func.sum(TripFinanceItem.amount), 0))
        .where(*base, TripFinanceItem.direction == "INCOME", TripFinanceItem.is_cod == True)
    ).one()

    return {
        "range": {"from": from_date, "to": to_date},
        "income_total": float(income),
        "expense_total": float(expense),
        "profit": float(income) - float(expense),
        "cod_total": float(cod),
        "currency": "VND",
    }

@router.get("/profit/by-vehicle")
def profit_by_vehicle(
    from_date: str | None = Query(default=None, alias="from"),
    to_date: str | None = Query(default=None, alias="to"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    tenant_id = str(current_user.tenant_id)

    if from_date:
        start = datetime.fromisoformat(from_date)
    else:
        start = datetime.min

    if to_date:
        end = datetime.fromisoformat(to_date) + timedelta(days=1)
    else:
        end = datetime.utcnow()

    q = (
        select(
            Vehicle.id,
            Vehicle.plate_no,
            func.coalesce(
                func.sum(
                    case(
                        (TripFinanceItem.direction == "INCOME", TripFinanceItem.amount),
                        else_=-TripFinanceItem.amount,
                    )
                ),
                0,
            ).label("profit"),
            func.sum(
                case(
                    (TripFinanceItem.direction == "INCOME", TripFinanceItem.amount),
                    else_=0,
                )
            ).label("income"),
            func.sum(
                case(
                    (TripFinanceItem.direction == "EXPENSE", TripFinanceItem.amount),
                    else_=0,
                )
            ).label("expense"),
            func.count(func.distinct(Trip.id)).label("trip_count"),
        )
        .join(Trip, Trip.vehicle_id == Vehicle.id)
        .join(TripFinanceItem, TripFinanceItem.trip_id == Trip.id)
        .where(
            Vehicle.tenant_id == tenant_id,
            TripFinanceItem.created_at >= start,
            TripFinanceItem.created_at < end,
        )
        .group_by(Vehicle.id, Vehicle.plate_no)
        .order_by(func.sum(TripFinanceItem.amount).desc())
    )

    rows = session.exec(q).all()

    return [
        {
            "vehicle_id": vid,
            "plate_no": plate,
            "trip_count": int(trips),
            "income": float(income or 0),
            "expense": float(expense or 0),
            "profit": float(profit or 0),
            "currency": "VND",
        }
        for vid, plate, profit, income, expense, trips in rows
    ]

@router.get("/profit/by-driver")
def profit_by_driver(
    from_date: str | None = Query(default=None, alias="from"),
    to_date: str | None = Query(default=None, alias="to"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    tenant_id = str(current_user.tenant_id)

    if from_date:
        start = datetime.fromisoformat(from_date)
    else:
        start = datetime.m

@router.get("/profit/by-trip")
def profit_by_trip(
    from_date: str | None = Query(default=None, alias="from"),
    to_date: str | None = Query(default=None, alias="to"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    tenant_id = str(current_user.tenant_id)

    if from_date:
        start = datetime.fromisoformat(from_date)
    else:
        start = datetime.min

    if to_date:
        end = datetime.fromisoformat(to_date) + timedelta(days=1)
    else:
        end = datetime.utcnow()

    q = (
        select(
            Trip.id,
            Trip.status,
            Trip.created_at,
            Trip.completed_at,

            Vehicle.plate_no,
            Driver.name,

            func.sum(
                case(
                    (TripFinanceItem.direction == "INCOME", TripFinanceItem.amount),
                    else_=0,
                )
            ).label("income"),

            func.sum(
                case(
                    (TripFinanceItem.direction == "EXPENSE", TripFinanceItem.amount),
                    else_=0,
                )
            ).label("expense"),

            func.sum(
                case(
                    (
                        (TripFinanceItem.direction == "INCOME") &
                        (TripFinanceItem.is_cod == True),
                        TripFinanceItem.amount,
                    ),
                    else_=0,
                )
            ).label("cod"),
        )
        .join(TripFinanceItem, TripFinanceItem.trip_id == Trip.id)
        .join(Vehicle, Vehicle.id == Trip.vehicle_id, isouter=True)
        .join(Driver, Driver.id == Trip.driver_id, isouter=True)
        .where(
            Trip.tenant_id == tenant_id,
            TripFinanceItem.created_at >= start,
            TripFinanceItem.created_at < end,
        )
        .group_by(
            Trip.id,
            Trip.status,
            Trip.created_at,
            Trip.completed_at,
            Vehicle.plate_no,
            Driver.name,
        )
        .order_by(Trip.created_at.desc())
    )

    rows = session.exec(q).all()

    result = []
    for (
        trip_id,
        status,
        created_at,
        completed_at,
        plate_no,
        driver_name,
        income,
        expense,
        cod,
    ) in rows:
        income = float(income or 0)
        expense = float(expense or 0)

        result.append({
            "trip_id": trip_id,
            "status": status,
            "vehicle_plate": plate_no,
            "driver_name": driver_name,
            "income": income,
            "expense": expense,
            "profit": income - expense,
            "cod": float(cod or 0),
            "created_at": created_at,
            "completed_at": completed_at,
            "currency": "VND",
        })

    return result
@router.get("/trip-cost-variance")
def trip_cost_variance(
    trip_id: str,
    distance_km: float = 0,
    route_code: str | None = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    tenant_id = str(current_user.tenant_id)

    trip = session.get(Trip, trip_id)
    if not trip or trip.tenant_id != tenant_id:
        return {"error": "Trip not found"}

    # 1) Actual expense
    actual_expense = session.exec(
        select(func.coalesce(func.sum(TripFinanceItem.amount), 0.0))
        .where(
            TripFinanceItem.tenant_id == tenant_id,
            TripFinanceItem.trip_id == trip_id,
            TripFinanceItem.direction == "EXPENSE",
        )
    ).one()
    actual_expense = float(actual_expense)

    # 2) Load norms (ưu tiên: theo vehicle_id/route_code -> fallback global)
    # Fuel norm
    fuel_norm = session.exec(
        select(CostNorm)
        .where(
            CostNorm.tenant_id == tenant_id,
            CostNorm.type == "FUEL",
            CostNorm.unit == "KM",
            (CostNorm.vehicle_id == trip.vehicle_id) | (CostNorm.vehicle_id.is_(None)),
        )
        .order_by(CostNorm.vehicle_id.is_(None))  # ưu tiên vehicle_id trước
        .limit(1)
    ).first()

    # Driver norm
    driver_norm = session.exec(
        select(CostNorm)
        .where(
            CostNorm.tenant_id == tenant_id,
            CostNorm.type == "DRIVER",
            CostNorm.unit == "TRIP",
        )
        .limit(1)
    ).first()

    # Toll norm
    toll_norm = None
    if route_code:
        toll_norm = session.exec(
            select(CostNorm)
            .where(
                CostNorm.tenant_id == tenant_id,
                CostNorm.type == "TOLL",
                CostNorm.unit == "ROUTE",
                CostNorm.route_code == route_code,
            )
            .limit(1)
        ).first()

    # 3) Calculate standard
    standard = 0.0
    if fuel_norm and distance_km:
        standard += float(fuel_norm.unit_cost) * float(distance_km)
    if driver_norm:
        standard += float(driver_norm.unit_cost)
    if toll_norm:
        standard += float(toll_norm.unit_cost)

    variance = actual_expense - standard
    ratio = (variance / standard) if standard > 0 else None

    status = "OK"
    if standard > 0 and variance > 0:
        if ratio is not None and ratio > 0.1:
            status = "OVER_BUDGET"
        else:
            status = "WARN"

    return {
        "trip_id": trip_id,
        "distance_km": distance_km,
        "route_code": route_code,
        "actual_expense": actual_expense,
        "standard_expense": standard,
        "variance": variance,
        "variance_ratio": ratio,
        "status": status,
        "currency": "VND",
        "applied_norms": {
            "fuel": {"id": getattr(fuel_norm, "id", None), "unit_cost": getattr(fuel_norm, "unit_cost", None)} if fuel_norm else None,
            "driver": {"id": getattr(driver_norm, "id", None), "unit_cost": getattr(driver_norm, "unit_cost", None)} if driver_norm else None,
            "toll": {"id": getattr(toll_norm, "id", None), "unit_cost": getattr(toll_norm, "unit_cost", None)} if toll_norm else None

        },
    }

@router.get("/trips-over-budget")
def trips_over_budget(
    threshold: float = 0.1,   # 10%
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    tenant_id = str(current_user.tenant_id)

    trips = session.exec(
        select(Trip)
        .where(Trip.tenant_id == tenant_id)
        .order_by(Trip.created_at.desc())
    ).all()

    result = []

    for trip in trips:
        # actual expense
        actual = session.exec(
            select(func.coalesce(func.sum(TripFinanceItem.amount), 0))
            .where(
                TripFinanceItem.trip_id == trip.id,
                TripFinanceItem.direction == "EXPENSE",
            )
        ).one()
        actual = float(actual)

        # load norms
        fuel = session.exec(
            select(CostNorm)
            .where(
                CostNorm.tenant_id == tenant_id,
                CostNorm.type == "FUEL",
                CostNorm.unit == "KM",
            )
            .limit(1)
        ).first()

        driver = session.exec(
            select(CostNorm)
            .where(
                CostNorm.tenant_id == tenant_id,
                CostNorm.type == "DRIVER",
                CostNorm.unit == "TRIP",
            )
            .limit(1)
        ).first()

        toll = None
        if trip.route_code:
            toll = session.exec(
                select(CostNorm)
                .where(
                    CostNorm.tenant_id == tenant_id,
                    CostNorm.type == "TOLL",
                    CostNorm.unit == "ROUTE",
                    CostNorm.route_code == trip.route_code,
                )
                .limit(1)
            ).first()

        # standard cost
        standard = 0.0
        if fuel and trip.distance_km:
            standard += fuel.unit_cost * trip.distance_km
        if driver:
            standard += driver.unit_cost
        if toll:
            standard += toll.unit_cost

        if standard <= 0:
            continue

        variance = actual - standard
        ratio = variance / standard

        if ratio > threshold:
            result.append({
                "trip_id": trip.id,
                "route_code": trip.route_code,
                "distance_km": trip.distance_km,
                "actual_cost": actual,
                "standard_cost": standard,
                "variance": variance,
                "variance_ratio": ratio,
                "status": "OVER_BUDGET",
            })

    return result
