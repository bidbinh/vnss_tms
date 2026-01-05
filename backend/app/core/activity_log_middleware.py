"""
Activity Log Middleware - Automatically capture mutation operations (POST, PUT, PATCH, DELETE)

Logs all mutation requests to the activity_logs table for audit and billing purposes.
Uses pure ASGI middleware to avoid BaseHTTPMiddleware body consumption issues.
"""
import json
from datetime import datetime, timezone, timedelta
from typing import Optional

# Vietnam timezone (UTC+7)
VN_TIMEZONE = timezone(timedelta(hours=7))
from starlette.types import ASGIApp, Receive, Scope, Send, Message
from sqlmodel import Session

from app.db.session import engine
from app.models.activity_log import ActivityLog, ActionType
from app.models.action_cost import get_action_cost
from app.core.security import decode_token


# Methods to log (mutation operations only)
MUTATION_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

# Endpoints to skip logging
SKIP_ENDPOINTS = {
    "/api/v1/auth/login",
    "/api/v1/auth/logout",
    "/api/v1/auth/refresh",
    "/api/v1/auth/me",
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
}

# Prefixes to skip
SKIP_PREFIXES = [
    "/api/v1/activity-logs",
    "/api/v1/worker",  # Worker auth (register/login) - no tenant context
    "/api/v1/workspace/my-",  # Worker workspace endpoints
]

# UPDATE logging mode:
# - False: Middleware logs ALL updates (basic - lists changed fields, no old/new values)
# - True: Middleware skips UPDATE, routes must handle manually
# Set to False - middleware logs everything automatically
SKIP_UPDATE_IN_MIDDLEWARE = False

# Method to action type mapping (default)
METHOD_TO_ACTION = {
    "POST": ActionType.CREATE.value,
    "PUT": ActionType.UPDATE.value,
    "PATCH": ActionType.UPDATE.value,
    "DELETE": ActionType.DELETE.value,
}

# Special endpoint patterns that override method-based action detection
# Format: (endpoint_pattern, action_type)
# These patterns are checked against the endpoint path
ACTION_OVERRIDE_PATTERNS = [
    # Cancel/Delete operations
    ("cancel", ActionType.DELETE.value),
    ("void", ActionType.DELETE.value),
    ("/delete", ActionType.DELETE.value),
    ("/remove", ActionType.DELETE.value),

    # Bulk operations
    ("bulk-create", ActionType.BULK_CREATE.value),
    ("bulk-update", ActionType.BULK_UPDATE.value),
    ("bulk-delete", ActionType.BULK_DELETE.value),
    ("/batch", ActionType.BULK_CREATE.value),
]

# Patterns that indicate UPDATE action (status changes, actions on existing resources)
UPDATE_ACTION_PATTERNS = [
    # Status transition actions
    "accept", "reject", "approve", "complete", "confirm",
    "pickup", "delivering", "delivered", "assign", "unassign",
    "start", "finish", "close", "reopen", "archive",
    "activate", "deactivate", "enable", "disable",
    "publish", "unpublish", "submit", "review",
    # Generic status
    "status", "state", "update",
]


def get_action_from_endpoint(method: str, path: str) -> str:
    """
    Determine action type based on HTTP method and endpoint pattern.

    Logic:
    1. DELETE method → DELETE action
    2. PUT/PATCH method → UPDATE action
    3. POST method:
       - If path ends with action word (e.g., /orders/{id}/accept) → UPDATE
       - If path has cancel/void → DELETE
       - If path is just /resource (e.g., /orders) → CREATE
    """
    path_lower = path.lower()
    parts = path_lower.strip("/").split("/")

    # Check explicit override patterns first
    for pattern, action in ACTION_OVERRIDE_PATTERNS:
        if pattern in path_lower:
            return action

    # DELETE method is always DELETE
    if method == "DELETE":
        return ActionType.DELETE.value

    # PUT/PATCH is always UPDATE
    if method in ["PUT", "PATCH"]:
        return ActionType.UPDATE.value

    # For POST, analyze the path structure
    if method == "POST":
        # Get the last part of the path (the action or resource)
        last_part = parts[-1] if parts else ""

        # Check if last part is a UUID (means it's /resource/{id} - unlikely for POST)
        # Or if second-to-last part looks like UUID and last part is action
        # Pattern: /api/v1/orders/{uuid}/accept
        if len(parts) >= 4:  # api/v1/resource/id/action or api/v1/module/resource/id/action
            # Check if the path contains a UUID-like segment followed by an action
            for i, part in enumerate(parts):
                # UUID is typically 32+ chars with dashes
                if len(part) >= 20 and i < len(parts) - 1:
                    # There's something after the UUID - it's an action on existing resource
                    action_word = parts[-1]
                    if action_word in UPDATE_ACTION_PATTERNS:
                        return ActionType.UPDATE.value
                    # Even if not in our list, POST to /resource/{id}/something is UPDATE
                    return ActionType.UPDATE.value

        # Check if last part matches update action patterns
        if last_part in UPDATE_ACTION_PATTERNS:
            return ActionType.UPDATE.value

        # Default POST is CREATE (e.g., POST /orders creates new order)
        return ActionType.CREATE.value

    # Fallback
    return METHOD_TO_ACTION.get(method, ActionType.UPDATE.value)

# Module mapping from endpoint paths
MODULE_MAPPING = {
    "orders": "tms",
    "trips": "tms",
    "drivers": "tms",
    "vehicles": "tms",
    "customers": "tms",
    "fuel-logs": "tms",
    "fuel_logs": "tms",
    "rates": "tms",
    "sites": "tms",
    "locations": "tms",
    "maintenance": "tms",
    "dispatch": "tms",
    "gps-providers": "tms",
    "vehicle-operating-costs": "tms",
    "tractor-trailer-pairings": "tms",
    "hrm": "hrm",
    "employees": "hrm",
    "departments": "hrm",
    "positions": "hrm",
    "branches": "hrm",
    "attendance": "hrm",
    "payroll": "hrm",
    "training": "hrm",
    "namecards": "hrm",
    "crm": "crm",
    "accounts": "crm",
    "leads": "crm",
    "contacts": "crm",
    "opportunities": "crm",
    "activities": "crm",
    "wms": "wms",
    "warehouses": "wms",
    "products": "wms",
    "stock": "wms",
    "inventory": "wms",
    "fms": "fms",
    "shipments": "fms",
    "accounting": "accounting",
    "invoices": "accounting",
    "payments": "accounting",
    "users": "system",
    "roles": "system",
    "role-permissions": "system",
    "tenants": "system",
    "settings": "system",
}

# Key fields to extract per resource type
KEY_FIELDS = {
    "orders": ["customer_id", "customer_name", "status", "driver_id", "order_code", "total_amount"],
    "trips": ["vehicle_id", "driver_id", "status", "trip_code"],
    "drivers": ["name", "full_name", "phone", "license_number", "employee_code"],
    "vehicles": ["plate_no", "type", "status"],
    "employees": ["full_name", "employee_code", "department_id", "status"],
    "customers": ["name", "code", "tax_code", "phone"],
    "fuel-logs": ["vehicle_id", "driver_id", "liters", "amount"],
    "fuel_logs": ["vehicle_id", "driver_id", "liters", "amount"],
    "rates": ["name", "rate_type", "amount"],
    "sites": ["name", "code", "address"],
    "locations": ["name", "code", "address"],
    "accounts": ["name", "account_type", "status"],
    "leads": ["name", "status", "source"],
    "users": ["username", "full_name", "role", "status"],
    "payroll": ["employee_id", "period", "total_amount"],
    "attendance": ["employee_id", "date", "check_in_time", "check_out_time"],
}


