"""
Script to add order_extraction feature to AI configuration database.
Run this to enable AI-powered order parsing with customer auto-assignment.
"""
import sys
import os
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlmodel import Session, select
from app.core.database import engine
from app.models.ai_config import AIFeatureConfig
import json


def add_order_extraction_feature():
    """Add order_extraction feature configuration to database"""

    with Session(engine) as session:
        # Check if feature already exists
        existing = session.exec(
            select(AIFeatureConfig).where(
                AIFeatureConfig.feature_code == "order_extraction"
            )
        ).first()

        if existing:
            print(f"✅ Feature 'order_extraction' already exists (ID: {existing.id})")
            print(f"   Enabled: {existing.is_enabled}")
            print(f"   Provider Priority: {existing.provider_priority}")
            return

        # Create new feature config
        feature = AIFeatureConfig(
            feature_code="order_extraction",
            feature_name="Order Text Extraction with Customer Matching",
            description="AI-powered order parsing with automatic customer assignment based on pickup/delivery sites. Auto-creates sites for new locations.",
            module_code="tms",
            provider_priority='["gemini", "claude", "openai"]',  # Gemini first for cost optimization
            preferred_model="gemini-1.5-flash",  # Cheapest model ~$0.00001/order
            max_retries=2,
            timeout_seconds=30,
            fallback_enabled=True,
            is_enabled=True
        )

        session.add(feature)
        session.commit()
        session.refresh(feature)

        print(f"✅ Successfully added feature 'order_extraction'!")
        print(f"   ID: {feature.id}")
        print(f"   Module: {feature.module_code}")
        print(f"   Provider Priority: {feature.provider_priority}")
        print(f"   Preferred Model: {feature.preferred_model}")
        print(f"   Enabled: {feature.is_enabled}")
        print(f"\n🎯 AI parsing is now ready to use!")
        print(f"   - Cost estimate: ~$0.0001 per 10 orders (using Gemini Flash)")
        print(f"   - Fallback chain: Gemini → Claude → OpenAI")


if __name__ == "__main__":
    try:
        add_order_extraction_feature()
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
