"""
FMS Rate Model - Freight rate management
Quản lý giá cước vận chuyển
"""
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime, date
from enum import Enum
import uuid


class RateType(str, Enum):
    """Loại bảng giá"""
    SEA_FCL = "SEA_FCL"  # Cước biển FCL
    SEA_LCL = "SEA_LCL"  # Cước biển LCL
    AIR = "AIR"  # Cước hàng không
    EXPRESS = "EXPRESS"  # Cước chuyển phát nhanh
    TRUCKING = "TRUCKING"  # Cước nội địa
    LOCAL_CHARGES = "LOCAL_CHARGES"  # Phí local


class FreightRate(SQLModel, table=True):
    """
    Freight Rate - Bảng giá cước
    """
    __tablename__ = "fms_freight_rates"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Rate identification
    rate_code: str = Field(index=True)  # RATE-SEA-001
    rate_name: Optional[str] = None
    rate_type: str = Field(default=RateType.SEA_FCL.value)
    is_active: bool = Field(default=True)

    # Validity
    effective_date: date
    expiry_date: Optional[date] = None

    # Carrier/Vendor
    carrier_id: Optional[str] = None
    carrier_name: Optional[str] = None  # Shipping line, Airline, etc.
    agent_id: Optional[str] = None
    agent_name: Optional[str] = None

    # Route
    origin_port: Optional[str] = None
    origin_port_name: Optional[str] = None
    origin_country: Optional[str] = None
    destination_port: Optional[str] = None
    destination_port_name: Optional[str] = None
    destination_country: Optional[str] = None

    # Via port (transshipment)
    via_port: Optional[str] = None
    via_port_name: Optional[str] = None

    # Transit time
    transit_time_min: Optional[int] = None  # days
    transit_time_max: Optional[int] = None  # days
    frequency: Optional[str] = None  # Weekly, Bi-weekly, etc.

    # Container type (for FCL)
    container_type: Optional[str] = None  # 20GP, 40GP, 40HC, etc.

    # Rate details
    currency_code: str = Field(default="USD")

    # FCL rates (per container)
    rate_20gp: Optional[float] = None
    rate_40gp: Optional[float] = None
    rate_40hc: Optional[float] = None
    rate_20rf: Optional[float] = None
    rate_40rf: Optional[float] = None
    rate_45hc: Optional[float] = None

    # LCL rates (per CBM or per ton)
    rate_per_cbm: Optional[float] = None
    rate_per_ton: Optional[float] = None
    min_charge: Optional[float] = None

    # Air rates (per kg)
    rate_min: Optional[float] = None  # M rate
    rate_normal: Optional[float] = None  # N rate (< 45kg)
    rate_45kg: Optional[float] = None
    rate_100kg: Optional[float] = None
    rate_300kg: Optional[float] = None
    rate_500kg: Optional[float] = None
    rate_1000kg: Optional[float] = None

    # Commodity
    commodity: Optional[str] = None
    commodity_code: Optional[str] = None  # HS Code or commodity class

    # Additional charges included/excluded
    thc_origin_included: bool = Field(default=False)
    thc_dest_included: bool = Field(default=False)
    doc_fee_included: bool = Field(default=False)

    # Special rates
    is_contract_rate: bool = Field(default=False)
    is_spot_rate: bool = Field(default=False)
    is_promotional: bool = Field(default=False)

    # Free time
    free_detention_days: int = Field(default=0)
    free_demurrage_days: int = Field(default=0)

    # Notes
    remarks: Optional[str] = None
    terms_conditions: Optional[str] = None
    internal_notes: Optional[str] = None

    # Source
    rate_source: Optional[str] = None  # Carrier, Agent, Market, etc.
    rate_confirmation_no: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class RateCharge(SQLModel, table=True):
    """
    Rate Charge - Chi tiết phí đi kèm trong bảng giá
    """
    __tablename__ = "fms_rate_charges"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    rate_id: str = Field(index=True)

    # Charge info
    charge_code: str
    charge_name: str
    charge_type: Optional[str] = None  # From ChargeType enum

    # Rate
    currency_code: str = Field(default="USD")
    unit: Optional[str] = None  # Per container, per CBM, per shipment
    amount: float = Field(default=0)

    # Container specific rates
    rate_20gp: Optional[float] = None
    rate_40gp: Optional[float] = None
    rate_40hc: Optional[float] = None

    # Category
    charge_category: Optional[str] = None  # ORIGIN, FREIGHT, DESTINATION

    # Mandatory
    is_mandatory: bool = Field(default=True)

    # Notes
    notes: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
