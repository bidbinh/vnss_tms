"""
HRM - Leave Management API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from typing import Optional
from pydantic import BaseModel
from datetime import datetime, timedelta, date
from decimal import Decimal

from app.db.session import get_session
from app.models import User
from app.models.hrm.leave import LeaveType, LeaveBalance, LeaveRequest, LeaveStatus
from app.models.hrm.employee import Employee
from app.core.security import get_current_user
from app.services.workflow_integration import WorkflowIntegrationService

router = APIRouter(prefix="/leaves", tags=["HRM - Leaves"])


# === Schemas ===

class LeaveTypeCreate(BaseModel):
    code: str
    name: str
    days_per_year: float = 12
    is_paid: bool = True
    requires_approval: bool = True
    max_consecutive_days: Optional[int] = None
    min_notice_days: int = 1
    allow_half_day: bool = True
    carry_forward: bool = True
    max_carry_forward_days: Optional[float] = None
    gender_specific: Optional[str] = None
    description: Optional[str] = None


class LeaveRequestCreate(BaseModel):
    leave_type_id: str
    from_date: str
    to_date: str
    is_half_day: bool = False
    half_day_type: Optional[str] = None  # MORNING/AFTERNOON
    reason: str
    notes: Optional[str] = None


# === Leave Types ===

@router.get("/types")
def list_leave_types(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    include_inactive: bool = Query(False),
):
    """List all leave types"""
    tenant_id = str(current_user.tenant_id)

    query = select(LeaveType).where(LeaveType.tenant_id == tenant_id)
    if not include_inactive:
        query = query.where(LeaveType.is_active == True)

    types = session.exec(query.order_by(LeaveType.sort_order, LeaveType.name)).all()
    return types


@router.post("/types")
def create_leave_type(
    payload: LeaveTypeCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create leave type"""
    if current_user.role not in ("ADMIN", "HR_MANAGER"):
        raise HTTPException(403, "Only ADMIN or HR_MANAGER can create leave types")

    tenant_id = str(current_user.tenant_id)

    existing = session.exec(
        select(LeaveType).where(
            LeaveType.tenant_id == tenant_id,
            LeaveType.code == payload.code
        )
    ).first()
    if existing:
        raise HTTPException(400, f"Leave type code {payload.code} already exists")

    leave_type = LeaveType(
        tenant_id=tenant_id,
        **payload.model_dump()
    )

    session.add(leave_type)
    session.commit()
    session.refresh(leave_type)

    return leave_type


