"""Import Người XNK Excel data directly to database"""
import pandas as pd
import sys
import io
import os
import uuid
from datetime import datetime

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Add backend to path
sys.path.insert(0, 'd:/vnss_tms/backend')

from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv('d:/vnss_tms/backend/.env')

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql+psycopg://tms:tms@localhost:5432/tms')
engine = create_engine(DATABASE_URL)

file_path = r"D:\vnss_tms\Người XNK.xls"
TENANT_ID = "TENANT_DEMO"
USER_ID = "599c08ca-67e4-4c6d-930a-e1dd1edc6eb5"  # Super Admin

xls = pd.ExcelFile(file_path)
print(f"Sheet names: {xls.sheet_names}")
print("=" * 80)

with engine.connect() as conn:
    # ============================================================
    # Import Exporters (Người XK)
    # ============================================================
    if 'Người XK' in xls.sheet_names:
        df = pd.read_excel(xls, sheet_name='Người XK')
        print(f"\n[Người XK] Columns: {list(df.columns)}")
        print(f"[Người XK] Total rows: {len(df)}")

        count = 0
        for _, row in df.iterrows():
            # Get name from correct column
            name = None
            for col in df.columns:
                if 'Tên' in col or 'XK' in col or 'NK' in col:
                    val = row.get(col)
                    if pd.notna(val) and str(val).strip() and str(val).strip() != 'nan':
                        name = str(val).strip()
                        break

            if not name:
                continue

            seq_no = int(row.iloc[0]) if pd.notna(row.iloc[0]) else None

            # Get address columns (usually columns after name)
            addresses = []
            for i, col in enumerate(df.columns):
                if 'Địa chỉ' in str(col) or i >= 3:  # Address columns typically start from column 3
                    val = row.get(col)
                    if pd.notna(val) and str(val).strip() and str(val).strip() != 'nan':
                        addresses.append(str(val).strip())

            notes = None
            for col in df.columns:
                if 'Ghi chú' in str(col):
                    val = row.get(col)
                    if pd.notna(val) and str(val).strip() and str(val).strip() != 'nan':
                        notes = str(val).strip()
                        break

            conn.execute(text("""
                INSERT INTO fms_customs_exporters
                (id, tenant_id, seq_no, name, notes, address_line_1, address_line_2, address_line_3, address_line_4, is_active, created_at, updated_at, created_by)
                VALUES (:id, :tenant_id, :seq_no, :name, :notes, :addr1, :addr2, :addr3, :addr4, true, :now, :now, :user_id)
            """), {
                'id': str(uuid.uuid4()),
                'tenant_id': TENANT_ID,
                'seq_no': seq_no,
                'name': name,
                'notes': notes,
                'addr1': addresses[0] if len(addresses) > 0 else None,
                'addr2': addresses[1] if len(addresses) > 1 else None,
                'addr3': addresses[2] if len(addresses) > 2 else None,
                'addr4': addresses[3] if len(addresses) > 3 else None,
                'now': datetime.utcnow(),
                'user_id': USER_ID,
            })
            count += 1

        conn.commit()
        print(f"[Người XK] Imported: {count} records")

    # ============================================================
    # Import Importers (Người NK)
    # ============================================================
    if 'Người NK' in xls.sheet_names:
        df = pd.read_excel(xls, sheet_name='Người NK')
        print(f"\n[Người NK] Columns: {list(df.columns)}")
        print(f"[Người NK] Total rows: {len(df)}")

        count = 0
        for _, row in df.iterrows():
            # Get name
            name = None
            for col in df.columns:
                if 'Người' in str(col) and 'NK' in str(col):
                    val = row.get(col)
                    if pd.notna(val) and str(val).strip() and str(val).strip() != 'nan':
                        name = str(val).strip()
                        break

            if not name:
                # Try second column
                if len(df.columns) > 1:
                    val = row.iloc[1]
                    if pd.notna(val) and str(val).strip() and str(val).strip() != 'nan':
                        name = str(val).strip()

            if not name:
                continue

            seq_no = int(row.iloc[0]) if pd.notna(row.iloc[0]) else None

            postal_code = None
            tax_code = None
            address = None
            phone = None

            for col in df.columns:
                col_str = str(col)
                val = row.get(col)
                if pd.notna(val) and str(val).strip() and str(val).strip() != 'nan':
                    val_str = str(val).strip()
                    if 'Bưu' in col_str or 'Postal' in col_str.lower():
                        postal_code = val_str
                    elif col_str == 'Mã' or 'Mã số' in col_str:
                        tax_code = val_str
                    elif 'Địa chỉ' in col_str:
                        address = val_str
                    elif 'SĐT' in col_str or 'điện thoại' in col_str.lower():
                        phone = val_str

            conn.execute(text("""
                INSERT INTO fms_customs_importers
                (id, tenant_id, seq_no, name, postal_code, tax_code, address, phone, is_active, created_at, updated_at, created_by)
                VALUES (:id, :tenant_id, :seq_no, :name, :postal_code, :tax_code, :address, :phone, true, :now, :now, :user_id)
            """), {
                'id': str(uuid.uuid4()),
                'tenant_id': TENANT_ID,
                'seq_no': seq_no,
                'name': name,
                'postal_code': postal_code,
                'tax_code': tax_code,
                'address': address,
                'phone': phone,
                'now': datetime.utcnow(),
                'user_id': USER_ID,
            })
            count += 1

        conn.commit()
        print(f"[Người NK] Imported: {count} records")

    # ============================================================
    # Import Locations (địa điểm)
    # ============================================================
    if 'địa điểm' in xls.sheet_names:
        df = pd.read_excel(xls, sheet_name='địa điểm')
        print(f"\n[địa điểm] Columns: {list(df.columns)}")
        print(f"[địa điểm] Total rows: {len(df)}")

        count = 0
        for _, row in df.iterrows():
            # Get code and name
            code = None
            name = None
            location_type = None

            for col in df.columns:
                col_str = str(col)
                val = row.get(col)
                if pd.notna(val) and str(val).strip() and str(val).strip() != 'nan':
                    val_str = str(val).strip()
                    if 'Địa điểm lưu kho' in col_str and 'Tên' not in col_str:
                        code = val_str
                    elif 'Tên địa điểm' in col_str:
                        name = val_str
                    elif 'Loại' in col_str:
                        location_type = val_str

            if not code or not name:
                continue

            seq_no = int(row.iloc[0]) if pd.notna(row.iloc[0]) else None

            conn.execute(text("""
                INSERT INTO fms_customs_locations
                (id, tenant_id, seq_no, code, name, location_type, is_active, created_at, updated_at, created_by)
                VALUES (:id, :tenant_id, :seq_no, :code, :name, :location_type, true, :now, :now, :user_id)
            """), {
                'id': str(uuid.uuid4()),
                'tenant_id': TENANT_ID,
                'seq_no': seq_no,
                'code': code.upper(),
                'name': name,
                'location_type': location_type,
                'now': datetime.utcnow(),
                'user_id': USER_ID,
            })
            count += 1

        conn.commit()
        print(f"[địa điểm] Imported: {count} records")

print("\n" + "=" * 80)
print("DONE! All data imported successfully.")
