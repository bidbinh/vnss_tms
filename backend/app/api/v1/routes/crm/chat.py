"""
CRM - Omnichannel Chat API Routes
Chat Inbox, Conversations, Messages, Channels management
"""
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlmodel import Session, select, func, or_, and_
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import json

from app.db.session import get_session
from app.models import User
from app.models.crm.chat import (
    ChatChannel, ChannelType, ChannelStatus,
    Conversation, ConversationStatus,
    Message, MessageDirection, MessageType, MessageStatus,
    CustomerInsight, InsightType,
    QuickReply, ChatTemplate, AutoReplyRule,
)
from app.models.crm.account import Account
from app.models.crm.contact import Contact
from app.core.security import get_current_user

router = APIRouter(prefix="/chat", tags=["CRM - Chat Inbox"])


# ==================== SCHEMAS ====================

class ChannelCreate(BaseModel):
    name: str
    channel_type: str  # ZALO_OA, FACEBOOK, WHATSAPP
    channel_id: str    # OA ID, Page ID, Phone Number ID
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    auto_reply_enabled: bool = True
    auto_reply_message: Optional[str] = None
    working_hours_only: bool = False
    working_hours_start: Optional[str] = None
    working_hours_end: Optional[str] = None
    default_assignee_id: Optional[str] = None


class ChannelUpdate(BaseModel):
    name: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    status: Optional[str] = None
    auto_reply_enabled: Optional[bool] = None
    auto_reply_message: Optional[str] = None
    working_hours_only: Optional[bool] = None
    working_hours_start: Optional[str] = None
    working_hours_end: Optional[str] = None
    default_assignee_id: Optional[str] = None
    is_active: Optional[bool] = None


