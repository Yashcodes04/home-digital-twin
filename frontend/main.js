import * as THREE from 'three'
import CameraControls from 'camera-controls' 
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import TWEEN from '@tweenjs/tween.js'

CameraControls.install({ THREE: THREE })

// ============================================================
// API CONFIGURATION
// ============================================================

const API_URL = 'http://localhost:8000';
let CURRENT_WAREHOUSE_ID = null;
let WAREHOUSE_CONFIG = null;

// ============================================================
// SCHNEIDER ELECTRIC DEVICE DATABASE (Templates)
// ============================================================

const DEVICE_TEMPLATES = {
  "Galaxy_VL": {
    name: "Galaxy VL UPS",
    type: "Uninterruptible Power Supply",
    manufacturer: "Schneider Electric",
    model: "Galaxy VL 500kW",
    notes: "High-efficiency scalable power protection."
  },
  "NetShelter": {
    name: "NetShelter SX Rack",
    type: "Server Rack Enclosure",
    manufacturer: "APC by Schneider",
    model: "AR3100",
    notes: "Standard enclosure for low to medium density."
  },
  "PremSet": {
    name: "Premset Switchgear",
    type: "MV Switchgear",
    manufacturer: "Schneider Electric",
    model: "Premset 15kV",
    notes: "Shielded Solid Insulation System (2SIS)."
  },
  "PowerLogic_ION": {
    name: "PowerLogic ION9000",
    type: "Power Quality Meter",
    manufacturer: "Schneider Electric",
    model: "ION9000",
    notes: "Class 0.1S accuracy, PQ analysis."
  },
  "EVlink_Pro": {
    name: "EVlink Pro AC",
    type: "EV Charging Station",
    manufacturer: "Schneider Electric",
    model: "EVlink Pro",
    notes: "Smart charging for fleets and buildings."
  },
  "Roof_Solar_Array": {
    name: "EcoStruxure Solar",
    type: "Photovoltaic Array",
    manufacturer: "Schneider Electric",
    model: "Conext CL",
    notes: "Rooftop renewable energy generation."
  }
}

const DEVICE_DB = {} 

// ============================================================
// DATABASE API FUNCTIONS
// ============================================================

async function fetchWarehouse(warehouseId) {
  try {
    const response = await fetch(`${API_URL}/warehouses/${warehouseId}`);
    if (!response.ok) throw new Error('Warehouse not found');
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch warehouse:', error);
    return null;
  }
}

async function fetchDevices(warehouseId) {
  try {
    const response = await fetch(`${API_URL}/devices/warehouse/${warehouseId}`);
    if (!response.ok) throw new Error('Devices not found');
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch devices:', error);
    return [];
  }
}

async function saveDevicePosition(deviceId, x, y, z, rotation = 0) {
  try {
    const response = await fetch(`${API_URL}/devices/${deviceId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        position_x: x, 
        position_y: y, 
        position_z: z,
        rotation_y: rotation
      })
    });
    if (!response.ok) throw new Error('Failed to save position');
    console.log(`✓ Saved position for device ${deviceId}`);
  } catch (error) {
    console.error('Failed to save device position:', error);
  }
}

async function createDevice(productId, warehouseId, floorNumber, x, y, z) {
  try {
    const response = await fetch(`${API_URL}/devices/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        warehouse_id: warehouseId,
        product_id: productId,
        floor_number: floorNumber,
        position_x: x,
        position_y: y,
        position_z: z
      })
    });
    if (!response.ok) throw new Error('Failed to create device');
    return await response.json();
  } catch (error) {
    console.error('Failed to create device:', error);
    return null;
  }
}