def parse_endpoint(path: str) -> tuple:
    """Parse endpoint to extract module, resource_type, and resource_id"""
    parts = path.strip("/").split("/")

    if len(parts) >= 2 and parts[0] == "api" and parts[1] == "v1":
        parts = parts[2:]

    module = "system"
    resource_type = "unknown"
    resource_id = None

    if len(parts) >= 1:
        first = parts[0]

        if first in ["hrm", "crm", "wms", "fms", "accounting"]:
            module = first
            if len(parts) >= 2:
                resource_type = parts[1].replace("-", "_")
                if len(parts) >= 3 and len(parts[2]) >= 20:
                    resource_id = parts[2]
        else:
            if first in MODULE_MAPPING:
                module = MODULE_MAPPING[first]
            resource_type = first.replace("-", "_")
            if len(parts) >= 2 and len(parts[1]) >= 20:
                resource_id = parts[1]

    return module, resource_type, resource_id


def get_client_ip_from_dict(headers_dict: dict, client_host: Optional[str]) -> str:
    """Get client IP address from headers dict"""
    forwarded = headers_dict.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()

    real_ip = headers_dict.get("x-real-ip")
    if real_ip:
        return real_ip

    if client_host:
        return client_host

    return "unknown"


def save_activity_log(
    tenant_id: str,
    user_id: str,
    user_name: str,
    user_role: str,
    user_email: Optional[str],
    action: str,
    module: str,
    resource_type: str,
    resource_id: Optional[str],
    resource_code: Optional[str],
    endpoint: str,
    method: str,
    request_summary: Optional[dict],
    response_status: int,
    ip_address: str,
    user_agent: str,
    cost_tokens: int,
):
    """Save activity log to database"""
    try:
        with Session(engine) as session:
            log = ActivityLog(
                tenant_id=tenant_id,
                user_id=user_id,
                user_name=user_name,
                user_role=user_role,
                user_email=user_email,
                action=action,
                module=module,
                resource_type=resource_type,
                resource_id=resource_id,
                resource_code=resource_code,
                endpoint=endpoint,
                method=method,
                request_summary=json.dumps(request_summary, ensure_ascii=False) if request_summary else None,
                response_status=response_status,
                success=200 <= response_status < 400,
                ip_address=ip_address,
                user_agent=user_agent[:500] if user_agent else None,
                cost_tokens=cost_tokens,
                created_at=datetime.utcnow()  # Store in UTC, convert in frontend
            )
            session.add(log)
            session.commit()
            print(f"[ActivityLog] ✓ Saved: {action} {resource_type} by {user_name} (status={response_status})")
            return True
    except Exception as e:
        print(f"[ActivityLog] ✗ Error saving: {e}")
        import traceback
        traceback.print_exc()
        return False


