"""
Facebook Messenger Integration Service
https://developers.facebook.com/docs/messenger-platform

Supports:
- Receiving messages via webhook
- Sending text, image, file, template messages
- Getting user profile
- Sender actions (typing, seen)
"""
import httpx
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

# Facebook API Endpoints
FB_GRAPH_API = "https://graph.facebook.com/v18.0"


class FacebookMessengerService(BaseChatService):
    """
    Facebook Messenger integration service

    Required config:
    - access_token: Page Access Token
    - page_id: Facebook Page ID
    - app_secret: App Secret (for webhook signature verification)
    - verify_token: Webhook verification token
    """

    def __init__(self, channel_config: Dict[str, Any]):
        super().__init__(channel_config)
        self.page_id = channel_config.get("fb_page_id") or channel_config.get("channel_id")
        self.app_secret = channel_config.get("app_secret")
        self.verify_token = channel_config.get("webhook_secret")

    async def verify_webhook(self, params: Dict[str, Any]) -> str:
        """
        Handle Facebook webhook verification

        Facebook sends:
        - hub.mode: "subscribe"
        - hub.verify_token: Your configured verify token
        - hub.challenge: Challenge string to return
        """
        mode = params.get("hub.mode")
        token = params.get("hub.verify_token")
        challenge = params.get("hub.challenge")

        if mode == "subscribe" and token == self.verify_token:
            logger.info("Facebook webhook verified successfully")
            return challenge
        else:
            logger.warning("Facebook webhook verification failed")
            raise ValueError("Webhook verification failed")

    def verify_signature(self, payload: bytes, signature: str) -> bool:
        """
        Verify webhook signature from Facebook

        Facebook sends signature in X-Hub-Signature-256 header
        Format: sha256=<signature>
        """
        if not self.app_secret:
            logger.warning("App secret not configured, skipping signature verification")
            return True

        if not signature or not signature.startswith("sha256="):
            return False

        expected = "sha256=" + hmac.new(
            self.app_secret.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(expected, signature)

    async def parse_webhook(self, payload: Dict[str, Any]) -> List[IncomingMessage]:
        """
        Parse Facebook Messenger webhook payload

        Facebook webhook structure:
        {
            "object": "page",
            "entry": [
                {
                    "id": "<PAGE_ID>",
                    "time": 1234567890,
                    "messaging": [
                        {
                            "sender": {"id": "<SENDER_ID>"},
                            "recipient": {"id": "<PAGE_ID>"},
                            "timestamp": 1234567890,
                            "message": {...}
                        }
                    ]
                }
            ]
        }
        """
        messages = []

        if payload.get("object") != "page":
            return messages

        for entry in payload.get("entry", []):
            for messaging in entry.get("messaging", []):
                sender_id = messaging.get("sender", {}).get("id")
                timestamp = messaging.get("timestamp", 0)
                message = messaging.get("message", {})

                if not sender_id or not message:
                    continue

                # Skip echo messages (messages sent by the page)
                if message.get("is_echo"):
                    continue

                msg = self._parse_message(sender_id, message, timestamp)
                if msg:
                    messages.append(msg)

        return messages

    def _parse_message(self, sender_id: str, message: Dict[str, Any], timestamp: int) -> Optional[IncomingMessage]:
        """Parse individual message from Facebook"""
        message_id = message.get("mid")
        text = message.get("text")
        attachments = message.get("attachments", [])

        message_type = "TEXT"
        content = text
        media_url = None
        media_type = None

        # Handle attachments
        if attachments:
            att = attachments[0]
            att_type = att.get("type")
            att_payload = att.get("payload", {})

            if att_type == "image":
                message_type = "IMAGE"
                media_url = att_payload.get("url")
                media_type = "image"
            elif att_type == "video":
                message_type = "VIDEO"
                media_url = att_payload.get("url")
                media_type = "video"
            elif att_type == "audio":
                message_type = "AUDIO"
                media_url = att_payload.get("url")
                media_type = "audio"
            elif att_type == "file":
                message_type = "FILE"
                media_url = att_payload.get("url")
            elif att_type == "location":
                message_type = "LOCATION"
                coords = att_payload.get("coordinates", {})
                content = f"{coords.get('lat')},{coords.get('long')}"
            elif att_type == "fallback":
                # URL or shared content
                content = att_payload.get("url", text)

        # Handle stickers
        sticker_id = message.get("sticker_id")
        if sticker_id:
            message_type = "STICKER"
            # Stickers are handled as images with the sticker URL
            if attachments:
                media_url = attachments[0].get("payload", {}).get("url")

        return IncomingMessage(
            external_message_id=message_id,
            sender_id=sender_id,
            content=content,
            message_type=message_type,
            media_url=media_url,
            media_type=media_type,
            timestamp=datetime.fromtimestamp(timestamp / 1000) if timestamp else datetime.utcnow(),
            metadata={
                "raw_message": message,
            }
        )

    async def send_message(self, message: OutgoingMessage) -> SendResult:
        """Send message through Facebook Messenger"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{FB_GRAPH_API}/me/messages"
                params = {"access_token": self.access_token}

                # Build message payload
                if message.message_type == "TEXT":
                    payload = {
                        "recipient": {"id": message.recipient_id},
                        "message": {"text": message.content}
                    }
                elif message.message_type in ["IMAGE", "VIDEO", "AUDIO", "FILE"]:
                    att_type = message.message_type.lower()
                    if att_type == "image":
                        att_type = "image"
                    payload = {
                        "recipient": {"id": message.recipient_id},
                        "message": {
                            "attachment": {
                                "type": att_type,
                                "payload": {"url": message.media_url, "is_reusable": True}
                            }
                        }
                    }
                else:
                    payload = {
                        "recipient": {"id": message.recipient_id},
                        "message": {"text": message.content}
                    }

                # Add quick replies if provided
                if message.buttons:
                    payload["message"]["quick_replies"] = [
                        {
                            "content_type": "text",
                            "title": btn.get("title"),
                            "payload": btn.get("payload", btn.get("title"))
                        }
                        for btn in message.buttons[:13]  # Max 13 quick replies
                    ]

                response = await client.post(url, params=params, json=payload)
                data = response.json()

                if "message_id" in data:
                    return SendResult(
                        success=True,
                        external_message_id=data["message_id"]
                    )
                else:
                    error = data.get("error", {})
                    return SendResult(
                        success=False,
                        error_code=str(error.get("code")),
                        error_message=error.get("message")
                    )

        except Exception as e:
            logger.error(f"Failed to send Facebook message: {e}")
            return SendResult(success=False, error_code="EXCEPTION", error_message=str(e))

    async def send_template(self, recipient_id: str, template_id: str, params: Dict[str, Any]) -> SendResult:
        """
        Send template message through Facebook Messenger

        Supports:
        - Generic template (cards/carousels)
        - Button template
        - Receipt template
        """
        try:
            async with httpx.AsyncClient() as client:
                url = f"{FB_GRAPH_API}/me/messages"
                query_params = {"access_token": self.access_token}

                template_type = params.get("template_type", "generic")

                if template_type == "generic":
                    payload = {
                        "recipient": {"id": recipient_id},
                        "message": {
                            "attachment": {
                                "type": "template",
                                "payload": {
                                    "template_type": "generic",
                                    "elements": params.get("elements", [])
                                }
                            }
                        }
                    }
                elif template_type == "button":
                    payload = {
                        "recipient": {"id": recipient_id},
                        "message": {
                            "attachment": {
                                "type": "template",
                                "payload": {
                                    "template_type": "button",
                                    "text": params.get("text", ""),
                                    "buttons": params.get("buttons", [])
                                }
                            }
                        }
                    }
                else:
                    # Default to text
                    return await self.send_message(OutgoingMessage(
                        recipient_id=recipient_id,
                        content=params.get("text", "")
                    ))

                response = await client.post(url, params=query_params, json=payload)
                data = response.json()

                if "message_id" in data:
                    return SendResult(success=True, external_message_id=data["message_id"])
                else:
                    error = data.get("error", {})
                    return SendResult(
                        success=False,
                        error_code=str(error.get("code")),
                        error_message=error.get("message")
                    )

        except Exception as e:
            logger.error(f"Failed to send Facebook template: {e}")
            return SendResult(success=False, error_code="EXCEPTION", error_message=str(e))

    async def get_user_profile(self, user_id: str) -> Dict[str, Any]:
        """
        Get Facebook user profile

        Returns:
        - first_name
        - last_name
        - profile_pic
        - locale
        - timezone
        - gender
        """
        try:
            async with httpx.AsyncClient() as client:
                url = f"{FB_GRAPH_API}/{user_id}"
                params = {
                    "access_token": self.access_token,
                    "fields": "first_name,last_name,profile_pic"
                }
                response = await client.get(url, params=params)
                data = response.json()

                if "error" not in data:
                    return {
                        "user_id": user_id,
                        "display_name": f"{data.get('first_name', '')} {data.get('last_name', '')}".strip(),
                        "first_name": data.get("first_name"),
                        "last_name": data.get("last_name"),
                        "avatar": data.get("profile_pic"),
                    }
                else:
                    logger.warning(f"Failed to get Facebook profile: {data.get('error')}")
                    return {}

        except Exception as e:
            logger.error(f"Failed to get Facebook user profile: {e}")
            return {}

    async def mark_as_seen(self, sender_id: str) -> bool:
        """Send 'mark_seen' sender action"""
        return await self._send_action(sender_id, "mark_seen")

    async def send_typing_on(self, recipient_id: str) -> bool:
        """Send typing indicator"""
        return await self._send_action(recipient_id, "typing_on")

    async def send_typing_off(self, recipient_id: str) -> bool:
        """Turn off typing indicator"""
        return await self._send_action(recipient_id, "typing_off")

    async def _send_action(self, recipient_id: str, action: str) -> bool:
        """Send sender action (typing, seen)"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{FB_GRAPH_API}/me/messages"
                params = {"access_token": self.access_token}
                payload = {
                    "recipient": {"id": recipient_id},
                    "sender_action": action
                }
                response = await client.post(url, params=params, json=payload)
                return response.status_code == 200

        except Exception as e:
            logger.error(f"Failed to send Facebook action: {e}")
            return False

    async def validate_connection(self) -> bool:
        """Validate Facebook page connection"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{FB_GRAPH_API}/me"
                params = {"access_token": self.access_token}
                response = await client.get(url, params=params)
                data = response.json()
                return "id" in data and "error" not in data

        except Exception as e:
            logger.error(f"Failed to validate Facebook connection: {e}")
            return False

    async def get_page_info(self) -> Dict[str, Any]:
        """Get Facebook Page information"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{FB_GRAPH_API}/me"
                params = {
                    "access_token": self.access_token,
                    "fields": "id,name,picture"
                }
                response = await client.get(url, params=params)
                return response.json()

        except Exception as e:
            logger.error(f"Failed to get page info: {e}")
            return {}
