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
    category_id: int
    price: float
    sku: str
    description: Optional[str] = None
    default_rate: Optional[float] = 0.0  # Добавляем ставку
    city: Optional[str] = None  # Добавляем город


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[int] = None
    price: Optional[float] = None
    sku: Optional[str] = None
    description: Optional[str] = None
    default_rate: Optional[float] = None  # Добавляем ставку
    city: Optional[str] = None  # Добавляем город
    is_active: Optional[bool] = None


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
        if v is not None:
            return v
        
        if hasattr(info, 'data') and info.data:
            if 'category' in info.data and info.data['category']:
                if isinstance(info.data['category'], dict):
                    return info.data['category'].get('name')
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


# Схема для категорий (без изменений)
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
    products_count: Optional[int] = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True