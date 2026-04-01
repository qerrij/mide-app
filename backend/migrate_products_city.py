"""
Скрипт для миграции городов в товарах
Запуск: python scripts/migrate_products_city.py
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")


def migrate_products_city():
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        # Добавляем колонку city_id в products
        db.execute(text("""
            ALTER TABLE products ADD COLUMN IF NOT EXISTS city_id INTEGER REFERENCES cities(id)
        """))
        
        # Создаем индекс
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_products_city_id ON products(city_id)
        """))
        
        # Получаем уникальные города из products
        result = db.execute(text("""
            SELECT DISTINCT city FROM products WHERE city IS NOT NULL AND city != ''
        """))
        cities = [row[0].strip() for row in result.fetchall() if row[0]]
        
        # Вставляем города если их нет
        for city_name in cities:
            db.execute(text("""
                INSERT INTO cities (name) VALUES (:name)
                ON CONFLICT (name) DO NOTHING
            """), {"name": city_name})
        
        # Обновляем city_id в products
        db.execute(text("""
            UPDATE products 
            SET city_id = cities.id 
            FROM cities 
            WHERE products.city = cities.name 
            AND products.city IS NOT NULL 
            AND products.city != ''
        """))
        
        # Создаем уникальное ограничение
        try:
            db.execute(text("""
                ALTER TABLE products 
                DROP CONSTRAINT IF EXISTS uq_product_sku_city
            """))
            db.execute(text("""
                ALTER TABLE products 
                ADD CONSTRAINT uq_product_sku_city_id UNIQUE (sku, city_id)
            """))
        except Exception:
            pass
        
        db.commit()
        
    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    migrate_products_city()