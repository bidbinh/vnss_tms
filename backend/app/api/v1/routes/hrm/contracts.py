"""
HRM - Contract API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from typing import Optional
from pydantic import BaseModel
from datetime import datetime, timedelta

from app.db.session import get_session
from app.models import User
from app.models.hrm.contract import Contract, ContractType, ContractStatus
from app.models.hrm.employee import Employee
from app.core.security import get_current_user

router = APIRouter(prefix="/contracts", tags=["HRM - Contracts"])


class ContractCreate(BaseModel):
    employee_id: str
    contract_number: Optional[str] = None  # Auto-generate if not provided
    contract_type: str
    start_date: str
    end_date: Optional[str] = None
    sign_date: Optional[str] = None
    previous_contract_id: Optional[str] = None
    basic_salary: float = 0
    insurance_salary: Optional[float] = None
    allowances_json: Optional[str] = None
    probation_salary_percent: float = 85
    job_title: Optional[str] = None
    job_description: Optional[str] = None
    work_location: Optional[str] = None
    working_hours_per_day: float = 8
    working_days_per_week: float = 5
    contract_file_url: Optional[str] = None
    notes: Optional[str] = None


class ContractUpdate(BaseModel):
    contract_type: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    sign_date: Optional[str] = None
    basic_salary: Optional[float] = None
    insurance_salary: Optional[float] = None
    allowances_json: Optional[str] = None
    probation_salary_percent: Optional[float] = None
    job_title: Optional[str] = None
    job_description: Optional[str] = None
    work_location: Optional[str] = None
    working_hours_per_day: Optional[float] = None
    working_days_per_week: Optional[float] = None
    contract_file_url: Optional[str] = None
    employee_signed_date: Optional[str] = None
    company_signed_by: Optional[str] = None
    company_signed_date: Optional[str] = None
    termination_date: Optional[str] = None
    termination_reason: Optional[str] = None
    termination_type: Optional[str] = None
    expiry_alert_days: Optional[int] = None
    notes: Optional[str] = None


@router.get("")
def list_contracts(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    employee_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    contract_type: Optional[str] = Query(None),
    expiring_within_days: Optional[int] = Query(None, description="Filter contracts expiring within N days"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    """List all contracts"""
    tenant_id = str(current_user.tenant_id)

    query = select(Contract).where(Contract.tenant_id == tenant_id)

    if employee_id:
        query = query.where(Contract.employee_id == employee_id)

    if status:
        query = query.where(Contract.status == status)

    if contract_type:
        query = query.where(Contract.contract_type == contract_type)

    # Filter expiring contracts
    if expiring_within_days:
        today = datetime.now().strftime("%Y-%m-%d")
        future_date = (datetime.now() + timedelta(days=expiring_within_days)).strftime("%Y-%m-%d")
        query = query.where(
            Contract.end_date != None,
            Contract.end_date >= today,
            Contract.end_date <= future_date,
            Contract.status == ContractStatus.ACTIVE.value
        )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(Contract.created_at.desc()).offset(offset).limit(page_size)

    contracts = session.exec(query).all()

    # Enrich with employee info
    result = []
    for contract in contracts:
        contract_dict = contract.model_dump()

        employee = session.get(Employee, contract.employee_id)
        contract_dict["employee"] = {
            "id": employee.id,
            "employee_code": employee.employee_code,
            "full_name": employee.full_name
        } if employee else None

        result.append(contract_dict)

    return {
        "items": result,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }


@router.get("/expiring")
def get_expiring_contracts(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    days: int = Query(30, description="Days until expiry"),
):
    """Get contracts expiring within N days"""
    tenant_id = str(current_user.tenant_id)

    today = datetime.now().strftime("%Y-%m-%d")
    future_date = (datetime.now() + timedelta(days=days)).strftime("%Y-%m-%d")

    query = select(Contract).where(
        Contract.tenant_id == tenant_id,
        Contract.end_date != None,
        Contract.end_date >= today,
        Contract.end_date <= future_date,
        Contract.status == ContractStatus.ACTIVE.value
    ).order_by(Contract.end_date)

    contracts = session.exec(query).all()

    # Enrich with employee info
    result = []
    for contract in contracts:
        contract_dict = contract.model_dump()

        employee = session.get(Employee, contract.employee_id)
        contract_dict["employee"] = {
            "id": employee.id,
            "employee_code": employee.employee_code,
            "full_name": employee.full_name,
            "department_id": employee.department_id
        } if employee else None

        # Calculate days until expiry
        if contract.end_date:
            end = datetime.strptime(contract.end_date, "%Y-%m-%d")
            contract_dict["days_until_expiry"] = (end - datetime.now()).days

        result.append(contract_dict)

    return result


@router.get("/stats")
def get_contract_stats(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get contract statistics"""
    tenant_id = str(current_user.tenant_id)

    # By status
    status_stats = {}
    for status in ContractStatus:
        count = session.exec(
            select(func.count()).where(
                Contract.tenant_id == tenant_id,
                Contract.status == status.value
            )
        ).one()
        status_stats[status.value.lower()] = count

    # By type (active only)
    type_stats = {}
    for ctype in ContractType:
        count = session.exec(
            select(func.count()).where(
                Contract.tenant_id == tenant_id,
                Contract.contract_type == ctype.value,
                Contract.status == ContractStatus.ACTIVE.value
            )
        ).one()
        type_stats[ctype.value.lower()] = count

    # Expiring within 30 days
    today = datetime.now().strftime("%Y-%m-%d")
    future_30 = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
    expiring_30 = session.exec(
        select(func.count()).where(
            Contract.tenant_id == tenant_id,
            Contract.end_date != None,
            Contract.end_date >= today,
            Contract.end_date <= future_30,
            Contract.status == ContractStatus.ACTIVE.value
        )
    ).one()

    return {
        "by_status": status_stats,
        "by_type": type_stats,
        "expiring_within_30_days": expiring_30,
        "total_active": status_stats.get("active", 0)
    }


