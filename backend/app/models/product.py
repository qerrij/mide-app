from sqlalchemy import Column, Integer, String, Float, Enum, Text, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.database import Base


class ProductCategory(str, enum.Enum):
    DISPOSABLES = "DISPOSABLES"
    LIQUIDS = "LIQUIDS"
    CONSUMABLES = "CONSUMABLES"
    PODS = "PODS"
    ENERGY_DRINKS = "ENERGY_DRINKS"


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    category = Column(Enum(ProductCategory), nullable=False)
    price = Column(Float, nullable=False)
    sku = Column(String, unique=True, nullable=False)
    description = Column(Text, nullable=True)
    
    reports = relationship("ReportProduct", back_populates="product", cascade="all, delete-orphan")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())