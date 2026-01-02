from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import date as date_type
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class EmptyReturn(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Empty Container Return (Hạ rỗng)
    Only applies to orders from PORT locations

    Quy trình tài xế:
    1. Upload Phiếu hạ rỗng (return_slip_image)
    2. Upload Phiếu thu (fee_receipt_image) - phí vệ sinh, nâng hạ, lưu bãi...
    3. Upload Phiếu thu cược sửa chữa (repair_deposit_image)
    4. Nhập số tiền từng mục đã thanh toán
    """
    __tablename__ = "empty_returns"

    # Link to Order
    order_id: str = Field(foreign_key="orders.id", index=True, nullable=False)

    # Main fields
    return_date: Optional[date_type] = Field(default=None, index=True)  # Ngày hạ rỗng
    port_site_id: Optional[str] = Field(default=None, foreign_key="sites.id", index=True)  # Cảng hạ (Site)

    # === HÌNH ẢNH CHỨNG TỪ ===
    # Phiếu hạ rỗng (bắt buộc)
    return_slip_image: Optional[str] = Field(default=None)  # URL ảnh phiếu hạ rỗng

    # Phiếu thu (các loại phí)
    fee_receipt_image: Optional[str] = Field(default=None)  # URL ảnh phiếu thu phí

    # Phiếu thu cược sửa chữa
    repair_deposit_image: Optional[str] = Field(default=None)  # URL ảnh phiếu cược sửa chữa

    # === CHI TIẾT PHÍ ===
    # Phí vệ sinh container
    cleaning_fee: int = Field(default=0)  # Phí vệ sinh
    cleaning_fee_paid: int = Field(default=0)  # Đã thanh toán phí vệ sinh

    # Phí nâng hạ
    lift_fee: int = Field(default=0)  # Phí nâng hạ
    lift_fee_paid: int = Field(default=0)  # Đã thanh toán phí nâng hạ

    # Phí lưu bãi
    storage_fee: int = Field(default=0)  # Phí lưu bãi
    storage_fee_paid: int = Field(default=0)  # Đã thanh toán phí lưu bãi

    # Phí sửa chữa / cược sửa chữa
    repair_fee: int = Field(default=0)  # Phí/cược sửa chữa
    repair_fee_paid: int = Field(default=0)  # Đã thanh toán phí sửa chữa

    # Phí khác
    other_fee: int = Field(default=0)  # Phí khác
    other_fee_paid: int = Field(default=0)  # Đã thanh toán phí khác
    other_fee_note: Optional[str] = Field(default=None)  # Ghi chú phí khác

    # Tổng tiền (tự động tính hoặc nhập)
    total_amount: int = Field(default=0)  # Tổng tiền phải trả
    total_paid: int = Field(default=0)  # Tổng tiền đã thanh toán

    # === THÔNG TIN BỔ SUNG ===
    payer: Optional[str] = Field(default=None)  # Người chi trả (COMPANY, DRIVER, CUSTOMER)
    seal_number: Optional[str] = Field(default=None)  # Số seal
    return_location: Optional[str] = Field(default=None)  # Địa điểm hạ cụ thể
    notes: Optional[str] = Field(default=None)  # Ghi chú

    # Legacy fields (giữ để tương thích)
    return_slip: Optional[str] = Field(default=None)  # Phiếu hạ rỗng (legacy)
    invoice: Optional[str] = Field(default=None)  # Hóa đơn (legacy)
    cleaning_receipt: Optional[str] = Field(default=None)  # Phiếu thu vệ sinh (legacy)

    # Status
    status: str = Field(default="PENDING", index=True)  # PENDING, SUBMITTED, CONFIRMED, COMPLETED, CANCELLED
    # PENDING: Chờ tài xế xử lý
    # SUBMITTED: Tài xế đã submit, chờ xác nhận
    # CONFIRMED: Đã xác nhận
    # COMPLETED: Hoàn thành
    # CANCELLED: Đã hủy
