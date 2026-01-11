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
                    order_data = self._parse_ai_response(content)

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
                        "order_data": order_data,
                        "raw_response": content,
                        "confidence": self._calculate_confidence(order_data),
                        "provider_used": provider.provider_code,
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
                    order_data = self._parse_ai_response(content)

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
                        "order_data": order_data,
                        "raw_response": content,
                        "confidence": self._calculate_confidence(order_data),
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
    "time": "HH:MM" (nếu có),
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
                base_prompt += f"\n\nKHÁCH HÀNG CÓ SẴN:\n{json.dumps(context['customers'], ensure_ascii=False, indent=2)}"
            if "sites" in context:
                base_prompt += f"\n\nĐỊA ĐIỂM CÓ SẴN:\n{json.dumps(context['sites'], ensure_ascii=False, indent=2)}"

        return base_prompt

    def _parse_ai_response(self, content: str) -> Dict[str, Any]:
        """Parse AI response to extract JSON"""
        json_match = re.search(r"```json\s*(.*?)\s*```", content, re.DOTALL)
        if json_match:
            json_str = json_match.group(1)
        else:
            json_match = re.search(r"\{.*\}", content, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
            else:
                json_str = content

        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
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
