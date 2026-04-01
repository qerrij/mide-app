"""
Скрипт миграции городов
Запуск: python scripts/migrate_cities.py
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def migrate():
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        # Создаем таблицу cities
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS cities (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                region VARCHAR(100),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE
            )
        """))
        
        # Добавляем колонку city_id в users
        db.execute(text("""
            ALTER TABLE users ADD COLUMN IF NOT EXISTS city_id INTEGER REFERENCES cities(id)
        """))
        
        # Создаем индекс
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_users_city_id ON users(city_id)
        """))
        
        # Получаем уникальные города из users
        result = db.execute(text("""
            SELECT DISTINCT city FROM users WHERE city IS NOT NULL AND city != ''
        """))
        cities = [row[0].strip() for row in result.fetchall() if row[0]]
        
        # Вставляем города
        for city_name in cities:
            db.execute(text("""
                INSERT INTO cities (name) VALUES (:name)
                ON CONFLICT (name) DO NOTHING
            """), {"name": city_name})
        
        # Обновляем city_id в users
        db.execute(text("""
            UPDATE users 
            SET city_id = cities.id 
            FROM cities 
            WHERE users.city = cities.name AND users.city IS NOT NULL AND users.city != ''
        """))
        
        db.commit()
        
    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    migrate()