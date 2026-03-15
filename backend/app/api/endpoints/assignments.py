from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.user import crud_user
from app.crud.group import crud_group
from app.crud.cluster import crud_cluster
from app.schemas.user import UserResponse, UserRole
from app.api.dependencies import get_current_user, require_role
from app.models.user import User
from app.models.group import Group
from app.models.cluster import Cluster
import json

router = APIRouter(prefix="/assignments", tags=["assignments"])


@router.post("/seller-to-mentor/{seller_id}/{mentor_id}", response_model=UserResponse)
def assign_seller_to_mentor(
    seller_id: int,
    mentor_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    """Назначить продавца наставнику"""
    try:
        # Проверяем существование продавца и что он продавец
        seller = crud_user.get(db, seller_id)
        if not seller or seller.role != UserRole.SELLER:
            raise HTTPException(status_code=404, detail="Seller not found")
        
        # Проверяем существование наставника
        mentor = crud_user.get(db, mentor_id)
        if not mentor or mentor.role != UserRole.MENTOR:
            raise HTTPException(status_code=404, detail="Mentor not found")
        
        # Если наставник уже в группе, используем эту группу
        if mentor.group_id:
            # Обновляем продавца
            seller.group_id = mentor.group_id
            seller.mentor_id = mentor.id
            seller.cluster_id = mentor.cluster_id
            seller.senior_seller_id = mentor.senior_seller_id
            
            # Обновляем группу
            group = db.query(Group).filter(Group.id == mentor.group_id).first()
            if group:
                # ВАЖНО: Обновляем seller_count в группе
                if hasattr(group, 'seller_count'):
                    group.seller_count = group.seller_count + 1 if group.seller_count else 1
        else:
            # Создаем новую группу с этим наставником
            new_group = Group(
                name=f"Группа {mentor.full_name}",
                mentor_id=mentor.id,
                cluster_id=mentor.cluster_id,
                senior_seller_id=mentor.senior_seller_id,
                seller_count=1  # ВАЖНО: Устанавливаем начальное значение
            )
            db.add(new_group)
            db.commit()
            db.refresh(new_group)
            
            # Обновляем наставника
            mentor.group_id = new_group.id
            db.commit()
            
            # Обновляем продавца
            seller.group_id = new_group.id
            seller.mentor_id = mentor.id
            seller.cluster_id = mentor.cluster_id
            seller.senior_seller_id = mentor.senior_seller_id
        
        db.commit()
        
        # ВАЖНО: Обновляем данные после коммита
        db.refresh(seller)
        db.refresh(mentor)
        
        crud_user._enrich_user_data(db, seller)
        return seller
            
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/seller-to-group/{seller_id}/{group_id}", response_model=UserResponse)
def assign_seller_to_group(
    seller_id: int,
    group_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    """Добавить продавца в группу"""
    try:
        # Проверяем существование продавца
        seller = crud_user.get(db, seller_id)
        if not seller or seller.role != UserRole.SELLER:
            raise HTTPException(status_code=404, detail="Seller not found")
        
        # Проверяем существование группы
        group = db.query(Group).filter(Group.id == group_id, Group.is_active == True).first()
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        
        # Проверяем, что продавец уже не в другой группе
        if seller.group_id and seller.group_id != group_id:
            raise HTTPException(status_code=400, detail="Seller already in another group")
        
        # Получаем наставника группы
        mentor = crud_user.get(db, group.mentor_id)
        if not mentor or mentor.role != UserRole.MENTOR:
            raise HTTPException(status_code=404, detail="Group mentor not found")
        
        # Обновляем продавца
        seller.group_id = group_id
        seller.mentor_id = mentor.id
        seller.cluster_id = group.cluster_id
        seller.senior_seller_id = group.senior_seller_id
        
        db.commit()
        db.refresh(seller)
        crud_user._enrich_user_data(db, seller)
        return seller
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/remove-seller-from-group/{seller_id}", response_model=UserResponse)
def remove_seller_from_group(
    seller_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    """Удалить продавца из группы"""
    try:
        seller = crud_user.get(db, seller_id)
        if not seller or seller.role != UserRole.SELLER:
            raise HTTPException(status_code=404, detail="Seller not found")
        
        if not seller.group_id:
            raise HTTPException(status_code=400, detail="Seller is not in any group")
        
        # Отвязываем продавца
        seller.group_id = None
        seller.mentor_id = None
        # Оставляем куст и старшего продавца, если они были назначены отдельно
        # seller.cluster_id = None
        # seller.senior_seller_id = None
        
        db.commit()
        db.refresh(seller)
        crud_user._enrich_user_data(db, seller)
        return seller
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/mentor-to-cluster/{mentor_id}/{cluster_id}", response_model=UserResponse)
def assign_mentor_to_cluster(
    mentor_id: int,
    cluster_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    """Добавить наставника в куст"""
    try:
        # Проверяем существование наставника
        mentor = crud_user.get(db, mentor_id)
        if not mentor or mentor.role != UserRole.MENTOR:
            raise HTTPException(status_code=404, detail="Mentor not found")
        
        # Проверяем существование куста
        cluster = db.query(Cluster).filter(Cluster.id == cluster_id, Cluster.is_active == True).first()
        if not cluster:
            raise HTTPException(status_code=404, detail="Cluster not found")
        
        # Получаем старшего продавца куста
        senior_seller = crud_user.get(db, cluster.senior_seller_id)
        if not senior_seller or senior_seller.role != UserRole.SENIOR_SELLER:
            raise HTTPException(status_code=404, detail="Cluster senior seller not found")
        
        # Обновляем наставника
        mentor.cluster_id = cluster_id
        mentor.senior_seller_id = senior_seller.id
        
        # Обновляем группу наставника если она есть
        if mentor.group_id:
            group = db.query(Group).filter(Group.id == mentor.group_id).first()
            if group:
                group.cluster_id = cluster_id
                group.senior_seller_id = senior_seller.id
        
        # Обновляем всех продавцов этого наставника
        sellers = db.query(User).filter(
            User.mentor_id == mentor.id,
            User.is_active == True
        ).all()
        
        for seller in sellers:
            seller.cluster_id = cluster_id
            seller.senior_seller_id = senior_seller.id
        
        db.commit()
        
        # ВАЖНО: Обновляем данные после коммита
        db.refresh(mentor)
        if mentor.group_id:
            db.refresh(group)
        for seller in sellers:
            db.refresh(seller)
        
        crud_user._enrich_user_data(db, mentor)
        return mentor
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/senior-to-cluster/{senior_id}/{cluster_id}", response_model=UserResponse)
def assign_senior_to_cluster(
    senior_id: int,
    cluster_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    """Назначить старшего продавца кусту (создать куст или изменить)"""
    try:
        # Проверяем существование старшего продавца
        senior_seller = crud_user.get(db, senior_id)
        if not senior_seller or senior_seller.role != UserRole.SENIOR_SELLER:
            raise HTTPException(status_code=404, detail="Senior seller not found")
        
        # Проверяем существование куста
        cluster = db.query(Cluster).filter(Cluster.id == cluster_id, Cluster.is_active == True).first()
        if not cluster:
            raise HTTPException(status_code=404, detail="Cluster not found")
        
        # Если у старшего продавца уже есть другой куст, нельзя
        if senior_seller.cluster_id and senior_seller.cluster_id != cluster_id:
            # Проверяем, не управляет ли он уже другим кустом
            existing_cluster = db.query(Cluster).filter(
                Cluster.senior_seller_id == senior_id,
                Cluster.is_active == True
            ).first()
            if existing_cluster:
                raise HTTPException(status_code=400, detail="Senior seller already manages another cluster")
        
        # Обновляем куст
        old_senior_id = cluster.senior_seller_id
        cluster.senior_seller_id = senior_id
        
        # Обновляем старшего продавца
        senior_seller.cluster_id = cluster_id
        
        # Если у куста был другой старший продавец, отвязываем его
        if old_senior_id and old_senior_id != senior_id:
            old_senior = crud_user.get(db, old_senior_id)
            if old_senior:
                old_senior.cluster_id = None
        
        # Обновляем всех наставников и продавцов в этом кусте
        mentors = db.query(User).filter(
            User.cluster_id == cluster_id,
            User.role == UserRole.MENTOR,
            User.is_active == True
        ).all()
        
        for mentor in mentors:
            mentor.senior_seller_id = senior_id
            
            # Обновляем группу наставника
            if mentor.group_id:
                group = db.query(Group).filter(Group.id == mentor.group_id).first()
                if group:
                    group.senior_seller_id = senior_id
            
            # Обновляем продавцов этого наставника
            sellers = db.query(User).filter(
                User.mentor_id == mentor.id,
                User.is_active == True
            ).all()
            
            for seller in sellers:
                seller.senior_seller_id = senior_id
        
        db.commit()
        db.refresh(senior_seller)
        crud_user._enrich_user_data(db, senior_seller)
        return senior_seller
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/group-to-cluster/{group_id}/{cluster_id}", response_model=UserResponse)
def assign_group_to_cluster(
    group_id: int,
    cluster_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    """Поместить группу в куст"""
    try:
        # Проверяем существование группы
        group = db.query(Group).filter(Group.id == group_id, Group.is_active == True).first()
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        
        # Проверяем существование куста
        cluster = db.query(Cluster).filter(Cluster.id == cluster_id, Cluster.is_active == True).first()
        if not cluster:
            raise HTTPException(status_code=404, detail="Cluster not found")
        
        # Получаем старшего продавца куста
        senior_seller = crud_user.get(db, cluster.senior_seller_id)
        if not senior_seller or senior_seller.role != UserRole.SENIOR_SELLER:
            raise HTTPException(status_code=404, detail="Cluster senior seller not found")
        
        # Обновляем группу
        group.cluster_id = cluster_id
        group.senior_seller_id = senior_seller.id
        
        # Обновляем наставника группы
        mentor = crud_user.get(db, group.mentor_id)
        if mentor:
            mentor.cluster_id = cluster_id
            mentor.senior_seller_id = senior_seller.id
        
        # Обновляем всех продавцов группы
        sellers = db.query(User).filter(
            User.group_id == group_id,
            User.is_active == True
        ).all()
        
        for seller in sellers:
            seller.cluster_id = cluster_id
            seller.senior_seller_id = senior_seller.id
        
        # ВАЖНО: Обновляем куст - увеличиваем счетчик групп
        if hasattr(cluster, 'group_count'):
            cluster.group_count = cluster.group_count + 1 if cluster.group_count else 1
        
        db.commit()
        
        # ВАЖНО: Обновляем данные после коммита
        db.refresh(group)
        if mentor:
            db.refresh(mentor)
        for seller in sellers:
            db.refresh(seller)
        db.refresh(cluster)
        
        # Возвращаем обновленного наставника
        if mentor:
            crud_user._enrich_user_data(db, mentor)
            return mentor
        else:
            # Возвращаем любого продавца из группы для ответа
            if sellers:
                crud_user._enrich_user_data(db, sellers[0])
                return sellers[0]
            else:
                raise HTTPException(status_code=404, detail="No users in group")
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/admin-to-cluster/{admin_id}/{cluster_id}", response_model=UserResponse)
def assign_admin_to_cluster(
    admin_id: int,
    cluster_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    """Добавить куст под управление администратору"""
    try:
        # Проверяем существование администратора
        admin = crud_user.get(db, admin_id)
        if not admin or admin.role != UserRole.ADMIN:
            raise HTTPException(status_code=404, detail="Admin not found")
        
        # Проверяем существование куста
        cluster = db.query(Cluster).filter(Cluster.id == cluster_id, Cluster.is_active == True).first()
        if not cluster:
            raise HTTPException(status_code=404, detail="Cluster not found")
        
        # Получаем текущие кусты администратора
        admin_clusters = []
        if admin.admin_clusters:
            try:
                # Если это строка, парсим JSON
                if isinstance(admin.admin_clusters, str):
                    admin_clusters = json.loads(admin.admin_clusters)
                # Если это уже список, используем как есть
                elif isinstance(admin.admin_clusters, list):
                    admin_clusters = admin.admin_clusters
            except (json.JSONDecodeError, TypeError) as e:
                # Если не удалось распарсить, начинаем с пустого списка
                print(f"Error parsing admin_clusters: {e}")
                admin_clusters = []
        
        # Проверяем, не добавлен ли уже этот куст
        if cluster_id in admin_clusters:
            raise HTTPException(status_code=400, detail="Cluster already assigned to this admin")
        
        # Добавляем куст
        admin_clusters.append(cluster_id)
        
        # Сохраняем как JSON строку
        admin.admin_clusters = json.dumps(admin_clusters)
        
        # Обновляем куст (добавляем администратора если его еще нет)
        if not cluster.admin_id:
            cluster.admin_id = admin_id
        
        db.commit()
        db.refresh(admin)
        crud_user._enrich_user_data(db, admin)
        return admin
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/admin-from-cluster/{admin_id}/{cluster_id}", response_model=UserResponse)
def remove_admin_from_cluster(
    admin_id: int,
    cluster_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    """Убрать куст из управления администратора"""
    try:
        # Проверяем существование администратора
        admin = crud_user.get(db, admin_id)
        if not admin or admin.role != UserRole.ADMIN:
            raise HTTPException(status_code=404, detail="Admin not found")
        
        # Проверяем существование куста
        cluster = db.query(Cluster).filter(Cluster.id == cluster_id, Cluster.is_active == True).first()
        if not cluster:
            raise HTTPException(status_code=404, detail="Cluster not found")
        
        # Получаем текущие кусты администратора через надежный метод
        admin_clusters = crud_user.get_admin_clusters(admin)
        
        # Проверяем, есть ли этот куст у администратора
        if cluster_id not in admin_clusters:
            # Для отладки
            print(f"Admin clusters: {admin_clusters}, looking for: {cluster_id}")
            print(f"Raw _admin_clusters: {admin._admin_clusters}")
            raise HTTPException(
                status_code=400, 
                detail=f"Cluster not assigned to this admin. Admin has clusters: {admin_clusters}"
            )
        
        # Убираем куст
        admin_clusters.remove(cluster_id)
        
        # Сохраняем обновленный список
        if admin_clusters:
            admin.admin_clusters = json.dumps(admin_clusters)
        else:
            admin.admin_clusters = None
        
        # Если этот администратор был основным для куста, убираем его
        if cluster.admin_id == admin_id:
            # Ищем другого администратора для этого куста
            other_admin = None
            all_admins = db.query(User).filter(
                User.role == UserRole.ADMIN,
                User.is_active == True,
                User.id != admin_id
            ).all()
            
            for potential_admin in all_admins:
                potential_clusters = crud_user.get_admin_clusters(potential_admin)
                if cluster_id in potential_clusters:
                    other_admin = potential_admin
                    break
            
            if other_admin:
                cluster.admin_id = other_admin.id
            else:
                cluster.admin_id = None
        
        db.commit()
        db.refresh(admin)
        crud_user._enrich_user_data(db, admin)
        return admin
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/remove-mentor-from-group/{mentor_id}", response_model=UserResponse)
def remove_mentor_from_group(
    mentor_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    """Отвязать наставника от группы (группа остается без наставника)"""
    try:
        # Проверяем существование наставника
        mentor = crud_user.get(db, mentor_id)
        if not mentor or mentor.role != UserRole.MENTOR:
            raise HTTPException(status_code=404, detail="Mentor not found")
        
        if not mentor.group_id:
            raise HTTPException(status_code=400, detail="Mentor is not in any group")
        
        # Находим группу
        group = db.query(Group).filter(Group.id == mentor.group_id, Group.is_active == True).first()
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        
        # Отвязываем наставника от группы
        old_mentor_id = group.mentor_id
        group.mentor_id = None  # Группа остается без наставника
        mentor.group_id = None
        
        # НЕ деактивируем группу!
        # group.is_active = False - удаляем эту строку
        
        # Отвязываем всех продавцов этой группы от наставника,
        # но оставляем их в группе
        sellers = db.query(User).filter(
            User.group_id == group.id,
            User.is_active == True
        ).all()
        
        for seller in sellers:
            seller.mentor_id = None
            # Оставляем seller.group_id без изменений
            # Оставляем куст и старшего продавца
        
        db.commit()
        
        # Обновляем данные
        db.refresh(mentor)
        db.refresh(group)
        
        crud_user._enrich_user_data(db, mentor)
        return mentor
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/remove-senior-from-cluster/{senior_id}", response_model=UserResponse)
def remove_senior_from_cluster(
    senior_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    """Отвязать старшего продавца от куста"""
    try:
        # Проверяем существование старшего продавца
        senior_seller = crud_user.get(db, senior_id)
        if not senior_seller or senior_seller.role != UserRole.SENIOR_SELLER:
            raise HTTPException(status_code=404, detail="Senior seller not found")
        
        if not senior_seller.cluster_id:
            raise HTTPException(status_code=400, detail="Senior seller is not managing any cluster")
        
        # Находим куст
        cluster = db.query(Cluster).filter(
            Cluster.id == senior_seller.cluster_id,
            Cluster.is_active == True
        ).first()
        
        if not cluster:
            raise HTTPException(status_code=404, detail="Cluster not found")
        
        # Отвязываем старшего продавца от куста
        cluster.senior_seller_id = None 
        senior_seller.cluster_id = None
        
        mentors = db.query(User).filter(
            User.cluster_id == cluster.id,
            User.role == UserRole.MENTOR,
            User.is_active == True
        ).all()
        
        for mentor in mentors:
            mentor.senior_seller_id = None
            
            # Обновляем группу наставника
            if mentor.group_id:
                group = db.query(Group).filter(Group.id == mentor.group_id).first()
                if group:
                    group.senior_seller_id = None
            
            # Обновляем продавцов
            sellers = db.query(User).filter(
                User.mentor_id == mentor.id,
                User.is_active == True
            ).all()
            
            for seller in sellers:
                seller.senior_seller_id = None
        
        db.commit()
        db.refresh(senior_seller)
        crud_user._enrich_user_data(db, senior_seller)
        return senior_seller
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    

@router.post("/mentor-to-group/{mentor_id}/{group_id}", response_model=UserResponse)
def assign_mentor_to_group(
    mentor_id: int,
    group_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    """Назначить наставника группе"""
    try:
        # Проверяем существование наставника
        mentor = crud_user.get(db, mentor_id)
        if not mentor or mentor.role != UserRole.MENTOR:
            raise HTTPException(status_code=404, detail="Mentor not found")
        
        # Проверяем существование группы
        group = db.query(Group).filter(Group.id == group_id, Group.is_active == True).first()
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        
        # Проверяем, не назначен ли уже наставник этой группе
        if group.mentor_id and group.mentor_id != mentor_id:
            raise HTTPException(status_code=400, detail="Group already has a mentor")
        
        # Обновляем группу
        group.mentor_id = mentor_id
        
        # Обновляем наставника
        mentor.group_id = group_id
        
        # Если у группы есть куст, обновляем наставника
        if group.cluster_id:
            mentor.cluster_id = group.cluster_id
            mentor.senior_seller_id = group.senior_seller_id
        
        db.commit()
        
        # Обновляем данные
        db.refresh(mentor)
        db.refresh(group)
        
        crud_user._enrich_user_data(db, mentor)
        return mentor
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))