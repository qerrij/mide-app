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

from sqlalchemy import create_engine, text
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
from app.models.debt import UserDebt, DebtTransaction


def drop_all_tables(engine):
    """Удаляет все таблицы"""
    with engine.connect() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
        conn.commit()


def create_tables_and_owner(database_url: str):
    """Создает все таблицы и добавляет первого пользователя (owner)"""
    engine = create_engine(
        database_url,
        echo=False,
        pool_pre_ping=True
    )
    
    # Удаляем все таблицы
    drop_all_tables(engine)
    
    # Создаем все таблицы
    Base.metadata.create_all(bind=engine)
    
    # Создаем сессию
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Создаем первого пользователя
        owner = User(
            username="owner",
            password_hash=get_password_hash("owner123"),
            full_name="Системный владелец",
            role=UserRole.OWNER,
            is_active=True
        )
        
        db.add(owner)
        db.commit()
        
    except Exception as e:
        db.rollback()
        raise
    finally:
        db.close()


def main():
    DATABASE_URL = os.getenv("DATABASE_URL")
    
    if not DATABASE_URL:
        print("DATABASE_URL not found")
        return
    
    create_tables_and_owner(DATABASE_URL)


if __name__ == "__main__":
    main()