"""
CRM Module API Routes
"""
from fastapi import APIRouter
from app.api.v1.routes.crm.accounts import router as accounts_router
from app.api.v1.routes.crm.contacts import router as contacts_router
from app.api.v1.routes.crm.leads import router as leads_router
from app.api.v1.routes.crm.opportunities import router as opportunities_router
from app.api.v1.routes.crm.quotes import router as quotes_router
from app.api.v1.routes.crm.activities import router as activities_router
from app.api.v1.routes.crm.activity_logs import router as activity_logs_router
from app.api.v1.routes.crm.customer_groups import router as customer_groups_router
from app.api.v1.routes.crm.dashboard import router as dashboard_router
from app.api.v1.routes.crm.seed import router as seed_router
from app.api.v1.routes.crm.contracts import router as contracts_router
from app.api.v1.routes.crm.sales_orders import router as sales_orders_router
from app.api.v1.routes.crm.chat import router as chat_router

crm_router = APIRouter(prefix="/crm", tags=["CRM"])

crm_router.include_router(dashboard_router)
crm_router.include_router(accounts_router)
crm_router.include_router(contacts_router)
crm_router.include_router(leads_router)
crm_router.include_router(opportunities_router)
crm_router.include_router(quotes_router)
crm_router.include_router(activities_router)
crm_router.include_router(activity_logs_router)
crm_router.include_router(customer_groups_router)
crm_router.include_router(contracts_router)
crm_router.include_router(sales_orders_router)
crm_router.include_router(chat_router)
crm_router.include_router(seed_router)
