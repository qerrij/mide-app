"""
Скрипт для создания таблицы refresh_tokens
Запуск: python scripts/create_refresh_tokens_table.py
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")


def create_refresh_tokens_table():
    engine = create_engine(DATABASE_URL)
    
    try:
        with engine.connect() as conn:
            # Создаем таблицу refresh_tokens
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS refresh_tokens (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    token VARCHAR NOT NULL UNIQUE,
                    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                    is_revoked BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    revoked_at TIMESTAMP WITH TIME ZONE
                )
            """))
            
            # Создаем индекс для быстрого поиска по токену
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_refresh_tokens_token ON refresh_tokens(token)
            """))
            
            # Создаем индекс для поиска по user_id
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_refresh_tokens_user_id ON refresh_tokens(user_id)
            """))
            
            conn.commit()
            
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    create_refresh_tokens_table()