async function updateDeviceHealth(deviceId, healthScore, status) {
  try {
    await fetch(`${API_URL}/devices/${deviceId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        health_score: healthScore,
        status: status,
        last_maintenance: new Date().toISOString()
      })
    });
  } catch (error) {
    console.error('Failed to update device health:', error);
  }
}

async function deleteDevice(deviceId) {
  try {
    const response = await fetch(`${API_URL}/devices/${deviceId}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete device');
    console.log(`✓ Deleted device ${deviceId}`);
    return true;
  } catch (error) {
    console.error('Failed to delete device:', error);
    return false;
  }
}

async function checkWarrantyAlerts(warehouseId) {
  try {
    const response = await fetch(`${API_URL}/devices/warranty-alerts/${warehouseId}?days_threshold=90`);
    if (!response.ok) return [];
    const alerts = await response.json();
    
    // Show banner if there are alerts
    if (alerts.length > 0) {
      showWarrantyBanner(alerts);
    }
    
    return alerts;
  } catch (error) {
    console.error('Failed to fetch warranty alerts:', error);
    return [];
  }
}

// ============================================================
// WARRANTY BANNER
// ============================================================

function showWarrantyBanner(alerts) {
  const expired = alerts.filter(a => a.status === 'expired').length;
  const critical = alerts.filter(a => a.status === 'critical').length;
  const warning = alerts.filter(a => a.status === 'expiring_soon').length;
  const total = alerts.length;
  
  // Remove existing banner if any
  const existing = document.getElementById('warrantyBanner');
  if (existing) existing.remove();
  
  const banner = document.createElement('div');
  banner.id = 'warrantyBanner';
  banner.style.cssText = `
    position: fixed;
    top: 60px;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, rgba(239,68,68,0.95) 0%, rgba(245,158,11,0.95) 100%);
    color: white;
    padding: 12px 20px;
    z-index: 19;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
    font-family: 'DM Sans', sans-serif;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  
  banner.innerHTML = `
    <div style="font-size: 1.2rem;">⚠️</div>
    <div style="flex: 1; max-width: 1200px;">
      <strong>${total} Warranty Alert${total > 1 ? 's' : ''}</strong>
      <div style="font-size: 0.85rem; opacity: 0.9; margin-top: 2px;">
        ${expired > 0 ? `${expired} expired` : ''}
        ${expired > 0 && critical > 0 ? ', ' : ''}
        ${critical > 0 ? `${critical} critical` : ''}
        ${(expired > 0 || critical > 0) && warning > 0 ? ', ' : ''}
        ${warning > 0 ? `${warning} expiring soon` : ''}
      </div>
    </div>
    <button onclick="alert('Warranty panel coming soon!')" style="
      background: white;
      color: #ef4444;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    ">View Details</button>
  `;
  
  document.getElementById('topbar').after(banner);
}

// ============================================================
// HEALTH UTILITY
// ============================================================

function getHealthInfo(score) {
  if (score >= 80) return { label: "Healthy",  hex: "#22c55e", three: 0x22c55e, cls: "badge-healthy"  }
  if (score >= 50) return { label: "Warning",  hex: "#f59e0b", three: 0xf59e0b, cls: "badge-warning"  }
  return                   { label: "Critical", hex: "#ef4444", three: 0xef4444, cls: "badge-critical" }
}

// ============================================================
// UI PANELS
// ============================================================

function showInfoPanel(dbKey) {
  const data = DEVICE_DB[dbKey]
  if (!data) return
  const h = getHealthInfo(data.health)

  document.getElementById('uiName').innerText   = data.name
  document.getElementById('uiSerial').innerText = data.serial
  document.getElementById('uiHealth').innerText = `${data.health}%`
  document.getElementById('uiDate').innerText   = data.lastMaintenance
  document.getElementById('uiStatusText').innerText       = h.label
  document.getElementById('uiStatusText').style.color     = h.hex
  document.getElementById('uiStatusDot').style.background = h.hex

  const bar = document.getElementById('uiHealthBar')
  bar.style.width      = `${data.health}%`
  bar.style.background = h.hex

  // Populate position inputs
  const mesh = interactableMeshes.find(m => m.userData.dbKey === dbKey);
  if (mesh) {
    document.getElementById('posX').value = mesh.position.x.toFixed(2);
    document.getElementById('posY').value = mesh.position.y.toFixed(2);
    document.getElementById('posZ').value = mesh.position.z.toFixed(2);
  }

  // Add device source indicator
  const deviceSource = data.db_id ? 
    '<span style="color: #22c55e;">● Database Device</span>' : 
    '<span style="color: #f59e0b;">● GLB Template (Not Saved)</span>';

  // Add warranty information if available
  if (data.warrantyExpiry) {
    const daysRemaining = Math.floor((new Date(data.warrantyExpiry) - new Date()) / (1000 * 60 * 60 * 24));
    const warrantyStatus = getWarrantyStatus(daysRemaining);
    
    const warrantySection = document.getElementById('warrantySection');
    if (warrantySection) {
      warrantySection.innerHTML = `
        <div class="label">Device Source</div>
        <div style="font-size: 0.8rem; margin-top: 4px;">${deviceSource}</div>
        <div class="label" style="margin-top: 12px;">Warranty Status</div>
        <div style="margin-top: 8px; padding: 10px; background: ${warrantyStatus.color}20; border-radius: 6px; border: 1px solid ${warrantyStatus.color}40;">
          <div style="font-size: 0.85rem; color: var(--muted);">Expires: ${new Date(data.warrantyExpiry).toLocaleDateString()}</div>
          <div style="font-size: 1.1rem; font-weight: 600; color: ${warrantyStatus.color}; margin-top: 4px;">
            ${daysRemaining < 0 ? '⚠️ EXPIRED' : `${daysRemaining} days remaining`}
          </div>
        </div>
      `;
    }
  } else {
    // No warranty info, just show device source
    const warrantySection = document.getElementById('warrantySection');
    if (warrantySection) {
      warrantySection.innerHTML = `
        <div class="label">Device Source</div>
        <div style="font-size: 0.8rem; margin-top: 4px;">${deviceSource}</div>
        <div style="font-size: 0.75rem; color: var(--muted); margin-top: 8px;">
          ${data.db_id ? 
            'This device is saved in the database.' : 
            'This is a template from the 3D model. Drag from palette to create saved devices.'}
        </div>
      `;
    }
  }

  document.getElementById('infoPanel').classList.add('active')
}

function getWarrantyStatus(daysRemaining) {
  if (daysRemaining < 0) return { color: '#ef4444', status: 'expired' };
  if (daysRemaining < 30) return { color: '#f59e0b', status: 'critical' };
  if (daysRemaining < 90) return { color: '#eab308', status: 'warning' };
  return { color: '#22c55e', status: 'healthy' };
}

function hideInfoPanel() {
  document.getElementById('infoPanel').classList.remove('active')
}

document.getElementById('closePanel').addEventListener('click', e => {
  e.stopPropagation()
  hideInfoPanel()
  deselectAll3D(true)
})

// Delete Device Button
document.getElementById('deleteDeviceBtn').addEventListener('click', async e => {
  e.stopPropagation()
  
  if (!state3D.selectedMesh) return;
  
  const data = DEVICE_DB[state3D.selectedMesh.userData.dbKey];
  
  if (!data) {
    alert('Cannot delete this device - no device information found.');
    return;
  }
  
  const confirmDelete = confirm(`Delete device "${data.name}" (${data.serial})?\n\nThis action cannot be undone.`);
  
  if (!confirmDelete) return;
  
  // Store mesh reference
  const meshToDelete = state3D.selectedMesh;
  
  // Check if this is a database device or GLB template device
  if (data.db_id) {
    // Database device - delete from database first
    const success = await deleteDevice(data.db_id);
    
    if (!success) {
      alert('❌ Failed to delete device from database. Please try again.');
      return;
    }
  } else {
    // GLB template device - just remove from scene
    console.log(`Removing GLB template device: ${data.serial}`);
  }
  
  // Hide panel and deselect first
  hideInfoPanel();
  state3D.selectedMesh = null;
  
  // Remove from interactable meshes array immediately
  const meshIndex = interactableMeshes.indexOf(meshToDelete);
  if (meshIndex > -1) {
    interactableMeshes.splice(meshIndex, 1);
  }
  
  // Remove from DEVICE_DB
  delete DEVICE_DB[meshToDelete.userData.dbKey];
  
  // Animate fade out before removal
  const originalOpacity = meshToDelete.material ? 
    (meshToDelete.material.opacity !== undefined ? meshToDelete.material.opacity : 1) : 1;
  
  if (meshToDelete.material) {
    meshToDelete.material.transparent = true;
  }
  
  new TWEEN.Tween({ opacity: originalOpacity, scale: 1 })
    .to({ opacity: 0, scale: 0.1 }, 400)
    .easing(TWEEN.Easing.Cubic.In)
    .onUpdate((obj) => {
      if (meshToDelete.material) {
        if (Array.isArray(meshToDelete.material)) {
          meshToDelete.material.forEach(mat => mat.opacity = obj.opacity);
        } else {
          meshToDelete.material.opacity = obj.opacity;
        }
      }
      meshToDelete.scale.set(obj.scale, obj.scale, obj.scale);
    })
    .onComplete(() => {
      // Complete cleanup after animation
      completeMeshDeletion(meshToDelete);
    })
    .start();
  
  const deviceType = data.db_id ? 'database device' : 'template device';
  console.log(`✓ Deleting ${deviceType}: ${data.serial}`);
  
  // Show success message immediately
  setTimeout(() => {
    alert(`✓ ${deviceType} "${data.serial}" removed successfully!`);
  }, 100);
});

// Helper function for complete mesh cleanup
function completeMeshDeletion(mesh) {
  // Dispose of geometry
  if (mesh.geometry) {
    mesh.geometry.dispose();
  }
  
  // Dispose of material(s)
  if (mesh.material) {
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(mat => {
        if (mat.map) mat.map.dispose();
        if (mat.normalMap) mat.normalMap.dispose();
        if (mat.emissiveMap) mat.emissiveMap.dispose();
        mat.dispose();
      });
    } else {
      if (mesh.material.map) mesh.material.map.dispose();
      if (mesh.material.normalMap) mesh.material.normalMap.dispose();
      if (mesh.material.emissiveMap) mesh.material.emissiveMap.dispose();
      mesh.material.dispose();
    }
  }
  
  // Remove all children (warranty rings, etc.)
  const children = [...mesh.children]; // Create copy of array
  children.forEach(child => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach(mat => mat.dispose());
      } else {
        child.material.dispose();
      }
    }
    mesh.remove(child);
  });
  
  // Remove from parent
  if (mesh.parent) {
    mesh.parent.remove(mesh);
  }
  
  // Remove from scene as well (belt and suspenders)
  scene.remove(mesh);
  
  console.log('✓ Mesh completely removed from 3D scene');
}

// Update Position Button
document.getElementById('updatePositionBtn').addEventListener('click', async e => {
  e.stopPropagation();
  
  if (!state3D.selectedMesh) return;
  
  const data = DEVICE_DB[state3D.selectedMesh.userData.dbKey];
  
  // Get new position from inputs
  const newX = parseFloat(document.getElementById('posX').value);
  const newY = parseFloat(document.getElementById('posY').value);
  const newZ = parseFloat(document.getElementById('posZ').value);
  
  // Validate
  if (isNaN(newX) || isNaN(newY) || isNaN(newZ)) {
    alert('Please enter valid numbers for all coordinates.');
    return;
  }
  
  // Update mesh position
  state3D.selectedMesh.position.set(newX, newY, newZ);
  
  // Save to database if it's a database device
  if (data && data.db_id) {
    await saveDevicePosition(
      data.db_id,
      newX,
      newY,
      newZ,
      state3D.selectedMesh.rotation.y * (180 / Math.PI)
    );
    alert(`✓ Position updated and saved to database:\n(${newX.toFixed(2)}, ${newY.toFixed(2)}, ${newZ.toFixed(2)})`);
  } else {
    // Template device - position updated but not saved to database
    alert(`✓ Position updated in 3D view:\n(${newX.toFixed(2)}, ${newY.toFixed(2)}, ${newZ.toFixed(2)})\n\n⚠️ This is a template device - position not saved to database.\nDrag from palette to create a saved device.`);
  }
});

// ============================================================
// DATASHEET MODAL
// ============================================================

let dsSort = { col: 'health', dir: 'asc' }

document.getElementById('datasheetBtn').addEventListener('click', openDatasheet)
document.getElementById('dsClose').addEventListener('click', () => document.getElementById('datasheetModal').classList.remove('open'))

function openDatasheet() {
  buildDatasheet()
  document.getElementById('datasheetModal').classList.add('open')
}

function buildDatasheet() {
  const devices = Object.entries(DEVICE_DB).map(([key, d]) => ({ key, ...d }))

  if (devices.length === 0) {
    document.getElementById('dsBody').innerHTML = '<div style="padding:20px; text-align:center; color:#64748b">No devices detected yet. Load the 3D model or add devices.</div>'
    return
  }

  devices.sort((a, b) => {
    let va = a[dsSort.col], vb = b[dsSort.col]
    if (typeof va === 'string') va = va.toLowerCase()
    if (typeof vb === 'string') vb = vb.toLowerCase()
    if (va < vb) return dsSort.dir === 'asc' ? -1 :  1
    if (va > vb) return dsSort.dir === 'asc' ?  1 : -1
    return 0
  })

  const avg    = Math.round(devices.reduce((s,d) => s + d.health, 0) / devices.length)
  const avgH   = getHealthInfo(avg)
  const counts = {
      healthy:  devices.filter(d => d.health >= 80).length,
      warning:  devices.filter(d => d.health >= 50 && d.health < 80).length,
      critical: devices.filter(d => d.health < 50).length
  }

  const columns = [
    { key: 'name',            label: 'Device'           },
    { key: 'type',            label: 'Type'             },
    { key: 'serial',          label: 'Serial'           },
    { key: 'health',          label: 'Health'           },
    { key: 'location',        label: 'Location'         },
  ]

  const arrow = col => dsSort.col !== col ? '↕' : (dsSort.dir === 'asc' ? '↑' : '↓')

  const html = `
    <div class="ds-summary">
      <div class="ds-card">
        <div class="ds-card-label">Total Devices</div>
        <div class="ds-card-val" style="color:var(--text)">${devices.length}</div>
      </div>
      <div class="ds-card">
        <div class="ds-card-label">Avg Health</div>
        <div class="ds-card-val" style="color:${avgH.hex}">${avg}%</div>
      </div>
      <div class="ds-card">
        <div class="ds-card-label">Attention Needed</div>
        <div class="ds-card-val" style="color:#ef4444">${counts.critical + counts.warning}</div>
      </div>
    </div>
    <div class="ds-table-wrap">
      <table>
        <thead>
          <tr>
            ${columns.map(c => `<th data-col="${c.key}">${c.label} <span class="sort-arrow">${arrow(c.key)}</span></th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${devices.map(d => {
            const h = getHealthInfo(d.health)
            return `
              <tr>
                <td><strong>${d.name}</strong></td>
                <td>${d.type || '—'}</td>
                <td><span class="serial-code">${d.serial}</span></td>
                <td><span class="badge ${h.cls}"><span class="badge-dot" style="background:${h.hex}"></span>${d.health}%</span></td>
                <td>${d.location || '—'}</td>
              </tr>`
          }).join('')}
        </tbody>
      </table>
    </div>
  `
  const body = document.getElementById('dsBody')
  body.innerHTML = html

  body.querySelectorAll('th[data-col]').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.col
      if (dsSort.col === col) dsSort.dir = dsSort.dir === 'asc' ? 'desc' : 'asc'
      else { dsSort.col = col; dsSort.dir = 'asc' }
      buildDatasheet()
    })
  })
}

