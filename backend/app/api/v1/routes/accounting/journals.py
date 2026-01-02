"""
Accounting - Journal & Journal Entry API Routes
Sổ nhật ký và Bút toán
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func, or_
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

from app.db.session import get_session
from app.models import User
from app.models.accounting import (
    Journal, JournalType, JournalEntry, JournalEntryStatus, JournalEntryLine,
    ChartOfAccounts, FiscalYear, FiscalPeriod, GeneralLedger
)
from app.core.security import get_current_user

router = APIRouter()


# =====================
# PYDANTIC SCHEMAS
# =====================

class JournalCreate(BaseModel):
    code: str
    name: str
    journal_type: str = JournalType.GENERAL.value
    default_debit_account_id: Optional[str] = None
    default_credit_account_id: Optional[str] = None
    sequence_prefix: str = "JE"
    sequence_padding: int = 6
    notes: Optional[str] = None


class JournalUpdate(BaseModel):
    name: Optional[str] = None
    default_debit_account_id: Optional[str] = None
    default_credit_account_id: Optional[str] = None
    sequence_prefix: Optional[str] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class JournalEntryLineCreate(BaseModel):
    account_id: str
    debit_amount: Decimal = Decimal("0")
    credit_amount: Decimal = Decimal("0")
    description: Optional[str] = None
    partner_id: Optional[str] = None
    partner_type: Optional[str] = None
    cost_center_id: Optional[str] = None
    project_id: Optional[str] = None
    currency: str = "VND"
    amount_currency: Decimal = Decimal("0")
    exchange_rate: Decimal = Decimal("1")


class JournalEntryCreate(BaseModel):
    journal_id: str
    entry_date: datetime
    description: str
    reference: Optional[str] = None
    source_type: Optional[str] = None
    source_id: Optional[str] = None
    currency: str = "VND"
    exchange_rate: Decimal = Decimal("1")
    notes: Optional[str] = None
    lines: List[JournalEntryLineCreate]


class JournalEntryUpdate(BaseModel):
    entry_date: Optional[datetime] = None
    description: Optional[str] = None
    reference: Optional[str] = None
    notes: Optional[str] = None
    lines: Optional[List[JournalEntryLineCreate]] = None


# =====================
# JOURNALS
# =====================

@router.get("/journals")
def list_journals(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    journal_type: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
):
    """List all journals"""
    tenant_id = str(current_user.tenant_id)

    query = select(Journal).where(Journal.tenant_id == tenant_id)

    if journal_type:
        query = query.where(Journal.journal_type == journal_type)

    if is_active is not None:
        query = query.where(Journal.is_active == is_active)

    query = query.order_by(Journal.code)

    journals = session.exec(query).all()

    return {"items": [j.model_dump() for j in journals]}


@router.post("/journals")
def create_journal(
    payload: JournalCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new journal"""
    tenant_id = str(current_user.tenant_id)

    # Check unique code
    existing = session.exec(
        select(Journal).where(
            Journal.tenant_id == tenant_id,
            Journal.code == payload.code
        )
    ).first()
    if existing:
        raise HTTPException(400, f"Journal code '{payload.code}' already exists")

    journal = Journal(
        tenant_id=tenant_id,
        **payload.model_dump(),
        is_active=True,
        next_sequence=1,
        created_by=str(current_user.id),
    )

    session.add(journal)
    session.commit()
    session.refresh(journal)

    return journal


