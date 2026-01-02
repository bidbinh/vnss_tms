"""
HRM - Department API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from typing import Optional
from pydantic import BaseModel

from app.db.session import get_session
from app.models import User
from app.models.hrm.department import Department
from app.models.hrm.employee import Employee
from app.core.security import get_current_user

router = APIRouter(prefix="/departments", tags=["HRM - Departments"])


class DepartmentCreate(BaseModel):
    code: str
    name: str
    parent_id: Optional[str] = None
    branch_id: Optional[str] = None
    manager_id: Optional[str] = None
    cost_center_code: Optional[str] = None
    sort_order: int = 0
    notes: Optional[str] = None


class DepartmentUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    parent_id: Optional[str] = None
    branch_id: Optional[str] = None
    manager_id: Optional[str] = None
    cost_center_code: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None
    notes: Optional[str] = None


@router.get("")
def list_departments(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    branch_id: Optional[str] = Query(None),
    include_inactive: bool = Query(False),
):
    """List all departments"""
    tenant_id = str(current_user.tenant_id)

    query = select(Department).where(Department.tenant_id == tenant_id)

    if branch_id:
        query = query.where(Department.branch_id == branch_id)

    if not include_inactive:
        query = query.where(Department.is_active == True)

    query = query.order_by(Department.sort_order, Department.name)
    departments = session.exec(query).all()

    # Enrich with employee count and manager info
    result = []
    for dept in departments:
        dept_dict = dept.model_dump()

        # Count employees in this department
        emp_count = session.exec(
            select(func.count()).where(
                Employee.department_id == dept.id,
                Employee.status == "ACTIVE"
            )
        ).one()
        dept_dict["employee_count"] = emp_count

        # Manager info
        if dept.manager_id:
            manager = session.get(Employee, dept.manager_id)
            dept_dict["manager"] = {
                "id": manager.id,
                "full_name": manager.full_name,
                "employee_code": manager.employee_code
            } if manager else None
        else:
            dept_dict["manager"] = None

        # Parent department name
        if dept.parent_id:
            parent = session.get(Department, dept.parent_id)
            dept_dict["parent_name"] = parent.name if parent else None
        else:
            dept_dict["parent_name"] = None

        result.append(dept_dict)

    return result


@router.get("/tree")
def get_department_tree(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    branch_id: Optional[str] = Query(None),
):
    """Get departments as a tree structure"""
    tenant_id = str(current_user.tenant_id)

    query = select(Department).where(
        Department.tenant_id == tenant_id,
        Department.is_active == True
    )

    if branch_id:
        query = query.where(Department.branch_id == branch_id)

    query = query.order_by(Department.sort_order, Department.name)
    departments = session.exec(query).all()

    # Build tree
    dept_map = {d.id: {**d.model_dump(), "children": []} for d in departments}
    tree = []

    for dept in departments:
        dept_node = dept_map[dept.id]
        if dept.parent_id and dept.parent_id in dept_map:
            dept_map[dept.parent_id]["children"].append(dept_node)
        else:
            tree.append(dept_node)

    return tree


@router.get("/{department_id}")
def get_department(
    department_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get department details"""
    tenant_id = str(current_user.tenant_id)

    dept = session.get(Department, department_id)
    if not dept:
        raise HTTPException(404, "Department not found")
    if str(dept.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    dept_dict = dept.model_dump()

    # Get employees in this department
    employees = session.exec(
        select(Employee).where(
            Employee.department_id == department_id,
            Employee.status == "ACTIVE"
        ).order_by(Employee.full_name)
    ).all()

    dept_dict["employees"] = [
        {
            "id": e.id,
            "employee_code": e.employee_code,
            "full_name": e.full_name,
            "position_id": e.position_id
        }
        for e in employees
    ]

    # Get sub-departments
    sub_depts = session.exec(
        select(Department).where(
            Department.parent_id == department_id,
            Department.is_active == True
        )
    ).all()
    dept_dict["sub_departments"] = [d.model_dump() for d in sub_depts]

    return dept_dict


@router.post("")
def create_department(
    payload: DepartmentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create new department"""
    if current_user.role not in ("ADMIN", "HR_MANAGER"):
        raise HTTPException(403, "Only ADMIN or HR_MANAGER can create departments")

    tenant_id = str(current_user.tenant_id)

    # Check if code already exists
    existing = session.exec(
        select(Department).where(
            Department.tenant_id == tenant_id,
            Department.code == payload.code
        )
    ).first()
    if existing:
        raise HTTPException(400, f"Department code {payload.code} already exists")

    department = Department(
        tenant_id=tenant_id,
        **payload.model_dump()
    )

    session.add(department)
    session.commit()
    session.refresh(department)

    return department


@router.patch("/{department_id}")
def update_department(
    department_id: str,
    payload: DepartmentUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update department"""
    if current_user.role not in ("ADMIN", "HR_MANAGER"):
        raise HTTPException(403, "Only ADMIN or HR_MANAGER can update departments")

    tenant_id = str(current_user.tenant_id)

    dept = session.get(Department, department_id)
    if not dept:
        raise HTTPException(404, "Department not found")
    if str(dept.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(dept, key, value)

    session.add(dept)
    session.commit()
    session.refresh(dept)

    return dept


@router.delete("/{department_id}")
def delete_department(
    department_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Deactivate department"""
    if current_user.role not in ("ADMIN",):
        raise HTTPException(403, "Only ADMIN can delete departments")

    tenant_id = str(current_user.tenant_id)

    dept = session.get(Department, department_id)
    if not dept:
        raise HTTPException(404, "Department not found")
    if str(dept.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    # Check if department has employees
    emp_count = session.exec(
        select(func.count()).where(
            Employee.department_id == department_id,
            Employee.status == "ACTIVE"
        )
    ).one()

    if emp_count > 0:
        raise HTTPException(400, f"Cannot delete department with {emp_count} active employees")

    dept.is_active = False
    session.add(dept)
    session.commit()

    return {"message": "Department deactivated successfully"}
