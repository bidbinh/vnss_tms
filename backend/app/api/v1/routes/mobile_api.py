"""
Mobile API - Endpoints dành cho app mobile tài xế
Sử dụng JWT authentication thay vì header X-Driver-Id
"""
import os
import uuid
from pathlib import Path
from datetime import datetime, date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlmodel import Session, select, func
from pydantic import BaseModel

from app.db.session import get_session
from app.core.config import settings
from app.models import User, Driver, Vehicle, Order, FuelLog, Customer, DriverSalarySetting, OrderStatusLog, IncomeTaxSetting, OrderDocument
from app.models.order import OrderStatus
from app.models.trip import Trip
from app.models.empty_return import EmptyReturn
from app.models.maintenance_record import MaintenanceRecord
from app.models.maintenance_schedule import MaintenanceSchedule
from app.models.site import Site
from app.core.security import get_current_user
from app.services.salary_calculator import calculate_trip_salary
from app.services.order_status_logger import get_delivered_date
from app.services.income_tax_calculator import calculate_seniority_bonus, calculate_salary_deductions
from datetime import timedelta

router = APIRouter(prefix="/mobile", tags=["mobile"])


class TripResponse(BaseModel):
    """Response model cho trip"""
    id: str
    trip_code: Optional[str] = None
    order_id: Optional[str] = None
    driver_id: Optional[str] = None
    vehicle_id: Optional[str] = None
    status: str
    departure_time: Optional[datetime] = None
    arrival_time: Optional[datetime] = None
    actual_departure: Optional[datetime] = None
    actual_arrival: Optional[datetime] = None
    distance_km: Optional[float] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    # Joined data
    order: Optional[dict] = None
    vehicle: Optional[dict] = None
    driver: Optional[dict] = None


class TripListResponse(BaseModel):
    """Response model cho danh sách trip"""
    items: List[TripResponse]
    total: int
    page: int
    size: int


class TripStatusUpdate(BaseModel):
    """Request model cho cập nhật status"""
    status: str
    actual_departure: Optional[datetime] = None
    actual_arrival: Optional[datetime] = None
    notes: Optional[str] = None


class FuelLogCreate(BaseModel):
    """Request model cho tạo fuel log"""
    vehicle_id: str
    fuel_date: date  # Maps to FuelLog.date
    liters: float  # Maps to FuelLog.actual_liters
    price_per_liter: int  # Maps to FuelLog.unit_price (VND)
    total_amount: int  # Maps to FuelLog.total_amount (VND)
    odometer: int  # Maps to FuelLog.odometer_km (required)
    notes: Optional[str] = None  # Maps to FuelLog.note


def get_driver_for_user(user: User, session: Session) -> Driver:
    """Lấy driver record liên kết với user"""
    # Dùng driver_id trực tiếp từ user
    if user.driver_id:
        driver = session.get(Driver, user.driver_id)
        if driver:
            return driver

    # Fallback: tìm theo phone
    if user.phone:
        driver = session.exec(
            select(Driver).where(
                Driver.tenant_id == user.tenant_id,
                Driver.phone == user.phone
            )
        ).first()
        if driver:
            return driver

    raise HTTPException(403, "Tài khoản của bạn chưa được liên kết với tài xế")


