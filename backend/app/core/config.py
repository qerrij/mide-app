from pydantic_settings import BaseSettings
from typing import List, Optional
from pathlib import Path
import os

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    CORS_ORIGINS: List[str] = ["*"]
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    
    # App
    APP_NAME: str = "Reports System API"
    DEBUG: bool = False
    
    # File upload
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_IMAGE_TYPES: list = ["image/jpeg", "image/png", "image/gif"]
    MAX_PHOTOS_PER_REPORT: int = 5
    
    # Yandex Cloud Storage
    YC_ENDPOINT_URL: str = "https://storage.yandexcloud.net"
    YC_ACCESS_KEY_ID: str = "" 
    YC_SECRET_ACCESS_KEY: str = ""  
    YC_BUCKET_NAME: str = "" 
    YC_PUBLIC_URL: Optional[str] = None 
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()