"""AI Configuration API Routes - Super Admin only"""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlmodel import Session
from app.db.session import get_session
import json

router = APIRouter(prefix="/ai-config", tags=["AI Configuration"])


# ============================================================
# SCHEMAS
# ============================================================

class AIProviderResponse(BaseModel):
    id: str
    provider_code: str
    provider_name: str
    api_key_configured: bool  # Don't expose actual key
    api_endpoint: Optional[str]
    default_model: Optional[str]
    available_models: List[str]
    is_enabled: bool
    is_configured: bool
    max_requests_per_minute: int
    max_tokens_per_request: int
    cost_per_1m_input_tokens: float
    cost_per_1m_output_tokens: float


class AIProviderUpdate(BaseModel):
    api_key: Optional[str] = None
    api_endpoint: Optional[str] = None
    default_model: Optional[str] = None
    is_enabled: Optional[bool] = None
    max_requests_per_minute: Optional[int] = None
    max_tokens_per_request: Optional[int] = None


class AIFeatureResponse(BaseModel):
    id: str
    feature_code: str
    feature_name: str
    description: Optional[str]
    module_code: Optional[str]
    provider_priority: List[str]
    preferred_model: Optional[str]
    max_retries: int
    timeout_seconds: int
    fallback_enabled: bool
    is_enabled: bool


class AIFeatureUpdate(BaseModel):
    provider_priority: Optional[List[str]] = None
    preferred_model: Optional[str] = None
    max_retries: Optional[int] = None
    timeout_seconds: Optional[int] = None
    fallback_enabled: Optional[bool] = None
    is_enabled: Optional[bool] = None


class AIUsageStats(BaseModel):
    provider_code: str
    feature_code: str
    total_requests: int
    total_tokens: int
    total_cost: float
    success_rate: float
    avg_latency_ms: float


# ============================================================
# AI PROVIDERS ENDPOINTS
# ============================================================

@router.get("/providers", response_model=List[AIProviderResponse])
async def get_ai_providers(db: Session = Depends(get_session)):
    """Get all AI providers configuration"""
    result = db.execute(text("""
        SELECT id, provider_code, provider_name, api_key, api_endpoint,
               default_model, available_models, is_enabled, is_configured,
               max_requests_per_minute, max_tokens_per_request,
               cost_per_1m_input_tokens, cost_per_1m_output_tokens
        FROM ai_providers
        ORDER BY provider_code
    """))

    providers = []
    for row in result:
        available_models = []
        if row[6]:  # available_models
            try:
                available_models = json.loads(row[6])
            except:
                available_models = []

        providers.append(AIProviderResponse(
            id=row[0],
            provider_code=row[1],
            provider_name=row[2],
            api_key_configured=bool(row[3]),  # Don't expose actual key
            api_endpoint=row[4],
            default_model=row[5],
            available_models=available_models,
            is_enabled=bool(row[7]) if row[7] is not None else False,
            is_configured=bool(row[8]) if row[8] is not None else False,
            max_requests_per_minute=row[9] if row[9] is not None else 60,
            max_tokens_per_request=row[10] if row[10] is not None else 100000,
            cost_per_1m_input_tokens=float(row[11]) if row[11] is not None else 0.0,
            cost_per_1m_output_tokens=float(row[12]) if row[12] is not None else 0.0,
        ))

    return providers


@router.put("/providers/{provider_code}")
async def update_ai_provider(
    provider_code: str,
    data: AIProviderUpdate,
    db: Session = Depends(get_session)
):
    """Update AI provider configuration"""
    # Check provider exists
    result = db.execute(
        text("SELECT id FROM ai_providers WHERE provider_code = :code"),
        {"code": provider_code}
    )
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Provider not found")

    # Build update query
    updates = []
    params = {"code": provider_code, "updated_at": datetime.utcnow()}

    if data.api_key is not None:
        updates.append("api_key = :api_key")
        params["api_key"] = data.api_key
        # Mark as configured if key is provided
        updates.append("is_configured = :is_configured")
        params["is_configured"] = bool(data.api_key)

    if data.api_endpoint is not None:
        updates.append("api_endpoint = :api_endpoint")
        params["api_endpoint"] = data.api_endpoint

    if data.default_model is not None:
        updates.append("default_model = :default_model")
        params["default_model"] = data.default_model

    if data.is_enabled is not None:
        updates.append("is_enabled = :is_enabled")
        params["is_enabled"] = data.is_enabled

    if data.max_requests_per_minute is not None:
        updates.append("max_requests_per_minute = :max_rpm")
        params["max_rpm"] = data.max_requests_per_minute

    if data.max_tokens_per_request is not None:
        updates.append("max_tokens_per_request = :max_tokens")
        params["max_tokens"] = data.max_tokens_per_request

    updates.append("updated_at = :updated_at")

    if updates:
        query = f"UPDATE ai_providers SET {', '.join(updates)} WHERE provider_code = :code"
        db.execute(text(query), params)
        db.commit()

    return {"status": "success", "message": f"Provider {provider_code} updated"}


