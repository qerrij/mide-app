from sqlalchemy import Column, Integer, ForeignKey, Float, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class UserCategoryRate(Base):
    """Ставки пользователя по категориям товаров"""
    __tablename__ = "user_category_rates"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("product_categories.id"), nullable=False)
    rate = Column(Float, nullable=False, default=0.0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Связи
    user = relationship("User", back_populates="category_rates")
    category = relationship("ProductCategory", back_populates="user_rates")
    
    def __repr__(self):
        return f"<UserCategoryRate user:{self.user_id} category:{self.category_id} rate:{self.rate}>"