@router.get("/journals/{journal_id}")
def get_journal(
    journal_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get journal by ID"""
    tenant_id = str(current_user.tenant_id)

    journal = session.get(Journal, journal_id)
    if not journal or str(journal.tenant_id) != tenant_id:
        raise HTTPException(404, "Journal not found")

    return journal.model_dump()


@router.put("/journals/{journal_id}")
def update_journal(
    journal_id: str,
    payload: JournalUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a journal"""
    tenant_id = str(current_user.tenant_id)

    journal = session.get(Journal, journal_id)
    if not journal or str(journal.tenant_id) != tenant_id:
        raise HTTPException(404, "Journal not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(journal, key, value)

    journal.updated_at = datetime.utcnow()

    session.add(journal)
    session.commit()
    session.refresh(journal)

    return journal


# =====================
# JOURNAL ENTRIES
# =====================

def get_fiscal_period_for_date(session: Session, tenant_id: str, entry_date: datetime):
    """Find the appropriate fiscal period for a date"""
    period = session.exec(
        select(FiscalPeriod).where(
            FiscalPeriod.tenant_id == tenant_id,
            FiscalPeriod.start_date <= entry_date,
            FiscalPeriod.end_date >= entry_date,
            FiscalPeriod.is_open == True
        )
    ).first()

    if not period:
        raise HTTPException(400, f"No open fiscal period found for date {entry_date.date()}")

    return period


def generate_entry_number(session: Session, journal: Journal, tenant_id: str) -> str:
    """Generate the next entry number for a journal"""
    prefix = journal.sequence_prefix
    padding = journal.sequence_padding
    next_num = journal.next_sequence

    # Update next sequence
    journal.next_sequence = next_num + 1
    session.add(journal)

    year = datetime.utcnow().year
    return f"{prefix}{year}/{str(next_num).zfill(padding)}"


@router.get("/journal-entries")
def list_journal_entries(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    journal_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    search: Optional[str] = Query(None),
):
    """List journal entries with pagination and filters"""
    tenant_id = str(current_user.tenant_id)

    query = select(JournalEntry).where(JournalEntry.tenant_id == tenant_id)

    if journal_id:
        query = query.where(JournalEntry.journal_id == journal_id)

    if status:
        query = query.where(JournalEntry.status == status)

    if date_from:
        query = query.where(JournalEntry.entry_date >= date_from)

    if date_to:
        query = query.where(JournalEntry.entry_date <= date_to)

    if search:
        search_filter = or_(
            JournalEntry.entry_number.ilike(f"%{search}%"),
            JournalEntry.description.ilike(f"%{search}%"),
            JournalEntry.reference.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(JournalEntry.entry_date.desc(), JournalEntry.entry_number.desc())
    query = query.offset(offset).limit(page_size)

    entries = session.exec(query).all()

    return {
        "items": [e.model_dump() for e in entries],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("/journal-entries")
def create_journal_entry(
    payload: JournalEntryCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new journal entry with lines"""
    tenant_id = str(current_user.tenant_id)

    # Validate journal
    journal = session.get(Journal, payload.journal_id)
    if not journal or str(journal.tenant_id) != tenant_id:
        raise HTTPException(400, "Invalid journal_id")

    if not journal.is_active:
        raise HTTPException(400, "Journal is not active")

    # Validate lines
    if not payload.lines or len(payload.lines) < 2:
        raise HTTPException(400, "Journal entry must have at least 2 lines")

    # Validate debit = credit
    total_debit = sum(line.debit_amount for line in payload.lines)
    total_credit = sum(line.credit_amount for line in payload.lines)

    if total_debit != total_credit:
        raise HTTPException(400, f"Debit ({total_debit}) must equal Credit ({total_credit})")

    if total_debit == 0:
        raise HTTPException(400, "Entry must have non-zero amounts")

    # Get fiscal period
    period = get_fiscal_period_for_date(session, tenant_id, payload.entry_date)

    # Generate entry number
    entry_number = generate_entry_number(session, journal, tenant_id)

    # Create entry header
    entry = JournalEntry(
        tenant_id=tenant_id,
        journal_id=payload.journal_id,
        entry_number=entry_number,
        entry_date=payload.entry_date,
        fiscal_year_id=period.fiscal_year_id,
        fiscal_period_id=period.id,
        description=payload.description,
        reference=payload.reference,
        source_type=payload.source_type,
        source_id=payload.source_id,
        total_debit=total_debit,
        total_credit=total_credit,
        currency=payload.currency,
        exchange_rate=payload.exchange_rate,
        status=JournalEntryStatus.DRAFT.value,
        notes=payload.notes,
        created_by=str(current_user.id),
    )

    session.add(entry)
    session.flush()  # Get entry ID

    # Create entry lines
    for idx, line_data in enumerate(payload.lines, start=1):
        # Get account code for denormalization
        account = session.get(ChartOfAccounts, line_data.account_id)
        if not account or str(account.tenant_id) != tenant_id:
            raise HTTPException(400, f"Invalid account_id: {line_data.account_id}")

        if not account.allow_posting:
            raise HTTPException(400, f"Account {account.account_code} does not allow posting")

        line = JournalEntryLine(
            tenant_id=tenant_id,
            journal_entry_id=entry.id,
            line_number=idx,
            account_id=line_data.account_id,
            account_code=account.account_code,
            debit_amount=line_data.debit_amount,
            credit_amount=line_data.credit_amount,
            description=line_data.description,
            partner_id=line_data.partner_id,
            partner_type=line_data.partner_type,
            cost_center_id=line_data.cost_center_id,
            project_id=line_data.project_id,
            currency=line_data.currency,
            amount_currency=line_data.amount_currency,
            exchange_rate=line_data.exchange_rate,
        )
        session.add(line)

    session.commit()
    session.refresh(entry)

    # Fetch lines
    lines = session.exec(
        select(JournalEntryLine).where(JournalEntryLine.journal_entry_id == entry.id)
        .order_by(JournalEntryLine.line_number)
    ).all()

    return {
        **entry.model_dump(),
        "lines": [l.model_dump() for l in lines]
    }


@router.get("/journal-entries/{entry_id}")
def get_journal_entry(
    entry_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get journal entry with lines"""
    tenant_id = str(current_user.tenant_id)

    entry = session.get(JournalEntry, entry_id)
    if not entry or str(entry.tenant_id) != tenant_id:
        raise HTTPException(404, "Journal entry not found")

    lines = session.exec(
        select(JournalEntryLine).where(JournalEntryLine.journal_entry_id == entry_id)
        .order_by(JournalEntryLine.line_number)
    ).all()

    return {
        **entry.model_dump(),
        "lines": [l.model_dump() for l in lines]
    }


@router.put("/journal-entries/{entry_id}")
def update_journal_entry(
    entry_id: str,
    payload: JournalEntryUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a draft journal entry"""
    tenant_id = str(current_user.tenant_id)

    entry = session.get(JournalEntry, entry_id)
    if not entry or str(entry.tenant_id) != tenant_id:
        raise HTTPException(404, "Journal entry not found")

    if entry.status != JournalEntryStatus.DRAFT.value:
        raise HTTPException(400, "Can only update draft entries")

    # Update header fields
    if payload.entry_date:
        # Re-validate fiscal period
        period = get_fiscal_period_for_date(session, tenant_id, payload.entry_date)
        entry.entry_date = payload.entry_date
        entry.fiscal_year_id = period.fiscal_year_id
        entry.fiscal_period_id = period.id

    if payload.description:
        entry.description = payload.description

    if payload.reference is not None:
        entry.reference = payload.reference

    if payload.notes is not None:
        entry.notes = payload.notes

    # Update lines if provided
    if payload.lines is not None:
        if len(payload.lines) < 2:
            raise HTTPException(400, "Journal entry must have at least 2 lines")

        # Validate debit = credit
        total_debit = sum(line.debit_amount for line in payload.lines)
        total_credit = sum(line.credit_amount for line in payload.lines)

        if total_debit != total_credit:
            raise HTTPException(400, f"Debit ({total_debit}) must equal Credit ({total_credit})")

        # Delete existing lines
        existing_lines = session.exec(
            select(JournalEntryLine).where(JournalEntryLine.journal_entry_id == entry_id)
        ).all()
        for line in existing_lines:
            session.delete(line)

        # Create new lines
        for idx, line_data in enumerate(payload.lines, start=1):
            account = session.get(ChartOfAccounts, line_data.account_id)
            if not account or str(account.tenant_id) != tenant_id:
                raise HTTPException(400, f"Invalid account_id: {line_data.account_id}")

            line = JournalEntryLine(
                tenant_id=tenant_id,
                journal_entry_id=entry.id,
                line_number=idx,
                account_id=line_data.account_id,
                account_code=account.account_code,
                debit_amount=line_data.debit_amount,
                credit_amount=line_data.credit_amount,
                description=line_data.description,
                partner_id=line_data.partner_id,
                partner_type=line_data.partner_type,
                cost_center_id=line_data.cost_center_id,
                project_id=line_data.project_id,
                currency=line_data.currency,
                amount_currency=line_data.amount_currency,
                exchange_rate=line_data.exchange_rate,
            )
            session.add(line)

        entry.total_debit = total_debit
        entry.total_credit = total_credit

    entry.updated_at = datetime.utcnow()
    session.add(entry)
    session.commit()
    session.refresh(entry)

    lines = session.exec(
        select(JournalEntryLine).where(JournalEntryLine.journal_entry_id == entry.id)
        .order_by(JournalEntryLine.line_number)
    ).all()

    return {
        **entry.model_dump(),
        "lines": [l.model_dump() for l in lines]
    }


@router.post("/journal-entries/{entry_id}/post")
def post_journal_entry(
    entry_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Post a journal entry (move from DRAFT to POSTED)"""
    tenant_id = str(current_user.tenant_id)

    entry = session.get(JournalEntry, entry_id)
    if not entry or str(entry.tenant_id) != tenant_id:
        raise HTTPException(404, "Journal entry not found")

    if entry.status != JournalEntryStatus.DRAFT.value:
        raise HTTPException(400, f"Cannot post entry with status {entry.status}")

    # Verify fiscal period is still open
    period = session.get(FiscalPeriod, entry.fiscal_period_id)
    if not period or not period.is_open:
        raise HTTPException(400, "Fiscal period is closed")

    # Update account balances in General Ledger
    lines = session.exec(
        select(JournalEntryLine).where(JournalEntryLine.journal_entry_id == entry_id)
    ).all()

    for line in lines:
        # Find or create GL record
        gl = session.exec(
            select(GeneralLedger).where(
                GeneralLedger.tenant_id == tenant_id,
                GeneralLedger.account_id == line.account_id,
                GeneralLedger.fiscal_year_id == entry.fiscal_year_id,
                GeneralLedger.fiscal_period_id == entry.fiscal_period_id,
                GeneralLedger.partner_id == line.partner_id if line.partner_id else GeneralLedger.partner_id.is_(None)
            )
        ).first()

        if not gl:
            gl = GeneralLedger(
                tenant_id=tenant_id,
                account_id=line.account_id,
                account_code=line.account_code,
                fiscal_year_id=entry.fiscal_year_id,
                fiscal_period_id=entry.fiscal_period_id,
                partner_id=line.partner_id,
                opening_debit=Decimal("0"),
                opening_credit=Decimal("0"),
                period_debit=Decimal("0"),
                period_credit=Decimal("0"),
                closing_debit=Decimal("0"),
                closing_credit=Decimal("0"),
            )

        gl.period_debit += line.debit_amount
        gl.period_credit += line.credit_amount
        gl.closing_debit = gl.opening_debit + gl.period_debit
        gl.closing_credit = gl.opening_credit + gl.period_credit
        gl.last_entry_id = entry.id
        gl.last_entry_date = entry.entry_date
        gl.updated_at = datetime.utcnow()

        session.add(gl)

        # Update account current balance
        account = session.get(ChartOfAccounts, line.account_id)
        if account:
            account.current_debit += line.debit_amount
            account.current_credit += line.credit_amount
            account.updated_at = datetime.utcnow()
            session.add(account)

    # Update entry status
    entry.status = JournalEntryStatus.POSTED.value
    entry.posted_at = datetime.utcnow()
    entry.posted_by = str(current_user.id)
    entry.updated_at = datetime.utcnow()

    session.add(entry)
    session.commit()
    session.refresh(entry)

    return {"success": True, "message": "Entry posted successfully", "entry": entry.model_dump()}


@router.post("/journal-entries/{entry_id}/reverse")
def reverse_journal_entry(
    entry_id: str,
    reversal_date: Optional[datetime] = Query(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Reverse a posted journal entry"""
    tenant_id = str(current_user.tenant_id)

    entry = session.get(JournalEntry, entry_id)
    if not entry or str(entry.tenant_id) != tenant_id:
        raise HTTPException(404, "Journal entry not found")

    if entry.status != JournalEntryStatus.POSTED.value:
        raise HTTPException(400, "Can only reverse posted entries")

    if entry.reversed_entry_id:
        raise HTTPException(400, "Entry has already been reversed")

    # Use provided date or current date
    rev_date = reversal_date or datetime.utcnow()

    # Get fiscal period for reversal
    period = get_fiscal_period_for_date(session, tenant_id, rev_date)

    # Get original lines
    original_lines = session.exec(
        select(JournalEntryLine).where(JournalEntryLine.journal_entry_id == entry_id)
    ).all()

    # Create reversal entry
    journal = session.get(Journal, entry.journal_id)
    rev_number = generate_entry_number(session, journal, tenant_id)

    reversal = JournalEntry(
        tenant_id=tenant_id,
        journal_id=entry.journal_id,
        entry_number=rev_number,
        entry_date=rev_date,
        fiscal_year_id=period.fiscal_year_id,
        fiscal_period_id=period.id,
        description=f"Đảo ngược: {entry.description}",
        reference=entry.entry_number,
        source_type="REVERSAL",
        source_id=entry.id,
        total_debit=entry.total_credit,  # Swapped
        total_credit=entry.total_debit,  # Swapped
        currency=entry.currency,
        exchange_rate=entry.exchange_rate,
        status=JournalEntryStatus.POSTED.value,
        posted_at=datetime.utcnow(),
        posted_by=str(current_user.id),
        reversal_of_id=entry.id,
        notes=f"Đảo ngược bút toán {entry.entry_number}",
        created_by=str(current_user.id),
    )

    session.add(reversal)
    session.flush()

    # Create reversed lines (swap debit/credit)
    for idx, orig_line in enumerate(original_lines, start=1):
        rev_line = JournalEntryLine(
            tenant_id=tenant_id,
            journal_entry_id=reversal.id,
            line_number=idx,
            account_id=orig_line.account_id,
            account_code=orig_line.account_code,
            debit_amount=orig_line.credit_amount,  # Swapped
            credit_amount=orig_line.debit_amount,  # Swapped
            description=f"Đảo: {orig_line.description or ''}",
            partner_id=orig_line.partner_id,
            partner_type=orig_line.partner_type,
            cost_center_id=orig_line.cost_center_id,
            project_id=orig_line.project_id,
            currency=orig_line.currency,
            amount_currency=-orig_line.amount_currency,
            exchange_rate=orig_line.exchange_rate,
        )
        session.add(rev_line)

        # Update GL - subtract the reversed amounts
        gl = session.exec(
            select(GeneralLedger).where(
                GeneralLedger.tenant_id == tenant_id,
                GeneralLedger.account_id == orig_line.account_id,
                GeneralLedger.fiscal_year_id == period.fiscal_year_id,
                GeneralLedger.fiscal_period_id == period.id,
            )
        ).first()

        if gl:
            gl.period_debit += rev_line.debit_amount
            gl.period_credit += rev_line.credit_amount
            gl.closing_debit = gl.opening_debit + gl.period_debit
            gl.closing_credit = gl.opening_credit + gl.period_credit
            gl.updated_at = datetime.utcnow()
            session.add(gl)

        # Update account balance
        account = session.get(ChartOfAccounts, orig_line.account_id)
        if account:
            account.current_debit += rev_line.debit_amount
            account.current_credit += rev_line.credit_amount
            account.updated_at = datetime.utcnow()
            session.add(account)

    # Mark original as reversed
    entry.status = JournalEntryStatus.REVERSED.value
    entry.reversed_entry_id = reversal.id
    entry.updated_at = datetime.utcnow()
    session.add(entry)

    session.commit()
    session.refresh(reversal)

    return {
        "success": True,
        "message": "Entry reversed successfully",
        "original_entry_id": entry.id,
        "reversal_entry": reversal.model_dump()
    }


@router.delete("/journal-entries/{entry_id}")
def delete_journal_entry(
    entry_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete a draft journal entry"""
    tenant_id = str(current_user.tenant_id)

    entry = session.get(JournalEntry, entry_id)
    if not entry or str(entry.tenant_id) != tenant_id:
        raise HTTPException(404, "Journal entry not found")

    if entry.status != JournalEntryStatus.DRAFT.value:
        raise HTTPException(400, "Can only delete draft entries. Use reverse for posted entries.")

    # Delete lines first
    lines = session.exec(
        select(JournalEntryLine).where(JournalEntryLine.journal_entry_id == entry_id)
    ).all()
    for line in lines:
        session.delete(line)

    # Delete entry
    session.delete(entry)
    session.commit()

    return {"success": True, "message": "Entry deleted successfully"}
