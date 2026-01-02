"""
HRM - Reports API Routes
Attendance, Payroll, Headcount, Turnover reports
"""
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select, func, and_, or_
from typing import Optional
from datetime import datetime, date
from calendar import monthrange

from app.db.session import get_session
from app.models import User
from app.models.hrm.employee import Employee, EmployeeStatus
from app.models.hrm.department import Department, Position
from app.models.hrm.attendance import AttendanceRecord, OvertimeRequest, AttendanceStatus
from app.models.hrm.payroll import PayrollRecord, PayrollPeriod
from app.core.security import get_current_user

router = APIRouter(prefix="/reports", tags=["HRM - Reports"])


# === Attendance Report ===

@router.get("/attendance")
def get_attendance_report(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    month: str = Query(..., description="Month in YYYY-MM format"),
    department_id: Optional[str] = Query(None),
):
    """Get attendance report for a month"""
    tenant_id = str(current_user.tenant_id)

    # Parse month
    year, month_num = map(int, month.split("-"))
    _, days_in_month = monthrange(year, month_num)
    start_date = f"{year}-{month_num:02d}-01"
    end_date = f"{year}-{month_num:02d}-{days_in_month}"

    # Get employees
    emp_query = select(Employee).where(
        Employee.tenant_id == tenant_id,
        Employee.status == EmployeeStatus.ACTIVE.value
    )
    if department_id:
        emp_query = emp_query.where(Employee.department_id == department_id)

    employees = session.exec(emp_query).all()

    result = []
    total_ot_hours = 0
    total_late = 0
    total_absent = 0

    for emp in employees:
        # Get attendance records for this employee
        att_query = select(AttendanceRecord).where(
            AttendanceRecord.tenant_id == tenant_id,
            AttendanceRecord.employee_id == emp.id,
            AttendanceRecord.date >= start_date,
            AttendanceRecord.date <= end_date
        )
        records = session.exec(att_query).all()

        # Calculate stats
        present_days = len([r for r in records if r.status in (
            AttendanceStatus.PRESENT.value,
            AttendanceStatus.LATE.value,
            AttendanceStatus.EARLY_LEAVE.value
        )])
        late_days = len([r for r in records if r.status == AttendanceStatus.LATE.value])
        absent_days = len([r for r in records if r.status == AttendanceStatus.ABSENT.value])
        leave_days = len([r for r in records if r.status == AttendanceStatus.ON_LEAVE.value])
        ot_hours = sum(r.overtime_hours for r in records)

        # Get department name
        dept = session.get(Department, emp.department_id) if emp.department_id else None

        # Calculate attendance rate (working days = 22 by default)
        working_days = 22  # Could be calculated based on actual working calendar
        attendance_rate = round((present_days / working_days) * 100, 1) if working_days > 0 else 0

        total_ot_hours += ot_hours
        total_late += late_days
        total_absent += absent_days

        result.append({
            "employee_id": emp.id,
            "employee_code": emp.employee_code,
            "employee_name": emp.full_name,
            "department": dept.name if dept else "-",
            "total_days": working_days,
            "present_days": present_days,
            "late_days": late_days,
            "absent_days": absent_days,
            "leave_days": leave_days,
            "ot_hours": ot_hours,
            "attendance_rate": attendance_rate,
        })

    # Calculate averages
    avg_attendance = round(
        sum(r["attendance_rate"] for r in result) / len(result), 1
    ) if result else 0

    return {
        "items": result,
        "summary": {
            "total_employees": len(result),
            "avg_attendance_rate": avg_attendance,
            "total_ot_hours": total_ot_hours,
            "total_late_count": total_late,
            "total_absent_count": total_absent,
        }
    }


# === Payroll Report ===

