"""
Accounting - Tax Management API Routes
Quản lý thuế (VAT, PIT, CIT)
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

from app.db.session import get_session
from app.models import User
from app.models.accounting import (
    TaxRate, TaxType, VATType, VATRate, VATTransaction, VATDeclaration,
    TaxDeclarationStatus, PITBracket, PITDeduction, PITTransaction,
    CITDeclaration, WithholdingTax
)
from app.core.security import get_current_user

router = APIRouter()


# =====================
# PYDANTIC SCHEMAS
# =====================

class TaxRateCreate(BaseModel):
    code: str
    name: str
    tax_type: str  # VAT, PIT, CIT, WITHHOLDING
    rate: Decimal
    effective_from: datetime
    effective_to: Optional[datetime] = None
    description: Optional[str] = None
    notes: Optional[str] = None


class VATTransactionCreate(BaseModel):
    transaction_date: datetime
    vat_type: str  # INPUT, OUTPUT
    invoice_number: Optional[str] = None
    invoice_date: Optional[datetime] = None
    partner_name: str
    partner_tax_code: Optional[str] = None
    description: str
    net_amount: Decimal
    vat_rate: Decimal
    vat_amount: Decimal
    source_type: Optional[str] = None
    source_id: Optional[str] = None


class VATDeclarationCreate(BaseModel):
    period_month: int
    period_year: int
    declaration_type: str = "MONTHLY"  # MONTHLY, QUARTERLY
    notes: Optional[str] = None


class PITBracketCreate(BaseModel):
    from_amount: Decimal
    to_amount: Optional[Decimal] = None
    rate: Decimal
    effective_from: datetime
    effective_to: Optional[datetime] = None


class PITDeductionCreate(BaseModel):
    employee_id: str
    deduction_type: str  # PERSONAL, DEPENDENT, INSURANCE, CHARITY
    amount: Decimal
    effective_from: datetime
    effective_to: Optional[datetime] = None
    dependent_name: Optional[str] = None
    relationship: Optional[str] = None
    notes: Optional[str] = None


class WithholdingTaxCreate(BaseModel):
    vendor_id: str
    transaction_date: datetime
    invoice_number: Optional[str] = None
    gross_amount: Decimal
    tax_type: str  # SERVICE, RENT, ROYALTY, INTEREST, DIVIDEND
    tax_rate: Decimal
    tax_amount: Decimal
    net_amount: Decimal
    description: Optional[str] = None
    notes: Optional[str] = None


# =====================
# TAX RATES
# =====================

@router.get("/tax-rates")
def list_tax_rates(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    tax_type: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
):
    """List all tax rates"""
    tenant_id = str(current_user.tenant_id)

    query = select(TaxRate).where(TaxRate.tenant_id == tenant_id)

    if tax_type:
        query = query.where(TaxRate.tax_type == tax_type)

    if is_active is not None:
        query = query.where(TaxRate.is_active == is_active)

    query = query.order_by(TaxRate.tax_type, TaxRate.code)

    rates = session.exec(query).all()

    return {"items": [r.model_dump() for r in rates]}


@router.post("/tax-rates")
def create_tax_rate(
    payload: TaxRateCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new tax rate"""
    tenant_id = str(current_user.tenant_id)

    # Check unique code
    existing = session.exec(
        select(TaxRate).where(
            TaxRate.tenant_id == tenant_id,
            TaxRate.code == payload.code
        )
    ).first()
    if existing:
        raise HTTPException(400, f"Tax rate code '{payload.code}' already exists")

    tax_rate = TaxRate(
        tenant_id=tenant_id,
        **payload.model_dump(),
        is_active=True,
        created_by=str(current_user.id),
    )

    session.add(tax_rate)
    session.commit()
    session.refresh(tax_rate)

    return tax_rate


