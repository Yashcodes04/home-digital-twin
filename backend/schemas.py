from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from datetime import datetime

# ============================================================
# PRODUCT SCHEMAS
# ============================================================

class ProductBase(BaseModel):
    product_code: str
    name: str
    type: str
    manufacturer: str = "Schneider Electric"
    model_number: Optional[str] = None
    category: Optional[str] = None
    power_rating: Optional[float] = None
    voltage: Optional[str] = None
    dimensions: Optional[Dict] = None
    weight: Optional[float] = None
    model_file: Optional[str] = None
    mesh_identifier: Optional[str] = None
    warranty_years: int = 3
    price: Optional[float] = None
    description: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# ============================================================
# WAREHOUSE SCHEMAS
# ============================================================

class WarehouseBase(BaseModel):
    name: str
    customer_name: Optional[str] = None
    location: Optional[str] = None
    num_floors: int = 1
    floor_height: float = 6.0
    total_area: Optional[float] = None
    model_file: Optional[str] = None

class WarehouseCreate(WarehouseBase):
    pass

class WarehouseUpdate(BaseModel):
    name: Optional[str] = None
    num_floors: Optional[int] = None
    floor_height: Optional[float] = None

class Warehouse(WarehouseBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# ============================================================
# INSTALLED DEVICE SCHEMAS
# ============================================================

class InstalledDeviceBase(BaseModel):
    product_id: int
    floor_number: int = 1
    position_x: float = 0
    position_y: float = 0
    position_z: float = 0
    rotation_y: float = 0
    notes: Optional[str] = None

class InstalledDeviceCreate(InstalledDeviceBase):
    warehouse_id: int
    serial_number: Optional[str] = None  # Auto-generated if not provided

class InstalledDeviceUpdate(BaseModel):
    floor_number: Optional[int] = None
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    position_z: Optional[float] = None
    rotation_y: Optional[float] = None
    health_score: Optional[int] = None
    status: Optional[str] = None
    last_maintenance: Optional[datetime] = None
    notes: Optional[str] = None

class InstalledDevice(InstalledDeviceBase):
    id: int
    warehouse_id: int
    serial_number: str
    installation_date: datetime
    warranty_expiry: Optional[datetime]
    health_score: int
    status: str
    last_maintenance: Optional[datetime]
    next_maintenance: Optional[datetime]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    # Include product details
    product: Product
    
    class Config:
        from_attributes = True

# ============================================================
# EXCEL UPLOAD SCHEMA
# ============================================================

class ExcelDeviceRow(BaseModel):
    """Schema for parsing Excel rows"""
    ComponentName: str = Field(alias="Component Name")  # Handle spaces in Excel headers
    DeviceType: Optional[str] = Field(None, alias="Device Type")
    ModelNumber: Optional[str] = Field(None, alias="Model Number")
    Quantity: int = 1
    FloorNumber: int = Field(1, alias="Floor Number")
    Serial: Optional[str] = None
    InstallDate: Optional[str] = Field(None, alias="Install Date")
    Notes: Optional[str] = None
    
    class Config:
        populate_by_name = True

# ============================================================
# WARRANTY NOTIFICATION SCHEMA
# ============================================================

class WarrantyAlert(BaseModel):
    device_id: int
    serial_number: str
    product_name: str
    warranty_expiry: datetime
    days_remaining: int
    status: str  # "expiring_soon", "expired", "critical"