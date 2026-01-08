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
from app.models.report import Report, ReportProduct
from app.core.security import get_password_hash

def disable_foreign_keys(db: Session):
    """Отключаем foreign key constraints для PostgreSQL"""
    print("Disabling foreign key constraints...")
    db.execute(text("SET session_replication_role = 'replica';"))
    db.commit()

def enable_foreign_keys(db: Session):
    """Включаем foreign key constraints обратно"""
    print("Enabling foreign key constraints...")
    db.execute(text("SET session_replication_role = 'origin';"))
    db.commit()

def drop_all_tables():
    """Удаляем все таблицы, обходя циклические зависимости"""
    print("Dropping all tables...")
    
    db = SessionLocal()
    try:
        disable_foreign_keys(db)
        
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        print(f"Found {len(tables)} tables to drop")
        
        for table in tables:
            try:
                print(f"  Dropping table: {table}")
                db.execute(text(f'DROP TABLE IF EXISTS "{table}" CASCADE'))
            except Exception as e:
                print(f"  Warning: Could not drop table {table}: {e}")
        
        db.commit()
        print("All tables dropped successfully!")
        
        enable_foreign_keys(db)
        
    except Exception as e:
        print(f"Error dropping tables: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def drop_all_tables_simple():
    """Альтернативный способ: используем SQLAlchemy drop_all с отдельными сессиями"""
    print("Dropping all tables using SQLAlchemy...")
    
    engine.dispose()
    
    Base.metadata.drop_all(bind=engine)
    
    print("All tables dropped successfully!")

def create_all_tables():
    """Создаем все таблицы заново"""
    print("\nCreating all tables...")
    
    Base.metadata.create_all(bind=engine)
    
    print("All tables created successfully!")

def create_initial_users():
    """Создаем начальных пользователей"""
    db = SessionLocal()
    
    try:
        print("\nCreating initial users...")
        
        owner = User(
            username="owner",
            password_hash=get_password_hash("owner123"),
            full_name="Владелец Системы",
            telegram="@owner",
            city="Москва",
            role=UserRole.OWNER,
            is_active=True
        )
        db.add(owner)
        print(f"Created owner: {owner.username}")
        
        admin = User(
            username="admin",
            password_hash=get_password_hash("admin123"),
            full_name="Администратор Иванов",
            telegram="@admin",
            city="Москва",
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(admin)
        print(f"Created admin: {admin.username}")
        
        seller = User(
            username="seller",
            password_hash=get_password_hash("seller123"),
            full_name="Продавец Кузнецов",
            telegram="@seller",
            city="Москва",
            role=UserRole.SELLER,
            is_active=True
        )
        db.add(seller)
        print(f"Created seller: {seller.username}")
        
        db.commit()
        print("\nInitial users created successfully!")
        
        users = db.query(User).order_by(User.id).all()
        print("\nCreated users:")
        print("-" * 60)
        print(f"{'ID':<5} {'Username':<15} {'Role':<15} {'Full Name':<25}")
        print("-" * 60)
        
        for user in users:
            print(f"{user.id:<5} {user.username:<15} {user.role.value:<15} {user.full_name:<25}")
        
        print("-" * 60)
        print(f"Total users created: {len(users)}")
        
        save_users_info(users)
        
    except Exception as e:
        print(f"Error creating users: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def save_users_info(users):
    """Сохраняем информацию о пользователях в файл"""
    with open("initial_users.txt", "w", encoding="utf-8") as f:
        f.write("Созданные пользователи:\n")
        f.write("=" * 60 + "\n")
        f.write(f"{'Username':<15} {'Role':<15} {'Password':<15}\n")
        f.write("=" * 60 + "\n")
        
        for user in users:
            password_map = {
                "owner": "owner123",
                "admin": "admin123",
                "seller": "seller123"
            }
            password = password_map.get(user.username, "unknown")
            f.write(f"{user.username:<15} {user.role.value:<15} {password:<15}\n")
        
        f.write("=" * 60 + "\n\n")
        f.write("URL для входа: http://localhost:8000/docs\n\n")
        f.write("Для тестирования API используйте Swagger UI по адресу выше.\n")
        f.write("Сначала выполните авторизацию через /api/auth/login\n")
        f.write("Затем используйте полученный токен в Authorize (кнопка вверху)\n")
        f.write("\nПример запроса авторизации:\n")
        f.write("POST /api/auth/login\n")
        f.write('{"username": "owner", "password": "owner123"}\n')

def main():
    print("=" * 60)
    print("DATABASE RESET AND USER CREATION SCRIPT")
    print("=" * 60)
    print("\nThis script will:")
    print("1. DROP ALL existing tables (ALL DATA WILL BE LOST!)")
    print("2. CREATE ALL tables with latest schema")
    print("3. Create 3 new users:")
    print("   - owner (password: owner123) - full access")
    print("   - admin (password: admin123) - administrator")
    print("   - seller (password: seller123) - seller")
    print("\nWARNING: This will delete ALL existing data!")
    print("=" * 60)
    
    response = input("\nDo you want to continue? (yes/no): ").strip().lower()
    
    if response not in ['yes', 'y', 'да', 'д']:
        print("Operation cancelled.")
        return
    
    try:
        try:
            drop_all_tables_simple()
        except Exception as e:
            print(f"Simple drop failed, trying manual drop: {e}")
            drop_all_tables()
        
        create_all_tables()
        
        create_initial_users()
        
        print("\n" + "=" * 60)
        print("ИНСТРУКЦИЯ ПО ИСПОЛЬЗОВАНИЮ:")
        print("=" * 60)
        print("\n1. Запустите приложение:")
        print("   uvicorn app.main:app --reload")
        print("\n2. Откройте Swagger UI:")
        print("   http://localhost:8000/docs")
        print("\n3. Авторизуйтесь как владелец:")
        print("   POST /api/auth/login")
        print('   {"username": "owner", "password": "owner123"}')
        print("\n4. Скопируйте access_token из ответа")
        print("\n5. Нажмите 'Authorize' в Swagger UI")
        print("   Введите: Bearer <ваш_токен>")
        print("\n6. Теперь вы можете создавать группы и кусты")
        print("\nСхема таблиц успешно обновлена!")
        print("Колонка admin_id добавлена в таблицу users.")
        
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        print("\nIf you encounter errors, you may need to:")
        print("1. Manually drop tables in pgAdmin or psql:")
        print("   DROP TABLE IF EXISTS users CASCADE;")
        print("   DROP TABLE IF EXISTS groups CASCADE;")
        print("   DROP TABLE IF EXISTS clusters CASCADE;")
        print("   DROP TABLE IF EXISTS products CASCADE;")
        print("   DROP TABLE IF EXISTS reports CASCADE;")
        print("   DROP TABLE IF EXISTS report_products CASCADE;")
        print("\n2. Then run this script again.")

if __name__ == "__main__":
    main()