import json
from typing import List, Optional, Dict
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from app.models.debt import UserDebt, DebtTransaction
from app.models.product import Product
from app.models.user import User
from app.models.revision import RevisionDiscrepancy


class CRUDDebt:
    
    def update_debt_from_discrepancy(
        self, 
        db: Session, 
        user_id: int, 
        product_id: int, 
        discrepancy: int,  # отрицательное число = минус (увеличивает долг), положительное = плюс (уменьшает долг)
        revision_id: Optional[int] = None
    ) -> Optional[UserDebt]:
        """
        Обновить долг пользователя на основе расхождения из ревизии
        
        Логика:
        - Долг начинает копиться только после ПЕРВОГО минуса по товару
        - Если долга нет, и пришел плюс -> игнорируем (не создаем кредит)
        - Если долга нет, и пришел минус -> создаем долг с этим минусом
        - Если долг есть, и пришел минус -> увеличиваем долг
        - Если долг есть, и пришел плюс -> уменьшаем долг (но не ниже 0)
        """
        if discrepancy == 0:
            return None
        
        # Получаем текущий долг
        debt = db.query(UserDebt).filter(
            UserDebt.user_id == user_id,
            UserDebt.product_id == product_id
        ).first()
        
        # Получаем цену товара
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            return None
        
        product_price = product.price
        
        # ========== КЛЮЧЕВАЯ ЛОГИКА ==========
        
        # СЛУЧАЙ 1: Долга нет
        if not debt:
            # Если пришел плюс (discrepancy > 0) - игнорируем, долг не создаем
            if discrepancy > 0:
                # Плюс без долга - просто пропускаем
                return None
            
            # Если пришел минус (discrepancy < 0) - создаем долг
            if discrepancy < 0:
                debt_quantity = abs(discrepancy)  # берем модуль
                total_cost = product_price * debt_quantity
                
                # Создаем долг
                debt = UserDebt(
                    user_id=user_id,
                    product_id=product_id,
                    quantity=debt_quantity,
                    total_cost=total_cost,
                    history="[]"
                )
                
                # Добавляем в историю
                history_entry = {
                    'timestamp': datetime.now().isoformat(),
                    'revision_id': revision_id,
                    'change': debt_quantity,  # положительное изменение долга
                    'new_quantity': debt_quantity,
                    'cost_change': total_cost,
                    'new_total_cost': total_cost,
                    'product_price': product_price,
                    'description': f"Ревизия #{revision_id}: первый минус {debt_quantity} шт. товара '{product.name}'. Начало долга."
                }
                debt.history = json.dumps([history_entry], ensure_ascii=False)
                
                db.add(debt)
                
                # Создаем транзакцию
                transaction = DebtTransaction(
                    user_id=user_id,
                    product_id=product_id,
                    revision_id=revision_id,
                    quantity_change=debt_quantity,
                    new_quantity=debt_quantity,
                    product_price=product_price,
                    cost_change=total_cost,
                    new_total_cost=total_cost,
                    description=f"Ревизия #{revision_id}: первый минус {debt_quantity} шт. товара '{product.name}'. Начало долга."
                )
                db.add(transaction)
                
                db.commit()
                db.refresh(debt)
                
                return debt
        
        # СЛУЧАЙ 2: Долг уже есть
        old_quantity = debt.quantity
        old_total_cost = debt.total_cost
        
        # Если пришел минус (discrepancy < 0) - увеличиваем долг
        if discrepancy < 0:
            debt_change = abs(discrepancy)
            cost_change = product_price * debt_change
            
            new_quantity = old_quantity + debt_change
            new_total_cost = old_total_cost + cost_change
            
            description = f"Ревизия #{revision_id}: минус {debt_change} шт. товара '{product.name}'. Долг увеличен."
            
        # Если пришел плюс (discrepancy > 0) - уменьшаем долг (но не ниже 0)
        else:  # discrepancy > 0
            # Плюс может быть больше текущего долга
            debt_reduction = min(discrepancy, old_quantity)
            
            if debt_reduction == 0:
                # Плюс есть, но долга нет (уже обнулили) - игнорируем
                return debt
            
            debt_change = -debt_reduction  # отрицательное изменение
            cost_change = -product_price * debt_reduction
            
            new_quantity = old_quantity - debt_reduction
            new_total_cost = old_total_cost - (product_price * debt_reduction)
            
            if debt_reduction < discrepancy:
                # Часть плюса ушла на погашение долга, остаток игнорируем
                description = f"Ревизия #{revision_id}: плюс {discrepancy} шт. товара '{product.name}'. Погашено долга: {debt_reduction} шт. Остаток плюса ({discrepancy - debt_reduction} шт.) не учтен, так как долг полностью погашен."
            else:
                description = f"Ревизия #{revision_id}: плюс {debt_reduction} шт. товара '{product.name}'. Долг уменьшен."
        
        # Если после всех операций долг стал 0 - удаляем запись
        if new_quantity <= 0:
            # Сохраняем историю перед удалением
            old_history = json.loads(debt.history) if debt.history else []
            
            # Добавляем финальную запись в историю
            old_history.append({
                'timestamp': datetime.now().isoformat(),
                'revision_id': revision_id,
                'change': debt_change,
                'new_quantity': 0,
                'cost_change': cost_change,
                'new_total_cost': 0,
                'product_price': product_price,
                'description': f"Ревизия #{revision_id}: долг полностью погашен."
            })
            
            # Создаем финальную транзакцию
            transaction = DebtTransaction(
                user_id=user_id,
                product_id=product_id,
                revision_id=revision_id,
                quantity_change=debt_change,
                new_quantity=0,
                product_price=product_price,
                cost_change=cost_change,
                new_total_cost=0,
                description=description
            )
            db.add(transaction)
            
            # Удаляем долг
            db.delete(debt)
            db.commit()
            
            return None
        
        # Обновляем существующий долг
        old_history = json.loads(debt.history) if debt.history else []
        
        # Добавляем в историю
        old_history.append({
            'timestamp': datetime.now().isoformat(),
            'revision_id': revision_id,
            'change': debt_change,
            'new_quantity': new_quantity,
            'cost_change': cost_change,
            'new_total_cost': new_total_cost,
            'product_price': product_price,
            'description': description
        })
        
        # Ограничиваем историю последними 50 записями
        if len(old_history) > 50:
            old_history = old_history[-50:]
        
        # Обновляем значения
        debt.quantity = new_quantity
        debt.total_cost = new_total_cost
        debt.history = json.dumps(old_history, ensure_ascii=False)
        
        db.add(debt)
        
        # Создаем транзакцию
        transaction = DebtTransaction(
            user_id=user_id,
            product_id=product_id,
            revision_id=revision_id,
            quantity_change=debt_change,
            new_quantity=new_quantity,
            product_price=product_price,
            cost_change=cost_change,
            new_total_cost=new_total_cost,
            description=description
        )
        db.add(transaction)
        
        db.commit()
        db.refresh(debt)
        
        return debt
    
    def process_revision_debts(
        self, 
        db: Session, 
        revision_id: int
    ) -> Dict[str, any]:
        """Обработать все расхождения ревизии и обновить долги"""
        from app.models.revision import RevisionDiscrepancy
        
        discrepancies = db.query(RevisionDiscrepancy).filter(
            RevisionDiscrepancy.revision_id == revision_id
        ).all()
        
        processed = []
        total_debt_increase = 0
        total_debt_decrease = 0
        new_debts_created = 0
        debts_cleared = 0
        
        for disc in discrepancies:
            # discrepancy отрицательный = минус, положительный = плюс
            debt_before = db.query(UserDebt).filter(
                UserDebt.user_id == disc.user_id,
                UserDebt.product_id == disc.product_id
            ).first()
            
            had_debt_before = debt_before is not None and debt_before.quantity > 0
            
            debt = self.update_debt_from_discrepancy(
                db,
                user_id=disc.user_id,
                product_id=disc.product_id,
                discrepancy=disc.discrepancy,
                revision_id=revision_id
            )
            
            has_debt_after = debt is not None and debt.quantity > 0
            
            if not had_debt_before and has_debt_after:
                new_debts_created += 1
            elif had_debt_before and not has_debt_after:
                debts_cleared += 1
            
            if disc.discrepancy < 0:
                total_debt_increase += abs(disc.discrepancy)
            else:
                total_debt_decrease += disc.discrepancy
            
            processed.append({
                'user_id': disc.user_id,
                'product_id': disc.product_id,
                'discrepancy': disc.discrepancy,
                'had_debt_before': had_debt_before,
                'has_debt_after': has_debt_after,
                'new_debt_quantity': debt.quantity if debt else 0,
                'new_debt_cost': debt.total_cost if debt else 0
            })
        
        return {
            'processed_count': len(processed),
            'total_debt_increase': total_debt_increase,
            'total_debt_decrease': total_debt_decrease,
            'new_debts_created': new_debts_created,
            'debts_cleared': debts_cleared,
            'processed': processed
        }
    
    def get_user_debts(
        self, 
        db: Session, 
        user_id: int
    ) -> Dict[str, any]:
        """Получить все долги пользователя с деталями"""
        debts = db.query(UserDebt).filter(
            UserDebt.user_id == user_id,
            UserDebt.quantity > 0
        ).all()
        
        total_quantity = 0
        total_cost = 0.0
        items = []
        
        for debt in debts:
            product = db.query(Product).filter(Product.id == debt.product_id).first()
            
            total_quantity += debt.quantity
            total_cost += debt.total_cost
            
            # Парсим историю
            history = []
            if debt.history:
                try:
                    history = json.loads(debt.history)
                except:
                    history = []
            
            items.append({
                'product_id': debt.product_id,
                'product_name': product.name if product else 'Неизвестный товар',
                'product_sku': product.sku if product else None,
                'product_price': product.price if product else 0,
                'quantity': debt.quantity,
                'total_cost': debt.total_cost,
                'history': history,
                'created_at': debt.created_at,
                'updated_at': debt.updated_at
            })
        
        return {
            'user_id': user_id,
            'total_quantity': total_quantity,
            'total_cost': total_cost,
            'items': items
        }
    
    def get_all_debts(
        self, 
        db: Session,
        role: str = None,
        cluster_id: int = None,
        group_id: int = None,
        only_with_debt: bool = True
    ) -> List[Dict[str, any]]:
        """Получить все долги с фильтрацией по ролям"""
        query = db.query(
            UserDebt,
            User.full_name.label('user_name'),
            User.role.label('user_role'),
            User.cluster_id,
            User.group_id,
            Product.name.label('product_name'),
            Product.sku.label('product_sku'),
            Product.price.label('product_price')
        ).join(
            User, UserDebt.user_id == User.id
        ).join(
            Product, UserDebt.product_id == Product.id
        )
        
        if only_with_debt:
            query = query.filter(UserDebt.quantity > 0)
        
        # Фильтрация по роли
        if role:
            query = query.filter(User.role == role)
        
        # Фильтрация по кусту
        if cluster_id:
            query = query.filter(User.cluster_id == cluster_id)
        
        # Фильтрация по группе
        if group_id:
            query = query.filter(User.group_id == group_id)
        
        results = query.all()
        
        debts_by_user = {}
        for debt, user_name, user_role, cluster_id, group_id, product_name, product_sku, product_price in results:
            if debt.user_id not in debts_by_user:
                debts_by_user[debt.user_id] = {
                    'user_id': debt.user_id,
                    'user_name': user_name,
                    'user_role': user_role,
                    'cluster_id': cluster_id,
                    'group_id': group_id,
                    'total_quantity': 0,
                    'total_cost': 0,
                    'items': []
                }
            
            debts_by_user[debt.user_id]['total_quantity'] += debt.quantity
            debts_by_user[debt.user_id]['total_cost'] += debt.total_cost
            debts_by_user[debt.user_id]['items'].append({
                'product_id': debt.product_id,
                'product_name': product_name,
                'product_sku': product_sku,
                'product_price': product_price,
                'quantity': debt.quantity,
                'total_cost': debt.total_cost,
                'updated_at': debt.updated_at
            })
        
        return list(debts_by_user.values())
    
    def get_debt_transactions(
        self, 
        db: Session, 
        user_id: int = None,
        product_id: int = None,
        limit: int = 100,
        skip: int = 0
    ) -> List[Dict]:
        """Получить историю транзакций долгов"""
        query = db.query(
            DebtTransaction,
            User.full_name.label('user_name'),
            Product.name.label('product_name'),
            Product.sku.label('product_sku')
        ).join(
            User, DebtTransaction.user_id == User.id
        ).join(
            Product, DebtTransaction.product_id == Product.id
        )
        
        if user_id:
            query = query.filter(DebtTransaction.user_id == user_id)
        
        if product_id:
            query = query.filter(DebtTransaction.product_id == product_id)
        
        results = query.order_by(DebtTransaction.created_at.desc()).offset(skip).limit(limit).all()
        
        transactions = []
        for transaction, user_name, product_name, product_sku in results:
            transactions.append({
                'id': transaction.id,
                'user_id': transaction.user_id,
                'user_name': user_name,
                'product_id': transaction.product_id,
                'product_name': product_name,
                'product_sku': product_sku,
                'revision_id': transaction.revision_id,
                'quantity_change': transaction.quantity_change,
                'new_quantity': transaction.new_quantity,
                'product_price': transaction.product_price,
                'cost_change': transaction.cost_change,
                'new_total_cost': transaction.new_total_cost,
                'description': transaction.description,
                'created_at': transaction.created_at
            })
        
        return transactions
    
    def get_debt_statistics(
        self, 
        db: Session,
        cluster_id: int = None,
        group_id: int = None
    ) -> Dict[str, any]:
        """Получить статистику по долгам"""
        from sqlalchemy import func
        
        query = db.query(
            func.count(UserDebt.id).label('total_debt_items'),
            func.sum(UserDebt.quantity).label('total_quantity'),
            func.sum(UserDebt.total_cost).label('total_cost'),
            func.count(func.distinct(UserDebt.user_id)).label('users_with_debt')
        ).join(
            User, UserDebt.user_id == User.id
        ).filter(
            UserDebt.quantity > 0
        )
        
        if cluster_id:
            query = query.filter(User.cluster_id == cluster_id)
        
        if group_id:
            query = query.filter(User.group_id == group_id)
        
        result = query.first()
        
        # Топ-10 должников
        top_debtors_query = db.query(
            UserDebt.user_id,
            User.full_name,
            func.sum(UserDebt.quantity).label('total_quantity'),
            func.sum(UserDebt.total_cost).label('total_cost')
        ).join(
            User, UserDebt.user_id == User.id
        ).filter(
            UserDebt.quantity > 0
        )
        
        if cluster_id:
            top_debtors_query = top_debtors_query.filter(User.cluster_id == cluster_id)
        
        if group_id:
            top_debtors_query = top_debtors_query.filter(User.group_id == group_id)
        
        top_debtors = top_debtors_query.group_by(
            UserDebt.user_id, User.full_name
        ).order_by(
            func.sum(UserDebt.total_cost).desc()
        ).limit(10).all()
        
        # Топ-10 товаров в долгах
        top_products_query = db.query(
            UserDebt.product_id,
            Product.name,
            Product.sku,
            func.sum(UserDebt.quantity).label('total_quantity'),
            func.sum(UserDebt.total_cost).label('total_cost')
        ).join(
            Product, UserDebt.product_id == Product.id
        ).filter(
            UserDebt.quantity > 0
        )
        
        if cluster_id:
            top_products_query = top_products_query.join(
                User, UserDebt.user_id == User.id
            ).filter(User.cluster_id == cluster_id)
        
        if group_id:
            top_products_query = top_products_query.join(
                User, UserDebt.user_id == User.id
            ).filter(User.group_id == group_id)
        
        top_products = top_products_query.group_by(
            UserDebt.product_id, Product.name, Product.sku
        ).order_by(
            func.sum(UserDebt.total_cost).desc()
        ).limit(10).all()
        
        return {
            'total_debt_items': result.total_debt_items or 0,
            'total_quantity': result.total_quantity or 0,
            'total_cost': result.total_cost or 0.0,
            'users_with_debt': result.users_with_debt or 0,
            'top_debtors': [
                {
                    'user_id': d.user_id,
                    'user_name': d.full_name,
                    'total_quantity': d.total_quantity,
                    'total_cost': d.total_cost
                }
                for d in top_debtors
            ],
            'top_products': [
                {
                    'product_id': p.product_id,
                    'product_name': p.name,
                    'product_sku': p.sku,
                    'total_quantity': p.total_quantity,
                    'total_cost': p.total_cost
                }
                for p in top_products
            ]
        }


crud_debt = CRUDDebt()