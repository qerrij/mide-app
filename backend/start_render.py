import sys
import os

# Настройка пути
sys.path.append(os.getcwd())

def init_database():
    """Инициализация базы данных"""
    try:
        print("Initializing database...")
        
        from app.database import engine, Base
        from app.models import (
            user, product, report, group, cluster, 
            inventory, company, category, transfer, 
            revision, notificaion
        )
        
        # Создаем таблицы
        Base.metadata.create_all(bind=engine)
        print("Tables created")
        
        # Создаем владельца
        from sqlalchemy.orm import Session
        from app.database import SessionLocal
        from app.models.user import User, UserRole
        from app.core.security import get_password_hash
        from datetime import datetime
        
        db = SessionLocal()
        try:
            if not db.query(User).filter(User.username == "owner").first():
                owner = User(
                    username="owner",
                    password_hash=get_password_hash("owner123"),
                    full_name="Владелец системы",
                    role=UserRole.OWNER,
                    is_active=True,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(owner)
                db.commit()
                print("Owner user created")
            else:
                print("Owner user already exists")
        finally:
            db.close()
            
        print("Database initialization complete")
        return True
        
    except Exception as e:
        print(f"Database initialization error: {e}")
        return False

def run_app():
    """Запуск FastAPI приложения"""
    import uvicorn
    port = int(os.getenv("PORT", "10000"))
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=False
    )

if __name__ == "__main__":
    # Инициализируем БД
    init_database()
    
    # Запускаем приложение
    run_app()