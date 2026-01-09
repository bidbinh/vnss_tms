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
from .master_data import router as master_data_router
from .customs_documents import router as customs_documents_router
from .customs_partners import router as customs_partners_router
from .ai_training import router as ai_training_router
from .parsing_instructions import router as parsing_instructions_router

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
router.include_router(master_data_router)
router.include_router(customs_documents_router)
router.include_router(customs_partners_router)
router.include_router(ai_training_router)
router.include_router(parsing_instructions_router)

# ECUS integration (optional - requires pyodbc)
try:
    from .ecus import router as ecus_router
    router.include_router(ecus_router)
except ImportError as e:
    import logging
    logging.warning(f"ECUS integration disabled: {e}. Install pyodbc to enable.")
