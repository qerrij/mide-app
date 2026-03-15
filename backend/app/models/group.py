from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    mentor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    cluster_id = Column(Integer, ForeignKey("clusters.id"), nullable=True)
    senior_seller_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    description = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    mentor = relationship(
        "User", 
        foreign_keys=[mentor_id],
        backref="managed_groups"
    )
    
    cluster = relationship(
        "Cluster", 
        foreign_keys=[cluster_id],
        back_populates="groups"
    )
    
    senior_seller_rel = relationship(
        "User", 
        foreign_keys=[senior_seller_id]
    )
    
    # Члены группы
    members = relationship(
        "User", 
        foreign_keys="User.group_id",
        back_populates="group"
    )
    
    def __repr__(self):
        return f"<Group {self.name}>"