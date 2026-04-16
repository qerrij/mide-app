from sqlalchemy import Column, Integer, String, Float, Enum, DateTime, ForeignKey, Text, JSON, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.database import Base


class RevisionStatus(str, enum.Enum):
    """Статусы ревизии"""
    REQUESTED = "REQUESTED"      # Запрошена
    IN_PROGRESS = "IN_PROGRESS"  # В процессе (продавец заполняет)
    COMPLETED = "COMPLETED"      # Заполнена продавцом
    VERIFIED = "VERIFIED"        # Проверена руководителем
    REJECTED = "REJECTED"        # Отклонена
    REVISION_CANCELLED = "REVISION_CANCELLED"


class RevisionType(str, enum.Enum):
    """Типы ревизии"""
    USER = "USER"           # Ревизия конкретного пользователя
    GROUP = "GROUP"         # Ревизия группы
    CLUSTER = "CLUSTER"     # Ревизия куста
    CITY = "CITY"          # Ревизия города
    GENERAL = "GENERAL"    # Общая ревизия


class Revision(Base):
    __tablename__ = "revisions"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Кто запросил ревизию
    requested_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Для кого ревизия (может быть null для общих ревизий)
    target_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    target_group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)
    target_cluster_id = Column(Integer, ForeignKey("clusters.id"), nullable=True)
    target_city = Column(String, nullable=True)  # Для ревизии по городу
    # target_city_id = Column(Integer, ForeignKey("cities.id"), nullable=True)
    
    # Тип ревизии и статус
    type = Column(Enum(RevisionType), nullable=False)
    status = Column(Enum(RevisionStatus), nullable=False, default=RevisionStatus.REQUESTED)
    
    # Кто выполняет проверку (может быть null если еще не проверена)
    verified_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Фотографии ревизии
    photos = Column(JSON, nullable=False, default=[])  # Список путей к фото
    
    # Комментарии
    comment = Column(Text, nullable=True)  # Комментарий при запросе
    verification_comment = Column(Text, nullable=True)  # Комментарий при проверке
    
    # Даты
    requested_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)  # Когда заполнена
    verified_at = Column(DateTime(timezone=True), nullable=True)   # Когда проверена
    
    # Связи
    fillings = relationship("RevisionFilling", back_populates="revision", cascade="all, delete-orphan")
    requested_by = relationship("User", foreign_keys=[requested_by_id])
    target_user = relationship("User", foreign_keys=[target_user_id])
    target_group = relationship("Group", foreign_keys=[target_group_id])
    target_cluster = relationship("Cluster", foreign_keys=[target_cluster_id])
    verified_by = relationship("User", foreign_keys=[verified_by_id])
    editing_sessions = relationship("RevisionEditingSession", back_populates="revision", cascade="all, delete-orphan")
    # target_city_ref = relationship("City", foreign_keys=[target_city_id])
    
    
    # Детали ревизии (связь один-ко-многим)
    # items = relationship("RevisionItem", back_populates="revision", cascade="all, delete-orphan")
    discrepancies = relationship("RevisionDiscrepancy", back_populates="revision", cascade="all, delete-orphan")

    @property
    def is_being_edited(self) -> bool:
        """Проверяет, редактируется ли ревизия сейчас"""
        from datetime import datetime
        active_sessions = [s for s in self.editing_sessions if not s.is_expired()]
        return len(active_sessions) > 0
    
    @property
    def active_editors(self) -> list:
        """Возвращает список ID пользователей, которые сейчас редактируют"""
        from datetime import datetime
        return [s.user_id for s in self.editing_sessions if not s.is_expired()]
    
    def __repr__(self):
        return f"<Revision {self.id} ({self.type})>"




class RevisionDiscrepancy(Base):
    __tablename__ = "revision_discrepancies"
    
    id = Column(Integer, primary_key=True, index=True)
    revision_id = Column(Integer, ForeignKey("revisions.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # У кого расхождение
    expected_quantity = Column(Integer, nullable=False)  # Ожидаемое количество
    actual_quantity = Column(Integer, nullable=False)    # Фактическое количество по ревизии
    discrepancy = Column(Integer, nullable=False)        # Разница (факт - ожидание)
    
    # Тип расхождения
    is_positive = Column(Boolean, nullable=False)  # True если плюс, False если минус
    
    # Связи
    revision = relationship("Revision", back_populates="discrepancies")
    product = relationship("Product")
    user = relationship("User")
    
    def __repr__(self):
        return f"<RevisionDiscrepancy user:{self.user_id} product:{self.product_id} diff:{self.discrepancy}>"
    
class RevisionFilling(Base):
    """Заполнение ревизии конкретным пользователем"""
    __tablename__ = "revision_fillings"
    
    id = Column(Integer, primary_key=True, index=True)
    revision_id = Column(Integer, ForeignKey("revisions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(RevisionStatus), nullable=False, default=RevisionStatus.REQUESTED)
    filled_at = Column(DateTime(timezone=True), nullable=True)
    photos = Column(JSON, nullable=False, default=list)
    is_completed = Column(Boolean, default=False)
    
    # Новые поля
    updated_at = Column(DateTime(timezone=True), nullable=True)
    last_updated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Связи - ЯВНО УКАЗЫВАЕМ foreign_keys
    revision = relationship("Revision", back_populates="fillings")
    user = relationship("User", foreign_keys=[user_id])
    last_updated_by = relationship("User", foreign_keys=[last_updated_by_id])
    items = relationship("RevisionFillingItem", back_populates="filling", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<RevisionFilling rev:{self.revision_id} user:{self.user_id}>"


class RevisionFillingItem(Base):
    """Товары в заполнении ревизии конкретным пользователем"""
    __tablename__ = "revision_filling_items"
    
    id = Column(Integer, primary_key=True, index=True)
    filling_id = Column(Integer, ForeignKey("revision_fillings.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("product_categories.id"), nullable=False)
    quantity = Column(Integer, nullable=False)  # Фактическое количество по ревизии
    
    # Связи
    filling = relationship("RevisionFilling", back_populates="items")
    product = relationship("Product")
    category = relationship("ProductCategory")
    
    def __repr__(self):
        return f"<RevisionFillingItem filling:{self.filling_id} product:{self.product_id}: {self.quantity}>"


class RevisionEditingSession(Base):
    """Сессия редактирования ревизии"""
    __tablename__ = "revision_editing_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    revision_id = Column(Integer, ForeignKey("revisions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    last_activity_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    
    # Связи
    revision = relationship("Revision", back_populates="editing_sessions")
    user = relationship("User")
    
    def is_expired(self) -> bool:
        """Проверить, истекла ли сессия"""
        from datetime import datetime
        return datetime.now(self.expires_at.tzinfo) > self.expires_at
