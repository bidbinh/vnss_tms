"""
Data Migration Script - Update existing tenant with new platform fields

This script updates the existing tenant record with new fields added in the
platform core migration (002). It should be run AFTER running alembic upgrade.

Usage:
    cd backend
    python -m scripts.migrate_tenant_data
"""
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.core.config import settings


def migrate_tenant_data():
    """Update existing tenant with new platform fields"""

    # Create engine
    engine = create_engine(settings.DATABASE_URL)

    with engine.connect() as conn:
        # Check if tenants table has the new 'code' column
        result = conn.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'tenants' AND column_name = 'code'
        """))

        if not result.fetchone():
            print("ERROR: Column 'code' does not exist. Please run migration first:")
            print("  cd backend && alembic upgrade head")
            return False

        # Get existing tenants that need updating
        result = conn.execute(text("""
            SELECT id, name, code, enabled_modules, type, is_active
            FROM tenants
        """))
        tenants = result.fetchall()

        if not tenants:
            print("No tenants found in database.")
            return True

        print(f"Found {len(tenants)} tenant(s) to update")

        for tenant in tenants:
            tenant_id = tenant[0]
            tenant_name = tenant[1]
            current_code = tenant[2]
            current_modules = tenant[3]
            current_type = tenant[4]
            is_active = tenant[5]

            print(f"\nProcessing tenant: {tenant_name} (ID: {tenant_id})")

            updates = []

            # Set code if null (derive from name: lowercase, replace spaces with hyphens)
            if not current_code:
                code = tenant_name.lower().replace(" ", "-").replace(".", "")[:50]
                updates.append(f"code = '{code}'")
                print(f"  - Setting code: {code}")

            # Set enabled_modules if null or empty
            if not current_modules or current_modules == '[]':
                modules = '["tms"]'
                updates.append(f"enabled_modules = '{modules}'")
                print(f"  - Setting enabled_modules: {modules}")

            # Set type if null
            if not current_type:
                updates.append("type = 'CARRIER'")
                print("  - Setting type: CARRIER")

            # Set is_active if null
            if is_active is None:
                updates.append("is_active = true")
                print("  - Setting is_active: true")

            # Set other default values
            defaults = [
                ("subscription_plan", "'FREE'"),
                ("subscription_status", "'ACTIVE'"),
                ("timezone", "'Asia/Ho_Chi_Minh'"),
                ("currency", "'VND'"),
                ("locale", "'vi-VN'"),
                ("country", "'VN'"),
                ("deployment_type", "'CLOUD'"),
            ]

            for field, value in defaults:
                # Check if field is null
                check_result = conn.execute(text(f"""
                    SELECT {field} FROM tenants WHERE id = :tenant_id
                """), {"tenant_id": tenant_id})
                current_value = check_result.fetchone()

                if current_value and current_value[0] is None:
                    updates.append(f"{field} = {value}")
                    print(f"  - Setting {field}: {value}")

            # Apply updates
            if updates:
                update_sql = f"""
                    UPDATE tenants
                    SET {', '.join(updates)}, updated_at = NOW()
                    WHERE id = :tenant_id
                """
                conn.execute(text(update_sql), {"tenant_id": tenant_id})
                conn.commit()
                print(f"  Updated {len(updates)} field(s)")
            else:
                print("  No updates needed")

        print("\n" + "="*50)
        print("Migration completed successfully!")
        print("="*50)

        return True


def verify_migration():
    """Verify tenant data after migration"""
    engine = create_engine(settings.DATABASE_URL)

    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT id, name, code, type, enabled_modules, subscription_plan, is_active
            FROM tenants
        """))
        tenants = result.fetchall()

        print("\nCurrent Tenant Data:")
        print("-" * 80)
        for tenant in tenants:
            print(f"  ID: {tenant[0]}")
            print(f"  Name: {tenant[1]}")
            print(f"  Code: {tenant[2]}")
            print(f"  Type: {tenant[3]}")
            print(f"  Modules: {tenant[4]}")
            print(f"  Plan: {tenant[5]}")
            print(f"  Active: {tenant[6]}")
            print("-" * 80)


if __name__ == "__main__":
    print("=" * 50)
    print("Tenant Data Migration Script")
    print("=" * 50)

    if len(sys.argv) > 1 and sys.argv[1] == "--verify":
        verify_migration()
    else:
        success = migrate_tenant_data()
        if success:
            verify_migration()
        else:
            sys.exit(1)
