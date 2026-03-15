# populate_test_data.py
import random
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

# Получаем URL базы данных
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise ValueError("DATABASE_URL не найден в переменных окружения")

# Подключаемся к базе данных
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

def create_test_transactions():
    """Создает тестовые транзакции за последние 2 месяца"""
    
    # Начальный баланс
    current_balance = 10000.0
    
    # Создаем первую запись (начальный баланс)
    start_date = datetime.now() - timedelta(days=60)
    start_date = start_date.replace(hour=10, minute=0, second=0, microsecond=0)
    
    initial_transaction = {
        'balance': current_balance,
        'description': 'Начальный баланс',
        'operation_type': 'CORRECTION',
        'amount': 10000,
        'created_at': start_date
    }
    
    # Список для хранения всех транзакций
    transactions = [initial_transaction]
    
    # Генерируем транзакции за 60 дней
    current_date = start_date + timedelta(days=1)
    end_date = datetime.now()
    
    # Описания для транзакций
    income_descriptions = [
        'Оплата от клиента', 'Поступление на счет', 'Пополнение баланса',
        'Возврат товара', 'Авансовый платеж', 'Оплата по договору',
        'Поступление от партнера', 'Продажа товара', 'Оказание услуг',
        'Предоплата за заказ', 'Консультационные услуги', 'Лицензионные платежи'
    ]
    
    expense_descriptions = [
        'Аренда помещения', 'Заработная плата', 'Закупка товара',
        'Оплата налогов', 'Коммунальные услуги', 'Интернет и связь',
        'Транспортные расходы', 'Канцелярские товары', 'Реклама',
        'Обслуживание оборудования', 'Программное обеспечение',
        'Банковская комиссия', 'Хостинг и сервера', 'Юридические услуги',
        'Офисные расходы', 'Командировочные расходы', 'Обучение сотрудников'
    ]
    
    # Генерируем 2-5 транзакций в день
    day_count = 0
    while current_date <= end_date:
        # Количество транзакций в день (от 2 до 5)
        num_transactions = random.randint(2, 5)
        
        for i in range(num_transactions):
            # Случайное время в течение дня
            hour = random.randint(9, 20)
            minute = random.randint(0, 59)
            second = random.randint(0, 59)
            transaction_date = current_date.replace(
                hour=hour, 
                minute=minute, 
                second=second,
                microsecond=0
            )
            
            # Определяем тип операции (55% доход, 45% расход)
            is_income = random.random() < 0.55
            
            if is_income:
                # Доход: случайная сумма от 500 до 20000
                amount = round(random.uniform(500, 20000), 2)
                description = random.choice(income_descriptions)
                operation_type = 'INCOME'
                current_balance += amount
            else:
                # Расход: случайная сумма от 200 до 15000, но не больше баланса
                max_expense = min(15000, current_balance * 0.7)  # Не более 70% текущего баланса
                if max_expense < 200:
                    continue  # Пропускаем, если баланс слишком мал
                    
                amount = round(random.uniform(200, max_expense), 2)
                description = random.choice(expense_descriptions)
                operation_type = 'EXPENSE'
                current_balance -= amount
            
            # Добавляем транзакцию
            transactions.append({
                'balance': round(current_balance, 2),
                'description': description,
                'operation_type': operation_type,
                'amount': round(amount, 2),
                'created_at': transaction_date
            })
        
        current_date += timedelta(days=1)
        day_count += 1
        
        if day_count % 10 == 0:
            print(f"   Сгенерировано {len(transactions)} транзакций за {day_count} дней...")
    
    # Добавляем несколько крупных транзакций в определенные дни
    special_dates = [
        (15, 50000, 'Крупный заказ от ООО "Ромашка"', 'INCOME'),
        (20, 35000, 'Аренда офиса за квартал', 'EXPENSE'),
        (25, 45000, 'Зарплата сотрудникам', 'EXPENSE'),
        (30, 75000, 'Годовой контракт с ООО "ТехноСервис"', 'INCOME'),
        (10, 25000, 'Закупка оборудования', 'EXPENSE'),
        (5, 30000, 'Предоплата от клиента', 'INCOME'),
    ]
    
    for day_offset, amount, desc, op_type in special_dates:
        special_date = end_date - timedelta(days=day_offset)
        special_date = special_date.replace(hour=14, minute=0, second=0, microsecond=0)
        
        if special_date > start_date:
            if op_type == 'INCOME':
                current_balance += amount
            else:
                current_balance -= amount
            
            transactions.append({
                'balance': round(current_balance, 2),
                'description': desc,
                'operation_type': op_type,
                'amount': amount,
                'created_at': special_date
            })
    
    # Сортируем транзакции по дате
    transactions.sort(key=lambda x: x['created_at'])
    
    # Пересчитываем баланс последовательно для точности
    running_balance = 10000.0
    for i, trans in enumerate(transactions):
        if i == 0:
            trans['balance'] = running_balance
        else:
            if trans['operation_type'] == 'INCOME':
                running_balance += trans['amount']
            elif trans['operation_type'] == 'EXPENSE':
                running_balance -= trans['amount']
            else:  # CORRECTION
                running_balance = trans['amount']
            trans['balance'] = round(running_balance, 2)
    
    return transactions

