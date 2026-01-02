"""
MES - Manufacturing Execution System Routes
Module quản lý sản xuất
"""

from fastapi import APIRouter
from .bom import router as bom_router
from .workstations import router as workstations_router
from .routings import router as routings_router
from .production_orders import router as production_orders_router
from .work_orders import router as work_orders_router
from .quality import router as quality_router
from .maintenance import router as maintenance_router

router = APIRouter()

router.include_router(bom_router, prefix="/bom", tags=["MES - BOM"])
router.include_router(workstations_router, prefix="/workstations", tags=["MES - Workstations"])
router.include_router(routings_router, prefix="/routings", tags=["MES - Routings"])
router.include_router(production_orders_router, prefix="/production-orders", tags=["MES - Production Orders"])
router.include_router(work_orders_router, prefix="/work-orders", tags=["MES - Work Orders"])
router.include_router(quality_router, prefix="/quality", tags=["MES - Quality Control"])
router.include_router(maintenance_router, prefix="/maintenance", tags=["MES - Maintenance"])
