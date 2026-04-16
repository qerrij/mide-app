from typing import List, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.inventory import crud_inventory
from app.crud.product import crud_product
from app.models.inventory import InventoryReservation, ReservationStatus, ReservationType, UserInventory
from app.models.product import Product
from app.models.report import Report
from app.models.transfer import Transfer
from app.schemas.product import ProductCreate
from app.schemas.inventory import ReplenishRequest, ReplenishResponse, InventoryResponse
from app.api.dependencies import get_current_user, require_role
from app.models.user import User, UserRole
from app.schemas.inventory import EditInventoryRequest

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.get("/my", response_model=InventoryResponse)
def get_my_inventory(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить свой инвентарь"""
    return crud_inventory.get_user_inventory_only(db, current_user.id)

@router.get("/my-team", response_model=InventoryResponse)
def get_my_team_inventory(
    page: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Получить инвентарь пользователя с учетом подчиненных    
    """
    # Проверяем роль и возвращаем соответствующий инвентарь
    if current_user.role == UserRole.SELLER:
        # Продавец видит только свои товары
        return crud_inventory.get_user_inventory_only(db, current_user.id)
    
    elif current_user.role == UserRole.MENTOR:
        # Наставник видит свои товары + товары подопечных
        return crud_inventory._get_mentor_inventory(db, current_user.id)
    
    elif current_user.role == UserRole.SENIOR_SELLER:
        # Старший продавец видит весь свой куст
        return crud_inventory._get_senior_seller_inventory(db, current_user.id)
    
    elif current_user.role == UserRole.ADMIN:
        # Администратор видит свои кусты
        return crud_inventory._get_admin_inventory(db, current_user.id)
    
    elif current_user.role == UserRole.OWNER:
        # Для владельца используем полную версию с пагинацией
        return crud_inventory._get_owner_inventory(
            db, 
            page=page, 
            limit=limit,
            user_filter=None,
            category_filter=None,
            product_filter=None,
            city_id=None
        )
    
    return {"quantity": 0, "items": [], "total_count": 0, "has_more": False, "page": page, "limit": limit}


@router.get("/user/{user_id}", response_model=InventoryResponse)
def get_user_inventory(
    user_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить инвентарь пользователя (только для руководителей)"""
    if current_user.role not in [UserRole.OWNER, UserRole.ADMIN, UserRole.SENIOR_SELLER, UserRole.MENTOR]:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    return crud_inventory.get_user_inventory_only(db, user_id)


@router.get("/company-total", response_model=dict)
def get_company_total_inventory(
    page: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    user_id: Optional[int] = Query(None),
    category_id: Optional[int] = Query(None),
    product_id: Optional[int] = Query(None),
    city_id: Optional[int] = Query(None),  # Изменено с city на city_id
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if current_user.role != UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    result = crud_inventory.get_total_inventory_for_user(
        db, 
        current_user.id,
        page=page,
        limit=limit,
        user_filter=user_id,
        category_filter=category_id,
        product_filter=product_id,
        city_id=city_id  # Изменено
    )
    
    return result


@router.post("/replenish", response_model=ReplenishResponse, status_code=status.HTTP_201_CREATED)
def replenish_inventory(
    replenish_data: ReplenishRequest,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    """Пополнить инвентарь (только OWNER)"""
    try:
        product_id = replenish_data.product_id
        quantity = replenish_data.quantity
        created_product = None
        
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
            
            # Обрабатываем город
            city_id = product_data.get('city_id')
            if product_data.get('city') and not city_id:
                from app.crud.city import crud_city
                city = crud_city.get_or_create(db, product_data['city'], None)
                city_id = city.id
            
            # Создаем новый товар
            from app.schemas.product import ProductCreate
            product_in = ProductCreate(
                name=product_data['name'],
                sku=product_data['sku'],
                category_id=product_data['category_id'],
                price=product_data['price'],
                description=product_data.get('description'),
                default_rate=product_data.get('default_rate', 0.0),
                city_id=city_id
            )
            
            product = crud_product.create(db, product_in=product_in)
            product_id = product.id
            
            # Получаем название города для ответа
            city_name = None
            if product.city_id:
                from app.models.city import City
                city = db.query(City).filter(City.id == product.city_id).first()
                city_name = city.name if city else None
            
            created_product = {
                "id": product.id,
                "name": product.name,
                "sku": product.sku,
                "price": product.price,
                "category_id": product.category_id,
                "city_id": product.city_id,
                "city_name": city_name
            }
        
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
        
        # Получаем обновленный инвентарь для ответа
        inventory_data = {
            "id": inventory.id,
            "user_id": inventory.user_id,
            "product_id": inventory.product_id,
            "quantity": inventory.quantity,
            "product_name": product.name,
            "product_sku": product.sku,
            "product_price": product.price
        }
        
        response = {
            "message": f"Товар успешно пополнен на {quantity} единиц",
            "inventory": inventory_data
        }
        
        if created_product:
            response["product"] = created_product
        
        return response
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Внутренняя ошибка: {str(e)}")
    


    
@router.get("/reservations/all", response_model=List[Dict])
def get_all_reservations(
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    """Получить все активные резервы (только OWNER)"""
    reservations = db.query(
        InventoryReservation,
        Product.name.label('product_name'),
        Product.sku.label('product_sku'),
        User.full_name.label('user_name')
    ).join(
        Product, InventoryReservation.product_id == Product.id
    ).join(
        User, InventoryReservation.user_id == User.id
    ).filter(
        InventoryReservation.status == ReservationStatus.ACTIVE
    ).all()
    
    result = []
    for reservation, product_name, product_sku, user_name in reservations:
        entity_info = ""
        if reservation.reservation_type == ReservationType.REPORT:
            # Получаем информацию об отчете
            report = db.query(Report).filter(Report.id == reservation.reservation_id).first()
            entity_info = f"Отчет #{reservation.reservation_id}"
            if report:
                entity_info += f" от {report.created_at.strftime('%d.%m.%Y')}"
        elif reservation.reservation_type == ReservationType.TRANSFER:
            transfer = db.query(Transfer).filter(Transfer.id == reservation.reservation_id).first()
            entity_info = f"Перемещение #{reservation.reservation_id}"
            if transfer:
                entity_info += f" '{transfer.title}'"
        elif reservation.reservation_type == ReservationType.REJECTION:
            entity_info = f"Брак #{reservation.reservation_id}"
        elif reservation.reservation_type == ReservationType.REVISION:
            entity_info = f"Ревизия #{reservation.reservation_id}"
        
        result.append({
            "id": reservation.id,
            "user_id": reservation.user_id,
            "user_name": user_name,
            "product_id": reservation.product_id,
            "product_name": product_name,
            "product_sku": product_sku,
            "quantity": reservation.quantity,
            "reservation_type": reservation.reservation_type.value,
            "reservation_id": reservation.reservation_id,
            "entity_info": entity_info,
            "created_at": reservation.created_at,
            "status": reservation.status.value
        })
    
    return result

@router.get("/reservations/{user_id}/{product_id}", response_model=List[Dict])
def get_product_reservations(
    user_id: int,
    product_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Получить все активные резервы для конкретного товара пользователя
    """
    # Проверка прав доступа
    if current_user.id != user_id:
        if current_user.role not in [UserRole.OWNER, UserRole.ADMIN, UserRole.SENIOR_SELLER, UserRole.MENTOR]:
            raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    # Получаем резервы с дополнительной информацией - используем DISTINCT
    reservations = db.query(
        InventoryReservation,
        Product.name.label('product_name'),
        Product.sku.label('product_sku')
    ).join(
        Product, InventoryReservation.product_id == Product.id
    ).filter(
        InventoryReservation.user_id == user_id,
        InventoryReservation.product_id == product_id,
        InventoryReservation.status == ReservationStatus.ACTIVE
    ).distinct(InventoryReservation.id).all()  # Добавляем distinct по ID
    
    result = []
    seen_ids = set()  # Добавляем дополнительную проверку на дубликаты
    
    for reservation, product_name, product_sku in reservations:
        # Проверяем, не обрабатывали ли мы уже этот резерв
        if reservation.id in seen_ids:
            continue
        seen_ids.add(reservation.id)
        
        entity_info = ""
        entity_details = {}
        
        if reservation.reservation_type == ReservationType.REPORT:
            report = db.query(Report).filter(Report.id == reservation.reservation_id).first()
            if report:
                entity_info = f"Отчет #{reservation.reservation_id}"
                if report.created_at:
                    entity_info += f" от {report.created_at.strftime('%d.%m.%Y %H:%M')}"
                entity_details = {
                    "id": report.id,
                    "title": f"Отчет #{report.id}",
                    "created_at": report.created_at.isoformat() if report.created_at else None,
                    "status": report.status.value if hasattr(report, 'status') else None
                }
        
        elif reservation.reservation_type == ReservationType.TRANSFER:
            transfer = db.query(Transfer).filter(Transfer.id == reservation.reservation_id).first()
            if transfer:
                entity_info = f"Перемещение #{reservation.reservation_id}"
                if transfer.title:
                    entity_info += f" '{transfer.title}'"
                if transfer.created_at:
                    entity_info += f" от {transfer.created_at.strftime('%d.%m.%Y %H:%M')}"
                entity_details = {
                    "id": transfer.id,
                    "title": transfer.title or f"Перемещение #{transfer.id}",
                    "created_at": transfer.created_at.isoformat() if transfer.created_at else None,
                    "status": transfer.status.value if hasattr(transfer, 'status') else None
                }
        
        elif reservation.reservation_type == ReservationType.REJECTION:
            entity_info = f"Брак #{reservation.reservation_id}"
            entity_details = {
                "id": reservation.reservation_id,
                "title": f"Брак #{reservation.reservation_id}",
                "created_at": None
            }
        
        elif reservation.reservation_type == ReservationType.REVISION:
            entity_info = f"Ревизия #{reservation.reservation_id}"
            entity_details = {
                "id": reservation.reservation_id,
                "title": f"Ревизия #{reservation.reservation_id}",
                "created_at": None
            }
        
        result.append({
            "id": reservation.id,
            "user_id": reservation.user_id,
            "product_id": reservation.product_id,
            "product_name": product_name,
            "product_sku": product_sku,
            "quantity": reservation.quantity,
            "reservation_type": reservation.reservation_type.value,
            "reservation_type_display": {
                "report": "Отчет",
                "transfer": "Перемещение",
                "rejection": "Брак",
                "revision": "Ревизия"
            }.get(reservation.reservation_type.value, reservation.reservation_type.value),
            "reservation_id": reservation.reservation_id,
            "entity_info": entity_info,
            "entity_details": entity_details,
            "created_at": reservation.created_at,
            "status": reservation.status.value
        })
    
    return result

@router.put("/edit")
def edit_inventory(
    data: EditInventoryRequest,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    """
    Редактировать остатки товара у пользователя (только OWNER)
    """
    try:
        # Проверяем пользователя
        user = db.query(User).filter(User.id == data.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Пользователь не найден")
        
        # Проверяем товар
        product = db.query(Product).filter(Product.id == data.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Товар не найден")
        
        # Получаем текущие данные
        inventory = db.query(UserInventory).filter(
            UserInventory.user_id == data.user_id,
            UserInventory.product_id == data.product_id
        ).first()
        
        old_quantity = inventory.quantity if inventory else 0
        
        # Проверяем резервы, если пытаемся уменьшить
        if data.quantity < old_quantity:
            reserved = db.query(func.sum(InventoryReservation.quantity)).filter(
                InventoryReservation.user_id == data.user_id,
                InventoryReservation.product_id == data.product_id,
                InventoryReservation.status == ReservationStatus.ACTIVE
            ).scalar() or 0
            
            if data.quantity < reserved:
                raise HTTPException(
                    status_code=400,
                    detail=f"Нельзя уменьшить до {data.quantity}, зарезервировано {reserved}"
                )
        
        # Обновляем
        if data.quantity > 0:
            if inventory:
                inventory.quantity = data.quantity
            else:
                inventory = UserInventory(
                    user_id=data.user_id,
                    product_id=data.product_id,
                    quantity=data.quantity
                )
                db.add(inventory)
        else:
            if inventory:
                db.delete(inventory)
        
        db.commit()
        
        return {
            "message": "Остатки обновлены",
            "user_id": data.user_id,
            "user_name": user.full_name or user.username,
            "product_id": data.product_id,
            "product_name": product.name,
            "old_quantity": old_quantity,
            "new_quantity": data.quantity
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
