"""
FMS Rates API Routes
Quản lý bảng giá cước
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from typing import Optional, List
from datetime import datetime, date
from pydantic import BaseModel

from app.db.session import get_session
from app.models.fms import FreightRate, RateType, RateCharge
from app.models import User
from app.core.security import get_current_user

router = APIRouter(prefix="/rates", tags=["FMS Rates"])


class RateCreate(BaseModel):
    rate_code: str
    rate_name: Optional[str] = None
    rate_type: str = RateType.SEA_FCL.value
    effective_date: date
    expiry_date: Optional[date] = None

    carrier_name: Optional[str] = None
    agent_id: Optional[str] = None
    agent_name: Optional[str] = None

    origin_port: Optional[str] = None
    origin_port_name: Optional[str] = None
    destination_port: Optional[str] = None
    destination_port_name: Optional[str] = None

    transit_time_min: Optional[int] = None
    transit_time_max: Optional[int] = None

    currency_code: str = "USD"

    # FCL rates
    rate_20gp: Optional[float] = None
    rate_40gp: Optional[float] = None
    rate_40hc: Optional[float] = None

    # LCL rates
    rate_per_cbm: Optional[float] = None
    rate_per_ton: Optional[float] = None
    min_charge: Optional[float] = None

    # Air rates
    rate_min: Optional[float] = None
    rate_normal: Optional[float] = None
    rate_45kg: Optional[float] = None
    rate_100kg: Optional[float] = None
    rate_300kg: Optional[float] = None
    rate_500kg: Optional[float] = None

    remarks: Optional[str] = None


class RateResponse(BaseModel):
    id: str
    rate_code: str
    rate_name: Optional[str]
    rate_type: str
    is_active: bool

    carrier_name: Optional[str]
    agent_name: Optional[str]

    origin_port: Optional[str]
    origin_port_name: Optional[str]
    destination_port: Optional[str]
    destination_port_name: Optional[str]

    transit_time_min: Optional[int]
    transit_time_max: Optional[int]

    currency_code: str

    rate_20gp: Optional[float]
    rate_40gp: Optional[float]
    rate_40hc: Optional[float]

    rate_per_cbm: Optional[float]
    rate_per_ton: Optional[float]
    min_charge: Optional[float]

    effective_date: date
    expiry_date: Optional[date]

    created_at: datetime


class RateListResponse(BaseModel):
    items: List[RateResponse]
    total: int
    page: int
    page_size: int


@router.get("", response_model=RateListResponse)
def list_rates(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    rate_type: Optional[str] = None,
    origin_port: Optional[str] = None,
    destination_port: Optional[str] = None,
    carrier_name: Optional[str] = None,
    is_active: Optional[bool] = True,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List freight rates"""
    tenant_id = str(current_user.tenant_id)

    query = select(FreightRate).where(FreightRate.tenant_id == tenant_id)

    if rate_type:
        query = query.where(FreightRate.rate_type == rate_type)
    if origin_port:
        query = query.where(FreightRate.origin_port == origin_port)
    if destination_port:
        query = query.where(FreightRate.destination_port == destination_port)
    if carrier_name:
        query = query.where(FreightRate.carrier_name.ilike(f"%{carrier_name}%"))
    if is_active is not None:
        query = query.where(FreightRate.is_active == is_active)

    total = session.exec(select(func.count()).select_from(query.subquery())).one()

    query = query.order_by(FreightRate.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    rates = session.exec(query).all()

    return RateListResponse(
        items=[RateResponse(
            id=r.id,
            rate_code=r.rate_code,
            rate_name=r.rate_name,
            rate_type=r.rate_type,
            is_active=r.is_active,
            carrier_name=r.carrier_name,
            agent_name=r.agent_name,
            origin_port=r.origin_port,
            origin_port_name=r.origin_port_name,
            destination_port=r.destination_port,
            destination_port_name=r.destination_port_name,
            transit_time_min=r.transit_time_min,
            transit_time_max=r.transit_time_max,
            currency_code=r.currency_code,
            rate_20gp=r.rate_20gp,
            rate_40gp=r.rate_40gp,
            rate_40hc=r.rate_40hc,
            rate_per_cbm=r.rate_per_cbm,
            rate_per_ton=r.rate_per_ton,
            min_charge=r.min_charge,
            effective_date=r.effective_date,
            expiry_date=r.expiry_date,
            created_at=r.created_at,
        ) for r in rates],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=RateResponse)
def create_rate(
    payload: RateCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new rate"""
    tenant_id = str(current_user.tenant_id)

    rate = FreightRate(
        tenant_id=tenant_id,
        created_by=str(current_user.id),
        **payload.model_dump()
    )

    session.add(rate)
    session.commit()
    session.refresh(rate)

    return RateResponse(
        id=rate.id,
        rate_code=rate.rate_code,
        rate_name=rate.rate_name,
        rate_type=rate.rate_type,
        is_active=rate.is_active,
        carrier_name=rate.carrier_name,
        agent_name=rate.agent_name,
        origin_port=rate.origin_port,
        origin_port_name=rate.origin_port_name,
        destination_port=rate.destination_port,
        destination_port_name=rate.destination_port_name,
        transit_time_min=rate.transit_time_min,
        transit_time_max=rate.transit_time_max,
        currency_code=rate.currency_code,
        rate_20gp=rate.rate_20gp,
        rate_40gp=rate.rate_40gp,
        rate_40hc=rate.rate_40hc,
        rate_per_cbm=rate.rate_per_cbm,
        rate_per_ton=rate.rate_per_ton,
        min_charge=rate.min_charge,
        effective_date=rate.effective_date,
        expiry_date=rate.expiry_date,
        created_at=rate.created_at,
    )


@router.get("/search")
def search_rates(
    origin: str,
    destination: str,
    rate_type: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Search for rates by route"""
    tenant_id = str(current_user.tenant_id)
    today = date.today()

    query = select(FreightRate).where(
        FreightRate.tenant_id == tenant_id,
        FreightRate.is_active == True,
        FreightRate.origin_port == origin,
        FreightRate.destination_port == destination,
        FreightRate.effective_date <= today,
    )

    # Filter by expiry
    query = query.where(
        (FreightRate.expiry_date == None) | (FreightRate.expiry_date >= today)
    )

    if rate_type:
        query = query.where(FreightRate.rate_type == rate_type)

    rates = session.exec(query.order_by(FreightRate.rate_20gp)).all()

    return [RateResponse(
        id=r.id,
        rate_code=r.rate_code,
        rate_name=r.rate_name,
        rate_type=r.rate_type,
        is_active=r.is_active,
        carrier_name=r.carrier_name,
        agent_name=r.agent_name,
        origin_port=r.origin_port,
        origin_port_name=r.origin_port_name,
        destination_port=r.destination_port,
        destination_port_name=r.destination_port_name,
        transit_time_min=r.transit_time_min,
        transit_time_max=r.transit_time_max,
        currency_code=r.currency_code,
        rate_20gp=r.rate_20gp,
        rate_40gp=r.rate_40gp,
        rate_40hc=r.rate_40hc,
        rate_per_cbm=r.rate_per_cbm,
        rate_per_ton=r.rate_per_ton,
        min_charge=r.min_charge,
        effective_date=r.effective_date,
        expiry_date=r.expiry_date,
        created_at=r.created_at,
    ) for r in rates]


@router.get("/types/list")
def get_rate_types():
    """Get list of rate types"""
    return [{"value": t.value, "label": t.value.replace("_", " ").title()} for t in RateType]
