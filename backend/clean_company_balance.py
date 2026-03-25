import os
import sys
import random
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.company import CompanyBalance
from app.database import Base

DATABASE_URL = ""

def generate_test_data():
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        # Очищаем таблицу company_balance
        db.query(CompanyBalance).delete()
        db.commit()
        print("Таблица company_balance очищена")
        
        # Параметры
        start_date = datetime.now() - timedelta(days=180)  # 6 месяцев назад
        end_date = datetime.now()
        
        cities = ['Петрозаводск', 'Кондопога']
        users = {
            'Петрозаводск': 4,  # accountant
            'Кондопога': 13      # accountant2
        }
        
        # Счетчики балансов
        global_balance = 0
        city_balances = {
            'Петрозаводск': 0,
            'Кондопога': 0
        }
        
        transactions = []
        transaction_id = 1
        
        # Генерируем транзакции для каждого дня
        current_date = start_date
        days_generated = 0
        reports_per_day = 30  # отчетов в день в каждом городе
        
        print("Начинаем генерацию данных...")
        
        while current_date <= end_date:
            if current_date.weekday() < 5:  # Только будние дни (пн-пт)
                # Для каждого города
                for city in cities:
                    user_id = users[city]
                    
                    # Генерируем отчеты за день
                    for i in range(reports_per_day):
                        # Случайное время в течение рабочего дня (9:00 - 18:00)
                        hour = random.randint(9, 17)
                        minute = random.randint(0, 59)
                        second = random.randint(0, 59)
                        transaction_time = current_date.replace(
                            hour=hour, minute=minute, second=second
                        )
                        
                        # Сумма отчета (от 500 до 15000)
                        amount = round(random.uniform(500, 15000), 2)
                        
                        # Обновляем балансы
                        city_balances[city] += amount
                        global_balance += amount
                        
                        # Добавляем доход от отчета
                        transactions.append(CompanyBalance(
                            balance=global_balance,
                            city_balance=city_balances[city],
                            description=f"Отчет №{transaction_id} от {city}. Продано товаров на сумму: {amount}",
                            operation_type="INCOME",
                            amount=amount,
                            reference_id=transaction_id,
                            reference_type="REPORT",
                            created_by=user_id,
                            city=city,
                            created_at=transaction_time
                        ))
                        transaction_id += 1
                        
                        # Иногда добавляем расходы (примерно 20% от количества отчетов)
                        if random.random() < 0.2:  # 20% вероятности расхода
                            expense_amount = round(random.uniform(100, 3000), 2)
                            
                            # Проверяем достаточно ли средств
                            if city_balances[city] >= expense_amount:
                                city_balances[city] -= expense_amount
                                global_balance -= expense_amount
                                
                                # Описания расходов
                                expense_descriptions = [
                                    "Аренда помещения",
                                    "Закупка канцтоваров",
                                    "Реклама в соцсетях",
                                    "Обслуживание кассового аппарата",
                                    "Коммунальные платежи",
                                    "Зарплата сотрудникам",
                                    "Налоги",
                                    "Интернет и связь",
                                    "Уборка помещения",
                                    "Охрана"
                                ]
                                
                                expense_time = transaction_time + timedelta(minutes=random.randint(5, 30))
                                
                                transactions.append(CompanyBalance(
                                    balance=global_balance,
                                    city_balance=city_balances[city],
                                    description=random.choice(expense_descriptions),
                                    operation_type="EXPENSE",
                                    amount=expense_amount,
                                    reference_id=None,
                                    reference_type=None,
                                    created_by=user_id,
                                    city=city,
                                    created_at=expense_time
                                ))
                                transaction_id += 1
                    
                    # Иногда добавляем общие расходы компании (от owner)
                    if random.random() < 0.1:  # 10% вероятность общего расхода
                        expense_amount = round(random.uniform(500, 5000), 2)
                        if global_balance >= expense_amount:
                            global_balance -= expense_amount
                            
                            expense_time = current_date.replace(
                                hour=random.randint(10, 16),
                                minute=random.randint(0, 59),
                                second=random.randint(0, 59)
                            )
                            
                            transactions.append(CompanyBalance(
                                balance=global_balance,
                                city_balance=None,
                                description=f"Общий расход компании: {random.choice(['Серверы', 'Лицензии', 'Хостинг', 'Разработка', 'Юридические услуги'])}",
                                operation_type="EXPENSE",
                                amount=expense_amount,
                                reference_id=None,
                                reference_type=None,
                                created_by=1,  # owner
                                city=None,
                                created_at=expense_time
                            ))
                            transaction_id += 1
            
            days_generated += 1
            if days_generated % 30 == 0:
                print(f"Сгенерировано {days_generated} дней ({current_date.strftime('%Y-%m-%d')})")
            
            current_date += timedelta(days=1)
        
        print(f"\nВсего сгенерировано транзакций: {len(transactions)}")
        
        # Сохраняем транзакции в базу данных
        print("Сохраняем транзакции в базу данных...")
        
        # Сохраняем пачками по 1000 для производительности
        batch_size = 1000
        for i in range(0, len(transactions), batch_size):
            batch = transactions[i:i+batch_size]
            db.add_all(batch)
            db.commit()
            print(f"Сохранено {min(i+batch_size, len(transactions))} из {len(transactions)}")
        
        # Статистика
        print("\n" + "="*50)
        print("СТАТИСТИКА ГЕНЕРАЦИИ:")
        print("="*50)
        
        # Количество транзакций по типам
        income_count = sum(1 for t in transactions if t.operation_type == "INCOME")
        expense_count = sum(1 for t in transactions if t.operation_type == "EXPENSE")
        
        print(f"\nВсего транзакций: {len(transactions)}")
        print(f"  - Доходы: {income_count}")
        print(f"  - Расходы: {expense_count}")
        
        # По городам
        petro_income = sum(t.amount for t in transactions if t.city == "Петрозаводск" and t.operation_type == "INCOME")
        petro_expense = sum(t.amount for t in transactions if t.city == "Петрозаводск" and t.operation_type == "EXPENSE")
        kondo_income = sum(t.amount for t in transactions if t.city == "Кондопога" and t.operation_type == "INCOME")
        kondo_expense = sum(t.amount for t in transactions if t.city == "Кондопога" and t.operation_type == "EXPENSE")
        global_income = sum(t.amount for t in transactions if t.city is None and t.operation_type == "INCOME")
        global_expense = sum(t.amount for t in transactions if t.city is None and t.operation_type == "EXPENSE")
        
        print(f"\nПетрозаводск:")
        print(f"  - Доходы: {petro_income:,.2f} ₽")
        print(f"  - Расходы: {petro_expense:,.2f} ₽")
        print(f"  - Итого: {petro_income - petro_expense:,.2f} ₽")
        
        print(f"\nКондопога:")
        print(f"  - Доходы: {kondo_income:,.2f} ₽")
        print(f"  - Расходы: {kondo_expense:,.2f} ₽")
        print(f"  - Итого: {kondo_income - kondo_expense:,.2f} ₽")
        
        print(f"\nОбщий баланс компании:")
        print(f"  - Доходы: {global_income:,.2f} ₽")
        print(f"  - Расходы: {global_expense:,.2f} ₽")
        print(f"  - Итого: {global_income - global_expense:,.2f} ₽")
        
        # Получаем финальные балансы
        final_global = db.query(CompanyBalance).order_by(CompanyBalance.id.desc()).first()
        final_petro = db.query(CompanyBalance).filter(
            CompanyBalance.city == "Петрозаводск"
        ).order_by(CompanyBalance.id.desc()).first()
        final_kondo = db.query(CompanyBalance).filter(
            CompanyBalance.city == "Кондопога"
        ).order_by(CompanyBalance.id.desc()).first()
        
        print(f"\nФИНАЛЬНЫЕ БАЛАНСЫ:")
        print(f"  - Глобальный: {final_global.balance:,.2f} ₽")
        print(f"  - Петрозаводск: {final_petro.city_balance:,.2f} ₽")
        print(f"  - Кондопога: {final_kondo.city_balance:,.2f} ₽")
        
        # Проверка корректности
        expected_petro = petro_income - petro_expense
        expected_kondo = kondo_income - kondo_expense
        expected_global = global_income - global_expense
        
        print(f"\nПРОВЕРКА:")
        print(f"  Петрозаводск: {final_petro.city_balance:,.2f} ₽ (ожидалось: {expected_petro:,.2f} ₽) - {'✓' if abs(final_petro.city_balance - expected_petro) < 0.01 else '✗'}")
        print(f"  Кондопога: {final_kondo.city_balance:,.2f} ₽ (ожидалось: {expected_kondo:,.2f} ₽) - {'✓' if abs(final_kondo.city_balance - expected_kondo) < 0.01 else '✗'}")
        print(f"  Глобальный: {final_global.balance:,.2f} ₽ (ожидалось: {expected_global + expected_petro + expected_kondo:,.2f} ₽) - {'✓' if abs(final_global.balance - (expected_global + expected_petro + expected_kondo)) < 0.01 else '✗'}")
        
    except Exception as e:
        print(f"Ошибка: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    generate_test_data()