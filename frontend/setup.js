const API_URL = 'http://localhost:8000';

let currentStep = 1;
let warehouseConfig = {
  name: '',
  customerName: '',
  location: '',
  numFloors: 1,
  uploadMethod: null,
  excelFile: null,
  deviceCount: 0
};

// ============================================================
// STEP NAVIGATION
// ============================================================

function nextStep() {
  if (currentStep === 1) {
    if (!validateStep1()) return;
  }
  
  if (currentStep === 2) {
    if (!validateStep2()) return;
  }
  
  if (currentStep < 3) {
    currentStep++;
    updateStepDisplay();
  }
  
  if (currentStep === 3) {
    updateSummary();
  }
}

function prevStep() {
  if (currentStep > 1) {
    currentStep--;
    updateStepDisplay();
  }
}

function updateStepDisplay() {
  // Hide all steps
  document.querySelectorAll('.step').forEach(step => step.classList.remove('active'));
  
  // Show current step
  document.getElementById(`step${currentStep}`).classList.add('active');
  
  // Update progress dots
  document.querySelectorAll('.dot').forEach((dot, idx) => {
    dot.classList.toggle('active', idx + 1 === currentStep);
  });
}

// ============================================================
// STEP 1: VALIDATION
// ============================================================

function validateStep1() {
  const name = document.getElementById('warehouseName').value.trim();
  
  if (!name) {
    alert('Please enter a warehouse name');
    return false;
  }
  
  warehouseConfig.name = name;
  warehouseConfig.customerName = document.getElementById('customerName').value.trim();
  warehouseConfig.location = document.getElementById('location').value.trim();
  
  return true;
}

// Floor selector
document.querySelectorAll('.floor-option').forEach(option => {
  option.addEventListener('click', function() {
    document.querySelectorAll('.floor-option').forEach(o => o.classList.remove('selected'));
    this.classList.add('selected');
    warehouseConfig.numFloors = parseInt(this.dataset.floors);
  });
});

// ============================================================
// STEP 2: DEVICE PLANNING
// ============================================================

function selectUploadMethod(method) {
  warehouseConfig.uploadMethod = method;
  
  if (method === 'excel') {
    document.getElementById('excelUploadSection').style.display = 'block';
  } else {
    document.getElementById('excelUploadSection').style.display = 'none';
  }
}

function validateStep2() {
  if (!warehouseConfig.uploadMethod) {
    alert('Please select a device planning method');
    return false;
  }
  
  return true;
}

// Excel Upload Handlers
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('excelFile');

uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('dragover');
  
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleFileSelect(files[0]);
  }
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    handleFileSelect(e.target.files[0]);
  }
});

function handleFileSelect(file) {
  if (!file.name.match(/\.(xlsx|xls)$/)) {
    alert('Please select an Excel file (.xlsx or .xls)');
    return;
  }
  
  warehouseConfig.excelFile = file;
  
  // Show file info
  document.getElementById('fileName').textContent = file.name;
  document.getElementById('fileSize').textContent = formatFileSize(file.size);
  document.getElementById('fileInfo').classList.add('show');
  
  // Parse and show device count
  parseExcelFile(file);
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function parseExcelFile(file) {
  // In production, you'd parse this with SheetJS
  // For now, we'll simulate device detection
  
  // Simulate parsing delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Mock data
  const deviceCount = Math.floor(Math.random() * 20) + 10;
  const deviceTypes = Math.floor(Math.random() * 5) + 3;
  
  warehouseConfig.deviceCount = deviceCount;
  
  document.getElementById('deviceTotal').textContent = deviceCount;
  document.getElementById('deviceTypes').textContent = deviceTypes;
  document.getElementById('deviceCount').style.display = 'grid';
}

// ============================================================
// STEP 3: SUMMARY
// ============================================================

function updateSummary() {
  document.getElementById('summaryName').textContent = warehouseConfig.name;
  document.getElementById('summaryLocation').textContent = warehouseConfig.location || 'Not specified';
  document.getElementById('summaryFloors').textContent = warehouseConfig.numFloors;
  document.getElementById('summaryMethod').textContent = 
    warehouseConfig.uploadMethod === 'excel' ? 'Excel Upload' : 'Manual Placement';
  
  if (warehouseConfig.uploadMethod === 'excel' && warehouseConfig.excelFile) {
    document.getElementById('summaryDevices').textContent = warehouseConfig.deviceCount;
    document.getElementById('summaryCounts').style.display = 'block';
  }
}

// ============================================================
// WAREHOUSE CREATION
// ============================================================

async function createWarehouse() {
  const btn = event.target;
  btn.disabled = true;
  btn.textContent = '🔄 Creating warehouse...';
  
  try {
    // 1. Create warehouse in database
    const warehouseData = {
      name: warehouseConfig.name,
      customer_name: warehouseConfig.customerName,
      location: warehouseConfig.location,
      num_floors: warehouseConfig.numFloors,
      floor_height: 6.0,
      model_file: '/models/Changes.glb'
    };
    
    const response = await fetch(`${API_URL}/warehouses/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(warehouseData)
    });
    
    if (!response.ok) {
      throw new Error('Failed to create warehouse');
    }
    
    const warehouse = await response.json();
    
    // 2. If Excel upload, process the file
    if (warehouseConfig.uploadMethod === 'excel' && warehouseConfig.excelFile) {
      btn.textContent = '📊 Processing Excel file...';
      
      const formData = new FormData();
      formData.append('file', warehouseConfig.excelFile);
      
      const uploadResponse = await fetch(`${API_URL}/devices/upload-excel/${warehouse.id}`, {
        method: 'POST',
        body: formData
      });
      
      if (!uploadResponse.ok) {
        console.error('Excel upload failed, but warehouse was created');
      }
    }
    
    // 3. Store warehouse ID and redirect
    localStorage.setItem('currentWarehouseId', warehouse.id);
    localStorage.setItem('warehouseConfig', JSON.stringify(warehouseConfig));
    
    btn.textContent = '✓ Launching Digital Twin...';
    
    setTimeout(() => {
      window.location.href = 'warehouse.html';
    }, 1000);
    
  } catch (error) {
    console.error('Error creating warehouse:', error);
    alert('Failed to create warehouse. Please try again.');
    btn.disabled = false;
    btn.textContent = '🚀 Launch Digital Twin';
  }
}

// ============================================================
// INITIALIZE
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  // Check if backend is running
  checkBackendConnection();
  
  // Seed demo data on first load
  seedDemoData();
});

async function checkBackendConnection() {
  try {
    const response = await fetch(`${API_URL}/products/`, { method: 'HEAD' });
    console.log('✓ Backend connected');
  } catch (error) {
    console.warn('⚠ Backend not reachable. Make sure the API is running on port 8000');
  }
}

async function seedDemoData() {
  try {
    await fetch(`${API_URL}/seed-data/`, { method: 'POST' });
    console.log('✓ Demo product catalog loaded');
  } catch (error) {
    console.log('Demo data already seeded or backend unavailable');
  }
}