class ActivityLogMiddleware:
    """Pure ASGI Middleware to log all mutation operations"""

    def __init__(self, app: ASGIApp):
        self.app = app
        print("[ActivityLogMiddleware] Initialized (Pure ASGI)")

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        method = scope.get("method", "GET")
        path = scope.get("path", "")

        print(f"[ActivityLog] Incoming: {method} {path}")

        # Skip non-mutation methods
        if method not in MUTATION_METHODS:
            await self.app(scope, receive, send)
            return

        # Skip certain endpoints
        if path in SKIP_ENDPOINTS:
            print(f"[ActivityLog] Skip (endpoint): {path}")
            await self.app(scope, receive, send)
            return

        for prefix in SKIP_PREFIXES:
            if path.startswith(prefix):
                print(f"[ActivityLog] Skip (prefix): {path}")
                await self.app(scope, receive, send)
                return

        # Extract headers from scope (list of tuples: [(b'name', b'value'), ...])
        raw_headers = scope.get("headers", [])
        headers_dict = {}
        for name, value in raw_headers:
            key = name.decode("latin1").lower()
            val = value.decode("latin1")
            headers_dict[key] = val

        # Extract token from cookie or Authorization header
        token = None
        cookie_header = headers_dict.get("cookie", "")
        if cookie_header:
            for cookie in cookie_header.split(";"):
                cookie = cookie.strip()
                if cookie.startswith("access_token="):
                    token = cookie[13:]
                    break

        if not token:
            auth_header = headers_dict.get("authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header[7:]

        # Skip if no token
        if not token:
            print(f"[ActivityLog] Skip {method} {path}: No token found")
            await self.app(scope, receive, send)
            return

        # Decode token
        user_info = None
        tenant_id = None
        try:
            payload = decode_token(token)
            user_info = {
                "id": payload.get("sub"),
                "name": payload.get("name", payload.get("full_name", "Unknown")),
                "role": payload.get("role", "USER"),
                "email": payload.get("email")
            }
            tenant_id = payload.get("tenant_id")
        except Exception as e:
            print(f"[ActivityLog] Skip {method} {path}: Token decode failed - {e}")
            await self.app(scope, receive, send)
            return

        # Skip if no user or tenant
        if not user_info or not tenant_id:
            print(f"[ActivityLog] Skip {method} {path}: No user_info or tenant_id")
            await self.app(scope, receive, send)
            return

        print(f"[ActivityLog] → Processing {method} {path} by {user_info['name']} (tenant={tenant_id[:8]}...)")

        # Collect request body
        body_chunks = []

        async def receive_wrapper() -> Message:
            message = await receive()
            if message["type"] == "http.request":
                body = message.get("body", b"")
                if body:
                    body_chunks.append(body)
            return message

        # Track response status
        response_status = 200

        async def send_wrapper(message: Message) -> None:
            nonlocal response_status
            if message["type"] == "http.response.start":
                response_status = message.get("status", 200)
            await send(message)

        # Call the actual app
        try:
            await self.app(scope, receive_wrapper, send_wrapper)
        except Exception as e:
            print(f"[ActivityLog] App error: {e}")
            raise

        # Parse request body
        request_body = None
        if body_chunks:
            try:
                full_body = b"".join(body_chunks)
                request_body = json.loads(full_body)
            except:
                pass

        # Log activity after response
        try:
            module, resource_type, resource_id = parse_endpoint(path)
            # Use smart action detection based on endpoint pattern
            action = get_action_from_endpoint(method, path)

            # Optional: Skip UPDATE in middleware if routes handle it with proper change tracking
            # Currently set to False - middleware logs all operations as fallback
            if SKIP_UPDATE_IN_MIDDLEWARE and action == ActionType.UPDATE.value:
                print(f"[ActivityLog] Skip UPDATE (route should log with change tracking): {path}")
                return

            cost_tokens = get_action_cost(module, resource_type, action)

            # Extract resource code
            resource_code = None
            if request_body:
                resource_code = (
                    request_body.get("order_code") or
                    request_body.get("code") or
                    request_body.get("employee_code") or
                    request_body.get("trip_code") or
                    request_body.get("plate_no")
                )

            # Build request summary based on action type
            request_summary = None
            if request_body:
                fields = KEY_FIELDS.get(resource_type, [])
                summary = {k: v for k, v in request_body.items() if k in fields}

                # For UPDATE/PATCH, track changed fields
                if action == ActionType.UPDATE.value or method in ["PUT", "PATCH"]:
                    summary["changed_fields"] = list(request_body.keys())[:20]

                # For DELETE/CANCEL, note the action
                if action == ActionType.DELETE.value:
                    summary["_deleted"] = True
                    if "reason" in request_body:
                        summary["reason"] = request_body["reason"]
                    if "cancel_reason" in request_body:
                        summary["cancel_reason"] = request_body["cancel_reason"]

                if summary:
                    request_summary = summary

            # Get client IP
            client = scope.get("client")
            client_host = client[0] if client else None

            # Save log
            save_activity_log(
                tenant_id=tenant_id,
                user_id=user_info["id"],
                user_name=user_info["name"],
                user_role=user_info["role"],
                user_email=user_info.get("email"),
                action=action,
                module=module,
                resource_type=resource_type,
                resource_id=resource_id,
                resource_code=resource_code,
                endpoint=path,
                method=method,
                request_summary=request_summary,
                response_status=response_status,
                ip_address=get_client_ip_from_dict(headers_dict, client_host),
                user_agent=headers_dict.get("user-agent", ""),
                cost_tokens=cost_tokens,
            )
        except Exception as e:
            print(f"[ActivityLog] Error logging: {e}")
            import traceback
            traceback.print_exc()
