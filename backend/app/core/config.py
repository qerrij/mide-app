from pydantic_settings import BaseSettings
from typing import Optional
from pathlib import Path
import os

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # App
    APP_NAME: str = "Reports System API"
    DEBUG: bool = False
    
    # File upload
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_IMAGE_TYPES: list = ["image/jpeg", "image/png", "image/gif"]
    MAX_PHOTOS_PER_REPORT: int = 5
    
    # Render specific
    RENDER: bool = False
    
    class Config:
        env_file = ".env"
        case_sensitive = True
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Проверяем, работаем ли мы на Render
        if os.getenv('RENDER') or 'render.com' in self.DATABASE_URL:
            self.RENDER = True


settings = Settings()