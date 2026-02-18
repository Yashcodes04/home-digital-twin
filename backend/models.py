from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Product(Base):
    """Master catalog of Schneider Electric products"""
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    product_code = Column(String, unique=True, index=True)  # e.g., "GALAXY_VL_500"
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # UPS, Rack, Switchgear, etc.
    manufacturer = Column(String, default="Schneider Electric")
    model_number = Column(String)
    category = Column(String)  # Power, Cooling, Monitoring, etc.
    
    # Technical specs
    power_rating = Column(Float)  # kW or kVA
    voltage = Column(String)
    dimensions = Column(JSON)  # {"width": 600, "height": 2000, "depth": 800}
    weight = Column(Float)  # kg
    
    # 3D Model reference
    model_file = Column(String)  # Path to GLB file
    mesh_identifier = Column(String)  # Name in Blender/GLB
    
    # Business info
    warranty_years = Column(Integer, default=3)
    price = Column(Float)
    description = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    installed_devices = relationship("InstalledDevice", back_populates="product")


class Warehouse(Base):
    """Customer warehouse configuration"""
    __tablename__ = "warehouses"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    customer_name = Column(String)
    location = Column(String)
    
    # Building specs
    num_floors = Column(Integer, default=1)
    floor_height = Column(Float, default=6.0)  # meters
    total_area = Column(Float)  # sqm
    
    # Model reference
    model_file = Column(String)  # Path to warehouse GLB file
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    devices = relationship("InstalledDevice", back_populates="warehouse", cascade="all, delete-orphan")


class InstalledDevice(Base):
    """Actual devices installed in a warehouse"""
    __tablename__ = "installed_devices"
    
    id = Column(Integer, primary_key=True, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    
    # Installation details
    serial_number = Column(String, unique=True, index=True)
    installation_date = Column(DateTime, default=datetime.utcnow)
    warranty_expiry = Column(DateTime)  # Calculated from installation + warranty_years
    
    # Location in 3D space
    floor_number = Column(Integer, default=1)
    position_x = Column(Float, default=0)
    position_y = Column(Float, default=0)
    position_z = Column(Float, default=0)
    rotation_y = Column(Float, default=0)  # Y-axis rotation in degrees
    
    # Health monitoring
    health_score = Column(Integer, default=100)
    status = Column(String, default="Healthy")  # Healthy, Warning, Critical
    last_maintenance = Column(DateTime)
    next_maintenance = Column(DateTime)
    
    # Metadata
    notes = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    warehouse = relationship("Warehouse", back_populates="devices")
    product = relationship("Product", back_populates="installed_devices")