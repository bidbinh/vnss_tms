"""
FMS - Forwarding Management System API Routes
"""
from fastapi import APIRouter

from .shipments import router as shipments_router
from .containers import router as containers_router
from .bills_of_lading import router as bl_router
from .airway_bills import router as awb_router
from .customs import router as customs_router
from .quotations import router as quotations_router
from .agents import router as agents_router
from .rates import router as rates_router
from .tracking import router as tracking_router
from .consolidations import router as consolidations_router
from .documents import router as documents_router
from .seed import router as seed_router

router = APIRouter(prefix="/fms", tags=["FMS"])

router.include_router(shipments_router)
router.include_router(containers_router)
router.include_router(bl_router)
router.include_router(awb_router)
router.include_router(customs_router)
router.include_router(quotations_router)
router.include_router(agents_router)
router.include_router(rates_router)
router.include_router(tracking_router)
router.include_router(consolidations_router)
router.include_router(documents_router)
router.include_router(seed_router)
