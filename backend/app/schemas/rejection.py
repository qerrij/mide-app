from pydantic import BaseModel, field_validator, ConfigDict
from typing import Any, Optional, List, Dict
from datetime import datetime
import json
from app.models.rejection import RejectionStatus


class RejectionItemCreate(BaseModel):
    product_id: int
    quantity: int


class RejectionItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    category_name: Optional[str] = None
    quantity: int
    unit_price: float
    total_price: float
    
    model_config = ConfigDict(from_attributes=True)


class RejectionCreate(BaseModel):
    items: List[RejectionItemCreate]
    comment: Optional[str] = None
    
    @field_validator('items')
    @classmethod
    def validate_items(cls, v):
        if not v or len(v) == 0:
            raise ValueError('Должен быть хотя бы один товар')
        return v


class RejectionUpdate(BaseModel):
    status: Optional[RejectionStatus] = None
    comment: Optional[str] = None


class RejectionResponse(BaseModel):
    id: int
    user_id: int
    user_name: Optional[str] = None
    user_role: Optional[str] = None
    comment: Optional[str] = None
    status: RejectionStatus
    photo_paths: Optional[List[str]] = None
    video_paths: Optional[List[str]] = None
    total_items: int
    total_value: float
    items: List[RejectionItemResponse]
    created_at: datetime
    updated_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[int] = None
    reviewer_name: Optional[str] = None
    
    @field_validator('photo_paths', 'video_paths', mode='before')
    @classmethod
    def parse_json_string(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except:
                return []
        return v or []
    
    model_config = ConfigDict(from_attributes=True)

class RejectionUserStats(BaseModel):
    user_id: int
    user_name: str
    user_role: Optional[str] = None
    cluster_id: Optional[int] = None
    cluster_name: Optional[str] = None
    total_rejections: int
    total_value: float
    products_count: int  # Сколько разных товаров браковал


class RejectionUserProductStats(BaseModel):
    user_id: int
    user_name: str
    product_id: int
    product_name: str
    product_sku: str
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    total_rejected: int
    total_value: float


class RejectionDetailedStats(BaseModel):
    period: str  # "2024-01", "2024", "all_time"
    total_rejected_items: int
    total_value: float
    total_users: int
    total_products: int
    by_month: Optional[List[Dict]] = None  # Статистика по месяцам



# Добавим новые схемы
class UserRejectionStatsDetail(BaseModel):
    """Детальная статистика брака для пользователя"""
    user_id: int
    user_name: str
    user_role: Optional[str] = None
    cluster_id: Optional[int] = None
    cluster_name: Optional[str] = None
    mentor_id: Optional[int] = None
    mentor_name: Optional[str] = None
    total_rejections: int  # Количество запросов на брак
    total_items: int  # Общее количество бракованных товаров
    total_value: float  # Общая стоимость брака
    products_count: int  # Количество разных товаров
    
    # Детали по товарам
    products: List[RejectionUserProductStats] = []


class UserRejectionDetailedStats(BaseModel):
    """Детальная статистика браков для пользователей и их подчиненных"""
    current_user: RejectionUserStats  # Статистика текущего пользователя
    subordinates: List[UserRejectionStatsDetail] = []  # Статистика подчиненных
    total_stats: Dict[str, Any]  # Общая сводка


class CombinedRejectionStats(BaseModel):
    """Объединенная статистика за один запрос"""
    user_stats: RejectionUserStats  # Статистика по текущему пользователю
    user_products_stats: List[RejectionUserProductStats]  # Статистика по товарам пользователя
    subordinates_stats: List[RejectionUserStats] = []  # Статистика подчиненных
    summary: Dict[str, Any]  # Общая сводка