from typing import List, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.inventory import crud_inventory
from app.crud.product import crud_product
from app.schemas.product import ProductCreate
from app.schemas.inventory import ReplenishRequest, InventoryResponse
from app.api.dependencies import get_current_user, require_role
from app.models.user import UserRole

router = APIRouter(prefix="/inventory", tags=["inventory"])

@router.get("/my", response_model=InventoryResponse)
def get_my_inventory(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить свой инвентарь"""
    return crud_inventory.get_total_inventory_for_user(db, current_user.id)

@router.get("/user/{user_id}", response_model=InventoryResponse)
def get_user_inventory(
    user_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить инвентарь пользователя (только для руководителей)"""
    if current_user.role not in [UserRole.OWNER, UserRole.ADMIN, UserRole.SENIOR_SELLER, UserRole.MENTOR]:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    return crud_inventory.get_total_inventory_for_user(db, user_id)

@router.get("/company-total", response_model=InventoryResponse)
def get_company_total_inventory(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить общий инвентарь компании (только OWNER)"""
    if current_user.role not in [UserRole.OWNER]:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    return crud_inventory.get_total_inventory_for_user(db, current_user.id)

@router.post("/replenish", status_code=status.HTTP_201_CREATED)
def replenish_inventory(
    replenish_data: ReplenishRequest,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    """
    Пополнить инвентарь (только OWNER)
    """
    try:
        product_id = replenish_data.product_id
        quantity = replenish_data.quantity
        
        if not quantity or quantity <= 0:
            raise HTTPException(status_code=400, detail="Неверное количество")
        
        # Если товар новый, создаем его
        if replenish_data.is_new_product and replenish_data.new_product_data:
            product_data = replenish_data.new_product_data
            
            # Проверяем обязательные поля для нового товара
            required_fields = ['name', 'sku', 'category_id', 'price']
            for field in required_fields:
                if not product_data.get(field):
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Для нового товара обязательно поле: {field}"
                    )
            
            # Создаем новый товар
            product_in = ProductCreate(
                name=product_data['name'],
                sku=product_data['sku'],
                category_id=product_data['category_id'],
                price=product_data['price'],
                description=product_data.get('description')
            )
            
            product = crud_product.create(db, product_in=product_in)
            product_id = product.id
        
        # Проверяем существование товара
        if not product_id:
            raise HTTPException(status_code=400, detail="Не указан товар")
        
        product = crud_product.get(db, product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Товар не найден")
        
        # Пополняем инвентарь владельца
        inventory = crud_inventory.update_inventory(
            db,
            user_id=current_user.id,
            product_id=product_id,
            quantity_change=quantity
        )
        
        return {
            "message": f"Товар успешно пополнен на {quantity} единиц",
            "inventory": inventory
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))