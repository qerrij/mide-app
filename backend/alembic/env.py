# alembic/env.py
import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# Добавляем путь к корню проекта
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

# Импортируем все модели
from app.database import Base
from app.models.user import User
from app.models.product import Product
from app.models.category import ProductCategory
from app.models.group import Group
from app.models.cluster import Cluster
from app.models.report import Report, ReportProduct
from app.models.revision import Revision, RevisionDiscrepancy, RevisionFilling, RevisionFillingItem
from app.models.transfer import Transfer, TransferItem, TransferDiscrepancyItem, TransferApproval
from app.models.notification import Notification
from app.models.rejection import Rejection, RejectionItem
from app.models.inventory import UserInventory
from app.models.company import CompanyBalance, CompanySettings

# this is the Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# target_metadata для автогенерации
target_metadata = Base.metadata

# Другие значения из конфига
# my_important_option = config.get_main_option("my_important_option")

def get_url():
    """Получаем URL базы данных из alembic.ini"""
    return config.get_main_option("sqlalchemy.url")

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,  # Сравнивать типы колонок
        compare_server_default=True,  # Сравнивать значения по умолчанию
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = get_url()
    
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()