"""
FMS Agent Model - Partner/Agent management
Quản lý đại lý, đối tác giao nhận
Model synced with current DB schema
"""
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum
import uuid


class AgentType(str, Enum):
    """Loại đại lý"""
    OVERSEAS_AGENT = "OVERSEAS_AGENT"  # Đại lý nước ngoài
    LOCAL_AGENT = "LOCAL_AGENT"  # Đại lý nội địa
    CO_LOADER = "CO_LOADER"  # Co-loader
    NVOCC = "NVOCC"  # Non-Vessel Operating Common Carrier
    CUSTOMS_BROKER = "CUSTOMS_BROKER"  # Đại lý hải quan
    TRUCKING = "TRUCKING"  # Đối tác vận tải nội địa
    WAREHOUSE = "WAREHOUSE"  # Đối tác kho bãi
    SHIPPING_LINE = "SHIPPING_LINE"  # Hãng tàu
    AIRLINE = "AIRLINE"  # Hãng hàng không
    EXPRESS = "EXPRESS"  # Đối tác chuyển phát nhanh


class ForwardingAgent(SQLModel, table=True):
    """
    Forwarding Agent - Đại lý/Đối tác giao nhận
    Synced with current DB schema (fms_agents table)
    """
    __tablename__ = "fms_agents"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Agent info
    agent_code: str = Field(index=True)  # AGT-001
    agent_name: str
    agent_type: str = Field(default=AgentType.OVERSEAS_AGENT.value)
    is_active: bool = Field(default=True)

    # Location
    country: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None

    # Contact
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    fax: Optional[str] = None
    website: Optional[str] = None

    # Tax/Banking
    tax_code: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    swift_code: Optional[str] = None

    # Business terms
    credit_limit: float = Field(default=0)
    payment_terms: Optional[str] = None

    # Services (comma-separated: SEA,AIR,TRUCKING,CUSTOMS,WAREHOUSE)
    services: Optional[str] = None

    # Trade lanes (comma-separated)
    trade_lanes: Optional[str] = None

    # Industry code
    iata_code: Optional[str] = None
    fiata_membership: Optional[str] = None

    # Notes
    remarks: Optional[str] = None

    # Audit
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    deleted_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None
    is_deleted: bool = Field(default=False)


class AgentAgreement(SQLModel, table=True):
    """
    Agent Agreement - Thỏa thuận với đại lý
    """
    __tablename__ = "fms_agent_agreements"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    agent_id: str = Field(index=True)

    # Agreement info
    agreement_no: str = Field(index=True)
    agreement_type: Optional[str] = None  # EXCLUSIVE, NON_EXCLUSIVE, SPOT
    status: str = Field(default="ACTIVE")  # DRAFT, ACTIVE, EXPIRED, TERMINATED

    # Validity
    effective_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None

    # Terms
    commission_rate: Optional[float] = None  # %
    payment_terms: Optional[str] = None
    credit_limit: Optional[float] = None
    currency_code: str = Field(default="USD")

    # Coverage
    routes: Optional[str] = None  # JSON list of routes
    services: Optional[str] = None  # JSON list of services

    # Document
    agreement_file: Optional[str] = None

    # Notes
    notes: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
