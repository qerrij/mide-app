#!/usr/bin/env python3
"""
Скрипт миграции для перехода на новую модель долгов
Очищает старые таблицы и создает новые
Запуск: python migrate_debt.py
"""

import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL not found in .env")
    sys.exit(1)

engine = create_engine(DATABASE_URL)

def migrate():
    try:
        with engine.connect() as conn:
            with conn.begin() as trans:
                # Удаляем старые таблицы
                conn.execute(text("DROP TABLE IF EXISTS debt_transactions CASCADE"))
                conn.execute(text("DROP TABLE IF EXISTS user_debts CASCADE"))
                
                # Создаем таблицу user_debts
                conn.execute(text("""
                    CREATE TABLE user_debts (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                        total_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
                        history JSONB NOT NULL DEFAULT '[]'::jsonb,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    )
                """))
                
                # Создаем таблицу debt_transactions
                conn.execute(text("""
                    CREATE TABLE debt_transactions (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        user_debt_id INTEGER NOT NULL REFERENCES user_debts(id) ON DELETE CASCADE,
                        transaction_type VARCHAR(50) NOT NULL,
                        revision_id INTEGER REFERENCES revisions(id) ON DELETE SET NULL,
                        revision_discrepancy_id INTEGER,
                        manual_amount DOUBLE PRECISION,
                        manual_description VARCHAR(500),
                        performed_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                        amount_change DOUBLE PRECISION NOT NULL,
                        new_total_amount DOUBLE PRECISION NOT NULL,
                        revision_details JSONB,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    )
                """))
                
                # Создаем индексы
                conn.execute(text("CREATE INDEX idx_user_debts_user_id ON user_debts(user_id)"))
                conn.execute(text("CREATE INDEX idx_debt_transactions_user_id ON debt_transactions(user_id)"))
                conn.execute(text("CREATE INDEX idx_debt_transactions_user_debt_id ON debt_transactions(user_debt_id)"))
                conn.execute(text("CREATE INDEX idx_debt_transactions_created_at ON debt_transactions(created_at)"))
                
                trans.commit()
                
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    migrate()