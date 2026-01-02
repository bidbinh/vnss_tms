"""
HRM Seed Data API
Creates sample data for testing
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from calendar import monthrange

from app.db.session import get_session
from app.models import User
from app.models.hrm.department import Branch, Department, Team, Position
from app.models.hrm.employee import Employee, EmployeeStatus
from app.models.hrm.contract import Contract
from app.models.hrm.advance import AdvanceRequest
from app.models.hrm.leave import LeaveType, LeaveBalance, LeaveRequest
from app.models.hrm.attendance import AttendanceRecord, OvertimeRequest, WorkShift, AttendanceStatus, OvertimeStatus
from app.models.hrm.payroll import PayrollPeriod, PayrollRecord, SalaryStructure, SalaryComponent, EmployeeSalary
from app.models.hrm.training import Training, TrainingParticipant
from app.core.security import get_current_user
from datetime import datetime, timedelta
import random
import json

router = APIRouter(prefix="/seed", tags=["HRM - Seed Data"])


@router.post("")
def seed_hrm_data(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create sample HRM data"""
    if current_user.role not in ("ADMIN",):
        raise HTTPException(403, "Only ADMIN can seed data")

    tenant_id = str(current_user.tenant_id)

    # Check if seed data already exists
    existing_branch = session.exec(
        select(Branch).where(
            Branch.tenant_id == tenant_id,
            Branch.code == "HCM"
        )
    ).first()

    if existing_branch:
        raise HTTPException(400, "Dữ liệu mẫu đã được tạo (chi nhánh HCM đã tồn tại). Vui lòng xóa dữ liệu cũ trước.")

    existing_dept = session.exec(
        select(Department).where(
            Department.tenant_id == tenant_id,
            Department.code == "BOD"
        )
    ).first()

    if existing_dept:
        raise HTTPException(400, "Dữ liệu mẫu đã được tạo (phòng ban BOD đã tồn tại). Vui lòng xóa dữ liệu cũ trước.")

    try:
        # ===== 1. CREATE BRANCHES =====
        branch_hcm = Branch(
            tenant_id=tenant_id,
            code="HCM",
            name="Chi nhánh Hồ Chí Minh",
            address="123 Nguyễn Văn Linh, Quận 7",
            city="Hồ Chí Minh",
            province="Hồ Chí Minh",
            phone="028-1234-5678",
            email="hcm@vnss.com.vn",
            is_headquarters=True,
            is_active=True
        )
        session.add(branch_hcm)

        branch_hn = Branch(
            tenant_id=tenant_id,
            code="HN",
            name="Chi nhánh Hà Nội",
            address="456 Phạm Hùng, Cầu Giấy",
            city="Hà Nội",
            province="Hà Nội",
            phone="024-8765-4321",
            email="hn@vnss.com.vn",
            is_headquarters=False,
            is_active=True
        )
        session.add(branch_hn)
        session.commit()
        session.refresh(branch_hcm)
        session.refresh(branch_hn)

        # ===== 2. CREATE POSITIONS =====
        positions_data = [
            {"code": "CEO", "name": "Giám đốc điều hành", "level": 6},
            {"code": "BM", "name": "Trưởng chi nhánh", "level": 5},
            {"code": "DH", "name": "Trưởng phòng", "level": 4},
            {"code": "TL", "name": "Team Leader", "level": 3},
            {"code": "SE", "name": "Chuyên viên", "level": 2},
            {"code": "ST", "name": "Nhân viên", "level": 1},
            {"code": "DRV", "name": "Tài xế", "level": 1},
        ]

        positions = {}
        for p_data in positions_data:
            pos = Position(
                tenant_id=tenant_id,
                code=p_data["code"],
                name=p_data["name"],
                level=p_data["level"],
                is_active=True
            )
            session.add(pos)
            session.commit()
            session.refresh(pos)
            positions[p_data["code"]] = pos

        # ===== 3. CREATE DEPARTMENTS =====
        departments_data = [
            {"code": "BOD", "name": "Ban giám đốc", "branch": branch_hcm},
            {"code": "KD-HCM", "name": "Phòng Kinh doanh HCM", "branch": branch_hcm},
            {"code": "KT-HCM", "name": "Phòng Kế toán HCM", "branch": branch_hcm},
            {"code": "NS-HCM", "name": "Phòng Nhân sự HCM", "branch": branch_hcm},
            {"code": "IT", "name": "Phòng IT", "branch": branch_hcm},
            {"code": "VT-HCM", "name": "Phòng Vận tải HCM", "branch": branch_hcm},
            {"code": "KD-HN", "name": "Phòng Kinh doanh HN", "branch": branch_hn},
            {"code": "VT-HN", "name": "Phòng Vận tải HN", "branch": branch_hn},
        ]

        departments = {}
        for d_data in departments_data:
            dept = Department(
                tenant_id=tenant_id,
                code=d_data["code"],
                name=d_data["name"],
                branch_id=d_data["branch"].id,
                is_active=True
            )
            session.add(dept)
            session.commit()
            session.refresh(dept)
            departments[d_data["code"]] = dept

        # ===== 4. CREATE TEAMS =====
        teams_data = [
            {"code": "KD-HCM-1", "name": "Nhóm KD Miền Nam", "dept": departments["KD-HCM"]},
            {"code": "KD-HCM-2", "name": "Nhóm KD Miền Trung", "dept": departments["KD-HCM"]},
            {"code": "KD-HN-1", "name": "Nhóm KD Miền Bắc", "dept": departments["KD-HN"]},
        ]

        teams = {}
        for t_data in teams_data:
            team = Team(
                tenant_id=tenant_id,
                code=t_data["code"],
                name=t_data["name"],
                department_id=t_data["dept"].id,
                is_active=True
            )
            session.add(team)
            session.commit()
            session.refresh(team)
            teams[t_data["code"]] = team

        # ===== 5. CREATE EMPLOYEES =====
        employees = {}
        employee_counter = [1]

        def create_employee(code, name, position_code, dept_code, branch, team_code=None, employee_type="FULL_TIME"):
            emp = Employee(
                tenant_id=tenant_id,
                employee_code=code,
                full_name=name,
                position_id=positions[position_code].id,
                department_id=departments[dept_code].id if dept_code else None,
                branch_id=branch.id,
                team_id=teams[team_code].id if team_code else None,
                employee_type=employee_type,
                status="ACTIVE",
                join_date="2020-01-01",
                phone=f"09{employee_counter[0]:08d}",
                email=f"{code.lower()}@vnss.com.vn",
            )
            session.add(emp)
            session.commit()
            session.refresh(emp)
            employees[code] = emp
            employee_counter[0] += 1
            return emp

        # CEO
        ceo = create_employee("GD001", "Nguyễn Văn Minh", "CEO", "BOD", branch_hcm)

        # Branch Managers
        bm_hcm = create_employee("QL001", "Trần Thị Hương", "BM", "BOD", branch_hcm)
        bm_hn = create_employee("QL002", "Lê Văn Đức", "BM", "BOD", branch_hn)

        bm_hcm.manager_id = ceo.id
        bm_hn.manager_id = ceo.id
        session.add(bm_hcm)
        session.add(bm_hn)

        branch_hcm.manager_id = bm_hcm.id
        branch_hn.manager_id = bm_hn.id
        session.add(branch_hcm)
        session.add(branch_hn)
        session.commit()

        # Department Heads HCM
        dept_heads = [
            ("TP001", "Phạm Văn Tài", "DH", "KD-HCM", branch_hcm, bm_hcm),
            ("TP002", "Ngô Thị Lan", "DH", "KT-HCM", branch_hcm, bm_hcm),
            ("TP003", "Hoàng Văn Nam", "DH", "NS-HCM", branch_hcm, bm_hcm),
            ("TP004", "Vũ Minh Tuấn", "DH", "IT", branch_hcm, bm_hcm),
            ("TP005", "Đỗ Văn Hùng", "DH", "VT-HCM", branch_hcm, bm_hcm),
        ]

        for code, name, pos, dept, branch, manager in dept_heads:
            emp = create_employee(code, name, pos, dept, branch)
            emp.manager_id = manager.id
            session.add(emp)
            departments[dept].manager_id = emp.id
            session.add(departments[dept])
        session.commit()

        # Department Heads HN
        hn_heads = [
            ("TP006", "Bùi Thị Mai", "DH", "KD-HN", branch_hn, bm_hn),
            ("TP007", "Đinh Văn Long", "DH", "VT-HN", branch_hn, bm_hn),
        ]

        for code, name, pos, dept, branch, manager in hn_heads:
            emp = create_employee(code, name, pos, dept, branch)
            emp.manager_id = manager.id
            session.add(emp)
            departments[dept].manager_id = emp.id
            session.add(departments[dept])
        session.commit()

        # Team Leaders
        team_leaders = [
            ("TL001", "Lý Văn Hòa", "TL", "KD-HCM", branch_hcm, "KD-HCM-1", employees["TP001"]),
            ("TL002", "Trịnh Thị Ngọc", "TL", "KD-HCM", branch_hcm, "KD-HCM-2", employees["TP001"]),
            ("TL003", "Cao Văn Phúc", "TL", "KD-HN", branch_hn, "KD-HN-1", employees["TP006"]),
        ]

        for code, name, pos, dept, branch, team, manager in team_leaders:
            emp = create_employee(code, name, pos, dept, branch, team)
            emp.manager_id = manager.id
            session.add(emp)
            teams[team].leader_id = emp.id
            session.add(teams[team])
        session.commit()

        # Staff members
        # Sales HCM - Team 1
        sales_hcm_1 = [
            ("NV001", "Nguyễn Thị Ánh"),
            ("NV002", "Trần Văn Bình"),
            ("NV003", "Lê Thị Cúc"),
            ("NV004", "Phạm Văn Dũng"),
            ("NV005", "Hoàng Thị Em"),
        ]
        for code, name in sales_hcm_1:
            emp = create_employee(code, name, "ST", "KD-HCM", branch_hcm, "KD-HCM-1")
            emp.manager_id = employees["TL001"].id
            session.add(emp)

        # Sales HCM - Team 2
        sales_hcm_2 = [
            ("NV006", "Vũ Văn Phương"),
            ("NV007", "Đỗ Thị Giang"),
            ("NV008", "Bùi Văn Hải"),
            ("NV009", "Đinh Thị Oanh"),
        ]
        for code, name in sales_hcm_2:
            emp = create_employee(code, name, "ST", "KD-HCM", branch_hcm, "KD-HCM-2")
            emp.manager_id = employees["TL002"].id
            session.add(emp)

        # Accounting HCM
        accounting = [
            ("KT001", "Nguyễn Thị Kim"),
            ("KT002", "Trần Văn Lâm"),
            ("KT003", "Lê Thị Mỹ"),
            ("KT004", "Phạm Văn Nghĩa"),
        ]
        for code, name in accounting:
            emp = create_employee(code, name, "ST", "KT-HCM", branch_hcm)
            emp.manager_id = employees["TP002"].id
            session.add(emp)

        # HR HCM
        hr = [
            ("NS001", "Hoàng Thị Phương"),
            ("NS002", "Vũ Văn Quang"),
            ("NS003", "Đỗ Thị Như"),
        ]
        for code, name in hr:
            emp = create_employee(code, name, "ST", "NS-HCM", branch_hcm)
            emp.manager_id = employees["TP003"].id
            session.add(emp)

        # IT
        it_staff = [
            ("IT001", "Bùi Văn Sơn"),
            ("IT002", "Đinh Thị Thảo"),
            ("IT003", "Ngô Văn Uy"),
            ("IT004", "Lý Thị Vân"),
        ]
        for code, name in it_staff:
            emp = create_employee(code, name, "SE", "IT", branch_hcm)
            emp.manager_id = employees["TP004"].id
            session.add(emp)

        # Transport HCM - Drivers
        drivers_hcm = [
            ("TX001", "Nguyễn Văn An"),
            ("TX002", "Trần Văn Bền"),
            ("TX003", "Lê Văn Công"),
            ("TX004", "Phạm Văn Đạt"),
            ("TX005", "Hoàng Văn Giang"),
            ("TX006", "Vũ Văn Hà"),
            ("TX007", "Đỗ Văn Khánh"),
            ("TX008", "Bùi Văn Lộc"),
        ]
        for code, name in drivers_hcm:
            emp = create_employee(code, name, "DRV", "VT-HCM", branch_hcm, employee_type="DRIVER")
            emp.manager_id = employees["TP005"].id
            session.add(emp)

        # Sales HN
        sales_hn = [
            ("NV010", "Nguyễn Thị Linh"),
            ("NV011", "Trần Văn Minh"),
            ("NV012", "Lê Thị Oanh"),
            ("NV013", "Phạm Văn Phong"),
        ]
        for code, name in sales_hn:
            emp = create_employee(code, name, "ST", "KD-HN", branch_hn, "KD-HN-1")
            emp.manager_id = employees["TL003"].id
            session.add(emp)

        # Transport HN - Drivers
        drivers_hn = [
            ("TX009", "Hoàng Văn Quân"),
            ("TX010", "Vũ Văn Rồng"),
            ("TX011", "Đỗ Văn Sáng"),
            ("TX012", "Bùi Văn Thành"),
            ("TX013", "Đinh Văn Vinh"),
            ("TX014", "Ngô Văn Xuân"),
        ]
        for code, name in drivers_hn:
            emp = create_employee(code, name, "DRV", "VT-HN", branch_hn, employee_type="DRIVER")
            emp.manager_id = employees["TP007"].id
            session.add(emp)

        session.commit()

        # ===== 6. CREATE CONTRACTS =====
        contracts_created = 0
        contract_types = ["PROBATION", "DEFINITE_1Y", "DEFINITE_2Y", "INDEFINITE"]
        contract_counter = 1

        for emp_code, emp in employees.items():
            # Create 1-2 contracts per employee
            num_contracts = random.randint(1, 2)
            prev_contract_id = None

            for i in range(num_contracts):
                if i == 0:
                    # First contract - probation
                    c_type = "PROBATION"
                    start_date = datetime(2020, 1, 1) + timedelta(days=random.randint(0, 365))
                    end_date = start_date + timedelta(days=60)
                    status = "RENEWED" if num_contracts > 1 else "ACTIVE"
                    basic_salary = random.randint(8, 25) * 1000000
                else:
                    # Follow-up contract
                    c_type = random.choice(["DEFINITE_1Y", "DEFINITE_2Y", "INDEFINITE"])
                    start_date = end_date + timedelta(days=1)
                    end_date = start_date + timedelta(days=365 if c_type == "DEFINITE_1Y" else 730) if c_type != "INDEFINITE" else None
                    status = "ACTIVE"
                    basic_salary = int(basic_salary * 1.15)  # 15% increase

                contract = Contract(
                    tenant_id=tenant_id,
                    employee_id=emp.id,
                    contract_number=f"HDLD-2024-{contract_counter:04d}",
                    contract_type=c_type,
                    status=status,
                    sign_date=start_date.strftime("%Y-%m-%d"),
                    start_date=start_date.strftime("%Y-%m-%d"),
                    end_date=end_date.strftime("%Y-%m-%d") if end_date else None,
                    previous_contract_id=prev_contract_id,
                    basic_salary=basic_salary,
                    insurance_salary=basic_salary * 0.8,
                    probation_salary_percent=85 if c_type == "PROBATION" else 100,
                    job_title=emp_code[:2],
                    work_location="Chi nhánh HCM" if "HCM" in emp.email else "Chi nhánh Hà Nội",
                    working_hours_per_day=8,
                    working_days_per_week=5 if "TX" not in emp_code else 6,
                    company_signed_by="Nguyễn Văn Minh",
                    notes=f"Hợp đồng tạo tự động cho {emp.full_name}"
                )
                session.add(contract)
                session.commit()
                session.refresh(contract)
                prev_contract_id = contract.id
                contract_counter += 1
                contracts_created += 1

        # ===== 7. CREATE LEAVE TYPES & BALANCES =====
        leave_types_data = [
            {
                "code": "AL", "name": "Phép năm", "days_per_year": 12,
                "is_paid": True, "requires_approval": True, "min_notice_days": 3,
                "allow_half_day": True, "carry_forward": True, "max_carry_forward_days": 5,
                "description": "Ngày phép hàng năm theo quy định"
            },
            {
                "code": "SL", "name": "Nghỉ ốm", "days_per_year": 30,
                "is_paid": True, "requires_approval": True, "min_notice_days": 0,
                "allow_half_day": True, "carry_forward": False,
                "description": "Nghỉ ốm có giấy bác sĩ"
            },
            {
                "code": "ML", "name": "Thai sản", "days_per_year": 180,
                "is_paid": True, "requires_approval": True, "min_notice_days": 30,
                "allow_half_day": False, "carry_forward": False, "gender_specific": "FEMALE",
                "description": "Nghỉ thai sản cho nữ"
            },
            {
                "code": "PL", "name": "Nghỉ phép riêng", "days_per_year": 3,
                "is_paid": True, "requires_approval": True, "min_notice_days": 1,
                "allow_half_day": True, "carry_forward": False,
                "description": "Nghỉ việc riêng (cưới, tang, v.v.)"
            },
            {
                "code": "UL", "name": "Nghỉ không lương", "days_per_year": 365,
                "is_paid": False, "requires_approval": True, "min_notice_days": 7,
                "allow_half_day": False, "carry_forward": False,
                "description": "Nghỉ không hưởng lương"
            },
        ]

        leave_types = {}
        for lt_data in leave_types_data:
            lt = LeaveType(
                tenant_id=tenant_id,
                **lt_data
            )
            session.add(lt)
            session.commit()
            session.refresh(lt)
            leave_types[lt_data["code"]] = lt

        # Create leave balances for all employees
        current_year = datetime.now().year
        leave_balances_created = 0
        for emp in employees.values():
            for lt_code, lt in leave_types.items():
                # Skip gender-specific leaves
                if lt.gender_specific and emp.gender != lt.gender_specific:
                    continue

                balance = LeaveBalance(
                    tenant_id=tenant_id,
                    employee_id=emp.id,
                    leave_type_id=lt.id,
                    year=current_year,
                    total_days=lt.days_per_year,
                    carried_forward_days=0,
                    used_days=random.randint(0, 3) if lt_code == "AL" else 0,
                    pending_days=0
                )
                session.add(balance)
                leave_balances_created += 1

        session.commit()

        # ===== 8. CREATE ADVANCE REQUESTS =====
        advances_created = 0
        advance_statuses = ["PENDING", "APPROVED", "PAID", "REJECTED"]
        advance_counter = 1
        today = datetime.now()

        # Create advances for random employees
        emp_list = list(employees.values())
        for _ in range(25):  # Create 25 advance requests
            emp = random.choice(emp_list)
            status = random.choice(advance_statuses)
            req_amount = random.randint(2, 15) * 1000000
            request_date = today - timedelta(days=random.randint(1, 90))

            advance = AdvanceRequest(
                tenant_id=tenant_id,
                request_number=f"TU-2024-{advance_counter:04d}",
                employee_id=emp.id,
                requested_amount=req_amount,
                approved_amount=req_amount if status in ["APPROVED", "PAID"] else 0,
                purpose=random.choice([
                    "Tạm ứng lương tháng",
                    "Chi phí khẩn cấp",
                    "Sửa chữa xe",
                    "Chi phí gia đình",
                    "Đóng học phí",
                    "Khám chữa bệnh"
                ]),
                advance_type="SALARY",
                request_date=request_date.strftime("%Y-%m-%d"),
                needed_date=(request_date + timedelta(days=3)).strftime("%Y-%m-%d"),
                status=status,
                approved_by=employees["TP002"].id if status in ["APPROVED", "PAID"] else None,
                approved_at=(request_date + timedelta(days=1)).strftime("%Y-%m-%d") if status in ["APPROVED", "PAID"] else None,
                rejection_reason="Vượt hạn mức tạm ứng" if status == "REJECTED" else None,
                paid_date=(request_date + timedelta(days=2)).strftime("%Y-%m-%d") if status == "PAID" else None,
                paid_by="Kế toán" if status == "PAID" else None,
                payment_method="TRANSFER" if status == "PAID" else None,
                repaid_amount=req_amount if status == "PAID" and random.random() > 0.5 else 0,
                remaining_amount=0 if (status == "PAID" and random.random() > 0.5) else (req_amount if status == "PAID" else 0),
                repayment_method="SALARY_DEDUCTION",
                notes=f"Tạm ứng tạo tự động"
            )
            session.add(advance)
            advance_counter += 1
            advances_created += 1

        session.commit()

        return {
            "success": True,
            "message": "HRM sample data created successfully",
            "summary": {
                "branches": 2,
                "departments": len(departments),
                "teams": len(teams),
                "positions": len(positions),
                "employees": len(employees),
                "contracts": contracts_created,
                "leave_types": len(leave_types),
                "leave_balances": leave_balances_created,
                "advances": advances_created,
                "breakdown": {
                    "ceo": 1,
                    "branch_managers": 2,
                    "department_heads": 7,
                    "team_leaders": 3,
                    "staff_and_drivers": len(employees) - 13
                }
            }
        }

    except Exception as e:
        session.rollback()
        raise HTTPException(500, f"Failed to seed data: {str(e)}")


