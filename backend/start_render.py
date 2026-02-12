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
        except Exception as e:
            if i < max_retries - 1:
                time.sleep(retry_delay)
    
    return False

def init_database():
    """Инициализация базы данных с сохранением пользователей"""
    try:
        from app.database import engine, Base, SessionLocal
        from sqlalchemy import inspect, text
        from sqlalchemy.orm import Session
        from app.core.security import get_password_hash
        from datetime import datetime
        
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
        
        inspector = inspect(engine)
        
        existing_users = []
        db = SessionLocal()
        try:
            if 'users' in inspector.get_table_names():
                existing_users = db.query(User).all()
        except Exception:
            pass
        finally:
            db.close()
        
        with engine.connect() as conn:
            conn.execute(text("COMMIT"))
            
            all_tables = inspector.get_table_names()
            for table in all_tables:
                if table != 'users':
                    try:
                        conn.execute(text(f'DROP TABLE IF EXISTS "{table}" CASCADE;'))
                    except Exception:
                        pass
            
            try:
                enum_types = conn.execute(text("""
                    SELECT typname 
                    FROM pg_type 
                    WHERE typtype = 'e' 
                    AND typname NOT LIKE 'pg_%'
                    AND typname NOT LIKE '_%'
                """)).fetchall()
                
                for enum_type in enum_types:
                    enum_name = enum_type[0]
                    try:
                        conn.execute(text(f'DROP TYPE IF EXISTS "{enum_name}" CASCADE;'))
                    except Exception:
                        pass
            except Exception:
                pass
            
            conn.execute(text("COMMIT"))
        
        Base.metadata.create_all(bind=engine)
        
        if existing_users:
            db = SessionLocal()
            try:
                for user in existing_users:
                    db.merge(user)
                db.commit()
            except Exception:
                db.rollback()
            finally:
                db.close()
        
        db = SessionLocal()
        try:
            owner = db.query(User).filter(User.username == "owner").first()
            if not owner:
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