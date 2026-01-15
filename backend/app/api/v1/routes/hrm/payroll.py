"""
HRM - Payroll API Routes
Salary structures, payroll periods, payroll calculation
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from typing import Optional
from pydantic import BaseModel
from datetime import datetime
import json

from app.db.session import get_session
from app.models import User
from app.models.hrm.payroll import (
    SalaryStructure, SalaryComponent, EmployeeSalary,
    PayrollPeriod, PayrollRecord, PayrollItem, Deduction
)
from app.models.hrm.employee import Employee
from app.models.hrm.contract import Contract, ContractStatus
from app.core.security import get_current_user

router = APIRouter(prefix="/payroll", tags=["HRM - Payroll"])


# === Schemas ===

class SalaryStructureCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    employee_type: Optional[str] = None


class SalaryComponentCreate(BaseModel):
    structure_id: str
    code: str
    name: str
    component_type: str  # EARNING / DEDUCTION
    calculation_type: str = "FIXED"  # FIXED, PERCENTAGE, FORMULA
    default_amount: float = 0
    percentage_of: Optional[str] = None
    formula: Optional[str] = None
    is_taxable: bool = True
    is_part_of_basic: bool = False
    sort_order: int = 0


class PayrollPeriodCreate(BaseModel):
    name: str
    month: int
    year: int
    start_date: str
    end_date: str
    payment_date: Optional[str] = None


class EmployeeSalaryCreate(BaseModel):
    employee_id: str
    structure_id: str
    basic_salary: float
    effective_from: str
    effective_to: Optional[str] = None
    component_overrides_json: Optional[str] = None  # JSON override for component amounts
    notes: Optional[str] = None


# === Salary Structures ===

@router.get("/structures")
def list_structures(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    include_inactive: bool = Query(False),
):
    """List all salary structures"""
    tenant_id = str(current_user.tenant_id)

    query = select(SalaryStructure).where(SalaryStructure.tenant_id == tenant_id)
    if not include_inactive:
        query = query.where(SalaryStructure.is_active == True)

    structures = session.exec(query.order_by(SalaryStructure.name)).all()

    result = []
    for struct in structures:
        struct_dict = struct.model_dump()

        # Get components
        components = session.exec(
            select(SalaryComponent).where(
                SalaryComponent.structure_id == struct.id
            ).order_by(SalaryComponent.sort_order)
        ).all()
        struct_dict["components"] = [c.model_dump() for c in components]

        result.append(struct_dict)

    return result


@router.post("/structures")
def create_structure(
    payload: SalaryStructureCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create salary structure"""
    if current_user.role not in ("ADMIN", "HR_MANAGER"):
        raise HTTPException(403, "Only ADMIN or HR_MANAGER can create structures")

    tenant_id = str(current_user.tenant_id)

    existing = session.exec(
        select(SalaryStructure).where(
            SalaryStructure.tenant_id == tenant_id,
            SalaryStructure.code == payload.code
        )
    ).first()
    if existing:
        raise HTTPException(400, f"Structure code {payload.code} already exists")

    structure = SalaryStructure(
        tenant_id=tenant_id,
        **payload.model_dump()
    )

    session.add(structure)
    session.commit()
    session.refresh(structure)

    return structure


