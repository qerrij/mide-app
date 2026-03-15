from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas.user import UserRole


class GroupBase(BaseModel):
    name: str
    mentor_id: Optional[int] = None  
    cluster_id: Optional[int] = None
    senior_seller_id: Optional[int] = None
    description: Optional[str] = None


class GroupCreate(GroupBase):
    pass


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    mentor_id: Optional[int] = None
    cluster_id: Optional[int] = None
    senior_seller_id: Optional[int] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class GroupResponse(GroupBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    seller_count: Optional[int] = 0
    mentor_name: Optional[str] = None
    
    class Config:
        from_attributes = True