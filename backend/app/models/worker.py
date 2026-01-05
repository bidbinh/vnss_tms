"""
Personal Workspace - Worker Model

Mỗi worker (cá nhân) có workspace riêng tại: {username}.9log.tech
Worker có thể nhận công việc từ nhiều công ty khác nhau thông qua workspace invitations.
"""
from typing import Optional
from sqlmodel import SQLModel, Field
from enum import Enum
from app.models.base import BaseUUIDModel, TimestampMixin


class WorkerStatus(str, Enum):
    """Worker account status"""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    SUSPENDED = "SUSPENDED"
    PENDING_VERIFICATION = "PENDING_VERIFICATION"


class Worker(BaseUUIDModel, TimestampMixin, SQLModel, table=True):
    """
    Worker - Cá nhân có workspace riêng.

    Đây là tài khoản độc lập, không thuộc về tenant nào.
    Worker có thể được mời vào nhiều tenant khác nhau để làm việc.

    Example: minh.9log.tech - Tài xế Minh có thể nhận việc từ nhiều công ty
    """
    __tablename__ = "workers"

    # === Unique identity ===
    # username sẽ là subdomain: minh.9log.tech
    username: str = Field(index=True, unique=True, nullable=False)
    email: str = Field(index=True, unique=True, nullable=False)
    phone: Optional[str] = Field(default=None, index=True)
    password_hash: str = Field(nullable=False)

    # === Profile ===
    full_name: str = Field(nullable=False)
    avatar_url: Optional[str] = Field(default=None)
    cover_photo_url: Optional[str] = Field(default=None)
    bio: Optional[str] = Field(default=None)  # Giới thiệu ngắn

    # === Professional info ===
    job_title: Optional[str] = Field(default=None)  # Tài xế, Kế toán, Developer...
    skills: Optional[str] = Field(default=None)  # JSON array: ["driving", "excel", "accounting"]
    experience_years: Optional[int] = Field(default=None)

    # === Location ===
    city: Optional[str] = Field(default=None)
    province: Optional[str] = Field(default=None)
    country: str = Field(default="VN")
    address: Optional[str] = Field(default=None)

    # === Identity documents ===
    id_number: Optional[str] = Field(default=None)  # CCCD/CMND
    id_issue_date: Optional[str] = Field(default=None)
    id_issue_place: Optional[str] = Field(default=None)

    # === License (for drivers) ===
    license_number: Optional[str] = Field(default=None)
    license_class: Optional[str] = Field(default=None)  # B2, C, D, E, FC...
    license_expiry: Optional[str] = Field(default=None)

    # === Bank info ===
    bank_name: Optional[str] = Field(default=None)
    bank_branch: Optional[str] = Field(default=None)
    bank_account: Optional[str] = Field(default=None)
    bank_account_name: Optional[str] = Field(default=None)

    # === Social links ===
    facebook_url: Optional[str] = Field(default=None)
    zalo_phone: Optional[str] = Field(default=None)
    linkedin_url: Optional[str] = Field(default=None)

    # === Settings ===
    is_available: bool = Field(default=True)  # Sẵn sàng nhận việc
    preferred_work_types: Optional[str] = Field(default=None)  # JSON: ["driver", "delivery"]
    preferred_locations: Optional[str] = Field(default=None)  # JSON: ["HCM", "BD", "DN"]

    # === Account status ===
    status: str = Field(default=WorkerStatus.ACTIVE.value, index=True)
    email_verified: bool = Field(default=False)
    phone_verified: bool = Field(default=False)

    # === Security ===
    last_login_at: Optional[str] = Field(default=None)
    password_changed_at: Optional[str] = Field(default=None)
    failed_login_attempts: int = Field(default=0)
    locked_until: Optional[str] = Field(default=None)


class WorkspaceInvitationStatus(str, Enum):
    """Invitation status"""
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"
    EXPIRED = "EXPIRED"
    REVOKED = "REVOKED"


