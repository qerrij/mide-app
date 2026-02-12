import sys
import os
import time

def wait_for_database():
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
    try:
        from app.database import engine, Base, SessionLocal
        from app.core.security import get_password_hash
        from datetime import datetime
        
        # Создаем таблицы если их нет
        Base.metadata.create_all(bind=engine)
        
        # Создаем владельца если его нет
        db = SessionLocal()
        try:
            from app.models.user import User
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
    import uvicorn
    port = int(os.getenv("PORT", "10000"))
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
    )

if __name__ == "__main__":
    if wait_for_database():
        if init_database():
            run_app()
        else:
            sys.exit(1)
    else:
        sys.exit(1)