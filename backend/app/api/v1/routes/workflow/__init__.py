"""
Workflow Engine Module API Routes
"""
from fastapi import APIRouter

from app.api.v1.routes.workflow.definitions import router as definitions_router
from app.api.v1.routes.workflow.instances import router as instances_router
from app.api.v1.routes.workflow.approvals import router as approvals_router
from app.api.v1.routes.workflow.tasks import router as tasks_router
from app.api.v1.routes.workflow.seed import router as seed_router

router = APIRouter()

router.include_router(definitions_router, tags=["Workflow - Definitions"])
router.include_router(instances_router, tags=["Workflow - Instances"])
router.include_router(approvals_router, tags=["Workflow - Approvals"])
router.include_router(tasks_router, tags=["Workflow - Tasks"])
router.include_router(seed_router, tags=["Workflow - Seed"])
