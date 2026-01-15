"""
Tenant API Routes
- GET /tenant/me - Get current user's tenant info with enabled modules
- GET /tenant/modules - Get list of enabled modules for current tenant
- PUT /tenant/modules - Update enabled modules (SUPER_ADMIN only)
- PUT /tenant/settings - Update tenant basic settings (TENANT_ADMIN+)
- GET /tenant/all - List all tenants (SUPER_ADMIN only)
- POST /tenant - Create new tenant (SUPER_ADMIN only)
- PUT /tenant/{tenant_id}/modules - Update modules for specific tenant (SUPER_ADMIN only)
"""
from typing import Optional, List
import json
import re
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel, field_validator
from app.db.session import get_session
from app.models import User, Tenant
from app.core.security import get_current_user, hash_password
from app.models.user import UserSystemRole

router = APIRouter(prefix="/tenant", tags=["tenant"])


# Module metadata
MODULE_METADATA = {
    "tms": {
        "name": "TMS",
        "fullName": "Transportation Management",
        "description": "Quản lý vận tải, đơn hàng, xe và tài xế",
        "color": "from-blue-500 to-blue-600",
        "href": "/tms",
    },
    "wms": {
        "name": "WMS",
        "fullName": "Warehouse Management",
        "description": "Quản lý kho hàng, tồn kho và xuất nhập",
        "color": "from-purple-500 to-purple-600",
        "href": "/wms",
    },
    "fms": {
        "name": "FMS",
        "fullName": "Forwarding Management",
        "description": "Quản lý giao nhận, hải quan, chứng từ xuất nhập khẩu",
        "color": "from-indigo-500 to-indigo-600",
        "href": "/fms",
    },
    "pms": {
        "name": "PMS",
        "fullName": "Port Management",
        "description": "Quản lý cảng, depot, ICD, container yard",
        "color": "from-cyan-500 to-cyan-600",
        "href": "/pms",
    },
    "ems": {
        "name": "EMS",
        "fullName": "Express Management",
        "description": "Quản lý chuyển phát nhanh, last-mile, COD",
        "color": "from-yellow-500 to-yellow-600",
        "href": "/ems",
    },
    "mes": {
        "name": "MES",
        "fullName": "Manufacturing Execution",
        "description": "Quản lý sản xuất, BOM, công đoạn, QC",
        "color": "from-slate-500 to-slate-600",
        "href": "/mes",
    },
    "crm": {
        "name": "CRM",
        "fullName": "Customer Relationship",
        "description": "Quản lý khách hàng, bán hàng, cơ hội kinh doanh",
        "color": "from-orange-500 to-orange-600",
        "href": "/crm",
    },
    "hrm": {
        "name": "HRM",
        "fullName": "Human Resource",
        "description": "Quản lý nhân sự, chấm công, lương và tuyển dụng",
        "color": "from-green-500 to-green-600",
        "href": "/hrm",
    },
    "accounting": {
        "name": "Accounting",
        "fullName": "Financial Management",
        "description": "Kế toán, công nợ, sổ cái và báo cáo tài chính",
        "color": "from-teal-500 to-teal-600",
        "href": "/accounting",
    },
    "controlling": {
        "name": "Controlling",
        "fullName": "Cost Controlling",
        "description": "Kiểm soát chi phí, ngân sách, phân tích lợi nhuận",
        "color": "from-pink-500 to-pink-600",
        "href": "/controlling",
    },
    "project": {
        "name": "Project",
        "fullName": "Project Management",
        "description": "Quản lý dự án, milestone, tasks và resources",
        "color": "from-violet-500 to-violet-600",
        "href": "/project",
    },
    "workflow": {
        "name": "Workflow",
        "fullName": "Workflow Engine",
        "description": "Quy trình phê duyệt, automation và BPM",
        "color": "from-rose-500 to-rose-600",
        "href": "/workflow",
    },
    "dms": {
        "name": "DMS",
        "fullName": "Document Management",
        "description": "Quản lý tài liệu, lưu trữ và chia sẻ file",
        "color": "from-amber-500 to-amber-600",
        "href": "/dms",
    },
    "oms": {
        "name": "OMS",
        "fullName": "Order Management",
        "description": "Quản lý đơn hàng, chào giá, phân bổ kho và vận chuyển",
        "color": "from-blue-500 to-blue-600",
        "href": "/oms",
    },
}

