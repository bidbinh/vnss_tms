"""
CRM - Leads API Routes
Manage leads (potential customers)
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func, or_
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.db.session import get_session
from app.models import User
from app.models.crm.lead import Lead, LeadStatus, LeadSource
from app.models.crm.account import Account
from app.models.crm.contact import Contact
from app.models.crm.opportunity import Opportunity
from app.core.security import get_current_user
from app.api.v1.routes.crm.activity_logs import log_activity

router = APIRouter(prefix="/leads", tags=["CRM - Leads"])


class LeadCreate(BaseModel):
    company_name: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    salutation: Optional[str] = None
    first_name: str
    last_name: Optional[str] = None
    title: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: str = "VN"
    source: Optional[str] = "DIRECT"
    rating: int = 0
    estimated_value: float = 0
    product_interest: Optional[str] = None
    requirements: Optional[str] = None
    assigned_to: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None


class LeadUpdate(BaseModel):
    company_name: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    salutation: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    title: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    status: Optional[str] = None
    source: Optional[str] = None
    rating: Optional[int] = None
    estimated_value: Optional[float] = None
    product_interest: Optional[str] = None
    requirements: Optional[str] = None
    assigned_to: Optional[str] = None
    lost_reason: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None


class LeadConvert(BaseModel):
    create_account: bool = True
    account_name: Optional[str] = None
    account_code: Optional[str] = None  # Custom account code (will be validated for uniqueness)
    existing_account_id: Optional[str] = None  # Link to existing account instead of creating new
    create_contact: bool = True
    create_opportunity: bool = False
    opportunity_name: Optional[str] = None
    opportunity_amount: float = 0


@router.get("")
def list_leads(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    status: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    assigned_to: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: Optional[str] = Query(None, description="Field to sort by"),
    sort_order: Optional[str] = Query("desc", description="Sort order: asc or desc"),
):
    """List all leads"""
    tenant_id = str(current_user.tenant_id)

    query = select(Lead).where(Lead.tenant_id == tenant_id)

    if status:
        query = query.where(Lead.status == status)

    if source:
        query = query.where(Lead.source == source)

    if assigned_to:
        query = query.where(Lead.assigned_to == assigned_to)

    if search:
        search_filter = or_(
            Lead.first_name.ilike(f"%{search}%"),
            Lead.last_name.ilike(f"%{search}%"),
            Lead.full_name.ilike(f"%{search}%"),
            Lead.company_name.ilike(f"%{search}%"),
            Lead.email.ilike(f"%{search}%"),
            Lead.phone.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Sorting
    sort_fields = {
        "code": Lead.code,
        "full_name": Lead.full_name,
        "company_name": Lead.company_name,
        "email": Lead.email,
        "phone": Lead.phone,
        "source": Lead.source,
        "status": Lead.status,
        "estimated_value": Lead.estimated_value,
        "created_at": Lead.created_at,
    }
    sort_column = sort_fields.get(sort_by, Lead.created_at)
    if sort_order == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    # Pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    leads = session.exec(query).all()

    items = []
    for lead in leads:
        items.append({
            "id": lead.id,
            "code": lead.code,
            "company_name": lead.company_name,
            "full_name": lead.full_name or f"{lead.first_name} {lead.last_name or ''}".strip(),
            "title": lead.title,
            "phone": lead.phone,
            "mobile": lead.mobile,
            "email": lead.email,
            "city": lead.city,
            "status": lead.status,
            "source": lead.source,
            "rating": lead.rating,
            "estimated_value": lead.estimated_value,
            "assigned_to": lead.assigned_to,
            "created_at": str(lead.created_at) if lead.created_at else None,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("")
def create_lead(
    payload: LeadCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new lead"""
    tenant_id = str(current_user.tenant_id)

    # Generate code
    count = session.exec(
        select(func.count()).where(Lead.tenant_id == tenant_id)
    ).one()
    code = f"LD-{datetime.now().year}-{(count + 1):04d}"

    # Compute full_name
    full_name = f"{payload.first_name} {payload.last_name or ''}".strip()

    lead = Lead(
        tenant_id=tenant_id,
        code=code,
        **payload.model_dump(),
        full_name=full_name,
        created_by=str(current_user.id),
    )

    session.add(lead)
    session.commit()
    session.refresh(lead)

    return lead