@router.post("/providers/{provider_code}/test")
async def test_ai_provider(provider_code: str, db: Session = Depends(get_session)):
    """Test AI provider connection"""
    result = db.execute(
        text("SELECT api_key, default_model, api_endpoint FROM ai_providers WHERE provider_code = :code"),
        {"code": provider_code}
    )
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Provider not found")

    api_key = row[0]
    default_model = row[1]
    api_endpoint = row[2]

    if not api_key:
        raise HTTPException(status_code=400, detail="API key not configured")

    # Test based on provider
    try:
        if provider_code == "claude":
            import anthropic
            client = anthropic.Anthropic(api_key=api_key)
            response = client.messages.create(
                model=default_model or "claude-sonnet-4-20250514",
                max_tokens=10,
                messages=[{"role": "user", "content": "Hi"}]
            )
            return {"status": "success", "message": "Claude API connection successful"}

        elif provider_code == "gemini":
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(default_model or 'gemini-2.0-flash')
            response = model.generate_content("Hi")
            return {"status": "success", "message": "Gemini API connection successful"}

        elif provider_code == "openai":
            import openai
            client = openai.OpenAI(api_key=api_key)
            response = client.chat.completions.create(
                model=default_model or "gpt-4o-mini",
                max_tokens=10,
                messages=[{"role": "user", "content": "Hi"}]
            )
            return {"status": "success", "message": "OpenAI API connection successful"}

        elif provider_code == "deepseek":
            # DeepSeek uses OpenAI-compatible API
            import openai
            client = openai.OpenAI(
                api_key=api_key,
                base_url=api_endpoint or "https://api.deepseek.com"
            )
            response = client.chat.completions.create(
                model=default_model or "deepseek-chat",
                max_tokens=10,
                messages=[{"role": "user", "content": "Hi"}]
            )
            return {"status": "success", "message": "DeepSeek API connection successful"}

        elif provider_code == "mistral":
            # Mistral uses OpenAI-compatible API
            import openai
            client = openai.OpenAI(
                api_key=api_key,
                base_url=api_endpoint or "https://api.mistral.ai/v1"
            )
            response = client.chat.completions.create(
                model=default_model or "mistral-large-latest",
                max_tokens=10,
                messages=[{"role": "user", "content": "Hi"}]
            )
            return {"status": "success", "message": "Mistral API connection successful"}

        elif provider_code == "groq":
            # Groq uses OpenAI-compatible API
            import openai
            client = openai.OpenAI(
                api_key=api_key,
                base_url=api_endpoint or "https://api.groq.com/openai/v1"
            )
            response = client.chat.completions.create(
                model=default_model or "llama-3.3-70b-versatile",
                max_tokens=10,
                messages=[{"role": "user", "content": "Hi"}]
            )
            return {"status": "success", "message": "Groq API connection successful"}

        elif provider_code == "cohere":
            import cohere
            client = cohere.Client(api_key=api_key)
            response = client.chat(
                model=default_model or "command-r-plus",
                message="Hi"
            )
            return {"status": "success", "message": "Cohere API connection successful"}

        elif provider_code == "xai":
            # xAI Grok uses OpenAI-compatible API
            import openai
            client = openai.OpenAI(
                api_key=api_key,
                base_url=api_endpoint or "https://api.x.ai/v1"
            )
            response = client.chat.completions.create(
                model=default_model or "grok-2-latest",
                max_tokens=10,
                messages=[{"role": "user", "content": "Hi"}]
            )
            return {"status": "success", "message": "xAI Grok API connection successful"}

        elif provider_code == "perplexity":
            # Perplexity uses OpenAI-compatible API
            import openai
            client = openai.OpenAI(
                api_key=api_key,
                base_url=api_endpoint or "https://api.perplexity.ai"
            )
            response = client.chat.completions.create(
                model=default_model or "llama-3.1-sonar-large-128k-online",
                max_tokens=10,
                messages=[{"role": "user", "content": "Hi"}]
            )
            return {"status": "success", "message": "Perplexity API connection successful"}

        elif provider_code == "together":
            # Together AI uses OpenAI-compatible API
            import openai
            client = openai.OpenAI(
                api_key=api_key,
                base_url=api_endpoint or "https://api.together.xyz/v1"
            )
            response = client.chat.completions.create(
                model=default_model or "meta-llama/Llama-3.3-70B-Instruct-Turbo",
                max_tokens=10,
                messages=[{"role": "user", "content": "Hi"}]
            )
            return {"status": "success", "message": "Together AI API connection successful"}

        elif provider_code == "openrouter":
            # OpenRouter uses OpenAI-compatible API
            import openai
            client = openai.OpenAI(
                api_key=api_key,
                base_url=api_endpoint or "https://openrouter.ai/api/v1"
            )
            response = client.chat.completions.create(
                model=default_model or "anthropic/claude-3.5-sonnet",
                max_tokens=10,
                messages=[{"role": "user", "content": "Hi"}]
            )
            return {"status": "success", "message": "OpenRouter API connection successful"}

        elif provider_code == "qwen":
            # Alibaba Qwen - uses DashScope SDK or HTTP API
            import requests
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            data = {
                "model": default_model or "qwen-plus",
                "input": {"messages": [{"role": "user", "content": "Hi"}]},
                "parameters": {"max_tokens": 10}
            }
            response = requests.post(
                f"{api_endpoint or 'https://dashscope.aliyuncs.com/api/v1'}/services/aigc/text-generation/generation",
                headers=headers,
                json=data,
                timeout=30
            )
            if response.status_code == 200:
                return {"status": "success", "message": "Alibaba Qwen API connection successful"}
            else:
                return {"status": "error", "message": f"Qwen API error: {response.text}"}

        else:
            # Generic OpenAI-compatible test for unknown providers
            if api_endpoint:
                import openai
                client = openai.OpenAI(api_key=api_key, base_url=api_endpoint)
                response = client.chat.completions.create(
                    model=default_model or "default",
                    max_tokens=10,
                    messages=[{"role": "user", "content": "Hi"}]
                )
                return {"status": "success", "message": f"{provider_code} API connection successful"}
            else:
                raise HTTPException(status_code=400, detail=f"Unknown provider: {provider_code}. Please configure api_endpoint for custom providers.")

    except Exception as e:
        return {"status": "error", "message": str(e)}


