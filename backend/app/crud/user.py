from sqlalchemy.orm import Session
from typing import Optional, List
from app.models.user import User, UserRole
from app.models.group import Group
from app.models.cluster import Cluster
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash, verify_password
import json


class CRUDUser:
    def get(self, db: Session, user_id: int) -> Optional[User]:
        user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
        if user:
            self._enrich_user_data(db, user)
        return user
    
    def get_by_username(self, db: Session, username: str) -> Optional[User]:
        user = db.query(User).filter(User.username == username, User.is_active == True).first()
        if user:
            self._enrich_user_data(db, user)
        return user
    
    def get_all(self, db: Session, skip: int = 0, limit: int = 100, role: Optional[UserRole] = None) -> List[User]:
        query = db.query(User).filter(User.is_active == True)
        
        if role:
            query = query.filter(User.role == role)
        
        users = query.offset(skip).limit(limit).all()
        
        for user in users:
            self._enrich_user_data(db, user)
        
        return users
    
    def _enrich_user_data(self, db: Session, user: User):
        """Добавляем дополнительную информацию к пользователю"""
        if user.admin_clusters:
            if isinstance(user.admin_clusters, str):
                try:
                    parsed = json.loads(user.admin_clusters)
                    if isinstance(parsed, dict):
                        user.admin_clusters = []
                    else:
                        user.admin_clusters = parsed
                except json.JSONDecodeError:
                    user.admin_clusters = []
            elif isinstance(user.admin_clusters, dict):
                user.admin_clusters = []
        else:
            user.admin_clusters = []
        
        if user.group_id:
            group = db.query(Group).filter(Group.id == user.group_id).first()
            if group:
                user.group_name = group.name
        
        if user.cluster_id:
            cluster = db.query(Cluster).filter(Cluster.id == user.cluster_id).first()
            if cluster:
                user.cluster_name = cluster.name
        
        if user.mentor_id:
            mentor = db.query(User).filter(User.id == user.mentor_id).first()
            if mentor:
                user.mentor_name = mentor.full_name
        
        if user.senior_seller_id:
            senior_seller = db.query(User).filter(User.id == user.senior_seller_id).first()
            if senior_seller:
                user.senior_seller_name = senior_seller.full_name
        
        if user.admin_id:
            admin = db.query(User).filter(User.id == user.admin_id).first()
            if admin:
                user.admin_name = admin.full_name
        
        if user.role == UserRole.MENTOR:
            sellers_count = db.query(User).filter(
                User.mentor_id == user.id,
                User.is_active == True
            ).count()
            user.sellers_count = sellers_count
        
        elif user.role == UserRole.SENIOR_SELLER:
            # Группы в кусте
            groups_count = db.query(Group).filter(
                Group.senior_seller_id == user.id,
                Group.is_active == True
            ).count()
            user.groups_count = groups_count
            
            # Продавцы в кусте
            sellers_count = db.query(User).filter(
                User.senior_seller_id == user.id,
                User.is_active == True
            ).count()
            user.sellers_count = sellers_count
    
    def create(self, db: Session, user_in: UserCreate, created_by: Optional[int] = None) -> Optional[User]:
        existing_user = self.get_by_username(db, user_in.username)
        if existing_user:
            raise ValueError("User with this username already exists")
        
        # Только для продавца проверяем, если указан наставник
        if user_in.role == UserRole.SELLER and user_in.mentor_id:
            mentor = db.query(User).filter(
                User.id == user_in.mentor_id,
                User.role == UserRole.MENTOR,
                User.is_active == True
            ).first()
            if not mentor:
                raise ValueError(f"Mentor with ID {user_in.mentor_id} not found or not a MENTOR")
        
        # Для наставника: если указан куст, проверяем его существование
        if user_in.role == UserRole.MENTOR and user_in.cluster_id:
            cluster = db.query(Cluster).filter(
                Cluster.id == user_in.cluster_id,
                Cluster.is_active == True
            ).first()
            if not cluster:
                raise ValueError(f"Cluster with ID {user_in.cluster_id} not found")
        
        # Для старшего продавца: если указан куст, проверяем его существование
        if user_in.role == UserRole.SENIOR_SELLER and user_in.cluster_id:
            cluster = db.query(Cluster).filter(
                Cluster.id == user_in.cluster_id,
                Cluster.is_active == True
            ).first()
            if not cluster:
                raise ValueError(f"Cluster with ID {user_in.cluster_id} not found")
        
        admin_clusters_str = None
        if user_in.admin_clusters:
            if isinstance(user_in.admin_clusters, list):
                admin_clusters_str = json.dumps(user_in.admin_clusters)
        
        db_user = User(
            username=user_in.username,
            password_hash=get_password_hash(user_in.password),
            full_name=user_in.full_name,
            telegram=user_in.telegram,
            city=user_in.city,
            role=user_in.role,
            cluster_id=user_in.cluster_id,
            group_id=user_in.group_id,
            mentor_id=user_in.mentor_id,
            senior_seller_id=user_in.senior_seller_id,
            admin_clusters=admin_clusters_str,
            is_active=True
        )
        
        try:
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
            
            self._enrich_user_data(db, db_user)
            
            return db_user
        except Exception as e:
            db.rollback()
            raise ValueError(f"Failed to create user: {str(e)}")
    
    def update(self, db: Session, user_id: int, user_in: UserUpdate) -> Optional[User]:
        db_user = self.get(db, user_id)
        if not db_user:
            return None
        
        update_data = user_in.dict(exclude_unset=True)
        
        if "role" in update_data and update_data["role"] != db_user.role:
            new_role = update_data["role"]
            
            if db_user.role == UserRole.MENTOR:
                group = db.query(Group).filter(
                    Group.mentor_id == user_id,
                    Group.is_active == True
                ).first()
                if group:
                    raise ValueError("Cannot change role of a mentor who manages a group")
            
            elif db_user.role == UserRole.SENIOR_SELLER:
                cluster = db.query(Cluster).filter(
                    Cluster.senior_seller_id == user_id,
                    Cluster.is_active == True
                ).first()
                if cluster:
                    raise ValueError("Cannot change role of a senior seller who manages a cluster")
        
        if "password" in update_data:
            update_data["password_hash"] = get_password_hash(update_data.pop("password"))
        
        if "admin_clusters" in update_data:
            admin_clusters = update_data.pop("admin_clusters")
            if admin_clusters is not None and isinstance(admin_clusters, list):
                update_data["admin_clusters"] = json.dumps(admin_clusters)
            else:
                update_data["admin_clusters"] = None
        
        for field, value in update_data.items():
            if field != "password": 
                setattr(db_user, field, value)
        
        try:
            db.commit()
            db.refresh(db_user)
            
            self._enrich_user_data(db, db_user)
            
            return db_user
        except Exception as e:
            db.rollback()
            raise ValueError(f"Failed to update user: {str(e)}")
    
    def delete(self, db: Session, user_id: int) -> bool:
        db_user = self.get(db, user_id)
        if not db_user:
            return False
        
        if db_user.role == UserRole.MENTOR:
            sellers_count = db.query(User).filter(
                User.mentor_id == user_id,
                User.is_active == True
            ).count()
            
            if sellers_count > 0:
                raise ValueError("Cannot delete mentor with active sellers. Reassign sellers first.")
            
            # Проверяем, нет ли групп у этого наставника
            groups_count = db.query(Group).filter(
                Group.mentor_id == user_id,
                Group.is_active == True
            ).count()
            
            if groups_count > 0:
                raise ValueError("Cannot delete mentor with active groups. Reassign groups first.")
        
        elif db_user.role == UserRole.SENIOR_SELLER:
            # Проверяем, нет ли кустов у этого старшего продавца
            clusters_count = db.query(Cluster).filter(
                Cluster.senior_seller_id == user_id,
                Cluster.is_active == True
            ).count()
            
            if clusters_count > 0:
                raise ValueError("Cannot delete senior seller with active clusters. Reassign clusters first.")
        
        db_user.is_active = False
        db.commit()
        return True
    
    def authenticate(self, db: Session, username: str, password: str) -> Optional[User]:
        user = self.get_by_username(db, username)
        if not user:
            return None
        if not verify_password(password, user.password_hash):
            return None
        return user
    
    def update_last_login(self, db: Session, user_id: int) -> Optional[User]:
        from datetime import datetime
        db_user = self.get(db, user_id)
        if not db_user:
            return None
        
        db_user.last_login = datetime.utcnow()
        db.commit()
        db.refresh(db_user)
        return db_user


crud_user = CRUDUser()