"""
Driver Availability API
Manages driver schedules for both internal and external drivers
- Workers declare availability from Personal Workspace
- Companies see availability when assigning orders
"""

from datetime import datetime, date, time, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select, and_, or_

from app.db.session import get_session
from app.models import User, Driver
from app.models.driver_availability import (
    DriverAvailability, DriverAvailabilityTemplate,
    AvailabilityStatus, RecurrenceType
)
from app.models.worker import Worker
from app.core.security import get_current_user
from app.api.v1.routes.worker_auth import get_current_worker

router = APIRouter(prefix="/driver-availability", tags=["driver-availability"])


# ==================== SCHEMAS ====================

class AvailabilityCreate(BaseModel):
    """Create availability slot"""
    date: str  # YYYY-MM-DD
    start_time: str  # HH:MM
    end_time: str  # HH:MM
    status: str = AvailabilityStatus.AVAILABLE
    tenant_id: Optional[str] = None  # NULL = all tenants
    note: Optional[str] = None
    recurrence_type: str = RecurrenceType.NONE
    recurrence_end_date: Optional[str] = None


class AvailabilityUpdate(BaseModel):
    """Update availability slot"""
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    status: Optional[str] = None
    note: Optional[str] = None


class TemplateCreate(BaseModel):
    """Create weekly template"""
    day_of_week: int  # 0=Monday, 6=Sunday
    start_time: str  # HH:MM
    end_time: str  # HH:MM
    tenant_id: Optional[str] = None


class TemplateUpdate(BaseModel):
    """Update weekly template"""
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    is_active: Optional[bool] = None


# ==================== WORKER ENDPOINTS (Personal Workspace) ====================