@router.post("/leave-types")
def seed_leave_types(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Seed leave types (can be run independently)"""
    if current_user.role not in ("ADMIN",):
        raise HTTPException(403, "Only ADMIN can seed data")

    tenant_id = str(current_user.tenant_id)

    # Check if leave types already exist
    existing = session.exec(
        select(LeaveType).where(LeaveType.tenant_id == tenant_id)
    ).first()

    if existing:
        raise HTTPException(400, "Leave types already exist for this tenant")

    leave_types_data = [
        {
            "code": "AL", "name": "Phép năm", "days_per_year": 12,
            "is_paid": True, "requires_approval": True, "min_notice_days": 3,
            "allow_half_day": True, "carry_forward": True, "max_carry_forward_days": 5,
            "description": "Ngày phép hàng năm theo quy định"
        },
        {
            "code": "SL", "name": "Nghỉ ốm", "days_per_year": 30,
            "is_paid": True, "requires_approval": True, "min_notice_days": 0,
            "allow_half_day": True, "carry_forward": False,
            "description": "Nghỉ ốm có giấy bác sĩ"
        },
        {
            "code": "ML", "name": "Thai sản", "days_per_year": 180,
            "is_paid": True, "requires_approval": True, "min_notice_days": 30,
            "allow_half_day": False, "carry_forward": False, "gender_specific": "FEMALE",
            "description": "Nghỉ thai sản cho nữ"
        },
        {
            "code": "PL", "name": "Nghỉ phép riêng", "days_per_year": 3,
            "is_paid": True, "requires_approval": True, "min_notice_days": 1,
            "allow_half_day": True, "carry_forward": False,
            "description": "Nghỉ việc riêng (cưới, tang, v.v.)"
        },
        {
            "code": "UL", "name": "Nghỉ không lương", "days_per_year": 365,
            "is_paid": False, "requires_approval": True, "min_notice_days": 7,
            "allow_half_day": False, "carry_forward": False,
            "description": "Nghỉ không hưởng lương"
        },
    ]

    created = []
    for lt_data in leave_types_data:
        lt = LeaveType(
            tenant_id=tenant_id,
            **lt_data
        )
        session.add(lt)
        session.commit()
        session.refresh(lt)
        created.append(lt.code)

    return {
        "success": True,
        "message": f"Created {len(created)} leave types",
        "leave_types": created
    }


@router.post("/monthly-data")
def seed_monthly_data(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    year: int = 2024,
    months: str = "11,12",
):
    """
    Seed monthly operational data for HRM:
    - Work shifts
    - Attendance records
    - Overtime requests
    - Leave requests
    - Payroll periods and records
    - Training courses
    """
    if current_user.role not in ("ADMIN",):
        raise HTTPException(403, "Only ADMIN can seed data")

    tenant_id = str(current_user.tenant_id)
    month_list = [int(m.strip()) for m in months.split(",")]

    # Get all active employees
    employees = session.exec(
        select(Employee).where(
            Employee.tenant_id == tenant_id,
            Employee.status == EmployeeStatus.ACTIVE.value
        )
    ).all()

    if not employees:
        raise HTTPException(400, "No active employees found. Please run /seed first.")

    # Get departments for reference
    departments = session.exec(
        select(Department).where(Department.tenant_id == tenant_id)
    ).all()

    # Get leave types
    leave_types = session.exec(
        select(LeaveType).where(LeaveType.tenant_id == tenant_id)
    ).all()

    try:
        results = {
            "shifts": 0,
            "attendance_records": 0,
            "overtime_requests": 0,
            "leave_requests": 0,
            "payroll_periods": 0,
            "payroll_records": 0,
            "salary_structures": 0,
            "training_sessions": 0,
            "training_participants": 0,
        }

        # ===== 1. CREATE WORK SHIFTS =====
        existing_shift = session.exec(
            select(WorkShift).where(WorkShift.tenant_id == tenant_id, WorkShift.code == "CA-HC")
        ).first()

        shifts = {}
        if not existing_shift:
            shifts_data = [
                {"code": "CA-HC", "name": "Ca hành chính", "start": "08:00", "end": "17:00", "break_start": "12:00", "break_end": "13:00"},
                {"code": "CA-S", "name": "Ca sáng", "start": "06:00", "end": "14:00", "break_start": "10:00", "break_end": "10:30"},
                {"code": "CA-C", "name": "Ca chiều", "start": "14:00", "end": "22:00", "break_start": "18:00", "break_end": "18:30"},
                {"code": "CA-TX", "name": "Ca tài xế", "start": "05:00", "end": "17:00", "break_start": "11:00", "break_end": "12:00"},
            ]
            for s_data in shifts_data:
                shift = WorkShift(
                    tenant_id=tenant_id,
                    code=s_data["code"],
                    name=s_data["name"],
                    start_time=s_data["start"],
                    end_time=s_data["end"],
                    break_start=s_data["break_start"],
                    break_end=s_data["break_end"],
                    break_duration_minutes=60 if s_data["code"] in ("CA-HC", "CA-TX") else 30,
                    working_hours=8,
                    late_grace_minutes=15,
                    early_leave_grace_minutes=15,
                    is_night_shift=s_data["code"] == "CA-C",
                    is_active=True
                )
                session.add(shift)
                session.commit()
                session.refresh(shift)
                shifts[s_data["code"]] = shift
                results["shifts"] += 1
        else:
            # Get existing shifts
            all_shifts = session.exec(select(WorkShift).where(WorkShift.tenant_id == tenant_id)).all()
            for s in all_shifts:
                shifts[s.code] = s

        # ===== 2. CREATE SALARY STRUCTURES =====
        existing_structure = session.exec(
            select(SalaryStructure).where(SalaryStructure.tenant_id == tenant_id, SalaryStructure.code == "SALARY-OFFICE")
        ).first()

        structures = {}
        if not existing_structure:
            structure_data = [
                {"code": "SALARY-OFFICE", "name": "Lương văn phòng", "type": "FULL_TIME"},
                {"code": "SALARY-DRIVER", "name": "Lương tài xế", "type": "DRIVER"},
            ]
            for st_data in structure_data:
                structure = SalaryStructure(
                    tenant_id=tenant_id,
                    code=st_data["code"],
                    name=st_data["name"],
                    employee_type=st_data["type"],
                    is_active=True,
                    is_default=st_data["code"] == "SALARY-OFFICE"
                )
                session.add(structure)
                session.commit()
                session.refresh(structure)
                structures[st_data["code"]] = structure
                results["salary_structures"] += 1

                # Create components for each structure
                components = [
                    {"code": "BASIC", "name": "Lương cơ bản", "type": "EARNING", "taxable": True, "ins_base": True, "amount": 15000000},
                    {"code": "MEAL", "name": "Phụ cấp ăn trưa", "type": "EARNING", "taxable": False, "ins_base": False, "amount": 730000},
                    {"code": "TRANSPORT", "name": "Phụ cấp xăng xe", "type": "EARNING", "taxable": False, "ins_base": False, "amount": 500000},
                    {"code": "PHONE", "name": "Phụ cấp điện thoại", "type": "EARNING", "taxable": False, "ins_base": False, "amount": 300000},
                ]
                if st_data["code"] == "SALARY-DRIVER":
                    components.append({"code": "TRIP", "name": "Thu nhập chuyến", "type": "EARNING", "taxable": True, "ins_base": False, "amount": 0})

                for idx, c_data in enumerate(components):
                    comp = SalaryComponent(
                        tenant_id=tenant_id,
                        structure_id=structure.id,
                        code=c_data["code"],
                        name=c_data["name"],
                        component_type=c_data["type"],
                        calculation_type="FIXED",
                        default_amount=c_data["amount"],
                        is_taxable=c_data["taxable"],
                        is_insurance_base=c_data["ins_base"],
                        sort_order=idx,
                        is_active=True
                    )
                    session.add(comp)
                session.commit()
        else:
            all_structures = session.exec(select(SalaryStructure).where(SalaryStructure.tenant_id == tenant_id)).all()
            for s in all_structures:
                structures[s.code] = s

        # ===== 3. CREATE EMPLOYEE SALARIES =====
        for emp in employees:
            existing_emp_salary = session.exec(
                select(EmployeeSalary).where(
                    EmployeeSalary.tenant_id == tenant_id,
                    EmployeeSalary.employee_id == emp.id,
                    EmployeeSalary.is_current == True
                )
            ).first()

            if not existing_emp_salary:
                # Determine salary based on position
                base_salary = random.randint(10, 30) * 1000000
                if "TX" in emp.employee_code:
                    structure = structures.get("SALARY-DRIVER", list(structures.values())[0])
                    base_salary = random.randint(8, 15) * 1000000
                else:
                    structure = structures.get("SALARY-OFFICE", list(structures.values())[0])

                emp_salary = EmployeeSalary(
                    tenant_id=tenant_id,
                    employee_id=emp.id,
                    structure_id=structure.id,
                    effective_from=f"{year}-01-01",
                    overrides_json=json.dumps({"BASIC": base_salary}),
                    is_current=True
                )
                session.add(emp_salary)
        session.commit()

        # ===== 4. SEED DATA FOR EACH MONTH =====
        for month in month_list:
            _, days_in_month = monthrange(year, month)

            # === 4.1 Create Payroll Period ===
            existing_period = session.exec(
                select(PayrollPeriod).where(
                    PayrollPeriod.tenant_id == tenant_id,
                    PayrollPeriod.year == year,
                    PayrollPeriod.month == month
                )
            ).first()

            if not existing_period:
                period = PayrollPeriod(
                    tenant_id=tenant_id,
                    code=f"{year}-{month:02d}",
                    name=f"Lương tháng {month}/{year}",
                    year=year,
                    month=month,
                    start_date=f"{year}-{month:02d}-01",
                    end_date=f"{year}-{month:02d}-{days_in_month}",
                    attendance_cutoff_date=f"{year}-{month:02d}-{days_in_month}",
                    total_working_days=22,
                    status="COMPLETED" if month < 12 else "OPEN"
                )
                session.add(period)
                session.commit()
                session.refresh(period)
                results["payroll_periods"] += 1
            else:
                period = existing_period

            # === 4.2 Create Attendance Records ===
            # Working days (Mon-Fri)
            working_dates = []
            for day in range(1, days_in_month + 1):
                d = datetime(year, month, day)
                if d.weekday() < 5:  # Mon-Fri
                    working_dates.append(f"{year}-{month:02d}-{day:02d}")

            for emp in employees:
                # Get shift based on employee type
                shift_code = "CA-TX" if "TX" in emp.employee_code else "CA-HC"
                shift = shifts.get(shift_code, list(shifts.values())[0] if shifts else None)

                for work_date in working_dates:
                    # Check if attendance record already exists
                    existing_att = session.exec(
                        select(AttendanceRecord).where(
                            AttendanceRecord.tenant_id == tenant_id,
                            AttendanceRecord.employee_id == emp.id,
                            AttendanceRecord.date == work_date
                        )
                    ).first()

                    if existing_att:
                        continue

                    # Random attendance status
                    rand = random.random()
                    if rand < 0.85:  # 85% present
                        status = AttendanceStatus.PRESENT.value
                        late_min = 0
                        check_in = shift.start_time if shift else "08:00"
                        check_out = shift.end_time if shift else "17:00"
                        ot_hours = 0
                    elif rand < 0.92:  # 7% late
                        status = AttendanceStatus.LATE.value
                        late_min = random.randint(5, 30)
                        h, m = (shift.start_time if shift else "08:00").split(":")
                        new_min = int(m) + late_min
                        new_h = int(h) + new_min // 60
                        check_in = f"{new_h:02d}:{new_min % 60:02d}"
                        check_out = shift.end_time if shift else "17:00"
                        ot_hours = 0
                    elif rand < 0.97:  # 5% leave
                        status = AttendanceStatus.ON_LEAVE.value
                        late_min = 0
                        check_in = None
                        check_out = None
                        ot_hours = 0
                    else:  # 3% absent
                        status = AttendanceStatus.ABSENT.value
                        late_min = 0
                        check_in = None
                        check_out = None
                        ot_hours = 0

                    work_hours = 8 if status in (AttendanceStatus.PRESENT.value, AttendanceStatus.LATE.value) else 0

                    att = AttendanceRecord(
                        tenant_id=tenant_id,
                        employee_id=emp.id,
                        date=work_date,
                        shift_id=shift.id if shift else None,
                        check_in_time=check_in,
                        check_out_time=check_out,
                        check_in_source="SYSTEM",
                        check_out_source="SYSTEM",
                        status=status,
                        late_minutes=late_min,
                        working_hours=work_hours,
                        overtime_hours=ot_hours,
                        work_units=1 if status == AttendanceStatus.PRESENT.value else (0.5 if status == AttendanceStatus.LATE.value else 0),
                        is_approved=True
                    )
                    session.add(att)
                    results["attendance_records"] += 1

            session.commit()

            # === 4.3 Create Overtime Requests ===
            # Create 15-25 OT requests per month
            ot_count = random.randint(15, 25)
            ot_types = ["WEEKDAY", "WEEKEND", "HOLIDAY", "NIGHT"]
            ot_multipliers = {"WEEKDAY": 1.5, "WEEKEND": 2.0, "HOLIDAY": 3.0, "NIGHT": 1.3}
            ot_statuses = [OvertimeStatus.APPROVED.value] * 7 + [OvertimeStatus.PENDING.value] * 2 + [OvertimeStatus.REJECTED.value]

            for _ in range(ot_count):
                emp = random.choice(employees)
                ot_date = f"{year}-{month:02d}-{random.randint(1, days_in_month):02d}"
                ot_type = random.choice(ot_types)
                start_hour = random.choice([18, 19, 20])
                end_hour = start_hour + random.randint(1, 4)
                hours = end_hour - start_hour

                ot = OvertimeRequest(
                    tenant_id=tenant_id,
                    employee_id=emp.id,
                    date=ot_date,
                    start_time=f"{start_hour:02d}:00",
                    end_time=f"{end_hour:02d}:00",
                    hours=hours,
                    ot_type=ot_type,
                    multiplier=ot_multipliers[ot_type],
                    reason=random.choice([
                        "Hoàn thành dự án gấp",
                        "Xử lý sự cố hệ thống",
                        "Hỗ trợ khách hàng",
                        "Giao hàng đơn gấp",
                        "Kiểm kê kho",
                        "Chốt sổ cuối tháng",
                    ]),
                    status=random.choice(ot_statuses),
                    created_by=emp.id
                )
                session.add(ot)
                results["overtime_requests"] += 1

            session.commit()

            # === 4.4 Create Leave Requests ===
            if leave_types:
                leave_count = random.randint(8, 15)
                leave_statuses = ["APPROVED"] * 6 + ["PENDING"] * 2 + ["REJECTED"]

                for _ in range(leave_count):
                    emp = random.choice(employees)
                    lt = random.choice(leave_types)
                    start_day = random.randint(1, days_in_month - 2)
                    duration = random.randint(1, 3)
                    end_day = min(start_day + duration - 1, days_in_month)

                    leave = LeaveRequest(
                        tenant_id=tenant_id,
                        employee_id=emp.id,
                        leave_type_id=lt.id,
                        start_date=f"{year}-{month:02d}-{start_day:02d}",
                        end_date=f"{year}-{month:02d}-{end_day:02d}",
                        total_days=end_day - start_day + 1,
                        reason=random.choice([
                            "Nghỉ việc riêng",
                            "Khám sức khỏe định kỳ",
                            "Gia đình có việc",
                            "Du lịch",
                            "Không khỏe",
                        ]),
                        status=random.choice(leave_statuses)
                    )
                    session.add(leave)
                    results["leave_requests"] += 1

                session.commit()

            # === 4.5 Create Payroll Records ===
            for emp in employees:
                existing_pr = session.exec(
                    select(PayrollRecord).where(
                        PayrollRecord.tenant_id == tenant_id,
                        PayrollRecord.payroll_period_id == period.id,
                        PayrollRecord.employee_id == emp.id
                    )
                ).first()

                if existing_pr:
                    continue

                # Get employee salary
                emp_salary = session.exec(
                    select(EmployeeSalary).where(
                        EmployeeSalary.tenant_id == tenant_id,
                        EmployeeSalary.employee_id == emp.id,
                        EmployeeSalary.is_current == True
                    )
                ).first()

                if not emp_salary:
                    continue

                # Calculate from attendance
                att_records = session.exec(
                    select(AttendanceRecord).where(
                        AttendanceRecord.tenant_id == tenant_id,
                        AttendanceRecord.employee_id == emp.id,
                        AttendanceRecord.date >= f"{year}-{month:02d}-01",
                        AttendanceRecord.date <= f"{year}-{month:02d}-{days_in_month}"
                    )
                ).all()

                working_days = len([a for a in att_records if a.status in (AttendanceStatus.PRESENT.value, AttendanceStatus.LATE.value)])
                leave_days = len([a for a in att_records if a.status == AttendanceStatus.ON_LEAVE.value])
                absent_days = len([a for a in att_records if a.status == AttendanceStatus.ABSENT.value])
                late_count = len([a for a in att_records if a.status == AttendanceStatus.LATE.value])
                ot_hours = sum(a.overtime_hours for a in att_records)

                # Get base salary from overrides
                overrides = json.loads(emp_salary.overrides_json) if emp_salary.overrides_json else {}
                basic_salary = overrides.get("BASIC", 15000000)

                # Calculate components
                allowances = 730000 + 500000 + 300000  # Meal + Transport + Phone
                overtime_pay = ot_hours * (basic_salary / 22 / 8) * 1.5
                gross = basic_salary + allowances + overtime_pay

                # Deductions
                insurance_base = min(basic_salary, 36000000)  # Cap at 36M
                insurance_emp = insurance_base * 0.105  # 10.5% (BHXH 8% + BHYT 1.5% + BHTN 1%)

                # Tax calculation (simplified)
                taxable = gross - insurance_emp - 11000000  # Personal deduction
                tax = max(0, taxable * 0.05) if taxable > 0 else 0

                net = gross - insurance_emp - tax

                pr = PayrollRecord(
                    tenant_id=tenant_id,
                    payroll_period_id=period.id,
                    employee_id=emp.id,
                    employee_salary_id=emp_salary.id,
                    working_days=working_days,
                    leave_days=leave_days,
                    absent_days=absent_days,
                    late_count=late_count,
                    ot_hours_weekday=ot_hours,
                    basic_salary=basic_salary,
                    prorated_salary=basic_salary * working_days / 22,
                    allowances_total=allowances,
                    overtime_total=overtime_pay,
                    gross_salary=gross,
                    insurance_employee=insurance_emp,
                    tax_amount=tax,
                    total_deductions=insurance_emp + tax,
                    net_salary=net,
                    payment_status="PAID" if month < 12 else "PENDING"
                )
                session.add(pr)
                results["payroll_records"] += 1

            session.commit()

        # ===== 5. CREATE TRAINING COURSES =====
        training_data = [
            {
                "code": f"TR-{year}-001",
                "name": "An toàn lao động 2024",
                "type": "SAFETY",
                "format": "OFFLINE",
                "duration": 8,
                "start": f"{year}-11-15",
                "end": f"{year}-11-15",
                "status": "COMPLETED",
                "mandatory": True,
                "participants": 20,
            },
            {
                "code": f"TR-{year}-002",
                "name": "Kỹ năng giao tiếp khách hàng",
                "type": "SKILL",
                "format": "ONLINE",
                "duration": 4,
                "start": f"{year}-11-20",
                "end": f"{year}-11-22",
                "status": "COMPLETED",
                "mandatory": False,
                "participants": 15,
            },
            {
                "code": f"TR-{year}-003",
                "name": "Đào tạo lái xe an toàn",
                "type": "DRIVER",
                "format": "OFFLINE",
                "duration": 16,
                "start": f"{year}-12-01",
                "end": f"{year}-12-02",
                "status": "COMPLETED",
                "mandatory": True,
                "participants": 14,
            },
            {
                "code": f"TR-{year}-004",
                "name": "Phần mềm quản lý mới",
                "type": "TECHNICAL",
                "format": "HYBRID",
                "duration": 8,
                "start": f"{year}-12-10",
                "end": f"{year}-12-12",
                "status": "IN_PROGRESS",
                "mandatory": False,
                "participants": 25,
            },
            {
                "code": f"TR-{year}-005",
                "name": "Quản lý thời gian hiệu quả",
                "type": "SKILL",
                "format": "E_LEARNING",
                "duration": 2,
                "start": f"{year}-12-15",
                "end": f"{year}-12-20",
                "status": "PLANNED",
                "mandatory": False,
                "participants": 0,
            },
        ]

        for tr_data in training_data:
            existing_tr = session.exec(
                select(Training).where(
                    Training.tenant_id == tenant_id,
                    Training.code == tr_data["code"]
                )
            ).first()

            if existing_tr:
                continue

            course = Training(
                tenant_id=tenant_id,
                code=tr_data["code"],
                name=tr_data["name"],
                training_type=tr_data["type"],
                format=tr_data["format"],
                duration_hours=tr_data["duration"],
                start_date=tr_data["start"],
                end_date=tr_data["end"],
                status=tr_data["status"],
                is_mandatory=tr_data["mandatory"],
                max_participants=50,
                passing_score=70,
                trainer_name=random.choice(["Nguyễn Văn A", "Trần Thị B", "Lê Văn C", "External Trainer"]),
                location="Phòng họp A" if tr_data["format"] == "OFFLINE" else "Online",
            )
            session.add(course)
            session.commit()
            session.refresh(course)
            results["training_sessions"] += 1

            # Add participants
            if tr_data["participants"] > 0:
                participant_emps = random.sample(employees, min(tr_data["participants"], len(employees)))
                for emp in participant_emps:
                    status = "COMPLETED" if tr_data["status"] == "COMPLETED" else ("IN_PROGRESS" if tr_data["status"] == "IN_PROGRESS" else "ENROLLED")
                    score = random.randint(60, 100) if status == "COMPLETED" else None
                    is_passed = score >= 70 if score else None

                    participant = TrainingParticipant(
                        tenant_id=tenant_id,
                        training_id=course.id,
                        employee_id=emp.id,
                        enrolled_date=tr_data["start"],
                        status=status,
                        score=score,
                        is_passed=is_passed,
                        completion_date=tr_data["end"] if status == "COMPLETED" else None,
                    )
                    session.add(participant)
                    results["training_participants"] += 1

        session.commit()

        return {
            "success": True,
            "message": f"Monthly data seeded for {year}, months: {month_list}",
            "summary": results
        }

    except Exception as e:
        session.rollback()
        raise HTTPException(500, f"Failed to seed monthly data: {str(e)}")
