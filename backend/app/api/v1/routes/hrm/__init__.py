"""
HRM Module API Routes
"""
from fastapi import APIRouter
from app.api.v1.routes.hrm.employees import router as employees_router
from app.api.v1.routes.hrm.departments import router as departments_router
from app.api.v1.routes.hrm.branches import router as branches_router
from app.api.v1.routes.hrm.positions import router as positions_router
from app.api.v1.routes.hrm.teams import router as teams_router
from app.api.v1.routes.hrm.contracts import router as contracts_router
from app.api.v1.routes.hrm.attendance import router as attendance_router
from app.api.v1.routes.hrm.leaves import router as leaves_router
from app.api.v1.routes.hrm.payroll import router as payroll_router
from app.api.v1.routes.hrm.advances import router as advances_router
from app.api.v1.routes.hrm.seed import router as seed_router
from app.api.v1.routes.hrm.recruitment import router as recruitment_router
from app.api.v1.routes.hrm.training import router as training_router
from app.api.v1.routes.hrm.reports import router as reports_router
from app.api.v1.routes.hrm.bonuses import router as bonuses_router
from app.api.v1.routes.hrm.deductions import router as deductions_router

hrm_router = APIRouter(prefix="/hrm", tags=["HRM"])

hrm_router.include_router(employees_router)
hrm_router.include_router(departments_router)
hrm_router.include_router(branches_router)
hrm_router.include_router(positions_router)
hrm_router.include_router(teams_router)
hrm_router.include_router(contracts_router)
hrm_router.include_router(attendance_router)
hrm_router.include_router(leaves_router)
hrm_router.include_router(payroll_router)
hrm_router.include_router(advances_router)
hrm_router.include_router(recruitment_router)
hrm_router.include_router(training_router)
hrm_router.include_router(reports_router)
hrm_router.include_router(bonuses_router)
hrm_router.include_router(deductions_router)
hrm_router.include_router(seed_router)
