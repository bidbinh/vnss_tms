"""
Seed HRM Sample Data
- 1 Company with 2 Branches
- 1 CEO, 2 Branch Managers, 5 Department Heads
- Team Leaders for Sales department
- 40+ Employees across departments
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlmodel import Session, select
from app.db.session import engine
from app.models.hrm.department import Branch, Department, Team, Position
from app.models.hrm.employee import Employee

# Get tenant_id from first user or use default
def get_tenant_id(session: Session) -> str:
    from app.models import User
    user = session.exec(select(User)).first()
    if user:
        return str(user.tenant_id)
    return "default-tenant"

def seed_data():
    with Session(engine) as session:
        tenant_id = get_tenant_id(session)
        print(f"Using tenant_id: {tenant_id}")

        # Clear existing data (optional - comment out if you want to keep existing)
        # session.exec(delete(Employee).where(Employee.tenant_id == tenant_id))
        # session.exec(delete(Team).where(Team.tenant_id == tenant_id))
        # session.exec(delete(Department).where(Department.tenant_id == tenant_id))
        # session.exec(delete(Position).where(Position.tenant_id == tenant_id))
        # session.exec(delete(Branch).where(Branch.tenant_id == tenant_id))
        # session.commit()

        # ===== 1. CREATE BRANCHES =====
        print("\n=== Creating Branches ===")

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
        print(f"Created branches: {branch_hcm.name}, {branch_hn.name}")

        # ===== 2. CREATE POSITIONS =====
        print("\n=== Creating Positions ===")

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
            print(f"  Created position: {pos.name}")

        # ===== 3. CREATE DEPARTMENTS =====
        print("\n=== Creating Departments ===")

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
            print(f"  Created department: {dept.name}")

        # ===== 4. CREATE TEAMS (for Sales) =====
        print("\n=== Creating Teams ===")

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
            print(f"  Created team: {team.name}")

        # ===== 5. CREATE EMPLOYEES =====
        print("\n=== Creating Employees ===")

        employee_counter = 1
        employees = {}

        def create_employee(code, name, position_code, dept_code, branch, team_code=None, employee_type="FULL_TIME"):
            nonlocal employee_counter
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
                phone=f"09{employee_counter:08d}",
                email=f"{code.lower()}@vnss.com.vn",
            )
            session.add(emp)
            session.commit()
            session.refresh(emp)
            employees[code] = emp
            employee_counter += 1
            return emp

        # CEO
        ceo = create_employee("GD001", "Nguyễn Văn Minh", "CEO", "BOD", branch_hcm)
        print(f"  CEO: {ceo.full_name}")

        # Branch Managers
        bm_hcm = create_employee("QL001", "Trần Thị Hương", "BM", "BOD", branch_hcm)
        bm_hn = create_employee("QL002", "Lê Văn Đức", "BM", "BOD", branch_hn)
        print(f"  Branch Managers: {bm_hcm.full_name}, {bm_hn.full_name}")

        # Set branch managers
        bm_hcm.manager_id = ceo.id
        bm_hn.manager_id = ceo.id
        session.add(bm_hcm)
        session.add(bm_hn)
        session.commit()

        # Update branch manager_id
        branch_hcm.manager_id = bm_hcm.id
        branch_hn.manager_id = bm_hn.id
        session.add(branch_hcm)
        session.add(branch_hn)
        session.commit()

        # Department Heads (5 total)
        dept_heads = [
            ("TP001", "Phạm Văn Tài", "DH", "KD-HCM", branch_hcm, bm_hcm),
            ("TP002", "Ngô Thị Lan", "DH", "KT-HCM", branch_hcm, bm_hcm),
            ("TP003", "Hoàng Văn Nam", "DH", "NS-HCM", branch_hcm, bm_hcm),
            ("TP004", "Vũ Minh Tuấn", "DH", "IT", branch_hcm, bm_hcm),
            ("TP005", "Đỗ Văn Hùng", "DH", "VT-HCM", branch_hcm, bm_hcm),
        ]

        print(f"\n  Department Heads:")
        for code, name, pos, dept, branch, manager in dept_heads:
            emp = create_employee(code, name, pos, dept, branch)
            emp.manager_id = manager.id
            session.add(emp)
            departments[dept].manager_id = emp.id
            session.add(departments[dept])
            print(f"    {name} - {departments[dept].name}")
        session.commit()

        # HN Department Heads (report to branch manager HN)
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
            print(f"    {name} - {departments[dept].name}")
        session.commit()

        # Team Leaders (Sales KD-HCM)
        print(f"\n  Team Leaders:")
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
            print(f"    {name} - {teams[team].name}")
        session.commit()

        # Staff members
        print(f"\n  Staff Members:")

        # Sales HCM - Team 1 (5 members)
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
        print(f"    Nhóm KD Miền Nam: {len(sales_hcm_1)} nhân viên")

        # Sales HCM - Team 2 (4 members)
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
        print(f"    Nhóm KD Miền Trung: {len(sales_hcm_2)} nhân viên")

        # Accounting HCM (4 members)
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
        print(f"    Phòng Kế toán HCM: {len(accounting)} nhân viên")

        # HR HCM (3 members)
        hr = [
            ("NS001", "Hoàng Thị Phương"),
            ("NS002", "Vũ Văn Quang"),
            ("NS003", "Đỗ Thị Như"),
        ]
        for code, name in hr:
            emp = create_employee(code, name, "ST", "NS-HCM", branch_hcm)
            emp.manager_id = employees["TP003"].id
            session.add(emp)
        print(f"    Phòng Nhân sự HCM: {len(hr)} nhân viên")

        # IT (4 members)
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
        print(f"    Phòng IT: {len(it_staff)} nhân viên")

        # Transport HCM - Drivers (8 members)
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
        print(f"    Phòng Vận tải HCM (Tài xế): {len(drivers_hcm)} người")

        # Sales HN - Team 1 (4 members)
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
        print(f"    Nhóm KD Miền Bắc: {len(sales_hn)} nhân viên")

        # Transport HN - Drivers (6 members)
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
        print(f"    Phòng Vận tải HN (Tài xế): {len(drivers_hn)} người")

        session.commit()

        # Summary
        total_employees = session.exec(
            select(Employee).where(Employee.tenant_id == tenant_id)
        ).all()

        print(f"\n{'='*50}")
        print(f"SEED DATA COMPLETED!")
        print(f"{'='*50}")
        print(f"  Branches: 2")
        print(f"  Departments: {len(departments)}")
        print(f"  Teams: {len(teams)}")
        print(f"  Positions: {len(positions)}")
        print(f"  Employees: {len(total_employees)}")
        print(f"    - 1 CEO")
        print(f"    - 2 Branch Managers")
        print(f"    - 7 Department Heads")
        print(f"    - 3 Team Leaders")
        print(f"    - {len(total_employees) - 13} Staff/Drivers")
        print(f"{'='*50}")

if __name__ == "__main__":
    seed_data()
