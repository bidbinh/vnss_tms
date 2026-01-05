"""
Activity Logs API - View and query activity logs for audit and billing

Endpoints:
- GET /activity-logs - List with filters (date range, user, module, action)
- GET /activity-logs/summary - Aggregated statistics
- GET /activity-logs/user-costs - Cost breakdown per user for billing
- GET /activity-logs/{log_id} - Single log detail

Permission: ADMIN, TENANT_ADMIN, or activity_logs:view permission
"""
print("[ActivityLogs Router] Loading activity_logs.py...")
import json
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func, and_
from pydantic import BaseModel

from app.db.session import get_session
from app.models import User
from app.models.activity_log import ActivityLog
from app.core.security import get_current_user


router = APIRouter(prefix="/activity-logs", tags=["activity-logs"])
print("[ActivityLogs Router] Router created with prefix=/activity-logs")


# ==================== PERMISSION CHECK ====================

def check_activity_log_permission(user: User):
    """Check if user can view activity logs"""
    # ADMIN and TENANT_ADMIN always have access
    if user.role == "ADMIN":
        return True
    if hasattr(user, 'system_role') and user.system_role in ("SUPER_ADMIN", "TENANT_ADMIN"):
        return True

    # TODO: Check for specific permission via role_permissions
    # For now, only ADMIN can view
    raise HTTPException(
        status_code=403,
        detail="Bạn không có quyền xem Activity Logs. Chỉ ADMIN mới có thể truy cập."
    )


# ==================== SCHEMAS ====================