def insert_transactions(transactions):
    """Вставляет транзакции в базу данных"""
    
    print(f"\n📝 Вставляем {len(transactions)} транзакций в базу данных...")
    
    for i, trans in enumerate(transactions):
        session.execute(
            text("""
                INSERT INTO company_balance 
                (balance, description, operation_type, amount, created_at)
                VALUES (:balance, :description, :operation_type, :amount, :created_at)
            """),
            {
                'balance': trans['balance'],
                'description': trans['description'],
                'operation_type': trans['operation_type'],
                'amount': trans['amount'],
                'created_at': trans['created_at']
            }
        )
        
        if (i + 1) % 50 == 0:
            print(f"   Вставлено {i + 1} транзакций...")
            session.commit()
    
    session.commit()
    print(f"✅ Успешно вставлено {len(transactions)} транзакций")

def print_statistics(transactions):
    """Выводит статистику по сгенерированным данным"""
    
    income_count = sum(1 for t in transactions if t['operation_type'] == 'INCOME')
    expense_count = sum(1 for t in transactions if t['operation_type'] == 'EXPENSE')
    correction_count = sum(1 for t in transactions if t['operation_type'] == 'CORRECTION')
    
    total_income = sum(t['amount'] for t in transactions if t['operation_type'] == 'INCOME')
    total_expense = sum(t['amount'] for t in transactions if t['operation_type'] == 'EXPENSE')
    
    start_date = min(t['created_at'] for t in transactions)
    end_date = max(t['created_at'] for t in transactions)
    days_span = (end_date - start_date).days
    
    print("\n" + "="*50)
    print("📊 СТАТИСТИКА СГЕНЕРИРОВАННЫХ ДАННЫХ")
    print("="*50)
    print(f"   Период: {start_date.strftime('%d.%m.%Y')} - {end_date.strftime('%d.%m.%Y')}")
    print(f"   Дней: {days_span}")
    print(f"   Всего транзакций: {len(transactions)}")
    print(f"   Доходов: {income_count} ({income_count/len(transactions)*100:.1f}%)")
    print(f"   Расходов: {expense_count} ({expense_count/len(transactions)*100:.1f}%)")
    print(f"   Коррекций: {correction_count}")
    print(f"   Общая сумма доходов: {total_income:,.2f} ₽")
    print(f"   Общая сумма расходов: {total_expense:,.2f} ₽")
    print(f"   Конечный баланс: {transactions[-1]['balance']:,.2f} ₽")
    
    # Группировка по дням
    from collections import defaultdict
    daily_counts = defaultdict(int)
    for t in transactions:
        day = t['created_at'].date()
        daily_counts[day] += 1
    
    avg_per_day = len(transactions) / len(daily_counts)
    print(f"   Среднее транзакций в день: {avg_per_day:.1f}")
    print(f"   Максимум в день: {max(daily_counts.values())}")
    print(f"   Минимум в день: {min(daily_counts.values())}")
    print("="*50)

def clear_table():
    """Очищает таблицу company_balance"""
    print("\n🧹 Очищаем таблицу company_balance...")
    session.execute(text("DELETE FROM company_balance"))
    
    # Для PostgreSQL
    session.execute(text("ALTER SEQUENCE IF EXISTS company_balance_id_seq RESTART WITH 1"))
    
    # Для SQLite (раскомментировать если нужно)
    # session.execute(text("DELETE FROM sqlite_sequence WHERE name='company_balance'"))
    
    session.commit()
    print("✅ Таблица очищена")

if __name__ == "__main__":
    print("🔄 Генерация тестовых данных...")
    print("="*50)
    
    try:
        # Генерируем транзакции
        transactions = create_test_transactions()
        
        # Выводим статистику
        print_statistics(transactions)
        
        # Спрашиваем подтверждение
        print("\n⚠️  Будет очищена таблица company_balance и добавлены новые данные!")
        response = input("Продолжить? (да/нет): ").lower()
        
        if response in ['да', 'yes', 'y', 'д']:
            # Очищаем таблицу
            clear_table()
            
            # Вставляем в базу
            insert_transactions(transactions)
            
            # Показываем несколько примеров
            print("\n📝 ПРИМЕРЫ ПОСЛЕДНИХ ТРАНЗАКЦИЙ:")
            print("-" * 70)
            print(f"{'Дата и время':<20} {'Тип':<8} {'Сумма':>12} {'Баланс':>12} {'Описание'}")
            print("-" * 70)
            
            for trans in sorted(transactions, key=lambda x: x['created_at'], reverse=True)[:10]:
                date_str = trans['created_at'].strftime('%d.%m.%Y %H:%M')
                sign = '+' if trans['operation_type'] == 'INCOME' else '-' if trans['operation_type'] == 'EXPENSE' else '±'
                print(f"{date_str:<20} {trans['operation_type']:<8} {sign}{trans['amount']:>11,.2f} ₽ {trans['balance']:>11,.2f} ₽ {trans['description'][:30]}")
            print("-" * 70)
            
            print("\n✅ Готово! Теперь вы можете проверить график на фронтенде.")
            
        else:
            print("❌ Операция отменена")
            
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        session.rollback()
        import traceback
        traceback.print_exc()
    finally:
        session.close()