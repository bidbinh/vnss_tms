"""
Quality Control API Routes
Kiểm tra chất lượng trong sản xuất
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel

from app.db.session import get_session
from app.core.security import get_current_user
from app.models import User
from app.models.mes import QualityControl, QualityControlLine, QCStatus, QCType, DefectType

router = APIRouter()


# ============== Schemas ==============
class QCLineCreate(BaseModel):
    check_point: str
    check_description: Optional[str] = None
    specification: Optional[str] = None
    min_value: Optional[Decimal] = None
    max_value: Optional[Decimal] = None
    target_value: Optional[Decimal] = None
    unit: Optional[str] = None
    measured_value: Optional[Decimal] = None
    is_passed: Optional[bool] = None
    defect_type: Optional[DefectType] = None
    defect_description: Optional[str] = None
    defect_quantity: Decimal = Decimal("0")
    notes: Optional[str] = None


class QCCreate(BaseModel):
    qc_number: Optional[str] = None
    qc_date: Optional[datetime] = None
    description: Optional[str] = None
    qc_type: QCType = QCType.IN_PROCESS
    source_type: str
    source_id: str
    source_number: Optional[str] = None
    production_order_id: Optional[str] = None
    work_order_id: Optional[str] = None
    routing_step_id: Optional[str] = None
    product_id: str
    product_code: Optional[str] = None
    product_name: Optional[str] = None
    lot_id: Optional[str] = None
    lot_number: Optional[str] = None
    sample_size: Decimal = Decimal("1")
    total_quantity: Decimal = Decimal("1")
    unit_name: Optional[str] = None
    inspector_id: Optional[str] = None
    inspector_name: Optional[str] = None
    inspection_method: Optional[str] = None
    notes: Optional[str] = None
    lines: Optional[List[QCLineCreate]] = None


class QCUpdate(BaseModel):
    description: Optional[str] = None
    sample_size: Optional[Decimal] = None
    total_quantity: Optional[Decimal] = None
    inspector_id: Optional[str] = None
    inspector_name: Optional[str] = None
    inspection_method: Optional[str] = None
    notes: Optional[str] = None


class QCComplete(BaseModel):
    passed_quantity: Decimal
    failed_quantity: Decimal = Decimal("0")
    result: str  # PASS, FAIL, CONDITIONAL
    disposition: Optional[str] = None  # ACCEPT, REJECT, REWORK, SCRAP
    disposition_notes: Optional[str] = None


# ============== Helper Functions ==============
async def generate_qc_number(session: Session, tenant_id: str) -> str:
    """Tạo số phiếu QC"""
    from datetime import date
    today = date.today()
    prefix = f"QC{today.strftime('%y%m')}"

    count = session.exec(
        select(func.count()).where(
            QualityControl.tenant_id == tenant_id,
            QualityControl.qc_number.like(f"{prefix}%")
        )
    ).one()

    return f"{prefix}{str(count + 1).zfill(4)}"


# ============== Endpoints ==============
@router.get("")
async def list_quality_controls(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: Optional[QCStatus] = None,
    qc_type: Optional[QCType] = None,
    product_id: Optional[str] = None,
    production_order_id: Optional[str] = None,
    result: Optional[str] = None,
    search: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Danh sách phiếu kiểm tra chất lượng"""
    query = select(QualityControl).where(
        QualityControl.tenant_id == current_user.tenant_id
    )

    if status:
        query = query.where(QualityControl.status == status)
    if qc_type:
        query = query.where(QualityControl.qc_type == qc_type)
    if product_id:
        query = query.where(QualityControl.product_id == product_id)
    if production_order_id:
        query = query.where(QualityControl.production_order_id == production_order_id)
    if result:
        query = query.where(QualityControl.result == result)
    if search:
        query = query.where(
            (QualityControl.qc_number.ilike(f"%{search}%")) |
            (QualityControl.product_code.ilike(f"%{search}%")) |
            (QualityControl.lot_number.ilike(f"%{search}%"))
        )

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Paginate
    query = query.order_by(QualityControl.created_at.desc())
    query = query.offset((page - 1) * size).limit(size)
    items = session.exec(query).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.post("")
