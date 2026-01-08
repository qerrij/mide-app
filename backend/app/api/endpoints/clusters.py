from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.cluster import crud_cluster
from app.crud.user import crud_user
from app.schemas.cluster import ClusterResponse, ClusterCreate, ClusterUpdate
from app.schemas.user import UserRole
from app.api.dependencies import get_current_user, require_role, require_roles

router = APIRouter(prefix="/clusters", tags=["clusters"])


@router.post("/", response_model=ClusterResponse, status_code=status.HTTP_201_CREATED)
def create_cluster(
    cluster_in: ClusterCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    try:
        cluster = crud_cluster.create(db, cluster_in=cluster_in)
        return cluster
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=List[ClusterResponse])
def read_clusters(
    skip: int = 0,
    limit: int = 100,
    admin_id: Optional[int] = None,
    senior_seller_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Получить кусты с учетом роли текущего пользователя
    """
    # Владелец видит все кусты
    if current_user.role == UserRole.OWNER:
        if admin_id:
            # Фильтр по администратору
            clusters = crud_cluster.get_all(db)
            filtered = [c for c in clusters if c.admin_id == admin_id]
            return filtered[skip:skip+limit]
        elif senior_seller_id:
            cluster = crud_cluster.get_by_senior_seller(db, senior_seller_id)
            return [cluster] if cluster else []
        else:
            return crud_cluster.get_all(db, skip=skip, limit=limit)
    
    # Администратор видит свои кусты
    elif current_user.role == UserRole.ADMIN:
        if not current_user.admin_clusters:
            return []
        
        clusters = []
        for cluster_id in current_user.admin_clusters:
            cluster = crud_cluster.get(db, cluster_id)
            if cluster:
                clusters.append(cluster)
        
        return clusters[skip:skip+limit]
    
    # Старший продавец видит свой куст
    elif current_user.role == UserRole.SENIOR_SELLER:
        cluster = crud_cluster.get_by_senior_seller(db, current_user.id)
        return [cluster] if cluster else []
    
    # Остальные не видят кусты
    else:
        return []


@router.get("/{cluster_id}", response_model=ClusterResponse)
def read_cluster(
    cluster_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    cluster = crud_cluster.get(db, cluster_id=cluster_id)
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")
    
    # Проверяем права доступа
    if current_user.role == UserRole.OWNER:
        pass
    elif current_user.role == UserRole.ADMIN:
        if not current_user.admin_clusters or cluster_id not in current_user.admin_clusters:
            raise HTTPException(status_code=403, detail="Not enough permissions")
    elif current_user.role == UserRole.SENIOR_SELLER:
        if cluster.senior_seller_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not enough permissions")
    else:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return cluster


@router.put("/{cluster_id}", response_model=ClusterResponse)
def update_cluster(
    cluster_id: int,
    cluster_in: ClusterUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    try:
        cluster = crud_cluster.update(db, cluster_id=cluster_id, cluster_in=cluster_in)
        if not cluster:
            raise HTTPException(status_code=404, detail="Cluster not found")
        return cluster
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{cluster_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cluster(
    cluster_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    try:
        if not crud_cluster.delete(db, cluster_id=cluster_id):
            raise HTTPException(status_code=404, detail="Cluster not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return None


@router.post("/{cluster_id}/groups/{group_id}", status_code=status.HTTP_200_OK)
def add_group_to_cluster(
    cluster_id: int,
    group_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    try:
        if not crud_cluster.add_group(db, cluster_id=cluster_id, group_id=group_id):
            raise HTTPException(status_code=404, detail="Cluster or group not found")
        return {"message": "Group added to cluster successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{cluster_id}/groups/{group_id}", status_code=status.HTTP_200_OK)
def remove_group_from_cluster(
    cluster_id: int,
    group_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    try:
        if not crud_cluster.remove_group(db, cluster_id=cluster_id, group_id=group_id):
            raise HTTPException(status_code=404, detail="Group not found in cluster")
        return {"message": "Group removed from cluster successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))