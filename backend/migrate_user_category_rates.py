#!/usr/bin/env python3
"""
Скрипт для генерации большого количества тестовых данных в бухгалтерию
2000 транзакций в день в каждом городе на 6 месяцев
Запуск: python generate_company_data_bulk.py
"""

import os
import sys
import random
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from decimal import Decimal
import math

# Добавляем путь к проекту
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
from sqlalchemy import create_engine, func, Column, Integer, Float, DateTime, String, Text, Boolean, ForeignKey
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.exc import SQLAlchemyError

# Загружаем переменные окружения
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("Ошибка: DATABASE_URL не найден в .env файле")
    sys.exit(1)

# Создаем базовый класс для модели (без связей)
Base = declarative_base()

# Определяем только модель CompanyBalance без связей
class CompanyBalance(Base):
    __tablename__ = "company_balance"
    
    id = Column(Integer, primary_key=True, index=True)
    balance = Column(Float, nullable=False, default=0.0)
    city_balance = Column(Float, nullable=True)
    description = Column(String(255), nullable=True)
    operation_type = Column(String(50), nullable=False)
    amount = Column(Float, nullable=False)
    reference_id = Column(Integer, nullable=True)
    reference_type = Column(String(50), nullable=True)
    city = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, nullable=True)

# Конфигурация
MONTHS = 6
TRANSACTIONS_PER_DAY_PER_CITY = 2000  # 2000 транзакций в день в каждом городе
START_DATE = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0) - timedelta(days=30 * MONTHS)

# Города
CITIES = ['Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань', 'Нижний Новгород']

# Типы операций и их вероятности (%)
OPERATION_PROBABILITIES = {
    'INCOME': 45,   # 45% доходов
    'EXPENSE': 55   # 55% расходов
}

# Вероятности reference_type для доходов
INCOME_REFERENCE_PROBABILITIES = {
    None: 50,           # 50% обычные доходы
    'REPORT': 30,       # 30% доходы от отчетов
    'DEBT_WRITEOFF': 20 # 20% списание долгов
}

# Вероятности reference_type для расходов
EXPENSE_REFERENCE_PROBABILITIES = {
    None: 15,
    'SALARY': 35,
    'RENT': 20,
    'TAX': 15,
    'EQUIPMENT': 10,
    'OTHER': 5
}

# Диапазоны сумм (в рублях)
AMOUNT_RANGES = {
    'INCOME': {
        None: (100, 50000),
        'REPORT': (500, 200000),
        'DEBT_WRITEOFF': (100, 30000)
    },
    'EXPENSE': {
        None: (50, 20000),
        'SALARY': (5000, 150000),
        'RENT': (1000, 100000),
        'TAX': (500, 50000),
        'EQUIPMENT': (500, 100000),
        'OTHER': (100, 15000)
    }
}

# Шаблоны описаний
DESCRIPTION_TEMPLATES = {
    'INCOME': {
        None: [
            "Оплата от клиента #{num}",
            "Поступление средств #{num}",
            "Возврат займа #{num}",
            "Прочий доход #{num}",
            "Банковский перевод #{num}"
        ],
        'REPORT': [
            "Доход от отчета #{num}",
            "Выручка по отчету #{num}",
            "Комиссия от отчета #{num}",
            "Оплата по счету #{num}"
        ],
        'DEBT_WRITEOFF': [
            "Списание долга пользователя #{num}",
            "Погашение задолженности #{num}",
            "Возврат долга #{num}",
            "Урегулирование задолженности #{num}"
        ]
    },
    'EXPENSE': {
        None: [
            "Прочий расход #{num}",
            "Непредвиденные расходы #{num}",
            "Хозяйственные нужды #{num}"
        ],
        'SALARY': [
            "Зарплата сотрудникам #{num}",
            "Аванс #{num}",
            "Премия #{num}",
            "Оплата труда #{num}"
        ],
        'RENT': [
            "Аренда офиса #{num}",
            "Аренда склада #{num}",
            "Коммунальные платежи #{num}",
            "Аренда помещения #{num}"
        ],
        'TAX': [
            "Налоговые отчисления #{num}",
            "НДС #{num}",
            "Страховые взносы #{num}",
            "Налог на прибыль #{num}"
        ],
        'EQUIPMENT': [
            "Закупка оборудования #{num}",
            "Ремонт техники #{num}",
            "Расходные материалы #{num}",
            "Обслуживание оборудования #{num}"
        ],
        'OTHER': [
            "Канцелярия #{num}",
            "Транспортные расходы #{num}",
            "Связь и интернет #{num}",
            "Обучение персонала #{num}"
        ]
    }
}

