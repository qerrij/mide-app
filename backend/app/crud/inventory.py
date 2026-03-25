import json
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime
from app.models.inventory import UserInventory, InventoryReservation, ReservationType, ReservationStatus
from app.models.user import User, UserRole
from app.models.product import Product


class CRUDInventory:
    
    # ==================== БАЗОВЫЕ МЕТОДЫ ====================
    
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
        quantity_change: int
    ) -> Optional[UserInventory]:
        """
        Обновить инвентарь пользователя (только общее количество)
        Если после обновления quantity становится 0 - запись удаляется
        Возвращает None если запись удалена
        """
        inventory = db.query(UserInventory).filter(
            UserInventory.user_id == user_id,
            UserInventory.product_id == product_id
        ).first()
        
        if not inventory:
            if quantity_change > 0:
                inventory = UserInventory(
                    user_id=user_id,
                    product_id=product_id,
                    quantity=quantity_change
                )
                db.add(inventory)
                db.commit()
                db.refresh(inventory)
                return inventory
            return None
        
        # Обновляем количество
        new_quantity = inventory.quantity + quantity_change
        
        if new_quantity <= 0:
            # Если стало 0 или меньше - удаляем запись
            db.delete(inventory)
            db.commit()
            return None
        else:
            inventory.quantity = new_quantity
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
            
            items = []
            for item in inventory:
                # Получаем активные резервы для этого товара
                reserved = db.query(func.sum(InventoryReservation.quantity)).filter(
                    InventoryReservation.user_id == user_id,
                    InventoryReservation.product_id == item.product_id,
                    InventoryReservation.status == ReservationStatus.ACTIVE
                ).scalar() or 0
                
                items.append({
                    "id": item.id,
                    "user_id": item.user_id,
                    "product_id": item.product_id,
                    "quantity": item.quantity,
                    "reserved_quantity": reserved,
                    "available_quantity": item.quantity - reserved,
                    "product_name": item.product.name if item.product else None,
                    "product_sku": item.product.sku if item.product else None,
                    "product_price": item.product.price if item.product else None,
                    "user_name": item.user.full_name if item.user else None,
                    "user_city": item.user.city if item.user else None,
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
                reserved = db.query(func.sum(InventoryReservation.quantity)).filter(
                    InventoryReservation.user_id == user_id,
                    InventoryReservation.product_id == item.product_id,
                    InventoryReservation.status == ReservationStatus.ACTIVE
                ).scalar() or 0
                
                all_items.append({
                    "id": item.id,
                    "user_id": item.user_id,
                    "product_id": item.product_id,
                    "quantity": item.quantity,
                    "reserved_quantity": reserved,
                    "available_quantity": item.quantity - reserved,
                    "product_name": item.product.name if item.product else None,
                    "product_sku": item.product.sku if item.product else None,
                    "product_price": item.product.price if item.product else None,
                    "user_name": item.user.full_name if item.user else None,
                    "user_city": item.user.city if item.user else None,
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
                    reserved = db.query(func.sum(InventoryReservation.quantity)).filter(
                        InventoryReservation.user_id == seller.id,
                        InventoryReservation.product_id == item.product_id,
                        InventoryReservation.status == ReservationStatus.ACTIVE
                    ).scalar() or 0
                    
                    all_items.append({
                        "id": item.id,
                        "user_id": item.user_id,
                        "product_id": item.product_id,
                        "quantity": item.quantity,
                        "reserved_quantity": reserved,
                        "available_quantity": item.quantity - reserved,
                        "product_name": item.product.name if item.product else None,
                        "product_sku": item.product.sku if item.product else None,
                        "product_price": item.product.price if item.product else None,
                        "user_name": item.user.full_name if item.user else None,
                        "user_city": item.user.city if item.user else None,
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
                    reserved = db.query(func.sum(InventoryReservation.quantity)).filter(
                        InventoryReservation.user_id == cluster_user.id,
                        InventoryReservation.product_id == item.product_id,
                        InventoryReservation.status == ReservationStatus.ACTIVE
                    ).scalar() or 0
                    
                    all_items.append({
                        "id": item.id,
                        "user_id": item.user_id,
                        "product_id": item.product_id,
                        "quantity": item.quantity,
                        "reserved_quantity": reserved,
                        "available_quantity": item.quantity - reserved,
                        "product_name": item.product.name if item.product else None,
                        "product_sku": item.product.sku if item.product else None,
                        "product_price": item.product.price if item.product else None,
                        "user_name": item.user.full_name if item.user else None,
                        "user_city": item.user.city if item.user else None,
                        "created_at": item.created_at,
                        "updated_at": item.updated_at
                    })
                    total_quantity += item.quantity
            
            return {
                "quantity": total_quantity,
                "items": all_items
            }
        
        elif user.role == UserRole.ADMIN:
            # Товары своих кустов + собственные товары
            admin_clusters = []
            
            if user.admin_clusters:
                if isinstance(user.admin_clusters, str):
                    try:
                        admin_clusters = json.loads(user.admin_clusters)
                    except:
                        admin_clusters = []
                elif isinstance(user.admin_clusters, list):
                    admin_clusters = user.admin_clusters
            
            all_items = []
            total_quantity = 0
            
            # Добавляем инвентарь самого администратора
            admin_inventory = db.query(UserInventory).options(
                joinedload(UserInventory.product)
            ).filter(
                UserInventory.user_id == user.id
            ).all()
            
            for item in admin_inventory:
                reserved = db.query(func.sum(InventoryReservation.quantity)).filter(
                    InventoryReservation.user_id == user.id,
                    InventoryReservation.product_id == item.product_id,
                    InventoryReservation.status == ReservationStatus.ACTIVE
                ).scalar() or 0
                
                all_items.append({
                    "id": item.id,
                    "user_id": item.user_id,
                    "product_id": item.product_id,
                    "quantity": item.quantity,
                    "reserved_quantity": reserved,
                    "available_quantity": item.quantity - reserved,
                    "product_name": item.product.name if item.product else None,
                    "product_sku": item.product.sku if item.product else None,
                    "product_price": item.product.price if item.product else None,
                    "user_name": item.user.full_name if item.user else None,
                    "user_city": item.user.city if item.user else None,
                    "created_at": item.created_at,
                    "updated_at": item.updated_at
                })
                total_quantity += item.quantity
            
            # Добавляем товары пользователей из кустов
            if admin_clusters:
                try:
                    cluster_ids = [int(cluster_id) for cluster_id in admin_clusters if cluster_id]
                except ValueError:
                    cluster_ids = []
                
                if cluster_ids:
                    users_in_clusters = db.query(User).filter(
                        User.cluster_id.in_(cluster_ids),
                        User.is_active == True,
                        User.id != user.id
                    ).all()
                    
                    for cluster_user in users_in_clusters:
                        user_inventory = db.query(UserInventory).options(
                            joinedload(UserInventory.product)
                        ).filter(
                            UserInventory.user_id == cluster_user.id
                        ).all()
                        
                        for item in user_inventory:
                            reserved = db.query(func.sum(InventoryReservation.quantity)).filter(
                                InventoryReservation.user_id == cluster_user.id,
                                InventoryReservation.product_id == item.product_id,
                                InventoryReservation.status == ReservationStatus.ACTIVE
                            ).scalar() or 0
                            
                            all_items.append({
                                "id": item.id,
                                "user_id": item.user_id,
                                "product_id": item.product_id,
                                "quantity": item.quantity,
                                "reserved_quantity": reserved,
                                "available_quantity": item.quantity - reserved,
                                "product_name": item.product.name if item.product else None,
                                "product_sku": item.product.sku if item.product else None,
                                "product_price": item.product.price if item.product else None,
                                "user_name": item.user.full_name if item.user else None,
                                "user_city": item.user.city if item.user else None,
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
                    # Получаем активные резервы для этого пользователя
                    reserved = db.query(func.sum(InventoryReservation.quantity)).filter(
                        InventoryReservation.user_id == db_user.id,
                        InventoryReservation.product_id == item.product_id,
                        InventoryReservation.status == ReservationStatus.ACTIVE
                    ).scalar() or 0
                    
                    all_items.append({
                        "id": item.id,
                        "user_id": item.user_id,
                        "product_id": item.product_id,
                        "quantity": item.quantity,
                        "reserved_quantity": reserved,
                        "available_quantity": item.quantity - reserved,
                        "product_name": item.product.name if item.product else None,
                        "product_sku": item.product.sku if item.product else None,
                        "product_price": item.product.price if item.product else None,
                        "user_name": item.user.full_name if item.user else None,
                        "user_city": item.user.city if item.user else None,
                        "created_at": item.created_at,
                        "updated_at": item.updated_at
                    })
                    total_quantity += item.quantity
            
            return {
                "quantity": total_quantity,
                "items": all_items
            }
        
        return {"quantity": 0, "items": []}
    
    # ==================== МЕТОДЫ ДЛЯ РАБОТЫ С РЕЗЕРВАМИ ====================
    
    def get_available_quantity(self, db: Session, user_id: int, product_id: int) -> int:
        """
        Получить доступное количество товара (общее - все активные резервы)
        """
        total = self.get_user_product_quantity(db, user_id, product_id)
        
        reserved = db.query(func.sum(InventoryReservation.quantity)).filter(
            InventoryReservation.user_id == user_id,
            InventoryReservation.product_id == product_id,
            InventoryReservation.status == ReservationStatus.ACTIVE
        ).scalar() or 0
        
        return total - reserved
    
    def check_availability(self, db: Session, user_id: int, product_id: int, 
                          required_quantity: int) -> Tuple[bool, int, int]:
        """
        Проверить доступность товара
        """
        available = self.get_available_quantity(db, user_id, product_id)
        total = self.get_user_product_quantity(db, user_id, product_id)
        
        return required_quantity <= available, available, total
    
    # ==================== УПРАВЛЕНИЕ РЕЗЕРВАМИ ДЛЯ ПЕРЕМЕЩЕНИЙ ====================
    
    def reserve_for_transfer(self, db: Session, user_id: int, product_id: int, 
                            quantity: int, transfer_id: int) -> InventoryReservation:
        """
        Зарезервировать товар для перемещения
        """
        # Получаем или создаем запись инвентаря
        inventory = db.query(UserInventory).filter(
            UserInventory.user_id == user_id,
            UserInventory.product_id == product_id
        ).first()
        
        if not inventory:
            inventory = UserInventory(
                user_id=user_id,
                product_id=product_id,
                quantity=0
            )
            db.add(inventory)
            db.flush()
        
        # Проверяем доступность
        available = self.get_available_quantity(db, user_id, product_id)
        if available < quantity:
            raise ValueError(
                f"Недостаточно товара ID {product_id}. "
                f"Доступно: {available}, требуется: {quantity}"
            )
        
        # Создаем резерв
        reservation = InventoryReservation(
            inventory_id=inventory.id,
            user_id=user_id,
            product_id=product_id,
            quantity=quantity,
            reservation_type=ReservationType.TRANSFER,
            reservation_id=transfer_id,
            status=ReservationStatus.ACTIVE
        )
        
        db.add(reservation)
        db.commit()
        db.refresh(reservation)
        
        return reservation
    
    def release_transfer_reservations(self, db: Session, user_id: int, transfer_id: int) -> int:
        """
        Освободить все резервы перемещения (при отмене)
        """
        reservations = db.query(InventoryReservation).filter(
            InventoryReservation.user_id == user_id,
            InventoryReservation.reservation_type == ReservationType.TRANSFER,
            InventoryReservation.reservation_id == transfer_id,
            InventoryReservation.status == ReservationStatus.ACTIVE
        ).all()
        
        count = 0
        for reservation in reservations:
            reservation.status = ReservationStatus.RELEASED
            reservation.released_at = datetime.now()
            count += 1
        
        if count > 0:
            db.commit()
        
        return count
    
    def consume_transfer_reservations(self, db: Session, user_id: int, transfer_id: int) -> int:
        """
        Потребить все резервы перемещения (при успешном завершении)
        """
        reservations = db.query(InventoryReservation).filter(
            InventoryReservation.user_id == user_id,
            InventoryReservation.reservation_type == ReservationType.TRANSFER,
            InventoryReservation.reservation_id == transfer_id,
            InventoryReservation.status == ReservationStatus.ACTIVE
        ).all()
        
        count = 0
        for reservation in reservations:
            reservation.status = ReservationStatus.CONSUMED
            reservation.consumed_at = datetime.now()
            
            # Уменьшаем общее количество товара
            inventory = db.query(UserInventory).filter(
                UserInventory.id == reservation.inventory_id
            ).first()
            if inventory:
                inventory.quantity -= reservation.quantity
            
            count += 1
        
        if count > 0:
            db.commit()
        
        return count
    
    def get_transfer_reservations(self, db: Session, user_id: int, 
                                  transfer_id: int) -> List[InventoryReservation]:
        """
        Получить все резервы перемещения
        """
        return db.query(InventoryReservation).filter(
            InventoryReservation.user_id == user_id,
            InventoryReservation.reservation_type == ReservationType.TRANSFER,
            InventoryReservation.reservation_id == transfer_id
        ).all()
    
    def transfer_complete(self, db: Session, from_user_id: int, to_user_id: int,
                         product_id: int, quantity: int, transfer_id: int) -> bool:
        """
        Завершить перемещение товара от одного пользователя к другому
        """
        # Получаем инвентарь отправителя
        from_inventory = db.query(UserInventory).filter(
            UserInventory.user_id == from_user_id,
            UserInventory.product_id == product_id
        ).first()
        
        if not from_inventory:
            raise ValueError(f"У отправителя нет товара ID {product_id}")
        
        # Проверяем, есть ли резерв под это перемещение
        reservation = db.query(InventoryReservation).filter(
            InventoryReservation.user_id == from_user_id,
            InventoryReservation.product_id == product_id,
            InventoryReservation.reservation_type == ReservationType.TRANSFER,
            InventoryReservation.reservation_id == transfer_id,
            InventoryReservation.status == ReservationStatus.ACTIVE
        ).first()
        
        if reservation:
            # Потребляем резерв
            reservation.status = ReservationStatus.CONSUMED
            reservation.consumed_at = datetime.now()
        
        # Уменьшаем количество у отправителя
        new_from_quantity = from_inventory.quantity - quantity
        
        if new_from_quantity <= 0:
            # Если стало 0 - удаляем запись
            db.delete(from_inventory)
        else:
            from_inventory.quantity = new_from_quantity
        
        # Добавляем получателю
        to_inventory = db.query(UserInventory).filter(
            UserInventory.user_id == to_user_id,
            UserInventory.product_id == product_id
        ).first()
        
        if not to_inventory:
            if quantity > 0:  # Создаем только если количество > 0
                to_inventory = UserInventory(
                    user_id=to_user_id,
                    product_id=product_id,
                    quantity=quantity
                )
                db.add(to_inventory)
        else:
            to_inventory.quantity += quantity
        
        db.commit()
        return True
    
    # ==================== УПРАВЛЕНИЕ РЕЗЕРВАМИ ДЛЯ ОТЧЕТОВ ====================
    
    def reserve_for_report(self, db: Session, user_id: int, product_id: int,
                          quantity: int, report_id: int) -> InventoryReservation:
        """
        Зарезервировать товар для отчета
        """
        inventory = db.query(UserInventory).filter(
            UserInventory.user_id == user_id,
            UserInventory.product_id == product_id
        ).first()
        
        if not inventory:
            inventory = UserInventory(
                user_id=user_id,
                product_id=product_id,
                quantity=0
            )
            db.add(inventory)
            db.flush()
        
        # Проверяем доступность
        available = self.get_available_quantity(db, user_id, product_id)
        if available < quantity:
            raise ValueError(
                f"Недостаточно товара ID {product_id}. "
                f"Доступно: {available}, требуется: {quantity}"
            )
        
        reservation = InventoryReservation(
            inventory_id=inventory.id,
            user_id=user_id,
            product_id=product_id,
            quantity=quantity,
            reservation_type=ReservationType.REPORT,
            reservation_id=report_id,
            status=ReservationStatus.ACTIVE
        )
        
        db.add(reservation)
        db.commit()
        db.refresh(reservation)
        
        return reservation
    
    def release_report_reservations(self, db: Session, user_id: int, report_id: int) -> int:
        """
        Освободить все резервы отчета
        """
        reservations = db.query(InventoryReservation).filter(
            InventoryReservation.user_id == user_id,
            InventoryReservation.reservation_type == ReservationType.REPORT,
            InventoryReservation.reservation_id == report_id,
            InventoryReservation.status == ReservationStatus.ACTIVE
        ).all()
        
        count = 0
        for reservation in reservations:
            reservation.status = ReservationStatus.RELEASED
            reservation.released_at = datetime.now()
            count += 1
        
        if count > 0:
            db.commit()
        
        return count
    
    def finalize_report_reservations(self, db: Session, user_id: int, report_id: int) -> int:
        """
        Финальное списание товаров после принятия отчета
        """
        reservations = db.query(InventoryReservation).filter(
            InventoryReservation.user_id == user_id,
            InventoryReservation.reservation_type == ReservationType.REPORT,
            InventoryReservation.reservation_id == report_id,
            InventoryReservation.status == ReservationStatus.ACTIVE
        ).all()
        
        count = 0
        for reservation in reservations:
            reservation.status = ReservationStatus.CONSUMED
            reservation.consumed_at = datetime.now()
            
            # Уменьшаем общее количество товара
            inventory = db.query(UserInventory).filter(
                UserInventory.id == reservation.inventory_id
            ).first()
            
            if inventory:
                new_quantity = inventory.quantity - reservation.quantity
                if new_quantity <= 0:
                    # Если стало 0 - удаляем запись
                    db.delete(inventory)
                else:
                    inventory.quantity = new_quantity
            
            count += 1
        
        if count > 0:
            db.commit()
        
        return count
    
    # ==================== МЕТОДЫ ДЛЯ БРАКОВ ====================
    
    def reserve_for_rejection(self, db: Session, user_id: int, product_id: int,
                            quantity: int, rejection_id: int) -> InventoryReservation:
        """
        Зарезервировать товар для брака
        """
        inventory = db.query(UserInventory).filter(
            UserInventory.user_id == user_id,
            UserInventory.product_id == product_id
        ).first()
        
        if not inventory:
            inventory = UserInventory(
                user_id=user_id,
                product_id=product_id,
                quantity=0
            )
            db.add(inventory)
            db.flush()
        
        # Проверяем доступность
        available = self.get_available_quantity(db, user_id, product_id)
        if available < quantity:
            raise ValueError(
                f"Недостаточно товара ID {product_id}. "
                f"Доступно: {available}, требуется: {quantity}"
            )
        
        reservation = InventoryReservation(
            inventory_id=inventory.id,
            user_id=user_id,
            product_id=product_id,
            quantity=quantity,
            reservation_type=ReservationType.REJECTION,
            reservation_id=rejection_id,
            status=ReservationStatus.ACTIVE
        )
        
        db.add(reservation)
        db.commit()
        db.refresh(reservation)
        
        return reservation
    
    def apply_rejection(self, db: Session, user_id: int, product_id: int,
                       quantity: int, rejection_id: int) -> bool:
        """
        Применить брак (списать товары)
        """
        inventory = db.query(UserInventory).filter(
            UserInventory.user_id == user_id,
            UserInventory.product_id == product_id
        ).first()
        
        if not inventory:
            raise ValueError(f"У пользователя нет товара ID {product_id}")
        
        if inventory.quantity < quantity:
            raise ValueError(
                f"Недостаточно товара ID {product_id}. "
                f"Доступно: {inventory.quantity}, требуется: {quantity}"
            )
        
        # Списываем товар
        new_quantity = inventory.quantity - quantity
        if new_quantity <= 0:
            # Если стало 0 - удаляем запись
            db.delete(inventory)
        else:
            inventory.quantity = new_quantity
        
        # Находим и потребляем резерв
        reservation = db.query(InventoryReservation).filter(
            InventoryReservation.user_id == user_id,
            InventoryReservation.product_id == product_id,
            InventoryReservation.reservation_type == ReservationType.REJECTION,
            InventoryReservation.reservation_id == rejection_id,
            InventoryReservation.status == ReservationStatus.ACTIVE
        ).first()
        
        if reservation:
            reservation.status = ReservationStatus.CONSUMED
            reservation.consumed_at = datetime.now()
        
        db.commit()
        return True
    
    def revert_rejection(self, db: Session, user_id: int, product_id: int,
                        quantity: int, rejection_id: int) -> bool:
        """
        Отменить брак (вернуть товары)
        """
        inventory = db.query(UserInventory).filter(
            UserInventory.user_id == user_id,
            UserInventory.product_id == product_id
        ).first()
        
        if not inventory:
            inventory = UserInventory(
                user_id=user_id,
                product_id=product_id,
                quantity=quantity
            )
            db.add(inventory)
        else:
            inventory.quantity += quantity
        
        # Освобождаем резерв
        reservation = db.query(InventoryReservation).filter(
            InventoryReservation.user_id == user_id,
            InventoryReservation.product_id == product_id,
            InventoryReservation.reservation_type == ReservationType.REJECTION,
            InventoryReservation.reservation_id == rejection_id,
            InventoryReservation.status == ReservationStatus.ACTIVE
        ).first()
        
        if reservation:
            reservation.status = ReservationStatus.RELEASED
            reservation.released_at = datetime.now()
        
        db.commit()
        return True
    
    # ==================== МЕТОДЫ ДЛЯ РЕВИЗИЙ ====================
    
    def apply_revision_discrepancies(
        self, 
        db: Session, 
        revision_id: int
    ) -> Dict[str, any]:
        """Применить расхождения ревизии к инвентарю пользователей"""
        from app.models.revision import RevisionDiscrepancy
        
        discrepancies = db.query(RevisionDiscrepancy)\
            .filter(RevisionDiscrepancy.revision_id == revision_id)\
            .all()
        
        applied_count = 0
        total_positive = 0
        total_negative = 0
        
        for disc in discrepancies:
            quantity_change = disc.discrepancy
            
            self.update_inventory(
                db,
                user_id=disc.user_id,
                product_id=disc.product_id,
                quantity_change=quantity_change
            )
            
            applied_count += 1
            
            if disc.is_positive:
                total_positive += quantity_change
            else:
                total_negative += abs(quantity_change)
        
        return {
            'applied_count': applied_count,
            'total_positive': total_positive,
            'total_negative': total_negative
        }

    def reserve_products_for_report(
        self, 
        db: Session, 
        user_id: int, 
        products: List[Dict],
        report_id: int
    ) -> bool:
        """
        Зарезервировать товары для отчета (все товары сразу)
        """
        for product in products:
            product_id = product.get('product_id') or product.get('productId')
            quantity = product.get('quantity', 0)
            
            if not product_id or quantity <= 0:
                continue
            
            # Проверяем доступность
            available = self.get_available_quantity(db, user_id, product_id)
            if available < quantity:
                raise ValueError(
                    f"Недостаточно товара ID {product_id}. "
                    f"Доступно: {available}, требуется: {quantity}"
                )
            
            # Создаем резерв
            self.reserve_for_report(
                db,
                user_id=user_id,
                product_id=product_id,
                quantity=quantity,
                report_id=report_id
            )
        
        return True

crud_inventory = CRUDInventory()