@router.get("/me")
def get_my_profile(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Lấy thông tin profile của driver đang đăng nhập"""
    try:
        driver = get_driver_for_user(current_user, session)
        return {
            "user": {
                "id": current_user.id,
                "email": current_user.email,
                "full_name": current_user.full_name,
                "phone": current_user.phone,
                "role": current_user.role,
            },
            "driver": {
                "id": driver.id,
                "full_name": driver.name,
                "phone": driver.phone,
                "license_no": driver.license_no,
                "status": driver.status,
            }
        }
    except HTTPException:
        # User không liên kết với driver, chỉ trả về user info
        return {
            "user": {
                "id": current_user.id,
                "email": current_user.email,
                "full_name": current_user.full_name,
                "phone": current_user.phone,
                "role": current_user.role,
            },
            "driver": None
        }


@router.get("/trips/my-trips")
def get_my_trips(
    status: Optional[str] = Query(None, description="Lọc theo status, có thể nhiều giá trị cách nhau bằng dấu phẩy"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Lấy danh sách chuyến xe của driver hiện tại"""
    driver = get_driver_for_user(current_user, session)

    # Query orders thay vì trips vì hệ thống chính dùng orders
    query = select(Order).where(
        Order.tenant_id == current_user.tenant_id,
        Order.driver_id == driver.id
    )

    # Filter by status
    if status:
        statuses = [s.strip() for s in status.split(",")]
        query = query.where(Order.status.in_(statuses))

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    query = query.order_by(Order.updated_at.desc())
    query = query.offset((page - 1) * size).limit(size)

    orders = session.exec(query).all()

    # Get vehicle info for driver
    vehicle_info = None
    if driver.vehicle_id:
        vehicle = session.get(Vehicle, driver.vehicle_id)
        if vehicle:
            vehicle_info = {
                "plate_number": vehicle.plate_no,
                "vehicle_type": vehicle.type,
            }

    # Build response with joined data
    items = []
    for order in orders:
        # Get customer name
        customer_name = None
        if order.customer_id:
            customer = session.get(Customer, order.customer_id)
            if customer:
                customer_name = customer.name

        # Get pickup/delivery location from Site
        pickup_location = order.pickup_text  # Fallback to text
        delivery_location = order.delivery_text
        if order.pickup_site_id:
            pickup_site = session.get(Site, order.pickup_site_id)
            if pickup_site:
                pickup_location = pickup_site.company_name
        if order.delivery_site_id:
            delivery_site = session.get(Site, order.delivery_site_id)
            if delivery_site:
                delivery_location = delivery_site.company_name

        items.append({
            "id": order.id,
            "trip_code": order.order_code,
            "order_id": order.id,
            "driver_id": order.driver_id,
            "vehicle_id": driver.vehicle_id,
            "status": order.status,
            "departure_time": order.eta_pickup_at,
            "arrival_time": order.eta_delivery_at,
            "actual_departure": None,
            "actual_arrival": None,
            "distance_km": order.distance_km,
            "notes": order.cargo_note,
            "created_at": order.created_at,
            "updated_at": order.updated_at,
            "order": {
                "order_code": order.order_code,
                "customer_name": customer_name,
                "pickup_location": pickup_location,
                "delivery_location": delivery_location,
                "container_no": order.container_code,
                "container_size": order.equipment,
            },
            "vehicle": vehicle_info,
            "driver": {
                "full_name": driver.name,
                "phone": driver.phone,
            }
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
    }


@router.get("/trips/my-trips/today")
def get_today_trips(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Lấy chuyến xe hôm nay của driver"""
    driver = get_driver_for_user(current_user, session)
    today = date.today()

    orders = session.exec(
        select(Order).where(
            Order.tenant_id == current_user.tenant_id,
            Order.driver_id == driver.id,
            func.date(Order.eta_pickup_at) == today
        ).order_by(Order.eta_pickup_at)
    ).all()

    # Get vehicle info for driver
    vehicle_info = None
    if driver.vehicle_id:
        vehicle = session.get(Vehicle, driver.vehicle_id)
        if vehicle:
            vehicle_info = {
                "plate_number": vehicle.plate_no,
                "vehicle_type": vehicle.type,
            }

    items = []
    for order in orders:
        # Get customer name
        customer_name = None
        if order.customer_id:
            customer = session.get(Customer, order.customer_id)
            if customer:
                customer_name = customer.name

        # Get pickup/delivery location from Site
        pickup_location = order.pickup_text  # Fallback to text
        delivery_location = order.delivery_text
        if order.pickup_site_id:
            pickup_site = session.get(Site, order.pickup_site_id)
            if pickup_site:
                pickup_location = pickup_site.company_name
        if order.delivery_site_id:
            delivery_site = session.get(Site, order.delivery_site_id)
            if delivery_site:
                delivery_location = delivery_site.company_name

        items.append({
            "id": order.id,
            "trip_code": order.order_code,
            "status": order.status,
            "departure_time": order.eta_pickup_at,
            "order": {
                "order_code": order.order_code,
                "customer_name": customer_name,
                "pickup_location": pickup_location,
                "delivery_location": delivery_location,
                "container_no": order.container_code,
            },
            "vehicle": vehicle_info,
        })

    return items


@router.get("/trips/{order_id}")
def get_trip_detail(
    order_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Lấy chi tiết chuyến xe"""
    driver = get_driver_for_user(current_user, session)

    order = session.exec(
        select(Order).where(
            Order.id == order_id,
            Order.tenant_id == current_user.tenant_id,
        )
    ).first()

    if not order:
        raise HTTPException(404, "Không tìm thấy chuyến xe")

    # Check if this trip belongs to the driver
    if order.driver_id != driver.id:
        raise HTTPException(403, "Đây không phải chuyến xe của bạn")

    # Get customer name
    customer_name = None
    if order.customer_id:
        customer = session.get(Customer, order.customer_id)
        if customer:
            customer_name = customer.name

    # Get pickup/delivery location and contact info from Site
    pickup_location = order.pickup_text  # Fallback to text
    delivery_location = order.delivery_text
    pickup_contact_name = None
    pickup_contact_phone = None
    delivery_contact_name = None
    delivery_contact_phone = None

    if order.pickup_site_id:
        pickup_site = session.get(Site, order.pickup_site_id)
        if pickup_site:
            pickup_location = pickup_site.company_name
            if pickup_site.detailed_address:
                pickup_location = f"{pickup_site.company_name} - {pickup_site.detailed_address}"
            pickup_contact_name = pickup_site.contact_name
            pickup_contact_phone = pickup_site.contact_phone
    if order.delivery_site_id:
        delivery_site = session.get(Site, order.delivery_site_id)
        if delivery_site:
            delivery_location = delivery_site.company_name
            if delivery_site.detailed_address:
                delivery_location = f"{delivery_site.company_name} - {delivery_site.detailed_address}"
            delivery_contact_name = delivery_site.contact_name
            delivery_contact_phone = delivery_site.contact_phone

    # Get vehicle info if driver has assigned vehicle
    vehicle_info = None
    if driver.vehicle_id:
        vehicle = session.get(Vehicle, driver.vehicle_id)
        if vehicle:
            vehicle_info = {
                "plate_number": vehicle.plate_no,
                "vehicle_type": vehicle.type,
            }

    # Get uploaded documents for this order
    order_docs = session.exec(
        select(OrderDocument).where(
            OrderDocument.tenant_id == current_user.tenant_id,
            OrderDocument.order_id == order.id
        ).order_by(OrderDocument.uploaded_at.desc())
    ).all()

    # Group documents by type and check if each type has uploads
    doc_by_type = {}
    for doc in order_docs:
        if doc.doc_type not in doc_by_type:
            doc_by_type[doc.doc_type] = []
        doc_by_type[doc.doc_type].append({
            "id": doc.id,
            "original_name": doc.original_name,
            "content_type": doc.content_type,
            "size_bytes": doc.size_bytes,
            "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
        })

    # Check if each document type has at least one upload
    has_container_receipt = len(doc_by_type.get("CONTAINER_RECEIPT", [])) > 0
    has_do = len(doc_by_type.get("DO", [])) > 0
    has_handover_report = len(doc_by_type.get("HANDOVER_REPORT", [])) > 0
    has_seal_photo = len(doc_by_type.get("SEAL_PHOTO", [])) > 0

    return {
        "id": order.id,
        "trip_code": order.order_code,
        "order_id": order.id,
        "driver_id": order.driver_id,
        "vehicle_id": driver.vehicle_id,
        "status": order.status,
        "departure_time": order.eta_pickup_at,
        "arrival_time": order.eta_delivery_at,
        "actual_departure": None,
        "actual_arrival": None,
        "distance_km": order.distance_km,
        "notes": order.cargo_note,
        "created_at": order.created_at,
        "updated_at": order.updated_at,
        "order": {
            "order_code": order.order_code,
            "customer_name": customer_name,
            "pickup_location": pickup_location,
            "delivery_location": delivery_location,
            "container_no": order.container_code,
            "container_size": order.equipment,
            # Contact info
            "pickup_contact_name": pickup_contact_name,
            "pickup_contact_phone": pickup_contact_phone,
            "delivery_contact_name": delivery_contact_name,
            "delivery_contact_phone": delivery_contact_phone,
            # Document status - "Đã có" if uploaded, "Chưa có" if not
            "container_receipt": "Đã có" if has_container_receipt else "Chưa có",
            "delivery_order_no": "Đã có" if has_do else "Chưa có",
            "handover_report": "Đã có" if has_handover_report else "Chưa có",
            "seal_no": "Đã có" if has_seal_photo else "Chưa có",
        },
        "vehicle": vehicle_info,
        "driver": {
            "full_name": driver.name,
            "phone": driver.phone,
        },
        # Include actual uploaded documents list
        "documents": doc_by_type,
    }


@router.patch("/trips/{order_id}/status")
def update_trip_status(
    order_id: str,
    data: TripStatusUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Cập nhật trạng thái chuyến xe"""
    driver = get_driver_for_user(current_user, session)

    order = session.exec(
        select(Order).where(
            Order.id == order_id,
            Order.tenant_id == current_user.tenant_id,
        )
    ).first()

    if not order:
        raise HTTPException(404, "Không tìm thấy chuyến xe")

    if order.driver_id != driver.id:
        raise HTTPException(403, "Đây không phải chuyến xe của bạn")

    # Validate status transition (uppercase to match OrderStatus enum)
    # Driver can: ASSIGNED -> IN_TRANSIT -> DELIVERED -> EMPTY_RETURN
    # Only Dispatcher can: -> COMPLETED
    valid_transitions = {
        "NEW": ["ASSIGNED", "REJECTED", "CANCELLED"],
        "ASSIGNED": ["IN_TRANSIT", "CANCELLED"],
        "IN_TRANSIT": ["DELIVERED", "CANCELLED"],
        "DELIVERED": ["EMPTY_RETURN", "CANCELLED"],  # Driver cannot go to COMPLETED directly
        "EMPTY_RETURN": ["CANCELLED"],  # Only Dispatcher can complete
        "COMPLETED": [],
        "CANCELLED": [],
    }

    current_status = order.status.upper() if order.status else "NEW"
    new_status = data.status.upper()

    # Check if transition is valid
    valid_next = valid_transitions.get(current_status, [])
    is_valid = new_status in valid_next

    if not is_valid:
        # Check if driver is trying to set COMPLETED
        if new_status == "COMPLETED":
            raise HTTPException(400, "Chỉ Dispatcher mới có thể đánh dấu hoàn thành đơn hàng")
        raise HTTPException(400, f"Không thể chuyển từ '{current_status}' sang '{new_status}'")

    # Check POD requirement for DELIVERED status
    if new_status == "DELIVERED":
        # Check if POD (HANDOVER_REPORT) has been uploaded
        pod_docs = session.exec(
            select(OrderDocument).where(
                OrderDocument.tenant_id == current_user.tenant_id,
                OrderDocument.order_id == order.id,
                OrderDocument.doc_type == "HANDOVER_REPORT"
            ).limit(1)
        ).first()

        if not pod_docs:
            raise HTTPException(400, "Vui lòng upload Bằng chứng giao hàng (POD) trước khi xác nhận giao hàng")

    # Log status change
    from app.services.order_status_logger import log_status_change
    log_status_change(
        session=session,
        order_id=order.id,
        from_status=current_status,
        to_status=new_status,
        changed_by_user_id=str(current_user.id),
        tenant_id=str(current_user.tenant_id)
    )

    # Update status
    order.status = new_status

    if data.notes:
        order.cargo_note = (order.cargo_note or "") + f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M')}] {data.notes}"

    order.updated_at = datetime.utcnow()
    session.commit()
    session.refresh(order)

    # Return full trip detail (same as get_trip_detail)
    # Get customer name
    customer_name = None
    if order.customer_id:
        customer = session.get(Customer, order.customer_id)
        if customer:
            customer_name = customer.name

    # Get pickup/delivery location and contact info from Site
    pickup_location = order.pickup_text
    delivery_location = order.delivery_text
    pickup_contact_name = None
    pickup_contact_phone = None
    delivery_contact_name = None
    delivery_contact_phone = None

    if order.pickup_site_id:
        pickup_site = session.get(Site, order.pickup_site_id)
        if pickup_site:
            pickup_location = pickup_site.company_name
            if pickup_site.detailed_address:
                pickup_location = f"{pickup_site.company_name} - {pickup_site.detailed_address}"
            pickup_contact_name = pickup_site.contact_name
            pickup_contact_phone = pickup_site.contact_phone
    if order.delivery_site_id:
        delivery_site = session.get(Site, order.delivery_site_id)
        if delivery_site:
            delivery_location = delivery_site.company_name
            if delivery_site.detailed_address:
                delivery_location = f"{delivery_site.company_name} - {delivery_site.detailed_address}"
            delivery_contact_name = delivery_site.contact_name
            delivery_contact_phone = delivery_site.contact_phone

    # Get vehicle info
    vehicle_info = None
    if driver.vehicle_id:
        vehicle = session.get(Vehicle, driver.vehicle_id)
        if vehicle:
            vehicle_info = {
                "plate_number": vehicle.plate_no,
                "vehicle_type": vehicle.type,
            }

    # Get uploaded documents
    order_docs = session.exec(
        select(OrderDocument).where(
            OrderDocument.tenant_id == current_user.tenant_id,
            OrderDocument.order_id == order.id
        ).order_by(OrderDocument.uploaded_at.desc())
    ).all()

    doc_by_type = {}
    for doc in order_docs:
        if doc.doc_type not in doc_by_type:
            doc_by_type[doc.doc_type] = []
        doc_by_type[doc.doc_type].append({
            "id": doc.id,
            "original_name": doc.original_name,
            "content_type": doc.content_type,
            "size_bytes": doc.size_bytes,
            "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
        })

    has_container_receipt = len(doc_by_type.get("CONTAINER_RECEIPT", [])) > 0
    has_do = len(doc_by_type.get("DO", [])) > 0
    has_handover_report = len(doc_by_type.get("HANDOVER_REPORT", [])) > 0
    has_seal_photo = len(doc_by_type.get("SEAL_PHOTO", [])) > 0

    return {
        "id": order.id,
        "trip_code": order.order_code,
        "order_id": order.id,
        "driver_id": order.driver_id,
        "vehicle_id": driver.vehicle_id,
        "status": order.status,
        "departure_time": order.eta_pickup_at,
        "arrival_time": order.eta_delivery_at,
        "actual_departure": None,
        "actual_arrival": None,
        "distance_km": order.distance_km,
        "notes": order.cargo_note,
        "created_at": order.created_at,
        "updated_at": order.updated_at,
        "order": {
            "order_code": order.order_code,
            "customer_name": customer_name,
            "pickup_location": pickup_location,
            "delivery_location": delivery_location,
            "container_no": order.container_code,
            "container_size": order.equipment,
            "pickup_contact_name": pickup_contact_name,
            "pickup_contact_phone": pickup_contact_phone,
            "delivery_contact_name": delivery_contact_name,
            "delivery_contact_phone": delivery_contact_phone,
            "container_receipt": "Đã có" if has_container_receipt else "Chưa có",
            "delivery_order_no": "Đã có" if has_do else "Chưa có",
            "handover_report": "Đã có" if has_handover_report else "Chưa có",
            "seal_no": "Đã có" if has_seal_photo else "Chưa có",
        },
        "vehicle": vehicle_info,
        "driver": {
            "full_name": driver.name,
            "phone": driver.phone,
        },
        "documents": doc_by_type,
    }


@router.get("/fuel-logs")
def get_my_fuel_logs(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Lấy danh sách nhiên liệu của driver"""
    driver = get_driver_for_user(current_user, session)

    query = select(FuelLog).where(
        FuelLog.tenant_id == current_user.tenant_id,
        FuelLog.driver_id == driver.id
    )

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination - FuelLog model uses 'date' not 'fuel_date'
    query = query.order_by(FuelLog.date.desc())
    query = query.offset((page - 1) * size).limit(size)

    logs = session.exec(query).all()

    items = []
    for log in logs:
        vehicle = session.get(Vehicle, log.vehicle_id) if log.vehicle_id else None
        items.append({
            "id": log.id,
            "fuel_date": str(log.date),  # date field
            "liters": log.actual_liters,  # actual_liters field
            "price_per_liter": log.unit_price,  # unit_price field
            "total_amount": log.total_amount,
            "odometer": log.odometer_km,  # odometer_km field
            "notes": log.note,  # note field (singular)
            "station_name": log.station_name,  # Tên trạm xăng
            "pump_image_url": log.pump_image,  # URL ảnh bơm xăng
            "vehicle": {
                "plate_number": vehicle.plate_no if vehicle else None,  # plate_no not plate_number
            } if vehicle else None,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
    }


class FuelLogUpdate(BaseModel):
    """Request model cho cập nhật fuel log"""
    liters: Optional[float] = None
    price_per_liter: Optional[int] = None
    total_amount: Optional[int] = None
    odometer: Optional[int] = None
    notes: Optional[str] = None
    station_name: Optional[str] = None


@router.post("/fuel-logs")
def create_fuel_log(
    data: FuelLogCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Tạo bản ghi nhiên liệu mới"""
    driver = get_driver_for_user(current_user, session)

    # Validate vehicle exists
    vehicle = session.get(Vehicle, data.vehicle_id)
    if not vehicle or vehicle.tenant_id != current_user.tenant_id:
        raise HTTPException(400, "Xe không tồn tại")

    fuel_log = FuelLog(
        tenant_id=current_user.tenant_id,
        vehicle_id=data.vehicle_id,
        driver_id=driver.id,
        date=data.fuel_date,  # date field
        actual_liters=data.liters,  # actual_liters field
        unit_price=data.price_per_liter,  # unit_price field
        total_amount=data.total_amount,
        odometer_km=data.odometer,  # odometer_km field
        note=data.notes,  # note field (singular)
        station_name=data.station_name if hasattr(data, 'station_name') else None,
    )

    session.add(fuel_log)
    session.commit()
    session.refresh(fuel_log)

    return {
        "id": fuel_log.id,
        "message": "Đã tạo bản ghi nhiên liệu",
    }


@router.put("/fuel-logs/{fuel_log_id}")
def update_fuel_log(
    fuel_log_id: str,
    data: FuelLogUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Cập nhật bản ghi nhiên liệu"""
    driver = get_driver_for_user(current_user, session)
    tenant_id = str(current_user.tenant_id)

    # Get fuel log
    fuel_log = session.get(FuelLog, fuel_log_id)
    if not fuel_log or fuel_log.tenant_id != tenant_id:
        raise HTTPException(404, "Không tìm thấy bản ghi")

    # Validate ownership
    if fuel_log.driver_id != driver.id:
        raise HTTPException(403, "Bạn không có quyền sửa bản ghi này")

    # Update fields
    if data.liters is not None:
        fuel_log.actual_liters = data.liters
    if data.price_per_liter is not None:
        fuel_log.unit_price = data.price_per_liter
    if data.total_amount is not None:
        fuel_log.total_amount = data.total_amount
    if data.odometer is not None:
        fuel_log.odometer_km = data.odometer
    if data.notes is not None:
        fuel_log.note = data.notes
    if data.station_name is not None:
        fuel_log.station_name = data.station_name

    session.commit()
    session.refresh(fuel_log)

    return {
        "message": "Đã cập nhật bản ghi nhiên liệu",
    }


@router.post("/fuel-logs/upload")
def create_fuel_log_with_image(
    fuel_date: str = Query(...),
    liters: float = Query(...),
    price_per_liter: int = Query(...),
    total_amount: int = Query(...),
    odometer: Optional[int] = Query(None),
    station_name: Optional[str] = Query(None),
    notes: Optional[str] = Query(None),
    image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Tạo bản ghi nhiên liệu với ảnh"""
    driver = get_driver_for_user(current_user, session)
    tenant_id = str(current_user.tenant_id)

    # Validate image
    if image.content_type not in {"image/jpeg", "image/png", "image/jpg", "image/webp"}:
        raise HTTPException(400, "Chỉ chấp nhận ảnh JPEG/PNG/WEBP")

    # Read file
    content = image.file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(400, "File quá lớn (tối đa 10MB)")

    # Get driver's vehicle
    vehicle = None
    if driver.vehicle_id:
        vehicle = session.get(Vehicle, driver.vehicle_id)

    if not vehicle:
        raise HTTPException(400, "Tài xế chưa được gán xe")

    # Create storage directory
    storage_dir = Path(settings.STORAGE_DIR) / tenant_id / "fuel_logs"
    storage_dir.mkdir(parents=True, exist_ok=True)

    # Generate unique filename
    ext = Path(image.filename or "").suffix or ".jpg"
    safe_name = f"{uuid.uuid4().hex}{ext}"
    save_path = storage_dir / safe_name

    # Save file
    with open(save_path, "wb") as f:
        f.write(content)

    # Generate URL path
    file_url = f"/storage/{tenant_id}/fuel_logs/{safe_name}"

    # Create fuel log
    fuel_log = FuelLog(
        tenant_id=tenant_id,
        vehicle_id=vehicle.id,
        driver_id=driver.id,
        date=datetime.strptime(fuel_date, "%Y-%m-%d").date(),
        actual_liters=liters,
        unit_price=price_per_liter,
        total_amount=total_amount,
        odometer_km=odometer,
        note=notes,
        station_name=station_name,
        pump_image=file_url,
    )

    session.add(fuel_log)
    session.commit()
    session.refresh(fuel_log)

    return {
        "id": fuel_log.id,
        "message": "Đã tạo bản ghi nhiên liệu với ảnh",
    }


@router.get("/salary/summary")
def get_salary_summary(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020, le=2100),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Lấy tóm tắt lương tháng - Theo logic webapp
    Tính lương dựa trên:
    - Khoảng cách (km) với 13 mức giá theo cảng/kho
    - Phí cổng cảng, bạt Mooc sàn, thưởng hàng xá
    - Thưởng chuyến trong ngày (chuyến 2, 3+)
    - Thưởng số lượng chuyến tháng (45-50, 51-54, 55+)
    - Hệ số ngày lễ (2.0x)
    - Các khoản khấu trừ (BHXH, BHYT, BHTN, thuế TNCN, tạm ứng)
    """
    driver = get_driver_for_user(current_user, session)
    tenant_id = str(current_user.tenant_id)

    # Get active salary settings
    settings = session.exec(
        select(DriverSalarySetting).where(
            DriverSalarySetting.tenant_id == tenant_id,
            DriverSalarySetting.status == "ACTIVE"
        ).limit(1)
    ).first()

    if not settings:
        # Return basic info if no settings configured
        return {
            "driver_id": driver.id,
            "driver_name": driver.name,
            "month": month,
            "year": year,
            "trip_count": 0,
            "base_salary": driver.base_salary or 0,
            "trip_salary": 0,
            "monthly_bonus": 0,
            "seniority_bonus": 0,
            "gross_salary": driver.base_salary or 0,
            "deductions": {},
            "net_salary": driver.base_salary or 0,
            "status": "pending",
            "note": "Chua co cai dat luong. Vui long lien he quan tri vien.",
        }

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
        # No trips in this month
        base_salary = driver.base_salary or 0
        report_date = date(year, month, 1)
        seniority_bonus = calculate_seniority_bonus(driver, report_date)

        return {
            "driver_id": driver.id,
            "driver_name": driver.name,
            "month": month,
            "year": year,
            "trip_count": 0,
            "base_salary": base_salary,
            "trip_salary": 0,
            "monthly_bonus": 0,
            "seniority_bonus": seniority_bonus,
            "gross_salary": base_salary + seniority_bonus,
            "deductions": {},
            "net_salary": base_salary + seniority_bonus,
            "status": "pending",
            "note": "Khong co chuyen xe trong thang nay",
        }

    # Get orders for this driver that were delivered in this month
    orders = session.exec(
        select(Order).where(
            Order.tenant_id == tenant_id,
            Order.id.in_(delivered_order_ids),
            Order.driver_id == driver.id,
            Order.status.in_([OrderStatus.DELIVERED, OrderStatus.COMPLETED])
        )
    ).all()

    # Calculate trip-based salary
    trips = []
    total_trip_salary = 0
    daily_trip_counts = {}  # Track trips per delivered_date

    for order in orders:
        # Get delivered_date from status logs
        delivered_datetime = get_delivered_date(session, order.id)
        if not delivered_datetime:
            continue

        delivered_date = delivered_datetime.date()
        delivered_date_str = delivered_date.isoformat()

        # Count trips for this delivered_date
        if delivered_date_str not in daily_trip_counts:
            daily_trip_counts[delivered_date_str] = 0
        daily_trip_counts[delivered_date_str] += 1
        trip_number_in_day = daily_trip_counts[delivered_date_str]

        # Calculate trip salary using webapp logic
        trip_salary = calculate_trip_salary(
            session=session,
            order=order,
            settings=settings,
            trip_number_in_day=trip_number_in_day,
            delivered_date=delivered_date
        )

        trips.append({
            "order_id": order.id,
            "order_code": order.order_code,
            "delivered_date": delivered_date_str,
            "distance_km": order.distance_km,
            "trip_number_in_day": trip_number_in_day,
            **trip_salary
        })

        total_trip_salary += trip_salary["total"]

    trip_count = len(trips)

    # Calculate monthly bonus based on trip count
    monthly_bonus = 0
    if trip_count >= 55:
        monthly_bonus = settings.bonus_55_plus_trips
    elif trip_count >= 51:
        monthly_bonus = settings.bonus_51_54_trips
    elif trip_count >= 45:
        monthly_bonus = settings.bonus_45_50_trips

    # Calculate seniority bonus
    report_date = date(year, month, 1)
    seniority_bonus = calculate_seniority_bonus(driver, report_date)

    # Calculate base salary
    base_salary = driver.base_salary or 0

    # Calculate deductions (BHXH, BHYT, BHTN, thuế TNCN, tạm ứng)
    tax_setting = session.exec(
        select(IncomeTaxSetting).where(
            IncomeTaxSetting.tenant_id == tenant_id,
            IncomeTaxSetting.status == "ACTIVE"
        ).limit(1)
    ).first()

    deductions = calculate_salary_deductions(
        session=session,
        driver=driver,
        base_salary=base_salary,
        trip_salary=total_trip_salary,
        monthly_bonus=monthly_bonus,
        seniority_bonus=seniority_bonus,
        tenant_id=tenant_id,
        year=year,
        month=month,
        tax_setting=tax_setting,
        update_advance_payment_status=False  # Don't update, just calculate
    )

    return {
        "driver_id": driver.id,
        "driver_name": driver.name,
        "month": month,
        "year": year,
        "trip_count": trip_count,
        "base_salary": base_salary,
        "trip_salary": total_trip_salary,
        "monthly_bonus": monthly_bonus,
        "seniority_bonus": seniority_bonus,
        "gross_salary": deductions["gross_income"],
        "deductions": {
            "social_insurance": deductions["social_insurance"],
            "health_insurance": deductions["health_insurance"],
            "unemployment_insurance": deductions["unemployment_insurance"],
            "income_tax": deductions["income_tax"],
            "advance_payment": deductions["advance_payment"],
            "total": deductions["total_deductions"],
        },
        "net_salary": deductions["net_salary"],
        "status": "pending",
        "trips": trips[:5],  # Only return first 5 trips for summary
        "note": f"Luong thang {month}/{year} - {trip_count} chuyen",
    }


# ==================== DASHBOARD / THỐNG KÊ ====================

@router.get("/dashboard")
def get_dashboard(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Lấy thông tin dashboard tổng quan cho tài xế
    Bao gồm: thống kê tháng, chuyến hôm nay, nhiên liệu 15 ngày, cảnh báo bảo trì
    """
    driver = get_driver_for_user(current_user, session)
    tenant_id = str(current_user.tenant_id)
    today = date.today()
    current_month = today.month
    current_year = today.year

    # 1. Thống kê chuyến tháng này
    month_start = date(current_year, current_month, 1)
    trip_count_month = session.exec(
        select(func.count()).select_from(Order).where(
            Order.tenant_id == tenant_id,
            Order.driver_id == driver.id,
            Order.status.in_([OrderStatus.DELIVERED, OrderStatus.COMPLETED]),
            func.date(Order.updated_at) >= month_start
        )
    ).one()

    # 2. Tổng km tháng này (tính từ chênh lệch odometer trong FuelLog)
    # Lấy odometer nhỏ nhất và lớn nhất trong tháng
    fuel_logs_month = session.exec(
        select(FuelLog.odometer_km).where(
            FuelLog.tenant_id == tenant_id,
            FuelLog.driver_id == driver.id,
            FuelLog.date >= month_start
        ).order_by(FuelLog.odometer_km)
    ).all()

    total_km_month = 0
    if len(fuel_logs_month) >= 2:
        total_km_month = fuel_logs_month[-1] - fuel_logs_month[0]
    elif len(fuel_logs_month) == 1:
        # Nếu chỉ có 1 log trong tháng, lấy log trước đó để tính
        prev_log = session.exec(
            select(FuelLog.odometer_km).where(
                FuelLog.tenant_id == tenant_id,
                FuelLog.driver_id == driver.id,
                FuelLog.date < month_start
            ).order_by(FuelLog.date.desc()).limit(1)
        ).first()
        if prev_log:
            total_km_month = fuel_logs_month[0] - prev_log

    # 3. Chuyến hôm nay
    trips_today = session.exec(
        select(Order).where(
            Order.tenant_id == tenant_id,
            Order.driver_id == driver.id,
            func.date(Order.eta_pickup_at) == today
        ).order_by(Order.eta_pickup_at)
    ).all()

    trips_today_data = []
    for order in trips_today:
        customer_name = None
        if order.customer_id:
            customer = session.get(Customer, order.customer_id)
            if customer:
                customer_name = customer.name

        # Get pickup/delivery location from Site
        pickup_location = order.pickup_text  # Fallback to text
        delivery_location = order.delivery_text
        if order.pickup_site_id:
            pickup_site = session.get(Site, order.pickup_site_id)
            if pickup_site:
                pickup_location = pickup_site.code or pickup_site.company_name
        if order.delivery_site_id:
            delivery_site = session.get(Site, order.delivery_site_id)
            if delivery_site:
                delivery_location = delivery_site.code or delivery_site.company_name

        trips_today_data.append({
            "id": order.id,
            "order_code": order.order_code,
            "status": order.status,
            "pickup_location": pickup_location,
            "delivery_location": delivery_location,
            "customer_name": customer_name,
            "container_no": order.container_code,
            "eta_pickup": order.eta_pickup_at.isoformat() if order.eta_pickup_at else None,
        })

    # 4. Mức tiêu hao nhiên liệu trung bình (L/100km) từ 7 lần đổ dầu gần nhất
    # Lấy 7 lần đổ dầu gần nhất (sắp xếp theo ngày và odometer)
    recent_fuel_logs = session.exec(
        select(FuelLog).where(
            FuelLog.tenant_id == tenant_id,
            FuelLog.driver_id == driver.id
        ).order_by(FuelLog.date.desc(), FuelLog.odometer_km.desc()).limit(7)
    ).all()

    fuel_consumption_per_100km = 0.0
    total_liters_7_logs = 0.0
    total_km_7_logs = 0

    if len(recent_fuel_logs) >= 2:
        # Tính tổng lít và tổng km giữa lần đổ đầu tiên và cuối cùng
        # Sắp xếp lại theo thứ tự tăng dần odometer
        sorted_logs = sorted(recent_fuel_logs, key=lambda x: x.odometer_km)
        first_log = sorted_logs[0]
        last_log = sorted_logs[-1]

        total_km_7_logs = last_log.odometer_km - first_log.odometer_km
        # Tổng lít = tất cả các lần đổ trừ lần đầu tiên (vì lần đầu là điểm bắt đầu)
        total_liters_7_logs = sum(log.actual_liters for log in sorted_logs[1:])

        if total_km_7_logs > 0:
            fuel_consumption_per_100km = round((total_liters_7_logs / total_km_7_logs) * 100, 2)

    # 4b. Chi phí bảo trì/bảo dưỡng trung bình/tháng trong 365 ngày gần nhất
    one_year_ago = today - timedelta(days=365)
    maintenance_total_cost = session.exec(
        select(func.coalesce(func.sum(MaintenanceRecord.total_cost), 0)).where(
            MaintenanceRecord.tenant_id == tenant_id,
            MaintenanceRecord.service_date >= one_year_ago
        )
    ).one()
    # Tính trung bình/tháng (365 ngày = 12 tháng)
    maintenance_avg_monthly = int(maintenance_total_cost / 12) if maintenance_total_cost else 0

    # 5. Tổng lương chuyến tháng này (ước tính đơn giản)
    # Lấy từ salary API nếu cần chi tiết hơn
    trip_salary_estimate = trip_count_month * 500000  # Ước tính 500k/chuyến

    # 6. Cảnh báo bảo trì - Lấy từ các xe driver đã sử dụng gần đây (dùng Trip model)
    maintenance_alerts = []
    # Tìm các vehicle_id mà driver đã lái trong 30 ngày gần đây từ bảng trips
    thirty_days_ago = today - timedelta(days=30)
    recent_vehicle_ids = session.exec(
        select(Trip.vehicle_id).where(
            Trip.tenant_id == tenant_id,
            Trip.driver_id == driver.id,
            Trip.vehicle_id.is_not(None),
            func.date(Trip.updated_at) >= thirty_days_ago
        ).distinct()
    ).all()

    for vehicle_id in recent_vehicle_ids:
        if not vehicle_id:
            continue
        vehicle = session.get(Vehicle, vehicle_id)
        if not vehicle:
            continue

        # Kiểm tra lịch bảo trì sắp đến hạn
        schedules = session.exec(
            select(MaintenanceSchedule).where(
                MaintenanceSchedule.vehicle_id == vehicle_id,
                MaintenanceSchedule.status == "ACTIVE"
            )
        ).all()

        for schedule in schedules:
            if schedule.next_due_date:
                days_until = (schedule.next_due_date - today).days
                if days_until <= (schedule.alert_before_days or 7):
                    maintenance_alerts.append({
                        "vehicle_plate": vehicle.plate_no,
                        "maintenance_type": schedule.maintenance_type,
                        "due_date": schedule.next_due_date.isoformat(),
                        "days_until": days_until,
                    })

    # 7. Hạ rỗng chờ xử lý
    pending_empty_returns = session.exec(
        select(func.count()).select_from(EmptyReturn).where(
            EmptyReturn.tenant_id == tenant_id,
            EmptyReturn.status == "PENDING"
        )
    ).one()

    return {
        "driver": {
            "id": driver.id,
            "name": driver.name,
            "phone": driver.phone,
        },
        "thong_ke_thang": {
            "thang": current_month,
            "nam": current_year,
            "so_chuyen": trip_count_month,
            "tong_km": float(total_km_month),
            "luong_chuyen_uoc_tinh": trip_salary_estimate,
        },
        "nhien_lieu": {
            "muc_tieu_hao_100km": fuel_consumption_per_100km,  # L/100km
            "tong_km_7_lan": total_km_7_logs,  # Tổng km của 7 lần đổ gần nhất
            "tong_lit_7_lan": round(total_liters_7_logs, 2),  # Tổng lít của 7 lần đổ
        },
        "bao_tri_trung_binh": {
            "chi_phi_thang": maintenance_avg_monthly,  # Chi phí bảo trì TB/tháng (365 ngày)
        },
        "chuyen_hom_nay": {
            "so_luong": len(trips_today_data),
            "danh_sach": trips_today_data,
        },
        "canh_bao_bao_tri": maintenance_alerts,
        "ha_rong_cho_xu_ly": pending_empty_returns,
    }


# ==================== HẠ RỖNG (EMPTY RETURN) ====================

class EmptyReturnCreate(BaseModel):
    """Request model cho tạo/khởi tạo hạ rỗng"""
    order_id: str


class EmptyReturnSubmit(BaseModel):
    """Request model cho submit hạ rỗng đầy đủ"""
    return_date: date
    port_site_id: Optional[str] = None

    # Chi tiết phí
    cleaning_fee: int = 0  # Phí vệ sinh
    cleaning_fee_paid: int = 0  # Đã trả phí vệ sinh
    lift_fee: int = 0  # Phí nâng hạ
    lift_fee_paid: int = 0  # Đã trả phí nâng hạ
    storage_fee: int = 0  # Phí lưu bãi
    storage_fee_paid: int = 0  # Đã trả phí lưu bãi
    repair_fee: int = 0  # Phí/cược sửa chữa
    repair_fee_paid: int = 0  # Đã trả phí sửa chữa
    other_fee: int = 0  # Phí khác
    other_fee_paid: int = 0  # Đã trả phí khác
    other_fee_note: Optional[str] = None  # Ghi chú phí khác

    # Thông tin bổ sung
    seal_number: Optional[str] = None
    return_location: Optional[str] = None
    notes: Optional[str] = None


@router.get("/empty-returns")
def get_my_empty_returns(
    status: Optional[str] = Query(None, description="Filter: pending, completed, all"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Lấy danh sách hạ rỗng - Tự động lấy từ orders:
    - Lấy hàng từ cảng (pickup_site.site_type = 'PORT')
    - Đã giao hàng (status = DELIVERED) nhưng chưa hoàn thành (không phải COMPLETED)
    - Kết hợp với EmptyReturn nếu đã có

    Status filter:
    - pending: Chưa tạo EmptyReturn hoặc EmptyReturn.status = PENDING
    - completed: EmptyReturn.status = COMPLETED
    - all: Tất cả
    """
    driver = get_driver_for_user(current_user, session)
    tenant_id = str(current_user.tenant_id)

    # Lấy các orders của driver từ cảng, đã giao (DELIVERED) hoặc đang giao
    # Điều kiện: pickup_site là PORT
    orders_query = (
        select(Order, Site)
        .join(Site, Order.pickup_site_id == Site.id)
        .where(
            Order.tenant_id == tenant_id,
            Order.driver_id == driver.id,
            Site.site_type == "PORT",
            Order.status.in_(["DELIVERED", "IN_TRANSIT"])  # Đã giao hoặc đang giao
        )
        .order_by(Order.order_date.desc())
    )

    orders_with_sites = session.exec(orders_query).all()

    # Kết hợp với EmptyReturn data
    items = []
    for order, pickup_site in orders_with_sites:
        # Tìm EmptyReturn nếu có
        empty_return = session.exec(
            select(EmptyReturn).where(
                EmptyReturn.tenant_id == tenant_id,
                EmptyReturn.order_id == order.id
            )
        ).first()

        # Lấy port trả rỗng (ưu tiên từ EmptyReturn, fallback về order.port_site_id)
        return_port = None
        if empty_return and empty_return.port_site_id:
            return_port = session.get(Site, empty_return.port_site_id)
        elif order.port_site_id:
            return_port = session.get(Site, order.port_site_id)

        # Lấy customer name
        customer = session.get(Customer, order.customer_id) if order.customer_id else None

        # Xác định trạng thái hiển thị
        if empty_return:
            display_status = empty_return.status.lower() if empty_return.status else "pending"
        else:
            display_status = "pending"  # Chưa tạo EmptyReturn = đang chờ xử lý

        # Filter theo status
        if status and status != "all":
            if status == "pending" and display_status not in ["pending"]:
                continue
            if status == "completed" and display_status != "completed":
                continue

        items.append({
            "id": empty_return.id if empty_return else f"order_{order.id}",
            "order_id": order.id,
            "order_code": order.order_code,
            "container_no": order.container_code,
            "order_status": order.status,
            "customer_name": customer.name if customer else None,
            "pickup_port": pickup_site.company_name if pickup_site else None,
            "return_port": return_port.company_name if return_port else None,
            "return_date": empty_return.return_date.isoformat() if empty_return and empty_return.return_date else None,
            "port_name": return_port.company_name if return_port else None,
            "total_amount": empty_return.total_amount if empty_return else 0,
            "payer": empty_return.payer if empty_return else None,
            "seal_number": empty_return.seal_number if empty_return else None,
            "return_location": empty_return.return_location if empty_return else None,
            "notes": empty_return.notes if empty_return else order.empty_return_note,
            "status": display_status,
            "has_empty_return": empty_return is not None,
            "delivery_location": order.delivery_text,
        })

    # Pagination (simple in-memory since we need to merge data)
    total = len(items)
    start = (page - 1) * size
    end = start + size
    paginated_items = items[start:end]

    return {
        "items": paginated_items,
        "total": total,
        "page": page,
        "size": size,
    }


@router.post("/empty-returns")
def create_empty_return(
    data: EmptyReturnCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Tạo/khởi tạo bản ghi hạ rỗng cho order"""
    driver = get_driver_for_user(current_user, session)
    tenant_id = str(current_user.tenant_id)

    # Validate order belongs to driver
    order = session.get(Order, data.order_id)
    if not order or order.tenant_id != tenant_id:
        raise HTTPException(400, "Đơn hàng không tồn tại")
    if order.driver_id != driver.id:
        raise HTTPException(403, "Đây không phải đơn hàng của bạn")

    # Check if empty return already exists
    existing = session.exec(
        select(EmptyReturn).where(
            EmptyReturn.tenant_id == tenant_id,
            EmptyReturn.order_id == data.order_id
        )
    ).first()

    if existing:
        return {
            "id": existing.id,
            "message": "Đã có bản ghi hạ rỗng",
            "is_existing": True,
        }

    empty_return = EmptyReturn(
        tenant_id=tenant_id,
        order_id=data.order_id,
        port_site_id=order.port_site_id,  # Lấy từ order nếu có
        status="PENDING",
    )

    session.add(empty_return)
    session.commit()
    session.refresh(empty_return)

    return {
        "id": empty_return.id,
        "message": "Đã tạo bản ghi hạ rỗng",
        "is_existing": False,
    }


@router.get("/empty-returns/{empty_return_id}")
def get_empty_return_detail(
    empty_return_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Lấy chi tiết hạ rỗng"""
    driver = get_driver_for_user(current_user, session)
    tenant_id = str(current_user.tenant_id)

    # Nếu ID bắt đầu bằng "order_" thì lấy từ order
    if empty_return_id.startswith("order_"):
        order_id = empty_return_id.replace("order_", "")
        order = session.get(Order, order_id)
        if not order or order.tenant_id != tenant_id or order.driver_id != driver.id:
            raise HTTPException(404, "Không tìm thấy đơn hàng")

        # Check if empty return exists
        empty_return = session.exec(
            select(EmptyReturn).where(
                EmptyReturn.tenant_id == tenant_id,
                EmptyReturn.order_id == order_id
            )
        ).first()

        if empty_return:
            empty_return_id = empty_return.id
        else:
            # Return order info without empty return
            pickup_site = session.get(Site, order.pickup_site_id) if order.pickup_site_id else None
            return_port = session.get(Site, order.port_site_id) if order.port_site_id else None
            customer = session.get(Customer, order.customer_id) if order.customer_id else None

            return {
                "id": None,
                "order_id": order.id,
                "order_code": order.order_code,
                "container_no": order.container_code,
                "customer_name": customer.name if customer else None,
                "pickup_port": pickup_site.company_name if pickup_site else None,
                "delivery_location": order.delivery_text,
                "return_port_id": order.port_site_id,
                "return_port_name": return_port.company_name if return_port else None,
                "return_date": None,
                "has_empty_return": False,
                "status": "pending",
                # All fees are 0
                "return_slip_image": None,
                "fee_receipt_image": None,
                "repair_deposit_image": None,
                "cleaning_fee": 0,
                "cleaning_fee_paid": 0,
                "lift_fee": 0,
                "lift_fee_paid": 0,
                "storage_fee": 0,
                "storage_fee_paid": 0,
                "repair_fee": 0,
                "repair_fee_paid": 0,
                "other_fee": 0,
                "other_fee_paid": 0,
                "other_fee_note": None,
                "total_amount": 0,
                "total_paid": 0,
                "seal_number": None,
                "return_location": None,
                "notes": order.empty_return_note,
            }

    # Get empty return by ID
    empty_return = session.get(EmptyReturn, empty_return_id)
    if not empty_return or empty_return.tenant_id != tenant_id:
        raise HTTPException(404, "Không tìm thấy bản ghi hạ rỗng")

    # Validate driver owns this order
    order = session.get(Order, empty_return.order_id)
    if not order or order.driver_id != driver.id:
        raise HTTPException(403, "Bạn không có quyền xem bản ghi này")

    pickup_site = session.get(Site, order.pickup_site_id) if order.pickup_site_id else None
    return_port = session.get(Site, empty_return.port_site_id) if empty_return.port_site_id else None
    customer = session.get(Customer, order.customer_id) if order.customer_id else None

    return {
        "id": empty_return.id,
        "order_id": empty_return.order_id,
        "order_code": order.order_code,
        "container_no": order.container_code,
        "customer_name": customer.name if customer else None,
        "pickup_port": pickup_site.company_name if pickup_site else None,
        "delivery_location": order.delivery_text,
        "return_port_id": empty_return.port_site_id,
        "return_port_name": return_port.company_name if return_port else None,
        "return_date": empty_return.return_date.isoformat() if empty_return.return_date else None,
        "has_empty_return": True,
        "status": empty_return.status.lower() if empty_return.status else "pending",
        # Images
        "return_slip_image": empty_return.return_slip_image,
        "fee_receipt_image": empty_return.fee_receipt_image,
        "repair_deposit_image": empty_return.repair_deposit_image,
        # Fees
        "cleaning_fee": empty_return.cleaning_fee,
        "cleaning_fee_paid": empty_return.cleaning_fee_paid,
        "lift_fee": empty_return.lift_fee,
        "lift_fee_paid": empty_return.lift_fee_paid,
        "storage_fee": empty_return.storage_fee,
        "storage_fee_paid": empty_return.storage_fee_paid,
        "repair_fee": empty_return.repair_fee,
        "repair_fee_paid": empty_return.repair_fee_paid,
        "other_fee": empty_return.other_fee,
        "other_fee_paid": empty_return.other_fee_paid,
        "other_fee_note": empty_return.other_fee_note,
        "total_amount": empty_return.total_amount,
        "total_paid": empty_return.total_paid,
        # Other
        "seal_number": empty_return.seal_number,
        "return_location": empty_return.return_location,
        "notes": empty_return.notes,
    }


@router.put("/empty-returns/{empty_return_id}/submit")
def submit_empty_return(
    empty_return_id: str,
    data: EmptyReturnSubmit,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Submit hạ rỗng với đầy đủ thông tin phí"""
    driver = get_driver_for_user(current_user, session)
    tenant_id = str(current_user.tenant_id)

    empty_return = session.get(EmptyReturn, empty_return_id)
    if not empty_return or empty_return.tenant_id != tenant_id:
        raise HTTPException(404, "Không tìm thấy bản ghi hạ rỗng")

    # Validate driver owns this order
    order = session.get(Order, empty_return.order_id)
    if not order or order.driver_id != driver.id:
        raise HTTPException(403, "Bạn không có quyền cập nhật bản ghi này")

    # Validate required image
    if not empty_return.return_slip_image:
        raise HTTPException(400, "Vui lòng upload Phiếu hạ rỗng trước khi submit")

    # Update fields
    empty_return.return_date = data.return_date
    if data.port_site_id:
        empty_return.port_site_id = data.port_site_id

    # Update fees
    empty_return.cleaning_fee = data.cleaning_fee
    empty_return.cleaning_fee_paid = data.cleaning_fee_paid
    empty_return.lift_fee = data.lift_fee
    empty_return.lift_fee_paid = data.lift_fee_paid
    empty_return.storage_fee = data.storage_fee
    empty_return.storage_fee_paid = data.storage_fee_paid
    empty_return.repair_fee = data.repair_fee
    empty_return.repair_fee_paid = data.repair_fee_paid
    empty_return.other_fee = data.other_fee
    empty_return.other_fee_paid = data.other_fee_paid
    empty_return.other_fee_note = data.other_fee_note

    # Calculate totals
    empty_return.total_amount = (
        data.cleaning_fee + data.lift_fee + data.storage_fee +
        data.repair_fee + data.other_fee
    )
    empty_return.total_paid = (
        data.cleaning_fee_paid + data.lift_fee_paid + data.storage_fee_paid +
        data.repair_fee_paid + data.other_fee_paid
    )

    # Other info
    empty_return.seal_number = data.seal_number
    empty_return.return_location = data.return_location
    empty_return.notes = data.notes

    # Change status to SUBMITTED
    empty_return.status = "SUBMITTED"

    session.commit()
    session.refresh(empty_return)

    return {
        "id": empty_return.id,
        "status": empty_return.status,
        "total_amount": empty_return.total_amount,
        "total_paid": empty_return.total_paid,
        "message": "Đã submit hạ rỗng thành công",
    }


ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/jpg", "image/webp"}
ALLOWED_DOC_TYPES = {"return_slip", "fee_receipt", "repair_deposit"}


@router.post("/empty-returns/{empty_return_id}/upload/{doc_type}")
def upload_empty_return_image(
    empty_return_id: str,
    doc_type: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Upload ảnh chứng từ cho hạ rỗng

    doc_type:
    - return_slip: Phiếu hạ rỗng (bắt buộc)
    - fee_receipt: Phiếu thu phí
    - repair_deposit: Phiếu cược sửa chữa
    """
    driver = get_driver_for_user(current_user, session)
    tenant_id = str(current_user.tenant_id)

    if doc_type not in ALLOWED_DOC_TYPES:
        raise HTTPException(400, f"Loại chứng từ không hợp lệ. Chấp nhận: {', '.join(ALLOWED_DOC_TYPES)}")

    # Validate content type
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(400, f"Chỉ chấp nhận ảnh: {', '.join(ALLOWED_IMAGE_TYPES)}")

    empty_return = session.get(EmptyReturn, empty_return_id)
    if not empty_return or empty_return.tenant_id != tenant_id:
        raise HTTPException(404, "Không tìm thấy bản ghi hạ rỗng")

    # Validate driver owns this order
    order = session.get(Order, empty_return.order_id)
    if not order or order.driver_id != driver.id:
        raise HTTPException(403, "Bạn không có quyền upload cho bản ghi này")

    # Create storage directory
    storage_dir = Path(settings.STORAGE_DIR) / tenant_id / "empty_returns" / empty_return_id
    storage_dir.mkdir(parents=True, exist_ok=True)

    # Generate unique filename
    ext = Path(file.filename or "").suffix or ".jpg"
    safe_name = f"{doc_type}_{uuid.uuid4().hex}{ext}"
    save_path = storage_dir / safe_name

    # Read and save file
    content = file.file.read()
    if not content:
        raise HTTPException(400, "File rỗng")

    if len(content) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(400, "File quá lớn (tối đa 10MB)")

    with open(save_path, "wb") as f:
        f.write(content)

    # Generate URL path (relative)
    file_url = f"/storage/{tenant_id}/empty_returns/{empty_return_id}/{safe_name}"

    # Update the correct field based on doc_type
    if doc_type == "return_slip":
        empty_return.return_slip_image = file_url
    elif doc_type == "fee_receipt":
        empty_return.fee_receipt_image = file_url
    elif doc_type == "repair_deposit":
        empty_return.repair_deposit_image = file_url

    session.commit()

    return {
        "success": True,
        "doc_type": doc_type,
        "file_url": file_url,
        "message": f"Đã upload {doc_type} thành công",
    }


@router.get("/ports")
def get_ports(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Lấy danh sách cảng để chọn khi hạ rỗng"""
    tenant_id = str(current_user.tenant_id)

    ports = session.exec(
        select(Site).where(
            Site.tenant_id == tenant_id,
            Site.site_type == "PORT"
        ).order_by(Site.company_name)
    ).all()

    return [{"id": p.id, "name": p.company_name, "address": p.detailed_address} for p in ports]


# ==================== BẢO TRÌ BẢO DƯỠNG ====================

class MaintenanceRecordCreate(BaseModel):
    """Request model cho tạo bảo trì"""
    vehicle_id: str
    maintenance_type: str
    service_date: date
    mileage: Optional[int] = None
    description: str
    garage_name: Optional[str] = None
    total_cost: Optional[int] = None
    note: Optional[str] = None


@router.get("/maintenance/records")
def get_my_maintenance_records(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Lấy danh sách bảo trì xe của tài xế"""
    driver = get_driver_for_user(current_user, session)
    tenant_id = str(current_user.tenant_id)

    # Tìm xe của driver
    driver_vehicles = session.exec(
        select(Vehicle).where(
            Vehicle.tenant_id == tenant_id,
            Vehicle.driver_id == driver.id
        )
    ).all()

    if not driver_vehicles:
        return {"items": [], "total": 0, "page": page, "size": size}

    vehicle_ids = [v.id for v in driver_vehicles]

    query = select(MaintenanceRecord).where(
        MaintenanceRecord.tenant_id == tenant_id,
        MaintenanceRecord.vehicle_id.in_(vehicle_ids)
    )

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    query = query.order_by(MaintenanceRecord.service_date.desc())
    query = query.offset((page - 1) * size).limit(size)

    records = session.exec(query).all()

    items = []
    for rec in records:
        vehicle = session.get(Vehicle, rec.vehicle_id)
        items.append({
            "id": rec.id,
            "vehicle_id": rec.vehicle_id,
            "vehicle_plate": vehicle.plate_no if vehicle else None,
            "maintenance_type": rec.maintenance_type,
            "service_date": rec.service_date.isoformat(),
            "mileage": rec.mileage,
            "description": rec.description,
            "garage_name": rec.garage_name,
            "total_cost": rec.total_cost,
            "note": rec.note,
            "status": rec.status,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
    }


@router.get("/maintenance/schedules")
def get_my_maintenance_schedules(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Lấy lịch bảo trì định kỳ của xe"""
    driver = get_driver_for_user(current_user, session)
    tenant_id = str(current_user.tenant_id)

    # Tìm xe của driver
    driver_vehicles = session.exec(
        select(Vehicle).where(
            Vehicle.tenant_id == tenant_id,
            Vehicle.driver_id == driver.id
        )
    ).all()

    if not driver_vehicles:
        return []

    vehicle_ids = [v.id for v in driver_vehicles]

    schedules = session.exec(
        select(MaintenanceSchedule).where(
            MaintenanceSchedule.tenant_id == tenant_id,
            MaintenanceSchedule.vehicle_id.in_(vehicle_ids),
            MaintenanceSchedule.status == "ACTIVE"
        ).order_by(MaintenanceSchedule.next_due_date)
    ).all()

    today = date.today()
    items = []
    for sch in schedules:
        vehicle = session.get(Vehicle, sch.vehicle_id)
        days_until = (sch.next_due_date - today).days if sch.next_due_date else None
        items.append({
            "id": sch.id,
            "vehicle_id": sch.vehicle_id,
            "vehicle_plate": vehicle.plate_no if vehicle else None,
            "maintenance_type": sch.maintenance_type,
            "interval_km": sch.interval_km,
            "interval_days": sch.interval_days,
            "last_service_date": sch.last_service_date.isoformat() if sch.last_service_date else None,
            "last_service_mileage": sch.last_service_mileage,
            "next_due_date": sch.next_due_date.isoformat() if sch.next_due_date else None,
            "next_due_mileage": sch.next_due_mileage,
            "days_until_due": days_until,
            "is_overdue": days_until < 0 if days_until is not None else False,
        })

    return items


@router.post("/maintenance/records")
def create_maintenance_record(
    data: MaintenanceRecordCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Tạo bản ghi bảo trì mới"""
    driver = get_driver_for_user(current_user, session)
    tenant_id = str(current_user.tenant_id)

    # Validate vehicle belongs to driver
    vehicle = session.get(Vehicle, data.vehicle_id)
    if not vehicle or vehicle.tenant_id != tenant_id:
        raise HTTPException(400, "Xe không tồn tại")
    if vehicle.driver_id != driver.id:
        raise HTTPException(403, "Đây không phải xe của bạn")

    record = MaintenanceRecord(
        tenant_id=tenant_id,
        vehicle_id=data.vehicle_id,
        maintenance_type=data.maintenance_type,
        service_date=data.service_date,
        mileage=data.mileage,
        description=data.description,
        garage_name=data.garage_name,
        driver_name=driver.name,
        total_cost=data.total_cost,
        note=data.note,
        status="COMPLETED",
    )

    session.add(record)
    session.commit()
    session.refresh(record)

    return {
        "id": record.id,
        "message": "Đã tạo bản ghi bảo trì",
    }


@router.get("/vehicles/my-vehicles")
def get_my_vehicles(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Lấy danh sách xe được gán cho tài xế"""
    driver = get_driver_for_user(current_user, session)

    vehicles = []
    if driver.vehicle_id:
        vehicle = session.get(Vehicle, driver.vehicle_id)
        if vehicle:
            vehicles.append(vehicle)

    return [{
        "id": v.id,
        "plate_no": v.plate_no,
        "vehicle_type": v.type,
        "brand": v.manufacturer,
        "model": v.model,
        "status": v.status,
    } for v in vehicles]


# Danh sách loại bảo trì
MAINTENANCE_TYPES = [
    {"value": "OIL_CHANGE", "label": "Thay dầu"},
    {"value": "PERIODIC", "label": "Bảo dưỡng định kỳ"},
    {"value": "TIRE_REPLACEMENT", "label": "Thay lốp"},
    {"value": "BRAKE_SERVICE", "label": "Bảo dưỡng phanh"},
    {"value": "BATTERY_CHECK", "label": "Kiểm tra ắc quy"},
    {"value": "ENGINE_TUNE", "label": "Điều chỉnh động cơ"},
    {"value": "TRANSMISSION_SERVICE", "label": "Bảo dưỡng hộp số"},
    {"value": "COOLANT_CHANGE", "label": "Thay nước làm mát"},
    {"value": "AIR_FILTER", "label": "Thay lọc gió"},
    {"value": "OTHER", "label": "Khác"},
]


@router.get("/maintenance/types")
def get_maintenance_types():
    """Lấy danh sách loại bảo trì"""
    return MAINTENANCE_TYPES


# ==================== POD UPLOAD (Bằng chứng giao hàng) ====================

ALLOWED_POD_TYPES = {"image/jpeg", "image/png", "image/jpg", "image/webp"}
ALLOWED_DOC_TYPES_MOBILE = {"HANDOVER_REPORT", "CONTAINER_RECEIPT", "DO", "SEAL_PHOTO", "OTHER"}


@router.post("/trips/{order_id}/upload-pod")
def upload_pod(
    order_id: str,
    doc_type: str = Query("HANDOVER_REPORT", description="Loại chứng từ"),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Upload bằng chứng giao hàng (POD - Proof of Delivery)

    doc_type options:
    - HANDOVER_REPORT: Biên bản bàn giao hàng (POD) - Mặc định
    - CONTAINER_RECEIPT: Phiếu giao nhận container
    - DO: Delivery Order
    - SEAL_PHOTO: Ảnh seal
    """
    driver = get_driver_for_user(current_user, session)
    tenant_id = str(current_user.tenant_id)

    # Validate order
    order = session.get(Order, order_id)
    if not order or order.tenant_id != tenant_id:
        raise HTTPException(404, "Không tìm thấy đơn hàng")
    if order.driver_id != driver.id:
        raise HTTPException(403, "Đây không phải đơn hàng của bạn")

    # Validate doc type
    doc_type = doc_type.upper()
    if doc_type not in ALLOWED_DOC_TYPES_MOBILE:
        raise HTTPException(400, f"Loại chứng từ không hợp lệ. Chấp nhận: {', '.join(ALLOWED_DOC_TYPES_MOBILE)}")

    # Validate content type
    if file.content_type not in ALLOWED_POD_TYPES:
        raise HTTPException(400, f"Chỉ chấp nhận ảnh: {', '.join(ALLOWED_POD_TYPES)}")

    # Read and validate file
    content = file.file.read()
    if not content:
        raise HTTPException(400, "File rỗng")
    if len(content) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(400, "File quá lớn (tối đa 10MB)")

    # Create storage directory
    storage_dir = Path(settings.STORAGE_DIR) / tenant_id / "orders" / order_id / doc_type
    storage_dir.mkdir(parents=True, exist_ok=True)

    # Generate unique filename
    ext = Path(file.filename or "").suffix or ".jpg"
    safe_name = f"{uuid.uuid4().hex}{ext}"
    save_path = storage_dir / safe_name

    # Save file
    with open(save_path, "wb") as f:
        f.write(content)

    # Create document record
    doc = OrderDocument(
        tenant_id=tenant_id,
        order_id=order_id,
        doc_type=doc_type,
        original_name=file.filename or safe_name,
        content_type=file.content_type or "image/jpeg",
        size_bytes=len(content),
        file_path=str(save_path).replace("\\", "/"),
        uploaded_by=current_user.id,
    )
    session.add(doc)
    session.commit()
    session.refresh(doc)

    return {
        "id": doc.id,
        "doc_type": doc.doc_type,
        "original_name": doc.original_name,
        "size_bytes": doc.size_bytes,
        "uploaded_at": doc.uploaded_at,
        "message": "Đã upload thành công",
    }


@router.get("/trips/{order_id}/check-pod")
def check_pod_status(
    order_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Kiểm tra trạng thái POD cho đơn hàng
    Trả về thông tin về các loại chứng từ đã upload
    """
    driver = get_driver_for_user(current_user, session)
    tenant_id = str(current_user.tenant_id)

    # Validate order
    order = session.get(Order, order_id)
    if not order or order.tenant_id != tenant_id:
        raise HTTPException(404, "Không tìm thấy đơn hàng")
    if order.driver_id != driver.id:
        raise HTTPException(403, "Đây không phải đơn hàng của bạn")

    # Get all documents for this order
    docs = session.exec(
        select(OrderDocument).where(
            OrderDocument.tenant_id == tenant_id,
            OrderDocument.order_id == order_id
        )
    ).all()

    # Group by type and count
    doc_counts = {}
    for doc in docs:
        if doc.doc_type not in doc_counts:
            doc_counts[doc.doc_type] = 0
        doc_counts[doc.doc_type] += 1

    has_pod = doc_counts.get("HANDOVER_REPORT", 0) > 0

    return {
        "order_id": order_id,
        "has_pod": has_pod,
        "can_deliver": has_pod,  # Can only mark delivered if POD is uploaded
        "document_counts": doc_counts,
        "required_for_delivery": "HANDOVER_REPORT",
    }
