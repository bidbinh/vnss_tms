"""
WMS - Seed Data API Routes
Create sample data for testing
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from datetime import datetime, timedelta
from decimal import Decimal
import random

from app.db.session import get_session
from app.models import User
from app.models.wms import (
    Warehouse, WarehouseType, WarehouseZone, ZoneType, StorageLocation, LocationType,
    ProductCategory, Product, ProductUnit, ProductBarcode, ProductLot, LotStatus,
    StockLevel, StockMove, MoveType, MoveStatus,
    GoodsReceipt, GoodsReceiptLine, ReceiptType, ReceiptStatus,
    DeliveryOrder, DeliveryOrderLine, DeliveryType, DeliveryStatus,
)
from app.core.security import get_current_user

router = APIRouter()


@router.post("/seed")
def seed_wms_data(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Seed WMS sample data for testing"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    created = {
        "warehouses": 0,
        "zones": 0,
        "locations": 0,
        "categories": 0,
        "products": 0,
        "units": 0,
        "lots": 0,
        "stock_levels": 0,
        "goods_receipts": 0,
    }

    # ===================
    # 1. WAREHOUSES
    # ===================
    warehouse_data = [
        {
            "code": "WH-HCM-01",
            "name": "Kho Trung Tâm HCM",
            "warehouse_type": WarehouseType.MAIN.value,
            "address": "123 Nguyễn Văn Linh, Quận 7, TP.HCM",
            "city": "Hồ Chí Minh",
            "country": "Vietnam",
            "contact_name": "Nguyễn Văn A",
            "contact_phone": "0901234567",
            "total_area": Decimal("5000"),
            "usable_area": Decimal("4500"),
        },
        {
            "code": "WH-HN-01",
            "name": "Kho Hà Nội",
            "warehouse_type": WarehouseType.DISTRIBUTION.value,
            "address": "456 Phạm Văn Đồng, Cầu Giấy, Hà Nội",
            "city": "Hà Nội",
            "country": "Vietnam",
            "contact_name": "Trần Văn B",
            "contact_phone": "0912345678",
            "total_area": Decimal("3000"),
            "usable_area": Decimal("2700"),
        },
        {
            "code": "WH-DN-01",
            "name": "Kho Đà Nẵng",
            "warehouse_type": WarehouseType.DISTRIBUTION.value,
            "address": "789 Nguyễn Hữu Thọ, Hải Châu, Đà Nẵng",
            "city": "Đà Nẵng",
            "country": "Vietnam",
            "contact_name": "Lê Văn C",
            "contact_phone": "0923456789",
            "total_area": Decimal("2000"),
            "usable_area": Decimal("1800"),
        },
    ]

    warehouses = []
    for wh_data in warehouse_data:
        existing = session.exec(
            select(Warehouse).where(
                Warehouse.tenant_id == tenant_id,
                Warehouse.code == wh_data["code"]
            )
        ).first()
        if not existing:
            wh = Warehouse(
                tenant_id=tenant_id,
                **wh_data,
                is_active=True,
                created_by=user_id,
            )
            session.add(wh)
            session.flush()
            warehouses.append(wh)
            created["warehouses"] += 1
        else:
            warehouses.append(existing)

    # ===================
    # 2. ZONES & LOCATIONS
    # ===================
    zone_types = [
        (ZoneType.RECEIVING.value, "Khu nhận hàng", "RCV"),
        (ZoneType.STORAGE.value, "Khu lưu trữ A", "STR-A"),
        (ZoneType.STORAGE.value, "Khu lưu trữ B", "STR-B"),
        (ZoneType.PICKING.value, "Khu lấy hàng", "PCK"),
        (ZoneType.SHIPPING.value, "Khu xuất hàng", "SHP"),
    ]

    all_locations = []
    for wh in warehouses:
        for zone_type, zone_name, zone_prefix in zone_types:
            zone_code = f"{wh.code}-{zone_prefix}"
            existing_zone = session.exec(
                select(WarehouseZone).where(
                    WarehouseZone.tenant_id == tenant_id,
                    WarehouseZone.code == zone_code
                )
            ).first()

            if not existing_zone:
                zone = WarehouseZone(
                    tenant_id=tenant_id,
                    warehouse_id=str(wh.id),
                    code=zone_code,
                    name=f"{zone_name} - {wh.name}",
                    zone_type=zone_type,
                    is_active=True,
                    created_by=user_id,
                )
                session.add(zone)
                session.flush()
                created["zones"] += 1

                # Create locations for storage zones
                if zone_type == ZoneType.STORAGE.value:
                    for row in ["A", "B", "C"]:
                        for level in range(1, 4):
                            for position in range(1, 6):
                                loc_code = f"{zone_code}-{row}{level:02d}-{position:02d}"
                                loc = StorageLocation(
                                    tenant_id=tenant_id,
                                    zone_id=str(zone.id),
                                    code=loc_code,
                                    name=f"Vị trí {loc_code}",
                                    location_type=LocationType.RACK.value,
                                    row_number=row,
                                    level_number=level,
                                    position_number=position,
                                    max_weight=Decimal("500"),
                                    max_volume=Decimal("2"),
                                    is_active=True,
                                    created_by=user_id,
                                )
                                session.add(loc)
                                all_locations.append(loc)
                                created["locations"] += 1

    session.flush()

    # ===================
    # 3. PRODUCT CATEGORIES
    # ===================
    category_data = [
        ("CAT-ELEC", "Điện tử", None),
        ("CAT-ELEC-PHONE", "Điện thoại", "CAT-ELEC"),
        ("CAT-ELEC-LAPTOP", "Laptop", "CAT-ELEC"),
        ("CAT-ELEC-ACC", "Phụ kiện điện tử", "CAT-ELEC"),
        ("CAT-FMCG", "Hàng tiêu dùng nhanh", None),
        ("CAT-FMCG-FOOD", "Thực phẩm", "CAT-FMCG"),
        ("CAT-FMCG-BEV", "Đồ uống", "CAT-FMCG"),
        ("CAT-FURN", "Nội thất", None),
        ("CAT-FURN-OFFICE", "Văn phòng phẩm", "CAT-FURN"),
    ]

    categories = {}
    for code, name, parent_code in category_data:
        existing = session.exec(
            select(ProductCategory).where(
                ProductCategory.tenant_id == tenant_id,
                ProductCategory.code == code
            )
        ).first()
        if not existing:
            cat = ProductCategory(
                tenant_id=tenant_id,
                code=code,
                name=name,
                parent_id=categories.get(parent_code, {}).get("id") if parent_code else None,
                is_active=True,
                created_by=user_id,
            )
            session.add(cat)
            session.flush()
            categories[code] = {"id": str(cat.id), "obj": cat}
            created["categories"] += 1
        else:
            categories[code] = {"id": str(existing.id), "obj": existing}

    # ===================
    # 4. PRODUCTS
    # ===================
    product_data = [
        ("SKU-IP15PRO", "iPhone 15 Pro Max 256GB", "CAT-ELEC-PHONE", Decimal("29990000"), Decimal("32990000")),
        ("SKU-IP15", "iPhone 15 128GB", "CAT-ELEC-PHONE", Decimal("19990000"), Decimal("22990000")),
        ("SKU-SS24U", "Samsung Galaxy S24 Ultra", "CAT-ELEC-PHONE", Decimal("27990000"), Decimal("31990000")),
        ("SKU-MBA-M3", "MacBook Air M3 256GB", "CAT-ELEC-LAPTOP", Decimal("25990000"), Decimal("28990000")),
        ("SKU-MBP-M3", "MacBook Pro M3 Pro 512GB", "CAT-ELEC-LAPTOP", Decimal("42990000"), Decimal("47990000")),
        ("SKU-AW-S9", "Apple Watch Series 9", "CAT-ELEC-ACC", Decimal("9990000"), Decimal("11990000")),
        ("SKU-APD-PRO", "AirPods Pro 2", "CAT-ELEC-ACC", Decimal("5490000"), Decimal("6490000")),
        ("SKU-CHARGER", "Sạc nhanh 65W USB-C", "CAT-ELEC-ACC", Decimal("490000"), Decimal("690000")),
        ("SKU-COCA", "Coca Cola lon 330ml", "CAT-FMCG-BEV", Decimal("8000"), Decimal("12000")),
        ("SKU-PEPSI", "Pepsi lon 330ml", "CAT-FMCG-BEV", Decimal("8000"), Decimal("12000")),
        ("SKU-NUOC-SUOI", "Nước suối Lavie 500ml", "CAT-FMCG-BEV", Decimal("4000"), Decimal("6000")),
        ("SKU-MI-TOM", "Mì Hảo Hảo tôm chua cay", "CAT-FMCG-FOOD", Decimal("3500"), Decimal("5000")),
        ("SKU-BISCUIT", "Bánh quy Oreo 133g", "CAT-FMCG-FOOD", Decimal("15000"), Decimal("22000")),
        ("SKU-CHAIR", "Ghế văn phòng xoay", "CAT-FURN-OFFICE", Decimal("1200000"), Decimal("1590000")),
        ("SKU-DESK", "Bàn làm việc 1m2", "CAT-FURN-OFFICE", Decimal("2500000"), Decimal("3200000")),
    ]

    products = []
    for sku, name, cat_code, cost, price in product_data:
        existing = session.exec(
            select(Product).where(
                Product.tenant_id == tenant_id,
                Product.sku == sku
            )
        ).first()
        if not existing:
            prod = Product(
                tenant_id=tenant_id,
                sku=sku,
                name=name,
                category_id=categories.get(cat_code, {}).get("id"),
                unit_cost=cost,
                unit_price=price,
                reorder_point=10,
                reorder_qty=50,
                is_active=True,
                track_lots=sku.startswith("SKU-IP") or sku.startswith("SKU-SS") or sku.startswith("SKU-MB"),
                track_serials=sku.startswith("SKU-IP") or sku.startswith("SKU-SS") or sku.startswith("SKU-MB"),
                created_by=user_id,
            )
            session.add(prod)
            session.flush()
            products.append(prod)
            created["products"] += 1

            # Create base unit
            unit = ProductUnit(
                tenant_id=tenant_id,
                product_id=str(prod.id),
                unit_code="PCS",
                unit_name="Cái",
                conversion_factor=Decimal("1"),
                is_base_unit=True,
                created_by=user_id,
            )
            session.add(unit)
            created["units"] += 1

            # Add carton unit for FMCG
            if cat_code.startswith("CAT-FMCG"):
                carton = ProductUnit(
                    tenant_id=tenant_id,
                    product_id=str(prod.id),
                    unit_code="CTN",
                    unit_name="Thùng",
                    conversion_factor=Decimal("24"),
                    is_base_unit=False,
                    created_by=user_id,
                )
                session.add(carton)
                created["units"] += 1
        else:
            products.append(existing)

    session.flush()

    # ===================
    # 5. PRODUCT LOTS & STOCK
    # ===================
    if warehouses and products and all_locations:
        main_wh = warehouses[0]  # HCM warehouse

        for prod in products:
            if prod.track_lots:
                # Create lot
                lot_number = f"LOT-{datetime.now().strftime('%Y%m')}-{prod.sku[-4:]}"
                existing_lot = session.exec(
                    select(ProductLot).where(
                        ProductLot.tenant_id == tenant_id,
                        ProductLot.lot_number == lot_number
                    )
                ).first()

                if not existing_lot:
                    lot = ProductLot(
                        tenant_id=tenant_id,
                        product_id=str(prod.id),
                        lot_number=lot_number,
                        manufacture_date=datetime.now() - timedelta(days=30),
                        expiry_date=datetime.now() + timedelta(days=365) if "FMCG" in str(prod.category_id) else None,
                        status=LotStatus.AVAILABLE.value,
                        initial_qty=100,
                        current_qty=100,
                        created_by=user_id,
                    )
                    session.add(lot)
                    session.flush()
                    created["lots"] += 1

            # Create stock level in main warehouse
            if all_locations:
                loc = random.choice(all_locations)
                qty = random.randint(10, 100)

                existing_stock = session.exec(
                    select(StockLevel).where(
                        StockLevel.tenant_id == tenant_id,
                        StockLevel.product_id == str(prod.id),
                        StockLevel.warehouse_id == str(main_wh.id)
                    )
                ).first()

                if not existing_stock:
                    stock = StockLevel(
                        tenant_id=tenant_id,
                        product_id=str(prod.id),
                        warehouse_id=str(main_wh.id),
                        location_id=str(loc.id),
                        quantity_on_hand=Decimal(str(qty)),
                        quantity_available=Decimal(str(qty)),
                        quantity_reserved=Decimal("0"),
                        quantity_incoming=Decimal("0"),
                        quantity_outgoing=Decimal("0"),
                        unit_cost=prod.unit_cost,
                        total_value=prod.unit_cost * qty,
                        created_by=user_id,
                    )
                    session.add(stock)
                    created["stock_levels"] += 1

    session.flush()

    # ===================
    # 6. GOODS RECEIPTS
    # ===================
    if warehouses and products:
        main_wh = warehouses[0]

        for i in range(3):
            receipt_number = f"GR-{datetime.now().strftime('%Y%m%d')}-{i+1:04d}"
            existing = session.exec(
                select(GoodsReceipt).where(
                    GoodsReceipt.tenant_id == tenant_id,
                    GoodsReceipt.receipt_number == receipt_number
                )
            ).first()

            if not existing:
                receipt = GoodsReceipt(
                    tenant_id=tenant_id,
                    receipt_number=receipt_number,
                    receipt_type=ReceiptType.PURCHASE.value,
                    warehouse_id=str(main_wh.id),
                    supplier_name=f"Nhà cung cấp {i+1}",
                    expected_date=datetime.now() + timedelta(days=random.randint(1, 7)),
                    status=ReceiptStatus.DRAFT.value,
                    notes=f"Đơn nhập hàng mẫu số {i+1}",
                    created_by=user_id,
                )
                session.add(receipt)
                session.flush()

                # Add lines
                selected_products = random.sample(products, min(3, len(products)))
                total = Decimal("0")
                for j, prod in enumerate(selected_products):
                    qty = random.randint(10, 50)
                    line = GoodsReceiptLine(
                        tenant_id=tenant_id,
                        goods_receipt_id=str(receipt.id),
                        line_number=j + 1,
                        product_id=str(prod.id),
                        product_sku=prod.sku,
                        product_name=prod.name,
                        expected_qty=Decimal(str(qty)),
                        received_qty=Decimal("0"),
                        unit_cost=prod.unit_cost,
                        total_cost=prod.unit_cost * qty,
                        created_by=user_id,
                    )
                    session.add(line)
                    total += prod.unit_cost * qty

                receipt.total_amount = total
                session.add(receipt)
                created["goods_receipts"] += 1

    session.commit()

    return {
        "success": True,
        "message": "WMS sample data created successfully",
        "created": created,
    }


@router.delete("/wms/seed")
def delete_wms_data(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete all WMS sample data (for testing)"""
    tenant_id = str(current_user.tenant_id)

    deleted = {
        "stock_levels": 0,
        "stock_moves": 0,
        "goods_receipt_lines": 0,
        "goods_receipts": 0,
        "delivery_order_lines": 0,
        "delivery_orders": 0,
        "product_lots": 0,
        "product_units": 0,
        "product_barcodes": 0,
        "products": 0,
        "categories": 0,
        "locations": 0,
        "zones": 0,
        "warehouses": 0,
    }

    # Delete in reverse order of dependencies
    from app.models.wms import (
        StockLevel, StockMove, StockReservation,
        GoodsReceiptLine, GoodsReceipt, PutawayTask,
        DeliveryOrderLine, DeliveryOrder, PickingTask, PackingTask,
        StockTransferLine, StockTransfer,
        InventoryCountLine, InventoryCount, StockAdjustment,
        ProductLot, ProductUnit, ProductBarcode, Product, ProductCategory,
        StorageLocation, WarehouseZone, Warehouse,
    )

    # Stock data
    stock_levels = session.exec(select(StockLevel).where(StockLevel.tenant_id == tenant_id)).all()
    for item in stock_levels:
        session.delete(item)
        deleted["stock_levels"] += 1

    stock_moves = session.exec(select(StockMove).where(StockMove.tenant_id == tenant_id)).all()
    for item in stock_moves:
        session.delete(item)
        deleted["stock_moves"] += 1

    # Goods receipts
    gr_lines = session.exec(select(GoodsReceiptLine).where(GoodsReceiptLine.tenant_id == tenant_id)).all()
    for item in gr_lines:
        session.delete(item)
        deleted["goods_receipt_lines"] += 1

    receipts = session.exec(select(GoodsReceipt).where(GoodsReceipt.tenant_id == tenant_id)).all()
    for item in receipts:
        session.delete(item)
        deleted["goods_receipts"] += 1

    # Delivery orders
    do_lines = session.exec(select(DeliveryOrderLine).where(DeliveryOrderLine.tenant_id == tenant_id)).all()
    for item in do_lines:
        session.delete(item)
        deleted["delivery_order_lines"] += 1

    orders = session.exec(select(DeliveryOrder).where(DeliveryOrder.tenant_id == tenant_id)).all()
    for item in orders:
        session.delete(item)
        deleted["delivery_orders"] += 1

    # Products
    lots = session.exec(select(ProductLot).where(ProductLot.tenant_id == tenant_id)).all()
    for item in lots:
        session.delete(item)
        deleted["product_lots"] += 1

    units = session.exec(select(ProductUnit).where(ProductUnit.tenant_id == tenant_id)).all()
    for item in units:
        session.delete(item)
        deleted["product_units"] += 1

    barcodes = session.exec(select(ProductBarcode).where(ProductBarcode.tenant_id == tenant_id)).all()
    for item in barcodes:
        session.delete(item)
        deleted["product_barcodes"] += 1

    prods = session.exec(select(Product).where(Product.tenant_id == tenant_id)).all()
    for item in prods:
        session.delete(item)
        deleted["products"] += 1

    cats = session.exec(select(ProductCategory).where(ProductCategory.tenant_id == tenant_id)).all()
    for item in cats:
        session.delete(item)
        deleted["categories"] += 1

    # Warehouse structure
    locs = session.exec(select(StorageLocation).where(StorageLocation.tenant_id == tenant_id)).all()
    for item in locs:
        session.delete(item)
        deleted["locations"] += 1

    zones = session.exec(select(WarehouseZone).where(WarehouseZone.tenant_id == tenant_id)).all()
    for item in zones:
        session.delete(item)
        deleted["zones"] += 1

    warehouses = session.exec(select(Warehouse).where(Warehouse.tenant_id == tenant_id)).all()
    for item in warehouses:
        session.delete(item)
        deleted["warehouses"] += 1

    session.commit()

    return {
        "success": True,
        "message": "WMS data deleted successfully",
        "deleted": deleted,
    }
