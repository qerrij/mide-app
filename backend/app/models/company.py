from sqlalchemy import Column, Integer, Float, DateTime, String, Text
from sqlalchemy.sql import func
from app.database import Base


class CompanyBalance(Base):
    __tablename__ = "company_balance"
    
    id = Column(Integer, primary_key=True, index=True)
    balance = Column(Float, nullable=False, default=0.0)  # Глобальный баланс компании
    city_balance = Column(Float, nullable=True)  # Баланс конкретного города
    description = Column(String(255), nullable=True)
    operation_type = Column(String(50), nullable=False)
    amount = Column(Float, nullable=False)
    reference_id = Column(Integer, nullable=True)
    reference_type = Column(String(50), nullable=True)
    city = Column(String(100), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, nullable=True)
    
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