"""
HRM - Position API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from typing import Optional
from pydantic import BaseModel

from app.db.session import get_session
from app.models import User
from app.models.hrm.department import Position, Department
from app.models.hrm.employee import Employee
from app.core.security import get_current_user

router = APIRouter(prefix="/positions", tags=["HRM - Positions"])


class PositionCreate(BaseModel):
    code: str
    name: str
    level: int = 1
    department_id: Optional[str] = None
    min_salary: Optional[float] = None
    max_salary: Optional[float] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    sort_order: int = 0


class PositionUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    level: Optional[int] = None
    department_id: Optional[str] = None
    min_salary: Optional[float] = None
    max_salary: Optional[float] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


@router.get("")
def list_positions(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    department_id: Optional[str] = Query(None),
    include_inactive: bool = Query(False),
):
    """List all positions"""
    tenant_id = str(current_user.tenant_id)

    query = select(Position).where(Position.tenant_id == tenant_id)

    if department_id:
        query = query.where(Position.department_id == department_id)

    if not include_inactive:
        query = query.where(Position.is_active == True)

    query = query.order_by(Position.level, Position.sort_order, Position.name)
    positions = session.exec(query).all()

    # Enrich with employee count
    result = []
    for pos in positions:
        pos_dict = pos.model_dump()

        # Count employees with this position
        emp_count = session.exec(
            select(func.count()).where(
                Employee.position_id == pos.id,
                Employee.status == "ACTIVE"
            )
        ).one()
        pos_dict["employee_count"] = emp_count

        # Department name
        if pos.department_id:
            dept = session.get(Department, pos.department_id)
            pos_dict["department_name"] = dept.name if dept else None
        else:
            pos_dict["department_name"] = None

        result.append(pos_dict)

    return result


@router.get("/{position_id}")
def get_position(
    position_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get position details"""
    tenant_id = str(current_user.tenant_id)

    position = session.get(Position, position_id)
    if not position:
        raise HTTPException(404, "Position not found")
    if str(position.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    return position


@router.post("")
def create_position(
    payload: PositionCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create new position"""
    if current_user.role not in ("ADMIN", "HR_MANAGER"):
        raise HTTPException(403, "Only ADMIN or HR_MANAGER can create positions")

    tenant_id = str(current_user.tenant_id)

    # Check if code already exists
    existing = session.exec(
        select(Position).where(
            Position.tenant_id == tenant_id,
            Position.code == payload.code
        )
    ).first()
    if existing:
        raise HTTPException(400, f"Position code {payload.code} already exists")

    position = Position(
        tenant_id=tenant_id,
        **payload.model_dump()
    )

    session.add(position)
    session.commit()
    session.refresh(position)

    return position


@router.patch("/{position_id}")
def update_position(
    position_id: str,
    payload: PositionUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update position"""
    if current_user.role not in ("ADMIN", "HR_MANAGER"):
        raise HTTPException(403, "Only ADMIN or HR_MANAGER can update positions")

    tenant_id = str(current_user.tenant_id)

    position = session.get(Position, position_id)
    if not position:
        raise HTTPException(404, "Position not found")
    if str(position.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(position, key, value)

    session.add(position)
    session.commit()
    session.refresh(position)

    return position


@router.delete("/{position_id}")
def delete_position(
    position_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Deactivate position"""
    if current_user.role not in ("ADMIN",):
        raise HTTPException(403, "Only ADMIN can delete positions")

    tenant_id = str(current_user.tenant_id)

    position = session.get(Position, position_id)
    if not position:
        raise HTTPException(404, "Position not found")
    if str(position.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    # Check if position is assigned to employees
    emp_count = session.exec(
        select(func.count()).where(
            Employee.position_id == position_id,
            Employee.status == "ACTIVE"
        )
    ).one()

    if emp_count > 0:
        raise HTTPException(400, f"Cannot delete position with {emp_count} active employees")

    position.is_active = False
    session.add(position)
    session.commit()

    return {"message": "Position deactivated successfully"}
