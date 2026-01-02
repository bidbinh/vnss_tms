"""
CRM - Activity Models
Activities, Tasks, Calls, Emails, Meetings
"""
from typing import Optional
from sqlmodel import SQLModel, Field
from enum import Enum
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class ActivityType(str, Enum):
    """Loại hoạt động"""
    CALL = "CALL"               # Cuộc gọi
    EMAIL = "EMAIL"             # Email
    MEETING = "MEETING"         # Cuộc họp
    TASK = "TASK"               # Công việc
    NOTE = "NOTE"               # Ghi chú
    VISIT = "VISIT"             # Thăm khách hàng
    DEMO = "DEMO"               # Demo sản phẩm
    FOLLOW_UP = "FOLLOW_UP"     # Theo dõi


class ActivityStatus(str, Enum):
    """Trạng thái hoạt động"""
    PLANNED = "PLANNED"         # Đã lên kế hoạch
    IN_PROGRESS = "IN_PROGRESS" # Đang thực hiện
    COMPLETED = "COMPLETED"     # Hoàn thành
    CANCELLED = "CANCELLED"     # Đã hủy
    DEFERRED = "DEFERRED"       # Hoãn lại


class Activity(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Hoạt động CRM"""
    __tablename__ = "crm_activities"

    # Activity Info
    activity_type: str = Field(default=ActivityType.TASK.value, index=True)
    subject: str = Field(nullable=False, index=True)
    description: Optional[str] = Field(default=None)

    # Related Records (polymorphic)
    account_id: Optional[str] = Field(default=None, foreign_key="crm_accounts.id", index=True)
    contact_id: Optional[str] = Field(default=None, foreign_key="crm_contacts.id")
    lead_id: Optional[str] = Field(default=None, foreign_key="crm_leads.id", index=True)
    opportunity_id: Optional[str] = Field(default=None, foreign_key="crm_opportunities.id", index=True)
    quote_id: Optional[str] = Field(default=None, foreign_key="crm_quotes.id")

    # Status
    status: str = Field(default=ActivityStatus.PLANNED.value, index=True)
    priority: str = Field(default="MEDIUM")  # LOW, MEDIUM, HIGH, URGENT

    # Schedule
    start_date: Optional[str] = Field(default=None)  # Ngày bắt đầu
    start_time: Optional[str] = Field(default=None)  # Giờ bắt đầu
    end_date: Optional[str] = Field(default=None)
    end_time: Optional[str] = Field(default=None)
    duration_minutes: Optional[int] = Field(default=None)  # Thời lượng (phút)

    # For Calls
    call_direction: Optional[str] = Field(default=None)  # INBOUND, OUTBOUND
    call_result: Optional[str] = Field(default=None)  # ANSWERED, NO_ANSWER, BUSY, VOICEMAIL
    phone_number: Optional[str] = Field(default=None)

    # For Emails
    email_to: Optional[str] = Field(default=None)
    email_cc: Optional[str] = Field(default=None)
    email_status: Optional[str] = Field(default=None)  # SENT, DELIVERED, OPENED, CLICKED

    # For Meetings
    location: Optional[str] = Field(default=None)
    meeting_type: Optional[str] = Field(default=None)  # ONLINE, ONSITE, PHONE
    meeting_link: Optional[str] = Field(default=None)  # Zoom/Teams/Meet link

    # Assignment
    assigned_to: Optional[str] = Field(default=None)  # Người thực hiện
    participants: Optional[str] = Field(default=None)  # JSON array of user IDs

    # Reminder
    reminder_at: Optional[str] = Field(default=None)
    reminded: bool = Field(default=False)

    # Completion
    completed_at: Optional[str] = Field(default=None)
    completed_by: Optional[str] = Field(default=None)
    outcome: Optional[str] = Field(default=None)  # Kết quả

    # Next Action
    next_action: Optional[str] = Field(default=None)
    next_action_date: Optional[str] = Field(default=None)

    # Notes
    notes: Optional[str] = Field(default=None)

    # Audit
    created_by: Optional[str] = Field(default=None)
