"""
HRM - Recruitment Models
Job postings, candidates, interviews
"""
from typing import Optional
from sqlmodel import SQLModel, Field
from enum import Enum
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class JobStatus(str, Enum):
    """Trạng thái tin tuyển dụng"""
    DRAFT = "DRAFT"
    OPEN = "OPEN"
    ON_HOLD = "ON_HOLD"
    CLOSED = "CLOSED"
    FILLED = "FILLED"


class CandidateStatus(str, Enum):
    """Trạng thái ứng viên"""
    NEW = "NEW"                      # Mới nhận CV
    SCREENING = "SCREENING"          # Đang sàng lọc
    PHONE_SCREEN = "PHONE_SCREEN"    # Phỏng vấn điện thoại
    INTERVIEW_1 = "INTERVIEW_1"      # Phỏng vấn vòng 1
    INTERVIEW_2 = "INTERVIEW_2"      # Phỏng vấn vòng 2
    TECHNICAL_TEST = "TECHNICAL_TEST"  # Làm bài test
    OFFER = "OFFER"                  # Đã gửi offer
    OFFER_ACCEPTED = "OFFER_ACCEPTED"  # Chấp nhận offer
    OFFER_DECLINED = "OFFER_DECLINED"  # Từ chối offer
    HIRED = "HIRED"                  # Đã nhận việc
    REJECTED = "REJECTED"            # Loại
    WITHDRAWN = "WITHDRAWN"          # Ứng viên rút hồ sơ
    TALENT_POOL = "TALENT_POOL"      # Lưu vào talent pool


class InterviewResult(str, Enum):
    """Kết quả phỏng vấn"""
    PENDING = "PENDING"
    PASSED = "PASSED"
    FAILED = "FAILED"
    ON_HOLD = "ON_HOLD"


class JobPosting(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Tin tuyển dụng"""
    __tablename__ = "hrm_job_postings"

    code: str = Field(index=True, nullable=False)  # JOB-2024-001
    title: str = Field(nullable=False, index=True)  # Tuyển tài xế xe tải

    # Position
    position_id: Optional[str] = Field(default=None, foreign_key="hrm_positions.id")
    department_id: Optional[str] = Field(default=None, foreign_key="hrm_departments.id")
    branch_id: Optional[str] = Field(default=None, foreign_key="hrm_branches.id")

    # Details
    job_type: str = Field(default="FULL_TIME")  # FULL_TIME, PART_TIME, CONTRACT, INTERN
    experience_level: Optional[str] = Field(default=None)  # ENTRY, JUNIOR, MID, SENIOR
    headcount: int = Field(default=1)  # Số lượng cần tuyển

    # Salary
    salary_min: Optional[float] = Field(default=None)
    salary_max: Optional[float] = Field(default=None)
    salary_currency: str = Field(default="VND")
    show_salary: bool = Field(default=True)  # Hiển thị lương trên tin đăng

    # Location
    work_location: Optional[str] = Field(default=None)
    is_remote: bool = Field(default=False)

    # Description
    description: Optional[str] = Field(default=None)  # Mô tả công việc
    requirements: Optional[str] = Field(default=None)  # Yêu cầu
    benefits: Optional[str] = Field(default=None)  # Quyền lợi
    skills_required: Optional[str] = Field(default=None)  # JSON array

    # Dates
    posted_date: Optional[str] = Field(default=None)
    deadline: Optional[str] = Field(default=None)

    # Hiring process
    hiring_manager_id: Optional[str] = Field(default=None, foreign_key="hrm_employees.id")
    recruiter_id: Optional[str] = Field(default=None, foreign_key="hrm_employees.id")

    # Stats
    views_count: int = Field(default=0)
    applications_count: int = Field(default=0)

    status: str = Field(default=JobStatus.DRAFT.value, index=True)

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class Candidate(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Ứng viên"""
    __tablename__ = "hrm_candidates"

    job_posting_id: str = Field(foreign_key="hrm_job_postings.id", nullable=False, index=True)

    # Basic info
    full_name: str = Field(nullable=False, index=True)
    email: Optional[str] = Field(default=None, index=True)
    phone: Optional[str] = Field(default=None)
    date_of_birth: Optional[str] = Field(default=None)
    gender: Optional[str] = Field(default=None)

    # Address
    address: Optional[str] = Field(default=None)
    city: Optional[str] = Field(default=None)

    # Professional info
    current_company: Optional[str] = Field(default=None)
    current_position: Optional[str] = Field(default=None)
    experience_years: Optional[float] = Field(default=None)
    highest_education: Optional[str] = Field(default=None)  # HIGH_SCHOOL, BACHELOR, MASTER, PHD

    # Expected
    expected_salary: Optional[float] = Field(default=None)
    available_date: Optional[str] = Field(default=None)  # Ngày có thể nhận việc

    # Resume
    resume_url: Optional[str] = Field(default=None)
    cover_letter: Optional[str] = Field(default=None)
    portfolio_url: Optional[str] = Field(default=None)

    # Source
    source: Optional[str] = Field(default=None)  # WEBSITE, FACEBOOK, LINKEDIN, TOPCV, REFERRAL
    referrer_id: Optional[str] = Field(default=None, foreign_key="hrm_employees.id")

    # Skills & notes
    skills_json: Optional[str] = Field(default=None)  # ["Python", "SQL", "Excel"]
    languages_json: Optional[str] = Field(default=None)  # [{"lang": "English", "level": "Fluent"}]

    # Scoring
    screening_score: Optional[float] = Field(default=None)  # 0-100
    overall_score: Optional[float] = Field(default=None)

    # Status
    status: str = Field(default=CandidateStatus.NEW.value, index=True)
    rejection_reason: Optional[str] = Field(default=None)

    # If hired
    employee_id: Optional[str] = Field(default=None, foreign_key="hrm_employees.id")
    hired_date: Optional[str] = Field(default=None)

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class Interview(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Lịch phỏng vấn"""
    __tablename__ = "hrm_interviews"

    candidate_id: str = Field(foreign_key="hrm_candidates.id", nullable=False, index=True)

    # Interview details
    interview_round: int = Field(default=1)  # Vòng 1, 2, 3...
    interview_type: str = Field(default="ONSITE")  # ONSITE, PHONE, VIDEO
    interview_name: Optional[str] = Field(default=None)  # "Phỏng vấn HR", "Phỏng vấn kỹ thuật"

    # Schedule
    scheduled_date: str = Field(nullable=False)
    scheduled_time: str = Field(nullable=False)  # HH:MM
    duration_minutes: int = Field(default=60)
    location: Optional[str] = Field(default=None)
    meeting_link: Optional[str] = Field(default=None)  # Zoom, Meet link

    # Interviewers (JSON array of employee IDs)
    interviewer_ids_json: Optional[str] = Field(default=None)

    # Status
    status: str = Field(default="SCHEDULED")  # SCHEDULED, COMPLETED, CANCELLED, NO_SHOW

    # Result
    result: str = Field(default=InterviewResult.PENDING.value)
    score: Optional[float] = Field(default=None)  # Điểm đánh giá

    # Feedback
    strengths: Optional[str] = Field(default=None)
    weaknesses: Optional[str] = Field(default=None)
    overall_feedback: Optional[str] = Field(default=None)
    recommendation: Optional[str] = Field(default=None)  # HIRE, REJECT, NEXT_ROUND, ON_HOLD

    # Completed by
    completed_at: Optional[str] = Field(default=None)
    completed_by: Optional[str] = Field(default=None, foreign_key="hrm_employees.id")

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)
