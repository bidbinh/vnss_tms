"""
Worker Authentication API

Personal Workspace - Worker có thể đăng ký/đăng nhập vào workspace riêng của mình.
Domain: {username}.9log.tech
"""
from datetime import datetime
import os
import secrets
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from pydantic import BaseModel, validator
import re
from sqlmodel import Session, select
from sqlalchemy import or_

from app.db.session import get_session
from app.models.worker import Worker, WorkerStatus
from app.core.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/worker", tags=["worker-auth"])

# Cookie settings
COOKIE_DOMAIN = os.getenv("COOKIE_DOMAIN", ".9log.tech")
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "true").lower() == "true"
COOKIE_MAX_AGE = 60 * 60 * 24 * 7  # 7 days for workers


def get_cookie_settings(request: Request) -> dict:
    """Get cookie settings based on request origin"""
    origin = request.headers.get("origin", "")
    host = request.headers.get("host", "")
    is_localhost = "localhost" in origin or "localhost" in host or "127.0.0.1" in origin

    if is_localhost:
        return {"domain": None, "secure": False, "samesite": "lax"}
    else:
        return {"domain": COOKIE_DOMAIN, "secure": COOKIE_SECURE, "samesite": "lax"}


# ==================== SCHEMAS ====================

class WorkerRegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    full_name: str
    phone: Optional[str] = None
    job_title: Optional[str] = None

    @validator('username')
    def validate_username(cls, v):
        if not v or len(v) < 3:
            raise ValueError('Username phải có ít nhất 3 ký tự')
        if not v.isalnum() and '-' not in v and '_' not in v:
            raise ValueError('Username chỉ được chứa chữ, số, - và _')
        # Reserved usernames
        reserved = ['admin', 'api', 'www', 'app', 'mail', 'ftp', 'blog', 'help', 'support', 'login', 'register']
        if v.lower() in reserved:
            raise ValueError('Username này đã được sử dụng')
        return v.lower()

    @validator('email')
    def validate_email(cls, v):
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, v):
            raise ValueError('Email không hợp lệ')
        return v.lower()

    @validator('password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Password phải có ít nhất 6 ký tự')
        return v


class WorkerLoginRequest(BaseModel):
    login: str  # username, email, or phone
    password: str


class WorkerProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    job_title: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    address: Optional[str] = None
    avatar_url: Optional[str] = None
    cover_photo_url: Optional[str] = None
    # License
    license_number: Optional[str] = None
    license_class: Optional[str] = None
    license_expiry: Optional[str] = None
    # Bank
    bank_name: Optional[str] = None
    bank_branch: Optional[str] = None
    bank_account: Optional[str] = None
    bank_account_name: Optional[str] = None
    # Social
    facebook_url: Optional[str] = None
    zalo_phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    # Preferences
    is_available: Optional[bool] = None


# ==================== HELPERS ====================

