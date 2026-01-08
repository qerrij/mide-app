from sqlalchemy.orm import Session
from typing import Optional, List
from app.models.cluster import Cluster
from app.models.user import User
from app.models.group import Group
from app.schemas.cluster import ClusterCreate, ClusterUpdate
import json


class CRUDCluster:
    def get(self, db: Session, cluster_id: int) -> Optional[Cluster]:
        return db.query(Cluster).filter(Cluster.id == cluster_id, Cluster.is_active == True).first()
    
    def get_by_senior_seller(self, db: Session, senior_seller_id: int) -> Optional[Cluster]:
        return db.query(Cluster).filter(
            Cluster.senior_seller_id == senior_seller_id,
            Cluster.is_active == True
        ).first()
    
    def get_all(self, db: Session, skip: int = 0, limit: int = 100) -> List[Cluster]:
        clusters = db.query(Cluster).filter(Cluster.is_active == True).offset(skip).limit(limit).all()
        
        # Добавляем статистику для каждого кластера
        for cluster in clusters:
            # Количество групп
            group_count = db.query(Group).filter(
                Group.cluster_id == cluster.id,
                Group.is_active == True
            ).count()
            cluster.group_count = group_count
            
            # Количество продавцов
            seller_count = db.query(User).filter(
                User.cluster_id == cluster.id,
                User.is_active == True
            ).count()
            cluster.seller_count = seller_count
        
        return clusters
    
    def create(self, db: Session, cluster_in: ClusterCreate) -> Cluster:
        # Проверяем, не является ли старший продавец уже руководителем другого куста
        existing_cluster = self.get_by_senior_seller(db, cluster_in.senior_seller_id)
        if existing_cluster:
            raise ValueError(f"Senior seller ID {cluster_in.senior_seller_id} already manages a cluster")
        
        # Проверяем, что старший продавец существует и имеет правильную роль
        senior_seller = db.query(User).filter(
            User.id == cluster_in.senior_seller_id,
            User.role == "SENIOR_SELLER",
            User.is_active == True
        ).first()
        
        if not senior_seller:
            raise ValueError(f"Senior seller with ID {cluster_in.senior_seller_id} not found or not a SENIOR_SELLER")
        
        # Если указан администратор, проверяем его
        if cluster_in.admin_id:
            admin = db.query(User).filter(
                User.id == cluster_in.admin_id,
                User.role == "ADMIN",
                User.is_active == True
            ).first()
            
            if not admin:
                raise ValueError(f"Admin with ID {cluster_in.admin_id} not found or not an ADMIN")
            
            # Обновляем admin_clusters у администратора
            admin_clusters = []
            if admin.admin_clusters and isinstance(admin.admin_clusters, str):
                try:
                    admin_clusters = json.loads(admin.admin_clusters)
                except json.JSONDecodeError:
                    admin_clusters = []
        
        db_cluster = Cluster(**cluster_in.dict())
        
        try:
            db.add(db_cluster)
            db.commit()
            db.refresh(db_cluster)
            
            # Обновляем cluster_id у старшего продавца
            senior_seller.cluster_id = db_cluster.id
            db.commit()
            
            # Обновляем admin_clusters если есть администратор
            if cluster_in.admin_id and admin:
                if db_cluster.id not in admin_clusters:
                    admin_clusters.append(db_cluster.id)
                    admin.admin_clusters = json.dumps(admin_clusters)
                    db.commit()
            
            return db_cluster
        except Exception as e:
            db.rollback()
            raise ValueError(f"Failed to create cluster: {str(e)}")
    
    def update(self, db: Session, cluster_id: int, cluster_in: ClusterUpdate) -> Optional[Cluster]:
        db_cluster = self.get(db, cluster_id)
        if not db_cluster:
            return None
        
        update_data = cluster_in.dict(exclude_unset=True)
        
        # Если меняется старший продавец
        if "senior_seller_id" in update_data:
            new_senior_seller_id = update_data["senior_seller_id"]
            
            # Проверяем, не является ли новый старший продавец уже руководителем другого куста
            existing_cluster = self.get_by_senior_seller(db, new_senior_seller_id)
            if existing_cluster and existing_cluster.id != cluster_id:
                raise ValueError(f"Senior seller ID {new_senior_seller_id} already manages a cluster")
            
            # Проверяем, что новый старший продавец существует и имеет правильную роль
            new_senior_seller = db.query(User).filter(
                User.id == new_senior_seller_id,
                User.role == "SENIOR_SELLER",
                User.is_active == True
            ).first()
            
            if not new_senior_seller:
                raise ValueError(f"Senior seller with ID {new_senior_seller_id} not found or not a SENIOR_SELLER")
        
        # Если меняется администратор
        old_admin_id = db_cluster.admin_id
        new_admin_id = update_data.get("admin_id")
        
        for field, value in update_data.items():
            setattr(db_cluster, field, value)
        
        try:
            db.commit()
            db.refresh(db_cluster)
            
            # Обновляем admin_clusters если меняется администратор
            if new_admin_id != old_admin_id:
                # Удаляем из старого администратора
                if old_admin_id:
                    old_admin = db.query(User).get(old_admin_id)
                    if old_admin and old_admin.admin_clusters:
                        try:
                            admin_clusters = json.loads(old_admin.admin_clusters)
                            if cluster_id in admin_clusters:
                                admin_clusters.remove(cluster_id)
                                old_admin.admin_clusters = json.dumps(admin_clusters)
                        except:
                            pass
                
                # Добавляем к новому администратору
                if new_admin_id:
                    new_admin = db.query(User).get(new_admin_id)
                    if new_admin:
                        admin_clusters = []
                        if new_admin.admin_clusters and isinstance(new_admin.admin_clusters, str):
                            try:
                                admin_clusters = json.loads(new_admin.admin_clusters)
                            except json.JSONDecodeError:
                                admin_clusters = []
                        
                        if cluster_id not in admin_clusters:
                            admin_clusters.append(cluster_id)
                            new_admin.admin_clusters = json.dumps(admin_clusters)
                
                db.commit()
            
            return db_cluster
        except Exception as e:
            db.rollback()
            raise ValueError(f"Failed to update cluster: {str(e)}")
    
    def delete(self, db: Session, cluster_id: int) -> bool:
        db_cluster = self.get(db, cluster_id)
        if not db_cluster:
            return False
        
        # Проверяем, нет ли групп в кусте
        groups_count = db.query(Group).filter(
            Group.cluster_id == cluster_id,
            Group.is_active == True
        ).count()
        
        if groups_count > 0:
            raise ValueError("Cannot delete cluster with active groups. Reassign groups first.")
        
        # Проверяем, нет ли пользователей в кусте
        users_count = db.query(User).filter(
            User.cluster_id == cluster_id,
            User.is_active == True
        ).count()
        
        if users_count > 0:
            raise ValueError("Cannot delete cluster with active users. Reassign users first.")
        
        db_cluster.is_active = False
        
        # Освобождаем старшего продавца
        senior_seller = db.query(User).get(db_cluster.senior_seller_id)
        if senior_seller:
            senior_seller.cluster_id = None
        
        # Удаляем из admin_clusters администратора
        if db_cluster.admin_id:
            admin = db.query(User).get(db_cluster.admin_id)
            if admin and admin.admin_clusters:
                try:
                    admin_clusters = json.loads(admin.admin_clusters)
                    if cluster_id in admin_clusters:
                        admin_clusters.remove(cluster_id)
                        admin.admin_clusters = json.dumps(admin_clusters)
                except:
                    pass
        
        db.commit()
        return True
    
    def add_group(self, db: Session, cluster_id: int, group_id: int) -> bool:
        cluster = self.get(db, cluster_id)
        if not cluster:
            return False
        
        group = db.query(Group).filter(
            Group.id == group_id,
            Group.is_active == True
        ).first()
        
        if not group:
            return False
        
        # Обновляем группу
        group.cluster_id = cluster_id
        group.senior_seller_id = cluster.senior_seller_id
        
        # Обновляем наставника группы
        mentor = db.query(User).get(group.mentor_id)
        if mentor:
            mentor.cluster_id = cluster_id
            mentor.senior_seller_id = cluster.senior_seller_id
        
        # Обновляем всех продавцов группы
        sellers = db.query(User).filter(
            User.group_id == group_id,
            User.is_active == True
        ).all()
        
        for seller in sellers:
            seller.cluster_id = cluster_id
            seller.senior_seller_id = cluster.senior_seller_id
        
        db.commit()
        return True
    
    def remove_group(self, db: Session, cluster_id: int, group_id: int) -> bool:
        group = db.query(Group).filter(
            Group.id == group_id,
            Group.cluster_id == cluster_id,
            Group.is_active == True
        ).first()
        
        if not group:
            return False
        
        group.cluster_id = None
        group.senior_seller_id = None
        
        # Обновляем наставника
        mentor = db.query(User).get(group.mentor_id)
        if mentor:
            mentor.cluster_id = None
            mentor.senior_seller_id = None
        
        # Обновляем продавцов
        sellers = db.query(User).filter(
            User.group_id == group_id,
            User.is_active == True
        ).all()
        
        for seller in sellers:
            seller.cluster_id = None
            seller.senior_seller_id = None
        
        db.commit()
        return True


crud_cluster = CRUDCluster()