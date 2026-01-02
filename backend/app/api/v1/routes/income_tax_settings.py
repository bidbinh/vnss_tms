from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from app.db.session import get_session
from app.models import IncomeTaxSetting, User
from app.schemas.income_tax_setting import (
    IncomeTaxSettingCreate,
    IncomeTaxSettingUpdate,
    IncomeTaxSettingRead
)
from app.core.security import get_current_user

router = APIRouter(prefix="/income-tax-settings", tags=["income-tax-settings"])


@router.get("/", response_model=List[IncomeTaxSettingRead])
def list_income_tax_settings(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all income tax settings"""
    tenant_id = str(current_user.tenant_id)

    settings = session.exec(
        select(IncomeTaxSetting)
        .where(IncomeTaxSetting.tenant_id == tenant_id)
        .order_by(IncomeTaxSetting.effective_from.desc())
    ).all()

    return settings


@router.get("/active", response_model=IncomeTaxSettingRead)
def get_active_income_tax_setting(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get the currently active income tax setting"""
    tenant_id = str(current_user.tenant_id)

    setting = session.exec(
        select(IncomeTaxSetting)
        .where(
            IncomeTaxSetting.tenant_id == tenant_id,
            IncomeTaxSetting.status == "ACTIVE"
        )
        .limit(1)
    ).first()

    if not setting:
        raise HTTPException(404, "No active income tax setting found")

    return setting


@router.post("/", response_model=IncomeTaxSettingRead)
def create_income_tax_setting(
    setting: IncomeTaxSettingCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new income tax setting"""
    tenant_id = str(current_user.tenant_id)

    db_setting = IncomeTaxSetting(
        **setting.model_dump(),
        tenant_id=tenant_id
    )

    session.add(db_setting)
    session.commit()
    session.refresh(db_setting)

    return db_setting


@router.get("/{setting_id}", response_model=IncomeTaxSettingRead)
def get_income_tax_setting(
    setting_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get a single income tax setting"""
    tenant_id = str(current_user.tenant_id)

    setting = session.get(IncomeTaxSetting, setting_id)
    if not setting or setting.tenant_id != tenant_id:
        raise HTTPException(404, "Income tax setting not found")

    return setting


@router.patch("/{setting_id}", response_model=IncomeTaxSettingRead)
def update_income_tax_setting(
    setting_id: str,
    setting_update: IncomeTaxSettingUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update an income tax setting"""
    tenant_id = str(current_user.tenant_id)

    setting = session.get(IncomeTaxSetting, setting_id)
    if not setting or setting.tenant_id != tenant_id:
        raise HTTPException(404, "Income tax setting not found")

    for key, value in setting_update.model_dump(exclude_unset=True).items():
        setattr(setting, key, value)

    session.add(setting)
    session.commit()
    session.refresh(setting)

    return setting


@router.delete("/{setting_id}")
def delete_income_tax_setting(
    setting_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete an income tax setting"""
    tenant_id = str(current_user.tenant_id)

    setting = session.get(IncomeTaxSetting, setting_id)
    if not setting or setting.tenant_id != tenant_id:
        raise HTTPException(404, "Income tax setting not found")

    # Don't allow deletion of active setting
    if setting.status == "ACTIVE":
        raise HTTPException(400, "Cannot delete active income tax setting")

    session.delete(setting)
    session.commit()

    return {"message": "Income tax setting deleted successfully"}
