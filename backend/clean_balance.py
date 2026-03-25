import psycopg2
from psycopg2 import sql

DATABASE_URL = "postgresql://user:password@localhost:5432/dbname"

def add_indexes():
    conn = None
    try:
        conn = psycopg2.connect(DATABASE_URL)
        # Отключаем автокоммит
        conn.autocommit = True
        
        # Список индексов для добавления
        indexes = [
            {
                "name": "idx_company_balance_city",
                "columns": ["city"],
                "description": "Для фильтрации по городу"
            },
            {
                "name": "idx_company_balance_created_at",
                "columns": ["created_at"],
                "description": "Для фильтрации по дате и сортировки"
            },
            {
                "name": "idx_company_balance_operation_type",
                "columns": ["operation_type"],
                "description": "Для фильтрации по типу операции"
            },
            {
                "name": "idx_company_balance_city_created",
                "columns": ["city", "created_at"],
                "description": "Составной индекс для фильтрации по городу и дате"
            },
            {
                "name": "idx_company_balance_created_by",
                "columns": ["created_by"],
                "description": "Для фильтрации по создателю"
            },
            {
                "name": "idx_company_balance_reference_type",
                "columns": ["reference_type"],
                "description": "Для фильтрации по типу связанной сущности"
            },
            {
                "name": "idx_company_balance_operation_created",
                "columns": ["operation_type", "created_at"],
                "description": "Составной индекс для фильтрации по типу и дате"
            }
        ]
        
        # Получаем существующие индексы
        with conn.cursor() as cur:
            cur.execute("""
                SELECT indexname 
                FROM pg_indexes 
                WHERE tablename = 'company_balance'
            """)
            existing_indexes = {row[0] for row in cur.fetchall()}
        
        print("Существующие индексы:", existing_indexes)
        print("\n" + "="*60)
        
        # Добавляем индексы (каждый в отдельной транзакции)
        for idx in indexes:
            if idx["name"] in existing_indexes:
                print(f"✓ Индекс {idx['name']} уже существует")
                continue
            
            try:
                with conn.cursor() as cur:
                    columns_str = ", ".join(idx["columns"])
                    create_index_sql = f"CREATE INDEX CONCURRENTLY {idx['name']} ON company_balance ({columns_str})"
                    cur.execute(create_index_sql)
                    print(f"✓ Создан индекс {idx['name']} ({idx['description']})")
            except Exception as e:
                print(f"✗ Ошибка при создании индекса {idx['name']}: {e}")
                continue
        
        # Создаем частичный индекс для доходов от отчетов
        if "idx_company_balance_report_income" not in existing_indexes:
            try:
                with conn.cursor() as cur:
                    cur.execute("""
                        CREATE INDEX CONCURRENTLY idx_company_balance_report_income 
                        ON company_balance (created_at) 
                        WHERE operation_type = 'INCOME' AND reference_type = 'REPORT'
                    """)
                    print("✓ Создан индекс idx_company_balance_report_income (частичный для доходов от отчетов)")
            except Exception as e:
                print(f"✗ Ошибка при создании частичного индекса: {e}")
        
        # Создаем индекс для ускорения расчета баланса по городу
        if "idx_company_balance_city_balance" not in existing_indexes:
            try:
                with conn.cursor() as cur:
                    cur.execute("""
                        CREATE INDEX CONCURRENTLY idx_company_balance_city_balance 
                        ON company_balance (city, id DESC) 
                        WHERE city IS NOT NULL
                    """)
                    print("✓ Создан индекс idx_company_balance_city_balance (для быстрого получения последнего баланса города)")
            except Exception as e:
                print(f"✗ Ошибка при создании индекса city_balance: {e}")
        
        # Создаем индекс для ускорения запросов с балансом
        if "idx_company_balance_balance" not in existing_indexes:
            try:
                with conn.cursor() as cur:
                    cur.execute("""
                        CREATE INDEX CONCURRENTLY idx_company_balance_balance 
                        ON company_balance (balance) 
                        WHERE balance IS NOT NULL
                    """)
                    print("✓ Создан индекс idx_company_balance_balance (для быстрого доступа к балансу)")
            except Exception as e:
                print(f"✗ Ошибка при создании индекса balance: {e}")
        
        print("\n" + "="*60)
        print("Проверка созданных индексов:")
        
        # Показываем все индексы после создания
        with conn.cursor() as cur:
            cur.execute("""
                SELECT indexname, indexdef 
                FROM pg_indexes 
                WHERE tablename = 'company_balance'
                ORDER BY indexname
            """)
            
            for indexname, indexdef in cur.fetchall():
                print(f"\n{indexname}:")
                print(f"  {indexdef[:100]}...")
        
        # Анализируем таблицу для обновления статистики
        print("\n" + "="*60)
        print("Анализируем таблицу для обновления статистики...")
        with conn.cursor() as cur:
            cur.execute("ANALYZE company_balance")
        print("✓ Анализ завершен")
        
        # Показываем размер таблицы
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    pg_size_pretty(pg_total_relation_size('company_balance')) as total_size,
                    pg_size_pretty(pg_relation_size('company_balance')) as table_size,
                    pg_size_pretty(pg_indexes_size('company_balance')) as indexes_size
            """)
            sizes = cur.fetchone()
            print("\n" + "="*60)
            print("РАЗМЕР ТАБЛИЦЫ И ИНДЕКСОВ:")
            print(f"  Общий размер: {sizes[0]}")
            print(f"  Размер данных: {sizes[1]}")
            print(f"  Размер индексов: {sizes[2]}")
        
        # Рекомендации
        print("\n" + "="*60)
        print("РЕКОМЕНДАЦИИ ПО ОПТИМИЗАЦИИ:")
        print("1. Регулярно выполняйте VACUUM ANALYZE для поддержания производительности")
        print("2. Для больших таблиц (>1 млн записей) рассмотрите партиционирование по дате")
        print("3. Мониторьте использование индексов через EXPLAIN ANALYZE")
        print("4. Периодически проверяйте фрагментацию индексов")
        
        # SQL для проверки использования индексов
        print("\n" + "="*60)
        print("SQL ДЛЯ ПРОВЕРКИ ИСПОЛЬЗОВАНИЯ ИНДЕКСОВ:")
        print("""
-- Проверить использование индексов для конкретного запроса
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM company_balance 
WHERE city = 'Петрозаводск' 
AND created_at >= '2026-01-01' 
ORDER BY id DESC 
LIMIT 50;

-- Посмотреть статистику использования индексов
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE tablename = 'company_balance'
ORDER BY idx_scan DESC;

-- Найти неиспользуемые индексы
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan
FROM pg_stat_user_indexes 
WHERE idx_scan = 0 
AND tablename = 'company_balance';
        """)
        
    except Exception as e:
        print(f"Ошибка: {e}")
        raise
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    add_indexes()