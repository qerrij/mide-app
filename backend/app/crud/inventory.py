from sqlalchemy.orm import Session, joinedload
from typing import List, Optional, Dict
from sqlalchemy import func, and_
from app.models.inventory import UserInventory
from app.models.user import User, UserRole

class CRUDInventory:
    def get_user_inventory(self, db: Session, user_id: int) -> List[UserInventory]:
        """Получить весь инвентарь пользователя"""
        return db.query(UserInventory).filter(
            UserInventory.user_id == user_id
        ).all()
    
    def get_user_product_quantity(self, db: Session, user_id: int, product_id: int) -> int:
        """Получить количество конкретного товара у пользователя"""
        inventory = db.query(UserInventory).filter(
            UserInventory.user_id == user_id,
            UserInventory.product_id == product_id
        ).first()
        return inventory.quantity if inventory else 0
    
    def update_inventory(
        self, 
        db: Session, 
        user_id: int, 
        product_id: int, 
        quantity_change: int,
        reserved_change: int = 0
    ) -> UserInventory:
        """Обновить инвентарь пользователя"""
        inventory = db.query(UserInventory).filter(
            UserInventory.user_id == user_id,
            UserInventory.product_id == product_id
        ).first()
        
        if not inventory:
            inventory = UserInventory(
                user_id=user_id,
                product_id=product_id,
                quantity=quantity_change,
                reserved_quantity=reserved_change
            )
            db.add(inventory)
        else:
            inventory.quantity += quantity_change
            inventory.reserved_quantity += reserved_change
            
        db.commit()
        db.refresh(inventory)
        return inventory
    
    def get_total_inventory_for_user(self, db: Session, user_id: int) -> Dict:
        """Получить общее количество товаров у пользователя с учетом подчиненных"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"quantity": 0, "items": []}
        
        # Базовая логика в зависимости от роли
        if user.role == UserRole.SELLER:
            # Только свои товары
            inventory = db.query(UserInventory).options(
                joinedload(UserInventory.product)
            ).filter(
                UserInventory.user_id == user_id
            ).all()
            
            total = sum(item.quantity for item in inventory)
            
            # Преобразуем объекты модели в словари
            items = []
            for item in inventory:
                items.append({
                    "id": item.id,
                    "user_id": item.user_id,
                    "product_id": item.product_id,
                    "quantity": item.quantity,
                    "reserved_quantity": item.reserved_quantity,
                    "product_name": item.product.name if item.product else None,
                    "product_sku": item.product.sku if item.product else None,
                    "product_price": item.product.price if item.product else None,
                    "created_at": item.created_at,
                    "updated_at": item.updated_at
                })
            
            return {
                "quantity": total,
                "items": items
            }
        
        elif user.role == UserRole.MENTOR:
            # Свои товары + товары подопечных продавцов
            sellers = db.query(User).filter(
                User.mentor_id == user_id,
                User.is_active == True
            ).all()
            
            all_items = []
            total_quantity = 0
            
            # Добавляем свои товары
            own_inventory = db.query(UserInventory).options(
                joinedload(UserInventory.product)
            ).filter(
                UserInventory.user_id == user_id
            ).all()
            
            for item in own_inventory:
                all_items.append({
                    "id": item.id,
                    "user_id": item.user_id,
                    "product_id": item.product_id,
                    "quantity": item.quantity,
                    "reserved_quantity": item.reserved_quantity,
                    "product_name": item.product.name if item.product else None,
                    "product_sku": item.product.sku if item.product else None,
                    "product_price": item.product.price if item.product else None,
                    "created_at": item.created_at,
                    "updated_at": item.updated_at
                })
                total_quantity += item.quantity
            
            # Добавляем товары продавцов
            for seller in sellers:
                seller_inventory = db.query(UserInventory).options(
                    joinedload(UserInventory.product)
                ).filter(
                    UserInventory.user_id == seller.id
                ).all()
                
                for item in seller_inventory:
                    all_items.append({
                        "id": item.id,
                        "user_id": item.user_id,
                        "product_id": item.product_id,
                        "quantity": item.quantity,
                        "reserved_quantity": item.reserved_quantity,
                        "product_name": item.product.name if item.product else None,
                        "product_sku": item.product.sku if item.product else None,
                        "product_price": item.product.price if item.product else None,
                        "created_at": item.created_at,
                        "updated_at": item.updated_at
                    })
                    total_quantity += item.quantity
            
            return {
                "quantity": total_quantity,
                "items": all_items
            }
        
        elif user.role == UserRole.SENIOR_SELLER:
            # Товары своего куста
            users_in_cluster = db.query(User).filter(
                User.cluster_id == user.cluster_id,
                User.is_active == True
            ).all()
            
            all_items = []
            total_quantity = 0
            
            for cluster_user in users_in_cluster:
                user_inventory = db.query(UserInventory).options(
                    joinedload(UserInventory.product)
                ).filter(
                    UserInventory.user_id == cluster_user.id
                ).all()
                
                for item in user_inventory:
                    all_items.append({
                        "id": item.id,
                        "user_id": item.user_id,
                        "product_id": item.product_id,
                        "quantity": item.quantity,
                        "reserved_quantity": item.reserved_quantity,
                        "product_name": item.product.name if item.product else None,
                        "product_sku": item.product.sku if item.product else None,
                        "product_price": item.product.price if item.product else None,
                        "created_at": item.created_at,
                        "updated_at": item.updated_at
                    })
                    total_quantity += item.quantity
            
            return {
                "quantity": total_quantity,
                "items": all_items
            }
        
        elif user.role == UserRole.ADMIN:
            # Товары своих кустов
            import json
            admin_clusters = []
            if user.admin_clusters:
                try:
                    admin_clusters = json.loads(user.admin_clusters)
                except:
                    admin_clusters = []
            
            if not admin_clusters:
                return {"quantity": 0, "items": []}
            
            users_in_clusters = db.query(User).filter(
                User.cluster_id.in_(admin_clusters),
                User.is_active == True
            ).all()
            
            all_items = []
            total_quantity = 0
            
            for cluster_user in users_in_clusters:
                user_inventory = db.query(UserInventory).options(
                    joinedload(UserInventory.product)
                ).filter(
                    UserInventory.user_id == cluster_user.id
                ).all()
                
                for item in user_inventory:
                    all_items.append({
                        "id": item.id,
                        "user_id": item.user_id,
                        "product_id": item.product_id,
                        "quantity": item.quantity,
                        "reserved_quantity": item.reserved_quantity,
                        "product_name": item.product.name if item.product else None,
                        "product_sku": item.product.sku if item.product else None,
                        "product_price": item.product.price if item.product else None,
                        "created_at": item.created_at,
                        "updated_at": item.updated_at
                    })
                    total_quantity += item.quantity
            
            return {
                "quantity": total_quantity,
                "items": all_items
            }
        
        elif user.role == UserRole.OWNER:
            # Все товары всех пользователей
            all_users = db.query(User).filter(User.is_active == True).all()
            
            all_items = []
            total_quantity = 0
            
            for db_user in all_users:
                user_inventory = db.query(UserInventory).options(
                    joinedload(UserInventory.product)
                ).filter(
                    UserInventory.user_id == db_user.id
                ).all()
                
                for item in user_inventory:
                    all_items.append({
                        "id": item.id,
                        "user_id": item.user_id,
                        "product_id": item.product_id,
                        "quantity": item.quantity,
                        "reserved_quantity": item.reserved_quantity,
                        "product_name": item.product.name if item.product else None,
                        "product_sku": item.product.sku if item.product else None,
                        "product_price": item.product.price if item.product else None,
                        "created_at": item.created_at,
                        "updated_at": item.updated_at
                    })
                    total_quantity += item.quantity
            
            return {
                "quantity": total_quantity,
                "items": all_items
            }
        
        return {"quantity": 0, "items": []}
    
    def reserve_products_for_report(
        self, 
        db: Session, 
        user_id: int, 
        products: List[Dict]
    ) -> bool:
        """Резервировать товары для отчета"""
        for product in products:
            product_id = product.get('product_id')
            quantity = product.get('quantity', 0)
            
            current_quantity = self.get_user_product_quantity(db, user_id, product_id)
            
            if current_quantity < quantity:
                raise ValueError(f"Недостаточно товара {product_id}. Доступно: {current_quantity}, требуется: {quantity}")
            
            # Резервируем товар
            self.update_inventory(
                db, 
                user_id, 
                product_id, 
                quantity_change=-quantity,
                reserved_change=quantity
            )
        
        return True
    
    def release_reserved_products(
        self, 
        db: Session, 
        user_id: int, 
        products: List[Dict]
    ) -> bool:
        """Освободить зарезервированные товары"""
        for product in products:
            product_id = product.get('product_id')
            quantity = product.get('quantity', 0)
            
            # Возвращаем товар из резерва
            self.update_inventory(
                db, 
                user_id, 
                product_id, 
                quantity_change=quantity,
                reserved_change=-quantity
            )
        
        return True
    
    def finalize_report_products(
        self, 
        db: Session, 
        user_id: int, 
        products: List[Dict]
    ) -> bool:
        """Финальное списание товаров после принятия отчета"""
        for product in products:
            product_id = product.get('product_id')
            quantity = product.get('quantity', 0)
            
            # Окончательно списываем товар
            self.update_inventory(
                db, 
                user_id, 
                product_id,
                quantity_change=0, 
                reserved_change=-quantity
            )
        
        return True
    

    def apply_revision_discrepancies(
        self, 
        db: Session, 
        revision_id: int
    ) -> Dict[str, any]:
        """Применить расхождения ревизии к инвентарю пользователей"""
        from app.models.revision import RevisionDiscrepancy
        
        # Получаем все расхождения для ревизии
        discrepancies = db.query(RevisionDiscrepancy)\
            .filter(RevisionDiscrepancy.revision_id == revision_id)\
            .all()
        
        applied_count = 0
        total_positive = 0
        total_negative = 0
        
        # Применяем каждое расхождение
        for disc in discrepancies:
            # Изменение количества (плюс или минус)
            quantity_change = disc.discrepancy
            
            # Обновляем инвентарь пользователя
            self.update_inventory(
                db,
                user_id=disc.user_id,
                product_id=disc.product_id,
                quantity_change=quantity_change
            )
            
            applied_count += 1
            
            # Считаем статистику
            if disc.is_positive:
                total_positive += quantity_change
            else:
                total_negative += abs(quantity_change)
        
        return {
            'applied_count': applied_count,
            'total_positive': total_positive,
            'total_negative': total_negative
        }

crud_inventory = CRUDInventory()