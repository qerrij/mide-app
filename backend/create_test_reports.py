import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import SessionLocal

def create_rejection_tables():
    """Создаем таблицы для функционала браковки товаров"""
    db = SessionLocal()
    try:
        # 1. Удаляем старые таблицы если они существуют
        old_tables = [
            "rejection_items",
            "rejections"
        ]
        
        for table in old_tables:
            try:
                db.execute(text(f'DROP TABLE IF EXISTS "{table}" CASCADE'))
            except Exception:
                pass
        
        # 2. Удаляем старые enum типы
        old_enums = [
            "rejectionstatus"
        ]
        
        for enum_type in old_enums:
            try:
                db.execute(text(f'DROP TYPE IF EXISTS {enum_type} CASCADE'))
            except Exception:
                pass
        
        db.commit()
        
        # 3. Создаем enum тип для статусов брака
        try:
            db.execute(text("""
                CREATE TYPE rejectionstatus AS ENUM (
                    'PENDING',
                    'APPROVED', 
                    'REJECTED',
                    'CANCELLED'
                )
            """))
        except Exception:
            pass
        
        # 4. Создаем таблицу rejections
        try:
            db.execute(text("""
                CREATE TABLE rejections (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    comment TEXT,
                    status rejectionstatus NOT NULL DEFAULT 'PENDING',
                    photo_paths TEXT,
                    video_paths TEXT,
                    total_items INTEGER NOT NULL DEFAULT 0,
                    total_value FLOAT NOT NULL DEFAULT 0.0,
                    reviewed_at TIMESTAMP WITH TIME ZONE,
                    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            """))
        except Exception:
            pass
        
        # 5. Создаем таблицу rejection_items
        try:
            db.execute(text("""
                CREATE TABLE rejection_items (
                    id SERIAL PRIMARY KEY,
                    rejection_id INTEGER NOT NULL REFERENCES rejections(id) ON DELETE CASCADE,
                    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                    quantity INTEGER NOT NULL,
                    unit_price FLOAT NOT NULL,
                    total_price FLOAT NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    CONSTRAINT fk_rejection FOREIGN KEY (rejection_id) REFERENCES rejections(id)
                )
            """))
        except Exception:
            pass
        
        db.commit()
        
        # 6. Создаем индексы
        indexes = [
            ("rejections", "user_id"),
            ("rejections", "status"),
            ("rejections", "created_at"),
            ("rejections", "reviewed_by"),
            ("rejection_items", "rejection_id"),
            ("rejection_items", "product_id")
        ]
        
        for table, column in indexes:
            try:
                idx_name = f"idx_{table}_{column}"
                db.execute(text(f'CREATE INDEX IF NOT EXISTS {idx_name} ON {table} ({column})'))
            except Exception:
                pass
        
        db.commit()
        
        print("✅ Таблицы для функционала браковки товаров успешно созданы!")
        return True
            
    except Exception as e:
        db.rollback()
        print(f"❌ Ошибка при создании таблиц: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

def main():
    try:
        success = create_rejection_tables()
        if success:
            print("✅ Функционал браковки товаров успешно инициализирован!")
        else:
            print("❌ Не удалось инициализировать функционал браковки товаров")
    except Exception as e:
        print(f"❌ Критическая ошибка: {str(e)}")

if __name__ == "__main__":
    main()