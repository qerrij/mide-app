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
        
        # Явно импортируем все модели
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
        
        # УНИВЕРСАЛЬНОЕ РЕШЕНИЕ: удаляем ВСЕ таблицы КРОМЕ users
        # PostgreSQL сам разберется с зависимостями через CASCADE
        print("Dropping all tables except 'users'...")
        with engine.connect() as conn:
            # Получаем список всех таблиц
            all_tables = inspector.get_table_names()
            
            # Удаляем каждую таблицу, кроме users
            for table in all_tables:
                if table != 'users':
                    try:
                        # CASCADE автоматически удалит все зависимости
                        conn.execute(text(f'DROP TABLE IF EXISTS "{table}" CASCADE;'))
                        conn.commit()
                        print(f"Dropped table: {table}")
                    except Exception as e:
                        # Если не удалось удалить сейчас, откатываем и попробуем позже
                        conn.rollback()
                        print(f"Could not drop {table} now, will retry later: {e}")
            
            # ПОВТОРНАЯ ПОПЫТКА: удаляем оставшиеся таблицы
            remaining_tables = inspector.get_table_names()
            for table in remaining_tables:
                if table != 'users':
                    try:
                        conn.execute(text(f'DROP TABLE IF EXISTS "{table}" CASCADE;'))
                        conn.commit()
                        print(f"Dropped table on second attempt: {table}")
                    except Exception as e:
                        conn.rollback()
                        print(f"Warning: Could not drop {table}: {e}")
        
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
                    # Используем merge для обновления или вставки
                    db.merge(user)
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