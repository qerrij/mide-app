from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, String, Index, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class SaleType(str, enum.Enum):
    REPORT = "report"          # Продажа из отчета
    DIRECT = "direct"          # Прямая продажа (если будет)
    RETURN = "return"          # Возврат товара
    
    def __str__(self):
        return self.value


class SoldProduct(Base):
    """
    Таблица для хранения истории проданных товаров
    """
    __tablename__ = "sold_products"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Связь с отчетом (не nullable, так как продажа всегда из отчета)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False, index=True)
    
    # Информация о продавце
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Информация о товаре
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    
    # Количество и стоимость
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)          # Цена за единицу (после вычета ставки)
    total_amount = Column(Float, nullable=False)        # Общая сумма (quantity * unit_price)
    
    # Дополнительные поля для аналитики
    seller_rate = Column(Float, nullable=True, default=0.0)  # Ставка продавца на момент продажи
    original_price = Column(Float, nullable=True)           # Исходная цена товара (до вычета ставки)
    
    # Информация о продавце на момент продажи (для историчности)
    seller_name = Column(String, nullable=True)
    seller_role = Column(String, nullable=True)
    seller_city = Column(String, nullable=True)
    seller_cluster_id = Column(Integer, nullable=True)
    
    # Информация о товаре на момент продажи (для историчности)
    product_name = Column(String, nullable=False)
    product_sku = Column(String, nullable=False)
    product_category_id = Column(Integer, nullable=True)
    product_category_name = Column(String, nullable=True)
    
    # Дата продажи (дата отчета)
    sale_date = Column(DateTime(timezone=True), nullable=False, index=True)
    
    # Дата утверждения отчета (когда продажа окончательно подтверждена)
    approved_date = Column(DateTime(timezone=True), nullable=False)
    
    # Кто утвердил
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # ИСПРАВЛЕНО: Используем values_callable для хранения значений, а не имен
    sale_type = Column(
        Enum(
            SaleType, 
            name="saletype", 
            values_callable=lambda x: [e.value for e in x]
        ),
        nullable=False, 
        default=SaleType.REPORT
    )
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Связи
    report = relationship("Report", foreign_keys=[report_id])
    seller = relationship("User", foreign_keys=[seller_id])
    product = relationship("Product", foreign_keys=[product_id])
    approver = relationship("User", foreign_keys=[approved_by])
    
    # Составные индексы для быстрых запросов
    __table_args__ = (
        Index('ix_sold_products_seller_date', 'seller_id', 'sale_date'),
        Index('ix_sold_products_product_date', 'product_id', 'sale_date'),
        Index('ix_sold_products_date', 'sale_date'),
        Index('ix_sold_products_city_date', 'seller_city', 'sale_date'),
        {'extend_existing': True}
    )