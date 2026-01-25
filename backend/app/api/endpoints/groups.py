from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.group import crud_group
from app.crud.user import crud_user
from app.schemas.group import GroupResponse, GroupCreate, GroupUpdate
from app.schemas.user import UserRole
from app.api.dependencies import get_current_user, require_role, require_roles

router = APIRouter(prefix="/groups", tags=["groups"])


@router.post("/", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
def create_group(
    group_in: GroupCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    try:
        group = crud_group.create(db, group_in=group_in)
        return group
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=List[GroupResponse])
def read_groups(
    skip: int = 0,
    limit: int = 100,
    cluster_id: Optional[int] = None,
    mentor_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Получить группы с учетом роли текущего пользователя
    """
    # Владелец видит все группы
    if current_user.role == UserRole.OWNER:
        if cluster_id:
            return crud_group.get_by_cluster(db, cluster_id=cluster_id, skip=skip, limit=limit)
        elif mentor_id:
            group = crud_group.get_by_mentor(db, mentor_id)
            return [group] if group else []
        else:
            return crud_group.get_all(db, skip=skip, limit=limit)
    
    # Администратор видит группы своих кустов
    elif current_user.role == UserRole.ADMIN:
        if not current_user.admin_clusters:
            return []
        
        all_groups = []
        for cluster_id in current_user.admin_clusters:
            groups = crud_group.get_by_cluster(db, cluster_id=cluster_id)
            all_groups.extend(groups)
        
        return all_groups[skip:skip+limit]
    
    # Старший продавец видит группы своего куста
    elif current_user.role == UserRole.SENIOR_SELLER:
        if not current_user.cluster_id:
            return []
        
        return crud_group.get_by_cluster(db, cluster_id=current_user.cluster_id, skip=skip, limit=limit)
    
    # Наставник видит только свою группу
    elif current_user.role == UserRole.MENTOR:
        group = crud_group.get_by_mentor(db, current_user.id)
        return [group] if group else []
    
    # Продавец не видит группы
    else:
        return []


@router.get("/{group_id}", response_model=GroupResponse)
def read_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    group = crud_group.get(db, group_id=group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Проверяем права доступа
    if current_user.role == UserRole.OWNER:
        pass  # Владелец видит все
    
    elif current_user.role == UserRole.ADMIN:
        # Админ может видеть группы в кустах, которыми он управляет
        if not current_user.admin_clusters or group.cluster_id not in current_user.admin_clusters:
            raise HTTPException(status_code=403, detail="Not enough permissions")
    
    elif current_user.role == UserRole.SENIOR_SELLER:
        # Старший продавец видит группы своего куста
        if group.cluster_id != current_user.cluster_id:
            raise HTTPException(status_code=403, detail="Not enough permissions")
    
    elif current_user.role == UserRole.MENTOR:
        # Ментор видит свою группу
        if group.mentor_id != current_user.id:
            # Также может видеть группу, если сам в ней состоит
            if current_user.group_id != group_id:
                raise HTTPException(status_code=403, detail="Not enough permissions")
    
    elif current_user.role == UserRole.SELLER:
        # Продавец видит только свою группу
        if current_user.group_id != group_id:
            raise HTTPException(status_code=403, detail="Not enough permissions")
    
    elif current_user.role == UserRole.ACCOUNTANT:
        # Бухгалтер может видеть все группы
        pass
    
    else:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return group


@router.put("/{group_id}", response_model=GroupResponse)
def update_group(
    group_id: int,
    group_in: GroupUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    try:
        group = crud_group.update(db, group_id=group_id, group_in=group_in)
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        return group
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    try:
        if not crud_group.delete(db, group_id=group_id):
            raise HTTPException(status_code=404, detail="Group not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return None


@router.post("/{group_id}/sellers/{seller_id}", status_code=status.HTTP_200_OK)
def add_seller_to_group(
    group_id: int,
    seller_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    try:
        if not crud_group.add_seller(db, group_id=group_id, seller_id=seller_id):
            raise HTTPException(status_code=404, detail="Group or seller not found")
        return {"message": "Seller added to group successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{group_id}/sellers/{seller_id}", status_code=status.HTTP_200_OK)
def remove_seller_from_group(
    group_id: int,
    seller_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    try:
        if not crud_group.remove_seller(db, group_id=group_id, seller_id=seller_id):
            raise HTTPException(status_code=404, detail="Seller not found in group")
        return {"message": "Seller removed from group successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    

