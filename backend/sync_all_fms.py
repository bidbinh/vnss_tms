"""Sync all FMS tables with models"""
from sqlmodel import Session
from app.db.session import engine
from sqlalchemy import text

def sync_table(session, table_name, model_class):
    """Sync table with model"""
    model_cols = {col.name: col for col in model_class.__table__.columns}
    
    # Get existing columns
    result = session.exec(text(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table_name}'")).all()
    existing = {r[0] for r in result}
    
    for col_name, col in model_cols.items():
        if col_name not in existing:
            col_type = str(col.type)
            # Map SQLAlchemy types to PostgreSQL
            if 'VARCHAR' in col_type or 'String' in col_type:
                pg_type = 'VARCHAR(255)'
            elif 'INTEGER' in col_type or 'Integer' in col_type:
                pg_type = 'INTEGER'
            elif 'BOOLEAN' in col_type or 'Boolean' in col_type:
                pg_type = 'BOOLEAN DEFAULT false'
            elif 'FLOAT' in col_type or 'Float' in col_type:
                pg_type = 'DECIMAL(15,2) DEFAULT 0'
            elif 'DATETIME' in col_type or 'DateTime' in col_type:
                pg_type = 'TIMESTAMP'
            elif 'DATE' in col_type:
                pg_type = 'DATE'
            elif 'TEXT' in col_type or 'Text' in col_type:
                pg_type = 'TEXT'
            else:
                pg_type = 'VARCHAR(255)'
            
            try:
                session.exec(text(f'ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {col_name} {pg_type}'))
                session.commit()
                print(f'{table_name}: Added {col_name}')
            except Exception as e:
                session.rollback()
                print(f'{table_name}: Error {col_name}: {e}')

# Import all FMS models
from app.models.fms import (
    FMSShipment, FMSContainer, FMSQuotation, QuotationItem,
    BillOfLading, AirwayBill, CustomsDeclaration, HSCode,
    FreightRate, RateCharge, ForwardingAgent,
    TrackingEvent, Consolidation, FMSDocument
)

with Session(engine) as s:
    tables = [
        ('fms_quotations', FMSQuotation),
        ('quotation_items', QuotationItem),
        ('fms_containers', FMSContainer),
        ('bills_of_lading', BillOfLading),
        ('airway_bills', AirwayBill),
        ('customs_declarations', CustomsDeclaration),
        ('hs_codes', HSCode),
        ('freight_rates', FreightRate),
        ('rate_charges', RateCharge),
        ('forwarding_agents', ForwardingAgent),
        ('tracking_events', TrackingEvent),
        ('consolidations', Consolidation),
        ('fms_documents', FMSDocument),
    ]
    
    for table_name, model_class in tables:
        try:
            sync_table(s, table_name, model_class)
        except Exception as e:
            print(f'Error syncing {table_name}: {e}')
    
    print('Done!')
