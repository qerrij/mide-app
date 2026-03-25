from pydantic import BaseModel, field_validator, model_validator, computed_field
from typing import Optional, List, Dict, Any
from datetime import datetime
import enum


class RevisionStatus(str, enum.Enum):
    REQUESTED = "REQUESTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"
    REVISION_CANCELLED = "REVISION_CANCELLED"


class RevisionType(str, enum.Enum):
    USER = "USER"
    GROUP = "GROUP"
    CLUSTER = "CLUSTER"
    CITY = "CITY"
    GENERAL = "GENERAL"


# Схемы для элементов ревизии (старые, для обратной совместимости)
class RevisionItemBase(BaseModel):
    product_id: int
    category_id: int
    quantity: int


class RevisionItemCreate(RevisionItemBase):
    pass


class RevisionItemResponse(RevisionItemBase):
    id: int
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    category_name: Optional[str] = None
    actual_quantity: Optional[int] = None
    
    @model_validator(mode='before')
    @classmethod
    def enrich_item_data(cls, data):
        """Обогащаем данные товара перед валидацией"""
        if isinstance(data, dict):
            return data
        
        # Если это объект модели, извлекаем данные
        if hasattr(data, 'product') and data.product:
            data.product_name = data.product.name
            data.product_sku = data.product.sku
            
            # Получаем категорию
            if hasattr(data.product, 'category') and data.product.category:
                data.category_name = data.product.category.name
            elif hasattr(data, 'category') and data.category:
                data.category_name = data.category.name
        
        return data
    
    class Config:
        from_attributes = True


# Схемы для заполнений ревизий пользователями
class RevisionFillingItemBase(BaseModel):
    product_id: int
    category_id: int
    quantity: int


class RevisionFillingItemCreate(RevisionFillingItemBase):
    pass


class RevisionFillingItemResponse(RevisionFillingItemBase):
    id: int
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    category_name: Optional[str] = None
    
    @model_validator(mode='before')
    @classmethod
    def enrich_item_data(cls, data):
        """Обогащаем данные товара перед валидацией"""
        if isinstance(data, dict):
            return data
        
        # Если это объект модели, извлекаем данные
        if hasattr(data, 'product') and data.product:
            data.product_name = data.product.name
            data.product_sku = data.product.sku
            
            # Получаем категорию
            if hasattr(data.product, 'category') and data.product.category:
                data.category_name = data.product.category.name
            elif hasattr(data, 'category') and data.category:
                data.category_name = data.category.name
        
        return data
    
    class Config:
        from_attributes = True


class RevisionFillingBase(BaseModel):
    user_id: int
    photos: List[str]


class RevisionFillingCreate(RevisionFillingBase):
    items: List[RevisionFillingItemCreate]


class RevisionFillingResponse(RevisionFillingBase):
    id: int
    revision_id: int
    status: RevisionStatus
    user_name: Optional[str] = None
    filled_at: Optional[datetime] = None
    is_completed: bool
    items: List[RevisionFillingItemResponse] = []
    
    @model_validator(mode='before')
    @classmethod
    def enrich_filling_data(cls, data):
        """Обогащаем данные заполнения перед валидацией"""
        if isinstance(data, dict):
            return data
        
        # Если это объект модели, извлекаем данные
        if hasattr(data, 'user') and data.user:
            data.user_name = data.user.full_name
        
        # Обрабатываем photos если это строка
        if hasattr(data, 'photos'):
            if isinstance(data.photos, str):
                import json
                try:
                    data.photos = json.loads(data.photos)
                except:
                    data.photos = []
        
        return data
    
    @field_validator('photos', mode='before')
    @classmethod
    def parse_photos(cls, v):
        """Парсим photos из JSON или строки"""
        if isinstance(v, str):
            import json
            try:
                return json.loads(v)
            except:
                return []
        return v or []
    
    @field_validator('filled_at', mode='before')
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


# Схемы для расхождений
class RevisionDiscrepancyBase(BaseModel):
    product_id: int
    user_id: int
    expected_quantity: int
    actual_quantity: int
    discrepancy: int
    is_positive: bool


