"""
FMS Customs Partners API Routes
Quản lý danh mục đối tác khai báo hải quan:
- Người xuất khẩu (Exporters)
- Người nhập khẩu (Importers)
- Địa điểm lưu kho/dỡ hàng (Locations)
"""
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlmodel import Session, select, func, or_
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
import pandas as pd
import io

from app.db.session import get_session
from app.models.fms import CustomsExporter, CustomsImporter, CustomsLocation
from app.models import User
from app.core.security import get_current_user

router = APIRouter(prefix="/customs-partners", tags=["FMS Customs Partners"])


# ============================================================
# EXPORTERS
# ============================================================

class ExporterCreate(BaseModel):
    seq_no: Optional[int] = None
    name: str
    notes: Optional[str] = None
    address_line_1: Optional[str] = None
    address_line_2: Optional[str] = None
    address_line_3: Optional[str] = None
    address_line_4: Optional[str] = None
    country_code: Optional[str] = None
    tax_code: Optional[str] = None
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class ExporterResponse(BaseModel):
    id: str
    seq_no: Optional[int]
    name: str
    notes: Optional[str]
    address_line_1: Optional[str]
    address_line_2: Optional[str]
    address_line_3: Optional[str]
    address_line_4: Optional[str]
    country_code: Optional[str]
    tax_code: Optional[str]
    contact_name: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    is_active: bool
    created_at: datetime
    # Computed full address
    full_address: Optional[str] = None


class ExporterSearchItem(BaseModel):
    """Simplified exporter for dropdown search"""
    id: str
    name: str
    full_address: str
    country_code: Optional[str]
    tax_code: Optional[str]


class ExporterListResponse(BaseModel):
    items: List[ExporterResponse]
    total: int
    page: int
    page_size: int


