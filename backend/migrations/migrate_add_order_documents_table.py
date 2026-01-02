"""
Migration: Add order_documents table
Run: python -m migrations.migrate_add_order_documents_table
"""

from sqlalchemy import text
from app.db.session import engine


def migrate():
    """Add order_documents table"""
    with engine.connect() as conn:
        # Check if table already exists
        result = conn.execute(text("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_name = 'order_documents'
        """))

        if result.fetchone():
            print("[OK] Table 'order_documents' already exists")
            return

        # Create order_documents table
        conn.execute(text("""
            CREATE TABLE order_documents (
                id VARCHAR(36) PRIMARY KEY,
                tenant_id VARCHAR(50) NOT NULL,
                order_id VARCHAR(36) NOT NULL REFERENCES orders(id),
                doc_type VARCHAR(50) NOT NULL,
                original_name VARCHAR(255) NOT NULL,
                content_type VARCHAR(100) NOT NULL,
                size_bytes INTEGER NOT NULL,
                file_path VARCHAR(500) NOT NULL,
                uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                uploaded_by VARCHAR(36),
                note TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_order_doc_file UNIQUE (tenant_id, order_id, doc_type, file_path)
            )
        """))

        # Create indexes
        conn.execute(text("""
            CREATE INDEX ix_order_documents_order_id ON order_documents(order_id)
        """))
        conn.execute(text("""
            CREATE INDEX ix_order_documents_doc_type ON order_documents(doc_type)
        """))
        conn.execute(text("""
            CREATE INDEX ix_order_documents_tenant_id ON order_documents(tenant_id)
        """))

        conn.commit()
        print("[OK] Created 'order_documents' table with indexes")


if __name__ == "__main__":
    migrate()
    print("Migration completed successfully!")
