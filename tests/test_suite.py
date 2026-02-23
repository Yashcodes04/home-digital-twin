"""
Digital Twin Testing Suite
Run this to test all components
"""
import requests
import pandas as pd
import json
from pathlib import Path

API_URL = "http://localhost:8000"

print("=" * 60)
print("🧪 DIGITAL TWIN - COMPLETE TEST SUITE")
print("=" * 60)

# ============================================================
# TEST 1: Backend Connection
# ============================================================
print("\n1️⃣ Testing Backend Connection...")
try:
    response = requests.get(f"{API_URL}/")
    print(f"   ✅ Backend is running")
except Exception as e:
    print(f"   ❌ Backend NOT running: {e}")
    print("   → Start backend with: python main.py")
    exit(1)

# ============================================================
# TEST 2: Products in Database
# ============================================================
print("\n2️⃣ Testing Products...")
try:
    response = requests.get(f"{API_URL}/products/")
    products = response.json()
    
    print(f"   Found {len(products)} products:")
    
    expected_names = {
    "Galaxy VL UPS": "Galaxy_VL",
    "NetShelter SX Rack": "NetShelter_SX",
    "Premset Switchgear": "Premset_SG",
    "PowerLogic ION9000": "PowerLogic_ION",
    "EVlink Pro AC": "EVlink_Pro",
    "EcoStruxure Solar": "Roof_Solar_Array"
}
    
    all_correct = True
    for product in products:
        name = product['name']
        mesh = product['mesh_identifier']
        
        if name in expected_names:
            expected_mesh = expected_names[name]
            if mesh == expected_mesh:
                print(f"   ✅ {name} → {mesh}")
            else:
                print(f"   ❌ {name} → {mesh} (expected: {expected_mesh})")
                all_correct = False
        else:
            # Check for wrong names
            if "500kW" in name or "42U" in name or "15kV" in name or "Charger" in name or "Inverter" in name:
                print(f"   ❌ WRONG NAME: {name}")
                all_correct = False
            else:
                print(f"   ⚠️  Unexpected: {name}")
    
    if not all_correct:
        print("\n   🚨 Products have WRONG NAMES!")
        print("   → Delete products and re-seed database")
        exit(1)
        
except Exception as e:
    print(f"   ❌ Error: {e}")
    exit(1)

# ============================================================
# TEST 3: Warehouses
# ============================================================
print("\n3️⃣ Testing Warehouses...")
try:
    response = requests.get(f"{API_URL}/warehouses/")
    warehouses = response.json()
    
    if len(warehouses) == 0:
        print("   ❌ No warehouses found!")
        print("   → Run setup wizard first")
        exit(1)
    
    print(f"   Found {len(warehouses)} warehouse(s):")
    for w in warehouses:
        print(f"   ID: {w['id']}, Name: {w['name']}, Floors: {w['num_floors']}")
    
    # Use the first warehouse for testing
    test_warehouse_id = warehouses[0]['id']
    print(f"\n   Using Warehouse ID: {test_warehouse_id} for tests")
    
except Exception as e:
    print(f"   ❌ Error: {e}")
    exit(1)

# ============================================================
# TEST 4: Excel File Structure
# ============================================================
print("\n4️⃣ Testing Excel File...")

excel_path = Path("warehouse_CORRECTED.xlsx")
if not excel_path.exists():
    # Try Downloads folder
    excel_path = Path.home() / "Downloads" / "warehouse_CORRECTED.xlsx"

if not excel_path.exists():
    print(f"   ❌ Excel file not found!")
    print(f"   → Looking for: warehouse_CORRECTED.xlsx")
    print(f"   → Checked: {Path.cwd()} and Downloads folder")
    exit(1)

