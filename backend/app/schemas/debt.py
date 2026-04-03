from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import enum


class DebtTransactionType(str, enum.Enum):
    REVISION = "REVISION"
    MANUAL_INCREASE = "MANUAL_INCREASE"
    MANUAL_DECREASE = "MANUAL_DECREASE"


class DebtAdjustmentType(str, enum.Enum):
    INCREASE = "INCREASE"
    DECREASE = "DECREASE"


# Схемы для ручной корректировки
class ManualDebtAdjustmentRequest(BaseModel):
    adjustment_type: DebtAdjustmentType
    amount: float = Field(..., gt=0, description="Сумма корректировки (в рублях)")
    description: str = Field(..., min_length=3, max_length=500, description="Причина корректировки")


class ManualDebtAdjustmentResponse(BaseModel):
    success: bool
    user_id: int
    user_name: Optional[str] = None
    old_amount: float
    new_amount: float
    change: float
    adjustment_type: DebtAdjustmentType
    description: str
    performed_by: str
    performed_at: datetime


# Схемы для отображения долга
class DebtTransactionResponse(BaseModel):
    id: int
    transaction_type: DebtTransactionType
    amount_change: float
    new_total_amount: float
    created_at: datetime
    
    # Для ревизий
    revision_id: Optional[int] = None
    revision_details: Optional[Dict[str, Any]] = None
    
    # Для ручных корректировок
    manual_amount: Optional[float] = None
    manual_description: Optional[str] = None
    performed_by_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class UserDebtResponse(BaseModel):
    user_id: int
    user_name: Optional[str] = None
    user_role: Optional[str] = None
    total_amount: float
    transactions: List[DebtTransactionResponse] = []
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class DebtStatisticsResponse(BaseModel):
    total_debt_amount: float
    users_with_debt: int
    average_debt: float
    max_debt: float
    top_debtors: List[Dict[str, Any]]
    total_revision_debt: float
    total_manual_increase: float
    total_manual_decrease: float