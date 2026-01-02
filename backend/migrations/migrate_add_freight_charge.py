"""
Migration: Add freight_charge column to orders table
Run: python -m migrations.migrate_add_freight_charge
"""

from sqlalchemy import text
from app.db.session import engine


def migrate():
    """Add freight_charge column to orders table"""
    with engine.connect() as conn:
        # Check if column already exists
        result = conn.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name='orders' AND column_name='freight_charge'
        """))

        if result.fetchone():
            print("[OK] Column 'freight_charge' already exists")
            return

        # Add freight_charge column
        conn.execute(text("""
            ALTER TABLE orders
            ADD COLUMN freight_charge INTEGER
        """))

        conn.commit()
        print("[OK] Added 'freight_charge' column to orders table")


if __name__ == "__main__":
    migrate()
    print("Migration completed successfully!")
