import json
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime
from app.models.debt import UserDebt, DebtTransaction, DebtTransactionType
from app.models.user import User


class CRUDDebt:
    
    def get_or_create_user_debt(self, db: Session, user_id: int) -> UserDebt:
        """Получить или создать запись долга для пользователя"""
        debt = db.query(UserDebt).filter(UserDebt.user_id == user_id).first()
        if not debt:
            debt = UserDebt(
                user_id=user_id,
                total_amount=0.0,
                history=[]
            )
            db.add(debt)
            db.commit()
            db.refresh(debt)
        return debt
    
    def get_user_debt(self, db: Session, user_id: int) -> Optional[UserDebt]:
        """Получить долг пользователя"""
        return db.query(UserDebt).filter(UserDebt.user_id == user_id).first()
    
    def get_user_debt_with_transactions(
        self, 
        db: Session, 
        user_id: int,
        limit: int = 50,
        skip: int = 0
    ) -> Optional[UserDebt]:
        """Получить долг пользователя с историей транзакций"""
        debt = db.query(UserDebt).filter(UserDebt.user_id == user_id).first()
        if debt:
            transactions = db.query(DebtTransaction)\
                .filter(DebtTransaction.user_debt_id == debt.id)\
                .order_by(desc(DebtTransaction.created_at))\
                .offset(skip)\
                .limit(limit)\
                .all()
            debt.transactions = transactions
        return debt
    
    def update_debt_from_revision_discrepancy(
        self,
        db: Session,
        user_id: int,
        product_id: int,
        discrepancy: int,
        revision_id: int,
        revision_discrepancy_id: int,
        product_price: float,
        applied_rate: float,
        quantity: int,
        total_amount: float
    ) -> Optional[UserDebt]:
        """
        Обновить долг из расхождения ревизии
        Только отрицательный discrepancy (минус) увеличивает долг
        """
        if discrepancy >= 0:
            return None
        
        debt = self.get_or_create_user_debt(db, user_id)
        old_amount = debt.total_amount
        
        debt.total_amount += total_amount
        
        # Добавляем в историю
        history_entry = {
            'timestamp': datetime.now().isoformat(),
            'type': 'REVISION',
            'revision_id': revision_id,
            'product_id': product_id,
            'quantity': quantity,
            'product_price': product_price,
            'applied_rate': applied_rate,
            'price_per_unit': product_price - applied_rate,
            'amount': total_amount,
            'new_total': debt.total_amount
        }
        
        if not debt.history:
            debt.history = []
        debt.history.append(history_entry)
        
        if len(debt.history) > 100:
            debt.history = debt.history[-100:]
        
        # Создаем транзакцию
        transaction = DebtTransaction(
            user_id=user_id,
            user_debt_id=debt.id,
            transaction_type=DebtTransactionType.REVISION,
            revision_id=revision_id,
            revision_discrepancy_id=revision_discrepancy_id,
            amount_change=total_amount,
            new_total_amount=debt.total_amount,
            revision_details={
                'product_id': product_id,
                'quantity': quantity,
                'product_price': product_price,
                'applied_rate': applied_rate,
                'price_per_unit': product_price - applied_rate,
                'total': total_amount
            }
        )
        db.add(transaction)
        
        db.commit()
        db.refresh(debt)
        
        return debt
    
    def manual_adjust_debt(
        self,
        db: Session,
        user_id: int,
        adjustment_type: str,
        amount: float,
        description: str,
        performed_by_id: int
    ) -> UserDebt:
        """
        Ручная корректировка долга (только для OWNER)
        """
        if amount <= 0:
            raise ValueError("Сумма корректировки должна быть положительной")
        
        debt = self.get_or_create_user_debt(db, user_id)
        old_amount = debt.total_amount
        
        if adjustment_type == "INCREASE":
            debt.total_amount += amount
            amount_change = amount
            transaction_type = DebtTransactionType.MANUAL_INCREASE
        elif adjustment_type == "DECREASE":
            if debt.total_amount < amount:
                raise ValueError(f"Нельзя списать {amount} руб. Долг составляет {debt.total_amount} руб.")
            debt.total_amount -= amount
            amount_change = -amount
            transaction_type = DebtTransactionType.MANUAL_DECREASE
        else:
            raise ValueError(f"Неизвестный тип корректировки: {adjustment_type}")
        
        # Добавляем в историю
        history_entry = {
            'timestamp': datetime.now().isoformat(),
            'type': 'MANUAL_ADJUSTMENT',
            'adjustment_type': adjustment_type,
            'amount': amount,
            'change': amount_change,
            'new_total': debt.total_amount,
            'description': description,
            'performed_by_id': performed_by_id
        }
        
        if not debt.history:
            debt.history = []
        debt.history.append(history_entry)
        
        if len(debt.history) > 100:
            debt.history = debt.history[-100:]
        
        # Создаем транзакцию
        transaction = DebtTransaction(
            user_id=user_id,
            user_debt_id=debt.id,
            transaction_type=transaction_type,
            manual_amount=amount,
            manual_description=description,
            performed_by_id=performed_by_id,
            amount_change=amount_change,
            new_total_amount=debt.total_amount
        )
        db.add(transaction)
        
        db.commit()
        db.refresh(debt)
        
        return debt
    
    def get_all_debts(
        self,
        db: Session,
        cluster_id: Optional[int] = None,
        group_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Получить все долги с фильтрацией по кластеру/группе"""
        query = db.query(
            UserDebt,
            User.full_name.label('user_name')
        ).join(
            User, UserDebt.user_id == User.id
        ).filter(UserDebt.total_amount > 0)
        
        if cluster_id:
            query = query.filter(User.cluster_id == cluster_id)
        if group_id:
            query = query.filter(User.group_id == group_id)
        
        results = query.order_by(desc(UserDebt.total_amount)).all()
        
        debts_list = []
        for debt, user_name in results:
            debts_list.append({
                'user_id': debt.user_id,
                'user_name': user_name,
                'total_amount': debt.total_amount,
                'updated_at': debt.updated_at
            })
        
        return debts_list
    
    def get_debt_transactions(
        self,
        db: Session,
        user_id: Optional[int] = None,
        limit: int = 100,
        skip: int = 0
    ) -> List[Dict[str, Any]]:
        """Получить историю транзакций долгов"""
        query = db.query(
            DebtTransaction,
            User.full_name.label('performed_by_name')
        ).outerjoin(
            User, DebtTransaction.performed_by_id == User.id
        )
        
        if user_id:
            query = query.filter(DebtTransaction.user_id == user_id)
        
        results = query.order_by(desc(DebtTransaction.created_at))\
            .offset(skip)\
            .limit(limit)\
            .all()
        
        transactions = []
        for transaction, performed_by_name in results:
            trans_dict = {
                'id': transaction.id,
                'user_id': transaction.user_id,
                'transaction_type': transaction.transaction_type.value,
                'amount_change': transaction.amount_change,
                'new_total_amount': transaction.new_total_amount,
                'created_at': transaction.created_at,
                'revision_id': transaction.revision_id,
                'revision_details': transaction.revision_details,
                'manual_amount': transaction.manual_amount,
                'manual_description': transaction.manual_description,
                'performed_by_name': performed_by_name
            }
            transactions.append(trans_dict)
        
        return transactions


crud_debt = CRUDDebt()