@router.get("/{lead_id}")
def get_lead(
    lead_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get lead by ID"""
    tenant_id = str(current_user.tenant_id)

    lead = session.get(Lead, lead_id)
    if not lead or str(lead.tenant_id) != tenant_id:
        raise HTTPException(404, "Lead not found")

    return {
        **lead.model_dump(),
        "full_name": lead.full_name or f"{lead.first_name} {lead.last_name or ''}".strip(),
        "created_at": str(lead.created_at) if lead.created_at else None,
        "updated_at": str(lead.updated_at) if lead.updated_at else None,
    }


@router.put("/{lead_id}")
def update_lead(
    lead_id: str,
    payload: LeadUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a lead"""
    tenant_id = str(current_user.tenant_id)

    lead = session.get(Lead, lead_id)
    if not lead or str(lead.tenant_id) != tenant_id:
        raise HTTPException(404, "Lead not found")

    if lead.status == LeadStatus.CONVERTED.value:
        raise HTTPException(400, "Cannot update converted lead")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(lead, key, value)

    # Update full_name
    first_name = update_data.get("first_name", lead.first_name)
    last_name = update_data.get("last_name", lead.last_name)
    lead.full_name = f"{first_name} {last_name or ''}".strip()

    lead.updated_at = datetime.utcnow()

    session.add(lead)
    session.commit()
    session.refresh(lead)

    return lead


def generate_unique_account_code(session: Session, tenant_id: str, custom_code: str = None) -> str:
    """Generate unique account code with retry mechanism"""
    if custom_code:
        # Check if custom code already exists
        existing = session.exec(
            select(Account).where(
                Account.tenant_id == tenant_id,
                Account.code == custom_code
            )
        ).first()
        if existing:
            raise HTTPException(400, f"Account code '{custom_code}' already exists")
        return custom_code

    # Auto-generate unique code
    max_attempts = 10
    for attempt in range(max_attempts):
        acc_count = session.exec(
            select(func.count()).where(Account.tenant_id == tenant_id)
        ).one()

        # Add attempt offset to avoid collision
        acc_code = f"KH{(acc_count + 1 + attempt):04d}"

        # Check if code exists
        existing = session.exec(
            select(Account).where(
                Account.tenant_id == tenant_id,
                Account.code == acc_code
            )
        ).first()

        if not existing:
            return acc_code

    # Fallback: use timestamp-based code
    import time
    return f"KH{int(time.time())}"


@router.post("/{lead_id}/convert")
def convert_lead(
    lead_id: str,
    payload: LeadConvert,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Convert lead to account, contact, and optionally opportunity"""
    tenant_id = str(current_user.tenant_id)

    lead = session.get(Lead, lead_id)
    if not lead or str(lead.tenant_id) != tenant_id:
        raise HTTPException(404, "Lead not found")

    if lead.status == LeadStatus.CONVERTED.value:
        raise HTTPException(400, "Lead already converted")

    result = {
        "account_id": None,
        "contact_id": None,
        "opportunity_id": None,
    }

    account = None

    # Option 1: Link to existing account
    if payload.existing_account_id:
        account = session.get(Account, payload.existing_account_id)
        if not account or str(account.tenant_id) != tenant_id:
            raise HTTPException(404, "Existing account not found")
        result["account_id"] = account.id
        lead.converted_account_id = account.id

    # Option 2: Create new Account
    elif payload.create_account:
        # Validate account_name is provided or can be derived
        account_name = payload.account_name or lead.company_name or lead.full_name
        if not account_name:
            raise HTTPException(400, "Account name is required for conversion")

        # Generate unique account code
        acc_code = generate_unique_account_code(session, tenant_id, payload.account_code)

        account = Account(
            tenant_id=tenant_id,
            code=acc_code,
            name=account_name,
            industry=lead.industry,
            phone=lead.phone,
            email=lead.email,
            website=lead.website,
            address=lead.address,
            city=lead.city,
            country=lead.country,
            source=lead.source,
            assigned_to=lead.assigned_to,
            created_by=str(current_user.id),
        )
        session.add(account)
        session.commit()
        session.refresh(account)
        result["account_id"] = account.id
        lead.converted_account_id = account.id

    # Create Contact (only if account exists)
    if account and payload.create_contact:
        # Check if contact with same email already exists for this account
        existing_contact = None
        if lead.email:
            existing_contact = session.exec(
                select(Contact).where(
                    Contact.tenant_id == tenant_id,
                    Contact.account_id == account.id,
                    Contact.email == lead.email
                )
            ).first()

        if existing_contact:
            result["contact_id"] = existing_contact.id
            lead.converted_contact_id = existing_contact.id
        else:
            contact = Contact(
                tenant_id=tenant_id,
                account_id=account.id,
                salutation=lead.salutation,
                first_name=lead.first_name,
                last_name=lead.last_name,
                full_name=lead.full_name,
                title=lead.title,
                phone=lead.phone,
                mobile=lead.mobile,
                email=lead.email,
                address=lead.address,
                city=lead.city,
                is_primary=True,
                decision_maker=True,
                created_by=str(current_user.id),
            )
            session.add(contact)
            session.commit()
            session.refresh(contact)
            result["contact_id"] = contact.id
            lead.converted_contact_id = contact.id

    # Create Opportunity (only if account exists)
    if account and payload.create_opportunity:
        # Generate unique opportunity code
        opp_count = session.exec(
            select(func.count()).where(Opportunity.tenant_id == tenant_id)
        ).one()
        opp_code = f"OPP-{datetime.now().year}-{(opp_count + 1):04d}"

        # Check for duplicate
        existing_opp = session.exec(
            select(Opportunity).where(
                Opportunity.tenant_id == tenant_id,
                Opportunity.code == opp_code
            )
        ).first()
        if existing_opp:
            import time
            opp_code = f"OPP-{datetime.now().year}-{int(time.time())}"

        opportunity = Opportunity(
            tenant_id=tenant_id,
            code=opp_code,
            name=payload.opportunity_name or f"Opportunity from {lead.company_name or lead.full_name}",
            account_id=account.id,
            contact_id=result["contact_id"],
            lead_id=lead_id,
            amount=payload.opportunity_amount or lead.estimated_value,
            source=lead.source,
            assigned_to=lead.assigned_to,
            created_by=str(current_user.id),
        )
        session.add(opportunity)
        session.commit()
        session.refresh(opportunity)
        result["opportunity_id"] = opportunity.id
        lead.converted_opportunity_id = opportunity.id

    # Update lead status
    lead.status = LeadStatus.CONVERTED.value
    lead.converted_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    lead.converted_by = str(current_user.id)

    session.add(lead)

    # Log activity
    user_name = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or current_user.email
    log_activity(
        session=session,
        tenant_id=tenant_id,
        user_id=str(current_user.id),
        user_name=user_name,
        entity_type="LEAD",
        entity_id=lead_id,
        entity_code=lead.code,
        entity_name=lead.full_name or lead.company_name,
        action="CONVERT",
        description=f"Converted lead to Account: {result.get('account_id')}, Contact: {result.get('contact_id')}, Opportunity: {result.get('opportunity_id')}",
        new_values=result,
        related_entity_type="ACCOUNT" if result.get("account_id") else None,
        related_entity_id=result.get("account_id"),
    )

    session.commit()

    return {
        "success": True,
        "message": "Lead converted successfully",
        **result,
    }


@router.delete("/{lead_id}")
def delete_lead(
    lead_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete a lead"""
    tenant_id = str(current_user.tenant_id)

    lead = session.get(Lead, lead_id)
    if not lead or str(lead.tenant_id) != tenant_id:
        raise HTTPException(404, "Lead not found")

    if lead.status == LeadStatus.CONVERTED.value:
        raise HTTPException(400, "Cannot delete converted lead")

    session.delete(lead)
    session.commit()

    return {"success": True, "message": "Lead deleted"}
