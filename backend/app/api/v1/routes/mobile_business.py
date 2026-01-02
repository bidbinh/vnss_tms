"""
Mobile Business API - Endpoints dành cho app mobile business/manager
Sử dụng JWT authentication
"""
from datetime import datetime, date, timedelta
from typing import Optional, List
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from pydantic import BaseModel

from app.db.session import get_session
from app.models import User, Driver, Vehicle, Order, Customer
from app.models.order import OrderStatus
from app.core.security import get_current_user

router = APIRouter(prefix="/mobile-business", tags=["mobile_business"])


# ==================== MODELS ====================

class AssignDriverRequest(BaseModel):
    """Request phân công tài xế"""
    order_id: str
    driver_id: str
    vehicle_id: Optional[str] = None
    notes: Optional[str] = None


class OrderFilter(BaseModel):
    """Filter đơn hàng"""
    status: Optional[List[str]] = None
    customer_id: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None


# ==================== HELPER FUNCTIONS ====================

def validate_business_user(user: User, session: Session) -> dict:
    """Validate user có quyền business/manager"""
    if user.role not in ["ADMIN", "MANAGER", "DISPATCHER", "SALES"]:
        raise HTTPException(403, "Bạn không có quyền truy cập chức năng này")

    return {
        "user_id": user.id,
        "tenant_id": user.tenant_id,
        "role": user.role,
    }


# ==================== DASHBOARD ====================

@router.get("/dashboard")
def get_business_dashboard(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Dashboard tổng quan cho manager/dispatcher
    """
    biz_info = validate_business_user(current_user, session)
    tenant_id = str(current_user.tenant_id)
    today = date.today()

    # Get today's orders
    today_orders = session.exec(
        select(func.count()).select_from(Order).where(
            Order.tenant_id == tenant_id,
            func.date(Order.order_date) == today
        )
    ).one()

    # Get active orders
    active_orders = session.exec(
        select(func.count()).select_from(Order).where(
            Order.tenant_id == tenant_id,
            Order.status.in_([OrderStatus.ASSIGNED, OrderStatus.IN_TRANSIT])
        )
    ).one()

    # Get pending orders (not assigned)
    pending_orders = session.exec(
        select(func.count()).select_from(Order).where(
            Order.tenant_id == tenant_id,
            Order.status == OrderStatus.NEW
        )
    ).one()

    # Get completed today
    completed_today = session.exec(
        select(func.count()).select_from(Order).where(
            Order.tenant_id == tenant_id,
            Order.status.in_([OrderStatus.DELIVERED, OrderStatus.COMPLETED]),
            func.date(Order.updated_at) == today
        )
    ).one()

    # Get driver stats
    total_drivers = session.exec(
        select(func.count()).select_from(Driver).where(
            Driver.tenant_id == tenant_id,
            Driver.status == "ACTIVE"
        )
    ).one()

    # Mock driver status breakdown
    drivers_online = int(total_drivers * 0.6)
    drivers_on_trip = int(total_drivers * 0.3)
    drivers_offline = total_drivers - drivers_online - drivers_on_trip

    # Revenue this month (mock)
    month_start = date(today.year, today.month, 1)

    return {
        "kpis": {
            "today_orders": today_orders,
            "active_orders": active_orders,
            "pending_orders": pending_orders,
            "completed_today": completed_today,
        },
        "drivers": {
            "total": total_drivers,
            "online": drivers_online,
            "on_trip": drivers_on_trip,
            "offline": drivers_offline,
        },
        "quick_stats": {
            "completion_rate": 92,  # Mock
            "on_time_rate": 88,  # Mock
            "revenue_today": 45000000,  # Mock
            "revenue_month": 1150000000,  # Mock
        },
        "alerts": [
            {"type": "warning", "message": "3 đơn hàng chưa phân công tài xế"},
            {"type": "info", "message": "5 tài xế sắp hết giờ làm việc"},
        ],
    }


# ==================== ORDERS ====================

@router.get("/orders")
def list_orders(
    status: Optional[str] = Query(None, description="Comma-separated statuses"),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    customer_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Danh sách đơn hàng
    """
    biz_info = validate_business_user(current_user, session)
    tenant_id = str(current_user.tenant_id)

    query = select(Order).where(Order.tenant_id == tenant_id)

    # Filter by status
    if status:
        statuses = [s.strip().upper() for s in status.split(",")]
        query = query.where(Order.status.in_(statuses))

    # Filter by date range
    if date_from:
        query = query.where(func.date(Order.order_date) >= date_from)
    if date_to:
        query = query.where(func.date(Order.order_date) <= date_to)

    # Filter by customer
    if customer_id:
        query = query.where(Order.customer_id == customer_id)

    # Search
    if search:
        query = query.where(
            (Order.order_code.ilike(f"%{search}%")) |
            (Order.container_code.ilike(f"%{search}%"))
        )

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    query = query.order_by(Order.order_date.desc())
    query = query.offset((page - 1) * size).limit(size)

    orders = session.exec(query).all()

    items = []
    for order in orders:
        customer = session.get(Customer, order.customer_id) if order.customer_id else None
        driver = session.get(Driver, order.driver_id) if order.driver_id else None

        items.append({
            "id": order.id,
            "order_code": order.order_code,
            "customer_name": customer.name if customer else None,
            "pickup_location": order.pickup_text,
            "delivery_location": order.delivery_text,
            "container_no": order.container_code,
            "status": order.status,
            "driver_name": driver.name if driver else None,
            "order_date": order.order_date.isoformat() if order.order_date else None,
            "eta_pickup": order.eta_pickup_at.isoformat() if order.eta_pickup_at else None,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
    }


@router.get("/orders/unassigned")
def get_unassigned_orders(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Danh sách đơn hàng chưa phân công
    """
    biz_info = validate_business_user(current_user, session)
    tenant_id = str(current_user.tenant_id)

    query = select(Order).where(
        Order.tenant_id == tenant_id,
        Order.status == OrderStatus.NEW,
        Order.driver_id.is_(None)
    ).order_by(Order.eta_pickup_at)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    query = query.offset((page - 1) * size).limit(size)
    orders = session.exec(query).all()

    items = []
    for order in orders:
        customer = session.get(Customer, order.customer_id) if order.customer_id else None

        # Determine priority
        priority = "normal"
        if order.eta_pickup_at:
            hours_until = (order.eta_pickup_at - datetime.now()).total_seconds() / 3600
            if hours_until < 2:
                priority = "urgent"
            elif hours_until < 6:
                priority = "high"

        items.append({
            "id": order.id,
            "order_code": order.order_code,
            "customer_name": customer.name if customer else None,
            "pickup_location": order.pickup_text,
            "delivery_location": order.delivery_text,
            "container_no": order.container_code,
            "pickup_date": order.eta_pickup_at.isoformat() if order.eta_pickup_at else None,
            "priority": priority,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
    }


@router.get("/orders/{order_id}")
def get_order_detail(
    order_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Chi tiết đơn hàng
    """
    biz_info = validate_business_user(current_user, session)
    tenant_id = str(current_user.tenant_id)

    order = session.get(Order, order_id)
    if not order or order.tenant_id != tenant_id:
        raise HTTPException(404, "Không tìm thấy đơn hàng")

    customer = session.get(Customer, order.customer_id) if order.customer_id else None
    driver = session.get(Driver, order.driver_id) if order.driver_id else None
    vehicle = session.get(Vehicle, driver.vehicle_id) if driver and driver.vehicle_id else None

    return {
        "id": order.id,
        "order_code": order.order_code,
        "status": order.status,
        "customer": {
            "id": customer.id if customer else None,
            "name": customer.name if customer else None,
            "phone": customer.phone if customer else None,
        } if customer else None,
        "pickup_location": order.pickup_text,
        "delivery_location": order.delivery_text,
        "container_no": order.container_code,
        "container_size": order.equipment,
        "order_date": order.order_date.isoformat() if order.order_date else None,
        "eta_pickup": order.eta_pickup_at.isoformat() if order.eta_pickup_at else None,
        "eta_delivery": order.eta_delivery_at.isoformat() if order.eta_delivery_at else None,
        "driver": {
            "id": driver.id,
            "name": driver.name,
            "phone": driver.phone,
        } if driver else None,
        "vehicle": {
            "id": vehicle.id,
            "plate_no": vehicle.plate_no,
            "type": vehicle.type,
        } if vehicle else None,
        "notes": order.cargo_note,
    }


@router.post("/orders/{order_id}/assign")
def assign_driver_to_order(
    order_id: str,
    driver_id: str = Query(...),
    vehicle_id: Optional[str] = Query(None),
    notes: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Phân công tài xế cho đơn hàng
    """
    biz_info = validate_business_user(current_user, session)
    tenant_id = str(current_user.tenant_id)

    # Validate order
    order = session.get(Order, order_id)
    if not order or order.tenant_id != tenant_id:
        raise HTTPException(404, "Không tìm thấy đơn hàng")

    # Validate driver
    driver = session.get(Driver, driver_id)
    if not driver or driver.tenant_id != tenant_id:
        raise HTTPException(404, "Không tìm thấy tài xế")

    if driver.status != "ACTIVE":
        raise HTTPException(400, "Tài xế không hoạt động")

    # Assign
    order.driver_id = driver_id
    if order.status == OrderStatus.NEW:
        order.status = OrderStatus.ASSIGNED

    if notes:
        order.cargo_note = (order.cargo_note or "") + f"\n[Phân công] {notes}"

    order.updated_at = datetime.utcnow()
    session.commit()

    return {
        "success": True,
        "order_id": order_id,
        "driver_id": driver_id,
        "driver_name": driver.name,
        "status": order.status,
        "message": f"Đã phân công {driver.name} cho đơn {order.order_code}",
    }


# ==================== DRIVERS ====================

@router.get("/drivers")
def list_drivers(
    status: Optional[str] = Query(None, description="online, on_trip, offline, all"),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Danh sách tài xế
    """
    biz_info = validate_business_user(current_user, session)
    tenant_id = str(current_user.tenant_id)

    query = select(Driver).where(
        Driver.tenant_id == tenant_id,
        Driver.status == "ACTIVE"
    )

    if search:
        query = query.where(
            (Driver.name.ilike(f"%{search}%")) |
            (Driver.phone.ilike(f"%{search}%"))
        )

    query = query.order_by(Driver.name)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    query = query.offset((page - 1) * size).limit(size)
    drivers = session.exec(query).all()

    items = []
    for driver in drivers:
        vehicle = session.get(Vehicle, driver.vehicle_id) if driver.vehicle_id else None

        # Count active trips
        active_trips = session.exec(
            select(func.count()).select_from(Order).where(
                Order.driver_id == driver.id,
                Order.status.in_([OrderStatus.ASSIGNED, OrderStatus.IN_TRANSIT])
            )
        ).one()

        # Determine work status
        if active_trips > 0:
            work_status = "on_trip"
        else:
            work_status = "online"  # Simplified - would need real tracking

        # Filter by status
        if status and status != "all":
            if status != work_status:
                continue

        items.append({
            "id": driver.id,
            "name": driver.name,
            "phone": driver.phone,
            "vehicle_no": vehicle.plate_no if vehicle else None,
            "status": work_status,
            "active_trips": active_trips,
            "trips_today": 0,  # Would need real calculation
        })

    return {
        "items": items,
        "total": len(items),
        "page": page,
        "size": size,
    }


@router.get("/drivers/available")
def get_available_drivers(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Danh sách tài xế khả dụng (có thể nhận trip mới)
    """
    biz_info = validate_business_user(current_user, session)
    tenant_id = str(current_user.tenant_id)

    # Get all active drivers
    drivers = session.exec(
        select(Driver).where(
            Driver.tenant_id == tenant_id,
            Driver.status == "ACTIVE"
        ).order_by(Driver.name)
    ).all()

    available = []
    for driver in drivers:
        vehicle = session.get(Vehicle, driver.vehicle_id) if driver.vehicle_id else None

        # Count active trips
        active_trips = session.exec(
            select(func.count()).select_from(Order).where(
                Order.driver_id == driver.id,
                Order.status.in_([OrderStatus.ASSIGNED, OrderStatus.IN_TRANSIT])
            )
        ).one()

        # Determine availability
        is_available = active_trips < 2  # Can take up to 2 active trips

        if is_available:
            available.append({
                "id": driver.id,
                "name": driver.name,
                "phone": driver.phone,
                "vehicle_no": vehicle.plate_no if vehicle else None,
                "active_trips": active_trips,
                "current_location": "Quận 7",  # Mock - would need GPS tracking
            })

    return available


@router.get("/drivers/{driver_id}")
def get_driver_detail(
    driver_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Chi tiết tài xế
    """
    biz_info = validate_business_user(current_user, session)
    tenant_id = str(current_user.tenant_id)

    driver = session.get(Driver, driver_id)
    if not driver or driver.tenant_id != tenant_id:
        raise HTTPException(404, "Không tìm thấy tài xế")

    vehicle = session.get(Vehicle, driver.vehicle_id) if driver.vehicle_id else None

    # Get recent trips
    recent_trips = session.exec(
        select(Order).where(
            Order.driver_id == driver_id,
            Order.tenant_id == tenant_id
        ).order_by(Order.updated_at.desc()).limit(5)
    ).all()

    trips_data = []
    for order in recent_trips:
        customer = session.get(Customer, order.customer_id) if order.customer_id else None
        trips_data.append({
            "order_code": order.order_code,
            "customer_name": customer.name if customer else None,
            "status": order.status,
            "date": order.order_date.isoformat() if order.order_date else None,
        })

    return {
        "id": driver.id,
        "name": driver.name,
        "phone": driver.phone,
        "license_no": driver.license_no,
        "license_expiry": driver.license_expiry.isoformat() if driver.license_expiry else None,
        "vehicle": {
            "id": vehicle.id,
            "plate_no": vehicle.plate_no,
            "type": vehicle.type,
        } if vehicle else None,
        "recent_trips": trips_data,
        "stats": {
            "trips_this_month": len([t for t in recent_trips if t.order_date and t.order_date.month == date.today().month]),
            "rating": 4.8,  # Mock
        },
    }


# ==================== REPORTS ====================

@router.get("/reports/summary")
def get_reports_summary(
    period: str = Query("month", description="today, week, month, year"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Báo cáo tổng hợp
    """
    biz_info = validate_business_user(current_user, session)
    tenant_id = str(current_user.tenant_id)
    today = date.today()

    # Calculate date range
    if period == "today":
        start_date = today
    elif period == "week":
        start_date = today - timedelta(days=7)
    elif period == "month":
        start_date = date(today.year, today.month, 1)
    else:  # year
        start_date = date(today.year, 1, 1)

    # Get order stats
    total_orders = session.exec(
        select(func.count()).select_from(Order).where(
            Order.tenant_id == tenant_id,
            func.date(Order.order_date) >= start_date
        )
    ).one()

    completed_orders = session.exec(
        select(func.count()).select_from(Order).where(
            Order.tenant_id == tenant_id,
            func.date(Order.order_date) >= start_date,
            Order.status.in_([OrderStatus.DELIVERED, OrderStatus.COMPLETED])
        )
    ).one()

    # Get driver count
    active_drivers = session.exec(
        select(func.count()).select_from(Driver).where(
            Driver.tenant_id == tenant_id,
            Driver.status == "ACTIVE"
        )
    ).one()

    completion_rate = round((completed_orders / total_orders * 100) if total_orders > 0 else 0, 1)

    # Mock revenue (would calculate from actual invoices)
    revenue_map = {
        "today": 45000000,
        "week": 280000000,
        "month": 1150000000,
        "year": 13500000000,
    }

    return {
        "period": period,
        "date_range": {
            "from": start_date.isoformat(),
            "to": today.isoformat(),
        },
        "orders": {
            "total": total_orders,
            "completed": completed_orders,
            "completion_rate": completion_rate,
        },
        "drivers": {
            "active": active_drivers,
        },
        "revenue": revenue_map.get(period, 0),
    }


@router.get("/reports/top-customers")
def get_top_customers(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Top khách hàng theo số đơn
    """
    biz_info = validate_business_user(current_user, session)
    tenant_id = str(current_user.tenant_id)

    # Get order counts by customer
    results = session.exec(
        select(
            Order.customer_id,
            func.count(Order.id).label("order_count")
        ).where(
            Order.tenant_id == tenant_id,
            Order.customer_id.is_not(None)
        ).group_by(Order.customer_id).order_by(
            func.count(Order.id).desc()
        ).limit(limit)
    ).all()

    items = []
    for customer_id, order_count in results:
        customer = session.get(Customer, customer_id)
        if customer:
            items.append({
                "customer_id": customer.id,
                "customer_name": customer.name,
                "order_count": order_count,
                "revenue": order_count * 2500000,  # Mock revenue
            })

    return items


@router.get("/reports/top-drivers")
def get_top_drivers(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Top tài xế theo số chuyến
    """
    biz_info = validate_business_user(current_user, session)
    tenant_id = str(current_user.tenant_id)

    today = date.today()
    month_start = date(today.year, today.month, 1)

    # Get trip counts by driver this month
    results = session.exec(
        select(
            Order.driver_id,
            func.count(Order.id).label("trip_count")
        ).where(
            Order.tenant_id == tenant_id,
            Order.driver_id.is_not(None),
            Order.status.in_([OrderStatus.DELIVERED, OrderStatus.COMPLETED]),
            func.date(Order.order_date) >= month_start
        ).group_by(Order.driver_id).order_by(
            func.count(Order.id).desc()
        ).limit(limit)
    ).all()

    items = []
    for driver_id, trip_count in results:
        driver = session.get(Driver, driver_id)
        if driver:
            items.append({
                "driver_id": driver.id,
                "driver_name": driver.name,
                "trip_count": trip_count,
                "rating": 4.5 + (trip_count % 5) / 10,  # Mock rating
            })

    return items
