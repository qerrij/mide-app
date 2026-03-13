# crud/company.py
from sqlalchemy.orm import Session
from typing import Optional, List
from app.models.company import CompanyBalance, CompanySettings
from sqlalchemy import func, and_
from datetime import datetime, timedelta

class CRUDCompany:
    def get_balance(self, db: Session) -> float:
        """Получить текущий баланс компании"""
        last_balance = db.query(CompanyBalance).order_by(CompanyBalance.id.desc()).first()
        return last_balance.balance if last_balance else 0.0
    
    def add_income(
        self,
        db: Session,
        amount: float,
        description: str,
        reference_id: Optional[int] = None,
        reference_type: Optional[str] = None,
        created_by: Optional[int] = None
    ) -> CompanyBalance:
        """Добавить доход в общий банк"""
        current_balance = self.get_balance(db)
        new_balance = current_balance + amount
        
        transaction = CompanyBalance(
            balance=new_balance,
            description=description,
            operation_type="INCOME",
            amount=amount,
            reference_id=reference_id,
            reference_type=reference_type,
            created_by=created_by
        )
        
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        return transaction
    
    def add_expense(
        self,
        db: Session,
        amount: float,
        description: str,
        reference_id: Optional[int] = None,
        reference_type: Optional[str] = None,
        created_by: Optional[int] = None
    ) -> CompanyBalance:
        """Добавить расход из общего банка"""
        current_balance = self.get_balance(db)
        
        if current_balance < amount:
            raise ValueError(f"Недостаточно средств на балансе. Доступно: {current_balance}, требуется: {amount}")
        
        new_balance = current_balance - amount
        
        transaction = CompanyBalance(
            balance=new_balance,
            description=description,
            operation_type="EXPENSE",
            amount=amount,
            reference_id=reference_id,
            reference_type=reference_type,
            created_by=created_by
        )
        
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        return transaction
    
    def get_transactions(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        operation_type: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
    ) -> List[CompanyBalance]:
        """Получить историю транзакций"""
        query = db.query(CompanyBalance)
        
        if operation_type:
            query = query.filter(CompanyBalance.operation_type == operation_type)
        
        if date_from:
            query = query.filter(CompanyBalance.created_at >= date_from)
        
        if date_to:
            query = query.filter(CompanyBalance.created_at <= date_to)
        
        return query.order_by(CompanyBalance.id.desc()).offset(skip).limit(limit).all()
    
    def get_balance_history(
        self,
        db: Session,
        days: int = 30
    ) -> List[dict]:
        """
        Получить историю баланса за последние N дней
        Возвращает все точки изменения баланса (каждую транзакцию)
        """
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Получаем все транзакции за период
        transactions = db.query(CompanyBalance).filter(
            CompanyBalance.created_at >= start_date
        ).order_by(CompanyBalance.created_at).all()
        
        # Получаем баланс на начало периода (последняя транзакция до start_date)
        previous_balance = db.query(CompanyBalance).filter(
            CompanyBalance.created_at < start_date
        ).order_by(CompanyBalance.id.desc()).first()
        
        history = []
        
        # Добавляем начальную точку (баланс на начало периода)
        if previous_balance:
            history.append({
                'date': start_date,
                'balance': previous_balance.balance
            })
        else:
            history.append({
                'date': start_date,
                'balance': 0
            })
        
        # Добавляем все транзакции как отдельные точки
        for transaction in transactions:
            history.append({
                'date': transaction.created_at,
                'balance': transaction.balance
            })
        
        return history
    
    def get_hourly_balance_history(
        self,
        db: Session,
        target_date: datetime
    ) -> List[dict]:
        """
        Получить почасовую историю баланса за указанную дату
        Возвращает все транзакции с их точным временем
        """
        # Делаем даты timezone-naive для сравнения с БД
        if target_date.tzinfo is not None:
            target_date = target_date.replace(tzinfo=None)
        
        start_date = datetime(target_date.year, target_date.month, target_date.day, 0, 0, 0)
        end_date = start_date + timedelta(days=1)
        
        # Получаем баланс на начало дня (последняя транзакция до начала дня)
        previous_balance = db.query(CompanyBalance).filter(
            CompanyBalance.created_at < start_date
        ).order_by(CompanyBalance.id.desc()).first()
        
        # Получаем все транзакции за выбранный день
        transactions = db.query(CompanyBalance).filter(
            CompanyBalance.created_at >= start_date,
            CompanyBalance.created_at < end_date
        ).order_by(CompanyBalance.created_at).all()
        
        history = []
        
        # Добавляем начальную точку (баланс на начало дня)
        if previous_balance:
            # Делаем дату timezone-naive
            prev_date = previous_balance.created_at
            if prev_date.tzinfo is not None:
                prev_date = prev_date.replace(tzinfo=None)
            history.append({
                'date': start_date.isoformat(),
                'balance': previous_balance.balance
            })
        else:
            history.append({
                'date': start_date.isoformat(),
                'balance': 0
            })
        
        # Добавляем все транзакции
        for transaction in transactions:
            # Делаем дату timezone-naive для сериализации
            transaction_date = transaction.created_at
            if transaction_date.tzinfo is not None:
                transaction_date = transaction_date.replace(tzinfo=None)
            
            history.append({
                'date': transaction_date.isoformat(),
                'balance': transaction.balance
            })
        
        # Убираем дубликаты (если есть транзакции с одинаковым балансом
        unique_history = []
        seen_balances = set()
        
        for item in history:
            # Создаем ключ из даты и баланса для определения дубликатов
            key = f"{item['date']}_{item['balance']}"
            if key not in seen_balances:
                seen_balances.add(key)
                unique_history.append(item)
        
        return unique_history

crud_company = CRUDCompany()