# init_db.py
import sys
import os
from pathlib import Path

# Добавляем корневую директорию проекта в путь
sys.path.append(str(Path(__file__).parent))

# Загружаем переменные окружения из .env файла
from dotenv import load_dotenv

# Указываем путь к .env файлу (если он в корне проекта)
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.category import ProductCategory
from app.models.product import Product
from app.models.cluster import Cluster
from app.models.group import Group
from app.models.company import CompanyBalance, CompanySettings
from app.models.notification import Notification
from app.models.inventory import UserInventory, InventoryReservation
from app.models.rejection import Rejection, RejectionItem
from app.models.report import Report, ReportProduct
from app.models.transfer import Transfer, TransferItem, TransferDiscrepancyItem, TransferApproval
from app.models.revision import Revision, RevisionDiscrepancy, RevisionFilling, RevisionFillingItem


def create_tables_and_owner(database_url: str):
    """
    Создает все таблицы в базе данных и добавляет первого пользователя (owner)
    
    Args:
        database_url: URL подключения к PostgreSQL
                      Пример: 'postgresql://user:password@localhost/dbname'
    """
    try:
        # Создаем engine
        engine = create_engine(
            database_url,
            echo=True,  # Выводить SQL запросы в консоль (можно отключить)
            pool_pre_ping=True  # Проверять соединение перед использованием
        )
        
        print("Подключение к базе данных...")
        
        # Создаем все таблицы
        print("Создание таблиц...")
        Base.metadata.create_all(bind=engine)
        print("✓ Таблицы успешно созданы")
        
        # Создаем сессию
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        try:
            # Проверяем, существует ли уже пользователь с ролью OWNER
            existing_owner = db.query(User).filter(User.role == UserRole.OWNER).first()
            
            if existing_owner:
                print(f"⚠ Пользователь с ролью OWNER уже существует: {existing_owner.username}")
                print("  Создание нового владельца отменено")
            else:
                # Создаем первого пользователя
                print("Создание первого пользователя (owner)...")
                
                owner = User(
                    username="owner",
                    password_hash=get_password_hash("owner123"),
                    full_name="Системный владелец",
                    role=UserRole.OWNER,
                    is_active=True
                )
                
                db.add(owner)
                db.commit()
                db.refresh(owner)
                
                print(f"✓ Пользователь создан:")
                print(f"  - ID: {owner.id}")
                print(f"  - Логин: {owner.username}")
                print(f"  - Пароль: owner123")
                print(f"  - Роль: {owner.role.value}")
                print(f"  - Имя: {owner.full_name}")
            
            print("\nИнициализация базы данных завершена успешно!")
            
        except Exception as e:
            db.rollback()
            print(f"❌ Ошибка при создании пользователя: {e}")
            raise
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Ошибка при инициализации базы данных: {e}")
        raise


def main():
    """
    Основная функция для запуска скрипта
    """
    # Получаем URL базы данных из переменных окружения
    DATABASE_URL = os.getenv("DATABASE_URL")
    
    # Проверяем, загрузилась ли переменная
    if not DATABASE_URL:
        print("❌ Ошибка: DATABASE_URL не найден в переменных окружения")
        print("Проверьте наличие файла .env и переменной DATABASE_URL в нем")
        print("\nПример .env файла:")
        print("DATABASE_URL=postgresql://postgres:postgres@localhost:5432/reports_db")
        return
    
    print("=== Инициализация базы данных ===\n")
    print(f"Подключение к: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else DATABASE_URL}")
    print()
    
    # Запрашиваем подтверждение перед выполнением
    response = input("Вы уверены, что хотите создать таблицы в базе данных? (y/N): ")
    
    if response.lower() not in ['y', 'yes', 'д', 'да']:
        print("Операция отменена")
        return
    
    create_tables_and_owner(DATABASE_URL)


if __name__ == "__main__":
    main()