from pydantic import BaseModel, field_validator, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import enum
from app.schemas.user import UserRole
from fastapi import UploadFile, File


class TransferStatus(str, enum.Enum):
    REQUESTED = "REQUESTED"           # Запрошено
    PENDING_APPROVAL = "PENDING_APPROVAL" # Ждет подтверждения руководителя
    APPROVED = "APPROVED"             # Подтверждено (готово к отправке)
    IN_TRANSIT = "IN_TRANSIT"         # В пути (начато отправителем)
    ARRIVED = "ARRIVED"               # Прибыло (получатель отметил прибытие)
    CHECKING = "CHECKING"             # Проверка расхождений
    COMPLETED = "COMPLETED"           # Завершено
    REJECTED = "REJECTED"             # Отклонено
    CANCELLED = "CANCELLED"           # Отменено


class TransferItemStatus(str, enum.Enum):
    EXPECTED = "EXPECTED"
    RECEIVED = "RECEIVED"
    MISSING = "MISSING"
    EXCESS = "EXCESS"
    REJECTED = "REJECTED"


class TransferItemBase(BaseModel):
    product_id: int
    expected_quantity: int
    notes: Optional[str] = None


class TransferItemCreate(TransferItemBase):
    pass


class TransferItemResponse(TransferItemBase):
    id: int
    transfer_id: int
    received_quantity: Optional[int] = 0
    status: TransferItemStatus
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    product_price: Optional[float] = None
    
    class Config:
        from_attributes = True


class TransferDiscrepancyItemResponse(BaseModel):
    id: int
    product_id: int
    expected_quantity: int
    actual_quantity: int
    discrepancy: int
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    notes: Optional[str] = None
    
    class Config:
        from_attributes = True


class TransferBase(BaseModel):
    title: str
    description: Optional[str] = None
    from_user_id: int
    to_user_id: int
    executor_id: Optional[int] = None
    request_type: str = "user_request"  # user_request или manager_request


class TransferCreate(TransferBase):
    items: List[TransferItemCreate]
    files: Optional[List[UploadFile]] = None  # Файлы прямо в форме


class TransferCreateManagerRequest(BaseModel):
    """Запрос перемещения от руководителя"""
    title: str
    description: Optional[str] = None
    from_user_id: int
    to_user_id: int
    items: List[TransferItemCreate]


class TransferResponse(TransferBase):
    id: int
    created_by_id: int
    status: TransferStatus
    files: List[str] = []
    arrival_files: List[str] = []  # 🔴 НОВОЕ: Файлы при приемке товара
    discrepancy_files: List[str] = []  
    
    # 🔴 ДОБАВЛЕНО: Информация о расхождениях
    discrepancy_accepted_by_id: Optional[int] = None
    discrepancy_accepted_at: Optional[datetime] = None
    discrepancy_approved_by_id: Optional[int] = None
    discrepancy_approved_at: Optional[datetime] = None
    
    # 🔴 ДОБАВЛЕНО: Имена пользователей
    discrepancy_accepted_by_name: Optional[str] = None
    discrepancy_approved_by_name: Optional[str] = None
    
    # Даты
    created_at: datetime
    approved_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    arrived_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    
    # Информация о пользователях
    created_by_name: Optional[str] = None
    from_user_name: Optional[str] = None
    to_user_name: Optional[str] = None
    executor_name: Optional[str] = None
    
    # Роли пользователей
    from_user_role: Optional[UserRole] = None
    to_user_role: Optional[UserRole] = None
    executor_role: Optional[UserRole] = None
    
    # Статистика
    total_items: Optional[int] = None
    total_quantity: Optional[int] = None
    
    # Подтверждения
    approvals_count: int = 0
    pending_approvals: List[int] = []
    
    # Флаги
    can_approve: bool = False
    can_execute: bool = False
    can_approve_discrepancy: bool = False  # 🔴 НОВОЕ: может ли подтверждать расхождения
    
    @field_validator('total_items', 'total_quantity', mode='before')
    @classmethod
    def set_none_if_zero(cls, v):
        if v is None or v == 0:
            return None
        return v
    
    @field_validator('created_at', 'approved_at', 'started_at', 'arrived_at', 
                     'completed_at', 'cancelled_at', 'discrepancy_accepted_at',
                     'discrepancy_approved_at', mode='before')
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
    
    @field_validator('arrival_files', 'discrepancy_files', mode='before')
    @classmethod
    def ensure_files_list(cls, v):
        """Обеспечить что arrival_files и discrepancy_files всегда список"""
        if v is None:
            return []
        return v
    
    class Config:
        from_attributes = True