@router.get("/{contract_id}")
def get_contract(
    contract_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get contract details"""
    tenant_id = str(current_user.tenant_id)

    contract = session.get(Contract, contract_id)
    if not contract:
        raise HTTPException(404, "Contract not found")
    if str(contract.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    contract_dict = contract.model_dump()

    # Employee info
    employee = session.get(Employee, contract.employee_id)
    contract_dict["employee"] = employee.model_dump() if employee else None

    # Previous contract
    if contract.previous_contract_id:
        prev = session.get(Contract, contract.previous_contract_id)
        contract_dict["previous_contract"] = {
            "id": prev.id,
            "contract_number": prev.contract_number,
            "contract_type": prev.contract_type,
            "start_date": prev.start_date,
            "end_date": prev.end_date
        } if prev else None

    # Get renewal chain (subsequent contracts)
    renewals = session.exec(
        select(Contract).where(
            Contract.previous_contract_id == contract_id
        ).order_by(Contract.start_date)
    ).all()
    contract_dict["renewals"] = [
        {
            "id": r.id,
            "contract_number": r.contract_number,
            "contract_type": r.contract_type,
            "start_date": r.start_date,
            "end_date": r.end_date,
            "status": r.status
        }
        for r in renewals
    ]

    return contract_dict


@router.post("")
def create_contract(
    payload: ContractCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create new contract"""
    if current_user.role not in ("ADMIN", "HR_MANAGER", "HR"):
        raise HTTPException(403, "Only ADMIN or HR can create contracts")

    tenant_id = str(current_user.tenant_id)

    # Verify employee exists
    employee = session.get(Employee, payload.employee_id)
    if not employee or str(employee.tenant_id) != tenant_id:
        raise HTTPException(400, "Invalid employee_id")

    # Auto-generate contract number if not provided
    contract_number = payload.contract_number
    if not contract_number:
        year = datetime.now().year
        # Get the count of contracts this year for numbering
        count = session.exec(
            select(func.count()).where(
                Contract.tenant_id == tenant_id,
                Contract.contract_number.like(f"HDLD-{year}-%")
            )
        ).one()
        contract_number = f"HDLD-{year}-{(count + 1):04d}"

    # Check if contract number already exists
    existing = session.exec(
        select(Contract).where(
            Contract.tenant_id == tenant_id,
            Contract.contract_number == contract_number
        )
    ).first()
    if existing:
        raise HTTPException(400, f"Contract number {contract_number} already exists")

    contract_data = payload.model_dump()
    contract_data["contract_number"] = contract_number

    contract = Contract(
        tenant_id=tenant_id,
        created_by=str(current_user.id),
        **contract_data
    )

    session.add(contract)
    session.commit()
    session.refresh(contract)

    return contract


@router.patch("/{contract_id}")
def update_contract(
    contract_id: str,
    payload: ContractUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update contract"""
    if current_user.role not in ("ADMIN", "HR_MANAGER", "HR"):
        raise HTTPException(403, "Only ADMIN or HR can update contracts")

    tenant_id = str(current_user.tenant_id)

    contract = session.get(Contract, contract_id)
    if not contract:
        raise HTTPException(404, "Contract not found")
    if str(contract.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(contract, key, value)

    session.add(contract)
    session.commit()
    session.refresh(contract)

    return contract


@router.post("/{contract_id}/activate")
def activate_contract(
    contract_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Activate a draft/pending contract"""
    if current_user.role not in ("ADMIN", "HR_MANAGER"):
        raise HTTPException(403, "Only ADMIN or HR_MANAGER can activate contracts")

    tenant_id = str(current_user.tenant_id)

    contract = session.get(Contract, contract_id)
    if not contract:
        raise HTTPException(404, "Contract not found")
    if str(contract.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    if contract.status not in (ContractStatus.DRAFT.value, ContractStatus.PENDING_SIGN.value):
        raise HTTPException(400, f"Cannot activate contract with status {contract.status}")

    # If there's a previous contract, mark it as RENEWED
    if contract.previous_contract_id:
        prev = session.get(Contract, contract.previous_contract_id)
        if prev and prev.status == ContractStatus.ACTIVE.value:
            prev.status = ContractStatus.RENEWED.value
            session.add(prev)

    contract.status = ContractStatus.ACTIVE.value
    session.add(contract)
    session.commit()
    session.refresh(contract)

    return contract


@router.post("/{contract_id}/terminate")
def terminate_contract(
    contract_id: str,
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Terminate a contract"""
    if current_user.role not in ("ADMIN", "HR_MANAGER"):
        raise HTTPException(403, "Only ADMIN or HR_MANAGER can terminate contracts")

    tenant_id = str(current_user.tenant_id)

    contract = session.get(Contract, contract_id)
    if not contract:
        raise HTTPException(404, "Contract not found")
    if str(contract.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    if contract.status != ContractStatus.ACTIVE.value:
        raise HTTPException(400, "Only active contracts can be terminated")

    contract.status = ContractStatus.TERMINATED.value
    contract.termination_date = payload.get("termination_date", datetime.now().strftime("%Y-%m-%d"))
    contract.termination_reason = payload.get("termination_reason")
    contract.termination_type = payload.get("termination_type", "MUTUAL_AGREEMENT")

    session.add(contract)
    session.commit()
    session.refresh(contract)

    return contract


@router.post("/{contract_id}/renew")
def renew_contract(
    contract_id: str,
    payload: ContractCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a renewal contract linked to the original"""
    if current_user.role not in ("ADMIN", "HR_MANAGER", "HR"):
        raise HTTPException(403, "Only ADMIN or HR can renew contracts")

    tenant_id = str(current_user.tenant_id)

    # Get original contract
    original = session.get(Contract, contract_id)
    if not original:
        raise HTTPException(404, "Original contract not found")
    if str(original.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    # Create new contract linked to original
    renewal = Contract(
        tenant_id=tenant_id,
        employee_id=original.employee_id,
        previous_contract_id=contract_id,
        created_by=str(current_user.id),
        **payload.model_dump(exclude={"employee_id", "previous_contract_id"})
    )

    session.add(renewal)
    session.commit()
    session.refresh(renewal)

    return renewal
