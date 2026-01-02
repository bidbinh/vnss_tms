"""Check database schema"""
import psycopg

conn = psycopg.connect('host=localhost dbname=tms user=tms_user password=tms_pass')
cur = conn.cursor()

# Check all CRM tables
tables = ['crm_customer_groups', 'crm_accounts', 'crm_contacts', 'crm_leads',
          'crm_opportunities', 'crm_quotes', 'crm_quote_items', 'crm_activities']

for table in tables:
    print(f"\n=== {table} columns ===")
    cur.execute(f"""SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = '{table}'
        ORDER BY ordinal_position""")
    rows = cur.fetchall()
    for row in rows:
        print(f"  {row[0]}: {row[1]}")

conn.close()