class RevisionDiscrepancyResponse(RevisionDiscrepancyBase):
    id: int
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    user_name: Optional[str] = None
    category_name: Optional[str] = None
    
    @model_validator(mode='before')
    @classmethod
    def enrich_discrepancy_data(cls, data):
        """Обогащаем данные расхождения перед валидацией"""
        if isinstance(data, dict):
            return data
        
        # Если это объект модели, извлекаем данные
        if hasattr(data, 'product') and data.product:
            data.product_name = data.product.name
            data.product_sku = data.product.sku
            
            # Получаем категорию
            if hasattr(data.product, 'category') and data.product.category:
                data.category_name = data.product.category.name
        
        if hasattr(data, 'user') and data.user:
            data.user_name = data.user.full_name
        
        return data
    
    class Config:
        from_attributes = True


# Основные схемы ревизии
class RevisionBase(BaseModel):
    type: RevisionType
    target_user_id: Optional[int] = None
    target_group_id: Optional[int] = None
    target_cluster_id: Optional[int] = None
    target_city: Optional[str] = None
    comment: Optional[str] = None


class RevisionCreate(RevisionBase):
    items: List[RevisionItemCreate]


class RevisionUpdate(BaseModel):
    status: Optional[RevisionStatus] = None
    verification_comment: Optional[str] = None


class RevisionResponse(RevisionBase):
    id: int
    requested_by_id: int
    requested_by_name: Optional[str] = None
    status: RevisionStatus
    verified_by_id: Optional[int] = None
    verified_by_name: Optional[str] = None
    requested_at: datetime
    completed_at: Optional[datetime] = None
    verified_at: Optional[datetime] = None
    verification_comment: Optional[str] = None
    
    target_user_name: Optional[str] = None
    target_group_name: Optional[str] = None
    target_cluster_name: Optional[str] = None
    
    fillings: List[RevisionFillingResponse] = []
    
    discrepancies: List[RevisionDiscrepancyResponse] = []
    
    total_filled: int = 0 
    total_users: int = 0   
    is_group_revision: bool = False
    
    @model_validator(mode='before')
    @classmethod
    def enrich_revision_data(cls, data):
        """Обогащаем данные ревизии перед валидацией"""
        if isinstance(data, dict):
            return data
        
        if hasattr(data, 'requested_by') and data.requested_by:
            data.requested_by_name = data.requested_by.full_name
        
        if hasattr(data, 'verified_by') and data.verified_by:
            data.verified_by_name = data.verified_by.full_name
        
        if hasattr(data, 'target_user') and data.target_user:
            data.target_user_name = data.target_user.full_name
        
        if hasattr(data, 'target_group') and data.target_group:
            data.target_group_name = data.target_group.name
        
        if hasattr(data, 'target_cluster') and data.target_cluster:
            data.target_cluster_name = data.target_cluster.name
        
        if hasattr(data, 'fillings') and data.fillings:
            data.total_users = len(data.fillings)
        
        return data
    
    @field_validator('requested_at', 'completed_at', 'verified_at', mode='before')
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
    
    @field_validator('is_group_revision', mode='before')
    @classmethod
    def determine_is_group_revision(cls, v, info):
        """Определяем, является ли ревизия групповой"""
        values = info.data
        return values.get('type') in [RevisionType.GROUP, RevisionType.CLUSTER, RevisionType.CITY, RevisionType.GENERAL]
    
    class Config:
        from_attributes = True


# Схема для запроса ревизии
class RevisionRequest(BaseModel):
    type: RevisionType
    target_user_id: Optional[int] = None
    target_group_id: Optional[int] = None
    target_cluster_id: Optional[int] = None
    target_city: Optional[str] = None
    comment: Optional[str] = None


# Схема для заполнения ревизии (старая версия, для обратной совместимости)
class RevisionFill(BaseModel):
    items: List[RevisionItemCreate]
    photos: List[str]  # Список путей к загруженным фото


# Схема для проверки ревизии
class RevisionVerify(BaseModel):
    verification_comment: Optional[str] = None


# Фильтры для ревизий
class RevisionFilter(BaseModel):
    skip: int = 0
    limit: int = 100
    status: Optional[RevisionStatus] = None
    type: Optional[RevisionType] = None
    target_user_id: Optional[int] = None
    target_group_id: Optional[int] = None
    target_cluster_id: Optional[int] = None
    requested_by_id: Optional[int] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None


