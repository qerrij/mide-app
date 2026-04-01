from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime


class CityBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    region: Optional[str] = Field(None, max_length=100)


class CityCreate(CityBase):
    pass


class CityUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    region: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None


class CityResponse(CityBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)