"""
FMS Consolidation Model - LCL/Air consolidation management
Quản lý hàng ghép container (LCL) và hàng ghép máy bay
"""
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime, date
from enum import Enum
import uuid


class ConsolidationType(str, Enum):
    """Loại consolidation"""
    LCL = "LCL"  # Hàng lẻ đường biển
    AIR = "AIR"  # Hàng lẻ hàng không
    EXPRESS = "EXPRESS"  # Chuyển phát nhanh


class ConsolidationStatus(str, Enum):
    """Trạng thái consolidation"""
    OPEN = "OPEN"  # Đang mở nhận hàng
    CLOSED = "CLOSED"  # Đã đóng
    LOADING = "LOADING"  # Đang đóng hàng
    LOADED = "LOADED"  # Đã đóng xong
    DEPARTED = "DEPARTED"  # Đã khởi hành
    ARRIVED = "ARRIVED"  # Đã đến
    DECONSOLIDATED = "DECONSOLIDATED"  # Đã dỡ hàng/tách lô
    COMPLETED = "COMPLETED"  # Hoàn thành
    CANCELLED = "CANCELLED"  # Đã hủy


class Consolidation(SQLModel, table=True):
    """
    Consolidation - Lô hàng ghép (LCL/Air Consol)
    Master shipment chứa nhiều House shipments
    """
    __tablename__ = "fms_consolidations"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Consolidation info
    consol_no: str = Field(index=True)  # CONSOL-2024-00001
    consol_type: str = Field(default="LCL")  # LCL, AIR, EXPRESS
    status: str = Field(default=ConsolidationStatus.OPEN.value)

    # Route
    origin_port: Optional[str] = None
    origin_port_name: Optional[str] = None
    origin_country: Optional[str] = None
    destination_port: Optional[str] = None
    destination_port_name: Optional[str] = None
    destination_country: Optional[str] = None

    # Agent
    origin_agent_id: Optional[str] = None
    origin_agent_name: Optional[str] = None
    destination_agent_id: Optional[str] = None
    destination_agent_name: Optional[str] = None

    # Carrier
    carrier_id: Optional[str] = None
    carrier_name: Optional[str] = None
    carrier_booking_no: Optional[str] = None

    # Vessel/Flight
    vessel_name: Optional[str] = None
    voyage_no: Optional[str] = None
    flight_no: Optional[str] = None

    # Master document
    master_bl_id: Optional[str] = None
    master_bl_no: Optional[str] = None
    master_awb_id: Optional[str] = None
    master_awb_no: Optional[str] = None

    # Container (for LCL)
    container_id: Optional[str] = None
    container_no: Optional[str] = None
    container_type: Optional[str] = None
    seal_no: Optional[str] = None

    # ULD (for Air)
    uld_no: Optional[str] = None
    uld_type: Optional[str] = None

    # Dates
    closing_date: Optional[datetime] = None  # Hạn đóng hàng
    stuffing_date: Optional[date] = None  # Ngày đóng hàng
    etd: Optional[datetime] = None
    eta: Optional[datetime] = None
    atd: Optional[datetime] = None
    ata: Optional[datetime] = None

    # Capacity
    total_pieces: int = Field(default=0)
    total_gross_weight: float = Field(default=0)  # KG
    total_volume: float = Field(default=0)  # CBM
    total_chargeable: float = Field(default=0)

    # Used capacity
    used_pieces: int = Field(default=0)
    used_gross_weight: float = Field(default=0)
    used_volume: float = Field(default=0)

    # Remaining capacity
    remaining_volume: float = Field(default=0)
    remaining_weight: float = Field(default=0)

    # CFS/Warehouse
    cfs_origin: Optional[str] = None  # CFS đóng hàng
    cfs_destination: Optional[str] = None  # CFS dỡ hàng

    # Number of shipments
    shipment_count: int = Field(default=0)

    # Financials
    total_revenue: float = Field(default=0)
    total_cost: float = Field(default=0)
    profit: float = Field(default=0)
    currency_code: str = Field(default="USD")

    # Notes
    remarks: Optional[str] = None
    internal_notes: Optional[str] = None

    # Deconsolidation
    deconsolidated_at: Optional[datetime] = None
    deconsolidated_by: Optional[str] = None

    # Totals (for response compatibility)
    total_packages: int = Field(default=0)
    total_chargeable_weight: float = Field(default=0)

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    # Soft delete
    is_deleted: bool = Field(default=False)
    deleted_at: Optional[datetime] = None
    deleted_by: Optional[str] = None


class ConsolidationItem(SQLModel, table=True):
    """
    Consolidation Item - Mối liên kết Consol -> House Shipment
    """
    __tablename__ = "fms_consolidation_items"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    consolidation_id: str = Field(index=True)
    shipment_id: str = Field(index=True)  # House shipment

    # Item order
    item_no: int = Field(default=1)

    # House document
    house_bl_id: Optional[str] = None
    house_bl_no: Optional[str] = None
    house_awb_id: Optional[str] = None
    house_awb_no: Optional[str] = None

    # Shipper/Consignee
    shipper_name: Optional[str] = None
    consignee_name: Optional[str] = None

    # Cargo
    marks_numbers: Optional[str] = None
    description: Optional[str] = None
    pieces: int = Field(default=0)
    package_type: Optional[str] = None
    gross_weight: float = Field(default=0)
    volume: float = Field(default=0)
    chargeable_weight: float = Field(default=0)

    # Status
    status: str = Field(default="INCLUDED")  # INCLUDED, EXCLUDED, DELIVERED

    # Delivery
    delivery_date: Optional[datetime] = None
    delivered_to: Optional[str] = None
    pod_received: bool = Field(default=False)

    # Notes
    notes: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None

    # Soft delete
    is_deleted: bool = Field(default=False)
    deleted_at: Optional[datetime] = None
    deleted_by: Optional[str] = None