# All available modules in order
ALL_MODULE_IDS = ["tms", "wms", "fms", "pms", "ems", "mes", "crm", "hrm", "accounting", "controlling", "project", "workflow", "dms", "oms"]


class ModuleInfo(BaseModel):
    id: str
    name: str
    fullName: str
    description: str
    color: str
    href: str
    enabled: bool


class TenantInfo(BaseModel):
    id: str
    name: str
    code: str
    type: str
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    subscription_plan: str
    subscription_status: str
    timezone: str
    currency: str
    locale: str
    is_active: bool


class TenantMeResponse(BaseModel):
    tenant: TenantInfo
    modules: list[ModuleInfo]
    enabled_module_ids: list[str]


class TenantPublicInfo(BaseModel):
    """Public tenant info (for login page, no auth required)"""
    id: str
    name: str
    code: str
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    is_active: bool


# =====================================================
# PUBLIC APIs (no auth required)
# =====================================================

@router.get("/public/{tenant_code}", response_model=TenantPublicInfo)
def get_tenant_public_info(
    tenant_code: str,
    session: Session = Depends(get_session),
):
    """Get public tenant info by subdomain code (no auth required)

    Used by frontend to show tenant branding on login page
    Example: GET /tenant/public/tinhung → returns Tín Hưng Logistics info
    """
    tenant = session.exec(
        select(Tenant).where(Tenant.code == tenant_code)
    ).first()

    if not tenant:
        raise HTTPException(404, f"Không tìm thấy công ty với mã '{tenant_code}'")

    if hasattr(tenant, 'is_active') and not tenant.is_active:
        raise HTTPException(403, "Công ty này đã bị vô hiệu hóa. Liên hệ 9log.tech để được hỗ trợ.")

    return TenantPublicInfo(
        id=str(tenant.id),
        name=tenant.name,
        code=tenant.code if hasattr(tenant, 'code') and tenant.code else "default",
        logo_url=tenant.logo_url if hasattr(tenant, 'logo_url') else None,
        primary_color=tenant.primary_color if hasattr(tenant, 'primary_color') else None,
        is_active=tenant.is_active if hasattr(tenant, 'is_active') else True,
    )


# Reserved subdomains that cannot be registered
RESERVED_SUBDOMAINS = [
    "app", "www", "admin", "api", "mail", "ftp", "ssh",
    "test", "dev", "staging", "prod", "production", "beta", "alpha",
    "support", "help", "docs", "blog", "shop", "store", "login",
    "register", "signup", "signin", "auth", "oauth", "sso",
    "9log", "9logt", "9logtech", "platform", "system", "root",
]


class SelfRegisterRequest(BaseModel):
    """Self-registration: Customer creates their own tenant + admin account"""
    # Tenant info
    company_name: str  # Tên công ty
    subdomain: str     # Subdomain (e.g., "tinhung" for tinhung.9log.tech)
    company_type: str = "CARRIER"  # CARRIER, FORWARDER, SHIPPER, etc.

    # Admin account info
    admin_email: str
    admin_password: str
    admin_full_name: str
    admin_phone: Optional[str] = None


class SelfRegisterResponse(BaseModel):
    """Response after successful self-registration"""
    tenant_id: str
    tenant_name: str
    subdomain: str
    admin_id: str
    admin_email: str
    message: str
    login_url: str


def validate_subdomain(subdomain: str) -> tuple[bool, str]:
    """Validate subdomain format and availability"""
    # Check format: only lowercase letters, numbers, hyphens
    if not re.match(r'^[a-z][a-z0-9-]{2,29}$', subdomain):
        return False, "Subdomain phải bắt đầu bằng chữ cái, chỉ chứa chữ thường, số và dấu gạch ngang, độ dài 3-30 ký tự"

    # Check reserved
    if subdomain in RESERVED_SUBDOMAINS:
        return False, f"Subdomain '{subdomain}' đã được đặt trước, vui lòng chọn tên khác"

    return True, ""


