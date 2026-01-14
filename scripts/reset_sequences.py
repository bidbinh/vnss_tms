#!/usr/bin/env python3
"""Reset order sequences to match actual max order numbers"""
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from sqlmodel import Session
from app.core.database import engine
from app.models.order_sequence import OrderSequence

with Session(engine) as session:
    # Delete all existing sequences for TENANT_DEMO
    deleted = session.query(OrderSequence).filter(
        OrderSequence.tenant_id == "TENANT_DEMO"
    ).delete()

    session.commit()

    print(f"✅ Deleted {deleted} old sequence records")
    print("✨ Next order creation will auto-sync from database max values")
