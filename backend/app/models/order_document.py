from __future__ import annotations
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field, UniqueConstraint
from .base import BaseUUIDModel, TimestampMixin, TenantScoped


class OrderDocument(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Chứng từ đơn hàng - lưu file upload"""
    __tablename__ = "order_documents"
    __table_args__ = (
        UniqueConstraint("tenant_id", "order_id", "doc_type", "file_path", name="uq_order_doc_file"),
    )

    order_id: str = Field(index=True, nullable=False, foreign_key="orders.id")

    # Loại chứng từ
    # CONTAINER_RECEIPT: Phiếu giao nhận container
    # DO: Delivery Order
    # HANDOVER_REPORT: Biên bản bàn giao hàng
    # SEAL_PHOTO: Ảnh seal
    # OTHER: Khác
    doc_type: str = Field(index=True, nullable=False)

    # Thông tin file
    original_name: str = Field(nullable=False)
    content_type: str = Field(nullable=False)
    size_bytes: int = Field(nullable=False)
    file_path: str = Field(nullable=False)  # path tương đối trong storage

    uploaded_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    uploaded_by: Optional[str] = Field(default=None, nullable=True)  # user_id

    note: Optional[str] = Field(default=None)
