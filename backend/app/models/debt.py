from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, String, Text, Boolean, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class UserDebt(Base):
    """Долг пользователя по товару (накопленный минус)"""
    __tablename__ = "user_debts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    
    quantity = Column(Integer, nullable=False, default=0)  # Текущий долг (всегда положительное число)
    total_cost = Column(Float, nullable=False, default=0.0)  # Общая стоимость долга
    
    # История изменений (храним в JSON)
    history = Column(Text, nullable=True)  # JSON список изменений
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Связи
    user = relationship("User")
    product = relationship("Product")
    
    __table_args__ = (
        Index('ix_user_debts_user_product', 'user_id', 'product_id', unique=True),
    )


class DebtTransaction(Base):
    """Транзакции изменения долга"""
    __tablename__ = "debt_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    
    revision_id = Column(Integer, ForeignKey("revisions.id"), nullable=True)
    
    quantity_change = Column(Integer, nullable=False)  # Изменение количества (отрицательное для плюса, положительное для минуса)
    new_quantity = Column(Integer, nullable=False)  # Новое значение долга после изменения
    
    product_price = Column(Float, nullable=False)  # Цена товара на момент транзакции
    cost_change = Column(Float, nullable=False)  # Изменение стоимости
    new_total_cost = Column(Float, nullable=False)  # Новая общая стоимость
    
    description = Column(String(500), nullable=True)  # Описание (например, "Ревизия #123, минус 5 шт")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Связи
    user = relationship("User")
    product = relationship("Product")
    revision = relationship("Revision")