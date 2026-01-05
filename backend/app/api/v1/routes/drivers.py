from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from datetime import datetime
from app.db.session import get_session
from app.models import Driver, Trip, User, Vehicle, Trailer, VehicleAssignment
from app.models.hrm.employee import Employee
from app.core.security import get_current_user
from app.services.driver_hrm_sync import sync_driver_to_employee

router = APIRouter(prefix="/drivers", tags=["drivers"])


@router.get("")
def list_drivers(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    limit: int = 50,
    offset: int = 0,
    status: str = None,
    simple: bool = False,
):
    """List all drivers for current tenant with tractor, trailer and HRM employee info

    Query params:
    - limit: max results (default 50, max 200)
    - offset: skip first N results
    - status: filter by driver status (ACTIVE, INACTIVE, etc.)
    - simple: if true, return only basic driver info (faster for dropdowns)
    """
    tenant_id = str(current_user.tenant_id)

    # Limit max results for performance
    limit = min(limit, 200)

    query = select(Driver).where(Driver.tenant_id == tenant_id)

    if status:
        query = query.where(Driver.status == status)

    query = query.order_by(Driver.created_at.desc()).offset(offset).limit(limit)
    drivers = session.exec(query).all()

    # Fast path: simple mode for dropdowns (no N+1 queries)
    if simple:
        return [
            {
                "id": d.id,
                "name": d.name,
                "short_name": d.short_name,
                "phone": d.phone,
                "status": d.status,
            }
            for d in drivers
        ]

    # Batch fetch vehicles and employees to avoid N+1 queries
    vehicle_ids = set()
    employee_ids = set()
    driver_ids = []

    for driver in drivers:
        driver_ids.append(driver.id)
        if driver.tractor_id:
            vehicle_ids.add(driver.tractor_id)
        if driver.vehicle_id:
            vehicle_ids.add(driver.vehicle_id)
        if driver.trailer_id:
            vehicle_ids.add(driver.trailer_id)
        if hasattr(driver, 'employee_id') and driver.employee_id:
            employee_ids.add(driver.employee_id)

    # Batch fetch vehicles
    vehicles_map = {}
    if vehicle_ids:
        vehicles = session.exec(
            select(Vehicle).where(Vehicle.id.in_(list(vehicle_ids)))
        ).all()
        vehicles_map = {v.id: v for v in vehicles}

    # Batch fetch employees by employee_id and driver_id
    employees_by_id = {}
    employees_by_driver = {}
    try:
        if employee_ids:
            employees = session.exec(
                select(Employee).where(Employee.id.in_(list(employee_ids)))
            ).all()
            employees_by_id = {e.id: e for e in employees}

        # Also fetch by driver_id for those without employee_id link
        employees_by_driver_list = session.exec(
            select(Employee).where(
                Employee.tenant_id == tenant_id,
                Employee.driver_id.in_(driver_ids)
            )
        ).all()
        employees_by_driver = {e.driver_id: e for e in employees_by_driver_list}
    except Exception:
        pass  # HRM tables may not exist

    # Build result with pre-fetched data
    result = []
    for driver in drivers:
        driver_dict = driver.model_dump()

        # Tractor from pre-fetched map
        tractor_id = driver.tractor_id or driver.vehicle_id
        tractor = vehicles_map.get(tractor_id) if tractor_id else None
        driver_dict["tractor"] = tractor.model_dump() if tractor else None

        # Trailer from pre-fetched map
        trailer = vehicles_map.get(driver.trailer_id) if driver.trailer_id else None
        driver_dict["trailer"] = trailer.model_dump() if trailer else None

        # Employee from pre-fetched maps
        employee = None
        if hasattr(driver, 'employee_id') and driver.employee_id:
            employee = employees_by_id.get(driver.employee_id)
        if not employee:
            employee = employees_by_driver.get(driver.id)

        if employee:
            driver_dict["employee"] = {
                "id": employee.id,
                "employee_code": employee.employee_code,
                "full_name": employee.full_name,
                "phone": employee.phone,
                "email": employee.email,
                "date_of_birth": employee.date_of_birth,
                "id_number": employee.id_number,
                "bank_name": employee.bank_name,
                "bank_account": employee.bank_account,
                "bank_account_name": employee.bank_account_name,
                "license_number": employee.license_number,
                "license_class": employee.license_class,
                "license_expiry": employee.license_expiry,
                "status": employee.status,
                "join_date": employee.join_date,
                "branch_id": employee.branch_id,
                "department_id": employee.department_id,
                "salary_type": employee.salary_type,
            }
            driver_dict["name"] = employee.full_name
            driver_dict["phone"] = employee.phone
            driver_dict["citizen_id"] = employee.id_number
            driver_dict["bank_name"] = employee.bank_name
            driver_dict["bank_account"] = employee.bank_account
            driver_dict["license_no"] = employee.license_number
        else:
            driver_dict["employee"] = None

        result.append(driver_dict)

    return result


