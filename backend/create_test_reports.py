import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from sqlalchemy.orm import Session
from sqlalchemy import text, inspect
from app.database import SessionLocal, engine, Base

def create_revision_tables():
    """Создаем таблицы ревизий"""
    print("=" * 60)
    print("СОЗДАНИЕ ТАБЛИЦ РЕВИЗИЙ")
    print("=" * 60)
    
    db = SessionLocal()
    try:
        # 1. Удаляем старые таблицы если они существуют
        print("1. Удаляем старые таблицы...")
        old_tables = [
            "revision_discrepancies",
            "revision_filling_items",
            "revision_fillings",
            "revision_items",
            "revisions"
        ]
        
        for table in old_tables:
            try:
                db.execute(text(f'DROP TABLE IF EXISTS "{table}" CASCADE'))
                print(f"  Удалена: {table}")
            except Exception as e:
                print(f"  Ошибка удаления {table}: {e}")
        
        # 2. Удаляем старые enum типы
        print("\n2. Удаляем старые enum типы...")
        try:
            db.execute(text("DROP TYPE IF EXISTS revisionstatus CASCADE"))
            print("  Удален: revisionstatus")
        except Exception as e:
            print(f"  Ошибка: {e}")
        
        try:
            db.execute(text("DROP TYPE IF EXISTS revisiontype CASCADE"))
            print("  Удален: revisiontype")
        except Exception as e:
            print(f"  Ошибка: {e}")
        
        db.commit()
        
        # 3. Создаем enum типы
        print("\n3. Создаем enum типы...")
        
        # Создаем revisionstatus
        try:
            db.execute(text("""
                CREATE TYPE revisionstatus AS ENUM (
                    'REQUESTED',
                    'IN_PROGRESS',
                    'COMPLETED',
                    'VERIFIED',
                    'REJECTED'
                )
            """))
            print("  Создан: revisionstatus")
        except Exception as e:
            print(f"  Ошибка: {e}")
        
        # Создаем revisiontype
        try:
            db.execute(text("""
                CREATE TYPE revisiontype AS ENUM (
                    'USER',
                    'GROUP',
                    'CLUSTER',
                    'CITY',
                    'GENERAL'
                )
            """))
            print("  Создан: revisiontype")
        except Exception as e:
            print(f"  Ошибка: {e}")
        
        # 4. Создаем таблицы
        print("\n4. Создаем таблицы...")
        
        # revisions
        try:
            db.execute(text("""
                CREATE TABLE revisions (
                    id SERIAL PRIMARY KEY,
                    requested_by_id INTEGER NOT NULL REFERENCES users(id),
                    type revisiontype NOT NULL,
                    target_user_id INTEGER REFERENCES users(id),
                    target_group_id INTEGER REFERENCES groups(id),
                    target_cluster_id INTEGER REFERENCES clusters(id),
                    target_city VARCHAR,
                    status revisionstatus NOT NULL DEFAULT 'REQUESTED',
                    verified_by_id INTEGER REFERENCES users(id),
                    photos JSON NOT NULL DEFAULT '[]',
                    comment TEXT,
                    verification_comment TEXT,
                    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    completed_at TIMESTAMP WITH TIME ZONE,
                    verified_at TIMESTAMP WITH TIME ZONE
                )
            """))
            print("  Создана: revisions")
        except Exception as e:
            print(f"  Ошибка: {e}")
        
        # revision_fillings
        try:
            db.execute(text("""
                CREATE TABLE revision_fillings (
                    id SERIAL PRIMARY KEY,
                    revision_id INTEGER NOT NULL REFERENCES revisions(id) ON DELETE CASCADE,
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    status revisionstatus NOT NULL DEFAULT 'REQUESTED',
                    filled_at TIMESTAMP WITH TIME ZONE,
                    photos JSON NOT NULL DEFAULT '[]',
                    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
                    UNIQUE(revision_id, user_id)
                )
            """))
            print("  Создана: revision_fillings")
        except Exception as e:
            print(f"  Ошибка: {e}")
        
        # revision_filling_items
        try:
            db.execute(text("""
                CREATE TABLE revision_filling_items (
                    id SERIAL PRIMARY KEY,
                    filling_id INTEGER NOT NULL REFERENCES revision_fillings(id) ON DELETE CASCADE,
                    product_id INTEGER NOT NULL REFERENCES products(id),
                    category_id INTEGER NOT NULL REFERENCES product_categories(id),
                    quantity INTEGER NOT NULL
                )
            """))
            print("  Создана: revision_filling_items")
        except Exception as e:
            print(f"  Ошибка: {e}")
        
        # revision_discrepancies
        try:
            db.execute(text("""
                CREATE TABLE revision_discrepancies (
                    id SERIAL PRIMARY KEY,
                    revision_id INTEGER NOT NULL REFERENCES revisions(id) ON DELETE CASCADE,
                    product_id INTEGER NOT NULL REFERENCES products(id),
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    expected_quantity INTEGER NOT NULL,
                    actual_quantity INTEGER NOT NULL,
                    discrepancy INTEGER NOT NULL,
                    is_positive BOOLEAN NOT NULL
                )
            """))
            print("  Создана: revision_discrepancies")
        except Exception as e:
            print(f"  Ошибка: {e}")
        
        # 5. Создаем индексы
        print("\n5. Создаем индексы...")
        
        indexes = [
            ("revisions", "requested_by_id"),
            ("revisions", "status"),
            ("revisions", "type"),
            ("revisions", "requested_at"),
            ("revision_fillings", "revision_id"),
            ("revision_fillings", "user_id"),
            ("revision_fillings", "is_completed"),
            ("revision_filling_items", "filling_id"),
            ("revision_filling_items", "product_id"),
            ("revision_discrepancies", "revision_id"),
            ("revision_discrepancies", "product_id"),
            ("revision_discrepancies", "user_id")
        ]
        
        for table, column in indexes:
            try:
                idx_name = f"idx_{table}_{column}"
                db.execute(text(f'CREATE INDEX IF NOT EXISTS {idx_name} ON {table} ({column})'))
                print(f"  Создан индекс: {idx_name}")
            except Exception as e:
                print(f"  Ошибка индекса {table}.{column}: {e}")
        
        db.commit()
        
        print("\n" + "=" * 60)
        print("✅ ВСЕ ТАБЛИЦЫ РЕВИЗИЙ СОЗДАНЫ!")
        print("=" * 60)
        
        # 6. Проверяем создание
        print("\n6. Проверяем созданные таблицы...")
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        revision_tables = ["revisions", "revision_fillings", "revision_filling_items", "revision_discrepancies"]
        
        for table in revision_tables:
            if table in tables:
                print(f"  ✅ {table}")
            else:
                print(f"  ❌ {table} - не создана")
        
        print("\nСозданные типы:")
        result = db.execute(text("""
            SELECT typname 
            FROM pg_type 
            WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        """))
        
        types = [row[0] for row in result]
        revision_types = ["revisionstatus", "revisiontype"]
        
        for rev_type in revision_types:
            if rev_type in types:
                print(f"  ✅ {rev_type}")
            else:
                print(f"  ❌ {rev_type} - не создан")
        
    except Exception as e:
        print(f"\n❌ Ошибка: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()

def main():
    """Главная функция"""
    print("\n" + "=" * 60)
    print("СОЗДАНИЕ ТАБЛИЦ РЕВИЗИЙ")
    print("=" * 60)
    print("\nЭтот скрипт создаст таблицы для системы ревизий.")
    print("=" * 60)
    
    response = input("\nПродолжить? (y/n): ").strip().lower()
    if response not in ['y', 'yes', 'да', 'д']:
        print("Отменено.")
        return
    
    try:
        create_revision_tables()
        
        print("\n" + "=" * 60)
        print("✅ СКРИПТ ЗАВЕРШЕН УСПЕШНО!")
        print("=" * 60)
        print("\nСозданы таблицы:")
        print("  1. revisions - основная таблица ревизий")
        print("  2. revision_fillings - заполнения ревизий пользователями")
        print("  3. revision_filling_items - товары в заполнениях")
        print("  4. revision_discrepancies - расхождения")
        print("\nДля применения изменений перезапустите сервер.")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Ошибка: {e}")

if __name__ == "__main__":
    main()