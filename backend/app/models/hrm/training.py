"""
HRM - Training & Development Models
Training courses, e-learning, certificates
"""
from typing import Optional
from datetime import date, datetime
from decimal import Decimal
from sqlmodel import SQLModel, Field
from enum import Enum
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class TrainingType(str, Enum):
    """Loại đào tạo"""
    ONBOARDING = "ONBOARDING"        # Đào tạo hội nhập
    SKILL = "SKILL"                  # Kỹ năng nghiệp vụ
    SAFETY = "SAFETY"                # An toàn lao động
    COMPLIANCE = "COMPLIANCE"        # Tuân thủ pháp luật
    LEADERSHIP = "LEADERSHIP"        # Quản lý, lãnh đạo
    TECHNICAL = "TECHNICAL"          # Kỹ thuật chuyên môn
    DRIVER = "DRIVER"                # Đào tạo tài xế (ATGT, xử lý tình huống)


class TrainingStatus(str, Enum):
    """Trạng thái khóa đào tạo"""
    PLANNED = "PLANNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class ParticipantStatus(str, Enum):
    """Trạng thái học viên"""
    ENROLLED = "ENROLLED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    DROPPED = "DROPPED"


class Training(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Khóa đào tạo"""
    __tablename__ = "hrm_trainings"

    code: str = Field(index=True, nullable=False, max_length=30)  # DT-2024-001
    name: str = Field(nullable=False, max_length=255)  # Đào tạo an toàn lao động 2024

    training_type: str = Field(default=TrainingType.SKILL.value, max_length=20)

    # Description
    description: Optional[str] = Field(default=None, max_length=2000)
    objectives: Optional[str] = Field(default=None, max_length=1000)  # Mục tiêu đào tạo
    content_outline: Optional[str] = Field(default=None, max_length=2000)  # Nội dung chính

    # Dates
    start_date: Optional[date] = Field(default=None, index=True)
    end_date: Optional[date] = Field(default=None, index=True)
    duration_hours: Decimal = Field(default=Decimal("0"), max_digits=6, decimal_places=2)

    # Location & Format
    location: Optional[str] = Field(default=None, max_length=255)
    format: str = Field(default="OFFLINE", max_length=20)  # OFFLINE, ONLINE, HYBRID, E_LEARNING

    # For e-learning
    course_url: Optional[str] = Field(default=None, max_length=500)
    total_modules: int = Field(default=0)

    # Trainer
    trainer_name: Optional[str] = Field(default=None, max_length=255)
    trainer_organization: Optional[str] = Field(default=None, max_length=255)

    # Cost
    cost_per_person: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)
    total_budget: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)
    actual_cost: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)

    # Capacity
    max_participants: Optional[int] = Field(default=None)
    min_participants: Optional[int] = Field(default=None)

    # Requirements
    passing_score: Decimal = Field(default=Decimal("70"), max_digits=5, decimal_places=2)  # Điểm đạt (%)
    certificate_validity_months: Optional[int] = Field(default=None)  # Hiệu lực chứng chỉ

    # For mandatory training
    is_mandatory: bool = Field(default=False)
    mandatory_for_departments: Optional[str] = Field(default=None, max_length=1000)  # JSON array of department IDs
    mandatory_for_positions: Optional[str] = Field(default=None, max_length=1000)  # JSON array of position IDs

    status: str = Field(default=TrainingStatus.PLANNED.value, index=True, max_length=20)

    notes: Optional[str] = Field(default=None, max_length=1000)
    created_by: Optional[str] = Field(default=None, foreign_key="users.id")


class TrainingParticipant(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Học viên tham gia đào tạo"""
    __tablename__ = "hrm_training_participants"

    training_id: str = Field(foreign_key="hrm_trainings.id", nullable=False, index=True)
    employee_id: str = Field(foreign_key="hrm_employees.id", nullable=False, index=True)

    # Enrollment
    enrolled_date: date = Field(nullable=False)
    enrolled_by: Optional[str] = Field(default=None, foreign_key="users.id")

    # Progress (for e-learning)
    modules_completed: int = Field(default=0)
    progress_percent: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=2)
    last_accessed: Optional[datetime] = Field(default=None)

    # Completion
    status: str = Field(default=ParticipantStatus.ENROLLED.value, index=True, max_length=20)
    completion_date: Optional[date] = Field(default=None)
    score: Optional[Decimal] = Field(default=None, max_digits=5, decimal_places=2)  # Điểm bài thi
    is_passed: Optional[bool] = Field(default=None)

    # Attendance (for offline)
    attended_hours: Decimal = Field(default=Decimal("0"), max_digits=6, decimal_places=2)
    attendance_percent: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=2)

    # Feedback
    feedback_score: Optional[int] = Field(default=None)  # 1-5 stars
    feedback_comment: Optional[str] = Field(default=None, max_length=1000)

    # Certificate issued
    certificate_id: Optional[str] = Field(default=None, foreign_key="hrm_certificates.id", index=True)

    notes: Optional[str] = Field(default=None, max_length=500)


class Certificate(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Chứng chỉ"""
    __tablename__ = "hrm_certificates"

    employee_id: str = Field(foreign_key="hrm_employees.id", nullable=False, index=True)

    # Certificate info
    certificate_number: str = Field(nullable=False, index=True, max_length=50)
    certificate_name: str = Field(nullable=False, max_length=255)
    certificate_type: str = Field(nullable=False, max_length=20)  # INTERNAL, EXTERNAL, LICENSE

    # Issuer
    issuing_organization: Optional[str] = Field(default=None, max_length=255)
    issue_date: date = Field(nullable=False, index=True)
    expiry_date: Optional[date] = Field(default=None, index=True)

    # From training
    training_id: Optional[str] = Field(default=None, foreign_key="hrm_trainings.id", index=True)

    # For driver licenses (synced from TMS or entered here)
    license_class: Optional[str] = Field(default=None, max_length=10)  # B2, C, FC...

    # File
    file_url: Optional[str] = Field(default=None, max_length=500)

    # Alert before expiry
    alert_before_days: int = Field(default=30)

    is_verified: bool = Field(default=False)
    verified_by: Optional[str] = Field(default=None, foreign_key="users.id")
    verified_at: Optional[datetime] = Field(default=None)

    notes: Optional[str] = Field(default=None, max_length=500)
