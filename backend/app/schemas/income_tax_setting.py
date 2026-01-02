from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import date, datetime


class IncomeTaxSettingBase(BaseModel):
    effective_from: date
    effective_to: Optional[date] = None
    personal_deduction: int = 11000000
    dependent_deduction: int = 4400000
    bracket_1_limit: int = 5000000
    bracket_1_rate: float = 0.05
    bracket_2_limit: int = 10000000
    bracket_2_rate: float = 0.10
    bracket_2_deduction: int = 250000
    bracket_3_limit: int = 18000000
    bracket_3_rate: float = 0.15
    bracket_3_deduction: int = 750000
    bracket_4_limit: int = 32000000
    bracket_4_rate: float = 0.20
    bracket_4_deduction: int = 1650000
    bracket_5_limit: int = 52000000
    bracket_5_rate: float = 0.25
    bracket_5_deduction: int = 3250000
    bracket_6_limit: int = 80000000
    bracket_6_rate: float = 0.30
    bracket_6_deduction: int = 5850000
    bracket_7_rate: float = 0.35
    bracket_7_deduction: int = 9850000
    social_insurance_rate: float = 0.08
    health_insurance_rate: float = 0.015
    unemployment_insurance_rate: float = 0.01
    total_insurance_rate: float = 0.105
    status: str = "ACTIVE"


class IncomeTaxSettingCreate(IncomeTaxSettingBase):
    pass


class IncomeTaxSettingUpdate(BaseModel):
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    personal_deduction: Optional[int] = None
    dependent_deduction: Optional[int] = None
    bracket_1_limit: Optional[int] = None
    bracket_1_rate: Optional[float] = None
    bracket_2_limit: Optional[int] = None
    bracket_2_rate: Optional[float] = None
    bracket_2_deduction: Optional[int] = None
    bracket_3_limit: Optional[int] = None
    bracket_3_rate: Optional[float] = None
    bracket_3_deduction: Optional[int] = None
    bracket_4_limit: Optional[int] = None
    bracket_4_rate: Optional[float] = None
    bracket_4_deduction: Optional[int] = None
    bracket_5_limit: Optional[int] = None
    bracket_5_rate: Optional[float] = None
    bracket_5_deduction: Optional[int] = None
    bracket_6_limit: Optional[int] = None
    bracket_6_rate: Optional[float] = None
    bracket_6_deduction: Optional[int] = None
    bracket_7_rate: Optional[float] = None
    bracket_7_deduction: Optional[int] = None
    social_insurance_rate: Optional[float] = None
    health_insurance_rate: Optional[float] = None
    unemployment_insurance_rate: Optional[float] = None
    total_insurance_rate: Optional[float] = None
    status: Optional[str] = None


class IncomeTaxSettingRead(IncomeTaxSettingBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    tenant_id: str
    created_at: datetime
    updated_at: datetime
