"""
Migration: Add OrderStatusLog table and salary calculation flags to orders
- Create order_status_logs table to track status history
- Add is_flatbed, is_internal_cargo, is_holiday to orders table
"""

import psycopg2
from app.core.config import settings


def migrate():
    """Create order_status_logs table and add salary flags to orders"""
    db_url = settings.DATABASE_URL.replace("postgresql+psycopg2://", "postgresql://")
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    try:
        # Create order_status_logs table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS order_status_logs (
                id VARCHAR PRIMARY KEY,
                tenant_id VARCHAR NOT NULL,
                order_id VARCHAR NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                from_status VARCHAR,
                to_status VARCHAR NOT NULL,
                changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                changed_by_user_id VARCHAR REFERENCES users(id),
                note TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Create indexes for order_status_logs
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_order_status_logs_order_id
            ON order_status_logs(order_id);
        """)

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_order_status_logs_to_status
            ON order_status_logs(to_status);
        """)

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_order_status_logs_changed_at
            ON order_status_logs(changed_at);
        """)

        # Add salary calculation flags to orders
        cur.execute("""
            ALTER TABLE orders
            ADD COLUMN IF NOT EXISTS is_flatbed BOOLEAN,
            ADD COLUMN IF NOT EXISTS is_internal_cargo BOOLEAN,
            ADD COLUMN IF NOT EXISTS is_holiday BOOLEAN;
        """)

        conn.commit()
        print("Migration completed successfully")
        print("   - Created order_status_logs table with indexes")
        print("   - Added is_flatbed, is_internal_cargo, is_holiday to orders")

    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    migrate()
