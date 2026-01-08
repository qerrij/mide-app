import json
from typing import List
from app.models.user import User
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.user import crud_user
from app.crud.group import crud_group
from app.crud.cluster import crud_cluster
from app.schemas.user import UserRole, UserResponse
from app.api.dependencies import get_current_user, require_role

router = APIRouter(prefix="/assignments", tags=["assignments"])


@router.post("/seller-to-mentor/{seller_id}/{mentor_id}", response_model=UserResponse)
def assign_seller_to_mentor(
    seller_id: int,
    mentor_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    """
    Назначить продавца наставнику
    """
    # Проверяем, что продавец существует и является продавцом
    seller = crud_user.get(db, seller_id)
    if not seller or seller.role != UserRole.SELLER:
        raise HTTPException(status_code=404, detail="Seller not found")
    
    # Проверяем, что наставник существует и является наставником
    mentor = crud_user.get(db, mentor_id)
    if not mentor or mentor.role != UserRole.MENTOR:
        raise HTTPException(status_code=404, detail="Mentor not found")
    
    # Проверяем, не состоит ли продавец уже в группе
    if seller.group_id:
        group = crud_group.get(db, seller.group_id)
        if group and group.mentor_id != mentor_id:
            raise HTTPException(status_code=400, detail="Seller is already in another group")
    
    # Назначаем наставника
    seller.mentor_id = mentor_id
    seller.cluster_id = mentor.cluster_id
    seller.senior_seller_id = mentor.senior_seller_id
    
    db.commit()
    db.refresh(seller)
    
    return seller


@router.post("/seller-to-group/{seller_id}/{group_id}", response_model=UserResponse)
def assign_seller_to_group(
    seller_id: int,
    group_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    """
    Назначить продавца в группу
    """
    seller = crud_user.get(db, seller_id)
    if not seller or seller.role != UserRole.SELLER:
        raise HTTPException(status_code=404, detail="Seller not found")
    
    group = crud_group.get(db, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Назначаем продавца в группу
    seller.group_id = group_id
    seller.mentor_id = group.mentor_id
    seller.cluster_id = group.cluster_id
    seller.senior_seller_id = group.senior_seller_id
    
    db.commit()
    db.refresh(seller)
    
    return seller


@router.post("/mentor-to-cluster/{mentor_id}/{cluster_id}", response_model=UserResponse)
def assign_mentor_to_cluster(
    mentor_id: int,
    cluster_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    """
    Назначить наставника в куст
    """
    mentor = crud_user.get(db, mentor_id)
    if not mentor or mentor.role != UserRole.MENTOR:
        raise HTTPException(status_code=404, detail="Mentor not found")
    
    cluster = crud_cluster.get(db, cluster_id)
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")
    
    # Проверяем, не управляет ли наставник уже группой
    group = crud_group.get_by_mentor(db, mentor_id)
    if group:
        # Если наставник управляет группой, обновляем группу тоже
        group.cluster_id = cluster_id
        group.senior_seller_id = cluster.senior_seller_id
    
    # Назначаем наставника в куст
    mentor.cluster_id = cluster_id
    mentor.senior_seller_id = cluster.senior_seller_id
    
    # Обновляем всех продавцов этого наставника
    sellers = db.query(User).filter(
        User.mentor_id == mentor_id,
        User.is_active == True
    ).all()
    
    for seller in sellers:
        seller.cluster_id = cluster_id
        seller.senior_seller_id = cluster.senior_seller_id
    
    db.commit()
    db.refresh(mentor)
    
    return mentor


@router.post("/admin-to-cluster/{admin_id}/{cluster_id}", response_model=UserResponse)
def assign_admin_to_cluster(
    admin_id: int,
    cluster_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    """
    Назначить администратору куст
    """
    admin = crud_user.get(db, admin_id)
    if not admin or admin.role != UserRole.ADMIN:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    cluster = crud_cluster.get(db, cluster_id)
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")
    
    # Получаем текущие кусты администратора
    admin_clusters = []
    if admin.admin_clusters and isinstance(admin.admin_clusters, str):
        try:
            admin_clusters = json.loads(admin.admin_clusters)
        except:
            admin_clusters = []
    
    # Добавляем куст, если его еще нет
    if cluster_id not in admin_clusters:
        admin_clusters.append(cluster_id)
        admin.admin_clusters = json.dumps(admin_clusters)
        
        # Обновляем администратора в кусте
        cluster.admin_id = admin_id
    
    db.commit()
    db.refresh(admin)
    
    return admin


@router.delete("/admin-from-cluster/{admin_id}/{cluster_id}", response_model=UserResponse)
def remove_admin_from_cluster(
    admin_id: int,
    cluster_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    """
    Убрать у администратора куст
    """
    admin = crud_user.get(db, admin_id)
    if not admin or admin.role != UserRole.ADMIN:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    cluster = crud_cluster.get(db, cluster_id)
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")
    
    # Получаем текущие кусты администратора
    admin_clusters = []
    if admin.admin_clusters and isinstance(admin.admin_clusters, str):
        try:
            admin_clusters = json.loads(admin.admin_clusters)
        except:
            admin_clusters = []
    
    # Удаляем куст
    if cluster_id in admin_clusters:
        admin_clusters.remove(cluster_id)
        admin.admin_clusters = json.dumps(admin_clusters) if admin_clusters else None
        
        # Если это был администратор куста, очищаем поле
        if cluster.admin_id == admin_id:
            cluster.admin_id = None
    
    db.commit()
    db.refresh(admin)
    
    return admin


@router.post("/senior-to-cluster/{senior_id}/{cluster_id}", response_model=UserResponse)
def assign_senior_to_cluster(
    senior_id: int,
    cluster_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    """
    Назначить старшего продавца руководителем куста
    """
    senior = crud_user.get(db, senior_id)
    if not senior or senior.role != UserRole.SENIOR_SELLER:
        raise HTTPException(status_code=404, detail="Senior seller not found")
    
    cluster = crud_cluster.get(db, cluster_id)
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")
    
    # Проверяем, не управляет ли уже кустом
    if cluster.senior_seller_id and cluster.senior_seller_id != senior_id:
        raise HTTPException(status_code=400, detail="Cluster already has a senior seller")
    
    # Назначаем старшего продавца кусту
    cluster.senior_seller_id = senior_id
    senior.cluster_id = cluster_id
    
    db.commit()
    db.refresh(senior)
    
    return senior


@router.delete("/remove-seller-from-group/{seller_id}", response_model=UserResponse)
def remove_seller_from_group(
    seller_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    """
    Убрать продавца из группы
    """
    seller = crud_user.get(db, seller_id)
    if not seller or seller.role != UserRole.SELLER:
        raise HTTPException(status_code=404, detail="Seller not found")
    
    # Сбрасываем связи
    seller.group_id = None
    seller.mentor_id = None
    seller.cluster_id = None
    seller.senior_seller_id = None
    
    db.commit()
    db.refresh(seller)
    
    return seller