// ============================================================
// VIEW TOGGLE
// ============================================================

let currentView = '3d'

document.getElementById('viewToggleBtn').addEventListener('click', () => {
  if (currentView === '3d') {
    currentView = 'network'
    document.getElementById('view-3d').classList.add('hidden')
    document.getElementById('view-network').classList.remove('hidden')
    document.getElementById('icon-network').style.display = 'none'
    document.getElementById('icon-3d').style.display      = 'block'
    document.getElementById('viewLabel').innerText        = '3D View'
    renderNetwork()
  } else {
    currentView = '3d'
    document.getElementById('view-network').classList.add('hidden')
    document.getElementById('view-3d').classList.remove('hidden')
    document.getElementById('icon-network').style.display = 'block'
    document.getElementById('icon-3d').style.display      = 'none'
    document.getElementById('viewLabel').innerText        = 'Node View'
  }
  hideInfoPanel()
})

// ============================================================
// SEARCH
// ============================================================

document.getElementById('searchBtn').addEventListener('click', () => {
  const query = document.getElementById('searchInput').value.trim().toLowerCase()
  if (!query) return

  const dbKey = Object.keys(DEVICE_DB).find(k =>
    DEVICE_DB[k].serial.toLowerCase().includes(query) || DEVICE_DB[k].name.toLowerCase().includes(query)
  )

  if (!dbKey) {
    alert(`No device found matching "${query}".`)
    return
  }

  if (currentView === '3d') {
    select3DByKey(dbKey)
  } else {
    console.log("Found in Node View:", dbKey)
  }
})

