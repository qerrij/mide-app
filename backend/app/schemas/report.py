from pydantic import BaseModel, validator, field_validator
from typing import Optional, List
from datetime import datetime
import enum
import json
from .product import ProductResponse


class ReportStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class ReportProductCreate(BaseModel):
    product_id: int
    quantity: int
    sold_amount: float


class ReportProductResponse(BaseModel):
    id: int
    product_id: int
    product: Optional[ProductResponse] = None
    quantity: int
    sold_amount: float
    
    class Config:
        from_attributes = True


class ReportBase(BaseModel):
    transfer_amount: float
    comment: Optional[str] = None


class ReportCreate(ReportBase):
    products: List[ReportProductCreate]


class ReportUpdate(BaseModel):
    status: Optional[ReportStatus] = None
    comment: Optional[str] = None
    reviewed_by: Optional[int] = None


class ReportResponse(ReportBase):
    id: int
    seller_id: int
    seller_name: Optional[str] = None
    date: datetime
    transfer_photos: List[str]
    status: ReportStatus
    reviewed_by: Optional[int] = None
    review_date: Optional[datetime] = None
    products: List[ReportProductResponse]
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    @field_validator('seller_name', mode='before')
    @classmethod
    def get_seller_name(cls, v, info):
        """Получаем имя продавца из связанного объекта"""
        if v is not None:
            return v
        
        data = info.data
        if 'seller' in data and data['seller']:
            return data['seller'].full_name
        
        return None
    
    @field_validator('transfer_photos', mode='before')
    @classmethod
    def parse_photos(cls, v):
        """Парсим transfer_photos из различных форматов"""
        if isinstance(v, list):
            return v
        
        if isinstance(v, str):
            if not v.strip():
                return []
            
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
                else:
                    return [str(parsed)]
            except json.JSONDecodeError:

                if v.startswith('[') and v.endswith(']'):
                    try:
                        content = v[1:-1].strip()
                        if not content:
                            return []
                        items = [item.strip().strip('"\'') for item in content.split(',')]
                        return [item for item in items if item]
                    except:
                        pass
                
                return [v]
        
        return []
    
    @field_validator('date', 'created_at', 'updated_at', 'review_date', mode='before')
    @classmethod
    def parse_datetime(cls, v):
        if isinstance(v, str):
            try:
                return datetime.fromisoformat(v.replace('Z', '+00:00'))
            except:
                try:
                    return datetime.strptime(v, '%Y-%m-%d %H:%M:%S.%f%z')
                except:
                    try:
                        return datetime.strptime(v, '%Y-%m-%d %H:%M:%S')
                    except:
                        pass
        return v
    
    class Config:
        from_attributes = True


# Для фильтрации
class ReportFilter(BaseModel):
    skip: int = 0
    limit: int = 100
    seller_id: Optional[int] = None
    cluster_id: Optional[int] = None
    mentor_id: Optional[int] = None
    admin_id: Optional[int] = None
    status: Optional[ReportStatus] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    
    @validator('limit')
    def limit_max(cls, v):
        return min(v, 500)