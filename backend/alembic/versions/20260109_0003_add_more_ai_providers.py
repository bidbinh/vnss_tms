"""Add more AI providers - DeepSeek, Qwen, Mistral, Groq, Cohere, xAI, Perplexity

Revision ID: 20260109_0003
Revises: 20260109_0002
Create Date: 2026-01-09

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260109_0003'
down_revision = '20260109_0002'
branch_labels = None
depends_on = None


def upgrade():
    # Add more AI providers for flexibility
    # Pricing as of Jan 2026 - may need updates
    op.execute("""
        INSERT INTO ai_providers (id, provider_code, provider_name, api_endpoint, default_model, available_models, cost_per_1m_input_tokens, cost_per_1m_output_tokens, max_requests_per_minute, max_tokens_per_request, is_enabled, is_configured)
        VALUES
        -- DeepSeek - Extremely cheap, good quality (China-based)
        ('prov-deepseek', 'deepseek', 'DeepSeek', 'https://api.deepseek.com', 'deepseek-chat', '["deepseek-chat", "deepseek-coder", "deepseek-reasoner"]', 0.14, 0.28, 60, 64000, false, false),

        -- Alibaba Qwen - Very cheap, multilingual (China-based)
        ('prov-qwen', 'qwen', 'Alibaba Qwen', 'https://dashscope.aliyuncs.com/api/v1', 'qwen-plus', '["qwen-turbo", "qwen-plus", "qwen-max", "qwen-vl-plus"]', 0.4, 1.2, 60, 32000, false, false),

        -- Mistral AI - European, strong performance
        ('prov-mistral', 'mistral', 'Mistral AI', 'https://api.mistral.ai', 'mistral-large-latest', '["mistral-small-latest", "mistral-medium-latest", "mistral-large-latest", "codestral-latest"]', 2.0, 6.0, 60, 32000, false, false),

        -- Groq - Fastest inference, uses custom LPU chips
        ('prov-groq', 'groq', 'Groq', 'https://api.groq.com/openai/v1', 'llama-3.3-70b-versatile', '["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"]', 0.59, 0.79, 30, 32000, false, false),

        -- Cohere - Enterprise focus, good for RAG
        ('prov-cohere', 'cohere', 'Cohere', 'https://api.cohere.ai', 'command-r-plus', '["command-r", "command-r-plus", "command-light"]', 2.5, 10.0, 60, 128000, false, false),

        -- xAI Grok - Elon Musk's AI, real-time info
        ('prov-xai', 'xai', 'xAI Grok', 'https://api.x.ai/v1', 'grok-2-latest', '["grok-2-latest", "grok-2-vision-latest"]', 2.0, 10.0, 60, 32000, false, false),

        -- Perplexity - Best for search/research
        ('prov-perplexity', 'perplexity', 'Perplexity', 'https://api.perplexity.ai', 'llama-3.1-sonar-large-128k-online', '["llama-3.1-sonar-small-128k-online", "llama-3.1-sonar-large-128k-online", "llama-3.1-sonar-huge-128k-online"]', 1.0, 1.0, 60, 128000, false, false),

        -- Together AI - Many open-source models
        ('prov-together', 'together', 'Together AI', 'https://api.together.xyz/v1', 'meta-llama/Llama-3.3-70B-Instruct-Turbo', '["meta-llama/Llama-3.3-70B-Instruct-Turbo", "Qwen/Qwen2.5-72B-Instruct-Turbo", "mistralai/Mixtral-8x22B-Instruct-v0.1"]', 0.88, 0.88, 60, 32000, false, false),

        -- OpenRouter - Gateway to many models
        ('prov-openrouter', 'openrouter', 'OpenRouter', 'https://openrouter.ai/api/v1', 'anthropic/claude-3.5-sonnet', '["anthropic/claude-3.5-sonnet", "openai/gpt-4o", "google/gemini-2.0-flash-exp", "deepseek/deepseek-chat"]', 3.0, 15.0, 60, 200000, false, false)
    """)

    # Update Gemini default model to 2.0
    op.execute("""
        UPDATE ai_providers
        SET default_model = 'gemini-2.0-flash',
            available_models = '["gemini-2.0-flash", "gemini-2.0-flash-thinking", "gemini-1.5-flash", "gemini-1.5-pro"]'
        WHERE provider_code = 'gemini'
    """)

    # Update Claude models
    op.execute("""
        UPDATE ai_providers
        SET default_model = 'claude-sonnet-4-20250514',
            available_models = '["claude-sonnet-4-20250514", "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"]'
        WHERE provider_code = 'claude'
    """)

    # Update OpenAI models
    op.execute("""
        UPDATE ai_providers
        SET available_models = '["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1", "o1-mini"]'
        WHERE provider_code = 'openai'
    """)


def downgrade():
    # Remove added providers
    op.execute("""
        DELETE FROM ai_providers
        WHERE provider_code IN ('deepseek', 'qwen', 'mistral', 'groq', 'cohere', 'xai', 'perplexity', 'together', 'openrouter')
    """)

    # Revert Gemini
    op.execute("""
        UPDATE ai_providers
        SET default_model = 'gemini-1.5-flash',
            available_models = '["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp"]'
        WHERE provider_code = 'gemini'
    """)

    # Revert Claude
    op.execute("""
        UPDATE ai_providers
        SET default_model = 'claude-3-5-sonnet-20241022',
            available_models = '["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"]'
        WHERE provider_code = 'claude'
    """)

    # Revert OpenAI
    op.execute("""
        UPDATE ai_providers
        SET available_models = '["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"]'
        WHERE provider_code = 'openai'
    """)