@router.patch("/types/{type_id}")
def update_leave_type(
    type_id: str,
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update leave type"""
    if current_user.role not in ("ADMIN", "HR_MANAGER"):
        raise HTTPException(403, "Only ADMIN or HR_MANAGER can update leave types")

    tenant_id = str(current_user.tenant_id)

    leave_type = session.get(LeaveType, type_id)
    if not leave_type or str(leave_type.tenant_id) != tenant_id:
        raise HTTPException(404, "Leave type not found")

    for key, value in payload.items():
        if hasattr(leave_type, key):
            setattr(leave_type, key, value)

    session.add(leave_type)
    session.commit()
    session.refresh(leave_type)

    return leave_type


# === Leave Balances ===

@router.get("/balances")
def list_balances(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    employee_id: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
):
    """List leave balances"""
    tenant_id = str(current_user.tenant_id)

    if year is None:
        year = datetime.now().year

    query = select(LeaveBalance).where(
        LeaveBalance.tenant_id == tenant_id,
        LeaveBalance.year == year
    )

    if employee_id:
        query = query.where(LeaveBalance.employee_id == employee_id)

    balances = session.exec(query).all()

    # Enrich
    result = []
    for bal in balances:
        bal_dict = bal.model_dump()

        employee = session.get(Employee, bal.employee_id)
        bal_dict["employee"] = {
            "id": employee.id,
            "employee_code": employee.employee_code,
            "full_name": employee.full_name
        } if employee else None

        leave_type = session.get(LeaveType, bal.leave_type_id)
        bal_dict["leave_type"] = leave_type.model_dump() if leave_type else None

        result.append(bal_dict)

    return result


@router.get("/balances/my")
def get_my_balances(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    year: Optional[int] = Query(None),
):
    """Get current user's leave balances"""
    employee = session.exec(
        select(Employee).where(Employee.user_id == str(current_user.id))
    ).first()

    if not employee:
        raise HTTPException(404, "Employee record not found")

    if year is None:
        year = datetime.now().year

    balances = session.exec(
        select(LeaveBalance).where(
            LeaveBalance.employee_id == employee.id,
            LeaveBalance.year == year
        )
    ).all()

    result = []
    for bal in balances:
        bal_dict = bal.model_dump()
        leave_type = session.get(LeaveType, bal.leave_type_id)
        bal_dict["leave_type"] = leave_type.model_dump() if leave_type else None
        result.append(bal_dict)

    return result


@router.post("/balances/init")
def init_leave_balances(
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Initialize leave balances for employees for a year"""
    if current_user.role not in ("ADMIN", "HR_MANAGER"):
        raise HTTPException(403, "Only ADMIN or HR_MANAGER can initialize balances")

    tenant_id = str(current_user.tenant_id)
    year = payload.get("year", datetime.now().year)
    employee_ids = payload.get("employee_ids")  # Optional - if not provided, do all active employees

    # Get employees
    emp_query = select(Employee).where(
        Employee.tenant_id == tenant_id,
        Employee.status == "ACTIVE"
    )
    if employee_ids:
        emp_query = emp_query.where(Employee.id.in_(employee_ids))

    employees = session.exec(emp_query).all()

    # Get all leave types
    leave_types = session.exec(
        select(LeaveType).where(
            LeaveType.tenant_id == tenant_id,
            LeaveType.is_active == True
        )
    ).all()

    created = 0
    for emp in employees:
        for lt in leave_types:
            # Check if balance already exists
            existing = session.exec(
                select(LeaveBalance).where(
                    LeaveBalance.employee_id == emp.id,
                    LeaveBalance.leave_type_id == lt.id,
                    LeaveBalance.year == year
                )
            ).first()

            if existing:
                continue

            # Check gender-specific leave
            if lt.gender_specific and emp.gender != lt.gender_specific:
                continue

            # Get carried forward days from previous year
            carried = Decimal("0")
            if lt.allow_carry_forward:
                prev_balance = session.exec(
                    select(LeaveBalance).where(
                        LeaveBalance.employee_id == emp.id,
                        LeaveBalance.leave_type_id == lt.id,
                        LeaveBalance.year == year - 1
                    )
                ).first()
                if prev_balance:
                    remaining = prev_balance.available_days
                    if lt.max_carry_forward_days is not None:
                        carried = min(Decimal(str(remaining)), lt.max_carry_forward_days)
                    else:
                        carried = Decimal(str(remaining))

            balance = LeaveBalance(
                tenant_id=tenant_id,
                employee_id=emp.id,
                leave_type_id=lt.id,
                year=year,
                entitled_days=lt.default_days_per_year,
                carried_forward_days=carried,
                used_days=Decimal("0"),
                pending_days=Decimal("0"),
                available_days=(lt.default_days_per_year + carried)
            )

            session.add(balance)
            created += 1

    session.commit()

    return {"message": f"Created {created} leave balances for {len(employees)} employees"}


# === Leave Requests ===

@router.get("/requests")
def list_requests(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    employee_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    leave_type_id: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    """List leave requests"""
    tenant_id = str(current_user.tenant_id)

    query = select(LeaveRequest).where(LeaveRequest.tenant_id == tenant_id)

    if employee_id:
        query = query.where(LeaveRequest.employee_id == employee_id)

    if status:
        query = query.where(LeaveRequest.status == status)

    if leave_type_id:
        query = query.where(LeaveRequest.leave_type_id == leave_type_id)

    if date_from:
        query = query.where(LeaveRequest.from_date >= date_from)

    if date_to:
        query = query.where(LeaveRequest.to_date <= date_to)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(LeaveRequest.created_at.desc()).offset(offset).limit(page_size)

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

        leave_type = session.get(LeaveType, req.leave_type_id)
        req_dict["leave_type"] = leave_type.model_dump() if leave_type else None

        result.append(req_dict)

    return {
        "items": result,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.get("/requests/pending")
def get_pending_requests(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get pending leave requests for approval"""
    if current_user.role not in ("ADMIN", "HR_MANAGER", "MANAGER"):
        raise HTTPException(403, "Only managers can view pending requests")

    tenant_id = str(current_user.tenant_id)

    requests = session.exec(
        select(LeaveRequest).where(
            LeaveRequest.tenant_id == tenant_id,
            LeaveRequest.status == LeaveStatus.PENDING.value
        ).order_by(LeaveRequest.created_at)
    ).all()

    result = []
    for req in requests:
        req_dict = req.model_dump()

        employee = session.get(Employee, req.employee_id)
        req_dict["employee"] = {
            "id": employee.id,
            "employee_code": employee.employee_code,
            "full_name": employee.full_name,
            "department_id": employee.department_id
        } if employee else None

        leave_type = session.get(LeaveType, req.leave_type_id)
        req_dict["leave_type_name"] = leave_type.name if leave_type else None

        result.append(req_dict)

    return result


@router.get("/requests/my")
def get_my_requests(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    year: Optional[int] = Query(None),
):
    """Get current user's leave requests"""
    employee = session.exec(
        select(Employee).where(Employee.user_id == str(current_user.id))
    ).first()

    if not employee:
        raise HTTPException(404, "Employee record not found")

    query = select(LeaveRequest).where(LeaveRequest.employee_id == employee.id)

    if year:
        query = query.where(
            LeaveRequest.from_date >= f"{year}-01-01",
            LeaveRequest.from_date <= f"{year}-12-31"
        )

    requests = session.exec(
        query.order_by(LeaveRequest.created_at.desc())
    ).all()

    result = []
    for req in requests:
        req_dict = req.model_dump()
        leave_type = session.get(LeaveType, req.leave_type_id)
        req_dict["leave_type_name"] = leave_type.name if leave_type else None
        result.append(req_dict)

    return result


@router.post("/requests")
def create_request(
    payload: LeaveRequestCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create leave request (aligned with LeaveRequest model)"""
    tenant_id = str(current_user.tenant_id)

    employee = session.exec(
        select(Employee).where(Employee.user_id == str(current_user.id))
    ).first()
    if not employee:
        raise HTTPException(404, "Employee record not found")

    leave_type = session.get(LeaveType, payload.leave_type_id)
    if not leave_type or str(leave_type.tenant_id) != tenant_id:
        raise HTTPException(400, "Invalid leave type")

    # Parse dates
    try:
        from_dt = datetime.strptime(payload.from_date, "%Y-%m-%d").date()
        to_dt = datetime.strptime(payload.to_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(400, "Invalid date format. Use YYYY-MM-DD")

    if to_dt < from_dt:
        raise HTTPException(400, "to_date must be on or after from_date")

    # Calculate total_days (Decimal)
    total_days = Decimal("0.5") if payload.is_half_day else Decimal(str((to_dt - from_dt).days + 1))

    # Check balance
    year = from_dt.year
    balance = session.exec(
        select(LeaveBalance).where(
            LeaveBalance.employee_id == employee.id,
            LeaveBalance.leave_type_id == payload.leave_type_id,
            LeaveBalance.year == year
        )
    ).first()
    if not balance:
        raise HTTPException(400, "Leave balance not initialized for this leave type and year")

    available = balance.entitled_days + balance.carried_forward_days - balance.used_days - balance.pending_days
    if not leave_type.allow_negative_balance and total_days > available:
        raise HTTPException(400, f"Insufficient leave balance. Available: {available} days")

    # Generate request number NP-YYYY-xxxxx
    count = session.exec(
        select(func.count(LeaveRequest.id)).where(LeaveRequest.tenant_id == tenant_id)
    ).one() or 0
    request_number = f"NP-{year}-{count + 1:05d}"

    # Create request
    request = LeaveRequest(
        tenant_id=tenant_id,
        employee_id=employee.id,
        leave_type_id=payload.leave_type_id,
        request_number=request_number,
        from_date=from_dt,
        to_date=to_dt,
        is_half_day=payload.is_half_day,
        half_day_type=payload.half_day_type,
        total_days=total_days,
        reason=payload.reason,
        status=LeaveStatus.PENDING.value,
        created_by=str(current_user.id),
    )
    session.add(request)

    # Update balance
    balance.pending_days = balance.pending_days + total_days
    balance.available_days = balance.entitled_days + balance.carried_forward_days - balance.used_days - balance.pending_days
    session.add(balance)

    session.commit()
    session.refresh(request)

    # Submit workflow
    if leave_type.requires_approval:
        try:
            workflow_service = WorkflowIntegrationService(session)
            instance = workflow_service.submit_for_approval(
                tenant_id=tenant_id,
                user_id=str(current_user.id),
                user_name=current_user.full_name or current_user.username,
                module="HRM",
                entity_type="LeaveRequest",
                entity_id=str(request.id),
                entity_reference=f"LEAVE-{str(request.id)[:8].upper()}",
                title=f"Đơn xin nghỉ phép - {employee.full_name}",
                description=f"{leave_type.name}: {payload.from_date} đến {payload.to_date} ({total_days} ngày). Lý do: {payload.reason}",
                priority=5,
                entity_data={
                    "total_days": float(total_days),
                    "leave_type_id": str(leave_type.id),
                    "leave_type_code": leave_type.code,
                },
            )
            if instance:
                request.workflow_instance_id = str(instance.id)
                session.add(request)
                session.commit()
                session.refresh(request)
        except Exception as e:
            print(f"Failed to create workflow instance: {e}")

    return request


@router.post("/requests/{request_id}/approve")
def approve_request(
    request_id: str,
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Approve leave request"""
    if current_user.role not in ("ADMIN", "HR_MANAGER", "MANAGER"):
        raise HTTPException(403, "Only managers can approve requests")

    tenant_id = str(current_user.tenant_id)

    request = session.get(LeaveRequest, request_id)
    if not request or str(request.tenant_id) != tenant_id:
        raise HTTPException(404, "Leave request not found")

    if request.status != LeaveStatus.PENDING.value:
        raise HTTPException(400, "Request is not pending")

    request.status = LeaveStatus.APPROVED.value

    # Update balance - move from pending to used
    year = request.from_date.year
    balance = session.exec(
        select(LeaveBalance).where(
            LeaveBalance.employee_id == request.employee_id,
            LeaveBalance.leave_type_id == request.leave_type_id,
            LeaveBalance.year == year
        )
    ).first()

    if balance:
        balance.pending_days -= request.total_days
        balance.used_days += request.total_days
        session.add(balance)

    session.add(request)
    session.commit()
    session.refresh(request)

    return request


@router.post("/requests/{request_id}/reject")
def reject_request(
    request_id: str,
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Reject leave request"""
    if current_user.role not in ("ADMIN", "HR_MANAGER", "MANAGER"):
        raise HTTPException(403, "Only managers can reject requests")

    tenant_id = str(current_user.tenant_id)

    request = session.get(LeaveRequest, request_id)
    if not request or str(request.tenant_id) != tenant_id:
        raise HTTPException(404, "Leave request not found")

    if request.status != LeaveStatus.PENDING.value:
        raise HTTPException(400, "Request is not pending")

    request.status = LeaveStatus.REJECTED.value
    if payload.get("reason"):
        request.notes = (request.notes + " | " if request.notes else "") + f"Rejected: {payload.get('reason')}"

    # Update balance - remove from pending
    year = request.from_date.year
    balance = session.exec(
        select(LeaveBalance).where(
            LeaveBalance.employee_id == request.employee_id,
            LeaveBalance.leave_type_id == request.leave_type_id,
            LeaveBalance.year == year
        )
    ).first()

    if balance:
        balance.pending_days -= request.total_days
        session.add(balance)

    session.add(request)
    session.commit()
    session.refresh(request)

    return request


@router.post("/requests/{request_id}/cancel")
def cancel_request(
    request_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Cancel own leave request"""
    employee = session.exec(
        select(Employee).where(Employee.user_id == str(current_user.id))
    ).first()

    if not employee:
        raise HTTPException(404, "Employee record not found")

    request = session.get(LeaveRequest, request_id)
    if not request:
        raise HTTPException(404, "Leave request not found")

    if request.employee_id != employee.id:
        raise HTTPException(403, "Can only cancel own requests")

    if request.status not in (LeaveStatus.PENDING.value, LeaveStatus.APPROVED.value):
        raise HTTPException(400, "Cannot cancel this request")

    # Check if leave has started
    if request.from_date <= datetime.now().date():
        raise HTTPException(400, "Cannot cancel leave that has already started")

    old_status = request.status
    request.status = LeaveStatus.CANCELLED.value

    # Update balance
    year = request.from_date.year
    balance = session.exec(
        select(LeaveBalance).where(
            LeaveBalance.employee_id == request.employee_id,
            LeaveBalance.leave_type_id == request.leave_type_id,
            LeaveBalance.year == year
        )
    ).first()

    if balance:
        if old_status == LeaveStatus.PENDING.value:
            balance.pending_days -= request.total_days
        elif old_status == LeaveStatus.APPROVED.value:
            balance.used_days -= request.total_days
        session.add(balance)

    session.add(request)
    session.commit()
    session.refresh(request)

    return request
