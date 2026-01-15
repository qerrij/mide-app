from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey, Text, Boolean, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.database import Base


class NotificationType(str, enum.Enum):
    """Типы уведомлений"""
    REVISION_REQUEST = "REVISION_REQUEST"      # Запрос на ревизию
    REVISION_COMPLETED = "REVISION_COMPLETED"  # Ревизия заполнена
    REVISION_VERIFIED = "REVISION_VERIFIED"    # Ревизия проверена
    REPORT_SUBMITTED = "REPORT_SUBMITTED"      # Отчет отправлен
    REPORT_APPROVED = "REPORT_APPROVED"        # Отчет утвержден
    REPORT_REJECTED = "REPORT_REJECTED"        # Отчет отклонен
    REPORT_ACCOUNTANT = "REPORT_ACCOUNTANT"    # Отчет на проверке бухгалтера
    INVENTORY_LOW = "INVENTORY_LOW"            # Низкий остаток
    SYSTEM_MESSAGE = "SYSTEM_MESSAGE"          # Системное сообщение
    OTHER = "OTHER"                            # Прочее


class NotificationStatus(str, enum.Enum):
    """Статусы уведомлений"""
    UNREAD = "UNREAD"      # Не прочитано
    READ = "READ"          # Прочитано
    ARCHIVED = "ARCHIVED"  # Архивировано


class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Кому уведомление
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Тип и статус
    type = Column(Enum(NotificationType), nullable=False)
    status = Column(Enum(NotificationStatus), nullable=False, default=NotificationStatus.UNREAD)
    
    # Заголовок и сообщение
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    
    # Дополнительные данные (JSON)
    data = Column(JSON, nullable=True)
    
    # Ссылка на связанную сущность
    entity_type = Column(String(50), nullable=True)  # 'revision', 'report', 'inventory', etc.
    entity_id = Column(Integer, nullable=True)
    
    # Кто отправил (может быть null для системных уведомлений)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Важность (1-5, где 5 - самая важная)
    priority = Column(Integer, default=3, nullable=False)
    
    # Время создания и прочтения
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    read_at = Column(DateTime(timezone=True), nullable=True)
    
    # Связи
    user = relationship("User", foreign_keys=[user_id], backref="notifications")
    sender = relationship("User", foreign_keys=[sender_id])
    
    def __repr__(self):
        return f"<Notification {self.id}: {self.title} for user:{self.user_id}>"


# Для быстрого доступа к последним уведомлениям можно создать view или индекс
class NotificationSummary(Base):
    __tablename__ = "notification_summary"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False)
    unread_count = Column(Integer, default=0)
    last_notification_at = Column(DateTime(timezone=True))
    
    __table_args__ = {'extend_existing': True}