"""
Activity Tracker - Track actual changes between old and new values

This module provides helpers for routes to log meaningful changes,
comparing old vs new values instead of just logging all fields.
"""
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from sqlmodel import Session

from app.db.session import engine
from app.models.activity_log import ActivityLog, ActionType
from app.models.action_cost import get_action_cost

# Vietnam timezone (UTC+7)
VN_TIMEZONE = timezone(timedelta(hours=7))

# Fields to ignore when comparing (auto-generated, timestamps, etc.)
IGNORE_FIELDS = {
    "id", "created_at", "updated_at", "created_by", "updated_by",
    "tenant_id", "is_deleted", "deleted_at", "version",
}

# Field labels for display (Vietnamese)
FIELD_LABELS = {
    # Order fields
    "status": "Trạng thái",
    "customer_id": "Khách hàng",
    "driver_id": "Tài xế",
    "vehicle_id": "Phương tiện",
    "order_code": "Mã đơn",
    "total_amount": "Tổng tiền",
    "equipment": "Loại cont",
    "qty": "Số lượng",
    "pickup_site_id": "Điểm lấy hàng",
    "delivery_site_id": "Điểm giao hàng",
    "port_site_id": "Cảng",
    "eta_pickup_at": "Giờ lấy hàng dự kiến",
    "eta_delivery_at": "Giờ giao hàng dự kiến",
    "customer_requested_date": "Ngày yêu cầu",
    "container_code": "Số container",
    "cargo_note": "Ghi chú hàng hóa",
    "notes": "Ghi chú",
    # Employee fields
    "full_name": "Họ tên",
    "employee_code": "Mã NV",
    "phone": "Điện thoại",
    "email": "Email",
    "department_id": "Phòng ban",
    "position_id": "Chức vụ",
    "branch_id": "Chi nhánh",
    "team_id": "Nhóm",
    "manager_id": "Quản lý",
    "salary": "Lương",
    "salary_type": "Loại lương",
    "gender": "Giới tính",
    "date_of_birth": "Ngày sinh",
    "marital_status": "Tình trạng hôn nhân",
    "permanent_address": "Địa chỉ thường trú",
    "current_address": "Địa chỉ hiện tại",
    "id_number": "Số CMND/CCCD",
    "id_issue_date": "Ngày cấp CMND",
    "id_issue_place": "Nơi cấp CMND",
    "tax_code": "Mã số thuế",
    "bank_name": "Ngân hàng",
    "bank_branch": "Chi nhánh NH",
    "bank_account": "Số tài khoản",
    "bank_account_name": "Chủ tài khoản",
    "employee_type": "Loại nhân viên",
    "join_date": "Ngày vào làm",
    "probation_end_date": "Ngày hết thử việc",
    "official_date": "Ngày chính thức",
    "resign_date": "Ngày nghỉ việc",
    "resign_reason": "Lý do nghỉ việc",
    "social_insurance_number": "Số BHXH",
    "health_insurance_number": "Số BHYT",
    "license_number": "Số GPLX",
    "license_class": "Hạng GPLX",
    "license_expiry": "HSD GPLX",
    "avatar_url": "Ảnh đại diện",
    # Common
    "name": "Tên",
    "code": "Mã",
    "address": "Địa chỉ",
    "description": "Mô tả",
    "is_active": "Kích hoạt",
}


def get_field_label(field: str) -> str:
    """Get Vietnamese label for a field"""
    return FIELD_LABELS.get(field, field)


def compare_values(old_val: Any, new_val: Any) -> bool:
    """
    Compare two values, handling None, empty strings, etc.
    Returns True if values are different.
    """
    # Normalize None and empty string
    if old_val is None:
        old_val = ""
    if new_val is None:
        new_val = ""

    # Convert to string for comparison (handles UUID, datetime, etc.)
    old_str = str(old_val).strip() if old_val else ""
    new_str = str(new_val).strip() if new_val else ""

    return old_str != new_str


