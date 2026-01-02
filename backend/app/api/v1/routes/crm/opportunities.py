"""
CRM - Opportunities API Routes
Manage sales opportunities (deals)
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func, or_
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.db.session import get_session
from app.models import User
from app.models.crm.opportunity import Opportunity, OpportunityStage
from app.models.crm.account import Account
from app.models.crm.contact import Contact
from app.models.crm.quote import Quote
from app.core.security import get_current_user


def validate_date_format(date_str: str, field_name: str) -> datetime:
    """Validate date string format and return parsed datetime"""
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(400, f"Invalid {field_name} format. Use YYYY-MM-DD.")


def validate_expected_close_date(date_str: str) -> None:
    """Validate expected_close_date is in the future"""
    if not date_str:
        return
    parsed_date = validate_date_format(date_str, "expected_close_date")
    if parsed_date and parsed_date.date() < datetime.now().date():
        raise HTTPException(
            400,
            f"expected_close_date ({date_str}) cannot be in the past"
        )

router = APIRouter(prefix="/opportunities", tags=["CRM - Opportunities"])


# Stage probability mapping
STAGE_PROBABILITY = {
    "QUALIFICATION": 10,
    "NEEDS_ANALYSIS": 25,
    "PROPOSAL": 50,
    "NEGOTIATION": 75,
    "CLOSED_WON": 100,
    "CLOSED_LOST": 0,
}


class OpportunityCreate(BaseModel):
    name: str
    account_id: str
    contact_id: Optional[str] = None
    stage: str = "QUALIFICATION"
    amount: float = 0
    currency: str = "VND"
    expected_close_date: Optional[str] = None
    source: Optional[str] = None
    product_interest: Optional[str] = None
    service_type: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    frequency: Optional[str] = None
    volume_estimate: Optional[str] = None
    assigned_to: Optional[str] = None
    competitor: Optional[str] = None
    competitor_price: Optional[float] = None
    next_step: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None


class OpportunityUpdate(BaseModel):
    name: Optional[str] = None
    contact_id: Optional[str] = None
    stage: Optional[str] = None
    probability: Optional[float] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    expected_close_date: Optional[str] = None
    source: Optional[str] = None
    product_interest: Optional[str] = None
    service_type: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    frequency: Optional[str] = None
    volume_estimate: Optional[str] = None
    assigned_to: Optional[str] = None
    competitor: Optional[str] = None
    competitor_price: Optional[float] = None
    close_reason: Optional[str] = None
    next_step: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None


@router.get("")
def list_opportunities(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    stage: Optional[str] = Query(None),
    account_id: Optional[str] = Query(None),
    assigned_to: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: Optional[str] = Query(None, description="Field to sort by"),
    sort_order: Optional[str] = Query("desc", description="Sort order: asc or desc"),
):
    """List all opportunities"""
    tenant_id = str(current_user.tenant_id)

    query = select(Opportunity).where(Opportunity.tenant_id == tenant_id)

    if stage:
        query = query.where(Opportunity.stage == stage)

    if account_id:
        query = query.where(Opportunity.account_id == account_id)

    if assigned_to:
        query = query.where(Opportunity.assigned_to == assigned_to)

    if search:
        search_filter = or_(
            Opportunity.name.ilike(f"%{search}%"),
            Opportunity.code.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Sorting
    sort_fields = {
        "code": Opportunity.code,
        "name": Opportunity.name,
        "stage": Opportunity.stage,
        "probability": Opportunity.probability,
        "amount": Opportunity.amount,
        "expected_close_date": Opportunity.expected_close_date,
        "created_at": Opportunity.created_at,
    }
    sort_column = sort_fields.get(sort_by, Opportunity.created_at)
    if sort_order == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    # Pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    opportunities = session.exec(query).all()

    # Enrich with account info
    items = []
    for opp in opportunities:
        account = session.get(Account, opp.account_id)
        contact = session.get(Contact, opp.contact_id) if opp.contact_id else None

        items.append({
            "id": opp.id,
            "code": opp.code,
            "name": opp.name,
            "account_id": opp.account_id,
            "account": {
                "id": account.id,
                "code": account.code,
                "name": account.name,
            } if account else None,
            "contact": {
                "id": contact.id,
                "full_name": contact.full_name,
            } if contact else None,
            "stage": opp.stage,
            "probability": opp.probability,
            "amount": opp.amount,
            "currency": opp.currency,
            "expected_close_date": opp.expected_close_date,
            "service_type": opp.service_type,
            "assigned_to": opp.assigned_to,
            "created_at": str(opp.created_at) if opp.created_at else None,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.get("/pipeline")
def get_pipeline(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get opportunity pipeline summary"""
    tenant_id = str(current_user.tenant_id)

    pipeline = []
    for stage in OpportunityStage:
        if stage.value in ["CLOSED_WON", "CLOSED_LOST"]:
            continue

        opps = session.exec(
            select(Opportunity).where(
                Opportunity.tenant_id == tenant_id,
                Opportunity.stage == stage.value
            )
        ).all()

        total_value = sum(o.amount for o in opps)
        weighted_value = sum(o.amount * (o.probability / 100) for o in opps)

        pipeline.append({
            "stage": stage.value,
            "count": len(opps),
            "total_value": total_value,
            "weighted_value": weighted_value,
        })

    return {"pipeline": pipeline}


