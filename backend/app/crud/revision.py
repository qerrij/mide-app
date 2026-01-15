from sqlalchemy.orm import Session, joinedload, aliased
from typing import List, Optional, Dict
from sqlalchemy import and_, or_, func, case
import json
from datetime import datetime
from app.models.revision import (
    Revision, RevisionDiscrepancy, RevisionFilling, RevisionFillingItem,
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
        return db.query(Revision)\
            .options(
                joinedload(Revision.requested_by),
                joinedload(Revision.target_user),
                joinedload(Revision.target_group),
                joinedload(Revision.target_cluster),
                joinedload(Revision.verified_by),
                joinedload(Revision.fillings).joinedload(RevisionFilling.user),
                joinedload(Revision.fillings).joinedload(RevisionFilling.items)
                .joinedload(RevisionFillingItem.product),
                joinedload(Revision.discrepancies).joinedload(RevisionDiscrepancy.product),
                joinedload(Revision.discrepancies).joinedload(RevisionDiscrepancy.user)
            )\
            .filter(Revision.id == revision_id)\
            .first()
    
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
                joinedload(Revision.target_cluster)
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
        
        return query.order_by(Revision.requested_at.desc())\
                   .offset(skip)\
                   .limit(limit)\
                   .all()
    
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
        
        query = db.query(Revision)\
            .options(
                joinedload(Revision.requested_by),
                joinedload(Revision.target_user),
                joinedload(Revision.target_group),
                joinedload(Revision.target_cluster)
            )
        
        # В зависимости от роли пользователя
        if user.role == UserRole.OWNER:
            # Владелец видит все
            pass
        elif user.role == UserRole.ADMIN:
            # Админ видит ревизии своих кустов и общие
            if user.admin_clusters:
                try:
                    admin_clusters = json.loads(user.admin_clusters)
                    query = query.filter(
                        or_(
                            Revision.type == RevisionType.GENERAL,
                            Revision.target_cluster_id.in_(admin_clusters),
                            Revision.type == RevisionType.CITY,
                            # Также ревизии, которые он запросил
                            Revision.requested_by_id == user_id
                        )
                    )
                except:
                    query = query.filter(Revision.requested_by_id == user_id)
            else:
                query = query.filter(Revision.requested_by_id == user_id)
        elif user.role == UserRole.SENIOR_SELLER:
            # Старший продавец видит ревизии своего куста и общие
            query = query.filter(
                or_(
                    Revision.type == RevisionType.GENERAL,
                    Revision.target_cluster_id == user.cluster_id,
                    Revision.type == RevisionType.CITY,
                    Revision.requested_by_id == user_id
                )
            )
        elif user.role == UserRole.MENTOR:
            # Ментор видит только ревизии своей группы
            query = query.filter(
                or_(
                    Revision.target_group_id == user.group_id,
                    Revision.requested_by_id == user_id
                )
            )
        elif user.role == UserRole.SELLER or user.role == UserRole.ACCOUNTANT:
            # Продавец и бухгалтер видят только свои ревизии или общие
            query = query.filter(
                or_(
                    Revision.target_user_id == user_id,
                    Revision.type == RevisionType.GENERAL,
                    Revision.target_group_id == user.group_id,
                    Revision.target_cluster_id == user.cluster_id,
                    Revision.target_city == user.city,
                    Revision.requested_by_id == user_id
                )
            )
        
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
    
    def _get_users_for_revision(self, db: Session, revision: Revision) -> List[User]:
        """Получить список пользователей для заполнения ревизии"""
        query = db.query(User).filter(User.is_active == True)
        
        if revision.type == RevisionType.USER and revision.target_user_id:
            query = query.filter(User.id == revision.target_user_id)
        
        elif revision.type == RevisionType.GROUP and revision.target_group_id:
            query = query.filter(User.group_id == revision.target_group_id)
        
        elif revision.type == RevisionType.CLUSTER and revision.target_cluster_id:
            query = query.filter(User.cluster_id == revision.target_cluster_id)
        
        elif revision.type == RevisionType.CITY and revision.target_city:
            query = query.filter(User.city == revision.target_city)
        
        elif revision.type == RevisionType.GENERAL:
            # Все кроме OWNER заполняют общие ревизии
            query = query.filter(User.role != UserRole.OWNER)
        
        # Исключаем владельца из заполнения
        query = query.filter(User.role != UserRole.OWNER)
        
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
        self._check_if_all_filled(db, revision)
        
        db.commit()
        db.refresh(filling)
        
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
    
    def _check_if_all_filled(self, db: Session, revision: Revision):
        """Проверить, все ли заполнили ревизию и обновить статус"""
        if revision.type == RevisionType.USER:
            # Для индивидуальной ревизии сразу отмечаем как заполненную
            revision.status = RevisionStatus.COMPLETED
            revision.completed_at = datetime.now()
        else:
            # Для групповой ревизии проверяем все заполнения
            users = self._get_users_for_revision(db, revision)
            total_users = len(users)
            
            filled_count = db.query(RevisionFilling)\
                .filter(
                    RevisionFilling.revision_id == revision.id,
                    RevisionFilling.is_completed == True
                )\
                .count()
            
            if filled_count == total_users:
                revision.status = RevisionStatus.COMPLETED
                revision.completed_at = datetime.now()
    
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
        
        # Находим и сохраняем расхождения
        self._find_and_save_discrepancies(db, revision)
        
        db.commit()
        db.refresh(revision)
        
        # Создаем уведомления о проверке
        self._create_verification_notifications(db, revision, verifier)
        
        return revision
    
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
        
        # OWNER не заполняет ревизии
        if user.role == UserRole.OWNER:
            return False
        
        # Проверяем доступ в зависимости от типа ревизии
        if revision.type == RevisionType.USER:
            return revision.target_user_id == user_id
        
        elif revision.type == RevisionType.GROUP:
            return user.group_id == revision.target_group_id
        
        elif revision.type == RevisionType.CLUSTER:
            return user.cluster_id == revision.target_cluster_id
        
        elif revision.type == RevisionType.CITY:
            return user.city == revision.target_city
        
        elif revision.type == RevisionType.GENERAL:
            # Все кроме OWNER могут заполнять общие ревизии
            return user.role != UserRole.OWNER
        
        return False
    
    def _can_verify_revision(self, db: Session, revision: Revision, user_id: int) -> bool:
        """Проверяет, может ли пользователь проверять ревизию"""
        # Только тот, кто запросил ревизию, может её проверить
        return revision.requested_by_id == user_id
    
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


crud_revision = CRUDRevision()