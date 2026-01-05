"""
Workspace Sharing/Invitation API

Cho phép công ty (Tenant) mời Worker vào làm việc.
Worker có thể accept/decline invitation.
"""
from datetime import datetime, timedelta
import secrets
import json
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select, and_
from sqlalchemy import or_

from app.db.session import get_session
from app.models import User, Tenant, Driver, DriverSource
from app.models.worker import (
    Worker, WorkerStatus,
    WorkspaceInvitation, WorkspaceInvitationStatus,
    WorkerTenantAccess,
    WorkerTask,
)
from app.core.security import get_current_user
from app.api.v1.routes.worker_auth import get_current_worker

router = APIRouter(prefix="/workspace", tags=["workspace"])


# ==================== SCHEMAS ====================

class InviteWorkerRequest(BaseModel):
    """Request để mời worker vào workspace"""
    email: Optional[str] = None  # Email để mời (nếu worker chưa có tài khoản)
    worker_username: Optional[str] = None  # Username nếu worker đã có tài khoản
    role: str = "WORKER"  # DRIVER, WORKER, FREELANCER, CONTRACTOR
    message: Optional[str] = None  # Lời nhắn
    permissions: Optional[dict] = None  # {"modules": ["tms"], "permissions": ["view_orders"]}


class RespondInvitationRequest(BaseModel):
    """Worker response to invitation"""
    accept: bool
    decline_reason: Optional[str] = None


class AssignTaskRequest(BaseModel):
    """Giao task cho worker"""
    worker_id: str
    task_type: str  # ORDER, TRIP, DELIVERY
    task_ref_id: str  # ID của order/trip trong tenant
    task_code: Optional[str] = None
    title: str
    description: Optional[str] = None
    scheduled_start: Optional[str] = None
    scheduled_end: Optional[str] = None
    payment_amount: Optional[float] = None


# ==================== TENANT ENDPOINTS (Company side) ====================

