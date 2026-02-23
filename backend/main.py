from fastapi import FastAPI, Depends, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
import pandas as pd
import io
import random
import string

from database import engine, get_db, Base
from models import Product, Warehouse, InstalledDevice
import schemas

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Digital Twin Warehouse API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# UTILITY FUNCTIONS
# ============================================================

def generate_serial_number(product_code: str) -> str:
    """Generate unique serial number"""
    prefix = product_code[:3].upper()
    random_part = ''.join(random.choices(string.digits, k=6))
    return f"SN-{prefix}-{random_part}"

def calculate_warranty_expiry(installation_date: datetime, warranty_years: int) -> datetime:
    """Calculate warranty expiration date"""
    return installation_date + timedelta(days=365 * warranty_years)

# ============================================================
# PRODUCT ENDPOINTS
# ============================================================

@app.post("/products/", response_model=schemas.Product)
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db)):
    """Add a new product to the catalog"""
    db_product = Product(**product.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@app.get("/products/", response_model=List[schemas.Product])
def get_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all products from catalog"""
    products = db.query(Product).offset(skip).limit(limit).all()
    return products

@app.get("/products/{product_id}", response_model=schemas.Product)
def get_product(product_id: int, db: Session = Depends(get_db)):
    """Get specific product by ID"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@app.get("/products/code/{product_code}", response_model=schemas.Product)
def get_product_by_code(product_code: str, db: Session = Depends(get_db)):
    """Get product by product code"""
    product = db.query(Product).filter(Product.product_code == product_code).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

# ============================================================
# WAREHOUSE ENDPOINTS
# ============================================================

@app.post("/warehouses/", response_model=schemas.Warehouse)
def create_warehouse(warehouse: schemas.WarehouseCreate, db: Session = Depends(get_db)):
    """Create a new warehouse configuration"""
    db_warehouse = Warehouse(**warehouse.model_dump())
    db.add(db_warehouse)
    db.commit()
    db.refresh(db_warehouse)
    return db_warehouse

@app.get("/warehouses/", response_model=List[schemas.Warehouse])
def get_warehouses(db: Session = Depends(get_db)):
    """Get all warehouses"""
    return db.query(Warehouse).all()

@app.get("/warehouses/{warehouse_id}", response_model=schemas.Warehouse)
def get_warehouse(warehouse_id: int, db: Session = Depends(get_db)):
    """Get specific warehouse"""
    warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return warehouse

@app.put("/warehouses/{warehouse_id}", response_model=schemas.Warehouse)
def update_warehouse(warehouse_id: int, warehouse: schemas.WarehouseUpdate, db: Session = Depends(get_db)):
    """Update warehouse configuration"""
    db_warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not db_warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    for key, value in warehouse.model_dump(exclude_unset=True).items():
        setattr(db_warehouse, key, value)
    
    db.commit()
    db.refresh(db_warehouse)
    return db_warehouse

# ============================================================
# INSTALLED DEVICE ENDPOINTS
# ============================================================

@app.post("/devices/", response_model=schemas.InstalledDevice)
def install_device(device: schemas.InstalledDeviceCreate, db: Session = Depends(get_db)):
    """Install a new device in warehouse"""
    # Verify warehouse exists
    warehouse = db.query(Warehouse).filter(Warehouse.id == device.warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    # Verify product exists
    product = db.query(Product).filter(Product.id == device.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Generate serial number if not provided
    serial_number = device.serial_number or generate_serial_number(product.product_code)
    
    # Calculate warranty expiry
    installation_date = datetime.utcnow()
    warranty_expiry = calculate_warranty_expiry(installation_date, product.warranty_years)
    
    # Create device
    db_device = InstalledDevice(
        **device.model_dump(exclude={'serial_number'}),
        serial_number=serial_number,
        installation_date=installation_date,
        warranty_expiry=warranty_expiry,
        health_score=100,
        status="Healthy"
    )
    
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device

@app.get("/devices/warehouse/{warehouse_id}", response_model=List[schemas.InstalledDevice])
def get_warehouse_devices(warehouse_id: int, db: Session = Depends(get_db)):
    """Get all devices in a warehouse"""
    devices = db.query(InstalledDevice).filter(
        InstalledDevice.warehouse_id == warehouse_id,
        InstalledDevice.is_active == True
    ).all()
    return devices

@app.get("/devices/{device_id}", response_model=schemas.InstalledDevice)
def get_device(device_id: int, db: Session = Depends(get_db)):
    """Get specific device"""
    device = db.query(InstalledDevice).filter(InstalledDevice.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device

@app.put("/devices/{device_id}", response_model=schemas.InstalledDevice)
def update_device(device_id: int, device: schemas.InstalledDeviceUpdate, db: Session = Depends(get_db)):
    """Update device position, health, etc."""
    db_device = db.query(InstalledDevice).filter(InstalledDevice.id == device_id).first()
    if not db_device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    for key, value in device.model_dump(exclude_unset=True).items():
        setattr(db_device, key, value)
    
    db.commit()
    db.refresh(db_device)
    return db_device

@app.delete("/devices/{device_id}")
def delete_device(device_id: int, db: Session = Depends(get_db)):
    """Remove device from warehouse"""
    device = db.query(InstalledDevice).filter(InstalledDevice.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    device.is_active = False
    db.commit()
    return {"message": "Device removed successfully"}

# ============================================================
# EXCEL UPLOAD ENDPOINT
# ============================================================

@app.post("/devices/upload-excel/{warehouse_id}")
async def upload_excel_plan(
    warehouse_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload Excel file with device installation plan"""
    # Verify warehouse exists
    warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    # Read Excel file
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading Excel file: {str(e)}")
    
    installed_devices = []
    errors = []
    
    # Process each row
    for idx, row in df.iterrows():
        try:
            # Map component name to product
            component_name = row.get("Component Name") or row.get("ComponentName")
            if not component_name:
                errors.append(f"Row {idx + 2}: Missing component name")
                continue
            
            # Find product by name (fuzzy matching)
            product = db.query(Product).filter(
                Product.name.ilike(f"%{component_name}%")
            ).first()
            
            if not product:
                errors.append(f"Row {idx + 2}: Product '{component_name}' not found in catalog")
                continue
            
            # Get quantity (default 1)
            quantity = int(row.get("Quantity", 1))
            floor_number = int(row.get("Floor Number", 1))
            
            # Get optional coordinates (relative to front door at 0,0,0)
            pos_x = row.get("Position X")
            pos_y = row.get("Position Y") 
            pos_z = row.get("Position Z")
            
            # Convert to float if provided, otherwise None
            coord_x = float(pos_x) if pd.notna(pos_x) else None
            coord_y = float(pos_y) if pd.notna(pos_y) else None
            coord_z = float(pos_z) if pd.notna(pos_z) else None
            
            # Install multiple devices if quantity > 1
            for q in range(quantity):
                serial = row.get("Serial")
                if serial and quantity > 1:
                    serial = f"{serial}-{q + 1}"
                
                # If coordinates provided, use them; otherwise use default (0, floor_height, 0)
                if coord_x is not None and coord_z is not None:
                    # Use provided coordinates
                    device_x = coord_x
                    device_z = coord_z
                    # If Y not provided, calculate from floor
                    device_y = coord_y if coord_y is not None else (floor_number - 1) * warehouse.floor_height
                else:
                    # No coordinates - place at origin for manual positioning
                    device_x = 0.0
                    device_y = (floor_number - 1) * warehouse.floor_height
                    device_z = 0.0
                health_val = int(row.get("Health Score", 100))
                device = InstalledDevice(
                    warehouse_id=warehouse_id,
                    product_id=product.id,
                    serial_number=serial or generate_serial_number(product.product_code),
                    floor_number=floor_number,
                    position_x=device_x,
                    position_y=device_y,
                    position_z=device_z,
                    installation_date=datetime.utcnow(),
                    warranty_expiry=calculate_warranty_expiry(datetime.utcnow(), product.warranty_years),
                    health_score=health_val,
                    status="Healthy" if health_val >= 80 else "Warning" if health_val >= 50 else "Critical",
                    notes=row.get("Notes", "Imported from Excel")
                )
                db.add(device)
                installed_devices.append(device)
        
        except Exception as e:
            errors.append(f"Row {idx + 2}: {str(e)}")
    
    db.commit()
    
    return {
        "success": True,
        "installed_count": len(installed_devices),
        "errors": errors,
        "devices": [d.serial_number for d in installed_devices]
    }

# ============================================================
# WARRANTY MONITORING
# ============================================================

@app.get("/devices/warranty-alerts/{warehouse_id}", response_model=List[schemas.WarrantyAlert])
def get_warranty_alerts(warehouse_id: int, days_threshold: int = 90, db: Session = Depends(get_db)):
    """Get devices with expiring warranties"""
    today = datetime.utcnow()
    threshold_date = today + timedelta(days=days_threshold)
    
    devices = db.query(InstalledDevice).filter(
        InstalledDevice.warehouse_id == warehouse_id,
        InstalledDevice.is_active == True,
        InstalledDevice.warranty_expiry <= threshold_date
    ).all()
    
    alerts = []
    for device in devices:
        days_remaining = (device.warranty_expiry - today).days
        
        if days_remaining < 0:
            status = "expired"
        elif days_remaining < 30:
            status = "critical"
        else:
            status = "expiring_soon"
        
        alerts.append(schemas.WarrantyAlert(
            device_id=device.id,
            serial_number=device.serial_number,
            product_name=device.product.name,
            warranty_expiry=device.warranty_expiry,
            days_remaining=days_remaining,
            status=status
        ))
    
    return alerts

# ============================================================
# SEED DATA ENDPOINT (For Testing)
# ============================================================

@app.post("/seed-data/")
def seed_demo_data(db: Session = Depends(get_db)):
    """Populate database with Schneider Electric products"""
    
    products_data = [
        {
            "product_code": "GALAXY_VL_500",
            "name": "Galaxy VL UPS",
            "type": "Uninterruptible Power Supply",
            "category": "Power Protection",
            "model_number": "Galaxy VL 500",
            "power_rating": 500.0,
            "voltage": "400V",
            "dimensions": {"width": 600, "height": 2000, "depth": 1000},
            "weight": 850.0,
            "mesh_identifier": "Galaxy_VL",
            "model_file": "/models/galaxy_vl.glb",
            "warranty_years": 3,
            "price": 125000.0,
            "description": "High-efficiency scalable 3-phase UPS for critical applications"
        },
        {
            "product_code": "NETSHELTER_SX_AR3100",
            "name": "NetShelter SX Rack",
            "type": "Server Rack Enclosure",
            "category": "Infrastructure",
            "model_number": "AR3100",
            "dimensions": {"width": 600, "height": 2000, "depth": 1070},
            "weight": 125.0,
            "mesh_identifier": "NetShelter_SX",
            "model_file": "/models/netshelter.glb",
            "warranty_years": 2,
            "price": 2500.0,
            "description": "Standard enclosure for low to medium density applications"
        },
        {
            "product_code": "PREMSET_15KV",
            "name": "Premset Switchgear",
            "type": "MV Switchgear",
            "category": "Power Distribution",
            "model_number": "Premset 15kV",
            "voltage": "15kV",
            "dimensions": {"width": 800, "height": 2200, "depth": 1500},
            "weight": 1200.0,
            "mesh_identifier": "Premset_SG",
            "model_file": "/models/premset.glb",
            "warranty_years": 5,
            "price": 85000.0,
            "description": "Shielded Solid Insulation System (2SIS) switchgear"
        },
        {
            "product_code": "ION9000",
            "name": "PowerLogic ION9000",
            "type": "Power Quality Meter",
            "category": "Monitoring",
            "model_number": "ION9000",
            "dimensions": {"width": 200, "height": 300, "depth": 150},
            "weight": 5.0,
            "mesh_identifier": "PowerLogic_ION",
            "model_file": "/models/ion9000.glb",
            "warranty_years": 2,
            "price": 3500.0,
            "description": "Class 0.1S accuracy power quality analyzer"
        },
        {
            "product_code": "EVLINK_PRO_AC",
            "name": "EVlink Pro AC",
            "type": "EV Charging Station",
            "category": "E-Mobility",
            "model_number": "EVlink Pro",
            "power_rating": 22.0,
            "voltage": "400V",
            "dimensions": {"width": 400, "height": 1200, "depth": 200},
            "weight": 35.0,
            "mesh_identifier": "EVlink_Pro",
            "model_file": "/models/evlink.glb",
            "warranty_years": 3,
            "price": 4200.0,
            "description": "Smart charging for fleets and commercial buildings"
        },
        {
            "product_code": "CONEXT_CL",
            "name": "EcoStruxure Solar",
            "type": "Solar Inverter",
            "category": "Renewable Energy",
            "model_number": "Conext CL",
            "power_rating": 100.0,
            "dimensions": {"width": 600, "height": 800, "depth": 300},
            "weight": 65.0,
            "mesh_identifier": "Roof_Solar_Array",
            "model_file": "/models/solar.glb",
            "warranty_years": 10,
            "price": 8500.0,
            "description": "Rooftop photovoltaic inverter system"
        }
    ]
    
    created_products = []
    for product_data in products_data:
        # Check if already exists
        existing = db.query(Product).filter(Product.product_code == product_data["product_code"]).first()
        if not existing:
            product = Product(**product_data)
            db.add(product)
            created_products.append(product_data["product_code"])
    
    db.commit()
    
    return {
        "message": "Demo data seeded successfully",
        "products_created": len(created_products),
        "product_codes": created_products
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)