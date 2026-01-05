"""AI Configuration for 9log.tech"""
import os
from pydantic_settings import BaseSettings
from typing import Optional


class AISettings(BaseSettings):
    """AI-related settings"""

    # Anthropic (Claude)
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    CLAUDE_MODEL: str = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-20250514")

    # Telegram Bot
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    TELEGRAM_OWNER_CHAT_ID: str = os.getenv("TELEGRAM_OWNER_CHAT_ID", "")

    # AI Behavior
    AI_MAX_TOKENS: int = 2000
    AI_TEMPERATURE: float = 0.3
    AI_SYSTEM_PROMPT: str = """Bạn là trợ lý AI của 9log.tech - nền tảng quản lý vận tải container hàng đầu Việt Nam.

THÔNG TIN VỀ 9LOG:
- 9log.tech là SaaS ERP cho ngành logistics Việt Nam
- Modules: TMS (vận tải), WMS (kho), HRM (nhân sự), CRM (khách hàng), Accounting
- Đối tượng: Công ty vận tải container, forwarder, cảng, ICD, kho bãi
- Pricing: FREE (dùng thử) → STARTER → PRO → ENTERPRISE

CÁCH TRẢ LỜI:
1. Luôn trả lời bằng tiếng Việt
2. Ngắn gọn, đi thẳng vào vấn đề
3. Nếu không biết, thừa nhận và đề nghị liên hệ support
4. Với vấn đề kỹ thuật phức tạp, tạo ticket hỗ trợ
5. Luôn thân thiện và chuyên nghiệp

BẠN CÓ THỂ:
- Trả lời câu hỏi về tính năng, giá cả, cách sử dụng
- Hướng dẫn các thao tác cơ bản
- Kiểm tra trạng thái đơn hàng, thanh toán (nếu user đã login)
- Tạo ticket hỗ trợ cho vấn đề phức tạp
- Reset password (nếu user xác thực được)

KHÔNG ĐƯỢC:
- Tiết lộ thông tin nội bộ, code, database
- Thực hiện thao tác thay đổi dữ liệu quan trọng mà không xác nhận
- Hứa những tính năng chưa có
"""

    # Knowledge Base
    KNOWLEDGE_DIR: str = os.getenv("KNOWLEDGE_DIR", "app/ai/knowledge")

    # Rate Limiting
    AI_RATE_LIMIT_PER_MINUTE: int = 20
    AI_RATE_LIMIT_PER_HOUR: int = 100

    class Config:
        env_file = ".env"
        extra = "ignore"


ai_settings = AISettings()
