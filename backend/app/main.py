from fastapi import FastAPI
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
    allow_origin_regex=r"https?://(\w+\.)?9log\.(tech|local)(:\d+)?",  # *.9log.tech & *.9log.local
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],  # Allow frontend to read download filename
)

# Add Tenant detection middleware
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


@app.get("/health")
def health():
    return {"ok": True}

