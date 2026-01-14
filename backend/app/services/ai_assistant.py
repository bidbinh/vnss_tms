"""
AI Assistant Service for TMS
Multi-provider support: Claude, Gemini, OpenAI with fallback.
Used for order extraction, image extraction, fuel extraction, driver suggestion.
"""

from typing import Dict, Any, Optional, List
import json
import re
import time
import logging
import httpx
from datetime import datetime, date

from app.services.ai_config_service import AIConfigService, ProviderConfig

logger = logging.getLogger(__name__)


class AIAssistant:
    """AI Assistant for parsing order information from text/images with multi-provider support"""

    def __init__(self, db_session=None, tenant_id: Optional[str] = None, user_id: Optional[str] = None):
        self.db_session = db_session
        self.tenant_id = tenant_id
        self.user_id = user_id
        self._config_service: Optional[AIConfigService] = None

    def _get_config_service(self) -> Optional[AIConfigService]:
        """Get or create config service"""
        if self._config_service is None and self.db_session:
            self._config_service = AIConfigService(self.db_session)
        return self._config_service

    def _get_providers(self, feature_code: str) -> List[ProviderConfig]:
        """Get ordered list of providers for a feature"""
        config_service = self._get_config_service()
        if not config_service:
            return []
        return config_service.get_providers_for_feature(feature_code)

    def _log_usage(
        self,
        feature_code: str,
        provider_code: str,
        model_used: str,
        input_tokens: int,
        output_tokens: int,
        latency_ms: int,
        success: bool,
        error_message: Optional[str] = None,
    ):
        """Log AI usage to database"""
        config_service = self._get_config_service()
        if config_service:
            config_service.log_usage(
                feature_code=feature_code,
                provider_code=provider_code,
                model_used=model_used,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                latency_ms=latency_ms,
                success=success,
                error_message=error_message,
                tenant_id=self.tenant_id,
                user_id=self.user_id,
            )

    def extract_order_info(self, message: str, context: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Extract order information from a text message.
        Tries providers in priority order with fallback.

        Args:
            message: User's message (e.g., shipping instruction)
            context: Additional context (customers, sites, etc.)

        Returns:
            Structured order data
        """
        feature_code = "order_extraction"
        providers = self._get_providers(feature_code)

        if not providers:
            logger.warning(f"No providers configured for {feature_code}")
            return {"success": False, "error": "No AI providers configured", "order_data": None}

        system_prompt = self._build_system_prompt(context)
        logger.info(f"System prompt length: {len(system_prompt)} chars")
        logger.info(f"Context task: {context.get('task') if context else 'No context'}")
        logger.info(f"Context has customers: {len(context.get('customers', [])) if context else 0}")
        logger.info(f"Context has sites: {len(context.get('sites', [])) if context else 0}")
        last_error = None

        for provider in providers:
            start_time = time.time()
            logger.info(f"Order extraction: Trying provider {provider.provider_code}")

            try:
                if provider.provider_code == "claude":
                    result = self._call_claude_text(provider, system_prompt, message)
                elif provider.provider_code == "gemini":
                    result = self._call_gemini_text(provider, system_prompt, message)
                elif provider.provider_code in ["openai", "deepseek", "groq", "together", "openrouter"]:
                    result = self._call_openai_text(provider, system_prompt, message)
                else:
                    continue

                latency_ms = int((time.time() - start_time) * 1000)

                if result.get("success"):
                    content = result.get("content", "")
                    logger.info(f"AI raw response: {content[:500]}...")  # Log first 500 chars
                    order_data = self._parse_ai_response(content)
                    logger.info(f"Parsed order_data: {order_data}")

                    # Calculate cost estimate
                    input_tokens = result.get("input_tokens", 0)
                    output_tokens = result.get("output_tokens", 0)
                    cost_estimate = (
                        (input_tokens / 1_000_000) * provider.cost_per_1m_input_tokens +
                        (output_tokens / 1_000_000) * provider.cost_per_1m_output_tokens
                    )

                    self._log_usage(
                        feature_code=feature_code,
                        provider_code=provider.provider_code,
                        model_used=provider.default_model or "unknown",
                        input_tokens=input_tokens,
                        output_tokens=output_tokens,
                        latency_ms=latency_ms,
                        success=True,
                    )

                    return {
                        "success": True,
                        "order_data": order_data,
                        "raw_response": content,
                        "confidence": self._calculate_confidence(order_data),
                        "provider_used": provider.provider_code,
                        "cost_estimate": cost_estimate,
                    }
                else:
                    last_error = result.get("error", "Unknown error")
                    logger.warning(f"Provider {provider.provider_code} failed: {last_error}")

                    self._log_usage(
                        feature_code=feature_code,
                        provider_code=provider.provider_code,
                        model_used=provider.default_model or "unknown",
                        input_tokens=0,
                        output_tokens=0,
                        latency_ms=latency_ms,
                        success=False,
                        error_message=last_error,
                    )

            except Exception as e:
                latency_ms = int((time.time() - start_time) * 1000)
                last_error = str(e)
                logger.error(f"Provider {provider.provider_code} exception: {e}")

                self._log_usage(
                    feature_code=feature_code,
                    provider_code=provider.provider_code,
                    model_used=provider.default_model or "unknown",
                    input_tokens=0,
                    output_tokens=0,
                    latency_ms=latency_ms,
                    success=False,
                    error_message=last_error,
                )

        return {"success": False, "error": last_error or "All providers failed", "order_data": None}

    def extract_from_image(self, image_data: str, image_type: str = "image/jpeg") -> Dict[str, Any]:
        """
        Extract order information from an image (POD, booking, etc.)
        Tries providers in priority order with fallback.

        Args:
            image_data: Base64 encoded image
            image_type: MIME type of the image

        Returns:
            Structured order data
        """
        feature_code = "image_extraction"
        providers = self._get_providers(feature_code)

        if not providers:
            logger.warning(f"No providers configured for {feature_code}")
            return {"success": False, "error": "No AI providers configured", "order_data": None}

        system_prompt = self._build_system_prompt(None)
        user_text = "Hãy trích xuất thông tin đơn hàng từ hình ảnh này. Nếu là ảnh POD (Proof of Delivery), hãy lấy thông tin khách hàng, địa chỉ, hàng hóa, số lượng, thời gian giao."
        last_error = None

        for provider in providers:
            start_time = time.time()
            logger.info(f"Image extraction: Trying provider {provider.provider_code}")

            try:
                if provider.provider_code == "claude":
                    result = self._call_claude_image(provider, system_prompt, image_data, image_type, user_text)
                elif provider.provider_code == "gemini":
                    result = self._call_gemini_image(provider, system_prompt, image_data, image_type, user_text)
                elif provider.provider_code == "openai":
                    result = self._call_openai_image(provider, system_prompt, image_data, image_type, user_text)
                else:
                    continue

                latency_ms = int((time.time() - start_time) * 1000)

                if result.get("success"):
                    content = result.get("content", "")
                    logger.info(f"AI raw response: {content[:500]}...")  # Log first 500 chars
                    order_data = self._parse_ai_response(content)
                    logger.info(f"Parsed order_data: {order_data}")

                    # Calculate cost estimate
                    input_tokens = result.get("input_tokens", 0)
                    output_tokens = result.get("output_tokens", 0)
                    cost_estimate = (
                        (input_tokens / 1_000_000) * provider.cost_per_1m_input_tokens +
                        (output_tokens / 1_000_000) * provider.cost_per_1m_output_tokens
                    )

                    self._log_usage(
                        feature_code=feature_code,
                        provider_code=provider.provider_code,
                        model_used=provider.default_model or "unknown",
                        input_tokens=input_tokens,
                        output_tokens=output_tokens,
                        latency_ms=latency_ms,
                        success=True,
                    )

                    return {
                        "success": True,
                        "order_data": order_data,
                        "raw_response": content,
                        "confidence": self._calculate_confidence(order_data),
                        "provider_used": provider.provider_code,
                        "cost_estimate": cost_estimate,
                    }
                else:
                    last_error = result.get("error", "Unknown error")
                    self._log_usage(
                        feature_code=feature_code,
                        provider_code=provider.provider_code,
                        model_used=provider.default_model or "unknown",
                        input_tokens=0,
                        output_tokens=0,
                        latency_ms=latency_ms,
                        success=False,
                        error_message=last_error,
                    )

            except Exception as e:
                latency_ms = int((time.time() - start_time) * 1000)
                last_error = str(e)
                self._log_usage(
                    feature_code=feature_code,
                    provider_code=provider.provider_code,
                    model_used=provider.default_model or "unknown",
                    input_tokens=0,
                    output_tokens=0,
                    latency_ms=latency_ms,
                    success=False,
                    error_message=last_error,
                )

        return {"success": False, "error": last_error or "All providers failed", "order_data": None}

    def extract_fuel_info(self, images_base64: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Extract fuel log information from fuel pump images.
        Tries providers in priority order with fallback.

        Args:
            images_base64: List of dicts with {"data": base64_string, "media_type": "image/jpeg"}

        Returns:
            Extracted fuel data
        """
        feature_code = "fuel_extraction"
        providers = self._get_providers(feature_code)

        if not providers:
            logger.warning(f"No providers configured for {feature_code}")
            return {"success": False, "error": "No AI providers configured", "data": None}

        system_prompt = """Bạn là AI chuyên trích xuất thông tin đổ xăng/dầu từ hình ảnh.

Phân tích các hình ảnh (có thể là màn hình bơm xăng, biển số xe, đồng hồ km) và trích xuất thông tin:

```json
{
  "date": "YYYY-MM-DD",
  "odometer_km": số km đồng hồ (integer),
  "actual_liters": số lít đổ (float, VD: 269.138),
  "unit_price": đơn giá VND/lít (integer, VD: 17470),
  "total_amount": tổng tiền VND (integer, VD: 4701841),
  "vehicle_plate": "biển số xe (VD: 50E-482.52)",
  "station_name": "tên trạm xăng (nếu có)",
  "station_location": "địa điểm trạm (tỉnh/thành, nếu có)"
}
```

QUY TẮC:
1. Từ màn hình bơm xăng: lấy tổng tiền, số lít, đơn giá, ngày/giờ
2. Từ ảnh biển số: lấy biển số xe
3. Từ đồng hồ km: lấy số km
4. Từ địa điểm/banner trạm: lấy tên trạm, địa điểm
5. Nếu không thấy thông tin, để null
6. Số tiền VND thường không có dấu chấm phân cách hàng nghìn, VD: 4701841 (không phải 4.701.841)
7. Chỉ trả về JSON, không text giải thích"""

        user_text = "Hãy trích xuất thông tin đổ xăng/dầu từ các hình ảnh trên."
        last_error = None

        for provider in providers:
            start_time = time.time()
            logger.info(f"Fuel extraction: Trying provider {provider.provider_code}")

            try:
                if provider.provider_code == "claude":
                    result = self._call_claude_multi_image(provider, system_prompt, images_base64, user_text)
                elif provider.provider_code == "gemini":
                    result = self._call_gemini_multi_image(provider, system_prompt, images_base64, user_text)
                elif provider.provider_code == "openai":
                    result = self._call_openai_multi_image(provider, system_prompt, images_base64, user_text)
                else:
                    continue

                latency_ms = int((time.time() - start_time) * 1000)

                if result.get("success"):
                    content = result.get("content", "")
                    fuel_data = self._parse_ai_response(content)

                    self._log_usage(
                        feature_code=feature_code,
                        provider_code=provider.provider_code,
                        model_used=provider.default_model or "unknown",
                        input_tokens=result.get("input_tokens", 0),
                        output_tokens=result.get("output_tokens", 0),
                        latency_ms=latency_ms,
                        success=True,
                    )

                    return {
                        "success": True,
                        "data": fuel_data,
                        "raw_response": content,
                        "provider_used": provider.provider_code,
                    }
                else:
                    last_error = result.get("error", "Unknown error")
                    self._log_usage(
                        feature_code=feature_code,
                        provider_code=provider.provider_code,
                        model_used=provider.default_model or "unknown",
                        input_tokens=0,
                        output_tokens=0,
                        latency_ms=latency_ms,
                        success=False,
                        error_message=last_error,
                    )

            except Exception as e:
                latency_ms = int((time.time() - start_time) * 1000)
                last_error = str(e)
                self._log_usage(
                    feature_code=feature_code,
                    provider_code=provider.provider_code,
                    model_used=provider.default_model or "unknown",
                    input_tokens=0,
                    output_tokens=0,
                    latency_ms=latency_ms,
                    success=False,
                    error_message=last_error,
                )

        return {"success": False, "error": last_error or "All providers failed", "data": None}

    def suggest_driver(self, order_data: Dict, available_drivers: List[Dict]) -> Optional[Dict]:
        """
        Suggest best driver for the order using AI.
        Tries providers in priority order with fallback.

        Args:
            order_data: Extracted order information
            available_drivers: List of available drivers with their info

        Returns:
            Suggested driver with reasoning
        """
        if not available_drivers:
            return None

        feature_code = "driver_suggestion"
        providers = self._get_providers(feature_code)

        if not providers:
            logger.warning(f"No providers configured for {feature_code}")
            return {"error": "No AI providers configured", "suggested_driver_id": None}

        prompt = f"""Dựa trên thông tin đơn hàng và danh sách tài xế, hãy đề xuất tài xế phù hợp nhất.

ĐơN HÀNG:
{json.dumps(order_data, ensure_ascii=False, indent=2)}

TÀI XẾ KHẢ DỤNG:
{json.dumps(available_drivers, ensure_ascii=False, indent=2)}

Hãy trả về JSON với format:
{{
  "suggested_driver_id": "ID của tài xế",
  "confidence": 0.9,
  "reasoning": "Lý do đề xuất (ví dụ: gần nhất, kinh nghiệm tuyến đường, đánh giá cao)"
}}"""

        last_error = None

        for provider in providers:
            start_time = time.time()
            logger.info(f"Driver suggestion: Trying provider {provider.provider_code}")

            try:
                if provider.provider_code == "claude":
                    result = self._call_claude_text(provider, "", prompt)
                elif provider.provider_code == "gemini":
                    result = self._call_gemini_text(provider, "", prompt)
                elif provider.provider_code in ["openai", "deepseek", "groq", "together", "openrouter"]:
                    result = self._call_openai_text(provider, "", prompt)
                else:
                    continue

                latency_ms = int((time.time() - start_time) * 1000)

                if result.get("success"):
                    content = result.get("content", "")
                    suggestion = self._parse_ai_response(content)

                    self._log_usage(
                        feature_code=feature_code,
                        provider_code=provider.provider_code,
                        model_used=provider.default_model or "unknown",
                        input_tokens=result.get("input_tokens", 0),
                        output_tokens=result.get("output_tokens", 0),
                        latency_ms=latency_ms,
                        success=True,
                    )

                    suggestion["provider_used"] = provider.provider_code
                    return suggestion
                else:
                    last_error = result.get("error", "Unknown error")
                    self._log_usage(
                        feature_code=feature_code,
                        provider_code=provider.provider_code,
                        model_used=provider.default_model or "unknown",
                        input_tokens=0,
                        output_tokens=0,
                        latency_ms=latency_ms,
                        success=False,
                        error_message=last_error,
                    )

            except Exception as e:
                latency_ms = int((time.time() - start_time) * 1000)
                last_error = str(e)
                self._log_usage(
                    feature_code=feature_code,
                    provider_code=provider.provider_code,
                    model_used=provider.default_model or "unknown",
                    input_tokens=0,
                    output_tokens=0,
                    latency_ms=latency_ms,
                    success=False,
                    error_message=last_error,
                )

        return {"error": last_error or "All providers failed", "suggested_driver_id": None}

    # ============================================================
    # CLAUDE API CALLS
    # ============================================================

    def _call_claude_text(self, provider: ProviderConfig, system_prompt: str, message: str) -> Dict[str, Any]:
        """Call Claude API for text-only request"""
        import anthropic

        try:
            client = anthropic.Anthropic(api_key=provider.api_key)
            model = provider.default_model or "claude-3-5-sonnet-20241022"

            messages = [{"role": "user", "content": message}]

            response = client.messages.create(
                model=model,
                max_tokens=2000,
                temperature=0,
                system=system_prompt if system_prompt else None,
                messages=messages,
            )

            return {
                "success": True,
                "content": response.content[0].text,
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _call_claude_image(
        self, provider: ProviderConfig, system_prompt: str, image_data: str, image_type: str, user_text: str
    ) -> Dict[str, Any]:
        """Call Claude API with single image"""
        import anthropic

        try:
            client = anthropic.Anthropic(api_key=provider.api_key)
            model = provider.default_model or "claude-3-5-sonnet-20241022"

            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "image", "source": {"type": "base64", "media_type": image_type, "data": image_data}},
                        {"type": "text", "text": user_text},
                    ],
                }
            ]

            response = client.messages.create(
                model=model,
                max_tokens=2000,
                temperature=0,
                system=system_prompt,
                messages=messages,
            )

            return {
                "success": True,
                "content": response.content[0].text,
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _call_claude_multi_image(
        self, provider: ProviderConfig, system_prompt: str, images: List[Dict[str, str]], user_text: str
    ) -> Dict[str, Any]:
        """Call Claude API with multiple images"""
        import anthropic

        try:
            client = anthropic.Anthropic(api_key=provider.api_key)
            model = provider.default_model or "claude-3-5-sonnet-20241022"

            content = []
            for img in images:
                content.append(
                    {"type": "image", "source": {"type": "base64", "media_type": img["media_type"], "data": img["data"]}}
                )
            content.append({"type": "text", "text": user_text})

            response = client.messages.create(
                model=model,
                max_tokens=1000,
                temperature=0,
                system=system_prompt,
                messages=[{"role": "user", "content": content}],
            )

            return {
                "success": True,
                "content": response.content[0].text,
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    # ============================================================
    # GEMINI API CALLS
    # ============================================================

    def _call_gemini_text(self, provider: ProviderConfig, system_prompt: str, message: str) -> Dict[str, Any]:
        """Call Gemini API for text-only request"""
        try:
            model = provider.default_model or "gemini-2.0-flash"
            api_key = provider.api_key
            endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

            payload = {
                "contents": [{"role": "user", "parts": [{"text": message}]}],
                "generationConfig": {"temperature": 0, "maxOutputTokens": 2000},
            }
            if system_prompt:
                payload["systemInstruction"] = {"parts": [{"text": system_prompt}]}

            with httpx.Client(timeout=60) as client:
                response = client.post(endpoint, json=payload)
                response.raise_for_status()
                data = response.json()

            text = ""
            if "candidates" in data and data["candidates"]:
                parts = data["candidates"][0].get("content", {}).get("parts", [])
                for part in parts:
                    if "text" in part:
                        text += part["text"]

            usage = data.get("usageMetadata", {})
            return {
                "success": True,
                "content": text,
                "input_tokens": usage.get("promptTokenCount", 0),
                "output_tokens": usage.get("candidatesTokenCount", 0),
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _call_gemini_image(
        self, provider: ProviderConfig, system_prompt: str, image_data: str, image_type: str, user_text: str
    ) -> Dict[str, Any]:
        """Call Gemini API with single image"""
        try:
            model = provider.default_model or "gemini-2.0-flash"
            api_key = provider.api_key
            endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

            payload = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [
                            {"inline_data": {"mime_type": image_type, "data": image_data}},
                            {"text": user_text},
                        ],
                    }
                ],
                "generationConfig": {"temperature": 0, "maxOutputTokens": 2000},
            }
            if system_prompt:
                payload["systemInstruction"] = {"parts": [{"text": system_prompt}]}

            with httpx.Client(timeout=60) as client:
                response = client.post(endpoint, json=payload)
                response.raise_for_status()
                data = response.json()

            text = ""
            if "candidates" in data and data["candidates"]:
                parts = data["candidates"][0].get("content", {}).get("parts", [])
                for part in parts:
                    if "text" in part:
                        text += part["text"]

            usage = data.get("usageMetadata", {})
            return {
                "success": True,
                "content": text,
                "input_tokens": usage.get("promptTokenCount", 0),
                "output_tokens": usage.get("candidatesTokenCount", 0),
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _call_gemini_multi_image(
        self, provider: ProviderConfig, system_prompt: str, images: List[Dict[str, str]], user_text: str
    ) -> Dict[str, Any]:
        """Call Gemini API with multiple images"""
        try:
            model = provider.default_model or "gemini-2.0-flash"
            api_key = provider.api_key
            endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

            parts = []
            for img in images:
                parts.append({"inline_data": {"mime_type": img["media_type"], "data": img["data"]}})
            parts.append({"text": user_text})

            payload = {
                "contents": [{"role": "user", "parts": parts}],
                "generationConfig": {"temperature": 0, "maxOutputTokens": 1000},
            }
            if system_prompt:
                payload["systemInstruction"] = {"parts": [{"text": system_prompt}]}

            with httpx.Client(timeout=60) as client:
                response = client.post(endpoint, json=payload)
                response.raise_for_status()
                data = response.json()

            text = ""
            if "candidates" in data and data["candidates"]:
                parts = data["candidates"][0].get("content", {}).get("parts", [])
                for part in parts:
                    if "text" in part:
                        text += part["text"]

            usage = data.get("usageMetadata", {})
            return {
                "success": True,
                "content": text,
                "input_tokens": usage.get("promptTokenCount", 0),
                "output_tokens": usage.get("candidatesTokenCount", 0),
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    # ============================================================
    # OPENAI API CALLS
    # ============================================================

    def _call_openai_text(self, provider: ProviderConfig, system_prompt: str, message: str) -> Dict[str, Any]:
        """Call OpenAI-compatible API for text-only request"""
        try:
            model = provider.default_model or "gpt-4o"
            api_key = provider.api_key
            endpoint = provider.api_endpoint or "https://api.openai.com/v1"

            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": message})

            payload = {"model": model, "messages": messages, "temperature": 0, "max_tokens": 2000}
            headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

            with httpx.Client(timeout=60) as client:
                response = client.post(f"{endpoint.rstrip('/')}/chat/completions", json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()

            text = ""
            if "choices" in data and data["choices"]:
                text = data["choices"][0].get("message", {}).get("content", "")

            usage = data.get("usage", {})
            return {
                "success": True,
                "content": text,
                "input_tokens": usage.get("prompt_tokens", 0),
                "output_tokens": usage.get("completion_tokens", 0),
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _call_openai_image(
        self, provider: ProviderConfig, system_prompt: str, image_data: str, image_type: str, user_text: str
    ) -> Dict[str, Any]:
        """Call OpenAI API with single image"""
        try:
            model = provider.default_model or "gpt-4o"
            api_key = provider.api_key
            endpoint = provider.api_endpoint or "https://api.openai.com/v1"

            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append(
                {
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": f"data:{image_type};base64,{image_data}"}},
                        {"type": "text", "text": user_text},
                    ],
                }
            )

            payload = {"model": model, "messages": messages, "temperature": 0, "max_tokens": 2000}
            headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

            with httpx.Client(timeout=60) as client:
                response = client.post(f"{endpoint.rstrip('/')}/chat/completions", json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()

            text = ""
            if "choices" in data and data["choices"]:
                text = data["choices"][0].get("message", {}).get("content", "")

            usage = data.get("usage", {})
            return {
                "success": True,
                "content": text,
                "input_tokens": usage.get("prompt_tokens", 0),
                "output_tokens": usage.get("completion_tokens", 0),
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _call_openai_multi_image(
        self, provider: ProviderConfig, system_prompt: str, images: List[Dict[str, str]], user_text: str
    ) -> Dict[str, Any]:
        """Call OpenAI API with multiple images"""
        try:
            model = provider.default_model or "gpt-4o"
            api_key = provider.api_key
            endpoint = provider.api_endpoint or "https://api.openai.com/v1"

            content = []
            for img in images:
                content.append(
                    {"type": "image_url", "image_url": {"url": f"data:{img['media_type']};base64,{img['data']}"}}
                )
            content.append({"type": "text", "text": user_text})

            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": content})

            payload = {"model": model, "messages": messages, "temperature": 0, "max_tokens": 1000}
            headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

            with httpx.Client(timeout=60) as client:
                response = client.post(f"{endpoint.rstrip('/')}/chat/completions", json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()

            text = ""
            if "choices" in data and data["choices"]:
                text = data["choices"][0].get("message", {}).get("content", "")

            usage = data.get("usage", {})
            return {
                "success": True,
                "content": text,
                "input_tokens": usage.get("prompt_tokens", 0),
                "output_tokens": usage.get("completion_tokens", 0),
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    # ============================================================
    # HELPER METHODS
    # ============================================================

    def _build_system_prompt(self, context: Optional[Dict]) -> str:
        """Build system prompt for extraction"""

        # Check if this is for order extraction with customer matching
        task = context.get("task") if context else None
        is_customer_match = task == "order_extraction_with_customer_match"

        if is_customer_match:
            # Enhanced prompt for customer matching + site auto-creation
            base_prompt = """QUAN TRỌNG: Bạn PHẢI trả về ĐÚNG FORMAT JSON ARRAY bên dưới. KHÔNG BAO GIỜ trả về format khác.

Bạn là AI assistant chuyên nghiệp cho hệ thống vận tải container (TMS).

Nhiệm vụ: Phân tích văn bản đơn hàng và trích xuất thông tin chi tiết, TỰ ĐỘNG GÁN KHÁCH HÀNG dựa trên địa điểm.

CẤU TRÚC OUTPUT BẮT BUỘC - JSON ARRAY (KHÔNG ĐƯỢC SAI FORMAT NÀY):

```json
[
  {
    "line_number": 1,
    "driver_name": "A Tuyến",
    "pickup_text": "CHÙA VẼ",
    "delivery_text": "An Tảo, Hưng Yên",
    "container_code": "GAOU6458814",
    "equipment": "40",
    "qty": 1,
    "cargo_note": "HDPE-VN H5604F; 24.75T/cont; pallet",
    "pickup_date": "2024-12-23",
    "delivery_date": "2024-12-24",
    "delivery_shift": "morning",
    "customer_id": "uuid-xxx",
    "customer_match_confidence": 0.95,
    "ambiguous": false,
    "pickup_site_data": {
      "company_name": "CHÙA VẼ",
      "address": "Hà Nội",
      "district": null,
      "city": "Hà Nội"
    },
    "delivery_site_data": {
      "company_name": "Nhựa HY",
      "address": "91 Nguyễn Văn Linh, P. An Tảo, Hưng Yên",
      "district": "An Tảo",
      "city": "Hưng Yên"
    }
  }
]
```

⚠️ CẢNH BÁO FORMAT:
- ❌ SAI: {"pickup": {...}, "delivery": {...}} - KHÔNG trả về nested objects
- ❌ SAI: {"order_data": [...]} - KHÔNG wrap trong object
- ✅ ĐÚNG: [{line_number: 1, driver_name: "...", pickup_text: "...", delivery_text: "...", ...}]
- Phải là FLAT ARRAY với các field: line_number, driver_name, pickup_text, delivery_text, container_code, equipment

QUY TẮC PHÂN TÍCH - HỖ TRỢ 2 FORMAT:

**FORMAT 1** (có driver): "185) A Tuyến: CHÙA VẼ - An Tảo, Hưng Yên- GAOU6458814- Lấy 23/12, giao sáng 24/12- 01x40 HDPE-VN"
- **line_number**: 185
- **driver_name**: "A Tuyến" (text sau số và trước ":")
- **pickup_text**: "CHÙA VẼ" (text trước dấu "-" đầu tiên)
- **delivery_text**: "An Tảo, Hưng Yên" (text sau "-" và trước container code)
- **container_code**: GAOU6458814 (pattern [A-Z]{4}\\d{7})
- **equipment**: "40" (từ "01x40")
- **pickup_date**: "2025-01-23" (từ "Lấy 23/12")
- **delivery_date**: "2025-01-24" (từ "giao sáng 24/12")
- **delivery_shift**: "morning" (từ "sáng")
- **cargo_note**: "HDPE-VN H5604F; 27T/cont; pallet"

**FORMAT 2** (không có driver, container): "1/ 1x40 HDPE-VN H5604F, 27T/cont, pallet, CHÙA VẼ - giao KCN Quất Động-Thường Tín -Hà Nội"
- **line_number**: 1
- **driver_name**: null (không có)
- **equipment**: "40" (từ "1x40")
- **cargo_note**: "HDPE-VN H5604F, 27T/cont, pallet"
- **pickup_text**: "CHÙA VẼ" (text sau dấu phẩy cuối cùng của cargo, trước " - ")
- **delivery_text**: "KCN Quất Động" hoặc "LIVABIN" (text sau " - ", bỏ từ "giao", "nhập", "xuất")
- **container_code**: null (không có)
- **pickup_date**: null
- **delivery_date**: null
- **delivery_shift**: null

**CÁCH PHÂN TÍCH FORMAT 2:**
- Tìm dấu phẩy cuối cùng: "...pallet, "
- Text sau phẩy cuối = route: "CHÙA VẼ - giao KCN Quất Động"
- Split route by " - ":
  - Phần 1 = pickup_text: "CHÙA VẼ"
  - Phần 2 = delivery part: "giao KCN Quất Động-Thường Tín -Hà Nội"
  - Bỏ từ "giao", "nhập", "xuất" → delivery_text: "KCN Quất Động"

**CONTAINER CODE**: Pattern [A-Z]{4}\\d{7} (VD: GAOU6458814, TEMU5432000)
**EQUIPMENT**: "1x40" → "40", "2x20" → "20", "3x40" → "40" (qty=3)
**SHIFTS**: "sáng" → "morning", "chiều" → "afternoon", "tối" → "evening"
**DATES**: "Lấy 23/12" → "2025-01-23", "giao 24/12" → "2025-01-24"

**VÍ DỤ CỤ THỂ FORMAT 2 (QUAN TRỌNG - PHẢI PARSE TỪNG DÒNG):**

Input (2 dòng):
```
1/ 1x40 HDPE-VN H5604F, 27T/cont, pallet, CHÙA VẼ - giao KCN Quất Động-Thường Tín -Hà Nội
2/ 3x40 LLDPE-US 2018.XBU (mã cũ LL1002XBU), 24.75T/cont, pallet, HATECO - nhập LIVABIN
```

Output PHẢI CÓ 2 PHẦN TỬ (MỖI DÒNG = 1 ORDER):
```json
[
  {
    "line_number": 1,
    "driver_name": null,
    "pickup_text": "CHÙA VẼ",
    "delivery_text": "KCN Quất Động",
    "container_code": null,
    "equipment": "40",
    "qty": 1,
    "cargo_note": "HDPE-VN H5604F, 27T/cont, pallet",
    "pickup_date": null,
    "delivery_date": null,
    "delivery_shift": null,
    "customer_id": null,
    "ambiguous": true,
    "pickup_site_data": {"company_name": "CHÙA VẼ", "address": "", "city": "Hà Nội"},
    "delivery_site_data": {"company_name": "KCN Quất Động", "address": "Thường Tín, Hà Nội", "city": "Hà Nội"}
  },
  {
    "line_number": 2,
    "driver_name": null,
    "pickup_text": "HATECO",
    "delivery_text": "LIVABIN",
    "container_code": null,
    "equipment": "40",
    "qty": 3,
    "cargo_note": "LLDPE-US 2018.XBU (mã cũ LL1002XBU), 24.75T/cont, pallet",
    "pickup_date": null,
    "delivery_date": null,
    "delivery_shift": null,
    "customer_id": null,
    "ambiguous": true,
    "pickup_site_data": {"company_name": "HATECO", "address": "", "city": null},
    "delivery_site_data": {"company_name": "LIVABIN", "address": "", "city": null}
  }
]
```

⚠️ LƯU Ý: Mỗi dòng bắt đầu bằng "1/", "2/", "3/", etc. là MỘT ORDER riêng → Array PHẢI có 2 phần tử!

SITE MATCHING - QUAN TRỌNG:

1. Đọc danh sách ĐỊA ĐIỂM (SITES) có sẵn bên dưới
2. **delivery_text** từ văn bản (VD: "LIVABIN") cần match với **company_name** trong danh sách Sites
3. VD: "LIVABIN" trong văn bản → match với Site có company_name "nhập LIVABIN" hoặc "LIVABIN"
4. **pickup_text** tương tự: "HATECO" → match với Site có company_name "Cảng HATECO"
5. Dùng FUZZY MATCHING: bỏ qua từ "nhập", "xuất", "Cảng", so khớp phần còn lại
6. Nếu match được Site, lấy customer_id của Site đó (nếu có)

CUSTOMER ASSIGNMENT:

1. Sau khi match Site, lấy customer_id từ Site đó
2. Gán customer_id tự động với confidence score
3. Nếu Site không có customer_id hoặc không match Site: customer_id = null, ambiguous = true

SITE AUTO-CREATION:

1. Nếu địa điểm KHÔNG match Site nào:
   - Extract company_name (text ngắn gọn từ pickup/delivery), address, district, city từ văn bản
   - Fill vào pickup_site_data / delivery_site_data
   - Backend sẽ tự tạo Site mới

QUAN TRỌNG - NHẮC LẠI:
- ✅ CHỈ trả về JSON ARRAY theo đúng format trên
- ✅ pickup_text và delivery_text phải là TEXT NGẮN GỌN (VD: "HATECO", "LIVABIN"), không phải địa chỉ đầy đủ
- ✅ customer_id phải là UUID hợp lệ từ danh sách hoặc null
- ✅ Tất cả dates theo format YYYY-MM-DD
- ✅ Equipment là string: "20", "40", "45"
- ❌ KHÔNG trả về format nested objects như {"pickup": {...}, "delivery": {...}}
"""
        else:
            # Original prompt for general extraction
            base_prompt = """Bạn là một AI assistant chuyên nghiệp cho hệ thống quản lý vận tải (TMS).

Nhiệm vụ của bạn là phân tích tin nhắn hoặc hình ảnh và trích xuất thông tin đơn hàng vận chuyển.

CẤU TRÚC DỮ LIỆU CẦN TRÍCH XUẤT:

```json
{
  "pickup": {
    "location": "Tên địa điểm đón hàng",
    "address": "Địa chỉ cụ thể",
    "contact_name": "Tên người liên hệ",
    "contact_phone": "Số điện thoại",
    "date": "YYYY-MM-DD",
    "time": "HH:MM" (nếu có)
  },
  "delivery": {
    "company_name": "Tên công ty nhận hàng",
    "location": "Tên địa điểm giao hàng",
    "address": "Địa chỉ cụ thể (có thể gồm: đường, xã/phường, huyện/quận, tỉnh/thành phố)",
    "contact_name": "Tên người nhận",
    "contact_phone": "Số điện thoại",
    "date": "YYYY-MM-DD",
    "time": "HH:MM" (nếu có)",
    "instructions": "Ghi chú đặc biệt (VD: chờ tiền mới hạ hàng, trước giờ nào)"
  },
  "cargo": {
    "description": "Mô tả hàng hóa",
    "weight_tons": 0.0,
    "quantity": 0,
    "unit": "kiện/pallet/container",
    "special_requirements": "Yêu cầu đặc biệt (nếu có)"
  },
  "customer": {
    "name": "Tên khách hàng (nếu có)",
    "code": "Mã khách hàng (nếu có)"
  },
  "notes": "Ghi chú thêm",
  "urgency": "NORMAL/URGENT/CRITICAL",
  "mentioned_people": ["@Tên người được tag (nếu có)"]
}
```

QUY TẮC PHÂN TÍCH:

1. **Địa chỉ Việt Nam**: Phân tích theo format: Số nhà/Đường, Xã/Phường, Huyện/Quận, Tỉnh/Thành phố
2. **Thời gian**: "TRƯỚC 9H SÁNG" → time: "09:00", "NGÀY 22/12/2025" → date: "2025-12-22"
3. **Trọng lượng**: "24.75T" → weight_tons: 24.75, "15 TẤN" → weight_tons: 15.0
4. **Độ khẩn**: "GẤP", "URGENT" → URGENT, "TRƯỚC [giờ cụ thể]" → URGENT
5. **Xử lý thiếu thông tin**: Nếu không có thông tin, để null

QUAN TRỌNG:
- Chỉ trả về JSON, không có text giải thích
- Đảm bảo JSON valid
- Tất cả field text phải là string
- Số phải là number (không có đơn vị)
"""

        if context:
            if "customers" in context:
                customers_list = context["customers"]
                # Limit to first 20 customers to avoid token overflow
                if len(customers_list) > 20:
                    base_prompt += f"\n\nKHÁCH HÀNG CÓ SẴN ({len(customers_list)} total, showing first 20):\n"
                    customers_list = customers_list[:20]
                else:
                    base_prompt += f"\n\nKHÁCH HÀNG CÓ SẴN ({len(customers_list)} customers):\n"

                for c in customers_list:
                    base_prompt += f"- ID: {c.get('id')}\n"
                    base_prompt += f"  Name: {c.get('name')}\n"
                    base_prompt += f"  Code: {c.get('code')}\n"
                    if c.get('common_sites'):
                        base_prompt += f"  Common sites: {', '.join([s['name'] for s in c['common_sites'][:3]])}\n"
                    base_prompt += "\n"

            if "sites" in context:
                sites_list = context["sites"]
                # Limit to first 30 sites
                if len(sites_list) > 30:
                    base_prompt += f"\n\nĐỊA ĐIỂM CÓ SẴN ({len(sites_list)} total, showing first 30):\n"
                    sites_list = sites_list[:30]
                else:
                    base_prompt += f"\n\nĐỊA ĐIỂM CÓ SẴN ({len(sites_list)} sites):\n"

                for s in sites_list:
                    base_prompt += f"- Code: {s.get('code')}\n"
                    base_prompt += f"  Company: {s.get('company_name')}\n"
                    base_prompt += f"  Address: {s.get('detailed_address')}\n"
                    base_prompt += "\n"

        return base_prompt

    def _parse_ai_response(self, content: str) -> Dict[str, Any]:
        """Parse AI response to extract JSON (supports both objects and arrays)"""
        # Try to extract JSON from markdown code block
        json_match = re.search(r"```json\s*(.*?)\s*```", content, re.DOTALL)
        if json_match:
            json_str = json_match.group(1)
        else:
            # Try to match JSON object {...} or array [...]
            json_match = re.search(r"(\{.*\}|\[.*\])", content, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
            else:
                json_str = content.strip()

        try:
            parsed = json.loads(json_str)

            # If AI returns an array directly (new format), wrap it in order_data
            if isinstance(parsed, list):
                logger.info(f"AI returned array format with {len(parsed)} items")
                return {"order_data": parsed}

            # If AI returns object (old format or already wrapped), return as is
            return parsed
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI JSON: {e}")
            logger.error(f"Content: {json_str[:500]}...")
            return {"error": "Failed to parse JSON", "raw_content": content}

    def _calculate_confidence(self, order_data: Dict) -> float:
        """Calculate confidence score based on completeness of data"""
        if not order_data or "error" in order_data:
            return 0.0

        required_fields = [
            "pickup.location",
            "delivery.company_name",
            "delivery.address",
            "delivery.contact_name",
            "cargo.description",
        ]

        score = 0
        for field in required_fields:
            parts = field.split(".")
            value = order_data
            for part in parts:
                value = value.get(part) if isinstance(value, dict) else None
                if value is None:
                    break
            if value:
                score += 1

        return score / len(required_fields)
