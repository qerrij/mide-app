from pydantic import BaseModel, field_validator
from typing import Optional, Dict, Any
from datetime import datetime
import enum


class NotificationType(str, enum.Enum):
    REVISION_REQUEST = "REVISION_REQUEST"
    REVISION_COMPLETED = "REVISION_COMPLETED"
    REVISION_VERIFIED = "REVISION_VERIFIED"
    REPORT_SUBMITTED = "REPORT_SUBMITTED"
    REPORT_APPROVED = "REPORT_APPROVED"
    REPORT_REJECTED = "REPORT_REJECTED"
    REPORT_ACCOUNTANT = "REPORT_ACCOUNTANT"
    INVENTORY_LOW = "INVENTORY_LOW"
    SYSTEM_MESSAGE = "SYSTEM_MESSAGE"
    
    # Типы для перемещений
    TRANSFER_REQUEST = "TRANSFER_REQUEST"
    TRANSFER_APPROVED = "TRANSFER_APPROVED"
    TRANSFER_IN_TRANSIT = "TRANSFER_IN_TRANSIT"
    TRANSFER_DISCREPANCY = "TRANSFER_DISCREPANCY"
    TRANSFER_COMPLETED = "TRANSFER_COMPLETED"
    TRANSFER_REJECTED = "TRANSFER_REJECTED"
    TRANSFER_MANAGER_REQUEST = "TRANSFER_MANAGER_REQUEST"
    TRANSFER_STATUS = "TRANSFER_STATUS"
    
    OTHER = "OTHER"


class NotificationStatus(str, enum.Enum):
    UNREAD = "UNREAD"
    READ = "READ"
    ARCHIVED = "ARCHIVED"


class NotificationBase(BaseModel):
    type: NotificationType
    title: str
    message: str
    data: Optional[Dict[str, Any]] = None
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    priority: int = 3


class NotificationCreate(NotificationBase):
    user_id: int
    sender_id: Optional[int] = None


class NotificationUpdate(BaseModel):
    status: Optional[NotificationStatus] = None


class NotificationResponse(NotificationBase):
    id: int
    user_id: int
    status: NotificationStatus
    sender_id: Optional[int] = None
    sender_name: Optional[str] = None
    created_at: datetime
    read_at: Optional[datetime] = None
    
    @field_validator('created_at', 'read_at', mode='before')
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


class NotificationSummaryResponse(BaseModel):
    unread_count: int
    last_notification_at: Optional[datetime] = None
    notifications: list[NotificationResponse] = []
    
    class Config:
        from_attributes = True