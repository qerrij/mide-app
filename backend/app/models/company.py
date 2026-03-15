from sqlalchemy import Column, Integer, Float, DateTime, String, Text
from sqlalchemy.sql import func
from app.database import Base


class CompanyBalance(Base):
    __tablename__ = "company_balance"
    
    id = Column(Integer, primary_key=True, index=True)
    balance = Column(Float, nullable=False, default=0.0)  # Текущий баланс компании
    description = Column(String(255), nullable=True)      # Описание операции
    operation_type = Column(String(50), nullable=False)   # Тип операции: INCOME, EXPENSE, CORRECTION
    amount = Column(Float, nullable=False)                # Сумма операции
    reference_id = Column(Integer, nullable=True)         # ID связанной сущности (отчет, заказ и т.д.)
    reference_type = Column(String(50), nullable=True)    # Тип связанной сущности
    city = Column(String(100), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, nullable=True)           # Кто создал запись
    
    def __repr__(self):
        return f"<CompanyBalance {self.operation_type}: {self.amount}>"


class CompanySettings(Base):
    __tablename__ = "company_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=True)
    description = Column(String(255), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<CompanySettings {self.key}={self.value}>"