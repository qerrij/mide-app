from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.category import crud_category
from app.schemas.product import ProductCategoryCreate, ProductCategoryUpdate, ProductCategoryResponse
from app.api.dependencies import get_current_user, require_role
from app.models.user import UserRole

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("/", response_model=List[ProductCategoryResponse])
def get_categories(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Получить список категорий товаров
    """
    categories = crud_category.get_all(db, skip=skip, limit=limit)
    return categories


@router.get("/{category_id}", response_model=ProductCategoryResponse)
def get_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Получить категорию по ID
    """
    category = crud_category.get(db, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.post("/", response_model=ProductCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    category_in: ProductCategoryCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    """
    Создать новую категорию (только OWNER)
    """
    try:
        category = crud_category.create(db, name=category_in.name, description=category_in.description)
        return category
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{category_id}", response_model=ProductCategoryResponse)
def update_category(
    category_id: int,
    category_in: ProductCategoryUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    """
    Обновить категорию (только OWNER)
    """
    try:
        category = crud_category.update(
            db, 
            category_id=category_id,
            name=category_in.name,
            description=category_in.description,
            is_active=category_in.is_active
        )
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        return category
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    """
    Удалить категорию (только OWNER)
    """
    if not crud_category.delete(db, category_id):
        raise HTTPException(status_code=404, detail="Category not found")
    return None