@router.post("/my-availability")
def create_my_availability(
    data: AvailabilityCreate,
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """Worker creates availability slot"""
    # Parse date and times
    try:
        slot_date = datetime.strptime(data.date, "%Y-%m-%d").date()
        slot_start = datetime.strptime(data.start_time, "%H:%M").time()
        slot_end = datetime.strptime(data.end_time, "%H:%M").time()
    except ValueError as e:
        raise HTTPException(400, f"Invalid date/time format: {e}")

    if slot_start >= slot_end:
        raise HTTPException(400, "End time must be after start time")

    # Check for overlapping slots
    existing = session.exec(
        select(DriverAvailability).where(
            and_(
                DriverAvailability.worker_id == worker.id,
                DriverAvailability.availability_date == slot_date,
                or_(
                    DriverAvailability.tenant_id == data.tenant_id,
                    DriverAvailability.tenant_id == None,
                    data.tenant_id == None,
                )
            )
        )
    ).all()

    for slot in existing:
        # Check time overlap
        if not (slot_end <= slot.start_time or slot_start >= slot.end_time):
            raise HTTPException(400, f"Time overlaps with existing slot: {slot.start_time}-{slot.end_time}")

    # Create availability
    availability = DriverAvailability(
        worker_id=worker.id,
        tenant_id=data.tenant_id,
        availability_date=slot_date,
        start_time=slot_start,
        end_time=slot_end,
        status=data.status,
        note=data.note,
        recurrence_type=data.recurrence_type,
        recurrence_end_date=datetime.strptime(data.recurrence_end_date, "%Y-%m-%d").date() if data.recurrence_end_date else None,
    )

    session.add(availability)

    # If recurring, create future slots
    if data.recurrence_type != RecurrenceType.NONE and data.recurrence_end_date:
        end_date = datetime.strptime(data.recurrence_end_date, "%Y-%m-%d").date()
        current_date = slot_date

        if data.recurrence_type == RecurrenceType.DAILY:
            delta = timedelta(days=1)
        elif data.recurrence_type == RecurrenceType.WEEKLY:
            delta = timedelta(weeks=1)
        elif data.recurrence_type == RecurrenceType.MONTHLY:
            delta = timedelta(days=30)  # Approximate
        else:
            delta = None

        if delta:
            current_date = current_date + delta
            while current_date <= end_date:
                recurring_slot = DriverAvailability(
                    worker_id=worker.id,
                    tenant_id=data.tenant_id,
                    availability_date=current_date,
                    start_time=slot_start,
                    end_time=slot_end,
                    status=data.status,
                    note=data.note,
                    recurrence_type=data.recurrence_type,
                    parent_availability_id=availability.id,
                )
                session.add(recurring_slot)
                current_date = current_date + delta

    session.commit()
    session.refresh(availability)

    return {
        "message": "Đã tạo lịch rảnh",
        "availability": {
            "id": availability.id,
            "date": str(availability.availability_date),
            "start_time": str(availability.start_time),
            "end_time": str(availability.end_time),
            "status": availability.status,
        }
    }


@router.get("/my-availability")
def get_my_availability(
    start_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    tenant_id: Optional[str] = Query(None, description="Filter by tenant"),
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """Worker gets their availability schedule"""
    query = select(DriverAvailability).where(
        DriverAvailability.worker_id == worker.id
    )

    if start_date:
        query = query.where(DriverAvailability.availability_date >= datetime.strptime(start_date, "%Y-%m-%d").date())
    if end_date:
        query = query.where(DriverAvailability.availability_date <= datetime.strptime(end_date, "%Y-%m-%d").date())
    if tenant_id:
        query = query.where(
            or_(DriverAvailability.tenant_id == tenant_id, DriverAvailability.tenant_id == None)
        )

    query = query.order_by(DriverAvailability.availability_date, DriverAvailability.start_time)
    slots = session.exec(query).all()

    return {
        "availability": [
            {
                "id": slot.id,
                "date": str(slot.availability_date),
                "start_time": str(slot.start_time),
                "end_time": str(slot.end_time),
                "status": slot.status,
                "tenant_id": slot.tenant_id,
                "note": slot.note,
                "task_id": slot.task_id,
                "order_id": slot.order_id,
            }
            for slot in slots
        ]
    }


@router.patch("/my-availability/{availability_id}")
def update_my_availability(
    availability_id: str,
    data: AvailabilityUpdate,
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """Worker updates their availability slot"""
    availability = session.get(DriverAvailability, availability_id)

    if not availability or availability.worker_id != worker.id:
        raise HTTPException(404, "Không tìm thấy lịch")

    # Can't modify if already assigned to task
    if availability.task_id or availability.order_id:
        raise HTTPException(400, "Không thể sửa lịch đã được giao việc")

    if data.start_time:
        availability.start_time = datetime.strptime(data.start_time, "%H:%M").time()
    if data.end_time:
        availability.end_time = datetime.strptime(data.end_time, "%H:%M").time()
    if data.status:
        availability.status = data.status
    if data.note is not None:
        availability.note = data.note

    session.add(availability)
    session.commit()

    return {"message": "Đã cập nhật lịch"}


@router.delete("/my-availability/{availability_id}")
def delete_my_availability(
    availability_id: str,
    delete_recurring: bool = Query(False, description="Delete all recurring slots"),
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """Worker deletes their availability slot"""
    availability = session.get(DriverAvailability, availability_id)

    if not availability or availability.worker_id != worker.id:
        raise HTTPException(404, "Không tìm thấy lịch")

    if availability.task_id or availability.order_id:
        raise HTTPException(400, "Không thể xóa lịch đã được giao việc")

    # Delete recurring if requested
    if delete_recurring and availability.recurrence_type != RecurrenceType.NONE:
        # Delete all child recurring slots
        children = session.exec(
            select(DriverAvailability).where(
                DriverAvailability.parent_availability_id == availability_id
            )
        ).all()
        for child in children:
            session.delete(child)

    session.delete(availability)
    session.commit()

    return {"message": "Đã xóa lịch"}


# ==================== TEMPLATE ENDPOINTS ====================

@router.post("/my-templates")
def create_my_template(
    data: TemplateCreate,
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """Create weekly schedule template"""
    if data.day_of_week < 0 or data.day_of_week > 6:
        raise HTTPException(400, "day_of_week must be 0-6 (Monday-Sunday)")

    try:
        start_time = datetime.strptime(data.start_time, "%H:%M").time()
        end_time = datetime.strptime(data.end_time, "%H:%M").time()
    except ValueError as e:
        raise HTTPException(400, f"Invalid time format: {e}")

    # Check for existing template
    existing = session.exec(
        select(DriverAvailabilityTemplate).where(
            and_(
                DriverAvailabilityTemplate.worker_id == worker.id,
                DriverAvailabilityTemplate.day_of_week == data.day_of_week,
                DriverAvailabilityTemplate.tenant_id == data.tenant_id,
                DriverAvailabilityTemplate.is_active == True,
            )
        )
    ).first()

    if existing:
        raise HTTPException(400, f"Template for this day already exists")

    template = DriverAvailabilityTemplate(
        worker_id=worker.id,
        day_of_week=data.day_of_week,
        start_time=start_time,
        end_time=end_time,
        tenant_id=data.tenant_id,
        is_active=True,
    )

    session.add(template)
    session.commit()
    session.refresh(template)

    days = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"]

    return {
        "message": f"Đã tạo lịch mẫu cho {days[data.day_of_week]}",
        "template": {
            "id": template.id,
            "day_of_week": template.day_of_week,
            "day_name": days[template.day_of_week],
            "start_time": str(template.start_time),
            "end_time": str(template.end_time),
        }
    }


@router.get("/my-templates")
def get_my_templates(
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """Get worker's weekly schedule templates"""
    templates = session.exec(
        select(DriverAvailabilityTemplate).where(
            and_(
                DriverAvailabilityTemplate.worker_id == worker.id,
                DriverAvailabilityTemplate.is_active == True,
            )
        ).order_by(DriverAvailabilityTemplate.day_of_week)
    ).all()

    days = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"]

    return {
        "templates": [
            {
                "id": t.id,
                "day_of_week": t.day_of_week,
                "day_name": days[t.day_of_week],
                "start_time": str(t.start_time),
                "end_time": str(t.end_time),
                "tenant_id": t.tenant_id,
            }
            for t in templates
        ]
    }


@router.delete("/my-templates/{template_id}")
def delete_my_template(
    template_id: str,
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """Delete weekly schedule template"""
    template = session.get(DriverAvailabilityTemplate, template_id)

    if not template or template.worker_id != worker.id:
        raise HTTPException(404, "Không tìm thấy lịch mẫu")

    template.is_active = False
    session.add(template)
    session.commit()

    return {"message": "Đã xóa lịch mẫu"}


@router.post("/apply-templates")
def apply_templates_to_dates(
    start_date: str = Query(..., description="Start date YYYY-MM-DD"),
    end_date: str = Query(..., description="End date YYYY-MM-DD"),
    tenant_id: Optional[str] = Query(None, description="Apply for specific tenant"),
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """Apply weekly templates to create availability slots for date range"""
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        end = datetime.strptime(end_date, "%Y-%m-%d").date()
    except ValueError as e:
        raise HTTPException(400, f"Invalid date format: {e}")

    if start > end:
        raise HTTPException(400, "Start date must be before end date")

    # Get active templates
    templates = session.exec(
        select(DriverAvailabilityTemplate).where(
            and_(
                DriverAvailabilityTemplate.worker_id == worker.id,
                DriverAvailabilityTemplate.is_active == True,
                or_(
                    DriverAvailabilityTemplate.tenant_id == tenant_id,
                    DriverAvailabilityTemplate.tenant_id == None,
                ) if tenant_id else True
            )
        )
    ).all()

    if not templates:
        raise HTTPException(400, "Chưa có lịch mẫu nào")

    # Create template lookup by day of week
    template_by_day = {t.day_of_week: t for t in templates}

    created_count = 0
    current = start

    while current <= end:
        day_of_week = current.weekday()  # 0=Monday, 6=Sunday

        if day_of_week in template_by_day:
            template = template_by_day[day_of_week]

            # Check if slot already exists
            existing = session.exec(
                select(DriverAvailability).where(
                    and_(
                        DriverAvailability.worker_id == worker.id,
                        DriverAvailability.availability_date == current,
                        DriverAvailability.start_time == template.start_time,
                        DriverAvailability.end_time == template.end_time,
                    )
                )
            ).first()

            if not existing:
                slot = DriverAvailability(
                    worker_id=worker.id,
                    tenant_id=tenant_id or template.tenant_id,
                    availability_date=current,
                    start_time=template.start_time,
                    end_time=template.end_time,
                    status=AvailabilityStatus.AVAILABLE,
                )
                session.add(slot)
                created_count += 1

        current = current + timedelta(days=1)

    session.commit()

    return {
        "message": f"Đã tạo {created_count} lịch rảnh từ {start_date} đến {end_date}",
        "created_count": created_count,
    }


# ==================== COMPANY ENDPOINTS (View driver availability) ====================

@router.get("/drivers")
def get_drivers_availability(
    date: Optional[str] = Query(None, description="Date YYYY-MM-DD"),
    driver_id: Optional[str] = Query(None, description="Filter by driver ID"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Company views drivers' availability for a date"""
    tenant_id = str(current_user.tenant_id)

    # Get all drivers for this tenant (including external)
    drivers = session.exec(
        select(Driver).where(
            and_(
                Driver.tenant_id == tenant_id,
                Driver.status == "ACTIVE",
            )
        )
    ).all()

    if driver_id:
        drivers = [d for d in drivers if d.id == driver_id]

    result = []

    for driver in drivers:
        driver_data = {
            "driver_id": driver.id,
            "driver_name": driver.name,
            "phone": driver.phone,
            "source": driver.source,
            "external_worker_id": driver.external_worker_id,
            "availability": [],
        }

        # Get availability for this driver
        if driver.external_worker_id:
            # External driver - get from worker availability
            query = select(DriverAvailability).where(
                and_(
                    DriverAvailability.worker_id == driver.external_worker_id,
                    or_(
                        DriverAvailability.tenant_id == tenant_id,
                        DriverAvailability.tenant_id == None,  # Global availability
                    )
                )
            )

            if date:
                query = query.where(
                    DriverAvailability.availability_date == datetime.strptime(date, "%Y-%m-%d").date()
                )

            query = query.order_by(DriverAvailability.availability_date, DriverAvailability.start_time)
            slots = session.exec(query).all()

            driver_data["availability"] = [
                {
                    "id": slot.id,
                    "date": str(slot.availability_date),
                    "start_time": str(slot.start_time),
                    "end_time": str(slot.end_time),
                    "status": slot.status,
                    "is_global": slot.tenant_id is None,
                    "task_id": slot.task_id,
                    "order_id": slot.order_id,
                }
                for slot in slots
            ]
        else:
            # Internal driver - assumed always available during work hours
            # Companies can implement their own internal scheduling
            driver_data["availability"] = []
            driver_data["note"] = "Internal driver - check company schedule"

        result.append(driver_data)

    return {"drivers": result}


@router.post("/mark-busy")
def mark_driver_busy(
    worker_id: str,
    order_id: str,
    date: str,
    start_time: str,
    end_time: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Company marks driver as busy when assigning order"""
    tenant_id = str(current_user.tenant_id)

    # Verify driver belongs to this tenant
    driver = session.exec(
        select(Driver).where(
            and_(
                Driver.tenant_id == tenant_id,
                Driver.external_worker_id == worker_id,
            )
        )
    ).first()

    if not driver:
        raise HTTPException(404, "Driver not found")

    try:
        slot_date = datetime.strptime(date, "%Y-%m-%d").date()
        slot_start = datetime.strptime(start_time, "%H:%M").time()
        slot_end = datetime.strptime(end_time, "%H:%M").time()
    except ValueError as e:
        raise HTTPException(400, f"Invalid date/time format: {e}")

    # Find or create availability slot
    existing = session.exec(
        select(DriverAvailability).where(
            and_(
                DriverAvailability.worker_id == worker_id,
                DriverAvailability.availability_date == slot_date,
                DriverAvailability.start_time <= slot_start,
                DriverAvailability.end_time >= slot_end,
            )
        )
    ).first()

    if existing:
        # Update existing slot
        existing.status = AvailabilityStatus.BUSY
        existing.order_id = order_id
        session.add(existing)
    else:
        # Create new BUSY slot
        busy_slot = DriverAvailability(
            worker_id=worker_id,
            tenant_id=tenant_id,
            availability_date=slot_date,
            start_time=slot_start,
            end_time=slot_end,
            status=AvailabilityStatus.BUSY,
            order_id=order_id,
        )
        session.add(busy_slot)

    session.commit()

    return {"message": "Đã đánh dấu tài xế bận"}