# ============================================================
# AI FEATURES ENDPOINTS
# ============================================================

@router.get("/features", response_model=List[AIFeatureResponse])
async def get_ai_features(db: Session = Depends(get_session)):
    """Get all AI feature configurations"""
    result = db.execute(text("""
        SELECT id, feature_code, feature_name, description, module_code,
               provider_priority, preferred_model, max_retries, timeout_seconds,
               fallback_enabled, is_enabled
        FROM ai_feature_configs
        ORDER BY module_code, feature_code
    """))

    features = []
    for row in result:
        provider_priority = []
        if row[5]:
            try:
                provider_priority = json.loads(row[5])
            except:
                provider_priority = []

        features.append(AIFeatureResponse(
            id=row[0],
            feature_code=row[1],
            feature_name=row[2],
            description=row[3],
            module_code=row[4],
            provider_priority=provider_priority if provider_priority else ["claude"],
            preferred_model=row[6],
            max_retries=row[7] if row[7] is not None else 3,
            timeout_seconds=row[8] if row[8] is not None else 120,
            fallback_enabled=bool(row[9]) if row[9] is not None else True,
            is_enabled=bool(row[10]) if row[10] is not None else True,
        ))

    return features


@router.put("/features/{feature_code}")
async def update_ai_feature(
    feature_code: str,
    data: AIFeatureUpdate,
    db: Session = Depends(get_session)
):
    """Update AI feature configuration"""
    # Check feature exists
    result = db.execute(
        text("SELECT id FROM ai_feature_configs WHERE feature_code = :code"),
        {"code": feature_code}
    )
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Feature not found")

    # Build update query
    updates = []
    params = {"code": feature_code, "updated_at": datetime.utcnow()}

    if data.provider_priority is not None:
        updates.append("provider_priority = :priority")
        params["priority"] = json.dumps(data.provider_priority)

    if data.preferred_model is not None:
        updates.append("preferred_model = :model")
        params["model"] = data.preferred_model

    if data.max_retries is not None:
        updates.append("max_retries = :retries")
        params["retries"] = data.max_retries

    if data.timeout_seconds is not None:
        updates.append("timeout_seconds = :timeout")
        params["timeout"] = data.timeout_seconds

    if data.fallback_enabled is not None:
        updates.append("fallback_enabled = :fallback")
        params["fallback"] = data.fallback_enabled

    if data.is_enabled is not None:
        updates.append("is_enabled = :enabled")
        params["enabled"] = data.is_enabled

    updates.append("updated_at = :updated_at")

    if updates:
        query = f"UPDATE ai_feature_configs SET {', '.join(updates)} WHERE feature_code = :code"
        db.execute(text(query), params)
        db.commit()

    return {"status": "success", "message": f"Feature {feature_code} updated"}


