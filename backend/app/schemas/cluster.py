from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import json


class ClusterBase(BaseModel):
    name: str
    senior_seller_id: int  
    admin_id: Optional[int] = None  
    description: Optional[str] = None


class ClusterCreate(ClusterBase):
    pass


class ClusterUpdate(BaseModel):
    name: Optional[str] = None
    senior_seller_id: Optional[int] = None
    admin_id: Optional[int] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ClusterResponse(ClusterBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    group_count: Optional[int] = 0
    seller_count: Optional[int] = 0
    senior_seller_name: Optional[str] = None
    admin_name: Optional[str] = None
    
    @classmethod
    def from_orm(cls, obj):
        if hasattr(obj, 'admin_clusters') and obj.admin_clusters:
            if isinstance(obj.admin_clusters, str):
                try:
                    obj.admin_clusters = json.loads(obj.admin_clusters)
                except json.JSONDecodeError:
                    obj.admin_clusters = []
        return super().from_orm(obj)
    
    class Config:
        from_attributes = True