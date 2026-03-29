#!/usr/bin/env python3
"""
Скрипт для добавления новых полей в таблицу products:
- default_rate (FLOAT, DEFAULT 0.0)
- city (VARCHAR(255))
- уникальное ограничение (sku, city)
"""

import os
import sys
from dotenv import load_dotenv
import psycopg2
from psycopg2 import sql
from psycopg2.extras import DictCursor

# Загружаем переменные окружения
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def run_migration():
    if not DATABASE_URL:
        print("❌ DATABASE_URL не найден в .env файле")
        sys.exit(1)
    
    try:
        # Подключаемся к базе данных
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = False
        cursor = conn.cursor()
        
        # Проверяем существование таблицы products
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'products'
            );
        """)
        
        if not cursor.fetchone()[0]:
            print("❌ Таблица 'products' не существует")
            conn.close()
            sys.exit(1)
        
        # Добавляем поле default_rate
        cursor.execute("""
            DO $$ 
            BEGIN
                BEGIN
                    ALTER TABLE products ADD COLUMN default_rate FLOAT;
                EXCEPTION
                    WHEN duplicate_column THEN 
                        RAISE NOTICE 'Column default_rate already exists';
                END;
            END $$;
        """)
        
        # Устанавливаем значение по умолчанию для default_rate
        cursor.execute("""
            ALTER TABLE products ALTER COLUMN default_rate SET DEFAULT 0.0;
        """)
        
        # Добавляем поле city
        cursor.execute("""
            DO $$ 
            BEGIN
                BEGIN
                    ALTER TABLE products ADD COLUMN city VARCHAR(255);
                EXCEPTION
                    WHEN duplicate_column THEN 
                        RAISE NOTICE 'Column city already exists';
                END;
            END $$;
        """)
        
        # Проверяем существование уникального ограничения
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1 FROM pg_constraint 
                WHERE conname = 'uq_product_sku_city'
            );
        """)
        
        constraint_exists = cursor.fetchone()[0]
        
        if not constraint_exists:
            # Сначала удаляем возможные дубликаты перед созданием ограничения
            cursor.execute("""
                WITH duplicates AS (
                    SELECT id, sku, city,
                           ROW_NUMBER() OVER (
                               PARTITION BY sku, COALESCE(city, '')
                               ORDER BY id
                           ) as rn
                    FROM products
                )
                DELETE FROM products
                WHERE id IN (
                    SELECT id FROM duplicates WHERE rn > 1
                );
            """)
            
            # Создаем уникальное ограничение
            cursor.execute("""
                ALTER TABLE products 
                ADD CONSTRAINT uq_product_sku_city 
                UNIQUE (sku, city);
            """)
        
        # Обновляем существующие записи, если city NULL
        cursor.execute("""
            UPDATE products 
            SET city = NULL 
            WHERE city IS NULL;
        """)
        
        # Фиксируем изменения
        conn.commit()
        
        # Выводим информацию о структуре таблицы
        cursor.execute("""
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default
            FROM information_schema.columns
            WHERE table_name = 'products'
            ORDER BY ordinal_position;
        """)
        
        columns = cursor.fetchall()
        
        # Закрываем соединение
        cursor.close()
        conn.close()
        
        print("✅ Миграция успешно выполнена!")
        print("\nТекущая структура таблицы products:")
        print("-" * 80)
        print(f"{'Column':<25} {'Type':<20} {'Nullable':<10} {'Default':<20}")
        print("-" * 80)
        
        for col in columns:
            col_name = col[0]
            col_type = col[1]
            nullable = "YES" if col[2] == "YES" else "NO"
            default = col[3] or "NULL"
            if default and len(default) > 20:
                default = default[:17] + "..."
            print(f"{col_name:<25} {col_type:<20} {nullable:<10} {default:<20}")
        
        print("-" * 80)
        
    except Exception as e:
        print(f"❌ Ошибка при выполнении миграции: {str(e)}")
        if 'conn' in locals():
            conn.rollback()
        sys.exit(1)

if __name__ == "__main__":
    run_migration()