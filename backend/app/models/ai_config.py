"""AI Configuration Models for managing AI provider settings"""
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field
import uuid


class AIProvider(SQLModel, table=True):
    """AI Provider configuration - stores API keys and settings for each AI service"""
    __tablename__ = "ai_providers"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)

    # Provider info
    provider_code: str = Field(index=True, unique=True)  # claude, gemini, openai, etc.
    provider_name: str  # Anthropic Claude, Google Gemini, OpenAI GPT

    # API Configuration
    api_key: Optional[str] = None  # Encrypted API key
    api_endpoint: Optional[str] = None  # Custom endpoint if any

    # Model settings
    default_model: Optional[str] = None  # claude-3-5-sonnet, gemini-1.5-flash, gpt-4o
    available_models: Optional[str] = None  # JSON array of available models

    # Status
    is_enabled: bool = Field(default=False)
    is_configured: bool = Field(default=False)  # Has valid API key

    # Rate limits
    max_requests_per_minute: int = Field(default=60)
    max_tokens_per_request: int = Field(default=100000)

    # Cost tracking
    cost_per_1m_input_tokens: float = Field(default=0.0)
    cost_per_1m_output_tokens: float = Field(default=0.0)

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None


class AIFeatureConfig(SQLModel, table=True):
    """Configuration for each AI-powered feature - maps features to providers with priority"""
    __tablename__ = "ai_feature_configs"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)

    # Feature identification
    feature_code: str = Field(index=True)  # document_parser, hs_code_suggest, translation, etc.
    feature_name: str  # Document Parser, HS Code Suggestion, etc.
    description: Optional[str] = None

    # Module association
    module_code: Optional[str] = None  # fms, tms, hrm, etc. - None means global

    # Provider priority (JSON array of provider_codes in priority order)
    # e.g., ["gemini", "claude", "openai"] - will try gemini first, then claude, then openai
    provider_priority: str = Field(default='["claude"]')

    # Feature-specific settings
    preferred_model: Optional[str] = None  # Override default model for this feature
    max_retries: int = Field(default=3)
    timeout_seconds: int = Field(default=120)

    # Fallback behavior
    fallback_enabled: bool = Field(default=True)  # Try next provider on failure

    # Status
    is_enabled: bool = Field(default=True)

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None


class AIUsageLog(SQLModel, table=True):
    """Track AI usage for cost monitoring and analytics"""
    __tablename__ = "ai_usage_logs"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)

    # Context
    tenant_id: Optional[str] = Field(index=True)
    user_id: Optional[str] = None
    feature_code: str = Field(index=True)
    provider_code: str = Field(index=True)
    model_used: str

    # Usage metrics
    input_tokens: int = Field(default=0)
    output_tokens: int = Field(default=0)
    total_tokens: int = Field(default=0)

    # Cost (calculated)
    estimated_cost: float = Field(default=0.0)

    # Performance
    latency_ms: int = Field(default=0)
    success: bool = Field(default=True)
    error_message: Optional[str] = None

    # Timestamp
    created_at: datetime = Field(default_factory=datetime.utcnow)
