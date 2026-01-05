"""
HRM - Employee Name Card API Routes
Public and private endpoints for employee name cards
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import Optional
from datetime import datetime
from pydantic import BaseModel
import secrets

from app.db.session import get_session
from app.models import User, Tenant
from app.models.hrm.employee import Employee
from app.models.hrm.department import Department, Position, Branch
from app.models.hrm.namecard import EmployeeNameCard, NameCardTemplate
from app.core.security import get_current_user

router = APIRouter(prefix="/namecards", tags=["HRM - Name Cards"])


# === Pydantic Schemas ===

class NameCardSettings(BaseModel):
    show_phone: bool = True
    show_email: bool = True
    show_department: bool = True
    show_position: bool = True
    show_avatar: bool = True


class NameCardTemplateCreate(BaseModel):
    name: str
    code: str
    is_default: bool = False
    primary_color: str = "#1a1a1a"
    secondary_color: str = "#4a5568"
    accent_color: str = "#3b82f6"
    background_color: str = "#ffffff"
    text_color: str = "#1a1a1a"
    layout: str = "modern"
    show_company_logo: bool = True
    show_qr_code: bool = True
    company_tagline: Optional[str] = None
    company_website: Optional[str] = None


# === Private Endpoints (require auth) ===

@router.get("/my-card")
def get_my_namecard(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get current user's name card (or create if not exists)"""
    tenant_id = str(current_user.tenant_id)

    # Find employee linked to current user
    employee = session.exec(
        select(Employee).where(
            Employee.tenant_id == tenant_id,
            Employee.user_id == str(current_user.id)
        )
    ).first()

    if not employee:
        raise HTTPException(404, "No employee profile linked to your account")

    # Get or create name card
    namecard = session.exec(
        select(EmployeeNameCard).where(
            EmployeeNameCard.employee_id == str(employee.id)
        )
    ).first()

    if not namecard:
        # Create new name card with random token
        namecard = EmployeeNameCard(
            tenant_id=tenant_id,
            employee_id=str(employee.id),
        )
        session.add(namecard)
        session.commit()
        session.refresh(namecard)

    return {
        "id": namecard.id,
        "token": namecard.token,
        "public_url": f"/namecard/{namecard.token}",
        "is_active": namecard.is_active,
        "show_phone": namecard.show_phone,
        "show_email": namecard.show_email,
        "show_department": namecard.show_department,
        "show_position": namecard.show_position,
        "show_avatar": namecard.show_avatar,
        "view_count": namecard.view_count,
        "last_viewed_at": namecard.last_viewed_at,
    }


