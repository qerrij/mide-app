# from sqlalchemy import Column, Integer, Float, ForeignKey
# from sqlalchemy.orm import relationship
# from app.database import Base


# class ReportProduct(Base):
#     __tablename__ = "report_products"

#     id = Column(Integer, primary_key=True, index=True)
#     report_id = Column(Integer, ForeignKey("reports.id"), nullable=False)
#     product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
#     quantity = Column(Integer, nullable=False, default=1)
#     sold_amount = Column(Float, nullable=False)  # Цена на момент продажи
    
#     # Связи
#     report = relationship("Report", back_populates="products")
#     product = relationship("Product", back_populates="reports")