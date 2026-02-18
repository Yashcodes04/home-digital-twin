// ============================================================
// WARRANTY NOTIFICATION SYSTEM
// Integration guide for frontend
// ============================================================

const API_URL = 'http://localhost:8000';

// ============================================================
// 1. FETCH WARRANTY ALERTS
// ============================================================

async function checkWarrantyAlerts(warehouseId) {
  try {
    // Get devices expiring in next 90 days
    const response = await fetch(
      `${API_URL}/devices/warranty-alerts/${warehouseId}?days_threshold=90`
    );
    
    const alerts = await response.json();
    
    // Categorize alerts
    const categorized = {
      expired: alerts.filter(a => a.status === 'expired'),
      critical: alerts.filter(a => a.status === 'critical'),  // < 30 days
      expiring_soon: alerts.filter(a => a.status === 'expiring_soon')  // 30-90 days
    };
    
    return categorized;
  } catch (error) {
    console.error('Failed to fetch warranty alerts:', error);
    return null;
  }
}

// ============================================================
// 2. DISPLAY NOTIFICATION BANNER
// ============================================================

function showWarrantyBanner(alerts) {
  const totalAlerts = alerts.expired.length + alerts.critical.length + alerts.expiring_soon.length;
  
  if (totalAlerts === 0) return;
  
  const banner = document.createElement('div');
  banner.className = 'warranty-banner';
  banner.innerHTML = `
    <div class="banner-content">
      <div class="banner-icon">⚠️</div>
      <div class="banner-text">
        <strong>${totalAlerts} Warranty Alert${totalAlerts > 1 ? 's' : ''}</strong>
        <div class="banner-details">
          ${alerts.expired.length > 0 ? `${alerts.expired.length} expired` : ''}
          ${alerts.critical.length > 0 ? `${alerts.critical.length} critical` : ''}
          ${alerts.expiring_soon.length > 0 ? `${alerts.expiring_soon.length} expiring soon` : ''}
        </div>
      </div>
      <button class="banner-btn" onclick="openWarrantyPanel()">View Details</button>
    </div>
  `;
  
  document.getElementById('topbar').after(banner);
}

// CSS for banner
const bannerStyles = `
.warranty-banner {
  position: fixed;
  top: 60px;
  left: 0;
  right: 0;
  background: linear-gradient(135deg, rgba(239,68,68,0.9) 0%, rgba(245,158,11,0.9) 100%);
  color: white;
  padding: 12px 20px;
  z-index: 19;
  animation: slideDown 0.4s ease;
}

@keyframes slideDown {
  from { transform: translateY(-100%); }
  to { transform: translateY(0); }
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 1200px;
  margin: 0 auto;
}

.banner-icon {
  font-size: 1.5rem;
}

.banner-text {
  flex: 1;
}

.banner-details {
  font-size: 0.85rem;
  opacity: 0.9;
  margin-top: 2px;
}

.banner-btn {
  background: white;
  color: #ef4444;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.banner-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}
`;

// ============================================================
// 3. WARRANTY PANEL (Detailed View)
// ============================================================

function openWarrantyPanel() {
  const warehouseId = localStorage.getItem('currentWarehouseId');
  
  checkWarrantyAlerts(warehouseId).then(alerts => {
    const panel = createWarrantyPanel(alerts);
    document.body.appendChild(panel);
  });
}

function createWarrantyPanel(alerts) {
  const allAlerts = [...alerts.expired, ...alerts.critical, ...alerts.expiring_soon];
  
  const panel = document.createElement('div');
  panel.className = 'warranty-panel-overlay';
  panel.innerHTML = `
    <div class="warranty-panel">
      <div class="panel-header">
        <h2>⚠️ Warranty Monitoring</h2>
        <button class="close-btn" onclick="this.closest('.warranty-panel-overlay').remove()">✕</button>
      </div>
      
      <div class="panel-stats">
        <div class="stat-card expired">
          <div class="stat-number">${alerts.expired.length}</div>
          <div class="stat-label">Expired</div>
        </div>
        <div class="stat-card critical">
          <div class="stat-number">${alerts.critical.length}</div>
          <div class="stat-label">Critical (< 30 days)</div>
        </div>
        <div class="stat-card warning">
          <div class="stat-number">${alerts.expiring_soon.length}</div>
          <div class="stat-label">Expiring Soon</div>
        </div>
      </div>
      
      <div class="panel-list">
        ${allAlerts.map(alert => `
          <div class="alert-item ${alert.status}">
            <div class="alert-icon">${getStatusIcon(alert.status)}</div>
            <div class="alert-details">
              <div class="alert-product">${alert.product_name}</div>
              <div class="alert-serial">${alert.serial_number}</div>
            </div>
            <div class="alert-expiry">
              <div class="expiry-date">${formatDate(alert.warranty_expiry)}</div>
              <div class="expiry-days ${alert.days_remaining < 0 ? 'negative' : ''}">
                ${alert.days_remaining < 0 ? 'Expired' : `${alert.days_remaining} days left`}
              </div>
            </div>
            <button class="action-btn" onclick="focusOnDevice(${alert.device_id})">
              Locate in 3D
            </button>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  
  return panel;
}

