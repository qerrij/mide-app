import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from sqlalchemy.orm import Session
from sqlalchemy import text, inspect
from app.database import SessionLocal, engine, Base
from app.models.user import User, UserRole
from app.models.group import Group
from app.models.cluster import Cluster
from app.models.product import Product
from app.models.category import ProductCategory
from app.models.report import Report, ReportProduct
from app.models.inventory import UserInventory
from app.models.company import CompanyBalance, CompanySettings
from app.core.security import get_password_hash
import time

def drop_everything():
    """Удаляем ВСЕ: таблицы, типы, последовательности"""
    print("=" * 60)
    print("ПОЛНЫЙ СБРОС БАЗЫ ДАННЫХ")
    print("=" * 60)
    
    db = SessionLocal()
    try:
        # Получаем ВСЕ таблицы
        inspector = inspect(engine)
        all_tables = inspector.get_table_names()
        
        print(f"Найдено таблиц: {len(all_tables)}")
        
        # Отключаем все ограничения
        db.execute(text("SET session_replication_role = 'replica';"))
        db.commit()
        
        # Удаляем таблицы
        for table in all_tables:
            try:
                db.execute(text(f'DROP TABLE IF EXISTS "{table}" CASCADE'))
                print(f"  Удалена таблица: {table}")
            except Exception as e:
                print(f"  Ошибка при удалении {table}: {e}")
        
        # Удаляем ВСЕ типы если есть
        try:
            db.execute(text("""
                DO $$ 
                DECLARE 
                    r RECORD;
                BEGIN
                    FOR r IN (SELECT typname FROM pg_type WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) 
                    LOOP
                        IF r.typname LIKE 'enum%' OR r.typname IN ('userrole', 'reportstatus', 'productcategory') THEN
                            EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
                        END IF;
                    END LOOP;
                END $$;
            """))
            print("  Удалены все enum типы")
        except Exception as e:
            print(f"  Ошибка при удалении типов: {e}")
        
        # Включаем ограничения обратно
        db.execute(text("SET session_replication_role = 'origin';"))
        db.commit()
        
        print("\n✅ Все таблицы и типы удалены!")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def create_tables_in_order():
    """Создаем таблицы в правильном порядке"""
    print("\n" + "=" * 60)
    print("СОЗДАНИЕ ТАБЛИЦ")
    print("=" * 60)
    
    # Создаем таблицы вручную через SQL чтобы избежать проблем с enum
    
    sql_commands = [
        # Сначала создаем enum типы с ACCOUNTANT
        """
        CREATE TYPE userrole AS ENUM (
            'OWNER',
            'ADMIN', 
            'SENIOR_SELLER',
            'MENTOR',
            'SELLER',
            'ACCOUNTANT'
        );
        """,
        
        """
        CREATE TYPE reportstatus AS ENUM (
            'DRAFT',
            'SUBMITTED',
            'APPROVED',
            'REJECTED'
        );
        """,
        
        # Таблица пользователей
        """
        CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            username VARCHAR UNIQUE NOT NULL,
            password_hash VARCHAR NOT NULL,
            full_name VARCHAR NOT NULL,
            telegram VARCHAR,
            city VARCHAR,
            role userrole NOT NULL,
            rate FLOAT DEFAULT 0.0,
            cluster_id INTEGER,
            group_id INTEGER,
            mentor_id INTEGER,
            senior_seller_id INTEGER,
            admin_id INTEGER,
            admin_clusters TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE,
            last_login TIMESTAMP WITH TIME ZONE
        );
        """,
        
        # Остальные таблицы...
        """
        CREATE TABLE clusters (
            id SERIAL PRIMARY KEY,
            name VARCHAR NOT NULL,
            senior_seller_id INTEGER REFERENCES users(id),
            admin_id INTEGER REFERENCES users(id),
            description VARCHAR,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE
        );
        """,
        
        """
        CREATE TABLE groups (
            id SERIAL PRIMARY KEY,
            name VARCHAR NOT NULL,
            mentor_id INTEGER REFERENCES users(id),
            cluster_id INTEGER REFERENCES clusters(id),
            senior_seller_id INTEGER REFERENCES users(id),
            description VARCHAR,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE
        );
        """,
        
        # Добавляем foreign keys
        """
        ALTER TABLE users 
        ADD CONSTRAINT fk_users_cluster 
        FOREIGN KEY (cluster_id) 
        REFERENCES clusters(id);
        """,
        
        """
        ALTER TABLE users 
        ADD CONSTRAINT fk_users_group 
        FOREIGN KEY (group_id) 
        REFERENCES groups(id);
        """,
        
        """
        CREATE TABLE product_categories (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) UNIQUE NOT NULL,
            description TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE
        );
        """,
        
        """
        CREATE TABLE products (
            id SERIAL PRIMARY KEY,
            name VARCHAR NOT NULL,
            category_id INTEGER REFERENCES product_categories(id),
            price FLOAT NOT NULL,
            sku VARCHAR UNIQUE NOT NULL,
            description TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE
        );
        """,
        
        """
        CREATE TABLE user_inventory (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            product_id INTEGER REFERENCES products(id),
            quantity INTEGER DEFAULT 0,
            reserved_quantity INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE,
            UNIQUE(user_id, product_id)
        );
        """,
        
        """
        CREATE TABLE reports (
            id SERIAL PRIMARY KEY,
            seller_id INTEGER REFERENCES users(id),
            date TIMESTAMP DEFAULT NOW(),
            transfer_amount FLOAT NOT NULL,
            transfer_photos TEXT[] DEFAULT ARRAY[]::TEXT[],
            status reportstatus NOT NULL DEFAULT 'SUBMITTED',
            comment TEXT,
            reviewed_by INTEGER REFERENCES users(id),
            review_date TIMESTAMP,
            accountant_amount FLOAT,
            accountant_reviewed_by INTEGER REFERENCES users(id),
            accountant_status reportstatus,
            accountant_comment TEXT,
            accountant_final_amount FLOAT,
            accountant_review_date TIMESTAMP,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE
        );
        """,
        
        """
        CREATE TABLE report_products (
            id SERIAL PRIMARY KEY,
            report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
            product_id INTEGER REFERENCES products(id),
            quantity INTEGER DEFAULT 1,
            sold_amount FLOAT NOT NULL
        );
        """,
        
        """
        CREATE TABLE company_balance (
            id SERIAL PRIMARY KEY,
            balance FLOAT DEFAULT 0.0,
            description VARCHAR(255),
            operation_type VARCHAR(50) NOT NULL,
            amount FLOAT NOT NULL,
            reference_id INTEGER,
            reference_type VARCHAR(50),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE,
            created_by INTEGER REFERENCES users(id)
        );
        """,
        
        """
        CREATE TABLE company_settings (
            id SERIAL PRIMARY KEY,
            key VARCHAR(100) UNIQUE NOT NULL,
            value TEXT,
            description VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE
        );
        """
    ]
    
    db = SessionLocal()
    try:
        for i, sql in enumerate(sql_commands, 1):
            try:
                db.execute(text(sql))
                print(f"  Создана таблица/тип {i}/{len(sql_commands)}")
            except Exception as e:
                print(f"  Ошибка при создании {i}: {e}")
        
        db.commit()
        print("\n✅ Все таблицы созданы!")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def create_initial_data():
    """Создаем начальные данные"""
    print("\n" + "=" * 60)
    print("СОЗДАНИЕ ТЕСТОВЫХ ДАННЫХ")
    print("=" * 60)
    
    db = SessionLocal()
    try:
        # 1. Пользователи
        print("1. Создаем пользователей...")
        users = [
            User(
                username="owner",
                password_hash=get_password_hash("owner123"),
                full_name="Владелец",
                role=UserRole.OWNER,
                rate=0.0,
                is_active=True
            ),
            User(
                username="admin",
                password_hash=get_password_hash("admin123"),
                full_name="Админ",
                role=UserRole.ADMIN,
                rate=0.0,
                is_active=True
            ),
            User(
                username="accountant",
                password_hash=get_password_hash("accountant123"),
                full_name="Бухгалтер",
                role=UserRole.ACCOUNTANT,
                rate=0.0,
                is_active=True
            ),
            User(
                username="senior",
                password_hash=get_password_hash("senior123"),
                full_name="Старший",
                role=UserRole.SENIOR_SELLER,
                rate=50.0,
                is_active=True
            ),
            User(
                username="mentor",
                password_hash=get_password_hash("mentor123"),
                full_name="Наставник",
                role=UserRole.MENTOR,
                rate=30.0,
                is_active=True
            ),
            User(
                username="seller",
                password_hash=get_password_hash("seller123"),
                full_name="Продавец",
                role=UserRole.SELLER,
                rate=20.0,
                is_active=True
            )
        ]
        
        for user in users:
            db.add(user)
        
        db.commit()
        print(f"   Создано пользователей: {len(users)}")
        
        # 2. Категории
        print("2. Создаем категории...")
        categories = [
            ProductCategory(name="Одноразки", description="Одноразовые электронные сигареты"),
            ProductCategory(name="Жидкости", description="Жидкости для электронных сигарет"),
            ProductCategory(name="Расходники", description="Расходные материалы для вейпов"),
            ProductCategory(name="Под-системы", description="Поды и системы"),
            ProductCategory(name="Энергетики", description="Энергетические напитки")
        ]
        
        for category in categories:
            db.add(category)
        
        db.commit()
        print(f"   Создано категорий: {len(categories)}")
        
        # 3. Товары
        print("3. Создаем товары...")
        category_map = {cat.name: cat.id for cat in categories}
        
        products = [
            Product(name="Elf Bar 600", category_id=category_map["Одноразки"], price=350.0, sku="ELFBAR600"),
            Product(name="HQD Cuvie Plus", category_id=category_map["Одноразки"], price=400.0, sku="HQDCUVIE"),
            Product(name="Jam Monster 100ml", category_id=category_map["Жидкости"], price=800.0, sku="JAMMON100"),
            Product(name="Dinner Lady 60ml", category_id=category_map["Жидкости"], price=600.0, sku="DINLAD60"),
            Product(name="Испаритель GT Coil 0.4", category_id=category_map["Расходники"], price=250.0, sku="GTCOIL04"),
            Product(name="Батарея 18650", category_id=category_map["Расходники"], price=500.0, sku="BAT18650"),
            Product(name="Voopoo Vinci Pod", category_id=category_map["Под-системы"], price=2500.0, sku="VOOPVINCI"),
            Product(name="Smok Nord 4", category_id=category_map["Под-системы"], price=3000.0, sku="SMOKNORD4"),
            Product(name="Red Bull 250ml", category_id=category_map["Энергетики"], price=150.0, sku="REDBULL250"),
            Product(name="Burn Original", category_id=category_map["Энергетики"], price=120.0, sku="BURNORIG")
        ]
        
        for product in products:
            db.add(product)
        
        db.commit()
        print(f"   Создано товаров: {len(products)}")
        
        # 4. Данные компании
        print("4. Создаем данные компании...")
        
        # Баланс
        balance = CompanyBalance(
            balance=100000.0,
            description="Начальный баланс",
            operation_type="INCOME",
            amount=100000.0
        )
        db.add(balance)
        
        # Настройки
        settings = [
            CompanySettings(key="company_name", value="Vape Distribution", description="Название компании"),
            CompanySettings(key="currency", value="RUB", description="Валюта расчетов"),
            CompanySettings(key="default_rate_seller", value="20", description="Ставка по умолчанию для продавцов"),
            CompanySettings(key="default_rate_mentor", value="30", description="Ставка по умолчанию для наставников"),
            CompanySettings(key="default_rate_senior", value="50", description="Ставка по умолчанию для старших продавцов")
        ]
        
        for setting in settings:
            db.add(setting)
        
        db.commit()
        print(f"   Создано настроек: {len(settings)}")
        
        # 5. Инвентарь
        print("5. Создаем инвентарь...")
        
        owner = db.query(User).filter(User.username == "owner").first()
        seller = db.query(User).filter(User.username == "seller").first()
        
        # Товары владельцу
        owner_products = products[:5]
        for product in owner_products:
            inventory = UserInventory(
                user_id=owner.id,
                product_id=product.id,
                quantity=100,
                reserved_quantity=0
            )
            db.add(inventory)
        
        # Товары продавцу
        seller_products = products[:3]
        for product in seller_products:
            inventory = UserInventory(
                user_id=seller.id,
                product_id=product.id,
                quantity=20,
                reserved_quantity=0
            )
            db.add(inventory)
        
        db.commit()
        print(f"   Создано записей инвентаря: {len(owner_products) + len(seller_products)}")
        
        print("\n✅ Все тестовые данные созданы!")
        
    except Exception as e:
        print(f"❌ Ошибка при создании данных: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def verify_data():
    """Проверяем что данные созданы правильно"""
    print("\n" + "=" * 60)
    print("ПРОВЕРКА ДАННЫХ")
    print("=" * 60)
    
    db = SessionLocal()
    try:
        # Проверяем пользователей
        users = db.query(User).all()
        print(f"Пользователи в базе: {len(users)}")
        for user in users:
            print(f"  {user.username}: {user.role.value} (ставка: {user.rate})")
        
        # Проверяем что ACCOUNTANT есть
        accountant_exists = any(user.role == UserRole.ACCOUNTANT for user in users)
        print(f"\nACCOUNTANT в базе: {'✅ ДА' if accountant_exists else '❌ НЕТ'}")
        
        # Проверяем enum значения
        result = db.execute(text("SELECT enumlabel FROM pg_enum WHERE enumtypid = 'userrole'::regtype"))
        enum_values = [row[0] for row in result]
        print(f"\nЗначения enum userrole: {enum_values}")
        
        return accountant_exists
        
    except Exception as e:
        print(f"❌ Ошибка при проверке: {e}")
        return False
    finally:
        db.close()

def clean_python_cache():
    """Очищаем кэш Python"""
    import os
    import shutil
    
    print("\n" + "=" * 60)
    print("ОЧИСТКА КЭША PYTHON")
    print("=" * 60)
    
    cache_dirs = []
    pyc_files = []
    
    for root, dirs, files in os.walk("."):
        # Удаляем __pycache__ папки
        if "__pycache__" in dirs:
            cache_path = os.path.join(root, "__pycache__")
            cache_dirs.append(cache_path)
            try:
                shutil.rmtree(cache_path)
            except:
                pass
        
        # Удаляем .pyc файлы
        for file in files:
            if file.endswith(".pyc") or file.endswith(".pyo"):
                pyc_path = os.path.join(root, file)
                pyc_files.append(pyc_path)
                try:
                    os.remove(pyc_path)
                except:
                    pass
    
    print(f"Удалено __pycache__ папок: {len(cache_dirs)}")
    print(f"Удалено .pyc/.pyo файлов: {len(pyc_files)}")
    print("✅ Кэш очищен!")

def main():
    """Главная функция"""
    print("\n" + "=" * 60)
    print("СКРИПТ ПОЛНОГО СБРОСА БАЗЫ ДАННЫХ")
    print("=" * 60)
    print("\n⚠️  ВНИМАНИЕ: Это удалит ВСЕ данные в базе!")
    print("=" * 60)
    
    response = input("\nПродолжить? (y/n): ").strip().lower()
    if response not in ['y', 'yes', 'да', 'д']:
        print("Отменено.")
        return
    
    try:
        # 1. Очищаем кэш Python
        clean_python_cache()
        
        # 2. Удаляем все из базы
        drop_everything()
        
        # 3. Создаем таблицы
        create_tables_in_order()
        
        # 4. Создаем данные
        create_initial_data()
        
        # 5. Проверяем
        success = verify_data()
        
        if success:
            print("\n" + "=" * 60)
            print("✅ ВСЁ ГОТОВО!")
            print("=" * 60)
            print("\nДанные для входа:")
            print("owner / owner123 (Владелец)")
            print("admin / admin123 (Админ)")
            print("accountant / accountant123 (Бухгалтер)")
            print("senior / senior123 (Старший продавец)")
            print("mentor / mentor123 (Наставник)")
            print("seller / seller123 (Продавец)")
            print("\n💰 Баланс компании: 100,000 руб")
            print("📦 Товаров: 10, инвентарь: 8 записей")
            print("\nДля запуска сервера:")
            print("uvicorn app.main:app --reload")
            print("=" * 60)
        else:
            print("\n❌ Проблема с созданием данных!")
            
    except Exception as e:
        print(f"\n❌ Критическая ошибка: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()