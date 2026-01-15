from sqlalchemy import Column, Integer, String, Float, Enum, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.database import Base


# Удаляем старый enum и используем связь с таблицей категорий
class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("product_categories.id"), nullable=False)
    price = Column(Float, nullable=False)
    sku = Column(String, unique=True, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    
    reports = relationship("ReportProduct", back_populates="product", cascade="all, delete-orphan")
    category = relationship("ProductCategory", backref="products")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())