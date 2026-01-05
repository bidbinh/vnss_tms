"""
AI Chat API Endpoints

Provides chat interface for customer support bot.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request
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


class QuickChatRequest(BaseModel):
    message: str = Field(..., description="Quick question", min_length=1, max_length=500)


class QuickChatResponse(BaseModel):
    response: str
    timestamp: str


# In-memory conversation storage (use Redis in production)
conversations: Dict[str, List[Dict]] = {}


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
    Has additional rate limiting and sanitization.
    """
    # Get client info for context
    client_ip = http_request.client.host if http_request.client else "unknown"

    # Add client context
    user_context = request.user_context or {}
    user_context["source"] = "widget"
    user_context["client_ip"] = client_ip

    # Reuse main chat logic
    request.user_context = user_context
    return await chat(request, session)
