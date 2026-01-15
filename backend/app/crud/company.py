from sqlalchemy.orm import Session
from typing import Optional, List
from app.models.company import CompanyBalance, CompanySettings
from sqlalchemy import func
from datetime import datetime


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
        """Получить историю баланса за последние N дней"""
        from datetime import datetime, timedelta
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Получаем транзакции за период
        transactions = db.query(CompanyBalance).filter(
            CompanyBalance.created_at >= start_date,
            CompanyBalance.created_at <= end_date
        ).order_by(CompanyBalance.created_at).all()
        
        history = []
        for transaction in transactions:
            history.append({
                'date': transaction.created_at,
                'balance': transaction.balance,
                'amount': transaction.amount,
                'type': transaction.operation_type,
                'description': transaction.description
            })
        
        return history
    
    def get_settings(self, db: Session, key: str) -> Optional[str]:
        """Получить значение настройки"""
        setting = db.query(CompanySettings).filter(CompanySettings.key == key).first()
        return setting.value if setting else None
    
    def set_settings(self, db: Session, key: str, value: str, description: Optional[str] = None) -> CompanySettings:
        """Установить значение настройки"""
        setting = db.query(CompanySettings).filter(CompanySettings.key == key).first()
        
        if setting:
            setting.value = value
            if description:
                setting.description = description
            setting.updated_at = datetime.now()
        else:
            setting = CompanySettings(
                key=key,
                value=value,
                description=description
            )
            db.add(setting)
        
        db.commit()
        db.refresh(setting)
        return setting


crud_company = CRUDCompany()