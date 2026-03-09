from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc, case
from typing import List, Optional, Dict, Tuple
import json
from datetime import datetime, date
from app.models.inventory import UserInventory
from app.models.rejection import Rejection, RejectionItem, RejectionStatus
from app.models.user import User, UserRole
from app.models.product import Product
from app.models.category import ProductCategory
from app.models.cluster import Cluster
from app.crud.inventory import crud_inventory
from app.crud.notification import crud_notification
from app.schemas.notification import NotificationType
from app.schemas.rejection import RejectionCreate, RejectionUpdate
import traceback


class CRUDRejection:
    def get(self, db: Session, rejection_id: int) -> Optional[Rejection]:
        """Получить брак по ID"""
        return db.query(Rejection).options(
            joinedload(Rejection.user),
            joinedload(Rejection.reviewer),
            joinedload(Rejection.items).joinedload(RejectionItem.product).joinedload(Product.category)
        ).filter(Rejection.id == rejection_id).first()
    
    def get_user_rejections(
        self, 
        db: Session, 
        user_id: int,
        skip: int = 0,
        limit: int = 100,
        status: Optional[RejectionStatus] = None
    ) -> List[Rejection]:
        """Получить браки пользователя"""
        query = db.query(Rejection).options(
            joinedload(Rejection.user),
            joinedload(Rejection.reviewer),
            joinedload(Rejection.items).joinedload(RejectionItem.product).joinedload(Product.category)
        ).filter(Rejection.user_id == user_id)
        
        if status:
            query = query.filter(Rejection.status == status)
        
        return query.order_by(Rejection.created_at.desc()).offset(skip).limit(limit).all()
    
    def get_all_with_filters(
        self,
        db: Session,
        current_user: User,
        skip: int = 0,
        limit: int = 100,
        status: Optional[RejectionStatus] = None,
        user_id: Optional[int] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        product_id: Optional[int] = None,
        cluster_id: Optional[int] = None,
        mentor_id: Optional[int] = None
    ) -> List[Rejection]:
        """Получить все браки с фильтрацией по ролям"""
        query = db.query(Rejection).options(
            joinedload(Rejection.user),
            joinedload(Rejection.reviewer),
            joinedload(Rejection.items).joinedload(RejectionItem.product).joinedload(Product.category)
        )
        
        # Фильтрация по роли пользователя
        if current_user.role == UserRole.OWNER:
            # Владелец видит все браки - не добавляем фильтр по user_id
            pass
        
        elif current_user.role == UserRole.ADMIN:
            # Администратор видит браки своих подчиненных (кустов)
            admin_clusters = current_user.admin_clusters  # Это вызовет property и вернет список
            
            if admin_clusters:  # список не пустой
                # Преобразуем все ID в целые числа (хотя они уже должны быть числами из JSON)
                cluster_ids = []
                for cid in admin_clusters:  
                    if cid is not None:
                        try:
                            cluster_ids.append(int(cid))
                        except (ValueError, TypeError):
                            cluster_ids.append(cid)
                
                if cluster_ids:
                    # Находим пользователей в кустах администратора
                    subquery = db.query(User.id).filter(
                        User.cluster_id.in_(cluster_ids),
                        User.is_active == True
                    ).subquery()
                    query = query.filter(Rejection.user_id.in_(subquery))
                else:
                    query = query.filter(Rejection.user_id == current_user.id)
        
        else:
            # Все остальные роли (SELLER, MENTOR, SENIOR_SELLER, ACCOUNTANT) 
            # видят только свои собственные браки
            query = query.filter(Rejection.user_id == current_user.id)
        
        # Применяем дополнительные фильтры
        if status:
            query = query.filter(Rejection.status == status)
        
        if user_id:
            if current_user.role in [UserRole.OWNER, UserRole.ADMIN]:
                query = query.filter(Rejection.user_id == user_id)
            else:
                if user_id != current_user.id:
                    query = query.filter(Rejection.user_id == current_user.id)
        
        if date_from:
            query = query.filter(Rejection.created_at >= date_from)
        
        if date_to:
            query = query.filter(Rejection.created_at <= date_to)
        
        if product_id:
            subquery = db.query(RejectionItem.rejection_id).filter(
                RejectionItem.product_id == product_id
            ).subquery()
            query = query.filter(Rejection.id.in_(subquery))
        
        if cluster_id:
            if current_user.role in [UserRole.OWNER, UserRole.ADMIN]:
                subquery = db.query(User.id).filter(
                    User.cluster_id == cluster_id,
                    User.is_active == True
                ).subquery()
                query = query.filter(Rejection.user_id.in_(subquery))
        
        if mentor_id:
            if current_user.role in [UserRole.OWNER, UserRole.ADMIN]:
                subquery = db.query(User.id).filter(
                    User.mentor_id == mentor_id,
                    User.is_active == True
                ).subquery()
                query = query.filter(Rejection.user_id.in_(subquery))
        
        # Получаем результат
        result = query.order_by(Rejection.created_at.desc()).offset(skip).limit(limit).all()
        
        return result
    
    def _get_users_to_notify_for_rejection(self, db: Session, user_id: int) -> List[int]:
        """
        Получить пользователей, которые могут проверить брак (админы и владельцы)
        """
        # Получаем информацию о пользователе, создавшем брак
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return []
        
        users_to_notify = []
        
        # 1. Владелец (OWNER) - всегда получает уведомления
        owners = db.query(User.id).filter(
            User.role == UserRole.OWNER,
            User.is_active == True
        ).all()
        users_to_notify.extend([owner[0] for owner in owners])
        
        # 2. Администраторы (ADMIN) - если они управляют кустом пользователя
        if user.cluster_id:
            admins = db.query(User).filter(
                User.role == UserRole.ADMIN,
                User.is_active == True
            ).all()
            
            for admin in admins:
                # Проверяем, есть ли у администратора этот куст
                admin_clusters = []
                if admin.admin_clusters:
                    try:
                        if isinstance(admin.admin_clusters, str):
                            admin_clusters = json.loads(admin.admin_clusters)
                        elif isinstance(admin.admin_clusters, list):
                            admin_clusters = admin.admin_clusters
                    except Exception as e:
                        print(f"Error parsing admin_clusters: {e}")
                        continue
                
                # Приводим cluster_id пользователя к int для сравнения
                user_cluster_id = int(user.cluster_id) if user.cluster_id else None
                
                # Проверяем, есть ли куст пользователя в списке админа
                if admin_clusters and user_cluster_id:
                    # Пробуем разные типы сравнения
                    if (user_cluster_id in admin_clusters or 
                        str(user_cluster_id) in [str(c) for c in admin_clusters]):
                        users_to_notify.append(admin.id)
        
        # Убираем дубликаты и исключаем самого пользователя
        users_to_notify = list(set(users_to_notify))
        if user_id in users_to_notify:
            users_to_notify.remove(user_id)
        
        return users_to_notify
    
    def _create_rejection_request_notifications(
        self, 
        db: Session, 
        rejection: Rejection, 
        user: User
    ):
        """
        Создать уведомления о создании запроса на брак
        """
        # Получаем пользователей для уведомления
        users_to_notify = self._get_users_to_notify_for_rejection(db, rejection.user_id)
        
        if not users_to_notify:
            return
        
        notification_data = []
        
        for notify_user_id in users_to_notify:
            notification_data.append({
                'user_id': notify_user_id,
                'type': NotificationType.REJECTION_REQUEST,
                'title': 'Новый запрос на брак',
                'message': f'Пользователь {user.full_name} создал запрос на брак #{rejection.id} и ожидает вашего утверждения',
                'data': {
                    'rejection_id': rejection.id,
                    'user_id': rejection.user_id,
                    'user_name': user.full_name,
                    'status': rejection.status.value
                },
                'entity_type': 'rejection',
                'entity_id': rejection.id,
                'priority': 4
            })
        
        if notification_data:
            crud_notification.create_multiple(
                db,
                notifications_data=notification_data,
                sender_id=rejection.user_id
            )

    def _create_rejection_status_notifications(
        self, 
        db: Session, 
        rejection: Rejection, 
        reviewer: User,
        old_status: RejectionStatus,
        new_status: RejectionStatus
    ):
        """
        Создать уведомления об изменении статуса брака
        """
        # Уведомляем только создателя брака
        if old_status == new_status or new_status == RejectionStatus.CANCELLED:
            return
        
        notification_data = []
        
        if new_status == RejectionStatus.APPROVED:
            notification_data.append({
                'user_id': rejection.user_id,
                'type': NotificationType.REJECTION_APPROVED,
                'title': 'Брак утвержден',
                'message': f'Ваш запрос на брак #{rejection.id} утвержден пользователем {reviewer.full_name}',
                'data': {
                    'rejection_id': rejection.id,
                    'reviewed_by': reviewer.id,
                    'reviewer_name': reviewer.full_name,
                    'status': 'APPROVED'
                },
                'entity_type': 'rejection',
                'entity_id': rejection.id,
                'priority': 3
            })
        
        elif new_status == RejectionStatus.REJECTED:
            notification_data.append({
                'user_id': rejection.user_id,
                'type': NotificationType.REJECTION_REJECTED,
                'title': 'Брак отклонен',
                'message': f'Ваш запрос на брак #{rejection.id} отклонен пользователем {reviewer.full_name}',
                'data': {
                    'rejection_id': rejection.id,
                    'reviewed_by': reviewer.id,
                    'reviewer_name': reviewer.full_name,
                    'status': 'REJECTED'
                },
                'entity_type': 'rejection',
                'entity_id': rejection.id,
                'priority': 3
            })
        
        if notification_data:
            crud_notification.create_multiple(
                db,
                notifications_data=notification_data,
                sender_id=reviewer.id
            )
    
    def create(
        self,
        db: Session,
        user_id: int,
        rejection_in: RejectionCreate,
        photo_paths: List[str] = None,
        video_paths: List[str] = None
    ) -> Rejection:
        """Создать запрос на брак"""
        try:
            # Проверяем доступность товаров у пользователя
            for item in rejection_in.items:
                # Получаем текущее количество товара у пользователя
                current_quantity = crud_inventory.get_user_product_quantity(db, user_id, item.product_id)
                if current_quantity < item.quantity:
                    raise ValueError(
                        f"Недостаточно товара ID {item.product_id}. "
                        f"Доступно: {current_quantity}, требуется: {item.quantity}"
                    )
                
                # Проверяем существование товара
                product = db.query(Product).filter(
                    Product.id == item.product_id,
                    Product.is_active == True
                ).first()
                
                if not product:
                    raise ValueError(f"Товар ID {item.product_id} не найден или не активен")
            
            # Создаем брак
            db_rejection = Rejection(
                user_id=user_id,
                comment=rejection_in.comment,
                status=RejectionStatus.PENDING
            )
            
            if photo_paths:
                db_rejection.photo_paths = json.dumps(photo_paths)
            
            if video_paths:
                db_rejection.video_paths = json.dumps(video_paths)
            
            db.add(db_rejection)
            db.flush()  # Получаем ID без коммита
            
            # Создаем позиции брака
            total_items = 0
            total_value = 0.0
            
            for item in rejection_in.items:
                # Получаем товар
                product = db.query(Product).filter(Product.id == item.product_id).first()
                
                # Создаем позицию
                db_item = RejectionItem(
                    rejection_id=db_rejection.id,
                    product_id=item.product_id,
                    quantity=item.quantity,
                    unit_price=product.price,
                    total_price=product.price * item.quantity
                )
                
                db.add(db_item)
                
                total_items += item.quantity
                total_value += db_item.total_price
            
            # Обновляем итоговые значения
            db_rejection.total_items = total_items
            db_rejection.total_value = total_value
            
            db.commit()
            db.refresh(db_rejection)
            
            # Получаем пользователя для уведомления
            user = db.query(User).filter(User.id == user_id).first()
            
            # Загружаем товары для уведомления
            db_rejection = self.get(db, db_rejection.id)
            
            # СОЗДАЕМ УВЕДОМЛЕНИЯ
            if db_rejection:
                self._create_rejection_request_notifications(db, db_rejection, user)
            
            return db_rejection
            
        except Exception as e:
            db.rollback()
            raise e
    
    def update_status(
        self,
        db: Session,
        rejection_id: int,
        status: RejectionStatus,
        reviewer_id: int,
        comment: Optional[str] = None
    ) -> Optional[Rejection]:
        """Обновить статус брака"""
        # Получаем брак со всеми связями
        db_rejection = self.get(db, rejection_id)
        if not db_rejection:
            return None
        
        # Сохраняем старый статус
        old_status = db_rejection.status
        
        # Обновляем статус
        db_rejection.status = status
        db_rejection.reviewed_at = datetime.now()
        db_rejection.reviewed_by = reviewer_id
        
        if comment:
            db_rejection.comment = comment
        
        # Если статус изменился на APPROVED, списываем товары из инвентаря
        if old_status != RejectionStatus.APPROVED and status == RejectionStatus.APPROVED:
            self._apply_rejection(db, db_rejection)
        
        # Если статус изменился с APPROVED на что-то другое, отменяем списание
        elif old_status == RejectionStatus.APPROVED and status != RejectionStatus.APPROVED:
            self._revert_rejection(db, db_rejection)
        
        db.commit()
        
        # Получаем обновленный объект со всеми связями
        db.refresh(db_rejection)
        updated_rejection = self.get(db, rejection_id)
        
        # Получаем пользователя, который изменил статус
        reviewer = db.query(User).filter(User.id == reviewer_id).first()
        
        # СОЗДАЕМ УВЕДОМЛЕНИЯ ОБ ИЗМЕНЕНИИ СТАТУСА
        if reviewer and old_status != status:
            self._create_rejection_status_notifications(db, updated_rejection, reviewer, old_status, status)
        
        return updated_rejection
    
    def _apply_rejection(self, db: Session, rejection: Rejection):
        """Списать товары из инвентаря"""
        for item in rejection.items:
            crud_inventory.update_inventory(
                db,
                user_id=rejection.user_id,
                product_id=item.product_id,
                quantity_change=-item.quantity
            )
    
    def _revert_rejection(self, db: Session, rejection: Rejection):
        """Вернуть товары в инвентарь"""
        for item in rejection.items:
            crud_inventory.update_inventory(
                db,
                user_id=rejection.user_id,
                product_id=item.product_id,
                quantity_change=item.quantity
            )
    
    def get_user_available_products(self, db: Session, user_id: int) -> List[Dict]:
        """Получить список товаров доступных для брака у пользователя"""
        # Получаем инвентарь пользователя с товарами
        inventory_items = db.query(UserInventory).join(Product).filter(
            UserInventory.user_id == user_id,
            UserInventory.quantity > 0,
            Product.is_active == True
        ).options(
            joinedload(UserInventory.product).joinedload(Product.category)
        ).all()
        
        result = []
        for item in inventory_items:
            if item.product:
                result.append({
                    "product_id": item.product_id,
                    "product_name": item.product.name,
                    "product_sku": item.product.sku,
                    "category_id": item.product.category_id,
                    "category_name": item.product.category.name if item.product.category else None,
                    "available_quantity": item.quantity,
                    "price": item.product.price
                })
        
        return result

    def get_combined_rejection_stats(
        self,
        db: Session,
        current_user: User,
        user_id: Optional[int] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None
    ) -> Dict:
        """
        Получить объединенную статистику браков за один запрос
        """
        try:
            target_user_id = user_id if user_id else current_user.id
            visible_user_ids = self._get_visible_user_ids(db, current_user)
            
            if target_user_id not in visible_user_ids and current_user.role != UserRole.OWNER:
                raise ValueError("Нет прав доступа к статистике этого пользователя")
            
            target_user = db.query(User).filter(User.id == target_user_id).first()
            if not target_user:
                raise ValueError("Пользователь не найден")
            
            # 1. Статистика целевого пользователя
            user_stats_list = self.get_user_rejection_stats(
                db=db,
                current_user=current_user,
                user_id=target_user_id,
                date_from=date_from,
                date_to=date_to
            )
            
            user_stat = user_stats_list[0] if user_stats_list else {
                "user_id": target_user_id,
                "user_name": target_user.full_name,
                "user_role": target_user.role.value,
                "cluster_id": target_user.cluster_id,
                "cluster_name": None,
                "total_rejections": 0,
                "total_value": 0,
                "products_count": 0
            }
            
            # 2. Детальная статистика по товарам целевого пользователя
            user_products_stats = self.get_user_product_rejection_stats(
                db=db,
                current_user=current_user,
                user_id=target_user_id,
                date_from=date_from,
                date_to=date_to
            )
            
            # 3. Подчиненные ТОЛЬКО с браком
            subordinates = []
            if current_user.role in [UserRole.OWNER, UserRole.ADMIN, UserRole.MENTOR, UserRole.SENIOR_SELLER]:
                subordinate_ids = [uid for uid in visible_user_ids if uid != target_user_id]
                
                for sub_id in subordinate_ids:
                    sub_stats_list = self.get_user_rejection_stats(
                        db=db,
                        current_user=current_user,
                        user_id=sub_id,
                        date_from=date_from,
                        date_to=date_to
                    )
                    
                    # Пропускаем подчиненных без брака
                    if not sub_stats_list:
                        continue
                        
                    sub_stat = sub_stats_list[0]
                    
                    # Пропускаем если нет брака
                    if sub_stat.get("total_rejections", 0) == 0 and sub_stat.get("total_value", 0) == 0:
                        continue
                    
                    subordinates.append({
                        "user_id": sub_stat["user_id"],
                        "user_name": sub_stat["user_name"],
                        "user_role": sub_stat["user_role"],
                        "cluster_id": sub_stat["cluster_id"],
                        "cluster_name": sub_stat["cluster_name"],
                        "total_rejections": sub_stat["total_rejections"],
                        "total_value": sub_stat["total_value"],
                        "products_count": sub_stat["products_count"]
                    })
            
            # 4. Общая статистика (только пользователи с браком)
            all_users_with_rejections = []
            if user_stat.get("total_rejections", 0) > 0 or user_stat.get("total_value", 0) > 0:
                all_users_with_rejections.append(user_stat)
            all_users_with_rejections.extend(subordinates)
            
            total_rejections = sum(u.get("total_rejections", 0) for u in all_users_with_rejections)
            total_value = sum(u.get("total_value", 0) for u in all_users_with_rejections)
            
            summary = {
                "total_users": len(all_users_with_rejections),
                "total_rejections": total_rejections,
                "total_value": total_value,
                "total_products": len(user_products_stats),
                "has_rejections": len(all_users_with_rejections) > 0,
                "date_range": {
                    "from": date_from.isoformat() if date_from else None,
                    "to": date_to.isoformat() if date_to else None
                }
            }
            
            return {
                "user_stats": user_stat,
                "user_products_stats": user_products_stats,
                "subordinates_stats": subordinates,
                "summary": summary
            }
            
        except Exception as e:
            print(f"Error in get_combined_rejection_stats: {str(e)}")
            traceback.print_exc()
            raise Exception(f"Ошибка при получении статистики: {str(e)}")
                
    
    def _get_visible_user_ids(self, db: Session, current_user: User) -> List[int]:
        """
        Вспомогательная функция: получить ID пользователей, которых может видеть текущий пользователь
        """
        visible_user_ids = []
                
        if current_user.role == UserRole.OWNER:
            # Владелец видит всех
            all_users = db.query(User.id).filter(User.is_active == True).all()
            visible_user_ids = [u[0] for u in all_users]
        
        elif current_user.role == UserRole.ADMIN:
            # Администратор видит себя + пользователей из своих кустов
            visible_user_ids.append(current_user.id)
            
            # ВАЖНО: Используем более надежную обработку JSON
            admin_clusters = []
            if current_user.admin_clusters:
                try:
                    if isinstance(current_user.admin_clusters, str):
                        admin_clusters = json.loads(current_user.admin_clusters)
                    elif isinstance(current_user.admin_clusters, list):
                        admin_clusters = current_user.admin_clusters
                except Exception as e:
                    print(f"ERROR parsing admin_clusters: {e}")
                    admin_clusters = []
                        
            if admin_clusters:
                # Преобразуем все ID в строки для сравнения, т.к. в БД они могут храниться как строки
                cluster_ids = []
                for cluster_id in admin_clusters:
                    if cluster_id is not None:
                        try:
                            # Конвертируем в int если возможно
                            cluster_ids.append(int(cluster_id))
                        except (ValueError, TypeError):
                            # Иначе оставляем как есть
                            cluster_ids.append(cluster_id)
                
                if cluster_ids:
                    # Пробуем оба варианта сравнения
                    users_in_clusters = db.query(User.id).filter(
                        User.cluster_id.in_(cluster_ids),
                        User.is_active == True
                    ).all()
                    
                    # Также проверяем строковые представления
                    cluster_ids_str = [str(cid) for cid in cluster_ids]
                    users_in_clusters_str = db.query(User.id).filter(
                        User.cluster_id.in_(cluster_ids_str),
                        User.is_active == True
                    ).all()
                    
                    all_users = list(set([u[0] for u in users_in_clusters] + [u[0] for u in users_in_clusters_str]))
                    visible_user_ids.extend(all_users)
                    
        
        elif current_user.role == UserRole.SENIOR_SELLER:
            # Старший продавец видит себя + пользователей своего куста
            visible_user_ids.append(current_user.id)
            
            if current_user.cluster_id:
                # Получаем ID куста как строку для надежности
                cluster_id = str(current_user.cluster_id)
                users_in_cluster = db.query(User.id).filter(
                    User.cluster_id == cluster_id,
                    User.is_active == True
                ).all()
                visible_user_ids.extend([u[0] for u in users_in_cluster])
        
        elif current_user.role == UserRole.MENTOR:
            # Ментор видит себя + своих подопечных
            visible_user_ids.append(current_user.id)
            
            mentored_users = db.query(User.id).filter(
                User.mentor_id == current_user.id,
                User.is_active == True
            ).all()
            visible_user_ids.extend([u[0] for u in mentored_users])
        
        else:
            # SELLER, ACCOUNTANT и другие видят только себя
            visible_user_ids.append(current_user.id)
        
        # Убираем дубликаты
        result = list(set(visible_user_ids))
        return result
    
    def get_product_rejection_stats(
        self,
        db: Session,
        current_user: User,
        product_id: Optional[int] = None,
        category_id: Optional[int] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None
    ) -> List[Dict]:
        """
        Получить статистику браков по товарам
        Только APPROVED браки
        """
        # Определяем пользователей, которых может видеть текущий пользователь
        visible_user_ids = self._get_visible_user_ids(db, current_user)
        
        # Базовый запрос для утвержденных браков
        query = db.query(
            RejectionItem.product_id,
            Product.name.label('product_name'),
            Product.sku.label('product_sku'),
            Product.category_id,
            ProductCategory.name.label('category_name'),
            func.sum(RejectionItem.quantity).label('total_rejected'),
            func.sum(RejectionItem.total_price).label('total_value'),
            func.count(func.distinct(Rejection.user_id)).label('users_count')
        ).join(
            Rejection, RejectionItem.rejection_id == Rejection.id
        ).join(
            Product, RejectionItem.product_id == Product.id
        ).outerjoin(
            ProductCategory, Product.category_id == ProductCategory.id
        ).filter(
            Rejection.status == RejectionStatus.APPROVED
        )
        
        # Фильтрация по правам доступа
        if current_user.role != UserRole.OWNER and visible_user_ids:
            query = query.filter(Rejection.user_id.in_(visible_user_ids))
        
        # Фильтрация по товару
        if product_id:
            query = query.filter(RejectionItem.product_id == product_id)
        
        # Фильтрация по категории
        if category_id:
            query = query.filter(Product.category_id == category_id)
        
        # Фильтрация по дате
        if date_from:
            query = query.filter(Rejection.created_at >= date_from)
        
        if date_to:
            query = query.filter(Rejection.created_at <= date_to)
        
        # Группировка и сортировка
        query = query.group_by(
            RejectionItem.product_id,
            Product.name,
            Product.sku,
            Product.category_id,
            ProductCategory.name
        ).order_by(desc('total_rejected'))
        
        results = query.all()
        
        return [
            {
                "product_id": r.product_id,
                "product_name": r.product_name,
                "product_sku": r.product_sku,
                "category_id": r.category_id,
                "category_name": r.category_name,
                "total_rejected": int(r.total_rejected or 0),
                "total_value": float(r.total_value or 0),
                "users_count": int(r.users_count or 0)
            }
            for r in results
        ]
    
    def get_user_rejection_stats(
        self,
        db: Session,
        current_user: User,
        user_id: Optional[int] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None
    ) -> List[Dict]:
        """
        Получить статистику браков по пользователям
        Только APPROVED браки
        """
        # Определяем пользователей, которых может видеть текущий пользователь
        visible_user_ids = self._get_visible_user_ids(db, current_user)
        
        # Если указан конкретный user_id, проверяем права доступа
        if user_id and user_id not in visible_user_ids and current_user.role != UserRole.OWNER:
            return []
        
        # Фильтр по пользователю если указан
        target_user_ids = [user_id] if user_id else visible_user_ids
        
        # Базовый запрос для статистики по пользователям
        query = db.query(
            Rejection.user_id,
            User.full_name.label('user_name'),
            User.role.label('user_role'),
            User.cluster_id,
            Cluster.name.label('cluster_name'),
            func.count(Rejection.id).label('total_rejections'),
            func.sum(Rejection.total_value).label('total_value'),
            func.count(func.distinct(RejectionItem.product_id)).label('products_count')
        ).join(
            User, Rejection.user_id == User.id
        ).outerjoin(
            Cluster, User.cluster_id == Cluster.id
        ).join(
            RejectionItem, Rejection.id == RejectionItem.rejection_id
        ).filter(
            Rejection.status == RejectionStatus.APPROVED
        )
        
        if target_user_ids:
            query = query.filter(Rejection.user_id.in_(target_user_ids))
        
        # Фильтрация по дате
        if date_from:
            query = query.filter(Rejection.created_at >= date_from)
        
        if date_to:
            query = query.filter(Rejection.created_at <= date_to)
        
        # Группировка и сортировка
        query = query.group_by(
            Rejection.user_id,
            User.full_name,
            User.role,
            User.cluster_id,
            Cluster.name
        ).order_by(desc('total_value'))
        
        results = query.all()
        
        return [
            {
                "user_id": r.user_id,
                "user_name": r.user_name,
                "user_role": r.user_role.value if r.user_role else None,
                "cluster_id": r.cluster_id,
                "cluster_name": r.cluster_name,
                "total_rejections": int(r.total_rejections or 0),
                "total_value": float(r.total_value or 0),
                "products_count": int(r.products_count or 0)
            }
            for r in results
        ]
    
    def get_user_product_rejection_stats(
        self,
        db: Session,
        current_user: User,
        user_id: Optional[int] = None,
        product_id: Optional[int] = None,
        category_id: Optional[int] = None,
        product_name: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None
    ) -> List[Dict]:
        """
        Получить детальную статистику браков по пользователю и товарам
        Только APPROVED браки
        """
        # Определяем пользователей, которых может видеть текущий пользователь
        visible_user_ids = self._get_visible_user_ids(db, current_user)
        
        # Если указан конкретный user_id, проверяем права доступа
        if user_id:
            if user_id not in visible_user_ids and current_user.role != UserRole.OWNER:
                return []
            target_user_ids = [user_id]
        else:
            target_user_ids = visible_user_ids
        
        # Базовый запрос
        query = db.query(
            Rejection.user_id,
            User.full_name.label('user_name'),
            RejectionItem.product_id,
            Product.name.label('product_name'),
            Product.sku.label('product_sku'),
            Product.category_id,
            ProductCategory.name.label('category_name'),
            func.sum(RejectionItem.quantity).label('total_rejected'),
            func.sum(RejectionItem.total_price).label('total_value')
        ).join(
            RejectionItem, Rejection.id == RejectionItem.rejection_id
        ).join(
            User, Rejection.user_id == User.id
        ).join(
            Product, RejectionItem.product_id == Product.id
        ).outerjoin(
            ProductCategory, Product.category_id == ProductCategory.id
        ).filter(
            Rejection.status == RejectionStatus.APPROVED
        )
        
        if target_user_ids:
            query = query.filter(Rejection.user_id.in_(target_user_ids))
        
        # Фильтрация по товару
        if product_id:
            query = query.filter(RejectionItem.product_id == product_id)
        
        # Фильтрация по категории
        if category_id:
            query = query.filter(Product.category_id == category_id)
        
        # Фильтрация по названию товара
        if product_name:
            query = query.filter(Product.name.ilike(f"%{product_name}%"))
        
        # Фильтрация по дате
        if date_from:
            query = query.filter(Rejection.created_at >= date_from)
        
        if date_to:
            query = query.filter(Rejection.created_at <= date_to)
        
        # Группировка и сортировка
        query = query.group_by(
            Rejection.user_id,
            User.full_name,
            RejectionItem.product_id,
            Product.name,
            Product.sku,
            Product.category_id,
            ProductCategory.name
        ).order_by(desc('total_value'))
        
        results = query.all()
        
        return [
            {
                "user_id": r.user_id,
                "user_name": r.user_name,
                "product_id": r.product_id,
                "product_name": r.product_name,
                "product_sku": r.product_sku,
                "category_id": r.category_id,
                "category_name": r.category_name,
                "total_rejected": int(r.total_rejected or 0),
                "total_value": float(r.total_value or 0)
            }
            for r in results
        ]
    
    def get_detailed_rejection_stats(
        self,
        db: Session,
        current_user: User,
        period: str = "all_time",
        date_from: Optional[date] = None,
        date_to: Optional[date] = None
    ) -> Dict:
        """
        Получить детальную статистику браков
        """
        # Определяем пользователей, которых может видеть текущий пользователь
        visible_user_ids = self._get_visible_user_ids(db, current_user)
        
        # Базовый запрос для утвержденных браков
        query = db.query(Rejection).join(
            RejectionItem, Rejection.id == RejectionItem.rejection_id
        ).filter(
            Rejection.status == RejectionStatus.APPROVED
        )
        
        # Фильтрация по правам доступа
        if current_user.role != UserRole.OWNER and visible_user_ids:
            query = query.filter(Rejection.user_id.in_(visible_user_ids))
        
        # Фильтрация по дате
        if date_from:
            query = query.filter(Rejection.created_at >= date_from)
        
        if date_to:
            query = query.filter(Rejection.created_at <= date_to)
        
        # Общая статистика
        total_rejections = query.count()
        
        # Суммарное количество товаров и стоимость
        total_stats = db.query(
            func.sum(RejectionItem.quantity).label('total_items'),
            func.sum(RejectionItem.total_price).label('total_value')
        ).join(
            Rejection, RejectionItem.rejection_id == Rejection.id
        ).filter(
            Rejection.status == RejectionStatus.APPROVED
        )
        
        # Фильтрация по правам доступа
        if current_user.role != UserRole.OWNER and visible_user_ids:
            total_stats = total_stats.filter(Rejection.user_id.in_(visible_user_ids))
        
        if date_from:
            total_stats = total_stats.filter(Rejection.created_at >= date_from)
        
        if date_to:
            total_stats = total_stats.filter(Rejection.created_at <= date_to)
        
        total_result = total_stats.first()
        
        # Количество уникальных пользователей и товаров
        unique_users = db.query(
            func.count(func.distinct(Rejection.user_id))
        ).filter(
            Rejection.status == RejectionStatus.APPROVED
        )
        
        unique_products = db.query(
            func.count(func.distinct(RejectionItem.product_id))
        ).join(
            Rejection, RejectionItem.rejection_id == Rejection.id
        ).filter(
            Rejection.status == RejectionStatus.APPROVED
        )
        
        # Фильтрация по правам доступа
        if current_user.role != UserRole.OWNER and visible_user_ids:
            unique_users = unique_users.filter(Rejection.user_id.in_(visible_user_ids))
            unique_products = unique_products.filter(Rejection.user_id.in_(visible_user_ids))
        
        if date_from:
            unique_users = unique_users.filter(Rejection.created_at >= date_from)
            unique_products = unique_products.filter(Rejection.created_at >= date_from)
        
        if date_to:
            unique_users = unique_users.filter(Rejection.created_at <= date_to)
            unique_products = unique_products.filter(Rejection.created_at <= date_to)
        
        users_count = unique_users.scalar() or 0
        products_count = unique_products.scalar() or 0
        
        # Статистика по месяцам
        monthly_stats = []
        if period == "month":
            monthly_query = db.query(
                func.date_trunc('month', Rejection.created_at).label('month'),
                func.sum(RejectionItem.quantity).label('items'),
                func.sum(RejectionItem.total_price).label('value'),
                func.count(func.distinct(Rejection.user_id)).label('users')
            ).join(
                RejectionItem, Rejection.id == RejectionItem.rejection_id
            ).filter(
                Rejection.status == RejectionStatus.APPROVED
            )
            
            # Фильтрация по правам доступа
            if current_user.role != UserRole.OWNER and visible_user_ids:
                monthly_query = monthly_query.filter(Rejection.user_id.in_(visible_user_ids))
            
            if date_from:
                monthly_query = monthly_query.filter(Rejection.created_at >= date_from)
            
            if date_to:
                monthly_query = monthly_query.filter(Rejection.created_at <= date_to)
            
            monthly_query = monthly_query.group_by(
                func.date_trunc('month', Rejection.created_at)
            ).order_by(desc('month'))
            
            monthly_results = monthly_query.all()
            
            for result in monthly_results:
                monthly_stats.append({
                    "month": result.month.strftime("%Y-%m") if result.month else None,
                    "items": int(result.items or 0),
                    "value": float(result.value or 0),
                    "users": int(result.users or 0)
                })
        
        return {
            "period": period,
            "total_rejected_items": int(total_result.total_items or 0) if total_result else 0,
            "total_value": float(total_result.total_value or 0) if total_result else 0,
            "total_users": users_count,
            "total_products": products_count,
            "by_month": monthly_stats if monthly_stats else None
        }
    
    def cancel_rejection(self, db: Session, rejection_id: int, user_id: int) -> bool:
        """Отменить брак (только пользователь, создавший брак)"""
        rejection = self.get(db, rejection_id)
        if not rejection:
            return False
        
        if rejection.user_id != user_id:
            return False
        
        if rejection.status != RejectionStatus.PENDING:
            return False
        
        rejection.status = RejectionStatus.CANCELLED
        db.commit()
        
        return True


crud_rejection = CRUDRejection()