def get_current_worker(
    request: Request,
    session: Session = Depends(get_session),
) -> Worker:
    """Get current worker from JWT token"""
    from jose import jwt, JWTError
    from app.core.security import SECRET_KEY, ALGORITHM

    # Get token from cookie or header
    token = request.cookies.get("worker_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]

    if not token:
        raise HTTPException(401, "Chưa đăng nhập")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        worker_id = payload.get("sub")
        token_type = payload.get("type")

        if not worker_id or token_type != "worker":
            raise HTTPException(401, "Token không hợp lệ")
    except JWTError:
        raise HTTPException(401, "Token không hợp lệ")

    worker = session.get(Worker, worker_id)
    if not worker:
        raise HTTPException(401, "Worker không tồn tại")

    if worker.status != WorkerStatus.ACTIVE.value:
        raise HTTPException(403, "Tài khoản đã bị khóa")

    return worker


def get_current_worker_optional(
    request: Request,
    session: Session = Depends(get_session),
) -> Optional[Worker]:
    """Get current worker but don't require authentication"""
    try:
        return get_current_worker(request, session)
    except HTTPException:
        return None


# ==================== ENDPOINTS ====================

@router.post("/register")
def register_worker(
    data: WorkerRegisterRequest,
    request: Request,
    response: Response,
    session: Session = Depends(get_session),
):
    """
    Đăng ký tài khoản Worker mới.

    Worker sẽ có workspace riêng tại: {username}.9log.tech
    """
    # Check if username exists
    existing = session.exec(
        select(Worker).where(Worker.username == data.username)
    ).first()
    if existing:
        raise HTTPException(400, "Username đã được sử dụng")

    # Check if email exists
    existing_email = session.exec(
        select(Worker).where(Worker.email == data.email)
    ).first()
    if existing_email:
        raise HTTPException(400, "Email đã được đăng ký")

    # Create worker
    worker = Worker(
        username=data.username,
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        phone=data.phone,
        job_title=data.job_title,
        status=WorkerStatus.ACTIVE.value,
    )

    session.add(worker)
    session.commit()
    session.refresh(worker)

    # Create token
    token = create_access_token({
        "sub": str(worker.id),
        "type": "worker",
        "username": worker.username,
        "name": worker.full_name,
        "email": worker.email,
    })

    # Set cookie
    cookie_settings = get_cookie_settings(request)
    response.set_cookie(
        key="worker_token",
        value=token,
        domain=cookie_settings["domain"],
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        secure=cookie_settings["secure"],
        samesite=cookie_settings["samesite"],
        path="/",
    )

    return {
        "message": "Đăng ký thành công",
        "access_token": token,
        "token_type": "bearer",
        "worker": {
            "id": worker.id,
            "username": worker.username,
            "full_name": worker.full_name,
            "email": worker.email,
            "workspace_url": f"https://{worker.username}.9log.tech",
        }
    }


@router.post("/login")
def login_worker(
    data: WorkerLoginRequest,
    request: Request,
    response: Response,
    session: Session = Depends(get_session),
):
    """
    Đăng nhập vào Personal Workspace.

    Có thể đăng nhập bằng username, email, hoặc số điện thoại.
    """
    # Debug logging
    print(f"[Login] Attempt: login='{data.login}', password_len={len(data.password)}")

    # Find worker by username, email, or phone
    worker = session.exec(
        select(Worker).where(
            or_(
                Worker.username == data.login.lower(),
                Worker.email == data.login.lower(),
                Worker.phone == data.login,
            )
        )
    ).first()

    print(f"[Login] Worker found: {worker.username if worker else 'None'}")

    if not worker or not verify_password(data.password, worker.password_hash):
        if worker:
            print(f"[Login] Password mismatch for {worker.username}")
        raise HTTPException(401, "Thông tin đăng nhập không chính xác")

    if worker.status == WorkerStatus.INACTIVE.value:
        raise HTTPException(403, "Tài khoản chưa được kích hoạt")

    if worker.status == WorkerStatus.SUSPENDED.value:
        raise HTTPException(403, "Tài khoản đã bị khóa")

    # Update last login
    worker.last_login_at = datetime.utcnow().isoformat()
    worker.failed_login_attempts = 0
    session.add(worker)
    session.commit()

    # Create token
    token = create_access_token({
        "sub": str(worker.id),
        "type": "worker",
        "username": worker.username,
        "name": worker.full_name,
        "email": worker.email,
    })

    # Set cookie
    cookie_settings = get_cookie_settings(request)
    response.set_cookie(
        key="worker_token",
        value=token,
        domain=cookie_settings["domain"],
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        secure=cookie_settings["secure"],
        samesite=cookie_settings["samesite"],
        path="/",
    )

    return {
        "message": "Đăng nhập thành công",
        "access_token": token,
        "token_type": "bearer",
        "worker": {
            "id": worker.id,
            "username": worker.username,
            "full_name": worker.full_name,
            "email": worker.email,
            "phone": worker.phone,
            "avatar_url": worker.avatar_url,
            "job_title": worker.job_title,
            "workspace_url": f"https://{worker.username}.9log.tech",
        }
    }


@router.get("/me")
def get_worker_profile(
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """Lấy thông tin profile của worker đang đăng nhập"""
    from app.models.worker import WorkerTenantAccess

    # Get connected tenants
    accesses = session.exec(
        select(WorkerTenantAccess).where(
            WorkerTenantAccess.worker_id == worker.id,
            WorkerTenantAccess.is_active == True,
        )
    ).all()

    # Get tenant names
    connected_tenants = []
    for access in accesses:
        from app.models import Tenant
        tenant = session.get(Tenant, access.tenant_id)
        if tenant:
            connected_tenants.append({
                "tenant_id": access.tenant_id,
                "tenant_name": tenant.name,
                "tenant_code": tenant.code,
                "role": access.role,
                "tasks_completed": access.total_tasks_completed,
                "rating": access.rating,
            })

    return {
        "id": worker.id,
        "username": worker.username,
        "email": worker.email,
        "phone": worker.phone,
        "full_name": worker.full_name,
        "avatar_url": worker.avatar_url,
        "cover_photo_url": worker.cover_photo_url,
        "bio": worker.bio,
        "job_title": worker.job_title,
        "experience_years": worker.experience_years,
        # Location
        "city": worker.city,
        "province": worker.province,
        "country": worker.country,
        "address": worker.address,
        # License
        "license_number": worker.license_number,
        "license_class": worker.license_class,
        "license_expiry": worker.license_expiry,
        # Bank
        "bank_name": worker.bank_name,
        "bank_account": worker.bank_account,
        "bank_account_name": worker.bank_account_name,
        # Social
        "facebook_url": worker.facebook_url,
        "zalo_phone": worker.zalo_phone,
        "linkedin_url": worker.linkedin_url,
        # Settings
        "is_available": worker.is_available,
        "status": worker.status,
        "email_verified": worker.email_verified,
        # Connected tenants
        "connected_tenants": connected_tenants,
        "workspace_url": f"https://{worker.username}.9log.tech",
        # Stats
        "created_at": worker.created_at.isoformat() if worker.created_at else None,
        "last_login_at": worker.last_login_at,
    }


@router.patch("/me")
def update_worker_profile(
    data: WorkerProfileUpdate,
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """Cập nhật thông tin profile"""
    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(worker, field, value)

    session.add(worker)
    session.commit()
    session.refresh(worker)

    return {
        "message": "Cập nhật thành công",
        "worker": {
            "id": worker.id,
            "username": worker.username,
            "full_name": worker.full_name,
            "email": worker.email,
            "phone": worker.phone,
            "job_title": worker.job_title,
            "is_available": worker.is_available,
        }
    }


@router.post("/logout")
def logout_worker(request: Request, response: Response):
    """Đăng xuất - xóa cookie"""
    cookie_settings = get_cookie_settings(request)
    response.delete_cookie(
        key="worker_token",
        domain=cookie_settings["domain"],
        path="/",
    )
    return {"message": "Đăng xuất thành công"}


@router.get("/check-username/{username}")
def check_username_available(
    username: str,
    session: Session = Depends(get_session),
):
    """Kiểm tra username có sẵn không"""
    username = username.lower().strip()

    # Reserved
    reserved = ['admin', 'api', 'www', 'app', 'mail', 'ftp', 'blog', 'help', 'support', 'login', 'register']
    if username in reserved:
        return {"available": False, "reason": "Username đã được sử dụng bởi hệ thống"}

    # Validate format
    if len(username) < 3:
        return {"available": False, "reason": "Username phải có ít nhất 3 ký tự"}

    if not username.replace('-', '').replace('_', '').isalnum():
        return {"available": False, "reason": "Username chỉ được chứa chữ, số, - và _"}

    # Check in database
    existing = session.exec(
        select(Worker).where(Worker.username == username)
    ).first()

    if existing:
        return {"available": False, "reason": "Username đã được sử dụng"}

    return {
        "available": True,
        "workspace_url": f"https://{username}.9log.tech"
    }


# ==================== PUBLIC PROFILE ====================

@router.get("/profile/{username}")
def get_public_profile(
    username: str,
    session: Session = Depends(get_session),
):
    """
    Xem profile công khai của worker.

    Đây là trang hiển thị khi truy cập {username}.9log.tech
    """
    worker = session.exec(
        select(Worker).where(Worker.username == username.lower())
    ).first()

    if not worker:
        raise HTTPException(404, "Không tìm thấy worker")

    if worker.status != WorkerStatus.ACTIVE.value:
        raise HTTPException(404, "Tài khoản không hoạt động")

    # Get public stats
    from app.models.worker import WorkerTenantAccess

    accesses = session.exec(
        select(WorkerTenantAccess).where(
            WorkerTenantAccess.worker_id == worker.id,
            WorkerTenantAccess.is_active == True,
        )
    ).all()

    total_tasks = sum(a.total_tasks_completed for a in accesses)
    avg_rating = None
    if accesses:
        ratings = [a.rating for a in accesses if a.rating is not None]
        if ratings:
            avg_rating = round(sum(ratings) / len(ratings), 1)

    return {
        "username": worker.username,
        "full_name": worker.full_name,
        "avatar_url": worker.avatar_url,
        "cover_photo_url": worker.cover_photo_url,
        "bio": worker.bio,
        "job_title": worker.job_title,
        "experience_years": worker.experience_years,
        # Location (public)
        "city": worker.city,
        "province": worker.province,
        # License (public for drivers)
        "license_class": worker.license_class,
        # Social
        "facebook_url": worker.facebook_url,
        "zalo_phone": worker.zalo_phone,
        "linkedin_url": worker.linkedin_url,
        # Stats
        "is_available": worker.is_available,
        "total_tasks_completed": total_tasks,
        "average_rating": avg_rating,
        "total_companies": len(accesses),
        # Timestamps
        "member_since": worker.created_at.isoformat() if worker.created_at else None,
    }
