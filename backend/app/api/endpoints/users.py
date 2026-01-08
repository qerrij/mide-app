from typing import List, Optional
from app.models.user import User
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.user import crud_user
from app.crud.group import crud_group
from app.crud.cluster import crud_cluster
from app.schemas.user import UserResponse, UserCreate, UserUpdate, UserRole
from app.api.dependencies import get_current_user, require_role, require_roles
import json

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    try:
        user = crud_user.create(db, user_in=user_in, created_by=current_user.id)
        return user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=List[UserResponse])
def read_users(
    skip: int = 0,
    limit: int = 100,
    role: Optional[UserRole] = None,
    group_id: Optional[int] = None,
    cluster_id: Optional[int] = None,
    mentor_id: Optional[int] = None,
    senior_seller_id: Optional[int] = None,
    admin_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Получить пользователей с учетом роли текущего пользователя
    """
    # OWNER получает всех пользователей с фильтрами
    if current_user.role == UserRole.OWNER:
        query = db.query(User).filter(User.is_active == True)
        
        if role:
            query = query.filter(User.role == role)
        if group_id:
            query = query.filter(User.group_id == group_id)
        if cluster_id:
            query = query.filter(User.cluster_id == cluster_id)
        if mentor_id:
            query = query.filter(User.mentor_id == mentor_id)
        if senior_seller_id:
            query = query.filter(User.senior_seller_id == senior_seller_id)
        if admin_id:
            query = query.filter(User.admin_id == admin_id)
        
        users = query.offset(skip).limit(limit).all()
        
        for user in users:
            crud_user._enrich_user_data(db, user)
        
        return users
    
    # ADMIN получает пользователей своих кустов
    elif current_user.role == UserRole.ADMIN:
        if not current_user.admin_clusters:
            return []
        
        query = db.query(User).filter(
            User.cluster_id.in_(current_user.admin_clusters),
            User.is_active == True
        )
        
        if role:
            query = query.filter(User.role == role)
        
        users = query.offset(skip).limit(limit).all()
        
        for user in users:
            crud_user._enrich_user_data(db, user)
        
        return users
    
    # SENIOR_SELLER получает пользователей своего куста
    elif current_user.role == UserRole.SENIOR_SELLER:
        if not current_user.cluster_id:
            return []
        
        query = db.query(User).filter(
            User.cluster_id == current_user.cluster_id,
            User.is_active == True
        )
        
        if role:
            query = query.filter(User.role == role)
        
        users = query.offset(skip).limit(limit).all()
        
        for user in users:
            crud_user._enrich_user_data(db, user)
        
        return users
    
    # MENTOR получает своих подопечных
    elif current_user.role == UserRole.MENTOR:
        query = db.query(User).filter(
            User.mentor_id == current_user.id,
            User.is_active == True
        )
        
        if role:
            query = query.filter(User.role == role)
        
        users = query.offset(skip).limit(limit).all()
        
        for user in users:
            crud_user._enrich_user_data(db, user)
        
        return users
    
    # SELLER получает только себя
    elif current_user.role == UserRole.SELLER:
        crud_user._enrich_user_data(db, current_user)
        return [current_user]
    
    return []


@router.get("/{user_id}", response_model=UserResponse)
def read_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Владелец может видеть всех
    if current_user.role == UserRole.OWNER:
        pass
    # Админ может видеть пользователей своих кустов
    elif current_user.role == UserRole.ADMIN:
        user = crud_user.get(db, user_id=user_id)
        if not user or not current_user.admin_clusters or user.cluster_id not in current_user.admin_clusters:
            raise HTTPException(status_code=403, detail="Not enough permissions")
    # Старший продавец может видеть пользователей своего куста
    elif current_user.role == UserRole.SENIOR_SELLER:
        user = crud_user.get(db, user_id=user_id)
        if not user or user.cluster_id != current_user.cluster_id:
            raise HTTPException(status_code=403, detail="Not enough permissions")
    # Наставник может видеть своих подопечных
    elif current_user.role == UserRole.MENTOR:
        user = crud_user.get(db, user_id=user_id)
        if not user or user.mentor_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not enough permissions")
    # Продавец может видеть только себя
    elif current_user.role == UserRole.SELLER and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    user = crud_user.get(db, user_id=user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Владелец может редактировать всех
    if current_user.role != UserRole.OWNER and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    try:
        user = crud_user.update(db, user_id=user_id, user_in=user_in)
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    try:
        if not crud_user.delete(db, user_id=user_id):
            raise HTTPException(status_code=404, detail="User not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return None


@router.get("/available/mentors", response_model=List[UserResponse])
def get_available_mentors(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Получить список доступных наставников (тех, у кого нет группы)
    """
    if current_user.role not in [UserRole.OWNER, UserRole.ADMIN, UserRole.SENIOR_SELLER]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Находим наставников без группы
    mentors = db.query(User).filter(
        User.role == UserRole.MENTOR,
        User.is_active == True,
        User.group_id == None  # Наставник без группы
    ).all()
    
    for mentor in mentors:
        crud_user._enrich_user_data(db, mentor)
    
    return mentors


@router.get("/available/senior_sellers", response_model=List[UserResponse])
def get_available_senior_sellers(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Получить список доступных старших продавцов (тех, у кого нет куста)
    """
    if current_user.role not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Находим старших продавцов без куста
    senior_sellers = db.query(User).filter(
        User.role == UserRole.SENIOR_SELLER,
        User.is_active == True,
        User.cluster_id == None  # Старший продавец без куста
    ).all()
    
    for seller in senior_sellers:
        crud_user._enrich_user_data(db, seller)
    
    return senior_sellers