from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.crud.product import crud_product
from app.models.product import Product
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
    products = db.query(Product).options(
        joinedload(Product.category)
    ).filter(
        Product.is_active == True
    )
    
    if category_id:
        products = products.filter(Product.category_id == category_id)
    
    products = products.offset(skip).limit(limit).all()
    
    # Преобразуем в dict с category_name
    result = []
    for product in products:
        product_dict = {
            'id': product.id,
            'name': product.name,
            'category_id': product.category_id,
            'price': product.price,
            'sku': product.sku,
            'description': product.description,
            'is_active': product.is_active,
            'created_at': product.created_at,
            'updated_at': product.updated_at,
            'category_name': product.category.name if product.category else None
        }
        result.append(product_dict)
    
    return result


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Получить товар по ID
    """
    product = db.query(Product).options(
        joinedload(Product.category)
    ).filter(
        Product.id == product_id,
        Product.is_active == True
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Возвращаем с category_name
    return {
        'id': product.id,
        'name': product.name,
        'category_id': product.category_id,
        'price': product.price,
        'sku': product.sku,
        'description': product.description,
        'is_active': product.is_active,
        'created_at': product.created_at,
        'updated_at': product.updated_at,
        'category_name': product.category.name if product.category else None
    }