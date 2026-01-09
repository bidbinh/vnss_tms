"""Script to add new AI providers directly to database"""
import sys
import os
sys.path.insert(0, '.')

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Load .env
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://tms:tms@localhost:5432/tms")
print(f"Connecting to: {DATABASE_URL[:50]}...")

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    # Check how many providers exist
    result = conn.execute(text("SELECT COUNT(*) FROM ai_providers"))
    count = result.scalar()
    print(f"Current providers count: {count}")

    if count <= 3:
        print("Adding new AI providers...")

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
        conn.execute(text(providers_sql))
        print("  Added new providers")

        # Update Gemini models
        conn.execute(text("""
            UPDATE ai_providers
            SET available_models = '["gemini-2.0-flash", "gemini-2.0-flash-thinking", "gemini-1.5-flash", "gemini-1.5-pro"]'
            WHERE provider_code = 'gemini'
        """))
        print("  Updated Gemini models")

        # Update Claude models
        conn.execute(text("""
            UPDATE ai_providers
            SET default_model = 'claude-sonnet-4-20250514',
                available_models = '["claude-sonnet-4-20250514", "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"]'
            WHERE provider_code = 'claude'
        """))
        print("  Updated Claude models")

        # Update OpenAI models
        conn.execute(text("""
            UPDATE ai_providers
            SET available_models = '["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1", "o1-mini"]'
            WHERE provider_code = 'openai'
        """))
        print("  Updated OpenAI models")

        conn.commit()
        print("Done!")
    else:
        print("Providers already exist, skipping insert...")

    # Show final count
    result = conn.execute(text("SELECT provider_code, provider_name FROM ai_providers ORDER BY provider_code"))
    print("\nAll providers:")
    for row in result:
        print(f"  - {row[0]}: {row[1]}")
