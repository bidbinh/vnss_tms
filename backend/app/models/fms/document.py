"""
FMS Document Model - Document management for forwarding
Quản lý chứng từ giao nhận
"""
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime, date
from enum import Enum
import uuid


class DocumentType(str, Enum):
    """Loại chứng từ"""
    # Commercial documents
    INVOICE = "INVOICE"  # Hóa đơn thương mại
    PACKING_LIST = "PACKING_LIST"  # Phiếu đóng gói
    PROFORMA_INVOICE = "PROFORMA_INVOICE"  # Hóa đơn tạm
    CONTRACT = "CONTRACT"  # Hợp đồng
    PURCHASE_ORDER = "PURCHASE_ORDER"  # Đơn đặt hàng

    # Transport documents
    BILL_OF_LADING = "BILL_OF_LADING"  # Vận đơn đường biển
    HOUSE_BL = "HOUSE_BL"  # House B/L
    MASTER_BL = "MASTER_BL"  # Master B/L
    AIRWAY_BILL = "AIRWAY_BILL"  # Vận đơn hàng không
    HOUSE_AWB = "HOUSE_AWB"  # House AWB
    MASTER_AWB = "MASTER_AWB"  # Master AWB
    SEA_WAYBILL = "SEA_WAYBILL"  # Sea Waybill
    DELIVERY_ORDER = "DELIVERY_ORDER"  # Lệnh giao hàng (D/O)
    CMR = "CMR"  # CMR (Road)
    RAIL_WAYBILL = "RAIL_WAYBILL"  # Vận đơn đường sắt

    # Customs documents
    CUSTOMS_DECLARATION = "CUSTOMS_DECLARATION"  # Tờ khai hải quan
    E_MANIFEST = "E_MANIFEST"  # E-Manifest
    IMPORT_LICENSE = "IMPORT_LICENSE"  # Giấy phép nhập khẩu
    EXPORT_LICENSE = "EXPORT_LICENSE"  # Giấy phép xuất khẩu

    # Origin documents
    CERTIFICATE_OF_ORIGIN = "CERTIFICATE_OF_ORIGIN"  # C/O
    CO_FORM_A = "CO_FORM_A"
    CO_FORM_D = "CO_FORM_D"
    CO_FORM_E = "CO_FORM_E"
    EUR1 = "EUR1"

    # Quality documents
    INSPECTION_CERT = "INSPECTION_CERT"  # Giấy chứng nhận kiểm tra
    QUALITY_CERT = "QUALITY_CERT"  # Chứng nhận chất lượng
    HEALTH_CERT = "HEALTH_CERT"  # Giấy chứng nhận sức khỏe
    PHYTOSANITARY_CERT = "PHYTOSANITARY_CERT"  # Giấy kiểm dịch thực vật
    FUMIGATION_CERT = "FUMIGATION_CERT"  # Giấy hun trùng
    VETERINARY_CERT = "VETERINARY_CERT"  # Giấy kiểm dịch động vật

    # Insurance documents
    INSURANCE_POLICY = "INSURANCE_POLICY"  # Đơn bảo hiểm
    INSURANCE_CERT = "INSURANCE_CERT"  # Giấy chứng nhận bảo hiểm

    # Container documents
    EIR = "EIR"  # Equipment Interchange Receipt
    VGM = "VGM"  # Verified Gross Mass
    CONTAINER_PACKING_LIST = "CONTAINER_PACKING_LIST"  # Biên bản đóng hàng

    # Dangerous goods
    DG_DECLARATION = "DG_DECLARATION"  # Khai báo hàng nguy hiểm
    MSDS = "MSDS"  # Material Safety Data Sheet

    # Proof of delivery
    POD = "POD"  # Proof of Delivery
    DELIVERY_RECEIPT = "DELIVERY_RECEIPT"  # Biên nhận giao hàng

    # Financial documents
    DEBIT_NOTE = "DEBIT_NOTE"  # Phiếu ghi nợ
    CREDIT_NOTE = "CREDIT_NOTE"  # Phiếu ghi có
    QUOTATION = "QUOTATION"  # Báo giá
    TAX_INVOICE = "TAX_INVOICE"  # Hóa đơn thuế

    # Other
    CORRESPONDENCE = "CORRESPONDENCE"  # Thư từ
    PHOTO = "PHOTO"  # Hình ảnh
    OTHER = "OTHER"  # Khác


class FMSDocument(SQLModel, table=True):
    """
    FMS Document - Chứng từ giao nhận
    """
    __tablename__ = "fms_documents"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Liên kết
    shipment_id: Optional[str] = Field(default=None, index=True)
    container_id: Optional[str] = None
    bl_id: Optional[str] = None
    awb_id: Optional[str] = None
    quotation_id: Optional[str] = None
    customs_id: Optional[str] = None

    # Document info
    document_type: str = Field(default=DocumentType.OTHER.value)
    document_no: Optional[str] = None
    document_name: str
    description: Optional[str] = None

    # Date
    document_date: Optional[date] = None
    expiry_date: Optional[date] = None
    received_date: Optional[date] = None

    # File
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None  # bytes
    file_type: Optional[str] = None  # pdf, doc, jpg, etc.
    mime_type: Optional[str] = None

    # Status
    status: str = Field(default="ACTIVE")  # DRAFT, ACTIVE, ARCHIVED, DELETED
    is_original: bool = Field(default=False)  # Bản gốc hay bản sao
    original_count: int = Field(default=0)  # Số bản gốc
    copy_count: int = Field(default=0)  # Số bản sao

    # Tracking
    is_received: bool = Field(default=False)
    received_by: Optional[str] = None
    is_sent: bool = Field(default=False)
    sent_to: Optional[str] = None
    sent_date: Optional[datetime] = None
    sent_by: Optional[str] = None
    tracking_no: Optional[str] = None  # Mã vận đơn gửi chứng từ

    # Visibility
    is_visible_to_customer: bool = Field(default=False)
    is_visible_to_agent: bool = Field(default=False)

    # Verification
    is_verified: bool = Field(default=False)
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None

    # Tags
    tags: Optional[str] = None  # JSON array of tags

    # Notes
    notes: Optional[str] = None
    internal_notes: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    # Soft delete
    is_deleted: bool = Field(default=False)
    deleted_at: Optional[datetime] = None
    deleted_by: Optional[str] = None
