"""
HRM - Employee API Routes
CRUD operations for employees
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func, or_
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

from app.db.session import get_session
from app.models import User
from app.models.hrm.employee import Employee, EmployeeStatus, EmployeeType, EmployeeDependent, EmployeeDocument
from app.models.hrm.department import Branch, Department, Team, Position
from app.core.security import get_current_user
from app.services.driver_hrm_sync import sync_employee_to_driver

router = APIRouter(prefix="/employees", tags=["HRM - Employees"])


# === Pydantic Schemas ===

class EmployeeCreate(BaseModel):
    employee_code: str
    full_name: str
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    marital_status: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    permanent_address: Optional[str] = None
    current_address: Optional[str] = None
    id_number: Optional[str] = None
    id_issue_date: Optional[str] = None
    id_issue_place: Optional[str] = None
    tax_code: Optional[str] = None
    bank_name: Optional[str] = None
    bank_branch: Optional[str] = None
    bank_account: Optional[str] = None
    bank_account_name: Optional[str] = None
    employee_type: str = EmployeeType.FULL_TIME.value
    status: str = EmployeeStatus.ACTIVE.value
    join_date: Optional[str] = None
    branch_id: Optional[str] = None
    department_id: Optional[str] = None
    team_id: Optional[str] = None
    position_id: Optional[str] = None
    manager_id: Optional[str] = None
    social_insurance_number: Optional[str] = None
    health_insurance_number: Optional[str] = None
    driver_id: Optional[str] = None  # Link to TMS driver
    license_number: Optional[str] = None
    license_class: Optional[str] = None
    license_expiry: Optional[str] = None
    salary_type: Optional[str] = "FIXED"
    notes: Optional[str] = None


class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    marital_status: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    permanent_address: Optional[str] = None
    permanent_city: Optional[str] = None
    permanent_province: Optional[str] = None
    current_address: Optional[str] = None
    current_city: Optional[str] = None
    current_province: Optional[str] = None
    id_number: Optional[str] = None
    id_issue_date: Optional[str] = None
    id_issue_place: Optional[str] = None
    id_expiry_date: Optional[str] = None
    tax_code: Optional[str] = None
    bank_name: Optional[str] = None
    bank_branch: Optional[str] = None
    bank_account: Optional[str] = None
    bank_account_name: Optional[str] = None
    employee_type: Optional[str] = None
    status: Optional[str] = None
    join_date: Optional[str] = None
    probation_end_date: Optional[str] = None
    official_date: Optional[str] = None
    resign_date: Optional[str] = None
    resign_reason: Optional[str] = None
    branch_id: Optional[str] = None
    department_id: Optional[str] = None
    team_id: Optional[str] = None
    position_id: Optional[str] = None
    manager_id: Optional[str] = None
    social_insurance_number: Optional[str] = None
    health_insurance_number: Optional[str] = None
    health_insurance_place: Optional[str] = None
    driver_id: Optional[str] = None
    license_number: Optional[str] = None
    license_class: Optional[str] = None
    license_expiry: Optional[str] = None
    health_check_date: Optional[str] = None
    health_check_expiry: Optional[str] = None
    health_check_result: Optional[str] = None
    work_shift_id: Optional[str] = None
    salary_type: Optional[str] = None
    user_id: Optional[str] = None
    avatar_url: Optional[str] = None
    notes: Optional[str] = None


class DependentCreate(BaseModel):
    full_name: str
    relationship: str
    date_of_birth: Optional[str] = None
    id_number: Optional[str] = None
    tax_code: Optional[str] = None
    deduction_from: Optional[str] = None
    deduction_to: Optional[str] = None
    document_type: Optional[str] = None
    document_number: Optional[str] = None
    notes: Optional[str] = None


class DocumentCreate(BaseModel):
    document_type: str
    document_name: str
    document_number: Optional[str] = None
    issue_date: Optional[str] = None
    expiry_date: Optional[str] = None
    issue_place: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    alert_before_days: int = 30
    notes: Optional[str] = None


# === Employee CRUD ===

@router.get("")
def list_employees(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    search: Optional[str] = Query(None, description="Search by name, code, phone, email"),
    status: Optional[str] = Query(None, description="Filter by status"),
    employee_type: Optional[str] = Query(None, description="Filter by type"),
    department_id: Optional[str] = Query(None),
    branch_id: Optional[str] = Query(None),
    position_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    """List employees with filtering and pagination"""
    tenant_id = str(current_user.tenant_id)

    # Base query
    query = select(Employee).where(Employee.tenant_id == tenant_id)

    # Apply filters
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                Employee.full_name.ilike(search_pattern),
                Employee.employee_code.ilike(search_pattern),
                Employee.phone.ilike(search_pattern),
                Employee.email.ilike(search_pattern),
            )
        )

    if status:
        query = query.where(Employee.status == status)

    if employee_type:
        query = query.where(Employee.employee_type == employee_type)

    if department_id:
        query = query.where(Employee.department_id == department_id)

    if branch_id:
        query = query.where(Employee.branch_id == branch_id)

    if position_id:
        query = query.where(Employee.position_id == position_id)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(Employee.created_at.desc()).offset(offset).limit(page_size)

    employees = session.exec(query).all()

    # Enrich with organization info
    result = []
    for emp in employees:
        emp_dict = emp.model_dump()

        # Add branch name
        if emp.branch_id:
            branch = session.get(Branch, emp.branch_id)
            emp_dict["branch_name"] = branch.name if branch else None
        else:
            emp_dict["branch_name"] = None

        # Add department name
        if emp.department_id:
            dept = session.get(Department, emp.department_id)
            emp_dict["department_name"] = dept.name if dept else None
        else:
            emp_dict["department_name"] = None

        # Add position name
        if emp.position_id:
            pos = session.get(Position, emp.position_id)
            emp_dict["position_name"] = pos.name if pos else None
        else:
            emp_dict["position_name"] = None

        # Add manager name
        if emp.manager_id:
            manager = session.get(Employee, emp.manager_id)
            emp_dict["manager_name"] = manager.full_name if manager else None
        else:
            emp_dict["manager_name"] = None

        result.append(emp_dict)

    return {
        "items": result,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }


@router.get("/stats")
def get_employee_stats(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get employee statistics for dashboard"""
    tenant_id = str(current_user.tenant_id)

    # Total employees by status
    stats = {}
    for status in EmployeeStatus:
        count = session.exec(
            select(func.count()).where(
                Employee.tenant_id == tenant_id,
                Employee.status == status.value
            )
        ).one()
        stats[status.value.lower()] = count

    # Total employees by type
    type_stats = {}
    for emp_type in EmployeeType:
        count = session.exec(
            select(func.count()).where(
                Employee.tenant_id == tenant_id,
                Employee.employee_type == emp_type.value,
                Employee.status == EmployeeStatus.ACTIVE.value
            )
        ).one()
        type_stats[emp_type.value.lower()] = count

    # Employees with expiring documents (next 30 days)
    # This would require a more complex query with date parsing

    return {
        "by_status": stats,
        "by_type": type_stats,
        "total_active": stats.get("active", 0) + stats.get("probation", 0),
        "total_inactive": stats.get("resigned", 0) + stats.get("terminated", 0)
    }


