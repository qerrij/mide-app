from pydantic import BaseModel, EmailStr, validator, field_validator, ConfigDict
from typing import Dict, Optional, List, Any
from datetime import datetime
import enum
import json


class UserRole(str, enum.Enum):
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    SENIOR_SELLER = "SENIOR_SELLER"
    MENTOR = "MENTOR"
    SELLER = "SELLER"
    ACCOUNTANT = "ACCOUNTANT"



class UserBase(BaseModel):
    username: str
    full_name: str
    telegram: Optional[str] = None
    city: Optional[str] = None
    role: UserRole = UserRole.SELLER
    cluster_id: Optional[int] = None
    group_id: Optional[int] = None
    mentor_id: Optional[int] = None
    senior_seller_id: Optional[int] = None
    admin_clusters: Optional[List[int]] = None 
    rate: Optional[float] = 0.0


class UserCreate(UserBase):
    password: str
    
    @validator('password')
    def password_strength(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        return v


class UserUpdate(BaseModel):
    username: Optional[str] = None
    full_name: Optional[str] = None
    telegram: Optional[str] = None
    city: Optional[str] = None
    role: Optional[UserRole] = None
    password: Optional[str] = None
    cluster_id: Optional[int] = None
    group_id: Optional[int] = None
    mentor_id: Optional[int] = None
    senior_seller_id: Optional[int] = None
    admin_clusters: Optional[List[int]] = None
    is_active: Optional[bool] = None
    rate: Optional[float] = None


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    last_login: Optional[datetime]
    
    # Информация о группе и кусте
    group_name: Optional[str] = None
    cluster_name: Optional[str] = None
    mentor_name: Optional[str] = None
    senior_seller_name: Optional[str] = None
    admin_name: Optional[str] = None
    
    # Статистика для менторов и старших продавцов
    sellers_count: Optional[int] = 0
    groups_count: Optional[int] = 0
    
    @field_validator('admin_clusters', mode='before')
    @classmethod
    def parse_admin_clusters(cls, v):
        if v is None or v == "":
            return []
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, dict):
                    return []
                return parsed
            except json.JSONDecodeError:
                return []
        if isinstance(v, dict):
            return []
        return v or []
    
    @field_validator('created_at', 'updated_at', 'last_login', mode='before')
    @classmethod
    def ensure_datetime(cls, v):
        if isinstance(v, str):
            try:
                return datetime.fromisoformat(v.replace('Z', '+00:00'))
            except ValueError:
                return v
        return v
    
    model_config = ConfigDict(from_attributes=True)
    @field_validator('cluster_id', 'group_id', 'mentor_id', 'senior_seller_id')
    @classmethod
    def validate_ids(cls, v):
        """Преобразуем 0 в None, чтобы избежать ForeignKeyViolation"""
        if v == 0:
            return None
        return v


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[int] = None
    role: Optional[UserRole] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class UserNameResponse(BaseModel):
    id: int
    full_name: str

class UsersNamesResponse(BaseModel):
    user_names: Dict[str, str]

class UserBasicResponse(BaseModel):
    id: int
    full_name: str
    role: UserRole
    
    model_config = ConfigDict(from_attributes=True)