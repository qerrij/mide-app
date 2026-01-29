from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, Float, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.database import Base

class RejectionStatus(str, enum.Enum):
    PENDING = "PENDING"  # На рассмотрении
    APPROVED = "APPROVED"  # Утвержден
    REJECTED = "REJECTED"  # Отклонен
    CANCELLED = "CANCELLED"  # Отменен пользователем

class Rejection(Base):
    __tablename__ = "rejections"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    comment = Column(Text, nullable=True)
    status = Column(Enum(RejectionStatus), default=RejectionStatus.PENDING)
    photo_paths = Column(Text, nullable=True)  # JSON список путей к фото
    video_paths = Column(Text, nullable=True)  # JSON список путей к видео
    
    total_items = Column(Integer, default=0)  # Общее количество бракуемых товаров
    total_value = Column(Float, default=0.0)  # Общая стоимость брака
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], backref="rejections")
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    items = relationship("RejectionItem", back_populates="rejection", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Rejection {self.id} - {self.status.value}>"


class RejectionItem(Base):
    __tablename__ = "rejection_items"
    
    id = Column(Integer, primary_key=True, index=True)
    rejection_id = Column(Integer, ForeignKey("rejections.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)  # Цена на момент создания
    total_price = Column(Float, nullable=False)  # quantity * unit_price
    
    # Relationships
    rejection = relationship("Rejection", back_populates="items")
    product = relationship("Product")
    
    __table_args__ = (
        {'extend_existing': True}
    )
    
    def __repr__(self):
        return f"<RejectionItem {self.id} - Product {self.product_id} x{self.quantity}>"