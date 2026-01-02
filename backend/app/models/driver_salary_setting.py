from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import date as date_type
from .base import BaseUUIDModel, TimestampMixin, TenantScoped

class DriverSalarySetting(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Driver Salary Settings - Master data for calculating driver salaries
    """
    __tablename__ = "driver_salary_settings"

    # Validity period (Thời hạn hiệu lực)
    effective_start_date: Optional[date_type] = Field(default=None, nullable=True)  # Ngày bắt đầu
    effective_end_date: Optional[date_type] = Field(default=None, nullable=True)  # Ngày kết thúc

    # Distance brackets (Mốc km) - configurable thresholds (12 brackets)
    distance_bracket_1: int = Field(default=10)
    distance_bracket_2: int = Field(default=20)
    distance_bracket_3: int = Field(default=30)
    distance_bracket_4: int = Field(default=40)
    distance_bracket_5: int = Field(default=50)
    distance_bracket_6: int = Field(default=60)
    distance_bracket_7: int = Field(default=80)
    distance_bracket_8: int = Field(default=100)
    distance_bracket_9: int = Field(default=120)
    distance_bracket_10: int = Field(default=150)
    distance_bracket_11: int = Field(default=200)
    distance_bracket_12: int = Field(default=250)
    # Bracket 13: bracket_12+1 and above

    # Distance-based salary (Lương theo km)
    # From Port (Từ Cảng) - 13 salary levels
    port_bracket_1: int = Field(default=0)  # 0 - bracket_1 km
    port_bracket_2: int = Field(default=0)  # bracket_1+1 - bracket_2 km
    port_bracket_3: int = Field(default=0)  # bracket_2+1 - bracket_3 km
    port_bracket_4: int = Field(default=0)  # bracket_3+1 - bracket_4 km
    port_bracket_5: int = Field(default=0)  # bracket_4+1 - bracket_5 km
    port_bracket_6: int = Field(default=0)  # bracket_5+1 - bracket_6 km
    port_bracket_7: int = Field(default=0)  # bracket_6+1 - bracket_7 km
    port_bracket_8: int = Field(default=0)  # bracket_7+1 - bracket_8 km
    port_bracket_9: int = Field(default=0)  # bracket_8+1 - bracket_9 km
    port_bracket_10: int = Field(default=0)  # bracket_9+1 - bracket_10 km
    port_bracket_11: int = Field(default=0)  # bracket_10+1 - bracket_11 km
    port_bracket_12: int = Field(default=0)  # bracket_11+1 - bracket_12 km
    port_bracket_13: int = Field(default=0)  # bracket_12+1 km and above

    # From Warehouse/Customer (Từ Kho/Giao Khách) - 13 salary levels
    warehouse_bracket_1: int = Field(default=0)  # 0 - bracket_1 km
    warehouse_bracket_2: int = Field(default=0)  # bracket_1+1 - bracket_2 km
    warehouse_bracket_3: int = Field(default=0)  # bracket_2+1 - bracket_3 km
    warehouse_bracket_4: int = Field(default=0)  # bracket_3+1 - bracket_4 km
    warehouse_bracket_5: int = Field(default=0)  # bracket_4+1 - bracket_5 km
    warehouse_bracket_6: int = Field(default=0)  # bracket_5+1 - bracket_6 km
    warehouse_bracket_7: int = Field(default=0)  # bracket_6+1 - bracket_7 km
    warehouse_bracket_8: int = Field(default=0)  # bracket_7+1 - bracket_8 km
    warehouse_bracket_9: int = Field(default=0)  # bracket_8+1 - bracket_9 km
    warehouse_bracket_10: int = Field(default=0)  # bracket_9+1 - bracket_10 km
    warehouse_bracket_11: int = Field(default=0)  # bracket_10+1 - bracket_11 km
    warehouse_bracket_12: int = Field(default=0)  # bracket_11+1 - bracket_12 km
    warehouse_bracket_13: int = Field(default=0)  # bracket_12+1 km and above

    # Additional fees
    port_gate_fee: int = Field(default=50000)  # Tiền vé cổng (Hàng từ Cảng)
    flatbed_tarp_fee: int = Field(default=0)  # Tiền bái bạt (Xe Mooc sàn)
    warehouse_to_customer_bonus: int = Field(default=0)  # Cộng tiền (Kho nội bộ -> Khách)

    # Daily trip bonuses (Thưởng chuyến trong ngày)
    second_trip_bonus: int = Field(default=500000)  # Thưởng chuyến thứ 2
    third_trip_bonus: int = Field(default=700000)  # Thưởng chuyến thứ 3

    # Monthly trip count bonuses (Thưởng số lượng chuyến tháng)
    bonus_45_50_trips: int = Field(default=1000000)  # 45-50 chuyến
    bonus_51_54_trips: int = Field(default=1500000)  # 51-54 chuyến
    bonus_55_plus_trips: int = Field(default=2000000)  # 55+ chuyến

    # Holiday multiplier
    holiday_multiplier: float = Field(default=2.0)  # 200% on holidays

    # Status
    status: str = Field(default="ACTIVE")  # ACTIVE, INACTIVE

    # Note
    note: Optional[str] = Field(default=None)
