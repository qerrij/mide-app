from sqlalchemy.orm import Session, joinedload, aliased
from typing import List, Optional, Dict
from sqlalchemy import and_, or_, func, case
import json
from datetime import datetime, timedelta
from app.models.product import Product
from app.models.revision import (
    Revision, RevisionDiscrepancy, RevisionEditingSession, RevisionFilling, RevisionFillingItem,
    RevisionStatus, RevisionType
)
from app.models.user import User, UserRole
from app.models.group import Group
from app.models.cluster import Cluster
from app.models.inventory import UserInventory
from app.schemas.revision import (
    RevisionCreate, RevisionUpdate, RevisionRequest, 
    RevisionFillingCreate, RevisionVerify
)
from app.crud.notification import crud_notification
from app.schemas.notification import NotificationType


class CRUDRevision:
    def get(self, db: Session, revision_id: int) -> Optional[Revision]:
        revision = db.query(Revision)\
            .options(
                joinedload(Revision.requested_by),
                joinedload(Revision.target_user),
                joinedload(Revision.target_group),
                joinedload(Revision.target_cluster),
                joinedload(Revision.verified_by),
                joinedload(Revision.fillings).joinedload(RevisionFilling.user),
                joinedload(Revision.fillings).joinedload(RevisionFilling.items)
                .joinedload(RevisionFillingItem.product)
                .joinedload(Product.category),
                joinedload(Revision.discrepancies).joinedload(RevisionDiscrepancy.user),
                joinedload(Revision.discrepancies).joinedload(RevisionDiscrepancy.product)
                .joinedload(Product.category)
            )\
            .filter(Revision.id == revision_id)\
            .first()
        
        if revision:
            revision = self.enrich_revision(db, revision)
        
        return revision
    
    def get_all(
        self, 
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        filters: Optional[Dict] = None
    ) -> List[Revision]:
        """Получить все ревизии с фильтрами"""
        query = db.query(Revision)\
            .options(
                joinedload(Revision.requested_by),
                joinedload(Revision.target_user),
                joinedload(Revision.target_group),
                joinedload(Revision.target_cluster),
                joinedload(Revision.verified_by),
            )
        
        if filters:
            if filters.get('status'):
                query = query.filter(Revision.status == filters['status'])
            if filters.get('type'):
                query = query.filter(Revision.type == filters['type'])
            if filters.get('target_user_id'):
                query = query.filter(Revision.target_user_id == filters['target_user_id'])
            if filters.get('target_group_id'):
                query = query.filter(Revision.target_group_id == filters['target_group_id'])
            if filters.get('target_cluster_id'):
                query = query.filter(Revision.target_cluster_id == filters['target_cluster_id'])
            if filters.get('requested_by_id'):
                query = query.filter(Revision.requested_by_id == filters['requested_by_id'])
            if filters.get('date_from'):
                query = query.filter(Revision.requested_at >= filters['date_from'])
            if filters.get('date_to'):
                query = query.filter(Revision.requested_at <= filters['date_to'])
        
        
        revisions = query.order_by(Revision.requested_at.desc())\
                    .offset(skip)\
                    .limit(limit)\
                    .all()
        
        # Обогащаем каждую ревизию
        enriched_revisions = []
        for revision in revisions:
            enriched_revisions.append(self.enrich_revision(db, revision))
        
        return enriched_revisions
    
    
    
    def get_revisions_for_user(
        self,
        db: Session,
        user_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[Revision]:
        """Получить ревизии, которые пользователь может видеть"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return []
        
        # Если пользователь OWNER - он видит все ревизии
        if user.role == UserRole.OWNER:
            query = db.query(Revision)\
                .options(
                    joinedload(Revision.requested_by),
                    joinedload(Revision.target_user),
                    joinedload(Revision.target_group),
                    joinedload(Revision.target_cluster)
                )
            
            return query.order_by(Revision.requested_at.desc())\
                    .offset(skip)\
                    .limit(limit)\
                    .all()
        
        # Получаем всех подчиненных
        subordinates = self._get_subordinate_users(db, user)
        subordinate_ids = [sub.id for sub in subordinates]
        
        # РЕВИЗИИ, КОТОРЫЕ ЗАПРОСИЛИ ПОДЧИНЕННЫЕ - НОВОЕ УСЛОВИЕ
        revisions_by_subordinates = db.query(Revision.id)\
            .filter(
                Revision.requested_by_id.in_(subordinate_ids)
            )\
            .subquery()
        
        # РЕВИЗИИ, КОТОРЫЕ ЗАПОЛНЯЛИ ПОДЧИНЕННЫЕ - НОВОЕ УСЛОВИЕ
        revisions_with_subordinate_filling = db.query(Revision.id)\
            .join(RevisionFilling, Revision.id == RevisionFilling.revision_id)\
            .filter(RevisionFilling.user_id.in_(subordinate_ids))\
            .subquery()
        
        # РЕВИЗИИ, ГДЕ ПОДЧИНЕННЫЕ ЯВЛЯЮТСЯ ЦЕЛЬЮ - НОВОЕ УСЛОВИЕ
        revisions_targeting_subordinates = db.query(Revision.id)\
            .filter(
                Revision.target_user_id.in_(subordinate_ids)
            )\
            .subquery()
        
        # ОСТАВЛЯЕМ ВСЕ ПРЕДЫДУЩИЕ УСЛОВИЯ + ДОБАВЛЯЕМ НОВЫЕ
        
        # 1. Ревизии, которые пользователь запросил сам
        requested_by_me = db.query(Revision.id)\
            .filter(Revision.requested_by_id == user_id)\
            .subquery()
        
        # 2. Ревизии, для которых создана запись RevisionFilling для этого пользователя
        revisions_with_my_filling = db.query(Revision.id)\
            .join(RevisionFilling, Revision.id == RevisionFilling.revision_id)\
            .filter(RevisionFilling.user_id == user_id)\
            .subquery()
        
        # 3. Ревизии, где пользователь явно указан как target_user
        revisions_targeting_me = db.query(Revision.id)\
            .filter(Revision.target_user_id == user_id)\
            .subquery()
        
        # 4. Для GROUP ревизий: пользователь видит ревизии своей группы
        revisions_for_my_group = db.query(Revision.id)\
            .filter(
                Revision.type == RevisionType.GROUP,
                Revision.target_group_id == user.group_id
            )\
            .subquery()
        
        # 5. Для CLUSTER ревизий: пользователь видит ревизии своего куста
        revisions_for_my_cluster = db.query(Revision.id)\
            .filter(
                Revision.type == RevisionType.CLUSTER,
                Revision.target_cluster_id == user.cluster_id
            )\
            .subquery()
        
        # 6. Для CITY ревизий: пользователь видит ревизии своего города
        revisions_for_my_city = db.query(Revision.id)\
            .filter(
                Revision.type == RevisionType.CITY,
                Revision.target_city == user.city_ref.name 
            )\
            .subquery()
        
        # 7. GENERAL ревизии: все пользователи (кроме OWNER и ACCOUNTANT) видят общие ревизии
        general_revisions = db.query(Revision.id)\
            .filter(Revision.type == RevisionType.GENERAL)\
            .subquery()
        
        # Собираем ВСЕ условия в один OR
        all_revision_ids = db.query(Revision.id)\
            .filter(
                or_(
                    # Стандартные условия (как раньше)
                    Revision.id.in_(requested_by_me),
                    Revision.id.in_(revisions_with_my_filling),
                    Revision.id.in_(revisions_targeting_me),
                    Revision.id.in_(revisions_for_my_group),
                    Revision.id.in_(revisions_for_my_cluster),
                    Revision.id.in_(revisions_for_my_city),
                    # Общие ревизии видят все, кроме ACCOUNTANT
                    and_(
                        Revision.type == RevisionType.GENERAL,
                        user.role != UserRole.ACCOUNTANT
                    ),
                    # НОВЫЕ УСЛОВИЯ: ревизии подчиненных
                    Revision.id.in_(revisions_by_subordinates),
                    Revision.id.in_(revisions_with_subordinate_filling),
                    Revision.id.in_(revisions_targeting_subordinates)
                )
            )\
            .distinct()\
            .subquery()
        
        # Теперь получаем полные данные ревизий
        query = db.query(Revision)\
            .options(
                joinedload(Revision.requested_by),
                joinedload(Revision.target_user),
                joinedload(Revision.target_group),
                joinedload(Revision.target_cluster)
            )\
            .filter(Revision.id.in_(all_revision_ids))
        
        return query.order_by(Revision.requested_at.desc())\
                .offset(skip)\
                .limit(limit)\
                .all()
    
    def get_with_summary(self, db: Session, revision_id: int, current_user_id: int) -> Optional[Dict]:
        """Получить ревизию со сводной информацией"""
        revision = self.get(db, revision_id)
        if not revision:
            return None
        
        result = {
            'revision': revision,
            'user_filling': None,
            'can_fill': False,
            'can_verify': False,
            'total_filled': 0,
            'total_users': 0
        }
        
        # Определяем, может ли пользователь заполнять эту ревизию
        result['can_fill'] = self._can_fill_revision(db, revision, current_user_id)
        
        # Определяем, может ли пользователь проверять эту ревизию
        result['can_verify'] = self._can_verify_revision(db, revision, current_user_id)
        
        # Для групповых ревизий считаем статистику
        if revision.type in [RevisionType.GROUP, RevisionType.CLUSTER, RevisionType.CITY, RevisionType.GENERAL]:
            users = self._get_users_for_revision(db, revision)
            result['total_users'] = len(users)
            
            # Считаем сколько заполнили
            filled_users = db.query(RevisionFilling.user_id)\
                .filter(
                    RevisionFilling.revision_id == revision_id,
                    RevisionFilling.is_completed == True
                )\
                .count()
            result['total_filled'] = filled_users
            
            # Получаем заполнение текущего пользователя
            user_filling = db.query(RevisionFilling)\
                .filter(
                    RevisionFilling.revision_id == revision_id,
                    RevisionFilling.user_id == current_user_id
                )\
                .first()
            
            if user_filling:
                result['user_filling'] = user_filling
        
        return result
    
    def _get_subordinate_users(self, db: Session, user: User) -> List[User]:
        """Получить всех подчиненных пользователя в иерархии"""
        subordinates = []
        
        if user.role == UserRole.OWNER:
            # Владелец видит всех пользователей
            subordinates = db.query(User).filter(User.id != user.id).all()
        
        elif user.role == UserRole.ADMIN:
            # Админ видит всех, кроме OWNER
            subordinates = db.query(User).filter(
                User.role.in_([
                    UserRole.SENIOR_SELLER, 
                    UserRole.MENTOR, 
                    UserRole.SELLER,
                    UserRole.ACCOUNTANT
                ])
            ).all()
        
        elif user.role == UserRole.SENIOR_SELLER:
            # Старший продавец видит продавцов и менторов своего куста
            if user.cluster_id:
                # Получаем все группы в кусте
                groups_in_cluster = db.query(Group).filter(
                    Group.cluster_id == user.cluster_id
                ).all()
                
                group_ids = [g.id for g in groups_in_cluster]
                
                # Продавцы в этих группах
                sellers = db.query(User).filter(
                    User.group_id.in_(group_ids),
                    User.role == UserRole.SELLER
                ).all()
                
                # Менторы этих групп
                mentors_ids = [g.mentor_id for g in groups_in_cluster if g.mentor_id]
                mentors = db.query(User).filter(
                    User.id.in_(mentors_ids)
                ).all()
                
                subordinates = sellers + mentors
        
        elif user.role == UserRole.MENTOR:
            # Ментор видит продавцов своей группы
            if user.group_id:
                subordinates = db.query(User).filter(
                    User.group_id == user.group_id,
                    User.role == UserRole.SELLER,
                    User.id != user.id
                ).all()
        
        return subordinates
    
    def create_request(
        self, 
        db: Session, 
        *, 
        revision_in: RevisionRequest, 
        requested_by_id: int
    ) -> Revision:
        """Создать запрос на ревизию"""
        
        requester = db.query(User).filter(User.id == requested_by_id).first()
        if not requester:
            raise ValueError("Requester not found")
        
        if requester.role == UserRole.MENTOR:
            raise ValueError("Менторы не могут запрашивать ревизии")
        
        # Определяем target_user_id в зависимости от типа
        target_user_id = None
        if revision_in.type == RevisionType.USER:
            target_user_id = revision_in.target_user_id
            if not target_user_id:
                raise ValueError("Для ревизии пользователя необходимо указать target_user_id")
        
        db_revision = Revision(
            requested_by_id=requested_by_id,
            type=revision_in.type,
            target_user_id=target_user_id,
            target_group_id=revision_in.target_group_id,
            target_cluster_id=revision_in.target_cluster_id,
            target_city=revision_in.target_city,
            status=RevisionStatus.REQUESTED,
            comment=revision_in.comment,
            photos=[]
        )
        
        db.add(db_revision)
        db.commit()
        db.refresh(db_revision)
        
        # Создаем записи о заполнении для всех пользователей
        self._create_fillings_for_revision(db, db_revision)
        
        # Создаем уведомления
        self._create_notifications(db, db_revision, requester)
        
        return db_revision
    
    def _create_fillings_for_revision(self, db: Session, revision: Revision):
        """Создать записи о заполнении для всех пользователей ревизии"""
        users = self._get_users_for_revision(db, revision)
        
        for user in users:
            # Не создаем заполнение для владельца
            if user.role == UserRole.OWNER:
                continue
                
            filling = RevisionFilling(
                revision_id=revision.id,
                user_id=user.id,
                status=RevisionStatus.REQUESTED
            )
            db.add(filling)
        
        db.commit()
    
    def _get_users_for_revision(self, db: Session, revision):
        """Получить всех пользователей, которые должны заполнить ревизию"""
        if revision.type == RevisionType.USER:
            return [db.query(User).filter(User.id == revision.target_user_id).first()]
        
        query = db.query(User)
        
        if revision.type == RevisionType.GROUP:
            query = query.filter(User.group_id == revision.target_group_id)
        elif revision.type == RevisionType.CLUSTER:
            # Включаем всех пользователей куста + менторов групп
            if revision.target_cluster_id:
                # Получаем все группы в кусте
                groups_in_cluster = db.query(Group).filter(
                    Group.cluster_id == revision.target_cluster_id
                ).all()
                
                group_ids = [g.id for g in groups_in_cluster]
                
                # Получаем всех пользователей в этих группах (продавцы)
                sellers = query.filter(User.group_id.in_(group_ids)).all()
                
                # Получаем менторов этих групп
                mentors_ids = [g.mentor_id for g in groups_in_cluster if g.mentor_id]
                mentors = db.query(User).filter(User.id.in_(mentors_ids)).all()
                
                # Получаем старшего продавца куста
                cluster = db.query(Cluster).filter(
                    Cluster.id == revision.target_cluster_id
                ).first()
                senior_seller = None
                if cluster and cluster.senior_seller_id:
                    senior_seller = db.query(User).filter(
                        User.id == cluster.senior_seller_id
                    ).first()
                
                # Объединяем всех
                users = list(set(sellers + mentors + ([senior_seller] if senior_seller else [])))
                return [u for u in users if u]
        
        elif revision.type == RevisionType.CITY:
            # query = query.filter(User.city == revision.target_city)
            query = query.filter(User.city_ref.has(name=revision.target_city))
        elif revision.type == RevisionType.GENERAL:
            # Все пользователи, кроме владельцев
            pass
        
        # Исключаем владельцев
        query = query.filter(User.role != UserRole.OWNER)
        
        # ВАЖНО: Включаем менторов
        query = query.filter(
            or_(
                User.role == UserRole.SELLER,
                User.role == UserRole.MENTOR,
                User.role == UserRole.SENIOR_SELLER,
                User.role == UserRole.ADMIN
            )
        )
        
        return query.all()
    
    def _create_notifications(self, db: Session, revision: Revision, requester: User):
        """Создать уведомления о ревизии через общую систему"""
        users_to_notify = []
        notification_data = []
        
        # Получаем всех пользователей для уведомления
        users = self._get_users_for_revision(db, revision)
        
        # Для групповой ревизии также уведомляем наставника группы
        if revision.type == RevisionType.GROUP and revision.target_group_id:
            group = db.query(Group).filter(Group.id == revision.target_group_id).first()
            if group and group.mentor_id:
                mentor = db.query(User).filter(User.id == group.mentor_id).first()
                if mentor and mentor.id not in [u.id for u in users]:
                    users.append(mentor)
        
        # Для ревизии куста уведомляем старшего продавца и всех пользователей куста
        elif revision.type == RevisionType.CLUSTER and revision.target_cluster_id:
            cluster = db.query(Cluster).filter(Cluster.id == revision.target_cluster_id).first()
            if cluster and cluster.senior_seller_id:
                senior_seller = db.query(User).filter(User.id == cluster.senior_seller_id).first()
                if senior_seller and senior_seller.id not in [u.id for u in users]:
                    users.append(senior_seller)
        
        for user in users:
            # Пропускаем самого себя
            if user.id == requester.id:
                continue
                
            notification_data.append({
                'user_id': user.id,
                'type': NotificationType.REVISION_REQUEST,
                'title': 'Запрошена ревизия',
                'message': self._get_revision_message(revision, requester),
                'data': {
                    'revision_id': revision.id,
                    'revision_type': revision.type.value,
                    'requested_by': requester.full_name,
                    'requested_by_id': requester.id,
                    'comment': revision.comment
                },
                'entity_type': 'revision',
                'entity_id': revision.id,
                'priority': 4
            })
        
        if notification_data:
            crud_notification.create_multiple(
                db,
                notifications_data=notification_data,
                sender_id=requester.id
            )
            
    
    def _get_revision_message(self, revision: Revision, requester: User) -> str:
        """Получить сообщение для уведомления в зависимости от типа ревизии"""
        if revision.type == RevisionType.USER:
            return f'Вам назначена ревизия от {requester.full_name}.'
        elif revision.type == RevisionType.GROUP:
            return f'Вашей группе назначена ревизия от {requester.full_name}.'
        elif revision.type == RevisionType.CLUSTER:
            return f'Вашему кусту назначена ревизия от {requester.full_name}.'
        elif revision.type == RevisionType.CITY:
            return f'В вашем городе назначена ревизия от {requester.full_name}.'
        else:
            return f'Назначена общая ревизия от {requester.full_name}.'
    
    def get_user_filling(self, db: Session, revision_id: int, user_id: int) -> Optional[RevisionFilling]:
        """Получить заполнение ревизии конкретным пользователем"""
        return db.query(RevisionFilling)\
            .options(
                joinedload(RevisionFilling.items).joinedload(RevisionFillingItem.product),
                joinedload(RevisionFilling.items).joinedload(RevisionFillingItem.category)
            )\
            .filter(
                RevisionFilling.revision_id == revision_id,
                RevisionFilling.user_id == user_id
            )\
            .first()
    
    def create_or_update_filling(
        self, 
        db: Session, 
        revision_id: int, 
        filling_data: RevisionFillingCreate,
        user_id: int
    ) -> RevisionFilling:
        """Создать или обновить заполнение ревизии"""
        revision = self.get(db, revision_id)
        if not revision:
            raise ValueError("Ревизия не найдена")
        
        # Проверяем, может ли пользователь заполнять эту ревизию
        if not self._can_fill_revision(db, revision, user_id):
            raise ValueError("У вас нет прав для заполнения этой ревизии")
        
        # Проверяем статус ревизии
        if revision.status != RevisionStatus.REQUESTED:
            raise ValueError("Ревизия уже завершена или отменена")
        
        # Ищем существующее заполнение
        filling = self.get_user_filling(db, revision_id, user_id)
        
        if not filling:
            # Создаем новое заполнение
            filling = RevisionFilling(
                revision_id=revision_id,
                user_id=user_id,
                status=RevisionStatus.COMPLETED,
                photos=filling_data.photos,
                filled_at=datetime.now(),
                is_completed=True
            )
            db.add(filling)
            db.flush()  # Получаем ID заполнения
        else:
            # Обновляем существующее
            filling.status = RevisionStatus.COMPLETED
            filling.photos = filling_data.photos
            filling.filled_at = datetime.now()
            filling.is_completed = True
        
        # Удаляем старые товары
        db.query(RevisionFillingItem).filter(RevisionFillingItem.filling_id == filling.id).delete()
        
        # Добавляем новые товары
        for item_data in filling_data.items:
            item = RevisionFillingItem(
                filling_id=filling.id,
                product_id=item_data.product_id,
                category_id=item_data.category_id,
                quantity=item_data.quantity
            )
            db.add(item)
        
        # Проверяем, все ли заполнили ревизию
        
        
        db.commit()
        db.refresh(filling)

        self._check_if_all_filled(db, revision)
        
        # Отправляем уведомление тому, кто запросил ревизию
        filler = db.query(User).filter(User.id == user_id).first()
        if filler and revision.requested_by_id != user_id:
            notification_data = {
                'user_id': revision.requested_by_id,
                'type': NotificationType.REVISION_COMPLETED,
                'title': 'Ревизия заполнена',
                'message': f'Пользователь {filler.full_name} заполнил ревизию #{revision.id}.',
                'data': {
                    'revision_id': revision.id,
                    'filled_by': filler.full_name,
                    'filled_by_id': filler.id
                },
                'entity_type': 'revision',
                'entity_id': revision.id,
                'priority': 3
            }
            
            crud_notification.create(
                db,
                notification_in=notification_data,
                sender_id=user_id
            )
        
        return filling
    
    def enrich_revision(self, db: Session, revision: Revision) -> Revision:
        """Обогащает объект ревизии дополнительными данными"""
        if not revision:
            return revision
        
        # Принудительно загружаем связанные данные, если они не загружены
        # Это нужно для случаев, когда объект получен без joinedload
        
        # Загружаем requested_by
        if revision.requested_by_id and not hasattr(revision, 'requested_by'):
            from app.models.user import User
            revision.requested_by = db.query(User).filter(
                User.id == revision.requested_by_id
            ).first()
        
        # Загружаем target_user
        if revision.target_user_id and not hasattr(revision, 'target_user'):
            from app.models.user import User
            revision.target_user = db.query(User).filter(
                User.id == revision.target_user_id
            ).first()
        
        # Загружаем target_group
        if revision.target_group_id and not hasattr(revision, 'target_group'):
            from app.models.group import Group
            revision.target_group = db.query(Group).filter(
                Group.id == revision.target_group_id
            ).first()
        
        # Загружаем target_cluster
        if revision.target_cluster_id and not hasattr(revision, 'target_cluster'):
            from app.models.cluster import Cluster
            revision.target_cluster = db.query(Cluster).filter(
                Cluster.id == revision.target_cluster_id
            ).first()
        
        # Загружаем verified_by
        if revision.verified_by_id and not hasattr(revision, 'verified_by'):
            from app.models.user import User
            revision.verified_by = db.query(User).filter(
                User.id == revision.verified_by_id
            ).first()
        
        # Загружаем fillings с пользователями и товарами
        if not hasattr(revision, 'fillings') or not revision.fillings:
            fillings = db.query(RevisionFilling)\
                .options(
                    joinedload(RevisionFilling.user),
                    joinedload(RevisionFilling.items)
                    .joinedload(RevisionFillingItem.product)
                    .joinedload(Product.category)
                )\
                .filter(RevisionFilling.revision_id == revision.id)\
                .all()
            revision.fillings = fillings
        else:
            # Если fillings уже загружены, обогащаем их
            for filling in revision.fillings:
                self._enrich_filling(db, filling)
        
        # Загружаем discrepancies
        if not hasattr(revision, 'discrepancies') or not revision.discrepancies:
            discrepancies = db.query(RevisionDiscrepancy)\
                .options(
                    joinedload(RevisionDiscrepancy.user),
                    joinedload(RevisionDiscrepancy.product)
                    .joinedload(Product.category)
                )\
                .filter(RevisionDiscrepancy.revision_id == revision.id)\
                .all()
            revision.discrepancies = discrepancies
        else:
            # Если discrepancies уже загружены, обогащаем их
            for disc in revision.discrepancies:
                self._enrich_discrepancy(db, disc)
        
        return revision

    def _enrich_filling(self, db: Session, filling: RevisionFilling) -> RevisionFilling:
        """Обогащает объект заполнения"""
        if not filling:
            return filling
        
        # Загружаем пользователя
        if filling.user_id and not hasattr(filling, 'user'):
            from app.models.user import User
            filling.user = db.query(User).filter(User.id == filling.user_id).first()
        
        # Загружаем items с продуктами
        if not hasattr(filling, 'items') or not filling.items:
            items = db.query(RevisionFillingItem)\
                .options(
                    joinedload(RevisionFillingItem.product)
                    .joinedload(Product.category)
                )\
                .filter(RevisionFillingItem.filling_id == filling.id)\
                .all()
            filling.items = items
        else:
            # Обогащаем уже загруженные items
            for item in filling.items:
                self._enrich_filling_item(db, item)
        
        return filling

    def _enrich_filling_item(self, db: Session, item: RevisionFillingItem) -> RevisionFillingItem:
        """Обогащает объект товара в заполнении"""
        if not item:
            return item
        
        # Загружаем продукт
        if item.product_id and not hasattr(item, 'product'):
            from app.models.product import Product
            item.product = db.query(Product)\
                .options(joinedload(Product.category))\
                .filter(Product.id == item.product_id)\
                .first()
        
        return item

    def _enrich_discrepancy(self, db: Session, disc: RevisionDiscrepancy) -> RevisionDiscrepancy:
        """Обогащает объект расхождения"""
        if not disc:
            return disc
        
        # Загружаем пользователя
        if disc.user_id and not hasattr(disc, 'user'):
            from app.models.user import User
            disc.user = db.query(User).filter(User.id == disc.user_id).first()
        
        # Загружаем продукт
        if disc.product_id and not hasattr(disc, 'product'):
            from app.models.product import Product
            disc.product = db.query(Product)\
                .options(joinedload(Product.category))\
                .filter(Product.id == disc.product_id)\
                .first()
        
        return disc
    
    def _check_if_all_filled(self, db: Session, revision: Revision):
        """Проверить, все ли заполнили ревизию и обновить статус"""
        # Проверяем, есть ли активные сессии редактирования
        active_sessions = [s for s in revision.editing_sessions if not s.is_expired()]
        if len(active_sessions) > 0:
            return
        
        # Для индивидуальной ревизии сразу отмечаем как заполненную
        if revision.type == RevisionType.USER:
            revision.status = RevisionStatus.COMPLETED
            revision.completed_at = datetime.now()
            db.commit()
            return
        
        # Для групповой ревизии проверяем все заполнения
        users = self._get_users_for_revision(db, revision)
        total_users = len(users)
        
        if total_users == 0:
            return
        
        filled_count = db.query(RevisionFilling)\
            .filter(
                RevisionFilling.revision_id == revision.id,
                RevisionFilling.is_completed == True
            )\
            .count()
        
        if filled_count == total_users:
            revision.status = RevisionStatus.COMPLETED
            revision.completed_at = datetime.now()
            db.commit()
    
    def verify_revision(
        self, 
        db: Session, 
        revision_id: int, 
        verify_data: RevisionVerify,
        verified_by_id: int
    ) -> Revision:
        """Проверить ревизию (только тот, кто запросил)"""
        revision = self.get(db, revision_id)
        if not revision:
            raise ValueError("Ревизия не найдена")
        
        # Проверяем, что проверяющий - тот, кто запросил ревизию
        if revision.requested_by_id != verified_by_id:
            raise ValueError("Только тот, кто запросил ревизию, может её проверить")
        
        # Проверяем статус
        if revision.status != RevisionStatus.COMPLETED:
            raise ValueError("Ревизия еще не заполнена всеми участниками")
        
        # Проверяем доступ к проверке
        verifier = db.query(User).filter(User.id == verified_by_id).first()
        if not verifier or verifier.role == UserRole.MENTOR:
            raise ValueError("Нет прав для проверки ревизии")
        
        # Обновляем статус
        revision.status = RevisionStatus.VERIFIED
        revision.verified_by_id = verified_by_id
        revision.verified_at = datetime.now()
        revision.verification_comment = verify_data.verification_comment
        
        # Получаем все заполнения
        fillings = db.query(RevisionFilling)\
            .filter(
                RevisionFilling.revision_id == revision.id,
                RevisionFilling.is_completed == True
            )\
            .all()
        
        # Очищаем старые расхождения
        db.query(RevisionDiscrepancy).filter(RevisionDiscrepancy.revision_id == revision.id).delete()
        
        from app.crud.inventory import crud_inventory
        from app.models.inventory import InventoryReservation, ReservationStatus
        from app.crud.debt import crud_debt
        
        # Для каждого заполнения находим расхождения и сразу применяем их
        for filling in fillings:
            for item in filling.items:
                inventory = db.query(UserInventory).filter(
                    UserInventory.user_id == filling.user_id,
                    UserInventory.product_id == item.product_id
                ).first()
                
                # Получаем доступное количество (общее - все активные резервы)
                total_quantity = inventory.quantity if inventory else 0
                
                # Получаем все активные резервы для этого пользователя и товара
                reserved = db.query(func.sum(InventoryReservation.quantity)).filter(
                    InventoryReservation.user_id == filling.user_id,
                    InventoryReservation.product_id == item.product_id,
                    InventoryReservation.status == ReservationStatus.ACTIVE
                ).scalar() or 0
                
                available_quantity = total_quantity - reserved
                
                expected = available_quantity  # Используем доступное количество
                actual = item.quantity
                discrepancy = actual - expected
                
                if discrepancy != 0:
                    # Создаем запись о расхождении
                    disc = RevisionDiscrepancy(
                        revision_id=revision.id,
                        product_id=item.product_id,
                        user_id=filling.user_id,
                        expected_quantity=expected,
                        actual_quantity=actual,
                        discrepancy=discrepancy,
                        is_positive=discrepancy > 0
                    )
                    db.add(disc)
                    db.flush()  # Получаем ID расхождения
                    
                    # Применяем расхождение к инвентарю
                    try:
                        crud_inventory.update_inventory(
                            db,
                            user_id=filling.user_id,
                            product_id=item.product_id,
                            quantity_change=discrepancy
                        )
                        
                        # *** НОВОЕ: Обновляем долг пользователя ***
                        if discrepancy < 0:  # Только минусы увеличивают долг
                            product = db.query(Product).filter(Product.id == item.product_id).first()
                            seller = db.query(User).filter(User.id == filling.user_id).first()
                            
                            if product and seller:
                                # Функция для расчета ставки - нужно импортировать
                                from app.api.endpoints.reports import _calculate_product_rate
                                rate = _calculate_product_rate(db, product, seller)
                                price_per_unit = product.price
                                amount_per_unit = max(0, price_per_unit - rate)
                                total_amount = amount_per_unit * abs(discrepancy)
                                
                                crud_debt.update_debt_from_revision_discrepancy(
                                    db,
                                    user_id=filling.user_id,
                                    product_id=item.product_id,
                                    discrepancy=discrepancy,
                                    revision_id=revision.id,
                                    revision_discrepancy_id=disc.id,
                                    product_price=price_per_unit,
                                    applied_rate=rate,
                                    quantity=abs(discrepancy),
                                    total_amount=total_amount
                                )
                        
                    except Exception as e:
                        print(f"Error updating inventory: {e}")
        
        db.commit()
        db.refresh(revision)
        
        # Создаем уведомления о проверке
        self._create_verification_notifications(db, revision, verifier)
        
        return revision
    
    def cancel_revision(
        self, 
        db: Session, 
        revision_id: int, 
        user_id: int,
        cancel_comment: Optional[str] = None
    ) -> Revision:
        """Отменить ревизию (только если не проверена)"""
        revision = self.get(db, revision_id)
        if not revision:
            raise ValueError("Ревизия не найдена")
        
        # Проверяем права - отменить может только тот, кто запросил, или OWNER
        if revision.requested_by_id != user_id:
            current_user = db.query(User).filter(User.id == user_id).first()
            if not current_user or current_user.role != UserRole.OWNER:
                raise ValueError("Только владелец ревизии или OWNER могут отменить ревизию")
        
        # Проверяем статус - нельзя отменить уже проверенную
        if revision.status == RevisionStatus.VERIFIED:
            raise ValueError("Нельзя отменить проверенную ревизию")
        
        # Сохраняем старый статус
        old_status = revision.status
        
        # Обновляем статус
        revision.status = RevisionStatus.REJECTED
        revision.verification_comment = cancel_comment or "Ревизия отменена"
        
        # Если ревизия была в процессе заполнения, удаляем все заполнения
        if old_status in [RevisionStatus.REQUESTED, RevisionStatus.IN_PROGRESS, RevisionStatus.COMPLETED]:
            # Получаем все заполнения
            fillings = db.query(RevisionFilling).filter(
                RevisionFilling.revision_id == revision_id
            ).all()
            
            for filling in fillings:
                # Удаляем фото заполнений
                if filling.photos:
                    import os
                    from pathlib import Path
                    for photo_path in filling.photos:
                        try:
                            full_path = Path(f"uploads/{photo_path}")
                            if full_path.exists():
                                os.remove(full_path)
                        except Exception as e:
                            print(f"Error deleting photo {photo_path}: {e}")
                
                # Удаляем товары заполнения
                db.query(RevisionFillingItem).filter(
                    RevisionFillingItem.filling_id == filling.id
                ).delete()
            
            # Удаляем все заполнения
            db.query(RevisionFilling).filter(
                RevisionFilling.revision_id == revision_id
            ).delete()
            
            # Удаляем расхождения, если были
            db.query(RevisionDiscrepancy).filter(
                RevisionDiscrepancy.revision_id == revision_id
            ).delete()
        
        db.commit()
        db.refresh(revision)
        
        # Создаем уведомления об отмене
        self._create_cancel_notifications(db, revision, user_id, cancel_comment)
        
        return revision

    def _create_cancel_notifications(self, db: Session, revision: Revision, cancelled_by_id: int, comment: Optional[str] = None):
        """Создать уведомления об отмене ревизии"""
        cancelled_by = db.query(User).filter(User.id == cancelled_by_id).first()
        if not cancelled_by:
            return
        
        # Получаем всех, кто должен был заполнять ревизию
        users = self._get_users_for_revision(db, revision)
        
        notification_data = []
        for user in users:
            if user.id == cancelled_by_id:
                continue
                
            notification_data.append({
                'user_id': user.id,
                'type': NotificationType.REVISION_CANCELLED,
                'title': 'Ревизия отменена',
                'message': f'Ревизия #{revision.id} была отменена пользователем {cancelled_by.full_name}.{f" Причина: {comment}" if comment else ""}',
                'data': {
                    'revision_id': revision.id,
                    'cancelled_by': cancelled_by.full_name,
                    'cancelled_by_id': cancelled_by.id,
                    'comment': comment
                },
                'entity_type': 'revision',
                'entity_id': revision.id,
                'priority': 4
            })
        
        if notification_data:
            crud_notification.create_multiple(
                db,
                notifications_data=notification_data,
                sender_id=cancelled_by_id
            )
    
    def _find_and_save_discrepancies(self, db: Session, revision: Revision):
        """Найти и сохранить расхождения для ревизии"""
        # Очищаем старые расхождения
        db.query(RevisionDiscrepancy).filter(RevisionDiscrepancy.revision_id == revision.id).delete()
        
        # Получаем все заполнения
        fillings = db.query(RevisionFilling)\
            .filter(
                RevisionFilling.revision_id == revision.id,
                RevisionFilling.is_completed == True
            )\
            .all()
        
        for filling in fillings:
            # Для каждого товара в заполнении ищем расхождения с инвентарем
            for item in filling.items:
                inventory = db.query(UserInventory).filter(
                    UserInventory.user_id == filling.user_id,
                    UserInventory.product_id == item.product_id
                ).first()
                
                expected = inventory.quantity if inventory else 0
                actual = item.quantity
                discrepancy = actual - expected
                
                if discrepancy != 0:
                    disc = RevisionDiscrepancy(
                        revision_id=revision.id,
                        product_id=item.product_id,
                        user_id=filling.user_id,
                        expected_quantity=expected,
                        actual_quantity=actual,
                        discrepancy=discrepancy,
                        is_positive=discrepancy > 0
                    )
                    db.add(disc)
    
    def _create_verification_notifications(self, db: Session, revision: Revision, verifier: User):
        """Создать уведомления о результатах проверки"""
        # Получаем всех пользователей, которые заполняли ревизию
        fillings = db.query(RevisionFilling)\
            .filter(
                RevisionFilling.revision_id == revision.id,
                RevisionFilling.is_completed == True
            )\
            .all()
        
        notification_data = []
        
        # Уведомляем всех участников
        for filling in fillings:
            # Получаем расхождения для этого пользователя
            discrepancies = db.query(RevisionDiscrepancy)\
                .filter(
                    RevisionDiscrepancy.revision_id == revision.id,
                    RevisionDiscrepancy.user_id == filling.user_id
                )\
                .all()
            
            has_discrepancies = len(discrepancies) > 0
            positive_count = sum(1 for d in discrepancies if d.is_positive)
            negative_count = sum(1 for d in discrepancies if not d.is_positive)
            
            message = "Ревизия проверена. Расхождений нет."
            if has_discrepancies:
                message = f"Ревизия проверена. Обнаружены расхождения: {positive_count} плюсов, {negative_count} минусов."
            
            notification_data.append({
                'user_id': filling.user_id,
                'type': NotificationType.REVISION_VERIFIED,
                'title': 'Ревизия проверена',
                'message': message,
                'data': {
                    'revision_id': revision.id,
                    'verified_by': verifier.full_name,
                    'has_discrepancies': has_discrepancies,
                    'positive_count': positive_count,
                    'negative_count': negative_count
                },
                'entity_type': 'revision',
                'entity_id': revision.id,
                'priority': 3
            })
        
        if notification_data:
            crud_notification.create_multiple(
                db,
                notifications_data=notification_data,
                sender_id=verifier.id
            )
    
    def _can_fill_revision(self, db: Session, revision: Revision, user_id: int) -> bool:
        """Проверяет, может ли пользователь заполнить ревизию"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        # Проверяем базовое право на участие
        if not self._can_participate_in_revision(db, revision, user_id):
            return False
        
        # Проверяем статус ревизии
        if revision.status != RevisionStatus.REQUESTED:
            return False
        
        # Проверяем, не заполнил ли уже пользователь эту ревизию
        existing_filling = db.query(RevisionFilling)\
            .filter(
                RevisionFilling.revision_id == revision.id,
                RevisionFilling.user_id == user_id
            )\
            .first()
        
        if existing_filling and existing_filling.is_completed:
            return False  # Уже заполнил
        
        return True
    
    def _can_verify_revision(self, db: Session, revision: Revision, user_id: int) -> bool:
        """Проверяет, может ли пользователь проверять ревизию"""
        # Только тот, кто запросил ревизию, может её проверить
        if revision.requested_by_id != user_id:
            return False
        
        # Нельзя проверять, если кто-то редактирует
        if revision.is_being_edited:
            return False
        
        return True
    
    def get_revision_summary(self, db: Session, revision_id: int) -> Dict:
        """Получить сводку по ревизии"""
        revision = self.get(db, revision_id)
        if not revision:
            return {}
        
        # Получаем все заполнения
        fillings = db.query(RevisionFilling)\
            .options(
                joinedload(RevisionFilling.user),
                joinedload(RevisionFilling.items).joinedload(RevisionFillingItem.product)
            )\
            .filter(
                RevisionFilling.revision_id == revision_id,
                RevisionFilling.is_completed == True
            )\
            .all()
        
        # Собираем сводную информацию по продуктам
        product_summary = {}
        
        for filling in fillings:
            for item in filling.items:
                product_id = item.product_id
                
                if product_id not in product_summary:
                    product_summary[product_id] = {
                        'product_id': product_id,
                        'product_name': item.product.name if item.product else None,
                        'product_sku': item.product.sku if item.product else None,
                        'category_name': item.product.category.name if item.product and item.product.category else None,
                        'total_quantity': 0,
                        'user_quantities': []
                    }
                
                product_summary[product_id]['total_quantity'] += item.quantity
                product_summary[product_id]['user_quantities'].append({
                    'user_id': filling.user_id,
                    'user_name': filling.user.full_name if filling.user else None,
                    'quantity': item.quantity
                })
        
        # Получаем расхождения
        discrepancies = db.query(RevisionDiscrepancy)\
            .options(
                joinedload(RevisionDiscrepancy.user),
                joinedload(RevisionDiscrepancy.product)
            )\
            .filter(RevisionDiscrepancy.revision_id == revision_id)\
            .all()
        
        # Группируем расхождения по пользователям
        user_discrepancies = {}
        product_discrepancies = {}
        
        for disc in discrepancies:
            # По пользователям
            if disc.user_id not in user_discrepancies:
                user_discrepancies[disc.user_id] = {
                    'user_id': disc.user_id,
                    'user_name': disc.user.full_name if disc.user else None,
                    'total_discrepancy': 0,
                    'positive_total': 0,
                    'negative_total': 0,
                    'discrepancies': []
                }
            
            user_discrepancies[disc.user_id]['total_discrepancy'] += disc.discrepancy
            if disc.is_positive:
                user_discrepancies[disc.user_id]['positive_total'] += disc.discrepancy
            else:
                user_discrepancies[disc.user_id]['negative_total'] += abs(disc.discrepancy)
            
            user_discrepancies[disc.user_id]['discrepancies'].append({
                'product_id': disc.product_id,
                'product_name': disc.product.name if disc.product else None,
                'expected': disc.expected_quantity,
                'actual': disc.actual_quantity,
                'discrepancy': disc.discrepancy,
                'is_positive': disc.is_positive
            })
            
            # По продуктам
            if disc.product_id not in product_discrepancies:
                product_discrepancies[disc.product_id] = {
                    'product_id': disc.product_id,
                    'product_name': disc.product.name if disc.product else None,
                    'total_discrepancy': 0,
                    'positive_total': 0,
                    'negative_total': 0,
                    'user_discrepancies': []
                }
            
            product_discrepancies[disc.product_id]['total_discrepancy'] += disc.discrepancy
            if disc.is_positive:
                product_discrepancies[disc.product_id]['positive_total'] += disc.discrepancy
            else:
                product_discrepancies[disc.product_id]['negative_total'] += abs(disc.discrepancy)
            
            product_discrepancies[disc.product_id]['user_discrepancies'].append({
                'user_id': disc.user_id,
                'user_name': disc.user.full_name if disc.user else None,
                'expected': disc.expected_quantity,
                'actual': disc.actual_quantity,
                'discrepancy': disc.discrepancy,
                'is_positive': disc.is_positive
            })
        
        return {
            'revision': revision,
            'product_summary': list(product_summary.values()),
            'user_discrepancies': list(user_discrepancies.values()),
            'product_discrepancies': list(product_discrepancies.values()),
            'total_filled': len(fillings),
            'total_users': len(self._get_users_for_revision(db, revision))
        }
    def delete(self, db: Session, revision_id: int, current_user_id: int) -> bool:
        """Удалить ревизию (только владелец ревизии или OWNER)"""
        revision = self.get(db, revision_id)
        if not revision:
            raise ValueError("Ревизия не найдена")
        
        # Проверяем права
        if revision.requested_by_id != current_user_id:
            # Проверяем, является ли пользователь OWNER
            current_user = db.query(User).filter(User.id == current_user_id).first()
            if not current_user or current_user.role != UserRole.OWNER:
                raise ValueError("Только владелец ревизии или OWNER могут удалить ревизию")
        
        # Проверяем статус ревизии
        if revision.status == RevisionStatus.VERIFIED:
            raise ValueError("Нельзя удалить проверенную ревизию")
        
        try:
            # Удаляем связанные данные в правильном порядке (важно для каскадного удаления)
            # 1. Удаляем расхождения
            db.query(RevisionDiscrepancy).filter(
                RevisionDiscrepancy.revision_id == revision_id
            ).delete()
            
            # 2. Удаляем заполнения и их товары (каскадно через relationship)
            fillings = db.query(RevisionFilling).filter(
                RevisionFilling.revision_id == revision_id
            ).all()
            
            for filling in fillings:
                # Удаляем фото из файловой системы
                if filling.photos:
                    import os
                    from pathlib import Path
                    for photo_path in filling.photos:
                        try:
                            full_path = Path(f"uploads/{photo_path}")
                            if full_path.exists():
                                os.remove(full_path)
                        except Exception as e:
                            print(f"Error deleting photo {photo_path}: {e}")
            
            # 3. Удаляем саму ревизию (заполнения удалятся каскадно)
            db.delete(revision)
            db.commit()
            
            return True
            
        except Exception as e:
            db.rollback()
            raise ValueError(f"Ошибка при удалении ревизии: {str(e)}")
        
    # В CRUDRevision добавляем:

    def revert_revision_changes(
        self, 
        db: Session, 
        revision_id: int, 
        user_id: int
    ) -> Revision:
        """Отменить изменения инвентаря после проверки ревизии"""
        from app.crud.inventory import crud_inventory
        from app.models.revision import RevisionDiscrepancy
        
        revision = self.get(db, revision_id)
        if not revision:
            raise ValueError("Ревизия не найдена")
        
        # Проверяем права (только тот, кто проверил ревизию)
        if revision.verified_by_id != user_id:
            raise ValueError("Только тот, кто проверил ревизию, может отменить изменения")
        
        # Проверяем статус
        if revision.status != RevisionStatus.VERIFIED:
            raise ValueError("Ревизия еще не проверена")
        
        # Получаем все расхождения
        discrepancies = db.query(RevisionDiscrepancy)\
            .filter(RevisionDiscrepancy.revision_id == revision_id)\
            .all()
        
        # Восстанавливаем инвентарь (отменяем изменения)
        for disc in discrepancies:
            # Отменяем изменение (инвертируем знак)
            quantity_change = -disc.discrepancy
            
            crud_inventory.update_inventory(
                db,
                user_id=disc.user_id,
                product_id=disc.product_id,
                quantity_change=quantity_change
            )
        
        # Обновляем статус ревизии
        revision.status = RevisionStatus.COMPLETED
        revision.verified_by_id = None
        revision.verified_at = None
        revision.verification_comment = f"Изменения отменены пользователем {user_id}"
        
        db.commit()
        db.refresh(revision)
        
        return revision
        
    def start_editing(
        self, 
        db: Session, 
        revision_id: int, 
        user_id: int,
        session_duration_minutes: int = 30
    ) -> RevisionEditingSession:
        """Начать редактирование своего заполнения"""
        revision = self.get(db, revision_id)
        if not revision:
            raise ValueError("Ревизия не найдена")
        
        # Проверяем статус ревизии
        if revision.status == RevisionStatus.VERIFIED:
            raise ValueError("Нельзя редактировать проверенную ревизию")
        
        if revision.status == RevisionStatus.REJECTED:
            raise ValueError("Ревизия отменена")
        
        # Проверяем, есть ли у пользователя заполнение для этой ревизии
        filling = self.get_user_filling(db, revision_id, user_id)
        if not filling:
            raise ValueError("У вас нет заполнения для этой ревизии")
        
        if not filling.is_completed:
            raise ValueError("Заполнение еще не завершено")
        
        # Проверяем, может ли пользователь в принципе участвовать в этой ревизии
        if not self._can_participate_in_revision(db, revision, user_id):
            raise ValueError("У вас нет прав для участия в этой ревизии")
        
        # Проверяем, есть ли уже активная сессия для этого пользователя
        existing_session = db.query(RevisionEditingSession).filter(
            RevisionEditingSession.revision_id == revision_id,
            RevisionEditingSession.user_id == user_id
        ).first()
        
        if existing_session:
            if not existing_session.is_expired():
                existing_session.expires_at = datetime.now() + timedelta(minutes=session_duration_minutes)
                existing_session.last_activity_at = datetime.now()
                db.commit()
                db.refresh(existing_session)
                return existing_session
            else:
                db.delete(existing_session)
                db.commit()
        
        # Если ревизия была COMPLETED, меняем статус на IN_PROGRESS
        if revision.status == RevisionStatus.COMPLETED:
            revision.status = RevisionStatus.IN_PROGRESS
            revision.completed_at = None
            
        
        # Создаем новую сессию
        session = RevisionEditingSession(
            revision_id=revision_id,
            user_id=user_id,
            expires_at=datetime.now() + timedelta(minutes=session_duration_minutes)
        )
        
        db.add(session)
        db.commit()
        db.refresh(session)
        
        return session


    def stop_editing(
        self, 
        db: Session, 
        revision_id: int, 
        user_id: int,
        saved: bool = False
    ) -> bool:
        """Закончить редактирование"""
        session = db.query(RevisionEditingSession).filter(
            RevisionEditingSession.revision_id == revision_id,
            RevisionEditingSession.user_id == user_id
        ).first()
        
        if session:
            db.delete(session)
        
        # Проверяем, остались ли активные сессии
        revision = self.get(db, revision_id)
        
        # Получаем все активные сессии
        active_sessions = [s for s in revision.editing_sessions if not s.is_expired()]
        
        # Только если НЕТ активных сессий, проверяем статус
        if len(active_sessions) == 0:
            self._check_if_all_filled(db, revision)
        
        db.commit()
        return True


    def update_filling(
        self, 
        db: Session, 
        revision_id: int, 
        filling_data: RevisionFillingCreate,
        user_id: int,
        deleted_photos: List[str] = None
    ) -> RevisionFilling:
        """Обновить существующее заполнение ревизии"""
        from app.core.file_utils import delete_file
        
        revision = self.get(db, revision_id)
        if not revision:
            raise ValueError("Ревизия не найдена")
        
        # Проверяем, что у пользователя есть активная сессия редактирования
        active_session = db.query(RevisionEditingSession).filter(
            RevisionEditingSession.revision_id == revision_id,
            RevisionEditingSession.user_id == user_id
        ).first()
        
        if not active_session:
            raise ValueError("Сессия редактирования не найдена. Начните редактирование заново")
        
        if active_session.is_expired():
            db.delete(active_session)
            db.commit()
            raise ValueError("Сессия редактирования истекла. Начните редактирование заново")
        
        # Проверяем статус ревизии
        if revision.status not in [RevisionStatus.REQUESTED, RevisionStatus.IN_PROGRESS]:
            raise ValueError(f"Нельзя редактировать ревизию в статусе {revision.status.value}")
        
        # Получаем существующее заполнение
        filling = self.get_user_filling(db, revision_id, user_id)
        if not filling:
            raise ValueError("Заполнение не найдено")
        
        # Создаем новый список фото на основе текущих
        current_photos = list(filling.photos) if filling.photos else []
        
        # Обрабатываем удаленные фото
        if deleted_photos:
            for photo_path in deleted_photos:
                if photo_path in current_photos:
                    current_photos.remove(photo_path)
                    try:
                        delete_file(photo_path)
                    except Exception as e:
                        print(f"Error deleting photo {photo_path} from cloud: {e}")
        
        # Добавляем новые фото
        if filling_data.photos:
            current_photos.extend(filling_data.photos)
        
        # Присваиваем обновленный список
        filling.photos = current_photos
        
        # Обновляем заполнение
        filling.status = RevisionStatus.COMPLETED
        filling.filled_at = datetime.now()
        filling.is_completed = True
        filling.updated_at = datetime.now()
        filling.last_updated_by_id = user_id
        
        # Удаляем старые товары
        db.query(RevisionFillingItem).filter(RevisionFillingItem.filling_id == filling.id).delete()
        
        # Добавляем новые товары
        for item_data in filling_data.items:
            item = RevisionFillingItem(
                filling_id=filling.id,
                product_id=item_data.product_id,
                category_id=item_data.category_id,
                quantity=item_data.quantity
            )
            db.add(item)
        
        # Удаляем ТОЛЬКО сессию текущего пользователя
        db.delete(active_session)
        
        db.commit()
        db.refresh(filling)
        
        # Проверяем, остались ли активные сессии
        revision = self.get(db, revision_id)
        active_sessions = [s for s in revision.editing_sessions if not s.is_expired()]
        
        # Только если НЕТ активных сессий, проверяем статус
        if len(active_sessions) == 0:
            self._check_if_all_filled(db, revision)
            db.commit()
        
        # Уведомляем владельца ревизии об изменении
        self._notify_filling_updated(db, revision, filling, user_id)
        
        return filling
    
    def _can_participate_in_revision(self, db: Session, revision: Revision, user_id: int) -> bool:
        """Проверяет, может ли пользователь участвовать в ревизии (без учета уже заполнено или нет)"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        # OWNER и ACCOUNTANT не участвуют в заполнении ревизий
        if user.role in [UserRole.OWNER, UserRole.ACCOUNTANT]:
            return False
        
        # Проверяем доступ в зависимости от типа ревизии
        if revision.type == RevisionType.USER:
            return revision.target_user_id == user_id
        
        elif revision.type == RevisionType.GROUP:
            return user.group_id == revision.target_group_id
        
        elif revision.type == RevisionType.CLUSTER:
            if revision.target_cluster_id:
                if user.cluster_id == revision.target_cluster_id:
                    return True
                
                cluster = db.query(Cluster).filter(
                    Cluster.id == revision.target_cluster_id
                ).first()
                if cluster and cluster.senior_seller_id == user_id:
                    return True
        
        elif revision.type == RevisionType.CITY:
            if user.city_ref and revision.target_city:
                return user.city_ref.name == revision.target_city
            return False
        
        elif revision.type == RevisionType.GENERAL:
            return user.role not in [UserRole.OWNER, UserRole.ACCOUNTANT]
        
        return False


    def _notify_filling_updated(self, db: Session, revision: Revision, filling: RevisionFilling, updated_by_id: int):
        """Уведомить владельца ревизии об обновлении заполнения"""
        updater = db.query(User).filter(User.id == updated_by_id).first()
        if not updater or revision.requested_by_id == updated_by_id:
            return
        
        notification_data = {
            'user_id': revision.requested_by_id,
            'type': NotificationType.REVISION_UPDATED,
            'title': 'Заполнение ревизии обновлено',
            'message': f'Пользователь {updater.full_name} обновил заполнение ревизии #{revision.id}.',
            'data': {
                'revision_id': revision.id,
                'updated_by': updater.full_name,
                'updated_by_id': updater.id
            },
            'entity_type': 'revision',
            'entity_id': revision.id,
            'priority': 3
        }
        
        crud_notification.create(db, notification_in=notification_data, sender_id=updated_by_id)



crud_revision = CRUDRevision()