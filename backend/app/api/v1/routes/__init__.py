from fastapi import APIRouter
from app.api.v1.routes.auth import router as auth_router
from app.api.v1.routes.customers import router as customers_router
from app.api.v1.routes.customer_addresses import router as customer_addresses_router
from app.api.v1.routes.customer_bank_accounts import router as customer_bank_accounts_router
from app.api.v1.routes.customer_contacts import router as customer_contacts_router
from app.api.v1.routes.locations import router as locations_router
from app.api.v1.routes.sites import router as sites_router
from app.api.v1.routes.orders import router as orders_router
from app.api.v1.routes.trips import router as trips_router
from app.api.v1.routes.shipments import router as shipments_router
from app.api.v1.routes.ops_assignment import router as ops_router
from app.api.v1.routes.drivers import router as drivers_router
from app.api.v1.routes.vehicles import router as vehicles_router
from app.api.v1.routes.rates import router as rates_router
from app.api.v1.routes.maintenance_schedules import router as maintenance_schedules_router
from app.api.v1.routes.maintenance_records import router as maintenance_records_router
from app.api.v1.routes.fuel_logs import router as fuel_logs_router
from app.api.v1.routes.fuel_reports import router as fuel_reports_router
from app.api.v1.routes.empty_returns import router as empty_returns_router
from app.api.v1.routes.driver_salary_settings import router as driver_salary_settings_router
from app.api.v1.routes.driver_salary_reports import router as driver_salary_reports_router
from app.api.v1.routes.driver_salary_management import router as driver_salary_management_router
from app.api.v1.routes.dashboard import router as dashboard_router
from app.api.v1.routes.reports import router as reports_router
from app.api.v1.routes.advance_payments import router as advance_payments_router
from app.api.v1.routes.income_tax_settings import router as income_tax_settings_router
from app.api.v1.routes.revenue_reports import router as revenue_reports_router
from app.api.v1.routes.maintenance_reports import router as maintenance_reports_router
from app.api.v1.routes.ai_assistant import router as ai_assistant_router
from app.api.v1.routes.users import router as users_router
from app.api.v1.routes.role_permissions import router as role_permissions_router
from app.api.v1.routes.roles import router as roles_router
from app.api.v1.routes.mobile_api import router as mobile_api_router
from app.api.v1.routes.mobile_warehouse import router as mobile_warehouse_router
from app.api.v1.routes.mobile_business import router as mobile_business_router
from app.api.v1.routes.order_documents import router as order_documents_router
from app.api.v1.routes.trip_revenue import router as trip_revenue_router
from app.api.v1.routes.tenant import router as tenant_router
from app.api.v1.routes.hrm import hrm_router
from app.api.v1.routes.crm import crm_router
from app.api.v1.routes.accounting import router as accounting_router
from app.api.v1.routes.controlling import router as controlling_router
from app.api.v1.routes.wms import router as wms_router
from app.api.v1.routes.project import router as project_router
from app.api.v1.routes.workflow import router as workflow_router
from app.api.v1.routes.document import router as document_router
from app.api.v1.routes.fms import router as fms_router
from app.api.v1.routes.admin_billing import router as admin_billing_router
from app.api.v1.routes.tenant_billing import router as tenant_billing_router
from app.api.v1.routes.mes import router as mes_router
from app.api.v1.routes.uploads import router as uploads_router
from app.api.v1.routes.payment_qr import router as payment_qr_router
from app.api.v1.routes.invoice_automation import router as invoice_automation_router
from app.api.v1.routes.dispatch import router as dispatch_router
from app.api.v1.routes.gps_settings import router as gps_settings_router
from app.api.v1.routes.vehicle_costs import router as vehicle_costs_router
from app.api.v1.routes.tractor_trailer_pairings import router as tractor_trailer_pairings_router
from app.api.v1.routes.public_namecard import router as public_namecard_router
from app.api.v1.routes.activity_logs import router as activity_logs_router
from app.api.v1.routes.worker_auth import router as worker_auth_router
from app.api.v1.routes.workspace import router as workspace_router
from app.api.v1.routes.worker_tenant_api import router as worker_tenant_api_router
from app.api.v1.routes.driver_availability import router as driver_availability_router
from app.api.v1.routes.worker_connections import router as worker_connections_router
from app.api.v1.routes.dispatcher_orders import router as dispatcher_orders_router
from app.api.v1.routes.ai_chat import router as ai_chat_router
from app.api.v1.routes.user_tasks import router as user_tasks_router
from app.api.v1.routes.ai_config import router as ai_config_router
from app.api.v1.routes.bank_payment import router as bank_payment_router
from app.api.v1.routes.oms import oms_router

