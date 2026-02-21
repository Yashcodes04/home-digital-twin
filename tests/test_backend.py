"""
Backend API Tester
Tests all backend endpoints
"""
import requests
import json

API_URL = "http://localhost:8000"

print("=" * 50)
print("🔧 Backend API Tester")
print("=" * 50)

# Test 1: Connection
print("\n1. Testing Connection...")
try:
    r = requests.get(f"{API_URL}/")
    print("   ✅ Backend is running")
except:
    print("   ❌ Backend NOT running")
    print("   → Start with: python main.py")
    exit(1)

# Test 2: Products
print("\n2. Testing Products Endpoint...")
try:
    r = requests.get(f"{API_URL}/products/")
    products = r.json()
    print(f"   Found {len(products)} products\n")
    
    for p in products:
        name = p['name']
        mesh = p['mesh_identifier']
        
        # Check for wrong names
        has_error = False
        errors = []
        
        if "500kW" in name:
            errors.append("has '500kW'")
            has_error = True
        if "42U" in name:
            errors.append("has '42U'")
            has_error = True
        if "15kV" in name:
            errors.append("has '15kV'")
            has_error = True
        if "Charger" in name:
            errors.append("has 'Charger'")
            has_error = True
        if "Inverter" in name:
            errors.append("has 'Inverter'")
            has_error = True
        
        if mesh == "NetShelter_SX":
            errors.append("mesh is 'NetShelter_SX' (should be 'NetShelter')")
            has_error = True
        if mesh == "Premset_SG":
            errors.append("mesh is 'Premset_SG' (should be 'PremSet')")
            has_error = True
        
        if has_error:
            print(f"   ❌ {name}")
            for err in errors:
                print(f"      → {err}")
        else:
            print(f"   ✅ {name} → {mesh}")
    
except Exception as e:
    print(f"   ❌ Error: {e}")

# Test 3: Warehouses
print("\n3. Testing Warehouses Endpoint...")
try:
    r = requests.get(f"{API_URL}/warehouses/")
    warehouses = r.json()
    print(f"   Found {len(warehouses)} warehouses\n")
    
    for w in warehouses:
        print(f"   ID: {w['id']}")
        print(f"   Name: {w['name']}")
        print(f"   Floors: {w['num_floors']}")
        print(f"   Floor Height: {w['floor_height']}m")
        print()
        
except Exception as e:
    print(f"   ❌ Error: {e}")

# Test 4: Devices
print("\n4. Testing Devices Endpoint...")
try:
    r = requests.get(f"{API_URL}/warehouses/")
    warehouses = r.json()
    
    if warehouses:
        wid = warehouses[0]['id']
        r = requests.get(f"{API_URL}/devices/warehouse/{wid}")
        devices = r.json()
        print(f"   Warehouse {wid}: {len(devices)} devices")
        
        if devices:
            by_floor = {}
            for d in devices:
                floor = d['floor_number']
                if floor not in by_floor:
                    by_floor[floor] = 0
                by_floor[floor] += 1
            
            for floor in sorted(by_floor.keys()):
                print(f"      Floor {floor}: {by_floor[floor]} devices")
        else:
            print("   ⚠️  No devices in warehouse yet")
    else:
        print("   ⚠️  No warehouses found")
        
except Exception as e:
    print(f"   ❌ Error: {e}")

print("\n" + "=" * 50)
print("✅ Backend API test complete")
print("=" * 50)
