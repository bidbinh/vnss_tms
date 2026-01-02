"""
Controlling Module API Routes
"""
from fastapi import APIRouter

from app.api.v1.routes.controlling.cost_centers import router as cost_centers_router
from app.api.v1.routes.controlling.budgets import router as budgets_router
from app.api.v1.routes.controlling.profit_centers import router as profit_centers_router
from app.api.v1.routes.controlling.internal_orders import router as internal_orders_router
from app.api.v1.routes.controlling.activities import router as activities_router
from app.api.v1.routes.controlling.reports import router as reports_router
from app.api.v1.routes.controlling.seed import router as seed_router

router = APIRouter()

router.include_router(cost_centers_router, tags=["Controlling - Cost Centers"])
router.include_router(budgets_router, tags=["Controlling - Budgets"])
router.include_router(profit_centers_router, tags=["Controlling - Profit Centers"])
router.include_router(internal_orders_router, tags=["Controlling - Internal Orders"])
router.include_router(activities_router, tags=["Controlling - Activities"])
router.include_router(reports_router, tags=["Controlling - Reports"])
router.include_router(seed_router, tags=["Controlling - Seed"])
