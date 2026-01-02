"""
CRM - Lead Models
Leads (Potential Customers) before conversion to Account
"""
from typing import Optional
from sqlmodel import SQLModel, Field
from enum import Enum
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class LeadStatus(str, Enum):
    """Trạng thái lead"""
    NEW = "NEW"                     # Mới
    CONTACTED = "CONTACTED"         # Đã liên hệ
    QUALIFIED = "QUALIFIED"         # Đủ điều kiện
    UNQUALIFIED = "UNQUALIFIED"     # Không đủ điều kiện
    CONVERTED = "CONVERTED"         # Đã chuyển đổi thành khách hàng
    LOST = "LOST"                   # Mất


class LeadSource(str, Enum):
    """Nguồn lead"""
    WEBSITE = "WEBSITE"
    REFERRAL = "REFERRAL"           # Giới thiệu
    COLD_CALL = "COLD_CALL"
    SOCIAL_MEDIA = "SOCIAL_MEDIA"
    ADVERTISEMENT = "ADVERTISEMENT"
    TRADE_SHOW = "TRADE_SHOW"       # Hội chợ
    EMAIL_CAMPAIGN = "EMAIL_CAMPAIGN"
    PARTNER = "PARTNER"
    DIRECT = "DIRECT"               # Trực tiếp
    OTHER = "OTHER"


class Lead(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Khách hàng tiềm năng"""
    __tablename__ = "crm_leads"

    # Lead Info
    code: Optional[str] = Field(default=None, index=True)  # LD-2024-001

    # Contact Person
    first_name: str = Field(nullable=False)
    last_name: Optional[str] = Field(default=None)
    full_name: Optional[str] = Field(default=None, index=True)

    # Company Info
    company_name: Optional[str] = Field(default=None, index=True)
    title: Optional[str] = Field(default=None)  # Chức danh

    # Contact Details
    email: Optional[str] = Field(default=None, index=True)
    phone: Optional[str] = Field(default=None)
    mobile: Optional[str] = Field(default=None)
    website: Optional[str] = Field(default=None)

    # Address
    address: Optional[str] = Field(default=None)
    city: Optional[str] = Field(default=None)
    country: str = Field(default="VN")

    # Lead Classification
    source: Optional[str] = Field(default=LeadSource.DIRECT.value)
    status: str = Field(default=LeadStatus.NEW.value, index=True)
    rating: Optional[str] = Field(default=None)  # Hot, Warm, Cold
    industry: Optional[str] = Field(default=None)
    company_size: Optional[str] = Field(default=None)
    annual_revenue: Optional[float] = Field(default=None)

    # Product Interest
    service_interest: Optional[str] = Field(default=None)  # Dịch vụ quan tâm
    estimated_value: float = Field(default=0)

    # Assignment
    assigned_to: Optional[str] = Field(default=None)  # Nhân viên phụ trách

    # Conversion
    converted_account_id: Optional[str] = Field(default=None, foreign_key="crm_accounts.id")
    converted_contact_id: Optional[str] = Field(default=None, foreign_key="crm_contacts.id")
    converted_opportunity_id: Optional[str] = Field(default=None, foreign_key="crm_opportunities.id")
    converted_at: Optional[str] = Field(default=None)
    converted_by: Optional[str] = Field(default=None)

    # Description & Notes
    description: Optional[str] = Field(default=None)
    notes: Optional[str] = Field(default=None)

    # Audit
    created_by: Optional[str] = Field(default=None)
