from sqlalchemy.orm import Session, joinedload
from typing import List, Optional, Dict, Any, Set
from app.models.user import User, UserRole
from app.models.group import Group
from app.models.cluster import Cluster
from app.models.report import Report
import json


class CRUDAccountantAssignment:
    
    def get_accountant_assignments(self, db: Session, accountant_id: int) -> Set[int]:
        """Получить множество ID пользователей, привязанных к бухгалтеру"""
        accountant = db.query(User).filter(
            User.id == accountant_id,
            User.role == UserRole.ACCOUNTANT,
            User.is_active == True
        ).first()
        
        if not accountant or not accountant.accountant_user_ids:
            return set()
        
        try:
            return set(json.loads(accountant.accountant_user_ids))
        except:
            return set()
    
    def get_all_assigned_users(self, db: Session, exclude_accountant_id: Optional[int] = None) -> Set[int]:
        """Получить множество всех пользователей, привязанных к любым бухгалтерам"""
        query = db.query(User).filter(
            User.role == UserRole.ACCOUNTANT,
            User.is_active == True
        )
        
        if exclude_accountant_id:
            query = query.filter(User.id != exclude_accountant_id)
        
        accountants = query.all()
        
        all_assigned = set()
        for acc in accountants:
            if acc.accountant_user_ids:
                try:
                    all_assigned.update(json.loads(acc.accountant_user_ids))
                except:
                    pass
        
        return all_assigned
    
    def assign_users_to_accountant(
        self, 
        db: Session, 
        accountant_id: int, 
        user_ids: List[int]
    ) -> User:
        """Назначить пользователей бухгалтеру (перезаписывает существующие назначения)"""
        accountant = db.query(User).filter(
            User.id == accountant_id,
            User.role == UserRole.ACCOUNTANT,
            User.is_active == True
        ).first()
        
        if not accountant:
            raise ValueError("Бухгалтер не найден")
        
        # Получаем текущие назначения
        old_assigned_ids = self.get_accountant_assignments(db, accountant_id)
        
        # Проверяем, что все пользователи существуют
        users = db.query(User).filter(
            User.id.in_(user_ids),
            User.is_active == True
        ).all()
        
        if len(users) != len(user_ids):
            found_ids = {u.id for u in users}
            missing = set(user_ids) - found_ids
            raise ValueError(f"Пользователи с ID {missing} не найдены")
        
        # Определяем, кого нужно отвязать (были назначены, но больше не назначены)
        users_to_unassign = old_assigned_ids - set(user_ids)
        
        # Определяем, кого нужно привязать (новые назначения)
        users_to_assign = set(user_ids) - old_assigned_ids
        
        # Обновляем accountant_id для отвязываемых пользователей
        if users_to_unassign:
            db.query(User).filter(User.id.in_(users_to_unassign)).update(
                {User.accountant_id: None},
                synchronize_session=False
            )
        
        # Обновляем accountant_id для привязываемых пользователей
        if users_to_assign:
            db.query(User).filter(User.id.in_(users_to_assign)).update(
                {User.accountant_id: accountant_id},
                synchronize_session=False
            )
        
        # Сохраняем назначения в поле бухгалтера
        accountant.accountant_user_ids = json.dumps(user_ids) if user_ids else None
        db.commit()
        db.refresh(accountant)
        
        return accountant
    
    def get_available_users_hierarchy(
        self,
        db: Session,
        accountant_id: int
    ) -> Dict[str, Any]:
        """
        Получить иерархию пользователей, доступных для назначения бухгалтеру
        Возвращает структуру с кустами, группами и пользователями
        Уже привязанные пользователи отмечены флагом is_assigned
        """
        # Получаем всех пользователей, которые могут быть привязаны к бухгалтеру
        target_roles = [
            UserRole.SELLER,
            UserRole.MENTOR,
            UserRole.SENIOR_SELLER,
            UserRole.ADMIN
        ]
        
        # Получаем всех пользователей этих ролей
        all_users = db.query(User).filter(
            User.role.in_(target_roles),
            User.is_active == True
        ).all()
        
        # Получаем ID пользователей, уже привязанных к этому бухгалтеру
        assigned_ids = self.get_accountant_assignments(db, accountant_id)
        
        # Получаем ID пользователей, привязанных к ДРУГИМ бухгалтерам (исключаем их полностью)
        other_assigned_ids = self.get_all_assigned_users(db, exclude_accountant_id=accountant_id)
        
        # Фильтруем пользователей - исключаем привязанных к другим бухгалтерам
        available_users = [u for u in all_users if u.id not in other_assigned_ids]
        users_by_id = {u.id: u for u in available_users}
        
        # Получаем все активные кусты и группы
        clusters = db.query(Cluster).filter(Cluster.is_active == True).all()
        groups = db.query(Group).filter(Group.is_active == True).all()
        
        # Строим иерархию
        result = {
            "clusters": [],
            "unassigned_groups": [],  # Группы без куста
            "unassigned_users": []     # Пользователи без группы и куста
        }
        
        # Обрабатываем кусты
        for cluster in clusters:
            cluster_data = self._build_cluster_data(
                db, cluster, users_by_id, groups, assigned_ids
            )
            # Добавляем куст только если в нем есть доступные пользователи
            if cluster_data["all_user_ids"]:
                result["clusters"].append(cluster_data)
        
        # Группы без куста
        unassigned_groups = [g for g in groups if not g.cluster_id]
        for group in unassigned_groups:
            group_data = self._build_group_data(group, users_by_id, assigned_ids)
            if group_data["all_user_ids"]:  # Только если есть доступные пользователи
                result["unassigned_groups"].append(group_data)
        
        # Пользователи без группы и куста
        for user in available_users:
            if not user.group_id and not user.cluster_id:
                # Проверяем, не попал ли пользователь в уже обработанные структуры
                is_already_included = False
                
                # Проверяем кусты
                for cluster in result["clusters"]:
                    if user.id in cluster.get("all_user_ids", []):
                        is_already_included = True
                        break
                
                # Проверяем группы без куста
                if not is_already_included:
                    for group in result["unassigned_groups"]:
                        if user.id in group.get("all_user_ids", []):
                            is_already_included = True
                            break
                
                if not is_already_included:
                    result["unassigned_users"].append({
                        "id": user.id,
                        "full_name": user.full_name,
                        "role": user.role.value,
                        "is_assigned": user.id in assigned_ids
                    })
        
        return result
    
    def _build_cluster_data(self, db: Session, cluster: Cluster, users_by_id: dict, 
                           all_groups: List[Group], assigned_ids: Set[int]) -> dict:
        """Построить данные куста для иерархии"""
        cluster_data = {
            "id": cluster.id,
            "name": cluster.name,
            "senior_seller": None,
            "groups": [],
            "all_user_ids": [],  # Все ID доступных пользователей в этом кусте
            "assigned_count": 0   # Количество привязанных пользователей в кусте
        }
        
        # Старший продавец куста
        if cluster.senior_seller_id and cluster.senior_seller_id in users_by_id:
            senior = users_by_id[cluster.senior_seller_id]
            is_assigned = senior.id in assigned_ids
            cluster_data["senior_seller"] = {
                "id": senior.id,
                "full_name": senior.full_name,
                "role": senior.role.value,
                "is_assigned": is_assigned
            }
            cluster_data["all_user_ids"].append(senior.id)
            if is_assigned:
                cluster_data["assigned_count"] += 1
        
        # Группы в кусте
        cluster_groups = [g for g in all_groups if g.cluster_id == cluster.id]
        for group in cluster_groups:
            group_data = self._build_group_data(group, users_by_id, assigned_ids)
            if group_data["all_user_ids"]:  # Только если есть доступные пользователи
                cluster_data["groups"].append(group_data)
                cluster_data["all_user_ids"].extend(group_data["all_user_ids"])
                cluster_data["assigned_count"] += group_data["assigned_count"]
        
        return cluster_data
    
    def _build_group_data(self, group: Group, users_by_id: dict, assigned_ids: Set[int]) -> dict:
        """Построить данные группы для иерархии"""
        group_data = {
            "id": group.id,
            "name": group.name,
            "mentor": None,
            "sellers": [],
            "all_user_ids": [],
            "assigned_count": 0
        }
        
        # Наставник группы
        if group.mentor_id and group.mentor_id in users_by_id:
            mentor = users_by_id[group.mentor_id]
            is_assigned = mentor.id in assigned_ids
            group_data["mentor"] = {
                "id": mentor.id,
                "full_name": mentor.full_name,
                "role": mentor.role.value,
                "is_assigned": is_assigned
            }
            group_data["all_user_ids"].append(mentor.id)
            if is_assigned:
                group_data["assigned_count"] += 1
        
        # Продавцы в группе
        sellers = [u for u in users_by_id.values() 
                  if u.group_id == group.id and u.role == UserRole.SELLER]
        for seller in sellers:
            is_assigned = seller.id in assigned_ids
            group_data["sellers"].append({
                "id": seller.id,
                "full_name": seller.full_name,
                "role": seller.role.value,
                "is_assigned": is_assigned
            })
            group_data["all_user_ids"].append(seller.id)
            if is_assigned:
                group_data["assigned_count"] += 1
        
        return group_data
    
    def filter_reports_by_accountant(self, db: Session, query, accountant_id: int):
        """Применить фильтр отчетов по бухгалтеру - только от его пользователей"""
        assigned_ids = self.get_accountant_assignments(db, accountant_id)
        
        if not assigned_ids:
            # Если нет назначений, возвращаем пустой результат
            return query.filter(False)
        
        return query.filter(Report.seller_id.in_(assigned_ids))


crud_accountant_assignment = CRUDAccountantAssignment()