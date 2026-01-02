"""Fix FMS table columns to match models"""
from sqlmodel import Session
from app.db.session import engine
from sqlalchemy import text

with Session(engine) as s:
    # Rename incoterm -> incoterms if needed
    try:
        s.exec(text('ALTER TABLE fms_shipments RENAME COLUMN incoterm TO incoterms'))
        s.commit()
        print('Renamed incoterm -> incoterms')
    except Exception as e:
        s.rollback()
        if 'does not exist' in str(e):
            print('Column incoterm does not exist or already renamed')
        else:
            print(f'Error: {e}')
    
    # Add missing columns
    columns_to_add = [
        ('incoterms_place', 'VARCHAR(200)'),
        ('sales_person_id', 'VARCHAR(50)'),
        ('sales_person_name', 'VARCHAR(100)'),
        ('ops_person_id', 'VARCHAR(50)'),
        ('ops_person_name', 'VARCHAR(100)'),
        ('freight_currency', 'VARCHAR(10)'),
        ('total_buy_rate', 'DECIMAL(15,2) DEFAULT 0'),
        ('total_sell_rate', 'DECIMAL(15,2) DEFAULT 0'),
        ('quotation_no', 'VARCHAR(50)'),
    ]
    
    for col_name, col_type in columns_to_add:
        try:
            s.exec(text(f'ALTER TABLE fms_shipments ADD COLUMN IF NOT EXISTS {col_name} {col_type}'))
            s.commit()
            print(f'Added column: {col_name}')
        except Exception as e:
            s.rollback()
            print(f'Column {col_name}: {e}')
    
    print('Done!')
