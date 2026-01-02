"""
Migration: Add role_permissions table for PostgreSQL
"""
import psycopg2
import os

# PostgreSQL connection settings
DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "tms")
DB_USER = os.getenv("DB_USER", "tms_user")
DB_PASS = os.getenv("DB_PASS", "tms_pass")


def migrate():
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASS
    )
    cursor = conn.cursor()

    # Check if table exists
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_name = 'role_permissions'
        )
    """)
    table_exists = cursor.fetchone()[0]

    if table_exists:
        print("Table 'role_permissions' already exists, checking columns...")
        # Check columns
        cursor.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'role_permissions'
        """)
        columns = [col[0] for col in cursor.fetchall()]
        print(f"Existing columns: {columns}")

        if 'permissions_json' not in columns and 'permissions' in columns:
            cursor.execute("ALTER TABLE role_permissions RENAME COLUMN permissions TO permissions_json")
            print("Renamed 'permissions' column to 'permissions_json'")
        elif 'permissions_json' not in columns:
            cursor.execute("ALTER TABLE role_permissions ADD COLUMN permissions_json TEXT DEFAULT '{}'")
            print("Added 'permissions_json' column")
        else:
            print("Column 'permissions_json' already exists")
    else:
        # Create role_permissions table
        cursor.execute("""
            CREATE TABLE role_permissions (
                id VARCHAR(36) PRIMARY KEY,
                tenant_id VARCHAR(36) NOT NULL,
                role VARCHAR(50) NOT NULL,
                permissions_json TEXT DEFAULT '{}',
                description TEXT,
                is_system BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP,
                updated_at TIMESTAMP
            )
        """)
        print("Created table 'role_permissions'")

        # Create indexes
        cursor.execute("""
            CREATE INDEX idx_role_permissions_tenant_role
            ON role_permissions(tenant_id, role)
        """)
        print("Created index 'idx_role_permissions_tenant_role'")

    conn.commit()
    cursor.close()
    conn.close()
    print("Migration completed successfully!")


if __name__ == "__main__":
    migrate()
