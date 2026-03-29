from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, Boolean, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("product_categories.id"), nullable=False)
    price = Column(Float, nullable=False)
    sku = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    
    # Новые поля
    default_rate = Column(Float, nullable=True, default=0.0)  # Ставка для товара (если None - используется ставка продавца)
    city = Column(String, nullable=True)  # Город, для которого актуален товар (если None - для всех городов)
    
    reports = relationship("ReportProduct", back_populates="product", cascade="all, delete-orphan")
    category = relationship("ProductCategory", backref="products")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Уникальное ограничение: один SKU + один город
    __table_args__ = (
        UniqueConstraint('sku', 'city', name='uq_product_sku_city'),
    )