class ConversationUpdate(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    account_id: Optional[str] = None
    contact_id: Optional[str] = None
    priority: Optional[int] = None
    is_starred: Optional[bool] = None
    tags: Optional[List[str]] = None
    internal_notes: Optional[str] = None


class MessageCreate(BaseModel):
    content: str
    message_type: str = "TEXT"
    media_url: Optional[str] = None
    template_id: Optional[str] = None


class QuickReplyCreate(BaseModel):
    title: str
    shortcut: Optional[str] = None
    content: str
    category: Optional[str] = None
    supported_channels: Optional[List[str]] = None


class QuickReplyUpdate(BaseModel):
    title: Optional[str] = None
    shortcut: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    supported_channels: Optional[List[str]] = None
    is_active: Optional[bool] = None


# ==================== CHANNEL ROUTES ====================

@router.get("/channels")
def list_channels(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    channel_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
):
    """List all chat channels"""
    tenant_id = str(current_user.tenant_id)

    query = select(ChatChannel).where(ChatChannel.tenant_id == tenant_id)

    if channel_type:
        query = query.where(ChatChannel.channel_type == channel_type)
    if status:
        query = query.where(ChatChannel.status == status)
    if is_active is not None:
        query = query.where(ChatChannel.is_active == is_active)

    channels = session.exec(query.order_by(ChatChannel.created_at.desc())).all()

    return {
        "items": [
            {
                "id": ch.id,
                "name": ch.name,
                "channel_type": ch.channel_type,
                "channel_id": ch.channel_id,
                "channel_name": ch.channel_name,
                "status": ch.status,
                "is_active": ch.is_active,
                "total_conversations": ch.total_conversations,
                "total_messages": ch.total_messages,
                "webhook_verified": ch.webhook_verified,
                "auto_reply_enabled": ch.auto_reply_enabled,
                "auto_reply_message": ch.auto_reply_message,
                "access_token": ch.access_token,
                "refresh_token": ch.refresh_token,
                "created_at": str(ch.created_at) if ch.created_at else None,
            }
            for ch in channels
        ],
        "total": len(channels)
    }


@router.post("/channels")
def create_channel(
    payload: ChannelCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new chat channel"""
    tenant_id = str(current_user.tenant_id)

    # Validate channel type
    if payload.channel_type not in [ct.value for ct in ChannelType]:
        raise HTTPException(400, f"Invalid channel type: {payload.channel_type}")

    # Check duplicate
    existing = session.exec(
        select(ChatChannel).where(
            ChatChannel.tenant_id == tenant_id,
            ChatChannel.channel_type == payload.channel_type,
            ChatChannel.channel_id == payload.channel_id,
        )
    ).first()
    if existing:
        raise HTTPException(400, f"Channel already exists with ID: {payload.channel_id}")

    channel = ChatChannel(
        tenant_id=tenant_id,
        **payload.model_dump(),
        status=ChannelStatus.PENDING.value,
        created_by=str(current_user.id),
    )

    session.add(channel)
    session.commit()
    session.refresh(channel)

    return channel


@router.get("/channels/{channel_id}")
def get_channel(
    channel_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get channel details"""
    tenant_id = str(current_user.tenant_id)

    channel = session.get(ChatChannel, channel_id)
    if not channel or str(channel.tenant_id) != tenant_id:
        raise HTTPException(404, "Channel not found")

    return channel


@router.put("/channels/{channel_id}")
def update_channel(
    channel_id: str,
    payload: ChannelUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a chat channel"""
    tenant_id = str(current_user.tenant_id)

    channel = session.get(ChatChannel, channel_id)
    if not channel or str(channel.tenant_id) != tenant_id:
        raise HTTPException(404, "Channel not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(channel, key, value)

    channel.updated_at = datetime.utcnow()
    session.add(channel)
    session.commit()
    session.refresh(channel)

    return channel


@router.delete("/channels/{channel_id}")
def delete_channel(
    channel_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete a chat channel"""
    tenant_id = str(current_user.tenant_id)

    channel = session.get(ChatChannel, channel_id)
    if not channel or str(channel.tenant_id) != tenant_id:
        raise HTTPException(404, "Channel not found")

    # Check if channel has conversations
    conv_count = session.exec(
        select(func.count()).where(Conversation.channel_id == channel_id)
    ).one()
    if conv_count > 0:
        raise HTTPException(400, f"Cannot delete channel with {conv_count} conversation(s)")

    session.delete(channel)
    session.commit()

    return {"success": True, "message": "Channel deleted"}


# ==================== CONVERSATION ROUTES ====================

@router.get("/conversations")
def list_conversations(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    channel_id: Optional[str] = Query(None),
    channel_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    assigned_to: Optional[str] = Query(None, description="Filter by assignee, use 'me' for current user, 'unassigned' for none"),
    account_id: Optional[str] = Query(None),
    is_starred: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
):
    """List conversations (Chat Inbox)"""
    tenant_id = str(current_user.tenant_id)

    query = select(Conversation).where(Conversation.tenant_id == tenant_id)

    if channel_id:
        query = query.where(Conversation.channel_id == channel_id)
    if channel_type:
        query = query.where(Conversation.channel_type == channel_type)
    if status:
        query = query.where(Conversation.status == status)
    if assigned_to:
        if assigned_to == "me":
            query = query.where(Conversation.assigned_to == str(current_user.id))
        elif assigned_to == "unassigned":
            query = query.where(Conversation.assigned_to == None)
        else:
            query = query.where(Conversation.assigned_to == assigned_to)
    if account_id:
        query = query.where(Conversation.account_id == account_id)
    if is_starred is not None:
        query = query.where(Conversation.is_starred == is_starred)
    if search:
        query = query.where(
            or_(
                Conversation.customer_name.ilike(f"%{search}%"),
                Conversation.customer_phone.ilike(f"%{search}%"),
            )
        )

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Order by last message, prioritize open conversations
    query = query.order_by(
        Conversation.status.asc(),  # OPEN first
        Conversation.last_message_at.desc().nullslast()
    )

    # Pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    conversations = session.exec(query).all()

    # Enrich with channel info and last message
    items = []
    for conv in conversations:
        channel = session.get(ChatChannel, conv.channel_id)

        # Get last message
        last_message = session.exec(
            select(Message)
            .where(Message.conversation_id == conv.id)
            .order_by(Message.created_at.desc())
            .limit(1)
        ).first()

        # Get unread count (messages from customer after last staff message)
        unread_count = 0
        if conv.status == ConversationStatus.OPEN.value:
            unread_query = select(func.count()).where(
                Message.conversation_id == conv.id,
                Message.direction == MessageDirection.INBOUND.value,
                Message.read_at == None,
            )
            unread_count = session.exec(unread_query).one()

        # Get account info if linked
        account = session.get(Account, conv.account_id) if conv.account_id else None

        items.append({
            "id": conv.id,
            "channel": {
                "id": channel.id if channel else None,
                "name": channel.name if channel else None,
                "type": channel.channel_type if channel else conv.channel_type,
            },
            "customer": {
                "channel_id": conv.customer_channel_id,
                "name": conv.customer_name,
                "avatar": conv.customer_avatar,
                "phone": conv.customer_phone,
            },
            "account": {
                "id": account.id,
                "code": account.code,
                "name": account.name,
            } if account else None,
            "status": conv.status,
            "assigned_to": conv.assigned_to,
            "priority": conv.priority,
            "is_starred": conv.is_starred,
            "message_count": conv.message_count,
            "unread_count": unread_count,
            "last_message": {
                "content": last_message.content[:100] if last_message and last_message.content else None,
                "direction": last_message.direction if last_message else None,
                "created_at": str(last_message.created_at) if last_message else None,
            } if last_message else None,
            "last_message_at": str(conv.last_message_at) if conv.last_message_at else None,
            "first_message_at": str(conv.first_message_at) if conv.first_message_at else None,
            "tags": json.loads(conv.tags) if conv.tags else [],
            "sentiment_score": conv.sentiment_score,
            "intent": conv.intent,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.get("/conversations/{conversation_id}")
def get_conversation(
    conversation_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get conversation details with messages"""
    tenant_id = str(current_user.tenant_id)

    conv = session.get(Conversation, conversation_id)
    if not conv or str(conv.tenant_id) != tenant_id:
        raise HTTPException(404, "Conversation not found")

    channel = session.get(ChatChannel, conv.channel_id)
    account = session.get(Account, conv.account_id) if conv.account_id else None
    contact = session.get(Contact, conv.contact_id) if conv.contact_id else None

    return {
        **conv.model_dump(),
        "channel": {
            "id": channel.id if channel else None,
            "name": channel.name if channel else None,
            "type": channel.channel_type if channel else None,
        },
        "account": {
            "id": account.id,
            "code": account.code,
            "name": account.name,
        } if account else None,
        "contact": {
            "id": contact.id,
            "full_name": contact.full_name,
            "phone": contact.phone,
            "email": contact.email,
        } if contact else None,
        "tags": json.loads(conv.tags) if conv.tags else [],
        "topics": json.loads(conv.topics) if conv.topics else [],
    }


@router.put("/conversations/{conversation_id}")
def update_conversation(
    conversation_id: str,
    payload: ConversationUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update conversation (assign, link to account, change status, etc.)"""
    tenant_id = str(current_user.tenant_id)

    conv = session.get(Conversation, conversation_id)
    if not conv or str(conv.tenant_id) != tenant_id:
        raise HTTPException(404, "Conversation not found")

    update_data = payload.model_dump(exclude_unset=True)

    # Handle tags serialization
    if "tags" in update_data and update_data["tags"] is not None:
        update_data["tags"] = json.dumps(update_data["tags"])

    # Handle status changes
    if "status" in update_data:
        if update_data["status"] == ConversationStatus.RESOLVED.value:
            conv.resolved_at = datetime.utcnow()
        elif update_data["status"] == ConversationStatus.CLOSED.value:
            conv.closed_at = datetime.utcnow()

    # Handle assignment
    if "assigned_to" in update_data and update_data["assigned_to"] is not None:
        if conv.assigned_to != update_data["assigned_to"]:
            conv.assigned_at = datetime.utcnow()

    for key, value in update_data.items():
        setattr(conv, key, value)

    conv.updated_at = datetime.utcnow()
    session.add(conv)
    session.commit()
    session.refresh(conv)

    return conv


@router.post("/conversations/{conversation_id}/assign")
def assign_conversation(
    conversation_id: str,
    user_id: Optional[str] = Query(None, description="User ID to assign, null to unassign"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Assign conversation to a user"""
    tenant_id = str(current_user.tenant_id)

    conv = session.get(Conversation, conversation_id)
    if not conv or str(conv.tenant_id) != tenant_id:
        raise HTTPException(404, "Conversation not found")

    if user_id:
        # Verify user exists
        assignee = session.get(User, user_id)
        if not assignee or str(assignee.tenant_id) != tenant_id:
            raise HTTPException(400, "Invalid user")

    conv.assigned_to = user_id
    conv.assigned_at = datetime.utcnow() if user_id else None
    conv.updated_at = datetime.utcnow()

    session.add(conv)
    session.commit()

    return {"success": True, "assigned_to": user_id}


@router.post("/conversations/{conversation_id}/link-account")
def link_conversation_to_account(
    conversation_id: str,
    account_id: str,
    contact_id: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Link conversation to CRM Account/Contact"""
    tenant_id = str(current_user.tenant_id)

    conv = session.get(Conversation, conversation_id)
    if not conv or str(conv.tenant_id) != tenant_id:
        raise HTTPException(404, "Conversation not found")

    # Verify account
    account = session.get(Account, account_id)
    if not account or str(account.tenant_id) != tenant_id:
        raise HTTPException(400, "Invalid account")

    # Verify contact if provided
    if contact_id:
        contact = session.get(Contact, contact_id)
        if not contact or str(contact.tenant_id) != tenant_id:
            raise HTTPException(400, "Invalid contact")
        if contact.account_id != account_id:
            raise HTTPException(400, "Contact does not belong to this account")

    conv.account_id = account_id
    conv.contact_id = contact_id
    conv.updated_at = datetime.utcnow()

    session.add(conv)
    session.commit()
    session.refresh(conv)

    return {
        "success": True,
        "account_id": account_id,
        "contact_id": contact_id,
        "account_name": account.name,
    }


# ==================== MESSAGE ROUTES ====================

@router.get("/conversations/{conversation_id}/messages")
def list_messages(
    conversation_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    before_id: Optional[str] = Query(None, description="Load messages before this ID"),
):
    """List messages in a conversation"""
    tenant_id = str(current_user.tenant_id)

    conv = session.get(Conversation, conversation_id)
    if not conv or str(conv.tenant_id) != tenant_id:
        raise HTTPException(404, "Conversation not found")

    query = select(Message).where(Message.conversation_id == conversation_id)

    # For pagination using cursor
    if before_id:
        before_msg = session.get(Message, before_id)
        if before_msg:
            query = query.where(Message.created_at < before_msg.created_at)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Order by newest first for loading, but we'll reverse in frontend
    query = query.order_by(Message.created_at.desc())

    # Pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    messages = session.exec(query).all()

    # Mark inbound messages as read
    for msg in messages:
        if msg.direction == MessageDirection.INBOUND.value and msg.read_at is None:
            msg.read_at = datetime.utcnow()
            session.add(msg)
    session.commit()

    items = [
        {
            "id": msg.id,
            "direction": msg.direction,
            "message_type": msg.message_type,
            "sender_type": msg.sender_type,
            "sender_id": msg.sender_id,
            "sender_name": msg.sender_name,
            "content": msg.content,
            "media_url": msg.media_url,
            "media_type": msg.media_type,
            "media_filename": msg.media_filename,
            "thumbnail_url": msg.thumbnail_url,
            "status": msg.status,
            "delivered_at": str(msg.delivered_at) if msg.delivered_at else None,
            "read_at": str(msg.read_at) if msg.read_at else None,
            "reply_to_message_id": msg.reply_to_message_id,
            "buttons": json.loads(msg.buttons) if msg.buttons else None,
            "quick_replies": json.loads(msg.quick_replies) if msg.quick_replies else None,
            "sentiment": msg.sentiment,
            "intent": msg.intent,
            "created_at": str(msg.created_at) if msg.created_at else None,
        }
        for msg in reversed(messages)  # Reverse to get chronological order
    ]

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": total > page * page_size,
    }


@router.post("/conversations/{conversation_id}/messages")
def send_message(
    conversation_id: str,
    payload: MessageCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Send a message in a conversation"""
    tenant_id = str(current_user.tenant_id)

    conv = session.get(Conversation, conversation_id)
    if not conv or str(conv.tenant_id) != tenant_id:
        raise HTTPException(404, "Conversation not found")

    # Create message
    user_name = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or current_user.email
    message = Message(
        tenant_id=tenant_id,
        conversation_id=conversation_id,
        direction=MessageDirection.OUTBOUND.value,
        message_type=payload.message_type,
        sender_type="staff",
        sender_id=str(current_user.id),
        sender_name=user_name,
        content=payload.content,
        media_url=payload.media_url,
        template_id=payload.template_id,
        status=MessageStatus.PENDING.value,
    )

    session.add(message)

    # Update conversation
    conv.last_message_at = datetime.utcnow()
    conv.message_count += 1
    conv.staff_message_count += 1

    # Calculate first response time if this is first staff message
    if conv.staff_message_count == 1 and conv.first_message_at:
        response_seconds = int((datetime.utcnow() - conv.first_message_at).total_seconds())
        conv.response_time_seconds = response_seconds

    # Auto-assign if unassigned
    if not conv.assigned_to:
        conv.assigned_to = str(current_user.id)
        conv.assigned_at = datetime.utcnow()

    # Change status to pending (waiting for customer response)
    if conv.status == ConversationStatus.OPEN.value:
        conv.status = ConversationStatus.PENDING.value

    session.add(conv)
    session.commit()
    session.refresh(message)

    # TODO: Send to actual channel via integration service
    # For now, mark as sent
    message.status = MessageStatus.SENT.value
    session.add(message)
    session.commit()

    return {
        "id": message.id,
        "content": message.content,
        "status": message.status,
        "created_at": str(message.created_at),
    }


# ==================== QUICK REPLY ROUTES ====================

@router.get("/quick-replies")
def list_quick_replies(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    """List quick reply templates"""
    tenant_id = str(current_user.tenant_id)

    query = select(QuickReply).where(
        QuickReply.tenant_id == tenant_id,
        QuickReply.is_active == True,
    )

    if category:
        query = query.where(QuickReply.category == category)
    if search:
        query = query.where(
            or_(
                QuickReply.title.ilike(f"%{search}%"),
                QuickReply.shortcut.ilike(f"%{search}%"),
                QuickReply.content.ilike(f"%{search}%"),
            )
        )

    query = query.order_by(QuickReply.sort_order, QuickReply.usage_count.desc())
    replies = session.exec(query).all()

    return {
        "items": [
            {
                "id": r.id,
                "title": r.title,
                "shortcut": r.shortcut,
                "content": r.content,
                "category": r.category,
                "usage_count": r.usage_count,
            }
            for r in replies
        ]
    }


@router.post("/quick-replies")
def create_quick_reply(
    payload: QuickReplyCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a quick reply template"""
    tenant_id = str(current_user.tenant_id)

    # Check shortcut uniqueness
    if payload.shortcut:
        existing = session.exec(
            select(QuickReply).where(
                QuickReply.tenant_id == tenant_id,
                QuickReply.shortcut == payload.shortcut,
            )
        ).first()
        if existing:
            raise HTTPException(400, f"Shortcut '{payload.shortcut}' already exists")

    reply = QuickReply(
        tenant_id=tenant_id,
        title=payload.title,
        shortcut=payload.shortcut,
        content=payload.content,
        category=payload.category,
        supported_channels=json.dumps(payload.supported_channels) if payload.supported_channels else None,
        has_placeholders="{" in payload.content,
        created_by=str(current_user.id),
    )

    session.add(reply)
    session.commit()
    session.refresh(reply)

    return reply


@router.put("/quick-replies/{reply_id}")
def update_quick_reply(
    reply_id: str,
    payload: QuickReplyUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a quick reply template"""
    tenant_id = str(current_user.tenant_id)

    reply = session.get(QuickReply, reply_id)
    if not reply or str(reply.tenant_id) != tenant_id:
        raise HTTPException(404, "Quick reply not found")

    update_data = payload.model_dump(exclude_unset=True)

    if "supported_channels" in update_data and update_data["supported_channels"] is not None:
        update_data["supported_channels"] = json.dumps(update_data["supported_channels"])

    if "content" in update_data:
        update_data["has_placeholders"] = "{" in update_data["content"]

    for key, value in update_data.items():
        setattr(reply, key, value)

    reply.updated_at = datetime.utcnow()
    session.add(reply)
    session.commit()
    session.refresh(reply)

    return reply


@router.delete("/quick-replies/{reply_id}")
def delete_quick_reply(
    reply_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete a quick reply template"""
    tenant_id = str(current_user.tenant_id)

    reply = session.get(QuickReply, reply_id)
    if not reply or str(reply.tenant_id) != tenant_id:
        raise HTTPException(404, "Quick reply not found")

    session.delete(reply)
    session.commit()

    return {"success": True}


# ==================== INBOX STATS ====================

@router.get("/stats")
def get_inbox_stats(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get chat inbox statistics"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    # Total conversations by status
    open_count = session.exec(
        select(func.count()).where(
            Conversation.tenant_id == tenant_id,
            Conversation.status == ConversationStatus.OPEN.value,
        )
    ).one()

    pending_count = session.exec(
        select(func.count()).where(
            Conversation.tenant_id == tenant_id,
            Conversation.status == ConversationStatus.PENDING.value,
        )
    ).one()

    resolved_count = session.exec(
        select(func.count()).where(
            Conversation.tenant_id == tenant_id,
            Conversation.status == ConversationStatus.RESOLVED.value,
        )
    ).one()

    # Assigned to me
    my_conversations = session.exec(
        select(func.count()).where(
            Conversation.tenant_id == tenant_id,
            Conversation.assigned_to == user_id,
            Conversation.status.in_([ConversationStatus.OPEN.value, ConversationStatus.PENDING.value]),
        )
    ).one()

    # Unassigned
    unassigned = session.exec(
        select(func.count()).where(
            Conversation.tenant_id == tenant_id,
            Conversation.assigned_to == None,
            Conversation.status.in_([ConversationStatus.OPEN.value, ConversationStatus.PENDING.value]),
        )
    ).one()

    # Unread messages (inbound without read_at)
    unread_messages = session.exec(
        select(func.count()).where(
            Message.tenant_id == tenant_id,
            Message.direction == MessageDirection.INBOUND.value,
            Message.read_at == None,
        )
    ).one()

    # Starred
    starred = session.exec(
        select(func.count()).where(
            Conversation.tenant_id == tenant_id,
            Conversation.is_starred == True,
        )
    ).one()

    # Channel breakdown
    channel_stats = session.exec(
        select(
            Conversation.channel_type,
            func.count().label("count")
        )
        .where(Conversation.tenant_id == tenant_id)
        .group_by(Conversation.channel_type)
    ).all()

    return {
        "open": open_count,
        "pending": pending_count,
        "resolved": resolved_count,
        "my_conversations": my_conversations,
        "unassigned": unassigned,
        "unread_messages": unread_messages,
        "starred": starred,
        "by_channel": {
            stat[0]: stat[1] for stat in channel_stats
        },
    }


# ==================== CUSTOMER INSIGHTS ====================

@router.get("/conversations/{conversation_id}/insights")
def get_conversation_insights(
    conversation_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get customer insights from conversation"""
    tenant_id = str(current_user.tenant_id)

    conv = session.get(Conversation, conversation_id)
    if not conv or str(conv.tenant_id) != tenant_id:
        raise HTTPException(404, "Conversation not found")

    insights = session.exec(
        select(CustomerInsight).where(
            CustomerInsight.conversation_id == conversation_id,
            CustomerInsight.is_active == True,
        )
    ).all()

    # Group by type
    grouped = {}
    for ins in insights:
        if ins.insight_type not in grouped:
            grouped[ins.insight_type] = []
        grouped[ins.insight_type].append({
            "id": ins.id,
            "category": ins.category,
            "value": ins.value,
            "confidence": ins.confidence,
            "source": ins.source,
            "created_at": str(ins.created_at) if ins.created_at else None,
        })

    return {
        "conversation_id": conversation_id,
        "customer_channel_id": conv.customer_channel_id,
        "account_id": conv.account_id,
        "insights": grouped,
        "summary": {
            "sentiment_score": conv.sentiment_score,
            "intent": conv.intent,
            "topics": json.loads(conv.topics) if conv.topics else [],
        }
    }


@router.post("/conversations/{conversation_id}/analyze")
async def analyze_conversation(
    conversation_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Analyze conversation with AI to extract customer insights

    Performs:
    - Sentiment analysis
    - Intent detection
    - Topic extraction
    - Product/service interest detection
    """
    from app.services.chat.ai_analyzer import CustomerIntelligenceAnalyzer

    tenant_id = str(current_user.tenant_id)

    conv = session.get(Conversation, conversation_id)
    if not conv or str(conv.tenant_id) != tenant_id:
        raise HTTPException(404, "Conversation not found")

    analyzer = CustomerIntelligenceAnalyzer(session)
    result = await analyzer.analyze_conversation(conversation_id)

    return result


@router.get("/conversations/{conversation_id}/suggest-response")
async def get_suggested_response(
    conversation_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Get AI-suggested response for conversation
    """
    from app.services.chat.ai_analyzer import CustomerIntelligenceAnalyzer

    tenant_id = str(current_user.tenant_id)

    conv = session.get(Conversation, conversation_id)
    if not conv or str(conv.tenant_id) != tenant_id:
        raise HTTPException(404, "Conversation not found")

    analyzer = CustomerIntelligenceAnalyzer(session)
    suggestion = await analyzer.suggest_response(conversation_id)

    return {
        "conversation_id": conversation_id,
        "suggested_response": suggestion,
    }


@router.get("/customer-profile/{identifier}")
async def get_customer_profile(
    identifier: str,
    identifier_type: str = Query("account_id", description="account_id or channel_id"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Get customer profile built from chat insights
    """
    from app.services.chat.ai_analyzer import CustomerIntelligenceAnalyzer

    analyzer = CustomerIntelligenceAnalyzer(session)

    if identifier_type == "account_id":
        profile = await analyzer.get_customer_profile(account_id=identifier)
    else:
        profile = await analyzer.get_customer_profile(customer_channel_id=identifier)

    return profile


# ==================== WEBHOOK ENDPOINTS (for channel integrations) ====================

@router.post("/webhook/{channel_type}")
async def webhook_handler(
    channel_type: str,
    request_body: dict,
    session: Session = Depends(get_session),
):
    """
    Webhook endpoint for receiving messages from channels.

    Supported channel types:
    - zalo_oa: Zalo Official Account
    - facebook: Facebook Messenger
    - whatsapp: WhatsApp Business

    The endpoint processes incoming messages and creates
    conversations/messages in the database.
    """
    from app.services.chat.chat_handler import ChatHandler

    try:
        handler = ChatHandler(session)
        result = await handler.handle_webhook(
            channel_type=channel_type.upper(),
            payload=request_body,
        )
        return result
    except Exception as e:
        import logging
        logging.error(f"Webhook error for {channel_type}: {e}")
        return {"status": "error", "message": str(e)}


@router.get("/webhook/{channel_type}")
async def webhook_verify(
    channel_type: str,
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge"),
    session: Session = Depends(get_session),
):
    """
    Webhook verification endpoint for Facebook/WhatsApp.

    Facebook and WhatsApp use this to verify webhook URL ownership.
    Zalo uses POST with signature verification instead.
    """
    from fastapi.responses import PlainTextResponse

    # Facebook/WhatsApp verification
    if hub_mode == "subscribe":
        # Find a channel with this type to get verify token
        channel = session.exec(
            select(ChatChannel).where(
                ChatChannel.channel_type == channel_type.upper(),
                ChatChannel.is_active == True,
            )
        ).first()

        if channel and channel.webhook_secret:
            if hub_verify_token == channel.webhook_secret:
                # Mark webhook as verified
                channel.webhook_verified = True
                session.add(channel)
                session.commit()
                return PlainTextResponse(content=hub_challenge or "")

        # Still return challenge for initial setup
        return PlainTextResponse(content=hub_challenge or "")

    return {"status": "ok"}
