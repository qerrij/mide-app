from sqlalchemy import Column, Integer, String, DateTime, Enum, Boolean, ForeignKey, Float, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.database import Base


class UserRole(str, enum.Enum):
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    SENIOR_SELLER = "SENIOR_SELLER"
    MENTOR = "MENTOR"
    SELLER = "SELLER"
    ACCOUNTANT = "ACCOUNTANT"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    telegram = Column(String, nullable=True)
    city = Column(String, nullable=True)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.SELLER)
    rate = Column(Float, nullable=True, default=0.0)
    
    # Связи с группами и кустами
    cluster_id = Column(Integer, ForeignKey("clusters.id"), nullable=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)
    
    # Внешние ключи для руководителей
    mentor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    senior_seller_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Для администраторов - список кустов 
    admin_clusters = Column(Text, nullable=True)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # Используем строки вместо импортов для избежания циклических зависимостей
    cluster = relationship(
        "Cluster", 
        foreign_keys=[cluster_id],
        back_populates="users_in_cluster"
    )
    
    group = relationship(
        "Group", 
        foreign_keys=[group_id],
        back_populates="members"
    )
    
    mentor = relationship(
        "User", 
        foreign_keys=[mentor_id],
        remote_side=[id],
        backref="mentored_sellers"
    )
    
    senior_seller = relationship(
        "User", 
        foreign_keys=[senior_seller_id],
        remote_side=[id],
        backref="sellers_under_senior"
    )
    
    admin = relationship(
        "User", 
        foreign_keys=[admin_id],
        remote_side=[id],
        backref="administered_users"
    )

    # Инвентарь пользователя
    inventory = relationship(
        "UserInventory",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    
    def __repr__(self):
        return f"<User {self.username} ({self.role.value})>"