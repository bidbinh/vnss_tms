"""
Customer Intelligence - AI Chat Analyzer
Analyzes chat conversations to extract insights about customers

Features:
- Sentiment analysis
- Intent detection
- Topic extraction
- Product/service interest detection
- Customer profiling
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
from sqlmodel import Session, select
import json
import logging
import re

from app.models.crm.chat import (
    Conversation,
    Message,
    CustomerInsight,
    InsightType,
    MessageDirection,
)

logger = logging.getLogger(__name__)


class CustomerIntelligenceAnalyzer:
    """
    AI-powered analyzer for customer chat conversations

    Extracts:
    - Sentiment: positive, neutral, negative
    - Intent: inquiry, order, complaint, support, feedback
    - Topics: products, services, pricing, delivery, etc.
    - Product interests: specific products or categories mentioned
    - Customer preferences: communication style, urgency, etc.
    """

    # Keywords for sentiment analysis (Vietnamese + English)
    POSITIVE_KEYWORDS = [
        "tot", "tuyet voi", "hay", "ok", "cam on", "thank",
        "great", "good", "excellent", "happy", "satisfied",
        "rat tot", "hoan hao", "dinh", "xin", "yeu",
        "hai long", "thich", "ung y", "perfect",
    ]

    NEGATIVE_KEYWORDS = [
        "te", "chan", "kem", "xau", "khong tot", "that vong",
        "bad", "terrible", "poor", "disappointed", "angry",
        "buc minh", "phan nan", "loi", "sai", "huy",
        "refund", "return", "complaint", "problem", "issue",
    ]

    # Keywords for intent detection
    INTENT_KEYWORDS = {
        "inquiry": [
            "hoi", "cho hoi", "xin hoi", "muon biet", "thong tin",
            "gia", "bao nhieu", "the nao", "how much", "what",
            "co khong", "available", "trong", "stock",
        ],
        "order": [
            "dat hang", "mua", "order", "book", "booking",
            "giao hang", "ship", "delivery", "van chuyen",
            "thanh toan", "payment", "pay", "chuyen khoan",
        ],
        "complaint": [
            "khieu nai", "phan nan", "complaint", "problem",
            "loi", "error", "sai", "wrong", "damaged",
            "tre", "delay", "cham", "mat", "lost",
        ],
        "support": [
            "ho tro", "support", "help", "giup", "huong dan",
            "cach", "how to", "lam sao", "tutorial",
            "sua", "fix", "repair", "bao hanh", "warranty",
        ],
        "feedback": [
            "gop y", "feedback", "nhan xet", "danh gia",
            "review", "comment", "de xuat", "suggestion",
        ],
    }

    # Topic keywords
    TOPIC_KEYWORDS = {
        "pricing": ["gia", "bao nhieu", "phi", "cost", "price", "fee", "charge"],
        "shipping": ["ship", "giao hang", "van chuyen", "delivery", "gui"],
        "product": ["san pham", "hang hoa", "product", "item", "mat hang"],
        "service": ["dich vu", "service", "phuc vu"],
        "payment": ["thanh toan", "payment", "chuyen khoan", "banking"],
        "tracking": ["theo doi", "tracking", "trang thai", "status", "o dau"],
        "return": ["doi tra", "return", "refund", "hoan tien"],
        "promotion": ["khuyen mai", "giam gia", "discount", "sale", "uu dai"],
    }

    def __init__(self, session: Session):
        self.session = session

    async def analyze_conversation(self, conversation_id: str) -> Dict[str, Any]:
        """
        Analyze a conversation and extract insights

        Returns:
            Dictionary with analysis results
        """
        conversation = self.session.get(Conversation, conversation_id)
        if not conversation:
            return {"error": "Conversation not found"}

        # Get all messages in conversation
        messages = self.session.exec(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at)
        ).all()

        if not messages:
            return {"error": "No messages to analyze"}

        # Combine customer messages for analysis
        customer_text = " ".join([
            msg.content for msg in messages
            if msg.direction == MessageDirection.INBOUND.value and msg.content
        ])

        # Perform analysis
        sentiment = self._analyze_sentiment(customer_text)
        intent = self._detect_intent(customer_text)
        topics = self._extract_topics(customer_text)
        interests = self._extract_interests(customer_text)

        # Calculate overall sentiment score (-1 to 1)
        sentiment_score = self._calculate_sentiment_score(customer_text)

        # Update conversation with analysis
        conversation.sentiment_score = sentiment_score
        conversation.intent = intent
        conversation.topics = json.dumps(topics)

        self.session.add(conversation)

        # Store insights
        insights = []
        if sentiment != "neutral":
            insight = self._create_insight(
                conversation,
                InsightType.SENTIMENT.value,
                "sentiment",
                sentiment,
                abs(sentiment_score),
            )
            insights.append(insight)

        if intent:
            insight = self._create_insight(
                conversation,
                InsightType.PURCHASE_INTENT.value if intent == "order" else InsightType.FEEDBACK.value,
                "intent",
                intent,
                0.8,
            )
            insights.append(insight)

        for topic in topics:
            insight = self._create_insight(
                conversation,
                InsightType.SERVICE_INTEREST.value,
                "topic",
                topic,
                0.7,
            )
            insights.append(insight)

        for interest in interests:
            insight = self._create_insight(
                conversation,
                InsightType.PRODUCT_INTEREST.value,
                "product",
                interest,
                0.6,
            )
            insights.append(insight)

        for ins in insights:
            self.session.add(ins)

        self.session.commit()

        return {
            "conversation_id": conversation_id,
            "sentiment": sentiment,
            "sentiment_score": sentiment_score,
            "intent": intent,
            "topics": topics,
            "interests": interests,
            "insights_created": len(insights),
        }

    async def analyze_message(self, message_id: str) -> Dict[str, Any]:
        """
        Analyze a single message
        """
        message = self.session.get(Message, message_id)
        if not message or not message.content:
            return {}

        text = message.content.lower()

        sentiment = self._analyze_sentiment(text)
        intent = self._detect_intent(text)

        # Update message
        message.sentiment = sentiment
        message.intent = intent

        self.session.add(message)
        self.session.commit()

        return {
            "message_id": message_id,
            "sentiment": sentiment,
            "intent": intent,
        }

    def _analyze_sentiment(self, text: str) -> str:
        """Simple keyword-based sentiment analysis"""
        text_lower = text.lower()

        positive_count = sum(1 for kw in self.POSITIVE_KEYWORDS if kw in text_lower)
        negative_count = sum(1 for kw in self.NEGATIVE_KEYWORDS if kw in text_lower)

        if positive_count > negative_count + 1:
            return "positive"
        elif negative_count > positive_count + 1:
            return "negative"
        else:
            return "neutral"

    def _calculate_sentiment_score(self, text: str) -> float:
        """Calculate sentiment score from -1 (negative) to 1 (positive)"""
        text_lower = text.lower()

        positive_count = sum(1 for kw in self.POSITIVE_KEYWORDS if kw in text_lower)
        negative_count = sum(1 for kw in self.NEGATIVE_KEYWORDS if kw in text_lower)

        total = positive_count + negative_count
        if total == 0:
            return 0.0

        score = (positive_count - negative_count) / total
        return round(score, 2)

    def _detect_intent(self, text: str) -> str:
        """Detect primary intent from text"""
        text_lower = text.lower()

        scores = {}
        for intent, keywords in self.INTENT_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in text_lower)
            if score > 0:
                scores[intent] = score

        if not scores:
            return "inquiry"  # Default

        return max(scores, key=scores.get)

    def _extract_topics(self, text: str) -> List[str]:
        """Extract topics mentioned in text"""
        text_lower = text.lower()

        topics = []
        for topic, keywords in self.TOPIC_KEYWORDS.items():
            if any(kw in text_lower for kw in keywords):
                topics.append(topic)

        return topics

    def _extract_interests(self, text: str) -> List[str]:
        """Extract product/service interests from text"""
        interests = []
        text_lower = text.lower()

        # Common logistics/transport terms
        logistics_terms = {
            "container": ["container", "cont", "20ft", "40ft"],
            "trucking": ["xe tai", "truck", "trailer", "mooc"],
            "express": ["chuyen phat", "express", "nhanh"],
            "warehouse": ["kho", "warehouse", "luu kho"],
            "customs": ["hai quan", "customs", "thue quan"],
            "sea_freight": ["duong bien", "sea", "tau"],
            "air_freight": ["hang khong", "air", "may bay"],
        }

        for interest, keywords in logistics_terms.items():
            if any(kw in text_lower for kw in keywords):
                interests.append(interest)

        return interests

    def _create_insight(
        self,
        conversation: Conversation,
        insight_type: str,
        category: str,
        value: str,
        confidence: float,
    ) -> CustomerInsight:
        """Create a CustomerInsight record"""
        return CustomerInsight(
            tenant_id=conversation.tenant_id,
            account_id=conversation.account_id,
            contact_id=conversation.contact_id,
            conversation_id=conversation.id,
            customer_channel_id=conversation.customer_channel_id,
            channel_type=conversation.channel_type,
            insight_type=insight_type,
            category=category,
            value=value,
            confidence=confidence,
            source="ai",
            is_active=True,
        )

    async def get_customer_profile(
        self,
        account_id: Optional[str] = None,
        customer_channel_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Build customer profile from all their chat insights
        """
        query = select(CustomerInsight).where(CustomerInsight.is_active == True)

        if account_id:
            query = query.where(CustomerInsight.account_id == account_id)
        elif customer_channel_id:
            query = query.where(CustomerInsight.customer_channel_id == customer_channel_id)
        else:
            return {"error": "Either account_id or customer_channel_id required"}

        insights = self.session.exec(query).all()

        if not insights:
            return {"profile": "No data available"}

        # Aggregate insights
        profile = {
            "sentiments": [],
            "intents": [],
            "interests": [],
            "topics": [],
        }

        for ins in insights:
            if ins.insight_type == InsightType.SENTIMENT.value:
                profile["sentiments"].append(ins.value)
            elif ins.insight_type in [InsightType.PURCHASE_INTENT.value, InsightType.FEEDBACK.value]:
                profile["intents"].append(ins.value)
            elif ins.insight_type == InsightType.PRODUCT_INTEREST.value:
                profile["interests"].append(ins.value)
            elif ins.insight_type == InsightType.SERVICE_INTEREST.value:
                profile["topics"].append(ins.value)

        # Calculate averages
        avg_sentiment = "neutral"
        if profile["sentiments"]:
            pos = profile["sentiments"].count("positive")
            neg = profile["sentiments"].count("negative")
            if pos > neg:
                avg_sentiment = "positive"
            elif neg > pos:
                avg_sentiment = "negative"

        # Most common intent
        primary_intent = max(set(profile["intents"]), key=profile["intents"].count) if profile["intents"] else None

        # Unique interests
        unique_interests = list(set(profile["interests"]))
        unique_topics = list(set(profile["topics"]))

        return {
            "overall_sentiment": avg_sentiment,
            "primary_intent": primary_intent,
            "product_interests": unique_interests,
            "service_interests": unique_topics,
            "total_insights": len(insights),
            "engagement_level": "high" if len(insights) > 10 else "medium" if len(insights) > 5 else "low",
        }

    async def suggest_response(self, conversation_id: str) -> Optional[str]:
        """
        Suggest a response based on conversation analysis
        """
        conversation = self.session.get(Conversation, conversation_id)
        if not conversation:
            return None

        # Get last customer message
        last_message = self.session.exec(
            select(Message)
            .where(
                Message.conversation_id == conversation_id,
                Message.direction == MessageDirection.INBOUND.value,
            )
            .order_by(Message.created_at.desc())
            .limit(1)
        ).first()

        if not last_message or not last_message.content:
            return None

        text = last_message.content.lower()
        intent = self._detect_intent(text)

        # Generate suggestion based on intent
        suggestions = {
            "inquiry": "Cam on ban da lien he. De em ho tro thong tin chi tiet, ban vui long cho biet them...",
            "order": "Cam on ban da quan tam den dich vu cua chung toi. De dat hang, ban vui long cung cap thong tin: dia chi lay hang, dia chi giao, loai hang hoa.",
            "complaint": "Chung toi xin loi ve su bat tien nay. De xu ly nhanh nhat, ban vui long cho biet ma don hang va mo ta van de cu the.",
            "support": "Em san sang ho tro ban. Vui long cho biet cu the van de de em huong dan chi tiet.",
            "feedback": "Cam on ban da gop y. Chung toi luon lang nghe va cai thien dich vu. Y kien cua ban rat quy gia!",
        }

        return suggestions.get(intent, suggestions["inquiry"])