@router.get("/check-subdomain/{subdomain}")
def check_subdomain_availability(
    subdomain: str,
    session: Session = Depends(get_session),
):
    """Check if a subdomain is available for registration (no auth required)"""
    subdomain = subdomain.lower().strip()

    # Validate format
    is_valid, error_msg = validate_subdomain(subdomain)
    if not is_valid:
        return {
            "available": False,
            "subdomain": subdomain,
            "message": error_msg,
        }

    # Check if already exists
    existing = session.exec(
        select(Tenant).where(Tenant.code == subdomain)
    ).first()

    if existing:
        return {
            "available": False,
            "subdomain": subdomain,
            "message": f"Subdomain '{subdomain}' đã được sử dụng",
        }

    return {
        "available": True,
        "subdomain": subdomain,
        "url": f"{subdomain}.9log.tech",
        "message": f"Subdomain '{subdomain}' có thể sử dụng",
    }


@router.post("/register", response_model=SelfRegisterResponse)
def self_register_tenant(
    payload: SelfRegisterRequest,
    session: Session = Depends(get_session),
):
    """Self-registration: Customer creates their own tenant + admin account

    Flow:
    1. Validate subdomain format and availability
    2. Create new tenant with FREE plan
    3. Create admin user with TENANT_ADMIN role
    4. Return login info
    """
    subdomain = payload.subdomain.lower().strip()

    # Validate subdomain
    is_valid, error_msg = validate_subdomain(subdomain)
    if not is_valid:
        raise HTTPException(400, error_msg)

    # Check subdomain availability
    existing_tenant = session.exec(
        select(Tenant).where(Tenant.code == subdomain)
    ).first()
    if existing_tenant:
        raise HTTPException(400, f"Subdomain '{subdomain}' đã được sử dụng")

    # Check email availability
    existing_user = session.exec(
        select(User).where(User.email == payload.admin_email)
    ).first()
    if existing_user:
        raise HTTPException(400, f"Email '{payload.admin_email}' đã được đăng ký")

    # Validate email format
    if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', payload.admin_email):
        raise HTTPException(400, "Email không hợp lệ")

    # Validate password length
    if len(payload.admin_password) < 6:
        raise HTTPException(400, "Mật khẩu phải có ít nhất 6 ký tự")

    # Create tenant
    tenant_id = str(uuid.uuid4())
    tenant = Tenant(
        id=tenant_id,
        name=payload.company_name,
        code=subdomain,
        type=payload.company_type,
        subscription_plan="FREE",  # Start with FREE plan
        subscription_status="ACTIVE",
        enabled_modules=json.dumps(["tms"]),  # TMS enabled by default
        is_active=True,
        timezone="Asia/Ho_Chi_Minh",
        currency="VND",
        locale="vi-VN",
    )
    session.add(tenant)

    # Create admin user
    admin_id = str(uuid.uuid4())
    admin_user = User(
        id=admin_id,
        tenant_id=tenant_id,
        email=payload.admin_email,
        username=payload.admin_email.split("@")[0],  # Use email prefix as username
        full_name=payload.admin_full_name,
        phone=payload.admin_phone,
        password_hash=hash_password(payload.admin_password),
        role="ADMIN",
        system_role=UserSystemRole.TENANT_ADMIN.value,
        status="ACTIVE",
    )
    session.add(admin_user)

    session.commit()

    return SelfRegisterResponse(
        tenant_id=tenant_id,
        tenant_name=payload.company_name,
        subdomain=subdomain,
        admin_id=admin_id,
        admin_email=payload.admin_email,
        message=f"Đăng ký thành công! Bạn có thể đăng nhập tại {subdomain}.9log.tech",
        login_url=f"https://{subdomain}.9log.tech/login",
    )


