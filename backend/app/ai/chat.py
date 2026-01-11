"""
AI Chat Engine for 9log.tech

Multi-provider support: Claude, Gemini, OpenAI with fallback.
Uses RAG and Tool Calling for customer support.
"""
import json
import time
import uuid
import logging
import httpx
from typing import Optional, Dict, Any, List
from datetime import datetime
from sqlmodel import Session
from sqlalchemy import text

from .config import ai_settings
from .knowledge import KnowledgeBase
from .tools import TOOL_DEFINITIONS, ToolExecutor
from app.services.ai_config_service import AIConfigService, ProviderConfig

logger = logging.getLogger(__name__)

FEATURE_CODE = "chat"


class AIChat:
    """AI Chat Engine with Multi-Provider Support, RAG and Tool Calling"""

    def __init__(self, session: Optional[Session] = None):
        self.session = session
        self._config_service: Optional[AIConfigService] = None
        self.knowledge_base = KnowledgeBase(ai_settings.KNOWLEDGE_DIR)
        self.tool_executor = ToolExecutor(session)

    def _get_config_service(self) -> Optional[AIConfigService]:
        """Get or create config service"""
        if self._config_service is None and self.session:
            self._config_service = AIConfigService(self.session)
        return self._config_service

    def _get_providers(self) -> List[ProviderConfig]:
        """Get ordered list of providers for chat feature"""
        config_service = self._get_config_service()
        if not config_service:
            return []
        return config_service.get_providers_for_feature(FEATURE_CODE)

    async def chat(
        self,
        message: str,
        conversation_history: List[Dict] = None,
        user_context: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """
        Process a chat message and return AI response.
        Tries providers in priority order with fallback.

        Args:
            message: User's message
            conversation_history: Previous messages in conversation
            user_context: Optional context about the user (tenant_id, user_id, etc.)

        Returns:
            Dict with response, tool_calls, and metadata
        """
        providers = self._get_providers()
        if not providers:
            logger.warning("No AI providers configured for chat feature")
            return {
                "response": "Xin lỗi, hệ thống AI chưa được cấu hình. Vui lòng liên hệ support@9log.tech.",
                "error": "No providers configured"
            }

        # Build conversation messages
        messages = conversation_history or []
        messages.append({"role": "user", "content": message})

        # Get knowledge context for RAG
        knowledge_context = self.knowledge_base.get_context_for_query(message)

        # Build system prompt with context
        system_prompt = ai_settings.AI_SYSTEM_PROMPT
        if knowledge_context:
            system_prompt += f"\n\n{knowledge_context}"
        if user_context:
            system_prompt += f"\n\nTHÔNG TIN USER:\n{json.dumps(user_context, ensure_ascii=False, indent=2)}"

        last_error = None

        # Try each provider in priority order
        for provider in providers:
            start_time = time.time()
            logger.info(f"AI Chat: Trying provider {provider.provider_code}")

            try:
                if provider.provider_code == "claude":
                    result = await self._chat_with_claude(
                        provider, system_prompt, messages, user_context
                    )
                elif provider.provider_code == "gemini":
                    result = await self._chat_with_gemini(
                        provider, system_prompt, messages
                    )
                elif provider.provider_code in ["openai", "deepseek", "groq", "together", "openrouter"]:
                    result = await self._chat_with_openai_compatible(
                        provider, system_prompt, messages
                    )
                else:
                    logger.warning(f"Unsupported provider: {provider.provider_code}")
                    continue

                latency_ms = int((time.time() - start_time) * 1000)

                if result.get("success"):
                    # Log successful usage
                    self._log_usage(
                        provider_code=provider.provider_code,
                        model_used=provider.default_model or "unknown",
                        input_tokens=result.get("input_tokens", 0),
                        output_tokens=result.get("output_tokens", 0),
                        latency_ms=latency_ms,
                        success=True,
                        tenant_id=user_context.get("tenant_id") if user_context else None,
                        user_id=user_context.get("user_id") if user_context else None,
                    )

                    return {
                        "response": result.get("response", ""),
                        "tool_calls": result.get("tool_calls", []),
                        "provider_used": provider.provider_code,
                        "usage": {
                            "input_tokens": result.get("input_tokens", 0),
                            "output_tokens": result.get("output_tokens", 0),
                        }
                    }
                else:
                    last_error = result.get("error", "Unknown error")
                    logger.warning(f"Provider {provider.provider_code} failed: {last_error}")

                    # Log failed attempt
                    self._log_usage(
                        provider_code=provider.provider_code,
                        model_used=provider.default_model or "unknown",
                        input_tokens=0,
                        output_tokens=0,
                        latency_ms=latency_ms,
                        success=False,
                        error_message=last_error,
                        tenant_id=user_context.get("tenant_id") if user_context else None,
                        user_id=user_context.get("user_id") if user_context else None,
                    )

            except Exception as e:
                latency_ms = int((time.time() - start_time) * 1000)
                last_error = str(e)
                logger.error(f"Provider {provider.provider_code} exception: {e}")

                self._log_usage(
                    provider_code=provider.provider_code,
                    model_used=provider.default_model or "unknown",
                    input_tokens=0,
                    output_tokens=0,
                    latency_ms=latency_ms,
                    success=False,
                    error_message=last_error,
                    tenant_id=user_context.get("tenant_id") if user_context else None,
                    user_id=user_context.get("user_id") if user_context else None,
                )

        # All providers failed
        return {
            "response": "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau hoặc liên hệ support@9log.tech.",
            "error": last_error or "All providers failed"
        }

    async def _chat_with_claude(
        self,
        provider: ProviderConfig,
        system_prompt: str,
        messages: List[Dict],
        user_context: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """Chat using Claude API with tool calling support"""
        import anthropic

        try:
            client = anthropic.Anthropic(api_key=provider.api_key)
            model = provider.default_model or "claude-3-5-sonnet-20241022"

            response = client.messages.create(
                model=model,
                max_tokens=ai_settings.AI_MAX_TOKENS,
                temperature=ai_settings.AI_TEMPERATURE,
                system=system_prompt,
                messages=messages,
                tools=TOOL_DEFINITIONS
            )

            # Process response
            tool_calls = []
            text_response = ""
            total_input_tokens = response.usage.input_tokens
            total_output_tokens = response.usage.output_tokens

            for block in response.content:
                if block.type == "text":
                    text_response += block.text
                elif block.type == "tool_use":
                    tool_result = await self.tool_executor.execute(block.name, block.input)
                    tool_calls.append({
                        "tool": block.name,
                        "input": block.input,
                        "result": tool_result
                    })

            # If tools were called, get final response
            if tool_calls and response.stop_reason == "tool_use":
                messages.append({"role": "assistant", "content": response.content})

                tool_results_content = []
                for i, block in enumerate(response.content):
                    if block.type == "tool_use":
                        tool_results_content.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": json.dumps(tool_calls[len(tool_results_content)]["result"], ensure_ascii=False)
                        })

                messages.append({"role": "user", "content": tool_results_content})

                final_response = client.messages.create(
                    model=model,
                    max_tokens=ai_settings.AI_MAX_TOKENS,
                    temperature=ai_settings.AI_TEMPERATURE,
                    system=ai_settings.AI_SYSTEM_PROMPT,
                    messages=messages,
                    tools=TOOL_DEFINITIONS
                )

                total_input_tokens += final_response.usage.input_tokens
                total_output_tokens += final_response.usage.output_tokens

                for block in final_response.content:
                    if block.type == "text":
                        text_response = block.text
                        break

            return {
                "success": True,
                "response": text_response,
                "tool_calls": tool_calls,
                "input_tokens": total_input_tokens,
                "output_tokens": total_output_tokens,
            }

        except Exception as e:
            logger.error(f"Claude API error: {e}")
            return {"success": False, "error": str(e)}

    async def _chat_with_gemini(
        self,
        provider: ProviderConfig,
        system_prompt: str,
        messages: List[Dict],
    ) -> Dict[str, Any]:
        """Chat using Gemini API"""
        try:
            model = provider.default_model or "gemini-2.0-flash"
            api_key = provider.api_key
            endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

            # Convert messages to Gemini format
            gemini_contents = []
            for msg in messages:
                role = "user" if msg["role"] == "user" else "model"
                content = msg["content"]
                if isinstance(content, str):
                    gemini_contents.append({
                        "role": role,
                        "parts": [{"text": content}]
                    })

            payload = {
                "contents": gemini_contents,
                "systemInstruction": {
                    "parts": [{"text": system_prompt}]
                },
                "generationConfig": {
                    "temperature": ai_settings.AI_TEMPERATURE,
                    "maxOutputTokens": ai_settings.AI_MAX_TOKENS,
                }
            }

            async with httpx.AsyncClient(timeout=60) as client:
                response = await client.post(endpoint, json=payload)
                response.raise_for_status()
                data = response.json()

            # Extract response
            text_response = ""
            if "candidates" in data and data["candidates"]:
                parts = data["candidates"][0].get("content", {}).get("parts", [])
                for part in parts:
                    if "text" in part:
                        text_response += part["text"]

            # Extract tokens
            usage_metadata = data.get("usageMetadata", {})
            input_tokens = usage_metadata.get("promptTokenCount", 0)
            output_tokens = usage_metadata.get("candidatesTokenCount", 0)

            return {
                "success": True,
                "response": text_response,
                "tool_calls": [],  # Gemini tool calling not implemented yet
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
            }

        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            return {"success": False, "error": str(e)}

    async def _chat_with_openai_compatible(
        self,
        provider: ProviderConfig,
        system_prompt: str,
        messages: List[Dict],
    ) -> Dict[str, Any]:
        """Chat using OpenAI-compatible API (OpenAI, DeepSeek, Groq, etc.)"""
        try:
            model = provider.default_model or "gpt-4o"
            api_key = provider.api_key
            endpoint = provider.api_endpoint or "https://api.openai.com/v1"

            # Build messages with system prompt
            openai_messages = [{"role": "system", "content": system_prompt}]
            for msg in messages:
                role = msg["role"]
                content = msg["content"]
                if isinstance(content, str):
                    openai_messages.append({"role": role, "content": content})

            payload = {
                "model": model,
                "messages": openai_messages,
                "temperature": ai_settings.AI_TEMPERATURE,
                "max_tokens": ai_settings.AI_MAX_TOKENS,
            }

            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }

            chat_endpoint = f"{endpoint.rstrip('/')}/chat/completions"

            async with httpx.AsyncClient(timeout=60) as client:
                response = await client.post(chat_endpoint, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()

            # Extract response
            text_response = ""
            if "choices" in data and data["choices"]:
                text_response = data["choices"][0].get("message", {}).get("content", "")

            # Extract tokens
            usage = data.get("usage", {})
            input_tokens = usage.get("prompt_tokens", 0)
            output_tokens = usage.get("completion_tokens", 0)

            return {
                "success": True,
                "response": text_response,
                "tool_calls": [],  # OpenAI tool calling not implemented yet
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
            }

        except Exception as e:
            logger.error(f"OpenAI-compatible API error: {e}")
            return {"success": False, "error": str(e)}

    def _log_usage(
        self,
        provider_code: str,
        model_used: str,
        input_tokens: int,
        output_tokens: int,
        latency_ms: int,
        success: bool,
        error_message: Optional[str] = None,
        tenant_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ):
        """Log AI usage to database"""
        config_service = self._get_config_service()
        if config_service:
            config_service.log_usage(
                feature_code=FEATURE_CODE,
                provider_code=provider_code,
                model_used=model_used,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                latency_ms=latency_ms,
                success=success,
                error_message=error_message,
                tenant_id=tenant_id,
                user_id=user_id,
            )

    async def simple_chat(self, message: str) -> str:
        """Simple chat without conversation history - for quick queries"""
        result = await self.chat(message)
        return result.get("response", "Xin lỗi, không thể xử lý yêu cầu.")


# Keep legacy functions for backward compatibility with ai_assistant.py
def calculate_ai_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """Calculate cost in USD based on model and token usage (legacy function)"""
    CLAUDE_PRICING = {
        "claude-3-haiku-20240307": {"input": 0.25, "output": 1.25},
        "claude-3-5-haiku-20241022": {"input": 0.80, "output": 4.00},
        "claude-3-5-sonnet-20241022": {"input": 3.00, "output": 15.00},
        "claude-sonnet-4-20250514": {"input": 3.00, "output": 15.00},
        "claude-opus-4-20250514": {"input": 15.00, "output": 75.00},
    }
    pricing = CLAUDE_PRICING.get(model, {"input": 3.00, "output": 15.00})
    input_cost = (input_tokens / 1_000_000) * pricing["input"]
    output_cost = (output_tokens / 1_000_000) * pricing["output"]
    return round(input_cost + output_cost, 6)


def save_ai_usage_log(
    session: Optional[Session],
    tenant_id: Optional[str],
    user_id: Optional[str],
    feature_code: str,
    provider_code: str,
    model_used: str,
    input_tokens: int,
    output_tokens: int,
    latency_ms: int,
    success: bool = True,
    error_message: Optional[str] = None
) -> None:
    """Save AI usage to database (legacy function for ai_assistant.py)"""
    if not session:
        return

    try:
        total_tokens = input_tokens + output_tokens
        estimated_cost = calculate_ai_cost(model_used, input_tokens, output_tokens)

        session.execute(
            text("""
                INSERT INTO ai_usage_logs
                (id, tenant_id, user_id, feature_code, provider_code, model_used,
                 input_tokens, output_tokens, total_tokens, estimated_cost,
                 latency_ms, success, error_message, created_at)
                VALUES
                (:id, :tenant_id, :user_id, :feature_code, :provider_code, :model_used,
                 :input_tokens, :output_tokens, :total_tokens, :estimated_cost,
                 :latency_ms, :success, :error_message, :created_at)
            """),
            {
                "id": str(uuid.uuid4()),
                "tenant_id": tenant_id,
                "user_id": user_id,
                "feature_code": feature_code,
                "provider_code": provider_code,
                "model_used": model_used,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": total_tokens,
                "estimated_cost": estimated_cost,
                "latency_ms": latency_ms,
                "success": success,
                "error_message": error_message,
                "created_at": datetime.utcnow()
            }
        )
        session.commit()
    except Exception as e:
        print(f"Failed to save AI usage log: {e}")


# Singleton instance for simple usage
_chat_instance: Optional[AIChat] = None


def get_ai_chat(session: Optional[Session] = None) -> AIChat:
    """Get AI Chat instance"""
    global _chat_instance
    if _chat_instance is None or session is not None:
        _chat_instance = AIChat(session)
    return _chat_instance
