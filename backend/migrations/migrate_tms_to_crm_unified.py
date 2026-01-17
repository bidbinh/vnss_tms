"""
Migration Script: Unify TMS Customer with CRM Account
=====================================================

This script migrates TMS to use CRM Account as the single source of truth for customers.

Changes:
1. Migrate all TMS customers to CRM accounts (if not already linked)
2. Update customer_addresses, customer_contacts, customer_bank_accounts to use account_id
3. Update orders to use account_id instead of customer_id
4. Update rate_customer to use account_id

Run this script AFTER backing up your database!
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlmodel import Session, select, text
from app.db.session import engine
from app.models.customer import Customer
from app.models.crm.account import Account
from app.models.customer_address import CustomerAddress
from app.models.customer_contact import CustomerContact
from app.models.customer_bank_account import CustomerBankAccount
from datetime import datetime


def migrate_customers_to_accounts(session: Session):
    """
    Step 1: Ensure all TMS customers have corresponding CRM accounts
    """
    print("Step 1: Migrating TMS Customers to CRM Accounts...")

    # Get all customers without CRM account link
    customers = session.exec(
        select(Customer).where(Customer.crm_account_id == None)
    ).all()

    migrated = 0
    linked = 0

    for customer in customers:
        # Check if CRM account with same code exists
        existing_account = session.exec(
            select(Account).where(
                Account.tenant_id == customer.tenant_id,
                Account.code == customer.code
            )
        ).first()

        if existing_account:
            # Link to existing account
            customer.crm_account_id = existing_account.id
            existing_account.tms_customer_id = customer.id
            existing_account.synced_to_tms = True
            existing_account.synced_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
            session.add(customer)
            session.add(existing_account)
            linked += 1
        else:
            # Create new CRM account from customer
            account = Account(
                tenant_id=customer.tenant_id,
                code=customer.code,
                name=customer.name,
                account_type="CUSTOMER",
                status="ACTIVE" if customer.is_active else "INACTIVE",
                tax_code=customer.tax_code,
                business_license=customer.business_license,
                phone=customer.phone,
                fax=customer.fax,
                email=customer.email,
                website=customer.website,
                address=customer.address,
                city=customer.city,
                country=customer.country or "VN",
                payment_terms=customer.payment_terms,
                credit_limit=customer.credit_limit or 0,
                credit_days=customer.credit_days or 30,
                bank_name=customer.bank_name,
                bank_branch=customer.bank_branch,
                bank_account=customer.bank_account,
                bank_account_name=customer.bank_account_name,
                industry=customer.industry,
                source=customer.source,
                assigned_to=customer.assigned_to,
                default_delivery_address=customer.shipping_address,
                notes=customer.notes,
                tms_customer_id=customer.id,
                synced_to_tms=True,
                synced_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
            )
            session.add(account)
            session.commit()
            session.refresh(account)

            # Link back
            customer.crm_account_id = account.id
            session.add(customer)
            migrated += 1

    session.commit()
    print(f"  - Migrated: {migrated} new accounts created")
    print(f"  - Linked: {linked} existing accounts linked")
    return migrated + linked


def add_account_id_columns(session: Session):
    """
    Step 2: Add account_id columns to related tables (if not exists)
    """
    print("Step 2: Adding account_id columns...")

    tables = [
        ("customer_addresses", "account_id"),
        ("customer_contacts", "account_id"),
        ("customer_bank_accounts", "account_id"),
        ("orders", "account_id"),
        ("oms_orders", "account_id"),
        ("rate_customer", "account_id"),
    ]

    for table, column in tables:
        try:
            # Check if column exists
            result = session.exec(text(f"""
                SELECT COUNT(*) FROM information_schema.columns
                WHERE table_name = '{table}' AND column_name = '{column}'
            """)).first()

            if result[0] == 0:
                session.exec(text(f"""
                    ALTER TABLE {table} ADD COLUMN {column} VARCHAR(36)
                """))
                print(f"  - Added {column} to {table}")
            else:
                print(f"  - {column} already exists in {table}")
        except Exception as e:
            print(f"  - Error adding {column} to {table}: {e}")

    session.commit()


def populate_account_ids(session: Session):
    """
    Step 3: Populate account_id from customer.crm_account_id
    """
    print("Step 3: Populating account_id values...")

    # Update customer_addresses
    result = session.exec(text("""
        UPDATE customer_addresses ca
        SET account_id = c.crm_account_id
        FROM customers c
        WHERE ca.customer_id = c.id
        AND ca.account_id IS NULL
        AND c.crm_account_id IS NOT NULL
    """))
    print(f"  - Updated customer_addresses: {result.rowcount} rows")

    # Update customer_contacts
    result = session.exec(text("""
        UPDATE customer_contacts cc
        SET account_id = c.crm_account_id
        FROM customers c
        WHERE cc.customer_id = c.id
        AND cc.account_id IS NULL
        AND c.crm_account_id IS NOT NULL
    """))
    print(f"  - Updated customer_contacts: {result.rowcount} rows")

    # Update customer_bank_accounts
    result = session.exec(text("""
        UPDATE customer_bank_accounts cb
        SET account_id = c.crm_account_id
        FROM customers c
        WHERE cb.customer_id = c.id
        AND cb.account_id IS NULL
        AND c.crm_account_id IS NOT NULL
    """))
    print(f"  - Updated customer_bank_accounts: {result.rowcount} rows")

    # Update orders
    result = session.exec(text("""
        UPDATE orders o
        SET account_id = c.crm_account_id
        FROM customers c
        WHERE o.customer_id = c.id
        AND o.account_id IS NULL
        AND c.crm_account_id IS NOT NULL
    """))
    print(f"  - Updated orders: {result.rowcount} rows")

    # Update oms_orders (if table exists)
    try:
        result = session.exec(text("""
            UPDATE oms_orders o
            SET account_id = c.crm_account_id
            FROM customers c
            WHERE o.customer_id = c.id
            AND o.account_id IS NULL
            AND c.crm_account_id IS NOT NULL
        """))
        print(f"  - Updated oms_orders: {result.rowcount} rows")
    except Exception as e:
        print(f"  - Skipping oms_orders: {e}")

    # Update rate_customer (if table exists)
    try:
        result = session.exec(text("""
            UPDATE rate_customer rc
            SET account_id = c.crm_account_id
            FROM customers c
            WHERE rc.customer_id = c.id
            AND rc.account_id IS NULL
            AND c.crm_account_id IS NOT NULL
        """))
        print(f"  - Updated rate_customer: {result.rowcount} rows")
    except Exception as e:
        print(f"  - Skipping rate_customer: {e}")

    session.commit()


def create_indexes(session: Session):
    """
    Step 4: Create indexes on account_id columns
    """
    print("Step 4: Creating indexes...")

    indexes = [
        ("idx_customer_addresses_account_id", "customer_addresses", "account_id"),
        ("idx_customer_contacts_account_id", "customer_contacts", "account_id"),
        ("idx_customer_bank_accounts_account_id", "customer_bank_accounts", "account_id"),
        ("idx_orders_account_id", "orders", "account_id"),
    ]

    for idx_name, table, column in indexes:
        try:
            session.exec(text(f"""
                CREATE INDEX IF NOT EXISTS {idx_name} ON {table} ({column})
            """))
            print(f"  - Created index {idx_name}")
        except Exception as e:
            print(f"  - Error creating {idx_name}: {e}")

    session.commit()


def verify_migration(session: Session):
    """
    Step 5: Verify migration success
    """
    print("Step 5: Verifying migration...")

    # Check customers without CRM account
    orphan_customers = session.exec(text("""
        SELECT COUNT(*) FROM customers WHERE crm_account_id IS NULL
    """)).first()[0]
    print(f"  - Customers without CRM account: {orphan_customers}")

    # Check addresses without account_id
    orphan_addresses = session.exec(text("""
        SELECT COUNT(*) FROM customer_addresses WHERE account_id IS NULL
    """)).first()[0]
    print(f"  - Addresses without account_id: {orphan_addresses}")

    # Check contacts without account_id
    orphan_contacts = session.exec(text("""
        SELECT COUNT(*) FROM customer_contacts WHERE account_id IS NULL
    """)).first()[0]
    print(f"  - Contacts without account_id: {orphan_contacts}")

    # Check bank accounts without account_id
    orphan_banks = session.exec(text("""
        SELECT COUNT(*) FROM customer_bank_accounts WHERE account_id IS NULL
    """)).first()[0]
    print(f"  - Bank accounts without account_id: {orphan_banks}")

    # Check orders without account_id
    orphan_orders = session.exec(text("""
        SELECT COUNT(*) FROM orders WHERE account_id IS NULL AND customer_id IS NOT NULL
    """)).first()[0]
    print(f"  - Orders without account_id: {orphan_orders}")

    if orphan_customers == 0 and orphan_addresses == 0 and orphan_contacts == 0:
        print("\n✅ Migration completed successfully!")
        return True
    else:
        print("\n⚠️ Migration completed with some orphan records")
        return False


def run_migration():
    """Run the full migration"""
    print("=" * 60)
    print("TMS to CRM Unified Customer Migration")
    print("=" * 60)
    print()

    with Session(engine) as session:
        try:
            # Step 1: Migrate customers to accounts
            migrate_customers_to_accounts(session)
            print()

            # Step 2: Add account_id columns
            add_account_id_columns(session)
            print()

            # Step 3: Populate account_id values
            populate_account_ids(session)
            print()

            # Step 4: Create indexes
            create_indexes(session)
            print()

            # Step 5: Verify
            verify_migration(session)

        except Exception as e:
            print(f"\n❌ Migration failed: {e}")
            session.rollback()
            raise


if __name__ == "__main__":
    run_migration()
