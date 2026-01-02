"""
HRM - Advance Payment API Routes
Shared module for advance payments (used by both HRM and TMS)
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from typing import Optional
from pydantic import BaseModel
from datetime import datetime

from app.db.session import get_session
from app.models import User
from app.models.hrm.advance import AdvanceRequest, AdvanceStatus, AdvanceRepayment
from app.models.hrm.employee import Employee
from app.models.hrm.payroll import Deduction
from app.core.security import get_current_user

router = APIRouter(prefix="/advances", tags=["HRM - Advances"])


# === Schemas ===

class AdvanceCreate(BaseModel):
    employee_id: str
    requested_amount: float
    purpose: Optional[str] = None
    advance_type: str = "SALARY"  # SALARY, TRIP, OTHER
    request_date: Optional[str] = None
    needed_date: Optional[str] = None
    trip_id: Optional[str] = None  # Link to TMS trip
    repayment_method: str = "SALARY_DEDUCTION"  # SALARY_DEDUCTION, CASH, TRANSFER
    monthly_deduction_amount: Optional[float] = None
    notes: Optional[str] = None


class RepaymentCreate(BaseModel):
    advance_request_id: str
    amount: float
    repayment_date: str
    repayment_method: str = "CASH"  # SALARY_DEDUCTION, CASH, TRANSFER
    payroll_record_id: Optional[str] = None
    reference: Optional[str] = None
    notes: Optional[str] = None


# === Advance Requests ===

@router.get("")
def list_advances(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    employee_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    has_outstanding: Optional[bool] = Query(None, description="Filter by outstanding balance"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    """List advance requests"""
    tenant_id = str(current_user.tenant_id)

    query = select(AdvanceRequest).where(AdvanceRequest.tenant_id == tenant_id)

    if employee_id:
        query = query.where(AdvanceRequest.employee_id == employee_id)

    if status:
        query = query.where(AdvanceRequest.status == status)

    if date_from:
        query = query.where(AdvanceRequest.request_date >= date_from)

    if date_to:
        query = query.where(AdvanceRequest.request_date <= date_to)

    if has_outstanding is True:
        query = query.where(AdvanceRequest.remaining_amount > 0)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(AdvanceRequest.created_at.desc()).offset(offset).limit(page_size)

    advances = session.exec(query).all()

    # Enrich
    result = []
    for adv in advances:
        adv_dict = adv.model_dump()

        employee = session.get(Employee, adv.employee_id)
        adv_dict["employee"] = {
            "id": employee.id,
            "employee_code": employee.employee_code,
            "full_name": employee.full_name
        } if employee else None

        result.append(adv_dict)

    return {
        "items": result,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.get("/stats")
def get_advance_stats(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get advance payment statistics"""
    tenant_id = str(current_user.tenant_id)

    # Total outstanding
    total_outstanding = session.exec(
        select(func.sum(AdvanceRequest.remaining_amount)).where(
            AdvanceRequest.tenant_id == tenant_id,
            AdvanceRequest.remaining_amount > 0
        )
    ).one() or 0

    # Count by status
    pending_count = session.exec(
        select(func.count()).where(
            AdvanceRequest.tenant_id == tenant_id,
            AdvanceRequest.status == AdvanceStatus.PENDING.value
        )
    ).one()

    approved_count = session.exec(
        select(func.count()).where(
            AdvanceRequest.tenant_id == tenant_id,
            AdvanceRequest.status == AdvanceStatus.APPROVED.value
        )
    ).one()

    # Employees with outstanding advances
    employees_with_advance = session.exec(
        select(func.count(func.distinct(AdvanceRequest.employee_id))).where(
            AdvanceRequest.tenant_id == tenant_id,
            AdvanceRequest.remaining_amount > 0
        )
    ).one()

    return {
        "total_outstanding": total_outstanding,
        "pending_requests": pending_count,
        "approved_requests": approved_count,
        "employees_with_advance": employees_with_advance
    }


