"""
Migration: Add dependent_count and hire_date to Driver model
         Create AdvancePayment and IncomeTaxSetting tables

Run: python -m migrations.migrate_add_driver_tax_fields
"""

from sqlmodel import Session, select, text
from app.db.session import engine
from app.models import Driver, AdvancePayment, IncomeTaxSetting
from datetime import date


def migrate():
    with Session(engine) as session:
        print("Starting migration: Add driver tax fields and new tables...")

        # Step 1: Add columns to drivers table
        print("\n1. Adding dependent_count and hire_date to drivers table...")
        try:
            session.exec(text("ALTER TABLE drivers ADD COLUMN dependent_count INTEGER DEFAULT 0"))
            print("   [OK] Added dependent_count column")
        except Exception as e:
            print(f"   - dependent_count column might already exist: {e}")

        try:
            session.exec(text("ALTER TABLE drivers ADD COLUMN hire_date DATE"))
            print("   [OK] Added hire_date column")
        except Exception as e:
            print(f"   - hire_date column might already exist: {e}")

        session.commit()

        # Step 2: Create advance_payments table
        print("\n2. Creating advance_payments table...")
        try:
            AdvancePayment.metadata.create_all(engine)
            print("   [OK] Created advance_payments table")
        except Exception as e:
            print(f"   - Error creating advance_payments table: {e}")

        # Step 3: Create income_tax_settings table
        print("\n3. Creating income_tax_settings table...")
        try:
            IncomeTaxSetting.metadata.create_all(engine)
            print("   [OK] Created income_tax_settings table")
        except Exception as e:
            print(f"   - Error creating income_tax_settings table: {e}")

        # Step 4: Create default income tax setting (2025 Vietnam tax rates)
        print("\n4. Creating default income tax setting...")
        try:
            # Check if default setting exists
            existing = session.exec(
                select(IncomeTaxSetting).where(IncomeTaxSetting.status == "ACTIVE")
            ).first()

            if not existing:
                default_setting = IncomeTaxSetting(
                    tenant_id="default",  # You may need to adjust this
                    effective_from=date(2025, 1, 1),
                    effective_to=None,  # Current setting
                    personal_deduction=11000000,
                    dependent_deduction=4400000,
                    bracket_1_limit=5000000,
                    bracket_1_rate=0.05,
                    bracket_2_limit=10000000,
                    bracket_2_rate=0.10,
                    bracket_2_deduction=250000,
                    bracket_3_limit=18000000,
                    bracket_3_rate=0.15,
                    bracket_3_deduction=750000,
                    bracket_4_limit=32000000,
                    bracket_4_rate=0.20,
                    bracket_4_deduction=1650000,
                    bracket_5_limit=52000000,
                    bracket_5_rate=0.25,
                    bracket_5_deduction=3250000,
                    bracket_6_limit=80000000,
                    bracket_6_rate=0.30,
                    bracket_6_deduction=5850000,
                    bracket_7_rate=0.35,
                    bracket_7_deduction=9850000,
                    social_insurance_rate=0.08,
                    health_insurance_rate=0.015,
                    unemployment_insurance_rate=0.01,
                    total_insurance_rate=0.105,
                    status="ACTIVE"
                )
                session.add(default_setting)
                session.commit()
                print("   [OK] Created default income tax setting")
            else:
                print("   - Default income tax setting already exists")
        except Exception as e:
            print(f"   - Error creating default income tax setting: {e}")
            session.rollback()

        print("\n[SUCCESS] Migration completed successfully!")


if __name__ == "__main__":
    migrate()
