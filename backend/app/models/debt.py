from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, String, JSON, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class DebtTransactionType(str, enum.Enum):
    REVISION = "REVISION"
    MANUAL_INCREASE = "MANUAL_INCREASE"
    MANUAL_DECREASE = "MANUAL_DECREASE"


class UserDebt(Base):
    __tablename__ = "user_debts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    total_amount = Column(Float, nullable=False, default=0.0)
    history = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    user = relationship("User")
    transactions = relationship("DebtTransaction", back_populates="user_debt", cascade="all, delete-orphan")


class DebtTransaction(Base):
    __tablename__ = "debt_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    user_debt_id = Column(Integer, ForeignKey("user_debts.id"), nullable=False)
    transaction_type = Column(Enum(DebtTransactionType), nullable=False)
    revision_id = Column(Integer, ForeignKey("revisions.id"), nullable=True)
    revision_discrepancy_id = Column(Integer, nullable=True)
    manual_amount = Column(Float, nullable=True)
    manual_description = Column(String(500), nullable=True)
    performed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    amount_change = Column(Float, nullable=False)
    new_total_amount = Column(Float, nullable=False)
    revision_details = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", foreign_keys=[user_id])
    user_debt = relationship("UserDebt", back_populates="transactions")
    revision = relationship("Revision")
    performed_by = relationship("User", foreign_keys=[performed_by_id])