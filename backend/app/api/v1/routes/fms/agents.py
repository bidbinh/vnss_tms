"""
FMS Agents API Routes
Quản lý đại lý/đối tác giao nhận
Synced with current DB schema
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func, or_
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

from app.db.session import get_session
from app.models.fms import ForwardingAgent, AgentType
from app.models import User
from app.core.security import get_current_user

router = APIRouter(prefix="/agents", tags=["FMS Agents"])


class AgentCreate(BaseModel):
    agent_code: str
    agent_name: str
    agent_type: str = AgentType.OVERSEAS_AGENT.value

    country: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None

    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    fax: Optional[str] = None

    contact_person: Optional[str] = None

    iata_code: Optional[str] = None

    # Services (comma-separated: SEA,AIR,TRUCKING,CUSTOMS,WAREHOUSE)
    services: Optional[str] = None

    payment_terms: Optional[str] = None
    credit_limit: float = 0

    tax_code: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    swift_code: Optional[str] = None

    remarks: Optional[str] = None


class AgentResponse(BaseModel):
    id: str
    agent_code: str
    agent_name: str
    agent_type: str
    is_active: bool

    country: Optional[str]
    city: Optional[str]
    address: Optional[str]

    phone: Optional[str]
    email: Optional[str]

    contact_person: Optional[str]

    # Parse services string into booleans for frontend compatibility
    services_sea: bool = False
    services_air: bool = False
    services_trucking: bool = False
    services_customs: bool = False

    services: Optional[str]

    payment_terms: Optional[str]
    credit_limit: float

    created_at: datetime


def parse_services(services_str: Optional[str]) -> dict:
    """Parse comma-separated services string to boolean dict"""
    if not services_str:
        return {"sea": False, "air": False, "trucking": False, "customs": False}

    services_upper = services_str.upper()
    return {
        "sea": "SEA" in services_upper,
        "air": "AIR" in services_upper,
        "trucking": "TRUCKING" in services_upper,
        "customs": "CUSTOMS" in services_upper,
    }


def agent_to_response(agent: ForwardingAgent) -> AgentResponse:
    """Convert agent model to response"""
    svc = parse_services(agent.services)
    return AgentResponse(
        id=agent.id,
        agent_code=agent.agent_code,
        agent_name=agent.agent_name,
        agent_type=agent.agent_type,
        is_active=agent.is_active,
        country=agent.country,
        city=agent.city,
        address=agent.address,
        phone=agent.phone,
        email=agent.email,
        contact_person=agent.contact_person,
        services=agent.services,
        services_sea=svc["sea"],
        services_air=svc["air"],
        services_trucking=svc["trucking"],
        services_customs=svc["customs"],
        payment_terms=agent.payment_terms,
        credit_limit=agent.credit_limit or 0,
        created_at=agent.created_at,
    )


class AgentListResponse(BaseModel):
    items: List[AgentResponse]
    total: int
    page: int
    page_size: int


@router.get("", response_model=AgentListResponse)
def list_agents(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    agent_type: Optional[str] = None,
    country: Optional[str] = None,
    search: Optional[str] = None,
    is_active: Optional[bool] = True,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List agents"""
    tenant_id = str(current_user.tenant_id)

    query = select(ForwardingAgent).where(
        ForwardingAgent.tenant_id == tenant_id,
        ForwardingAgent.is_deleted == False
    )

    if agent_type:
        query = query.where(ForwardingAgent.agent_type == agent_type)
    if country:
        query = query.where(ForwardingAgent.country == country)
    if is_active is not None:
        query = query.where(ForwardingAgent.is_active == is_active)
    if search:
        query = query.where(
            or_(
                ForwardingAgent.agent_code.ilike(f"%{search}%"),
                ForwardingAgent.agent_name.ilike(f"%{search}%"),
                ForwardingAgent.city.ilike(f"%{search}%"),
            )
        )

    total = session.exec(select(func.count()).select_from(query.subquery())).one()

    query = query.order_by(ForwardingAgent.agent_name)
    query = query.offset((page - 1) * page_size).limit(page_size)

    agents = session.exec(query).all()

    return AgentListResponse(
        items=[agent_to_response(a) for a in agents],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=AgentResponse)
def create_agent(
    payload: AgentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new agent"""
    tenant_id = str(current_user.tenant_id)

    # Check duplicate code
    existing = session.exec(
        select(ForwardingAgent).where(
            ForwardingAgent.tenant_id == tenant_id,
            ForwardingAgent.agent_code == payload.agent_code,
            ForwardingAgent.is_deleted == False
        )
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Agent code already exists")

    agent = ForwardingAgent(
        tenant_id=tenant_id,
        created_by=str(current_user.id),
        **payload.model_dump()
    )

    session.add(agent)
    session.commit()
    session.refresh(agent)

    return agent_to_response(agent)


@router.get("/{agent_id}", response_model=AgentResponse)
def get_agent(
    agent_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get agent by ID"""
    tenant_id = str(current_user.tenant_id)

    agent = session.exec(
        select(ForwardingAgent).where(
            ForwardingAgent.id == agent_id,
            ForwardingAgent.tenant_id == tenant_id,
            ForwardingAgent.is_deleted == False
        )
    ).first()

    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    return agent_to_response(agent)


@router.put("/{agent_id}", response_model=AgentResponse)
def update_agent(
    agent_id: str,
    payload: AgentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update agent"""
    tenant_id = str(current_user.tenant_id)

    agent = session.exec(
        select(ForwardingAgent).where(
            ForwardingAgent.id == agent_id,
            ForwardingAgent.tenant_id == tenant_id,
            ForwardingAgent.is_deleted == False
        )
    ).first()

    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(agent, key, value)

    agent.updated_at = datetime.utcnow()
    agent.updated_by = str(current_user.id)

    session.add(agent)
    session.commit()
    session.refresh(agent)

    return agent_to_response(agent)


@router.delete("/{agent_id}")
def delete_agent(
    agent_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete agent"""
    tenant_id = str(current_user.tenant_id)

    agent = session.exec(
        select(ForwardingAgent).where(
            ForwardingAgent.id == agent_id,
            ForwardingAgent.tenant_id == tenant_id,
            ForwardingAgent.is_deleted == False
        )
    ).first()

    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    agent.is_deleted = True
    agent.deleted_at = datetime.utcnow()
    agent.deleted_by = str(current_user.id)
    session.add(agent)
    session.commit()

    return {"message": "Agent deleted"}


@router.get("/types/list")
def get_agent_types():
    """Get list of agent types"""
    return [{"value": t.value, "label": t.value.replace("_", " ").title()} for t in AgentType]
