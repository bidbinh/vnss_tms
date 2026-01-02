"""
Migration to add new fields to the users table for User Management feature.
Run this migration to update the database schema.

Usage:
    cd backend
    .venv/Scripts/python migrations/migrate_add_user_fields.py
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.db.session import engine


def migrate():
    """Add new columns to users table"""

    columns_to_add = [
        ("full_name", "VARCHAR(255)", "NULL"),
        ("email", "VARCHAR(255)", "NULL"),
        ("phone", "VARCHAR(50)", "NULL"),
        ("avatar_url", "VARCHAR(500)", "NULL"),
        ("status", "VARCHAR(20)", "'ACTIVE'"),
        ("last_login_at", "VARCHAR(50)", "NULL"),
        ("notes", "TEXT", "NULL"),
    ]

    with engine.connect() as conn:
        for column_name, column_type, default_value in columns_to_add:
            # Check if column exists
            check_sql = text(f"""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'users'
                AND column_name = '{column_name}'
            """)
            result = conn.execute(check_sql).fetchone()

            if result:
                print(f"  [SKIP] Column '{column_name}' already exists")
            else:
                # Add column
                if default_value == "NULL":
                    alter_sql = text(f"""
                        ALTER TABLE users
                        ADD COLUMN {column_name} {column_type} DEFAULT NULL
                    """)
                else:
                    alter_sql = text(f"""
                        ALTER TABLE users
                        ADD COLUMN {column_name} {column_type} DEFAULT {default_value}
                    """)

                try:
                    conn.execute(alter_sql)
                    print(f"  [ADD] Column '{column_name}' added successfully")
                except Exception as e:
                    print(f"  [ERROR] Failed to add column '{column_name}': {e}")

        conn.commit()

        # Create indexes for frequently queried columns
        indexes = [
            ("idx_users_email", "email"),
            ("idx_users_status", "status"),
        ]

        for index_name, column_name in indexes:
            # Check if index exists
            check_idx_sql = text(f"""
                SELECT indexname
                FROM pg_indexes
                WHERE tablename = 'users'
                AND indexname = '{index_name}'
            """)
            result = conn.execute(check_idx_sql).fetchone()

            if result:
                print(f"  [SKIP] Index '{index_name}' already exists")
            else:
                try:
                    create_idx_sql = text(f"""
                        CREATE INDEX {index_name} ON users ({column_name})
                    """)
                    conn.execute(create_idx_sql)
                    print(f"  [ADD] Index '{index_name}' created successfully")
                except Exception as e:
                    print(f"  [ERROR] Failed to create index '{index_name}': {e}")

        conn.commit()


def rollback():
    """Remove added columns (if needed)"""
    columns_to_remove = [
        "full_name",
        "email",
        "phone",
        "avatar_url",
        "status",
        "last_login_at",
        "notes",
    ]

    with engine.connect() as conn:
        for column_name in columns_to_remove:
            # Check if column exists
            check_sql = text(f"""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'users'
                AND column_name = '{column_name}'
            """)
            result = conn.execute(check_sql).fetchone()

            if not result:
                print(f"  [SKIP] Column '{column_name}' does not exist")
            else:
                try:
                    alter_sql = text(f"""
                        ALTER TABLE users
                        DROP COLUMN IF EXISTS {column_name}
                    """)
                    conn.execute(alter_sql)
                    print(f"  [DROP] Column '{column_name}' dropped successfully")
                except Exception as e:
                    print(f"  [ERROR] Failed to drop column '{column_name}': {e}")

        conn.commit()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="User fields migration")
    parser.add_argument("--rollback", action="store_true", help="Rollback migration")
    args = parser.parse_args()

    print("\n" + "="*50)
    if args.rollback:
        print("Rolling back user fields migration...")
        print("="*50 + "\n")
        rollback()
    else:
        print("Running user fields migration...")
        print("="*50 + "\n")
        migrate()

    print("\n" + "="*50)
    print("Done!")
    print("="*50)
