from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlmodel import Session, select
from app.db.session import get_session
from app.models import FuelLog, Vehicle, Driver, User
from app.core.security import get_current_user
from app.core.config import settings
from datetime import date as date_type, datetime
from typing import Optional, List
from pathlib import Path
import openpyxl
from io import BytesIO
import uuid

router = APIRouter(prefix="/fuel-logs", tags=["fuel-logs"])


@router.get("")
def list_fuel_logs(
    vehicle_id: Optional[str] = None,
    driver_id: Optional[str] = None,
    start_date: Optional[date_type] = None,
    end_date: Optional[date_type] = None,
    payment_status: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all fuel logs with filters"""
    tenant_id = str(current_user.tenant_id)

    stmt = select(FuelLog).where(FuelLog.tenant_id == tenant_id)

    if vehicle_id:
        stmt = stmt.where(FuelLog.vehicle_id == vehicle_id)
    if driver_id:
        stmt = stmt.where(FuelLog.driver_id == driver_id)
    if start_date:
        stmt = stmt.where(FuelLog.date >= start_date)
    if end_date:
        stmt = stmt.where(FuelLog.date <= end_date)
    if payment_status:
        stmt = stmt.where(FuelLog.payment_status == payment_status)

    logs = session.exec(stmt.order_by(FuelLog.date.desc())).all()

    # Enrich with vehicle and driver info
    vehicle_ids = {log.vehicle_id for log in logs}
    driver_ids = {log.driver_id for log in logs}

    vehicles = session.exec(select(Vehicle).where(Vehicle.id.in_(vehicle_ids))).all()
    drivers = session.exec(select(Driver).where(Driver.id.in_(driver_ids))).all()

    vehicle_map = {v.id: v for v in vehicles}
    driver_map = {d.id: d for d in drivers}

    result = []
    for log in logs:
        vehicle = vehicle_map.get(log.vehicle_id)
        driver = driver_map.get(log.driver_id)
        log_dict = log.model_dump()
        log_dict["vehicle_plate"] = vehicle.plate_no if vehicle else None
        log_dict["driver_name"] = driver.name if driver else None
        result.append(log_dict)

    return result


@router.get("/{log_id}")
def get_fuel_log(
    log_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get single fuel log"""
    tenant_id = str(current_user.tenant_id)

    log = session.get(FuelLog, log_id)
    if not log:
        raise HTTPException(404, "Fuel log not found")
    if str(log.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    # Get vehicle and driver info
    vehicle = session.get(Vehicle, log.vehicle_id)
    driver = session.get(Driver, log.driver_id)

    log_dict = log.model_dump()
    log_dict["vehicle_plate"] = vehicle.plate_no if vehicle else None
    log_dict["driver_name"] = driver.name if driver else None

    return log_dict


@router.post("")
def create_fuel_log(
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create new fuel log"""
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can create fuel logs")

    tenant_id = str(current_user.tenant_id)

    # Validate vehicle
    vehicle = session.get(Vehicle, payload["vehicle_id"])
    if not vehicle or str(vehicle.tenant_id) != tenant_id:
        raise HTTPException(404, "Vehicle not found")

    # Validate driver
    driver = session.get(Driver, payload["driver_id"])
    if not driver or str(driver.tenant_id) != tenant_id:
        raise HTTPException(404, "Driver not found")

    # Calculate difference if both actual and gps are provided
    if payload.get("actual_liters") and payload.get("gps_liters"):
        payload["difference_liters"] = payload["actual_liters"] - payload["gps_liters"]

    # Create fuel log
    fuel_log = FuelLog(**payload, tenant_id=tenant_id)
    session.add(fuel_log)
    session.commit()
    session.refresh(fuel_log)

    return fuel_log.model_dump()


@router.put("/{log_id}")
def update_fuel_log(
    log_id: str,
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update fuel log"""
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can update fuel logs")

    tenant_id = str(current_user.tenant_id)

    log = session.get(FuelLog, log_id)
    if not log:
        raise HTTPException(404, "Fuel log not found")
    if str(log.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    # Validate vehicle if changed
    if "vehicle_id" in payload:
        vehicle = session.get(Vehicle, payload["vehicle_id"])
        if not vehicle or str(vehicle.tenant_id) != tenant_id:
            raise HTTPException(404, "Vehicle not found")

    # Validate driver if changed
    if "driver_id" in payload:
        driver = session.get(Driver, payload["driver_id"])
        if not driver or str(driver.tenant_id) != tenant_id:
            raise HTTPException(404, "Driver not found")

    # Recalculate difference if actual or gps changed
    actual = payload.get("actual_liters", log.actual_liters)
    gps = payload.get("gps_liters", log.gps_liters)
    if actual and gps:
        payload["difference_liters"] = actual - gps

    # Update fields
    for key, value in payload.items():
        if hasattr(log, key) and key not in ["id", "tenant_id", "created_at"]:
            setattr(log, key, value)

    session.add(log)
    session.commit()
    session.refresh(log)

    return log.model_dump()


@router.delete("/{log_id}")
def delete_fuel_log(
    log_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete fuel log"""
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can delete fuel logs")

    tenant_id = str(current_user.tenant_id)

    log = session.get(FuelLog, log_id)
    if not log:
        raise HTTPException(404, "Fuel log not found")
    if str(log.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    session.delete(log)
    session.commit()

    return {"message": "Fuel log deleted successfully"}


@router.post("/import-excel")
async def import_excel(
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Import fuel logs from Excel file

    Excel format (columns):
    - Ngày (Date) - format: YYYY-MM-DD or DD/MM/YYYY
    - Số xe (Vehicle plate)
    - Tài xế (Driver name)
    - Chỉ số đồng hồ Km xe (Odometer in km)
    - Đổ thực tế (Actual liters)
    - Đơn giá (Unit price)
    - Tổng tiền (Total amount)
    - Ghi chú (Note) - optional
    - Trạng thái thanh toán (Payment status) - optional, default: UNPAID
    """
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can import fuel logs")

    tenant_id = str(current_user.tenant_id)

    # Validate file type
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(400, "File must be Excel format (.xlsx or .xls)")

    try:
        # Read Excel file
        contents = await file.read()
        workbook = openpyxl.load_workbook(BytesIO(contents))
        sheet = workbook.active

        # Get all vehicles and drivers for lookup
        vehicles = session.exec(select(Vehicle).where(Vehicle.tenant_id == tenant_id)).all()
        drivers = session.exec(select(Driver).where(Driver.tenant_id == tenant_id)).all()

        vehicle_map = {v.plate_no: v.id for v in vehicles}
        driver_map = {d.name: d.id for d in drivers}

        imported = 0
        skipped = 0
        errors = []

        # Process rows (skip header row)
        for idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
            if not row[0]:  # Skip empty rows
                continue

            try:
                # Parse row data
                date_val = row[0]
                vehicle_plate = str(row[1]).strip() if row[1] else None
                driver_name = str(row[2]).strip() if row[2] else None
                odometer_km = row[3]
                actual_liters = row[4]
                unit_price = row[5]
                total_amount = row[6]
                note = str(row[7]).strip() if len(row) > 7 and row[7] else None
                payment_status = str(row[8]).strip() if len(row) > 8 and row[8] else "UNPAID"

                # Parse date
                if isinstance(date_val, datetime):
                    fuel_date = date_val.date()
                elif isinstance(date_val, str):
                    # Try different date formats
                    for fmt in ["%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y"]:
                        try:
                            fuel_date = datetime.strptime(date_val, fmt).date()
                            break
                        except ValueError:
                            continue
                    else:
                        errors.append(f"Row {idx}: Invalid date format '{date_val}'")
                        skipped += 1
                        continue
                else:
                    fuel_date = date_val

                # Lookup vehicle
                vehicle_id = vehicle_map.get(vehicle_plate)
                if not vehicle_id:
                    errors.append(f"Row {idx}: Vehicle '{vehicle_plate}' not found")
                    skipped += 1
                    continue

                # Lookup driver
                driver_id = driver_map.get(driver_name)
                if not driver_id:
                    errors.append(f"Row {idx}: Driver '{driver_name}' not found")
                    skipped += 1
                    continue

                # Check for duplicates
                existing = session.exec(
                    select(FuelLog).where(
                        FuelLog.tenant_id == tenant_id,
                        FuelLog.vehicle_id == vehicle_id,
                        FuelLog.date == fuel_date,
                        FuelLog.odometer_km == int(odometer_km)
                    )
                ).first()

                if existing:
                    skipped += 1
                    continue

                # Create fuel log
                fuel_log = FuelLog(
                    tenant_id=tenant_id,
                    date=fuel_date,
                    vehicle_id=vehicle_id,
                    driver_id=driver_id,
                    odometer_km=int(odometer_km),
                    actual_liters=float(actual_liters),
                    unit_price=int(unit_price),
                    total_amount=int(total_amount),
                    note=note,
                    payment_status=payment_status
                )

                session.add(fuel_log)
                imported += 1

            except Exception as e:
                errors.append(f"Row {idx}: {str(e)}")
                skipped += 1
                continue

        session.commit()

        return {
            "message": "Import completed",
            "imported": imported,
            "skipped": skipped,
            "errors": errors[:10]  # Return first 10 errors
        }

    except Exception as e:
        raise HTTPException(400, f"Failed to process Excel file: {str(e)}")


# ==================== IMAGE UPLOAD ====================

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/jpg", "image/webp"}


@router.post("/analyze-images")
async def analyze_fuel_images(
    images: List[UploadFile] = File(..., description="Ảnh đổ xăng (1-5 ảnh)"),
    current_user: User = Depends(get_current_user),
):
    """
    Analyze fuel images with AI to extract data.
    Accepts 1-5 images (pump screen, license plate, odometer, etc.)
    Returns extracted data: date, odometer_km, actual_liters, unit_price, total_amount, vehicle_plate, station info
    """
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can analyze images")

    if not images or len(images) == 0:
        raise HTTPException(400, "At least 1 image is required")

    if len(images) > 5:
        raise HTTPException(400, "Maximum 5 images allowed")

    # Read images and convert to base64
    import base64
    from app.services.ai_assistant import AIAssistant

    images_base64 = []
    for img in images:
        if img.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(400, f"Invalid image type: {img.content_type}. Allowed: JPEG, PNG, WebP")

        content = await img.read()
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(400, f"Image {img.filename} too large (max 10MB)")

        images_base64.append({
            "data": base64.b64encode(content).decode("utf-8"),
            "media_type": img.content_type
        })

    # Call AI to analyze images
    try:
        ai = AIAssistant()
        result = ai.extract_fuel_info(images_base64)

        if not result["success"]:
            raise HTTPException(500, f"AI analysis failed: {result.get('error', 'Unknown error')}")

        return result["data"]

    except ValueError as e:
        raise HTTPException(500, f"AI service error: {str(e)}")
    except Exception as e:
        raise HTTPException(500, f"Analysis failed: {str(e)}")


@router.post("/upload-images")
async def upload_fuel_images(
    images: List[UploadFile] = File(..., description="Ảnh đổ xăng (1-5 ảnh)"),
    # Form data for fuel log
    date: str = Form(..., description="Ngày đổ xăng (YYYY-MM-DD)"),
    vehicle_id: str = Form(..., description="ID xe"),
    driver_id: str = Form(..., description="ID tài xế"),
    odometer_km: int = Form(..., description="Số km đồng hồ"),
    actual_liters: float = Form(..., description="Số lít đổ thực tế"),
    unit_price: int = Form(..., description="Đơn giá VND/lít"),
    total_amount: int = Form(..., description="Tổng tiền VND"),
    station_name: Optional[str] = Form(None, description="Tên trạm xăng"),
    station_location: Optional[str] = Form(None, description="Địa điểm"),
    note: Optional[str] = Form(None, description="Ghi chú"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Upload images and create fuel log.
    Accepts 1-5 images of fuel transaction.
    """
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can create fuel logs")

    tenant_id = str(current_user.tenant_id)

    # Validate vehicle
    vehicle = session.get(Vehicle, vehicle_id)
    if not vehicle or str(vehicle.tenant_id) != tenant_id:
        raise HTTPException(404, "Vehicle not found")

    # Validate driver
    driver = session.get(Driver, driver_id)
    if not driver or str(driver.tenant_id) != tenant_id:
        raise HTTPException(404, "Driver not found")

    # Parse date
    try:
        fuel_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(400, "Invalid date format. Use YYYY-MM-DD")

    # Generate fuel log ID first so we can use it for file storage
    fuel_log_id = str(uuid.uuid4())

    # Create storage directory
    storage_dir = Path(settings.STORAGE_DIR) / tenant_id / "fuel_logs" / fuel_log_id
    storage_dir.mkdir(parents=True, exist_ok=True)

    # Save images - store paths in a list format
    saved_image_paths = []

    for idx, img in enumerate(images):
        if img.content_type not in ALLOWED_IMAGE_TYPES:
            continue

        content = await img.read()
        if len(content) > 10 * 1024 * 1024:
            continue

        ext = Path(img.filename).suffix if img.filename else ".jpg"
        safe_name = f"img_{idx}_{uuid.uuid4().hex}{ext}"
        save_path = storage_dir / safe_name

        with open(save_path, "wb") as f:
            f.write(content)

        saved_image_paths.append(f"/storage/{tenant_id}/fuel_logs/{fuel_log_id}/{safe_name}")

    # Store images in database fields for backward compatibility
    pump_image_path = saved_image_paths[0] if len(saved_image_paths) > 0 else None
    plate_image_path = saved_image_paths[1] if len(saved_image_paths) > 1 else None
    odometer_image_path = saved_image_paths[2] if len(saved_image_paths) > 2 else None

    # Create fuel log
    fuel_log = FuelLog(
        id=fuel_log_id,
        tenant_id=tenant_id,
        date=fuel_date,
        vehicle_id=vehicle_id,
        driver_id=driver_id,
        odometer_km=odometer_km,
        actual_liters=actual_liters,
        unit_price=unit_price,
        total_amount=total_amount,
        station_name=station_name,
        station_location=station_location,
        note=note,
        pump_image=pump_image_path,
        plate_image=plate_image_path,
        odometer_image=odometer_image_path,
    )

    session.add(fuel_log)
    session.commit()
    session.refresh(fuel_log)

    # Get vehicle and driver info for response
    log_dict = fuel_log.model_dump()
    log_dict["vehicle_plate"] = vehicle.plate_no
    log_dict["driver_name"] = driver.name

    return {
        "success": True,
        "message": "Fuel log created successfully with images",
        "fuel_log": log_dict
    }


@router.get("/{log_id}/images/{image_type}")
def get_fuel_log_image(
    log_id: str,
    image_type: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Get fuel log image by type (pump, plate, odometer)
    """
    tenant_id = str(current_user.tenant_id)

    log = session.get(FuelLog, log_id)
    if not log:
        raise HTTPException(404, "Fuel log not found")
    if str(log.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    # Get the correct image path
    image_path = None
    if image_type == "pump":
        image_path = log.pump_image
    elif image_type == "plate":
        image_path = log.plate_image
    elif image_type == "odometer":
        image_path = log.odometer_image
    else:
        raise HTTPException(400, "Invalid image type. Use: pump, plate, or odometer")

    if not image_path:
        raise HTTPException(404, f"No {image_type} image found for this fuel log")

    # Convert URL path to file path
    # /storage/tenant/fuel_logs/id/file.jpg -> storage/tenant/fuel_logs/id/file.jpg
    file_path = Path(image_path.lstrip("/"))
    if not file_path.exists():
        raise HTTPException(404, "Image file not found")

    return FileResponse(file_path)
