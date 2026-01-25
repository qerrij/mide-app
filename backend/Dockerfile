FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt


COPY . .

RUN mkdir -p uploads

RUN cd /app && python -c "
import sys
sys.path.append('/app')

# Импорт для создания таблиц
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
    if not db.query(User).filter(User.username == 'owner').first():
        owner = User(
            username='owner',
            password_hash=get_password_hash('owner123'),
            full_name='Владелец системы',
            role=UserRole.OWNER,
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(owner)
        db.commit()
        print('Owner user created')
    else:
        print('Owner user already exists')
finally:
    db.close()

print('Database initialized successfully')
"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "10000"]