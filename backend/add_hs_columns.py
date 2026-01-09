"""
Script to add missing columns to fms_hs_codes table
Run this directly: python add_hs_columns.py
"""
import os
import sys
os.chdir('d:\\vnss_tms\\backend')

# Redirect output to file
output_file = open('d:\\vnss_tms\\backend\\add_columns_output.txt', 'w')

def log(msg):
    output_file.write(msg + '\n')
    output_file.flush()

try:
    from sqlalchemy import text, inspect
    from app.db.session import engine
    log("Imports successful")

    def column_exists(table_name, column_name):
        """Check if column exists in table"""
        inspector = inspect(engine)
        columns = [c['name'] for c in inspector.get_columns(table_name)]
        return column_name in columns

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
        ('created_by', 'VARCHAR(50)'),
    ]

    with engine.connect() as conn:
        for col_name, col_type in columns_to_add:
            if not column_exists('fms_hs_codes', col_name):
                try:
                    sql = f'ALTER TABLE fms_hs_codes ADD COLUMN {col_name} {col_type}'
                    conn.execute(text(sql))
                    conn.commit()
                    log(f"Added column: {col_name}")
                except Exception as e:
                    log(f"Error adding {col_name}: {e}")
            else:
                log(f"Column already exists: {col_name}")

    log("\nDone!")

except Exception as e:
    log(f"Fatal error: {e}")
    import traceback
    log(traceback.format_exc())

finally:
    output_file.close()
