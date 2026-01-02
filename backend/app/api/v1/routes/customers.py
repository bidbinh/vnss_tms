from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db.session import get_session
from app.models.customer import Customer

router = APIRouter(prefix="/customers", tags=["customers"])

@router.get("")
def list_customers(
    session: Session = Depends(get_session),
):
    stmt = select(Customer).order_by(Customer.updated_at.desc())
    return session.exec(stmt).all()

@router.post("")
def create_customer(
    payload: Customer,
    session: Session = Depends(get_session),
):
    if not payload.tenant_id:
        payload.tenant_id = "TENANT_DEMO"
    session.add(payload)
    session.commit()
    session.refresh(payload)
    return payload

@router.put("/{customer_id}")
def update_customer(
    customer_id: str,
    payload: Customer,
    session: Session = Depends(get_session),
):
    db_obj = session.get(Customer, customer_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Not Found")

    db_obj.code = payload.code
    db_obj.name = payload.name
    db_obj.tax_code = payload.tax_code
    db_obj.contacts_json = payload.contacts_json

    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj
