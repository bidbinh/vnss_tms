"""
Document Management System API Routes
"""
from fastapi import APIRouter

from app.api.v1.routes.document.folders import router as folders_router
from app.api.v1.routes.document.documents import router as documents_router
from app.api.v1.routes.document.shares import router as shares_router
from app.api.v1.routes.document.archives import router as archives_router
from app.api.v1.routes.document.templates import router as templates_router
from app.api.v1.routes.document.seed import router as seed_router

router = APIRouter()

router.include_router(folders_router, tags=["DMS - Folders"])
router.include_router(documents_router, tags=["DMS - Documents"])
router.include_router(shares_router, tags=["DMS - Sharing"])
router.include_router(archives_router, tags=["DMS - Archive"])
router.include_router(templates_router, tags=["DMS - Templates"])
router.include_router(seed_router, tags=["DMS - Seed Data"])
