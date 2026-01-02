"""
FMS Bill of Lading Model - Sea freight documentation
Supports: Master BL (MBL), House BL (HBL)
"""
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime, date
from enum import Enum
import uuid


class BLType(str, Enum):
    """Loại Bill of Lading"""
    MASTER = "MASTER"  # Master BL - do hãng tàu phát hành
    HOUSE = "HOUSE"  # House BL - do forwarder phát hành
    SEAWAY = "SEAWAY"  # Seaway Bill (non-negotiable)
    EXPRESS = "EXPRESS"  # Express BL (Surrendered)


class BLStatus(str, Enum):
    """Trạng thái BL"""
    DRAFT = "DRAFT"  # Bản nháp
    PENDING = "PENDING"  # Chờ xác nhận
    ISSUED = "ISSUED"  # Đã phát hành
    AMENDED = "AMENDED"  # Đã chỉnh sửa
    SURRENDERED = "SURRENDERED"  # Đã surrender
    RELEASED = "RELEASED"  # Đã release
    CANCELLED = "CANCELLED"  # Đã hủy


class FreightTerms(str, Enum):
    """Điều kiện cước"""
    PREPAID = "PREPAID"  # Cước trả trước
    COLLECT = "COLLECT"  # Cước trả sau
    PREPAID_AT_ORIGIN = "PREPAID_AT_ORIGIN"
    PAYABLE_AT_DEST = "PAYABLE_AT_DEST"


class BillOfLading(SQLModel, table=True):
    """
    Bill of Lading - Vận đơn đường biển
    """
    __tablename__ = "fms_bills_of_lading"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Liên kết shipment
    shipment_id: str = Field(index=True)

    # BL Info
    bl_no: str = Field(index=True)  # Số BL
    bl_type: str = Field(default=BLType.HOUSE.value)
    status: str = Field(default=BLStatus.DRAFT.value)

    # Master BL reference (for House BL)
    master_bl_id: Optional[str] = None  # Link to Master BL
    master_bl_no: Optional[str] = None

    # Parties
    shipper_name: Optional[str] = None
    shipper_address: Optional[str] = None

    consignee_name: Optional[str] = None
    consignee_address: Optional[str] = None

    notify_party_name: Optional[str] = None
    notify_party_address: Optional[str] = None

    also_notify_name: Optional[str] = None
    also_notify_address: Optional[str] = None

    # Vessel/Voyage
    vessel_name: Optional[str] = None
    voyage_no: Optional[str] = None
    flag: Optional[str] = None  # Quốc tịch tàu

    # Pre-carriage
    pre_carriage_by: Optional[str] = None
    place_of_receipt: Optional[str] = None  # Nơi nhận hàng

    # Main carriage
    port_of_loading: Optional[str] = None
    port_of_loading_name: Optional[str] = None
    port_of_discharge: Optional[str] = None
    port_of_discharge_name: Optional[str] = None

    # On-carriage
    place_of_delivery: Optional[str] = None  # Nơi giao hàng
    final_destination: Optional[str] = None

    # Dates
    date_of_issue: Optional[date] = None
    shipped_on_board_date: Optional[date] = None
    bl_release_date: Optional[date] = None

    # Place of issue
    place_of_issue: Optional[str] = None
    place_of_bl_release: Optional[str] = None

    # Cargo description
    marks_and_numbers: Optional[str] = None  # Ký mã hiệu
    description_of_goods: Optional[str] = None
    commodity_code: Optional[str] = None  # HS Code

    # Packages
    number_of_packages: int = Field(default=0)
    kind_of_packages: Optional[str] = None  # Carton, Pallet, etc.

    # Weight/Volume
    gross_weight: float = Field(default=0)  # KG
    gross_weight_unit: str = Field(default="KGS")
    measurement: float = Field(default=0)  # CBM
    measurement_unit: str = Field(default="CBM")

    # Container details (stored as JSON or separate table)
    container_details: Optional[str] = None  # JSON array of containers

    # Freight & Charges
    freight_terms: str = Field(default=FreightTerms.PREPAID.value)
    freight_payable_at: Optional[str] = None
    number_of_original_bls: int = Field(default=3)
    prepaid_amount: float = Field(default=0)
    collect_amount: float = Field(default=0)

    # Exchange rate
    exchange_rate: Optional[float] = None

    # Declared value
    declared_value: Optional[float] = None
    declared_value_currency: Optional[str] = None

    # Special clauses
    clauses: Optional[str] = None
    additional_info: Optional[str] = None

    # Carrier info
    carrier_name: Optional[str] = None
    carrier_address: Optional[str] = None
    carrier_agent: Optional[str] = None

    # Signing
    signed_by: Optional[str] = None
    signed_as: Optional[str] = None  # "As Agent for Carrier"

    # Document handling
    original_count: int = Field(default=3)  # Số bản gốc
    copy_count: int = Field(default=3)  # Số bản sao

    # Release info
    released_to: Optional[str] = None
    release_date: Optional[datetime] = None
    release_by: Optional[str] = None

    # Surrender
    is_surrendered: bool = Field(default=False)
    surrendered_date: Optional[datetime] = None
    surrendered_at: Optional[str] = None

    # Amendment history
    is_amended: bool = Field(default=False)
    amendment_count: int = Field(default=0)
    last_amendment_date: Optional[datetime] = None
    amendment_notes: Optional[str] = None

    # File attachments
    bl_file: Optional[str] = None  # PDF file path
    draft_bl_file: Optional[str] = None

    # Notes
    internal_notes: Optional[str] = None
    shipper_instructions: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
