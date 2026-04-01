# endpoints/products.py
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.crud.product import crud_product
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse
from app.api.dependencies import get_current_user, require_roles
from app.models.user import UserRole

router = APIRouter(prefix="/products", tags=["products"])


@router.post("", 
            response_model=ProductResponse,
            status_code=status.HTTP_201_CREATED,
            dependencies=[Depends(require_roles([UserRole.OWNER]))])
def create_product(
    product_in: ProductCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Создать новый товар"""
    try:
        product = crud_product.create(db=db, product_in=product_in)
        if not product:
            raise HTTPException(status_code=400, detail="Failed to create product")
        
        # Pydantic сам сериализует все правильно
        return product
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.put("/{product_id}", 
           response_model=ProductResponse,
           dependencies=[Depends(require_roles([UserRole.OWNER]))])
def update_product(
    product_id: int,
    product_in: ProductUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Обновить товар"""
    try:
        product = crud_product.update(db=db, product_id=product_id, product_in=product_in)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        return product
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{product_id}",
              status_code=status.HTTP_204_NO_CONTENT,
              dependencies=[Depends(require_roles([UserRole.OWNER]))])
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Удалить товар (мягкое удаление)"""
    success = crud_product.delete(db=db, product_id=product_id)
    if not success:
        raise HTTPException(status_code=404, detail="Product not found")
    return None


@router.get("", response_model=List[ProductResponse])
def get_products(
    skip: int = 0,
    limit: int = 100,
    category_id: int = Query(None, description="ID категории для фильтрации"),
    city_id: Optional[int] = Query(None, description="ID города для фильтрации товаров"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Получить список товаров с фильтрацией по категории и городу
    """
    # Определяем город для фильтрации
    filter_city_id = city_id
    if not filter_city_id and current_user.city_id:
        filter_city_id = current_user.city_id
    
    products = crud_product.get_all(
        db, 
        skip=skip, 
        limit=limit, 
        category_id=category_id,
        city_id=filter_city_id
    )
    
    return products


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    product = crud_product.get(db, product_id)
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return product