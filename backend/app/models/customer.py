from typing import Optional
from sqlmodel import SQLModel, Field, UniqueConstraint
from .base import BaseUUIDModel, TimestampMixin, TenantScoped


class Customer(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Khách hàng TMS - dùng cho đặt đơn vận tải"""
    __tablename__ = "customers"
    __table_args__ = (
        UniqueConstraint("tenant_id", "code", name="uq_customers_tenant_code"),
    )

    # === Thông tin cơ bản ===
    code: str = Field(index=True, nullable=False)  # Mã KH: ADG, THP...
    name: str = Field(nullable=False, index=True)  # Tên công ty
    short_name: Optional[str] = Field(default=None, max_length=100)  # Tên viết tắt

    # === Thông tin pháp lý ===
    tax_code: Optional[str] = Field(default=None, index=True, max_length=20)  # Mã số thuế
    business_license: Optional[str] = Field(default=None, max_length=50)  # Số ĐKKD

    # === Thông tin liên hệ ===
    phone: Optional[str] = Field(default=None, max_length=20)
    fax: Optional[str] = Field(default=None, max_length=20)
    email: Optional[str] = Field(default=None, max_length=100)
    website: Optional[str] = Field(default=None, max_length=255)

    # === Địa chỉ ===
    address: Optional[str] = Field(default=None, max_length=500)  # Địa chỉ đầy đủ
    ward: Optional[str] = Field(default=None, max_length=100)  # Phường/Xã
    district: Optional[str] = Field(default=None, max_length=100)  # Quận/Huyện
    city: Optional[str] = Field(default=None, max_length=100)  # Tỉnh/TP
    country: str = Field(default="Việt Nam", max_length=100)

    # === Địa chỉ giao hàng mặc định ===
    shipping_address: Optional[str] = Field(default=None, max_length=500)
    shipping_ward: Optional[str] = Field(default=None, max_length=100)
    shipping_district: Optional[str] = Field(default=None, max_length=100)
    shipping_city: Optional[str] = Field(default=None, max_length=100)

    # === Thông tin tài chính ===
    payment_terms: Optional[str] = Field(default=None, max_length=50)  # COD, NET30, NET60
    credit_limit: float = Field(default=0)  # Hạn mức công nợ
    credit_days: int = Field(default=30)  # Số ngày công nợ
    bank_name: Optional[str] = Field(default=None, max_length=100)
    bank_branch: Optional[str] = Field(default=None, max_length=100)
    bank_account: Optional[str] = Field(default=None, max_length=50)
    bank_account_name: Optional[str] = Field(default=None, max_length=100)

    # === Thông tin kinh doanh ===
    industry: Optional[str] = Field(default=None, max_length=100)  # Ngành nghề SX
    source: Optional[str] = Field(default=None, max_length=100)  # Nguồn khách hàng
    customer_since: Optional[str] = Field(default=None)  # Là KH từ ngày
    assigned_to: Optional[str] = Field(default=None)  # NV phụ trách (user_id)

    # === Thông tin liên hệ chính ===
    contact_name: Optional[str] = Field(default=None, max_length=100)  # Tên người liên hệ
    contact_phone: Optional[str] = Field(default=None, max_length=20)
    contact_email: Optional[str] = Field(default=None, max_length=100)
    contact_position: Optional[str] = Field(default=None, max_length=100)  # Chức vụ

    # === Legacy field - giữ để tương thích ===
    contacts_json: Optional[str] = Field(default=None)  # JSON array of contacts

    # === Ghi chú ===
    notes: Optional[str] = Field(default=None)

    # === Trạng thái ===
    is_active: bool = Field(default=True)

    # === Auto-Accept Configuration (for TMS automation) ===
    auto_accept_enabled: bool = Field(default=False, index=True)  # Enable auto-acceptance for this customer
    auto_accept_confidence_threshold: float = Field(default=90.0)  # Confidence threshold (0-100, default: 90%)
    delay_alert_threshold_minutes: int = Field(default=15)  # Delay threshold for alerts (default: 15 minutes)

    # === CRM Integration ===
    crm_account_id: Optional[str] = Field(default=None, index=True)  # Link to CRM Account
