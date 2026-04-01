from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, String, Enum, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class ReservationType(str, enum.Enum):
    TRANSFER = "transfer"      # Резерв под перемещение
    REPORT = "report"          # Резерв под отчет
    REJECTION = "rejection"    # Резерв под брак
    REVISION = "revision"      # Резерв под ревизию


class ReservationStatus(str, enum.Enum):
    ACTIVE = "active"          # Активный резерв
    RELEASED = "released"      # Освобожден (отмена)
    CONSUMED = "consumed"      # Потреблен (товар списан)


class UserInventory(Base):
    __tablename__ = "user_inventory"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    quantity = Column(Integer, nullable=False, default=0)  # Общее количество
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Связи
    user = relationship("User", back_populates="inventory")
    product = relationship("Product")
    reservations = relationship("InventoryReservation", back_populates="inventory", cascade="all, delete-orphan")
    
    __table_args__ = (
        {'extend_existing': True}
    )


class InventoryReservation(Base):
    __tablename__ = "inventory_reservations"
    
    id = Column(Integer, primary_key=True, index=True)
    inventory_id = Column(Integer, ForeignKey("user_inventory.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    
    quantity = Column(Integer, nullable=False)  # Зарезервированное количество
    
    reservation_type = Column(Enum(ReservationType), nullable=False)
    reservation_id = Column(Integer, nullable=False)  # ID перемещения/отчета/брака
    
    status = Column(Enum(ReservationStatus), nullable=False, default=ReservationStatus.ACTIVE)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    released_at = Column(DateTime(timezone=True), nullable=True)
    consumed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Связи
    inventory = relationship("UserInventory", back_populates="reservations")
    user = relationship("User")
    product = relationship("Product")
    
    # Составные индексы для быстрого поиска
    __table_args__ = (
        Index('ix_reservations_type_id', 'reservation_type', 'reservation_id'),
        Index('ix_reservations_user_product', 'user_id', 'product_id'),
    )