@router.get("/exporters", response_model=ExporterListResponse)
def list_exporters(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    sort_by: str = Query("seq_no", regex="^(seq_no|name|country_code|created_at)$"),
    sort_order: str = Query("asc", regex="^(asc|desc)$"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List exporters with pagination and search"""
    tenant_id = str(current_user.tenant_id)

    query = select(CustomsExporter).where(CustomsExporter.tenant_id == tenant_id)

    if search:
        query = query.where(
            or_(
                CustomsExporter.name.ilike(f"%{search}%"),
                CustomsExporter.notes.ilike(f"%{search}%"),
                CustomsExporter.address_line_1.ilike(f"%{search}%"),
            )
        )
    if is_active is not None:
        query = query.where(CustomsExporter.is_active == is_active)

    total = session.exec(select(func.count()).select_from(query.subquery())).one()

    # Sorting
    sort_column = getattr(CustomsExporter, sort_by)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    query = query.offset((page - 1) * page_size).limit(page_size)
    items = session.exec(query).all()

    # Compute full_address for each exporter
    response_items = []
    for e in items:
        data = e.model_dump()
        # Combine address lines into full_address
        address_parts = [
            e.address_line_1,
            e.address_line_2,
            e.address_line_3,
            e.address_line_4,
        ]
        data['full_address'] = ', '.join([p for p in address_parts if p])
        response_items.append(ExporterResponse(**data))

    return ExporterListResponse(
        items=response_items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/exporters/search", response_model=List[ExporterSearchItem])
def search_exporters(
    q: str = Query(..., min_length=1, description="Search query for exporter name"),
    limit: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Search exporters by name for dropdown autocomplete.
    Returns simplified data with full_address computed.
    """
    tenant_id = str(current_user.tenant_id)

    query = (
        select(CustomsExporter)
        .where(CustomsExporter.tenant_id == tenant_id)
        .where(CustomsExporter.is_active == True)
        .where(CustomsExporter.name.ilike(f"%{q}%"))
        .order_by(CustomsExporter.name)
        .limit(limit)
    )

    items = session.exec(query).all()

    result = []
    for e in items:
        # Combine 4 address lines into full_address
        address_parts = [
            e.address_line_1,
            e.address_line_2,
            e.address_line_3,
            e.address_line_4,
        ]
        full_address = ', '.join([p for p in address_parts if p])

        result.append(ExporterSearchItem(
            id=e.id,
            name=e.name,
            full_address=full_address,
            country_code=e.country_code,
            tax_code=e.tax_code,
        ))

    return result


@router.post("/exporters", response_model=ExporterResponse)
def create_exporter(
    payload: ExporterCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new exporter"""
    tenant_id = str(current_user.tenant_id)

    exporter = CustomsExporter(
        tenant_id=tenant_id,
        created_by=str(current_user.id),
        **payload.model_dump()
    )

    session.add(exporter)
    session.commit()
    session.refresh(exporter)

    return ExporterResponse(**exporter.model_dump())


@router.get("/exporters/{exporter_id}", response_model=ExporterResponse)
def get_exporter(
    exporter_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get exporter by ID"""
    tenant_id = str(current_user.tenant_id)

    exporter = session.exec(
        select(CustomsExporter).where(
            CustomsExporter.id == exporter_id,
            CustomsExporter.tenant_id == tenant_id
        )
    ).first()

    if not exporter:
        raise HTTPException(status_code=404, detail="Exporter not found")

    return ExporterResponse(**exporter.model_dump())


@router.put("/exporters/{exporter_id}", response_model=ExporterResponse)
def update_exporter(
    exporter_id: str,
    payload: ExporterCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update exporter"""
    tenant_id = str(current_user.tenant_id)

    exporter = session.exec(
        select(CustomsExporter).where(
            CustomsExporter.id == exporter_id,
            CustomsExporter.tenant_id == tenant_id
        )
    ).first()

    if not exporter:
        raise HTTPException(status_code=404, detail="Exporter not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(exporter, key, value)

    exporter.updated_at = datetime.utcnow()
    exporter.updated_by = str(current_user.id)

    session.add(exporter)
    session.commit()
    session.refresh(exporter)

    return ExporterResponse(**exporter.model_dump())


@router.delete("/exporters/{exporter_id}")
def delete_exporter(
    exporter_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete exporter"""
    tenant_id = str(current_user.tenant_id)

    exporter = session.exec(
        select(CustomsExporter).where(
            CustomsExporter.id == exporter_id,
            CustomsExporter.tenant_id == tenant_id
        )
    ).first()

    if not exporter:
        raise HTTPException(status_code=404, detail="Exporter not found")

    session.delete(exporter)
    session.commit()

    return {"message": "Exporter deleted"}


# ============================================================
# IMPORTERS
# ============================================================

class ImporterCreate(BaseModel):
    seq_no: Optional[int] = None
    name: str
    postal_code: Optional[str] = None
    tax_code: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    address_line_3: Optional[str] = None
    address_line_4: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[str] = None
    fax: Optional[str] = None


class ImporterResponse(BaseModel):
    id: str
    seq_no: Optional[int]
    name: str
    postal_code: Optional[str]
    tax_code: Optional[str]
    address: Optional[str]
    phone: Optional[str]
    address_line_3: Optional[str]
    address_line_4: Optional[str]
    contact_name: Optional[str]
    email: Optional[str]
    fax: Optional[str]
    is_active: bool
    created_at: datetime


class ImporterSearchItem(BaseModel):
    """Simplified importer for dropdown search"""
    id: str
    name: str
    tax_code: Optional[str]
    address: Optional[str]
    postal_code: Optional[str]
    phone: Optional[str]


class ImporterListResponse(BaseModel):
    items: List[ImporterResponse]
    total: int
    page: int
    page_size: int


@router.get("/importers", response_model=ImporterListResponse)
def list_importers(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    sort_by: str = Query("seq_no", regex="^(seq_no|name|tax_code|created_at)$"),
    sort_order: str = Query("asc", regex="^(asc|desc)$"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List importers with pagination and search"""
    tenant_id = str(current_user.tenant_id)

    query = select(CustomsImporter).where(CustomsImporter.tenant_id == tenant_id)

    if search:
        query = query.where(
            or_(
                CustomsImporter.name.ilike(f"%{search}%"),
                CustomsImporter.tax_code.ilike(f"%{search}%"),
                CustomsImporter.address.ilike(f"%{search}%"),
            )
        )
    if is_active is not None:
        query = query.where(CustomsImporter.is_active == is_active)

    total = session.exec(select(func.count()).select_from(query.subquery())).one()

    # Sorting
    sort_column = getattr(CustomsImporter, sort_by)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    query = query.offset((page - 1) * page_size).limit(page_size)
    items = session.exec(query).all()

    return ImporterListResponse(
        items=[ImporterResponse(**i.model_dump()) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/importers/search", response_model=List[ImporterSearchItem])
def search_importers(
    q: str = Query(..., min_length=1, description="Search query for importer name or tax code"),
    limit: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Search importers by name or tax_code for dropdown autocomplete.
    """
    tenant_id = str(current_user.tenant_id)

    query = (
        select(CustomsImporter)
        .where(CustomsImporter.tenant_id == tenant_id)
        .where(CustomsImporter.is_active == True)
        .where(
            or_(
                CustomsImporter.name.ilike(f"%{q}%"),
                CustomsImporter.tax_code.ilike(f"%{q}%"),
            )
        )
        .order_by(CustomsImporter.name)
        .limit(limit)
    )

    items = session.exec(query).all()

    result = []
    for i in items:
        result.append(ImporterSearchItem(
            id=i.id,
            name=i.name,
            tax_code=i.tax_code,
            address=i.address,
            postal_code=i.postal_code,
            phone=i.phone,
        ))

    return result


@router.post("/importers", response_model=ImporterResponse)
def create_importer(
    payload: ImporterCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new importer"""
    tenant_id = str(current_user.tenant_id)

    importer = CustomsImporter(
        tenant_id=tenant_id,
        created_by=str(current_user.id),
        **payload.model_dump()
    )

    session.add(importer)
    session.commit()
    session.refresh(importer)

    return ImporterResponse(**importer.model_dump())


@router.get("/importers/{importer_id}", response_model=ImporterResponse)
def get_importer(
    importer_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get importer by ID"""
    tenant_id = str(current_user.tenant_id)

    importer = session.exec(
        select(CustomsImporter).where(
            CustomsImporter.id == importer_id,
            CustomsImporter.tenant_id == tenant_id
        )
    ).first()

    if not importer:
        raise HTTPException(status_code=404, detail="Importer not found")

    return ImporterResponse(**importer.model_dump())


@router.put("/importers/{importer_id}", response_model=ImporterResponse)
def update_importer(
    importer_id: str,
    payload: ImporterCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update importer"""
    tenant_id = str(current_user.tenant_id)

    importer = session.exec(
        select(CustomsImporter).where(
            CustomsImporter.id == importer_id,
            CustomsImporter.tenant_id == tenant_id
        )
    ).first()

    if not importer:
        raise HTTPException(status_code=404, detail="Importer not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(importer, key, value)

    importer.updated_at = datetime.utcnow()
    importer.updated_by = str(current_user.id)

    session.add(importer)
    session.commit()
    session.refresh(importer)

    return ImporterResponse(**importer.model_dump())


@router.delete("/importers/{importer_id}")
def delete_importer(
    importer_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete importer"""
    tenant_id = str(current_user.tenant_id)

    importer = session.exec(
        select(CustomsImporter).where(
            CustomsImporter.id == importer_id,
            CustomsImporter.tenant_id == tenant_id
        )
    ).first()

    if not importer:
        raise HTTPException(status_code=404, detail="Importer not found")

    session.delete(importer)
    session.commit()

    return {"message": "Importer deleted"}


# ============================================================
# LOCATIONS
# ============================================================

class LocationCreate(BaseModel):
    seq_no: Optional[int] = None
    code: str
    name: str
    location_type: Optional[str] = None
    address: Optional[str] = None
    province: Optional[str] = None
    country_code: Optional[str] = None
    customs_office_code: Optional[str] = None


class LocationResponse(BaseModel):
    id: str
    seq_no: Optional[int]
    code: str
    name: str
    location_type: Optional[str]
    address: Optional[str]
    province: Optional[str]
    country_code: Optional[str]
    customs_office_code: Optional[str]
    is_active: bool
    created_at: datetime


class LocationListResponse(BaseModel):
    items: List[LocationResponse]
    total: int
    page: int
    page_size: int


@router.get("/locations", response_model=LocationListResponse)
def list_locations(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    search: Optional[str] = None,
    location_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    sort_by: str = Query("seq_no", regex="^(seq_no|code|name|location_type|created_at)$"),
    sort_order: str = Query("asc", regex="^(asc|desc)$"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List locations with pagination and search"""
    tenant_id = str(current_user.tenant_id)

    query = select(CustomsLocation).where(CustomsLocation.tenant_id == tenant_id)

    if search:
        query = query.where(
            or_(
                CustomsLocation.code.ilike(f"%{search}%"),
                CustomsLocation.name.ilike(f"%{search}%"),
            )
        )
    if location_type:
        query = query.where(CustomsLocation.location_type == location_type)
    if is_active is not None:
        query = query.where(CustomsLocation.is_active == is_active)

    total = session.exec(select(func.count()).select_from(query.subquery())).one()

    # Sorting
    sort_column = getattr(CustomsLocation, sort_by)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    query = query.offset((page - 1) * page_size).limit(page_size)
    items = session.exec(query).all()

    return LocationListResponse(
        items=[LocationResponse(**l.model_dump()) for l in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/locations/types")
def get_location_types(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get distinct location types"""
    tenant_id = str(current_user.tenant_id)

    result = session.exec(
        select(CustomsLocation.location_type)
        .where(CustomsLocation.tenant_id == tenant_id)
        .where(CustomsLocation.location_type.isnot(None))
        .distinct()
    ).all()

    return [t for t in result if t]


@router.post("/locations", response_model=LocationResponse)
def create_location(
    payload: LocationCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new location"""
    tenant_id = str(current_user.tenant_id)

    # Check duplicate code
    existing = session.exec(
        select(CustomsLocation).where(
            CustomsLocation.tenant_id == tenant_id,
            CustomsLocation.code == payload.code.upper()
        )
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Location code already exists")

    location = CustomsLocation(
        tenant_id=tenant_id,
        code=payload.code.upper(),
        created_by=str(current_user.id),
        **{k: v for k, v in payload.model_dump().items() if k != 'code'}
    )

    session.add(location)
    session.commit()
    session.refresh(location)

    return LocationResponse(**location.model_dump())


@router.get("/locations/{location_id}", response_model=LocationResponse)
def get_location(
    location_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get location by ID"""
    tenant_id = str(current_user.tenant_id)

    location = session.exec(
        select(CustomsLocation).where(
            CustomsLocation.id == location_id,
            CustomsLocation.tenant_id == tenant_id
        )
    ).first()

    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    return LocationResponse(**location.model_dump())


@router.put("/locations/{location_id}", response_model=LocationResponse)
def update_location(
    location_id: str,
    payload: LocationCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update location"""
    tenant_id = str(current_user.tenant_id)

    location = session.exec(
        select(CustomsLocation).where(
            CustomsLocation.id == location_id,
            CustomsLocation.tenant_id == tenant_id
        )
    ).first()

    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        if key == 'code':
            value = value.upper()
        setattr(location, key, value)

    location.updated_at = datetime.utcnow()
    location.updated_by = str(current_user.id)

    session.add(location)
    session.commit()
    session.refresh(location)

    return LocationResponse(**location.model_dump())


@router.delete("/locations/{location_id}")
def delete_location(
    location_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete location"""
    tenant_id = str(current_user.tenant_id)

    location = session.exec(
        select(CustomsLocation).where(
            CustomsLocation.id == location_id,
            CustomsLocation.tenant_id == tenant_id
        )
    ).first()

    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    session.delete(location)
    session.commit()

    return {"message": "Location deleted"}


# ============================================================
# IMPORT FROM EXCEL
# ============================================================

@router.post("/import-from-path")
def import_from_path(
    file_path: str = Query(..., description="Path to Excel file on server"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Import customs partners from Excel file on server.
    For admin use only.
    """
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    try:
        xls = pd.ExcelFile(file_path)

        results = {
            "exporters": {"created": 0, "skipped": 0},
            "importers": {"created": 0, "skipped": 0},
            "locations": {"created": 0, "skipped": 0},
        }

        # Import Exporters (Người XK)
        if 'Người XK' in xls.sheet_names:
            df = pd.read_excel(xls, sheet_name='Người XK')
            for _, row in df.iterrows():
                name = str(row.get('Tên người Xuất Khẩu/Nhập Khẩu', '')).strip()
                if not name or name == 'nan':
                    continue

                exporter = CustomsExporter(
                    tenant_id=tenant_id,
                    seq_no=int(row.get('TT')) if pd.notna(row.get('TT')) else None,
                    name=name,
                    notes=str(row.get('Ghi chú', '')) if pd.notna(row.get('Ghi chú')) else None,
                    address_line_1=str(row.get('Địa chỉ đối tác 1', '')) if pd.notna(row.get('Địa chỉ đối tác 1')) else None,
                    address_line_2=str(row.get('Địa chỉ đối tác 2', '')) if pd.notna(row.get('Địa chỉ đối tác 2')) else None,
                    address_line_3=str(row.get('Địa chỉ đối tác 3', '')) if pd.notna(row.get('Địa chỉ đối tác 3')) else None,
                    address_line_4=str(row.get('Địa chỉ đối tác 4', '')) if pd.notna(row.get('Địa chỉ đối tác 4')) else None,
                    created_by=user_id,
                )
                session.add(exporter)
                results["exporters"]["created"] += 1

        # Import Importers (Người NK)
        if 'Người NK' in xls.sheet_names:
            df = pd.read_excel(xls, sheet_name='Người NK')
            for _, row in df.iterrows():
                name = str(row.get('Người Nhập Khẩu', '')).strip()
                if not name or name == 'nan':
                    continue

                importer = CustomsImporter(
                    tenant_id=tenant_id,
                    seq_no=int(row.get('TT')) if pd.notna(row.get('TT')) else None,
                    name=name,
                    postal_code=str(row.get('Mã Bưu Chính', '')) if pd.notna(row.get('Mã Bưu Chính')) else None,
                    tax_code=str(row.get('Mã', '')) if pd.notna(row.get('Mã')) else None,
                    address=str(row.get('Địa chỉ', '')) if pd.notna(row.get('Địa chỉ')) else None,
                    phone=str(row.get('Số điện thoại', '')) if pd.notna(row.get('Số điện thoại')) else None,
                    created_by=user_id,
                )
                session.add(importer)
                results["importers"]["created"] += 1

        # Import Locations (địa điểm)
        if 'địa điểm' in xls.sheet_names:
            df = pd.read_excel(xls, sheet_name='địa điểm')
            for _, row in df.iterrows():
                code = str(row.get('Địa điểm lưu kho', '')).strip()
                name = str(row.get('Tên địa điểm lưu kho', '')).strip()
                if not code or code == 'nan' or not name or name == 'nan':
                    continue

                # Check duplicate
                existing = session.exec(
                    select(CustomsLocation).where(
                        CustomsLocation.tenant_id == tenant_id,
                        CustomsLocation.code == code.upper()
                    )
                ).first()

                if existing:
                    results["locations"]["skipped"] += 1
                    continue

                location = CustomsLocation(
                    tenant_id=tenant_id,
                    seq_no=int(row.get('TT')) if pd.notna(row.get('TT')) else None,
                    code=code.upper(),
                    name=name,
                    location_type=str(row.get('Loại địa điểm', '')) if pd.notna(row.get('Loại địa điểm')) else None,
                    created_by=user_id,
                )
                session.add(location)
                results["locations"]["created"] += 1

        session.commit()

        return {
            "success": True,
            "message": "Import completed",
            "results": results,
        }

    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail=f"Import failed: {str(e)}")


@router.post("/import-excel")
async def import_from_excel(
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Import customs partners from Excel file.
    Expects 3 sheets: 'Người XK', 'Người NK', 'địa điểm'
    """
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    try:
        content = await file.read()
        xls = pd.ExcelFile(io.BytesIO(content))

        results = {
            "exporters": {"created": 0, "skipped": 0},
            "importers": {"created": 0, "skipped": 0},
            "locations": {"created": 0, "skipped": 0},
        }

        # Import Exporters (Người XK)
        if 'Người XK' in xls.sheet_names:
            df = pd.read_excel(xls, sheet_name='Người XK')
            for _, row in df.iterrows():
                name = str(row.get('Tên người Xuất Khẩu/Nhập Khẩu', '')).strip()
                if not name or name == 'nan':
                    continue

                exporter = CustomsExporter(
                    tenant_id=tenant_id,
                    seq_no=int(row.get('TT')) if pd.notna(row.get('TT')) else None,
                    name=name,
                    notes=str(row.get('Ghi chú', '')) if pd.notna(row.get('Ghi chú')) else None,
                    address_line_1=str(row.get('Địa chỉ đối tác 1', '')) if pd.notna(row.get('Địa chỉ đối tác 1')) else None,
                    address_line_2=str(row.get('Địa chỉ đối tác 2', '')) if pd.notna(row.get('Địa chỉ đối tác 2')) else None,
                    address_line_3=str(row.get('Địa chỉ đối tác 3', '')) if pd.notna(row.get('Địa chỉ đối tác 3')) else None,
                    address_line_4=str(row.get('Địa chỉ đối tác 4', '')) if pd.notna(row.get('Địa chỉ đối tác 4')) else None,
                    created_by=user_id,
                )
                session.add(exporter)
                results["exporters"]["created"] += 1

        # Import Importers (Người NK)
        if 'Người NK' in xls.sheet_names:
            df = pd.read_excel(xls, sheet_name='Người NK')
            for _, row in df.iterrows():
                name = str(row.get('Người Nhập Khẩu', '')).strip()
                if not name or name == 'nan':
                    continue

                importer = CustomsImporter(
                    tenant_id=tenant_id,
                    seq_no=int(row.get('TT')) if pd.notna(row.get('TT')) else None,
                    name=name,
                    postal_code=str(row.get('Mã Bưu Chính', '')) if pd.notna(row.get('Mã Bưu Chính')) else None,
                    tax_code=str(row.get('Mã', '')) if pd.notna(row.get('Mã')) else None,
                    address=str(row.get('Địa chỉ', '')) if pd.notna(row.get('Địa chỉ')) else None,
                    phone=str(row.get('Số điện thoại', '')) if pd.notna(row.get('Số điện thoại')) else None,
                    created_by=user_id,
                )
                session.add(importer)
                results["importers"]["created"] += 1

        # Import Locations (địa điểm)
        if 'địa điểm' in xls.sheet_names:
            df = pd.read_excel(xls, sheet_name='địa điểm')
            for _, row in df.iterrows():
                code = str(row.get('Địa điểm lưu kho', '')).strip()
                name = str(row.get('Tên địa điểm lưu kho', '')).strip()
                if not code or code == 'nan' or not name or name == 'nan':
                    continue

                # Check duplicate
                existing = session.exec(
                    select(CustomsLocation).where(
                        CustomsLocation.tenant_id == tenant_id,
                        CustomsLocation.code == code.upper()
                    )
                ).first()

                if existing:
                    results["locations"]["skipped"] += 1
                    continue

                location = CustomsLocation(
                    tenant_id=tenant_id,
                    seq_no=int(row.get('TT')) if pd.notna(row.get('TT')) else None,
                    code=code.upper(),
                    name=name,
                    location_type=str(row.get('Loại địa điểm', '')) if pd.notna(row.get('Loại địa điểm')) else None,
                    created_by=user_id,
                )
                session.add(location)
                results["locations"]["created"] += 1

        session.commit()

        return {
            "success": True,
            "message": "Import completed",
            "results": results,
        }

    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail=f"Import failed: {str(e)}")