# Схемы для сводок по ревизии
class UserQuantitySummary(BaseModel):
    user_id: int
    user_name: Optional[str] = None
    quantity: int
    
    @model_validator(mode='before')
    @classmethod
    def enrich_user_data(cls, data):
        """Обогащаем данные пользователя перед валидацией"""
        if isinstance(data, dict):
            return data
        
        # Если это объект модели, извлекаем данные
        if hasattr(data, 'user') and data.user:
            data.user_name = data.user.full_name
        
        return data
    
    class Config:
        from_attributes = True


class ProductSummaryResponse(BaseModel):
    product_id: int
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    category_name: Optional[str] = None
    total_quantity: int
    user_quantities: List[UserQuantitySummary] = []
    
    @model_validator(mode='before')
    @classmethod
    def enrich_product_data(cls, data):
        """Обогащаем данные продукта перед валидацией"""
        if isinstance(data, dict):
            return data
        
        # Если это объект модели, извлекаем данные
        if hasattr(data, 'product') and data.product:
            data.product_name = data.product.name
            data.product_sku = data.product.sku
            
            # Получаем категорию
            if hasattr(data.product, 'category') and data.product.category:
                data.category_name = data.product.category.name
        
        return data
    
    class Config:
        from_attributes = True


class UserDiscrepancyDetail(BaseModel):
    product_id: int
    product_name: Optional[str] = None
    expected: int
    actual: int
    discrepancy: int
    is_positive: bool
    
    @model_validator(mode='before')
    @classmethod
    def enrich_product_data(cls, data):
        """Обогащаем данные продукта перед валидацией"""
        if isinstance(data, dict):
            return data
        
        # Если это объект модели, извлекаем данные
        if hasattr(data, 'product') and data.product:
            data.product_name = data.product.name
        
        return data
    
    class Config:
        from_attributes = True


class UserDiscrepancySummary(BaseModel):
    user_id: int
    user_name: Optional[str] = None
    total_discrepancy: int
    positive_total: int
    negative_total: int
    discrepancies: List[UserDiscrepancyDetail] = []
    
    @model_validator(mode='before')
    @classmethod
    def enrich_user_data(cls, data):
        """Обогащаем данные пользователя перед валидацией"""
        if isinstance(data, dict):
            return data
        
        # Если это объект модели, извлекаем данные
        if hasattr(data, 'user') and data.user:
            data.user_name = data.user.full_name
        
        return data
    
    class Config:
        from_attributes = True


class ProductDiscrepancyDetail(BaseModel):
    user_id: int
    user_name: Optional[str] = None
    expected: int
    actual: int
    discrepancy: int
    is_positive: bool
    
    @model_validator(mode='before')
    @classmethod
    def enrich_user_data(cls, data):
        """Обогащаем данные пользователя перед валидацией"""
        if isinstance(data, dict):
            return data
        
        # Если это объект модели, извлекаем данные
        if hasattr(data, 'user') and data.user:
            data.user_name = data.user.full_name
        
        return data
    
    class Config:
        from_attributes = True


class ProductDiscrepancySummary(BaseModel):
    product_id: int
    product_name: Optional[str] = None
    total_discrepancy: int
    positive_total: int
    negative_total: int
    user_discrepancies: List[ProductDiscrepancyDetail] = []
    
    @model_validator(mode='before')
    @classmethod
    def enrich_product_data(cls, data):
        """Обогащаем данные продукта перед валидацией"""
        if isinstance(data, dict):
            return data
        
        # Если это объект модели, извлекаем данные
        if hasattr(data, 'product') and data.product:
            data.product_name = data.product.name
        
        return data
    
    class Config:
        from_attributes = True


class RevisionSummaryResponse(BaseModel):
    revision: RevisionResponse
    product_summary: List[ProductSummaryResponse] = []
    user_discrepancies: List[UserDiscrepancySummary] = []
    product_discrepancies: List[ProductDiscrepancySummary] = []
    total_filled: int
    total_users: int
    
    class Config:
        from_attributes = True


class RevisionDeleteResponse(BaseModel):
    success: bool
    message: str
    revision_id: int