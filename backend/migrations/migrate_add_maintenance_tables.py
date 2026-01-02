"""
Add maintenance tables: schedules, records, items
Run: python -m migrations.migrate_add_maintenance_tables
"""
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import psycopg2
from app.core.config import settings

def migrate():
    # Convert DATABASE_URL from SQLAlchemy format to psycopg2 format
    db_url = settings.DATABASE_URL.replace("postgresql+psycopg2://", "postgresql://")
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    try:
        print("Step 1: Creating maintenance_schedules table...")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS maintenance_schedules (
                id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
                tenant_id VARCHAR NOT NULL,
                vehicle_id VARCHAR NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
                maintenance_type VARCHAR NOT NULL,
                interval_type VARCHAR NOT NULL,
                interval_km INTEGER,
                interval_days INTEGER,
                last_service_date DATE,
                last_service_mileage INTEGER,
                next_due_date DATE,
                next_due_mileage INTEGER,
                alert_before_days INTEGER DEFAULT 7,
                alert_before_km INTEGER DEFAULT 500,
                description VARCHAR,
                status VARCHAR NOT NULL DEFAULT 'ACTIVE',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_tenant_id
            ON maintenance_schedules(tenant_id);

            CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_vehicle_id
            ON maintenance_schedules(vehicle_id);

            CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_type
            ON maintenance_schedules(maintenance_type);
        """)

        print("Step 2: Creating maintenance_records table...")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS maintenance_records (
                id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
                tenant_id VARCHAR NOT NULL,
                vehicle_id VARCHAR NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
                schedule_id VARCHAR REFERENCES maintenance_schedules(id) ON DELETE SET NULL,
                maintenance_type VARCHAR NOT NULL,
                service_date DATE NOT NULL,
                mileage INTEGER,
                description VARCHAR NOT NULL,
                garage_name VARCHAR,
                mechanic_name VARCHAR,
                garage_address VARCHAR,
                garage_phone VARCHAR,
                total_cost INTEGER,
                attachments VARCHAR,
                note VARCHAR,
                status VARCHAR NOT NULL DEFAULT 'COMPLETED',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_maintenance_records_tenant_id
            ON maintenance_records(tenant_id);

            CREATE INDEX IF NOT EXISTS idx_maintenance_records_vehicle_id
            ON maintenance_records(vehicle_id);

            CREATE INDEX IF NOT EXISTS idx_maintenance_records_schedule_id
            ON maintenance_records(schedule_id);

            CREATE INDEX IF NOT EXISTS idx_maintenance_records_type
            ON maintenance_records(maintenance_type);

            CREATE INDEX IF NOT EXISTS idx_maintenance_records_date
            ON maintenance_records(service_date);
        """)

        print("Step 3: Creating maintenance_items table...")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS maintenance_items (
                id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
                tenant_id VARCHAR NOT NULL,
                record_id VARCHAR NOT NULL REFERENCES maintenance_records(id) ON DELETE CASCADE,
                item_type VARCHAR NOT NULL,
                item_name VARCHAR NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 1,
                unit VARCHAR,
                unit_price INTEGER NOT NULL,
                total_price INTEGER NOT NULL,
                supplier VARCHAR,
                part_number VARCHAR,
                warranty_months INTEGER,
                note VARCHAR,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_maintenance_items_tenant_id
            ON maintenance_items(tenant_id);

            CREATE INDEX IF NOT EXISTS idx_maintenance_items_record_id
            ON maintenance_items(record_id);
        """)

        conn.commit()
        print("[OK] Migration completed successfully")
        print("")
        print("Created tables:")
        print("1. maintenance_schedules - Lịch bảo trì định kỳ")
        print("2. maintenance_records - Lịch sử bảo trì đã thực hiện")
        print("3. maintenance_items - Chi tiết chi phí từng hạng mục")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate()