# ============================================================
# AI USAGE STATS
# ============================================================

@router.get("/usage/stats")
async def get_ai_usage_stats(
    days: int = 30,
    db: Session = Depends(get_session)
):
    """Get AI usage statistics"""
    result = db.execute(text("""
        SELECT
            provider_code,
            feature_code,
            COUNT(*) as total_requests,
            COALESCE(SUM(total_tokens), 0) as total_tokens,
            COALESCE(SUM(estimated_cost), 0) as total_cost,
            AVG(CASE WHEN success THEN 1.0 ELSE 0.0 END) * 100 as success_rate,
            AVG(latency_ms) as avg_latency
        FROM ai_usage_logs
        WHERE created_at >= NOW() - MAKE_INTERVAL(days => :days)
        GROUP BY provider_code, feature_code
        ORDER BY total_requests DESC
    """), {"days": days})

    stats = []
    for row in result:
        stats.append({
            "provider_code": row[0],
            "feature_code": row[1],
            "total_requests": row[2],
            "total_tokens": row[3] or 0,
            "total_cost": round(float(row[4] or 0), 4),
            "success_rate": round(float(row[5] or 0), 2),
            "avg_latency_ms": round(float(row[6] or 0), 0),
        })

    return stats


@router.get("/usage/summary")
async def get_ai_usage_summary(
    days: int = 30,
    db: Session = Depends(get_session)
):
    """Get AI usage summary by provider"""
    result = db.execute(text("""
        SELECT
            provider_code,
            COUNT(*) as total_requests,
            COALESCE(SUM(total_tokens), 0) as total_tokens,
            COALESCE(SUM(estimated_cost), 0) as total_cost
        FROM ai_usage_logs
        WHERE created_at >= NOW() - MAKE_INTERVAL(days => :days)
        GROUP BY provider_code
    """), {"days": days})

    summary = {}
    for row in result:
        summary[row[0]] = {
            "total_requests": row[1],
            "total_tokens": row[2] or 0,
            "total_cost": round(float(row[3] or 0), 4),
        }

    return summary


@router.get("/usage/daily")
async def get_ai_usage_daily(
    days: int = 30,
    db: Session = Depends(get_session)
):
    """Get daily AI usage for charts"""
    result = db.execute(text("""
        SELECT
            DATE(created_at) as date,
            provider_code,
            COUNT(*) as requests,
            COALESCE(SUM(total_tokens), 0) as tokens,
            COALESCE(SUM(estimated_cost), 0) as cost
        FROM ai_usage_logs
        WHERE created_at >= NOW() - MAKE_INTERVAL(days => :days)
        GROUP BY DATE(created_at), provider_code
        ORDER BY date DESC
    """), {"days": days})

    daily = []
    for row in result:
        daily.append({
            "date": row[0].isoformat() if row[0] else None,
            "provider_code": row[1],
            "requests": row[2],
            "tokens": row[3] or 0,
            "cost": round(float(row[4] or 0), 4),
        })

    return daily


