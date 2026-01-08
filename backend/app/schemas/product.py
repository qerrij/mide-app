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
    category: ProductCategory
    price: float
    sku: str
    description: Optional[str] = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[ProductCategory] = None
    price: Optional[float] = None
    sku: Optional[str] = None
    description: Optional[str] = None


class ProductResponse(ProductBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
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