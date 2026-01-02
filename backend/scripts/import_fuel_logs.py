"""
Import fuel logs from CSV data
Run: python -m scripts.import_fuel_logs
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import psycopg2
from app.core.config import settings
from datetime import datetime

# Complete data from the Excel screenshot for vehicle 50E-482.52
# Format: (date, odometer_km, actual_liters, unit_price, total_amount, note)
fuel_data = [
    ("2024-01-07", 129470, 250.67, 18750, 4700006, "Xe đổ dầu ngoài"),
    ("2024-01-22", 131959, 252.82, 19780, 5000780, "Xe đổ dầu ngoài"),
    ("2024-01-26", 132815, 235.38, 19070, 4500043, "Xe đổ dầu ngoài"),
    ("2024-01-27", 133399, 268.90, 18950, 5095617, "Xe đổ dầu ngoài"),
    ("2024-02-06", 135426, 261.87, 18330, 4800322, "Xe đổ dầu ngoài"),
    ("2024-03-10", 141193, 234.59, 18330, 4300016, "Xe đổ dầu ngoài"),
    ("2024-03-13", 141866, 268.96, 18330, 4930037, "Xe đổ dầu ngoài"),
    ("2024-03-18", 142558, 248.75, 17890, 4450048, "Xe đổ dầu ngoài"),
    ("2024-03-23", 143191, 268.09, 17690, 4743072, "Xe đổ dầu ngoài"),
    ("2024-03-28", 143796, 260.87, 17690, 4614593, "Xe đổ dầu ngoài"),
    ("2024-04-01", 144465, 262.17, 18260, 4787065, "Xe đổ dầu ngoài"),
    ("2024-04-05", 145006, 232.26, 18260, 4241188, "Xe đổ dầu ngoài"),
    ("2024-04-10", 145692, 266.58, 18260, 4868170, "Xe đổ dầu ngoài"),
    ("2024-04-15", 146315, 260.96, 18330, 4783199, "Xe đổ dầu ngoài"),
    ("2024-04-20", 146929, 251.74, 18330, 4614393, "Xe đổ dầu ngoài"),
    ("2024-04-25", 147515, 245.21, 18480, 4531479, "Xe đổ dầu ngoài"),
    ("2024-04-29", 148188, 262.50, 18550, 4869375, "Xe đổ dầu ngoài"),
    ("2024-05-04", 148848, 256.27, 18550, 4753807, "Xe đổ dầu ngoài"),
    ("2024-05-09", 149519, 261.52, 18550, 4851194, "Xe đổ dầu ngoài"),
    ("2024-05-13", 150096, 228.89, 18550, 4245911, "Xe đổ dầu ngoài"),
    ("2024-05-18", 150728, 249.66, 18840, 4704475, "Xe đổ dầu ngoài"),
    ("2024-05-23", 151356, 255.42, 18840, 4812113, "Xe đổ dầu ngoài"),
    ("2024-05-28", 152012, 256.99, 18840, 4841687, "Xe đổ dầu ngoài"),
    ("2024-06-01", 152611, 239.13, 18840, 4504409, "Xe đổ dầu ngoài"),
    ("2024-06-05", 153193, 233.80, 18840, 4404792, "Xe đổ dầu ngoài"),
    ("2024-06-10", 153814, 246.19, 18840, 4638259, "Xe đổ dầu ngoài"),
    ("2024-06-15", 154429, 251.33, 18840, 4735057, "Xe đổ dầu ngoài"),
    ("2024-06-20", 155049, 252.64, 18840, 4759738, "Xe đổ dầu ngoài"),
    ("2024-06-25", 155680, 259.42, 18840, 4887474, "Xe đổ dầu ngoài"),
    ("2024-06-29", 156278, 245.90, 18840, 4631976, "Xe đổ dầu ngoài"),
    ("2024-07-03", 156865, 237.32, 19240, 4566475, "Xe đổ dầu ngoài"),
    ("2024-07-08", 157476, 253.69, 19240, 4880997, "Xe đổ dầu ngoài"),
    ("2024-07-13", 158088, 259.05, 19240, 4984122, "Xe đổ dầu ngoài"),
    ("2024-07-18", 158715, 259.59, 19240, 4994509, "Xe đổ dầu ngoài"),
    ("2024-07-23", 159332, 250.68, 19240, 4823082, "Xe đổ dầu ngoài"),
    ("2024-07-28", 159924, 236.58, 19240, 4553800, "Xe đổ dầu ngoài"),
    ("2024-08-01", 160506, 243.33, 19240, 4817669, "Xe đổ dầu ngoài"),
    ("2024-08-06", 161091, 239.67, 19240, 4611699, "Xe đổ dầu ngoài"),
    ("2024-08-11", 161683, 243.55, 19240, 4686699, "Xe đổ dầu ngoài"),
    ("2024-08-16", 162265, 241.16, 19240, 4640668, "Xe đổ dầu ngoài"),
    ("2024-08-21", 162852, 243.25, 19240, 4680930, "Xe đổ dầu ngoài"),
    ("2024-08-26", 163431, 233.95, 19360, 4529272, "Xe đổ dầu ngoài"),
    ("2024-08-30", 163959, 211.57, 19360, 4095953, "Xe đổ dầu ngoài"),
    ("2024-09-04", 164519, 230.73, 19360, 4467939, "Xe đổ dầu ngoài"),
    ("2024-09-09", 165092, 234.79, 19360, 4546345, "Xe đổ dầu ngoài"),
    ("2024-09-14", 165663, 233.43, 19360, 4520004, "Xe đổ dầu ngoài"),
    ("2024-09-19", 166224, 229.70, 19360, 4447872, "Xe đổ dầu ngoài"),
    ("2024-09-24", 166786, 233.27, 19360, 4516907, "Xe đổ dầu ngoài"),
    ("2024-09-28", 167306, 212.80, 19360, 4119808, "Xe đổ dầu ngoài"),
    ("2024-10-03", 167850, 226.28, 19360, 4380780, "Xe đổ dầu ngoài"),
    ("2024-10-08", 168403, 229.35, 19360, 4442216, "Xe đổ dầu ngoài"),
    ("2024-10-13", 168960, 231.37, 19360, 4479323, "Xe đổ dầu ngoài"),
    ("2024-10-18", 169512, 229.04, 19360, 4435014, "Xe đổ dầu ngoài"),
    ("2024-10-23", 170065, 232.76, 19360, 4506233, "Xe đổ dầu ngoài"),
    ("2024-10-28", 170611, 229.88, 19630, 4512609, "Xe đổ dầu ngoài"),
    ("2024-11-01", 171114, 207.12, 19630, 4065825, "Xe đổ dầu ngoài"),
    ("2024-11-06", 171636, 214.79, 19630, 4217290, "Xe đổ dầu ngoài"),
    ("2024-11-11", 172167, 226.89, 19630, 4454087, "Xe đổ dầu ngoài"),
    ("2024-11-16", 172703, 223.08, 19630, 4379260, "Xe đổ dầu ngoài"),
    ("2024-11-21", 173228, 218.48, 19630, 4288883, "Xe đổ dầu ngoài"),
    ("2024-11-26", 173743, 214.47, 19630, 4210006, "Xe đổ dầu ngoài"),
    ("2024-12-01", 174247, 210.07, 19630, 4122675, "Xe đổ dầu ngoài"),
]

def import_fuel_logs():
    """Import fuel logs into database"""
    db_url = settings.DATABASE_URL.replace("postgresql+psycopg2://", "postgresql://")
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    try:
        # First, get or create vehicle
        cur.execute("""
            SELECT id, tenant_id FROM vehicles WHERE plate_no = %s LIMIT 1
        """, ("50E-482.52",))

        vehicle = cur.fetchone()
        if not vehicle:
            print("ERROR: Vehicle 50E-482.52 not found in database!")
            print("Please create the vehicle first in the Vehicles page")
            return

        vehicle_id, tenant_id = vehicle
        print(f"Found vehicle: {vehicle_id}")

        # Get or create driver
        cur.execute("""
            SELECT id FROM drivers WHERE name = %s AND tenant_id = %s LIMIT 1
        """, ("Nguyễn Văn Tuyến", tenant_id))

        driver = cur.fetchone()
        if not driver:
            print("ERROR: Driver 'Nguyễn Văn Tuyến' not found!")
            print("Please create the driver first in the Drivers page")
            return

        driver_id = driver[0]
        print(f"Found driver: {driver_id}")

        # Import fuel logs
        imported = 0
        for date_str, odometer, liters, price, total, note in fuel_data:
            # Parse date
            fuel_date = datetime.strptime(date_str, "%Y-%m-%d").date()

            # Check if log already exists
            cur.execute("""
                SELECT id FROM fuel_logs
                WHERE vehicle_id = %s AND date = %s AND odometer_km = %s
            """, (vehicle_id, fuel_date, int(odometer)))

            if cur.fetchone():
                print(f"Skipping {date_str} - already exists")
                continue

            # Insert fuel log
            cur.execute("""
                INSERT INTO fuel_logs (
                    id, tenant_id, date, vehicle_id, driver_id,
                    odometer_km, actual_liters, unit_price, total_amount, note,
                    payment_status, created_at, updated_at
                ) VALUES (
                    gen_random_uuid()::text, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    'PAID', NOW(), NOW()
                )
            """, (
                tenant_id, fuel_date, vehicle_id, driver_id,
                int(odometer), float(liters), int(price), int(total), note
            ))

            imported += 1
            print(f"Imported: {date_str} - {liters}L")

        conn.commit()
        print(f"\n[OK] Successfully imported {imported} fuel logs")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Import failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    import_fuel_logs()
