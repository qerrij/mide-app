from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.crud.transfer import crud_transfer
from app.schemas.transfer import (
    TransferCreate, TransferResponse, TransferDetailResponse,
    TransferUpdate, TransferApprovalRequest, TransferArrivalResponse,
    TransferCreateManagerRequest, TransferStatus, TransferRejectManagerRequest
)
from app.api.dependencies import get_current_user
from app.models.user import UserRole
from app.models.transfer import Transfer, TransferItem
import json

router = APIRouter(prefix="/transfers", tags=["transfers"])


@router.post("/user-request", response_model=TransferResponse, status_code=status.HTTP_201_CREATED)
async def create_user_transfer(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    from_user_id: int = Form(...),
    to_user_id: int = Form(...),
    executor_id: Optional[int] = Form(None),
    items_json: str = Form(...),
    files: Optional[List[UploadFile]] = File(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Создать запрос на перемещение от пользователя"""
    try:
        # Парсим товары из JSON
        items_data = json.loads(items_json)
        
        if not isinstance(items_data, list):
            raise HTTPException(status_code=400, detail="items_json должен быть JSON массивом")
        
        # Проверяем что пользователь создает перемещение от себя или имеет права
        if from_user_id != current_user.id:
            # Проверяем может ли пользователь создавать перемещения от имени другого
            if current_user.role not in [UserRole.OWNER, UserRole.ADMIN, UserRole.SENIOR_SELLER, UserRole.MENTOR]:
                raise HTTPException(status_code=403, detail="Недостаточно прав для создания перемещения от другого пользователя")
            
            # Проверяем что пользователь является руководителем для from_user_id
            if not crud_transfer._is_user_manager(db, current_user.id, from_user_id):
                raise HTTPException(status_code=403, detail="Вы не можете создавать перемещения от имени этого пользователя")
        
        # Проверяем обязательные файлы
        if not files or len(files) == 0:
            raise HTTPException(status_code=400, detail="Для создания перемещения необходимо прикрепить фотографии товаров")
        
        # Конвертируем в формат для CRUD
        items = []
        for item in items_data:
            if not isinstance(item, dict):
                raise HTTPException(status_code=400, detail="Каждый элемент items должен быть объектом")
            
            items.append({
                'product_id': item.get('product_id'),
                'expected_quantity': item.get('expected_quantity'),
                'notes': item.get('notes')
            })
        
        # Проверяем обязательные поля
        for item in items:
            if not item['product_id'] or not item['expected_quantity']:
                raise HTTPException(status_code=400, detail="Каждый товар должен содержать product_id и expected_quantity")
        
        # Создаем перемещение
        transfer = crud_transfer.create_user_request(
            db,
            transfer_in={
                'title': title,
                'description': description,
                'from_user_id': from_user_id,
                'to_user_id': to_user_id,
                'executor_id': executor_id,
                'request_type': 'user_request'
            },
            items=items,
            files=files,
            created_by_id=current_user.id
        )
        
        return transfer
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Неверный формат JSON")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Ошибка создания перемещения: {e}")
        raise HTTPException(status_code=500, detail=f"Внутренняя ошибка: {str(e)}")


@router.post("/manager-request", response_model=TransferResponse, status_code=status.HTTP_201_CREATED)
def create_manager_request(
    request: TransferCreateManagerRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Создать запрос на перемещение от руководителя"""
    if current_user.role not in [UserRole.OWNER, UserRole.ADMIN, UserRole.SENIOR_SELLER, UserRole.MENTOR]:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    try:
        # Проверяем что руководитель имеет право на этих пользователей
        if not crud_transfer._is_user_manager(db, current_user.id, request.from_user_id):
            raise HTTPException(status_code=403, detail="Вы не можете запрашивать перемещение у этого пользователя")
        
        # Создаем запрос
        transfer = crud_transfer.create_manager_request(
            db,
            transfer_in=request.dict(),
            items=[item.dict() for item in request.items],
            created_by_id=current_user.id
        )
        
        return transfer
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Ошибка создания запроса руководителя: {e}")
        raise HTTPException(status_code=500, detail=f"Внутренняя ошибка: {str(e)}")


@router.get("/manager-requests", response_model=List[TransferResponse])
def get_manager_requests(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить запросы на перемещение от руководителей, требующие подтверждения"""
    transfers = crud_transfer.get_manager_requests_for_user(
        db,
        user_id=current_user.id,
        skip=skip,
        limit=limit
    )
    
    return transfers


@router.post("/{transfer_id}/execute-manager-request", response_model=TransferResponse)
async def execute_manager_request(
    transfer_id: int,
    executor_id: Optional[int] = Form(None),
    notes: Optional[str] = Form(None),
    files: Optional[List[UploadFile]] = File(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Подтвердить и выполнить запрос перемещения от руководителя"""
    try:
        # Проверяем обязательные файлы
        if not files or len(files) == 0:
            raise HTTPException(status_code=400, detail="Для выполнения запроса необходимо прикрепить фотографии товаров")
        
        transfer = crud_transfer.execute_manager_request(
            db,
            transfer_id=transfer_id,
            executor_id=executor_id,
            files=files,
            notes=notes,
            executed_by_id=current_user.id
        )
        
        return transfer
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Ошибка выполнения запроса: {e}")
        raise HTTPException(status_code=500, detail=f"Внутренняя ошибка: {str(e)}")


@router.post("/{transfer_id}/reject-manager-request")
def reject_manager_request(
    transfer_id: int,
    request: TransferRejectManagerRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Отклонить запрос перемещения от руководителя"""
    success = crud_transfer.reject_manager_request(
        db,
        transfer_id=transfer_id,
        user_id=current_user.id,
        reason=request.reason
    )
    
    if not success:
        raise HTTPException(status_code=400, detail="Не удалось отклонить запрос")
    
    return {"message": "Запрос отклонен"}


@router.post("/{transfer_id}/approve")
def approve_transfer(
    transfer_id: int,
    approval: TransferApprovalRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Подтвердить или отклонить перемещение (для руководителей отправителя)"""
    success = crud_transfer.approve(
        db,
        transfer_id=transfer_id,
        user_id=current_user.id,
        approved=approval.approved,
        notes=approval.notes
    )
    
    if not success:
        raise HTTPException(status_code=400, detail="Не удалось подтвердить перемещение")
    
    return {"message": "Решение сохранено"}


@router.post("/{transfer_id}/start")
def start_transfer(
    transfer_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Начать выполнение перемещения (отправитель начинает перемещение)"""
    success = crud_transfer.start_transfer(
        db,
        transfer_id=transfer_id,
        user_id=current_user.id
    )
    
    if not success:
        raise HTTPException(status_code=400, detail="Не удалось начать перемещение")
    
    return {"message": "Перемещение начато"}


@router.post("/{transfer_id}/arrived")
async def mark_arrived(
    transfer_id: int,
    action: str = Form(...),
    items_json: Optional[str] = Form(None),  # Делаем необязательным
    notes: Optional[str] = Form(None),
    files: Optional[List[UploadFile]] = File(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Отметить прибытие товара"""
    try:
        # 🔴 Валидация действия
        if action not in ["accept", "reject", "discrepancy"]:
            raise HTTPException(
                status_code=400,
                detail="Действие должно быть accept, reject или discrepancy"
            )
        
        # 🔴 Валидация в зависимости от действия
        if action in ["accept", "discrepancy"]:
            # Для accept и discrepancy файлы обязательны
            if not files or len(files) == 0:
                raise HTTPException(
                    status_code=400, 
                    detail="Для приема товара необходимо прикрепить фотографии"
                )
            
            # Для accept и discrepancy items_json обязателен
            if not items_json or items_json.strip() == "":
                raise HTTPException(
                    status_code=400,
                    detail="Необходимо указать полученное количество для каждого товара"
                )
        else:
            # Для reject файлы не нужны
            # Для reject items_json может быть пустым или None
            
            # Если пришли файлы при reject - игнорируем их
            if files:
                files = None
        
        items = []
        
        if action in ["accept", "discrepancy"]:
            # Парсим товары для accept и discrepancy
            try:
                items_data = json.loads(items_json)
            except json.JSONDecodeError:
                raise HTTPException(
                    status_code=400, 
                    detail="Неверный формат JSON в items_json"
                )
            
            if not isinstance(items_data, list):
                raise HTTPException(
                    status_code=400, 
                    detail="items_json должен быть JSON массивом"
                )
            
            if len(items_data) == 0:
                raise HTTPException(
                    status_code=400,
                    detail="Необходимо указать полученное количество хотя бы для одного товара"
                )
            
            # Проверяем структуру каждого товара
            for i, item in enumerate(items_data):
                if not isinstance(item, dict):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Элемент {i} в items должен быть объектом"
                    )
                
                if 'product_id' not in item or 'actual_quantity' not in item:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Товар {i} должен содержать product_id и actual_quantity"
                    )
                
                product_id = item.get('product_id')
                actual_quantity = item.get('actual_quantity')
                
                if not isinstance(product_id, int) or product_id <= 0:
                    raise HTTPException(
                        status_code=400,
                        detail=f"product_id товара {i} должен быть положительным числом"
                    )
                
                if not isinstance(actual_quantity, int) or actual_quantity < 0:
                    raise HTTPException(
                        status_code=400,
                        detail=f"actual_quantity товара {i} должен быть неотрицательным числом"
                    )
                
                items.append({
                    'product_id': product_id,
                    'actual_quantity': actual_quantity,
                    'notes': item.get('notes')
                })
        
        # 🔴 Для reject передаем None для files и пустой список для items
        files_to_pass = files if action in ["accept", "discrepancy"] else None
        items_to_pass = items if action in ["accept", "discrepancy"] else []
        
        success = crud_transfer.mark_arrived(
            db,
            transfer_id=transfer_id,
            to_user_id=current_user.id,
            action=action,
            items=items_to_pass,
            notes=notes,
            files=files_to_pass
        )
        
        if not success:
            raise HTTPException(
                status_code=400, 
                detail="Не удалось обработать прибытие"
            )
        
        return {"message": "Статус обновлен"}
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Ошибка обработки прибытия: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail=f"Внутренняя ошибка: {str(e)}"
        )

@router.post("/{transfer_id}/approve-discrepancy")
def approve_discrepancy(
    transfer_id: int,
    approval: TransferApprovalRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Подтвердить расхождения (руководители получателя)"""
    success = crud_transfer.approve_discrepancy(
        db,
        transfer_id=transfer_id,
        user_id=current_user.id,
        approved=approval.approved,
        notes=approval.notes
    )
    
    if not success:
        raise HTTPException(status_code=400, detail="Не удалось подтвердить расхождения")
    
    return {"message": "Решение сохранено"}


@router.get("/", response_model=List[TransferResponse])
def get_transfers(
    skip: int = 0,
    limit: int = 100,
    status: Optional[TransferStatus] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Получить все перемещения пользователя:
    - Свои перемещения (где он участник)
    - Перемещения подчиненных (если он руководитель)
    - С флагом can_approve для перемещений требующих подтверждения
    """
    transfers = crud_transfer.get_user_transfers(
        db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        status=status,
        include_for_approval=True
    )
    
    return transfers


@router.get("/{transfer_id}", response_model=TransferDetailResponse)
def get_transfer(
    transfer_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить детали перемещения с флагом can_approve"""
    transfer = crud_transfer.get(db, transfer_id, current_user_id=current_user.id)
    if not transfer:
        raise HTTPException(status_code=404, detail="Перемещение не найдено")
    
    # Проверяем права доступа
    can_view = (
        transfer.created_by_id == current_user.id or
        transfer.from_user_id == current_user.id or
        transfer.to_user_id == current_user.id or
        transfer.executor_id == current_user.id or
        current_user.role in [UserRole.OWNER, UserRole.ADMIN] or
        crud_transfer._is_user_manager(db, current_user.id, transfer.from_user_id) or
        crud_transfer._is_user_manager(db, current_user.id, transfer.to_user_id)
    )
    
    if not can_view:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    return transfer


@router.put("/{transfer_id}")
def update_transfer(
    transfer_id: int,
    transfer_update: TransferUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Обновить перемещение"""
    transfer = crud_transfer.get(db, transfer_id)
    if not transfer:
        raise HTTPException(status_code=404, detail="Перемещение не найдено")
    
    # Проверяем права
    if transfer.created_by_id != current_user.id and current_user.role not in [UserRole.OWNER]:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    # Проверяем можно ли обновлять
    if transfer.status not in [TransferStatus.REQUESTED, TransferStatus.PENDING_APPROVAL]:
        raise HTTPException(status_code=400, detail="Нельзя изменить перемещение в текущем статусе")
    
    # Обновляем
    for field, value in transfer_update.dict(exclude_unset=True).items():
        if value is not None:
            setattr(transfer, field, value)
    
    db.commit()
    db.refresh(transfer)
    
    # Обогащаем данные перед возвратом
    transfer = crud_transfer._enrich_transfer_data(db, transfer)
    
    return transfer


@router.delete("/{transfer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transfer(
    transfer_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Удалить перемещение"""
    transfer = crud_transfer.get(db, transfer_id)
    if not transfer:
        raise HTTPException(status_code=404, detail="Перемещение не найдено")
    
    if transfer.created_by_id != current_user.id and current_user.role not in [UserRole.OWNER]:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    if transfer.status not in [TransferStatus.REQUESTED, TransferStatus.PENDING_APPROVAL]:
        raise HTTPException(status_code=400, detail="Нельзя удалить перемещение в текущем статусе")
    
    db.delete(transfer)
    db.commit()
    
    return None