"""
HRM - Performance Evaluation Models
360-degree evaluation, KPIs, appraisals
"""
from typing import Optional
from datetime import date, datetime
from decimal import Decimal
from sqlmodel import SQLModel, Field
from enum import Enum
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class EvaluationStatus(str, Enum):
    """Trạng thái đánh giá"""
    DRAFT = "DRAFT"
    IN_PROGRESS = "IN_PROGRESS"
    PENDING_REVIEW = "PENDING_REVIEW"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class EvaluatorType(str, Enum):
    """Loại người đánh giá (360 độ)"""
    SELF = "SELF"                # Tự đánh giá
    MANAGER = "MANAGER"          # Cấp trên đánh giá
    PEER = "PEER"                # Đồng nghiệp đánh giá
    SUBORDINATE = "SUBORDINATE"  # Cấp dưới đánh giá
    EXTERNAL = "EXTERNAL"        # Khách hàng/đối tác đánh giá


class EvaluationPeriod(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Kỳ đánh giá"""
    __tablename__ = "hrm_evaluation_periods"

    code: str = Field(index=True, nullable=False, max_length=20)  # DG-2024-Q4
    name: str = Field(nullable=False, max_length=100)  # Đánh giá Q4/2024

    # Period
    year: int = Field(nullable=False, index=True)
    period_type: str = Field(default="QUARTERLY", max_length=20)  # MONTHLY, QUARTERLY, SEMI_ANNUAL, ANNUAL
    start_date: date = Field(nullable=False, index=True)
    end_date: date = Field(nullable=False, index=True)

    # Evaluation window
    evaluation_start_date: Optional[date] = Field(default=None)  # Bắt đầu đánh giá từ
    evaluation_end_date: Optional[date] = Field(default=None)    # Deadline đánh giá

    # Settings
    enable_self_evaluation: bool = Field(default=True)
    enable_manager_evaluation: bool = Field(default=True)
    enable_peer_evaluation: bool = Field(default=True)
    enable_subordinate_evaluation: bool = Field(default=False)

    # Weights (%)
    self_weight: Decimal = Field(default=Decimal("20"), max_digits=5, decimal_places=2)
    manager_weight: Decimal = Field(default=Decimal("50"), max_digits=5, decimal_places=2)
    peer_weight: Decimal = Field(default=Decimal("20"), max_digits=5, decimal_places=2)
    subordinate_weight: Decimal = Field(default=Decimal("10"), max_digits=5, decimal_places=2)

    status: str = Field(default="DRAFT", max_length=20)  # DRAFT, OPEN, CLOSED

    description: Optional[str] = Field(default=None, max_length=1000)
    notes: Optional[str] = Field(default=None, max_length=1000)


class EvaluationTemplate(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Mẫu đánh giá"""
    __tablename__ = "hrm_evaluation_templates"

    code: str = Field(index=True, nullable=False, max_length=30)  # TEMPLATE-DRIVER, TEMPLATE-OFFICE
    name: str = Field(nullable=False, max_length=100)  # Mẫu đánh giá tài xế

    # Apply to
    employee_type: Optional[str] = Field(default=None, max_length=20)  # DRIVER, FULL_TIME...
    department_id: Optional[str] = Field(default=None, foreign_key="hrm_departments.id", index=True)
    position_id: Optional[str] = Field(default=None, foreign_key="hrm_positions.id", index=True)

    description: Optional[str] = Field(default=None, max_length=1000)

    is_active: bool = Field(default=True, index=True)
    is_default: bool = Field(default=False)


class EvaluationCriteria(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Tiêu chí đánh giá"""
    __tablename__ = "hrm_evaluation_criteria"

    template_id: str = Field(foreign_key="hrm_evaluation_templates.id", nullable=False, index=True)

    code: str = Field(nullable=False, max_length=20)  # KPI-01, COMP-01
    name: str = Field(nullable=False, max_length=255)  # Hoàn thành chỉ tiêu doanh thu

    category: str = Field(default="KPI", max_length=20)  # KPI, COMPETENCY, BEHAVIOR, ATTITUDE
    description: Optional[str] = Field(default=None, max_length=1000)

    # Weight trong template (%)
    weight: Decimal = Field(default=Decimal("10"), max_digits=5, decimal_places=2)

    # Scoring
    min_score: Decimal = Field(default=Decimal("1"), max_digits=3, decimal_places=1)
    max_score: Decimal = Field(default=Decimal("5"), max_digits=3, decimal_places=1)
    score_labels_json: Optional[str] = Field(default=None, max_length=500)  # {"1": "Kém", "2": "Yếu", "3": "TB", "4": "Khá", "5": "Tốt"}

    # For KPI-type criteria
    target_value: Optional[Decimal] = Field(default=None, max_digits=18, decimal_places=2)
    target_unit: Optional[str] = Field(default=None, max_length=20)  # %, VND, số chuyến, etc.

    sort_order: int = Field(default=0)
    is_active: bool = Field(default=True)


class EmployeeEvaluation(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Đánh giá nhân viên"""
    __tablename__ = "hrm_employee_evaluations"

    period_id: str = Field(foreign_key="hrm_evaluation_periods.id", nullable=False, index=True)
    employee_id: str = Field(foreign_key="hrm_employees.id", nullable=False, index=True)
    template_id: str = Field(foreign_key="hrm_evaluation_templates.id", nullable=False, index=True)

    # Evaluator
    evaluator_id: str = Field(foreign_key="hrm_employees.id", nullable=False, index=True)
    evaluator_type: str = Field(nullable=False, max_length=20)  # SELF, MANAGER, PEER, SUBORDINATE

    # Status
    status: str = Field(default=EvaluationStatus.DRAFT.value, index=True, max_length=20)
    submitted_at: Optional[datetime] = Field(default=None)

    # Overall scores (calculated)
    total_score: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=2)  # Điểm tổng
    weighted_score: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=2)  # Điểm có trọng số
    rating: Optional[str] = Field(default=None, max_length=10)  # A, B, C, D, E hoặc Xuất sắc/Khá/TB/Yếu

    # Comments
    strengths: Optional[str] = Field(default=None, max_length=2000)  # Điểm mạnh
    improvements: Optional[str] = Field(default=None, max_length=2000)  # Điểm cần cải thiện
    overall_comments: Optional[str] = Field(default=None, max_length=2000)
    goals_next_period: Optional[str] = Field(default=None, max_length=2000)  # Mục tiêu kỳ tiếp

    # Acknowledgment (employee acknowledges the evaluation)
    acknowledged_at: Optional[datetime] = Field(default=None)
    employee_comments: Optional[str] = Field(default=None, max_length=2000)  # Ý kiến của nhân viên

    notes: Optional[str] = Field(default=None, max_length=1000)


