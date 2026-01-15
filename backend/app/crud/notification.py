from sqlalchemy.orm import Session, joinedload
from typing import List, Optional, Dict, Any
from sqlalchemy import desc, func
from datetime import datetime
from app.models.notification import Notification, NotificationStatus, NotificationType, NotificationSummary
from app.models.user import User


class CRUDNotification:
    def get(self, db: Session, notification_id: int) -> Optional[Notification]:
        return db.query(Notification)\
            .options(joinedload(Notification.sender))\
            .filter(Notification.id == notification_id)\
            .first()
    
    def get_user_notifications(
        self, 
        db: Session, 
        user_id: int,
        skip: int = 0,
        limit: int = 50,
        status: Optional[NotificationStatus] = None,
        type: Optional[NotificationType] = None,
        unread_only: bool = False
    ) -> List[Notification]:
        """Получить уведомления пользователя"""
        query = db.query(Notification)\
            .options(joinedload(Notification.sender))\
            .filter(Notification.user_id == user_id)
        
        if status:
            query = query.filter(Notification.status == status)
        
        if type:
            query = query.filter(Notification.type == type)
        
        if unread_only:
            query = query.filter(Notification.status == NotificationStatus.UNREAD)
        
        return query.order_by(desc(Notification.created_at))\
                   .offset(skip)\
                   .limit(limit)\
                   .all()
    
    def get_unread_count(self, db: Session, user_id: int) -> int:
        """Получить количество непрочитанных уведомлений"""
        return db.query(Notification)\
            .filter(
                Notification.user_id == user_id,
                Notification.status == NotificationStatus.UNREAD
            )\
            .count()
    
    def create(
        self, 
        db: Session, 
        *, 
        notification_in: Dict[str, Any],
        sender_id: Optional[int] = None
    ) -> Notification:
        """Создать уведомление"""
        
        db_notification = Notification(
            user_id=notification_in['user_id'],
            type=notification_in['type'],
            title=notification_in['title'],
            message=notification_in['message'],
            data=notification_in.get('data'),
            entity_type=notification_in.get('entity_type'),
            entity_id=notification_in.get('entity_id'),
            sender_id=sender_id,
            priority=notification_in.get('priority', 3),
            status=NotificationStatus.UNREAD
        )
        
        db.add(db_notification)
        db.commit()
        db.refresh(db_notification)
        
        # Обновляем сводку
        self._update_summary(db, notification_in['user_id'])
        
        return db_notification
    
    def create_multiple(
        self,
        db: Session,
        *,
        notifications_data: List[Dict[str, Any]],
        sender_id: Optional[int] = None
    ) -> List[Notification]:
        """Создать несколько уведомлений"""
        notifications = []
        user_ids = set()
        
        for data in notifications_data:
            notification = Notification(
                user_id=data['user_id'],
                type=data['type'],
                title=data['title'],
                message=data['message'],
                data=data.get('data'),
                entity_type=data.get('entity_type'),
                entity_id=data.get('entity_id'),
                sender_id=sender_id,
                priority=data.get('priority', 3),
                status=NotificationStatus.UNREAD
            )
            notifications.append(notification)
            user_ids.add(data['user_id'])
            db.add(notification)
        
        db.commit()
        
        # Обновляем сводки для всех пользователей
        for user_id in user_ids:
            self._update_summary(db, user_id)
        
        return notifications
    
    def mark_as_read(
        self, 
        db: Session, 
        notification_id: int,
        user_id: int
    ) -> bool:
        """Пометить уведомление как прочитанное"""
        notification = db.query(Notification)\
            .filter(
                Notification.id == notification_id,
                Notification.user_id == user_id
            )\
            .first()
        
        if not notification:
            return False
        
        notification.status = NotificationStatus.READ
        notification.read_at = datetime.now()
        db.commit()
        
        # Обновляем сводку
        self._update_summary(db, user_id)
        
        return True
    
    def mark_all_as_read(
        self, 
        db: Session, 
        user_id: int
    ) -> bool:
        """Пометить все уведомления пользователя как прочитанные"""
        notifications = db.query(Notification)\
            .filter(
                Notification.user_id == user_id,
                Notification.status == NotificationStatus.UNREAD
            )\
            .all()
        
        for notification in notifications:
            notification.status = NotificationStatus.READ
            notification.read_at = datetime.now()
        
        db.commit()
        
        # Обновляем сводку
        self._update_summary(db, user_id)
        
        return True
    
    def mark_as_archived(
        self, 
        db: Session, 
        notification_id: int,
        user_id: int
    ) -> bool:
        """Архивировать уведомление"""
        notification = db.query(Notification)\
            .filter(
                Notification.id == notification_id,
                Notification.user_id == user_id
            )\
            .first()
        
        if not notification:
            return False
        
        notification.status = NotificationStatus.ARCHIVED
        db.commit()
        
        # Обновляем сводку
        self._update_summary(db, user_id)
        
        return True
    
    def delete(
        self, 
        db: Session, 
        notification_id: int,
        user_id: int
    ) -> bool:
        """Удалить уведомление"""
        notification = db.query(Notification)\
            .filter(
                Notification.id == notification_id,
                Notification.user_id == user_id
            )\
            .first()
        
        if not notification:
            return False
        
        db.delete(notification)
        db.commit()
        
        # Обновляем сводку
        self._update_summary(db, user_id)
        
        return True
    
    def get_summary(self, db: Session, user_id: int) -> Dict[str, Any]:
        """Получить сводку по уведомлениям"""
        unread_count = self.get_unread_count(db, user_id)
        
        # Последнее уведомление
        last_notification = db.query(Notification)\
            .filter(Notification.user_id == user_id)\
            .order_by(desc(Notification.created_at))\
            .first()
        
        # Последние 5 непрочитанных уведомлений
        recent_notifications = self.get_user_notifications(
            db, user_id, skip=0, limit=5, unread_only=True
        )
        
        return {
            "unread_count": unread_count,
            "last_notification_at": last_notification.created_at if last_notification else None,
            "recent_notifications": recent_notifications
        }
    
    def _update_summary(self, db: Session, user_id: int):
        """Обновить сводку уведомлений"""
        summary = db.query(NotificationSummary)\
            .filter(NotificationSummary.user_id == user_id)\
            .first()
        
        if not summary:
            summary = NotificationSummary(user_id=user_id)
            db.add(summary)
        
        summary.unread_count = self.get_unread_count(db, user_id)
        
        # Последнее уведомление
        last_notification = db.query(Notification)\
            .filter(Notification.user_id == user_id)\
            .order_by(desc(Notification.created_at))\
            .first()
        
        if last_notification:
            summary.last_notification_at = last_notification.created_at
        
        db.commit()


crud_notification = CRUDNotification()