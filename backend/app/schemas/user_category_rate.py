from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class UserCategoryRateBase(BaseModel):
    category_id: int
    rate: float = 0.0


class UserCategoryRateCreate(UserCategoryRateBase):
    pass


class UserCategoryRateUpdate(BaseModel):
    rate: Optional[float] = None


class UserCategoryRateResponse(UserCategoryRateBase):
    id: int
    user_id: int
    category_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class UserCategoryRatesBulkCreate(BaseModel):
    """Массовое создание/обновление ставок по категориям"""
    rates: List[UserCategoryRateCreate]