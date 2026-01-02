"""
HRM - Attendance API Routes
Work shifts, attendance records, overtime
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from typing import Optional
from pydantic import BaseModel
from datetime import datetime, timedelta

from app.db.session import get_session
from app.models import User
from app.models.hrm.attendance import WorkShift, ShiftAssignment, AttendanceRecord, OvertimeRequest, AttendanceStatus, OvertimeStatus
from app.models.hrm.employee import Employee
from app.core.security import get_current_user

router = APIRouter(prefix="/attendance", tags=["HRM - Attendance"])


# === Schemas ===

class WorkShiftCreate(BaseModel):
    code: str
    name: str
    start_time: str  # HH:MM
    end_time: str
    break_minutes: int = 60
    is_night_shift: bool = False
    night_shift_multiplier: float = 1.3
    is_flexible: bool = False
    core_start_time: Optional[str] = None
    core_end_time: Optional[str] = None
    notes: Optional[str] = None


class AttendanceCreate(BaseModel):
    employee_id: str
    date: str
    shift_id: Optional[str] = None
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None
    check_in_location: Optional[str] = None
    check_out_location: Optional[str] = None
    source: str = "MANUAL"  # MOBILE, FINGERPRINT, MANUAL
    notes: Optional[str] = None


class OvertimeCreate(BaseModel):
    employee_id: str
    request_date: str  # Will be mapped to 'date' field in model
    start_time: str
    end_time: str
    reason: str
    ot_type: str = "WEEKDAY"  # WEEKDAY, WEEKEND, HOLIDAY, NIGHT
    notes: Optional[str] = None


# === Work Shifts ===

@router.get("/shifts")
def list_shifts(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    include_inactive: bool = Query(False),
):
    """List all work shifts"""
    tenant_id = str(current_user.tenant_id)

    query = select(WorkShift).where(WorkShift.tenant_id == tenant_id)
    if not include_inactive:
        query = query.where(WorkShift.is_active == True)

    shifts = session.exec(query.order_by(WorkShift.name)).all()
    return shifts


@router.post("/shifts")
def create_shift(
    payload: WorkShiftCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create work shift"""
    if current_user.role not in ("ADMIN", "HR_MANAGER"):
        raise HTTPException(403, "Only ADMIN or HR_MANAGER can create shifts")

    tenant_id = str(current_user.tenant_id)

    # Check duplicate code
    existing = session.exec(
        select(WorkShift).where(
            WorkShift.tenant_id == tenant_id,
            WorkShift.code == payload.code
        )
    ).first()
    if existing:
        raise HTTPException(400, f"Shift code {payload.code} already exists")

    shift = WorkShift(
        tenant_id=tenant_id,
        **payload.model_dump()
    )

    session.add(shift)
    session.commit()
    session.refresh(shift)

    return shift


