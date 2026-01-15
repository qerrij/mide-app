from pydantic import BaseModel, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
import enum


class RevisionStatus(str, enum.Enum):
    REQUESTED = "REQUESTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"


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
    
    # Дополнительная информация в зависимости от типа
    target_user_name: Optional[str] = None
    target_group_name: Optional[str] = None
    target_cluster_name: Optional[str] = None
    
    # Заполнения ревизии (для групповых ревизий)
    fillings: List[RevisionFillingResponse] = []
    
    # Расхождения (только для проверенной ревизии)
    discrepancies: List[RevisionDiscrepancyResponse] = []
    
    # Сводная информация по заполнениям
    total_filled: int = 0  # Сколько пользователей заполнило
    total_users: int = 0   # Сколько пользователей должно заполнить
    is_group_revision: bool = False
    
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


class ProductSummaryResponse(BaseModel):
    product_id: int
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    category_name: Optional[str] = None
    total_quantity: int
    user_quantities: List[UserQuantitySummary] = []
    
    class Config:
        from_attributes = True


class UserDiscrepancyDetail(BaseModel):
    product_id: int
    product_name: Optional[str] = None
    expected: int
    actual: int
    discrepancy: int
    is_positive: bool


class UserDiscrepancySummary(BaseModel):
    user_id: int
    user_name: Optional[str] = None
    total_discrepancy: int
    positive_total: int
    negative_total: int
    discrepancies: List[UserDiscrepancyDetail] = []
    
    class Config:
        from_attributes = True


class ProductDiscrepancyDetail(BaseModel):
    user_id: int
    user_name: Optional[str] = None
    expected: int
    actual: int
    discrepancy: int
    is_positive: bool


class ProductDiscrepancySummary(BaseModel):
    product_id: int
    product_name: Optional[str] = None
    total_discrepancy: int
    positive_total: int
    negative_total: int
    user_discrepancies: List[ProductDiscrepancyDetail] = []
    
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