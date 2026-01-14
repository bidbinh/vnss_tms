#!/usr/bin/env python3
"""Check the maximum order number for ADG customer"""
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from sqlmodel import Session, select
from app.core.database import engine
from app.models.order import Order
from app.models.customer import Customer

with Session(engine) as session:
    # Get ADG customer
    adg = session.exec(
        select(Customer).where(
            Customer.code == "ADG",
            Customer.tenant_id == "TENANT_DEMO"
        )
    ).first()

    if not adg:
        print("❌ Customer ADG not found")
        sys.exit(1)

    print(f"✅ Customer: {adg.name} (ID: {adg.id})")

    # Get latest orders
    orders = session.exec(
        select(Order)
        .where(Order.customer_id == adg.id)
        .order_by(Order.created_at.desc())
        .limit(10)
    ).all()

    if not orders:
        print("No orders found for ADG")
        sys.exit(0)

    print(f"\n📋 Latest 10 orders:")
    for order in orders:
        print(f"  {order.order_code} - {order.created_at}")

    # Extract max sequence number
    max_seq = 0
    for order in orders:
        try:
            # Extract number from "ADG-123"
            parts = order.order_code.split('-')
            if len(parts) == 2:
                seq = int(parts[1].split('.')[0])  # Handle ADG-2.01 format
                if seq > max_seq:
                    max_seq = seq
        except:
            pass

    print(f"\n🔢 Max sequence number: {max_seq}")
    print(f"✨ Next order will be: ADG-{max_seq + 1}")