class WorkspaceInvitation(BaseUUIDModel, TimestampMixin, SQLModel, table=True):
    """
    Lời mời Worker vào workspace của Tenant.

    Flow:
    1. Company (Tenant) gửi invitation đến Worker (via email/username)
    2. Worker nhận được notification, xem chi tiết
    3. Worker accept/decline
    4. Nếu accept → WorkerTenantAccess được tạo
    """
    __tablename__ = "workspace_invitations"

    # === Who invites ===
    tenant_id: str = Field(index=True, nullable=False, foreign_key="tenants.id")
    invited_by_user_id: str = Field(index=True, nullable=False)  # User trong tenant gửi lời mời

    # === Who is invited ===
    # Có thể mời bằng email (worker chưa đăng ký) hoặc worker_id (đã đăng ký)
    worker_id: Optional[str] = Field(default=None, index=True, foreign_key="workers.id")
    invited_email: Optional[str] = Field(default=None, index=True)  # Email nếu worker chưa có tài khoản

    # === Invitation details ===
    role: str = Field(default="WORKER")  # Role trong tenant: DRIVER, WORKER, FREELANCER...
    message: Optional[str] = Field(default=None)  # Lời nhắn từ công ty

    # === Permissions được cấp ===
    # JSON: {"modules": ["tms"], "permissions": ["view_orders", "update_status"]}
    permissions_json: Optional[str] = Field(default=None)

    # === Status ===
    status: str = Field(default=WorkspaceInvitationStatus.PENDING.value, index=True)
    expires_at: Optional[str] = Field(default=None)

    # === Response ===
    responded_at: Optional[str] = Field(default=None)
    decline_reason: Optional[str] = Field(default=None)

    # === Token for email link ===
    invitation_token: str = Field(index=True, unique=True, nullable=False)


class WorkerTenantAccess(BaseUUIDModel, TimestampMixin, SQLModel, table=True):
    """
    Quan hệ giữa Worker và Tenant - Worker được access vào tenant nào.

    Khi Worker accept invitation, một record WorkerTenantAccess được tạo.
    Worker có thể có nhiều tenant_access (làm việc cho nhiều công ty).
    """
    __tablename__ = "worker_tenant_access"

    # === Links ===
    worker_id: str = Field(index=True, nullable=False, foreign_key="workers.id")
    tenant_id: str = Field(index=True, nullable=False, foreign_key="tenants.id")
    invitation_id: Optional[str] = Field(default=None, foreign_key="workspace_invitations.id")

    # === Role trong tenant ===
    # Single role (legacy, still used)
    role: str = Field(default="WORKER")  # Primary role: DRIVER, WORKER, FREELANCER, CONTRACTOR...
    # Multiple roles (new - JSON array): ["DRIVER", "ACCOUNTANT"]
    roles_json: Optional[str] = Field(default=None)  # JSON array of all roles

    # === Permissions ===
    # JSON: {"modules": ["tms"], "permissions": ["view_orders", "update_order_status"]}
    permissions_json: Optional[str] = Field(default=None)

    # === Status ===
    is_active: bool = Field(default=True, index=True)
    deactivated_at: Optional[str] = Field(default=None)
    deactivated_reason: Optional[str] = Field(default=None)

    # === Stats ===
    total_tasks_completed: int = Field(default=0)
    last_task_at: Optional[str] = Field(default=None)
    rating: Optional[float] = Field(default=None)  # Rating từ công ty (1-5)
    total_ratings: int = Field(default=0)


class WorkerTask(BaseUUIDModel, TimestampMixin, SQLModel, table=True):
    """
    Task được giao cho Worker từ một Tenant.

    Đây là bản ghi công việc worker thực hiện, link đến các entity
    trong tenant (Order, Trip, etc.)
    """
    __tablename__ = "worker_tasks"

    # === Links ===
    worker_id: str = Field(index=True, nullable=False, foreign_key="workers.id")
    tenant_id: str = Field(index=True, nullable=False, foreign_key="tenants.id")
    access_id: str = Field(index=True, nullable=False, foreign_key="worker_tenant_access.id")

    # === Task reference ===
    # Link đến entity trong tenant system
    task_type: str = Field(index=True, nullable=False)  # ORDER, TRIP, DELIVERY, ACCOUNTING...
    task_ref_id: str = Field(index=True, nullable=False)  # ID của Order/Trip trong tenant
    task_code: Optional[str] = Field(default=None)  # Mã đơn hàng hiển thị

    # === Role used for this task ===
    role_used: str = Field(default="WORKER", index=True)  # DRIVER, ACCOUNTANT, WORKER...

    # === Task info (snapshot) ===
    title: str = Field(nullable=False)  # Mô tả ngắn: "Giao hàng HCM -> Bình Dương"
    description: Optional[str] = Field(default=None)

    # === Assignment ===
    assigned_at: str = Field(nullable=False)
    assigned_by_user_id: Optional[str] = Field(default=None)

    # === Timeline ===
    scheduled_start: Optional[str] = Field(default=None)
    scheduled_end: Optional[str] = Field(default=None)
    actual_start: Optional[str] = Field(default=None)
    actual_end: Optional[str] = Field(default=None)

    # === Status ===
    status: str = Field(default="ASSIGNED", index=True)  # ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED

    # === Payment ===
    payment_amount: Optional[float] = Field(default=None)
    payment_status: Optional[str] = Field(default=None)  # PENDING, PAID
    paid_at: Optional[str] = Field(default=None)

    # === Notes ===
    worker_notes: Optional[str] = Field(default=None)
    company_notes: Optional[str] = Field(default=None)