// ============================================================
// 3D VIEW CORE (Scene, Camera, Renderer)
// ============================================================

const TOPBAR_H = 60
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0e1117)

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / (window.innerHeight - TOPBAR_H), 0.1, 1000)
const clock = new THREE.Clock()

const canvas3D = document.querySelector('#bg')
const renderer = new THREE.WebGLRenderer({ canvas: canvas3D, antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight - TOPBAR_H)
renderer.setPixelRatio(window.devicePixelRatio)

renderer.localClippingEnabled = true

const floorPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1000); 

scene.add(new THREE.AmbientLight(0xffffff, 1.5))
const dirLight = new THREE.DirectionalLight(0xffffff, 2)
dirLight.position.set(10, 20, 10)
scene.add(dirLight)

const controls = new CameraControls(camera, canvas3D)
controls.dollyToCursor = true
controls.minDistance = 1
controls.maxDistance = 200

const HOME_POS = { x: 30, y: 30, z: 40 }
const HOME_TARGET = { x: 0, y: 15, z: 0 }
controls.setLookAt(HOME_POS.x, HOME_POS.y, HOME_POS.z, HOME_TARGET.x, HOME_TARGET.y, HOME_TARGET.z, false)

window.addEventListener('resize', () => {
  const w = window.innerWidth
  const h = window.innerHeight - TOPBAR_H
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
})

// ============================================================
// FLOOR NAVIGATION (CLIPPING PLANE APPROACH - KEEPS MODEL INTACT)
// ============================================================

let FLOOR_HEIGHT = 6.0;  
const EYE_LEVEL = 2.0;

document.getElementById('floorSelect').addEventListener('change', (e) => {
  const floorValue = e.target.value;
  
  if (floorValue === 'all') {
    // Show all floors - disable clipping
    floorPlane.constant = 1000; // Very high value = no clipping
    
    // Reset camera to overview
    controls.setLookAt(
      HOME_POS.x, HOME_POS.y, HOME_POS.z,
      HOME_TARGET.x, HOME_TARGET.y, HOME_TARGET.z,
      true
    );
    
    console.log('🏢 Showing all floors');
  } else {
    // Show specific floor - clip above it
    const floorNum = parseInt(floorValue);
    const baseHeight = (floorNum - 1) * FLOOR_HEIGHT;
    const targetY = baseHeight + EYE_LEVEL;

    console.log(`🚀 Moving inside Floor ${floorNum} (Y=${targetY})`);

    // Clip everything above this floor
    floorPlane.constant = floorNum * FLOOR_HEIGHT;

    // Move camera inside the floor
    controls.setLookAt(
      8, targetY, 8,     
      0, targetY, 0,     
      true               
    );
  }
});

// ============================================================
// LOADING & INTERACTIVITY
// ============================================================

const state3D = { selectedMesh: null, blinkTween: null }
let interactableMeshes = []

function getDeviceTypeFromMeshName(meshName) {
  for (const type of Object.keys(DEVICE_TEMPLATES)) {
    if (meshName.includes(type)) return type
  }
  return null
}

// ============================================================
// LOAD WAREHOUSE FROM DATABASE
// ============================================================

async function loadWarehouseFromDatabase() {
  CURRENT_WAREHOUSE_ID = localStorage.getItem('currentWarehouseId');
  
  if (!CURRENT_WAREHOUSE_ID) {
    console.warn('⚠️ No warehouse ID found. Please run setup wizard first.');
    return;
  }

  console.log(`📦 Loading warehouse ${CURRENT_WAREHOUSE_ID}...`);

  // Fetch warehouse configuration
  WAREHOUSE_CONFIG = await fetchWarehouse(CURRENT_WAREHOUSE_ID);
  
  if (!WAREHOUSE_CONFIG) {
    console.error('❌ Failed to load warehouse configuration');
    return;
  }

  console.log('✓ Warehouse config loaded:', WAREHOUSE_CONFIG);

  // Apply warehouse configuration
  FLOOR_HEIGHT = WAREHOUSE_CONFIG.floor_height || 6.0;
  
  // Update floor selector
  updateFloorSelector(WAREHOUSE_CONFIG.num_floors);

  // Fetch devices
  const devices = await fetchDevices(CURRENT_WAREHOUSE_ID);
  console.log(`✓ Found ${devices.length} devices in database`);

  // Spawn devices from database
  devices.forEach(device => {
    spawnDeviceFromDatabase(device);
  });

  // Check warranty alerts
  checkWarrantyAlerts(CURRENT_WAREHOUSE_ID);
}

function updateFloorSelector(numFloors) {
  const selector = document.getElementById('floorSelect');
  selector.innerHTML = '';
  
  // Add "All Floors" option
  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = '🏢 All Floors';
  selector.appendChild(allOption);
  
  // Add individual floor options (reverse order - top floor first)
  for (let i = numFloors; i >= 1; i--) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = i === numFloors ? `Level ${i} (Roof)` : `Level ${i}`;
    if (i === 1) option.selected = true;
    selector.appendChild(option);
  }
}

function spawnDeviceFromDatabase(deviceData) {
  const meshIdentifier = deviceData.product.mesh_identifier;
  
  // Check if we have a template mesh to clone
  const templateMesh = interactableMeshes.find(m => m.name.includes(meshIdentifier));
  
  if (!templateMesh) {
    console.warn(`⚠️ No 3D model found for ${meshIdentifier}, will spawn when GLB loads`);
    // Store for later when GLB is loaded
    if (!window.pendingDatabaseDevices) window.pendingDatabaseDevices = [];
    window.pendingDatabaseDevices.push(deviceData);
    return null;
  }

  // Clone the mesh
  const clone = templateMesh.clone();
  clone.position.set(
    deviceData.position_x,
    deviceData.position_y,
    deviceData.position_z
  );
  
  if (deviceData.rotation_y) {
    clone.rotation.y = deviceData.rotation_y * (Math.PI / 180);
  }

  const dbKey = `db_${deviceData.id}`;
  clone.name = dbKey;

  // IMPORTANT: Clone the material and store original
  if (clone.material) {
    const clonedMaterial = clone.material.clone();
    clone.material = clonedMaterial;
    clone.userData.originalMat = clonedMaterial.clone(); // Store a copy for reset
    clone.material.clippingPlanes = [floorPlane];
  }

  // Add to DEVICE_DB
  DEVICE_DB[dbKey] = {
    db_id: deviceData.id,
    name: deviceData.product.name,
    type: deviceData.product.type,
    manufacturer: deviceData.product.manufacturer,
    serial: deviceData.serial_number,
    health: deviceData.health_score,
    lastMaintenance: deviceData.last_maintenance ? new Date(deviceData.last_maintenance).toLocaleDateString() : "N/A",
    location: `Floor ${deviceData.floor_number}`,
    notes: deviceData.notes || deviceData.product.description,
    warrantyExpiry: deviceData.warranty_expiry
  };

  clone.userData.dbKey = dbKey;
  
  interactableMeshes.push(clone);
  scene.add(clone);  // Add to scene

  // Add warranty visual indicator
  addWarrantyIndicator(clone, deviceData.warranty_expiry);

  console.log(`✓ Spawned ${deviceData.product.name} on Floor ${deviceData.floor_number} at (${deviceData.position_x}, ${deviceData.position_y}, ${deviceData.position_z})`);
  
  return clone;
}

