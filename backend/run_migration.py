#!/usr/bin/env python3
"""
Скрипт для полного пересоздания всех таблиц базы данных
Запуск: python -m scripts.recreate_all_tables
ВНИМАНИЕ: Все данные будут удалены!
"""

import sys
from pathlib import Path

# Добавляем путь к проекту
project_root = str(Path(__file__).parent.parent)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from sqlalchemy import create_engine, text
from app.core.config import settings
from app.database import Base

# Импортируем все модели напрямую из их файлов
from app.models.user import User
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

import logging

# Отключаем логирование SQLAlchemy
logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

def recreate_all_tables():
    """Полностью пересоздать все таблицы"""
    
    # Подтверждение
    logger.info("⚠️  ВНИМАНИЕ: Это удалит ВСЕ таблицы и ВСЕ данные!")
    confirm = input("Введите 'YES' для подтверждения: ")
    if confirm != "YES":
        logger.info("Операция отменена")
        return
    
    # Подключаемся к базе данных
    db_url = settings.DATABASE_URL
    logger.info(f"Подключение к: {db_url}")
    
    # Создаем engine
    engine = create_engine(db_url)
    
    try:
        # Удаляем все таблицы (с каскадным удалением)
        logger.info("Удаление всех таблиц...")
        
        # Отключаем проверку внешних ключей временно для PostgreSQL
        with engine.connect() as conn:
            conn.execute(text("DROP SCHEMA public CASCADE;"))
            conn.execute(text("CREATE SCHEMA public;"))
            conn.execute(text("GRANT ALL ON SCHEMA public TO public;"))
            conn.commit()
        
        logger.info("✅ Все таблицы удалены")
        
        # Создаем все таблицы заново
        logger.info("Создание таблиц...")
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Все таблицы созданы")
        
        # Создаем первого пользователя (владелец)
        from app.core.security import get_password_hash
        
        with engine.connect() as conn:
            # Начинаем транзакцию
            trans = conn.begin()
            
            try:
                # Создаем владельца
                logger.info("Создание пользователя owner...")
                
                # Хешируем пароль
                password_hash = get_password_hash("owner123")
                
                # Вставляем пользователя
                conn.execute(
                    text("""
                        INSERT INTO users (
                            username, password_hash, full_name, role, 
                            is_active, created_at
                        ) VALUES (
                            'owner', :password_hash, 'Владелец', 'OWNER',
                            true, NOW()
                        )
                    """),
                    {"password_hash": password_hash}
                )
                
                # Получаем ID созданного пользователя
                result = conn.execute(
                    text("SELECT id FROM users WHERE username = 'owner'")
                )
                user_id = result.scalar()
                
                logger.info(f"✅ Пользователь owner создан с ID: {user_id}")
                
                # Подтверждаем транзакцию
                trans.commit()
                
            except Exception as e:
                trans.rollback()
                logger.error(f"❌ Ошибка при создании пользователя: {e}")
                raise
        
        # Проверяем созданные enum
        with engine.connect() as conn:
            # Проверяем reservationstatus
            result = conn.execute(
                text("SELECT enum_range(NULL::reservationstatus);")
            )
            reservation_status = result.scalar()
            logger.info(f"✅ Enum reservationstatus создан: {reservation_status}")
            
            # Проверяем reservationtype
            result = conn.execute(
                text("SELECT enum_range(NULL::reservationtype);")
            )
            reservation_type = result.scalar()
            logger.info(f"✅ Enum reservationtype создан: {reservation_type}")
            
            # Проверяем transferstatus
            result = conn.execute(
                text("SELECT enum_range(NULL::transferstatus);")
            )
            transfer_status = result.scalar()
            logger.info(f"✅ Enum transferstatus создан: {transfer_status}")
            
            # Проверяем transferitemstatus
            result = conn.execute(
                text("SELECT enum_range(NULL::transferitemstatus);")
            )
            transfer_item_status = result.scalar()
            logger.info(f"✅ Enum transferitemstatus создан: {transfer_item_status}")
            
            # Проверяем reportstatus
            result = conn.execute(
                text("SELECT enum_range(NULL::reportstatus);")
            )
            report_status = result.scalar()
            logger.info(f"✅ Enum reportstatus создан: {report_status}")
            
            # Проверяем rejectionstatus
            result = conn.execute(
                text("SELECT enum_range(NULL::rejectionstatus);")
            )
            rejection_status = result.scalar()
            logger.info(f"✅ Enum rejectionstatus создан: {rejection_status}")
            
            # Проверяем revisionstatus
            result = conn.execute(
                text("SELECT enum_range(NULL::revisionstatus);")
            )
            revision_status = result.scalar()
            logger.info(f"✅ Enum revisionstatus создан: {revision_status}")
            
            # Проверяем revisiontype
            result = conn.execute(
                text("SELECT enum_range(NULL::revisiontype);")
            )
            revision_type = result.scalar()
            logger.info(f"✅ Enum revisiontype создан: {revision_type}")
            
            # Проверяем notificationtype
            result = conn.execute(
                text("SELECT enum_range(NULL::notificationtype);")
            )
            notification_type = result.scalar()
            logger.info(f"✅ Enum notificationtype создан: {notification_type}")
            
            # Проверяем notificationstatus
            result = conn.execute(
                text("SELECT enum_range(NULL::notificationstatus);")
            )
            notification_status = result.scalar()
            logger.info(f"✅ Enum notificationstatus создан: {notification_status}")
            
            # Проверяем userrole
            result = conn.execute(
                text("SELECT enum_range(NULL::userrole);")
            )
            user_role = result.scalar()
            logger.info(f"✅ Enum userrole создан: {user_role}")
        
        logger.info("\n✅ Все операции завершены успешно!")
        logger.info("=" * 60)
        logger.info("База данных полностью пересоздана")
        logger.info("Создан пользователь:")
        logger.info("  Логин: owner")
        logger.info("  Пароль: owner123")
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        engine.dispose()

if __name__ == "__main__":
    recreate_all_tables()