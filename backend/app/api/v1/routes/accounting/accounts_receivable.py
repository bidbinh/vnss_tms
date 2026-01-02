"""
Accounting - Accounts Receivable API Routes
Công nợ phải thu
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func, or_
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
from decimal import Decimal

from app.db.session import get_session
from app.models import User
from app.models.accounting import (
    CustomerInvoice, CustomerInvoiceLine, InvoiceType, InvoiceStatus,
    PaymentReceipt, PaymentReceiptStatus, PaymentReceiptAllocation,
    CreditNote, ARAgingSnapshot, ChartOfAccounts, FiscalPeriod
)
from app.core.security import get_current_user

router = APIRouter()


# =====================
# PYDANTIC SCHEMAS
# =====================

class InvoiceLineCreate(BaseModel):
    product_id: Optional[str] = None
    description: str
    quantity: Decimal = Decimal("1")
    unit_price: Decimal
    discount_percent: Decimal = Decimal("0")
    tax_id: Optional[str] = None
    tax_percent: Decimal = Decimal("0")
    account_id: Optional[str] = None
    cost_center_id: Optional[str] = None
    project_id: Optional[str] = None


class CustomerInvoiceCreate(BaseModel):
    customer_id: str
    invoice_date: datetime
    due_date: datetime
    invoice_type: str = InvoiceType.SALES.value
    currency: str = "VND"
    exchange_rate: Decimal = Decimal("1")
    reference: Optional[str] = None
    description: Optional[str] = None
    payment_terms: Optional[str] = None
    notes: Optional[str] = None
    lines: List[InvoiceLineCreate]


class CustomerInvoiceUpdate(BaseModel):
    due_date: Optional[datetime] = None
    reference: Optional[str] = None
    description: Optional[str] = None
    payment_terms: Optional[str] = None
    notes: Optional[str] = None


class PaymentReceiptCreate(BaseModel):
    customer_id: str
    receipt_date: datetime
    amount: Decimal
    payment_method: str = "CASH"  # CASH, BANK_TRANSFER, CHECK, CARD
    bank_account_id: Optional[str] = None
    reference: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    invoice_allocations: Optional[List[dict]] = None  # [{invoice_id, amount}]


class CreditNoteCreate(BaseModel):
    customer_id: str
    original_invoice_id: Optional[str] = None
    credit_date: datetime
    reason: str
    amount: Decimal
    notes: Optional[str] = None


# =====================
# HELPER FUNCTIONS
# =====================

def generate_invoice_number(session: Session, tenant_id: str, invoice_type: str) -> str:
    """Generate invoice number"""
    year = datetime.utcnow().year
    prefix = "INV" if invoice_type == InvoiceType.SALES.value else "HD"

    # Count existing invoices this year
    count = session.exec(
        select(func.count()).select_from(CustomerInvoice).where(
            CustomerInvoice.tenant_id == tenant_id,
            CustomerInvoice.invoice_number.like(f"{prefix}{year}%")
        )
    ).one()

    return f"{prefix}{year}/{str(count + 1).zfill(6)}"


def generate_receipt_number(session: Session, tenant_id: str) -> str:
    """Generate receipt number"""
    year = datetime.utcnow().year

    count = session.exec(
        select(func.count()).select_from(PaymentReceipt).where(
            PaymentReceipt.tenant_id == tenant_id,
            PaymentReceipt.receipt_number.like(f"PT{year}%")
        )
    ).one()

    return f"PT{year}/{str(count + 1).zfill(6)}"


# =====================
# CUSTOMER INVOICES
# =====================

@router.get("/customer-invoices")
def list_customer_invoices(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    customer_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    invoice_type: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    overdue_only: bool = Query(False),
    search: Optional[str] = Query(None),
):
    """List customer invoices with filters"""
    tenant_id = str(current_user.tenant_id)

    query = select(CustomerInvoice).where(CustomerInvoice.tenant_id == tenant_id)

    if customer_id:
        query = query.where(CustomerInvoice.customer_id == customer_id)

    if status:
        query = query.where(CustomerInvoice.status == status)

    if invoice_type:
        query = query.where(CustomerInvoice.invoice_type == invoice_type)

    if date_from:
        query = query.where(CustomerInvoice.invoice_date >= date_from)

    if date_to:
        query = query.where(CustomerInvoice.invoice_date <= date_to)

    if overdue_only:
        query = query.where(
            CustomerInvoice.due_date < datetime.utcnow(),
            CustomerInvoice.status.in_([InvoiceStatus.SENT.value, InvoiceStatus.PARTIAL.value])
        )

    if search:
        search_filter = or_(
            CustomerInvoice.invoice_number.ilike(f"%{search}%"),
            CustomerInvoice.reference.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(CustomerInvoice.invoice_date.desc())
    query = query.offset(offset).limit(page_size)

    invoices = session.exec(query).all()

    return {
        "items": [inv.model_dump() for inv in invoices],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("/customer-invoices")
def create_customer_invoice(
    payload: CustomerInvoiceCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new customer invoice"""
    tenant_id = str(current_user.tenant_id)

    if not payload.lines:
        raise HTTPException(400, "Invoice must have at least one line")

    # Calculate totals
    subtotal = Decimal("0")
    total_discount = Decimal("0")
    total_tax = Decimal("0")

    for line in payload.lines:
        line_subtotal = line.quantity * line.unit_price
        line_discount = line_subtotal * (line.discount_percent / 100)
        line_after_discount = line_subtotal - line_discount
        line_tax = line_after_discount * (line.tax_percent / 100)

        subtotal += line_subtotal
        total_discount += line_discount
        total_tax += line_tax

    total_amount = subtotal - total_discount + total_tax

    # Generate invoice number
    invoice_number = generate_invoice_number(session, tenant_id, payload.invoice_type)

    # Create invoice
    invoice = CustomerInvoice(
        tenant_id=tenant_id,
        customer_id=payload.customer_id,
        invoice_number=invoice_number,
        invoice_date=payload.invoice_date,
        due_date=payload.due_date,
        invoice_type=payload.invoice_type,
        currency=payload.currency,
        exchange_rate=payload.exchange_rate,
        subtotal=subtotal,
        discount_amount=total_discount,
        tax_amount=total_tax,
        total_amount=total_amount,
        balance_amount=total_amount,
        paid_amount=Decimal("0"),
        reference=payload.reference,
        description=payload.description,
        payment_terms=payload.payment_terms,
        status=InvoiceStatus.DRAFT.value,
        notes=payload.notes,
        created_by=str(current_user.id),
    )

    session.add(invoice)
    session.flush()

    # Create lines
    for idx, line_data in enumerate(payload.lines, start=1):
        line_subtotal = line_data.quantity * line_data.unit_price
        line_discount = line_subtotal * (line_data.discount_percent / 100)
        line_after_discount = line_subtotal - line_discount
        line_tax = line_after_discount * (line_data.tax_percent / 100)
        line_total = line_after_discount + line_tax

        line = CustomerInvoiceLine(
            tenant_id=tenant_id,
            invoice_id=invoice.id,
            line_number=idx,
            product_id=line_data.product_id,
            description=line_data.description,
            quantity=line_data.quantity,
            unit_price=line_data.unit_price,
            discount_percent=line_data.discount_percent,
            discount_amount=line_discount,
            tax_id=line_data.tax_id,
            tax_percent=line_data.tax_percent,
            tax_amount=line_tax,
            line_total=line_total,
            account_id=line_data.account_id,
            cost_center_id=line_data.cost_center_id,
            project_id=line_data.project_id,
        )
        session.add(line)

    session.commit()
    session.refresh(invoice)

    # Fetch lines
    lines = session.exec(
        select(CustomerInvoiceLine).where(CustomerInvoiceLine.invoice_id == invoice.id)
        .order_by(CustomerInvoiceLine.line_number)
    ).all()

    return {
        **invoice.model_dump(),
        "lines": [l.model_dump() for l in lines]
    }


