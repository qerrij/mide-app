from sqlalchemy import Column, Integer, String, Float, Enum, DateTime, ForeignKey, Text, JSON, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.database import Base


class TransferStatus(str, enum.Enum):
    REQUESTED = "REQUESTED"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    IN_TRANSIT = "IN_TRANSIT"
    ARRIVED = "ARRIVED"
    CHECKING = "CHECKING"
    COMPLETED = "COMPLETED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class TransferItemStatus(str, enum.Enum):
    EXPECTED = "EXPECTED"
    RECEIVED = "RECEIVED"
    MISSING = "MISSING"
    EXCESS = "EXCESS"
    REJECTED = "REJECTED"


# Добавим поля в модель Transfer
class Transfer(Base):
    __tablename__ = "transfers"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Основная информация
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Кто создал запрос
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Участники перемещения
    from_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    to_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    executor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Тип запроса
    request_type = Column(String(50), nullable=False, default="user_request")
    
    # Статус
    status = Column(Enum(TransferStatus), nullable=False, default=TransferStatus.REQUESTED)
    
    # Файлы
    files = Column(JSON, nullable=False, default=[])  # Файлы при создании
    discrepancy_files = Column(JSON, nullable=False, default=[])  # Файлы при расхождениях 
    
    # Причина отклонения
    rejection_reason = Column(Text, nullable=True)
    
    discrepancy_accepted_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    discrepancy_accepted_at = Column(DateTime(timezone=True), nullable=True)
    
    discrepancy_approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    discrepancy_approved_at = Column(DateTime(timezone=True), nullable=True)
    
    # Даты
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    approved_at = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    arrived_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    
    # Связи
    created_by = relationship("User", foreign_keys=[created_by_id])
    from_user = relationship("User", foreign_keys=[from_user_id])
    to_user = relationship("User", foreign_keys=[to_user_id])
    executor = relationship("User", foreign_keys=[executor_id])
    discrepancy_accepted_by = relationship("User", foreign_keys=[discrepancy_accepted_by_id])
    discrepancy_approved_by = relationship("User", foreign_keys=[discrepancy_approved_by_id])
    items = relationship("TransferItem", back_populates="transfer", cascade="all, delete-orphan")
    discrepancy_items = relationship("TransferDiscrepancyItem", back_populates="transfer", cascade="all, delete-orphan")
    approvals = relationship("TransferApproval", back_populates="transfer", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Transfer {self.id}: {self.title}>"


class TransferItem(Base):
    __tablename__ = "transfer_items"
    
    id = Column(Integer, primary_key=True, index=True)
    transfer_id = Column(Integer, ForeignKey("transfers.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    expected_quantity = Column(Integer, nullable=False)
    received_quantity = Column(Integer, nullable=True, default=0)
    status = Column(Enum(TransferItemStatus), nullable=False, default=TransferItemStatus.EXPECTED)
    notes = Column(Text, nullable=True)
    
    # Связи
    transfer = relationship("Transfer", back_populates="items")
    product = relationship("Product")
    
    def __repr__(self):
        return f"<TransferItem {self.product_id}: {self.expected_quantity}>"


class TransferDiscrepancyItem(Base):
    __tablename__ = "transfer_discrepancy_items"
    
    id = Column(Integer, primary_key=True, index=True)
    transfer_id = Column(Integer, ForeignKey("transfers.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    expected_quantity = Column(Integer, nullable=False)
    actual_quantity = Column(Integer, nullable=False)
    discrepancy = Column(Integer, nullable=False)  # actual - expected
    notes = Column(Text, nullable=True)
    
    # Связи
    transfer = relationship("Transfer", back_populates="discrepancy_items")
    product = relationship("Product")
    
    def __repr__(self):
        return f"<TransferDiscrepancyItem {self.product_id}: {self.discrepancy}>"


class TransferApproval(Base):
    __tablename__ = "transfer_approvals"
    
    id = Column(Integer, primary_key=True, index=True)
    transfer_id = Column(Integer, ForeignKey("transfers.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    approved = Column(Boolean, nullable=False)
    notes = Column(Text, nullable=True)
    approved_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Связи
    transfer = relationship("Transfer", back_populates="approvals")
    user = relationship("User")
    
    def __repr__(self):
        return f"<TransferApproval {self.user_id}: {'✓' if self.approved else '✗'}>"