@router.post("/invite")
def invite_worker(
    data: InviteWorkerRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Mời worker vào workspace của công ty.

    Có thể mời bằng:
    - email: Gửi email invitation (worker có thể chưa có tài khoản)
    - worker_username: Mời worker đã có tài khoản
    """
    tenant_id = str(current_user.tenant_id)

    # Validate role
    if current_user.role not in ["ADMIN", "MANAGER", "HR", "HR_MANAGER"]:
        if current_user.system_role not in ["SUPER_ADMIN", "TENANT_ADMIN"]:
            raise HTTPException(403, "Không có quyền mời worker")

    # Find worker if username provided
    worker = None
    invited_email = data.email

    if data.worker_username:
        worker = session.exec(
            select(Worker).where(Worker.username == data.worker_username.lower())
        ).first()
        if not worker:
            raise HTTPException(404, f"Không tìm thấy worker: {data.worker_username}")
        invited_email = worker.email

    if not invited_email and not worker:
        raise HTTPException(400, "Vui lòng cung cấp email hoặc username của worker")

    # Check if already invited or connected
    existing_access = session.exec(
        select(WorkerTenantAccess).where(
            and_(
                WorkerTenantAccess.tenant_id == tenant_id,
                WorkerTenantAccess.worker_id == worker.id if worker else None,
            )
        )
    ).first() if worker else None

    if existing_access and existing_access.is_active:
        raise HTTPException(400, "Worker đã được kết nối với công ty")

    # Check pending invitation
    pending_conditions = [
        WorkspaceInvitation.tenant_id == tenant_id,
        WorkspaceInvitation.status == WorkspaceInvitationStatus.PENDING.value,
    ]

    # Build OR condition for worker_id or email
    if worker and invited_email:
        pending_conditions.append(
            or_(
                WorkspaceInvitation.worker_id == worker.id,
                WorkspaceInvitation.invited_email == invited_email,
            )
        )
    elif worker:
        pending_conditions.append(WorkspaceInvitation.worker_id == worker.id)
    elif invited_email:
        pending_conditions.append(WorkspaceInvitation.invited_email == invited_email)

    existing_invite = session.exec(
        select(WorkspaceInvitation).where(and_(*pending_conditions))
    ).first()

    if existing_invite:
        raise HTTPException(400, "Đã có lời mời đang chờ xử lý")

    # Create invitation
    print(f"[invite] Creating invitation for worker_id={worker.id if worker else None}, email={invited_email}")
    invitation = WorkspaceInvitation(
        tenant_id=tenant_id,
        invited_by_user_id=str(current_user.id),
        worker_id=worker.id if worker else None,
        invited_email=invited_email,
        role=data.role,
        message=data.message,
        permissions_json=json.dumps(data.permissions) if data.permissions else None,
        status=WorkspaceInvitationStatus.PENDING.value,
        expires_at=(datetime.utcnow() + timedelta(days=7)).isoformat(),
        invitation_token=secrets.token_urlsafe(32),
    )

    session.add(invitation)
    session.commit()
    session.refresh(invitation)

    # Get tenant info for response
    tenant = session.get(Tenant, tenant_id)

    return {
        "message": "Đã gửi lời mời thành công",
        "invitation": {
            "id": invitation.id,
            "worker_username": worker.username if worker else None,
            "invited_email": invited_email,
            "role": invitation.role,
            "status": invitation.status,
            "expires_at": invitation.expires_at,
            "invitation_link": f"https://9log.tech/invite/{invitation.invitation_token}",
        },
        "tenant": {
            "name": tenant.name if tenant else None,
            "code": tenant.code if tenant else None,
        }
    }


@router.get("/invitations")
def list_invitations(
    status: Optional[str] = Query(None, description="Filter by status"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Danh sách lời mời từ công ty"""
    tenant_id = str(current_user.tenant_id)

    query = select(WorkspaceInvitation).where(
        WorkspaceInvitation.tenant_id == tenant_id
    )

    if status:
        query = query.where(WorkspaceInvitation.status == status)

    query = query.order_by(WorkspaceInvitation.created_at.desc())
    invitations = session.exec(query).all()

    result = []
    for inv in invitations:
        worker_info = None
        if inv.worker_id:
            worker = session.get(Worker, inv.worker_id)
            if worker:
                worker_info = {
                    "id": worker.id,
                    "username": worker.username,
                    "full_name": worker.full_name,
                    "avatar_url": worker.avatar_url,
                }

        result.append({
            "id": inv.id,
            "worker": worker_info,
            "invited_email": inv.invited_email,
            "role": inv.role,
            "status": inv.status,
            "message": inv.message,
            "created_at": inv.created_at.isoformat() if inv.created_at else None,
            "expires_at": inv.expires_at,
            "responded_at": inv.responded_at,
        })

    return {"invitations": result}


@router.delete("/invitations/{invitation_id}")
def revoke_invitation(
    invitation_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Hủy lời mời"""
    tenant_id = str(current_user.tenant_id)

    invitation = session.get(WorkspaceInvitation, invitation_id)
    if not invitation or invitation.tenant_id != tenant_id:
        raise HTTPException(404, "Không tìm thấy lời mời")

    if invitation.status != WorkspaceInvitationStatus.PENDING.value:
        raise HTTPException(400, "Chỉ có thể hủy lời mời đang chờ")

    invitation.status = WorkspaceInvitationStatus.REVOKED.value
    session.add(invitation)
    session.commit()

    return {"message": "Đã hủy lời mời"}


@router.get("/workers")
def list_connected_workers(
    is_active: Optional[bool] = Query(True, description="Filter active workers"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Danh sách workers đã kết nối với công ty"""
    tenant_id = str(current_user.tenant_id)

    query = select(WorkerTenantAccess).where(
        WorkerTenantAccess.tenant_id == tenant_id
    )

    if is_active is not None:
        query = query.where(WorkerTenantAccess.is_active == is_active)

    accesses = session.exec(query).all()

    result = []
    for access in accesses:
        worker = session.get(Worker, access.worker_id)
        if worker:
            result.append({
                "access_id": access.id,
                "worker": {
                    "id": worker.id,
                    "username": worker.username,
                    "full_name": worker.full_name,
                    "email": worker.email,
                    "phone": worker.phone,
                    "avatar_url": worker.avatar_url,
                    "job_title": worker.job_title,
                    "is_available": worker.is_available,
                    "license_class": worker.license_class,
                },
                "role": access.role,
                "is_active": access.is_active,
                "total_tasks_completed": access.total_tasks_completed,
                "last_task_at": access.last_task_at,
                "rating": access.rating,
                "connected_at": access.created_at.isoformat() if access.created_at else None,
            })

    return {"workers": result}


@router.delete("/workers/{access_id}")
def disconnect_worker(
    access_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Hủy kết nối với worker (deactivate access)"""
    tenant_id = str(current_user.tenant_id)

    # Validate role
    if current_user.role not in ["ADMIN", "MANAGER", "HR", "HR_MANAGER"]:
        if current_user.system_role not in ["SUPER_ADMIN", "TENANT_ADMIN"]:
            raise HTTPException(403, "Không có quyền hủy kết nối worker")

    # Find access record
    access = session.get(WorkerTenantAccess, access_id)
    if not access or access.tenant_id != tenant_id:
        raise HTTPException(404, "Không tìm thấy kết nối")

    if not access.is_active:
        raise HTTPException(400, "Kết nối đã bị hủy trước đó")

    # Deactivate (soft delete)
    access.is_active = False
    access.deactivated_at = datetime.utcnow().isoformat()
    access.deactivated_reason = f"Disconnected by {current_user.full_name or current_user.email}"

    session.add(access)

    # Also deactivate corresponding external driver if exists
    worker = session.get(Worker, access.worker_id)
    if worker and access.role == "DRIVER":
        driver = session.exec(
            select(Driver).where(
                and_(
                    Driver.tenant_id == tenant_id,
                    Driver.external_worker_id == worker.id,
                )
            )
        ).first()
        if driver:
            driver.status = "INACTIVE"
            session.add(driver)

    session.commit()

    return {"message": "Đã hủy kết nối với worker"}


@router.post("/assign-task")
def assign_task_to_worker(
    data: AssignTaskRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Giao task cho worker"""
    tenant_id = str(current_user.tenant_id)

    # Check worker access
    access = session.exec(
        select(WorkerTenantAccess).where(
            and_(
                WorkerTenantAccess.worker_id == data.worker_id,
                WorkerTenantAccess.tenant_id == tenant_id,
                WorkerTenantAccess.is_active == True,
            )
        )
    ).first()

    if not access:
        raise HTTPException(400, "Worker chưa được kết nối với công ty")

    # Create task
    task = WorkerTask(
        worker_id=data.worker_id,
        tenant_id=tenant_id,
        access_id=access.id,
        task_type=data.task_type,
        task_ref_id=data.task_ref_id,
        task_code=data.task_code,
        title=data.title,
        description=data.description,
        assigned_at=datetime.utcnow().isoformat(),
        assigned_by_user_id=str(current_user.id),
        scheduled_start=data.scheduled_start,
        scheduled_end=data.scheduled_end,
        payment_amount=data.payment_amount,
        status="ASSIGNED",
    )

    session.add(task)
    session.commit()
    session.refresh(task)

    return {
        "message": "Đã giao task cho worker",
        "task": {
            "id": task.id,
            "task_type": task.task_type,
            "task_code": task.task_code,
            "title": task.title,
            "status": task.status,
        }
    }


# ==================== WORKER ENDPOINTS (Worker side) ====================

@router.get("/my-invitations")
def get_my_invitations(
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """Danh sách lời mời worker nhận được"""
    print(f"[my-invitations] Worker ID: {worker.id} (type: {type(worker.id).__name__})")
    print(f"[my-invitations] Email: '{worker.email}', Username: '{worker.username}'")

    # First, check ALL pending invitations for debugging
    all_pending = session.exec(
        select(WorkspaceInvitation).where(
            WorkspaceInvitation.status == WorkspaceInvitationStatus.PENDING.value
        )
    ).all()
    print(f"[my-invitations] ALL pending invitations in DB: {len(all_pending)}")
    for inv in all_pending:
        match_worker_id = str(inv.worker_id) == str(worker.id) if inv.worker_id else False
        match_email = inv.invited_email == worker.email if inv.invited_email else False
        print(f"  - ID: {inv.id}")
        print(f"    worker_id: '{inv.worker_id}' (match: {match_worker_id})")
        print(f"    email: '{inv.invited_email}' (match: {match_email})")

    # Query by worker_id OR email
    invitations = session.exec(
        select(WorkspaceInvitation).where(
            and_(
                or_(
                    WorkspaceInvitation.worker_id == worker.id,
                    WorkspaceInvitation.invited_email == worker.email,
                ),
                WorkspaceInvitation.status == WorkspaceInvitationStatus.PENDING.value,
            )
        ).order_by(WorkspaceInvitation.created_at.desc())
    ).all()

    print(f"[my-invitations] Found {len(invitations)} invitations for this worker")

    result = []
    for inv in invitations:
        tenant = session.get(Tenant, inv.tenant_id)
        result.append({
            "id": inv.id,
            "tenant": {
                "id": inv.tenant_id,
                "name": tenant.name if tenant else None,
                "code": tenant.code if tenant else None,
                "logo_url": tenant.logo_url if tenant else None,
            },
            "role": inv.role,
            "message": inv.message,
            "created_at": inv.created_at.isoformat() if inv.created_at else None,
            "expires_at": inv.expires_at,
        })

    return {"invitations": result}


@router.post("/invitations/{invitation_id}/respond")
def respond_to_invitation(
    invitation_id: str,
    data: RespondInvitationRequest,
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """Accept hoặc decline lời mời"""
    invitation = session.get(WorkspaceInvitation, invitation_id)

    if not invitation:
        raise HTTPException(404, "Không tìm thấy lời mời")

    # Verify invitation belongs to this worker
    if invitation.worker_id != worker.id and invitation.invited_email != worker.email:
        raise HTTPException(403, "Lời mời không thuộc về bạn")

    if invitation.status != WorkspaceInvitationStatus.PENDING.value:
        raise HTTPException(400, "Lời mời đã được xử lý")

    # Check expiry
    if invitation.expires_at:
        expires = datetime.fromisoformat(invitation.expires_at)
        if datetime.utcnow() > expires:
            invitation.status = WorkspaceInvitationStatus.EXPIRED.value
            session.add(invitation)
            session.commit()
            raise HTTPException(400, "Lời mời đã hết hạn")

    if data.accept:
        # Accept invitation - create or reactivate access
        invitation.status = WorkspaceInvitationStatus.ACCEPTED.value
        invitation.responded_at = datetime.utcnow().isoformat()

        # Check if access already exists (could be deactivated)
        existing_access = session.exec(
            select(WorkerTenantAccess).where(
                and_(
                    WorkerTenantAccess.worker_id == worker.id,
                    WorkerTenantAccess.tenant_id == invitation.tenant_id,
                )
            )
        ).first()

        if existing_access:
            # Reactivate existing access
            existing_access.is_active = True
            existing_access.role = invitation.role
            existing_access.permissions_json = invitation.permissions_json
            existing_access.deactivated_at = None
            existing_access.deactivated_reason = None
            access = existing_access
        else:
            # Create new tenant access
            access = WorkerTenantAccess(
                worker_id=worker.id,
                tenant_id=invitation.tenant_id,
                invitation_id=invitation.id,
                role=invitation.role,
                permissions_json=invitation.permissions_json,
                is_active=True,
            )
            session.add(access)

        session.add(invitation)

        # Auto-create or reactivate Driver record if role is DRIVER
        if invitation.role == "DRIVER":
            # Check if driver already exists for this external worker
            existing_driver = session.exec(
                select(Driver).where(
                    and_(
                        Driver.tenant_id == invitation.tenant_id,
                        Driver.external_worker_id == worker.id,
                    )
                )
            ).first()

            if existing_driver:
                # Reactivate existing driver
                existing_driver.status = "ACTIVE"
                existing_driver.name = worker.full_name or worker.username
                existing_driver.phone = worker.phone or existing_driver.phone
                existing_driver.license_no = worker.license_number or existing_driver.license_no
                session.add(existing_driver)
            else:
                # Create new driver linked to external worker
                new_driver = Driver(
                    tenant_id=invitation.tenant_id,
                    name=worker.full_name or worker.username,
                    phone=worker.phone or "",
                    source=DriverSource.EXTERNAL,
                    external_worker_id=worker.id,
                    external_worker_username=worker.username,
                    status="ACTIVE",
                    license_no=worker.license_number,
                )
                session.add(new_driver)

        session.commit()

        # Auto-sync existing orders assigned to this worker (if DRIVER role)
        synced_tasks = []
        if invitation.role == "DRIVER":
            try:
                from app.core.worker_task_sync import sync_all_orders_for_worker
                synced_tasks = sync_all_orders_for_worker(session, worker.id, invitation.tenant_id)
            except Exception as e:
                print(f"[Workspace] Error syncing existing orders: {e}")

        tenant = session.get(Tenant, invitation.tenant_id)

        return {
            "message": f"Đã chấp nhận lời mời từ {tenant.name if tenant else 'công ty'}",
            "access": {
                "id": access.id,
                "tenant_id": access.tenant_id,
                "tenant_name": tenant.name if tenant else None,
                "role": access.role,
            },
            "synced_tasks_count": len(synced_tasks),
        }
    else:
        # Decline invitation
        invitation.status = WorkspaceInvitationStatus.DECLINED.value
        invitation.responded_at = datetime.utcnow().isoformat()
        invitation.decline_reason = data.decline_reason

        session.add(invitation)
        session.commit()

        return {"message": "Đã từ chối lời mời"}


@router.get("/my-tenants")
def get_my_tenants(
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """Danh sách công ty worker đang làm việc"""
    accesses = session.exec(
        select(WorkerTenantAccess).where(
            and_(
                WorkerTenantAccess.worker_id == worker.id,
                WorkerTenantAccess.is_active == True,
            )
        )
    ).all()

    result = []
    for access in accesses:
        tenant = session.get(Tenant, access.tenant_id)
        if tenant:
            # Count active tasks
            active_tasks = session.exec(
                select(WorkerTask).where(
                    and_(
                        WorkerTask.access_id == access.id,
                        WorkerTask.status.in_(["ASSIGNED", "IN_PROGRESS"]),
                    )
                )
            ).all()

            result.append({
                "access_id": access.id,
                "tenant": {
                    "id": tenant.id,
                    "name": tenant.name,
                    "code": tenant.code,
                    "logo_url": tenant.logo_url,
                },
                "role": access.role,
                "tasks_completed": access.total_tasks_completed,
                "active_tasks": len(active_tasks),
                "rating": access.rating,
                "connected_since": access.created_at.isoformat() if access.created_at else None,
            })

    return {"tenants": result}


@router.get("/my-tasks")
def get_my_tasks(
    status: Optional[str] = Query(None, description="Filter by status"),
    tenant_id: Optional[str] = Query(None, description="Filter by tenant"),
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """Danh sách task của worker"""
    query = select(WorkerTask).where(WorkerTask.worker_id == worker.id)

    if status:
        query = query.where(WorkerTask.status == status)

    if tenant_id:
        query = query.where(WorkerTask.tenant_id == tenant_id)

    query = query.order_by(WorkerTask.created_at.desc())
    tasks = session.exec(query).all()

    result = []
    for task in tasks:
        tenant = session.get(Tenant, task.tenant_id)
        result.append({
            "id": task.id,
            "task_type": task.task_type,
            "task_code": task.task_code,
            "title": task.title,
            "description": task.description,
            "status": task.status,
            "tenant": {
                "id": task.tenant_id,
                "name": tenant.name if tenant else None,
            },
            "scheduled_start": task.scheduled_start,
            "scheduled_end": task.scheduled_end,
            "payment_amount": task.payment_amount,
            "payment_status": task.payment_status,
            "assigned_at": task.assigned_at,
        })

    return {"tasks": result}


@router.patch("/my-tasks/{task_id}")
def update_my_task(
    task_id: str,
    status: Optional[str] = None,
    worker_notes: Optional[str] = None,
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """Cập nhật trạng thái task"""
    task = session.get(WorkerTask, task_id)

    if not task or task.worker_id != worker.id:
        raise HTTPException(404, "Không tìm thấy task")

    if status:
        valid_transitions = {
            "ASSIGNED": ["IN_PROGRESS", "CANCELLED"],
            "IN_PROGRESS": ["COMPLETED", "CANCELLED"],
        }

        if task.status in valid_transitions:
            if status not in valid_transitions[task.status]:
                raise HTTPException(400, f"Không thể chuyển từ {task.status} sang {status}")

        task.status = status

        if status == "IN_PROGRESS":
            task.actual_start = datetime.utcnow().isoformat()
        elif status == "COMPLETED":
            task.actual_end = datetime.utcnow().isoformat()

            # Update access stats
            access = session.get(WorkerTenantAccess, task.access_id)
            if access:
                access.total_tasks_completed += 1
                access.last_task_at = datetime.utcnow().isoformat()
                session.add(access)

    if worker_notes:
        task.worker_notes = worker_notes

    session.add(task)
    session.commit()
    session.refresh(task)

    return {
        "message": "Đã cập nhật task",
        "task": {
            "id": task.id,
            "status": task.status,
            "actual_start": task.actual_start,
            "actual_end": task.actual_end,
        }
    }


# ==================== PUBLIC ENDPOINT ====================

@router.get("/invitation-info/{token}")
def get_invitation_by_token(
    token: str,
    session: Session = Depends(get_session),
):
    """Xem thông tin lời mời qua token (public - không cần đăng nhập)"""
    invitation = session.exec(
        select(WorkspaceInvitation).where(
            WorkspaceInvitation.invitation_token == token
        )
    ).first()

    if not invitation:
        raise HTTPException(404, "Không tìm thấy lời mời")

    tenant = session.get(Tenant, invitation.tenant_id)

    return {
        "id": invitation.id,
        "tenant": {
            "name": tenant.name if tenant else None,
            "code": tenant.code if tenant else None,
            "logo_url": tenant.logo_url if tenant else None,
        },
        "role": invitation.role,
        "message": invitation.message,
        "status": invitation.status,
        "expires_at": invitation.expires_at,
        "invited_email": invitation.invited_email,
    }


# ==================== SYNC ENDPOINT ====================

@router.post("/sync-tasks")
def sync_worker_tasks(
    tenant_id: Optional[str] = Query(None, description="Sync only for specific tenant"),
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """
    Sync all assigned orders to WorkerTasks.

    Use this if tasks are missing from your workspace after accepting an invitation
    or if orders were assigned before you joined.
    """
    from app.core.worker_task_sync import sync_all_orders_for_worker

    # Get all active tenant accesses
    query = select(WorkerTenantAccess).where(
        and_(
            WorkerTenantAccess.worker_id == worker.id,
            WorkerTenantAccess.is_active == True,
        )
    )
    if tenant_id:
        query = query.where(WorkerTenantAccess.tenant_id == tenant_id)

    accesses = session.exec(query).all()

    total_synced = 0
    synced_by_tenant = []

    for access in accesses:
        if access.role == "DRIVER":
            tasks = sync_all_orders_for_worker(session, worker.id, access.tenant_id)
            tenant = session.get(Tenant, access.tenant_id)
            synced_by_tenant.append({
                "tenant_id": access.tenant_id,
                "tenant_name": tenant.name if tenant else None,
                "tasks_synced": len(tasks),
            })
            total_synced += len(tasks)

    return {
        "message": f"Đã đồng bộ {total_synced} công việc",
        "total_synced": total_synced,
        "by_tenant": synced_by_tenant,
    }


# ==================== ADMIN: MANAGE WORKER PERMISSIONS ====================

class UpdateWorkerPermissionsRequest(BaseModel):
    """Update permissions for a worker"""
    role: Optional[str] = None  # Change role: DRIVER, DISPATCHER, MANAGER, etc.
    permissions: Optional[dict] = None  # Custom permissions override


@router.get("/admin/workers")
def list_connected_workers(
    status: Optional[str] = Query(None, description="Filter by status: active, inactive"),
    role: Optional[str] = Query(None, description="Filter by role"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """List all workers connected to this tenant (Admin only)"""
    tenant_id = current_user.tenant_id

    query = select(WorkerTenantAccess).where(WorkerTenantAccess.tenant_id == tenant_id)

    if status == "active":
        query = query.where(WorkerTenantAccess.is_active == True)
    elif status == "inactive":
        query = query.where(WorkerTenantAccess.is_active == False)

    if role:
        query = query.where(WorkerTenantAccess.role == role)

    accesses = session.exec(query).all()

    result = []
    for access in accesses:
        worker = session.get(Worker, access.worker_id)
        if worker:
            # Get linked driver if exists
            driver = session.exec(
                select(Driver).where(
                    and_(
                        Driver.tenant_id == tenant_id,
                        Driver.external_worker_id == worker.id,
                    )
                )
            ).first()

            result.append({
                "access_id": access.id,
                "worker": {
                    "id": worker.id,
                    "username": worker.username,
                    "full_name": worker.full_name,
                    "email": worker.email,
                    "phone": worker.phone,
                    "avatar_url": worker.avatar_url,
                },
                "role": access.role,
                "permissions_json": access.permissions_json,
                "is_active": access.is_active,
                "connected_since": access.created_at.isoformat() if access.created_at else None,
                "total_tasks_completed": access.total_tasks_completed,
                "rating": access.rating,
                "linked_driver": {
                    "id": driver.id,
                    "name": driver.name,
                } if driver else None,
            })

    return {"workers": result}


@router.get("/admin/workers/{access_id}")
def get_worker_access_details(
    access_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Get detailed info about a worker's access (Admin only)"""
    access = session.get(WorkerTenantAccess, access_id)
    if not access or access.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Không tìm thấy")

    worker = session.get(Worker, access.worker_id)

    # Parse current permissions
    from app.core.worker_permissions import get_worker_permissions, ROLE_PERMISSIONS
    effective_perms = get_worker_permissions(access)

    return {
        "access": {
            "id": access.id,
            "role": access.role,
            "roles_json": access.roles_json,
            "permissions_json": access.permissions_json,
            "is_active": access.is_active,
            "connected_since": access.created_at.isoformat() if access.created_at else None,
        },
        "worker": {
            "id": worker.id,
            "username": worker.username,
            "full_name": worker.full_name,
            "email": worker.email,
            "phone": worker.phone,
        } if worker else None,
        "effective_permissions": effective_perms,
        "available_roles": list(ROLE_PERMISSIONS.keys()),
    }


@router.patch("/admin/workers/{access_id}")
def update_worker_permissions(
    access_id: str,
    data: UpdateWorkerPermissionsRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Update worker's role and permissions (Admin only)"""
    access = session.get(WorkerTenantAccess, access_id)
    if not access or access.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Không tìm thấy")

    old_role = access.role

    if data.role:
        access.role = data.role

        # If changing to DRIVER, auto-create Driver record
        if data.role == "DRIVER":
            worker = session.get(Worker, access.worker_id)
            existing_driver = session.exec(
                select(Driver).where(
                    and_(
                        Driver.tenant_id == access.tenant_id,
                        Driver.external_worker_id == access.worker_id,
                    )
                )
            ).first()

            if not existing_driver and worker:
                new_driver = Driver(
                    tenant_id=access.tenant_id,
                    name=worker.full_name or worker.username,
                    phone=worker.phone or "",
                    source=DriverSource.EXTERNAL,
                    external_worker_id=worker.id,
                    external_worker_username=worker.username,
                    status="ACTIVE",
                    license_no=worker.license_number,
                )
                session.add(new_driver)

    if data.permissions:
        access.permissions_json = json.dumps(data.permissions)

    session.add(access)
    session.commit()
    session.refresh(access)

    # Get updated effective permissions
    from app.core.worker_permissions import get_worker_permissions
    effective_perms = get_worker_permissions(access)

    return {
        "message": f"Đã cập nhật quyền cho worker",
        "old_role": old_role,
        "new_role": access.role,
        "effective_permissions": effective_perms,
    }


@router.post("/admin/workers/{access_id}/deactivate")
def deactivate_worker_access(
    access_id: str,
    reason: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Deactivate a worker's access to this tenant (Admin only)"""
    access = session.get(WorkerTenantAccess, access_id)
    if not access or access.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Không tìm thấy")

    access.is_active = False
    access.deactivated_at = datetime.utcnow().isoformat()
    access.deactivated_reason = reason

    # Also deactivate linked driver
    driver = session.exec(
        select(Driver).where(
            and_(
                Driver.tenant_id == access.tenant_id,
                Driver.external_worker_id == access.worker_id,
            )
        )
    ).first()
    if driver:
        driver.status = "INACTIVE"
        session.add(driver)

    session.add(access)
    session.commit()

    return {"message": "Đã ngắt kết nối với worker"}


@router.post("/admin/workers/{access_id}/reactivate")
def reactivate_worker_access(
    access_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Reactivate a worker's access to this tenant (Admin only)"""
    access = session.get(WorkerTenantAccess, access_id)
    if not access or access.tenant_id != current_user.tenant_id:
        raise HTTPException(404, "Không tìm thấy")

    access.is_active = True
    access.deactivated_at = None
    access.deactivated_reason = None

    # Also reactivate linked driver
    driver = session.exec(
        select(Driver).where(
            and_(
                Driver.tenant_id == access.tenant_id,
                Driver.external_worker_id == access.worker_id,
            )
        )
    ).first()
    if driver:
        driver.status = "ACTIVE"
        session.add(driver)

    session.add(access)
    session.commit()

    return {"message": "Đã kích hoạt lại quyền truy cập của worker"}
