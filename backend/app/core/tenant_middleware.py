"""
Tenant Middleware - Detect tenant from subdomain

Flow:
1. Request comes to tinhung.9log.tech
2. Middleware extracts subdomain "tinhung"
3. Looks up tenant by code
4. Stores tenant_id in request.state for use in routes

Usage:
- tinhung.9log.tech → Tenant "Tín Hưng Logistics"
- adg.9log.tech → Tenant "ADG Logistics"
- demo.9log.tech or app.9log.tech → Demo Tenant (default)
"""
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from sqlmodel import Session, select
from app.db.session import engine
from app.models import Tenant


# Default/fallback tenant codes
DEFAULT_SUBDOMAINS = ["app", "www", "demo", "localhost"]

# Main domain (without subdomain)
MAIN_DOMAINS = ["9log.tech", "localhost", "127.0.0.1"]


def extract_subdomain(host: str) -> str | None:
    """Extract subdomain from host header

    Examples:
    - tinhung.9log.tech → tinhung
    - adg.9log.tech → adg
    - app.9log.tech → None (default)
    - 9log.tech → None (no subdomain)
    - localhost:3000 → None
    """
    # Remove port if present
    host = host.split(":")[0]

    # Check if it's a main domain without subdomain
    for main_domain in MAIN_DOMAINS:
        if host == main_domain:
            return None

        # Check for subdomain
        if host.endswith(f".{main_domain}"):
            subdomain = host.replace(f".{main_domain}", "")
            # Ignore default subdomains
            if subdomain in DEFAULT_SUBDOMAINS:
                return None
            return subdomain

    return None


def get_tenant_by_code(code: str) -> Tenant | None:
    """Look up tenant by subdomain code"""
    with Session(engine) as session:
        tenant = session.exec(
            select(Tenant).where(Tenant.code == code)
        ).first()
        return tenant


class TenantMiddleware(BaseHTTPMiddleware):
    """Middleware to detect tenant from subdomain and store in request.state"""

    async def dispatch(self, request: Request, call_next):
        # Extract host from request
        host = request.headers.get("host", "")

        # Try to get subdomain
        subdomain = extract_subdomain(host)

        # Also check X-Tenant-Code header (for API calls from frontend)
        tenant_code = request.headers.get("x-tenant-code") or subdomain

        # Store in request state
        request.state.subdomain = subdomain
        request.state.tenant_code = tenant_code
        request.state.tenant = None
        request.state.tenant_id = None

        # Look up tenant if we have a code
        if tenant_code:
            tenant = get_tenant_by_code(tenant_code)
            if tenant:
                request.state.tenant = tenant
                request.state.tenant_id = str(tenant.id)

        response = await call_next(request)
        return response


def get_tenant_from_request(request: Request) -> Tenant | None:
    """Helper to get tenant from request state (use in routes)"""
    return getattr(request.state, "tenant", None)


def get_tenant_id_from_request(request: Request) -> str | None:
    """Helper to get tenant_id from request state"""
    return getattr(request.state, "tenant_id", None)