def compute_changes(old_data: Dict[str, Any], new_data: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    """
    Compare old and new data, return only the fields that actually changed.

    Returns:
        {
            "field_name": {
                "old": old_value,
                "new": new_value,
                "label": "Vietnamese Label"
            },
            ...
        }
    """
    changes = {}

    # Get all fields from new_data (what user is trying to update)
    for field, new_val in new_data.items():
        # Skip ignored fields
        if field in IGNORE_FIELDS:
            continue

        # Skip if field not provided (None means not updating)
        if new_val is None:
            continue

        # Get old value
        old_val = old_data.get(field)

        # Check if actually changed
        if compare_values(old_val, new_val):
            changes[field] = {
                "old": old_val,
                "new": new_val,
                "label": get_field_label(field)
            }

    return changes


def format_value_for_display(value: Any, max_length: int = 50) -> str:
    """Format a value for display in the activity log"""
    if value is None:
        return "(trống)"

    str_val = str(value)
    if len(str_val) > max_length:
        return str_val[:max_length] + "..."
    return str_val


def log_update(
    tenant_id: str,
    user_id: str,
    user_name: str,
    user_role: str,
    user_email: Optional[str],
    module: str,
    resource_type: str,
    resource_id: str,
    resource_code: Optional[str],
    old_data: Dict[str, Any],
    new_data: Dict[str, Any],
    endpoint: str,
    method: str,
    ip_address: str = "unknown",
    user_agent: str = "",
) -> Optional[str]:
    """
    Log an UPDATE action with actual changes.

    Returns the log ID if successful, None otherwise.
    """
    # Compute actual changes
    changes = compute_changes(old_data, new_data)

    # Don't log if nothing actually changed
    if not changes:
        print(f"[ActivityTracker] Skip: No actual changes for {resource_type}/{resource_id}")
        return None

    # Build request summary with changes
    request_summary = {
        "changed_fields": list(changes.keys()),
        "changes": {
            field: {
                "old": format_value_for_display(change["old"]),
                "new": format_value_for_display(change["new"]),
            }
            for field, change in changes.items()
        }
    }

    # Calculate cost
    cost_tokens = get_action_cost(module, resource_type, ActionType.UPDATE.value)

    try:
        with Session(engine) as session:
            log = ActivityLog(
                tenant_id=tenant_id,
                user_id=user_id,
                user_name=user_name,
                user_role=user_role,
                user_email=user_email,
                action=ActionType.UPDATE.value,
                module=module,
                resource_type=resource_type,
                resource_id=resource_id,
                resource_code=resource_code,
                endpoint=endpoint,
                method=method,
                request_summary=json.dumps(request_summary, ensure_ascii=False),
                response_status=200,
                success=True,
                ip_address=ip_address,
                user_agent=user_agent[:500] if user_agent else None,
                cost_tokens=cost_tokens,
                created_at=datetime.utcnow()
            )
            session.add(log)
            session.commit()
            session.refresh(log)

            print(f"[ActivityTracker] ✓ UPDATE {resource_type}: {len(changes)} field(s) changed by {user_name}")
            return str(log.id)
    except Exception as e:
        print(f"[ActivityTracker] ✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return None


def log_create(
    tenant_id: str,
    user_id: str,
    user_name: str,
    user_role: str,
    user_email: Optional[str],
    module: str,
    resource_type: str,
    resource_id: str,
    resource_code: Optional[str],
    created_data: Dict[str, Any],
    endpoint: str,
    method: str,
    ip_address: str = "unknown",
    user_agent: str = "",
    key_fields: List[str] = None,
) -> Optional[str]:
    """
    Log a CREATE action with key field values.

    key_fields: List of field names to include in summary (e.g., ["full_name", "employee_code"])
    """
    # Build request summary with key fields only
    if key_fields:
        request_summary = {
            field: created_data.get(field)
            for field in key_fields
            if field in created_data and created_data.get(field) is not None
        }
    else:
        # Default: include all non-ignored fields
        request_summary = {
            k: v for k, v in created_data.items()
            if k not in IGNORE_FIELDS and v is not None
        }

    # Limit to first 10 fields
    if len(request_summary) > 10:
        request_summary = dict(list(request_summary.items())[:10])

    cost_tokens = get_action_cost(module, resource_type, ActionType.CREATE.value)

    try:
        with Session(engine) as session:
            log = ActivityLog(
                tenant_id=tenant_id,
                user_id=user_id,
                user_name=user_name,
                user_role=user_role,
                user_email=user_email,
                action=ActionType.CREATE.value,
                module=module,
                resource_type=resource_type,
                resource_id=resource_id,
                resource_code=resource_code,
                endpoint=endpoint,
                method=method,
                request_summary=json.dumps(request_summary, ensure_ascii=False) if request_summary else None,
                response_status=201,
                success=True,
                ip_address=ip_address,
                user_agent=user_agent[:500] if user_agent else None,
                cost_tokens=cost_tokens,
                created_at=datetime.utcnow()
            )
            session.add(log)
            session.commit()
            session.refresh(log)

            print(f"[ActivityTracker] ✓ CREATE {resource_type}: {resource_code or resource_id} by {user_name}")
            return str(log.id)
    except Exception as e:
        print(f"[ActivityTracker] ✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return None


def log_delete(
    tenant_id: str,
    user_id: str,
    user_name: str,
    user_role: str,
    user_email: Optional[str],
    module: str,
    resource_type: str,
    resource_id: str,
    resource_code: Optional[str],
    deleted_data: Dict[str, Any] = None,
    reason: str = None,
    endpoint: str = "",
    method: str = "DELETE",
    ip_address: str = "unknown",
    user_agent: str = "",
) -> Optional[str]:
    """
    Log a DELETE action.
    """
    request_summary = {
        "_deleted": True,
    }
    if reason:
        request_summary["reason"] = reason
    if deleted_data:
        # Include some key info about what was deleted
        for field in ["name", "full_name", "code", "order_code", "employee_code"]:
            if field in deleted_data:
                request_summary[field] = deleted_data[field]
                break

    cost_tokens = get_action_cost(module, resource_type, ActionType.DELETE.value)

    try:
        with Session(engine) as session:
            log = ActivityLog(
                tenant_id=tenant_id,
                user_id=user_id,
                user_name=user_name,
                user_role=user_role,
                user_email=user_email,
                action=ActionType.DELETE.value,
                module=module,
                resource_type=resource_type,
                resource_id=resource_id,
                resource_code=resource_code,
                endpoint=endpoint,
                method=method,
                request_summary=json.dumps(request_summary, ensure_ascii=False),
                response_status=200,
                success=True,
                ip_address=ip_address,
                user_agent=user_agent[:500] if user_agent else None,
                cost_tokens=cost_tokens,
                created_at=datetime.utcnow()
            )
            session.add(log)
            session.commit()
            session.refresh(log)

            print(f"[ActivityTracker] ✓ DELETE {resource_type}: {resource_code or resource_id} by {user_name}")
            return str(log.id)
    except Exception as e:
        print(f"[ActivityTracker] ✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return None


def get_client_ip(request) -> str:
    """Extract client IP from FastAPI request"""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()

    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip

    if request.client:
        return request.client.host

    return "unknown"


def extract_user_info(current_user) -> Dict[str, Any]:
    """
    Extract user info from current_user object for logging.
    Works with various user model structures.
    """
    return {
        "user_id": str(getattr(current_user, "id", getattr(current_user, "user_id", ""))),
        "user_name": getattr(current_user, "full_name", getattr(current_user, "name", "Unknown")),
        "user_role": getattr(current_user, "role", getattr(current_user, "system_role", "USER")),
        "user_email": getattr(current_user, "email", None),
        "tenant_id": str(getattr(current_user, "tenant_id", "")),
    }


def model_to_dict(model, fields: List[str] = None) -> Dict[str, Any]:
    """
    Convert SQLModel/Pydantic model to dict for comparison.

    Args:
        model: The model instance
        fields: Optional list of fields to include. If None, includes all.
    """
    if hasattr(model, "model_dump"):
        # Pydantic v2 / SQLModel
        data = model.model_dump()
    elif hasattr(model, "dict"):
        # Pydantic v1
        data = model.dict()
    elif hasattr(model, "__dict__"):
        # Regular object
        data = {k: v for k, v in model.__dict__.items() if not k.startswith("_")}
    else:
        data = {}

    if fields:
        return {k: v for k, v in data.items() if k in fields}
    return data


class ActivityContext:
    """
    Context manager for tracking changes in update operations.

    Usage:
        with ActivityContext(
            model=employee,
            fields=["full_name", "phone", "department_id"],
            current_user=current_user,
            request=request,
            module="hrm",
            resource_type="employees",
        ) as ctx:
            # Update the model
            employee.full_name = new_data.full_name
            employee.phone = new_data.phone
            session.commit()
        # Activity log is automatically saved on exit
    """

    def __init__(
        self,
        model,
        fields: List[str],
        current_user,
        request,
        module: str,
        resource_type: str,
        resource_code_field: str = None,
    ):
        self.model = model
        self.fields = fields
        self.current_user = current_user
        self.request = request
        self.module = module
        self.resource_type = resource_type
        self.resource_code_field = resource_code_field
        self.old_data = {}
        self.enabled = True

    def __enter__(self):
        # Capture old data
        self.old_data = model_to_dict(self.model, self.fields)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            # Exception occurred, don't log
            return False

        if not self.enabled:
            return False

        try:
            # Capture new data
            new_data = model_to_dict(self.model, self.fields)

            # Extract user info
            user_info = extract_user_info(self.current_user)

            # Get resource code
            resource_code = None
            if self.resource_code_field:
                resource_code = getattr(self.model, self.resource_code_field, None)

            # Log update
            log_update(
                tenant_id=user_info["tenant_id"],
                user_id=user_info["user_id"],
                user_name=user_info["user_name"],
                user_role=user_info["user_role"],
                user_email=user_info["user_email"],
                module=self.module,
                resource_type=self.resource_type,
                resource_id=str(self.model.id),
                resource_code=resource_code,
                old_data=self.old_data,
                new_data=new_data,
                endpoint=str(self.request.url.path),
                method=self.request.method,
                ip_address=get_client_ip(self.request),
                user_agent=self.request.headers.get("user-agent", ""),
            )
        except Exception as e:
            print(f"[ActivityContext] Error logging (non-blocking): {e}")

        return False

    def disable(self):
        """Disable logging for this context (e.g., if operation failed)"""
        self.enabled = False


def track_update(
    model,
    update_data: Dict[str, Any],
    current_user,
    request,
    module: str,
    resource_type: str,
    resource_code_field: str = None,
    fields: List[str] = None,
):
    """
    Simplified helper to track updates. Call BEFORE applying changes.
    Returns a function to call AFTER changes are committed.

    Usage:
        # Before update
        finish_tracking = track_update(
            model=employee,
            update_data=update_dict,
            current_user=current_user,
            request=request,
            module="hrm",
            resource_type="employees",
            resource_code_field="employee_code",
        )

        # Apply changes
        for field, value in update_dict.items():
            setattr(employee, field, value)
        session.commit()

        # After commit
        finish_tracking(employee)
    """
    # Determine fields to track
    if fields is None:
        fields = list(update_data.keys())

    # Capture old data
    old_data = model_to_dict(model, fields)

    def finish(updated_model):
        try:
            new_data = model_to_dict(updated_model, fields)
            user_info = extract_user_info(current_user)

            resource_code = None
            if resource_code_field:
                resource_code = getattr(updated_model, resource_code_field, None)

            log_update(
                tenant_id=user_info["tenant_id"],
                user_id=user_info["user_id"],
                user_name=user_info["user_name"],
                user_role=user_info["user_role"],
                user_email=user_info["user_email"],
                module=module,
                resource_type=resource_type,
                resource_id=str(updated_model.id),
                resource_code=resource_code,
                old_data=old_data,
                new_data=new_data,
                endpoint=str(request.url.path),
                method=request.method,
                ip_address=get_client_ip(request),
                user_agent=request.headers.get("user-agent", ""),
            )
        except Exception as e:
            print(f"[track_update] Error logging (non-blocking): {e}")

    return finish