async def create_quality_control(
    data: QCCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Tạo phiếu kiểm tra chất lượng"""
    qc_number = data.qc_number
    if not qc_number:
        qc_number = await generate_qc_number(session, current_user.tenant_id)

    qc = QualityControl(
        tenant_id=current_user.tenant_id,
        qc_number=qc_number,
        qc_date=data.qc_date or datetime.utcnow(),
        created_by=str(current_user.id),
        **data.model_dump(exclude={"qc_number", "qc_date", "lines"})
    )
    session.add(qc)
    session.flush()

    # Add lines
    if data.lines:
        for i, line_data in enumerate(data.lines, 1):
            line = QualityControlLine(
                tenant_id=current_user.tenant_id,
                quality_control_id=qc.id,
                line_number=i,
                **line_data.model_dump()
            )
            session.add(line)

    session.commit()
    session.refresh(qc)

    return qc


@router.get("/{qc_id}")
async def get_quality_control(
    qc_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Chi tiết phiếu kiểm tra"""
    qc = session.exec(
        select(QualityControl).where(
            QualityControl.id == qc_id,
            QualityControl.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not qc:
        raise HTTPException(404, "Không tìm thấy phiếu kiểm tra")

    # Get lines
    lines = session.exec(
        select(QualityControlLine).where(QualityControlLine.quality_control_id == qc_id)
        .order_by(QualityControlLine.line_number)
    ).all()

    return {
        **qc.model_dump(),
        "lines": [line.model_dump() for line in lines],
    }


@router.put("/{qc_id}")
async def update_quality_control(
    qc_id: str,
    data: QCUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Cập nhật phiếu kiểm tra"""
    qc = session.exec(
        select(QualityControl).where(
            QualityControl.id == qc_id,
            QualityControl.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not qc:
        raise HTTPException(404, "Không tìm thấy phiếu kiểm tra")

    if qc.status in [QCStatus.PASSED, QCStatus.FAILED]:
        raise HTTPException(400, "Không thể sửa phiếu đã hoàn thành")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(qc, key, value)

    session.add(qc)
    session.commit()
    session.refresh(qc)

    return qc


@router.post("/{qc_id}/start")
async def start_quality_control(
    qc_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Bắt đầu kiểm tra"""
    qc = session.exec(
        select(QualityControl).where(
            QualityControl.id == qc_id,
            QualityControl.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not qc:
        raise HTTPException(404, "Không tìm thấy phiếu kiểm tra")

    if qc.status != QCStatus.PENDING:
        raise HTTPException(400, "Chỉ có thể bắt đầu phiếu chờ kiểm tra")

    qc.status = QCStatus.IN_PROGRESS
    qc.started_at = datetime.utcnow()
    session.add(qc)
    session.commit()
    session.refresh(qc)

    return qc


@router.post("/{qc_id}/complete")
async def complete_quality_control(
    qc_id: str,
    data: QCComplete,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Hoàn thành kiểm tra"""
    qc = session.exec(
        select(QualityControl).where(
            QualityControl.id == qc_id,
            QualityControl.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not qc:
        raise HTTPException(404, "Không tìm thấy phiếu kiểm tra")

    if qc.status != QCStatus.IN_PROGRESS:
        raise HTTPException(400, "Chỉ có thể hoàn thành phiếu đang kiểm tra")

    qc.passed_quantity = data.passed_quantity
    qc.failed_quantity = data.failed_quantity
    qc.result = data.result

    # Calculate pass rate
    total = qc.passed_quantity + qc.failed_quantity
    if total > 0:
        qc.pass_rate = (qc.passed_quantity / total) * 100

    # Set status based on result
    if data.result == "PASS":
        qc.status = QCStatus.PASSED
    elif data.result == "FAIL":
        qc.status = QCStatus.FAILED
    else:
        qc.status = QCStatus.PARTIAL

    qc.disposition = data.disposition
    qc.disposition_notes = data.disposition_notes
    qc.completed_at = datetime.utcnow()

    session.add(qc)
    session.commit()
    session.refresh(qc)

    return qc


@router.delete("/{qc_id}")
async def delete_quality_control(
    qc_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Xóa phiếu kiểm tra"""
    qc = session.exec(
        select(QualityControl).where(
            QualityControl.id == qc_id,
            QualityControl.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not qc:
        raise HTTPException(404, "Không tìm thấy phiếu kiểm tra")

    if qc.status not in [QCStatus.PENDING, QCStatus.ON_HOLD]:
        raise HTTPException(400, "Chỉ có thể xóa phiếu chờ kiểm tra")

    # Delete lines
    lines = session.exec(
        select(QualityControlLine).where(QualityControlLine.quality_control_id == qc_id)
    ).all()
    for line in lines:
        session.delete(line)

    session.delete(qc)
    session.commit()

    return {"message": "Đã xóa phiếu kiểm tra"}


# ============== QC Line Endpoints ==============
@router.post("/{qc_id}/lines")
async def add_qc_line(
    qc_id: str,
    data: QCLineCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Thêm tiêu chí kiểm tra"""
    qc = session.exec(
        select(QualityControl).where(
            QualityControl.id == qc_id,
            QualityControl.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not qc:
        raise HTTPException(404, "Không tìm thấy phiếu kiểm tra")

    # Get max line number
    max_line = session.exec(
        select(func.max(QualityControlLine.line_number)).where(
            QualityControlLine.quality_control_id == qc_id
        )
    ).one() or 0

    line = QualityControlLine(
        tenant_id=current_user.tenant_id,
        quality_control_id=qc_id,
        line_number=max_line + 1,
        **data.model_dump()
    )
    session.add(line)
    session.commit()
    session.refresh(line)

    return line


@router.put("/{qc_id}/lines/{line_id}")
async def update_qc_line(
    qc_id: str,
    line_id: str,
    data: QCLineCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Cập nhật kết quả kiểm tra cho tiêu chí"""
    line = session.exec(
        select(QualityControlLine).where(
            QualityControlLine.id == line_id,
            QualityControlLine.quality_control_id == qc_id,
            QualityControlLine.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not line:
        raise HTTPException(404, "Không tìm thấy tiêu chí kiểm tra")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(line, key, value)

    session.add(line)
    session.commit()
    session.refresh(line)

    return line
