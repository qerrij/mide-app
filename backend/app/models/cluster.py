from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Cluster(Base):
    __tablename__ = "clusters"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    senior_seller_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    description = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    senior_seller = relationship(
        "User", 
        foreign_keys=[senior_seller_id],
        backref="managed_clusters"
    )
    
    admin = relationship(
        "User", 
        foreign_keys=[admin_id],
        backref="admin_of_clusters"
    )
    
    # Пользователи в кусте
    users_in_cluster = relationship(
        "User", 
        foreign_keys="User.cluster_id",
        back_populates="cluster"
    )
    
    # Группы в кусте
    groups = relationship(
        "Group", 
        foreign_keys="Group.cluster_id",
        back_populates="cluster"
    )
    
    def __repr__(self):
        return f"<Cluster {self.name}>"