"""
Zalo OA (Official Account) Integration Service
https://developers.zalo.me/docs/official-account

Supports:
- Receiving messages via webhook
- Sending text, image, file messages
- Sending ZNS (Zalo Notification Service) templates
- Getting user profile
"""
import httpx
import json
import hmac
import hashlib
from typing import Optional, Dict, Any, List
from datetime import datetime
import logging

from app.services.chat.base_service import (
    BaseChatService,
    IncomingMessage,
    OutgoingMessage,
    SendResult,
)

logger = logging.getLogger(__name__)

# Zalo API Endpoints
ZALO_API_BASE = "https://openapi.zalo.me/v3.0"
ZALO_OA_API = f"{ZALO_API_BASE}/oa"


class ZaloOAService(BaseChatService):
    """
    Zalo Official Account integration service

    Required config:
    - access_token: OA Access Token
    - oa_id: Official Account ID
    - app_id: Zalo App ID (optional, for webhook verification)
    - app_secret: Zalo App Secret (optional, for token refresh)
    - webhook_secret: Webhook secret for signature verification
    """

    def __init__(self, channel_config: Dict[str, Any]):
        super().__init__(channel_config)
        self.oa_id = channel_config.get("zalo_oa_id") or channel_config.get("channel_id")
        self.app_id = channel_config.get("zalo_app_id")
        self.app_secret = channel_config.get("app_secret")
        self.webhook_secret = channel_config.get("webhook_secret")
        self.refresh_token_value = channel_config.get("refresh_token")

    def _get_headers(self) -> Dict[str, str]:
        """Get headers for Zalo API requests"""
        return {
            "access_token": self.access_token,
            "Content-Type": "application/json",
        }

    async def verify_webhook(self, params: Dict[str, Any]) -> str:
        """
        Zalo doesn't use challenge verification like Facebook.
        Instead, we verify webhook signatures on each request.
        This method is for initial setup confirmation.
        """
        return "OK"

    def verify_signature(self, payload: bytes, signature: str) -> bool:
        """
        Verify webhook signature from Zalo

        Args:
            payload: Raw request body bytes
            signature: X-ZEvent-Signature header value
        """
        if not self.webhook_secret:
            logger.warning("Webhook secret not configured, skipping signature verification")
            return True

        expected = hmac.new(
            self.webhook_secret.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(expected, signature)

    async def parse_webhook(self, payload: Dict[str, Any]) -> List[IncomingMessage]:
        """
        Parse Zalo webhook payload

        Zalo webhook events:
        - user_send_text: User sends text message
        - user_send_image: User sends image
        - user_send_link: User sends link
        - user_send_audio: User sends audio
        - user_send_video: User sends video
        - user_send_sticker: User sends sticker
        - user_send_location: User sends location
        - user_send_gif: User sends GIF
        - user_send_file: User sends file
        - follow: User follows OA
        - unfollow: User unfollows OA
        """
        messages = []

        event_name = payload.get("event_name")
        sender = payload.get("sender", {})
        message_data = payload.get("message", {})

        if not event_name or not sender:
            return messages

        # Only process message events
        if not event_name.startswith("user_send_"):
            logger.info(f"Skipping non-message event: {event_name}")
            return messages

        sender_id = sender.get("id")
        timestamp_ms = payload.get("timestamp", 0)
        timestamp = datetime.fromtimestamp(timestamp_ms / 1000) if timestamp_ms else datetime.utcnow()

        # Determine message type
        message_type = "TEXT"
        content = None
        media_url = None
        media_type = None

        if event_name == "user_send_text":
            message_type = "TEXT"
            content = message_data.get("text")

        elif event_name == "user_send_image":
            message_type = "IMAGE"
            attachments = message_data.get("attachments", [])
            if attachments:
                media_url = attachments[0].get("payload", {}).get("url")
                media_type = "image"

        elif event_name == "user_send_sticker":
            message_type = "STICKER"
            attachments = message_data.get("attachments", [])
            if attachments:
                media_url = attachments[0].get("payload", {}).get("url")

        elif event_name == "user_send_audio":
            message_type = "AUDIO"
            attachments = message_data.get("attachments", [])
            if attachments:
                media_url = attachments[0].get("payload", {}).get("url")
                media_type = "audio"

        elif event_name == "user_send_video":
            message_type = "VIDEO"
            attachments = message_data.get("attachments", [])
            if attachments:
                media_url = attachments[0].get("payload", {}).get("url")
                media_type = "video"

        elif event_name == "user_send_file":
            message_type = "FILE"
            attachments = message_data.get("attachments", [])
            if attachments:
                att = attachments[0].get("payload", {})
                media_url = att.get("url")
                content = att.get("name")  # File name

        elif event_name == "user_send_location":
            message_type = "LOCATION"
            attachments = message_data.get("attachments", [])
            if attachments:
                payload_data = attachments[0].get("payload", {})
                content = json.dumps({
                    "latitude": payload_data.get("coordinates", {}).get("latitude"),
                    "longitude": payload_data.get("coordinates", {}).get("longitude"),
                })

        elif event_name == "user_send_gif":
            message_type = "IMAGE"
            attachments = message_data.get("attachments", [])
            if attachments:
                media_url = attachments[0].get("payload", {}).get("url")
                media_type = "image/gif"

        elif event_name == "user_send_link":
            message_type = "TEXT"
            attachments = message_data.get("attachments", [])
            if attachments:
                link_payload = attachments[0].get("payload", {})
                content = link_payload.get("url", "")

        msg = IncomingMessage(
            external_message_id=message_data.get("msg_id", str(timestamp_ms)),
            sender_id=sender_id,
            content=content,
            message_type=message_type,
            media_url=media_url,
            media_type=media_type,
            timestamp=timestamp,
            metadata={
                "event_name": event_name,
                "raw_payload": payload,
            }
        )
        messages.append(msg)

        return messages

    async def send_message(self, message: OutgoingMessage) -> SendResult:
        """
        Send message through Zalo OA

        Supports:
        - Text messages
        - Image messages
        - File messages
        """
        try:
            async with httpx.AsyncClient() as client:
                if message.message_type == "TEXT":
                    response = await self._send_text(client, message.recipient_id, message.content)
                elif message.message_type == "IMAGE":
                    response = await self._send_image(client, message.recipient_id, message.media_url)
                elif message.message_type == "FILE":
                    response = await self._send_file(client, message.recipient_id, message.media_url)
                else:
                    # Default to text
                    response = await self._send_text(client, message.recipient_id, message.content)

                if response.get("error") == 0:
                    return SendResult(
                        success=True,
                        external_message_id=response.get("data", {}).get("message_id")
                    )
                else:
                    return SendResult(
                        success=False,
                        error_code=str(response.get("error")),
                        error_message=response.get("message", "Unknown error")
                    )

        except Exception as e:
            logger.error(f"Failed to send Zalo message: {e}")
            return SendResult(
                success=False,
                error_code="EXCEPTION",
                error_message=str(e)
            )

    async def _send_text(self, client: httpx.AsyncClient, recipient_id: str, text: str) -> Dict[str, Any]:
        """Send text message"""
        url = f"{ZALO_OA_API}/message/cs"
        payload = {
            "recipient": {"user_id": recipient_id},
            "message": {"text": text}
        }
        response = await client.post(url, json=payload, headers=self._get_headers())
        return response.json()

    async def _send_image(self, client: httpx.AsyncClient, recipient_id: str, image_url: str) -> Dict[str, Any]:
        """Send image message"""
        url = f"{ZALO_OA_API}/message/cs"
        payload = {
            "recipient": {"user_id": recipient_id},
            "message": {
                "attachment": {
                    "type": "template",
                    "payload": {
                        "template_type": "media",
                        "elements": [{
                            "media_type": "image",
                            "url": image_url
                        }]
                    }
                }
            }
        }
        response = await client.post(url, json=payload, headers=self._get_headers())
        return response.json()

    async def _send_file(self, client: httpx.AsyncClient, recipient_id: str, file_url: str) -> Dict[str, Any]:
        """Send file message"""
        url = f"{ZALO_OA_API}/message/cs"
        payload = {
            "recipient": {"user_id": recipient_id},
            "message": {
                "attachment": {
                    "type": "file",
                    "payload": {"url": file_url}
                }
            }
        }
        response = await client.post(url, json=payload, headers=self._get_headers())
        return response.json()

    async def send_template(self, recipient_id: str, template_id: str, params: Dict[str, Any]) -> SendResult:
        """
        Send ZNS (Zalo Notification Service) template

        ZNS is used for transactional messages like order confirmations, shipping updates, etc.
        """
        try:
            async with httpx.AsyncClient() as client:
                url = f"{ZALO_OA_API}/message/template"
                payload = {
                    "phone": recipient_id,  # ZNS uses phone number
                    "template_id": template_id,
                    "template_data": params,
                }
                response = await client.post(url, json=payload, headers=self._get_headers())
                data = response.json()

                if data.get("error") == 0:
                    return SendResult(
                        success=True,
                        external_message_id=data.get("data", {}).get("msg_id")
                    )
                else:
                    return SendResult(
                        success=False,
                        error_code=str(data.get("error")),
                        error_message=data.get("message")
                    )

        except Exception as e:
            logger.error(f"Failed to send ZNS template: {e}")
            return SendResult(success=False, error_code="EXCEPTION", error_message=str(e))

    async def get_user_profile(self, user_id: str) -> Dict[str, Any]:
        """
        Get Zalo user profile

        Returns:
        - user_id
        - display_name
        - avatar
        - user_id_by_app (if available)
        """
        try:
            async with httpx.AsyncClient() as client:
                url = f"{ZALO_OA_API}/getprofile"
                params = {"data": json.dumps({"user_id": user_id})}
                response = await client.get(url, params=params, headers=self._get_headers())
                data = response.json()

                if data.get("error") == 0:
                    user_data = data.get("data", {})
                    return {
                        "user_id": user_data.get("user_id"),
                        "display_name": user_data.get("display_name"),
                        "avatar": user_data.get("avatar"),
                        "avatars": user_data.get("avatars", {}),
                    }
                else:
                    logger.warning(f"Failed to get Zalo profile: {data.get('message')}")
                    return {}

        except Exception as e:
            logger.error(f"Failed to get Zalo user profile: {e}")
            return {}

    async def mark_as_seen(self, sender_id: str) -> bool:
        """
        Zalo doesn't have explicit mark as seen API.
        The "seen" status is handled by the Zalo app automatically.
        """
        return True

    async def validate_connection(self) -> bool:
        """Validate Zalo OA connection by getting OA info"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{ZALO_OA_API}/getoa"
                response = await client.get(url, headers=self._get_headers())
                data = response.json()
                return data.get("error") == 0

        except Exception as e:
            logger.error(f"Failed to validate Zalo connection: {e}")
            return False

    async def refresh_token(self) -> Optional[str]:
        """
        Refresh Zalo access token

        Zalo access tokens expire after a period and need to be refreshed.
        """
        if not self.app_id or not self.app_secret or not self.refresh_token_value:
            return None

        try:
            async with httpx.AsyncClient() as client:
                url = "https://oauth.zaloapp.com/v4/oa/access_token"
                payload = {
                    "app_id": self.app_id,
                    "grant_type": "refresh_token",
                    "refresh_token": self.refresh_token_value,
                }
                headers = {"secret_key": self.app_secret}

                response = await client.post(url, data=payload, headers=headers)
                data = response.json()

                if "access_token" in data:
                    self.access_token = data["access_token"]
                    self.refresh_token_value = data.get("refresh_token", self.refresh_token_value)
                    return self.access_token
                else:
                    logger.error(f"Failed to refresh Zalo token: {data}")
                    return None

        except Exception as e:
            logger.error(f"Failed to refresh Zalo token: {e}")
            return None

    async def get_oa_info(self) -> Dict[str, Any]:
        """Get Official Account information"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{ZALO_OA_API}/getoa"
                response = await client.get(url, headers=self._get_headers())
                data = response.json()

                if data.get("error") == 0:
                    return data.get("data", {})
                return {}

        except Exception as e:
            logger.error(f"Failed to get OA info: {e}")
            return {}
