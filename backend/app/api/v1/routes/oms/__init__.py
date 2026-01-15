"""
OMS API Routes
"""
from fastapi import APIRouter
from app.api.v1.routes.oms import orders, allocations, shipments

oms_router = APIRouter()

# Include sub-routers
oms_router.include_router(orders.router)
oms_router.include_router(allocations.router)
oms_router.include_router(shipments.router)

__all__ = ["oms_router"]
