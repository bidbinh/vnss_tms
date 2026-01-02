"""
Accounting - Fixed Assets API Routes
Quản lý tài sản cố định
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from dateutil.relativedelta import relativedelta

from app.db.session import get_session
from app.models import User
from app.models.accounting import (
    FixedAssetCategory, FixedAsset, AssetCategory, AssetStatus, DepreciationMethod,
    AssetDepreciation, AssetRevaluation, AssetDisposal, DisposalType, AssetTransfer, AssetMaintenance
)
from app.core.security import get_current_user

router = APIRouter()


# =====================
# PYDANTIC SCHEMAS
# =====================

class AssetCategoryCreate(BaseModel):
    code: str
    name: str
    parent_id: Optional[str] = None
    depreciation_method: str = DepreciationMethod.STRAIGHT_LINE.value
    default_useful_life: int = 60  # months
    asset_account_id: Optional[str] = None
    depreciation_account_id: Optional[str] = None
    expense_account_id: Optional[str] = None
    notes: Optional[str] = None


class FixedAssetCreate(BaseModel):
    asset_code: str
    name: str
    description: Optional[str] = None
    category_id: str
    acquisition_date: datetime
    acquisition_cost: Decimal
    salvage_value: Decimal = Decimal("0")
    useful_life_months: int
    depreciation_method: str = DepreciationMethod.STRAIGHT_LINE.value
    location: Optional[str] = None
    department_id: Optional[str] = None
    responsible_person_id: Optional[str] = None
    serial_number: Optional[str] = None
    vendor_id: Optional[str] = None
    invoice_number: Optional[str] = None
    warranty_expiry: Optional[datetime] = None
    notes: Optional[str] = None


class FixedAssetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    department_id: Optional[str] = None
    responsible_person_id: Optional[str] = None
    notes: Optional[str] = None


class AssetRevaluationCreate(BaseModel):
    asset_id: str
    revaluation_date: datetime
    new_value: Decimal
    reason: str
    appraiser: Optional[str] = None
    notes: Optional[str] = None


class AssetDisposalCreate(BaseModel):
    asset_id: str
    disposal_date: datetime
    disposal_type: str  # SALE, SCRAP, DONATION, LOSS
    disposal_value: Decimal = Decimal("0")
    buyer_name: Optional[str] = None
    reason: str
    notes: Optional[str] = None


class AssetTransferCreate(BaseModel):
    asset_id: str
    transfer_date: datetime
    from_location: Optional[str] = None
    to_location: Optional[str] = None
    from_department_id: Optional[str] = None
    to_department_id: Optional[str] = None
    from_person_id: Optional[str] = None
    to_person_id: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None


class AssetMaintenanceCreate(BaseModel):
    asset_id: str
    maintenance_date: datetime
    maintenance_type: str  # PREVENTIVE, CORRECTIVE, UPGRADE
    description: str
    cost: Decimal = Decimal("0")
    vendor_id: Optional[str] = None
    next_maintenance_date: Optional[datetime] = None
    notes: Optional[str] = None


# =====================
# ASSET CATEGORIES
# =====================

@router.get("/asset-categories")
def list_asset_categories(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    is_active: Optional[bool] = Query(None),
):
    """List all asset categories"""
    tenant_id = str(current_user.tenant_id)

    query = select(FixedAssetCategory).where(FixedAssetCategory.tenant_id == tenant_id)

    if is_active is not None:
        query = query.where(FixedAssetCategory.is_active == is_active)

    query = query.order_by(FixedAssetCategory.code)

    categories = session.exec(query).all()

    return {"items": [c.model_dump() for c in categories]}


@router.post("/asset-categories")
def create_asset_category(
    payload: AssetCategoryCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create an asset category"""
    tenant_id = str(current_user.tenant_id)

    # Check unique code
    existing = session.exec(
        select(FixedAssetCategory).where(
            FixedAssetCategory.tenant_id == tenant_id,
            FixedAssetCategory.code == payload.code
        )
    ).first()
    if existing:
        raise HTTPException(400, f"Category code '{payload.code}' already exists")

    category = FixedAssetCategory(
        tenant_id=tenant_id,
        **payload.model_dump(),
        is_active=True,
        created_by=str(current_user.id),
    )

    session.add(category)
    session.commit()
    session.refresh(category)

    return category


