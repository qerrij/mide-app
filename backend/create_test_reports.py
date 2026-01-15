import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from sqlalchemy import create_engine, text
from app.core.config import settings

def check_database():
    """Простая проверка базы данных без SQLAlchemy моделей"""
    
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        # Проверяем таблицу users
        print("Проверяем таблицу users...")
        try:
            result = conn.execute(text("SELECT username, role::text FROM users ORDER BY id"))
            users = result.fetchall()
            
            if not users:
                print("Таблица users пуста!")
            else:
                print(f"Найдено пользователей: {len(users)}")
                print("\nПользователи:")
                print("-" * 30)
                for username, role in users:
                    print(f"{username}: {role}")
                print("-" * 30)
                
                # Проверяем есть ли ACCOUNTANT
                accountant_exists = any(role == "ACCOUNTANT" for _, role in users)
                print(f"\nРоль ACCOUNTANT в базе: {'ДА' if accountant_exists else 'НЕТ'}")
                
        except Exception as e:
            print(f"Ошибка при чтении users: {e}")
        
        print("\n" + "="*50)
        
        # Проверяем все таблицы
        print("Проверяем все таблицы...")
        try:
            result = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            """))
            tables = result.fetchall()
            
            print(f"Найдено таблиц: {len(tables)}")
            for table in tables:
                table_name = table[0]
                # Считаем записи в каждой таблице
                try:
                    count_result = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
                    count = count_result.scalar()
                    print(f"  {table_name}: {count} записей")
                except:
                    print(f"  {table_name}: (не удалось посчитать)")
                    
        except Exception as e:
            print(f"Ошибка при проверке таблиц: {e}")
        
        print("\n" + "="*50)
        
        # Проверяем тип userrole
        print("Проверяем тип userrole...")
        try:
            result = conn.execute(text("""
                SELECT enumlabel 
                FROM pg_enum 
                JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
                WHERE pg_type.typname = 'userrole'
                ORDER BY enumsortorder
            """))
            enum_values = result.fetchall()
            
            print("Значения enum userrole в базе:")
            for value in enum_values:
                print(f"  - {value[0]}")
                
            # Проверяем есть ли ACCOUNTANT в enum
            accountant_in_enum = any(value[0] == "ACCOUNTANT" for value in enum_values)
            print(f"\nACCOUNTANT в enum: {'ДА' if accountant_in_enum else 'НЕТ'}")
            
        except Exception as e:
            print(f"Ошибка при проверке enum: {e}")

if __name__ == "__main__":
    check_database()