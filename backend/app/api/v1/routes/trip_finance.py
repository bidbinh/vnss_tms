from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from sqlalchemy import func

from app.db.session import get_session
from app.models import Trip, TripFinanceItem
from app.schemas.trip_finance import (
    TripFinanceItemCreate, TripFinanceItemRead, TripFinanceSummary
)

router = APIRouter(prefix="/trips", tags=["trip_finance"])

def tenant() -> str:
    return "TENANT_DEMO"

@router.post("/{trip_id}/finance", response_model=TripFinanceItemRead)
def add_finance_item(
    trip_id: str,
    payload: TripFinanceItemCreate,
    session: Session = Depends(get_session),
):
    trip = session.get(Trip, trip_id)
    if not trip or trip.tenant_id != tenant():
        raise HTTPException(404, "Trip not found")

    item = TripFinanceItem(
        tenant_id=tenant(),
        trip_id=trip_id,
        direction=payload.direction.upper(),
        category=payload.category.upper(),
        amount=float(payload.amount),
        currency=payload.currency.upper(),
        is_cod=bool(payload.is_cod),
        payer=payload.payer,
        note=payload.note,
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    return item

@router.get("/{trip_id}/finance", response_model=list[TripFinanceItemRead])
def list_finance_items(trip_id: str, session: Session = Depends(get_session)):
    trip = session.get(Trip, trip_id)
    if not trip or trip.tenant_id != tenant():
        raise HTTPException(404, "Trip not found")

    return session.exec(
        select(TripFinanceItem)
        .where(TripFinanceItem.tenant_id == tenant(), TripFinanceItem.trip_id == trip_id)
        .order_by(TripFinanceItem.created_at.desc())
    ).all()

@router.delete("/finance/{item_id}")
def delete_finance_item(item_id: str, session: Session = Depends(get_session)):
    item = session.get(TripFinanceItem, item_id)
    if not item or item.tenant_id != tenant():
        raise HTTPException(404, "Item not found")
    session.delete(item)
    session.commit()
    return {"ok": True}

@router.get("/{trip_id}/finance/summary", response_model=TripFinanceSummary)
def finance_summary(trip_id: str, session: Session = Depends(get_session)):
    trip = session.get(Trip, trip_id)
    if not trip or trip.tenant_id != tenant():
        raise HTTPException(404, "Trip not found")

    # assume 1 currency per trip in MVP (default VND)
    currency = session.exec(
        select(TripFinanceItem.currency)
        .where(TripFinanceItem.tenant_id == tenant(), TripFinanceItem.trip_id == trip_id)
        .limit(1)
    ).first() or "VND"

    income_total = session.exec(
        select(func.coalesce(func.sum(TripFinanceItem.amount), 0.0))
        .where(
            TripFinanceItem.tenant_id == tenant(),
            TripFinanceItem.trip_id == trip_id,
            TripFinanceItem.direction == "INCOME",
            TripFinanceItem.currency == currency,
        )
    ).one()

    expense_total = session.exec(
        select(func.coalesce(func.sum(TripFinanceItem.amount), 0.0))
        .where(
            TripFinanceItem.tenant_id == tenant(),
            TripFinanceItem.trip_id == trip_id,
            TripFinanceItem.direction == "EXPENSE",
            TripFinanceItem.currency == currency,
        )
    ).one()

    cod_total = session.exec(
        select(func.coalesce(func.sum(TripFinanceItem.amount), 0.0))
        .where(
            TripFinanceItem.tenant_id == tenant(),
            TripFinanceItem.trip_id == trip_id,
            TripFinanceItem.direction == "INCOME",
            TripFinanceItem.is_cod == True,   # noqa
            TripFinanceItem.currency == currency,
        )
    ).one()

    return TripFinanceSummary(
        trip_id=trip_id,
        income_total=float(income_total),
        expense_total=float(expense_total),
        profit=float(income_total) - float(expense_total),
        cod_total=float(cod_total),
        currency=currency,
    )
