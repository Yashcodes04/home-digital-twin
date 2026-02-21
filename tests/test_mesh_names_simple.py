"""
🔍 COMPLETE MESH NAME VERIFICATION TEST
Tests: Backend DB ↔ Frontend Templates ↔ GLB File

This will show you EXACTLY which names match and which don't!
"""
import requests
import json

API_URL = "http://localhost:8000"

print("=" * 70)
print("🔍 MESH NAME VERIFICATION TEST")
print("=" * 70)
print()

# ============================================================
# STEP 1: Get Backend Products
# ============================================================
print("1️⃣ Fetching Backend Products...")
print("-" * 70)

try:
    response = requests.get(f"{API_URL}/products/")
    products = response.json()
    
    backend_meshes = {}
    for p in products:
        backend_meshes[p['name']] = {
            'mesh_identifier': p['mesh_identifier'],
            'product_id': p['id']
        }
    
    print(f"✅ Found {len(products)} products in backend database\n")
    
    print("Backend Products:")
    for name, data in backend_meshes.items():
        print(f"  {name}")
        print(f"    mesh_identifier: {data['mesh_identifier']}")
        print()
        
except Exception as e:
    print(f"❌ Failed to fetch backend products: {e}")
    exit(1)

# ============================================================
# STEP 2: Expected Mesh Names (from GLB structure)
# ============================================================
print("2️⃣ Expected Mesh Names (Frontend & GLB)")
print("-" * 70)

# These should match what's in:
# 1. Frontend DEVICE_TEMPLATES
# 2. GLB file mesh names
expected_meshes = {
    "Galaxy VL UPS": "Galaxy_VL",
    "NetShelter SX Rack": "NetShelter_SX",     # Note: _SX suffix
    "Premset Switchgear": "Premset_SG",         # Note: _SG suffix
    "PowerLogic ION9000": "PowerLogic_ION",
    "EVlink Pro AC": "EVlink_Pro",
    "EcoStruxure Solar": "Roof_Solar_Array"
}

print("Expected mesh names:")
for name, mesh in expected_meshes.items():
    print(f"  {name}")
    print(f"    mesh_identifier: {mesh}")
    print()

# ============================================================
# STEP 3: Compare Backend vs Expected
# ============================================================
print("3️⃣ Comparing Backend vs Expected...")
print("-" * 70)

mismatches = []
matches = []

for name in backend_meshes.keys():
    backend_mesh = backend_meshes[name]['mesh_identifier']
    expected_mesh = expected_meshes.get(name)
    
    if expected_mesh:
        if backend_mesh == expected_mesh:
            matches.append(name)
            print(f"✅ {name}")
            print(f"   Backend:  {backend_mesh}")
            print(f"   Expected: {expected_mesh}")
            print(f"   STATUS: MATCH ✓")
        else:
            mismatches.append(name)
            print(f"❌ {name}")
            print(f"   Backend:  {backend_mesh}")
            print(f"   Expected: {expected_mesh}")
            print(f"   STATUS: MISMATCH ✗")
    else:
        print(f"⚠️  {name}")
        print(f"   Backend: {backend_mesh}")
        print(f"   Expected: Not found")
    print()

# ============================================================
# STEP 4: Create Fix Script
# ============================================================
if len(mismatches) > 0:
    print("=" * 70)
    print("4️⃣ GENERATING FIX SCRIPT")
    print("=" * 70)
    print()
    
    fix_script = "# SQL commands to fix mesh_identifier mismatches\n\n"
    
    for m in mismatches:
        product_id = backend_meshes[m]['product_id']
        current_mesh = backend_meshes[m]['mesh_identifier']
        correct_mesh = expected_meshes[m]
        
        fix_script += f"-- Fix: {m}\n"
        fix_script += f"UPDATE products SET mesh_identifier = '{correct_mesh}' WHERE id = {product_id};\n"
        fix_script += f"-- Changed: {current_mesh} → {correct_mesh}\n\n"
    
    with open('fix_mesh_names.sql', 'w') as f:
        f.write(fix_script)
    
    print("✅ Created: fix_mesh_names.sql")
    print()
    print("SQL Fix Commands:")
    print(fix_script)

