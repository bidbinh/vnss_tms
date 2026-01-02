"""
HRM - Branch API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from typing import Optional
from pydantic import BaseModel

from app.db.session import get_session
from app.models import User
from app.models.hrm.department import Branch, Department
from app.models.hrm.employee import Employee
from app.core.security import get_current_user

router = APIRouter(prefix="/branches", tags=["HRM - Branches"])


class BranchCreate(BaseModel):
    code: str
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    manager_id: Optional[str] = None
    is_headquarters: bool = False
    notes: Optional[str] = None


class BranchUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    manager_id: Optional[str] = None
    is_headquarters: Optional[bool] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


@router.get("")
def list_branches(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    include_inactive: bool = Query(False),
):
    """List all branches"""
    tenant_id = str(current_user.tenant_id)

    query = select(Branch).where(Branch.tenant_id == tenant_id)

    if not include_inactive:
        query = query.where(Branch.is_active == True)

    query = query.order_by(Branch.is_headquarters.desc(), Branch.name)
    branches = session.exec(query).all()

    # Enrich with stats
    result = []
    for branch in branches:
        branch_dict = branch.model_dump()

        # Count employees
        emp_count = session.exec(
            select(func.count()).where(
                Employee.branch_id == branch.id,
                Employee.status == "ACTIVE"
            )
        ).one()
        branch_dict["employee_count"] = emp_count

        # Count departments
        dept_count = session.exec(
            select(func.count()).where(
                Department.branch_id == branch.id,
                Department.is_active == True
            )
        ).one()
        branch_dict["department_count"] = dept_count

        # Manager info
        if branch.manager_id:
            manager = session.get(Employee, branch.manager_id)
            branch_dict["manager"] = {
                "id": manager.id,
                "full_name": manager.full_name
            } if manager else None
        else:
            branch_dict["manager"] = None

        result.append(branch_dict)

    return result


@router.get("/{branch_id}")
def get_branch(
    branch_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get branch details"""
    tenant_id = str(current_user.tenant_id)

    branch = session.get(Branch, branch_id)
    if not branch:
        raise HTTPException(404, "Branch not found")
    if str(branch.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    branch_dict = branch.model_dump()

    # Get departments
    departments = session.exec(
        select(Department).where(
            Department.branch_id == branch_id,
            Department.is_active == True
        ).order_by(Department.name)
    ).all()
    branch_dict["departments"] = [d.model_dump() for d in departments]

    return branch_dict


@router.post("")
def create_branch(
    payload: BranchCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create new branch"""
    if current_user.role not in ("ADMIN",):
        raise HTTPException(403, "Only ADMIN can create branches")

    tenant_id = str(current_user.tenant_id)

    # Check if code already exists
    existing = session.exec(
        select(Branch).where(
            Branch.tenant_id == tenant_id,
            Branch.code == payload.code
        )
    ).first()
    if existing:
        raise HTTPException(400, f"Branch code {payload.code} already exists")

    # If this is headquarters, unset other headquarters
    if payload.is_headquarters:
        session.exec(
            select(Branch).where(
                Branch.tenant_id == tenant_id,
                Branch.is_headquarters == True
            )
        )
        for hq in session.exec(
            select(Branch).where(
                Branch.tenant_id == tenant_id,
                Branch.is_headquarters == True
            )
        ).all():
            hq.is_headquarters = False
            session.add(hq)

    branch = Branch(
        tenant_id=tenant_id,
        **payload.model_dump()
    )

    session.add(branch)
    session.commit()
    session.refresh(branch)

    return branch


@router.patch("/{branch_id}")
def update_branch(
    branch_id: str,
    payload: BranchUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update branch"""
    if current_user.role not in ("ADMIN",):
        raise HTTPException(403, "Only ADMIN can update branches")

    tenant_id = str(current_user.tenant_id)

    branch = session.get(Branch, branch_id)
    if not branch:
        raise HTTPException(404, "Branch not found")
    if str(branch.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    # If setting as headquarters, unset others
    if payload.is_headquarters:
        for hq in session.exec(
            select(Branch).where(
                Branch.tenant_id == tenant_id,
                Branch.is_headquarters == True,
                Branch.id != branch_id
            )
        ).all():
            hq.is_headquarters = False
            session.add(hq)

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(branch, key, value)

    session.add(branch)
    session.commit()
    session.refresh(branch)

    return branch


@router.delete("/{branch_id}")
def delete_branch(
    branch_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Deactivate branch"""
    if current_user.role not in ("ADMIN",):
        raise HTTPException(403, "Only ADMIN can delete branches")

    tenant_id = str(current_user.tenant_id)

    branch = session.get(Branch, branch_id)
    if not branch:
        raise HTTPException(404, "Branch not found")
    if str(branch.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    if branch.is_headquarters:
        raise HTTPException(400, "Cannot delete headquarters branch")

    # Check if branch has employees
    emp_count = session.exec(
        select(func.count()).where(
            Employee.branch_id == branch_id,
            Employee.status == "ACTIVE"
        )
    ).one()

    if emp_count > 0:
        raise HTTPException(400, f"Cannot delete branch with {emp_count} active employees")

    branch.is_active = False
    session.add(branch)
    session.commit()

    return {"message": "Branch deactivated successfully"}
