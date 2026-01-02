"""
CRM - Omnichannel Chat Models
Chat Inbox, Conversations, Messages for multi-channel support
Supports: Zalo OA, Facebook Messenger, WhatsApp Business
"""
from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field
from enum import Enum
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


# ==================== ENUMS ====================

class ChannelType(str, Enum):
    """Loai kenh chat"""
    ZALO_OA = "ZALO_OA"          # Zalo Official Account
    FACEBOOK = "FACEBOOK"        # Facebook Messenger
    WHATSAPP = "WHATSAPP"        # WhatsApp Business
    WEBSITE = "WEBSITE"          # Website live chat
    EMAIL = "EMAIL"              # Email channel
    SMS = "SMS"                  # SMS channel


class ChannelStatus(str, Enum):
    """Trang thai ket noi kenh"""
    ACTIVE = "ACTIVE"            # Dang hoat dong
    DISCONNECTED = "DISCONNECTED"  # Mat ket noi
    PENDING = "PENDING"          # Dang cho xac nhan
    EXPIRED = "EXPIRED"          # Token het han


class ConversationStatus(str, Enum):
    """Trang thai cuoc hoi thoai"""
    OPEN = "OPEN"                # Dang mo
    PENDING = "PENDING"          # Cho phan hoi
    RESOLVED = "RESOLVED"        # Da giai quyet
    CLOSED = "CLOSED"            # Da dong


class MessageDirection(str, Enum):
    """Huong tin nhan"""
    INBOUND = "INBOUND"          # Khach hang gui den
    OUTBOUND = "OUTBOUND"        # Nhan vien gui di


class MessageType(str, Enum):
    """Loai tin nhan"""
    TEXT = "TEXT"
    IMAGE = "IMAGE"
    FILE = "FILE"
    AUDIO = "AUDIO"
    VIDEO = "VIDEO"
    STICKER = "STICKER"
    LOCATION = "LOCATION"
    CONTACT = "CONTACT"
    TEMPLATE = "TEMPLATE"        # Template message (WhatsApp)
    INTERACTIVE = "INTERACTIVE"  # Button/list message
    ORDER = "ORDER"              # Order confirmation
    SYSTEM = "SYSTEM"            # System notification


class MessageStatus(str, Enum):
    """Trang thai tin nhan"""
    PENDING = "PENDING"          # Dang gui
    SENT = "SENT"                # Da gui
    DELIVERED = "DELIVERED"      # Da nhan
    READ = "READ"                # Da doc
    FAILED = "FAILED"            # Gui that bai


class InsightType(str, Enum):
    """Loai customer insight"""
    PRODUCT_INTEREST = "PRODUCT_INTEREST"    # Quan tam san pham
    SERVICE_INTEREST = "SERVICE_INTEREST"    # Quan tam dich vu
    PRICE_SENSITIVITY = "PRICE_SENSITIVITY"  # Nhay cam gia
    PREFERRED_TIME = "PREFERRED_TIME"        # Thoi gian lien lac
    LANGUAGE_STYLE = "LANGUAGE_STYLE"        # Phong cach giao tiep
    SENTIMENT = "SENTIMENT"                  # Cam xuc
    COMPLAINT = "COMPLAINT"                  # Khieu nai
    FEEDBACK = "FEEDBACK"                    # Phan hoi
    PURCHASE_INTENT = "PURCHASE_INTENT"      # Y dinh mua hang


# ==================== MODELS ====================

