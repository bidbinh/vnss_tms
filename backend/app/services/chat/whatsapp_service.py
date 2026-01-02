"""
WhatsApp Business API Integration Service
https://developers.facebook.com/docs/whatsapp/cloud-api

Supports:
- Receiving messages via webhook
- Sending text, image, document, template messages
- Getting user profile
- Message templates (pre-approved)
"""
import httpx
import hmac
import hashlib
from typing import Optional, Dict, Any, List
from datetime import datetime
import logging
import json

from app.services.chat.base_service import (
    BaseChatService,
    IncomingMessage,
    OutgoingMessage,
    SendResult,
)

logger = logging.getLogger(__name__)

# WhatsApp Cloud API Endpoints
WA_API_BASE = "https://graph.facebook.com/v18.0"


class WhatsAppBusinessService(BaseChatService):
    """
    WhatsApp Business Cloud API integration service

    Required config:
    - access_token: Permanent Access Token
    - phone_number_id: WhatsApp Business Phone Number ID
    - business_account_id: WhatsApp Business Account ID
    - app_secret: App Secret (for webhook signature verification)
    - verify_token: Webhook verification token
    """

    def __init__(self, channel_config: Dict[str, Any]):
        super().__init__(channel_config)
        self.phone_number_id = channel_config.get("wa_phone_number_id") or channel_config.get("channel_id")
        self.business_account_id = channel_config.get("wa_business_account_id")
        self.app_secret = channel_config.get("app_secret")
        self.verify_token = channel_config.get("webhook_secret")

    async def verify_webhook(self, params: Dict[str, Any]) -> str:
        """
        Handle WhatsApp webhook verification

        WhatsApp (via Meta) sends:
        - hub.mode: "subscribe"
        - hub.verify_token: Your configured verify token
        - hub.challenge: Challenge string to return
        """
        mode = params.get("hub.mode")
        token = params.get("hub.verify_token")
        challenge = params.get("hub.challenge")

        if mode == "subscribe" and token == self.verify_token:
            logger.info("WhatsApp webhook verified successfully")
            return challenge
        else:
            logger.warning("WhatsApp webhook verification failed")
            raise ValueError("Webhook verification failed")

    def verify_signature(self, payload: bytes, signature: str) -> bool:
        """
        Verify webhook signature from WhatsApp/Meta

        Meta sends signature in X-Hub-Signature-256 header
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
        Parse WhatsApp Cloud API webhook payload

        WhatsApp webhook structure:
        {
            "object": "whatsapp_business_account",
            "entry": [
                {
                    "id": "<BUSINESS_ACCOUNT_ID>",
                    "changes": [
                        {
                            "value": {
                                "messaging_product": "whatsapp",
                                "metadata": {...},
                                "contacts": [...],
                                "messages": [...]
                            },
                            "field": "messages"
                        }
                    ]
                }
            ]
        }
        """
        messages = []

        if payload.get("object") != "whatsapp_business_account":
            return messages

        for entry in payload.get("entry", []):
            for change in entry.get("changes", []):
                if change.get("field") != "messages":
                    continue

                value = change.get("value", {})
                contacts = {c["wa_id"]: c for c in value.get("contacts", [])}

                for message in value.get("messages", []):
                    msg = self._parse_message(message, contacts)
                    if msg:
                        messages.append(msg)

        return messages

    def _parse_message(self, message: Dict[str, Any], contacts: Dict[str, Any]) -> Optional[IncomingMessage]:
        """Parse individual WhatsApp message"""
        message_id = message.get("id")
        sender_id = message.get("from")
        timestamp = message.get("timestamp")
        msg_type = message.get("type")

        contact = contacts.get(sender_id, {})
        sender_name = contact.get("profile", {}).get("name")

        message_type = "TEXT"
        content = None
        media_url = None
        media_type = None

        if msg_type == "text":
            message_type = "TEXT"
            content = message.get("text", {}).get("body")

        elif msg_type == "image":
            message_type = "IMAGE"
            image = message.get("image", {})
            media_url = image.get("id")  # Need to fetch actual URL
            media_type = image.get("mime_type")
            content = image.get("caption")

        elif msg_type == "video":
            message_type = "VIDEO"
            video = message.get("video", {})
            media_url = video.get("id")
            media_type = video.get("mime_type")
            content = video.get("caption")

        elif msg_type == "audio":
            message_type = "AUDIO"
            audio = message.get("audio", {})
            media_url = audio.get("id")
            media_type = audio.get("mime_type")

        elif msg_type == "document":
            message_type = "FILE"
            doc = message.get("document", {})
            media_url = doc.get("id")
            media_type = doc.get("mime_type")
            content = doc.get("filename")

        elif msg_type == "sticker":
            message_type = "STICKER"
            sticker = message.get("sticker", {})
            media_url = sticker.get("id")

        elif msg_type == "location":
            message_type = "LOCATION"
            loc = message.get("location", {})
            content = json.dumps({
                "latitude": loc.get("latitude"),
                "longitude": loc.get("longitude"),
                "name": loc.get("name"),
                "address": loc.get("address"),
            })

        elif msg_type == "contacts":
            message_type = "CONTACT"
            content = json.dumps(message.get("contacts", []))

        elif msg_type == "interactive":
            # Button or list reply
            interactive = message.get("interactive", {})
            int_type = interactive.get("type")
            if int_type == "button_reply":
                content = interactive.get("button_reply", {}).get("title")
            elif int_type == "list_reply":
                content = interactive.get("list_reply", {}).get("title")

        elif msg_type == "button":
            # Quick reply button
            content = message.get("button", {}).get("text")

        elif msg_type == "reaction":
            # Message reaction
            reaction = message.get("reaction", {})
            content = reaction.get("emoji")
            message_type = "REACTION"

        return IncomingMessage(
            external_message_id=message_id,
            sender_id=sender_id,
            sender_name=sender_name,
            content=content,
            message_type=message_type,
            media_url=media_url,
            media_type=media_type,
            timestamp=datetime.fromtimestamp(int(timestamp)) if timestamp else datetime.utcnow(),
            metadata={
                "raw_message": message,
                "contact": contact,
            }
        )

    async def send_message(self, message: OutgoingMessage) -> SendResult:
        """Send message through WhatsApp Business API"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{WA_API_BASE}/{self.phone_number_id}/messages"
                headers = {
                    "Authorization": f"Bearer {self.access_token}",
                    "Content-Type": "application/json",
                }

                if message.message_type == "TEXT":
                    payload = {
                        "messaging_product": "whatsapp",
                        "recipient_type": "individual",
                        "to": message.recipient_id,
                        "type": "text",
                        "text": {"body": message.content}
                    }

                elif message.message_type == "IMAGE":
                    payload = {
                        "messaging_product": "whatsapp",
                        "recipient_type": "individual",
                        "to": message.recipient_id,
                        "type": "image",
                        "image": {"link": message.media_url}
                    }

                elif message.message_type == "VIDEO":
                    payload = {
                        "messaging_product": "whatsapp",
                        "recipient_type": "individual",
                        "to": message.recipient_id,
                        "type": "video",
                        "video": {"link": message.media_url}
                    }

                elif message.message_type == "FILE":
                    payload = {
                        "messaging_product": "whatsapp",
                        "recipient_type": "individual",
                        "to": message.recipient_id,
                        "type": "document",
                        "document": {"link": message.media_url}
                    }

                else:
                    # Default to text
                    payload = {
                        "messaging_product": "whatsapp",
                        "recipient_type": "individual",
                        "to": message.recipient_id,
                        "type": "text",
                        "text": {"body": message.content}
                    }

                response = await client.post(url, headers=headers, json=payload)
                data = response.json()

                if "messages" in data:
                    return SendResult(
                        success=True,
                        external_message_id=data["messages"][0].get("id")
                    )
                else:
                    error = data.get("error", {})
                    return SendResult(
                        success=False,
                        error_code=str(error.get("code")),
                        error_message=error.get("message")
                    )

        except Exception as e:
            logger.error(f"Failed to send WhatsApp message: {e}")
            return SendResult(success=False, error_code="EXCEPTION", error_message=str(e))

    async def send_template(self, recipient_id: str, template_id: str, params: Dict[str, Any]) -> SendResult:
        """
        Send WhatsApp template message

        Templates must be pre-approved by WhatsApp/Meta.
        Used for:
        - Business-initiated conversations
        - Notifications (order updates, reminders, etc.)

        Params should include:
        - language_code: Template language (e.g., "en_US", "vi")
        - components: Template components with parameters
        """
        try:
            async with httpx.AsyncClient() as client:
                url = f"{WA_API_BASE}/{self.phone_number_id}/messages"
                headers = {
                    "Authorization": f"Bearer {self.access_token}",
                    "Content-Type": "application/json",
                }

                payload = {
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": recipient_id,
                    "type": "template",
                    "template": {
                        "name": template_id,
                        "language": {"code": params.get("language_code", "vi")},
                    }
                }

                # Add template components if provided
                if "components" in params:
                    payload["template"]["components"] = params["components"]

                response = await client.post(url, headers=headers, json=payload)
                data = response.json()

                if "messages" in data:
                    return SendResult(
                        success=True,
                        external_message_id=data["messages"][0].get("id")
                    )
                else:
                    error = data.get("error", {})
                    return SendResult(
                        success=False,
                        error_code=str(error.get("code")),
                        error_message=error.get("message")
                    )

        except Exception as e:
            logger.error(f"Failed to send WhatsApp template: {e}")
            return SendResult(success=False, error_code="EXCEPTION", error_message=str(e))

    async def send_interactive(self, recipient_id: str, interactive_type: str, content: Dict[str, Any]) -> SendResult:
        """
        Send interactive message (buttons or list)

        Types:
        - button: Up to 3 buttons
        - list: List with sections and rows
        """
        try:
            async with httpx.AsyncClient() as client:
                url = f"{WA_API_BASE}/{self.phone_number_id}/messages"
                headers = {
                    "Authorization": f"Bearer {self.access_token}",
                    "Content-Type": "application/json",
                }

                payload = {
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": recipient_id,
                    "type": "interactive",
                    "interactive": {
                        "type": interactive_type,
                        **content
                    }
                }

                response = await client.post(url, headers=headers, json=payload)
                data = response.json()

                if "messages" in data:
                    return SendResult(
                        success=True,
                        external_message_id=data["messages"][0].get("id")
                    )
                else:
                    error = data.get("error", {})
                    return SendResult(
                        success=False,
                        error_code=str(error.get("code")),
                        error_message=error.get("message")
                    )

        except Exception as e:
            logger.error(f"Failed to send WhatsApp interactive: {e}")
            return SendResult(success=False, error_code="EXCEPTION", error_message=str(e))

    async def get_user_profile(self, user_id: str) -> Dict[str, Any]:
        """
        WhatsApp doesn't provide profile API for privacy.
        Profile info comes from webhook contacts array.
        """
        return {
            "user_id": user_id,
            "phone": user_id,
        }

    async def mark_as_seen(self, message_id: str) -> bool:
        """Mark message as read"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{WA_API_BASE}/{self.phone_number_id}/messages"
                headers = {
                    "Authorization": f"Bearer {self.access_token}",
                    "Content-Type": "application/json",
                }
                payload = {
                    "messaging_product": "whatsapp",
                    "status": "read",
                    "message_id": message_id
                }
                response = await client.post(url, headers=headers, json=payload)
                return response.status_code == 200

        except Exception as e:
            logger.error(f"Failed to mark WhatsApp message as read: {e}")
            return False

    async def validate_connection(self) -> bool:
        """Validate WhatsApp Business connection"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{WA_API_BASE}/{self.phone_number_id}"
                headers = {"Authorization": f"Bearer {self.access_token}"}
                response = await client.get(url, headers=headers)
                data = response.json()
                return "id" in data and "error" not in data

        except Exception as e:
            logger.error(f"Failed to validate WhatsApp connection: {e}")
            return False

    async def get_media_url(self, media_id: str) -> Optional[str]:
        """
        Get actual media URL from media ID

        WhatsApp webhook provides media IDs, need to fetch actual URLs
        """
        try:
            async with httpx.AsyncClient() as client:
                url = f"{WA_API_BASE}/{media_id}"
                headers = {"Authorization": f"Bearer {self.access_token}"}
                response = await client.get(url, headers=headers)
                data = response.json()
                return data.get("url")

        except Exception as e:
            logger.error(f"Failed to get media URL: {e}")
            return None

    async def download_media(self, media_url: str) -> Optional[bytes]:
        """Download media content from WhatsApp"""
        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {self.access_token}"}
                response = await client.get(media_url, headers=headers)
                if response.status_code == 200:
                    return response.content
                return None

        except Exception as e:
            logger.error(f"Failed to download media: {e}")
            return None

    async def get_templates(self) -> List[Dict[str, Any]]:
        """Get list of approved message templates"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{WA_API_BASE}/{self.business_account_id}/message_templates"
                headers = {"Authorization": f"Bearer {self.access_token}"}
                response = await client.get(url, headers=headers)
                data = response.json()
                return data.get("data", [])

        except Exception as e:
            logger.error(f"Failed to get templates: {e}")
            return []