def get_random_amount(operation_type: str, reference_type: Optional[str] = None) -> float:
    """Получение случайной суммы с логнормальным распределением"""
    ranges = AMOUNT_RANGES[operation_type].get(reference_type, AMOUNT_RANGES[operation_type][None])
    min_amount, max_amount = ranges
    
    # Используем логнормальное распределение для более реалистичных сумм
    mu = math.log(min_amount + (max_amount - min_amount) * 0.1)
    sigma = 1.5
    amount = math.exp(random.gauss(mu, sigma))
    
    # Ограничиваем диапазоном
    amount = max(min_amount, min(amount, max_amount))
    
    # Округляем до рублей
    return round(amount, 2)

def get_random_description(operation_type: str, reference_type: Optional[str] = None, num: int = None) -> str:
    """Получение случайного описания"""
    if num is None:
        num = random.randint(1, 999999)
    
    templates = DESCRIPTION_TEMPLATES[operation_type].get(reference_type, DESCRIPTION_TEMPLATES[operation_type][None])
    template = random.choice(templates)
    return template.format(num=num)

def get_operation_type() -> str:
    """Определение типа операции на основе вероятностей"""
    rand = random.randint(1, 100)
    if rand <= OPERATION_PROBABILITIES['INCOME']:
        return 'INCOME'
    else:
        return 'EXPENSE'

def get_reference_type(operation_type: str) -> Optional[str]:
    """Определение reference_type на основе вероятностей"""
    if operation_type == 'INCOME':
        probs = INCOME_REFERENCE_PROBABILITIES
    else:
        probs = EXPENSE_REFERENCE_PROBABILITIES
    
    rand = random.randint(1, 100)
    cumulative = 0
    for ref_type, prob in probs.items():
        cumulative += prob
        if rand <= cumulative:
            return ref_type
    return None

def get_users_ids(db: Session) -> List[int]:
    """Получение списка ID пользователей"""
    try:
        # Пытаемся получить пользователей из таблицы users
        from sqlalchemy import text
        result = db.execute(text("SELECT id FROM users WHERE is_active = true LIMIT 50"))
        users_ids = [row[0] for row in result.fetchall()]
        return users_ids
    except Exception as e:
        print(f"Предупреждение: Не удалось получить пользователей: {e}")
        return []