function addWarrantyIndicator(mesh, warrantyExpiry) {
  if (!warrantyExpiry) return;
  
  const daysRemaining = Math.floor((new Date(warrantyExpiry) - new Date()) / (1000 * 60 * 60 * 24));
  
  let ringColor = null;
  if (daysRemaining < 0) ringColor = 0xef4444; // Red - Expired
  else if (daysRemaining < 30) ringColor = 0xf59e0b; // Orange - Critical
  else if (daysRemaining < 90) ringColor = 0xeab308; // Yellow - Warning
  
  if (!ringColor) return; // No indicator for healthy devices
  
  const ringGeometry = new THREE.RingGeometry(1.2, 1.4, 32);
  const ringMaterial = new THREE.MeshBasicMaterial({ 
    color: ringColor,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.6
  });
  
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -0.5;
  mesh.add(ring);
  
  // Pulse for critical/expired
  if (daysRemaining < 30) {
    new TWEEN.Tween(ring.scale)
      .to({ x: 1.2, y: 1.2, z: 1.2 }, 1000)
      .yoyo(true)
      .repeat(Infinity)
      .start();
  }
}

// ============================================================
// GLB MODEL LOADING
// ============================================================

const typeCounters = {};
const loader = new GLTFLoader()
loader.load('/Final.glb', gltf => {
    const model = gltf.scene
    scene.add(model)  // Add model to scene - keeps structure intact

    model.traverse(child => {
      if (!child.isMesh) return

      if (child.material) {
        child.material = child.material.clone()
        child.material.clippingPlanes = [floorPlane]
        child.material.clipShadows = true
      }
      
      const type = getDeviceTypeFromMeshName(child.name)
      
      if (type) {
        const dbKey = child.name
        const template = DEVICE_TEMPLATES[type]

        if (!typeCounters[type]) typeCounters[type] = 1;
        const countStr = typeCounters[type].toString().padStart(2, '0');
        const serialNo = `SN-${type.substring(0,3).toUpperCase()}-${countStr}`;
        typeCounters[type]++;

        // Only add to DEVICE_DB if NOT loaded from database
        if (!Object.values(DEVICE_DB).some(d => d.serial === serialNo)) {
          DEVICE_DB[dbKey] = {
            name: template.name,
            type: template.type,
            manufacturer: template.manufacturer,
            serial: serialNo,
            health: Math.floor(Math.random() * 40) + 60,
            lastMaintenance: "2023-09-15",
            location: `Warehouse Floor ${Math.floor(child.position.y / FLOOR_HEIGHT) + 1}`,
            notes: template.notes
          };
        }

        child.userData.dbKey = dbKey;
        child.userData.originalMat = child.material.clone();
        interactableMeshes.push(child);
      }
    })
    
    console.log(`✅ Loaded ${interactableMeshes.length} interactive devices from GLB.`);
    
    // Load warehouse data from database after GLB is loaded
    loadWarehouseFromDatabase();
    
    // Spawn any pending database devices that couldn't be spawned earlier
    if (window.pendingDatabaseDevices) {
      window.pendingDatabaseDevices.forEach(deviceData => {
        spawnDeviceFromDatabase(deviceData);
      });
      window.pendingDatabaseDevices = [];
    }
  }, 
  undefined, 
  err => console.error('❌ GLB load error:', err)
)

// ============================================================
// FOCUS & INTERACTION
// ============================================================

function select3DByKey(dbKey) {
  const mesh = interactableMeshes.find(m => m.userData.dbKey === dbKey)
  if (mesh) select3DMesh(mesh)
}

function select3DMesh(mesh) {
  deselectAll3D(false);
  state3D.selectedMesh = mesh;
  const data = DEVICE_DB[mesh.userData.dbKey];
  
  const h = getHealthInfo(data.health);
  mesh.material.emissive = new THREE.Color(h.three);
  mesh.material.emissiveIntensity = 0.8;

  state3D.blinkTween = new TWEEN.Tween(mesh.material)
    .to({ emissiveIntensity: 1.5 }, 800)
    .yoyo(true).repeat(Infinity).start();

  const box = new THREE.Box3().setFromObject(mesh);
  const center = box.getCenter(new THREE.Vector3());
  
  const floorIndex = Math.floor(center.y / FLOOR_HEIGHT) + 1;
  
  floorPlane.constant = floorIndex * FLOOR_HEIGHT;
  document.getElementById('floorSelect').value = floorIndex;

  const camX = center.x + (center.x > 0 ? -4 : 4); 
  const camZ = center.z + (center.z > 0 ? -4 : 4);
  const camY = (floorIndex - 1) * FLOOR_HEIGHT + 2.5;

  controls.setLookAt(
    camX, camY, camZ, 
    center.x, center.y, center.z, 
    true
  );

  showInfoPanel(mesh.userData.dbKey);
}

function deselectAll3D(shouldResetCamera = false) {
  if (state3D.blinkTween) { state3D.blinkTween.stop(); state3D.blinkTween = null }
  
  if (state3D.selectedMesh) {
    // Safety check: only clone if originalMat exists
    if (state3D.selectedMesh.userData.originalMat) {
      state3D.selectedMesh.material = state3D.selectedMesh.userData.originalMat.clone()
      state3D.selectedMesh.material.clippingPlanes = [floorPlane]
    } else {
      console.warn('⚠️ originalMat not found, skipping material reset');
    }
    state3D.selectedMesh = null
  }

  if (shouldResetCamera) {
    const floorVal = parseInt(document.getElementById('floorSelect').value) || 1
    const baseHeight = (floorVal - 1) * FLOOR_HEIGHT
    const returnY = baseHeight + EYE_LEVEL
    
    floorPlane.constant = 1000;

    controls.setLookAt(
        8, returnY, 8,     
        0, returnY, 0,     
        true
    )
  }
}