@router.get("/usage/totals")
async def get_ai_usage_totals(
    days: int = 30,
    db: Session = Depends(get_session)
):
    """Get total AI usage for dashboard"""
    result = db.execute(text("""
        SELECT
            COUNT(*) as total_requests,
            COALESCE(SUM(input_tokens), 0) as total_input_tokens,
            COALESCE(SUM(output_tokens), 0) as total_output_tokens,
            COALESCE(SUM(total_tokens), 0) as total_tokens,
            COALESCE(SUM(estimated_cost), 0) as total_cost_usd,
            AVG(latency_ms) as avg_latency,
            AVG(CASE WHEN success THEN 1.0 ELSE 0.0 END) * 100 as success_rate
        FROM ai_usage_logs
        WHERE created_at >= NOW() - MAKE_INTERVAL(days => :days)
    """), {"days": days})

    row = result.fetchone()
    if row:
        return {
            "total_requests": row[0] or 0,
            "total_input_tokens": row[1] or 0,
            "total_output_tokens": row[2] or 0,
            "total_tokens": row[3] or 0,
            "total_cost_usd": round(float(row[4] or 0), 4),
            "avg_latency_ms": round(float(row[5] or 0), 0),
            "success_rate": round(float(row[6] or 0), 2),
        }
    return {
        "total_requests": 0,
        "total_input_tokens": 0,
        "total_output_tokens": 0,
        "total_tokens": 0,
        "total_cost_usd": 0,
        "avg_latency_ms": 0,
        "success_rate": 0,
    }


# ============================================================
# SEED NEW PROVIDERS ENDPOINT (for initial setup)
# ============================================================

@router.post("/providers/seed")
async def seed_ai_providers(db: Session = Depends(get_session)):
    """Seed additional AI providers (one-time setup)"""
    # Check current count
    result = db.execute(text("SELECT COUNT(*) FROM ai_providers"))
    count = result.scalar()

    if count > 3:
        return {"status": "skipped", "message": f"Providers already seeded. Current count: {count}"}

    # Add new providers
    providers_sql = """
        INSERT INTO ai_providers (id, provider_code, provider_name, api_endpoint, default_model, available_models,
                                 cost_per_1m_input_tokens, cost_per_1m_output_tokens, max_requests_per_minute,
                                 max_tokens_per_request, is_enabled, is_configured)
        VALUES
        ('prov-deepseek', 'deepseek', 'DeepSeek', 'https://api.deepseek.com', 'deepseek-chat',
         '["deepseek-chat", "deepseek-coder", "deepseek-reasoner"]', 0.14, 0.28, 60, 64000, false, false),
        ('prov-qwen', 'qwen', 'Alibaba Qwen', 'https://dashscope.aliyuncs.com/api/v1', 'qwen-plus',
         '["qwen-turbo", "qwen-plus", "qwen-max", "qwen-vl-plus"]', 0.4, 1.2, 60, 32000, false, false),
        ('prov-mistral', 'mistral', 'Mistral AI', 'https://api.mistral.ai/v1', 'mistral-large-latest',
         '["mistral-small-latest", "mistral-medium-latest", "mistral-large-latest", "codestral-latest"]', 2.0, 6.0, 60, 32000, false, false),
        ('prov-groq', 'groq', 'Groq', 'https://api.groq.com/openai/v1', 'llama-3.3-70b-versatile',
         '["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"]', 0.59, 0.79, 30, 32000, false, false),
        ('prov-cohere', 'cohere', 'Cohere', 'https://api.cohere.ai', 'command-r-plus',
         '["command-r", "command-r-plus", "command-light"]', 2.5, 10.0, 60, 128000, false, false),
        ('prov-xai', 'xai', 'xAI Grok', 'https://api.x.ai/v1', 'grok-2-latest',
         '["grok-2-latest", "grok-2-vision-latest"]', 2.0, 10.0, 60, 32000, false, false),
        ('prov-perplexity', 'perplexity', 'Perplexity', 'https://api.perplexity.ai', 'llama-3.1-sonar-large-128k-online',
         '["llama-3.1-sonar-small-128k-online", "llama-3.1-sonar-large-128k-online", "llama-3.1-sonar-huge-128k-online"]', 1.0, 1.0, 60, 128000, false, false),
        ('prov-together', 'together', 'Together AI', 'https://api.together.xyz/v1', 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
         '["meta-llama/Llama-3.3-70B-Instruct-Turbo", "Qwen/Qwen2.5-72B-Instruct-Turbo", "mistralai/Mixtral-8x22B-Instruct-v0.1"]', 0.88, 0.88, 60, 32000, false, false),
        ('prov-openrouter', 'openrouter', 'OpenRouter', 'https://openrouter.ai/api/v1', 'anthropic/claude-3.5-sonnet',
         '["anthropic/claude-3.5-sonnet", "openai/gpt-4o", "google/gemini-2.0-flash-exp", "deepseek/deepseek-chat"]', 3.0, 15.0, 60, 200000, false, false)
        ON CONFLICT (provider_code) DO NOTHING
    """
    db.execute(text(providers_sql))

    # Update existing providers with latest models
    db.execute(text("""
        UPDATE ai_providers
        SET available_models = '["gemini-2.0-flash", "gemini-2.0-flash-thinking", "gemini-1.5-flash", "gemini-1.5-pro"]'
        WHERE provider_code = 'gemini'
    """))

    db.execute(text("""
        UPDATE ai_providers
        SET default_model = 'claude-sonnet-4-20250514',
            available_models = '["claude-sonnet-4-20250514", "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"]'
        WHERE provider_code = 'claude'
    """))

    db.execute(text("""
        UPDATE ai_providers
        SET available_models = '["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1", "o1-mini"]'
        WHERE provider_code = 'openai'
    """))

    db.commit()

    # Return new count
    result = db.execute(text("SELECT COUNT(*) FROM ai_providers"))
    new_count = result.scalar()

    return {"status": "success", "message": f"Seeded AI providers. New count: {new_count}"}


