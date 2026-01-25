from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime
import enum


class ProductCategory(str, enum.Enum):
    DISPOSABLES = "DISPOSABLES"
    LIQUIDS = "LIQUIDS"
    CONSUMABLES = "CONSUMABLES"
    PODS = "PODS"
    ENERGY_DRINKS = "ENERGY_DRINKS"


class ProductBase(BaseModel):
    name: str
    category_id: int  # Меняем с ProductCategory на int (ID категории)
    price: float
    sku: str
    description: Optional[str] = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[int] = None  # Меняем на category_id
    price: Optional[float] = None
    sku: Optional[str] = None
    description: Optional[str] = None


class ProductResponse(ProductBase):
    id: int
    is_active: bool
    category_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    @field_validator('category_name', mode='before')
    @classmethod
    def get_category_name(cls, v, info):
        """Получить название категории из relationship"""
        # Если category_name уже задан, возвращаем его
        if v is not None:
            return v
        
        # Если в данных есть объект category с полем name
        if hasattr(info, 'data') and info.data:
            # Проверяем, есть ли объект category в данных
            if 'category' in info.data and info.data['category']:
                # Если это dict
                if isinstance(info.data['category'], dict):
                    return info.data['category'].get('name')
                # Если это объект SQLAlchemy
                elif hasattr(info.data['category'], 'name'):
                    return info.data['category'].name
        
        return None
    
    @field_validator('created_at', 'updated_at', mode='before')
    @classmethod
    def parse_datetime(cls, v):
        if isinstance(v, str):
            try:
                return datetime.fromisoformat(v.replace('Z', '+00:00'))
            except:
                try:
                    return datetime.strptime(v, '%Y-%m-%d %H:%M:%S.%f%z')
                except:
                    pass
        return v    
    
    class Config:
        from_attributes = True


# Схема для категорий
class ProductCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None


class ProductCategoryCreate(ProductCategoryBase):
    pass


class ProductCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ProductCategoryResponse(ProductCategoryBase):
    id: int
    is_active: bool
    products_count: Optional[int] = 0  # Количество товаров в категории
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True