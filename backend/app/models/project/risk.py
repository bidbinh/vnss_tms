"""
Project Management - Risk Models
"""
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime, date
from decimal import Decimal
from enum import Enum
import uuid


class RiskStatus(str, Enum):
    """Risk status"""
    IDENTIFIED = "IDENTIFIED"
    ANALYZING = "ANALYZING"
    MITIGATING = "MITIGATING"
    RESOLVED = "RESOLVED"
    ACCEPTED = "ACCEPTED"
    CLOSED = "CLOSED"


class RiskProbability(str, Enum):
    """Risk probability"""
    VERY_LOW = "VERY_LOW"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    VERY_HIGH = "VERY_HIGH"


class RiskImpact(str, Enum):
    """Risk impact"""
    NEGLIGIBLE = "NEGLIGIBLE"
    MINOR = "MINOR"
    MODERATE = "MODERATE"
    MAJOR = "MAJOR"
    CRITICAL = "CRITICAL"


class ProjectRisk(SQLModel, table=True):
    """Project Risk - Risk register entry"""
    __tablename__ = "prj_risks"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    project_id: str = Field(index=True)

    # Basic Info
    risk_number: str = Field(index=True)  # RISK-001
    title: str
    description: str
    category: Optional[str] = None  # Technical, Financial, Resource, etc.
    status: str = Field(default=RiskStatus.IDENTIFIED.value)

    # Assessment
    probability: str = Field(default=RiskProbability.MEDIUM.value)
    impact: str = Field(default=RiskImpact.MODERATE.value)
    risk_score: Decimal = Field(default=Decimal("0"))  # Calculated: probability x impact

    # Impact Details
    cost_impact: Decimal = Field(default=Decimal("0"))
    schedule_impact_days: int = Field(default=0)
    scope_impact: Optional[str] = None
    quality_impact: Optional[str] = None

    # Dates
    identified_date: date = Field(default_factory=date.today)
    target_resolution_date: Optional[date] = None
    actual_resolution_date: Optional[date] = None

    # Owner
    owner_id: Optional[str] = None
    owner_name: Optional[str] = None

    # Response Strategy
    response_strategy: Optional[str] = None  # Avoid, Mitigate, Transfer, Accept
    response_plan: Optional[str] = None
    contingency_plan: Optional[str] = None

    # Trigger
    trigger_conditions: Optional[str] = None

    # Notes
    notes: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class RiskMitigation(SQLModel, table=True):
    """Risk Mitigation - Mitigation actions"""
    __tablename__ = "prj_risk_mitigations"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    risk_id: str = Field(index=True)

    # Action
    action_number: int = Field(default=1)
    action_description: str
    action_type: str = Field(default="PREVENTIVE")  # PREVENTIVE, CORRECTIVE

    # Owner
    owner_id: Optional[str] = None
    owner_name: Optional[str] = None

    # Timeline
    due_date: Optional[date] = None
    completed_date: Optional[date] = None

    # Status
    status: str = Field(default="PLANNED")  # PLANNED, IN_PROGRESS, COMPLETED, CANCELLED
    progress_percent: Decimal = Field(default=Decimal("0"))

    # Cost
    estimated_cost: Decimal = Field(default=Decimal("0"))
    actual_cost: Decimal = Field(default=Decimal("0"))

    # Result
    result: Optional[str] = None
    effectiveness: Optional[str] = None  # HIGH, MEDIUM, LOW

    # Notes
    notes: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
