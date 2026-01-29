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
            admin_clusters = []
            
            # Получаем список кустов администратора
            if current_user.admin_clusters:
                if isinstance(current_user.admin_clusters, str):
                    try:
                        admin_clusters = json.loads(current_user.admin_clusters)
                    except json.JSONDecodeError:
                        # Если не удалось распарсить, считаем что список пуст
                        admin_clusters = []
                elif isinstance(current_user.admin_clusters, list):
                    admin_clusters = current_user.admin_clusters
            
            if admin_clusters:
                # Преобразуем все ID в целые числа
                try:
                    cluster_ids = []
                    for cluster_id in admin_clusters:
                        if cluster_id is not None:
                            cluster_ids.append(int(cluster_id))
                except (ValueError, TypeError):
                    cluster_ids = []
                
                if cluster_ids:
                    # Находим пользователей в кустах администратора
                    subquery = db.query(User.id).filter(
                        User.cluster_id.in_(cluster_ids),
                        User.is_active == True
                    ).subquery()
                    query = query.filter(Rejection.user_id.in_(subquery))
                else:
                    # Если нет валидных ID кустов, показываем только свои
                    query = query.filter(Rejection.user_id == current_user.id)
            else:
                # Если нет кустов, показываем только свои браки
                query = query.filter(Rejection.user_id == current_user.id)
        
        else:
            # Все остальные роли (SELLER, MENTOR, SENIOR_SELLER, ACCOUNTANT) 
            # видят только свои собственные браки
            query = query.filter(Rejection.user_id == current_user.id)
        
        # Дополнительные фильтры
        if status:
            query = query.filter(Rejection.status == status)
        
        if user_id:
            # Фильтр по конкретному пользователю (доступно только OWNER и ADMIN)
            if current_user.role in [UserRole.OWNER, UserRole.ADMIN]:
                query = query.filter(Rejection.user_id == user_id)
            else:
                # Для остальных ролей игнорируем этот фильтр если user_id не совпадает с текущим пользователем
                if user_id != current_user.id:
                    query = query.filter(Rejection.user_id == current_user.id)
        
        if date_from:
            query = query.filter(Rejection.created_at >= date_from)
        
        if date_to:
            query = query.filter(Rejection.created_at <= date_to)
        
        if product_id:
            # Фильтр по товару через rejection_items
            subquery = db.query(RejectionItem.rejection_id).filter(
                RejectionItem.product_id == product_id
            ).subquery()
            query = query.filter(Rejection.id.in_(subquery))
        
        if cluster_id:
            # Фильтр по кусту (доступно только OWNER и ADMIN)
            if current_user.role in [UserRole.OWNER, UserRole.ADMIN]:
                subquery = db.query(User.id).filter(
                    User.cluster_id == cluster_id,
                    User.is_active == True
                ).subquery()
                query = query.filter(Rejection.user_id.in_(subquery))
        
        if mentor_id:
            # Фильтр по ментору (доступно только OWNER и ADMIN)
            if current_user.role in [UserRole.OWNER, UserRole.ADMIN]:
                subquery = db.query(User.id).filter(
                    User.mentor_id == mentor_id,
                    User.is_active == True
                ).subquery()
                query = query.filter(Rejection.user_id.in_(subquery))
        
        return query.order_by(Rejection.created_at.desc()).offset(skip).limit(limit).all()
    
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
        return self.get(db, rejection_id)  # Используем get для загрузки связей
    
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