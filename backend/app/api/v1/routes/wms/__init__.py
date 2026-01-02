"""
WMS (Warehouse Management System) API Routes
"""
from fastapi import APIRouter

from app.api.v1.routes.wms.warehouses import router as warehouses_router
from app.api.v1.routes.wms.products import router as products_router
from app.api.v1.routes.wms.stock import router as stock_router
from app.api.v1.routes.wms.inbound import router as inbound_router
from app.api.v1.routes.wms.outbound import router as outbound_router
from app.api.v1.routes.wms.transfers import router as transfers_router
from app.api.v1.routes.wms.inventory import router as inventory_router
from app.api.v1.routes.wms.seed import router as seed_router

router = APIRouter()

router.include_router(warehouses_router, tags=["WMS - Warehouses"])
router.include_router(products_router, tags=["WMS - Products"])
router.include_router(stock_router, tags=["WMS - Stock"])
router.include_router(inbound_router, tags=["WMS - Inbound"])
router.include_router(outbound_router, tags=["WMS - Outbound"])
router.include_router(transfers_router, tags=["WMS - Transfers"])
router.include_router(inventory_router, tags=["WMS - Inventory"])
router.include_router(seed_router, tags=["WMS - Seed"])
