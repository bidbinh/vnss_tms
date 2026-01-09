"""Read Người XNK Excel file to understand structure"""
import pandas as pd
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

file_path = r"D:\vnss_tms\Người XNK.xls"

# Read all sheets
xls = pd.ExcelFile(file_path)
print(f"Sheet names: {xls.sheet_names}")
print("=" * 80)

for sheet_name in xls.sheet_names:
    print(f"\n{'='*80}")
    print(f"SHEET: {sheet_name}")
    print("=" * 80)

    df = pd.read_excel(xls, sheet_name=sheet_name)
    print(f"Shape: {df.shape}")
    print(f"\nColumns: {list(df.columns)}")
    print(f"\nFirst 5 rows:")
    print(df.head().to_string())
    print(f"\nData types:")
    print(df.dtypes)
