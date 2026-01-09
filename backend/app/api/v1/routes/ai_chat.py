"""
AI Chat API Endpoints

Provides chat interface for customer support bot.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from uuid import uuid4
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlmodel import Session

from app.db.session import get_session
from app.ai.chat import AIChat
from app.ai.config import ai_settings

router = APIRouter(prefix="/ai", tags=["AI Support"])


# Request/Response Models
class ChatMessage(BaseModel):
    role: str = Field(..., description="Message role: user or assistant")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    message: str = Field(..., description="User's message", min_length=1, max_length=2000)
    conversation_id: Optional[str] = Field(None, description="Conversation ID for context")
    history: Optional[List[ChatMessage]] = Field(None, description="Previous messages")
    user_context: Optional[Dict[str, Any]] = Field(None, description="User context (tenant_id, etc.)")


class ChatResponse(BaseModel):
    response: str = Field(..., description="AI response")
    conversation_id: str = Field(..., description="Conversation ID")
    tool_calls: Optional[List[Dict]] = Field(None, description="Tools called during response")
    usage: Optional[Dict] = Field(None, description="Token usage")
    timestamp: str = Field(..., description="Response timestamp")
    rate_limit: Optional[Dict] = Field(None, description="Rate limit info")


class QuickChatRequest(BaseModel):
    message: str = Field(..., description="Quick question", min_length=1, max_length=500)


class QuickChatResponse(BaseModel):
    response: str
    timestamp: str


# In-memory storage (use Redis in production)
conversations: Dict[str, List[Dict]] = {}

# Rate limiting storage: {user_key: [(timestamp, count), ...]}
rate_limit_hourly: Dict[str, List[datetime]] = defaultdict(list)
rate_limit_daily: Dict[str, List[datetime]] = defaultdict(list)


def get_user_key(user_context: Optional[Dict], client_ip: str) -> str:
    """Get unique key for rate limiting - prefer user_id, fallback to IP"""
    if user_context and user_context.get("user_id"):
        return f"user:{user_context['user_id']}"
    return f"ip:{client_ip}"


def check_rate_limit(user_key: str) -> Dict[str, Any]:
    """Check and update rate limits. Returns remaining counts."""
    now = datetime.now()
    hour_ago = now - timedelta(hours=1)
    day_ago = now - timedelta(days=1)

    # Clean old entries
    rate_limit_hourly[user_key] = [t for t in rate_limit_hourly[user_key] if t > hour_ago]
    rate_limit_daily[user_key] = [t for t in rate_limit_daily[user_key] if t > day_ago]

    hourly_count = len(rate_limit_hourly[user_key])
    daily_count = len(rate_limit_daily[user_key])

    hourly_limit = ai_settings.AI_RATE_LIMIT_PER_HOUR
    daily_limit = ai_settings.AI_RATE_LIMIT_PER_DAY

    return {
        "hourly_remaining": max(0, hourly_limit - hourly_count),
        "daily_remaining": max(0, daily_limit - daily_count),
        "hourly_limit": hourly_limit,
        "daily_limit": daily_limit,
        "can_chat": hourly_count < hourly_limit and daily_count < daily_limit,
    }


def record_chat(user_key: str):
    """Record a chat for rate limiting"""
    now = datetime.now()
    rate_limit_hourly[user_key].append(now)
    rate_limit_daily[user_key].append(now)


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    session: Session = Depends(get_session)
):
    """
    Chat with AI support bot.

    Supports:
    - Multi-turn conversations with history
    - Tool calling for actions (check order, billing, etc.)
    - RAG for knowledge base queries
    """
    # Get or create conversation
    conversation_id = request.conversation_id or str(uuid4())

    # Build history
    history = []
    if request.history:
        history = [{"role": m.role, "content": m.content} for m in request.history]
    elif conversation_id in conversations:
        history = conversations[conversation_id]

    # Create AI chat instance with session
    ai_chat = AIChat(session)

    # Get response
    result = await ai_chat.chat(
        message=request.message,
        conversation_history=history,
        user_context=request.user_context
    )

    # Update conversation history
    history.append({"role": "user", "content": request.message})
    history.append({"role": "assistant", "content": result["response"]})
    conversations[conversation_id] = history[-20:]  # Keep last 20 messages

    return ChatResponse(
        response=result["response"],
        conversation_id=conversation_id,
        tool_calls=result.get("tool_calls"),
        usage=result.get("usage"),
        timestamp=datetime.now().isoformat()
    )


@router.post("/quick", response_model=QuickChatResponse)
async def quick_chat(
    request: QuickChatRequest,
    session: Session = Depends(get_session)
):
    """
    Quick one-off chat without conversation history.
    Good for simple FAQ queries.
    """
    ai_chat = AIChat(session)
    response = await ai_chat.simple_chat(request.message)

    return QuickChatResponse(
        response=response,
        timestamp=datetime.now().isoformat()
    )


@router.get("/health")
async def ai_health():
    """Check AI service health"""
    has_api_key = bool(ai_settings.ANTHROPIC_API_KEY)

    return {
        "status": "healthy" if has_api_key else "degraded",
        "api_key_configured": has_api_key,
        "model": ai_settings.CLAUDE_MODEL,
        "timestamp": datetime.now().isoformat()
    }


@router.delete("/conversations/{conversation_id}")
async def clear_conversation(conversation_id: str):
    """Clear conversation history"""
    if conversation_id in conversations:
        del conversations[conversation_id]
        return {"message": "Conversation cleared"}
    return {"message": "Conversation not found"}


# Widget endpoint for public access
@router.post("/widget/chat", response_model=ChatResponse)
async def widget_chat(
    request: ChatRequest,
    http_request: Request,
    session: Session = Depends(get_session)
):
    """
    Public chat endpoint for website widget.
    Has rate limiting per user (20/hour, 80/day).
    """
    # Get client info
    client_ip = http_request.client.host if http_request.client else "unknown"

    # Build user context
    user_context = request.user_context or {}
    user_context["source"] = "widget"
    user_context["client_ip"] = client_ip

    # Get user key for rate limiting
    user_key = get_user_key(user_context, client_ip)

    # Check rate limit
    rate_info = check_rate_limit(user_key)

    if not rate_info["can_chat"]:
        if rate_info["hourly_remaining"] == 0:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Bạn đã dùng hết {rate_info['hourly_limit']} lượt chat trong giờ này. Thử lại sau 1 tiếng nhé! 😊"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Bạn đã dùng hết {rate_info['daily_limit']} lượt chat hôm nay. Quay lại ngày mai nhé! 😊"
            )

    # Record this chat
    record_chat(user_key)

    # Get or create conversation
    conversation_id = request.conversation_id or str(uuid4())

    # Build history
    history = []
    if request.history:
        history = [{"role": m.role, "content": m.content} for m in request.history]
    elif conversation_id in conversations:
        history = conversations[conversation_id]

    # Create AI chat instance with session
    ai_chat = AIChat(session)

    # Get response
    result = await ai_chat.chat(
        message=request.message,
        conversation_history=history,
        user_context=user_context
    )

    # Update conversation history
    history.append({"role": "user", "content": request.message})
    history.append({"role": "assistant", "content": result["response"]})
    conversations[conversation_id] = history[-20:]  # Keep last 20 messages

    # Update rate info after chat
    updated_rate_info = check_rate_limit(user_key)

    return ChatResponse(
        response=result["response"],
        conversation_id=conversation_id,
        tool_calls=result.get("tool_calls"),
        usage=result.get("usage"),
        timestamp=datetime.now().isoformat(),
        rate_limit={
            "hourly_remaining": updated_rate_info["hourly_remaining"],
            "daily_remaining": updated_rate_info["daily_remaining"],
        }
    )