@router.get("/employee/{employee_id}")
def get_employee_namecard(
    employee_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get name card for a specific employee (HR/Admin only)"""
    if current_user.role not in ("ADMIN", "HR_MANAGER", "HR"):
        raise HTTPException(403, "Only ADMIN or HR can view other employees' name cards")

    tenant_id = str(current_user.tenant_id)

    employee = session.get(Employee, employee_id)
    if not employee or str(employee.tenant_id) != tenant_id:
        raise HTTPException(404, "Employee not found")

    # Get or create name card
    namecard = session.exec(
        select(EmployeeNameCard).where(
            EmployeeNameCard.employee_id == employee_id
        )
    ).first()

    if not namecard:
        namecard = EmployeeNameCard(
            tenant_id=tenant_id,
            employee_id=employee_id,
        )
        session.add(namecard)
        session.commit()
        session.refresh(namecard)

    return {
        "id": namecard.id,
        "employee_id": employee_id,
        "employee_name": employee.full_name,
        "token": namecard.token,
        "public_url": f"/namecard/{namecard.token}",
        "is_active": namecard.is_active,
        "show_phone": namecard.show_phone,
        "show_email": namecard.show_email,
        "show_department": namecard.show_department,
        "show_position": namecard.show_position,
        "show_avatar": namecard.show_avatar,
        "view_count": namecard.view_count,
        "last_viewed_at": namecard.last_viewed_at,
    }


@router.patch("/employee/{employee_id}/settings")
def update_namecard_settings(
    employee_id: str,
    settings: NameCardSettings,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update name card visibility settings"""
    tenant_id = str(current_user.tenant_id)

    # Check permission (own card or HR)
    employee = session.get(Employee, employee_id)
    if not employee or str(employee.tenant_id) != tenant_id:
        raise HTTPException(404, "Employee not found")

    is_own_card = employee.user_id == str(current_user.id)
    is_hr = current_user.role in ("ADMIN", "HR_MANAGER", "HR")

    if not is_own_card and not is_hr:
        raise HTTPException(403, "You can only update your own name card")

    namecard = session.exec(
        select(EmployeeNameCard).where(
            EmployeeNameCard.employee_id == employee_id
        )
    ).first()

    if not namecard:
        raise HTTPException(404, "Name card not found")

    # Update settings
    namecard.show_phone = settings.show_phone
    namecard.show_email = settings.show_email
    namecard.show_department = settings.show_department
    namecard.show_position = settings.show_position
    namecard.show_avatar = settings.show_avatar

    session.add(namecard)
    session.commit()
    session.refresh(namecard)

    return {"message": "Settings updated", "namecard": namecard}


@router.post("/employee/{employee_id}/regenerate-token")
def regenerate_namecard_token(
    employee_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Regenerate the public URL token (invalidates old URL)"""
    tenant_id = str(current_user.tenant_id)

    employee = session.get(Employee, employee_id)
    if not employee or str(employee.tenant_id) != tenant_id:
        raise HTTPException(404, "Employee not found")

    is_own_card = employee.user_id == str(current_user.id)
    is_hr = current_user.role in ("ADMIN", "HR_MANAGER", "HR")

    if not is_own_card and not is_hr:
        raise HTTPException(403, "You can only regenerate your own name card token")

    namecard = session.exec(
        select(EmployeeNameCard).where(
            EmployeeNameCard.employee_id == employee_id
        )
    ).first()

    if not namecard:
        raise HTTPException(404, "Name card not found")

    # Generate new token
    namecard.token = secrets.token_urlsafe(12)
    namecard.token_generated_at = datetime.utcnow()

    session.add(namecard)
    session.commit()
    session.refresh(namecard)

    return {
        "message": "Token regenerated",
        "new_token": namecard.token,
        "public_url": f"/namecard/{namecard.token}",
    }


@router.patch("/employee/{employee_id}/toggle")
def toggle_namecard(
    employee_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Toggle name card active/inactive"""
    tenant_id = str(current_user.tenant_id)

    employee = session.get(Employee, employee_id)
    if not employee or str(employee.tenant_id) != tenant_id:
        raise HTTPException(404, "Employee not found")

    is_own_card = employee.user_id == str(current_user.id)
    is_hr = current_user.role in ("ADMIN", "HR_MANAGER", "HR")

    if not is_own_card and not is_hr:
        raise HTTPException(403, "You can only toggle your own name card")

    namecard = session.exec(
        select(EmployeeNameCard).where(
            EmployeeNameCard.employee_id == employee_id
        )
    ).first()

    if not namecard:
        raise HTTPException(404, "Name card not found")

    namecard.is_active = not namecard.is_active
    session.add(namecard)
    session.commit()

    return {
        "message": f"Name card {'activated' if namecard.is_active else 'deactivated'}",
        "is_active": namecard.is_active
    }


# === Template Management (Admin/HR only) ===

@router.get("/templates")
def list_templates(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all name card templates for tenant"""
    tenant_id = str(current_user.tenant_id)

    templates = session.exec(
        select(NameCardTemplate).where(
            NameCardTemplate.tenant_id == tenant_id,
            NameCardTemplate.is_active == True
        ).order_by(NameCardTemplate.is_default.desc())
    ).all()

    return templates


@router.post("/templates")
def create_template(
    payload: NameCardTemplateCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create new name card template (Admin only)"""
    if current_user.role not in ("ADMIN",):
        raise HTTPException(403, "Only ADMIN can create templates")

    tenant_id = str(current_user.tenant_id)

    # If this is default, unset other defaults
    if payload.is_default:
        existing_defaults = session.exec(
            select(NameCardTemplate).where(
                NameCardTemplate.tenant_id == tenant_id,
                NameCardTemplate.is_default == True
            )
        ).all()
        for t in existing_defaults:
            t.is_default = False
            session.add(t)

    template = NameCardTemplate(
        tenant_id=tenant_id,
        **payload.model_dump()
    )
    session.add(template)
    session.commit()
    session.refresh(template)

    return template