@router.get("/my")
def get_my_advances(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get current user's advance requests"""
    employee = session.exec(
        select(Employee).where(Employee.user_id == str(current_user.id))
    ).first()

    if not employee:
        raise HTTPException(404, "Employee record not found")

    advances = session.exec(
        select(AdvanceRequest).where(
            AdvanceRequest.employee_id == employee.id
        ).order_by(AdvanceRequest.created_at.desc())
    ).all()

    return advances


@router.get("/{advance_id}")
def get_advance(
    advance_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get advance details"""
    tenant_id = str(current_user.tenant_id)

    advance = session.get(AdvanceRequest, advance_id)
    if not advance or str(advance.tenant_id) != tenant_id:
        raise HTTPException(404, "Advance not found")

    adv_dict = advance.model_dump()

    # Employee info
    employee = session.get(Employee, advance.employee_id)
    adv_dict["employee"] = employee.model_dump() if employee else None

    # Repayments
    repayments = session.exec(
        select(AdvanceRepayment).where(
            AdvanceRepayment.advance_request_id == advance_id
        ).order_by(AdvanceRepayment.repayment_date)
    ).all()
    adv_dict["repayments"] = [r.model_dump() for r in repayments]

    return adv_dict


@router.post("")
def create_advance(
    payload: AdvanceCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create advance request"""
    tenant_id = str(current_user.tenant_id)

    # Validate employee
    employee = session.get(Employee, payload.employee_id)
    if not employee or str(employee.tenant_id) != tenant_id:
        raise HTTPException(400, "Invalid employee_id")

    # Check outstanding advances
    outstanding = session.exec(
        select(func.sum(AdvanceRequest.remaining_amount)).where(
            AdvanceRequest.employee_id == payload.employee_id,
            AdvanceRequest.remaining_amount > 0
        )
    ).one() or 0

    # You could add limits here
    # max_advance = employee.basic_salary * 2
    # if outstanding + payload.amount > max_advance:
    #     raise HTTPException(400, "Exceeds maximum advance limit")

    # Generate request number
    count = session.exec(
        select(func.count()).where(AdvanceRequest.tenant_id == tenant_id)
    ).one() + 1
    request_number = f"TU-{datetime.now().year}-{count:04d}"

    advance = AdvanceRequest(
        tenant_id=tenant_id,
        request_number=request_number,
        remaining_amount=payload.requested_amount,
        request_date=payload.request_date or datetime.now().strftime("%Y-%m-%d"),
        created_by=str(current_user.id),
        **payload.model_dump(exclude={"request_date"})
    )

    session.add(advance)
    session.commit()
    session.refresh(advance)

    return advance


@router.post("/{advance_id}/approve")
def approve_advance(
    advance_id: str,
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Approve advance request"""
    if current_user.role not in ("ADMIN", "HR_MANAGER", "MANAGER"):
        raise HTTPException(403, "Only managers can approve advances")

    tenant_id = str(current_user.tenant_id)

    advance = session.get(AdvanceRequest, advance_id)
    if not advance or str(advance.tenant_id) != tenant_id:
        raise HTTPException(404, "Advance not found")

    if advance.status != AdvanceStatus.PENDING.value:
        raise HTTPException(400, "Advance is not pending")

    approved_amount = payload.get("approved_amount", advance.requested_amount)

    advance.status = AdvanceStatus.APPROVED.value
    advance.approved_amount = approved_amount
    advance.remaining_amount = approved_amount
    advance.approved_by = str(current_user.id)
    advance.approved_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    if payload.get("notes"):
        advance.notes = payload.get("notes")

    session.add(advance)
    session.commit()
    session.refresh(advance)

    return advance


@router.post("/{advance_id}/reject")
def reject_advance(
    advance_id: str,
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Reject advance request"""
    if current_user.role not in ("ADMIN", "HR_MANAGER", "MANAGER"):
        raise HTTPException(403, "Only managers can reject advances")

    tenant_id = str(current_user.tenant_id)

    advance = session.get(AdvanceRequest, advance_id)
    if not advance or str(advance.tenant_id) != tenant_id:
        raise HTTPException(404, "Advance not found")

    if advance.status != AdvanceStatus.PENDING.value:
        raise HTTPException(400, "Advance is not pending")

    advance.status = AdvanceStatus.REJECTED.value
    advance.approved_by = str(current_user.id)
    advance.approved_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    advance.rejection_reason = payload.get("reason")

    session.add(advance)
    session.commit()
    session.refresh(advance)

    return advance


@router.post("/{advance_id}/disburse")
def disburse_advance(
    advance_id: str,
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Mark advance as disbursed (paid out)"""
    if current_user.role not in ("ADMIN", "HR_MANAGER", "ACCOUNTANT"):
        raise HTTPException(403, "Only authorized users can disburse advances")

    tenant_id = str(current_user.tenant_id)

    advance = session.get(AdvanceRequest, advance_id)
    if not advance or str(advance.tenant_id) != tenant_id:
        raise HTTPException(404, "Advance not found")

    if advance.status != AdvanceStatus.APPROVED.value:
        raise HTTPException(400, "Advance is not approved")

    advance.status = AdvanceStatus.PAID.value
    advance.paid_date = datetime.now().strftime("%Y-%m-%d")
    advance.paid_by = str(current_user.id)
    advance.payment_method = payload.get("payment_method", "CASH")
    advance.payment_reference = payload.get("payment_reference")

    session.add(advance)
    session.commit()
    session.refresh(advance)

    return advance


# === Repayments ===

@router.get("/{advance_id}/repayments")
def get_repayments(
    advance_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get repayments for an advance"""
    tenant_id = str(current_user.tenant_id)

    advance = session.get(AdvanceRequest, advance_id)
    if not advance or str(advance.tenant_id) != tenant_id:
        raise HTTPException(404, "Advance not found")

    repayments = session.exec(
        select(AdvanceRepayment).where(
            AdvanceRepayment.advance_request_id == advance_id
        ).order_by(AdvanceRepayment.repayment_date)
    ).all()

    return repayments


@router.post("/repayments")
def create_repayment(
    payload: RepaymentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Record a repayment"""
    if current_user.role not in ("ADMIN", "HR_MANAGER", "ACCOUNTANT"):
        raise HTTPException(403, "Only authorized users can record repayments")

    tenant_id = str(current_user.tenant_id)

    advance = session.get(AdvanceRequest, payload.advance_request_id)
    if not advance or str(advance.tenant_id) != tenant_id:
        raise HTTPException(404, "Advance not found")

    if advance.remaining_amount < payload.amount:
        raise HTTPException(400, f"Repayment amount exceeds remaining balance ({advance.remaining_amount})")

    repayment = AdvanceRepayment(
        tenant_id=tenant_id,
        created_by=str(current_user.id),
        **payload.model_dump()
    )

    session.add(repayment)

    # Update advance
    advance.repaid_amount += payload.amount
    advance.remaining_amount -= payload.amount

    if advance.remaining_amount <= 0:
        advance.status = AdvanceStatus.FULLY_REPAID.value
    elif advance.repaid_amount > 0:
        advance.status = AdvanceStatus.PARTIALLY_REPAID.value

    session.add(advance)
    session.commit()
    session.refresh(repayment)

    return repayment


@router.post("/schedule-deduction")
def schedule_salary_deduction(
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Schedule advance deduction from salary"""
    if current_user.role not in ("ADMIN", "HR_MANAGER"):
        raise HTTPException(403, "Only ADMIN or HR_MANAGER can schedule deductions")

    tenant_id = str(current_user.tenant_id)

    advance_id = payload.get("advance_id")
    period_id = payload.get("period_id")
    amount = payload.get("amount")

    advance = session.get(AdvanceRequest, advance_id)
    if not advance or str(advance.tenant_id) != tenant_id:
        raise HTTPException(404, "Advance not found")

    if amount > advance.remaining_amount:
        raise HTTPException(400, "Deduction amount exceeds remaining balance")

    # Create deduction record for payroll
    deduction = Deduction(
        tenant_id=tenant_id,
        employee_id=advance.employee_id,
        period_id=period_id,
        deduction_type="ADVANCE",
        reference_id=advance_id,
        amount=amount,
        description=f"Khấu trừ tạm ứng #{advance_id[:8]}",
        is_processed=False
    )

    session.add(deduction)
    session.commit()
    session.refresh(deduction)

    return {
        "message": "Deduction scheduled successfully",
        "deduction": deduction.model_dump()
    }


# === Outstanding Balance Report ===

@router.get("/reports/outstanding")
def get_outstanding_report(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    department_id: Optional[str] = Query(None),
):
    """Get outstanding advance balance report by employee"""
    tenant_id = str(current_user.tenant_id)

    # Get all employees with outstanding advances
    query = select(AdvanceRequest).where(
        AdvanceRequest.tenant_id == tenant_id,
        AdvanceRequest.remaining_amount > 0
    )

    advances = session.exec(query).all()

    # Group by employee
    by_employee = {}
    for adv in advances:
        emp_id = adv.employee_id
        if emp_id not in by_employee:
            employee = session.get(Employee, emp_id)
            if department_id and employee.department_id != department_id:
                continue

            by_employee[emp_id] = {
                "employee_id": emp_id,
                "employee_code": employee.employee_code if employee else None,
                "employee_name": employee.full_name if employee else None,
                "department_id": employee.department_id if employee else None,
                "total_outstanding": 0,
                "advances": []
            }

        by_employee[emp_id]["total_outstanding"] += adv.remaining_amount
        by_employee[emp_id]["advances"].append({
            "id": adv.id,
            "request_number": adv.request_number,
            "requested_amount": adv.requested_amount,
            "approved_amount": adv.approved_amount,
            "remaining": adv.remaining_amount,
            "request_date": adv.request_date
        })

    return list(by_employee.values())