// ============================================================
// RAYCASTER & CLICK HANDLING
// ============================================================

const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

window.addEventListener('click', e => {
  if (currentView !== '3d') return
  if (e.clientY < TOPBAR_H || e.clientX < 220) return 
  
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1
  mouse.y = -((e.clientY - TOPBAR_H) / (window.innerHeight - TOPBAR_H)) * 2 + 1
  
  raycaster.setFromCamera(mouse, camera)
  const hits = raycaster.intersectObjects(interactableMeshes)
  
  if (hits.length > 0) {
    select3DMesh(hits[0].object)
  } 
})

function animate() {
  requestAnimationFrame(animate)
  TWEEN.update()        
  const delta = clock.getDelta()
  controls.update(delta)
  renderer.render(scene, camera)
}
animate()

// ============================================================
// DRAG & DROP FROM PALETTE
// ============================================================

const INTERIOR_MAPPING = {
  //"UPS": "Galaxy_VL",
  "Galaxy VL": "Galaxy_VL",
  //"Rack": "NetShelter_SX",
  "NetShelter_SX": "NetShelter",
  //"Switchgear": "Premset_SG",
  "Premset_SG":  "PremSet",
  //"Meter": "PowerLogic_ION",
  "EVlink_Pro": "EVlink_Pro"
}

let draggedType = null

document.querySelectorAll('.drag-item').forEach(item => {
  item.addEventListener('dragstart', (e) => {
    draggedType = e.target.getAttribute('data-type')
    e.dataTransfer.setData('text/plain', draggedType)
  })
})

document.getElementById('bg').addEventListener('dragover', (e) => e.preventDefault()) 

document.getElementById('bg').addEventListener('drop', async (e) => {
  e.preventDefault()
  if (!draggedType) return

  mouse.x = (e.clientX / window.innerWidth) * 2 - 1
  mouse.y = -((e.clientY - TOPBAR_H) / (window.innerHeight - TOPBAR_H)) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  
  const intersects = raycaster.intersectObjects(scene.children, true)
  const hit = intersects.find(i => !interactableMeshes.includes(i.object))

  if (hit) {
    await spawnDeviceAndSave(draggedType, hit.point)
  }
})

// ============================================================
// SPAWN DEVICE AND SAVE TO DATABASE
// ============================================================

async function spawnDeviceAndSave(typeKey, position) {
  const templateMesh = interactableMeshes.find(m => m.name.includes(typeKey))
  
  if (!templateMesh) {
    console.error(`❌ Cannot spawn ${typeKey}: No 3D model found in scene to clone.`)
    return null
  }

  // Find product ID from catalog
  const products = await fetch(`${API_URL}/products/`).then(r => r.json());
  const product = products.find(p => p.mesh_identifier === typeKey);
  
  if (!product) {
    console.error(`❌ Product ${typeKey} not found in catalog`);
    return null;
  }

  const floorNumber = Math.max(1, Math.floor(position.y / FLOOR_HEIGHT) + 1);

  // Create device in database
  const newDevice = await createDevice(
    product.id,
    CURRENT_WAREHOUSE_ID,
    floorNumber,
    position.x,
    position.y,
    position.z
  );

  if (!newDevice) {
    console.error('❌ Failed to create device in database');
    return null;
  }

  // Spawn in 3D scene
  const mesh = spawnDeviceFromDatabase(newDevice);
  
  if (mesh) {
    // Animate spawn
    const startScale = mesh.scale.x;
    mesh.scale.set(0, 0, 0);
    new TWEEN.Tween(mesh.scale)
      .to({x: startScale, y: startScale, z: startScale}, 600)
      .easing(TWEEN.Easing.Back.Out)
      .start();
    
    console.log(`✅ Device spawned and saved: ${newDevice.serial_number}`);
  }
  
  return mesh;
}

// ============================================================
// EXCEL UPLOAD
// ============================================================

document.getElementById('excelUpload').addEventListener('change', handleExcelUpload)

