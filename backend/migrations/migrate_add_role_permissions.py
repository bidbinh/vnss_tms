"""
Migration: Add role_permissions table
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "tms.db")


def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check if table exists
    cursor.execute("""
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='role_permissions'
    """)

    if cursor.fetchone():
        print("Table 'role_permissions' already exists, checking columns...")
        # Check if permissions_json column exists
        cursor.execute("PRAGMA table_info(role_permissions)")
        columns = [col[1] for col in cursor.fetchall()]

        if 'permissions_json' not in columns and 'permissions' in columns:
            # Rename permissions to permissions_json
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
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                role TEXT NOT NULL,
                permissions_json TEXT DEFAULT '{}',
                description TEXT,
                is_system INTEGER DEFAULT 0,
                created_at TEXT,
                updated_at TEXT,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id)
            )
        """)

        # Create indexes
        cursor.execute("""
            CREATE INDEX idx_role_permissions_tenant_role
            ON role_permissions(tenant_id, role)
        """)

        print("Created table 'role_permissions' with indexes")

    conn.commit()
    conn.close()
    print("Migration completed successfully!")


if __name__ == "__main__":
    migrate()
