from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class InventoryItemBase(BaseModel):
    product_id: int
    quantity: int
    reserved_quantity: int


class InventoryItemResponse(InventoryItemBase):
    id: int
    user_id: int
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
    product_id: Optional[int] = None
    quantity: int
    is_new_product: bool = False
    new_product_data: Optional[dict] = None
    
    class Config:
        from_attributes = True