"""
Chat Handler Service
Handles incoming messages from all channels and creates/updates conversations and messages
"""
from typing import Dict, Any, Optional, List
from datetime import datetime
from sqlmodel import Session, select
import logging
import json

from app.models.crm.chat import (
    ChatChannel,
    Conversation,
    Message,
    CustomerInsight,
    ChannelType,
    ChannelStatus,
    ConversationStatus,
    MessageDirection,
    MessageType,
    MessageStatus,
)
from app.services.chat.base_service import IncomingMessage, OutgoingMessage, SendResult
from app.services.chat.zalo_service import ZaloOAService
from app.services.chat.facebook_service import FacebookMessengerService
from app.services.chat.whatsapp_service import WhatsAppBusinessService

logger = logging.getLogger(__name__)


class ChatHandler:
    """
    Central handler for all chat operations

    Responsibilities:
    - Route webhooks to appropriate channel service
    - Create/update conversations and messages
    - Handle auto-replies
    - Update channel statistics
    """

    def __init__(self, session: Session):
        self.session = session

    def get_channel_service(self, channel: ChatChannel):
        """Get appropriate service for channel type"""
        config = {
            "channel_id": channel.channel_id,
            "access_token": channel.access_token,
            "refresh_token": channel.refresh_token,
            "zalo_oa_id": channel.zalo_oa_id,
            "zalo_app_id": channel.zalo_app_id,
            "fb_page_id": channel.fb_page_id,
            "fb_app_id": channel.fb_app_id,
            "wa_phone_number_id": channel.wa_phone_number_id,
            "wa_business_account_id": channel.wa_business_account_id,
            "webhook_secret": channel.webhook_secret,
        }

        if channel.channel_type == ChannelType.ZALO_OA.value:
            return ZaloOAService(config)
        elif channel.channel_type == ChannelType.FACEBOOK.value:
            return FacebookMessengerService(config)
        elif channel.channel_type == ChannelType.WHATSAPP.value:
            return WhatsAppBusinessService(config)
        else:
            raise ValueError(f"Unsupported channel type: {channel.channel_type}")

    async def handle_webhook(
        self,
        channel_type: str,
        payload: Dict[str, Any],
        tenant_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Handle incoming webhook from any channel

        Args:
            channel_type: ZALO_OA, FACEBOOK, or WHATSAPP
            payload: Raw webhook payload
            tenant_id: Optional tenant ID (for multi-tenant)

        Returns:
            Processing result
        """
        try:
            # Find matching channel(s)
            query = select(ChatChannel).where(
                ChatChannel.channel_type == channel_type.upper(),
                ChatChannel.is_active == True,
            )
            if tenant_id:
                query = query.where(ChatChannel.tenant_id == tenant_id)

            channels = self.session.exec(query).all()

            if not channels:
                logger.warning(f"No active channels found for type: {channel_type}")
                return {"status": "no_channel"}

            results = []
            for channel in channels:
                try:
                    result = await self._process_channel_webhook(channel, payload)
                    results.append(result)
                except Exception as e:
                    logger.error(f"Error processing webhook for channel {channel.id}: {e}")
                    results.append({"channel_id": channel.id, "error": str(e)})

            return {"status": "ok", "results": results}

        except Exception as e:
            logger.error(f"Error handling webhook: {e}")
            return {"status": "error", "message": str(e)}

    async def _process_channel_webhook(
        self,
        channel: ChatChannel,
        payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Process webhook for a specific channel"""
        service = self.get_channel_service(channel)

        # Parse messages from webhook
        incoming_messages = await service.parse_webhook(payload)

        if not incoming_messages:
            return {"channel_id": channel.id, "messages_processed": 0}

        processed_count = 0
        for incoming_msg in incoming_messages:
            try:
                await self._process_incoming_message(channel, incoming_msg, service)
                processed_count += 1
            except Exception as e:
                logger.error(f"Error processing message {incoming_msg.external_message_id}: {e}")

        return {"channel_id": channel.id, "messages_processed": processed_count}

    async def _process_incoming_message(
        self,
        channel: ChatChannel,
        incoming_msg: IncomingMessage,
        service,
    ):
        """
        Process a single incoming message

        1. Find or create conversation
        2. Create message record
        3. Update conversation stats
        4. Fetch user profile if new conversation
        5. Send auto-reply if enabled
        """
        # Find or create conversation
        conversation = self._find_or_create_conversation(channel, incoming_msg)

        # Create message
        message = self._create_message(channel, conversation, incoming_msg)

        # Update conversation stats
        conversation.last_message_at = datetime.utcnow()
        conversation.last_customer_message_at = datetime.utcnow()
        conversation.message_count += 1
        conversation.customer_message_count += 1

        # Re-open if was closed/resolved
        if conversation.status in [ConversationStatus.RESOLVED.value, ConversationStatus.CLOSED.value]:
            conversation.status = ConversationStatus.OPEN.value
            conversation.resolved_at = None
            conversation.closed_at = None

        # Update channel stats
        channel.total_messages += 1

        self.session.add(conversation)
        self.session.add(message)
        self.session.add(channel)
        self.session.commit()

        # Fetch user profile if new conversation or missing info
        if not conversation.customer_name:
            await self._update_customer_profile(conversation, incoming_msg.sender_id, service)

        # Send auto-reply if enabled
        if channel.auto_reply_enabled and conversation.customer_message_count == 1:
            await self._send_auto_reply(channel, conversation, service)

    def _find_or_create_conversation(
        self,
        channel: ChatChannel,
        incoming_msg: IncomingMessage,
    ) -> Conversation:
        """Find existing conversation or create new one"""
        # Look for existing open conversation with this customer
        existing = self.session.exec(
            select(Conversation).where(
                Conversation.channel_id == channel.id,
                Conversation.customer_channel_id == incoming_msg.sender_id,
                Conversation.status.in_([
                    ConversationStatus.OPEN.value,
                    ConversationStatus.PENDING.value,
                ]),
            )
        ).first()

        if existing:
            return existing

        # Create new conversation
        conversation = Conversation(
            tenant_id=channel.tenant_id,
            channel_id=channel.id,
            channel_type=channel.channel_type,
            customer_channel_id=incoming_msg.sender_id,
            customer_name=incoming_msg.sender_name,
            customer_avatar=incoming_msg.sender_avatar,
            status=ConversationStatus.OPEN.value,
            first_message_at=incoming_msg.timestamp,
            last_message_at=incoming_msg.timestamp,
            message_count=0,
            customer_message_count=0,
            staff_message_count=0,
        )

        # Assign to default assignee if configured
        if channel.default_assignee_id:
            conversation.assigned_to = channel.default_assignee_id
            conversation.assigned_at = datetime.utcnow()

        self.session.add(conversation)

        # Update channel conversation count
        channel.total_conversations += 1
        self.session.add(channel)

        self.session.commit()
        self.session.refresh(conversation)

        return conversation

    def _create_message(
        self,
        channel: ChatChannel,
        conversation: Conversation,
        incoming_msg: IncomingMessage,
    ) -> Message:
        """Create message record from incoming message"""
        # Check for duplicate
        existing = self.session.exec(
            select(Message).where(
                Message.external_message_id == incoming_msg.external_message_id,
                Message.conversation_id == conversation.id,
            )
        ).first()

        if existing:
            return existing

        message = Message(
            tenant_id=channel.tenant_id,
            conversation_id=conversation.id,
            direction=MessageDirection.INBOUND.value,
            message_type=incoming_msg.message_type,
            sender_type="customer",
            sender_name=incoming_msg.sender_name,
            content=incoming_msg.content,
            media_url=incoming_msg.media_url,
            media_type=incoming_msg.media_type,
            status=MessageStatus.DELIVERED.value,
            external_message_id=incoming_msg.external_message_id,
            extra_data=json.dumps(incoming_msg.metadata) if incoming_msg.metadata else None,
        )

        # Set timestamp
        message.created_at = incoming_msg.timestamp

        return message

    async def _update_customer_profile(
        self,
        conversation: Conversation,
        sender_id: str,
        service,
    ):
        """Fetch and update customer profile from channel"""
        try:
            profile = await service.get_user_profile(sender_id)

            if profile:
                if profile.get("display_name"):
                    conversation.customer_name = profile["display_name"]
                if profile.get("avatar"):
                    conversation.customer_avatar = profile["avatar"]

                self.session.add(conversation)
                self.session.commit()

        except Exception as e:
            logger.warning(f"Failed to fetch customer profile: {e}")

    async def _send_auto_reply(
        self,
        channel: ChatChannel,
        conversation: Conversation,
        service,
    ):
        """Send auto-reply message"""
        if not channel.auto_reply_message:
            return

        # Check working hours if enabled
        if channel.working_hours_only:
            now = datetime.utcnow()
            # Simple check - enhance for timezone support
            if channel.working_hours_start and channel.working_hours_end:
                start = datetime.strptime(channel.working_hours_start, "%H:%M").time()
                end = datetime.strptime(channel.working_hours_end, "%H:%M").time()
                current = now.time()
                if not (start <= current <= end):
                    # Outside working hours, skip auto-reply
                    return

        try:
            result = await service.send_message(OutgoingMessage(
                recipient_id=conversation.customer_channel_id,
                content=channel.auto_reply_message,
                message_type="TEXT",
            ))

            if result.success:
                # Create message record for auto-reply
                auto_msg = Message(
                    tenant_id=channel.tenant_id,
                    conversation_id=conversation.id,
                    direction=MessageDirection.OUTBOUND.value,
                    message_type=MessageType.TEXT.value,
                    sender_type="bot",
                    sender_name="Auto Reply",
                    content=channel.auto_reply_message,
                    status=MessageStatus.SENT.value,
                    external_message_id=result.external_message_id,
                )
                self.session.add(auto_msg)

                conversation.message_count += 1
                conversation.staff_message_count += 1
                self.session.add(conversation)

                self.session.commit()

        except Exception as e:
            logger.error(f"Failed to send auto-reply: {e}")

    async def send_message(
        self,
        conversation_id: str,
        content: str,
        message_type: str = "TEXT",
        sender_id: Optional[str] = None,
        sender_name: Optional[str] = None,
        media_url: Optional[str] = None,
        template_id: Optional[str] = None,
        template_params: Optional[Dict[str, Any]] = None,
    ) -> SendResult:
        """
        Send a message in a conversation

        Args:
            conversation_id: Conversation ID
            content: Message content
            message_type: TEXT, IMAGE, FILE, TEMPLATE
            sender_id: Staff user ID
            sender_name: Staff name
            media_url: URL for media messages
            template_id: Template ID for template messages
            template_params: Template parameters

        Returns:
            SendResult with success status
        """
        conversation = self.session.get(Conversation, conversation_id)
        if not conversation:
            return SendResult(success=False, error_code="NOT_FOUND", error_message="Conversation not found")

        channel = self.session.get(ChatChannel, conversation.channel_id)
        if not channel:
            return SendResult(success=False, error_code="NO_CHANNEL", error_message="Channel not found")

        service = self.get_channel_service(channel)

        # Send via channel
        if template_id:
            result = await service.send_template(
                conversation.customer_channel_id,
                template_id,
                template_params or {}
            )
        else:
            result = await service.send_message(OutgoingMessage(
                recipient_id=conversation.customer_channel_id,
                content=content,
                message_type=message_type,
                media_url=media_url,
            ))

        if result.success:
            # Create message record
            message = Message(
                tenant_id=channel.tenant_id,
                conversation_id=conversation_id,
                direction=MessageDirection.OUTBOUND.value,
                message_type=message_type,
                sender_type="staff",
                sender_id=sender_id,
                sender_name=sender_name,
                content=content,
                media_url=media_url,
                template_id=template_id,
                template_params=json.dumps(template_params) if template_params else None,
                status=MessageStatus.SENT.value,
                external_message_id=result.external_message_id,
            )
            self.session.add(message)

            # Update conversation
            conversation.last_message_at = datetime.utcnow()
            conversation.message_count += 1
            conversation.staff_message_count += 1

            # Calculate first response time
            if conversation.staff_message_count == 1 and conversation.first_message_at:
                response_time = int((datetime.utcnow() - conversation.first_message_at).total_seconds())
                conversation.response_time_seconds = response_time

            self.session.add(conversation)
            self.session.commit()

        return result

    async def link_to_crm(
        self,
        conversation_id: str,
        account_id: Optional[str] = None,
        contact_id: Optional[str] = None,
    ) -> bool:
        """Link conversation to CRM account/contact"""
        conversation = self.session.get(Conversation, conversation_id)
        if not conversation:
            return False

        if account_id:
            conversation.account_id = account_id
        if contact_id:
            conversation.contact_id = contact_id

        conversation.updated_at = datetime.utcnow()
        self.session.add(conversation)
        self.session.commit()

        return True