@router.get("/tax-rates/{rate_id}")
def get_tax_rate(
    rate_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get tax rate by ID"""
    tenant_id = str(current_user.tenant_id)

    rate = session.get(TaxRate, rate_id)
    if not rate or str(rate.tenant_id) != tenant_id:
        raise HTTPException(404, "Tax rate not found")

    return rate.model_dump()


@router.put("/tax-rates/{rate_id}")
def update_tax_rate(
    rate_id: str,
    payload: TaxRateCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a tax rate"""
    tenant_id = str(current_user.tenant_id)

    rate = session.get(TaxRate, rate_id)
    if not rate or str(rate.tenant_id) != tenant_id:
        raise HTTPException(404, "Tax rate not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(rate, key, value)

    rate.updated_at = datetime.utcnow()

    session.add(rate)
    session.commit()
    session.refresh(rate)

    return rate


# =====================
# VAT TRANSACTIONS
# =====================

@router.get("/vat-transactions")
def list_vat_transactions(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    vat_type: Optional[str] = Query(None),
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    is_declared: Optional[bool] = Query(None),
):
    """List VAT transactions"""
    tenant_id = str(current_user.tenant_id)

    query = select(VATTransaction).where(VATTransaction.tenant_id == tenant_id)

    if vat_type:
        query = query.where(VATTransaction.vat_type == vat_type)

    if month:
        query = query.where(func.extract('month', VATTransaction.transaction_date) == month)

    if year:
        query = query.where(func.extract('year', VATTransaction.transaction_date) == year)

    if is_declared is not None:
        query = query.where(VATTransaction.is_declared == is_declared)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(VATTransaction.transaction_date.desc())
    query = query.offset(offset).limit(page_size)

    transactions = session.exec(query).all()

    return {
        "items": [t.model_dump() for t in transactions],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("/vat-transactions")
def create_vat_transaction(
    payload: VATTransactionCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a VAT transaction"""
    tenant_id = str(current_user.tenant_id)

    transaction = VATTransaction(
        tenant_id=tenant_id,
        **payload.model_dump(),
        is_declared=False,
        created_by=str(current_user.id),
    )

    session.add(transaction)
    session.commit()
    session.refresh(transaction)

    return transaction


# =====================
# VAT DECLARATIONS
# =====================

@router.get("/vat-declarations")
def list_vat_declarations(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    year: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
):
    """List VAT declarations"""
    tenant_id = str(current_user.tenant_id)

    query = select(VATDeclaration).where(VATDeclaration.tenant_id == tenant_id)

    if year:
        query = query.where(func.extract('year', VATDeclaration.period_from) == year)

    if status:
        query = query.where(VATDeclaration.status == status)

    query = query.order_by(VATDeclaration.period_from.desc())

    declarations = session.exec(query).all()

    return {"items": [d.model_dump() for d in declarations]}


@router.post("/vat-declarations")
def create_vat_declaration(
    payload: VATDeclarationCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a VAT declaration for a period"""
    tenant_id = str(current_user.tenant_id)

    # Calculate period dates
    from calendar import monthrange
    period_str = f"{payload.period_year}-{payload.period_month:02d}"
    period_from = datetime(payload.period_year, payload.period_month, 1)
    last_day = monthrange(payload.period_year, payload.period_month)[1]
    period_to = datetime(payload.period_year, payload.period_month, last_day)

    # Check if declaration already exists
    existing = session.exec(
        select(VATDeclaration).where(
            VATDeclaration.tenant_id == tenant_id,
            VATDeclaration.period == period_str,
        )
    ).first()
    if existing:
        raise HTTPException(400, f"Declaration for {payload.period_month}/{payload.period_year} already exists")

    # Calculate VAT amounts from transactions
    input_vat = session.exec(
        select(func.sum(VATTransaction.tax_amount)).where(
            VATTransaction.tenant_id == tenant_id,
            VATTransaction.vat_type == VATType.INPUT.value,
            func.extract('month', VATTransaction.transaction_date) == payload.period_month,
            func.extract('year', VATTransaction.transaction_date) == payload.period_year,
            VATTransaction.declaration_id == None,
        )
    ).one() or Decimal("0")

    output_vat = session.exec(
        select(func.sum(VATTransaction.tax_amount)).where(
            VATTransaction.tenant_id == tenant_id,
            VATTransaction.vat_type == VATType.OUTPUT.value,
            func.extract('month', VATTransaction.transaction_date) == payload.period_month,
            func.extract('year', VATTransaction.transaction_date) == payload.period_year,
            VATTransaction.declaration_id == None,
        )
    ).one() or Decimal("0")

    net_vat = output_vat - input_vat

    # Generate declaration number
    count = session.exec(
        select(func.count(VATDeclaration.id)).where(
            VATDeclaration.tenant_id == tenant_id
        )
    ).one() or 0
    declaration_number = f"VAT-{payload.period_year}-{count + 1:04d}"

    declaration = VATDeclaration(
        tenant_id=tenant_id,
        declaration_number=declaration_number,
        declaration_type=payload.declaration_type,
        period=period_str,
        period_from=period_from,
        period_to=period_to,
        input_tax_amount=input_vat,
        output_tax_amount=output_vat,
        tax_payable=max(net_vat, Decimal("0")),
        tax_refundable=abs(min(net_vat, Decimal("0"))),
        status=TaxDeclarationStatus.DRAFT.value,
        notes=payload.notes,
        created_by=str(current_user.id),
    )

    session.add(declaration)
    session.commit()
    session.refresh(declaration)

    return declaration


@router.post("/vat-declarations/{declaration_id}/submit")
def submit_vat_declaration(
    declaration_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Submit a VAT declaration"""
    tenant_id = str(current_user.tenant_id)

    declaration = session.get(VATDeclaration, declaration_id)
    if not declaration or str(declaration.tenant_id) != tenant_id:
        raise HTTPException(404, "Declaration not found")

    if declaration.status != TaxDeclarationStatus.DRAFT.value:
        raise HTTPException(400, f"Cannot submit declaration with status {declaration.status}")

    # Update transactions - link to this declaration
    transactions = session.exec(
        select(VATTransaction).where(
            VATTransaction.tenant_id == tenant_id,
            VATTransaction.transaction_date >= declaration.period_from,
            VATTransaction.transaction_date <= declaration.period_to,
            VATTransaction.declaration_id == None,
        )
    ).all()

    for txn in transactions:
        txn.declaration_id = declaration_id
        txn.declaration_period = declaration.period
        txn.updated_at = datetime.utcnow()
        session.add(txn)

    declaration.status = TaxDeclarationStatus.SUBMITTED.value
    declaration.submitted_at = datetime.utcnow()
    declaration.updated_at = datetime.utcnow()

    session.add(declaration)
    session.commit()
    session.refresh(declaration)

    return {"success": True, "declaration": declaration.model_dump()}


# =====================
# PIT (Personal Income Tax)
# =====================

@router.get("/pit-brackets")
def list_pit_brackets(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List PIT brackets (progressive tax rates)"""
    tenant_id = str(current_user.tenant_id)

    query = select(PITBracket).where(
        PITBracket.tenant_id == tenant_id,
        PITBracket.is_active == True
    ).order_by(PITBracket.from_amount)

    brackets = session.exec(query).all()

    return {"items": [b.model_dump() for b in brackets]}


@router.post("/pit-brackets")
def create_pit_bracket(
    payload: PITBracketCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a PIT bracket"""
    tenant_id = str(current_user.tenant_id)

    bracket = PITBracket(
        tenant_id=tenant_id,
        **payload.model_dump(),
        is_active=True,
        created_by=str(current_user.id),
    )

    session.add(bracket)
    session.commit()
    session.refresh(bracket)

    return bracket


@router.get("/pit-deductions")
def list_pit_deductions(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    employee_id: Optional[str] = Query(None),
    deduction_type: Optional[str] = Query(None),
):
    """List PIT deductions"""
    tenant_id = str(current_user.tenant_id)

    query = select(PITDeduction).where(PITDeduction.tenant_id == tenant_id)

    if employee_id:
        query = query.where(PITDeduction.employee_id == employee_id)

    if deduction_type:
        query = query.where(PITDeduction.deduction_type == deduction_type)

    query = query.order_by(PITDeduction.employee_id)

    deductions = session.exec(query).all()

    return {"items": [d.model_dump() for d in deductions]}


@router.post("/pit-deductions")
def create_pit_deduction(
    payload: PITDeductionCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a PIT deduction"""
    tenant_id = str(current_user.tenant_id)

    deduction = PITDeduction(
        tenant_id=tenant_id,
        **payload.model_dump(),
        is_active=True,
        created_by=str(current_user.id),
    )

    session.add(deduction)
    session.commit()
    session.refresh(deduction)

    return deduction


@router.get("/pit-calculate/{employee_id}")
def calculate_pit(
    employee_id: str,
    gross_income: Decimal = Query(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Calculate PIT for an employee"""
    tenant_id = str(current_user.tenant_id)

    # Get deductions
    deductions = session.exec(
        select(PITDeduction).where(
            PITDeduction.tenant_id == tenant_id,
            PITDeduction.employee_id == employee_id,
            PITDeduction.is_active == True,
        )
    ).all()

    total_deductions = sum(d.amount for d in deductions)

    # Taxable income
    taxable_income = max(gross_income - total_deductions, Decimal("0"))

    # Get brackets
    brackets = session.exec(
        select(PITBracket).where(
            PITBracket.tenant_id == tenant_id,
            PITBracket.is_active == True
        ).order_by(PITBracket.from_amount)
    ).all()

    # Calculate progressive tax
    total_tax = Decimal("0")
    remaining_income = taxable_income

    for bracket in brackets:
        if remaining_income <= 0:
            break

        bracket_range = (bracket.to_amount or Decimal("999999999999")) - bracket.from_amount
        taxable_in_bracket = min(remaining_income, bracket_range)
        tax_in_bracket = taxable_in_bracket * (bracket.rate / 100)

        total_tax += tax_in_bracket
        remaining_income -= taxable_in_bracket

    return {
        "employee_id": employee_id,
        "gross_income": float(gross_income),
        "deductions": {
            "total": float(total_deductions),
            "items": [{"type": d.deduction_type, "amount": float(d.amount)} for d in deductions]
        },
        "taxable_income": float(taxable_income),
        "pit_amount": float(total_tax),
        "net_income": float(gross_income - total_tax),
    }


# =====================
# CIT (Corporate Income Tax)
# =====================

@router.get("/cit-declarations")
def list_cit_declarations(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    year: Optional[int] = Query(None),
):
    """List CIT declarations"""
    tenant_id = str(current_user.tenant_id)

    query = select(CITDeclaration).where(CITDeclaration.tenant_id == tenant_id)

    if year:
        # Filter by period which contains the year
        query = query.where(CITDeclaration.period.like(f"{year}%"))

    query = query.order_by(CITDeclaration.period.desc())

    declarations = session.exec(query).all()

    return {"items": [d.model_dump() for d in declarations]}


@router.post("/cit-declarations")
def create_cit_declaration(
    fiscal_year: int,
    gross_revenue: Decimal,
    total_expenses: Decimal,
    non_deductible_expenses: Decimal = Decimal("0"),
    tax_incentives: Decimal = Decimal("0"),
    cit_rate: Decimal = Decimal("20"),  # Default 20% in Vietnam
    notes: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a CIT declaration"""
    tenant_id = str(current_user.tenant_id)

    period_str = str(fiscal_year)

    # Check if already exists
    existing = session.exec(
        select(CITDeclaration).where(
            CITDeclaration.tenant_id == tenant_id,
            CITDeclaration.period == period_str,
        )
    ).first()
    if existing:
        raise HTTPException(400, f"CIT declaration for {fiscal_year} already exists")

    # Get fiscal year record
    from app.models.accounting import FiscalYear
    fiscal_year_record = session.exec(
        select(FiscalYear).where(
            FiscalYear.tenant_id == tenant_id,
            FiscalYear.year == fiscal_year,
        )
    ).first()
    if not fiscal_year_record:
        raise HTTPException(400, f"Fiscal year {fiscal_year} not found")

    # Calculate
    accounting_profit_val = gross_revenue - total_expenses
    taxable_income_val = accounting_profit_val + non_deductible_expenses
    taxable_income_after_incentives = max(taxable_income_val - tax_incentives, Decimal("0"))
    cit_amount = taxable_income_after_incentives * (cit_rate / 100)

    # Generate declaration number
    count = session.exec(
        select(func.count(CITDeclaration.id)).where(
            CITDeclaration.tenant_id == tenant_id
        )
    ).one() or 0
    declaration_number = f"CIT-{fiscal_year}-{count + 1:04d}"

    declaration = CITDeclaration(
        tenant_id=tenant_id,
        declaration_number=declaration_number,
        declaration_type="ANNUAL",
        fiscal_year_id=fiscal_year_record.id,
        period=period_str,
        total_revenue=gross_revenue,
        deductible_expenses=total_expenses - non_deductible_expenses,
        non_deductible_expenses=non_deductible_expenses,
        accounting_profit=accounting_profit_val,
        taxable_income=taxable_income_val,
        tax_rate=cit_rate,
        tax_amount=cit_amount,
        tax_incentive=tax_incentives,
        tax_payable=cit_amount,
        status=TaxDeclarationStatus.DRAFT.value,
        notes=notes,
        created_by=str(current_user.id),
    )

    session.add(declaration)
    session.commit()
    session.refresh(declaration)

    return declaration


# =====================
# WITHHOLDING TAX
# =====================

@router.get("/withholding-taxes")
def list_withholding_taxes(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    vendor_id: Optional[str] = Query(None),
    tax_type: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
):
    """List withholding taxes"""
    tenant_id = str(current_user.tenant_id)

    query = select(WithholdingTax).where(WithholdingTax.tenant_id == tenant_id)

    if vendor_id:
        query = query.where(WithholdingTax.vendor_id == vendor_id)

    if tax_type:
        query = query.where(WithholdingTax.tax_type == tax_type)

    if date_from:
        query = query.where(WithholdingTax.transaction_date >= date_from)

    if date_to:
        query = query.where(WithholdingTax.transaction_date <= date_to)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(WithholdingTax.transaction_date.desc())
    query = query.offset(offset).limit(page_size)

    taxes = session.exec(query).all()

    return {
        "items": [t.model_dump() for t in taxes],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("/withholding-taxes")
def create_withholding_tax(
    payload: WithholdingTaxCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a withholding tax record"""
    tenant_id = str(current_user.tenant_id)

    withholding = WithholdingTax(
        tenant_id=tenant_id,
        **payload.model_dump(),
        is_remitted=False,
        created_by=str(current_user.id),
    )

    session.add(withholding)
    session.commit()
    session.refresh(withholding)

    return withholding


@router.get("/tax-summary")
def get_tax_summary(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    year: int = Query(...),
):
    """Get tax summary for a year"""
    tenant_id = str(current_user.tenant_id)

    # VAT Summary
    input_vat = session.exec(
        select(func.sum(VATTransaction.tax_amount)).where(
            VATTransaction.tenant_id == tenant_id,
            VATTransaction.vat_type == VATType.INPUT.value,
            func.extract('year', VATTransaction.transaction_date) == year,
        )
    ).one() or Decimal("0")

    output_vat = session.exec(
        select(func.sum(VATTransaction.tax_amount)).where(
            VATTransaction.tenant_id == tenant_id,
            VATTransaction.vat_type == VATType.OUTPUT.value,
            func.extract('year', VATTransaction.transaction_date) == year,
        )
    ).one() or Decimal("0")

    # Withholding tax summary
    total_withholding = session.exec(
        select(func.sum(WithholdingTax.total_withholding)).where(
            WithholdingTax.tenant_id == tenant_id,
            func.extract('year', WithholdingTax.transaction_date) == year,
        )
    ).one() or Decimal("0")

    # CIT
    cit_declaration = session.exec(
        select(CITDeclaration).where(
            CITDeclaration.tenant_id == tenant_id,
            CITDeclaration.period == str(year),
        )
    ).first()

    return {
        "year": year,
        "vat": {
            "input_vat": float(input_vat),
            "output_vat": float(output_vat),
            "net_vat": float(output_vat - input_vat),
        },
        "withholding_tax": float(total_withholding),
        "cit": cit_declaration.model_dump() if cit_declaration else None,
    }
