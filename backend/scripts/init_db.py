import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def init():
    from app.database import engine, Base
    from app.models import (
        user, product, report, group, cluster, 
        inventory, company, category, transfer, 
        revision, notificaion
    )
    
    # Создаем таблицы
    Base.metadata.create_all(bind=engine)
    
    # Создаем владельца
    from sqlalchemy.orm import Session
    from app.database import SessionLocal
    from app.models.user import User, UserRole
    from app.core.security import get_password_hash
    from datetime import datetime
    
    db = SessionLocal()
    try:
        # Проверяем и создаем владельца
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
    finally:
        db.close()

if __name__ == "__main__":
    init()