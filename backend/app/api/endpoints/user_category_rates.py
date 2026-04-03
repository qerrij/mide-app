from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.dependencies import get_current_user, require_role
from app.models.user import User, UserRole
from app.crud.user_category_rate import crud_user_category_rate
from app.schemas.user_category_rate import (
    UserCategoryRateResponse, 
    UserCategoryRateCreate,
    UserCategoryRateUpdate
)

router = APIRouter(prefix="/users/{user_id}/category-rates", tags=["user_category_rates"])


@router.get("", response_model=List[UserCategoryRateResponse])
def get_user_category_rates(
    user_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить все ставки пользователя по категориям"""
    # Проверка прав
    if current_user.role != UserRole.OWNER and current_user.id != user_id:
        if current_user.role == UserRole.ADMIN:
            admin_clusters = getattr(current_user, 'admin_clusters', [])
            target_user = db.query(User).filter(User.id == user_id).first()
            if not target_user or target_user.cluster_id not in admin_clusters:
                raise HTTPException(status_code=403, detail="Not enough permissions")
        else:
            raise HTTPException(status_code=403, detail="Not enough permissions")
    
    rates = crud_user_category_rate.get_by_user(db, user_id)
    
    for rate in rates:
        if rate.category:
            rate.category_name = rate.category.name
    
    return rates


@router.post("/bulk", response_model=List[UserCategoryRateResponse])
def bulk_set_user_category_rates(
    user_id: int,
    rates_data: List[UserCategoryRateCreate],
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    """Массовое установление ставок по категориям (только OWNER)"""
    rates = crud_user_category_rate.bulk_create_or_update(db, user_id, rates_data)
    
    for rate in rates:
        if rate.category:
            rate.category_name = rate.category.name
    
    return rates


@router.put("/{category_id}", response_model=UserCategoryRateResponse)
def set_user_category_rate(
    user_id: int,
    category_id: int,
    rate_data: UserCategoryRateUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    """Установить ставку для категории (только OWNER)"""
    rate = crud_user_category_rate.create_or_update(
        db, 
        user_id, 
        category_id, 
        rate_data.rate
    )
    
    if rate.category:
        rate.category_name = rate.category.name
    
    return rate


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_category_rate(
    user_id: int,
    category_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    """Удалить ставку для категории (только OWNER)"""
    crud_user_category_rate.delete(db, user_id, category_id)
    return None