import sys
import os
import time

def wait_for_database():
    """Ждем, пока база данных станет доступной"""
    import psycopg2
    from app.core.config import settings
    
    max_retries = 5
    retry_delay = 2
    
    for i in range(max_retries):
        try:
            conn = psycopg2.connect(
                settings.DATABASE_URL.replace('postgresql://', 'postgresql://'),
                connect_timeout=3
            )
            conn.close()
            return True
        except Exception:
            if i < max_retries - 1:
                time.sleep(retry_delay)
    
    return False

def init_database():
    """Полная перезапись базы данных"""
    try:
        from app.database import engine, Base, SessionLocal
        from sqlalchemy import text
        from app.core.security import get_password_hash
        from datetime import datetime
        
        # 1. Явно импортируем ВСЕ модели, чтобы они зарегистрировались в Base.metadata
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
        from app.models.rejection import Rejection, RejectionItem
        
        # 2. УНИЧТОЖАЕМ ВСЁ
        with engine.connect() as conn:
            # Отключаем транзакцию для DDL операций
            conn.execute(text("COMMIT"))
            
            # Получаем список ВСЕХ enum типов
            enum_result = conn.execute(text("""
                SELECT typname 
                FROM pg_type 
                WHERE typtype = 'e' 
                AND typname NOT LIKE 'pg_%'
                AND typname NOT LIKE '_%'
            """)).fetchall()
            
            # Удаляем все enum типы
            for enum in enum_result:
                try:
                    conn.execute(text(f'DROP TYPE IF EXISTS "{enum[0]}" CASCADE;'))
                except Exception:
                    pass
            
            # Получаем список ВСЕХ таблиц
            tables_result = conn.execute(text("""
                SELECT tablename 
                FROM pg_tables 
                WHERE schemaname = 'public'
            """)).fetchall()
            
            # Удаляем все таблицы
            for table in tables_result:
                try:
                    conn.execute(text(f'DROP TABLE IF EXISTS "{table[0]}" CASCADE;'))
                except Exception:
                    pass
            
            conn.execute(text("COMMIT"))
        
        # 3. СОЗДАЕМ ВСЁ ЗАНОВО
        Base.metadata.create_all(bind=engine)
        
        # 4. СОЗДАЕМ ТОЛЬКО ВЛАДЕЛЬЦА
        db = SessionLocal()
        try:
            owner = User(
                username="owner",
                password_hash=get_password_hash("owner123"),
                full_name="Владелец системы",
                role="OWNER",
                is_active=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(owner)
            db.commit()
        except Exception:
            db.rollback()
        finally:
            db.close()
        
        return True
        
    except Exception:
        return False

def run_app():
    """Запуск FastAPI приложения"""
    import uvicorn
    port = int(os.getenv("PORT", "10000"))
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="critical"
    )

if __name__ == "__main__":
    if wait_for_database():
        if init_database():
            run_app()
        else:
            sys.exit(1)
    else:
        sys.exit(1)