# -*- coding: utf-8 -*-
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, '.')
from app.db.session import engine
from sqlmodel import Session, select
from app.models import Order, OrderStatusLog, Location
from app.models.order import OrderStatus
from datetime import datetime, timedelta

with Session(engine) as session:
    existing = session.exec(select(Location)).first()
    tenant_id = str(existing.tenant_id)
    print(f'Tenant ID: {tenant_id}')

    # Get all orders with status DELIVERED or COMPLETED
    orders = session.exec(
        select(Order).where(
            Order.tenant_id == tenant_id,
            Order.status.in_([OrderStatus.DELIVERED, OrderStatus.COMPLETED])
        )
    ).all()

    print(f"\nFound {len(orders)} orders with DELIVERED or COMPLETED status")

    created_logs = 0
    skipped_logs = 0

    for order in orders:
        # Check if order already has a DELIVERED status log
        existing_log = session.exec(
            select(OrderStatusLog).where(
                OrderStatusLog.tenant_id == tenant_id,
                OrderStatusLog.order_id == order.id,
                OrderStatusLog.to_status == OrderStatus.DELIVERED
            )
        ).first()

        if existing_log:
            print(f"  {order.order_code}: Already has DELIVERED log, skipping")
            skipped_logs += 1
            continue

        # Create DELIVERED status log
        # Use customer_requested_date as the delivery date, set time to 12:00
        if order.customer_requested_date:
            delivered_at = datetime.combine(order.customer_requested_date, datetime.min.time().replace(hour=12))
        else:
            delivered_at = order.created_at or datetime.now()

        status_log = OrderStatusLog(
            tenant_id=tenant_id,
            order_id=str(order.id),
            from_status=OrderStatus.IN_TRANSIT,  # Assume it came from IN_TRANSIT
            to_status=OrderStatus.DELIVERED,
            changed_at=delivered_at,
            changed_by=None,  # System migration
            notes="Auto-generated from imported order"
        )
        session.add(status_log)
        created_logs += 1
        print(f"  {order.order_code}: Created DELIVERED log for {delivered_at.strftime('%d/%m/%Y')}")

    session.commit()
    print(f"\n=== Summary ===")
    print(f"Created: {created_logs} status logs")
    print(f"Skipped: {skipped_logs} (already had logs)")
