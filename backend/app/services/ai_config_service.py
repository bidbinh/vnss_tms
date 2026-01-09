"""
AI Configuration Service
Provides centralized access to AI provider configurations from database.
Used by document parser, HS code lookup, and other AI-powered features.
"""
import json
import logging
import uuid
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


@dataclass
class ProviderConfig:
    """Configuration for a single AI provider"""
    provider_code: str
    provider_name: str
    api_key: Optional[str]
    api_endpoint: Optional[str]
    default_model: Optional[str]
    available_models: List[str]
    is_enabled: bool
    is_configured: bool
    max_requests_per_minute: int
    max_tokens_per_request: int
    cost_per_1m_input_tokens: float
    cost_per_1m_output_tokens: float


@dataclass
class FeatureConfig:
    """Configuration for an AI-powered feature"""
    feature_code: str
    feature_name: str
    module_code: Optional[str]
    provider_priority: List[str]
    preferred_model: Optional[str]
    max_retries: int
    timeout_seconds: int
    fallback_enabled: bool
    is_enabled: bool


class AIConfigService:
    """Service for managing AI configurations"""

    def __init__(self, db: Session):
        self.db = db
        self._provider_cache: Dict[str, ProviderConfig] = {}
        self._feature_cache: Dict[str, FeatureConfig] = {}

    def get_provider(self, provider_code: str) -> Optional[ProviderConfig]:
        """Get configuration for a specific provider"""
        if provider_code in self._provider_cache:
            return self._provider_cache[provider_code]

        result = self.db.execute(text("""
            SELECT provider_code, provider_name, api_key, api_endpoint,
                   default_model, available_models, is_enabled, is_configured,
                   max_requests_per_minute, max_tokens_per_request,
                   cost_per_1m_input_tokens, cost_per_1m_output_tokens
            FROM ai_providers
            WHERE provider_code = :code
        """), {"code": provider_code})

        row = result.fetchone()
        if not row:
            return None

        available_models = []
        if row[5]:
            try:
                available_models = json.loads(row[5])
            except:
                pass

        config = ProviderConfig(
            provider_code=row[0],
            provider_name=row[1],
            api_key=row[2],
            api_endpoint=row[3],
            default_model=row[4],
            available_models=available_models,
            is_enabled=row[6],
            is_configured=row[7],
            max_requests_per_minute=row[8],
            max_tokens_per_request=row[9],
            cost_per_1m_input_tokens=row[10],
            cost_per_1m_output_tokens=row[11],
        )

        self._provider_cache[provider_code] = config
        return config

    def get_all_providers(self) -> List[ProviderConfig]:
        """Get all provider configurations"""
        result = self.db.execute(text("""
            SELECT provider_code, provider_name, api_key, api_endpoint,
                   default_model, available_models, is_enabled, is_configured,
                   max_requests_per_minute, max_tokens_per_request,
                   cost_per_1m_input_tokens, cost_per_1m_output_tokens
            FROM ai_providers
            ORDER BY provider_code
        """))

        providers = []
        for row in result:
            available_models = []
            if row[5]:
                try:
                    available_models = json.loads(row[5])
                except:
                    pass

            providers.append(ProviderConfig(
                provider_code=row[0],
                provider_name=row[1],
                api_key=row[2],
                api_endpoint=row[3],
                default_model=row[4],
                available_models=available_models,
                is_enabled=row[6],
                is_configured=row[7],
                max_requests_per_minute=row[8],
                max_tokens_per_request=row[9],
                cost_per_1m_input_tokens=row[10],
                cost_per_1m_output_tokens=row[11],
            ))

        return providers

    def get_feature_config(self, feature_code: str) -> Optional[FeatureConfig]:
        """Get configuration for a specific feature"""
        if feature_code in self._feature_cache:
            return self._feature_cache[feature_code]

        result = self.db.execute(text("""
            SELECT feature_code, feature_name, module_code, provider_priority,
                   preferred_model, max_retries, timeout_seconds,
                   fallback_enabled, is_enabled
            FROM ai_feature_configs
            WHERE feature_code = :code
        """), {"code": feature_code})

        row = result.fetchone()
        if not row:
            return None

        provider_priority = ["claude"]  # Default fallback
        if row[3]:
            try:
                provider_priority = json.loads(row[3])
            except:
                pass

        config = FeatureConfig(
            feature_code=row[0],
            feature_name=row[1],
            module_code=row[2],
            provider_priority=provider_priority,
            preferred_model=row[4],
            max_retries=row[5],
            timeout_seconds=row[6],
            fallback_enabled=row[7],
            is_enabled=row[8],
        )

        self._feature_cache[feature_code] = config
        return config

    def get_providers_for_feature(self, feature_code: str) -> List[ProviderConfig]:
        """
        Get ordered list of providers for a feature based on priority.
        Only returns enabled and configured providers.
        """
        feature = self.get_feature_config(feature_code)
        if not feature or not feature.is_enabled:
            logger.warning(f"Feature {feature_code} not found or disabled")
            return []

        providers = []
        for provider_code in feature.provider_priority:
            provider = self.get_provider(provider_code)
            if provider and provider.is_enabled and provider.is_configured and provider.api_key:
                providers.append(provider)
                logger.debug(f"Feature {feature_code}: Added provider {provider_code}")
            else:
                logger.debug(f"Feature {feature_code}: Skipped provider {provider_code} (not enabled/configured)")

        return providers

    def log_usage(
        self,
        feature_code: str,
        provider_code: str,
        model_used: str,
        input_tokens: int = 0,
        output_tokens: int = 0,
        latency_ms: int = 0,
        success: bool = True,
        error_message: Optional[str] = None,
        tenant_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ):
        """Log AI usage for cost tracking"""
        try:
            # Calculate estimated cost
            provider = self.get_provider(provider_code)
            estimated_cost = 0.0
            if provider:
                estimated_cost = (
                    (input_tokens / 1_000_000) * provider.cost_per_1m_input_tokens +
                    (output_tokens / 1_000_000) * provider.cost_per_1m_output_tokens
                )

            log_id = str(uuid.uuid4())
            self.db.execute(text("""
                INSERT INTO ai_usage_logs (
                    id, tenant_id, user_id, feature_code, provider_code, model_used,
                    input_tokens, output_tokens, total_tokens, estimated_cost,
                    latency_ms, success, error_message, created_at
                ) VALUES (
                    :id, :tenant_id, :user_id, :feature_code, :provider_code, :model_used,
                    :input_tokens, :output_tokens, :total_tokens, :estimated_cost,
                    :latency_ms, :success, :error_message, NOW()
                )
            """), {
                "id": log_id,
                "tenant_id": tenant_id,
                "user_id": user_id,
                "feature_code": feature_code,
                "provider_code": provider_code,
                "model_used": model_used,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": input_tokens + output_tokens,
                "estimated_cost": estimated_cost,
                "latency_ms": latency_ms,
                "success": success,
                "error_message": error_message,
            })
            self.db.commit()
        except Exception as e:
            logger.error(f"Failed to log AI usage: {e}")
            try:
                self.db.rollback()
            except:
                pass


def get_ai_config_service(db: Session) -> AIConfigService:
    """Factory function to get AI config service"""
    return AIConfigService(db)
