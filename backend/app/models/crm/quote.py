"""
CRM - Quote Models
Quotations for Opportunities
"""
from typing import Optional
from sqlmodel import SQLModel, Field
from enum import Enum
from datetime import datetime
from app.models.base import BaseUUIDModel, TenantScoped


class QuoteStatus(str, Enum):
    """Trạng thái báo giá"""
    DRAFT = "DRAFT"             # Nháp
    SENT = "SENT"               # Đã gửi
    VIEWED = "VIEWED"           # Đã xem
    ACCEPTED = "ACCEPTED"       # Chấp nhận
    REJECTED = "REJECTED"       # Từ chối
    EXPIRED = "EXPIRED"         # Hết hạn
    REVISED = "REVISED"         # Đã sửa đổi


class ServiceCategory(str, Enum):
    """Danh mục dịch vụ chính"""
    TMS = "TMS"                 # Transport Management System - Vận tải
    WMS = "WMS"                 # Warehouse Management System - Kho bãi
    FMS = "FMS"                 # Fleet Management System - Quản lý đội xe
    CUSTOMS = "CUSTOMS"         # Customs Clearance - Thủ tục hải quan
    FREIGHT = "FREIGHT"         # Freight Forwarding - Giao nhận vận tải
    VALUE_ADDED = "VALUE_ADDED" # Value Added Services - Dịch vụ giá trị gia tăng
    OTHER = "OTHER"             # Khác


class Quote(BaseUUIDModel, TenantScoped, SQLModel, table=True):
    """Báo giá"""
    __tablename__ = "crm_quotes"

    # Quote Info
    quote_number: str = Field(index=True, nullable=False)  # BG-2024-001
    version: int = Field(default=1)  # Phiên bản báo giá
    parent_quote_id: Optional[str] = Field(default=None, foreign_key="crm_quotes.id")

    # Related Records
    account_id: str = Field(foreign_key="crm_accounts.id", nullable=False, index=True)
    contact_id: Optional[str] = Field(default=None, foreign_key="crm_contacts.id")
    opportunity_id: Optional[str] = Field(default=None, foreign_key="crm_opportunities.id", index=True)

    # Status
    status: str = Field(default=QuoteStatus.DRAFT.value, index=True)

    # Pricing
    subtotal: float = Field(default=0)  # Tổng trước thuế
    discount_percent: float = Field(default=0)
    discount_amount: float = Field(default=0)
    tax_percent: float = Field(default=10)  # VAT
    tax_amount: float = Field(default=0)
    total_amount: float = Field(default=0)  # Tổng sau thuế
    currency: str = Field(default="VND")

    # Dates
    valid_until: Optional[str] = Field(default=None)  # Hiệu lực đến

    # Terms
    payment_terms: Optional[str] = Field(default=None)
    delivery_terms: Optional[str] = Field(default=None)
    terms_conditions: Optional[str] = Field(default=None)

    # Tracking
    sent_at: Optional[str] = Field(default=None)
    viewed_at: Optional[str] = Field(default=None)
    accepted_at: Optional[str] = Field(default=None)
    rejection_reason: Optional[str] = Field(default=None)

    # Notes
    notes: Optional[str] = Field(default=None)

    # Audit
    created_by: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class QuoteItem(TenantScoped, SQLModel, table=True):
    """Chi tiết dòng báo giá"""
    __tablename__ = "crm_quote_items"

    id: str = Field(primary_key=True)
    quote_id: str = Field(foreign_key="crm_quotes.id", nullable=False, index=True)

    # Item Info
    line_number: int = Field(default=1)
    service_category: str = Field(default=ServiceCategory.TMS.value, index=True)  # TMS, WMS, FMS, CUSTOMS...
    service_type: Optional[str] = Field(default=None)  # FTL, LTL, FCL, LCL (cho TMS), STORAGE, HANDLING (cho WMS)...
    description: Optional[str] = Field(default=None)

    # For TMS - Transport Services
    route: Optional[str] = Field(default=None)  # HCM - HN
    container_type: Optional[str] = Field(default=None)  # 20DC, 40DC, 40HC
    vehicle_type: Optional[str] = Field(default=None)  # Xe tải 5T, 10T, 15T...

    # For WMS - Warehouse Services
    warehouse_id: Optional[str] = Field(default=None)  # FK to wms_warehouses.id when WMS module ready
    storage_type: Optional[str] = Field(default=None)  # PALLET, CBM, CONTAINER
    handling_type: Optional[str] = Field(default=None)  # INBOUND, OUTBOUND, CROSS_DOCK

    # For FMS - Fleet Services
    fleet_service: Optional[str] = Field(default=None)  # LEASE, MAINTENANCE, TRACKING

    # For Customs
    customs_type: Optional[str] = Field(default=None)  # IMPORT, EXPORT, TRANSIT

    # Quantity & Pricing
    quantity: float = Field(default=1)
    unit: Optional[str] = Field(default=None)  # Trip, Container, Kg, CBM, Pallet, Day, Month
    unit_price: float = Field(default=0)
    discount_percent: float = Field(default=0)

    notes: Optional[str] = Field(default=None)

    # Timestamp
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
