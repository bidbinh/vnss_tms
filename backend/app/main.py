import logging

# Configure logging to show INFO level
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from app.api.v1.routes.orders import router as orders_router
from app.api.v1.routes.shipments import router as shipments_router
from app.api.v1.routes.containers import router as containers_router
from app.api.v1.routes.stops import router as stops_router
from app.api.v1.routes.locations import router as locations_router
from app.api.v1.routes.trips import router as trips_router
from app.api.v1.routes.trip_documents import router as trip_docs_router
from app.api.v1.routes.driver_mobile import router as driver_mobile_router
from app.api.v1.routes.drivers import router as drivers_router
from app.api.v1.routes.vehicles import router as vehicles_router
from app.api.v1.routes.trailers import router as trailers_router
from app.api.v1.routes.trip_finance import router as trip_finance_router
from app.api.v1.routes.reports import router as reports_router
from app.api.v1.routes.cost_norms import router as cost_norms_router
from app.api.v1.routes.auth import router as auth_router
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.routes import api_router
from app.core.tenant_middleware import TenantMiddleware
from app.core.activity_log_middleware import ActivityLogMiddleware

app = FastAPI(title="TMS Container v1")

# Add CORS middleware FIRST (before routers)
# Support wildcard subdomains for multi-tenant
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:8001",
        "http://127.0.0.1:8001",
    ],
    allow_origin_regex=r"https?://([\w-]+\.)?9log\.(tech|local)(:\d+)?",  # *.9log.tech & *.9log.local (including hyphenated subdomains)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],  # Allow frontend to read download filename
)

# Note: Middleware runs in REVERSE order of add_middleware calls
# So ActivityLogMiddleware runs AFTER TenantMiddleware
# ActivityLogMiddleware is a pure ASGI middleware

# Add Activity Log middleware
app.add_middleware(ActivityLogMiddleware)

# Add Tenant detection middleware (runs first, sets tenant_id in request.state)
app.add_middleware(TenantMiddleware)

#app.include_router(orders_router)
#app.include_router(shipments_router)
#app.include_router(containers_router)
#app.include_router(stops_router)
#app.include_router(locations_router)
#app.include_router(trips_router)
#app.include_router(trip_docs_router)
#app.include_router(driver_mobile_router)
#app.include_router(drivers_router)
#app.include_router(vehicles_router)
#app.include_router(trailers_router)
#app.include_router(trip_finance_router)
#app.include_router(reports_router)
#app.include_router(cost_norms_router)
#app.include_router(auth_router)
app.include_router(api_router, prefix="/api/v1")


# Tractor-Trailer Pairings route added

@app.get("/health")
def health():
    return {"ok": True}


@app.get("/fix-hs-schema")
def fix_hs_schema():
    """Add missing columns to fms_hs_codes table - run once"""
    from sqlalchemy import text, inspect
    from app.db.session import engine

    with engine.connect() as connection:
        inspector = inspect(connection)
        existing_cols = [c['name'] for c in inspector.get_columns('fms_hs_codes')]

        columns_to_add = [
            ('shipment_id', 'VARCHAR(50)'),
            ('product_specification', 'TEXT'),
            ('origin_criteria', 'VARCHAR(20)'),
            ('unit_code', 'VARCHAR(10)'),
            ('unit_2_code', 'VARCHAR(10)'),
            ('currency_code', 'VARCHAR(5)'),
            ('preferential_rate', 'DOUBLE PRECISION'),
            ('special_preferential_rate', 'DOUBLE PRECISION'),
            ('applied_rate', 'DOUBLE PRECISION'),
            ('environmental_rate', 'DOUBLE PRECISION'),
            ('environmental_amount', 'DOUBLE PRECISION'),
            ('legal_document', 'VARCHAR(200)'),
            ('preferential_code', 'VARCHAR(20)'),
            ('co_form', 'VARCHAR(20)'),
            ('co_no_line', 'VARCHAR(50)'),
            ('license_no', 'VARCHAR(50)'),
            ('license_date', 'DATE'),
            ('license_issuer', 'VARCHAR(200)'),
            ('license_expiry', 'DATE'),
            ('created_by', 'VARCHAR(50)'),
            ('notes', 'TEXT'),
            ('created_at', 'TIMESTAMP'),
            ('updated_at', 'TIMESTAMP'),
        ]

        added = []
        skipped = []
        errors = []

        for col_name, col_type in columns_to_add:
            if col_name not in existing_cols:
                try:
                    sql = text(f'ALTER TABLE fms_hs_codes ADD COLUMN {col_name} {col_type}')
                    connection.execute(sql)
                    connection.commit()
                    added.append(col_name)
                except Exception as e:
                    errors.append(f"{col_name}: {str(e)}")
            else:
                skipped.append(col_name)

    return {
        "success": True,
        "added": added,
        "skipped": skipped,
        "errors": errors,
        "existing_columns": existing_cols
    }


# Global exception handler to prevent empty 500 responses
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import logging
    import traceback
    logger = logging.getLogger(__name__)
    logger.error(f"Unhandled exception: {exc}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"}
    )

