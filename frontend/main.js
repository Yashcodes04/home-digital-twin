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
  "NetShelter_SX": {
    name: "NetShelter SX Rack",
    type: "Server Rack Enclosure",
    manufacturer: "APC by Schneider",
    model: "AR3100",
    notes: "Standard enclosure for low to medium density."
  },
  "Premset_SG": {
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

  // Add warranty information if available
  if (data.warrantyExpiry) {
    const daysRemaining = Math.floor((new Date(data.warrantyExpiry) - new Date()) / (1000 * 60 * 60 * 24));
    const warrantyStatus = getWarrantyStatus(daysRemaining);
    
    const warrantySection = document.getElementById('warrantySection');
    if (warrantySection) {
      warrantySection.innerHTML = `
        <div class="label">Warranty Status</div>
        <div style="margin-top: 8px; padding: 10px; background: ${warrantyStatus.color}20; border-radius: 6px; border: 1px solid ${warrantyStatus.color}40;">
          <div style="font-size: 0.85rem; color: var(--muted);">Expires: ${new Date(data.warrantyExpiry).toLocaleDateString()}</div>
          <div style="font-size: 1.1rem; font-weight: 600; color: ${warrantyStatus.color}; margin-top: 4px;">
            ${daysRemaining < 0 ? '⚠️ EXPIRED' : `${daysRemaining} days remaining`}
          </div>
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
// FLOOR NAVIGATION (INSIDE VIEW)
// ============================================================

let FLOOR_HEIGHT = 6.0;  
const EYE_LEVEL = 2.0;

document.getElementById('floorSelect').addEventListener('change', (e) => {
  const floorNum = parseInt(e.target.value); 
  
  if (!floorNum) return;

  const baseHeight = (floorNum - 1) * FLOOR_HEIGHT;
  const targetY    = baseHeight + EYE_LEVEL;

  console.log(`🚀 Moving inside Floor ${floorNum} (Y=${targetY})`);

  if (floorPlane) floorPlane.constant = 1000;

  controls.setLookAt(
    8, targetY, 8,     
    0, targetY, 0,     
    true               
  );
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
  clone.userData.originalMat = clone.material.clone();
  clone.material.clippingPlanes = [floorPlane];
  
  interactableMeshes.push(clone);
  scene.add(clone);

  // Add warranty visual indicator
  addWarrantyIndicator(clone, deviceData.warranty_expiry);

  console.log(`✓ Spawned ${deviceData.product.name} at (${deviceData.position_x}, ${deviceData.position_y}, ${deviceData.position_z})`);
  
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
loader.load('/Changes.glb', gltf => {
    const model = gltf.scene
    scene.add(model)

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
    state3D.selectedMesh.material = state3D.selectedMesh.userData.originalMat.clone()
    state3D.selectedMesh.material.clippingPlanes = [floorPlane]
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
  "UPS": "Galaxy_VL",
  "Galaxy VL": "Galaxy_VL",
  "Rack": "NetShelter_SX",
  "NetShelter": "NetShelter_SX",
  "Switchgear": "Premset_SG",
  "Premset": "Premset_SG",
  "Meter": "PowerLogic_ION",
  "EV Charger": "EVlink_Pro"
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