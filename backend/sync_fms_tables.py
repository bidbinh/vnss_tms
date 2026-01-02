"""Sync FMS tables with models - Add missing columns"""
from sqlmodel import Session
from app.db.session import engine
from sqlalchemy import text

def add_columns_if_not_exist(session, table_name, columns):
    """Add columns if they don't exist"""
    # Get existing columns
    result = session.exec(text(f"""
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = '{table_name}'
    """)).all()
    existing = {r[0] for r in result}
    
    for col_name, col_type in columns:
        if col_name not in existing:
            try:
                session.exec(text(f'ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}'))
                session.commit()
                print(f'{table_name}: Added {col_name}')
            except Exception as e:
                session.rollback()
                print(f'{table_name}: Error adding {col_name}: {e}')

with Session(engine) as s:
    # fms_shipments - missing columns
    shipment_cols = [
        ('customer_contact', 'VARCHAR(100)'),
        ('customer_phone', 'VARCHAR(50)'),
        ('customer_email', 'VARCHAR(100)'),
        ('shipper_email', 'VARCHAR(100)'),
        ('consignee_email', 'VARCHAR(100)'),
        ('notify_party_contact', 'VARCHAR(100)'),
        ('origin_country', 'VARCHAR(100)'),
        ('destination_country', 'VARCHAR(100)'),
        ('pickup_address', 'TEXT'),
        ('delivery_address', 'TEXT'),
        ('booking_date', 'DATE'),
        ('cargo_ready_date', 'DATE'),
        ('cut_off_date', 'TIMESTAMP'),
        ('doc_cut_off', 'TIMESTAMP'),
        ('package_type', 'VARCHAR(50)'),
        ('freight_amount', 'DECIMAL(15,2) DEFAULT 0'),
        ('total_charges', 'DECIMAL(15,2) DEFAULT 0'),
        ('invoice_no', 'VARCHAR(50)'),
        ('invoice_date', 'DATE'),
        ('payment_terms', 'VARCHAR(100)'),
        ('mawb_no', 'VARCHAR(50)'),
        ('hawb_no', 'VARCHAR(50)'),
        ('customs_dec_no', 'VARCHAR(50)'),
        ('is_insured', 'BOOLEAN DEFAULT false'),
        ('insurance_value', 'DECIMAL(15,2) DEFAULT 0'),
        ('insurance_company', 'VARCHAR(100)'),
        ('insurance_policy_no', 'VARCHAR(50)'),
        ('description', 'TEXT'),
        ('opportunity_id', 'VARCHAR(50)'),
        ('workflow_instance_id', 'VARCHAR(50)'),
        ('ops_person_id', 'VARCHAR(50)'),
        ('ops_person_name', 'VARCHAR(100)'),
    ]
    
    add_columns_if_not_exist(s, 'fms_shipments', shipment_cols)
    
    print('Done syncing FMS tables!')