@router.post("/features/seed")
async def seed_ai_features(db: Session = Depends(get_session)):
    """Seed AI features that are used in code but not yet in database"""

    # All AI features used in the codebase
    features_to_seed = [
        {
            "id": "feat-chat",
            "feature_code": "chat",
            "feature_name": "AI Chat Support",
            "description": "AI-powered customer support chatbot with RAG and tool calling",
            "module_code": "support",
            "provider_priority": '["claude", "gemini", "openai"]',
            "timeout_seconds": 60,
        },
        {
            "id": "feat-document-parser",
            "feature_code": "document_parser",
            "feature_name": "Document Parser",
            "description": "Parse customs declarations, invoices, and shipping documents using AI",
            "module_code": "fms",
            "provider_priority": '["gemini", "claude", "openai"]',
            "timeout_seconds": 120,
        },
        {
            "id": "feat-order-extraction",
            "feature_code": "order_extraction",
            "feature_name": "Order Text Extraction",
            "description": "Extract order information from unstructured text (messages, emails)",
            "module_code": "tms",
            "provider_priority": '["claude", "gemini", "openai"]',
            "timeout_seconds": 60,
        },
        {
            "id": "feat-image-extraction",
            "feature_code": "image_extraction",
            "feature_name": "Order Image Extraction",
            "description": "Extract order information from images (photos, screenshots)",
            "module_code": "tms",
            "provider_priority": '["gemini", "claude", "openai"]',
            "timeout_seconds": 90,
        },
        {
            "id": "feat-fuel-extraction",
            "feature_code": "fuel_extraction",
            "feature_name": "Fuel Log Extraction",
            "description": "Extract fuel receipt information from images",
            "module_code": "tms",
            "provider_priority": '["gemini", "claude", "openai"]',
            "timeout_seconds": 60,
        },
        {
            "id": "feat-driver-suggestion",
            "feature_code": "driver_suggestion",
            "feature_name": "AI Driver Suggestion",
            "description": "Suggest optimal drivers for trips based on availability, location, and history",
            "module_code": "tms",
            "provider_priority": '["claude", "gemini", "openai"]',
            "timeout_seconds": 30,
        },
    ]

    inserted = 0
    skipped = 0

    for feature in features_to_seed:
        # Check if feature already exists
        result = db.execute(
            text("SELECT id FROM ai_feature_configs WHERE feature_code = :code"),
            {"code": feature["feature_code"]}
        )
        if result.fetchone():
            skipped += 1
            continue

        # Insert new feature
        db.execute(
            text("""
                INSERT INTO ai_feature_configs
                (id, feature_code, feature_name, description, module_code,
                 provider_priority, timeout_seconds, max_retries, fallback_enabled, is_enabled)
                VALUES
                (:id, :feature_code, :feature_name, :description, :module_code,
                 :provider_priority, :timeout_seconds, 3, true, true)
            """),
            feature
        )
        inserted += 1

    db.commit()

    return {
        "status": "success",
        "message": f"Seeded AI features. Inserted: {inserted}, Skipped (already exists): {skipped}",
        "features": [f["feature_code"] for f in features_to_seed]
    }
