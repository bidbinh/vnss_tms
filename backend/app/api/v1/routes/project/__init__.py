"""
Project Management Module API Routes
"""
from fastapi import APIRouter

from app.api.v1.routes.project.projects import router as projects_router
from app.api.v1.routes.project.tasks import router as tasks_router
from app.api.v1.routes.project.milestones import router as milestones_router
from app.api.v1.routes.project.resources import router as resources_router
from app.api.v1.routes.project.timesheets import router as timesheets_router
from app.api.v1.routes.project.risks import router as risks_router
from app.api.v1.routes.project.issues import router as issues_router
from app.api.v1.routes.project.seed import router as seed_router

router = APIRouter()

router.include_router(projects_router, tags=["Project - Projects"])
router.include_router(tasks_router, tags=["Project - Tasks"])
router.include_router(milestones_router, tags=["Project - Milestones"])
router.include_router(resources_router, tags=["Project - Resources"])
router.include_router(timesheets_router, tags=["Project - Timesheets"])
router.include_router(risks_router, tags=["Project - Risks"])
router.include_router(issues_router, tags=["Project - Issues"])
router.include_router(seed_router, tags=["Project - Seed"])
