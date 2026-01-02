"""
BOM (Bill of Materials) API Routes
Định mức nguyên vật liệu
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from typing import Optional, List
from datetime import date
from decimal import Decimal
from pydantic import BaseModel

from app.db.session import get_session
from app.core.security import get_current_user
from app.models import User
from app.models.mes import BillOfMaterials, BOMLine, BOMStatus, BOMType

router = APIRouter()


# ============== Schemas ==============
class BOMLineCreate(BaseModel):
    component_id: str
    component_code: Optional[str] = None
    component_name: Optional[str] = None
    quantity: Decimal = Decimal("1")
    unit_id: Optional[str] = None
    unit_name: Optional[str] = None
    scrap_rate: Decimal = Decimal("0")
    operation_id: Optional[str] = None
    is_critical: bool = False
    substitute_allowed: bool = True
    substitute_component_id: Optional[str] = None
    unit_cost: Decimal = Decimal("0")
    notes: Optional[str] = None


class BOMCreate(BaseModel):
    bom_code: str
    bom_name: str
    description: Optional[str] = None
    version: str = "1.0"
    product_id: str
    product_code: Optional[str] = None
    product_name: Optional[str] = None
    base_quantity: Decimal = Decimal("1")
    unit_id: Optional[str] = None
    unit_name: Optional[str] = None
    bom_type: BOMType = BOMType.STANDARD
    routing_id: Optional[str] = None
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None
    notes: Optional[str] = None
    lines: Optional[List[BOMLineCreate]] = None


class BOMUpdate(BaseModel):
    bom_name: Optional[str] = None
    description: Optional[str] = None
    version: Optional[str] = None
    base_quantity: Optional[Decimal] = None
    unit_id: Optional[str] = None
    unit_name: Optional[str] = None
    bom_type: Optional[BOMType] = None
    status: Optional[BOMStatus] = None
    routing_id: Optional[str] = None
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None
    notes: Optional[str] = None


# ============== BOM Endpoints ==============
@router.get("")
async def list_boms(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: Optional[BOMStatus] = None,
    bom_type: Optional[BOMType] = None,
    product_id: Optional[str] = None,
    search: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Danh sách BOM"""
    query = select(BillOfMaterials).where(
        BillOfMaterials.tenant_id == current_user.tenant_id
    )

    if status:
        query = query.where(BillOfMaterials.status == status)
    if bom_type:
        query = query.where(BillOfMaterials.bom_type == bom_type)
    if product_id:
        query = query.where(BillOfMaterials.product_id == product_id)
    if search:
        query = query.where(
            (BillOfMaterials.bom_code.ilike(f"%{search}%")) |
            (BillOfMaterials.bom_name.ilike(f"%{search}%")) |
            (BillOfMaterials.product_code.ilike(f"%{search}%"))
        )

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Paginate
    query = query.order_by(BillOfMaterials.created_at.desc())
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
async def create_bom(
    data: BOMCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Tạo BOM mới"""
    # Check duplicate code
    existing = session.exec(
        select(BillOfMaterials).where(
            BillOfMaterials.tenant_id == current_user.tenant_id,
            BillOfMaterials.bom_code == data.bom_code,
        )
    ).first()
    if existing:
        raise HTTPException(400, f"Mã BOM {data.bom_code} đã tồn tại")

    bom = BillOfMaterials(
        tenant_id=current_user.tenant_id,
        created_by=str(current_user.id),
        **data.model_dump(exclude={"lines"})
    )
    session.add(bom)
    session.flush()

    # Add lines
    total_cost = Decimal("0")
    if data.lines:
        for i, line_data in enumerate(data.lines, 1):
            line = BOMLine(
                tenant_id=current_user.tenant_id,
                bom_id=bom.id,
                line_number=i,
                total_cost=line_data.quantity * line_data.unit_cost,
                **line_data.model_dump()
            )
            total_cost += line.total_cost
            session.add(line)

    bom.standard_cost = total_cost
    session.commit()
    session.refresh(bom)

    return bom


@router.get("/{bom_id}")
async def get_bom(
    bom_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Chi tiết BOM"""
    bom = session.exec(
        select(BillOfMaterials).where(
            BillOfMaterials.id == bom_id,
            BillOfMaterials.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not bom:
        raise HTTPException(404, "Không tìm thấy BOM")

    # Get lines
    lines = session.exec(
        select(BOMLine).where(BOMLine.bom_id == bom_id).order_by(BOMLine.line_number)
    ).all()

    return {
        **bom.model_dump(),
        "lines": [line.model_dump() for line in lines],
    }


@router.put("/{bom_id}")
async def update_bom(
    bom_id: str,
    data: BOMUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Cập nhật BOM"""
    bom = session.exec(
        select(BillOfMaterials).where(
            BillOfMaterials.id == bom_id,
            BillOfMaterials.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not bom:
        raise HTTPException(404, "Không tìm thấy BOM")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(bom, key, value)

    session.add(bom)
    session.commit()
    session.refresh(bom)

    return bom


@router.delete("/{bom_id}")
async def delete_bom(
    bom_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Xóa BOM"""
    bom = session.exec(
        select(BillOfMaterials).where(
            BillOfMaterials.id == bom_id,
            BillOfMaterials.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not bom:
        raise HTTPException(404, "Không tìm thấy BOM")

    # Delete lines first
    lines = session.exec(select(BOMLine).where(BOMLine.bom_id == bom_id)).all()
    for line in lines:
        session.delete(line)

    session.delete(bom)
    session.commit()

    return {"message": "Đã xóa BOM"}


@router.post("/{bom_id}/activate")
async def activate_bom(
    bom_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Kích hoạt BOM"""
    bom = session.exec(
        select(BillOfMaterials).where(
            BillOfMaterials.id == bom_id,
            BillOfMaterials.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not bom:
        raise HTTPException(404, "Không tìm thấy BOM")

    bom.status = BOMStatus.ACTIVE
    bom.approved_by = str(current_user.id)
    from datetime import datetime
    bom.approved_at = datetime.utcnow()

    session.add(bom)
    session.commit()
    session.refresh(bom)

    return bom


# ============== BOM Line Endpoints ==============
@router.post("/{bom_id}/lines")
async def add_bom_line(
    bom_id: str,
    data: BOMLineCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Thêm dòng vào BOM"""
    bom = session.exec(
        select(BillOfMaterials).where(
            BillOfMaterials.id == bom_id,
            BillOfMaterials.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not bom:
        raise HTTPException(404, "Không tìm thấy BOM")

    # Get max line number
    max_line = session.exec(
        select(func.max(BOMLine.line_number)).where(BOMLine.bom_id == bom_id)
    ).one() or 0

    line = BOMLine(
        tenant_id=current_user.tenant_id,
        bom_id=bom_id,
        line_number=max_line + 1,
        total_cost=data.quantity * data.unit_cost,
        **data.model_dump()
    )
    session.add(line)

    # Update BOM total cost
    bom.standard_cost += line.total_cost
    session.add(bom)

    session.commit()
    session.refresh(line)

    return line


@router.delete("/{bom_id}/lines/{line_id}")
async def delete_bom_line(
    bom_id: str,
    line_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Xóa dòng khỏi BOM"""
    line = session.exec(
        select(BOMLine).where(
            BOMLine.id == line_id,
            BOMLine.bom_id == bom_id,
            BOMLine.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not line:
        raise HTTPException(404, "Không tìm thấy dòng BOM")

    # Update BOM total cost
    bom = session.exec(select(BillOfMaterials).where(BillOfMaterials.id == bom_id)).first()
    if bom:
        bom.standard_cost -= line.total_cost
        session.add(bom)

    session.delete(line)
    session.commit()

    return {"message": "Đã xóa dòng BOM"}