@router.get("/payroll")
def get_payroll_report(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    month: str = Query(..., description="Month in YYYY-MM format"),
    department_id: Optional[str] = Query(None),
):
    """Get payroll report for a month"""
    tenant_id = str(current_user.tenant_id)

    # Parse month
    year, month_num = map(int, month.split("-"))

    # Get payroll period first
    period = session.exec(
        select(PayrollPeriod).where(
            PayrollPeriod.tenant_id == tenant_id,
            PayrollPeriod.year == year,
            PayrollPeriod.month == month_num
        )
    ).first()

    if not period:
        return {
            "items": [],
            "summary": {
                "total_employees": 0,
                "total_gross": 0,
                "total_net": 0,
                "total_deductions": 0,
                "avg_salary": 0,
            }
        }

    # Get payroll records for this period
    payroll_records = session.exec(
        select(PayrollRecord).where(
            PayrollRecord.tenant_id == tenant_id,
            PayrollRecord.payroll_period_id == period.id
        )
    ).all()

    result = []
    total_gross = 0
    total_net = 0
    total_deductions = 0

    for pr in payroll_records:
        emp = session.get(Employee, pr.employee_id)
        if not emp:
            continue

        # Filter by department if specified
        if department_id and emp.department_id != department_id:
            continue

        dept = session.get(Department, emp.department_id) if emp.department_id else None
        pos = session.get(Position, emp.position_id) if emp.position_id else None

        gross = pr.gross_salary or 0
        insurance = pr.insurance_employee or 0
        tax = pr.tax_amount or 0
        deductions = pr.total_deductions or 0
        net = pr.net_salary or 0

        total_gross += gross
        total_net += net
        total_deductions += deductions

        result.append({
            "employee_id": emp.id,
            "employee_code": emp.employee_code,
            "employee_name": emp.full_name,
            "department": dept.name if dept else "-",
            "position": pos.name if pos else "-",
            "basic_salary": pr.basic_salary or 0,
            "allowances": pr.allowances_total or 0,
            "overtime": pr.overtime_total or 0,
            "gross_salary": gross,
            "insurance": insurance,
            "tax": tax,
            "deductions": deductions,
            "net_salary": net,
        })

    # Calculate average
    avg_salary = round(total_net / len(result), 0) if result else 0

    return {
        "items": result,
        "summary": {
            "total_employees": len(result),
            "total_gross": total_gross,
            "total_net": total_net,
            "total_deductions": total_deductions,
            "avg_salary": avg_salary,
        }
    }


# === Headcount Report ===

