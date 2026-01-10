from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.product import crud_product
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse, ProductCategory
from app.api.dependencies import get_current_user, require_roles
from app.models.user import UserRole

router = APIRouter(prefix="/products", tags=["products"])


@router.get("/", response_model=List[ProductResponse])
def get_products(
    skip: int = 0,
    limit: int = 100,
    category_id: int = Query(None, description="ID категории для фильтрации"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Получить список товаров с фильтрацией по категории
    """
    products = crud_product.get_all(db, skip=skip, limit=limit, category_id=category_id)
    return products


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Получить товар по ID
    """
    product = crud_product.get(db, product_id=product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    product_in: ProductCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles([UserRole.OWNER, UserRole.ADMIN]))
):
    """
    Создать новый товар (только OWNER и ADMIN)
    """
    try:
        product = crud_product.create(db, product_in=product_in)
        return product
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    product_in: ProductUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles([UserRole.OWNER, UserRole.ADMIN]))
):
    """
    Обновить товар (только OWNER и ADMIN)
    """
    try:
        product = crud_product.update(db, product_id=product_id, product_in=product_in)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return product
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles([UserRole.OWNER]))
):
    """
    Удалить товар (только OWNER)
    """
    if not crud_product.delete(db, product_id=product_id):
        raise HTTPException(status_code=404, detail="Product not found")
    return None