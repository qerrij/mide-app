from sqlalchemy.orm import Session
from typing import Optional, List, Tuple
from app.models.company import CompanyBalance, CompanySettings
from app.models.user import User
from sqlalchemy import case, func, and_
from datetime import datetime, timedelta

class CRUDCompany:
    def get_global_balance(self, db: Session) -> float:
        """Получить глобальный баланс компании (последняя транзакция)"""
        last_balance = db.query(CompanyBalance).order_by(CompanyBalance.id.desc()).first()
        return last_balance.balance if last_balance else 0.0

    def get_city_balance(self, db: Session, city: str) -> float:
        """Получить баланс по городу (сумма всех операций города)"""
        result = db.query(
            func.sum(
                case(
                    (CompanyBalance.operation_type == 'INCOME', CompanyBalance.amount),
                    (CompanyBalance.operation_type == 'EXPENSE', -CompanyBalance.amount),
                    else_=0
                )
            ).label('balance')
        ).filter(CompanyBalance.city == city).first()
        
        return float(result[0] if result[0] is not None else 0.0)

    def get_balance(self, db: Session, city: Optional[str] = None) -> float:
        """Универсальный метод"""
        if city:
            return self.get_city_balance(db, city)
        else:
            return self.get_global_balance(db)
    
    def add_income(
        self,
        db: Session,
        amount: float,
        description: str,
        reference_id: Optional[int] = None,
        reference_type: Optional[str] = None,
        created_by: Optional[int] = None,
        city: Optional[str] = None
    ) -> CompanyBalance:
        """Добавить доход"""
        # Получаем текущий глобальный баланс
        global_balance = self.get_global_balance(db)
        new_global_balance = global_balance + amount
        
        transaction = CompanyBalance(
            balance=new_global_balance,  # Это глобальный баланс
            description=description,
            operation_type="INCOME",
            amount=amount,
            reference_id=reference_id,
            reference_type=reference_type,
            created_by=created_by,
            city=city  # Просто сохраняем город для фильтрации
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
        created_by: Optional[int] = None,
        city: Optional[str] = None
    ) -> CompanyBalance:
        """Добавить расход из общего банка"""
        # Получаем текущий баланс с учетом города
        current_balance = self.get_balance(db, city)
        
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
            created_by=created_by,
            city=city
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
        date_to: Optional[datetime] = None,
        city: Optional[str] = None
    ) -> List[CompanyBalance]:
        """Получить историю транзакций с фильтром по городу"""
        query = db.query(CompanyBalance)
        
        if operation_type:
            query = query.filter(CompanyBalance.operation_type == operation_type)
        
        if date_from:
            query = query.filter(CompanyBalance.created_at >= date_from)
        
        if date_to:
            query = query.filter(CompanyBalance.created_at <= date_to)
        
        if city:
            query = query.filter(CompanyBalance.city == city)
        
        return query.order_by(CompanyBalance.id.desc()).offset(skip).limit(limit).all()
    
    def get_transactions_with_users(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        operation_type: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        city: Optional[str] = None
    ) -> List[Tuple[CompanyBalance, Optional[str], Optional[str]]]:
        """Получить историю транзакций с информацией о создателе и фильтром по городу"""
        query = db.query(
            CompanyBalance,
            User.full_name.label('created_by_name'),
            User.username.label('created_by_username')
        ).outerjoin(
            User, User.id == CompanyBalance.created_by
        )
        
        if operation_type:
            query = query.filter(CompanyBalance.operation_type == operation_type)
        
        if date_from:
            query = query.filter(CompanyBalance.created_at >= date_from)
        
        if date_to:
            query = query.filter(CompanyBalance.created_at <= date_to)
        
        if city:
            query = query.filter(CompanyBalance.city == city)
        
        return query.order_by(CompanyBalance.created_at.desc()).offset(skip).limit(limit).all()
    
    def get_balance_history(
        self,
        db: Session,
        days: int = 30,
        city: Optional[str] = None
    ) -> List[dict]:
        """
        Получить историю баланса за последние N дней с учетом города
        """
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Получаем все транзакции за период с учетом города
        query = db.query(CompanyBalance).filter(
            CompanyBalance.created_at >= start_date
        )
        
        if city:
            query = query.filter(CompanyBalance.city == city)
        
        transactions = query.order_by(CompanyBalance.created_at).all()
        
        # Получаем баланс на начало периода (последняя транзакция до start_date)
        previous_query = db.query(CompanyBalance).filter(
            CompanyBalance.created_at < start_date
        )
        
        if city:
            previous_query = previous_query.filter(CompanyBalance.city == city)
        
        previous_balance = previous_query.order_by(CompanyBalance.id.desc()).first()
        
        history = []
        
        # Добавляем начальную точку (баланс на начало периода)
        if previous_balance:
            history.append({
                'date': start_date,
                'balance': previous_balance.balance,
                'city': previous_balance.city
            })
        else:
            history.append({
                'date': start_date,
                'balance': 0,
                'city': city
            })
        
        # Добавляем все транзакции как отдельные точки
        for transaction in transactions:
            history.append({
                'date': transaction.created_at,
                'balance': transaction.balance,
                'city': transaction.city
            })
        
        return history
    
    def get_hourly_balance_history(
        self,
        db: Session,
        target_date: datetime,
        city: Optional[str] = None
    ) -> List[dict]:
        """
        Получить почасовую историю баланса за указанную дату с учетом города
        """
        if target_date.tzinfo is not None:
            target_date = target_date.replace(tzinfo=None)
        
        start_date = datetime(target_date.year, target_date.month, target_date.day, 0, 0, 0)
        end_date = start_date + timedelta(days=1)
        
        # Получаем баланс на начало дня (последняя транзакция до начала дня)
        previous_query = db.query(CompanyBalance).filter(
            CompanyBalance.created_at < start_date
        )
        
        if city:
            previous_query = previous_query.filter(CompanyBalance.city == city)
        
        previous_balance = previous_query.order_by(CompanyBalance.id.desc()).first()
        
        # Получаем все транзакции за выбранный день
        query = db.query(CompanyBalance).filter(
            CompanyBalance.created_at >= start_date,
            CompanyBalance.created_at < end_date
        )
        
        if city:
            query = query.filter(CompanyBalance.city == city)
        
        transactions = query.order_by(CompanyBalance.created_at).all()
        
        history = []
        
        # Добавляем начальную точку
        if previous_balance:
            prev_date = previous_balance.created_at
            if prev_date.tzinfo is not None:
                prev_date = prev_date.replace(tzinfo=None)
            history.append({
                'date': start_date.isoformat(),
                'balance': previous_balance.balance,
                'city': previous_balance.city
            })
        else:
            history.append({
                'date': start_date.isoformat(),
                'balance': 0,
                'city': city
            })
        
        # Добавляем все транзакции
        for transaction in transactions:
            transaction_date = transaction.created_at
            if transaction_date.tzinfo is not None:
                transaction_date = transaction_date.replace(tzinfo=None)
            
            history.append({
                'date': transaction_date.isoformat(),
                'balance': transaction.balance,
                'city': transaction.city
            })
        
        return history
    
    def get_balance_by_city(self, db: Session) -> List[dict]:
        """Получить баланс по городам"""
        # Получаем все уникальные города
        cities = db.query(CompanyBalance.city).filter(
            CompanyBalance.city.isnot(None)
        ).distinct().all()
        
        result = []
        for (city,) in cities:
            balance = self.get_balance(db, city)
            result.append({
                'city': city,
                'balance': balance
            })
        
        return result
    
    def get_stats_by_city(
        self,
        db: Session,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
    ) -> List[dict]:
        """Получить статистику доходов/расходов по городам за период"""
        query = db.query(
            CompanyBalance.city,
            CompanyBalance.operation_type,
            func.sum(CompanyBalance.amount).label('total_amount'),
            func.count(CompanyBalance.id).label('transactions_count')
        ).filter(CompanyBalance.city.isnot(None))
        
        if date_from:
            query = query.filter(CompanyBalance.created_at >= date_from)
        
        if date_to:
            query = query.filter(CompanyBalance.created_at <= date_to)
        
        query = query.group_by(CompanyBalance.city, CompanyBalance.operation_type)
        
        results = query.all()
        
        stats_by_city = {}
        for city, op_type, amount, count in results:
            if city not in stats_by_city:
                stats_by_city[city] = {
                    'city': city,
                    'total_income': 0,
                    'total_expense': 0,
                    'transactions_count': 0
                }
            
            if op_type == 'INCOME':
                stats_by_city[city]['total_income'] = amount
            elif op_type == 'EXPENSE':
                stats_by_city[city]['total_expense'] = amount
            
            stats_by_city[city]['transactions_count'] += count
        
        return list(stats_by_city.values())

crud_company = CRUDCompany()