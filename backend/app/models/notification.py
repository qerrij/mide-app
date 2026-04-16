from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey, Text, Boolean, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.database import Base


class NotificationType(str, enum.Enum):
    """Типы уведомлений"""
    # Ревизии
    REVISION_REQUEST = "REVISION_REQUEST"      # Запрос на ревизию
    REVISION_COMPLETED = "REVISION_COMPLETED"  # Ревизия заполнена
    REVISION_VERIFIED = "REVISION_VERIFIED"    # Ревизия проверена
    REVISION_CANCELLED = "REVISION_CANCELLED"
    REVISION_UPDATED = "REVISION_UPDATED"

    # Отчеты
    REPORT_SUBMITTED = "REPORT_SUBMITTED"      # Отчет отправлен
    REPORT_APPROVED = "REPORT_APPROVED"        # Отчет утвержден
    REPORT_REJECTED = "REPORT_REJECTED"        # Отчет отклонен
    REPORT_ACCOUNTANT = "REPORT_ACCOUNTANT"    # Отчет на проверке бухгалтера

    INVENTORY_LOW = "INVENTORY_LOW"            # Низкий остаток
    SYSTEM_MESSAGE = "SYSTEM_MESSAGE"          # Системное сообщение
    
    # Типы для перемещений (добавлены новые)
    TRANSFER_REQUEST = "TRANSFER_REQUEST"           # Запрос на подтверждение перемещения
    TRANSFER_APPROVED = "TRANSFER_APPROVED"         # Перемещение подтверждено
    TRANSFER_IN_TRANSIT = "TRANSFER_IN_TRANSIT"     # Товар в пути
    TRANSFER_DISCREPANCY = "TRANSFER_DISCREPANCY"   # Обнаружены расхождения
    TRANSFER_COMPLETED = "TRANSFER_COMPLETED"       # Перемещение завершено
    TRANSFER_REJECTED = "TRANSFER_REJECTED"         # Перемещение отклонено
    TRANSFER_MANAGER_REQUEST = "TRANSFER_MANAGER_REQUEST"  # Запрос от руководителя
    TRANSFER_STATUS = "TRANSFER_STATUS"             # Изменение статуса перемещения

    # Браки
    REJECTION_REQUEST = "REJECTION_REQUEST"      # Запрос на брак
    REJECTION_APPROVED = "REJECTION_APPROVED"    # Брак утвержден
    REJECTION_REJECTED = "REJECTION_REJECTED"    # Брак отклонен
    
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