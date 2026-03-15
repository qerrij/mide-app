# clean_company_balance.py
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

# Получаем URL базы данных из переменных окружения
# Обычно это что-то вроде: postgresql://user:password@localhost/dbname
DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    # Если переменная не найдена, можно указать вручную или использовать стандартную
    # DATABASE_URL = "postgresql://postgres:password@localhost/your_database"
    raise ValueError("DATABASE_URL не найден в переменных окружения")

def clean_company_balance():
    """Очищает таблицу company_balance и сбрасывает баланс"""
    
    # Создаем подключение к базе данных
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # Начинаем транзакцию
        with session.begin():
            # Удаляем все записи из company_balance
            result = session.execute(text("DELETE FROM company_balance"))
            deleted_count = result.rowcount
            
            # Сбрасываем последовательность ID (для PostgreSQL)
            session.execute(text("ALTER SEQUENCE IF EXISTS company_balance_id_seq RESTART WITH 1"))
            
            # Для SQLite нужно использовать другой подход
            # session.execute(text("DELETE FROM sqlite_sequence WHERE name='company_balance'"))
            
        print(f"✅ Таблица company_balance очищена. Удалено записей: {deleted_count}")
        
    except Exception as e:
        print(f"❌ Ошибка при очистке таблицы: {e}")
        session.rollback()
        raise
    finally:
        session.close()

def clean_company_balance_safe():
    """Безопасная очистка с подтверждением"""
    
    print("ВНИМАНИЕ! Это удалит ВСЕ записи из таблицы company_balance!")
    response = input("Вы уверены? (да/нет): ").lower()
    
    if response in ['да', 'yes', 'y', 'д']:
        clean_company_balance()
    else:
        print("❌ Операция отменена")

def reset_company_balance_to_zero():
    """Создает начальную запись с балансом 0"""
    
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # Проверяем, есть ли уже записи
        result = session.execute(text("SELECT COUNT(*) FROM company_balance")).scalar()
        
        if result == 0:
            # Создаем начальную запись с балансом 0
            session.execute(
                text("""
                    INSERT INTO company_balance (balance, description, operation_type, amount, created_at)
                    VALUES (0, 'Начальный баланс', 'CORRECTION', 0, CURRENT_TIMESTAMP)
                """)
            )
            session.commit()
            print("✅ Создана начальная запись с балансом 0")
        else:
            print("⚠️ В таблице уже есть записи, начальная запись не создана")
            
    except Exception as e:
        print(f"❌ Ошибка при создании начальной записи: {e}")
        session.rollback()
        raise
    finally:
        session.close()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--force":
        # Принудительная очистка без подтверждения
        clean_company_balance()
        reset_company_balance_to_zero()
    else:
        # Обычный режим с подтверждением
        clean_company_balance_safe()
        
        if input("\nСоздать начальную запись с балансом 0? (да/нет): ").lower() in ['да', 'yes', 'y', 'д']:
            reset_company_balance_to_zero()