# Actor-Based Architecture Routes
from app.api.v1.routes.actors import router as actors_router
from app.api.v1.routes.unified_orders import router as unified_orders_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(customers_router)
api_router.include_router(customer_addresses_router)
api_router.include_router(customer_bank_accounts_router)
api_router.include_router(customer_contacts_router)
api_router.include_router(locations_router)
api_router.include_router(sites_router)
api_router.include_router(orders_router)
api_router.include_router(trips_router)
api_router.include_router(shipments_router)
api_router.include_router(ops_router)
api_router.include_router(drivers_router)
api_router.include_router(vehicles_router)
api_router.include_router(rates_router)
api_router.include_router(maintenance_schedules_router)
api_router.include_router(maintenance_records_router)
api_router.include_router(fuel_logs_router)
api_router.include_router(fuel_reports_router)
api_router.include_router(empty_returns_router)
api_router.include_router(driver_salary_settings_router)
api_router.include_router(driver_salary_reports_router)
api_router.include_router(driver_salary_management_router)
api_router.include_router(dashboard_router)
api_router.include_router(reports_router)
api_router.include_router(advance_payments_router)
api_router.include_router(income_tax_settings_router)
api_router.include_router(revenue_reports_router)
api_router.include_router(maintenance_reports_router)
api_router.include_router(ai_assistant_router)
api_router.include_router(users_router)
api_router.include_router(role_permissions_router)
api_router.include_router(roles_router)
api_router.include_router(mobile_api_router)
api_router.include_router(mobile_warehouse_router)
api_router.include_router(mobile_business_router)
api_router.include_router(order_documents_router)
api_router.include_router(trip_revenue_router)
api_router.include_router(tenant_router)
api_router.include_router(hrm_router)
api_router.include_router(crm_router)
api_router.include_router(accounting_router)
api_router.include_router(controlling_router, prefix="/controlling", tags=["Controlling"])
api_router.include_router(wms_router, prefix="/wms", tags=["WMS"])
api_router.include_router(project_router, prefix="/project", tags=["Project Management"])
api_router.include_router(workflow_router, prefix="/workflow", tags=["Workflow Engine"])
api_router.include_router(document_router, prefix="/dms", tags=["Document Management"])
api_router.include_router(fms_router, tags=["Forwarding Management System"])
api_router.include_router(mes_router, prefix="/mes", tags=["Manufacturing Execution System"])
api_router.include_router(admin_billing_router)
api_router.include_router(tenant_billing_router)
api_router.include_router(uploads_router)
api_router.include_router(payment_qr_router)
api_router.include_router(invoice_automation_router)
api_router.include_router(dispatch_router)
api_router.include_router(gps_settings_router)
api_router.include_router(vehicle_costs_router)
api_router.include_router(tractor_trailer_pairings_router)
api_router.include_router(public_namecard_router)
api_router.include_router(activity_logs_router)
api_router.include_router(worker_auth_router, tags=["Personal Workspace - Auth"])
api_router.include_router(workspace_router, tags=["Personal Workspace"])
api_router.include_router(worker_tenant_api_router, tags=["Worker Tenant API"])
api_router.include_router(driver_availability_router, tags=["Driver Availability"])
api_router.include_router(worker_connections_router, tags=["Worker Connections"])
api_router.include_router(dispatcher_orders_router, tags=["Dispatcher Orders"])
api_router.include_router(ai_chat_router, tags=["AI Support"])
api_router.include_router(user_tasks_router, tags=["User Tasks"])

# Actor-Based Architecture
api_router.include_router(actors_router, tags=["Actors"])
api_router.include_router(unified_orders_router, tags=["Unified Orders"])

# AI Configuration (Super Admin)
api_router.include_router(ai_config_router, tags=["AI Configuration"])

# Bank Payment Integration
api_router.include_router(bank_payment_router, tags=["Bank Payment"])

# OMS - Order Management System
api_router.include_router(oms_router, prefix="/oms", tags=["OMS"])

# TMS Automation
from .automation import router as automation_router
api_router.include_router(automation_router)