def generate_transactions_for_city_day(
    city: str,
    date: datetime,
    users_ids: List[int],
    current_global_balance: float,
    current_city_balance: float,
    day_offset: int
) -> tuple[List[Dict[str, Any]], float, float]:
    """
    Генерация транзакций для одного города за один день
    Возвращает: (список_транзакций, новый_глобальный_баланс, новый_баланс_города)
    """
    transactions = []
    city_balance = current_city_balance
    global_balance = current_global_balance
    
    for i in range(TRANSACTIONS_PER_DAY_PER_CITY):
        # Определяем тип операции
        operation_type = get_operation_type()
        reference_type = get_reference_type(operation_type)
        
        # Получаем сумму
        amount = get_random_amount(operation_type, reference_type)
        
        # Для расходов проверяем достаточно ли средств
        if operation_type == 'EXPENSE':
            # Проверяем баланс города и глобальный
            if city_balance < amount and global_balance < amount:
                # Если недостаточно средств, делаем доход, чтобы пополнить баланс
                operation_type = 'INCOME'
                reference_type = None
                amount = get_random_amount('INCOME', None)
        
        # Получаем описание
        unique_num = day_offset * 10000 + i + hash(city) % 10000
        description = get_random_description(operation_type, reference_type, unique_num)
        
        # Получаем пользователя, который создал операцию
        created_by = random.choice(users_ids) if users_ids and random.random() < 0.8 else None
        
        # Обновляем балансы
        if operation_type == 'INCOME':
            global_balance += amount
            city_balance += amount
        else:  # EXPENSE
            global_balance -= amount
            city_balance -= amount
        
        # Создаем транзакцию
        transaction = {
            'balance': global_balance,
            'city_balance': city_balance,
            'description': description,
            'operation_type': operation_type,
            'amount': amount,
            'reference_id': random.randint(1, 100000) if reference_type else None,
            'reference_type': reference_type,
            'created_by': created_by,
            'city': city,
            'created_at': date + timedelta(
                hours=random.randint(8, 22),
                minutes=random.randint(0, 59),
                seconds=random.randint(0, 59),
                microseconds=random.randint(0, 999999)
            )
        }
        transactions.append(transaction)
    
    return transactions, global_balance, city_balance

