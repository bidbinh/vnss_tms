import psycopg2

conn = psycopg2.connect("postgresql://postgres:admin123@localhost:5432/vnss_tms")
cur = conn.cursor()
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'fms_freight_rates' ORDER BY ordinal_position")
rows = cur.fetchall()
print("Columns in fms_freight_rates:")
for row in rows:
    print(f"  - {row[0]}")
conn.close()
