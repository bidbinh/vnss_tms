"""
Public Name Card API - No authentication required
Accessible via random token URL for security
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from datetime import datetime

from app.db.session import get_session
from app.models import Tenant
from app.models.hrm.employee import Employee
from app.models.hrm.department import Department, Position, Branch
from app.models.hrm.namecard import EmployeeNameCard, NameCardTemplate

router = APIRouter(prefix="/public/namecard", tags=["Public - Name Card"])


@router.get("/{token}")
def view_namecard(
    token: str,
    session: Session = Depends(get_session),
):
    """
    View employee name card by public token (no auth required)
    Token is random and secure - cannot be guessed
    """
    import traceback
    try:
        # Find name card by token
        namecard = session.exec(
            select(EmployeeNameCard).where(
                EmployeeNameCard.token == token
            )
        ).first()
    except Exception as e:
        print(f"ERROR finding namecard: {e}")
        traceback.print_exc()
        raise HTTPException(500, f"Database error: {str(e)}")

    if not namecard:
        raise HTTPException(404, "Name card not found")

    if not namecard.is_active:
        raise HTTPException(403, "This name card is not available")

    # Get employee
    employee = session.get(Employee, namecard.employee_id)
    if not employee:
        raise HTTPException(404, "Employee not found")

    # Get tenant info
    tenant = session.get(Tenant, namecard.tenant_id)

    # Get organization info
    department = None
    position = None
    branch = None

    if namecard.show_department and employee.department_id:
        dept = session.get(Department, employee.department_id)
        if dept:
            department = {"id": dept.id, "name": dept.name}

    if namecard.show_position and employee.position_id:
        pos = session.get(Position, employee.position_id)
        if pos:
            position = {"id": pos.id, "name": pos.name}

    if employee.branch_id:
        br = session.get(Branch, employee.branch_id)
        if br:
            branch = {"id": br.id, "name": br.name}

    # Get template
    template = session.exec(
        select(NameCardTemplate).where(
            NameCardTemplate.tenant_id == namecard.tenant_id,
            NameCardTemplate.is_default == True,
            NameCardTemplate.is_active == True
        )
    ).first()

    # If no template, use default styling
    default_theme = {
        "primary_color": "#1a1a1a",
        "secondary_color": "#4a5568",
        "accent_color": "#3b82f6",
        "background_color": "#ffffff",
        "text_color": "#1a1a1a",
        "layout": "modern",
        "show_company_logo": True,
        "show_qr_code": True,
    }

    theme = template.model_dump() if template else default_theme

    # Update view count
    namecard.view_count += 1
    namecard.last_viewed_at = datetime.utcnow()
    session.add(namecard)
    session.commit()

    # Build social links based on visibility settings
    social_links = {}
    if namecard.show_zalo and employee.zalo_phone:
        social_links["zalo"] = employee.zalo_phone
    if namecard.show_facebook and employee.facebook_url:
        social_links["facebook"] = employee.facebook_url
    if namecard.show_linkedin and employee.linkedin_url:
        social_links["linkedin"] = employee.linkedin_url
    if namecard.show_website and employee.website_url:
        social_links["website"] = employee.website_url

    # Build response
    card_data = {
        "employee": {
            "full_name": employee.full_name,
            "employee_code": employee.employee_code,
            "avatar_url": employee.avatar_url if namecard.show_avatar else None,
            "phone": employee.phone if namecard.show_phone else None,
            "email": employee.email if namecard.show_email else None,
        },
        "organization": {
            "department": department,
            "position": position,
            "branch": branch,
        },
        "company": {
            "name": tenant.name if tenant else None,
            "logo_url": tenant.logo_url if tenant else None,
            "tagline": theme.get("company_tagline") if template else None,
            "website": theme.get("company_website") if template else None,
        },
        "social": social_links,
        "theme": theme,
        "qr_code_url": namecard.qr_code_url,
    }

    return card_data


@router.get("/{token}/vcard")
def download_vcard(
    token: str,
    session: Session = Depends(get_session),
):
    """
    Download employee contact as vCard format
    Can be imported to phone contacts
    """
    from fastapi.responses import Response

    # Find name card
    namecard = session.exec(
        select(EmployeeNameCard).where(
            EmployeeNameCard.token == token
        )
    ).first()

    if not namecard or not namecard.is_active:
        raise HTTPException(404, "Name card not found")

    employee = session.get(Employee, namecard.employee_id)
    if not employee:
        raise HTTPException(404, "Employee not found")

    tenant = session.get(Tenant, namecard.tenant_id)

    # Get position and department
    position_name = ""
    dept_name = ""

    if employee.position_id:
        pos = session.get(Position, employee.position_id)
        if pos:
            position_name = pos.name

    if employee.department_id:
        dept = session.get(Department, employee.department_id)
        if dept:
            dept_name = dept.name

    # Build vCard 3.0
    vcard_lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        f"FN:{employee.full_name}",
    ]

    # Split name (simple split by space)
    name_parts = employee.full_name.split(" ", 1)
    if len(name_parts) == 2:
        vcard_lines.append(f"N:{name_parts[1]};{name_parts[0]};;;")
    else:
        vcard_lines.append(f"N:{employee.full_name};;;;")

    if namecard.show_phone and employee.phone:
        vcard_lines.append(f"TEL;TYPE=CELL:{employee.phone}")

    if namecard.show_email and employee.email:
        vcard_lines.append(f"EMAIL;TYPE=WORK:{employee.email}")

    if position_name:
        vcard_lines.append(f"TITLE:{position_name}")

    if tenant:
        vcard_lines.append(f"ORG:{tenant.name}")

    if dept_name:
        vcard_lines.append(f"NOTE:Department: {dept_name}")

    vcard_lines.append("END:VCARD")

    vcard_content = "\n".join(vcard_lines)

    # Return as downloadable file
    filename = f"{employee.full_name.replace(' ', '_')}.vcf"

    return Response(
        content=vcard_content,
        media_type="text/vcard",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )
