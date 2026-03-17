from sqlalchemy.orm import Session
from typing import Optional, List, Tuple
from app.models.company import CompanyBalance
from app.models.user import User
from sqlalchemy import case, func, and_, desc
from datetime import datetime, timedelta
from cachetools import TTLCache

class CRUDCompany:
    def __init__(self):
        self._balance_cache = TTLCache(maxsize=100, ttl=300)
    
    def _get_cache_key(self, city: Optional[str] = None) -> str:
        return f"balance:{city or 'global'}"
    
    def get_global_balance(self, db: Session) -> float:
        """Получить глобальный баланс компании (последняя транзакция)"""
        cache_key = self._get_cache_key()
        if cache_key in self._balance_cache:
            return self._balance_cache[cache_key]
            
        last_balance = db.query(CompanyBalance).order_by(CompanyBalance.id.desc()).first()
        balance = last_balance.balance if last_balance else 0.0
        self._balance_cache[cache_key] = balance
        return balance

    def get_city_balance(self, db: Session, city: str) -> float:
        """Получить баланс по городу (сумма всех операций города)"""
        cache_key = self._get_cache_key(city)
        if cache_key in self._balance_cache:
            return self._balance_cache[cache_key]
            
        result = db.query(
            func.sum(
                case(
                    (CompanyBalance.operation_type == 'INCOME', CompanyBalance.amount),
                    (CompanyBalance.operation_type == 'EXPENSE', -CompanyBalance.amount),
                    else_=0
                )
            ).label('balance')
        ).filter(CompanyBalance.city == city).first()
        
        balance = float(result[0] if result[0] is not None else 0.0)
        self._balance_cache[cache_key] = balance
        return balance

    def get_balance(self, db: Session, city: Optional[str] = None) -> float:
        """Универсальный метод получения баланса"""
        if city:
            return self.get_city_balance(db, city)
        else:
            return self.get_global_balance(db)
    
    def _invalidate_balance_cache(self, city: Optional[str] = None):
        """Инвалидация кэша баланса"""
        if city:
            self._balance_cache.pop(f"balance:{city}", None)
            self._balance_cache.pop("balance:global", None)
        else:
            keys_to_remove = [k for k in self._balance_cache.keys() if k.startswith("balance:")]
            for key in keys_to_remove:
                self._balance_cache.pop(key, None)
    
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
            balance=new_global_balance,
            description=description,
            operation_type="INCOME",
            amount=amount,
            reference_id=reference_id,
            reference_type=reference_type,
            created_by=created_by,
            city=city
        )
        
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        
        # Инвалидируем кэш
        self._invalidate_balance_cache(city)
        
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
        
        transaction = CompanyBalance(
            balance=current_balance - amount,
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
        
        # Инвалидируем кэш
        self._invalidate_balance_cache(city)
        
        return transaction
    
    def get_transactions_with_users(
        self,
        db: Session,
        operation_type: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        city: Optional[str] = None,
        limit: Optional[int] = None  # Добавляем None для загрузки всех
    ) -> List[Tuple[CompanyBalance, Optional[str], Optional[str]]]:
        """Получить все транзакции с информацией о создателе и фильтром по городу"""
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
        
        query = query.order_by(CompanyBalance.id.desc())
        
        if limit is not None:
            query = query.limit(limit)
        
        return query.all()
    
    def get_balance_history(
        self,
        db: Session,
        days: int = 30,
        city: Optional[str] = None,
        max_points: int = 100,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[dict]:
        """
        Получить историю баланса
        Если указаны start_date и end_date - используем их
        Иначе - за последние N дней от текущей даты
        Если указан city - возвращается баланс этого города
        Возвращаем ТОЛЬКО реальные транзакции, без искусственных точек
        """
        if start_date and end_date:
            # Используем переданные даты, убираем временную зону если есть
            if start_date.tzinfo is not None:
                start = start_date.replace(tzinfo=None)
            else:
                start = start_date
                
            if end_date.tzinfo is not None:
                end = end_date.replace(tzinfo=None)
            else:
                end = end_date
        else:
            # По умолчанию - последние N дней
            end = datetime.now()
            if end.tzinfo is not None:
                end = end.replace(tzinfo=None)
            start = end - timedelta(days=days)
        
        if city:
            # Для конкретного города - получаем все транзакции города за период
            transactions = db.query(CompanyBalance).filter(
                CompanyBalance.city == city,
                CompanyBalance.created_at >= start,
                CompanyBalance.created_at <= end
            ).order_by(CompanyBalance.created_at).all()
            
            if not transactions:
                return []
            
            # Пересчитываем баланс начиная с первой транзакции в периоде
            history = []
            for transaction in transactions:
                # Убираем временную зону из даты транзакции если есть
                transaction_date = transaction.created_at
                if transaction_date.tzinfo is not None:
                    transaction_date = transaction_date.replace(tzinfo=None)
                
                history.append({
                    'date': transaction_date,
                    'balance': transaction.balance,  # Баланс ПОСЛЕ этой транзакции
                    'city': city
                })
        else:
            # Для глобального баланса - просто все транзакции за период
            transactions = db.query(CompanyBalance).filter(
                CompanyBalance.created_at >= start,
                CompanyBalance.created_at <= end
            ).order_by(CompanyBalance.created_at).all()
            
            history = []
            for transaction in transactions:
                # Убираем временную зону из даты транзакции если есть
                transaction_date = transaction.created_at
                if transaction_date.tzinfo is not None:
                    transaction_date = transaction_date.replace(tzinfo=None)
                
                history.append({
                    'date': transaction_date,
                    'balance': transaction.balance,  # Баланс ПОСЛЕ этой транзакции
                    'city': transaction.city
                })
        
        # Если слишком много точек - прореживаем, но сохраняем ТОЛЬКО реальные транзакции
        if len(history) > max_points:
            # Берем каждую N-ую транзакцию, но обязательно первую и последнюю
            step = len(history) // max_points
            if step < 1:
                step = 1
            indices = list(range(0, len(history), step))
            if indices[-1] != len(history) - 1:
                indices.append(len(history) - 1)
            history = [history[i] for i in indices]
        
        return history

    def get_hourly_balance_history(
        self,
        db: Session,
        target_date: datetime,
        city: Optional[str] = None
    ) -> List[dict]:
        """
        Получить почасовую историю баланса за указанную дату
        Если указан city - возвращается баланс этого города
        """
        if target_date.tzinfo is not None:
            target_date = target_date.replace(tzinfo=None)
        
        start_date = datetime(target_date.year, target_date.month, target_date.day, 0, 0, 0)
        end_date = start_date + timedelta(days=1)
        
        if city:
            # Для конкретного города
            # Получаем баланс на начало дня
            prev_balance = db.query(
                func.sum(
                    case(
                        (CompanyBalance.operation_type == 'INCOME', CompanyBalance.amount),
                        (CompanyBalance.operation_type == 'EXPENSE', -CompanyBalance.amount),
                        else_=0
                    )
                ).label('balance')
            ).filter(
                CompanyBalance.city == city,
                CompanyBalance.created_at < start_date
            ).first()
            
            current_balance = float(prev_balance[0] if prev_balance[0] else 0)
            
            # Получаем все транзакции за день
            transactions = db.query(CompanyBalance).filter(
                CompanyBalance.city == city,
                CompanyBalance.created_at >= start_date,
                CompanyBalance.created_at < end_date
            ).order_by(CompanyBalance.created_at).all()
            
            history = [{
                'date': start_date.isoformat(),
                'balance': current_balance,
                'city': city
            }]
            
            for transaction in transactions:
                if transaction.operation_type == 'INCOME':
                    current_balance += transaction.amount
                else:
                    current_balance -= transaction.amount
                
                history.append({
                    'date': transaction.created_at.isoformat(),
                    'balance': current_balance,
                    'city': city
                })
        else:
            # Для глобального баланса
            prev_balance = db.query(CompanyBalance).filter(
                CompanyBalance.created_at < start_date
            ).order_by(CompanyBalance.id.desc()).first()
            
            transactions = db.query(CompanyBalance).filter(
                CompanyBalance.created_at >= start_date,
                CompanyBalance.created_at < end_date
            ).order_by(CompanyBalance.created_at).all()
            
            history = [{
                'date': start_date.isoformat(),
                'balance': prev_balance.balance if prev_balance else 0,
                'city': None
            }]
            
            for transaction in transactions:
                history.append({
                    'date': transaction.created_at.isoformat(),
                    'balance': transaction.balance,
                    'city': transaction.city
                })
        
        return history
    
    def get_balance_by_city(self, db: Session) -> List[dict]:
        """Получить баланс по городам"""
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