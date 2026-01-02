"""
WMS - Products API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

from app.db.session import get_session
from app.models import User
from app.models.wms import (
    ProductCategory, Product, ProductUnit, ProductBarcode, ProductLot, LotStatus
)
from app.core.security import get_current_user

router = APIRouter()


# =====================
# PYDANTIC SCHEMAS
# =====================

class CategoryCreate(BaseModel):
    code: str
    name: str
    parent_id: Optional[str] = None
    requires_lot: bool = False
    requires_serial: bool = False
    requires_expiry: bool = False
    notes: Optional[str] = None


class ProductCreate(BaseModel):
    code: str
    name: str
    short_name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    track_lot: bool = False
    track_serial: bool = False
    track_expiry: bool = False
    weight_kg: Decimal = Decimal("0")
    length_cm: Decimal = Decimal("0")
    width_cm: Decimal = Decimal("0")
    height_cm: Decimal = Decimal("0")
    standard_cost: Decimal = Decimal("0")
    list_price: Decimal = Decimal("0")
    currency: str = "VND"
    min_stock: Decimal = Decimal("0")
    max_stock: Decimal = Decimal("0")
    reorder_point: Decimal = Decimal("0")
    reorder_quantity: Decimal = Decimal("0")
    lead_time_days: int = 0
    default_vendor_id: Optional[str] = None
    notes: Optional[str] = None


class UnitCreate(BaseModel):
    product_id: str
    code: str
    name: str
    is_base_unit: bool = False
    conversion_factor: Decimal = Decimal("1")
    weight_kg: Decimal = Decimal("0")
    barcode: Optional[str] = None


class LotCreate(BaseModel):
    product_id: str
    lot_number: str
    serial_number: Optional[str] = None
    production_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    supplier_lot_number: Optional[str] = None
    supplier_id: Optional[str] = None
    initial_quantity: Decimal = Decimal("0")
    unit_cost: Decimal = Decimal("0")
    notes: Optional[str] = None


# =====================
# CATEGORIES
# =====================

@router.get("/categories")
def list_categories(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    parent_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(100, ge=1, le=500),
):
    """List product categories"""
    tenant_id = str(current_user.tenant_id)

    query = select(ProductCategory).where(ProductCategory.tenant_id == tenant_id)

    if parent_id:
        query = query.where(ProductCategory.parent_id == parent_id)
    elif parent_id == "":
        query = query.where(ProductCategory.parent_id == None)

    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    query = query.order_by(ProductCategory.code)
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.post("/categories")
def create_category(
    payload: CategoryCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a product category"""
    tenant_id = str(current_user.tenant_id)

    level = 1
    if payload.parent_id:
        parent = session.get(ProductCategory, payload.parent_id)
        if parent:
            level = parent.level + 1

    category = ProductCategory(
        tenant_id=tenant_id,
        **payload.model_dump(),
        level=level,
        created_by=str(current_user.id),
    )

    session.add(category)
    session.commit()
    session.refresh(category)

    return category.model_dump()


# =====================
# PRODUCTS
# =====================