@router.get("/{employee_id}")
def get_employee(
    employee_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get employee details by ID"""
    tenant_id = str(current_user.tenant_id)

    employee = session.get(Employee, employee_id)
    if not employee:
        raise HTTPException(404, f"Employee {employee_id} not found")
    if str(employee.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    emp_dict = employee.model_dump()

    # Add organization info
    if employee.branch_id:
        branch = session.get(Branch, employee.branch_id)
        emp_dict["branch"] = branch.model_dump() if branch else None

    if employee.department_id:
        dept = session.get(Department, employee.department_id)
        emp_dict["department"] = dept.model_dump() if dept else None

    if employee.team_id:
        team = session.get(Team, employee.team_id)
        emp_dict["team"] = team.model_dump() if team else None

    if employee.position_id:
        pos = session.get(Position, employee.position_id)
        emp_dict["position"] = pos.model_dump() if pos else None

    if employee.manager_id:
        manager = session.get(Employee, employee.manager_id)
        emp_dict["manager"] = {
            "id": manager.id,
            "full_name": manager.full_name,
            "employee_code": manager.employee_code
        } if manager else None

    # Get dependents
    dependents = session.exec(
        select(EmployeeDependent).where(
            EmployeeDependent.employee_id == employee_id,
            EmployeeDependent.is_active == True
        )
    ).all()
    emp_dict["dependents"] = [d.model_dump() for d in dependents]

    # Get documents
    documents = session.exec(
        select(EmployeeDocument).where(
            EmployeeDocument.employee_id == employee_id
        ).order_by(EmployeeDocument.created_at.desc())
    ).all()
    emp_dict["documents"] = [d.model_dump() for d in documents]

    return emp_dict


@router.post("")
def create_employee(
    payload: EmployeeCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create new employee"""
    if current_user.role not in ("ADMIN", "HR_MANAGER", "HR"):
        raise HTTPException(403, "Only ADMIN or HR can create employees")

    tenant_id = str(current_user.tenant_id)

    # Check if employee_code already exists
    existing = session.exec(
        select(Employee).where(
            Employee.tenant_id == tenant_id,
            Employee.employee_code == payload.employee_code
        )
    ).first()
    if existing:
        raise HTTPException(400, f"Employee code {payload.employee_code} already exists")

    employee = Employee(
        tenant_id=tenant_id,
        **payload.model_dump()
    )

    session.add(employee)
    session.commit()
    session.refresh(employee)

    # Auto-create TMS Driver if employee_type is DRIVER
    if employee.employee_type == EmployeeType.DRIVER.value:
        driver = sync_employee_to_driver(session, employee, create_if_not_exists=True)
        if driver:
            session.refresh(employee)  # Refresh to get updated driver_id

    return employee


@router.patch("/{employee_id}")
def update_employee(
    employee_id: str,
    payload: EmployeeUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update employee"""
    if current_user.role not in ("ADMIN", "HR_MANAGER", "HR"):
        raise HTTPException(403, "Only ADMIN or HR can update employees")

    tenant_id = str(current_user.tenant_id)

    employee = session.get(Employee, employee_id)
    if not employee:
        raise HTTPException(404, f"Employee {employee_id} not found")
    if str(employee.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    # Update only provided fields
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(employee, key, value)

    session.add(employee)
    session.commit()
    session.refresh(employee)

    # Sync to TMS Driver if employee_type is DRIVER
    if employee.employee_type == EmployeeType.DRIVER.value:
        driver = sync_employee_to_driver(session, employee, create_if_not_exists=True)
        if driver:
            session.refresh(employee)

    return employee


@router.delete("/{employee_id}")
def delete_employee(
    employee_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Soft delete employee (set status to TERMINATED)"""
    if current_user.role not in ("ADMIN",):
        raise HTTPException(403, "Only ADMIN can delete employees")

    tenant_id = str(current_user.tenant_id)

    employee = session.get(Employee, employee_id)
    if not employee:
        raise HTTPException(404, f"Employee {employee_id} not found")
    if str(employee.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    # Soft delete - just change status
    employee.status = EmployeeStatus.TERMINATED.value
    employee.resign_date = datetime.now().strftime("%Y-%m-%d")

    session.add(employee)
    session.commit()

    return {"message": "Employee deleted successfully"}


# === Dependents ===

@router.get("/{employee_id}/dependents")
def list_dependents(
    employee_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List employee's dependents"""
    tenant_id = str(current_user.tenant_id)

    employee = session.get(Employee, employee_id)
    if not employee or str(employee.tenant_id) != tenant_id:
        raise HTTPException(404, "Employee not found")

    dependents = session.exec(
        select(EmployeeDependent).where(
            EmployeeDependent.employee_id == employee_id
        ).order_by(EmployeeDependent.created_at.desc())
    ).all()

    return dependents


@router.post("/{employee_id}/dependents")
def add_dependent(
    employee_id: str,
    payload: DependentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Add dependent to employee"""
    if current_user.role not in ("ADMIN", "HR_MANAGER", "HR"):
        raise HTTPException(403, "Only ADMIN or HR can manage dependents")

    tenant_id = str(current_user.tenant_id)

    employee = session.get(Employee, employee_id)
    if not employee or str(employee.tenant_id) != tenant_id:
        raise HTTPException(404, "Employee not found")

    dependent = EmployeeDependent(
        tenant_id=tenant_id,
        employee_id=employee_id,
        **payload.model_dump()
    )

    session.add(dependent)
    session.commit()
    session.refresh(dependent)

    return dependent


@router.delete("/{employee_id}/dependents/{dependent_id}")
def remove_dependent(
    employee_id: str,
    dependent_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Remove dependent (soft delete)"""
    if current_user.role not in ("ADMIN", "HR_MANAGER", "HR"):
        raise HTTPException(403, "Only ADMIN or HR can manage dependents")

    tenant_id = str(current_user.tenant_id)

    dependent = session.get(EmployeeDependent, dependent_id)
    if not dependent or str(dependent.tenant_id) != tenant_id:
        raise HTTPException(404, "Dependent not found")
    if dependent.employee_id != employee_id:
        raise HTTPException(400, "Dependent does not belong to this employee")

    dependent.is_active = False
    session.add(dependent)
    session.commit()

    return {"message": "Dependent removed successfully"}


# === Documents ===

@router.get("/{employee_id}/documents")
def list_documents(
    employee_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List employee's documents"""
    tenant_id = str(current_user.tenant_id)

    employee = session.get(Employee, employee_id)
    if not employee or str(employee.tenant_id) != tenant_id:
        raise HTTPException(404, "Employee not found")

    documents = session.exec(
        select(EmployeeDocument).where(
            EmployeeDocument.employee_id == employee_id
        ).order_by(EmployeeDocument.created_at.desc())
    ).all()

    return documents


@router.post("/{employee_id}/documents")
def add_document(
    employee_id: str,
    payload: DocumentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Add document to employee"""
    if current_user.role not in ("ADMIN", "HR_MANAGER", "HR"):
        raise HTTPException(403, "Only ADMIN or HR can manage documents")

    tenant_id = str(current_user.tenant_id)

    employee = session.get(Employee, employee_id)
    if not employee or str(employee.tenant_id) != tenant_id:
        raise HTTPException(404, "Employee not found")

    document = EmployeeDocument(
        tenant_id=tenant_id,
        employee_id=employee_id,
        **payload.model_dump()
    )

    session.add(document)
    session.commit()
    session.refresh(document)

    return document


@router.delete("/{employee_id}/documents/{document_id}")
def delete_document(
    employee_id: str,
    document_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete document"""
    if current_user.role not in ("ADMIN", "HR_MANAGER", "HR"):
        raise HTTPException(403, "Only ADMIN or HR can manage documents")

    tenant_id = str(current_user.tenant_id)

    document = session.get(EmployeeDocument, document_id)
    if not document or str(document.tenant_id) != tenant_id:
        raise HTTPException(404, "Document not found")
    if document.employee_id != employee_id:
        raise HTTPException(400, "Document does not belong to this employee")

    session.delete(document)
    session.commit()

    return {"message": "Document deleted successfully"}
