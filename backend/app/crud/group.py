from sqlalchemy.orm import Session
from typing import Optional, List
from app.models.group import Group
from app.models.user import User
from app.schemas.group import GroupCreate, GroupUpdate


class CRUDGroup:
    def get(self, db: Session, group_id: int) -> Optional[Group]:
        return db.query(Group).filter(Group.id == group_id, Group.is_active == True).first()
    
    def get_by_mentor(self, db: Session, mentor_id: int) -> Optional[Group]:
        return db.query(Group).filter(
            Group.mentor_id == mentor_id, 
            Group.is_active == True
        ).first()
    
    def get_by_cluster(self, db: Session, cluster_id: int, skip: int = 0, limit: int = 100) -> List[Group]:
        return db.query(Group).filter(
            Group.cluster_id == cluster_id,
            Group.is_active == True
        ).offset(skip).limit(limit).all()
    
    def get_all(self, db: Session, skip: int = 0, limit: int = 100) -> List[Group]:
        groups = db.query(Group).filter(Group.is_active == True).offset(skip).limit(limit).all()
        
        for group in groups:
            seller_count = db.query(User).filter(
                User.group_id == group.id,
                User.role == "SELLER",
                User.is_active == True
            ).count()
            group.seller_count = seller_count
        
        return groups
    
    def create(self, db: Session, group_in: GroupCreate) -> Group:
        # Проверяем, не является ли наставник уже руководителем другой группы
        existing_group = self.get_by_mentor(db, group_in.mentor_id)
        if existing_group:
            raise ValueError(f"Mentor ID {group_in.mentor_id} already manages a group")
        
        # Проверяем, что наставник существует и имеет правильную роль
        mentor = db.query(User).filter(
            User.id == group_in.mentor_id,
            User.role == "MENTOR",
            User.is_active == True
        ).first()
        
        if not mentor:
            raise ValueError(f"Mentor with ID {group_in.mentor_id} not found or not a MENTOR")
        
        # Если указан старший продавец, проверяем его
        if group_in.senior_seller_id:
            senior_seller = db.query(User).filter(
                User.id == group_in.senior_seller_id,
                User.role == "SENIOR_SELLER",
                User.is_active == True
            ).first()
            
            if not senior_seller:
                raise ValueError(f"Senior seller with ID {group_in.senior_seller_id} not found or not a SENIOR_SELLER")
        
        db_group = Group(**group_in.dict())
        db_group.seller_count = 0
        
        try:
            db.add(db_group)
            db.commit()
            db.refresh(db_group)
            
            # ВАЖНО: Обновляем group_id у наставника
            mentor.group_id = db_group.id
            db.commit()
            db.refresh(mentor)
            
            # Обновляем cluster_id если указан
            if db_group.cluster_id:
                mentor.cluster_id = db_group.cluster_id
                db.commit()
            
            return db_group
        except Exception as e:
            db.rollback()
            raise ValueError(f"Failed to create group: {str(e)}")
        
    def update(self, db: Session, group_id: int, group_in: GroupUpdate) -> Optional[Group]:
        db_group = self.get(db, group_id)
        if not db_group:
            return None
        
        update_data = group_in.dict(exclude_unset=True)
        
        # Если меняется наставник
        if "mentor_id" in update_data:
            new_mentor_id = update_data["mentor_id"]
            
            # Проверяем, не является ли новый наставник уже руководителем другой группы
            existing_group = self.get_by_mentor(db, new_mentor_id)
            if existing_group and existing_group.id != group_id:
                raise ValueError(f"Mentor ID {new_mentor_id} already manages a group")
            
            # Проверяем, что новый наставник существует и имеет правильную роль
            new_mentor = db.query(User).filter(
                User.id == new_mentor_id,
                User.role == "MENTOR",
                User.is_active == True
            ).first()
            
            if not new_mentor:
                raise ValueError(f"Mentor with ID {new_mentor_id} not found or not a MENTOR")
        
        for field, value in update_data.items():
            setattr(db_group, field, value)
        
        try:
            db.commit()
            db.refresh(db_group)
            return db_group
        except Exception as e:
            db.rollback()
            raise ValueError(f"Failed to update group: {str(e)}")
    
    def delete(self, db: Session, group_id: int) -> bool:
        db_group = self.get(db, group_id)
        if not db_group:
            return False
        
        # Проверяем, нет ли продавцов в группе
        sellers_count = db.query(User).filter(
            User.group_id == group_id,
            User.is_active == True
        ).count()
        
        if sellers_count > 0:
            raise ValueError("Cannot delete group with active sellers. Reassign sellers first.")
        
        db_group.is_active = False
        
        # Освобождаем наставника от группы
        mentor = db.query(User).get(db_group.mentor_id)
        if mentor:
            mentor.group_id = None
        
        db.commit()
        return True
    
    def add_seller(self, db: Session, group_id: int, seller_id: int) -> bool:
        group = self.get(db, group_id)
        if not group:
            return False
        
        seller = db.query(User).filter(
            User.id == seller_id,
            User.role == "SELLER",
            User.is_active == True
        ).first()
        
        if not seller:
            return False
        
        # Проверяем, не состоит ли продавец уже в другой группе
        if seller.group_id and seller.group_id != group_id:
            raise ValueError(f"Seller ID {seller_id} is already in another group")
        
        seller.group_id = group_id
        seller.mentor_id = group.mentor_id
        seller.cluster_id = group.cluster_id
        seller.senior_seller_id = group.senior_seller_id
        
        db.commit()
        return True
    
    def remove_seller(self, db: Session, group_id: int, seller_id: int) -> bool:
        seller = db.query(User).filter(
            User.id == seller_id,
            User.group_id == group_id,
            User.is_active == True
        ).first()
        
        if not seller:
            return False
        
        seller.group_id = None
        seller.mentor_id = None
        seller.cluster_id = None
        seller.senior_seller_id = None
        
        db.commit()
        return True


crud_group = CRUDGroup()