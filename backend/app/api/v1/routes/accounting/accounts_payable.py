"""
Accounting - Accounts Payable API Routes
Công nợ phải trả
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
    VendorInvoice, VendorInvoiceLine, VendorInvoiceType, VendorInvoiceStatus,
    PaymentVoucher, PaymentVoucherStatus, PaymentVoucherAllocation,
    DebitNote, APAgingSnapshot
)
from app.core.security import get_current_user

router = APIRouter()


# =====================
# PYDANTIC SCHEMAS
# =====================

class VendorInvoiceLineCreate(BaseModel):
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


class VendorInvoiceCreate(BaseModel):
    vendor_id: str
    vendor_invoice_number: Optional[str] = None  # Số hóa đơn của nhà cung cấp
    invoice_date: datetime
    due_date: datetime
    invoice_type: str = VendorInvoiceType.PURCHASE.value
    currency: str = "VND"
    exchange_rate: Decimal = Decimal("1")
    description: Optional[str] = None
    payment_terms: Optional[str] = None
    notes: Optional[str] = None
    lines: List[VendorInvoiceLineCreate]


class VendorInvoiceUpdate(BaseModel):
    vendor_invoice_number: Optional[str] = None
    due_date: Optional[datetime] = None
    description: Optional[str] = None
    payment_terms: Optional[str] = None
    notes: Optional[str] = None


class PaymentVoucherCreate(BaseModel):
    vendor_id: str
    payment_date: datetime
    amount: Decimal
    payment_method: str = "BANK_TRANSFER"  # CASH, BANK_TRANSFER, CHECK
    bank_account_id: Optional[str] = None
    reference: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    invoice_allocations: Optional[List[dict]] = None  # [{invoice_id, amount}]


class DebitNoteCreate(BaseModel):
    vendor_id: str
    original_invoice_id: Optional[str] = None
    debit_date: datetime
    reason: str
    amount: Decimal
    notes: Optional[str] = None


# =====================
# HELPER FUNCTIONS
# =====================

def generate_vendor_invoice_number(session: Session, tenant_id: str) -> str:
    """Generate internal vendor invoice number"""
    year = datetime.utcnow().year

    count = session.exec(
        select(func.count()).select_from(VendorInvoice).where(
            VendorInvoice.tenant_id == tenant_id,
            VendorInvoice.invoice_number.like(f"VIN{year}%")
        )
    ).one()

    return f"VIN{year}/{str(count + 1).zfill(6)}"


def generate_voucher_number(session: Session, tenant_id: str) -> str:
    """Generate payment voucher number"""
    year = datetime.utcnow().year

    count = session.exec(
        select(func.count()).select_from(PaymentVoucher).where(
            PaymentVoucher.tenant_id == tenant_id,
            PaymentVoucher.voucher_number.like(f"PC{year}%")
        )
    ).one()

    return f"PC{year}/{str(count + 1).zfill(6)}"


# =====================
# VENDOR INVOICES
# =====================

@router.get("/vendor-invoices")
def list_vendor_invoices(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    vendor_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    invoice_type: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    overdue_only: bool = Query(False),
    search: Optional[str] = Query(None),
):
    """List vendor invoices with filters"""
    tenant_id = str(current_user.tenant_id)

    query = select(VendorInvoice).where(VendorInvoice.tenant_id == tenant_id)

    if vendor_id:
        query = query.where(VendorInvoice.vendor_id == vendor_id)

    if status:
        query = query.where(VendorInvoice.status == status)

    if invoice_type:
        query = query.where(VendorInvoice.invoice_type == invoice_type)

    if date_from:
        query = query.where(VendorInvoice.invoice_date >= date_from)

    if date_to:
        query = query.where(VendorInvoice.invoice_date <= date_to)

    if overdue_only:
        query = query.where(
            VendorInvoice.due_date < datetime.utcnow(),
            VendorInvoice.status.in_([VendorInvoiceStatus.APPROVED.value, VendorInvoiceStatus.PARTIAL.value])
        )

    if search:
        search_filter = or_(
            VendorInvoice.invoice_number.ilike(f"%{search}%"),
            VendorInvoice.vendor_invoice_number.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(VendorInvoice.invoice_date.desc())
    query = query.offset(offset).limit(page_size)

    invoices = session.exec(query).all()

    return {
        "items": [inv.model_dump() for inv in invoices],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("/vendor-invoices")
def create_vendor_invoice(
    payload: VendorInvoiceCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new vendor invoice"""
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

    # Generate internal invoice number
    invoice_number = generate_vendor_invoice_number(session, tenant_id)

    # Create invoice
    invoice = VendorInvoice(
        tenant_id=tenant_id,
        vendor_id=payload.vendor_id,
        invoice_number=invoice_number,
        vendor_invoice_number=payload.vendor_invoice_number,
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
        description=payload.description,
        payment_terms=payload.payment_terms,
        status=VendorInvoiceStatus.DRAFT.value,
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

        line = VendorInvoiceLine(
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
        select(VendorInvoiceLine).where(VendorInvoiceLine.invoice_id == invoice.id)
        .order_by(VendorInvoiceLine.line_number)
    ).all()

    return {
        **invoice.model_dump(),
        "lines": [l.model_dump() for l in lines]
    }


@router.get("/vendor-invoices/{invoice_id}")
def get_vendor_invoice(
    invoice_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get vendor invoice with lines and payments"""
    tenant_id = str(current_user.tenant_id)

    invoice = session.get(VendorInvoice, invoice_id)
    if not invoice or str(invoice.tenant_id) != tenant_id:
        raise HTTPException(404, "Invoice not found")

    lines = session.exec(
        select(VendorInvoiceLine).where(VendorInvoiceLine.invoice_id == invoice_id)
        .order_by(VendorInvoiceLine.line_number)
    ).all()

    # Get payment allocations
    allocations = session.exec(
        select(PaymentVoucherAllocation).where(
            PaymentVoucherAllocation.invoice_id == invoice_id
        )
    ).all()

    return {
        **invoice.model_dump(),
        "lines": [l.model_dump() for l in lines],
        "payment_allocations": [a.model_dump() for a in allocations]
    }


@router.put("/vendor-invoices/{invoice_id}")
def update_vendor_invoice(
    invoice_id: str,
    payload: VendorInvoiceUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a draft vendor invoice"""
    tenant_id = str(current_user.tenant_id)

    invoice = session.get(VendorInvoice, invoice_id)
    if not invoice or str(invoice.tenant_id) != tenant_id:
        raise HTTPException(404, "Invoice not found")

    if invoice.status != VendorInvoiceStatus.DRAFT.value:
        raise HTTPException(400, "Can only update draft invoices")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(invoice, key, value)

    invoice.updated_at = datetime.utcnow()

    session.add(invoice)
    session.commit()
    session.refresh(invoice)

    return invoice


@router.post("/vendor-invoices/{invoice_id}/approve")
def approve_vendor_invoice(
    invoice_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Approve a vendor invoice for payment"""
    tenant_id = str(current_user.tenant_id)

    invoice = session.get(VendorInvoice, invoice_id)
    if not invoice or str(invoice.tenant_id) != tenant_id:
        raise HTTPException(404, "Invoice not found")

    if invoice.status != VendorInvoiceStatus.DRAFT.value:
        raise HTTPException(400, f"Cannot approve invoice with status {invoice.status}")

    invoice.status = VendorInvoiceStatus.APPROVED.value
    invoice.approved_at = datetime.utcnow()
    invoice.approved_by = str(current_user.id)
    invoice.updated_at = datetime.utcnow()

    session.add(invoice)
    session.commit()
    session.refresh(invoice)

    return {"success": True, "invoice": invoice.model_dump()}


@router.post("/vendor-invoices/{invoice_id}/cancel")
def cancel_vendor_invoice(
    invoice_id: str,
    reason: str = Query(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Cancel a vendor invoice"""
    tenant_id = str(current_user.tenant_id)

    invoice = session.get(VendorInvoice, invoice_id)
    if not invoice or str(invoice.tenant_id) != tenant_id:
        raise HTTPException(404, "Invoice not found")

    if invoice.status == VendorInvoiceStatus.PAID.value:
        raise HTTPException(400, "Cannot cancel a paid invoice")

    if invoice.paid_amount > 0:
        raise HTTPException(400, "Cannot cancel invoice with payments. Create a debit note instead.")

    invoice.status = VendorInvoiceStatus.CANCELLED.value
    invoice.cancelled_at = datetime.utcnow()
    invoice.cancelled_by = str(current_user.id)
    invoice.cancelled_reason = reason
    invoice.updated_at = datetime.utcnow()

    session.add(invoice)
    session.commit()

    return {"success": True, "message": "Invoice cancelled"}


# =====================
# PAYMENT VOUCHERS
# =====================

@router.get("/payment-vouchers")
def list_payment_vouchers(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    vendor_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
):
    """List payment vouchers"""
    tenant_id = str(current_user.tenant_id)

    query = select(PaymentVoucher).where(PaymentVoucher.tenant_id == tenant_id)

    if vendor_id:
        query = query.where(PaymentVoucher.vendor_id == vendor_id)

    if status:
        query = query.where(PaymentVoucher.status == status)

    if date_from:
        query = query.where(PaymentVoucher.voucher_date >= date_from)

    if date_to:
        query = query.where(PaymentVoucher.voucher_date <= date_to)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(PaymentVoucher.voucher_date.desc())
    query = query.offset(offset).limit(page_size)

    vouchers = session.exec(query).all()

    return {
        "items": [v.model_dump() for v in vouchers],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("/payment-vouchers")
def create_payment_voucher(
    payload: PaymentVoucherCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a payment voucher and optionally allocate to invoices"""
    tenant_id = str(current_user.tenant_id)

    # Generate voucher number
    voucher_number = generate_voucher_number(session, tenant_id)

    voucher = PaymentVoucher(
        tenant_id=tenant_id,
        vendor_id=payload.vendor_id,
        voucher_number=voucher_number,
        voucher_date=payload.payment_date,
        amount=payload.amount,
        allocated_amount=Decimal("0"),
        unallocated_amount=payload.amount,
        payment_method=payload.payment_method,
        bank_account_id=payload.bank_account_id,
        reference=payload.reference,
        description=payload.description,
        status=PaymentVoucherStatus.DRAFT.value,
        notes=payload.notes,
        created_by=str(current_user.id),
    )

    session.add(voucher)
    session.flush()

    # Allocate to invoices if provided
    if payload.invoice_allocations:
        total_allocated = Decimal("0")

        for alloc in payload.invoice_allocations:
            invoice = session.get(VendorInvoice, alloc["invoice_id"])
            if not invoice or str(invoice.tenant_id) != tenant_id:
                raise HTTPException(400, f"Invalid invoice_id: {alloc['invoice_id']}")

            if invoice.vendor_id != payload.vendor_id:
                raise HTTPException(400, "Invoice vendor doesn't match voucher vendor")

            if invoice.status not in [VendorInvoiceStatus.APPROVED.value, VendorInvoiceStatus.PARTIAL.value]:
                raise HTTPException(400, f"Invoice {invoice.invoice_number} is not approved for payment")

            alloc_amount = Decimal(str(alloc["amount"]))
            if alloc_amount > invoice.balance_amount:
                raise HTTPException(400, f"Allocation {alloc_amount} exceeds invoice due {invoice.balance_amount}")

            allocation = PaymentVoucherAllocation(
                tenant_id=tenant_id,
                voucher_id=voucher.id,
                invoice_id=invoice.id,
                allocated_amount=alloc_amount,
            )
            session.add(allocation)
            total_allocated += alloc_amount

        if total_allocated > payload.amount:
            raise HTTPException(400, f"Total allocation {total_allocated} exceeds voucher amount {payload.amount}")

        voucher.allocated_amount = total_allocated
        voucher.unallocated_amount = payload.amount - total_allocated
        session.add(voucher)

    session.commit()
    session.refresh(voucher)

    return voucher


@router.post("/payment-vouchers/{voucher_id}/approve")
def approve_payment_voucher(
    voucher_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Approve a payment voucher"""
    tenant_id = str(current_user.tenant_id)

    voucher = session.get(PaymentVoucher, voucher_id)
    if not voucher or str(voucher.tenant_id) != tenant_id:
        raise HTTPException(404, "Voucher not found")

    if voucher.status != PaymentVoucherStatus.DRAFT.value:
        raise HTTPException(400, f"Cannot approve voucher with status {voucher.status}")

    voucher.status = PaymentVoucherStatus.APPROVED.value
    voucher.approved_at = datetime.utcnow()
    voucher.approved_by = str(current_user.id)
    voucher.updated_at = datetime.utcnow()

    session.add(voucher)
    session.commit()
    session.refresh(voucher)

    return {"success": True, "voucher": voucher.model_dump()}


@router.post("/payment-vouchers/{voucher_id}/pay")
def execute_payment_voucher(
    voucher_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Execute payment and update invoice paid amounts"""
    tenant_id = str(current_user.tenant_id)

    voucher = session.get(PaymentVoucher, voucher_id)
    if not voucher or str(voucher.tenant_id) != tenant_id:
        raise HTTPException(404, "Voucher not found")

    if voucher.status != PaymentVoucherStatus.APPROVED.value:
        raise HTTPException(400, f"Cannot execute voucher with status {voucher.status}")

    # Update invoices with allocations
    allocations = session.exec(
        select(PaymentVoucherAllocation).where(
            PaymentVoucherAllocation.voucher_id == voucher_id
        )
    ).all()

    for alloc in allocations:
        invoice = session.get(VendorInvoice, alloc.invoice_id)
        if invoice:
            invoice.paid_amount += alloc.allocated_amount
            invoice.balance_amount -= alloc.allocated_amount

            if invoice.balance_amount <= 0:
                invoice.status = VendorInvoiceStatus.PAID.value
                invoice.paid_at = datetime.utcnow()
            elif invoice.paid_amount > 0:
                invoice.status = VendorInvoiceStatus.PARTIAL.value

            invoice.updated_at = datetime.utcnow()
            session.add(invoice)

    # Mark voucher as paid
    voucher.status = PaymentVoucherStatus.PAID.value
    voucher.paid_at = datetime.utcnow()
    voucher.paid_by = str(current_user.id)
    voucher.updated_at = datetime.utcnow()

    session.add(voucher)
    session.commit()
    session.refresh(voucher)

    return {"success": True, "voucher": voucher.model_dump()}


# =====================
# DEBIT NOTES
# =====================

@router.get("/debit-notes")
def list_debit_notes(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    vendor_id: Optional[str] = Query(None),
):
    """List debit notes"""
    tenant_id = str(current_user.tenant_id)

    query = select(DebitNote).where(DebitNote.tenant_id == tenant_id)

    if vendor_id:
        query = query.where(DebitNote.vendor_id == vendor_id)

    query = query.order_by(DebitNote.debit_note_date.desc())

    notes = session.exec(query).all()

    return {"items": [n.model_dump() for n in notes]}


@router.post("/debit-notes")
def create_debit_note(
    payload: DebitNoteCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a debit note"""
    tenant_id = str(current_user.tenant_id)

    # Generate number
    year = datetime.utcnow().year
    count = session.exec(
        select(func.count()).select_from(DebitNote).where(
            DebitNote.tenant_id == tenant_id,
            DebitNote.debit_note_number.like(f"DN{year}%")
        )
    ).one()
    debit_note_number = f"DN{year}/{str(count + 1).zfill(6)}"

    debit_note = DebitNote(
        tenant_id=tenant_id,
        vendor_id=payload.vendor_id,
        vendor_name=payload.vendor_name or "",
        debit_note_number=debit_note_number,
        invoice_id=payload.original_invoice_id,
        debit_note_date=payload.debit_date or datetime.utcnow(),
        reason=payload.reason,
        amount=payload.amount,
        total_amount=payload.amount,
        status="DRAFT",
    )

    session.add(debit_note)
    session.commit()
    session.refresh(debit_note)

    return debit_note


# =====================
# AP AGING REPORT
# =====================

@router.get("/ap-aging")
def get_ap_aging(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    as_of_date: Optional[datetime] = Query(None),
):
    """Get AP aging report"""
    tenant_id = str(current_user.tenant_id)
    as_of = as_of_date or datetime.utcnow()

    # Get all outstanding invoices
    invoices = session.exec(
        select(VendorInvoice).where(
            VendorInvoice.tenant_id == tenant_id,
            VendorInvoice.status.in_([VendorInvoiceStatus.APPROVED.value, VendorInvoiceStatus.PARTIAL.value]),
            VendorInvoice.balance_amount > 0
        )
    ).all()

    aging_buckets = {
        "current": Decimal("0"),
        "1_30": Decimal("0"),
        "31_60": Decimal("0"),
        "61_90": Decimal("0"),
        "over_90": Decimal("0"),
    }

    vendor_aging = {}

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

        # Group by vendor
        vendor_id = inv.vendor_id
        if vendor_id not in vendor_aging:
            vendor_aging[vendor_id] = {
                "vendor_id": vendor_id,
                "current": Decimal("0"),
                "1_30": Decimal("0"),
                "31_60": Decimal("0"),
                "61_90": Decimal("0"),
                "over_90": Decimal("0"),
                "total": Decimal("0"),
            }
        vendor_aging[vendor_id][bucket] += inv.balance_amount
        vendor_aging[vendor_id]["total"] += inv.balance_amount

    total = sum(aging_buckets.values())

    return {
        "as_of_date": as_of.isoformat(),
        "summary": aging_buckets,
        "total": total,
        "by_vendor": list(vendor_aging.values())
    }


@router.get("/vendor-statement/{vendor_id}")
def get_vendor_statement(
    vendor_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
):
    """Get vendor statement (invoices and payments)"""
    tenant_id = str(current_user.tenant_id)

    # Get invoices
    inv_query = select(VendorInvoice).where(
        VendorInvoice.tenant_id == tenant_id,
        VendorInvoice.vendor_id == vendor_id,
        VendorInvoice.status != VendorInvoiceStatus.DRAFT.value,
        VendorInvoice.status != VendorInvoiceStatus.CANCELLED.value,
    )

    if date_from:
        inv_query = inv_query.where(VendorInvoice.invoice_date >= date_from)
    if date_to:
        inv_query = inv_query.where(VendorInvoice.invoice_date <= date_to)

    invoices = session.exec(inv_query.order_by(VendorInvoice.invoice_date)).all()

    # Get payments
    pmt_query = select(PaymentVoucher).where(
        PaymentVoucher.tenant_id == tenant_id,
        PaymentVoucher.vendor_id == vendor_id,
        PaymentVoucher.status == PaymentVoucherStatus.PAID.value,
    )

    if date_from:
        pmt_query = pmt_query.where(PaymentVoucher.voucher_date >= date_from)
    if date_to:
        pmt_query = pmt_query.where(PaymentVoucher.voucher_date <= date_to)

    payments = session.exec(pmt_query.order_by(PaymentVoucher.voucher_date)).all()

    # Calculate totals
    total_invoiced = sum(inv.total_amount for inv in invoices)
    total_paid = sum(pmt.amount for pmt in payments)
    balance = total_invoiced - total_paid

    return {
        "vendor_id": vendor_id,
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
