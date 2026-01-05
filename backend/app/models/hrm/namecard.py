"""
HRM - Employee Name Card
Public shareable employee card with random secure URL
"""
from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field
import secrets
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


def generate_secure_token() -> str:
    """Generate a random 16-character URL-safe token"""
    return secrets.token_urlsafe(12)  # ~16 characters


class EmployeeNameCard(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Name Card công khai của nhân viên
    Link dạng random token để bảo mật (không theo cấu trúc cố định)
    """
    __tablename__ = "hrm_employee_namecards"

    employee_id: str = Field(foreign_key="hrm_employees.id", nullable=False, index=True, unique=True)

    # Secure random token for public URL
    # URL: /namecard/{token}
    token: str = Field(
        default_factory=generate_secure_token,
        index=True,
        unique=True,
        nullable=False,
        max_length=50
    )

    # Card settings
    is_active: bool = Field(default=True, index=True)

    # Which fields to show publicly
    show_phone: bool = Field(default=True)
    show_email: bool = Field(default=True)
    show_department: bool = Field(default=True)
    show_position: bool = Field(default=True)
    show_avatar: bool = Field(default=True)

    # Social links visibility
    show_zalo: bool = Field(default=True)
    show_facebook: bool = Field(default=False)
    show_linkedin: bool = Field(default=False)
    show_website: bool = Field(default=False)

    # Custom theme (for future customization)
    # None = use company default, otherwise use custom theme
    custom_theme: Optional[str] = Field(default=None, max_length=50)

    # QR code image URL (auto-generated)
    qr_code_url: Optional[str] = Field(default=None, max_length=500)

    # View statistics
    view_count: int = Field(default=0)
    last_viewed_at: Optional[datetime] = Field(default=None)

    # Generated/regenerated timestamps
    token_generated_at: datetime = Field(default_factory=datetime.utcnow)


class NameCardTemplate(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Template thiết kế Name Card cho công ty
    Mỗi tenant có thể có 1 template default và nhiều template custom
    """
    __tablename__ = "hrm_namecard_templates"

    name: str = Field(nullable=False, max_length=100)
    code: str = Field(nullable=False, max_length=50, index=True)  # 'default', 'modern', 'minimal'...

    is_default: bool = Field(default=False, index=True)
    is_active: bool = Field(default=True)

    # Theme colors
    primary_color: str = Field(default="#1a1a1a", max_length=20)
    secondary_color: str = Field(default="#4a5568", max_length=20)
    accent_color: str = Field(default="#3b82f6", max_length=20)
    background_color: str = Field(default="#ffffff", max_length=20)
    text_color: str = Field(default="#1a1a1a", max_length=20)

    # Layout options
    layout: str = Field(default="modern", max_length=50)  # 'modern', 'classic', 'minimal', 'card'
    show_company_logo: bool = Field(default=True)
    show_qr_code: bool = Field(default=True)

    # Company info to show on card
    company_tagline: Optional[str] = Field(default=None, max_length=255)
    company_website: Optional[str] = Field(default=None, max_length=255)

    # Custom CSS (advanced)
    custom_css: Optional[str] = Field(default=None)
