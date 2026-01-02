"""
FMS Airway Bill Model - Air freight documentation
Supports: Master AWB (MAWB), House AWB (HAWB)
"""
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime, date
from enum import Enum
import uuid


class AWBType(str, Enum):
    """Loại Airway Bill"""
    MASTER = "MASTER"  # MAWB - Master Air Waybill (do airline phát hành)
    HOUSE = "HOUSE"  # HAWB - House Air Waybill (do forwarder phát hành)


class AWBStatus(str, Enum):
    """Trạng thái AWB"""
    DRAFT = "DRAFT"
    ISSUED = "ISSUED"
    AMENDED = "AMENDED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"


class AirwayBill(SQLModel, table=True):
    """
    Airway Bill - Vận đơn hàng không
    AWB format: 3-digit airline code + 8-digit serial (e.g., 180-12345678)
    """
    __tablename__ = "fms_airway_bills"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Liên kết shipment
    shipment_id: str = Field(index=True)

    # AWB Info
    awb_no: str = Field(index=True)  # 180-12345678
    awb_type: str = Field(default=AWBType.HOUSE.value)
    status: str = Field(default=AWBStatus.DRAFT.value)

    # MAWB reference (for HAWB)
    master_awb_id: Optional[str] = None
    master_awb_no: Optional[str] = None

    # Airline Info (for MAWB)
    airline_code: Optional[str] = None  # IATA 3-digit code (e.g., 180 = KE)
    airline_name: Optional[str] = None
    airline_prefix: Optional[str] = None

    # Agent Info
    issuing_agent_name: Optional[str] = None
    issuing_agent_iata_code: Optional[str] = None
    issuing_agent_account: Optional[str] = None

    # Shipper
    shipper_name: Optional[str] = None
    shipper_address: Optional[str] = None
    shipper_city: Optional[str] = None
    shipper_country: Optional[str] = None
    shipper_phone: Optional[str] = None
    shipper_account_no: Optional[str] = None

    # Consignee
    consignee_name: Optional[str] = None
    consignee_address: Optional[str] = None
    consignee_city: Optional[str] = None
    consignee_country: Optional[str] = None
    consignee_phone: Optional[str] = None
    consignee_account_no: Optional[str] = None

    # Also Notify
    notify_name: Optional[str] = None
    notify_address: Optional[str] = None

    # Routing
    airport_of_departure: Optional[str] = None  # IATA code (e.g., SGN)
    airport_of_departure_name: Optional[str] = None
    airport_of_destination: Optional[str] = None  # IATA code
    airport_of_destination_name: Optional[str] = None

    # Routing (multi-leg)
    routing_1_to: Optional[str] = None
    routing_1_by: Optional[str] = None  # Flight carrier
    routing_2_to: Optional[str] = None
    routing_2_by: Optional[str] = None
    routing_3_to: Optional[str] = None
    routing_3_by: Optional[str] = None

    # Flight info
    first_flight_no: Optional[str] = None
    first_flight_date: Optional[date] = None
    second_flight_no: Optional[str] = None
    second_flight_date: Optional[date] = None

    # Dates
    date_of_issue: Optional[date] = None
    execution_date: Optional[date] = None

    # Place of issue
    place_of_issue: Optional[str] = None

    # Cargo description
    nature_of_goods: Optional[str] = None  # Mô tả hàng hóa
    commodity_code: Optional[str] = None  # HS Code

    # Dimensions
    no_of_pieces: int = Field(default=0)  # Số kiện
    gross_weight: float = Field(default=0)  # KG
    chargeable_weight: float = Field(default=0)  # KG (tính cước)
    volume_weight: float = Field(default=0)  # Dimensional weight

    # Dimensions detail (L x W x H)
    length: Optional[float] = None  # cm
    width: Optional[float] = None  # cm
    height: Optional[float] = None  # cm

    # Rate class
    rate_class: Optional[str] = None  # M (minimum), N (normal), Q (quantity), etc.
    commodity_item_no: Optional[str] = None
    rate_per_kg: Optional[float] = None
    rate_charge: Optional[float] = None

    # Charges
    weight_charge: float = Field(default=0)
    valuation_charge: float = Field(default=0)
    tax: float = Field(default=0)
    total_other_charges_agent: float = Field(default=0)
    total_other_charges_carrier: float = Field(default=0)
    total_prepaid: float = Field(default=0)
    total_collect: float = Field(default=0)

    # Payment terms
    weight_charge_prepaid: bool = Field(default=True)
    weight_charge_collect: bool = Field(default=False)
    other_charges_prepaid: bool = Field(default=True)
    other_charges_collect: bool = Field(default=False)

    # Declared value
    declared_value_carriage: Optional[str] = None  # NVD or amount
    declared_value_customs: Optional[str] = None  # NCV or amount
    insurance_amount: Optional[float] = None

    # Currency
    currency_code: str = Field(default="USD")
    currency_conversion_rate: Optional[float] = None
    destination_currency_code: Optional[str] = None

    # Handling info
    handling_info: Optional[str] = None
    sci: Optional[str] = None  # Shipper's Certification for live animals, DG, etc.

    # Special cargo
    is_dangerous_goods: bool = Field(default=False)
    dg_class: Optional[str] = None
    un_number: Optional[str] = None
    is_perishable: bool = Field(default=False)
    is_live_animal: bool = Field(default=False)
    is_valuable: bool = Field(default=False)

    # Other charges breakdown (JSON)
    other_charges: Optional[str] = None  # JSON array

    # Accounting info
    accounting_info: Optional[str] = None

    # Signatures
    shipper_signature: Optional[str] = None
    carrier_signature: Optional[str] = None
    execution_signature: Optional[str] = None

    # File
    awb_file: Optional[str] = None

    # Notes
    remarks: Optional[str] = None
    internal_notes: Optional[str] = None

    # Consolidation
    consolidation_id: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