@router.get("/products")
def list_products(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    category_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
):
    """List products"""
    tenant_id = str(current_user.tenant_id)

    query = select(Product).where(Product.tenant_id == tenant_id)

    if category_id:
        query = query.where(Product.category_id == category_id)

    if search:
        query = query.where(
            (Product.code.ilike(f"%{search}%")) |
            (Product.name.ilike(f"%{search}%"))
        )

    if is_active is not None:
        query = query.where(Product.is_active == is_active)

    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    query = query.order_by(Product.code)
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.post("/products")
def create_product(
    payload: ProductCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a product"""
    tenant_id = str(current_user.tenant_id)

    existing = session.exec(
        select(Product).where(
            Product.tenant_id == tenant_id,
            Product.code == payload.code
        )
    ).first()
    if existing:
        raise HTTPException(400, f"Product code '{payload.code}' already exists")

    # Calculate volume
    volume_cbm = (payload.length_cm * payload.width_cm * payload.height_cm) / Decimal("1000000")

    product = Product(
        tenant_id=tenant_id,
        **payload.model_dump(),
        volume_cbm=volume_cbm,
        created_by=str(current_user.id),
    )

    session.add(product)
    session.commit()
    session.refresh(product)

    return product.model_dump()


@router.get("/products/{product_id}")
def get_product(
    product_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get product with units and lots"""
    tenant_id = str(current_user.tenant_id)

    product = session.get(Product, product_id)
    if not product or str(product.tenant_id) != tenant_id:
        raise HTTPException(404, "Product not found")

    units = session.exec(
        select(ProductUnit).where(
            ProductUnit.tenant_id == tenant_id,
            ProductUnit.product_id == product_id
        )
    ).all()

    lots = session.exec(
        select(ProductLot).where(
            ProductLot.tenant_id == tenant_id,
            ProductLot.product_id == product_id,
            ProductLot.status != LotStatus.EXPIRED.value
        ).order_by(ProductLot.expiry_date)
    ).all()

    result = product.model_dump()
    result["units"] = [u.model_dump() for u in units]
    result["lots"] = [lot.model_dump() for lot in lots]

    return result


@router.put("/products/{product_id}")
def update_product(
    product_id: str,
    payload: ProductCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a product"""
    tenant_id = str(current_user.tenant_id)

    product = session.get(Product, product_id)
    if not product or str(product.tenant_id) != tenant_id:
        raise HTTPException(404, "Product not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, key, value)

    product.volume_cbm = (product.length_cm * product.width_cm * product.height_cm) / Decimal("1000000")
    product.updated_at = datetime.utcnow()

    session.add(product)
    session.commit()
    session.refresh(product)

    return product.model_dump()


# =====================
# UNITS
# =====================

@router.post("/units")
def create_unit(
    payload: UnitCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a product unit"""
    tenant_id = str(current_user.tenant_id)

    unit = ProductUnit(
        tenant_id=tenant_id,
        **payload.model_dump(),
        created_by=str(current_user.id),
    )

    session.add(unit)
    session.commit()
    session.refresh(unit)

    # Update product base unit if this is base
    if payload.is_base_unit:
        product = session.get(Product, payload.product_id)
        if product:
            product.base_unit_id = str(unit.id)
            session.add(product)
            session.commit()

    return unit.model_dump()


@router.get("/units")
def list_units(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    product_id: str = Query(...),
):
    """List units for a product"""
    tenant_id = str(current_user.tenant_id)

    units = session.exec(
        select(ProductUnit).where(
            ProductUnit.tenant_id == tenant_id,
            ProductUnit.product_id == product_id
        )
    ).all()

    return {"items": [u.model_dump() for u in units]}


# =====================
# LOTS
# =====================

@router.get("/lots")
def list_lots(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    product_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    expiring_soon: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
):
    """List product lots"""
    tenant_id = str(current_user.tenant_id)

    query = select(ProductLot).where(ProductLot.tenant_id == tenant_id)

    if product_id:
        query = query.where(ProductLot.product_id == product_id)

    if status:
        query = query.where(ProductLot.status == status)

    if expiring_soon:
        from datetime import timedelta
        expiry_threshold = datetime.utcnow() + timedelta(days=30)
        query = query.where(
            ProductLot.expiry_date != None,
            ProductLot.expiry_date <= expiry_threshold
        )

    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    query = query.order_by(ProductLot.expiry_date)
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.post("/lots")
def create_lot(
    payload: LotCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a product lot"""
    tenant_id = str(current_user.tenant_id)

    existing = session.exec(
        select(ProductLot).where(
            ProductLot.tenant_id == tenant_id,
            ProductLot.product_id == payload.product_id,
            ProductLot.lot_number == payload.lot_number
        )
    ).first()
    if existing:
        raise HTTPException(400, f"Lot number '{payload.lot_number}' already exists for this product")

    lot = ProductLot(
        tenant_id=tenant_id,
        **payload.model_dump(),
        current_quantity=payload.initial_quantity,
        status=LotStatus.AVAILABLE.value,
        received_date=datetime.utcnow(),
        created_by=str(current_user.id),
    )

    session.add(lot)
    session.commit()
    session.refresh(lot)

    return lot.model_dump()


@router.put("/lots/{lot_id}/status")
def update_lot_status(
    lot_id: str,
    status: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update lot status"""
    tenant_id = str(current_user.tenant_id)

    lot = session.get(ProductLot, lot_id)
    if not lot or str(lot.tenant_id) != tenant_id:
        raise HTTPException(404, "Lot not found")

    lot.status = status
    lot.updated_at = datetime.utcnow()

    session.add(lot)
    session.commit()
    session.refresh(lot)

    return lot.model_dump()