class TransferDetailResponse(TransferResponse):
    items: List[TransferItemResponse] = []
    discrepancy_items: List[TransferDiscrepancyItemResponse] = []
    discrepancies: Optional[Dict[str, Any]] = None
    approvals: List[Dict] = []
    
    @field_validator('discrepancy_items', mode='before')
    @classmethod
    def convert_discrepancies_to_response(cls, v, info):
        """Конвертировать объекты TransferDiscrepancyItem в TransferDiscrepancyItemResponse"""
        if v is None:
            return []
        
        result = []
        for disc in v:
            if isinstance(disc, dict):
                result.append(disc)
            else:
                # Это объект SQLAlchemy
                disc_dict = {
                    'id': disc.id,
                    'product_id': disc.product_id,
                    'expected_quantity': disc.expected_quantity,
                    'actual_quantity': disc.actual_quantity,
                    'discrepancy': disc.discrepancy,
                    'notes': disc.notes,
                    'product_name': disc.product.name if disc.product else None,
                    'product_sku': disc.product.sku if disc.product else None
                }
                result.append(disc_dict)
        
        return result

    @field_validator('discrepancies', mode='before')
    @classmethod
    def calculate_discrepancies(cls, v, info):
        """Рассчитать сводку по расхождениям"""
        if hasattr(info, 'data'):
            items = info.data.get('items', [])
            discrepancy_items = info.data.get('discrepancy_items', [])
            
            missing_count = sum(1 for item in items if item.get('status') == TransferItemStatus.MISSING)
            excess_count = sum(1 for item in items if item.get('status') == TransferItemStatus.EXCESS)
            total_discrepancy = sum(disc.get('discrepancy', 0) for disc in discrepancy_items)
            
            return {
                'missing_items': missing_count,
                'excess_items': excess_count,
                'total_discrepancy': total_discrepancy,
                'has_discrepancies': missing_count > 0 or excess_count > 0
            }
        
        return None
    
    @field_validator('approvals', mode='before')
    @classmethod
    def convert_approvals_to_dict(cls, v):
        """Конвертировать объекты TransferApproval в словари"""
        if v is None:
            return []
        
        approvals_list = []
        for approval in v:
            if isinstance(approval, dict):
                approvals_list.append(approval)
            else:
                # Это объект SQLAlchemy
                approval_dict = {
                    'id': approval.id,
                    'user_id': approval.user_id,
                    'approved': approval.approved,
                    'notes': approval.notes,
                    'approved_at': approval.approved_at,
                    'user_name': approval.user.full_name if approval.user else None,
                    'user_role': approval.user.role if approval.user else None
                }
                approvals_list.append(approval_dict)
        
        return approvals_list

    class Config:
        from_attributes = True


class TransferApprovalRequest(BaseModel):
    approved: bool
    notes: Optional[str] = None


# 🔴 ОБНОВЛЕНО: Новая схема для прибытия
class TransferArrivalItemRequest(BaseModel):
    """Данные товара при прибытии"""
    product_id: int = Field(..., gt=0, description="ID товара")
    actual_quantity: int = Field(..., ge=0, description="Фактически полученное количество")
    notes: Optional[str] = Field(None, description="Примечания по товару")


class TransferArrivalRequest(BaseModel):
    """Запрос на отметку прибытия товара"""
    action: str = Field(..., pattern="^(accept|reject|discrepancy)$", description="Действие: accept, reject, discrepancy")
    items: List[TransferArrivalItemRequest] = Field(..., min_items=1, description="Список полученных товаров")
    notes: Optional[str] = Field(None, description="Общие примечания")
    # Файлы теперь не в схеме, а передаются отдельно через FormData


class TransferArrivalResponse(BaseModel):
    """Ответ на отметку прибытия"""
    message: str
    transfer_id: int
    status: TransferStatus


class TransferExecuteRequest(BaseModel):
    """Запрос на выполнение перемещения (когда руководитель запросил)"""
    executor_id: Optional[int] = None
    files: Optional[List[UploadFile]] = None
    notes: Optional[str] = None


class TransferUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TransferStatus] = None
    executor_id: Optional[int] = None
    rejection_reason: Optional[str] = None


class TransferRejectManagerRequest(BaseModel):
    """Запрос на отклонение запроса от руководителя"""
    reason: Optional[str] = None


# 🔴 НОВАЯ: Схема для отображения возможности подтверждения расхождений
class TransferDiscrepancyApprovalInfo(BaseModel):
    """Информация о возможности подтверждения расхождений"""
    can_approve_discrepancy: bool = False
    allowed_roles: List[UserRole] = [UserRole.OWNER, UserRole.ADMIN, UserRole.SENIOR_SELLER]
    reason: Optional[str] = None
    
    class Config:
        from_attributes = True