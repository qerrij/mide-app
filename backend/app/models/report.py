from sqlalchemy import Column, Integer, String, Float, Enum, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.database import Base
from app.core.file_utils import get_file_url


class ReportStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    AWAITING_FIX = "AWAITING_FIX"  # Ожидает исправления продавцом
    AWAITING_ACCOUNTANT = "AWAITING_ACCOUNTANT"  # Ожидает проверки бухгалтера
    AWAITING_MANAGER = "AWAITING_MANAGER"  # Ожидает проверки руководителя
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class ReportProduct(Base):
    __tablename__ = "report_products"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    sold_amount = Column(Float, nullable=False)

    report = relationship("Report", back_populates="products")
    product = relationship("Product")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(DateTime, nullable=False, default=func.now())
    transfer_amount = Column(Float, nullable=False)
    
    transfer_photos = Column(ARRAY(String), nullable=False, default=[])
    
    status = Column(Enum(ReportStatus), nullable=False, default=ReportStatus.SUBMITTED)
    comment = Column(Text, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    review_date = Column(DateTime, nullable=True)
    
    seller = relationship("User", foreign_keys=[seller_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    products = relationship("ReportProduct", back_populates="report", cascade="all, delete-orphan")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Поля для бухгалтерской проверки
    accountant_amount = Column(Float, nullable=True)
    accountant_reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    accountant_comment = Column(Text, nullable=True)
    accountant_final_amount = Column(Float, nullable=True)
    accountant_review_date = Column(DateTime, nullable=True)
    accountant_status = Column(Enum(ReportStatus), nullable=True)

    accountant = relationship("User", foreign_keys=[accountant_reviewed_by])
    
    # Поле для отслеживания, был ли отчет уже на бухгалтерской проверке
    was_with_accountant = Column(Boolean, default=False)
    
    def __init__(self, **kwargs):
        if 'transfer_photos' not in kwargs:
            kwargs['transfer_photos'] = []
        elif isinstance(kwargs['transfer_photos'], str):
            import json
            try:
                kwargs['transfer_photos'] = json.loads(kwargs['transfer_photos'])
            except:
                kwargs['transfer_photos'] = []
        
        if not isinstance(kwargs['transfer_photos'], list):
            kwargs['transfer_photos'] = []
        
        super().__init__(**kwargs)
    
    @property
    def transfer_photo_urls(self):
        """Получить URL для всех фотографий"""
        return [get_file_url(path) for path in self.transfer_photos]
    
    @property
    def requires_accountant(self):
        """Требуется ли проверка бухгалтера"""
        return self.status == ReportStatus.AWAITING_ACCOUNTANT
    
    @property
    def requires_manager(self):
        """Требуется ли проверка руководителя"""
        return self.status == ReportStatus.AWAITING_MANAGER
    
    @property
    def requires_fix(self):
        """Требуется ли исправление продавцом"""
        return self.status == ReportStatus.AWAITING_FIX