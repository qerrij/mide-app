from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime
import enum
import json
from .product import ProductResponse
from app.core.file_utils import get_file_url


class ReportStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    AWAITING_FIX = "AWAITING_FIX"
    AWAITING_ACCOUNTANT = "AWAITING_ACCOUNTANT"
    AWAITING_MANAGER = "AWAITING_MANAGER"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class ReportProductCreate(BaseModel):
    product_id: int
    quantity: int
    sold_amount: float


class ReportProductResponse(BaseModel):
    id: int
    report_id: int
    product_id: int
    product: Optional[ProductResponse] = None
    quantity: int
    sold_amount: float
    
    class Config:
        from_attributes = True


class ReportBase(BaseModel):
    transfer_amount: float
    comment: Optional[str] = None
    accountant_amount: float


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
    accountant_amount: Optional[float] = None
    accountant_status: Optional[ReportStatus] = None
    accountant_comment: Optional[str] = None
    accountant_final_amount: Optional[float] = None
    accountant_reviewed_by: Optional[int] = None
    accountant_review_date: Optional[datetime] = None
    accountant_name: Optional[str] = None
    was_with_accountant: bool = False
    
    @field_validator('transfer_photos', mode='before')
    @classmethod
    def parse_photos(cls, v):
        """Парсим transfer_photos из различных форматов"""
        if isinstance(v, list):
            return [get_file_url(path) for path in v]
        
        if isinstance(v, str):
            if not v.strip():
                return []
            
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return [get_file_url(path) for path in parsed]
                else:
                    return [get_file_url(str(parsed))]
            except json.JSONDecodeError:
                if v.startswith('[') and v.endswith(']'):
                    try:
                        content = v[1:-1].strip()
                        if not content:
                            return []
                        items = [item.strip().strip('"\'') for item in content.split(',')]
                        return [get_file_url(item) for item in items if item]
                    except:
                        pass
                
                return [get_file_url(v)]
        
        return []
    
    @field_validator('seller_name', mode='before')
    @classmethod
    def get_seller_name(cls, v, info):
        """Получаем имя продавца из связанного объекта seller"""
        if v is not None:
            return v
        
        data = info.data
        # Проверяем, есть ли загруженный seller
        if 'seller' in data and data['seller']:
            return data['seller'].full_name
        
        # Если нет seller, но есть seller_id, можно сделать дополнительный запрос
        # Но лучше подгружать seller в запросе
        return None
    
    @field_validator('accountant_name', mode='before')
    @classmethod
    def get_accountant_name(cls, v, info):
        """Получаем имя бухгалтера из связанного объекта accountant"""
        if v is not None:
            return v
        
        data = info.data
        if 'accountant' in data and data['accountant']:
            return data['accountant'].full_name
        
        return None
    
    @field_validator('date', 'created_at', 'updated_at', 'review_date', 'accountant_review_date', mode='before')
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
    
    @property
    def can_fix(self) -> bool:
        """Может ли продавец исправить этот отчет"""
        return self.status == ReportStatus.AWAITING_FIX
    
    @property
    def requires_accountant(self) -> bool:
        """Требует ли отчет проверки бухгалтера"""
        return self.status == ReportStatus.AWAITING_ACCOUNTANT
    
    @property
    def requires_manager(self) -> bool:
        """Требует ли отчет проверки руководителя"""
        return self.status == ReportStatus.AWAITING_MANAGER
    
    @property
    def is_fixed_report(self) -> bool:
        """Является ли отчет исправленным (уже был у бухгалтера)"""
        return self.was_with_accountant
    
    @property
    def priority_score(self) -> int:
        """Приоритет для сортировки (чем меньше, тем выше приоритет)"""
        priority_map = {
            ReportStatus.AWAITING_FIX: 1,
            ReportStatus.AWAITING_ACCOUNTANT: 2,
            ReportStatus.AWAITING_MANAGER: 3,
            ReportStatus.SUBMITTED: 4,
            ReportStatus.DRAFT: 5,
            ReportStatus.APPROVED: 6,
            ReportStatus.REJECTED: 7,
        }
        return priority_map.get(self.status, 99)
    
    class Config:
        from_attributes = True


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
    sort_by: str = "priority"
    
    @field_validator('limit')
    @classmethod
    def limit_max(cls, v):
        return min(v, 500)
    
class ReportsPaginatedResponse(BaseModel):
    items: List[ReportResponse]
    total: int
    page: int
    page_size: int
    total_pages: int