@router.post("")
def create_driver(
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create new driver (ADMIN/DISPATCHER only)"""
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can create drivers")

    tenant_id = str(current_user.tenant_id)
    driver = Driver(
        tenant_id=tenant_id,
        name=payload["name"],
        short_name=payload.get("short_name"),
        phone=payload.get("phone"),
        date_of_birth=payload.get("date_of_birth"),
        citizen_id=payload.get("citizen_id"),
        license_no=payload.get("license_no"),
        license_expiry=payload.get("license_expiry"),
        bank_account=payload.get("bank_account"),
        bank_name=payload.get("bank_name"),
        base_salary=payload.get("base_salary", 5000000),
        dependent_count=payload.get("dependent_count", 0),
        hire_date=payload.get("hire_date"),
        status=payload.get("status", "ACTIVE"),
        work_status=payload.get("work_status"),
    )
    session.add(driver)
    session.commit()
    session.refresh(driver)

    # Sync to HRM Employee (tự động tạo employee cho driver)
    try:
        sync_driver_to_employee(session, driver, create_if_not_exists=True)
    except Exception as e:
        # Log error but don't fail the driver creation
        print(f"Warning: Failed to sync driver to HRM: {e}")

    return driver


@router.get("/my-trips")
def my_trips(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get trips for current driver (DRIVER role only)"""
    if current_user.role != "DRIVER":
        raise HTTPException(403, "Only DRIVER can access this endpoint")

    if not current_user.driver_id:
        raise HTTPException(404, "Driver ID not found for user")

    return session.exec(
        select(Trip).where(Trip.driver_id == str(current_user.driver_id))
    ).all()


@router.patch("/{driver_id}")
def update_driver(
    driver_id: str,
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update driver (ADMIN/DISPATCHER only)"""
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can update drivers")

    tenant_id = str(current_user.tenant_id)
    driver = session.get(Driver, driver_id)
    if not driver:
        raise HTTPException(404, f"Driver {driver_id} not found")
    if str(driver.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    # Update fields
    if "name" in payload:
        driver.name = payload["name"]
    if "short_name" in payload:
        driver.short_name = payload["short_name"]
    if "phone" in payload:
        driver.phone = payload["phone"]
    if "date_of_birth" in payload:
        driver.date_of_birth = payload["date_of_birth"]
    if "citizen_id" in payload:
        driver.citizen_id = payload["citizen_id"]
    if "license_no" in payload:
        driver.license_no = payload["license_no"]
    if "license_expiry" in payload:
        driver.license_expiry = payload["license_expiry"]
    if "bank_account" in payload:
        driver.bank_account = payload["bank_account"]
    if "bank_name" in payload:
        driver.bank_name = payload["bank_name"]
    if "base_salary" in payload:
        driver.base_salary = payload["base_salary"]
    if "dependent_count" in payload:
        driver.dependent_count = payload["dependent_count"]
    if "hire_date" in payload:
        driver.hire_date = payload["hire_date"]
    if "status" in payload:
        driver.status = payload["status"]
    if "work_status" in payload:
        driver.work_status = payload["work_status"]

    # Handle tractor assignment (tractor_id or vehicle_id)
    if "tractor_id" in payload:
        driver.tractor_id = payload["tractor_id"]
        driver.vehicle_id = payload["tractor_id"]  # Keep backward compatibility
    elif "vehicle_id" in payload:
        driver.vehicle_id = payload["vehicle_id"]
        driver.tractor_id = payload["vehicle_id"]

    if "trailer_id" in payload:
        driver.trailer_id = payload["trailer_id"]

    session.add(driver)
    session.commit()
    session.refresh(driver)

    # Sync to HRM Employee
    try:
        sync_driver_to_employee(session, driver, create_if_not_exists=True)
    except Exception as e:
        print(f"Warning: Failed to sync driver to HRM: {e}")

    return driver


@router.post("/{driver_id}/assign")
def assign_vehicle_trailer(
    driver_id: str,
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Assign tractor and/or trailer to driver with history tracking (ADMIN/DISPATCHER only)"""
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can assign vehicles")

    tenant_id = str(current_user.tenant_id)
    driver = session.get(Driver, driver_id)
    if not driver:
        raise HTTPException(404, f"Driver {driver_id} not found")
    if str(driver.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    # Handle tractor assignment
    tractor_id = payload.get("tractor_id") or payload.get("vehicle_id")
    if tractor_id:
        tractor = session.get(Vehicle, tractor_id)
        if not tractor:
            raise HTTPException(404, f"Tractor {tractor_id} not found")
        if str(tractor.tenant_id) != tenant_id:
            raise HTTPException(403, "Tractor access denied")
        if tractor.type != "TRACTOR":
            raise HTTPException(400, f"Vehicle {tractor_id} is not a TRACTOR")

        # Unassign previous tractor if exists
        old_tractor_id = driver.tractor_id or driver.vehicle_id
        if old_tractor_id and old_tractor_id != tractor_id:
            _unassign_vehicle(session, driver_id, old_tractor_id, "TRACTOR", str(current_user.id))

        # Assign new tractor
        driver.tractor_id = tractor_id
        driver.vehicle_id = tractor_id  # Keep backward compatibility
        _create_assignment(session, tenant_id, driver_id, tractor_id, "TRACTOR", str(current_user.id))

    # Handle trailer assignment
    trailer_id = payload.get("trailer_id")
    if trailer_id:
        trailer = session.get(Vehicle, trailer_id)
        if not trailer:
            raise HTTPException(404, f"Trailer {trailer_id} not found")
        if str(trailer.tenant_id) != tenant_id:
            raise HTTPException(403, "Trailer access denied")
        if trailer.type != "TRAILER":
            raise HTTPException(400, f"Vehicle {trailer_id} is not a TRAILER")

        # Unassign previous trailer if exists
        if driver.trailer_id and driver.trailer_id != trailer_id:
            _unassign_vehicle(session, driver_id, driver.trailer_id, "TRAILER", str(current_user.id))

        # Assign new trailer
        driver.trailer_id = trailer_id
        _create_assignment(session, tenant_id, driver_id, trailer_id, "TRAILER", str(current_user.id))

    # Allow unassignment by passing null/None
    if "tractor_id" in payload and tractor_id is None:
        if driver.tractor_id:
            _unassign_vehicle(session, driver_id, driver.tractor_id, "TRACTOR", str(current_user.id))
        driver.tractor_id = None
        driver.vehicle_id = None

    if "trailer_id" in payload and trailer_id is None:
        if driver.trailer_id:
            _unassign_vehicle(session, driver_id, driver.trailer_id, "TRAILER", str(current_user.id))
        driver.trailer_id = None

    session.add(driver)
    session.commit()
    session.refresh(driver)
    return driver


def _create_assignment(session: Session, tenant_id: str, driver_id: str, vehicle_id: str, vehicle_type: str, assigned_by: str):
    """Create a new vehicle assignment record"""
    import uuid
    assignment = VehicleAssignment(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        driver_id=driver_id,
        vehicle_id=vehicle_id,
        vehicle_type=vehicle_type,
        assigned_at=datetime.utcnow(),
        assigned_by=assigned_by,
        notes=f"Assigned {vehicle_type.lower()} to driver"
    )
    session.add(assignment)


def _unassign_vehicle(session: Session, driver_id: str, vehicle_id: str, vehicle_type: str, unassigned_by: str):
    """Mark current assignment as unassigned"""
    # Find active assignment
    stmt = select(VehicleAssignment).where(
        VehicleAssignment.driver_id == driver_id,
        VehicleAssignment.vehicle_id == vehicle_id,
        VehicleAssignment.vehicle_type == vehicle_type,
        VehicleAssignment.unassigned_at == None
    )
    assignment = session.exec(stmt).first()
    if assignment:
        assignment.unassigned_at = datetime.utcnow()
        assignment.unassigned_by = unassigned_by
        session.add(assignment)


@router.get("/{driver_id}/assignment-history")
def get_assignment_history(
    driver_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get vehicle assignment history for a driver"""
    tenant_id = str(current_user.tenant_id)

    driver = session.get(Driver, driver_id)
    if not driver:
        raise HTTPException(404, f"Driver {driver_id} not found")
    if str(driver.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    # Get all assignments for this driver
    stmt = select(VehicleAssignment).where(
        VehicleAssignment.driver_id == driver_id,
        VehicleAssignment.tenant_id == tenant_id
    ).order_by(VehicleAssignment.assigned_at.desc())

    assignments = session.exec(stmt).all()

    # Enrich with vehicle details
    result = []
    for assignment in assignments:
        assignment_dict = assignment.model_dump()
        vehicle = session.get(Vehicle, assignment.vehicle_id)
        if vehicle:
            assignment_dict["vehicle"] = vehicle.model_dump()
        result.append(assignment_dict)

    return result


@router.post("/sync-to-hrm")
def sync_all_drivers_to_hrm(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Sync tất cả drivers hiện có sang HRM Employee.
    Dùng khi triển khai HRM module lần đầu.
    ADMIN only.
    """
    if current_user.role != "ADMIN":
        raise HTTPException(403, "Only ADMIN can sync drivers to HRM")

    tenant_id = str(current_user.tenant_id)

    # Get all drivers
    drivers = session.exec(
        select(Driver).where(Driver.tenant_id == tenant_id)
    ).all()

    synced = 0
    errors = []

    for driver in drivers:
        try:
            employee = sync_driver_to_employee(session, driver, create_if_not_exists=True)
            if employee:
                synced += 1
        except Exception as e:
            errors.append({
                "driver_id": driver.id,
                "driver_name": driver.name,
                "error": str(e)
            })

    return {
        "message": f"Synced {synced} drivers to HRM",
        "total_drivers": len(drivers),
        "synced": synced,
        "errors": errors
    }