try:
    df = pd.read_excel(excel_path)
    print(f"   ✅ Excel file loaded: {len(df)} rows")
    
    # Check columns
    print(f"\n   Columns in Excel:")
    for col in df.columns:
        print(f"      - '{col}'")
    
    # Check required columns
    required_cols = ["Component Name", "Quantity", "Floor Number"]
    missing_cols = [col for col in required_cols if col not in df.columns]
    
    if missing_cols:
        print(f"\n   ❌ Missing required columns: {missing_cols}")
        exit(1)
    
    # Check component names
    print(f"\n   Component Names in Excel:")
    component_names = df["Component Name"].unique()
    for name in component_names:
        count = len(df[df["Component Name"] == name])
        print(f"      - '{name}' ({count} rows)")
    
    # Match against products
    print(f"\n   Matching Components to Products:")
    products_dict = {p['name']: p for p in products}
    
    unmatched = []
    for name in component_names:
        if name in products_dict:
            print(f"      ✅ '{name}' → MATCHED")
        else:
            # Try fuzzy match
            matched = False
            for prod_name in products_dict.keys():
                if name.lower() in prod_name.lower() or prod_name.lower() in name.lower():
                    print(f"      ⚠️  '{name}' → Partial match: '{prod_name}'")
                    matched = True
                    break
            if not matched:
                print(f"      ❌ '{name}' → NOT FOUND")
                unmatched.append(name)
    
    if unmatched:
        print(f"\n   🚨 {len(unmatched)} components NOT matched!")
        print("   → Excel names must EXACTLY match database product names")
        exit(1)
        
except Exception as e:
    print(f"   ❌ Error reading Excel: {e}")
    exit(1)

# ============================================================
# TEST 5: Upload Excel
# ============================================================
print("\n5️⃣ Testing Excel Upload...")
try:
    with open(excel_path, 'rb') as f:
        files = {'file': ('warehouse_CORRECTED.xlsx', f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
        response = requests.post(
            f"{API_URL}/devices/upload-excel/{test_warehouse_id}",
            files=files
        )
    
    result = response.json()
    
    print(f"\n   Upload Response:")
    print(f"      Success: {result.get('success')}")
    print(f"      Devices Installed: {result.get('installed_count')}")
    
    if result.get('errors'):
        print(f"\n   Errors ({len(result['errors'])}):")
        for error in result['errors'][:5]:  # Show first 5 errors
            print(f"      ❌ {error}")
        if len(result['errors']) > 5:
            print(f"      ... and {len(result['errors']) - 5} more errors")
    
    if result.get('installed_count', 0) > 0:
        print(f"\n   ✅ Successfully installed {result['installed_count']} devices!")
    else:
        print(f"\n   ❌ No devices installed!")
        if result.get('errors'):
            print("   → Check errors above")
        
except Exception as e:
    print(f"   ❌ Upload failed: {e}")
    exit(1)

# ============================================================
# TEST 6: Verify Devices in Database
# ============================================================
print("\n6️⃣ Verifying Devices in Database...")
try:
    response = requests.get(f"{API_URL}/devices/warehouse/{test_warehouse_id}")
    devices = response.json()
    
    print(f"   Found {len(devices)} devices in database")
    
    if len(devices) > 0:
        # Group by floor
        by_floor = {}
        for device in devices:
            floor = device['floor_number']
            if floor not in by_floor:
                by_floor[floor] = []
            by_floor[floor].append(device)
        
        print(f"\n   Devices by Floor:")
        for floor in sorted(by_floor.keys()):
            print(f"      Floor {floor}: {len(by_floor[floor])} devices")
        
        # Show first 3 devices
        print(f"\n   Sample Devices:")
        for device in devices[:3]:
            print(f"      - {device['product']['name']} at ({device['position_x']}, {device['position_y']}, {device['position_z']})")
        
        print(f"\n   ✅ SUCCESS! {len(devices)} devices ready in 3D view")
    else:
        print(f"   ❌ No devices found after upload!")
        
except Exception as e:
    print(f"   ❌ Error: {e}")

# ============================================================
# SUMMARY
# ============================================================
print("\n" + "=" * 60)
print("📊 TEST SUMMARY")
print("=" * 60)

if len(devices) > 0:
    print("✅ All tests PASSED!")
    print(f"✅ {len(devices)} devices ready to view")
    print("\nNext Steps:")
    print("  1. Open browser: http://localhost:3000/warehouse.html")
    print("  2. Press F12 to open console")
    print("  3. Refresh page (Ctrl + Shift + R)")
    print(f"  4. You should see 'Found {len(devices)} devices in database'")
else:
    print("❌ Tests FAILED - No devices in database")
    print("\nTroubleshooting:")
    print("  1. Check errors in Test 5 above")
    print("  2. Verify product names match exactly")
    print("  3. Check Excel file has correct column names")

print("=" * 60)
