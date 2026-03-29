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
    
    def get_total_inventory_for_user(
        self, 
        db: Session, 
        user_id: int,
        page: int = 0, 
        limit: int = 100,
        user_filter: Optional[int] = None,
        category_filter: Optional[int] = None,
        product_filter: Optional[int] = None,
        city_filter: Optional[str] = None
    ) -> Dict:
        """Получить общее количество товаров у пользователя с учетом подчиненных"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"quantity": 0, "items": [], "total_count": 0, "has_more": False}
        
        # Базовая логика в зависимости от роли
        if user.role == UserRole.SELLER:
            return self._get_seller_inventory(db, user_id)
        
        elif user.role == UserRole.MENTOR:
            return self._get_mentor_inventory(db, user_id)
        
        elif user.role == UserRole.SENIOR_SELLER:
            return self._get_senior_seller_inventory(db, user_id)
        
        elif user.role == UserRole.ADMIN:
            return self._get_admin_inventory(db, user_id)
        
        elif user.role == UserRole.OWNER:
            return self._get_owner_inventory(
                db, 
                page=page, 
                limit=limit,
                user_filter=user_filter,
                category_filter=category_filter,
                product_filter=product_filter,
                city_filter=city_filter
            )
        
        return {"quantity": 0, "items": [], "total_count": 0, "has_more": False}
    
    def _get_seller_inventory(self, db: Session, user_id: int) -> Dict:
        """Получение инвентаря для продавца (только свои товары)"""
        # Получаем свои товары
        inventory_items = db.query(UserInventory).options(
            joinedload(UserInventory.product),
            joinedload(UserInventory.user)
        ).filter(
            UserInventory.user_id == user_id,
            UserInventory.quantity > 0
        ).all()
        
        total_quantity = sum(item.quantity for item in inventory_items)
        
        # Получаем резервы для всех товаров
        items = []
        for inventory in inventory_items:
            reserved = db.query(func.sum(InventoryReservation.quantity)).filter(
                InventoryReservation.user_id == user_id,
                InventoryReservation.product_id == inventory.product_id,
                InventoryReservation.status == ReservationStatus.ACTIVE
            ).scalar() or 0
            
            items.append({
                "id": inventory.id,
                "user_id": inventory.user_id,
                "product_id": inventory.product_id,
                "quantity": inventory.quantity,
                "reserved_quantity": reserved,
                "available_quantity": inventory.quantity - reserved,
                "product_name": inventory.product.name if inventory.product else None,
                "product_sku": inventory.product.sku if inventory.product else None,
                "product_price": inventory.product.price if inventory.product else None,
                "user_name": inventory.user.full_name if inventory.user else None,
                "user_city": inventory.user.city if inventory.user else None,
                "created_at": inventory.created_at,
                "updated_at": inventory.updated_at
            })
        
        return {
            "quantity": total_quantity,
            "total_value": sum(item["quantity"] * (item["product_price"] or 0) for item in items),
            "items": items,
            "total_count": len(items),
            "has_more": False,
            "page": 0,
            "limit": len(items)
        }
    
    def _get_mentor_inventory(self, db: Session, user_id: int) -> Dict:
        """Получение инвентаря для наставника (свои товары + товары подопечных продавцов)"""
        # Получаем подопечных продавцов
        sellers = db.query(User).filter(
            User.mentor_id == user_id,
            User.is_active == True
        ).all()
        
        user_ids = [user_id] + [seller.id for seller in sellers]
        
        # Получаем товары для всех пользователей
        inventory_items = db.query(UserInventory).options(
            joinedload(UserInventory.product),
            joinedload(UserInventory.user)
        ).filter(
            UserInventory.user_id.in_(user_ids),
            UserInventory.quantity > 0
        ).all()
        
        total_quantity = sum(item.quantity for item in inventory_items)
        total_value = sum(item.quantity * (item.product.price if item.product else 0) for item in inventory_items)
        
        # Получаем резервы для всех товаров
        items = []
        for inventory in inventory_items:
            reserved = db.query(func.sum(InventoryReservation.quantity)).filter(
                InventoryReservation.user_id == inventory.user_id,
                InventoryReservation.product_id == inventory.product_id,
                InventoryReservation.status == ReservationStatus.ACTIVE
            ).scalar() or 0
            
            items.append({
                "id": inventory.id,
                "user_id": inventory.user_id,
                "product_id": inventory.product_id,
                "quantity": inventory.quantity,
                "reserved_quantity": reserved,
                "available_quantity": inventory.quantity - reserved,
                "product_name": inventory.product.name if inventory.product else None,
                "product_sku": inventory.product.sku if inventory.product else None,
                "product_price": inventory.product.price if inventory.product else None,
                "user_name": inventory.user.full_name if inventory.user else None,
                "user_city": inventory.user.city if inventory.user else None,
                "created_at": inventory.created_at,
                "updated_at": inventory.updated_at
            })
        
        return {
            "quantity": total_quantity,
            "total_value": total_value,
            "items": items,
            "total_count": len(items),
            "has_more": False,
            "page": 0,
            "limit": len(items)
        }
    
    def _get_senior_seller_inventory(self, db: Session, user_id: int) -> Dict:
        """Получение инвентаря для старшего продавца (товары своего куста)"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.cluster_id:
            return {"quantity": 0, "items": [], "total_count": 0, "has_more": False, "total_value": 0}
        
        # Получаем всех пользователей в кусте
        users_in_cluster = db.query(User).filter(
            User.cluster_id == user.cluster_id,
            User.is_active == True
        ).all()
        
        user_ids = [u.id for u in users_in_cluster]
        
        # Получаем товары для всех пользователей куста
        inventory_items = db.query(UserInventory).options(
            joinedload(UserInventory.product),
            joinedload(UserInventory.user)
        ).filter(
            UserInventory.user_id.in_(user_ids),
            UserInventory.quantity > 0
        ).all()
        
        total_quantity = sum(item.quantity for item in inventory_items)
        total_value = sum(item.quantity * (item.product.price if item.product else 0) for item in inventory_items)
        
        items = []
        for inventory in inventory_items:
            reserved = db.query(func.sum(InventoryReservation.quantity)).filter(
                InventoryReservation.user_id == inventory.user_id,
                InventoryReservation.product_id == inventory.product_id,
                InventoryReservation.status == ReservationStatus.ACTIVE
            ).scalar() or 0
            
            items.append({
                "id": inventory.id,
                "user_id": inventory.user_id,
                "product_id": inventory.product_id,
                "quantity": inventory.quantity,
                "reserved_quantity": reserved,
                "available_quantity": inventory.quantity - reserved,
                "product_name": inventory.product.name if inventory.product else None,
                "product_sku": inventory.product.sku if inventory.product else None,
                "product_price": inventory.product.price if inventory.product else None,
                "user_name": inventory.user.full_name if inventory.user else None,
                "user_city": inventory.user.city if inventory.user else None,
                "created_at": inventory.created_at,
                "updated_at": inventory.updated_at
            })
        
        return {
            "quantity": total_quantity,
            "total_value": total_value,
            "items": items,
            "total_count": len(items),
            "has_more": False,
            "page": 0,
            "limit": len(items)
        }
    
    def _get_admin_inventory(self, db: Session, user_id: int) -> Dict:
        """Получение инвентаря для администратора (товары своих кустов + собственные товары)"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"quantity": 0, "items": [], "total_count": 0, "has_more": False, "total_value": 0}
        
        user_ids = [user_id]  # Добавляем самого администратора
        
        # Получаем кусты администратора
        admin_clusters = []
        if user.admin_clusters:
            if isinstance(user.admin_clusters, str):
                try:
                    admin_clusters = json.loads(user.admin_clusters)
                except:
                    admin_clusters = []
            elif isinstance(user.admin_clusters, list):
                admin_clusters = user.admin_clusters
        
        # Добавляем пользователей из кустов администратора
        if admin_clusters:
            try:
                cluster_ids = [int(cluster_id) for cluster_id in admin_clusters if cluster_id]
                if cluster_ids:
                    users_in_clusters = db.query(User).filter(
                        User.cluster_id.in_(cluster_ids),
                        User.is_active == True,
                        User.id != user_id
                    ).all()
                    user_ids.extend([u.id for u in users_in_clusters])
            except ValueError:
                pass
        
        # Получаем уникальные user_ids
        user_ids = list(set(user_ids))
        
        # Получаем товары для всех пользователей
        inventory_items = db.query(UserInventory).options(
            joinedload(UserInventory.product),
            joinedload(UserInventory.user)
        ).filter(
            UserInventory.user_id.in_(user_ids),
            UserInventory.quantity > 0
        ).all()
        
        total_quantity = sum(item.quantity for item in inventory_items)
        total_value = sum(item.quantity * (item.product.price if item.product else 0) for item in inventory_items)
        
        items = []
        for inventory in inventory_items:
            reserved = db.query(func.sum(InventoryReservation.quantity)).filter(
                InventoryReservation.user_id == inventory.user_id,
                InventoryReservation.product_id == inventory.product_id,
                InventoryReservation.status == ReservationStatus.ACTIVE
            ).scalar() or 0
            
            items.append({
                "id": inventory.id,
                "user_id": inventory.user_id,
                "product_id": inventory.product_id,
                "quantity": inventory.quantity,
                "reserved_quantity": reserved,
                "available_quantity": inventory.quantity - reserved,
                "product_name": inventory.product.name if inventory.product else None,
                "product_sku": inventory.product.sku if inventory.product else None,
                "product_price": inventory.product.price if inventory.product else None,
                "user_name": inventory.user.full_name if inventory.user else None,
                "user_city": inventory.user.city if inventory.user else None,
                "created_at": inventory.created_at,
                "updated_at": inventory.updated_at
            })
        
        return {
            "quantity": total_quantity,
            "total_value": total_value,
            "items": items,
            "total_count": len(items),
            "has_more": False,
            "page": 0,
            "limit": len(items)
        }
    
    def _get_owner_inventory(
        self, 
        db: Session, 
        page: int = 0, 
        limit: int = 100, 
        user_filter: Optional[int] = None,
        category_filter: Optional[int] = None,
        product_filter: Optional[int] = None,
        city_filter: Optional[str] = None
    ) -> Dict:
        """Получение инвентаря для владельца с пагинацией и статистикой"""
        # Базовый запрос с фильтрами
        base_query = db.query(UserInventory).join(
            Product, UserInventory.product_id == Product.id
        ).join(
            User, UserInventory.user_id == User.id
        ).filter(
            UserInventory.quantity > 0
        )
        
        # Применяем фильтры к базовому запросу
        if user_filter:
            base_query = base_query.filter(UserInventory.user_id == user_filter)
        if category_filter:
            base_query = base_query.filter(Product.category_id == category_filter)
        if product_filter:
            base_query = base_query.filter(UserInventory.product_id == product_filter)
        if city_filter:
            base_query = base_query.filter(User.city == city_filter)
        
        # Считаем статистику по всем данным (без пагинации)
        stats_result = base_query.with_entities(
            func.sum(UserInventory.quantity).label('total_quantity'),
            func.sum(UserInventory.quantity * Product.price).label('total_value')
        ).first()
        
        total_quantity = stats_result[0] or 0
        total_value = stats_result[1] or 0
        
        # Считаем общее количество записей для пагинации
        total_count = base_query.count()
        has_more = (page + 1) * limit < total_count
        
        # Получаем пагинированные данные
        inventory_items = base_query.order_by(
            UserInventory.id
        ).offset(page * limit).limit(limit).all()
        
        if not inventory_items:
            return {
                "quantity": total_quantity,
                "total_value": total_value,
                "items": [],
                "total_count": total_count,
                "has_more": False,
                "page": page,
                "limit": limit
            }
        
        # Получаем резервы для пагинированных items
        product_ids = [item.product_id for item in inventory_items]
        user_ids = [item.user_id for item in inventory_items]
        
        reservations = db.query(
            InventoryReservation.user_id,
            InventoryReservation.product_id,
            func.sum(InventoryReservation.quantity).label('total_reserved')
        ).filter(
            InventoryReservation.user_id.in_(user_ids),
            InventoryReservation.product_id.in_(product_ids),
            InventoryReservation.status == ReservationStatus.ACTIVE
        ).group_by(
            InventoryReservation.user_id,
            InventoryReservation.product_id
        ).all()
        
        reserved_dict = {(r.user_id, r.product_id): r.total_reserved for r in reservations}
        
        items = []
        for inventory in inventory_items:
            reserved = reserved_dict.get((inventory.user_id, inventory.product_id), 0)
            available = inventory.quantity - reserved
            
            items.append({
                "id": inventory.id,
                "user_id": inventory.user_id,
                "product_id": inventory.product_id,
                "quantity": inventory.quantity,
                "reserved_quantity": reserved,
                "available_quantity": available,
                "product_name": inventory.product.name,
                "product_sku": inventory.product.sku,
                "product_price": inventory.product.price,
                "user_name": inventory.user.full_name,
                "user_city": inventory.user.city,
                "created_at": inventory.created_at,
                "updated_at": inventory.updated_at
            })
        
        return {
            "quantity": total_quantity,
            "total_value": total_value,
            "items": items,
            "total_count": total_count,
            "has_more": has_more,
            "page": page,
            "limit": limit
        }
    
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
    
    def finalize_report_sales(
        self, 
        db: Session, 
        report_id: int, 
        approved_by: int
    ) -> int:
        """
        Финализирует продажи из отчета - создает записи в SoldProduct
        Возвращает количество созданных записей
        """
        from app.models.report import Report, ReportProduct
        from app.models.sold_product import SoldProduct, SaleType
        from app.models.user import User
        
        report = db.query(Report).options(
            joinedload(Report.seller),
            joinedload(Report.products).joinedload(ReportProduct.product).joinedload(Product.category)
        ).filter(Report.id == report_id).first()
        
        if not report:
            return 0
        
        seller = report.seller
        if not seller:
            return 0
        
        seller_data = {
            'seller_name': seller.full_name,
            'seller_role': seller.role.value if seller.role else None,
            'seller_city': seller.city,
            'seller_cluster_id': seller.cluster_id,
            'seller_rate': seller.rate or 0.0
        }
        
        created_count = 0
        
        for product_report in report.products:
            product = product_report.product
            if not product:
                continue
            
            original_price = product_report.sold_amount + seller_data['seller_rate']
            
            sold_product = SoldProduct(
                report_id=report_id,
                seller_id=seller.id,
                product_id=product.id,
                quantity=product_report.quantity,
                unit_price=product_report.sold_amount,
                total_amount=product_report.sold_amount * product_report.quantity,
                seller_rate=seller_data['seller_rate'],
                original_price=original_price,
                seller_name=seller_data['seller_name'],
                seller_role=seller_data['seller_role'],
                seller_city=seller_data['seller_city'],
                seller_cluster_id=seller_data['seller_cluster_id'],
                product_name=product.name,
                product_sku=product.sku,
                product_category_id=product.category_id,
                product_category_name=product.category.name if product.category else None,
                sale_date=report.date,
                approved_date=datetime.now(),
                approved_by=approved_by,
                sale_type=SaleType.REPORT.value
            )
            
            db.add(sold_product)
            created_count += 1
        
        db.commit()
        return created_count
    
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