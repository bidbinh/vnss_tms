"""
Script to sync fms_hs_codes table schema - add missing columns.
Run directly: python sync_hs_schema.py
"""
import os
import sys

# Change to backend directory
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

# Add backend to path
sys.path.insert(0, os.getcwd())

# Open log file
log_file = open(os.path.join(script_dir, 'sync_hs_schema_output.txt'), 'w')

def log(msg):
    log_file.write(msg + '\n')
    log_file.flush()

try:
    from sqlalchemy import text, inspect
    from app.db.session import engine

    log("Connecting to database...")

    # Get current columns
    with engine.connect() as connection:
        inspector = inspect(connection)
        existing_cols = [c['name'] for c in inspector.get_columns('fms_hs_codes')]
        log(f"Current columns ({len(existing_cols)}): {existing_cols}")

        # Columns to add with their SQL types
        columns_to_add = [
            ('shipment_id', 'VARCHAR(50)'),
            ('product_specification', 'TEXT'),
            ('origin_criteria', 'VARCHAR(20)'),
            ('unit_code', 'VARCHAR(10)'),
            ('unit_2_code', 'VARCHAR(10)'),
            ('currency_code', 'VARCHAR(5)'),
            ('preferential_rate', 'DOUBLE PRECISION'),
            ('special_preferential_rate', 'DOUBLE PRECISION'),
            ('applied_rate', 'DOUBLE PRECISION'),
            ('environmental_rate', 'DOUBLE PRECISION'),
            ('environmental_amount', 'DOUBLE PRECISION'),
            ('legal_document', 'VARCHAR(200)'),
            ('preferential_code', 'VARCHAR(20)'),
            ('co_form', 'VARCHAR(20)'),
            ('co_no_line', 'VARCHAR(50)'),
            ('license_no', 'VARCHAR(50)'),
            ('license_date', 'DATE'),
            ('license_issuer', 'VARCHAR(200)'),
            ('license_expiry', 'DATE'),
            ('created_by', 'VARCHAR(50)'),
            ('notes', 'TEXT'),
            ('created_at', 'TIMESTAMP'),
            ('updated_at', 'TIMESTAMP'),
        ]

        added = []
        skipped = []
        errors = []

        for col_name, col_type in columns_to_add:
            if col_name not in existing_cols:
                try:
                    sql = text(f'ALTER TABLE fms_hs_codes ADD COLUMN {col_name} {col_type}')
                    connection.execute(sql)
                    connection.commit()
                    added.append(col_name)
                    log(f"  Added: {col_name}")
                except Exception as e:
                    errors.append(f"{col_name}: {str(e)}")
                    log(f"  Error adding {col_name}: {e}")
            else:
                skipped.append(col_name)
                log(f"  Exists: {col_name}")

        log(f"\nDone! Added {len(added)} columns, skipped {len(skipped)}, errors {len(errors)}")
        if errors:
            log(f"Errors: {errors}")

except Exception as e:
    import traceback
    log(f"Fatal error: {e}")
    log(traceback.format_exc())

finally:
    log_file.close()
