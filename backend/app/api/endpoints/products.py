from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.crud.product import crud_product
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse, ProductCategory, ProductCategoryResponse
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
    """
    Создать новый товар
    
    """
    try:
        # Используем CRUD для создания
        product = crud_product.create(db=db, product_in=product_in)
        if not product:
            raise HTTPException(status_code=400, detail="Failed to create product")
        
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
        
    except ValueError as e:
        # Обрабатываем ошибку дублирования SKU
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
    """
    Обновить товар
    
        """
    try:
        product = crud_product.update(db=db, product_id=product_id, product_in=product_in)
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
        
    except ValueError as e:
        # Обрабатываем ошибку дублирования SKU
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{product_id}",
              status_code=status.HTTP_204_NO_CONTENT,
              dependencies=[Depends(require_roles([UserRole.OWNER]))])
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Удалить товар (мягкое удаление)
    
    """
    success = crud_product.delete(db=db, product_id=product_id)
    if not success:
        raise HTTPException(status_code=404, detail="Product not found")
    return None

@router.get("", response_model=List[ProductResponse])
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