class ChatChannel(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Cau hinh kenh chat - Zalo OA, FB Messenger, WhatsApp"""
    __tablename__ = "crm_chat_channels"

    # Basic Info
    name: str = Field(nullable=False)  # Ten kenh: "Zalo 9LOG", "FB Messenger"
    channel_type: str = Field(nullable=False, index=True)  # ZALO_OA, FACEBOOK, WHATSAPP

    # Connection Status
    status: str = Field(default=ChannelStatus.PENDING.value, index=True)

    # Channel Identifiers
    channel_id: str = Field(nullable=False, index=True)  # OA ID, Page ID, Phone Number ID
    channel_name: Optional[str] = Field(default=None)    # Official name from platform

    # Authentication
    access_token: Optional[str] = Field(default=None)    # OAuth Access Token
    refresh_token: Optional[str] = Field(default=None)   # Refresh Token
    token_expires_at: Optional[datetime] = Field(default=None)

    # Platform-specific IDs
    # Zalo OA
    zalo_oa_id: Optional[str] = Field(default=None)
    zalo_app_id: Optional[str] = Field(default=None)

    # Facebook
    fb_page_id: Optional[str] = Field(default=None)
    fb_app_id: Optional[str] = Field(default=None)

    # WhatsApp
    wa_phone_number_id: Optional[str] = Field(default=None)
    wa_business_account_id: Optional[str] = Field(default=None)

    # Webhook
    webhook_url: Optional[str] = Field(default=None)
    webhook_secret: Optional[str] = Field(default=None)
    webhook_verified: bool = Field(default=False)

    # Settings
    auto_reply_enabled: bool = Field(default=True)
    auto_reply_message: Optional[str] = Field(default=None)
    working_hours_only: bool = Field(default=False)
    working_hours_start: Optional[str] = Field(default=None)  # "08:00"
    working_hours_end: Optional[str] = Field(default=None)    # "17:00"

    # Assignment
    default_assignee_id: Optional[str] = Field(default=None)  # Default staff
    team_id: Optional[str] = Field(default=None)              # Assign to team

    # Stats
    total_conversations: int = Field(default=0)
    total_messages: int = Field(default=0)

    is_active: bool = Field(default=True)
    created_by: Optional[str] = Field(default=None)


class Conversation(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Cuoc hoi thoai voi khach hang"""
    __tablename__ = "crm_conversations"

    # Channel
    channel_id: str = Field(foreign_key="crm_chat_channels.id", nullable=False, index=True)
    channel_type: str = Field(nullable=False, index=True)  # Denormalized for quick filtering

    # Customer Identity on Channel
    customer_channel_id: str = Field(nullable=False, index=True)  # User ID on platform
    customer_name: Optional[str] = Field(default=None)
    customer_avatar: Optional[str] = Field(default=None)
    customer_phone: Optional[str] = Field(default=None)  # If available

    # CRM Link
    account_id: Optional[str] = Field(default=None, foreign_key="crm_accounts.id", index=True)
    contact_id: Optional[str] = Field(default=None, foreign_key="crm_contacts.id", index=True)

    # Conversation Status
    status: str = Field(default=ConversationStatus.OPEN.value, index=True)

    # Assignment
    assigned_to: Optional[str] = Field(default=None, index=True)  # Staff user_id
    assigned_at: Optional[datetime] = Field(default=None)
    team_id: Optional[str] = Field(default=None)

    # Timing
    first_message_at: Optional[datetime] = Field(default=None)
    last_message_at: Optional[datetime] = Field(default=None)
    last_customer_message_at: Optional[datetime] = Field(default=None)
    resolved_at: Optional[datetime] = Field(default=None)
    closed_at: Optional[datetime] = Field(default=None)

    # Metrics
    message_count: int = Field(default=0)
    customer_message_count: int = Field(default=0)
    staff_message_count: int = Field(default=0)
    response_time_seconds: Optional[int] = Field(default=None)  # First response time

    # Tags/Labels
    tags: Optional[str] = Field(default=None)  # JSON array: ["hot-lead", "support"]

    # Priority
    priority: int = Field(default=0)  # 0=normal, 1=high, 2=urgent
    is_starred: bool = Field(default=False)

    # Sales Context
    opportunity_id: Optional[str] = Field(default=None, foreign_key="crm_opportunities.id")
    sales_order_id: Optional[str] = Field(default=None, foreign_key="crm_sales_orders.id")

    # Customer Intelligence Summary
    sentiment_score: Optional[float] = Field(default=None)  # -1 to 1
    intent: Optional[str] = Field(default=None)  # inquiry, order, complaint, support
    topics: Optional[str] = Field(default=None)  # JSON array of detected topics

    # Notes
    internal_notes: Optional[str] = Field(default=None)

    # Platform Conversation ID
    external_conversation_id: Optional[str] = Field(default=None, index=True)


class Message(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Tin nhan trong cuoc hoi thoai"""
    __tablename__ = "crm_messages"

    # Conversation
    conversation_id: str = Field(foreign_key="crm_conversations.id", nullable=False, index=True)

    # Direction & Type
    direction: str = Field(nullable=False, index=True)  # INBOUND, OUTBOUND
    message_type: str = Field(default=MessageType.TEXT.value)

    # Sender
    sender_type: str = Field(nullable=False)  # customer, staff, bot
    sender_id: Optional[str] = Field(default=None)  # user_id if staff
    sender_name: Optional[str] = Field(default=None)

    # Content
    content: Optional[str] = Field(default=None)  # Text content
    content_html: Optional[str] = Field(default=None)  # Formatted HTML

    # Media
    media_url: Optional[str] = Field(default=None)
    media_type: Optional[str] = Field(default=None)  # image/png, video/mp4
    media_size: Optional[int] = Field(default=None)  # bytes
    media_filename: Optional[str] = Field(default=None)
    thumbnail_url: Optional[str] = Field(default=None)

    # Location (for location messages)
    latitude: Optional[float] = Field(default=None)
    longitude: Optional[float] = Field(default=None)
    location_name: Optional[str] = Field(default=None)

    # Status
    status: str = Field(default=MessageStatus.SENT.value, index=True)
    delivered_at: Optional[datetime] = Field(default=None)
    read_at: Optional[datetime] = Field(default=None)
    failed_reason: Optional[str] = Field(default=None)

    # Platform Message ID
    external_message_id: Optional[str] = Field(default=None, index=True)

    # Reply Context
    reply_to_message_id: Optional[str] = Field(default=None, foreign_key="crm_messages.id")

    # Template (for WhatsApp templates)
    template_id: Optional[str] = Field(default=None)
    template_name: Optional[str] = Field(default=None)
    template_params: Optional[str] = Field(default=None)  # JSON

    # Interactive Elements
    buttons: Optional[str] = Field(default=None)  # JSON array
    quick_replies: Optional[str] = Field(default=None)  # JSON array

    # Order Context
    order_data: Optional[str] = Field(default=None)  # JSON: order preview data

    # AI Analysis
    sentiment: Optional[str] = Field(default=None)  # positive, neutral, negative
    intent: Optional[str] = Field(default=None)  # question, order, complaint
    entities: Optional[str] = Field(default=None)  # JSON: extracted entities
    suggested_reply: Optional[str] = Field(default=None)  # AI suggested response

    # Extra Data
    extra_data: Optional[str] = Field(default=None)  # JSON: platform-specific data


class CustomerInsight(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Customer Intelligence - Phan tich tu chat"""
    __tablename__ = "crm_customer_insights"

    # Customer Reference
    account_id: Optional[str] = Field(default=None, foreign_key="crm_accounts.id", index=True)
    contact_id: Optional[str] = Field(default=None, foreign_key="crm_contacts.id", index=True)
    conversation_id: Optional[str] = Field(default=None, foreign_key="crm_conversations.id")

    # Customer Channel Identity (if not linked to CRM yet)
    customer_channel_id: Optional[str] = Field(default=None, index=True)
    channel_type: Optional[str] = Field(default=None)

    # Insight Type
    insight_type: str = Field(nullable=False, index=True)

    # Insight Data
    category: str = Field(nullable=False)  # Category within type
    value: str = Field(nullable=False)     # The actual insight value
    confidence: float = Field(default=0.0)  # 0-1 confidence score
    source: Optional[str] = Field(default=None)  # ai, manual, inferred

    # Context
    source_message_id: Optional[str] = Field(default=None)  # Message that generated this
    evidence: Optional[str] = Field(default=None)  # Supporting text

    # Validity
    valid_from: Optional[datetime] = Field(default=None)
    valid_until: Optional[datetime] = Field(default=None)
    is_active: bool = Field(default=True)

    created_by: Optional[str] = Field(default=None)  # user_id or "ai"


class QuickReply(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Mau tra loi nhanh"""
    __tablename__ = "crm_quick_replies"

    # Basic Info
    title: str = Field(nullable=False)  # Ten mau
    shortcut: Optional[str] = Field(default=None, index=True)  # /hello, /price

    # Content
    content: str = Field(nullable=False)  # Noi dung tin nhan

    # Placeholders support: {customer_name}, {product_name}, etc.
    has_placeholders: bool = Field(default=False)

    # Category
    category: Optional[str] = Field(default=None)  # greeting, pricing, support

    # Channel Support
    supported_channels: Optional[str] = Field(default=None)  # JSON array, null = all

    # Usage Stats
    usage_count: int = Field(default=0)
    last_used_at: Optional[datetime] = Field(default=None)

    is_active: bool = Field(default=True)
    sort_order: int = Field(default=0)
    created_by: Optional[str] = Field(default=None)


class ChatTemplate(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """WhatsApp Message Templates & Broadcast Templates"""
    __tablename__ = "crm_chat_templates"

    # Basic Info
    name: str = Field(nullable=False, index=True)
    description: Optional[str] = Field(default=None)

    # Channel
    channel_type: str = Field(nullable=False)  # WHATSAPP, ZALO_OA

    # Template Content
    template_type: str = Field(nullable=False)  # text, media, interactive
    language: str = Field(default="vi")

    # Header
    header_type: Optional[str] = Field(default=None)  # text, image, video, document
    header_content: Optional[str] = Field(default=None)
    header_media_url: Optional[str] = Field(default=None)

    # Body
    body_text: str = Field(nullable=False)
    body_params: Optional[str] = Field(default=None)  # JSON: ["customer_name", "order_code"]

    # Footer
    footer_text: Optional[str] = Field(default=None)

    # Buttons
    buttons: Optional[str] = Field(default=None)  # JSON array

    # WhatsApp Approval
    wa_template_id: Optional[str] = Field(default=None)  # Template ID from WhatsApp
    wa_status: Optional[str] = Field(default=None)  # PENDING, APPROVED, REJECTED

    # Category (WhatsApp)
    category: Optional[str] = Field(default=None)  # MARKETING, UTILITY, AUTHENTICATION

    is_active: bool = Field(default=True)
    created_by: Optional[str] = Field(default=None)


class AutoReplyRule(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Quy tac tra loi tu dong"""
    __tablename__ = "crm_auto_reply_rules"

    # Basic Info
    name: str = Field(nullable=False)
    description: Optional[str] = Field(default=None)

    # Channel
    channel_id: Optional[str] = Field(default=None, foreign_key="crm_chat_channels.id")
    channel_types: Optional[str] = Field(default=None)  # JSON array, null = all

    # Trigger
    trigger_type: str = Field(nullable=False)  # keyword, first_message, after_hours, schedule
    trigger_keywords: Optional[str] = Field(default=None)  # JSON array of keywords
    trigger_schedule: Optional[str] = Field(default=None)  # Cron expression

    # Match Settings
    match_type: str = Field(default="contains")  # exact, contains, regex

    # Response
    response_type: str = Field(default="text")  # text, template, quick_replies
    response_content: Optional[str] = Field(default=None)
    response_template_id: Optional[str] = Field(default=None, foreign_key="crm_chat_templates.id")
    quick_reply_id: Optional[str] = Field(default=None, foreign_key="crm_quick_replies.id")

    # Delay
    delay_seconds: int = Field(default=0)  # Delay before sending

    # Limits
    max_triggers_per_conversation: int = Field(default=1)  # 0 = unlimited
    cooldown_minutes: int = Field(default=0)  # Minutes between triggers

    # Priority
    priority: int = Field(default=0)  # Higher = check first

    is_active: bool = Field(default=True)
    created_by: Optional[str] = Field(default=None)