function getStatusIcon(status) {
  const icons = {
    expired: '🔴',
    critical: '🟠',
    expiring_soon: '🟡'
  };
  return icons[status] || '⚪';
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

// ============================================================
// 4. VISUAL INDICATORS IN 3D VIEW
// ============================================================

function applyWarrantyIndicators(mesh, device) {
  const daysRemaining = (new Date(device.warranty_expiry) - new Date()) / (1000 * 60 * 60 * 24);
  
  // Add warranty status ring around device
  const ringGeometry = new THREE.RingGeometry(1.2, 1.4, 32);
  const ringMaterial = new THREE.MeshBasicMaterial({ 
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.6
  });
  
  if (daysRemaining < 0) {
    ringMaterial.color.setHex(0xef4444); // Red - Expired
  } else if (daysRemaining < 30) {
    ringMaterial.color.setHex(0xf59e0b); // Orange - Critical
  } else if (daysRemaining < 90) {
    ringMaterial.color.setHex(0xeab308); // Yellow - Warning
  } else {
    return; // No indicator for healthy devices
  }
  
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -0.5;
  mesh.add(ring);
  
  // Pulse animation for critical/expired
  if (daysRemaining < 30) {
    new TWEEN.Tween(ring.scale)
      .to({ x: 1.2, y: 1.2, z: 1.2 }, 1000)
      .yoyo(true)
      .repeat(Infinity)
      .start();
  }
}

// ============================================================
// 5. INFO PANEL ENHANCEMENT (Show warranty in device details)
// ============================================================

function showDeviceInfoWithWarranty(device) {
  const daysRemaining = Math.floor(
    (new Date(device.warranty_expiry) - new Date()) / (1000 * 60 * 60 * 24)
  );
  
  const warrantyStatus = getWarrantyStatus(daysRemaining);
  
  // Add warranty section to info panel
  const warrantyHTML = `
    <div class="warranty-section">
      <div class="section-title">Warranty Status</div>
      <div class="warranty-bar" style="background: ${warrantyStatus.color}20;">
        <div class="warranty-fill" style="width: ${warrantyStatus.percentage}%; background: ${warrantyStatus.color};"></div>
      </div>
      <div class="warranty-info">
        <span class="warranty-label">Expires:</span>
        <span class="warranty-date">${formatDate(device.warranty_expiry)}</span>
      </div>
      <div class="warranty-info">
        <span class="warranty-label">Remaining:</span>
        <span class="warranty-days" style="color: ${warrantyStatus.color};">
          ${daysRemaining < 0 ? 'EXPIRED' : `${daysRemaining} days`}
        </span>
      </div>
      ${daysRemaining < 30 && daysRemaining >= 0 ? `
        <button class="renew-btn" onclick="initiateWarrantyRenewal(${device.id})">
          🔄 Renew Warranty
        </button>
      ` : ''}
    </div>
  `;
  
  // Append to info panel
  document.querySelector('#infoPanel .data-grid').insertAdjacentHTML('beforeend', warrantyHTML);
}

function getWarrantyStatus(daysRemaining) {
  if (daysRemaining < 0) {
    return { color: '#ef4444', percentage: 0, status: 'expired' };
  }
  
  if (daysRemaining < 30) {
    return { 
      color: '#f59e0b', 
      percentage: (daysRemaining / 30) * 100, 
      status: 'critical' 
    };
  }
  
  if (daysRemaining < 90) {
    return { 
      color: '#eab308', 
      percentage: (daysRemaining / 90) * 100, 
      status: 'warning' 
    };
  }
  
  // Assume 3 year warranty (1095 days)
  return { 
    color: '#22c55e', 
    percentage: (daysRemaining / 1095) * 100, 
    status: 'healthy' 
  };
}

// ============================================================
// 6. AUTOMATIC CHECK ON PAGE LOAD
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  const warehouseId = localStorage.getItem('currentWarehouseId');
  
  if (warehouseId) {
    // Check warranty alerts
    const alerts = await checkWarrantyAlerts(warehouseId);
    
    if (alerts) {
      const totalAlerts = alerts.expired.length + alerts.critical.length;
      
      if (totalAlerts > 0) {
        showWarrantyBanner(alerts);
      }
    }
    
    // Set up periodic checks (every hour)
    setInterval(() => checkWarrantyAlerts(warehouseId), 60 * 60 * 1000);
  }
});

// ============================================================
// 7. EMAIL NOTIFICATION TRIGGER (Backend Integration)
// ============================================================

async function sendWarrantyNotification(deviceId) {
  try {
    await fetch(`${API_URL}/notifications/warranty/${deviceId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notification_type: 'warranty_expiry',
        recipients: ['facility.manager@company.com']
      })
    });
    
    console.log('Warranty notification sent');
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}

// ============================================================
// EXAMPLE USAGE
// ============================================================

/*
// On page load
checkWarrantyAlerts(1).then(alerts => {
  console.log('Expired devices:', alerts.expired);
  console.log('Critical devices:', alerts.critical);
  console.log('Expiring soon:', alerts.expiring_soon);
  
  if (alerts.expired.length + alerts.critical.length > 0) {
    showWarrantyBanner(alerts);
  }
});

// When loading devices in 3D
devices.forEach(device => {
  const mesh = spawnDevice(device);
  applyWarrantyIndicators(mesh, device);
});

// When clicking on a device
showDeviceInfoWithWarranty(selectedDevice);
*/