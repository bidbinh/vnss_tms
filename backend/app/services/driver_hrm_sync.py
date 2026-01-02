"""
Driver - HRM Employee Sync Service
Đồng bộ dữ liệu giữa TMS Driver và HRM Employee
"""
from typing import Optional
from sqlmodel import Session, select, func
from datetime import datetime

from app.models.driver import Driver
from app.models.hrm.employee import Employee, EmployeeType, EmployeeStatus


def sync_driver_to_employee(
    session: Session,
    driver: Driver,
    create_if_not_exists: bool = True
) -> Optional[Employee]:
    """
    Đồng bộ thông tin từ TMS Driver sang HRM Employee.

    - Nếu driver chưa có employee_id, tạo Employee mới
    - Nếu đã có, cập nhật thông tin

    Returns Employee đã sync hoặc None nếu không tạo mới
    """
    tenant_id = str(driver.tenant_id)

    # Tìm Employee đã liên kết với driver này
    employee = None

    # Tìm theo driver_id trong Employee
    employee = session.exec(
        select(Employee).where(
            Employee.tenant_id == tenant_id,
            Employee.driver_id == driver.id
        )
    ).first()

    if not employee and create_if_not_exists:
        # Tạo employee code từ driver
        # Đếm số employee có type DRIVER để tạo mã
        count = session.exec(
            select(func.count()).where(
                Employee.tenant_id == tenant_id,
                Employee.employee_type == EmployeeType.DRIVER.value
            )
        ).one() + 1

        employee_code = f"TX{count:04d}"

        # Tạo Employee mới
        employee = Employee(
            tenant_id=tenant_id,
            employee_code=employee_code,
            full_name=driver.name,
            phone=driver.phone,
            date_of_birth=driver.date_of_birth.strftime("%Y-%m-%d") if driver.date_of_birth else None,
            id_number=driver.citizen_id,
            employee_type=EmployeeType.DRIVER.value,
            status=EmployeeStatus.ACTIVE.value if driver.status == "ACTIVE" else EmployeeStatus.RESIGNED.value,
            join_date=driver.hire_date.strftime("%Y-%m-%d") if driver.hire_date else None,
            bank_name=driver.bank_name,
            bank_account=driver.bank_account,
            bank_account_name=driver.name,  # Giả định tên TK = tên driver
            license_number=driver.license_no,
            license_expiry=driver.license_expiry.strftime("%Y-%m-%d") if driver.license_expiry else None,
            driver_id=driver.id,  # Link ngược về TMS driver
        )
        session.add(employee)
        session.commit()
        session.refresh(employee)

    elif employee:
        # Cập nhật thông tin
        employee.full_name = driver.name
        employee.phone = driver.phone
        employee.date_of_birth = driver.date_of_birth.strftime("%Y-%m-%d") if driver.date_of_birth else None
        employee.id_number = driver.citizen_id
        employee.status = EmployeeStatus.ACTIVE.value if driver.status == "ACTIVE" else EmployeeStatus.RESIGNED.value
        employee.bank_name = driver.bank_name
        employee.bank_account = driver.bank_account
        employee.license_number = driver.license_no
        employee.license_expiry = driver.license_expiry.strftime("%Y-%m-%d") if driver.license_expiry else None

        session.add(employee)
        session.commit()
        session.refresh(employee)

    return employee


def sync_employee_to_driver(
    session: Session,
    employee: Employee,
    create_if_not_exists: bool = False
) -> Optional[Driver]:
    """
    Đồng bộ thông tin từ HRM Employee sang TMS Driver.

    Chỉ áp dụng cho Employee có type = DRIVER

    Returns Driver đã sync hoặc None
    """
    if employee.employee_type != EmployeeType.DRIVER.value:
        return None

    tenant_id = str(employee.tenant_id)

    # Tìm driver đã liên kết
    driver = None
    if employee.driver_id:
        driver = session.get(Driver, employee.driver_id)

    if not driver and create_if_not_exists:
        # Tạo driver mới
        driver = Driver(
            tenant_id=tenant_id,
            name=employee.full_name,
            phone=employee.phone,
            date_of_birth=datetime.strptime(employee.date_of_birth, "%Y-%m-%d").date() if employee.date_of_birth else None,
            citizen_id=employee.id_number,
            bank_name=employee.bank_name,
            bank_account=employee.bank_account,
            license_no=employee.license_number,
            license_expiry=datetime.strptime(employee.license_expiry, "%Y-%m-%d").date() if employee.license_expiry else None,
            hire_date=datetime.strptime(employee.join_date, "%Y-%m-%d").date() if employee.join_date else None,
            status="ACTIVE" if employee.status == EmployeeStatus.ACTIVE.value else "INACTIVE",
            employee_id=employee.id,  # Link to HRM Employee (single source of truth)
        )
        session.add(driver)
        session.commit()
        session.refresh(driver)

        # Link employee back to driver (bidirectional)
        employee.driver_id = driver.id
        session.add(employee)
        session.commit()

    elif driver:
        # Cập nhật thông tin
        driver.name = employee.full_name
        driver.phone = employee.phone
        driver.date_of_birth = datetime.strptime(employee.date_of_birth, "%Y-%m-%d").date() if employee.date_of_birth else None
        driver.citizen_id = employee.id_number
        driver.bank_name = employee.bank_name
        driver.bank_account = employee.bank_account
        driver.license_no = employee.license_number
        driver.license_expiry = datetime.strptime(employee.license_expiry, "%Y-%m-%d").date() if employee.license_expiry else None
        driver.status = "ACTIVE" if employee.status == EmployeeStatus.ACTIVE.value else "INACTIVE"

        session.add(driver)
        session.commit()
        session.refresh(driver)

    return driver
