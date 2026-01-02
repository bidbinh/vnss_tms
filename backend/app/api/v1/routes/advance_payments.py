from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Optional
from datetime import date
from app.db.session import get_session
from app.models import AdvancePayment, Driver, User
from app.schemas.advance_payment import (
    AdvancePaymentCreate,
    AdvancePaymentUpdate,
    AdvancePaymentRead,
    AdvancePaymentWithDriver
)
from app.core.security import get_current_user

router = APIRouter(prefix="/advance-payments", tags=["advance-payments"])


@router.get("/", response_model=List[AdvancePaymentWithDriver])
def list_advance_payments(
    driver_id: Optional[str] = None,
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = None,
    is_deducted: Optional[bool] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all advance payments with optional filters"""
    tenant_id = str(current_user.tenant_id)

    query = select(AdvancePayment).where(AdvancePayment.tenant_id == tenant_id)

    if driver_id:
        query = query.where(AdvancePayment.driver_id == driver_id)

    if month and year:
        query = query.where(
            AdvancePayment.payment_date >= date(year, month, 1),
            AdvancePayment.payment_date < date(year, month + 1 if month < 12 else year + 1, 1 if month < 12 else 1)
        )
    elif year:
        query = query.where(
            AdvancePayment.payment_date >= date(year, 1, 1),
            AdvancePayment.payment_date < date(year + 1, 1, 1)
        )

    if is_deducted is not None:
        query = query.where(AdvancePayment.is_deducted == is_deducted)

    payments = session.exec(query.order_by(AdvancePayment.payment_date.desc())).all()

    # Get driver names
    driver_ids = {p.driver_id for p in payments}
    drivers = session.exec(select(Driver).where(Driver.id.in_(driver_ids))).all()
    driver_map = {d.id: d.name for d in drivers}

    # Build response with driver names
    result = []
    for payment in payments:
        payment_dict = payment.model_dump()
        payment_dict["driver_name"] = driver_map.get(payment.driver_id)
        result.append(AdvancePaymentWithDriver(**payment_dict))

    return result


@router.post("/", response_model=AdvancePaymentRead)
def create_advance_payment(
    payment: AdvancePaymentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new advance payment"""
    tenant_id = str(current_user.tenant_id)

    # Verify driver exists
    driver = session.get(Driver, payment.driver_id)
    if not driver or driver.tenant_id != tenant_id:
        raise HTTPException(404, "Driver not found")

    db_payment = AdvancePayment(
        **payment.model_dump(),
        tenant_id=tenant_id,
        approved_by=current_user.id,
    )

    session.add(db_payment)
    session.commit()
    session.refresh(db_payment)

    return db_payment


@router.get("/{payment_id}", response_model=AdvancePaymentRead)
def get_advance_payment(
    payment_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get a single advance payment"""
    tenant_id = str(current_user.tenant_id)

    payment = session.get(AdvancePayment, payment_id)
    if not payment or payment.tenant_id != tenant_id:
        raise HTTPException(404, "Advance payment not found")

    return payment


@router.patch("/{payment_id}", response_model=AdvancePaymentRead)
def update_advance_payment(
    payment_id: str,
    payment_update: AdvancePaymentUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update an advance payment"""
    tenant_id = str(current_user.tenant_id)

    payment = session.get(AdvancePayment, payment_id)
    if not payment or payment.tenant_id != tenant_id:
        raise HTTPException(404, "Advance payment not found")

    for key, value in payment_update.model_dump(exclude_unset=True).items():
        setattr(payment, key, value)

    session.add(payment)
    session.commit()
    session.refresh(payment)

    return payment


@router.delete("/{payment_id}")
def delete_advance_payment(
    payment_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete an advance payment"""
    tenant_id = str(current_user.tenant_id)

    payment = session.get(AdvancePayment, payment_id)
    if not payment or payment.tenant_id != tenant_id:
        raise HTTPException(404, "Advance payment not found")

    # Don't allow deletion if already deducted
    if payment.is_deducted:
        raise HTTPException(400, "Cannot delete advance payment that has already been deducted from salary")

    session.delete(payment)
    session.commit()

    return {"message": "Advance payment deleted successfully"}