@router.get("/asset-categories/{category_id}")
def get_asset_category(
    category_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get asset category by ID"""
    tenant_id = str(current_user.tenant_id)

    category = session.get(FixedAssetCategory, category_id)
    if not category or str(category.tenant_id) != tenant_id:
        raise HTTPException(404, "Category not found")

    return category.model_dump()


# =====================
# FIXED ASSETS
# =====================

@router.get("/fixed-assets")
def list_fixed_assets(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    category_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    """List fixed assets"""
    tenant_id = str(current_user.tenant_id)

    query = select(FixedAsset).where(FixedAsset.tenant_id == tenant_id)

    if category_id:
        query = query.where(FixedAsset.category_id == category_id)

    if status:
        query = query.where(FixedAsset.status == status)

    if department_id:
        query = query.where(FixedAsset.department_id == department_id)

    if search:
        query = query.where(
            FixedAsset.asset_code.ilike(f"%{search}%") |
            FixedAsset.name.ilike(f"%{search}%") |
            FixedAsset.serial_number.ilike(f"%{search}%")
        )

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(FixedAsset.asset_code)
    query = query.offset(offset).limit(page_size)

    assets = session.exec(query).all()

    return {
        "items": [a.model_dump() for a in assets],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("/fixed-assets")
def create_fixed_asset(
    payload: FixedAssetCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new fixed asset"""
    tenant_id = str(current_user.tenant_id)

    # Check unique asset code
    existing = session.exec(
        select(FixedAsset).where(
            FixedAsset.tenant_id == tenant_id,
            FixedAsset.asset_code == payload.asset_code
        )
    ).first()
    if existing:
        raise HTTPException(400, f"Asset code '{payload.asset_code}' already exists")

    # Validate category
    category = session.get(FixedAssetCategory, payload.category_id)
    if not category or str(category.tenant_id) != tenant_id:
        raise HTTPException(400, "Invalid category_id")

    # Calculate depreciation
    depreciable_value = payload.acquisition_cost - payload.salvage_value
    monthly_depreciation = depreciable_value / payload.useful_life_months if payload.useful_life_months > 0 else Decimal("0")

    # Calculate depreciation start date (usually next month)
    depreciation_start = payload.acquisition_date + relativedelta(months=1)
    depreciation_start = depreciation_start.replace(day=1)

    asset = FixedAsset(
        tenant_id=tenant_id,
        **payload.model_dump(),
        current_value=payload.acquisition_cost,
        book_value=payload.acquisition_cost,
        accumulated_depreciation=Decimal("0"),
        monthly_depreciation=monthly_depreciation,
        depreciation_start_date=depreciation_start,
        status=AssetStatus.ACTIVE.value,
        created_by=str(current_user.id),
    )

    session.add(asset)
    session.commit()
    session.refresh(asset)

    return asset


@router.get("/fixed-assets/{asset_id}")
def get_fixed_asset(
    asset_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get fixed asset with depreciation history"""
    tenant_id = str(current_user.tenant_id)

    asset = session.get(FixedAsset, asset_id)
    if not asset or str(asset.tenant_id) != tenant_id:
        raise HTTPException(404, "Asset not found")

    # Get depreciation records
    depreciations = session.exec(
        select(AssetDepreciation).where(AssetDepreciation.asset_id == asset_id)
        .order_by(AssetDepreciation.depreciation_date.desc())
        .limit(24)  # Last 24 months
    ).all()

    # Get maintenance records
    maintenances = session.exec(
        select(AssetMaintenance).where(AssetMaintenance.asset_id == asset_id)
        .order_by(AssetMaintenance.maintenance_date.desc())
        .limit(10)
    ).all()

    return {
        **asset.model_dump(),
        "depreciation_history": [d.model_dump() for d in depreciations],
        "maintenance_history": [m.model_dump() for m in maintenances],
    }


@router.put("/fixed-assets/{asset_id}")
def update_fixed_asset(
    asset_id: str,
    payload: FixedAssetUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a fixed asset"""
    tenant_id = str(current_user.tenant_id)

    asset = session.get(FixedAsset, asset_id)
    if not asset or str(asset.tenant_id) != tenant_id:
        raise HTTPException(404, "Asset not found")

    if asset.status == AssetStatus.DISPOSED.value:
        raise HTTPException(400, "Cannot update disposed asset")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(asset, key, value)

    asset.updated_at = datetime.utcnow()

    session.add(asset)
    session.commit()
    session.refresh(asset)

    return asset


# =====================
# DEPRECIATION
# =====================

@router.post("/fixed-assets/{asset_id}/depreciate")
def run_depreciation(
    asset_id: str,
    depreciation_date: datetime = Query(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Run depreciation for an asset"""
    tenant_id = str(current_user.tenant_id)

    asset = session.get(FixedAsset, asset_id)
    if not asset or str(asset.tenant_id) != tenant_id:
        raise HTTPException(404, "Asset not found")

    if asset.status != AssetStatus.ACTIVE.value:
        raise HTTPException(400, f"Cannot depreciate asset with status {asset.status}")

    if asset.book_value <= asset.salvage_value:
        raise HTTPException(400, "Asset is fully depreciated")

    # Check if already depreciated for this period
    period_start = depreciation_date.replace(day=1)
    period_end = period_start + relativedelta(months=1, days=-1)

    existing = session.exec(
        select(AssetDepreciation).where(
            AssetDepreciation.asset_id == asset_id,
            AssetDepreciation.depreciation_date >= period_start,
            AssetDepreciation.depreciation_date <= period_end,
        )
    ).first()
    if existing:
        raise HTTPException(400, f"Already depreciated for {period_start.strftime('%m/%Y')}")

    # Calculate depreciation amount
    if asset.depreciation_method == DepreciationMethod.STRAIGHT_LINE.value:
        amount = asset.monthly_depreciation
    elif asset.depreciation_method == DepreciationMethod.DECLINING.value:
        # Declining balance method
        rate = Decimal("2") / asset.useful_life_months
        amount = asset.book_value * rate
    elif asset.depreciation_method == DepreciationMethod.DOUBLE_DECLINING.value:
        rate = Decimal("4") / asset.useful_life_months
        amount = asset.book_value * rate
    else:
        amount = asset.monthly_depreciation

    # Don't depreciate below salvage value
    max_depreciation = asset.book_value - asset.salvage_value
    amount = min(amount, max_depreciation)

    if amount <= 0:
        raise HTTPException(400, "No depreciation amount to record")

    # Create depreciation record
    depreciation = AssetDepreciation(
        tenant_id=tenant_id,
        asset_id=asset_id,
        depreciation_date=depreciation_date,
        period_start=period_start,
        period_end=period_end,
        depreciation_amount=amount,
        accumulated_before=asset.accumulated_depreciation,
        accumulated_after=asset.accumulated_depreciation + amount,
        book_value_after=asset.book_value - amount,
        depreciation_method=asset.depreciation_method,
        created_by=str(current_user.id),
    )

    session.add(depreciation)

    # Update asset
    asset.accumulated_depreciation += amount
    asset.book_value -= amount
    asset.last_depreciation_date = depreciation_date
    asset.updated_at = datetime.utcnow()

    # Check if fully depreciated
    if asset.book_value <= asset.salvage_value:
        asset.status = AssetStatus.FULLY_DEPRECIATED.value

    session.add(asset)
    session.commit()
    session.refresh(depreciation)

    return {
        "success": True,
        "depreciation": depreciation.model_dump(),
        "asset_book_value": float(asset.book_value),
    }


@router.post("/run-bulk-depreciation")
def run_bulk_depreciation(
    depreciation_date: datetime = Query(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Run depreciation for all active assets"""
    tenant_id = str(current_user.tenant_id)

    # Get all active assets
    assets = session.exec(
        select(FixedAsset).where(
            FixedAsset.tenant_id == tenant_id,
            FixedAsset.status == AssetStatus.ACTIVE.value,
            FixedAsset.book_value > FixedAsset.salvage_value,
        )
    ).all()

    period_start = depreciation_date.replace(day=1)
    period_end = period_start + relativedelta(months=1, days=-1)

    processed = 0
    skipped = 0
    total_amount = Decimal("0")

    for asset in assets:
        # Check if already depreciated
        existing = session.exec(
            select(AssetDepreciation).where(
                AssetDepreciation.asset_id == asset.id,
                AssetDepreciation.depreciation_date >= period_start,
                AssetDepreciation.depreciation_date <= period_end,
            )
        ).first()
        if existing:
            skipped += 1
            continue

        # Calculate amount
        amount = asset.monthly_depreciation
        max_depreciation = asset.book_value - asset.salvage_value
        amount = min(amount, max_depreciation)

        if amount <= 0:
            skipped += 1
            continue

        # Create record
        depreciation = AssetDepreciation(
            tenant_id=tenant_id,
            asset_id=asset.id,
            depreciation_date=depreciation_date,
            period_start=period_start,
            period_end=period_end,
            depreciation_amount=amount,
            accumulated_before=asset.accumulated_depreciation,
            accumulated_after=asset.accumulated_depreciation + amount,
            book_value_after=asset.book_value - amount,
            depreciation_method=asset.depreciation_method,
            created_by=str(current_user.id),
        )
        session.add(depreciation)

        # Update asset
        asset.accumulated_depreciation += amount
        asset.book_value -= amount
        asset.last_depreciation_date = depreciation_date
        asset.updated_at = datetime.utcnow()

        if asset.book_value <= asset.salvage_value:
            asset.status = AssetStatus.FULLY_DEPRECIATED.value

        session.add(asset)

        processed += 1
        total_amount += amount

    session.commit()

    return {
        "success": True,
        "period": f"{period_start.strftime('%m/%Y')}",
        "processed": processed,
        "skipped": skipped,
        "total_depreciation": float(total_amount),
    }


# =====================
# REVALUATION
# =====================

@router.get("/asset-revaluations")
def list_revaluations(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    asset_id: Optional[str] = Query(None),
):
    """List asset revaluations"""
    tenant_id = str(current_user.tenant_id)

    query = select(AssetRevaluation).where(AssetRevaluation.tenant_id == tenant_id)

    if asset_id:
        query = query.where(AssetRevaluation.asset_id == asset_id)

    query = query.order_by(AssetRevaluation.revaluation_date.desc())

    revaluations = session.exec(query).all()

    return {"items": [r.model_dump() for r in revaluations]}


@router.post("/asset-revaluations")
def create_revaluation(
    payload: AssetRevaluationCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Revalue an asset"""
    tenant_id = str(current_user.tenant_id)

    asset = session.get(FixedAsset, payload.asset_id)
    if not asset or str(asset.tenant_id) != tenant_id:
        raise HTTPException(404, "Asset not found")

    if asset.status == AssetStatus.DISPOSED.value:
        raise HTTPException(400, "Cannot revalue disposed asset")

    old_value = asset.current_value
    adjustment = payload.new_value - old_value

    revaluation = AssetRevaluation(
        tenant_id=tenant_id,
        asset_id=payload.asset_id,
        revaluation_date=payload.revaluation_date,
        old_value=old_value,
        new_value=payload.new_value,
        adjustment_amount=adjustment,
        reason=payload.reason,
        appraiser=payload.appraiser,
        notes=payload.notes,
        created_by=str(current_user.id),
    )

    session.add(revaluation)

    # Update asset
    asset.current_value = payload.new_value
    asset.book_value = payload.new_value - asset.accumulated_depreciation
    asset.updated_at = datetime.utcnow()

    session.add(asset)
    session.commit()
    session.refresh(revaluation)

    return revaluation


# =====================
# DISPOSAL
# =====================

@router.post("/asset-disposals")
def dispose_asset(
    payload: AssetDisposalCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Dispose of an asset"""
    tenant_id = str(current_user.tenant_id)

    asset = session.get(FixedAsset, payload.asset_id)
    if not asset or str(asset.tenant_id) != tenant_id:
        raise HTTPException(404, "Asset not found")

    if asset.status == AssetStatus.DISPOSED.value:
        raise HTTPException(400, "Asset already disposed")

    # Calculate gain/loss
    gain_loss = payload.disposal_value - asset.book_value

    disposal = AssetDisposal(
        tenant_id=tenant_id,
        asset_id=payload.asset_id,
        disposal_date=payload.disposal_date,
        disposal_type=payload.disposal_type,
        disposal_value=payload.disposal_value,
        book_value_at_disposal=asset.book_value,
        accumulated_depreciation=asset.accumulated_depreciation,
        gain_loss=gain_loss,
        buyer_name=payload.buyer_name,
        reason=payload.reason,
        notes=payload.notes,
        created_by=str(current_user.id),
    )

    session.add(disposal)

    # Update asset status
    asset.status = AssetStatus.DISPOSED.value
    asset.disposal_date = payload.disposal_date
    asset.updated_at = datetime.utcnow()

    session.add(asset)
    session.commit()
    session.refresh(disposal)

    return {
        "success": True,
        "disposal": disposal.model_dump(),
        "gain_loss": float(gain_loss),
    }


# =====================
# TRANSFERS
# =====================

@router.post("/asset-transfers")
def transfer_asset(
    payload: AssetTransferCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Transfer an asset to new location/department/person"""
    tenant_id = str(current_user.tenant_id)

    asset = session.get(FixedAsset, payload.asset_id)
    if not asset or str(asset.tenant_id) != tenant_id:
        raise HTTPException(404, "Asset not found")

    if asset.status == AssetStatus.DISPOSED.value:
        raise HTTPException(400, "Cannot transfer disposed asset")

    transfer = AssetTransfer(
        tenant_id=tenant_id,
        asset_id=payload.asset_id,
        transfer_date=payload.transfer_date,
        from_location=payload.from_location or asset.location,
        to_location=payload.to_location,
        from_department_id=payload.from_department_id or asset.department_id,
        to_department_id=payload.to_department_id,
        from_person_id=payload.from_person_id or asset.responsible_person_id,
        to_person_id=payload.to_person_id,
        reason=payload.reason,
        notes=payload.notes,
        created_by=str(current_user.id),
    )

    session.add(transfer)

    # Update asset
    if payload.to_location:
        asset.location = payload.to_location
    if payload.to_department_id:
        asset.department_id = payload.to_department_id
    if payload.to_person_id:
        asset.responsible_person_id = payload.to_person_id

    asset.updated_at = datetime.utcnow()

    session.add(asset)
    session.commit()
    session.refresh(transfer)

    return transfer


# =====================
# MAINTENANCE
# =====================

@router.get("/asset-maintenances")
def list_maintenances(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    asset_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    """List asset maintenances"""
    tenant_id = str(current_user.tenant_id)

    query = select(AssetMaintenance).where(AssetMaintenance.tenant_id == tenant_id)

    if asset_id:
        query = query.where(AssetMaintenance.asset_id == asset_id)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(AssetMaintenance.maintenance_date.desc())
    query = query.offset(offset).limit(page_size)

    maintenances = session.exec(query).all()

    return {
        "items": [m.model_dump() for m in maintenances],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("/asset-maintenances")
def create_maintenance(
    payload: AssetMaintenanceCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Record asset maintenance"""
    tenant_id = str(current_user.tenant_id)

    asset = session.get(FixedAsset, payload.asset_id)
    if not asset or str(asset.tenant_id) != tenant_id:
        raise HTTPException(404, "Asset not found")

    maintenance = AssetMaintenance(
        tenant_id=tenant_id,
        **payload.model_dump(),
        created_by=str(current_user.id),
    )

    session.add(maintenance)

    # Update asset next maintenance date if provided
    if payload.next_maintenance_date:
        asset.next_maintenance_date = payload.next_maintenance_date
        asset.updated_at = datetime.utcnow()
        session.add(asset)

    session.commit()
    session.refresh(maintenance)

    return maintenance


# =====================
# REPORTS
# =====================

@router.get("/asset-summary")
def get_asset_summary(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get asset summary report"""
    tenant_id = str(current_user.tenant_id)

    # Count by status
    status_counts = {}
    for status in AssetStatus:
        count = session.exec(
            select(func.count()).select_from(FixedAsset).where(
                FixedAsset.tenant_id == tenant_id,
                FixedAsset.status == status.value
            )
        ).one()
        status_counts[status.value] = count

    # Total values
    totals = session.exec(
        select(
            func.sum(FixedAsset.original_cost),
            func.sum(FixedAsset.accumulated_depreciation),
            func.sum(FixedAsset.book_value),
        ).where(
            FixedAsset.tenant_id == tenant_id,
            FixedAsset.status != AssetStatus.DISPOSED.value,
        )
    ).one()

    # By category
    category_summary = session.exec(
        select(
            FixedAsset.category_id,
            func.count(),
            func.sum(FixedAsset.original_cost),
            func.sum(FixedAsset.book_value),
        ).where(
            FixedAsset.tenant_id == tenant_id,
            FixedAsset.status != AssetStatus.DISPOSED.value,
        ).group_by(FixedAsset.category_id)
    ).all()

    # Get total assets count
    total_assets = session.exec(
        select(func.count()).select_from(FixedAsset).where(
            FixedAsset.tenant_id == tenant_id,
            FixedAsset.status != AssetStatus.DISPOSED.value,
        )
    ).one()

    # Get category names
    category_names = {}
    for row in category_summary:
        if row[0]:
            cat = session.get(FixedAssetCategory, row[0])
            if cat:
                category_names[row[0]] = cat.name

    return {
        "total_assets": total_assets,
        "total_cost": float(totals[0] or 0),
        "total_accumulated": float(totals[1] or 0),
        "total_book_value": float(totals[2] or 0),
        "status_counts": status_counts,
        "by_category": [
            {
                "category_id": row[0],
                "category_name": category_names.get(row[0], "Chưa phân loại"),
                "count": row[1],
                "total_cost": float(row[2] or 0),
                "total_book_value": float(row[3] or 0),
            }
            for row in category_summary
        ]
    }