async function handleExcelUpload(e) {
  const file = e.target.files[0]
  if (!file) return
  
  if (!CURRENT_WAREHOUSE_ID) {
    alert('Please complete warehouse setup first');
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${API_URL}/devices/upload-excel/${CURRENT_WAREHOUSE_ID}`, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    
    if (result.success) {
      alert(`✅ Installed ${result.installed_count} devices from Excel.\n\nDevices will appear in 3D view.`);
      
      // Reload devices from database
      const devices = await fetchDevices(CURRENT_WAREHOUSE_ID);
      
      // Clear existing database devices
      Object.keys(DEVICE_DB).forEach(key => {
        if (key.startsWith('db_')) {
          delete DEVICE_DB[key];
        }
      });
      
      // Remove existing meshes
      interactableMeshes = interactableMeshes.filter(m => !m.name.startsWith('db_'));
      
      // Respawn all devices
      devices.forEach(device => spawnDeviceFromDatabase(device));
      
      buildDatasheet(); // Refresh datasheet
    } else {
      alert(`⚠️ Upload completed with errors:\n${result.errors.join('\n')}`);
    }
  } catch (error) {
    console.error('Excel upload error:', error);
    alert('❌ Failed to upload Excel file. Make sure backend is running.');
  }
}

// ============================================================
// NODE NETWORK VIEW
// ============================================================

function renderNetwork() {
  const svg = document.getElementById('network-svg')
  svg.innerHTML = '' 
  const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  txt.setAttribute('x', '50%'); txt.setAttribute('y', '50%'); 
  txt.setAttribute('fill', 'white'); txt.setAttribute('text-anchor', 'middle')
  txt.textContent = `Network View: ${Object.keys(DEVICE_DB).length} Active Nodes`
  svg.appendChild(txt)
}

// ============================================================
// DRAG TO REPOSITION (Save to Database)
// ============================================================

let isDragging = false;
let draggedMesh = null;

// Optional: Add drag controls for repositioning devices
// This is a simplified version - you can enhance with proper drag controls
window.addEventListener('keydown', (e) => {
  if (e.key === 'd' && state3D.selectedMesh) {
    console.log('💾 Drag mode enabled - use arrow keys to move, press S to save');
    isDragging = true;
    draggedMesh = state3D.selectedMesh;
  }
  
  if (isDragging && draggedMesh) {
    const speed = 0.5;
    let moved = false;
    
    if (e.key === 'ArrowLeft') { draggedMesh.position.x -= speed; moved = true; }
    if (e.key === 'ArrowRight') { draggedMesh.position.x += speed; moved = true; }
    if (e.key === 'ArrowUp') { draggedMesh.position.z -= speed; moved = true; }
    if (e.key === 'ArrowDown') { draggedMesh.position.z += speed; moved = true; }
    
    if (e.key === 's' || e.key === 'S') {
      // Save position
      const data = DEVICE_DB[draggedMesh.userData.dbKey];
      if (data && data.db_id) {
        saveDevicePosition(
          data.db_id,
          draggedMesh.position.x,
          draggedMesh.position.y,
          draggedMesh.position.z,
          draggedMesh.rotation.y * (180 / Math.PI)
        );
        alert('✓ Position saved to database');
      }
      isDragging = false;
      draggedMesh = null;
    }
    
    if (moved) {
      console.log(`Position: (${draggedMesh.position.x.toFixed(2)}, ${draggedMesh.position.y.toFixed(2)}, ${draggedMesh.position.z.toFixed(2)})`);
    }
  }
});

// ============================================================
// INITIALIZE
// ============================================================

console.log('🏗️ Digital Twin Warehouse - Database Integration Active');
console.log('📡 API URL:', API_URL);

// ============================================================
// 2D NODE VIEW SYSTEM
// ============================================================

let current2DView = '3d'; // '3d' or 'node'
const nodeCanvas = document.getElementById('network-canvas');
const nodeCtx = nodeCanvas ? nodeCanvas.getContext('2d') : null;

// Node view state
const nodeView = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  hoveredNode: null,
  minScale: 0.3,
  maxScale: 3
};

// Initialize node canvas
function initNodeCanvas() {
  if (!nodeCanvas) return;
  
  // Set canvas size
  nodeCanvas.width = nodeCanvas.clientWidth * window.devicePixelRatio;
  nodeCanvas.height = nodeCanvas.clientHeight * window.devicePixelRatio;
  nodeCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
  
  // Center view
  nodeView.offsetX = nodeCanvas.clientWidth / 2;
  nodeView.offsetY = nodeCanvas.clientHeight / 2;
}

// Toggle between 3D and Node view
document.getElementById('viewToggleBtn')?.addEventListener('click', () => {
  const view3d = document.getElementById('view-3d');
  const viewNetwork = document.getElementById('view-network');
  const viewLabel = document.getElementById('viewLabel');
  const icon3d = document.getElementById('icon-3d');
  const iconNetwork = document.getElementById('icon-network');
  
  if (current2DView === '3d') {
    // Switch to Node View
    view3d.classList.add('hidden');
    viewNetwork.classList.remove('hidden');
    viewLabel.textContent = '3D View';
    icon3d.style.display = 'block';
    iconNetwork.style.display = 'none';
    current2DView = 'node';
    
    // Initialize and render node view
    initNodeCanvas();
    renderNodeView();
  } else {
    // Switch to 3D View
    view3d.classList.remove('hidden');
    viewNetwork.classList.add('hidden');
    viewLabel.textContent = 'Node View';
    icon3d.style.display = 'none';
    iconNetwork.style.display = 'block';
    current2DView = '3d';
  }
});

// Draw a device node
function drawNode(x, y, device, isHovered = false) {
  if (!nodeCtx) return;
  
  const health = device.health || 75;
  let color;
  
  // Health-based colors
  if (health >= 80) {
    color = '#22c55e'; // Green - Healthy
  } else if (health >= 50) {
    color = '#f59e0b'; // Orange - Warning
  } else {
    color = '#ef4444'; // Red - Critical
  }
  
  const nodeSize = isHovered ? 20 : 16;
  
  // Outer glow for hovered
  if (isHovered) {
    nodeCtx.shadowColor = color;
    nodeCtx.shadowBlur = 20;
  }
  
  // Main circle
  nodeCtx.fillStyle = color;
  nodeCtx.beginPath();
  nodeCtx.arc(x, y, nodeSize, 0, Math.PI * 2);
  nodeCtx.fill();
  
  // Inner circle (darker)
  nodeCtx.fillStyle = 'rgba(10, 10, 15, 0.5)';
  nodeCtx.beginPath();
  nodeCtx.arc(x, y, nodeSize - 4, 0, Math.PI * 2);
  nodeCtx.fill();
  
  nodeCtx.shadowBlur = 0;
  
  // Border
  nodeCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  nodeCtx.lineWidth = 2;
  nodeCtx.beginPath();
  nodeCtx.arc(x, y, nodeSize, 0, Math.PI * 2);
  nodeCtx.stroke();
  
  // Health percentage in center
  nodeCtx.fillStyle = '#fff';
  nodeCtx.font = 'bold 10px "Space Mono", monospace';
  nodeCtx.textAlign = 'center';
  nodeCtx.textBaseline = 'middle';
  nodeCtx.fillText(`${Math.round(health)}`, x, y);
  
  // Device name below
  if (isHovered || nodeView.scale > 1) {
    nodeCtx.fillStyle = '#e2e8f0';
    nodeCtx.font = '12px "DM Sans", sans-serif';
    nodeCtx.fillText(device.name || 'Device', x, y + nodeSize + 16);
    
    // Serial number
    nodeCtx.fillStyle = '#64748b';
    nodeCtx.font = '9px "Space Mono", monospace';
    nodeCtx.fillText(device.serial || '', x, y + nodeSize + 30);
  }
}

// Render 2D Node View
function renderNodeView() {
  if (!nodeCanvas || !nodeCtx) return;
  
  const width = nodeCanvas.clientWidth;
  const height = nodeCanvas.clientHeight;
  
  // Clear canvas
  nodeCtx.clearRect(0, 0, width, height);
  
  // Draw grid
  drawGrid();
  
  // Get current floor
  const currentFloor = parseInt(document.getElementById('floorSelect')?.value) || 1;
  
  // Draw floor outline
  const floorWidth = 400;
  const floorHeight = 300;
  
  nodeCtx.save();
  nodeCtx.translate(nodeView.offsetX, nodeView.offsetY);
  nodeCtx.scale(nodeView.scale, nodeView.scale);
  
  // Floor rectangle
  nodeCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  nodeCtx.lineWidth = 2 / nodeView.scale;
  nodeCtx.strokeRect(-floorWidth/2, -floorHeight/2, floorWidth, floorHeight);
  
  // Floor label
  nodeCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  nodeCtx.font = `${14 / nodeView.scale}px "DM Sans", sans-serif`;
  nodeCtx.textAlign = 'left';
  nodeCtx.fillText(`FLOOR ${currentFloor}`, -floorWidth/2 + 10, -floorHeight/2 - 10);
  
  // Draw warehouse outline (front door reference)
  nodeCtx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
  nodeCtx.setLineDash([5, 5]);
  nodeCtx.strokeRect(-floorWidth/2, -floorHeight/2, floorWidth, floorHeight);
  nodeCtx.setLineDash([]);
  
  // Front door indicator
  nodeCtx.fillStyle = '#6366f1';
  nodeCtx.font = `${12 / nodeView.scale}px "DM Sans", sans-serif`;
  nodeCtx.textAlign = 'center';
  nodeCtx.fillText('▼ FRONT DOOR (0,0)', 0, floorHeight/2 + 20);
  
  // Draw devices from DEVICE_DB
  const devices = Object.entries(DEVICE_DB).map(([key, data]) => ({
    key,
    ...data
  }));
  
  // Filter by current floor if applicable
  const currentFloorDevices = devices.filter(d => {
    const dbDevice = interactableMeshes.find(m => m.userData.dbKey === d.key);
    if (!dbDevice) return false;
    const deviceFloor = Math.floor(dbDevice.position.y / FLOOR_HEIGHT) + 1;
    return deviceFloor === currentFloor;
  });
  
  // Draw devices
  currentFloorDevices.forEach(device => {
    const mesh = interactableMeshes.find(m => m.userData.dbKey === device.key);
    if (!mesh) return;
    
    // Convert 3D position to 2D (top-down view)
    const scale2d = 30; // pixels per meter
    const x2d = mesh.position.x * scale2d;
    const z2d = -mesh.position.z * scale2d; // Flip Z for top-down view
    
    const isHovered = nodeView.hoveredNode === device.key;
    drawNode(x2d, z2d, device, isHovered);
  });
  
  nodeCtx.restore();
  
  // Draw info overlay
  if (currentFloorDevices.length > 0) {
    const healthyCount = currentFloorDevices.filter(d => (d.health || 0) >= 80).length;
    const warningCount = currentFloorDevices.filter(d => (d.health || 0) >= 50 && (d.health || 0) < 80).length;
    const criticalCount = currentFloorDevices.filter(d => (d.health || 0) < 50).length;
    
    nodeCtx.fillStyle = 'rgba(10, 10, 10, 0.8)';
    nodeCtx.fillRect(10, 10, 200, 100);
    
    nodeCtx.fillStyle = '#e2e8f0';
    nodeCtx.font = '14px "DM Sans", sans-serif';
    nodeCtx.textAlign = 'left';
    nodeCtx.fillText(`Floor ${currentFloor} Overview`, 20, 30);
    
    nodeCtx.font = '12px "DM Sans", sans-serif';
    nodeCtx.fillStyle = '#22c55e';
    nodeCtx.fillText(`● ${healthyCount} Healthy`, 20, 50);
    nodeCtx.fillStyle = '#f59e0b';
    nodeCtx.fillText(`● ${warningCount} Warning`, 20, 68);
    nodeCtx.fillStyle = '#ef4444';
    nodeCtx.fillText(`● ${criticalCount} Critical`, 20, 86);
  }
}

// Draw grid background
function drawGrid() {
  if (!nodeCtx) return;
  
  const width = nodeCanvas.clientWidth;
  const height = nodeCanvas.clientHeight;
  const gridSize = 50 * nodeView.scale;
  
  nodeCtx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  nodeCtx.lineWidth = 1;
  
  // Vertical lines
  for (let x = nodeView.offsetX % gridSize; x < width; x += gridSize) {
    nodeCtx.beginPath();
    nodeCtx.moveTo(x, 0);
    nodeCtx.lineTo(x, height);
    nodeCtx.stroke();
  }
  
  // Horizontal lines
  for (let y = nodeView.offsetY % gridSize; y < height; y += gridSize) {
    nodeCtx.beginPath();
    nodeCtx.moveTo(0, y);
    nodeCtx.lineTo(width, y);
    nodeCtx.stroke();
  }
}

// Mouse events for node view
if (nodeCanvas) {
  nodeCanvas.addEventListener('mousedown', (e) => {
    if (current2DView !== 'node') return;
    
    nodeView.isDragging = true;
    nodeView.dragStartX = e.clientX - nodeView.offsetX;
    nodeView.dragStartY = e.clientY - nodeView.offsetY;
    nodeCanvas.style.cursor = 'grabbing';
  });
  
  nodeCanvas.addEventListener('mousemove', (e) => {
    if (current2DView !== 'node') return;
    
    if (nodeView.isDragging) {
      nodeView.offsetX = e.clientX - nodeView.dragStartX;
      nodeView.offsetY = e.clientY - nodeView.dragStartY;
      renderNodeView();
    } else {
      // Check for hover
      checkNodeHover(e);
    }
  });
  
  nodeCanvas.addEventListener('mouseup', () => {
    nodeView.isDragging = false;
    nodeCanvas.style.cursor = 'grab';
  });
  
  nodeCanvas.addEventListener('mouseleave', () => {
    nodeView.isDragging = false;
    nodeCanvas.style.cursor = 'grab';
  });
  
  nodeCanvas.addEventListener('wheel', (e) => {
    if (current2DView !== 'node') return;
    
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = nodeView.scale * delta;
    
    if (newScale >= nodeView.minScale && newScale <= nodeView.maxScale) {
      nodeView.scale = newScale;
      renderNodeView();
    }
  });
  
  nodeCanvas.addEventListener('click', (e) => {
    if (current2DView !== 'node') return;
    
    // Check if clicked on a node
    const clickedNode = getNodeAtPosition(e);
    if (clickedNode) {
      showInfoPanel(clickedNode);
    }
  });
}

// Check if mouse is over a node
function checkNodeHover(e) {
  const node = getNodeAtPosition(e);
  if (node !== nodeView.hoveredNode) {
    nodeView.hoveredNode = node;
    renderNodeView();
  }
}

// Get node at mouse position
function getNodeAtPosition(e) {
  const rect = nodeCanvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  // Transform to world coordinates
  const worldX = (mouseX - nodeView.offsetX) / nodeView.scale;
  const worldY = (mouseY - nodeView.offsetY) / nodeView.scale;
  
  const currentFloor = parseInt(document.getElementById('floorSelect')?.value) || 1;
  const scale2d = 30;
  
  // Check each device
  for (const [key, device] of Object.entries(DEVICE_DB)) {
    const mesh = interactableMeshes.find(m => m.userData.dbKey === key);
    if (!mesh) continue;
    
    const deviceFloor = Math.floor(mesh.position.y / FLOOR_HEIGHT) + 1;
    if (deviceFloor !== currentFloor) continue;
    
    const x2d = mesh.position.x * scale2d;
    const z2d = -mesh.position.z * scale2d;
    
    const distance = Math.sqrt((worldX - x2d) ** 2 + (worldY - z2d) ** 2);
    if (distance < 20) {
      return key;
    }
  }
  
  return null;
}

// Re-render node view when floor changes
const originalFloorChangeHandler = document.getElementById('floorSelect')?.onchange;
document.getElementById('floorSelect')?.addEventListener('change', () => {
  if (current2DView === 'node') {
    renderNodeView();
  }
});

// Window resize handler for node canvas
window.addEventListener('resize', () => {
  if (current2DView === 'node') {
    initNodeCanvas();
    renderNodeView();
  }
});

// Initialize node canvas on load
if (nodeCanvas) {
  nodeCanvas.style.cursor = 'grab';
}

console.log('📊 2D Node View System Ready');