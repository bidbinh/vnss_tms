"""
Migration: Add document fields to orders table
Run: python -m migrations.migrate_add_order_document_fields
"""

from sqlalchemy import text
from app.db.session import engine


def migrate():
    """Add document fields to orders table"""
    columns_to_add = [
        ("container_receipt", "VARCHAR(255)"),  # Phiếu giao nhận container
        ("delivery_order_no", "VARCHAR(255)"),  # DO - Delivery Order
        ("handover_report", "VARCHAR(255)"),    # Biên bản bàn giao hàng
        ("seal_no", "VARCHAR(255)"),            # Số seal
    ]

    with engine.connect() as conn:
        for column_name, column_type in columns_to_add:
            # Check if column already exists
            result = conn.execute(text(f"""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name='orders' AND column_name='{column_name}'
            """))

            if result.fetchone():
                print(f"[OK] Column '{column_name}' already exists")
                continue

            # Add column
            conn.execute(text(f"""
                ALTER TABLE orders
                ADD COLUMN {column_name} {column_type}
            """))
            print(f"[OK] Added '{column_name}' column to orders table")

        conn.commit()


if __name__ == "__main__":
    migrate()
    print("Migration completed successfully!")