@router.post("/structures/{structure_id}/components")
def add_component(
    structure_id: str,
    payload: SalaryComponentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Add component to structure"""
    if current_user.role not in ("ADMIN", "HR_MANAGER"):
        raise HTTPException(403, "Only ADMIN or HR_MANAGER can manage structures")

    tenant_id = str(current_user.tenant_id)

    structure = session.get(SalaryStructure, structure_id)
    if not structure or str(structure.tenant_id) != tenant_id:
        raise HTTPException(404, "Structure not found")

    component = SalaryComponent(
        tenant_id=tenant_id,
        **payload.model_dump()
    )

    session.add(component)
    session.commit()
    session.refresh(component)

    return component


# === Employee Salary ===

@router.get("/employee-salary")
def list_employee_salaries(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    employee_id: Optional[str] = Query(None),
    active_only: bool = Query(True),
):
    """List employee salary records"""
    tenant_id = str(current_user.tenant_id)

    query = select(EmployeeSalary).where(EmployeeSalary.tenant_id == tenant_id)

    if employee_id:
        query = query.where(EmployeeSalary.employee_id == employee_id)

    if active_only:
        query = query.where(EmployeeSalary.is_active == True)

    salaries = session.exec(query.order_by(EmployeeSalary.effective_from.desc())).all()

    result = []
    for sal in salaries:
        sal_dict = sal.model_dump()

        employee = session.get(Employee, sal.employee_id)
        sal_dict["employee"] = {
            "id": employee.id,
            "employee_code": employee.employee_code,
            "full_name": employee.full_name
        } if employee else None

        structure = session.get(SalaryStructure, sal.structure_id)
        sal_dict["structure_name"] = structure.name if structure else None

        result.append(sal_dict)

    return result


@router.post("/employee-salary")
def create_employee_salary(
    payload: EmployeeSalaryCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create employee salary record"""
    if current_user.role not in ("ADMIN", "HR_MANAGER"):
        raise HTTPException(403, "Only ADMIN or HR_MANAGER can manage salaries")

    tenant_id = str(current_user.tenant_id)

    # Validate employee and structure
    employee = session.get(Employee, payload.employee_id)
    if not employee or str(employee.tenant_id) != tenant_id:
        raise HTTPException(400, "Invalid employee_id")

    structure = session.get(SalaryStructure, payload.structure_id)
    if not structure or str(structure.tenant_id) != tenant_id:
        raise HTTPException(400, "Invalid structure_id")

    # Deactivate previous salary if exists
    prev = session.exec(
        select(EmployeeSalary).where(
            EmployeeSalary.employee_id == payload.employee_id,
            EmployeeSalary.is_active == True
        )
    ).first()

    if prev:
        prev.is_active = False
        prev.effective_to = payload.effective_from
        session.add(prev)

    salary = EmployeeSalary(
        tenant_id=tenant_id,
        **payload.model_dump()
    )

    session.add(salary)
    session.commit()
    session.refresh(salary)

    return salary


# === Payroll Periods ===

@router.get("/periods")
def list_periods(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    year: Optional[int] = Query(None),
):
    """List payroll periods"""
    tenant_id = str(current_user.tenant_id)

    query = select(PayrollPeriod).where(PayrollPeriod.tenant_id == tenant_id)

    if year:
        query = query.where(PayrollPeriod.year == year)

    periods = session.exec(
        query.order_by(PayrollPeriod.year.desc(), PayrollPeriod.month.desc())
    ).all()

    # Enrich with stats
    result = []
    for period in periods:
        period_dict = period.model_dump()

        # Count records
        record_count = session.exec(
            select(func.count()).where(PayrollRecord.period_id == period.id)
        ).one()
        period_dict["record_count"] = record_count

        # Total net salary
        total_net = session.exec(
            select(func.sum(PayrollRecord.net_salary)).where(
                PayrollRecord.period_id == period.id
            )
        ).one() or 0
        period_dict["total_net_salary"] = total_net

        result.append(period_dict)

    return result


@router.post("/periods")
def create_period(
    payload: PayrollPeriodCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create payroll period"""
    if current_user.role not in ("ADMIN", "HR_MANAGER", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN, HR_MANAGER or DISPATCHER can create periods")

    tenant_id = str(current_user.tenant_id)

    # Check if period exists
    existing = session.exec(
        select(PayrollPeriod).where(
            PayrollPeriod.tenant_id == tenant_id,
            PayrollPeriod.month == payload.month,
            PayrollPeriod.year == payload.year
        )
    ).first()
    if existing:
        raise HTTPException(400, f"Period {payload.month}/{payload.year} already exists")

    # Auto-generate code from year and month
    code = f"{payload.year}-{payload.month:02d}"

    period = PayrollPeriod(
        tenant_id=tenant_id,
        code=code,
        **payload.model_dump()
    )

    session.add(period)
    session.commit()
    session.refresh(period)

    return period


@router.post("/periods/{period_id}/calculate")
def calculate_payroll(
    period_id: str,
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Calculate payroll for a period"""
    if current_user.role not in ("ADMIN", "HR_MANAGER"):
        raise HTTPException(403, "Only ADMIN or HR_MANAGER can calculate payroll")

    tenant_id = str(current_user.tenant_id)

    period = session.get(PayrollPeriod, period_id)
    if not period or str(period.tenant_id) != tenant_id:
        raise HTTPException(404, "Period not found")

    if period.status == "CLOSED":
        raise HTTPException(400, "Period is closed")

    employee_ids = payload.get("employee_ids")  # Optional - if not provided, do all

    # Get active employees
    emp_query = select(Employee).where(
        Employee.tenant_id == tenant_id,
        Employee.status == "ACTIVE"
    )
    if employee_ids:
        emp_query = emp_query.where(Employee.id.in_(employee_ids))

    employees = session.exec(emp_query).all()

    created = 0
    errors = []

    for emp in employees:
        try:
            # Check if record already exists
            existing = session.exec(
                select(PayrollRecord).where(
                    PayrollRecord.period_id == period_id,
                    PayrollRecord.employee_id == emp.id
                )
            ).first()

            if existing:
                continue

            # Get employee's salary structure
            emp_salary = session.exec(
                select(EmployeeSalary).where(
                    EmployeeSalary.employee_id == emp.id,
                    EmployeeSalary.is_active == True
                )
            ).first()

            if not emp_salary:
                errors.append(f"{emp.employee_code}: No salary structure found")
                continue

            # Get contract for insurance calculation
            contract = session.exec(
                select(Contract).where(
                    Contract.employee_id == emp.id,
                    Contract.status == ContractStatus.ACTIVE.value
                )
            ).first()

            # Calculate salary
            basic = emp_salary.basic_salary
            allowances = 0
            deductions = 0

            # Get components from structure
            components = session.exec(
                select(SalaryComponent).where(
                    SalaryComponent.structure_id == emp_salary.structure_id,
                    SalaryComponent.is_active == True
                )
            ).all()

            # Parse overrides
            overrides = {}
            if emp_salary.component_overrides_json:
                overrides = json.loads(emp_salary.component_overrides_json)

            payroll_items = []

            for comp in components:
                amount = overrides.get(comp.code, comp.default_amount)

                if comp.calculation_type == "PERCENTAGE" and comp.percentage_of:
                    if comp.percentage_of == "BASIC":
                        amount = basic * (comp.default_amount / 100)

                if comp.component_type == "EARNING":
                    allowances += amount
                else:
                    deductions += amount

                payroll_items.append({
                    "component_id": comp.id,
                    "component_code": comp.code,
                    "component_name": comp.name,
                    "amount": amount,
                    "is_taxable": comp.is_taxable
                })

            # Insurance calculation (simplified)
            insurance_salary = contract.insurance_salary if contract else basic
            social_insurance = insurance_salary * 0.08  # 8% BHXH
            health_insurance = insurance_salary * 0.015  # 1.5% BHYT
            unemployment_insurance = insurance_salary * 0.01  # 1% BHTN
            total_insurance = social_insurance + health_insurance + unemployment_insurance

            # Gross salary
            gross = basic + allowances

            # Taxable income (simplified)
            taxable_income = gross - total_insurance - 11000000  # Personal deduction
            # TODO: Add dependent deductions

            # Income tax calculation (simplified progressive tax)
            income_tax = 0
            if taxable_income > 0:
                if taxable_income <= 5000000:
                    income_tax = taxable_income * 0.05
                elif taxable_income <= 10000000:
                    income_tax = 250000 + (taxable_income - 5000000) * 0.1
                elif taxable_income <= 18000000:
                    income_tax = 750000 + (taxable_income - 10000000) * 0.15
                elif taxable_income <= 32000000:
                    income_tax = 1950000 + (taxable_income - 18000000) * 0.2
                elif taxable_income <= 52000000:
                    income_tax = 4750000 + (taxable_income - 32000000) * 0.25
                elif taxable_income <= 80000000:
                    income_tax = 9750000 + (taxable_income - 52000000) * 0.3
                else:
                    income_tax = 18150000 + (taxable_income - 80000000) * 0.35

            # Get advance deductions
            advance_deduction = 0
            deduction_records = session.exec(
                select(Deduction).where(
                    Deduction.employee_id == emp.id,
                    Deduction.period_id == period_id,
                    Deduction.is_processed == False
                )
            ).all()

            for ded in deduction_records:
                advance_deduction += ded.amount
                ded.is_processed = True
                session.add(ded)

            # Net salary
            net = gross - total_insurance - income_tax - deductions - advance_deduction

            # Create payroll record
            record = PayrollRecord(
                tenant_id=tenant_id,
                period_id=period_id,
                employee_id=emp.id,
                salary_structure_id=emp_salary.structure_id,
                basic_salary=basic,
                total_allowances=allowances,
                gross_salary=gross,
                total_deductions=deductions,
                social_insurance=social_insurance,
                health_insurance=health_insurance,
                unemployment_insurance=unemployment_insurance,
                income_tax=income_tax,
                other_deductions=advance_deduction,
                net_salary=net,
                work_days=22,  # TODO: Calculate from attendance
                ot_hours=0,  # TODO: Calculate from overtime
                items_json=json.dumps(payroll_items)
            )

            session.add(record)
            created += 1

        except Exception as e:
            errors.append(f"{emp.employee_code}: {str(e)}")

    # Update period status
    period.status = "CALCULATED"
    session.add(period)

    session.commit()

    return {
        "message": f"Calculated payroll for {created} employees",
        "created": created,
        "errors": errors
    }


@router.get("/periods/{period_id}/records")
def get_period_records(
    period_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get payroll records for a period"""
    tenant_id = str(current_user.tenant_id)

    period = session.get(PayrollPeriod, period_id)
    if not period or str(period.tenant_id) != tenant_id:
        raise HTTPException(404, "Period not found")

    records = session.exec(
        select(PayrollRecord).where(PayrollRecord.period_id == period_id)
    ).all()

    result = []
    for rec in records:
        rec_dict = rec.model_dump()

        employee = session.get(Employee, rec.employee_id)
        rec_dict["employee"] = {
            "id": employee.id,
            "employee_code": employee.employee_code,
            "full_name": employee.full_name,
            "department_id": employee.department_id
        } if employee else None

        result.append(rec_dict)

    return result


@router.post("/periods/{period_id}/close")
def close_period(
    period_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Close payroll period"""
    if current_user.role not in ("ADMIN",):
        raise HTTPException(403, "Only ADMIN can close periods")

    tenant_id = str(current_user.tenant_id)

    period = session.get(PayrollPeriod, period_id)
    if not period or str(period.tenant_id) != tenant_id:
        raise HTTPException(404, "Period not found")

    if period.status == "CLOSED":
        raise HTTPException(400, "Period is already closed")

    period.status = "CLOSED"
    session.add(period)
    session.commit()
    session.refresh(period)

    return period


# === Employee Payslip ===

@router.get("/my-payslips")
def get_my_payslips(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    year: Optional[int] = Query(None),
):
    """Get current user's payslips"""
    employee = session.exec(
        select(Employee).where(Employee.user_id == str(current_user.id))
    ).first()

    if not employee:
        raise HTTPException(404, "Employee record not found")

    query = select(PayrollRecord).where(PayrollRecord.employee_id == employee.id)

    if year:
        periods = session.exec(
            select(PayrollPeriod.id).where(PayrollPeriod.year == year)
        ).all()
        query = query.where(PayrollRecord.period_id.in_(periods))

    records = session.exec(query.order_by(PayrollRecord.created_at.desc())).all()

    result = []
    for rec in records:
        rec_dict = rec.model_dump()

        period = session.get(PayrollPeriod, rec.period_id)
        rec_dict["period"] = {
            "name": period.name,
            "month": period.month,
            "year": period.year
        } if period else None

        result.append(rec_dict)

    return result
