"""
FMS Container Model - Container management for sea freight
"""
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime, date
from enum import Enum
import uuid


class ContainerType(str, Enum):
    """Loại container"""
    DRY = "DRY"  # Container khô
    REEFER = "REEFER"  # Container lạnh
    OPEN_TOP = "OPEN_TOP"  # Container mở nóc
    FLAT_RACK = "FLAT_RACK"  # Container sàn phẳng
    TANK = "TANK"  # Container bồn
    SPECIAL = "SPECIAL"  # Container đặc biệt


class ContainerSize(str, Enum):
    """Kích thước container"""
    C20GP = "20GP"  # 20ft General Purpose
    C20HC = "20HC"  # 20ft High Cube
    C40GP = "40GP"  # 40ft General Purpose
    C40HC = "40HC"  # 40ft High Cube
    C45HC = "45HC"  # 45ft High Cube
    C20RF = "20RF"  # 20ft Reefer
    C40RF = "40RF"  # 40ft Reefer
    C20OT = "20OT"  # 20ft Open Top
    C40OT = "40OT"  # 40ft Open Top
    C20FR = "20FR"  # 20ft Flat Rack
    C40FR = "40FR"  # 40ft Flat Rack


class ContainerStatus(str, Enum):
    """Trạng thái container"""
    EMPTY = "EMPTY"  # Container rỗng
    LOADING = "LOADING"  # Đang đóng hàng
    LOADED = "LOADED"  # Đã đóng hàng
    GATE_IN = "GATE_IN"  # Đã vào cảng
    ON_VESSEL = "ON_VESSEL"  # Trên tàu
    DISCHARGED = "DISCHARGED"  # Đã dỡ
    GATE_OUT = "GATE_OUT"  # Đã ra cảng
    DELIVERED = "DELIVERED"  # Đã giao
    RETURNED = "RETURNED"  # Đã trả rỗng


class FMSContainer(SQLModel, table=True):
    """
    FMS Container - Quản lý container trong lô hàng
    """
    __tablename__ = "fms_containers"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Liên kết với shipment
    shipment_id: str = Field(index=True)

    # Container identification
    container_no: str = Field(index=True)  # MSKU1234567
    seal_no: Optional[str] = None  # Số seal
    second_seal_no: Optional[str] = None  # Seal phụ

    # Container specs
    container_type: str = Field(default=ContainerType.DRY.value)
    container_size: str = Field(default=ContainerSize.C20GP.value)
    status: str = Field(default=ContainerStatus.EMPTY.value)

    # Tare weight (kg)
    tare_weight: float = Field(default=0)

    # Cargo info
    package_qty: int = Field(default=0)
    gross_weight: float = Field(default=0)  # KG
    net_weight: float = Field(default=0)  # KG
    volume: float = Field(default=0)  # CBM
    vgm: Optional[float] = None  # Verified Gross Mass

    # Temperature (for reefer)
    is_reefer: bool = Field(default=False)
    temperature: Optional[float] = None  # Celsius
    humidity: Optional[float] = None  # %
    ventilation: Optional[str] = None  # Open/Close %

    # Dangerous Goods
    is_dg: bool = Field(default=False)  # Hàng nguy hiểm
    dg_class: Optional[str] = None  # UN Class
    un_number: Optional[str] = None  # UN Number
    dg_description: Optional[str] = None

    # Overweight/Oversize
    is_oog: bool = Field(default=False)  # Out of Gauge
    oog_front: Optional[float] = None  # cm
    oog_back: Optional[float] = None
    oog_left: Optional[float] = None
    oog_right: Optional[float] = None
    oog_top: Optional[float] = None

    # Tracking dates
    empty_pickup_date: Optional[datetime] = None  # Ngày lấy container rỗng
    stuffing_date: Optional[datetime] = None  # Ngày đóng hàng
    gate_in_date: Optional[datetime] = None  # Ngày vào cảng
    loaded_date: Optional[datetime] = None  # Ngày xếp lên tàu
    discharged_date: Optional[datetime] = None  # Ngày dỡ xuống
    gate_out_date: Optional[datetime] = None  # Ngày ra cảng
    delivery_date: Optional[datetime] = None  # Ngày giao hàng
    empty_return_date: Optional[datetime] = None  # Ngày trả rỗng

    # Depot/Terminal info
    pickup_depot: Optional[str] = None  # Bãi lấy container rỗng
    stuffing_location: Optional[str] = None  # Địa điểm đóng hàng
    origin_terminal: Optional[str] = None  # Cảng đi
    destination_terminal: Optional[str] = None  # Cảng đến
    return_depot: Optional[str] = None  # Bãi trả rỗng

    # Trucking info
    pickup_trucker_id: Optional[str] = None
    delivery_trucker_id: Optional[str] = None

    # Costs
    detention_days: int = Field(default=0)  # Ngày lưu cont
    demurrage_days: int = Field(default=0)  # Ngày lưu bãi
    storage_days: int = Field(default=0)
    detention_cost: float = Field(default=0)
    demurrage_cost: float = Field(default=0)
    storage_cost: float = Field(default=0)

    # Free time
    free_detention_days: int = Field(default=0)
    free_demurrage_days: int = Field(default=0)

    # Related to TMS (nội địa)
    tms_order_id: Optional[str] = None
    tms_trip_id: Optional[str] = None

    # Notes
    remarks: Optional[str] = None

    # Documents
    eir_pickup_file: Optional[str] = None  # EIR lấy rỗng
    eir_return_file: Optional[str] = None  # EIR trả rỗng
    packing_list_file: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
