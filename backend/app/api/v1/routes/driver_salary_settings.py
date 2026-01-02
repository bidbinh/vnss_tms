from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.db.session import get_session
from app.models import DriverSalarySetting, User
from app.core.security import get_current_user

router = APIRouter(prefix="/driver-salary-settings", tags=["driver-salary-settings"])


@router.get("")
def list_salary_settings(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all salary settings for the tenant"""
    tenant_id = str(current_user.tenant_id)

    settings = session.exec(
        select(DriverSalarySetting).where(DriverSalarySetting.tenant_id == tenant_id)
    ).all()

    return settings


@router.get("/active")
def get_active_salary_setting(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get the active salary setting"""
    tenant_id = str(current_user.tenant_id)

    setting = session.exec(
        select(DriverSalarySetting).where(
            DriverSalarySetting.tenant_id == tenant_id,
            DriverSalarySetting.status == "ACTIVE"
        ).limit(1)
    ).first()

    if not setting:
        raise HTTPException(404, "No active salary setting found")

    return setting


@router.get("/{setting_id}")
def get_salary_setting(
    setting_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get single salary setting"""
    tenant_id = str(current_user.tenant_id)

    setting = session.get(DriverSalarySetting, setting_id)
    if not setting:
        raise HTTPException(404, "Salary setting not found")
    if str(setting.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    return setting


@router.post("")
def create_salary_setting(
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create new salary setting"""
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can create salary settings")

    tenant_id = str(current_user.tenant_id)

    # If this is set to ACTIVE, deactivate all others
    if payload.get("status") == "ACTIVE":
        existing = session.exec(
            select(DriverSalarySetting).where(
                DriverSalarySetting.tenant_id == tenant_id,
                DriverSalarySetting.status == "ACTIVE"
            )
        ).all()
        for s in existing:
            s.status = "INACTIVE"
            session.add(s)

    setting = DriverSalarySetting(**payload, tenant_id=tenant_id)
    session.add(setting)
    session.commit()
    session.refresh(setting)

    return setting.model_dump()


@router.put("/{setting_id}")
def update_salary_setting(
    setting_id: str,
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update salary setting"""
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can update salary settings")

    tenant_id = str(current_user.tenant_id)

    setting = session.get(DriverSalarySetting, setting_id)
    if not setting:
        raise HTTPException(404, "Salary setting not found")
    if str(setting.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    # If this is set to ACTIVE, deactivate all others
    if payload.get("status") == "ACTIVE":
        existing = session.exec(
            select(DriverSalarySetting).where(
                DriverSalarySetting.tenant_id == tenant_id,
                DriverSalarySetting.status == "ACTIVE",
                DriverSalarySetting.id != setting_id
            )
        ).all()
        for s in existing:
            s.status = "INACTIVE"
            session.add(s)

    # Update fields
    for key, value in payload.items():
        if hasattr(setting, key) and key not in ["id", "tenant_id", "created_at"]:
            setattr(setting, key, value)

    session.add(setting)
    session.commit()
    session.refresh(setting)

    return setting.model_dump()


@router.delete("/{setting_id}")
def delete_salary_setting(
    setting_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete salary setting"""
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can delete salary settings")

    tenant_id = str(current_user.tenant_id)

    setting = session.get(DriverSalarySetting, setting_id)
    if not setting:
        raise HTTPException(404, "Salary setting not found")
    if str(setting.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    session.delete(setting)
    session.commit()

    return {"message": "Salary setting deleted successfully"}
