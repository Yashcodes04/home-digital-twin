"""
Excel File Validator
Quick check of Excel file structure
"""
import pandas as pd
from pathlib import Path

print("=" * 50)
print("📊 Excel File Validator")
print("=" * 50)

# Find Excel file
excel_path = Path("warehouse_CORRECTED.xlsx")
if not excel_path.exists():
    excel_path = Path.home() / "Downloads" / "warehouse_CORRECTED.xlsx"

if not excel_path.exists():
    print("\n❌ File not found: warehouse_CORRECTED.xlsx")
    print(f"Checked locations:")
    print(f"  - {Path.cwd()}")
    print(f"  - {Path.home() / 'Downloads'}")
    exit(1)

print(f"\n✅ Found: {excel_path}")

# Read Excel
df = pd.read_excel(excel_path)

print(f"\n📋 File Info:")
print(f"  Total Rows: {len(df)}")
print(f"  Total Columns: {len(df.columns)}")

print(f"\n📝 Column Names:")
for i, col in enumerate(df.columns, 1):
    print(f"  {i}. '{col}'")

print(f"\n🔍 Required Columns Check:")
required = ["Component Name", "Quantity", "Floor Number"]
for col in required:
    if col in df.columns:
        print(f"  ✅ '{col}' - Found")
    else:
        print(f"  ❌ '{col}' - MISSING")

print(f"\n📦 Component Names:")
for idx, row in df.iterrows():
    comp = row.get("Component Name", "N/A")
    qty = row.get("Quantity", "N/A")
    floor = row.get("Floor Number", "N/A")
    x = row.get("Position X", "N/A")
    y = row.get("Position Y", "N/A")
    z = row.get("Position Z", "N/A")
    
    has_coords = "✅ Has coords" if pd.notna(x) and pd.notna(z) else "⚠️  No coords"
    
    print(f"  Row {idx+2}: '{comp}' (Qty: {qty}, Floor: {floor}) {has_coords}")

print(f"\n✅ Excel file is valid!")
print("=" * 50)
