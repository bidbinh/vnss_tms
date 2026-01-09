# -*- coding: utf-8 -*-
import pandas as pd
import sys
import io

# Force UTF-8 output
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Read the Excel file
file_path = r'd:\vnss_tms\BÁO CÁO CHI TIẾT.xls'
print(f"Reading file: {file_path}")

try:
    df = pd.read_excel(file_path, header=None)
    print(f"Shape: {df.shape} (rows x columns)")
    print(f"Total columns: {len(df.columns)}")

    # Print column headers (first row values) for columns around U, V, W
    print("\n=== Column Headers (Row 0) around U, V, W ===")
    for i in range(18, min(25, len(df.columns))):
        col_letter = chr(65 + i) if i < 26 else chr(65 + i // 26 - 1) + chr(65 + i % 26)
        val = df.iloc[0, i] if i < len(df.columns) else "N/A"
        print(f"  Column {col_letter} (index {i}): {val}")

    # Print first 15 rows of columns U, V, W (index 20, 21, 22)
    print("\n=== Data in Columns U, V, W (rows 0-14) ===")
    print("-" * 120)
    for i in range(min(15, len(df))):
        u = str(df.iloc[i, 20])[:40] if len(df.columns) > 20 else "N/A"
        v = str(df.iloc[i, 21])[:40] if len(df.columns) > 21 else "N/A"
        w = str(df.iloc[i, 22])[:40] if len(df.columns) > 22 else "N/A"
        print(f"Row {i:2d}: U={u:40s} | V={v:40s} | W={w}")

    # Check data types
    print("\n=== Sample non-null values in U, V, W ===")
    for i in range(1, min(50, len(df))):
        u_val = df.iloc[i, 20] if len(df.columns) > 20 else None
        v_val = df.iloc[i, 21] if len(df.columns) > 21 else None
        w_val = df.iloc[i, 22] if len(df.columns) > 22 else None

        if pd.notna(u_val) and pd.notna(v_val):
            print(f"Row {i}: U={u_val} | V={v_val} | W={w_val}")

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