def generate_company_data():
    """Основная функция генерации данных"""
    print("=" * 80)
    print("ГЕНЕРАЦИЯ ТЕСТОВЫХ ДАННЫХ ДЛЯ БУХГАЛТЕРИИ")
    print("=" * 80)
    print(f"Города: {', '.join(CITIES)}")
    print(f"Транзакций в день в каждом городе: {TRANSACTIONS_PER_DAY_PER_CITY}")
    print(f"Всего транзакций в день: {TRANSACTIONS_PER_DAY_PER_CITY * len(CITIES)}")
    print(f"Период: {START_DATE.strftime('%d.%m.%Y')} - {datetime.now().strftime('%d.%m.%Y')}")
    print(f"Всего дней: {(datetime.now() - START_DATE).days}")
    print("=" * 80)
    
    # Создаем сессию
    engine = create_engine(DATABASE_URL, pool_size=10, max_overflow=20)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        # Создаем таблицу если не существует
        Base.metadata.create_all(engine)
        
        # Получаем пользователей
        users_ids = get_users_ids(db)
        if not users_ids:
            print("Предупреждение: В системе нет активных пользователей. created_by будет NULL")
        
        # Очищаем существующие данные
        confirm = input("\nУдалить существующие данные из company_balance? (y/n): ")
        if confirm.lower() == 'y':
            deleted_count = db.query(CompanyBalance).delete()
            db.commit()
            print(f"Удалено {deleted_count} существующих транзакций")
        
        # Инициализируем балансы для каждого города
        global_balance = 0.0
        city_balances = {city: 0.0 for city in CITIES}
        
        # Статистика
        total_transactions = 0
        stats_by_type = {
            'INCOME': {'count': 0, 'amount': 0.0, 'by_reference': {}},
            'EXPENSE': {'count': 0, 'amount': 0.0, 'by_reference': {}}
        }
        
        # Генерация данных по дням
        current_date = START_DATE
        end_date = datetime.now()
        day_count = 0
        
        print("\nНачинаем генерацию...")
        print("-" * 80)
        
        # Для оптимизации используем batch insert
        batch_size = 10000
        transaction_batch = []
        
        while current_date <= end_date:
            day_start_balance = global_balance
            day_transactions_count = 0
            
            # Генерируем транзакции для каждого города в этот день
            for city in CITIES:
                transactions, new_global_balance, new_city_balance = generate_transactions_for_city_day(
                    city, current_date, users_ids, global_balance, city_balances[city], day_count
                )
                
                # Добавляем транзакции в батч
                transaction_batch.extend(transactions)
                global_balance = new_global_balance
                city_balances[city] = new_city_balance
                day_transactions_count += len(transactions)
                
                # Обновляем статистику
                for trans in transactions:
                    op_type = trans['operation_type']
                    ref_type = trans['reference_type'] or 'REGULAR'
                    
                    stats_by_type[op_type]['count'] += 1
                    stats_by_type[op_type]['amount'] += trans['amount']
                    
                    if ref_type not in stats_by_type[op_type]['by_reference']:
                        stats_by_type[op_type]['by_reference'][ref_type] = {'count': 0, 'amount': 0.0}
                    stats_by_type[op_type]['by_reference'][ref_type]['count'] += 1
                    stats_by_type[op_type]['by_reference'][ref_type]['amount'] += trans['amount']
            
            total_transactions += day_transactions_count
            
            # Сохраняем батч если накопилось достаточно
            if len(transaction_batch) >= batch_size:
                db.bulk_insert_mappings(CompanyBalance, transaction_batch)
                db.commit()
                print(f"  Сохранено {len(transaction_batch)} транзакций. Баланс: {global_balance:,.2f} ₽")
                transaction_batch = []
            
            # Выводим прогресс каждый день
            if day_count % 10 == 0 or day_count == 0:
                print(f"{current_date.strftime('%d.%m.%Y')}: "
                      f"{day_transactions_count} операций, "
                      f"баланс: {global_balance:,.2f} ₽, "
                      f"изменение: {global_balance - day_start_balance:+,.2f} ₽")
            
            current_date += timedelta(days=1)
            day_count += 1
        
        # Сохраняем оставшиеся транзакции
        if transaction_batch:
            db.bulk_insert_mappings(CompanyBalance, transaction_batch)
            db.commit()
            print(f"\nСохранено последних {len(transaction_batch)} транзакций")
        
        # Выводим финальную статистику
        print("\n" + "=" * 80)
        print("СТАТИСТИКА ГЕНЕРАЦИИ")
        print("=" * 80)
        print(f"Всего дней: {day_count}")
        print(f"Всего транзакций: {total_transactions:,}")
        print(f"Среднее в день: {total_transactions // day_count:,}")
        print(f"\nИтоговый глобальный баланс: {global_balance:,.2f} ₽")
        
        print("\n" + "-" * 80)
        print("БАЛАНСЫ ПО ГОРОДАМ:")
        print("-" * 80)
        for city, balance in city_balances.items():
            print(f"  {city}: {balance:,.2f} ₽")
        
        print("\n" + "-" * 80)
        print("СТАТИСТИКА ПО ТИПАМ ОПЕРАЦИЙ:")
        print("-" * 80)
        
        for op_type in ['INCOME', 'EXPENSE']:
            print(f"\n{op_type}:")
            print(f"  Всего: {stats_by_type[op_type]['count']:,} операций на сумму {stats_by_type[op_type]['amount']:,.2f} ₽")
            print(f"  По типам:")
            for ref_type, data in stats_by_type[op_type]['by_reference'].items():
                print(f"    {ref_type}: {data['count']:,} операций, {data['amount']:,.2f} ₽")
        
        # Статистика по городам из БД
        print("\n" + "-" * 80)
        print("СТАТИСТИКА ПО ГОРОДАМ (ИЗ БД):")
        print("-" * 80)
        
        city_stats = db.query(
            CompanyBalance.city,
            func.count(CompanyBalance.id).label('count'),
            func.sum(CompanyBalance.amount).label('total')
        ).filter(
            CompanyBalance.city.isnot(None)
        ).group_by(
            CompanyBalance.city
        ).all()
        
        for stat in city_stats:
            print(f"  {stat.city}: {stat.count:,} операций, {stat.total:,.2f} ₽")
        
        print("\n" + "=" * 80)
        print("ГЕНЕРАЦИЯ УСПЕШНО ЗАВЕРШЕНА!")
        print("=" * 80)
        
    except SQLAlchemyError as e:
        print(f"\nОшибка при работе с базой данных: {e}")
        db.rollback()
        sys.exit(1)
    except Exception as e:
        print(f"\nНеожиданная ошибка: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    generate_company_data()