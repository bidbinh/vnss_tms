from __future__ import annotations

from typing import Optional
from sqlmodel import SQLModel, Field
from enum import Enum
from .base import BaseUUIDModel, TimestampMixin


class TenantType(str, Enum):
    """Type of logistics business"""
    CARRIER = "CARRIER"              # Công ty vận tải
    SHIPPER = "SHIPPER"              # Chủ hàng
    FORWARDER = "FORWARDER"          # Công ty giao nhận
    PORT = "PORT"                    # Cảng biển
    ICD = "ICD"                      # Cảng cạn/ICD
    DEPOT = "DEPOT"                  # Depot container
    EXPRESS = "EXPRESS"              # Chuyển phát nhanh
    WAREHOUSE = "WAREHOUSE"          # Kho hàng 3PL
    MIXED = "MIXED"                  # Đa ngành


class SubscriptionPlan(str, Enum):
    """Subscription plans"""
    FREE = "FREE"
    STARTER = "STARTER"
    PRO = "PRO"
    ENTERPRISE = "ENTERPRISE"


class SubscriptionStatus(str, Enum):
    """Subscription status"""
    ACTIVE = "ACTIVE"
    TRIAL = "TRIAL"
    EXPIRED = "EXPIRED"
    SUSPENDED = "SUSPENDED"


class DeploymentType(str, Enum):
    """Deployment options"""
    CLOUD = "CLOUD"              # SaaS multi-tenant
    DEDICATED = "DEDICATED"      # Dedicated cloud instance
    ON_PREMISE = "ON_PREMISE"    # Self-hosted


class Tenant(BaseUUIDModel, TimestampMixin, SQLModel, table=True):
    __tablename__ = "tenants"

    # Basic Info
    name: str = Field(index=True, nullable=False)
    code: str = Field(index=True, unique=True, nullable=False)  # abc.9log.tech → code = 'abc'
    type: str = Field(default=TenantType.CARRIER.value, index=True)

    # Business Info
    tax_code: Optional[str] = Field(default=None, index=True)
    business_registration: Optional[str] = Field(default=None)
    legal_name: Optional[str] = Field(default=None)

    # Contact
    email: Optional[str] = Field(default=None)
    phone: Optional[str] = Field(default=None)
    website: Optional[str] = Field(default=None)

    # Address
    address: Optional[str] = Field(default=None)
    city: Optional[str] = Field(default=None)
    province: Optional[str] = Field(default=None)
    country: str = Field(default="VN")
    postal_code: Optional[str] = Field(default=None)

    # Branding
    logo_url: Optional[str] = Field(default=None)
    primary_color: Optional[str] = Field(default=None)  # hex color

    # Subscription & Billing
    subscription_plan: str = Field(default=SubscriptionPlan.FREE.value, index=True)
    subscription_status: str = Field(default=SubscriptionStatus.ACTIVE.value, index=True)
    trial_ends_at: Optional[str] = Field(default=None)
    subscription_ends_at: Optional[str] = Field(default=None)

    # Module Access (JSON array of enabled modules)
    # ["tms", "wms", "fms", "pms", "ems", "crm", "hrm", "accounting"]
    enabled_modules: str = Field(default='["tms"]')

    # Settings (JSON)
    settings_json: Optional[str] = Field(default=None)
    timezone: str = Field(default="Asia/Ho_Chi_Minh")
    currency: str = Field(default="VND")
    locale: str = Field(default="vi-VN")

    # Deployment
    deployment_type: str = Field(default=DeploymentType.CLOUD.value)
    custom_domain: Optional[str] = Field(default=None)  # for on-premise: erp.customer.com

    # Status
    is_active: bool = Field(default=True, index=True)


class TenantModule(BaseUUIDModel, TimestampMixin, SQLModel, table=True):
    """Detailed module configuration per tenant"""
    __tablename__ = "tenant_modules"

    tenant_id: str = Field(index=True, nullable=False, foreign_key="tenants.id")

    # Module
    module_code: str = Field(index=True, nullable=False)  # tms, wms, fms, pms, ems, crm, hrm, accounting
    is_enabled: bool = Field(default=False)
    enabled_at: Optional[str] = Field(default=None)
    disabled_at: Optional[str] = Field(default=None)

    # Subscription
    subscription_type: Optional[str] = Field(default=None)  # MONTHLY, YEARLY, LIFETIME
    price_per_month: Optional[float] = Field(default=None)

    # Usage limits
    max_users: Optional[int] = Field(default=None)
    max_records: Optional[int] = Field(default=None)  # e.g., max orders per month

    # Module-specific settings (JSON)
    settings_json: Optional[str] = Field(default=None)
