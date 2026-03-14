from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class InventoryItemBase(BaseModel):
    product_id: int
    quantity: int
    reserved_quantity: int
    
class ReservationDetail(BaseModel):
    type: str  # Отчет, Перемещение, Брак, Ревизия
    id: int
    quantity: int
    created_at: datetime

class InventoryItemResponse(BaseModel):
    id: int
    user_id: int
    product_id: int
    quantity: int
    reserved_quantity: int
    available_quantity: Optional[int] = None
    reserved_details: Optional[List[ReservationDetail]] = []  # Детали резервов
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    product_price: Optional[float] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class InventoryResponse(BaseModel):
    quantity: int
    items: List[InventoryItemResponse]


class ReplenishRequest(BaseModel):
    product_id: Optional[int] = Field(None, description="ID существующего товара (если is_new_product=false)")
    quantity: int = Field(..., gt=0, description="Количество для пополнения")
    is_new_product: bool = Field(False, description="True если создаем новый товар")
    new_product_data: Optional[dict] = Field(None, description="Данные нового товара")
    
    class Config:
        from_attributes = True


class ReplenishResponse(BaseModel):
    message: str
    inventory: dict
    product: Optional[dict] = None
    
    class Config:
        from_attributes = True

class EditInventoryRequest(BaseModel):
    user_id: int
    product_id: int
    quantity: int = Field(..., ge=0)