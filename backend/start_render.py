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
    """Инициализация базы данных с сохранением пользователей"""
    try:
        print("Initializing database...")
        
        # Импортируем здесь, чтобы убедиться, что все модели загружены
        from app.database import engine, Base, SessionLocal
        from sqlalchemy import inspect, text
        from sqlalchemy.orm import Session
        from app.core.security import get_password_hash
        from datetime import datetime
        
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
        from app.models.rejection import Rejection, RejectionItem
        
        inspector = inspect(engine)
        
        # Сохраняем существующих пользователей
        existing_users = []
        db = SessionLocal()
        try:
            if 'users' in inspector.get_table_names():
                print("Saving existing users...")
                existing_users = db.query(User).all()
                print(f"Found {len(existing_users)} users to preserve")
        except Exception as e:
            print(f"Error saving users: {e}")
        finally:
            db.close()
        
        # Получаем список всех таблиц для удаления (кроме users)
        all_tables = inspector.get_table_names()
        tables_to_drop = [table for table in all_tables if table != 'users']
        
        # Удаляем все таблицы кроме users
        print(f"Dropping tables: {', '.join(tables_to_drop)}")
        with engine.connect() as conn:
            # Отключаем проверки внешних ключей
            conn.execute(text("SET session_replication_role = 'replica';"))
            conn.commit()
            
            # Удаляем таблицы в обратном порядке (с учетом зависимостей)
            for table in reversed(tables_to_drop):
                try:
                    conn.execute(text(f'DROP TABLE IF EXISTS "{table}" CASCADE;'))
                    conn.commit()
                    print(f"Dropped table: {table}")
                except Exception as e:
                    print(f"Error dropping table {table}: {e}")
                    conn.rollback()
            
            # Включаем обратно проверки внешних ключей
            conn.execute(text("SET session_replication_role = 'origin';"))
            conn.commit()
        
        # Создаем все таблицы заново
        print("Creating all tables...")
        Base.metadata.create_all(bind=engine)
        print("Tables created successfully")
        
        # Восстанавливаем пользователей
        if existing_users:
            print(f"Restoring {len(existing_users)} users...")
            db = SessionLocal()
            try:
                for user in existing_users:
                    # Создаем нового пользователя с теми же данными
                    restored_user = User(
                        id=user.id,
                        username=user.username,
                        password_hash=user.password_hash,
                        full_name=user.full_name,
                        role=user.role,
                        is_active=user.is_active,
                        created_at=user.created_at,
                        updated_at=datetime.utcnow()
                    )
                    db.merge(restored_user)
                db.commit()
                print("Users restored successfully")
            except Exception as e:
                db.rollback()
                print(f"Error restoring users: {e}")
            finally:
                db.close()
        
        # Создаем владельца, если его нет
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
        # Инициализируем БД с сохранением пользователей
        if init_database():
            # Запускаем приложение
            run_app()
        else:
            print("Failed to initialize database")
            sys.exit(1)
    else:
        print("Failed to connect to database")
        sys.exit(1)