@router.get("/customer-invoices/{invoice_id}")
def get_customer_invoice(
    invoice_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get customer invoice with lines and payments"""
    tenant_id = str(current_user.tenant_id)

    invoice = session.get(CustomerInvoice, invoice_id)
    if not invoice or str(invoice.tenant_id) != tenant_id:
        raise HTTPException(404, "Invoice not found")

    lines = session.exec(
        select(CustomerInvoiceLine).where(CustomerInvoiceLine.invoice_id == invoice_id)
        .order_by(CustomerInvoiceLine.line_number)
    ).all()

    # Get payment allocations
    allocations = session.exec(
        select(PaymentReceiptAllocation).where(
            PaymentReceiptAllocation.invoice_id == invoice_id
        )
    ).all()

    return {
        **invoice.model_dump(),
        "lines": [l.model_dump() for l in lines],
        "payment_allocations": [a.model_dump() for a in allocations]
    }


@router.post("/customer-invoices/{invoice_id}/send")
def send_invoice(
    invoice_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Mark invoice as sent"""
    tenant_id = str(current_user.tenant_id)

    invoice = session.get(CustomerInvoice, invoice_id)
    if not invoice or str(invoice.tenant_id) != tenant_id:
        raise HTTPException(404, "Invoice not found")

    if invoice.status != InvoiceStatus.DRAFT.value:
        raise HTTPException(400, f"Cannot send invoice with status {invoice.status}")

    invoice.status = InvoiceStatus.SENT.value
    invoice.sent_at = datetime.utcnow()
    invoice.updated_at = datetime.utcnow()

    session.add(invoice)
    session.commit()
    session.refresh(invoice)

    return {"success": True, "invoice": invoice.model_dump()}


@router.post("/customer-invoices/{invoice_id}/cancel")
def cancel_invoice(
    invoice_id: str,
    reason: str = Query(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Cancel an invoice"""
    tenant_id = str(current_user.tenant_id)

    invoice = session.get(CustomerInvoice, invoice_id)
    if not invoice or str(invoice.tenant_id) != tenant_id:
        raise HTTPException(404, "Invoice not found")

    if invoice.status == InvoiceStatus.PAID.value:
        raise HTTPException(400, "Cannot cancel a paid invoice")

    if invoice.paid_amount > 0:
        raise HTTPException(400, "Cannot cancel invoice with payments. Create a credit note instead.")

    invoice.status = InvoiceStatus.CANCELLED.value
    invoice.cancelled_at = datetime.utcnow()
    invoice.cancelled_by = str(current_user.id)
    invoice.cancelled_reason = reason
    invoice.updated_at = datetime.utcnow()

    session.add(invoice)
    session.commit()

    return {"success": True, "message": "Invoice cancelled"}


# =====================
# PAYMENT RECEIPTS
# =====================

@router.get("/payment-receipts")
def list_payment_receipts(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    customer_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
):
    """List payment receipts"""
    tenant_id = str(current_user.tenant_id)

    query = select(PaymentReceipt).where(PaymentReceipt.tenant_id == tenant_id)

    if customer_id:
        query = query.where(PaymentReceipt.customer_id == customer_id)

    if status:
        query = query.where(PaymentReceipt.status == status)

    if date_from:
        query = query.where(PaymentReceipt.receipt_date >= date_from)

    if date_to:
        query = query.where(PaymentReceipt.receipt_date <= date_to)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(PaymentReceipt.receipt_date.desc())
    query = query.offset(offset).limit(page_size)

    receipts = session.exec(query).all()

    return {
        "items": [r.model_dump() for r in receipts],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("/payment-receipts")
def create_payment_receipt(
    payload: PaymentReceiptCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a payment receipt and optionally allocate to invoices"""
    tenant_id = str(current_user.tenant_id)

    # Generate receipt number
    receipt_number = generate_receipt_number(session, tenant_id)

    receipt = PaymentReceipt(
        tenant_id=tenant_id,
        customer_id=payload.customer_id,
        receipt_number=receipt_number,
        receipt_date=payload.receipt_date,
        amount=payload.amount,
        allocated_amount=Decimal("0"),
        unallocated_amount=payload.amount,
        payment_method=payload.payment_method,
        bank_account_id=payload.bank_account_id,
        reference=payload.reference,
        description=payload.description,
        status=PaymentReceiptStatus.DRAFT.value,
        notes=payload.notes,
        created_by=str(current_user.id),
    )

    session.add(receipt)
    session.flush()

    # Allocate to invoices if provided
    if payload.invoice_allocations:
        total_allocated = Decimal("0")

        for alloc in payload.invoice_allocations:
            invoice = session.get(CustomerInvoice, alloc["invoice_id"])
            if not invoice or str(invoice.tenant_id) != tenant_id:
                raise HTTPException(400, f"Invalid invoice_id: {alloc['invoice_id']}")

            if invoice.customer_id != payload.customer_id:
                raise HTTPException(400, "Invoice customer doesn't match receipt customer")

            alloc_amount = Decimal(str(alloc["amount"]))
            if alloc_amount > invoice.balance_amount:
                raise HTTPException(400, f"Allocation {alloc_amount} exceeds invoice due {invoice.balance_amount}")

            allocation = PaymentReceiptAllocation(
                tenant_id=tenant_id,
                receipt_id=receipt.id,
                invoice_id=invoice.id,
                allocated_amount=alloc_amount,
            )
            session.add(allocation)
            total_allocated += alloc_amount

        if total_allocated > payload.amount:
            raise HTTPException(400, f"Total allocation {total_allocated} exceeds receipt amount {payload.amount}")

        receipt.allocated_amount = total_allocated
        receipt.unallocated_amount = payload.amount - total_allocated
        session.add(receipt)

    session.commit()
    session.refresh(receipt)

    return receipt


@router.post("/payment-receipts/{receipt_id}/confirm")
def confirm_payment_receipt(
    receipt_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Confirm a payment receipt and update invoice paid amounts"""
    tenant_id = str(current_user.tenant_id)

    receipt = session.get(PaymentReceipt, receipt_id)
    if not receipt or str(receipt.tenant_id) != tenant_id:
        raise HTTPException(404, "Receipt not found")

    if receipt.status != PaymentReceiptStatus.DRAFT.value:
        raise HTTPException(400, f"Cannot confirm receipt with status {receipt.status}")

    # Update invoices with allocations
    allocations = session.exec(
        select(PaymentReceiptAllocation).where(
            PaymentReceiptAllocation.receipt_id == receipt_id
        )
    ).all()

    for alloc in allocations:
        invoice = session.get(CustomerInvoice, alloc.invoice_id)
        if invoice:
            invoice.paid_amount += alloc.allocated_amount
            invoice.balance_amount -= alloc.allocated_amount

            if invoice.balance_amount <= 0:
                invoice.status = InvoiceStatus.PAID.value
                invoice.paid_at = datetime.utcnow()
            elif invoice.paid_amount > 0:
                invoice.status = InvoiceStatus.PARTIAL.value

            invoice.updated_at = datetime.utcnow()
            session.add(invoice)

    # Confirm receipt
    receipt.status = PaymentReceiptStatus.CONFIRMED.value
    receipt.confirmed_at = datetime.utcnow()
    receipt.confirmed_by = str(current_user.id)
    receipt.updated_at = datetime.utcnow()

    session.add(receipt)
    session.commit()
    session.refresh(receipt)

    return {"success": True, "receipt": receipt.model_dump()}


# =====================
# CREDIT NOTES
# =====================

@router.get("/credit-notes")
def list_credit_notes(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    customer_id: Optional[str] = Query(None),
):
    """List credit notes"""
    tenant_id = str(current_user.tenant_id)

    query = select(CreditNote).where(CreditNote.tenant_id == tenant_id)

    if customer_id:
        query = query.where(CreditNote.customer_id == customer_id)

    query = query.order_by(CreditNote.credit_note_date.desc())

    notes = session.exec(query).all()

    return {"items": [n.model_dump() for n in notes]}


@router.post("/credit-notes")
def create_credit_note(
    payload: CreditNoteCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a credit note"""
    tenant_id = str(current_user.tenant_id)

    # Generate number
    year = datetime.utcnow().year
    count = session.exec(
        select(func.count()).select_from(CreditNote).where(
            CreditNote.tenant_id == tenant_id,
            CreditNote.credit_note_number.like(f"CN{year}%")
        )
    ).one()
    credit_note_number = f"CN{year}/{str(count + 1).zfill(6)}"

    credit_note = CreditNote(
        tenant_id=tenant_id,
        customer_id=payload.customer_id,
        customer_name=payload.customer_name or "",
        credit_note_number=credit_note_number,
        invoice_id=payload.original_invoice_id,
        credit_note_date=payload.credit_date or datetime.utcnow(),
        reason=payload.reason,
        amount=payload.amount,
        total_amount=payload.amount,
        status="DRAFT",
    )

    session.add(credit_note)
    session.commit()
    session.refresh(credit_note)

    return credit_note


# =====================
# AR AGING REPORT
# =====================

@router.get("/ar-aging")
def get_ar_aging(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    as_of_date: Optional[datetime] = Query(None),
):
    """Get AR aging report"""
    tenant_id = str(current_user.tenant_id)
    as_of = as_of_date or datetime.utcnow()

    # Get all outstanding invoices
    invoices = session.exec(
        select(CustomerInvoice).where(
            CustomerInvoice.tenant_id == tenant_id,
            CustomerInvoice.status.in_([InvoiceStatus.SENT.value, InvoiceStatus.PARTIAL.value]),
            CustomerInvoice.balance_amount > 0
        )
    ).all()

    aging_buckets = {
        "current": Decimal("0"),       # Not due yet
        "1_30": Decimal("0"),          # 1-30 days overdue
        "31_60": Decimal("0"),         # 31-60 days overdue
        "61_90": Decimal("0"),         # 61-90 days overdue
        "over_90": Decimal("0"),       # Over 90 days overdue
    }

    customer_aging = {}

    for inv in invoices:
        days_overdue = (as_of.date() - inv.due_date.date()).days

        if days_overdue <= 0:
            bucket = "current"
        elif days_overdue <= 30:
            bucket = "1_30"
        elif days_overdue <= 60:
            bucket = "31_60"
        elif days_overdue <= 90:
            bucket = "61_90"
        else:
            bucket = "over_90"

        aging_buckets[bucket] += inv.balance_amount

        # Group by customer
        cust_id = inv.customer_id
        if cust_id not in customer_aging:
            customer_aging[cust_id] = {
                "customer_id": cust_id,
                "current": Decimal("0"),
                "1_30": Decimal("0"),
                "31_60": Decimal("0"),
                "61_90": Decimal("0"),
                "over_90": Decimal("0"),
                "total": Decimal("0"),
            }
        customer_aging[cust_id][bucket] += inv.balance_amount
        customer_aging[cust_id]["total"] += inv.balance_amount

    total = sum(aging_buckets.values())

    return {
        "as_of_date": as_of.isoformat(),
        "summary": aging_buckets,
        "total": total,
        "by_customer": list(customer_aging.values())
    }


@router.get("/customer-statement/{customer_id}")
def get_customer_statement(
    customer_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
):
    """Get customer statement (invoices and payments)"""
    tenant_id = str(current_user.tenant_id)

    # Get invoices
    inv_query = select(CustomerInvoice).where(
        CustomerInvoice.tenant_id == tenant_id,
        CustomerInvoice.customer_id == customer_id,
        CustomerInvoice.status != InvoiceStatus.DRAFT.value,
        CustomerInvoice.status != InvoiceStatus.CANCELLED.value,
    )

    if date_from:
        inv_query = inv_query.where(CustomerInvoice.invoice_date >= date_from)
    if date_to:
        inv_query = inv_query.where(CustomerInvoice.invoice_date <= date_to)

    invoices = session.exec(inv_query.order_by(CustomerInvoice.invoice_date)).all()

    # Get payments
    pmt_query = select(PaymentReceipt).where(
        PaymentReceipt.tenant_id == tenant_id,
        PaymentReceipt.customer_id == customer_id,
        PaymentReceipt.status == PaymentReceiptStatus.CONFIRMED.value,
    )

    if date_from:
        pmt_query = pmt_query.where(PaymentReceipt.receipt_date >= date_from)
    if date_to:
        pmt_query = pmt_query.where(PaymentReceipt.receipt_date <= date_to)

    payments = session.exec(pmt_query.order_by(PaymentReceipt.receipt_date)).all()

    # Calculate totals
    total_invoiced = sum(inv.total_amount for inv in invoices)
    total_paid = sum(pmt.amount for pmt in payments)
    balance = total_invoiced - total_paid

    return {
        "customer_id": customer_id,
        "period": {
            "from": date_from.isoformat() if date_from else None,
            "to": date_to.isoformat() if date_to else None,
        },
        "invoices": [inv.model_dump() for inv in invoices],
        "payments": [pmt.model_dump() for pmt in payments],
        "summary": {
            "total_invoiced": float(total_invoiced),
            "total_paid": float(total_paid),
            "balance": float(balance),
        }
    }
