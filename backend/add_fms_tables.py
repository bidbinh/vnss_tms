"""Add missing FMS tables directly to database"""
from sqlalchemy import create_engine, text

engine = create_engine("postgresql+psycopg://postgres:!Tnt01087@localhost:5432/tms")

# Check if fms_freight_rates exists
with engine.connect() as conn:
    result = conn.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'fms_freight_rates')"))
    exists = result.scalar()
    print(f"fms_freight_rates exists: {exists}")

    if not exists:
        print("Creating fms_freight_rates table...")
        conn.execute(text("""
            CREATE TABLE fms_freight_rates (
                id VARCHAR PRIMARY KEY,
                tenant_id VARCHAR NOT NULL,
                rate_code VARCHAR NOT NULL,
                rate_name VARCHAR,
                rate_type VARCHAR DEFAULT 'SEA_FCL',
                is_active BOOLEAN DEFAULT TRUE,
                effective_date DATE NOT NULL,
                expiry_date DATE,
                carrier_id VARCHAR,
                carrier_name VARCHAR,
                agent_id VARCHAR,
                agent_name VARCHAR,
                origin_port VARCHAR,
                origin_port_name VARCHAR,
                origin_country VARCHAR,
                destination_port VARCHAR,
                destination_port_name VARCHAR,
                destination_country VARCHAR,
                via_port VARCHAR,
                via_port_name VARCHAR,
                transit_time_min INTEGER,
                transit_time_max INTEGER,
                frequency VARCHAR,
                container_type VARCHAR,
                currency_code VARCHAR DEFAULT 'USD',
                rate_20gp FLOAT,
                rate_40gp FLOAT,
                rate_40hc FLOAT,
                rate_20rf FLOAT,
                rate_40rf FLOAT,
                rate_45hc FLOAT,
                rate_per_cbm FLOAT,
                rate_per_ton FLOAT,
                min_charge FLOAT,
                rate_min FLOAT,
                rate_normal FLOAT,
                rate_45kg FLOAT,
                rate_100kg FLOAT,
                rate_300kg FLOAT,
                rate_500kg FLOAT,
                rate_1000kg FLOAT,
                commodity VARCHAR,
                commodity_code VARCHAR,
                thc_origin_included BOOLEAN DEFAULT FALSE,
                thc_dest_included BOOLEAN DEFAULT FALSE,
                doc_fee_included BOOLEAN DEFAULT FALSE,
                is_contract_rate BOOLEAN DEFAULT FALSE,
                is_spot_rate BOOLEAN DEFAULT FALSE,
                is_promotional BOOLEAN DEFAULT FALSE,
                free_detention_days INTEGER DEFAULT 0,
                free_demurrage_days INTEGER DEFAULT 0,
                remarks TEXT,
                terms_conditions TEXT,
                internal_notes TEXT,
                rate_source VARCHAR,
                rate_confirmation_no VARCHAR,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_by VARCHAR,
                updated_by VARCHAR
            )
        """))
        conn.execute(text("CREATE INDEX ix_fms_freight_rates_tenant_id ON fms_freight_rates(tenant_id)"))
        conn.execute(text("CREATE INDEX ix_fms_freight_rates_rate_code ON fms_freight_rates(rate_code)"))
        conn.commit()
        print("Created fms_freight_rates table!")

    # Check fms_quotations
    result = conn.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'fms_quotations')"))
    exists = result.scalar()
    print(f"fms_quotations exists: {exists}")

    # Check fms_shipments
    result = conn.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'fms_shipments')"))
    exists = result.scalar()
    print(f"fms_shipments exists: {exists}")

print("Done!")
