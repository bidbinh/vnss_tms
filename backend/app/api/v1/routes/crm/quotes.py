"""
CRM - Quotes API Routes
Manage quotes/proposals for opportunities
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func, or_
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta

from app.db.session import get_session
from app.models import User
from app.models.crm.quote import Quote, QuoteItem, QuoteStatus, ServiceCategory
from app.models.crm.account import Account
from app.models.crm.contact import Contact
from app.models.crm.opportunity import Opportunity
from app.models.customer import Customer
from app.core.security import get_current_user
from app.api.v1.routes.crm.activity_logs import log_activity
import json

router = APIRouter(prefix="/quotes", tags=["CRM - Quotes"])


class QuoteItemCreate(BaseModel):
    service_category: str = ServiceCategory.TMS.value  # TMS, WMS, FMS, CUSTOMS, FREIGHT, VALUE_ADDED, OTHER
    service_type: Optional[str] = None  # Loại dịch vụ chi tiết tùy theo category
    description: str

    # TMS fields
    route: Optional[str] = None
    container_type: Optional[str] = None
    vehicle_type: Optional[str] = None

    # WMS fields
    warehouse_id: Optional[str] = None
    storage_type: Optional[str] = None
    handling_type: Optional[str] = None

    # FMS fields
    fleet_service: Optional[str] = None

    # Customs fields
    customs_type: Optional[str] = None

    # Pricing
    quantity: float = 1
    unit: str = "CONT"
    unit_price: float = 0
    discount_percent: float = 0
    notes: Optional[str] = None


class QuoteCreate(BaseModel):
    account_id: str
    contact_id: Optional[str] = None
    opportunity_id: Optional[str] = None
    valid_days: int = 30
    currency: str = "VND"
    payment_terms: Optional[str] = None
    delivery_terms: Optional[str] = None
    terms_conditions: Optional[str] = None
    notes: Optional[str] = None
    items: List[QuoteItemCreate] = []


class QuoteUpdate(BaseModel):
    contact_id: Optional[str] = None
    valid_until: Optional[str] = None
    currency: Optional[str] = None
    discount_amount: Optional[float] = None
    discount_percent: Optional[float] = None
    tax_percent: Optional[float] = None
    payment_terms: Optional[str] = None
    delivery_terms: Optional[str] = None
    terms_conditions: Optional[str] = None
    notes: Optional[str] = None


class QuoteItemUpdate(BaseModel):
    service_category: Optional[str] = None
    service_type: Optional[str] = None
    description: Optional[str] = None

    # TMS fields
    route: Optional[str] = None
    container_type: Optional[str] = None
    vehicle_type: Optional[str] = None

    # WMS fields
    warehouse_id: Optional[str] = None
    storage_type: Optional[str] = None
    handling_type: Optional[str] = None

    # FMS fields
    fleet_service: Optional[str] = None

    # Customs fields
    customs_type: Optional[str] = None

    # Pricing
    quantity: Optional[float] = None
    unit: Optional[str] = None
    unit_price: Optional[float] = None
    discount_percent: Optional[float] = None
    notes: Optional[str] = None


def calculate_quote_totals(session: Session, quote: Quote):
    """Recalculate quote totals from items"""
    items = session.exec(
        select(QuoteItem).where(QuoteItem.quote_id == quote.id)
    ).all()

    subtotal = 0
    for item in items:
        item_total = item.quantity * item.unit_price
        item_discount = item_total * (item.discount_percent / 100)
        subtotal += item_total - item_discount

    # Apply quote-level discount
    if quote.discount_percent:
        discount = subtotal * (quote.discount_percent / 100)
    else:
        discount = quote.discount_amount or 0

    after_discount = subtotal - discount

    # Apply tax
    tax = after_discount * ((quote.tax_percent or 10) / 100)

    quote.subtotal = subtotal
    quote.discount_amount = discount
    quote.tax_amount = tax
    quote.total_amount = after_discount + tax

    return quote


@router.get("")
def list_quotes(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    status: Optional[str] = Query(None),
    account_id: Optional[str] = Query(None),
    opportunity_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: Optional[str] = Query(None, description="Field to sort by"),
    sort_order: Optional[str] = Query("desc", description="Sort order: asc or desc"),
):
    """List all quotes"""
    tenant_id = str(current_user.tenant_id)

    query = select(Quote).where(Quote.tenant_id == tenant_id)

    if status:
        query = query.where(Quote.status == status)

    if account_id:
        query = query.where(Quote.account_id == account_id)

    if opportunity_id:
        query = query.where(Quote.opportunity_id == opportunity_id)

    if search:
        search_filter = or_(
            Quote.quote_number.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Sorting
    sort_fields = {
        "quote_number": Quote.quote_number,
        "status": Quote.status,
        "total_amount": Quote.total_amount,
        "valid_until": Quote.valid_until,
        "created_at": Quote.created_at,
    }
    sort_column = sort_fields.get(sort_by, Quote.created_at)
    if sort_order == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    # Pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    quotes = session.exec(query).all()

    # Enrich with account info
    items = []
    for quote in quotes:
        account = session.get(Account, quote.account_id)
        contact = session.get(Contact, quote.contact_id) if quote.contact_id else None
        opportunity = session.get(Opportunity, quote.opportunity_id) if quote.opportunity_id else None

        items.append({
            "id": quote.id,
            "quote_number": quote.quote_number,
            "version": quote.version,
            "account_id": quote.account_id,
            "account": {
                "id": account.id,
                "code": account.code,
                "name": account.name,
            } if account else None,
            "contact": {
                "id": contact.id,
                "full_name": contact.full_name,
            } if contact else None,
            "opportunity": {
                "id": opportunity.id,
                "name": opportunity.name,
            } if opportunity else None,
            "status": quote.status,
            "subtotal": quote.subtotal,
            "total_amount": quote.total_amount,
            "currency": quote.currency,
            "valid_until": quote.valid_until,
            "created_at": str(quote.created_at) if quote.created_at else None,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("")
def create_quote(
    payload: QuoteCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new quote"""
    tenant_id = str(current_user.tenant_id)

    # Validate account
    account = session.get(Account, payload.account_id)
    if not account or str(account.tenant_id) != tenant_id:
        raise HTTPException(400, "Invalid account_id")

    # Generate quote number
    count = session.exec(
        select(func.count()).where(Quote.tenant_id == tenant_id)
    ).one()
    quote_number = f"QT-{datetime.now().year}-{(count + 1):04d}"

    # Calculate valid_until
    valid_until = (datetime.now() + timedelta(days=payload.valid_days)).strftime("%Y-%m-%d")

    quote = Quote(
        tenant_id=tenant_id,
        quote_number=quote_number,
        account_id=payload.account_id,
        contact_id=payload.contact_id,
        opportunity_id=payload.opportunity_id,
        valid_until=valid_until,
        currency=payload.currency,
        payment_terms=payload.payment_terms,
        delivery_terms=payload.delivery_terms,
        terms_conditions=payload.terms_conditions,
        notes=payload.notes,
        created_by=str(current_user.id),
    )

    session.add(quote)
    session.commit()
    session.refresh(quote)

    # Add items
    for idx, item_data in enumerate(payload.items):
        item = QuoteItem(
            tenant_id=tenant_id,
            quote_id=quote.id,
            line_number=idx + 1,
            **item_data.model_dump(),
        )
        session.add(item)

    session.commit()

    # Recalculate totals
    quote = calculate_quote_totals(session, quote)
    session.add(quote)
    session.commit()
    session.refresh(quote)

    return quote


