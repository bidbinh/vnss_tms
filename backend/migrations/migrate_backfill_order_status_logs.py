"""
Backfill OrderStatusLog for existing orders

This migration creates status log entries for orders that were created
before the status logging feature was implemented.
"""

import os
import sys
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlmodel import Session, select
from app.db.session import engine
from app.models import Order, OrderStatusLog
import uuid


def backfill_status_logs():
    """Create status logs for existing orders based on their current status"""

    with Session(engine) as session:
        # Get all orders
        orders = session.exec(select(Order)).all()

        print(f"Found {len(orders)} orders")

        created_count = 0
        skipped_count = 0

        for order in orders:
            # Check if order already has status logs
            existing_logs = session.exec(
                select(OrderStatusLog).where(OrderStatusLog.order_id == order.id)
            ).first()

            if existing_logs:
                print(f"  SKIP: {order.order_code} - already has status logs")
                skipped_count += 1
                continue

            # Create status logs based on current status
            logs_to_create = []

            # Always create NEW status log (initial creation)
            logs_to_create.append({
                "from_status": None,
                "to_status": "NEW",
                "changed_at": order.created_at or datetime.utcnow()
            })

            # Add subsequent status logs based on current status
            current_status = order.status

            if current_status in ["ASSIGNED", "IN_TRANSIT", "DELIVERED", "COMPLETED"]:
                # Order was assigned
                logs_to_create.append({
                    "from_status": "NEW",
                    "to_status": "ASSIGNED",
                    "changed_at": order.updated_at or order.created_at or datetime.utcnow()
                })

            if current_status in ["IN_TRANSIT", "DELIVERED", "COMPLETED"]:
                # Order started transit
                logs_to_create.append({
                    "from_status": "ASSIGNED",
                    "to_status": "IN_TRANSIT",
                    "changed_at": order.updated_at or order.created_at or datetime.utcnow()
                })

            if current_status in ["DELIVERED", "COMPLETED"]:
                # Order was delivered (CRITICAL for salary calculation)
                logs_to_create.append({
                    "from_status": "IN_TRANSIT",
                    "to_status": "DELIVERED",
                    "changed_at": order.updated_at or order.created_at or datetime.utcnow()
                })

            if current_status == "COMPLETED":
                # Order was completed
                logs_to_create.append({
                    "from_status": "DELIVERED",
                    "to_status": "COMPLETED",
                    "changed_at": order.updated_at or order.created_at or datetime.utcnow()
                })

            if current_status == "REJECTED":
                # Order was rejected
                logs_to_create.append({
                    "from_status": "NEW",
                    "to_status": "REJECTED",
                    "changed_at": order.updated_at or order.created_at or datetime.utcnow()
                })

            # Create the logs
            for log_data in logs_to_create:
                log = OrderStatusLog(
                    id=str(uuid.uuid4()),
                    tenant_id=order.tenant_id,
                    order_id=order.id,
                    **log_data
                )
                session.add(log)

            print(f"  CREATE: {order.order_code} - created {len(logs_to_create)} status logs (current: {current_status})")
            created_count += 1

        # Commit all changes
        session.commit()

        print(f"\nBackfill complete!")
        print(f"  Created logs for: {created_count} orders")
        print(f"  Skipped (already have logs): {skipped_count} orders")


if __name__ == "__main__":
    print("Starting OrderStatusLog backfill migration...")
    print("=" * 60)
    backfill_status_logs()
    print("=" * 60)
    print("Migration complete!")