@router.get("/headcount")
def get_headcount_report(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get headcount report by department"""
    tenant_id = str(current_user.tenant_id)

    # Get all departments
    depts = session.exec(
        select(Department).where(Department.tenant_id == tenant_id)
    ).all()

    dept_result = []
    position_result = []

    total_headcount = 0
    total_active = 0
    total_probation = 0
    total_resigned = 0
    total_male = 0
    total_female = 0

    for dept in depts:
        # Get employees in this department
        employees = session.exec(
            select(Employee).where(
                Employee.tenant_id == tenant_id,
                Employee.department_id == dept.id
            )
        ).all()

        active = len([e for e in employees if e.status == EmployeeStatus.ACTIVE.value])
        probation = len([e for e in employees if e.status == EmployeeStatus.PROBATION.value])
        resigned = len([e for e in employees if e.status == EmployeeStatus.RESIGNED.value])
        male = len([e for e in employees if e.gender == "MALE"])
        female = len([e for e in employees if e.gender == "FEMALE"])
        total = active + probation

        total_headcount += total
        total_active += active
        total_probation += probation
        total_resigned += resigned
        total_male += male
        total_female += female

        dept_result.append({
            "department": dept.name,
            "total": total,
            "active": active,
            "probation": probation,
            "resigned": resigned,
            "male": male,
            "female": female,
        })

        # Get positions in this department
        position_counts = {}
        for emp in employees:
            if emp.status in (EmployeeStatus.ACTIVE.value, EmployeeStatus.PROBATION.value):
                # Get position name from Position model
                pos_name = "Chưa xác định"
                if emp.position_id:
                    pos_obj = session.get(Position, emp.position_id)
                    if pos_obj:
                        pos_name = pos_obj.name
                if pos_name not in position_counts:
                    position_counts[pos_name] = 0
                position_counts[pos_name] += 1

        for pos, count in position_counts.items():
            position_result.append({
                "position": pos,
                "department": dept.name,
                "count": count,
            })

    return {
        "by_department": dept_result,
        "by_position": position_result,
        "summary": {
            "total_headcount": total_headcount,
            "total_active": total_active,
            "total_probation": total_probation,
            "total_resigned": total_resigned,
            "total_male": total_male,
            "total_female": total_female,
        }
    }


# === Turnover Report ===

@router.get("/turnover")
def get_turnover_report(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    year: int = Query(..., description="Year"),
):
    """Get turnover report for a year"""
    tenant_id = str(current_user.tenant_id)

    monthly_data = []
    dept_data = []
    reason_data = []

    # Monthly turnover
    for month in range(1, 13):
        start_date = f"{year}-{month:02d}-01"
        _, days = monthrange(year, month)
        end_date = f"{year}-{month:02d}-{days}"

        # Count hired (joined this month)
        hired = session.exec(
            select(func.count(Employee.id)).where(
                Employee.tenant_id == tenant_id,
                Employee.join_date >= start_date,
                Employee.join_date <= end_date
            )
        ).one()

        # Count resigned (left this month)
        resigned = session.exec(
            select(func.count(Employee.id)).where(
                Employee.tenant_id == tenant_id,
                Employee.status == EmployeeStatus.RESIGNED.value,
                Employee.updated_at >= start_date,
                Employee.updated_at <= end_date
            )
        ).one()

        # Headcount at start (active before this month)
        headcount_start = session.exec(
            select(func.count(Employee.id)).where(
                Employee.tenant_id == tenant_id,
                or_(
                    Employee.status == EmployeeStatus.ACTIVE.value,
                    Employee.status == EmployeeStatus.PROBATION.value
                ),
                Employee.join_date < start_date
            )
        ).one()

        headcount_end = headcount_start + hired - resigned
        avg_headcount = (headcount_start + headcount_end) / 2 if (headcount_start + headcount_end) > 0 else 1
        turnover_rate = round((resigned / avg_headcount) * 100, 1) if avg_headcount > 0 else 0

        monthly_data.append({
            "month": f"{month:02d}/{year}",
            "hired": hired,
            "resigned": resigned,
            "headcount_start": headcount_start,
            "headcount_end": headcount_end,
            "turnover_rate": turnover_rate,
        })

    # Department turnover
    depts = session.exec(
        select(Department).where(Department.tenant_id == tenant_id)
    ).all()

    for dept in depts:
        # Count current employees
        current = session.exec(
            select(func.count(Employee.id)).where(
                Employee.tenant_id == tenant_id,
                Employee.department_id == dept.id,
                or_(
                    Employee.status == EmployeeStatus.ACTIVE.value,
                    Employee.status == EmployeeStatus.PROBATION.value
                )
            )
        ).one()

        # Count hired this year
        hired = session.exec(
            select(func.count(Employee.id)).where(
                Employee.tenant_id == tenant_id,
                Employee.department_id == dept.id,
                Employee.join_date >= f"{year}-01-01",
                Employee.join_date <= f"{year}-12-31"
            )
        ).one()

        # Count resigned this year
        resigned = session.exec(
            select(func.count(Employee.id)).where(
                Employee.tenant_id == tenant_id,
                Employee.department_id == dept.id,
                Employee.status == EmployeeStatus.RESIGNED.value,
            )
        ).one()

        turnover_rate = round((resigned / current) * 100, 1) if current > 0 else 0

        dept_data.append({
            "department": dept.name,
            "hired": hired,
            "resigned": resigned,
            "current": current,
            "turnover_rate": turnover_rate,
        })

    # Resign reasons (from employee notes or a separate field)
    # For now, return static categories that could be tracked
    reasons = [
        {"reason": "Chế độ lương thưởng", "count": 0, "percentage": 0},
        {"reason": "Cơ hội thăng tiến", "count": 0, "percentage": 0},
        {"reason": "Lý do cá nhân", "count": 0, "percentage": 0},
        {"reason": "Điều kiện làm việc", "count": 0, "percentage": 0},
        {"reason": "Quan hệ đồng nghiệp", "count": 0, "percentage": 0},
        {"reason": "Chuyển ngành nghề", "count": 0, "percentage": 0},
        {"reason": "Khác", "count": 0, "percentage": 0},
    ]

    # Calculate totals
    total_hired = sum(m["hired"] for m in monthly_data)
    total_resigned = sum(m["resigned"] for m in monthly_data)
    avg_turnover = round(
        sum(m["turnover_rate"] for m in monthly_data) / 12, 1
    ) if monthly_data else 0

    return {
        "monthly": monthly_data,
        "by_department": dept_data,
        "resign_reasons": reasons,
        "summary": {
            "total_hired": total_hired,
            "total_resigned": total_resigned,
            "net_change": total_hired - total_resigned,
            "avg_turnover_rate": avg_turnover,
        }
    }