@router.get("/me", response_model=TenantMeResponse)
def get_tenant_me(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Get current user's tenant info with enabled modules"""
    # Get tenant
    tenant = session.exec(
        select(Tenant).where(Tenant.id == current_user.tenant_id)
    ).first()

    if not tenant:
        raise HTTPException(404, "Tenant not found")

    # Parse enabled modules from JSON string
    try:
        enabled_module_ids = json.loads(tenant.enabled_modules) if tenant.enabled_modules else ["tms"]
    except json.JSONDecodeError:
        enabled_module_ids = ["tms"]

    # Build module list with enabled status
    modules = []
    for module_id in ALL_MODULE_IDS:
        meta = MODULE_METADATA.get(module_id, {})
        modules.append(ModuleInfo(
            id=module_id,
            name=meta.get("name", module_id.upper()),
            fullName=meta.get("fullName", module_id.upper()),
            description=meta.get("description", ""),
            color=meta.get("color", "from-gray-500 to-gray-600"),
            href=meta.get("href", f"/{module_id}"),
            enabled=module_id in enabled_module_ids,
        ))

    return TenantMeResponse(
        tenant=TenantInfo(
            id=str(tenant.id),
            name=tenant.name,
            code=tenant.code if hasattr(tenant, 'code') and tenant.code else "default",
            type=tenant.type if hasattr(tenant, 'type') and tenant.type else "CARRIER",
            logo_url=tenant.logo_url if hasattr(tenant, 'logo_url') else None,
            primary_color=tenant.primary_color if hasattr(tenant, 'primary_color') else None,
            subscription_plan=tenant.subscription_plan if hasattr(tenant, 'subscription_plan') and tenant.subscription_plan else "FREE",
            subscription_status=tenant.subscription_status if hasattr(tenant, 'subscription_status') and tenant.subscription_status else "ACTIVE",
            timezone=tenant.timezone if hasattr(tenant, 'timezone') and tenant.timezone else "Asia/Ho_Chi_Minh",
            currency=tenant.currency if hasattr(tenant, 'currency') and tenant.currency else "VND",
            locale=tenant.locale if hasattr(tenant, 'locale') and tenant.locale else "vi-VN",
            is_active=tenant.is_active if hasattr(tenant, 'is_active') else True,
        ),
        modules=modules,
        enabled_module_ids=enabled_module_ids,
    )


@router.get("/modules", response_model=list[ModuleInfo])
def get_tenant_modules(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Get list of all modules with enabled status for current tenant"""
    # Get tenant
    tenant = session.exec(
        select(Tenant).where(Tenant.id == current_user.tenant_id)
    ).first()

    if not tenant:
        raise HTTPException(404, "Tenant not found")

    # Parse enabled modules
    try:
        enabled_module_ids = json.loads(tenant.enabled_modules) if tenant.enabled_modules else ["tms"]
    except json.JSONDecodeError:
        enabled_module_ids = ["tms"]

    # Build module list
    modules = []
    for module_id in ALL_MODULE_IDS:
        meta = MODULE_METADATA.get(module_id, {})
        modules.append(ModuleInfo(
            id=module_id,
            name=meta.get("name", module_id.upper()),
            fullName=meta.get("fullName", module_id.upper()),
            description=meta.get("description", ""),
            color=meta.get("color", "from-gray-500 to-gray-600"),
            href=meta.get("href", f"/{module_id}"),
            enabled=module_id in enabled_module_ids,
        ))

    return modules


@router.get("/enabled-modules", response_model=list[str])
def get_enabled_module_ids(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Get list of enabled module IDs for current tenant (simple list)"""
    tenant = session.exec(
        select(Tenant).where(Tenant.id == current_user.tenant_id)
    ).first()

    if not tenant:
        raise HTTPException(404, "Tenant not found")

    try:
        enabled_module_ids = json.loads(tenant.enabled_modules) if tenant.enabled_modules else ["tms"]
    except json.JSONDecodeError:
        enabled_module_ids = ["tms"]

    return enabled_module_ids


class UpdateModulesRequest(BaseModel):
    enabled_modules: list[str]


class UpdateTenantSettingsRequest(BaseModel):
    """Settings that Tenant Admin can update"""
    name: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    timezone: Optional[str] = None
    currency: Optional[str] = None
    locale: Optional[str] = None


class TenantListItem(BaseModel):
    """Tenant item for Super Admin list view"""
    id: str
    name: str
    code: str
    type: str
    subscription_plan: str
    subscription_status: str
    is_active: bool
    enabled_modules: list[str]
    user_count: int = 0


class CreateTenantRequest(BaseModel):
    """Create new tenant (Super Admin only)"""
    name: str
    code: str
    type: str = "CARRIER"
    subscription_plan: str = "FREE"
    enabled_modules: list[str] = ["tms"]


def is_super_admin(user: User) -> bool:
    """Check if user is Super Admin (9log.tech platform admin)"""
    return user.system_role == UserSystemRole.SUPER_ADMIN.value


def is_tenant_admin_or_higher(user: User) -> bool:
    """Check if user is Tenant Admin or Super Admin"""
    return user.system_role in [
        UserSystemRole.SUPER_ADMIN.value,
        UserSystemRole.TENANT_ADMIN.value
    ] or user.role == "ADMIN"


@router.put("/modules", response_model=list[str])
def update_enabled_modules(
    payload: UpdateModulesRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Update enabled modules for current tenant (SUPER_ADMIN only)

    Note: Only Super Admin can enable/disable modules.
    Tenant Admin can only view modules status.
    """
    # Only Super Admin can change modules
    if not is_super_admin(current_user):
        raise HTTPException(403, "Chỉ Super Admin mới có thể thay đổi modules. Liên hệ 9log.tech để kích hoạt.")

    tenant = session.exec(
        select(Tenant).where(Tenant.id == current_user.tenant_id)
    ).first()

    if not tenant:
        raise HTTPException(404, "Tenant not found")

    # Validate module IDs
    valid_modules = [m for m in payload.enabled_modules if m in ALL_MODULE_IDS]

    # Ensure at least TMS is always enabled
    if "tms" not in valid_modules:
        valid_modules.insert(0, "tms")

    # Update tenant
    tenant.enabled_modules = json.dumps(valid_modules)
    session.add(tenant)
    session.commit()

    return valid_modules


@router.put("/settings")
def update_tenant_settings(
    payload: UpdateTenantSettingsRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Update tenant basic settings (Tenant Admin or higher)

    Tenant Admin can update: name, logo, colors, timezone, currency, locale
    """
    if not is_tenant_admin_or_higher(current_user):
        raise HTTPException(403, "Chỉ Admin mới có thể thay đổi cài đặt")

    tenant = session.exec(
        select(Tenant).where(Tenant.id == current_user.tenant_id)
    ).first()

    if not tenant:
        raise HTTPException(404, "Tenant not found")

    # Update only provided fields
    if payload.name is not None:
        tenant.name = payload.name
    if payload.logo_url is not None:
        tenant.logo_url = payload.logo_url
    if payload.primary_color is not None:
        tenant.primary_color = payload.primary_color
    if payload.timezone is not None:
        tenant.timezone = payload.timezone
    if payload.currency is not None:
        tenant.currency = payload.currency
    if payload.locale is not None:
        tenant.locale = payload.locale

    session.add(tenant)
    session.commit()
    session.refresh(tenant)

    return {"message": "Cập nhật thành công", "tenant_id": str(tenant.id)}


# =====================================================
# SUPER ADMIN APIs - Manage all tenants
# =====================================================

@router.get("/all", response_model=list[TenantListItem])
def list_all_tenants(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """List all tenants (SUPER_ADMIN only)"""
    if not is_super_admin(current_user):
        raise HTTPException(403, "Chỉ Super Admin mới có quyền truy cập")

    tenants = session.exec(select(Tenant)).all()

    result = []
    for tenant in tenants:
        # Count users in this tenant
        user_count = len(session.exec(
            select(User).where(User.tenant_id == tenant.id)
        ).all())

        # Parse enabled modules
        try:
            enabled_modules = json.loads(tenant.enabled_modules) if tenant.enabled_modules else ["tms"]
        except json.JSONDecodeError:
            enabled_modules = ["tms"]

        result.append(TenantListItem(
            id=str(tenant.id),
            name=tenant.name,
            code=tenant.code if hasattr(tenant, 'code') and tenant.code else "default",
            type=tenant.type if hasattr(tenant, 'type') and tenant.type else "CARRIER",
            subscription_plan=tenant.subscription_plan if hasattr(tenant, 'subscription_plan') and tenant.subscription_plan else "FREE",
            subscription_status=tenant.subscription_status if hasattr(tenant, 'subscription_status') and tenant.subscription_status else "ACTIVE",
            is_active=tenant.is_active if hasattr(tenant, 'is_active') else True,
            enabled_modules=enabled_modules,
            user_count=user_count,
        ))

    return result


@router.post("/create")
def create_tenant(
    payload: CreateTenantRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Create new tenant (SUPER_ADMIN only)"""
    if not is_super_admin(current_user):
        raise HTTPException(403, "Chỉ Super Admin mới có quyền tạo tenant")

    # Check if code already exists
    existing = session.exec(
        select(Tenant).where(Tenant.code == payload.code)
    ).first()
    if existing:
        raise HTTPException(400, f"Mã tenant '{payload.code}' đã tồn tại")

    # Validate modules
    valid_modules = [m for m in payload.enabled_modules if m in ALL_MODULE_IDS]
    if "tms" not in valid_modules:
        valid_modules.insert(0, "tms")

    tenant = Tenant(
        name=payload.name,
        code=payload.code,
        type=payload.type,
        subscription_plan=payload.subscription_plan,
        subscription_status="ACTIVE",
        enabled_modules=json.dumps(valid_modules),
        is_active=True,
        timezone="Asia/Ho_Chi_Minh",
        currency="VND",
        locale="vi-VN",
    )
    session.add(tenant)
    session.commit()
    session.refresh(tenant)

    return {"message": "Tạo tenant thành công", "tenant_id": str(tenant.id)}


@router.put("/{tenant_id}/modules", response_model=list[str])
def update_tenant_modules_by_id(
    tenant_id: str,
    payload: UpdateModulesRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Update modules for specific tenant (SUPER_ADMIN only)"""
    if not is_super_admin(current_user):
        raise HTTPException(403, "Chỉ Super Admin mới có quyền thay đổi modules")

    tenant = session.exec(
        select(Tenant).where(Tenant.id == tenant_id)
    ).first()

    if not tenant:
        raise HTTPException(404, "Tenant not found")

    # Validate module IDs
    valid_modules = [m for m in payload.enabled_modules if m in ALL_MODULE_IDS]
    if "tms" not in valid_modules:
        valid_modules.insert(0, "tms")

    tenant.enabled_modules = json.dumps(valid_modules)
    session.add(tenant)
    session.commit()

    return valid_modules


@router.put("/{tenant_id}/subscription")
def update_tenant_subscription(
    tenant_id: str,
    plan: str,
    status: str = "ACTIVE",
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Update subscription plan for tenant (SUPER_ADMIN only)"""
    if not is_super_admin(current_user):
        raise HTTPException(403, "Chỉ Super Admin mới có quyền thay đổi subscription")

    tenant = session.exec(
        select(Tenant).where(Tenant.id == tenant_id)
    ).first()

    if not tenant:
        raise HTTPException(404, "Tenant not found")

    tenant.subscription_plan = plan
    tenant.subscription_status = status
    session.add(tenant)
    session.commit()

    return {"message": "Cập nhật subscription thành công"}


@router.put("/{tenant_id}/status")
def toggle_tenant_status(
    tenant_id: str,
    is_active: bool,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Enable/Disable tenant (SUPER_ADMIN only)"""
    if not is_super_admin(current_user):
        raise HTTPException(403, "Chỉ Super Admin mới có quyền thay đổi trạng thái")

    tenant = session.exec(
        select(Tenant).where(Tenant.id == tenant_id)
    ).first()

    if not tenant:
        raise HTTPException(404, "Tenant not found")

    tenant.is_active = is_active
    session.add(tenant)
    session.commit()

    return {"message": f"Tenant đã được {'kích hoạt' if is_active else 'vô hiệu hóa'}"}
