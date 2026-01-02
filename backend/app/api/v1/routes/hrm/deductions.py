"""
HRM - Deductions API Routes
Manage employee deductions (advances, loans, penalties)
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.db.session import get_session
from app.models import User
from app.models.hrm.employee import Employee
from app.models.hrm.payroll import Deduction, DeductionType
from app.core.security import get_current_user

router = APIRouter(prefix="/deductions", tags=["HRM - Deductions"])


class DeductionCreate(BaseModel):
    employee_id: str
    deduction_type: str = "OTHER"
    description: str
    total_amount: float
    monthly_deduction: float = 0
    start_date: str
    end_date: Optional[str] = None
    interest_rate: Optional[float] = None
    notes: Optional[str] = None


class DeductionUpdate(BaseModel):
    deduction_type: Optional[str] = None
    description: Optional[str] = None
    total_amount: Optional[float] = None
    remaining_amount: Optional[float] = None
    monthly_deduction: Optional[float] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    interest_rate: Optional[float] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


@router.get("")
def list_deductions(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    employee_id: Optional[str] = Query(None),
    deduction_type: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
):
    """List all deductions"""
    tenant_id = str(current_user.tenant_id)

    query = select(Deduction).where(Deduction.tenant_id == tenant_id)

    if employee_id:
        query = query.where(Deduction.employee_id == employee_id)

    if deduction_type:
        query = query.where(Deduction.deduction_type == deduction_type)

    if is_active is not None:
        query = query.where(Deduction.is_active == is_active)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(Deduction.created_at.desc()).offset(offset).limit(page_size)

    deductions = session.exec(query).all()

    # Enrich with employee info
    items = []
    for ded in deductions:
        emp = session.get(Employee, ded.employee_id)
        items.append({
            "id": ded.id,
            "employee_id": ded.employee_id,
            "employee": {
                "id": emp.id,
                "employee_code": emp.employee_code,
                "full_name": emp.full_name,
            } if emp else None,
            "deduction_type": ded.deduction_type,
            "description": ded.description,
            "total_amount": ded.total_amount,
            "remaining_amount": ded.remaining_amount,
            "monthly_deduction": ded.monthly_deduction,
            "start_date": ded.start_date,
            "end_date": ded.end_date,
            "interest_rate": ded.interest_rate,
            "is_active": ded.is_active,
            "notes": ded.notes,
            "created_at": str(ded.created_at) if ded.created_at else None,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("")
def create_deduction(
    payload: DeductionCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new deduction"""
    tenant_id = str(current_user.tenant_id)

    # Validate employee
    employee = session.get(Employee, payload.employee_id)
    if not employee or str(employee.tenant_id) != tenant_id:
        raise HTTPException(400, "Invalid employee_id")

    deduction = Deduction(
        tenant_id=tenant_id,
        employee_id=payload.employee_id,
        deduction_type=payload.deduction_type,
        description=payload.description,
        total_amount=payload.total_amount,
        remaining_amount=payload.total_amount,  # Initially, remaining = total
        monthly_deduction=payload.monthly_deduction,
        start_date=payload.start_date,
        end_date=payload.end_date,
        interest_rate=payload.interest_rate,
        notes=payload.notes,
        created_by=str(current_user.id),
    )

    session.add(deduction)
    session.commit()
    session.refresh(deduction)

    return deduction


@router.get("/{deduction_id}")
def get_deduction(
    deduction_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get deduction by ID"""
    tenant_id = str(current_user.tenant_id)

    deduction = session.get(Deduction, deduction_id)
    if not deduction or str(deduction.tenant_id) != tenant_id:
        raise HTTPException(404, "Deduction not found")

    emp = session.get(Employee, deduction.employee_id)

    return {
        "id": deduction.id,
        "employee_id": deduction.employee_id,
        "employee": {
            "id": emp.id,
            "employee_code": emp.employee_code,
            "full_name": emp.full_name,
        } if emp else None,
        "deduction_type": deduction.deduction_type,
        "description": deduction.description,
        "total_amount": deduction.total_amount,
        "remaining_amount": deduction.remaining_amount,
        "monthly_deduction": deduction.monthly_deduction,
        "start_date": deduction.start_date,
        "end_date": deduction.end_date,
        "interest_rate": deduction.interest_rate,
        "is_active": deduction.is_active,
        "notes": deduction.notes,
        "created_at": str(deduction.created_at) if deduction.created_at else None,
    }


@router.put("/{deduction_id}")
def update_deduction(
    deduction_id: str,
    payload: DeductionUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a deduction"""
    tenant_id = str(current_user.tenant_id)

    deduction = session.get(Deduction, deduction_id)
    if not deduction or str(deduction.tenant_id) != tenant_id:
        raise HTTPException(404, "Deduction not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(deduction, key, value)

    session.add(deduction)
    session.commit()
    session.refresh(deduction)

    return deduction


@router.post("/{deduction_id}/deactivate")
def deactivate_deduction(
    deduction_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Deactivate a deduction"""
    tenant_id = str(current_user.tenant_id)

    deduction = session.get(Deduction, deduction_id)
    if not deduction or str(deduction.tenant_id) != tenant_id:
        raise HTTPException(404, "Deduction not found")

    deduction.is_active = False
    deduction.end_date = datetime.now().strftime("%Y-%m-%d")

    session.add(deduction)
    session.commit()
    session.refresh(deduction)

    return deduction


@router.delete("/{deduction_id}")
def delete_deduction(
    deduction_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete a deduction"""
    tenant_id = str(current_user.tenant_id)

    deduction = session.get(Deduction, deduction_id)
    if not deduction or str(deduction.tenant_id) != tenant_id:
        raise HTTPException(404, "Deduction not found")

    session.delete(deduction)
    session.commit()

    return {"success": True, "message": "Deduction deleted"}