@router.post("")
def create_opportunity(
    payload: OpportunityCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new opportunity"""
    tenant_id = str(current_user.tenant_id)

    # Validate account
    account = session.get(Account, payload.account_id)
    if not account or str(account.tenant_id) != tenant_id:
        raise HTTPException(400, "Invalid account_id")

    # Validate contact belongs to account
    if payload.contact_id:
        contact = session.get(Contact, payload.contact_id)
        if not contact or str(contact.tenant_id) != tenant_id:
            raise HTTPException(400, "Invalid contact_id")
        if contact.account_id != payload.account_id:
            raise HTTPException(400, "Contact does not belong to the selected account")

    # Validate expected_close_date
    if payload.expected_close_date:
        validate_expected_close_date(payload.expected_close_date)

    # Generate unique code
    count = session.exec(
        select(func.count()).where(Opportunity.tenant_id == tenant_id)
    ).one()
    code = f"OPP-{datetime.now().year}-{(count + 1):04d}"

    # Check for duplicate code
    existing = session.exec(
        select(Opportunity).where(
            Opportunity.tenant_id == tenant_id,
            Opportunity.code == code
        )
    ).first()
    if existing:
        import time
        code = f"OPP-{datetime.now().year}-{int(time.time())}"

    # Get probability from stage
    probability = STAGE_PROBABILITY.get(payload.stage, 10)

    opportunity = Opportunity(
        tenant_id=tenant_id,
        code=code,
        **payload.model_dump(),
        probability=probability,
        created_by=str(current_user.id),
    )

    session.add(opportunity)
    session.commit()
    session.refresh(opportunity)

    return opportunity


@router.get("/{opportunity_id}")
def get_opportunity(
    opportunity_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get opportunity by ID"""
    tenant_id = str(current_user.tenant_id)

    opp = session.get(Opportunity, opportunity_id)
    if not opp or str(opp.tenant_id) != tenant_id:
        raise HTTPException(404, "Opportunity not found")

    account = session.get(Account, opp.account_id)
    contact = session.get(Contact, opp.contact_id) if opp.contact_id else None

    return {
        **opp.model_dump(),
        "account": {
            "id": account.id,
            "code": account.code,
            "name": account.name,
        } if account else None,
        "contact": {
            "id": contact.id,
            "full_name": contact.full_name,
        } if contact else None,
        "created_at": str(opp.created_at) if opp.created_at else None,
        "updated_at": str(opp.updated_at) if opp.updated_at else None,
    }


@router.put("/{opportunity_id}")
def update_opportunity(
    opportunity_id: str,
    payload: OpportunityUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update an opportunity"""
    tenant_id = str(current_user.tenant_id)

    opp = session.get(Opportunity, opportunity_id)
    if not opp or str(opp.tenant_id) != tenant_id:
        raise HTTPException(404, "Opportunity not found")

    update_data = payload.model_dump(exclude_unset=True)

    # Update probability if stage changed
    if "stage" in update_data and "probability" not in update_data:
        update_data["probability"] = STAGE_PROBABILITY.get(update_data["stage"], opp.probability)

    # Set actual_close_date if closing
    if update_data.get("stage") in ["CLOSED_WON", "CLOSED_LOST"]:
        opp.actual_close_date = datetime.now().strftime("%Y-%m-%d")

    for key, value in update_data.items():
        setattr(opp, key, value)

    opp.updated_at = datetime.utcnow()

    session.add(opp)
    session.commit()
    session.refresh(opp)

    return opp


@router.post("/{opportunity_id}/close-won")
def close_won(
    opportunity_id: str,
    close_reason: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Mark opportunity as won"""
    tenant_id = str(current_user.tenant_id)

    opp = session.get(Opportunity, opportunity_id)
    if not opp or str(opp.tenant_id) != tenant_id:
        raise HTTPException(404, "Opportunity not found")

    opp.stage = OpportunityStage.CLOSED_WON.value
    opp.probability = 100
    opp.actual_close_date = datetime.now().strftime("%Y-%m-%d")
    opp.close_reason = close_reason
    opp.updated_at = datetime.utcnow()

    session.add(opp)
    session.commit()
    session.refresh(opp)

    return opp


@router.post("/{opportunity_id}/close-lost")
def close_lost(
    opportunity_id: str,
    close_reason: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Mark opportunity as lost"""
    tenant_id = str(current_user.tenant_id)

    opp = session.get(Opportunity, opportunity_id)
    if not opp or str(opp.tenant_id) != tenant_id:
        raise HTTPException(404, "Opportunity not found")

    opp.stage = OpportunityStage.CLOSED_LOST.value
    opp.probability = 0
    opp.actual_close_date = datetime.now().strftime("%Y-%m-%d")
    opp.close_reason = close_reason
    opp.updated_at = datetime.utcnow()

    session.add(opp)
    session.commit()
    session.refresh(opp)

    return opp


@router.delete("/{opportunity_id}")
def delete_opportunity(
    opportunity_id: str,
    force: bool = Query(False, description="Force delete and unlink related quotes"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete an opportunity"""
    tenant_id = str(current_user.tenant_id)

    opp = session.get(Opportunity, opportunity_id)
    if not opp or str(opp.tenant_id) != tenant_id:
        raise HTTPException(404, "Opportunity not found")

    # Check for linked quotes
    quote_count = session.exec(
        select(func.count()).where(Quote.opportunity_id == opportunity_id)
    ).one()

    if quote_count > 0:
        # Check if any quotes are accepted
        accepted_count = session.exec(
            select(func.count()).where(
                Quote.opportunity_id == opportunity_id,
                Quote.status == "ACCEPTED"
            )
        ).one()

        if accepted_count > 0:
            raise HTTPException(
                400,
                f"Cannot delete opportunity with {accepted_count} accepted quote(s). "
                "This would break data integrity."
            )

        if not force:
            raise HTTPException(
                400,
                f"Cannot delete opportunity with {quote_count} quote(s). "
                "Use force=true to unlink quotes and delete."
            )

        # Force delete: unlink quotes
        quotes = session.exec(
            select(Quote).where(Quote.opportunity_id == opportunity_id)
        ).all()
        for quote in quotes:
            quote.opportunity_id = None
            session.add(quote)

    session.delete(opp)
    session.commit()

    return {"success": True, "message": "Opportunity deleted"}
