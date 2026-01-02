"""
Base Chat Service
Abstract base class for chat channel integrations
"""
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from datetime import datetime


class IncomingMessage(BaseModel):
    """Normalized incoming message from any channel"""
    external_message_id: str
    sender_id: str
    sender_name: Optional[str] = None
    sender_avatar: Optional[str] = None
    content: Optional[str] = None
    message_type: str = "TEXT"
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    timestamp: datetime
    metadata: Dict[str, Any] = {}


class OutgoingMessage(BaseModel):
    """Message to send to a channel"""
    recipient_id: str
    content: Optional[str] = None
    message_type: str = "TEXT"
    media_url: Optional[str] = None
    template_id: Optional[str] = None
    template_params: Dict[str, Any] = {}
    buttons: List[Dict[str, Any]] = []


class SendResult(BaseModel):
    """Result of sending a message"""
    success: bool
    external_message_id: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None


class BaseChatService(ABC):
    """Abstract base class for chat channel integrations"""

    def __init__(self, channel_config: Dict[str, Any]):
        """
        Initialize with channel configuration

        Args:
            channel_config: Dictionary containing channel credentials and settings
        """
        self.channel_config = channel_config
        self.channel_id = channel_config.get("channel_id")
        self.access_token = channel_config.get("access_token")

    @abstractmethod
    async def verify_webhook(self, params: Dict[str, Any]) -> str:
        """
        Verify webhook challenge from the platform

        Args:
            params: Query parameters from webhook verification request

        Returns:
            Challenge string to return to platform
        """
        pass

    @abstractmethod
    async def parse_webhook(self, payload: Dict[str, Any]) -> List[IncomingMessage]:
        """
        Parse webhook payload into normalized IncomingMessage objects

        Args:
            payload: Raw webhook payload from the platform

        Returns:
            List of parsed incoming messages
        """
        pass

    @abstractmethod
    async def send_message(self, message: OutgoingMessage) -> SendResult:
        """
        Send a message through the channel

        Args:
            message: OutgoingMessage to send

        Returns:
            SendResult with success status and message ID
        """
        pass

    @abstractmethod
    async def send_template(self, recipient_id: str, template_id: str, params: Dict[str, Any]) -> SendResult:
        """
        Send a template message (for WhatsApp, Zalo ZNS)

        Args:
            recipient_id: Recipient's ID on the platform
            template_id: Template ID
            params: Template parameters

        Returns:
            SendResult with success status
        """
        pass

    @abstractmethod
    async def get_user_profile(self, user_id: str) -> Dict[str, Any]:
        """
        Get user profile information from the platform

        Args:
            user_id: User's ID on the platform

        Returns:
            Dictionary with user profile data
        """
        pass

    @abstractmethod
    async def mark_as_seen(self, sender_id: str) -> bool:
        """
        Mark messages as seen/read

        Args:
            sender_id: Sender's ID on the platform

        Returns:
            True if successful
        """
        pass

    async def validate_connection(self) -> bool:
        """
        Validate that the channel connection is working

        Returns:
            True if connection is valid
        """
        try:
            # Try to get own profile or make a simple API call
            return True
        except Exception:
            return False

    async def refresh_token(self) -> Optional[str]:
        """
        Refresh access token if expired

        Returns:
            New access token or None if refresh not supported/failed
        """
        return None
