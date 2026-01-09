"""
AI Chat Engine for 9log.tech

Uses Claude with RAG and Tool Calling for customer support.
"""
import json
from typing import Optional, Dict, Any, List
from datetime import datetime
import anthropic
from sqlmodel import Session
from sqlalchemy import text

from .config import ai_settings
from .knowledge import KnowledgeBase
from .tools import TOOL_DEFINITIONS, ToolExecutor


def get_claude_api_key_from_db(session: Optional[Session]) -> Optional[str]:
    """Get Claude API key from database (ai_providers table)"""
    if not session:
        return None
    try:
        result = session.execute(
            text("SELECT api_key FROM ai_providers WHERE provider_code = 'claude' AND is_configured = true")
        )
        row = result.fetchone()
        if row and row[0]:
            return row[0]
    except Exception:
        pass
    return None


def get_claude_model_from_db(session: Optional[Session]) -> Optional[str]:
    """Get Claude model from database"""
    if not session:
        return None
    try:
        result = session.execute(
            text("SELECT default_model FROM ai_providers WHERE provider_code = 'claude' AND is_configured = true")
        )
        row = result.fetchone()
        if row and row[0]:
            return row[0]
    except Exception:
        pass
    return None


class AIChat:
    """AI Chat Engine with RAG and Tool Calling"""

    def __init__(self, session: Optional[Session] = None):
        self.session = session

        # Try to get API key from database first, fallback to env
        self.api_key = get_claude_api_key_from_db(session) or ai_settings.ANTHROPIC_API_KEY
        self.model = get_claude_model_from_db(session) or ai_settings.CLAUDE_MODEL

        # Initialize client only if we have API key
        self.client = None
        if self.api_key:
            self.client = anthropic.Anthropic(api_key=self.api_key)

        self.knowledge_base = KnowledgeBase(ai_settings.KNOWLEDGE_DIR)
        self.tool_executor = ToolExecutor(session)

    async def chat(
        self,
        message: str,
        conversation_history: List[Dict] = None,
        user_context: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Process a chat message and return AI response.

        Args:
            message: User's message
            conversation_history: Previous messages in conversation
            user_context: Optional context about the user (tenant_id, user_id, etc.)

        Returns:
            Dict with response, tool_calls, and metadata
        """
        if not self.api_key or not self.client:
            return {
                "response": "Xin lỗi, hệ thống AI chưa được cấu hình. Vui lòng liên hệ support@9log.tech.",
                "error": "API key not configured"
            }

        # Build conversation messages
        messages = conversation_history or []
        messages.append({"role": "user", "content": message})

        # Get knowledge context
        knowledge_context = self.knowledge_base.get_context_for_query(message)

        # Build system prompt with context
        system_prompt = ai_settings.AI_SYSTEM_PROMPT
        if knowledge_context:
            system_prompt += f"\n\n{knowledge_context}"
        if user_context:
            system_prompt += f"\n\nTHÔNG TIN USER:\n{json.dumps(user_context, ensure_ascii=False, indent=2)}"

        try:
            # Call Claude
            response = self.client.messages.create(
                model=self.model,
                max_tokens=ai_settings.AI_MAX_TOKENS,
                temperature=ai_settings.AI_TEMPERATURE,
                system=system_prompt,
                messages=messages,
                tools=TOOL_DEFINITIONS
            )

            # Process response
            result = await self._process_response(response, messages)
            return result

        except anthropic.APIError as e:
            return {
                "response": "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau hoặc liên hệ support@9log.tech.",
                "error": str(e)
            }

    async def _process_response(
        self,
        response: anthropic.types.Message,
        messages: List[Dict]
    ) -> Dict[str, Any]:
        """Process Claude's response, handling tool calls if any"""

        tool_calls = []
        text_response = ""

        for block in response.content:
            if block.type == "text":
                text_response += block.text
            elif block.type == "tool_use":
                # Execute tool
                tool_result = await self.tool_executor.execute(
                    block.name,
                    block.input
                )
                tool_calls.append({
                    "tool": block.name,
                    "input": block.input,
                    "result": tool_result
                })

        # If tools were called, get final response
        if tool_calls and response.stop_reason == "tool_use":
            # Add assistant message with tool use
            messages.append({
                "role": "assistant",
                "content": response.content
            })

            # Add tool results
            tool_results_content = []
            for i, block in enumerate(response.content):
                if block.type == "tool_use":
                    tool_results_content.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(tool_calls[len(tool_results_content)]["result"], ensure_ascii=False)
                    })

            messages.append({
                "role": "user",
                "content": tool_results_content
            })

            # Get final response after tool execution
            final_response = self.client.messages.create(
                model=self.model,
                max_tokens=ai_settings.AI_MAX_TOKENS,
                temperature=ai_settings.AI_TEMPERATURE,
                system=ai_settings.AI_SYSTEM_PROMPT,
                messages=messages,
                tools=TOOL_DEFINITIONS
            )

            # Extract text from final response
            for block in final_response.content:
                if block.type == "text":
                    text_response = block.text
                    break

        return {
            "response": text_response,
            "tool_calls": tool_calls,
            "stop_reason": response.stop_reason,
            "usage": {
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens
            }
        }

    async def simple_chat(self, message: str) -> str:
        """Simple chat without conversation history - for quick queries"""
        result = await self.chat(message)
        return result.get("response", "Xin lỗi, không thể xử lý yêu cầu.")


# Singleton instance for simple usage
_chat_instance: Optional[AIChat] = None


def get_ai_chat(session: Optional[Session] = None) -> AIChat:
    """Get AI Chat instance"""
    global _chat_instance
    if _chat_instance is None or session is not None:
        _chat_instance = AIChat(session)
    return _chat_instance