@router.patch("/shifts/{shift_id}")
def update_shift(
    shift_id: str,
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update work shift"""
    if current_user.role not in ("ADMIN", "HR_MANAGER"):
        raise HTTPException(403, "Only ADMIN or HR_MANAGER can update shifts")

    tenant_id = str(current_user.tenant_id)

    shift = session.get(WorkShift, shift_id)
    if not shift or str(shift.tenant_id) != tenant_id:
        raise HTTPException(404, "Shift not found")

    for key, value in payload.items():
        if hasattr(shift, key):
            setattr(shift, key, value)

    session.add(shift)
    session.commit()
    session.refresh(shift)

    return shift


# === Attendance Records ===

@router.get("/records")
def list_attendance(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    employee_id: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    """List attendance records"""
    tenant_id = str(current_user.tenant_id)

    query = select(AttendanceRecord).where(AttendanceRecord.tenant_id == tenant_id)

    if employee_id:
        query = query.where(AttendanceRecord.employee_id == employee_id)

    if department_id:
        # Join with Employee to filter by department
        emp_ids = session.exec(
            select(Employee.id).where(
                Employee.department_id == department_id,
                Employee.tenant_id == tenant_id
            )
        ).all()
        query = query.where(AttendanceRecord.employee_id.in_(emp_ids))

    if date_from:
        query = query.where(AttendanceRecord.date >= date_from)

    if date_to:
        query = query.where(AttendanceRecord.date <= date_to)

    if status:
        query = query.where(AttendanceRecord.status == status)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(AttendanceRecord.date.desc()).offset(offset).limit(page_size)

    records = session.exec(query).all()

    # Enrich with employee info
    result = []
    for rec in records:
        rec_dict = rec.model_dump()

        employee = session.get(Employee, rec.employee_id)
        rec_dict["employee"] = {
            "id": employee.id,
            "employee_code": employee.employee_code,
            "full_name": employee.full_name
        } if employee else None

        if rec.shift_id:
            shift = session.get(WorkShift, rec.shift_id)
            rec_dict["shift_name"] = shift.name if shift else None

        result.append(rec_dict)

    return {
        "items": result,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.get("/records/daily-summary")
def get_daily_summary(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    department_id: Optional[str] = Query(None),
):
    """Get daily attendance summary"""
    tenant_id = str(current_user.tenant_id)

    # Get all employees (optionally filtered by department)
    emp_query = select(Employee).where(
        Employee.tenant_id == tenant_id,
        Employee.status == "ACTIVE"
    )
    if department_id:
        emp_query = emp_query.where(Employee.department_id == department_id)

    employees = session.exec(emp_query).all()
    total_employees = len(employees)

    # Get attendance for the date
    present = 0
    late = 0
    absent = 0
    on_leave = 0

    for emp in employees:
        record = session.exec(
            select(AttendanceRecord).where(
                AttendanceRecord.employee_id == emp.id,
                AttendanceRecord.date == date
            )
        ).first()

        if record:
            if record.status == AttendanceStatus.PRESENT.value:
                present += 1
            elif record.status == AttendanceStatus.LATE.value:
                late += 1
            elif record.status == AttendanceStatus.ON_LEAVE.value:
                on_leave += 1
            else:
                absent += 1
        else:
            absent += 1

    return {
        "date": date,
        "total_employees": total_employees,
        "present": present,
        "late": late,
        "absent": absent,
        "on_leave": on_leave,
        "attendance_rate": round((present + late) / total_employees * 100, 1) if total_employees > 0 else 0
    }


@router.post("/records")
def create_attendance(
    payload: AttendanceCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create or update attendance record"""
    if current_user.role not in ("ADMIN", "HR_MANAGER", "HR"):
        raise HTTPException(403, "Only ADMIN or HR can manage attendance")

    tenant_id = str(current_user.tenant_id)

    # Verify employee
    employee = session.get(Employee, payload.employee_id)
    if not employee or str(employee.tenant_id) != tenant_id:
        raise HTTPException(400, "Invalid employee_id")

    # Check if record already exists for this date
    existing = session.exec(
        select(AttendanceRecord).where(
            AttendanceRecord.employee_id == payload.employee_id,
            AttendanceRecord.date == payload.date
        )
    ).first()

    if existing:
        # Update existing record
        for key, value in payload.model_dump().items():
            if value is not None:
                setattr(existing, key, value)
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing

    # Create new record
    record = AttendanceRecord(
        tenant_id=tenant_id,
        **payload.model_dump()
    )

    # Calculate status based on check-in time
    if record.check_in_time and record.shift_id:
        shift = session.get(WorkShift, record.shift_id)
        if shift:
            if record.check_in_time > shift.start_time:
                record.status = AttendanceStatus.LATE.value
            else:
                record.status = AttendanceStatus.PRESENT.value

    session.add(record)
    session.commit()
    session.refresh(record)

    return record


@router.post("/records/check-in")
def mobile_check_in(
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Mobile check-in for current user"""
    # Find employee linked to current user
    employee = session.exec(
        select(Employee).where(Employee.user_id == str(current_user.id))
    ).first()

    if not employee:
        raise HTTPException(404, "Employee record not found for current user")

    tenant_id = str(current_user.tenant_id)
    today = datetime.now().strftime("%Y-%m-%d")
    now = datetime.now().strftime("%H:%M:%S")

    # Check if already checked in today
    existing = session.exec(
        select(AttendanceRecord).where(
            AttendanceRecord.employee_id == employee.id,
            AttendanceRecord.date == today
        )
    ).first()

    if existing:
        if existing.check_in_time:
            raise HTTPException(400, "Already checked in today")
        # Update with check-in
        existing.check_in_time = now
        existing.check_in_location = payload.get("location")
        existing.check_in_lat = payload.get("latitude")
        existing.check_in_lng = payload.get("longitude")
        existing.source = "MOBILE"
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing

    # Create new record
    record = AttendanceRecord(
        tenant_id=tenant_id,
        employee_id=employee.id,
        date=today,
        shift_id=employee.work_shift_id,
        check_in_time=now,
        check_in_location=payload.get("location"),
        check_in_lat=payload.get("latitude"),
        check_in_lng=payload.get("longitude"),
        source="MOBILE",
        status=AttendanceStatus.PRESENT.value
    )

    session.add(record)
    session.commit()
    session.refresh(record)

    return record


@router.post("/records/check-out")
def mobile_check_out(
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Mobile check-out for current user"""
    employee = session.exec(
        select(Employee).where(Employee.user_id == str(current_user.id))
    ).first()

    if not employee:
        raise HTTPException(404, "Employee record not found for current user")

    today = datetime.now().strftime("%Y-%m-%d")
    now = datetime.now().strftime("%H:%M:%S")

    record = session.exec(
        select(AttendanceRecord).where(
            AttendanceRecord.employee_id == employee.id,
            AttendanceRecord.date == today
        )
    ).first()

    if not record:
        raise HTTPException(400, "No check-in record found for today")

    if record.check_out_time:
        raise HTTPException(400, "Already checked out today")

    record.check_out_time = now
    record.check_out_location = payload.get("location")
    record.check_out_lat = payload.get("latitude")
    record.check_out_lng = payload.get("longitude")

    # Calculate work hours
    if record.check_in_time:
        check_in = datetime.strptime(record.check_in_time, "%H:%M:%S")
        check_out = datetime.strptime(now, "%H:%M:%S")
        delta = check_out - check_in
        record.actual_hours = round(delta.total_seconds() / 3600, 2)

    session.add(record)
    session.commit()
    session.refresh(record)

    return record


# === Overtime ===

@router.get("/overtime")
def list_overtime(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    employee_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    """List overtime requests"""
    tenant_id = str(current_user.tenant_id)

    query = select(OvertimeRequest).where(OvertimeRequest.tenant_id == tenant_id)

    if employee_id:
        query = query.where(OvertimeRequest.employee_id == employee_id)

    if status:
        query = query.where(OvertimeRequest.status == status)

    if date_from:
        query = query.where(OvertimeRequest.date >= date_from)

    if date_to:
        query = query.where(OvertimeRequest.date <= date_to)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(OvertimeRequest.created_at.desc()).offset(offset).limit(page_size)

    requests = session.exec(query).all()

    # Enrich
    result = []
    for req in requests:
        req_dict = req.model_dump()

        employee = session.get(Employee, req.employee_id)
        req_dict["employee"] = {
            "id": employee.id,
            "employee_code": employee.employee_code,
            "full_name": employee.full_name
        } if employee else None

        result.append(req_dict)

    return {
        "items": result,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.post("/overtime")
def create_overtime(
    payload: OvertimeCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create overtime request"""
    tenant_id = str(current_user.tenant_id)

    employee = session.get(Employee, payload.employee_id)
    if not employee or str(employee.tenant_id) != tenant_id:
        raise HTTPException(400, "Invalid employee_id")

    # Calculate hours
    start = datetime.strptime(payload.start_time, "%H:%M")
    end = datetime.strptime(payload.end_time, "%H:%M")
    hours = (end - start).total_seconds() / 3600

    # Determine OT multiplier based on type
    multiplier_map = {
        "WEEKDAY": 1.5,
        "WEEKEND": 2.0,
        "HOLIDAY": 3.0,
        "NIGHT": 1.3,
    }

    overtime = OvertimeRequest(
        tenant_id=tenant_id,
        employee_id=payload.employee_id,
        date=payload.request_date,  # Map request_date to date field
        start_time=payload.start_time,
        end_time=payload.end_time,
        hours=hours,  # Calculated from start/end time
        ot_type=payload.ot_type,
        multiplier=multiplier_map.get(payload.ot_type, 1.5),
        reason=payload.reason,
        notes=payload.notes,
        created_by=str(current_user.id),
    )

    session.add(overtime)
    session.commit()
    session.refresh(overtime)

    return overtime


@router.post("/overtime/{overtime_id}/approve")
def approve_overtime(
    overtime_id: str,
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Approve overtime request"""
    if current_user.role not in ("ADMIN", "HR_MANAGER", "MANAGER"):
        raise HTTPException(403, "Only managers can approve overtime")

    tenant_id = str(current_user.tenant_id)

    overtime = session.get(OvertimeRequest, overtime_id)
    if not overtime or str(overtime.tenant_id) != tenant_id:
        raise HTTPException(404, "Overtime request not found")

    if overtime.status != OvertimeStatus.PENDING.value:
        raise HTTPException(400, "Request is not pending")

    approved_hours = payload.get("approved_hours", overtime.requested_hours)
    overtime.approved_hours = approved_hours
    overtime.status = OvertimeStatus.APPROVED.value
    overtime.approved_by = str(current_user.id)
    overtime.approved_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    session.add(overtime)
    session.commit()
    session.refresh(overtime)

    return overtime


@router.post("/overtime/{overtime_id}/reject")
def reject_overtime(
    overtime_id: str,
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Reject overtime request"""
    if current_user.role not in ("ADMIN", "HR_MANAGER", "MANAGER"):
        raise HTTPException(403, "Only managers can reject overtime")

    tenant_id = str(current_user.tenant_id)

    overtime = session.get(OvertimeRequest, overtime_id)
    if not overtime or str(overtime.tenant_id) != tenant_id:
        raise HTTPException(404, "Overtime request not found")

    overtime.status = OvertimeStatus.REJECTED.value
    overtime.rejection_reason = payload.get("reason")
    overtime.approved_by = str(current_user.id)
    overtime.approved_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    session.add(overtime)
    session.commit()
    session.refresh(overtime)

    return overtime