class ActivityLogRead(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_role: str
    user_email: Optional[str] = None
    action: str
    module: str
    resource_type: str
    resource_id: Optional[str] = None
    resource_code: Optional[str] = None
    endpoint: str
    method: str
    request_summary: Optional[dict] = None
    response_status: int
    success: bool
    ip_address: Optional[str] = None
    cost_tokens: int
    created_at: datetime

    class Config:
        from_attributes = True


class ActivityLogListResponse(BaseModel):
    items: List[ActivityLogRead]
    total: int
    page: int
    page_size: int
    total_pages: int


class ActivitySummary(BaseModel):
    total_actions: int
    total_tokens: int
    by_action: dict  # {"CREATE": 100, "UPDATE": 50, "DELETE": 10}
    by_module: dict  # {"tms": 80, "hrm": 50}
    by_user: List[dict]  # [{"user_id": "x", "user_name": "y", "count": 10, "tokens": 50}]


class UserCostSummary(BaseModel):
    user_id: str
    user_name: str
    user_role: str
    total_actions: int
    total_tokens: int
    by_action: dict
    by_module: dict


# ==================== ENDPOINTS ====================

@router.post("/test-create")
def test_create_activity_log(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Test endpoint to manually create an activity log.
    Use this to verify the model and database connection work.
    """
    check_activity_log_permission(current_user)

    from datetime import datetime

    try:
        log = ActivityLog(
            tenant_id=str(current_user.tenant_id),
            user_id=str(current_user.id),
            user_name=current_user.full_name or current_user.username,
            user_role=current_user.role,
            user_email=current_user.email,
            action="CREATE",
            module="system",
            resource_type="test",
            resource_id=None,
            resource_code="TEST-001",
            endpoint="/api/v1/activity-logs/test-create",
            method="POST",
            request_summary=json.dumps({"test": True}),
            response_status=200,
            success=True,
            ip_address="127.0.0.1",
            user_agent="Test",
            cost_tokens=1,
            created_at=datetime.utcnow()
        )
        session.add(log)
        session.commit()
        session.refresh(log)

        return {
            "success": True,
            "message": "Test log created successfully",
            "log_id": str(log.id),
            "created_at": log.created_at.isoformat()
        }
    except Exception as e:
        import traceback
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }


@router.get("", response_model=ActivityLogListResponse)
def list_activity_logs(
    # Filters
    start_date: Optional[datetime] = Query(None, description="Start date filter (ISO format)"),
    end_date: Optional[datetime] = Query(None, description="End date filter (ISO format)"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    module: Optional[str] = Query(None, description="Filter by module (tms, hrm, crm, wms, fms)"),
    action: Optional[str] = Query(None, description="Filter by action (CREATE, UPDATE, DELETE)"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type (orders, employees, etc.)"),
    success: Optional[bool] = Query(None, description="Filter by success status"),
    search: Optional[str] = Query(None, description="Search in user_name, resource_code, endpoint"),
    # Pagination
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    # Dependencies
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    List activity logs with filters and pagination.

    Requires: ADMIN role or activity_logs:view permission
    """
    check_activity_log_permission(current_user)
    tenant_id = str(current_user.tenant_id)

    # Base query
    query = select(ActivityLog).where(ActivityLog.tenant_id == tenant_id)

    # Apply filters
    if start_date:
        query = query.where(ActivityLog.created_at >= start_date)
    if end_date:
        query = query.where(ActivityLog.created_at <= end_date)
    if user_id:
        query = query.where(ActivityLog.user_id == user_id)
    if module:
        query = query.where(ActivityLog.module == module)
    if action:
        query = query.where(ActivityLog.action == action)
    if resource_type:
        query = query.where(ActivityLog.resource_type == resource_type)
    if success is not None:
        query = query.where(ActivityLog.success == success)
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            (ActivityLog.user_name.ilike(search_pattern)) |
            (ActivityLog.resource_code.ilike(search_pattern)) |
            (ActivityLog.endpoint.ilike(search_pattern))
        )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Apply pagination and ordering
    offset = (page - 1) * page_size
    query = query.order_by(ActivityLog.created_at.desc()).offset(offset).limit(page_size)

    items = session.exec(query).all()

    # Parse request_summary JSON for response
    result_items = []
    for item in items:
        request_summary = None
        if item.request_summary:
            try:
                request_summary = json.loads(item.request_summary)
            except json.JSONDecodeError:
                request_summary = None

        result_items.append(ActivityLogRead(
            id=str(item.id),
            user_id=str(item.user_id),
            user_name=item.user_name,
            user_role=item.user_role,
            user_email=item.user_email,
            action=item.action,
            module=item.module,
            resource_type=item.resource_type,
            resource_id=item.resource_id,
            resource_code=item.resource_code,
            endpoint=item.endpoint,
            method=item.method,
            request_summary=request_summary,
            response_status=item.response_status,
            success=item.success,
            ip_address=item.ip_address,
            cost_tokens=item.cost_tokens,
            created_at=item.created_at,
        ))

    return ActivityLogListResponse(
        items=result_items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size if total > 0 else 1
    )


@router.get("/summary", response_model=ActivitySummary)
def get_activity_summary(
    start_date: Optional[datetime] = Query(None, description="Start date (default: 30 days ago)"),
    end_date: Optional[datetime] = Query(None, description="End date (default: now)"),
    module: Optional[str] = Query(None, description="Filter by module"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Get aggregated activity summary statistics.

    Returns total actions, total tokens, breakdown by action type, module, and top users.
    """
    check_activity_log_permission(current_user)
    tenant_id = str(current_user.tenant_id)

    # Default to last 30 days
    if not start_date:
        start_date = datetime.utcnow() - timedelta(days=30)
    if not end_date:
        end_date = datetime.utcnow()

    # Base filter
    base_conditions = [
        ActivityLog.tenant_id == tenant_id,
        ActivityLog.created_at >= start_date,
        ActivityLog.created_at <= end_date,
        ActivityLog.success == True
    ]
    if module:
        base_conditions.append(ActivityLog.module == module)

    base_filter = and_(*base_conditions)

    # Total counts
    total_query = select(
        func.count(ActivityLog.id),
        func.coalesce(func.sum(ActivityLog.cost_tokens), 0)
    ).where(base_filter)
    result = session.exec(total_query).first()
    total_actions = result[0] or 0
    total_tokens = result[1] or 0

    # By action
    by_action_query = select(
        ActivityLog.action,
        func.count(ActivityLog.id)
    ).where(base_filter).group_by(ActivityLog.action)
    by_action = {row[0]: row[1] for row in session.exec(by_action_query).all()}

    # By module
    by_module_query = select(
        ActivityLog.module,
        func.count(ActivityLog.id)
    ).where(base_filter).group_by(ActivityLog.module)
    by_module = {row[0]: row[1] for row in session.exec(by_module_query).all()}

    # By user (top 10)
    by_user_query = select(
        ActivityLog.user_id,
        ActivityLog.user_name,
        func.count(ActivityLog.id).label("count"),
        func.coalesce(func.sum(ActivityLog.cost_tokens), 0).label("tokens")
    ).where(base_filter).group_by(
        ActivityLog.user_id, ActivityLog.user_name
    ).order_by(func.count(ActivityLog.id).desc()).limit(10)

    by_user = [
        {
            "user_id": str(row[0]),
            "user_name": row[1],
            "count": row[2],
            "tokens": row[3] or 0
        }
        for row in session.exec(by_user_query).all()
    ]

    return ActivitySummary(
        total_actions=total_actions,
        total_tokens=int(total_tokens),
        by_action=by_action,
        by_module=by_module,
        by_user=by_user
    )


@router.get("/user-costs")
def get_user_costs(
    start_date: Optional[datetime] = Query(None, description="Start date (default: first of current month)"),
    end_date: Optional[datetime] = Query(None, description="End date (default: now)"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Get detailed cost breakdown per user for billing purposes.

    Returns token usage per user with breakdown by action type and module.
    """
    check_activity_log_permission(current_user)
    tenant_id = str(current_user.tenant_id)

    # Default to current month
    if not start_date:
        now = datetime.utcnow()
        start_date = datetime(now.year, now.month, 1)
    if not end_date:
        end_date = datetime.utcnow()

    # Base filter
    base_filter = and_(
        ActivityLog.tenant_id == tenant_id,
        ActivityLog.created_at >= start_date,
        ActivityLog.created_at <= end_date,
        ActivityLog.success == True
    )

    # Get all users with activity
    users_query = select(
        ActivityLog.user_id,
        ActivityLog.user_name,
        ActivityLog.user_role,
        func.count(ActivityLog.id).label("total_actions"),
        func.coalesce(func.sum(ActivityLog.cost_tokens), 0).label("total_tokens")
    ).where(base_filter).group_by(
        ActivityLog.user_id,
        ActivityLog.user_name,
        ActivityLog.user_role
    ).order_by(func.sum(ActivityLog.cost_tokens).desc())

    users = []
    for row in session.exec(users_query).all():
        user_id = row[0]

        # Get breakdown by action for this user
        action_filter = and_(
            ActivityLog.tenant_id == tenant_id,
            ActivityLog.user_id == user_id,
            ActivityLog.created_at >= start_date,
            ActivityLog.created_at <= end_date,
            ActivityLog.success == True
        )

        action_query = select(
            ActivityLog.action,
            func.count(ActivityLog.id)
        ).where(action_filter).group_by(ActivityLog.action)
        by_action = {r[0]: r[1] for r in session.exec(action_query).all()}

        # Get breakdown by module for this user
        module_query = select(
            ActivityLog.module,
            func.count(ActivityLog.id)
        ).where(action_filter).group_by(ActivityLog.module)
        by_module = {r[0]: r[1] for r in session.exec(module_query).all()}

        users.append({
            "user_id": str(user_id),
            "user_name": row[1],
            "user_role": row[2],
            "total_actions": row[3],
            "total_tokens": int(row[4] or 0),
            "by_action": by_action,
            "by_module": by_module
        })

    return {
        "period": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        },
        "users": users,
        "total_tokens": sum(u["total_tokens"] for u in users),
        "total_users": len(users)
    }


@router.get("/modules")
def get_available_modules(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Get list of modules that have activity logs.

    Useful for populating filter dropdowns.
    """
    check_activity_log_permission(current_user)
    tenant_id = str(current_user.tenant_id)

    query = select(ActivityLog.module).where(
        ActivityLog.tenant_id == tenant_id
    ).distinct()

    modules = [row for row in session.exec(query).all()]
    return {"modules": sorted(modules)}


@router.get("/resource-types")
def get_available_resource_types(
    module: Optional[str] = Query(None, description="Filter by module"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Get list of resource types that have activity logs.

    Useful for populating filter dropdowns.
    """
    check_activity_log_permission(current_user)
    tenant_id = str(current_user.tenant_id)

    query = select(ActivityLog.resource_type).where(
        ActivityLog.tenant_id == tenant_id
    )
    if module:
        query = query.where(ActivityLog.module == module)
    query = query.distinct()

    resource_types = [row for row in session.exec(query).all()]
    return {"resource_types": sorted(resource_types)}


@router.get("/users")
def get_available_users(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Get list of users that have activity logs.

    Useful for populating filter dropdowns.
    """
    check_activity_log_permission(current_user)
    tenant_id = str(current_user.tenant_id)

    query = select(
        ActivityLog.user_id,
        ActivityLog.user_name
    ).where(
        ActivityLog.tenant_id == tenant_id
    ).distinct()

    users = [{"id": str(row[0]), "name": row[1]} for row in session.exec(query).all()]
    return {"users": users}


# ==================== BILLING ====================

# ===== NEW PRICING MODEL: Per-Order + Storage =====
#
# 💡 Value Proposition: "Bạn chỉ trả tiền khi kiếm được tiền"
#
# 📦 Order Pricing:
#    - FREE: 50 đơn đầu tiên mỗi tháng
#    - Billable: 3,000đ/đơn hoàn thành (status = COMPLETED/DELIVERED)
#
# 💾 Storage Pricing:
#    - FREE: 1GB (đủ cho ~10,000 đơn + files đính kèm)
#    - Overage: 5,000đ/GB/tháng
#
# 👤 User Pricing (optional - currently disabled):
#    - Không giới hạn số lượng user
#
PRICING_CONFIG = {
    # Order-based pricing
    "order_price_vnd": 3000,          # 3,000đ per completed order
    "free_orders_per_month": 50,       # 50 đơn miễn phí mỗi tháng

    # Storage pricing
    "free_storage_gb": 1,              # 1GB miễn phí
    "storage_price_per_gb_vnd": 5000,  # 5,000đ/GB/tháng

    # Base fee (optional - set to 0 to disable)
    "base_fee_vnd": 0,                 # Phí nền hàng tháng (0 = không thu)

    # Legacy token pricing (for activity tracking display)
    "token_price_vnd": 10,

    # Completed order statuses (count for billing)
    "billable_order_statuses": ["COMPLETED", "DELIVERED", "DONE"],
}


@router.get("/billing")
def get_billing_summary(
    month: Optional[int] = Query(None, ge=1, le=12, description="Month (1-12), default current"),
    year: Optional[int] = Query(None, ge=2024, le=2030, description="Year, default current"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Get billing summary for the tenant.

    NEW PRICING MODEL: Per-Order + Storage
    - 📦 Orders: 50 đơn FREE/tháng, sau đó 3,000đ/đơn hoàn thành
    - 💾 Storage: 1GB FREE, sau đó 5,000đ/GB/tháng
    """
    check_activity_log_permission(current_user)
    tenant_id = str(current_user.tenant_id)

    # Default to current month
    now = datetime.utcnow()
    if not month:
        month = now.month
    if not year:
        year = now.year

    # Calculate date range
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)

    # ==================== 1. COUNT COMPLETED ORDERS ====================
    from app.models.order import Order

    billable_statuses = PRICING_CONFIG["billable_order_statuses"]

    # Count orders that were COMPLETED this month (check updated_at for completion date)
    orders_query = select(func.count(Order.id)).where(
        and_(
            Order.tenant_id == tenant_id,
            Order.status.in_(billable_statuses),
            Order.updated_at >= start_date,
            Order.updated_at < end_date,
        )
    )
    total_completed_orders = session.exec(orders_query).one() or 0

    # Calculate order cost
    free_orders = PRICING_CONFIG["free_orders_per_month"]
    billable_orders = max(0, total_completed_orders - free_orders)
    order_cost_vnd = billable_orders * PRICING_CONFIG["order_price_vnd"]

    # ==================== 2. CALCULATE STORAGE USAGE ====================
    # Estimate storage from:
    # - orders count (avg 1KB per order)
    # - activity_logs count (avg 0.5KB per log)
    # - documents/files (from order_documents if any)

    # Count total orders (all time) for storage
    total_orders_query = select(func.count(Order.id)).where(Order.tenant_id == tenant_id)
    total_orders_all_time = session.exec(total_orders_query).one() or 0

    # Count total activity logs for this tenant
    total_logs_query = select(func.count(ActivityLog.id)).where(ActivityLog.tenant_id == tenant_id)
    total_logs = session.exec(total_logs_query).one() or 0

    # Estimate storage (in MB)
    # - Orders: ~2KB each (with all fields)
    # - Activity logs: ~1KB each
    # - Buffer for indexes, etc: 20%
    estimated_storage_mb = (total_orders_all_time * 2 + total_logs * 1) / 1024 * 1.2

    # Convert to GB
    estimated_storage_gb = estimated_storage_mb / 1024

    # Calculate storage cost
    free_storage_gb = PRICING_CONFIG["free_storage_gb"]
    billable_storage_gb = max(0, estimated_storage_gb - free_storage_gb)
    storage_cost_vnd = int(billable_storage_gb * PRICING_CONFIG["storage_price_per_gb_vnd"])

    # ==================== 3. TOTAL COST ====================
    base_fee = PRICING_CONFIG["base_fee_vnd"]
    total_cost_vnd = base_fee + order_cost_vnd + storage_cost_vnd

    # ==================== 4. ACTIVITY SUMMARY (for display) ====================
    base_filter = and_(
        ActivityLog.tenant_id == tenant_id,
        ActivityLog.created_at >= start_date,
        ActivityLog.created_at < end_date,
        ActivityLog.success == True
    )

    # Get usage per user
    users_query = select(
        ActivityLog.user_id,
        ActivityLog.user_name,
        ActivityLog.user_role,
        func.count(ActivityLog.id).label("total_actions"),
        func.coalesce(func.sum(ActivityLog.cost_tokens), 0).label("total_tokens")
    ).where(base_filter).group_by(
        ActivityLog.user_id,
        ActivityLog.user_name,
        ActivityLog.user_role
    ).order_by(func.sum(ActivityLog.cost_tokens).desc())

    users = []
    total_tokens = 0
    total_actions = 0

    for row in session.exec(users_query).all():
        user_tokens = int(row[4] or 0)
        users.append({
            "user_id": str(row[0]),
            "user_name": row[1],
            "user_role": row[2] or "STAFF",
            "total_actions": row[3],
            "total_tokens": user_tokens,
        })
        total_tokens += user_tokens
        total_actions += row[3]

    # Calculate by module
    module_query = select(
        ActivityLog.module,
        func.count(ActivityLog.id).label("actions"),
        func.coalesce(func.sum(ActivityLog.cost_tokens), 0).label("tokens")
    ).where(base_filter).group_by(ActivityLog.module)

    by_module = {
        row[0]: {"actions": row[1], "tokens": int(row[2] or 0)}
        for row in session.exec(module_query).all()
    }

    # Calculate by action type
    action_query = select(
        ActivityLog.action,
        func.count(ActivityLog.id).label("count"),
        func.coalesce(func.sum(ActivityLog.cost_tokens), 0).label("tokens")
    ).where(base_filter).group_by(ActivityLog.action)

    by_action = {
        row[0]: {"count": row[1], "tokens": int(row[2] or 0)}
        for row in session.exec(action_query).all()
    }

    return {
        "period": {
            "month": month,
            "year": year,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
        },
        # NEW: Order-based billing summary
        "orders": {
            "total_completed": total_completed_orders,
            "free_quota": free_orders,
            "billable": billable_orders,
            "price_per_order_vnd": PRICING_CONFIG["order_price_vnd"],
            "cost_vnd": order_cost_vnd,
        },
        # NEW: Storage billing
        "storage": {
            "used_gb": round(estimated_storage_gb, 3),
            "used_mb": round(estimated_storage_mb, 2),
            "free_quota_gb": free_storage_gb,
            "billable_gb": round(billable_storage_gb, 3),
            "price_per_gb_vnd": PRICING_CONFIG["storage_price_per_gb_vnd"],
            "cost_vnd": storage_cost_vnd,
        },
        # Total
        "summary": {
            "total_users": len(users),
            "total_actions": total_actions,
            "total_tokens": total_tokens,
            "base_fee_vnd": base_fee,
            "order_cost_vnd": order_cost_vnd,
            "storage_cost_vnd": storage_cost_vnd,
            "total_cost_vnd": total_cost_vnd,
        },
        # Details
        "users": users,
        "by_module": by_module,
        "by_action": by_action,
        "pricing_config": PRICING_CONFIG,
    }


@router.get("/detail/{log_id}")
def get_activity_log(
    log_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Get a single activity log entry by ID.

    Returns full details including user agent.
    """
    check_activity_log_permission(current_user)
    tenant_id = str(current_user.tenant_id)

    log = session.exec(
        select(ActivityLog).where(
            ActivityLog.id == log_id,
            ActivityLog.tenant_id == tenant_id
        )
    ).first()

    if not log:
        raise HTTPException(status_code=404, detail="Activity log not found")

    # Parse request_summary
    request_summary = None
    if log.request_summary:
        try:
            request_summary = json.loads(log.request_summary)
        except json.JSONDecodeError:
            request_summary = None

    return {
        "id": str(log.id),
        "tenant_id": str(log.tenant_id),
        "user_id": str(log.user_id),
        "user_name": log.user_name,
        "user_role": log.user_role,
        "user_email": log.user_email,
        "action": log.action,
        "module": log.module,
        "resource_type": log.resource_type,
        "resource_id": log.resource_id,
        "resource_code": log.resource_code,
        "endpoint": log.endpoint,
        "method": log.method,
        "request_summary": request_summary,
        "response_status": log.response_status,
        "success": log.success,
        "error_message": log.error_message,
        "ip_address": log.ip_address,
        "user_agent": log.user_agent,
        "cost_tokens": log.cost_tokens,
        "created_at": log.created_at.isoformat(),
        "billing_transaction_id": log.billing_transaction_id
    }
