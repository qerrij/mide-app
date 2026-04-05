from typing import Dict, Optional, List, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, validator, field_validator, ConfigDict
import enum
import json
from .user_category_rate import UserCategoryRateCreate, UserCategoryRateResponse


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
    city_id: Optional[int] = None
    role: UserRole = UserRole.SELLER
    cluster_id: Optional[int] = None
    group_id: Optional[int] = None
    mentor_id: Optional[int] = None
    senior_seller_id: Optional[int] = None
    admin_clusters: Optional[List[int]] = None 
    rate: Optional[float] = 0.0
    accountant_description: Optional[str] = None


class UserCreate(UserBase):
    password: str
    category_rates: Optional[List[UserCategoryRateCreate]] = None
    
    @validator('password')
    def password_strength(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        return v
    
    @validator('rate')
    def rate_must_be_zero(cls, v):
        if v and v != 0:
            raise ValueError('Общая ставка должна быть 0. Используйте ставки по категориям')
        return 0


class UserUpdate(BaseModel):
    username: Optional[str] = None
    full_name: Optional[str] = None
    telegram: Optional[str] = None
    city_id: Optional[int] = None
    role: Optional[UserRole] = None
    password: Optional[str] = None
    cluster_id: Optional[int] = None
    group_id: Optional[int] = None
    mentor_id: Optional[int] = None
    senior_seller_id: Optional[int] = None
    admin_clusters: Optional[List[int]] = None
    is_active: Optional[bool] = None
    rate: Optional[float] = None
    category_rates: Optional[List[UserCategoryRateCreate]] = None
    accountant_description: Optional[str] = None


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    last_login: Optional[datetime]
    
    group_name: Optional[str] = None
    cluster_name: Optional[str] = None
    mentor_name: Optional[str] = None
    senior_seller_name: Optional[str] = None
    admin_name: Optional[str] = None
    
    city_name: Optional[str] = None
    city_region: Optional[str] = None
    
    sellers_count: Optional[int] = 0
    groups_count: Optional[int] = 0
    
    accountant_user_ids: Optional[List[int]] = None
    
    category_rates: List[UserCategoryRateResponse] = []
    accountant_description: Optional[str] = None
    
    accountant_id: Optional[int] = None
    
    @field_validator('accountant_user_ids', mode='before')
    @classmethod
    def parse_accountant_user_ids(cls, v):
        if v is None or v == "":
            return []
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
                return []
            except:
                return []
        return v or []
    
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
    
    @field_validator('cluster_id', 'group_id', 'mentor_id', 'senior_seller_id', 'city_id')
    @classmethod
    def validate_ids(cls, v):
        if v == 0:
            return None
        return v
    
    model_config = ConfigDict(from_attributes=True)


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


class UserPasswordChange(BaseModel):
    password: str
    
    @validator('password')
    def password_strength(cls, v):
        if len(v) < 6:
            raise ValueError('Пароль должен содержать минимум 6 символов')
        return v