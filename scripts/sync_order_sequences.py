#!/usr/bin/env python3
"""Sync order_sequences table with actual max order numbers from orders table"""
import sys
from pathlib import Path
import re

# Add backend to path
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from sqlmodel import Session, select
from app.core.database import engine
from app.models.order import Order
from app.models.order_sequence import OrderSequence
from app.models.customer import Customer

def extract_order_number(order_code: str) -> int:
    """Extract numeric part from order code like 'ADG-225' -> 225"""
    try:
        parts = order_code.split('-')
        if len(parts) == 2:
            # Handle formats like "ADG-225" or "ADG-2.01"
            num_str = parts[1].split('.')[0]
            return int(num_str)
    except:
        pass
    return 0

with Session(engine) as session:
    # Get all customers for TENANT_DEMO
    customers = session.exec(
        select(Customer).where(Customer.tenant_id == "TENANT_DEMO")
    ).all()

    print(f"Found {len(customers)} customers\n")

    for customer in customers:
        # Get max order number for this customer
        orders = session.exec(
            select(Order)
            .where(Order.customer_id == customer.id)
            .order_by(Order.created_at.desc())
        ).all()

        if not orders:
            print(f"⚪ {customer.code}: No orders")
            continue

        # Extract max sequence number
        max_seq = 0
        for order in orders:
            seq = extract_order_number(order.order_code)
            if seq > max_seq:
                max_seq = seq

        # Get current sequence from order_sequences table
        seq_record = session.exec(
            select(OrderSequence).where(
                OrderSequence.tenant_id == "TENANT_DEMO",
                OrderSequence.customer_code == customer.code,
                OrderSequence.yymm == "ALL"
            )
        ).first()

        if seq_record:
            old_seq = seq_record.last_seq
            if old_seq != max_seq:
                print(f"🔧 {customer.code}: Fixing {old_seq} -> {max_seq}")
                seq_record.last_seq = max_seq
                session.add(seq_record)
            else:
                print(f"✅ {customer.code}: Already correct ({max_seq})")
        else:
            print(f"➕ {customer.code}: Creating new sequence ({max_seq})")
            seq_record = OrderSequence(
                tenant_id="TENANT_DEMO",
                customer_code=customer.code,
                yymm="ALL",
                last_seq=max_seq
            )
            session.add(seq_record)

    session.commit()
    print("\n✅ All sequences synced!")