@router.get("/{quote_id}")
def get_quote(
    quote_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get quote by ID with all items"""
    tenant_id = str(current_user.tenant_id)

    quote = session.get(Quote, quote_id)
    if not quote or str(quote.tenant_id) != tenant_id:
        raise HTTPException(404, "Quote not found")

    account = session.get(Account, quote.account_id)
    contact = session.get(Contact, quote.contact_id) if quote.contact_id else None
    opportunity = session.get(Opportunity, quote.opportunity_id) if quote.opportunity_id else None

    # Get items
    items = session.exec(
        select(QuoteItem)
        .where(QuoteItem.quote_id == quote.id)
        .order_by(QuoteItem.line_number)
    ).all()

    return {
        **quote.model_dump(),
        "account": {
            "id": account.id,
            "code": account.code,
            "name": account.name,
        } if account else None,
        "contact": {
            "id": contact.id,
            "full_name": contact.full_name,
        } if contact else None,
        "opportunity": {
            "id": opportunity.id,
            "name": opportunity.name,
        } if opportunity else None,
        "items": [item.model_dump() for item in items],
        "created_at": str(quote.created_at) if quote.created_at else None,
        "updated_at": str(quote.updated_at) if quote.updated_at else None,
    }


@router.put("/{quote_id}")
def update_quote(
    quote_id: str,
    payload: QuoteUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a quote"""
    tenant_id = str(current_user.tenant_id)

    quote = session.get(Quote, quote_id)
    if not quote or str(quote.tenant_id) != tenant_id:
        raise HTTPException(404, "Quote not found")

    if quote.status in ["ACCEPTED", "REJECTED"]:
        raise HTTPException(400, "Cannot update a closed quote")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(quote, key, value)

    quote.updated_at = datetime.utcnow()

    # Recalculate totals
    quote = calculate_quote_totals(session, quote)

    session.add(quote)
    session.commit()
    session.refresh(quote)

    return quote


@router.post("/{quote_id}/items")
def add_quote_item(
    quote_id: str,
    payload: QuoteItemCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Add item to quote"""
    tenant_id = str(current_user.tenant_id)

    quote = session.get(Quote, quote_id)
    if not quote or str(quote.tenant_id) != tenant_id:
        raise HTTPException(404, "Quote not found")

    if quote.status in ["ACCEPTED", "REJECTED"]:
        raise HTTPException(400, "Cannot modify a closed quote")

    # Get next line number
    max_line = session.exec(
        select(func.max(QuoteItem.line_number)).where(QuoteItem.quote_id == quote_id)
    ).one() or 0

    item = QuoteItem(
        tenant_id=tenant_id,
        quote_id=quote_id,
        line_number=max_line + 1,
        **payload.model_dump(),
    )

    session.add(item)
    session.commit()

    # Recalculate totals
    quote = calculate_quote_totals(session, quote)
    quote.updated_at = datetime.utcnow()
    session.add(quote)
    session.commit()
    session.refresh(item)

    return item


@router.put("/{quote_id}/items/{item_id}")
def update_quote_item(
    quote_id: str,
    item_id: str,
    payload: QuoteItemUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a quote item"""
    tenant_id = str(current_user.tenant_id)

    quote = session.get(Quote, quote_id)
    if not quote or str(quote.tenant_id) != tenant_id:
        raise HTTPException(404, "Quote not found")

    if quote.status in ["ACCEPTED", "REJECTED"]:
        raise HTTPException(400, "Cannot modify a closed quote")

    item = session.get(QuoteItem, item_id)
    if not item or item.quote_id != quote_id:
        raise HTTPException(404, "Quote item not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)

    session.add(item)
    session.commit()

    # Recalculate totals
    quote = calculate_quote_totals(session, quote)
    quote.updated_at = datetime.utcnow()
    session.add(quote)
    session.commit()
    session.refresh(item)

    return item


@router.delete("/{quote_id}/items/{item_id}")
def delete_quote_item(
    quote_id: str,
    item_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete a quote item"""
    tenant_id = str(current_user.tenant_id)

    quote = session.get(Quote, quote_id)
    if not quote or str(quote.tenant_id) != tenant_id:
        raise HTTPException(404, "Quote not found")

    if quote.status in ["ACCEPTED", "REJECTED"]:
        raise HTTPException(400, "Cannot modify a closed quote")

    item = session.get(QuoteItem, item_id)
    if not item or item.quote_id != quote_id:
        raise HTTPException(404, "Quote item not found")

    session.delete(item)
    session.commit()

    # Recalculate totals
    quote = calculate_quote_totals(session, quote)
    quote.updated_at = datetime.utcnow()
    session.add(quote)
    session.commit()

    return {"success": True, "message": "Item deleted"}


@router.post("/{quote_id}/send")
def send_quote(
    quote_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Mark quote as sent"""
    tenant_id = str(current_user.tenant_id)

    quote = session.get(Quote, quote_id)
    if not quote or str(quote.tenant_id) != tenant_id:
        raise HTTPException(404, "Quote not found")

    quote.status = QuoteStatus.SENT.value
    quote.sent_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    quote.updated_at = datetime.utcnow()

    session.add(quote)
    session.commit()
    session.refresh(quote)

    return quote


@router.post("/{quote_id}/accept")
def accept_quote(
    quote_id: str,
    skip_expiry_check: bool = Query(False, description="Skip quote expiry validation"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Mark quote as accepted"""
    tenant_id = str(current_user.tenant_id)

    quote = session.get(Quote, quote_id)
    if not quote or str(quote.tenant_id) != tenant_id:
        raise HTTPException(404, "Quote not found")

    # Validate quote status
    if quote.status == QuoteStatus.ACCEPTED.value:
        raise HTTPException(400, "Quote is already accepted")

    if quote.status == QuoteStatus.REJECTED.value:
        raise HTTPException(400, "Cannot accept a rejected quote. Please create a new revision.")

    if quote.status == QuoteStatus.REVISED.value:
        raise HTTPException(400, "This quote has been revised. Please accept the latest version.")

    # Validate quote expiry
    if quote.valid_until and not skip_expiry_check:
        try:
            expiry_date = datetime.strptime(quote.valid_until, "%Y-%m-%d")
            if expiry_date.date() < datetime.now().date():
                raise HTTPException(
                    400,
                    f"Quote expired on {quote.valid_until}. "
                    "Please create a new revision or use skip_expiry_check=true to override."
                )
        except ValueError:
            pass  # Invalid date format, skip validation

    # Validate linked opportunity status
    if quote.opportunity_id:
        opportunity = session.get(Opportunity, quote.opportunity_id)
        if opportunity:
            # Check if opportunity is already closed
            if opportunity.stage == "CLOSED_LOST":
                raise HTTPException(
                    400,
                    "Cannot accept quote for a CLOSED_LOST opportunity. "
                    "Please reopen the opportunity first."
                )
            if opportunity.stage == "CLOSED_WON":
                raise HTTPException(
                    400,
                    "This opportunity is already CLOSED_WON. "
                    "Quote may have been accepted through another quote."
                )

    quote.status = QuoteStatus.ACCEPTED.value
    quote.accepted_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    quote.updated_at = datetime.utcnow()

    # If linked to opportunity, update opportunity
    if quote.opportunity_id:
        opportunity = session.get(Opportunity, quote.opportunity_id)
        if opportunity:
            opportunity.stage = "CLOSED_WON"
            opportunity.probability = 100
            opportunity.actual_close_date = datetime.now().strftime("%Y-%m-%d")
            opportunity.close_reason = f"Quote {quote.quote_number} accepted"
            session.add(opportunity)

    # Sync Account to TMS Customer if not already synced
    account = session.get(Account, quote.account_id)
    tms_customer_id = None
    if account and not account.synced_to_tms:
        # Check if TMS customer with same code already exists
        existing_customer = session.exec(
            select(Customer).where(
                Customer.tenant_id == tenant_id,
                Customer.code == account.code
            )
        ).first()

        if existing_customer:
            # Link to existing customer
            tms_customer_id = existing_customer.id
        else:
            # Create new TMS customer
            # Get primary contact info for contacts_json
            contacts_data = []
            primary_contact = session.exec(
                select(Contact).where(
                    Contact.account_id == account.id,
                    Contact.is_primary == True
                )
            ).first()
            if primary_contact:
                contacts_data.append({
                    "name": primary_contact.full_name,
                    "phone": primary_contact.phone or primary_contact.mobile,
                    "email": primary_contact.email,
                    "is_primary": True
                })

            customer = Customer(
                tenant_id=tenant_id,
                code=account.code,
                name=account.name,
                tax_code=account.tax_code,
                contacts_json=json.dumps(contacts_data) if contacts_data else None,
            )
            session.add(customer)
            session.commit()
            session.refresh(customer)
            tms_customer_id = customer.id

        # Update account with TMS link
        account.tms_customer_id = tms_customer_id
        account.synced_to_tms = True
        account.synced_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        session.add(account)

    # Log activity
    user_name = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or current_user.email
    log_activity(
        session=session,
        tenant_id=tenant_id,
        user_id=str(current_user.id),
        user_name=user_name,
        entity_type="QUOTE",
        entity_id=quote_id,
        entity_code=quote.quote_number,
        entity_name=f"Quote for {account.name if account else 'Unknown'}",
        action="ACCEPT",
        description=f"Quote accepted. Total: {quote.total_amount} {quote.currency}. " +
                    (f"TMS Customer created: {tms_customer_id}" if tms_customer_id else ""),
        new_values={
            "status": "ACCEPTED",
            "tms_customer_id": tms_customer_id,
            "total_amount": quote.total_amount,
        },
        related_entity_type="ACCOUNT",
        related_entity_id=quote.account_id,
    )

    session.add(quote)
    session.commit()
    session.refresh(quote)

    result = quote.model_dump()
    result["tms_customer_id"] = tms_customer_id
    result["tms_synced"] = account.synced_to_tms if account else False

    return result


@router.post("/{quote_id}/reject")
def reject_quote(
    quote_id: str,
    rejection_reason: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Mark quote as rejected"""
    tenant_id = str(current_user.tenant_id)

    quote = session.get(Quote, quote_id)
    if not quote or str(quote.tenant_id) != tenant_id:
        raise HTTPException(404, "Quote not found")

    quote.status = QuoteStatus.REJECTED.value
    quote.rejection_reason = rejection_reason
    quote.updated_at = datetime.utcnow()

    session.add(quote)
    session.commit()
    session.refresh(quote)

    return quote


@router.post("/{quote_id}/revise")
def revise_quote(
    quote_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new version of the quote"""
    tenant_id = str(current_user.tenant_id)

    old_quote = session.get(Quote, quote_id)
    if not old_quote or str(old_quote.tenant_id) != tenant_id:
        raise HTTPException(404, "Quote not found")

    # Mark old quote as revised
    old_quote.status = QuoteStatus.REVISED.value
    session.add(old_quote)

    # Create new version
    new_quote = Quote(
        tenant_id=tenant_id,
        quote_number=old_quote.quote_number,
        version=old_quote.version + 1,
        parent_quote_id=old_quote.id,
        account_id=old_quote.account_id,
        contact_id=old_quote.contact_id,
        opportunity_id=old_quote.opportunity_id,
        currency=old_quote.currency,
        discount_percent=old_quote.discount_percent,
        tax_percent=old_quote.tax_percent,
        payment_terms=old_quote.payment_terms,
        delivery_terms=old_quote.delivery_terms,
        terms_conditions=old_quote.terms_conditions,
        notes=old_quote.notes,
        valid_until=(datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
        created_by=str(current_user.id),
    )

    session.add(new_quote)
    session.commit()
    session.refresh(new_quote)

    # Copy items
    old_items = session.exec(
        select(QuoteItem).where(QuoteItem.quote_id == old_quote.id)
    ).all()

    for old_item in old_items:
        new_item = QuoteItem(
            tenant_id=tenant_id,
            quote_id=new_quote.id,
            line_number=old_item.line_number,
            service_category=old_item.service_category,
            service_type=old_item.service_type,
            description=old_item.description,
            # TMS fields
            route=old_item.route,
            container_type=old_item.container_type,
            vehicle_type=old_item.vehicle_type,
            # WMS fields
            warehouse_id=old_item.warehouse_id,
            storage_type=old_item.storage_type,
            handling_type=old_item.handling_type,
            # FMS fields
            fleet_service=old_item.fleet_service,
            # Customs fields
            customs_type=old_item.customs_type,
            # Pricing
            quantity=old_item.quantity,
            unit=old_item.unit,
            unit_price=old_item.unit_price,
            discount_percent=old_item.discount_percent,
            notes=old_item.notes,
        )
        session.add(new_item)

    session.commit()

    # Recalculate totals
    new_quote = calculate_quote_totals(session, new_quote)
    session.add(new_quote)
    session.commit()
    session.refresh(new_quote)

    return new_quote


@router.delete("/{quote_id}")
def delete_quote(
    quote_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete a quote"""
    tenant_id = str(current_user.tenant_id)

    quote = session.get(Quote, quote_id)
    if not quote or str(quote.tenant_id) != tenant_id:
        raise HTTPException(404, "Quote not found")

    if quote.status in ["ACCEPTED"]:
        raise HTTPException(400, "Cannot delete an accepted quote")

    # Delete items first
    items = session.exec(
        select(QuoteItem).where(QuoteItem.quote_id == quote_id)
    ).all()
    for item in items:
        session.delete(item)

    session.delete(quote)
    session.commit()

    return {"success": True, "message": "Quote deleted"}