class EvaluationScore(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Điểm theo từng tiêu chí"""
    __tablename__ = "hrm_evaluation_scores"

    evaluation_id: str = Field(foreign_key="hrm_employee_evaluations.id", nullable=False, index=True)
    criteria_id: str = Field(foreign_key="hrm_evaluation_criteria.id", nullable=False, index=True)

    score: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=2)
    weighted_score: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=2)  # score * weight / 100

    # For KPI criteria
    actual_value: Optional[Decimal] = Field(default=None, max_digits=18, decimal_places=2)  # Giá trị thực tế đạt được
    achievement_percent: Optional[Decimal] = Field(default=None, max_digits=6, decimal_places=2)  # % hoàn thành

    comments: Optional[str] = Field(default=None, max_length=1000)
    evidence: Optional[str] = Field(default=None, max_length=500)  # Minh chứng, file đính kèm


class EmployeeFinalScore(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Điểm tổng hợp cuối cùng (sau khi tổng hợp 360 độ)"""
    __tablename__ = "hrm_employee_final_scores"

    period_id: str = Field(foreign_key="hrm_evaluation_periods.id", nullable=False, index=True)
    employee_id: str = Field(foreign_key="hrm_employees.id", nullable=False, index=True)

    # Scores by evaluator type
    self_score: Optional[Decimal] = Field(default=None, max_digits=5, decimal_places=2)
    manager_score: Optional[Decimal] = Field(default=None, max_digits=5, decimal_places=2)
    peer_avg_score: Optional[Decimal] = Field(default=None, max_digits=5, decimal_places=2)
    subordinate_avg_score: Optional[Decimal] = Field(default=None, max_digits=5, decimal_places=2)

    # Final weighted score
    final_score: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=2)
    final_rating: Optional[str] = Field(default=None, max_length=10)  # A, B, C, D, E

    # Rank in department/company
    rank_in_department: Optional[int] = Field(default=None)
    rank_in_company: Optional[int] = Field(default=None)

    # Actions
    salary_adjustment_percent: Optional[Decimal] = Field(default=None, max_digits=5, decimal_places=2)  # % tăng lương
    bonus_amount: Optional[Decimal] = Field(default=None, max_digits=18, decimal_places=2)  # Thưởng
    promotion_recommended: bool = Field(default=False)
    training_recommended: Optional[str] = Field(default=None, max_length=500)  # Đề xuất đào tạo

    # Review
    reviewed_by: Optional[str] = Field(default=None, foreign_key="hrm_employees.id")
    reviewed_at: Optional[datetime] = Field(default=None)
    review_comments: Optional[str] = Field(default=None, max_length=1000)

    status: str = Field(default="PENDING", max_length=20)  # PENDING, REVIEWED, FINALIZED
