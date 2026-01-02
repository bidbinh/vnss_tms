"""
HRM - Organization Structure Models
Branch → Department → Team → Position
"""
from typing import Optional
from sqlmodel import SQLModel, Field
from enum import Enum
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class Branch(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Chi nhánh / Văn phòng"""
    __tablename__ = "hrm_branches"

    code: str = Field(index=True, nullable=False)  # CN-HCM, CN-HN
    name: str = Field(nullable=False)  # Chi nhánh HCM

    # Address
    address: Optional[str] = Field(default=None)
    city: Optional[str] = Field(default=None)
    province: Optional[str] = Field(default=None)

    # Contact
    phone: Optional[str] = Field(default=None)
    email: Optional[str] = Field(default=None)

    # Manager
    manager_id: Optional[str] = Field(default=None, foreign_key="hrm_employees.id")

    is_headquarters: bool = Field(default=False)  # Trụ sở chính
    is_active: bool = Field(default=True)

    notes: Optional[str] = Field(default=None)


class Department(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Phòng ban"""
    __tablename__ = "hrm_departments"

    code: str = Field(index=True, nullable=False)  # PB-KD, PB-KT
    name: str = Field(nullable=False)  # Phòng Kinh doanh

    # Parent (for sub-departments)
    parent_id: Optional[str] = Field(default=None, foreign_key="hrm_departments.id")
    branch_id: Optional[str] = Field(default=None, foreign_key="hrm_branches.id")

    # Manager
    manager_id: Optional[str] = Field(default=None, foreign_key="hrm_employees.id")

    # Cost center for accounting
    cost_center_code: Optional[str] = Field(default=None)

    is_active: bool = Field(default=True)
    sort_order: int = Field(default=0)

    notes: Optional[str] = Field(default=None)


class Team(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Nhóm / Tổ"""
    __tablename__ = "hrm_teams"

    code: str = Field(index=True, nullable=False)  # TEAM-KD1
    name: str = Field(nullable=False)  # Nhóm Kinh doanh 1

    department_id: str = Field(foreign_key="hrm_departments.id", nullable=False)

    # Leader
    leader_id: Optional[str] = Field(default=None, foreign_key="hrm_employees.id")

    is_active: bool = Field(default=True)

    notes: Optional[str] = Field(default=None)


class Position(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Chức danh / Vị trí công việc"""
    __tablename__ = "hrm_positions"

    code: str = Field(index=True, nullable=False)  # NV, TP, GD
    name: str = Field(nullable=False)  # Nhân viên, Trưởng phòng, Giám đốc

    # Level for hierarchy (1=Staff, 2=Senior, 3=Lead, 4=Manager, 5=Director, 6=C-Level)
    level: int = Field(default=1)

    # Department (optional - some positions are company-wide)
    department_id: Optional[str] = Field(default=None, foreign_key="hrm_departments.id")

    # Salary range
    min_salary: Optional[float] = Field(default=None)
    max_salary: Optional[float] = Field(default=None)

    # Job description
    description: Optional[str] = Field(default=None)
    requirements: Optional[str] = Field(default=None)

    is_active: bool = Field(default=True)
    sort_order: int = Field(default=0)
