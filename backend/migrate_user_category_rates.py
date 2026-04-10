#!/usr/bin/env python3
import os
import sys
from dotenv import load_dotenv
import psycopg2
from passlib.context import CryptContext

# Загружаем переменные из .env
load_dotenv()

# Настройки для хеширования пароля (такие же как в security.py)
pwd_context = CryptContext(
    schemes=["sha256_crypt", "md5_crypt", "des_crypt"],
    deprecated="auto",
    sha256_crypt__default_rounds=29000,
)

def get_password_hash(password: str) -> str:
    if len(password) > 128:
        password = password[:128]
    return pwd_context.hash(password)

def create_owner_user():
    DATABASE_URL = os.getenv('DATABASE_URL')
    
    if not DATABASE_URL:
        print("Ошибка: DATABASE_URL не найден в .env файле", file=sys.stderr)
        sys.exit(1)
    
    # Данные для создания пользователя
    username = "owner"
    password = "owner123"
    full_name = "Владелец системы"
    role = "OWNER"
    
    conn = None
    try:
        # Подключаемся к БД
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Проверяем, существует ли уже пользователь с таким именем
        cursor.execute("SELECT id FROM users WHERE username = %s AND is_active = true;", (username,))
        existing_user = cursor.fetchone()
        
        if existing_user:
            print(f"Пользователь с логином '{username}' уже существует (ID: {existing_user[0]})")
            sys.exit(0)
        
        # Хешируем пароль
        password_hash = get_password_hash(password)
        
        # Создаем пользователя
        cursor.execute("""
            INSERT INTO users (
                username, 
                password_hash, 
                full_name, 
                role, 
                is_active, 
                rate,
                created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, NOW())
            RETURNING id;
        """, (username, password_hash, full_name, role, True, 0.0))
        
        user_id = cursor.fetchone()[0]
        
        print(f"✅ Пользователь успешно создан!")
        print(f"   ID: {user_id}")
        print(f"   Логин: {username}")
        print(f"   Пароль: {password}")
        print(f"   ФИО: {full_name}")
        print(f"   Роль: {role}")
        
        sys.exit(0)
        
    except psycopg2.Error as e:
        print(f"Ошибка БД: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Ошибка: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        if conn:
            cursor.close()
            conn.close()

if __name__ == "__main__":
    create_owner_user()