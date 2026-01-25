import sys
import os
import time

# Настройка пути

def wait_for_database():
    """Ждем, пока база данных станет доступной"""
    import psycopg2
    from app.core.config import settings
    
    max_retries = 5
    retry_delay = 2
    
    for i in range(max_retries):
        try:
            print(f"Attempting to connect to database (attempt {i+1}/{max_retries})...")
            conn = psycopg2.connect(
                settings.DATABASE_URL.replace('postgresql://', 'postgresql://'),
                connect_timeout=3
            )
            conn.close()
            print("Database connection successful")
            return True
        except Exception as e:
            print(f"Database connection failed: {e}")
            if i < max_retries - 1:
                time.sleep(retry_delay)
    
    return False

def init_database():
    """Инициализация базы данных"""
    try:
        print("Initializing database...")
        
        # Импортируем здесь, чтобы убедиться, что все модели загружены
        from app.database import engine, Base
        
        # Явно импортируем все модели для создания таблиц
        from app.models.user import User
        from app.models.product import Product
        from app.models.report import Report
        from app.models.group import Group
        from app.models.cluster import Cluster
        from app.models.inventory import UserInventory
        from app.models.company import CompanyBalance, CompanySettings
        from app.models.category import ProductCategory
        from app.models.transfer import Transfer
        from app.models.revision import Revision
        from app.models.notification import Notification
        
        # Создаем таблицы в правильном порядке
        print("Creating tables...")
        Base.metadata.create_all(bind=engine)
        print("Tables created successfully")
        
        # Создаем владельца
        from sqlalchemy.orm import Session
        from app.database import SessionLocal
        from app.core.security import get_password_hash
        from datetime import datetime
        
        db = SessionLocal()
        try:
            # Проверяем, есть ли уже пользователь owner
            owner_exists = db.query(User).filter(User.username == "owner").first()
            if not owner_exists:
                owner = User(
                    username="owner",
                    password_hash=get_password_hash("owner123"),
                    full_name="Владелец системы",
                    role="OWNER",  # Используем строковое значение
                    is_active=True,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(owner)
                db.commit()
                print("Owner user created")
            else:
                print("Owner user already exists")
        except Exception as e:
            db.rollback()
            print(f"Error creating owner: {e}")
        finally:
            db.close()
            
        print("Database initialization complete")
        return True
        
    except Exception as e:
        print(f"Database initialization error: {e}")
        import traceback
        traceback.print_exc()
        return False

def run_app():
    """Запуск FastAPI приложения"""
    import uvicorn
    port = int(os.getenv("PORT", "10000"))
    print(f"Starting server on port {port}...")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=False
    )

if __name__ == "__main__":
    # Ждем доступности базы данных
    if wait_for_database():
        # Инициализируем БД
        if init_database():
            # Запускаем приложение
            run_app()
        else:
            print("Failed to initialize database")
            sys.exit(1)
    else:
        print("Failed to connect to database")
        sys.exit(1)