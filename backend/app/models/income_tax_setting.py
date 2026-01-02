from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import date
from .base import BaseUUIDModel, TimestampMixin, TenantScoped


class IncomeTaxSetting(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    __tablename__ = "income_tax_settings"

    # Effective period
    effective_from: date = Field(nullable=False, index=True)  # When this setting becomes effective
    effective_to: Optional[date] = Field(default=None)  # When this setting expires (None = current)

    # Deductions
    personal_deduction: int = Field(default=11000000)  # Giảm trừ bản thân (monthly)
    dependent_deduction: int = Field(default=4400000)  # Giảm trừ người phụ thuộc (monthly per dependent)

    # Tax brackets (progressive tax rates)
    # Bracket 1: 0 - 5M
    bracket_1_limit: int = Field(default=5000000)
    bracket_1_rate: float = Field(default=0.05)  # 5%

    # Bracket 2: 5M - 10M
    bracket_2_limit: int = Field(default=10000000)
    bracket_2_rate: float = Field(default=0.10)  # 10%
    bracket_2_deduction: int = Field(default=250000)

    # Bracket 3: 10M - 18M
    bracket_3_limit: int = Field(default=18000000)
    bracket_3_rate: float = Field(default=0.15)  # 15%
    bracket_3_deduction: int = Field(default=750000)

    # Bracket 4: 18M - 32M
    bracket_4_limit: int = Field(default=32000000)
    bracket_4_rate: float = Field(default=0.20)  # 20%
    bracket_4_deduction: int = Field(default=1650000)

    # Bracket 5: 32M - 52M
    bracket_5_limit: int = Field(default=52000000)
    bracket_5_rate: float = Field(default=0.25)  # 25%
    bracket_5_deduction: int = Field(default=3250000)

    # Bracket 6: 52M - 80M
    bracket_6_limit: int = Field(default=80000000)
    bracket_6_rate: float = Field(default=0.30)  # 30%
    bracket_6_deduction: int = Field(default=5850000)

    # Bracket 7: > 80M
    bracket_7_rate: float = Field(default=0.35)  # 35%
    bracket_7_deduction: int = Field(default=9850000)

    # Social insurance rates
    social_insurance_rate: float = Field(default=0.08)  # BHXH 8%
    health_insurance_rate: float = Field(default=0.015)  # BHYT 1.5%
    unemployment_insurance_rate: float = Field(default=0.01)  # BHTN 1%
    total_insurance_rate: float = Field(default=0.105)  # Total 10.5%

    # Status
    status: str = Field(default="ACTIVE")  # ACTIVE, INACTIVE
