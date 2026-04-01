from pydantic import BaseModel, field_validator, ConfigDict
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
    default_rate: Optional[float] = 0.0
    city_id: Optional[int] = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[int] = None
    price: Optional[float] = None
    sku: Optional[str] = None
    description: Optional[str] = None
    default_rate: Optional[float] = None
    city_id: Optional[int] = None
    is_active: Optional[bool] = None


class ProductResponse(ProductBase):
    id: int
    is_active: bool
    category_name: Optional[str] = None
    city_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    @field_validator('category_name', mode='before')
    @classmethod
    def get_category_name(cls, v, info):
        """Получить название категории из relationship"""
        if v is not None:
            return v
        
        data = info.data
        if 'category' in data and data['category']:
            if hasattr(data['category'], 'name'):
                return data['category'].name
            if isinstance(data['category'], dict):
                return data['category'].get('name')
        
        return None
    
    @field_validator('city_name', mode='before')
    @classmethod
    def get_city_name(cls, v, info):
        """Получить название города из relationship"""
        if v is not None:
            return v
        
        data = info.data
        if 'city' in data and data['city']:
            if hasattr(data['city'], 'name'):
                return data['city'].name
            if isinstance(data['city'], dict):
                return data['city'].get('name')
        
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
    
    model_config = ConfigDict(from_attributes=True)


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