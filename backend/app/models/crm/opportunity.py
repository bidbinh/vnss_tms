"""
CRM - Opportunity Models
Sales Opportunities (Deals) in pipeline
"""
from typing import Optional
from sqlmodel import SQLModel, Field
from enum import Enum
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class OpportunityStage(str, Enum):
    """Giai đoạn cơ hội bán hàng"""
    QUALIFICATION = "QUALIFICATION"     # Xác định nhu cầu
    NEEDS_ANALYSIS = "NEEDS_ANALYSIS"   # Phân tích nhu cầu
    PROPOSAL = "PROPOSAL"               # Đề xuất/Báo giá
    NEGOTIATION = "NEGOTIATION"         # Đàm phán
    CLOSED_WON = "CLOSED_WON"           # Thắng
    CLOSED_LOST = "CLOSED_LOST"         # Thua


class Opportunity(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Cơ hội bán hàng"""
    __tablename__ = "crm_opportunities"

    # Basic Info
    code: Optional[str] = Field(default=None, index=True)  # OPP-2024-001
    name: str = Field(nullable=False, index=True)

    # Related Account & Contact
    account_id: str = Field(foreign_key="crm_accounts.id", nullable=False, index=True)
    contact_id: Optional[str] = Field(default=None, foreign_key="crm_contacts.id")

    # Pipeline Stage
    stage: str = Field(default=OpportunityStage.QUALIFICATION.value, index=True)
    probability: float = Field(default=10)  # % xác suất thắng

    # Value
    amount: float = Field(default=0)
    currency: str = Field(default="VND")

    # Timeline
    expected_close_date: Optional[str] = Field(default=None)
    actual_close_date: Optional[str] = Field(default=None)

    # Source
    source: Optional[str] = Field(default=None)

    # Product/Service Interest
    product_interest: Optional[str] = Field(default=None)
    service_type: Optional[str] = Field(default=None)  # VD: Vận tải nội địa, XNK...

    # For Logistics - Route Info
    origin: Optional[str] = Field(default=None)
    destination: Optional[str] = Field(default=None)
    frequency: Optional[str] = Field(default=None)  # Daily, Weekly, Monthly
    volume_estimate: Optional[str] = Field(default=None)  # Container/month, Tons/week

    # Competitor Info
    competitor: Optional[str] = Field(default=None)
    competitor_price: Optional[float] = Field(default=None)

    # Assignment
    assigned_to: Optional[str] = Field(default=None)

    # Close Info
    close_reason: Optional[str] = Field(default=None)  # Win/Loss reason
    next_step: Optional[str] = Field(default=None)

    # Description & Notes
    description: Optional[str] = Field(default=None)
    notes: Optional[str] = Field(default=None)

    # Audit
    created_by: Optional[str] = Field(default=None)
