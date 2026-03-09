from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.notification import crud_notification
from app.schemas.notification import (
    NotificationResponse, NotificationUpdate, 
    NotificationSummaryResponse, NotificationStatus, NotificationType
)
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=List[NotificationResponse])
def get_notifications(
    skip: int = 0,
    limit: int = 50,
    status: Optional[NotificationStatus] = None,
    type: Optional[NotificationType] = None,
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить уведомления текущего пользователя"""
    notifications = crud_notification.get_user_notifications(
        db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        status=status,
        type=type,
        unread_only=unread_only
    )
    return notifications


@router.get("/summary", response_model=NotificationSummaryResponse)
def get_notifications_summary(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить сводку по уведомлениям"""
    summary = crud_notification.get_summary(db, current_user.id)
    return summary


@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить количество непрочитанных уведомлений"""
    count = crud_notification.get_unread_count(db, current_user.id)
    return {"unread_count": count}


@router.post("/{notification_id}/read")
def mark_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Пометить уведомление как прочитанное"""
    success = crud_notification.mark_as_read(
        db,
        notification_id=notification_id,
        user_id=current_user.id
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Уведомление не найдено")
    
    return {"message": "Уведомление помечено как прочитанное"}


@router.post("/read-all")
def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Пометить все уведомления как прочитанные"""
    success = crud_notification.mark_all_as_read(db, current_user.id)
    
    if not success:
        raise HTTPException(status_code=400, detail="Не удалось обновить уведомления")
    
    return {"message": "Все уведомления помечены как прочитанные"}


@router.post("/{notification_id}/archive")
def mark_as_archived(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Архивировать уведомление"""
    success = crud_notification.mark_as_archived(
        db,
        notification_id=notification_id,
        user_id=current_user.id
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Уведомление не найдено")
    
    return {"message": "Уведомление архивировано"}


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Удалить уведомление"""
    success = crud_notification.delete(
        db,
        notification_id=notification_id,
        user_id=current_user.id
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Уведомление не найдено")
    
    return {"message": "Уведомление удалено"}


@router.put("/{notification_id}")
def update_notification(
    notification_id: int,
    notification_update: NotificationUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Обновить статус уведомления"""
    notification = crud_notification.get(db, notification_id)
    if not notification or notification.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Уведомление не найдено")
    
    if notification_update.status:
        notification.status = notification_update.status
        if notification_update.status == NotificationStatus.READ:
            notification.read_at = datetime.now()
    
    db.commit()
    db.refresh(notification)
    
    return notification