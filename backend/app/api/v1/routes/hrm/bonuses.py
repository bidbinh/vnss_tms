"""
HRM - Bonuses API Routes
Manage employee bonuses
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.db.session import get_session
from app.models import User
from app.models.hrm.employee import Employee
from app.models.hrm.payroll import Bonus, BonusStatus
from app.core.security import get_current_user

router = APIRouter(prefix="/bonuses", tags=["HRM - Bonuses"])


class BonusCreate(BaseModel):
    employee_id: str
    bonus_type: str = "PERFORMANCE"
    amount: float
    reason: str
    effective_date: str
    notes: Optional[str] = None


class BonusUpdate(BaseModel):
    bonus_type: Optional[str] = None
    amount: Optional[float] = None
    reason: Optional[str] = None
    effective_date: Optional[str] = None
    notes: Optional[str] = None


@router.get("")
def list_bonuses(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    employee_id: Optional[str] = Query(None),
    bonus_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    """List all bonuses"""
    tenant_id = str(current_user.tenant_id)

    query = select(Bonus).where(Bonus.tenant_id == tenant_id)

    if employee_id:
        query = query.where(Bonus.employee_id == employee_id)

    if bonus_type:
        query = query.where(Bonus.bonus_type == bonus_type)

    if status:
        query = query.where(Bonus.status == status)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(Bonus.created_at.desc()).offset(offset).limit(page_size)

    bonuses = session.exec(query).all()

    # Enrich with employee info
    items = []
    for bonus in bonuses:
        emp = session.get(Employee, bonus.employee_id)
        items.append({
            "id": bonus.id,
            "employee_id": bonus.employee_id,
            "employee": {
                "id": emp.id,
                "employee_code": emp.employee_code,
                "full_name": emp.full_name,
            } if emp else None,
            "bonus_type": bonus.bonus_type,
            "amount": bonus.amount,
            "reason": bonus.reason,
            "effective_date": bonus.effective_date,
            "status": bonus.status,
            "approved_by": bonus.approved_by,
            "approved_at": bonus.approved_at,
            "notes": bonus.notes,
            "created_at": str(bonus.created_at) if bonus.created_at else None,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("")
def create_bonus(
    payload: BonusCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new bonus"""
    tenant_id = str(current_user.tenant_id)

    # Validate employee
    employee = session.get(Employee, payload.employee_id)
    if not employee or str(employee.tenant_id) != tenant_id:
        raise HTTPException(400, "Invalid employee_id")

    bonus = Bonus(
        tenant_id=tenant_id,
        employee_id=payload.employee_id,
        bonus_type=payload.bonus_type,
        amount=payload.amount,
        reason=payload.reason,
        effective_date=payload.effective_date,
        notes=payload.notes,
        created_by=str(current_user.id),
    )

    session.add(bonus)
    session.commit()
    session.refresh(bonus)

    return bonus


@router.get("/{bonus_id}")
def get_bonus(
    bonus_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get bonus by ID"""
    tenant_id = str(current_user.tenant_id)

    bonus = session.get(Bonus, bonus_id)
    if not bonus or str(bonus.tenant_id) != tenant_id:
        raise HTTPException(404, "Bonus not found")

    emp = session.get(Employee, bonus.employee_id)

    return {
        "id": bonus.id,
        "employee_id": bonus.employee_id,
        "employee": {
            "id": emp.id,
            "employee_code": emp.employee_code,
            "full_name": emp.full_name,
        } if emp else None,
        "bonus_type": bonus.bonus_type,
        "amount": bonus.amount,
        "reason": bonus.reason,
        "effective_date": bonus.effective_date,
        "status": bonus.status,
        "approved_by": bonus.approved_by,
        "approved_at": bonus.approved_at,
        "notes": bonus.notes,
        "created_at": str(bonus.created_at) if bonus.created_at else None,
    }


@router.put("/{bonus_id}")
def update_bonus(
    bonus_id: str,
    payload: BonusUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a bonus"""
    tenant_id = str(current_user.tenant_id)

    bonus = session.get(Bonus, bonus_id)
    if not bonus or str(bonus.tenant_id) != tenant_id:
        raise HTTPException(404, "Bonus not found")

    if bonus.status != BonusStatus.PENDING.value:
        raise HTTPException(400, "Cannot update approved/rejected bonus")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(bonus, key, value)

    session.add(bonus)
    session.commit()
    session.refresh(bonus)

    return bonus


@router.post("/{bonus_id}/approve")
def approve_bonus(
    bonus_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Approve a bonus"""
    tenant_id = str(current_user.tenant_id)

    bonus = session.get(Bonus, bonus_id)
    if not bonus or str(bonus.tenant_id) != tenant_id:
        raise HTTPException(404, "Bonus not found")

    if bonus.status != BonusStatus.PENDING.value:
        raise HTTPException(400, "Bonus already processed")

    bonus.status = BonusStatus.APPROVED.value
    bonus.approved_by = str(current_user.id)
    bonus.approved_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    session.add(bonus)
    session.commit()
    session.refresh(bonus)

    return bonus


@router.post("/{bonus_id}/reject")
def reject_bonus(
    bonus_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Reject a bonus"""
    tenant_id = str(current_user.tenant_id)

    bonus = session.get(Bonus, bonus_id)
    if not bonus or str(bonus.tenant_id) != tenant_id:
        raise HTTPException(404, "Bonus not found")

    if bonus.status != BonusStatus.PENDING.value:
        raise HTTPException(400, "Bonus already processed")

    bonus.status = BonusStatus.REJECTED.value
    bonus.approved_by = str(current_user.id)
    bonus.approved_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    session.add(bonus)
    session.commit()
    session.refresh(bonus)

    return bonus


@router.delete("/{bonus_id}")
def delete_bonus(
    bonus_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete a bonus"""
    tenant_id = str(current_user.tenant_id)

    bonus = session.get(Bonus, bonus_id)
    if not bonus or str(bonus.tenant_id) != tenant_id:
        raise HTTPException(404, "Bonus not found")

    if bonus.status == BonusStatus.PAID.value:
        raise HTTPException(400, "Cannot delete paid bonus")

    session.delete(bonus)
    session.commit()

    return {"success": True, "message": "Bonus deleted"}