# ============================================================
# SUMMARY
# ============================================================
print("=" * 70)
print("📊 SUMMARY")
print("=" * 70)
print()

print(f"✅ Matches: {len(matches)}")
for m in matches:
    print(f"   • {m}")
print()

print(f"❌ Mismatches: {len(mismatches)}")
for m in mismatches:
    backend_mesh = backend_meshes[m]['mesh_identifier']
    expected_mesh = expected_meshes[m]
    print(f"   • {m}")
    print(f"     Current: {backend_mesh}")
    print(f"     Should be: {expected_mesh}")
print()

# ============================================================
# NEXT STEPS
# ============================================================
print("=" * 70)
print("5️⃣ NEXT STEPS - Verify GLB File")
print("=" * 70)
print()
print("Run this in browser console (F12) to check GLB mesh names:")
print()
print("Copy the JavaScript code from: check_glb_meshes.js")
print("Or paste this directly in console:")
print()
print("-" * 70)

js_code = '''
console.log("🔍 Checking GLB Mesh Names...");
console.log("=".repeat(50));

const foundMeshes = new Map();

scene.traverse((child) => {
  if (child.isMesh && child.userData.dbKey) {
    const meshName = child.name;
    
    // Identify device type
    let deviceType = "Unknown";
    if (meshName.includes("Galaxy")) deviceType = "Galaxy VL UPS";
    else if (meshName.includes("NetShelter")) deviceType = "NetShelter SX Rack";
    else if (meshName.includes("Premset")) deviceType = "Premset Switchgear";
    else if (meshName.includes("PowerLogic") || meshName.includes("ION")) deviceType = "PowerLogic ION9000";
    else if (meshName.includes("EVlink")) deviceType = "EVlink Pro AC";
    else if (meshName.includes("Solar") || meshName.includes("Roof")) deviceType = "EcoStruxure Solar";
    
    if (!foundMeshes.has(deviceType)) {
      foundMeshes.set(deviceType, meshName);
    }
  }
});

console.log("\\nGLB Mesh Names Found:");
console.log("=".repeat(50));

const expected = {
  "Galaxy VL UPS": "Galaxy_VL",
  "NetShelter SX Rack": "NetShelter_SX",
  "Premset Switchgear": "Premset_SG",
  "PowerLogic ION9000": "PowerLogic_ION",
  "EVlink Pro AC": "EVlink_Pro",
  "EcoStruxure Solar": "Roof_Solar_Array"
};

for (const [deviceType, meshName] of foundMeshes.entries()) {
  const expectedMesh = expected[deviceType];
  const matches = meshName.includes(expectedMesh);
  
  console.log(`${matches ? '✅' : '❌'} ${deviceType}`);
  console.log(`   GLB Mesh: ${meshName}`);
  console.log(`   Expected: ${expectedMesh}`);
  console.log(`   ${matches ? 'MATCH' : 'MISMATCH'}`);
  console.log("");
}

console.log("=".repeat(50));
console.log("✅ GLB scan complete!");
'''

print(js_code)
print("-" * 70)
print()

# ============================================================
# FINAL VERDICT
# ============================================================
print("=" * 70)
print("🏁 FINAL VERDICT")
print("=" * 70)
print()

if len(mismatches) == 0:
    print("✅ ALL BACKEND MESH NAMES ARE CORRECT!")
    print()
    print("Next step: Run the JavaScript code above in browser console")
    print("to verify GLB file mesh names match too.")
else:
    print("❌ BACKEND HAS MISMATCHES!")
    print()
    print("Fix options:")
    print()
    print("Option 1 - Quick SQL Fix (in database):")
    print("  psql -U dtuser -d digital_twin < fix_mesh_names.sql")
    print()
    print("Option 2 - Update backend/main.py and reseed:")
    print("  1. Update mesh_identifier values in main.py")
    print("  2. DELETE FROM products;")
    print("  3. curl -X POST http://localhost:8000/seed-data/")
    print()
    print("Option 3 - Use the updated main.py from Downloads:")
    print("  1. Copy new main.py to backend/")
    print("  2. DELETE FROM products;")
    print("  3. python main.py")
    print("  4. curl -X POST http://localhost:8000/seed-data/")

print()
print("=" * 70)
