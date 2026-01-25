from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
import os

def create_database_engine():
    """Создает движок базы данных с учетом окружения"""
    db_url = settings.DATABASE_URL
    
    # Определяем, на Render ли мы
    is_render = os.getenv('RENDER') == 'true' or 'render.com' in db_url
    
    # Добавляем sslmode=require для Render PostgreSQL
    if is_render:
        if 'sslmode' not in db_url:
            db_url = f"{db_url}?sslmode=require"
        
        return create_engine(
            db_url,
            pool_pre_ping=True,
            echo=settings.DEBUG,
            pool_recycle=300,  # Важно для Render
            connect_args={
                'sslmode': 'require'
            }
        )
    else:
        # Локальная разработка
        return create_engine(
            db_url,
            pool_pre_ping=True,
            echo=settings.DEBUG
        )


engine = create_database_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()