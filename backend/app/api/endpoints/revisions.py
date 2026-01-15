from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.crud.revision import crud_revision
from app.schemas.revision import (
    RevisionResponse, RevisionRequest, RevisionUpdate, 
    RevisionVerify, RevisionFill, RevisionFilter,
    RevisionStatus, RevisionType,
    RevisionFillingCreate, RevisionFillingResponse,
    RevisionSummaryResponse
)
from app.api.dependencies import get_current_user, require_roles
from app.models.user import User, UserRole
from app.core.file_utils import save_uploaded_files, validate_files
import json
import uuid
from pathlib import Path
from datetime import datetime
from sqlalchemy import func

router = APIRouter(prefix="/revisions", tags=["revisions"])


@router.get("/", response_model=List[RevisionResponse])
def get_revisions(
    skip: int = 0,
    limit: int = 100,
    status: Optional[RevisionStatus] = None,
    type: Optional[RevisionType] = None,
    target_user_id: Optional[int] = None,
    target_group_id: Optional[int] = None,
    target_cluster_id: Optional[int] = None,
    requested_by_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить список ревизий с фильтрами"""
    
    # Преобразуем даты
    date_from_dt = None
    date_to_dt = None
    
    if date_from:
        try:
            date_from_dt = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
        except:
            try:
                date_from_dt = datetime.strptime(date_from, '%Y-%m-%d')
            except:
                pass
    
    if date_to:
        try:
            date_to_dt = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
        except:
            try:
                date_to_dt = datetime.strptime(date_to, '%Y-%m-%d')
            except:
                pass
    
    # Создаем фильтры
    filters = {
        'status': status,
        'type': type,
        'target_user_id': target_user_id,
        'target_group_id': target_group_id,
        'target_cluster_id': target_cluster_id,
        'requested_by_id': requested_by_id,
        'date_from': date_from_dt,
        'date_to': date_to_dt,
    }
    
    # Убираем None значения
    filters = {k: v for k, v in filters.items() if v is not None}
    
    # В зависимости от роли пользователя показываем разные данные
    if current_user.role in [UserRole.OWNER, UserRole.ADMIN, UserRole.SENIOR_SELLER]:
        # Руководители видят все ревизии с фильтрами
        revisions = crud_revision.get_all(db, skip=skip, limit=limit, filters=filters)
    else:
        # Обычные пользователи видят только свои ревизии
        revisions = crud_revision.get_revisions_for_user(
            db, 
            user_id=current_user.id,
            skip=skip,
            limit=limit
        )
    
    # Для каждой ревизии добавляем статистику
    for revision in revisions:
        if revision.type in [RevisionType.GROUP, RevisionType.CLUSTER, RevisionType.CITY, RevisionType.GENERAL]:
            # Для групповых ревизий считаем статистику
            from app.models.revision import RevisionFilling
            total_filled = db.query(RevisionFilling).filter(
                RevisionFilling.revision_id == revision.id,
                RevisionFilling.is_completed == True
            ).count()
            
            total_users = len(crud_revision._get_users_for_revision(db, revision))
            
            revision.total_filled = total_filled
            revision.total_users = total_users
            revision.is_group_revision = True
            
            # Если текущий пользователь не владелец ревизии, показываем только его заполнение
            if revision.requested_by_id != current_user.id:
                # Получаем заполнение текущего пользователя
                user_filling = crud_revision.get_user_filling(db, revision.id, current_user.id)
                revision.fillings = [user_filling] if user_filling else []
    
    return revisions


@router.get("/my", response_model=List[RevisionResponse])
def get_my_revisions(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить ревизии, доступные текущему пользователю"""
    revisions = crud_revision.get_revisions_for_user(
        db, 
        user_id=current_user.id,
        skip=skip,
        limit=limit
    )
    
    # Для каждой ревизии добавляем статистику
    for revision in revisions:
        if revision.type in [RevisionType.GROUP, RevisionType.CLUSTER, RevisionType.CITY, RevisionType.GENERAL]:
            from app.models.revision import RevisionFilling
            total_filled = db.query(RevisionFilling).filter(
                RevisionFilling.revision_id == revision.id,
                RevisionFilling.is_completed == True
            ).count()
            
            total_users = len(crud_revision._get_users_for_revision(db, revision))
            
            revision.total_filled = total_filled
            revision.total_users = total_users
            revision.is_group_revision = True
            
            # Если текущий пользователь не владелец ревизии, показываем только его заполнение
            if revision.requested_by_id != current_user.id:
                user_filling = crud_revision.get_user_filling(db, revision.id, current_user.id)
                revision.fillings = [user_filling] if user_filling else []
    
    return revisions


@router.get("/{revision_id}", response_model=RevisionResponse)
def get_revision(
    revision_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить ревизию по ID"""
    result = crud_revision.get_with_summary(db, revision_id, current_user.id)
    if not result or not result['revision']:
        raise HTTPException(status_code=404, detail="Ревизия не найдена")
    
    revision = result['revision']
    
    # Для обычного пользователя показываем только его заполнение
    if revision.type != RevisionType.USER and revision.requested_by_id != current_user.id:
        # Это не владелец ревизии, показываем только его данные
        user_filling = result['user_filling']
        
        # Создаем копию ревизии с обновленными данными
        revision.fillings = [user_filling] if user_filling else []
        revision.total_filled = 1 if user_filling and user_filling.is_completed else 0
        revision.total_users = 1
        revision.is_group_revision = revision.type in [
            RevisionType.GROUP, RevisionType.CLUSTER, RevisionType.CITY, RevisionType.GENERAL
        ]
        
        return revision
    
    # Для владельца ревизии показываем все
    revision.total_filled = result['total_filled']
    revision.total_users = result['total_users']
    revision.is_group_revision = revision.type in [
        RevisionType.GROUP, RevisionType.CLUSTER, RevisionType.CITY, RevisionType.GENERAL
    ]
    
    return revision


@router.post("/request", response_model=RevisionResponse, status_code=status.HTTP_201_CREATED)
def request_revision(
    revision_request: RevisionRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Запросить ревизию"""
    # Проверяем права
    if current_user.role == UserRole.MENTOR:
        raise HTTPException(
            status_code=403, 
            detail="Менторы не могут запрашивать ревизии"
        )
    
    try:
        revision = crud_revision.create_request(
            db, 
            revision_in=revision_request, 
            requested_by_id=current_user.id
        )
        
        # Добавляем статистику для ответа
        revision.total_filled = 0
        revision.total_users = len(crud_revision._get_users_for_revision(db, revision))
        revision.is_group_revision = revision.type in [
            RevisionType.GROUP, RevisionType.CLUSTER, RevisionType.CITY, RevisionType.GENERAL
        ]
        
        return revision
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{revision_id}/fill", response_model=RevisionFillingResponse)
async def fill_revision(
    revision_id: int,
    items_data: str = Form(...),
    photos: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Заполнить ревизию данными (новая версия с заполнениями)"""
    
    try:
        # Парсим JSON с товарами
        items_json = json.loads(items_data)
        
        # Проверяем фото
        if not photos:
            raise HTTPException(
                status_code=400,
                detail="Необходимо загрузить хотя бы одну фотографию"
            )
        
        # Валидируем файлы
        errors = validate_files(photos)
        if errors:
            raise HTTPException(
                status_code=400,
                detail="; ".join(errors)
            )
        
        # Создаем временный ID для папки
        temp_folder_id = str(uuid.uuid4().hex)[:8]
        
        # Сохраняем фото
        photo_paths = save_uploaded_files(photos, f"revisions/{temp_folder_id}")
        
        # Создаем DTO для заполнения
        fill_data = RevisionFillingCreate(
            user_id=current_user.id,
            items=[{'product_id': item['product_id'], 
                    'category_id': item['category_id'], 
                    'quantity': item['quantity']} 
                   for item in items_json],
            photos=photo_paths
        )
        
        # Заполняем ревизию
        filling = crud_revision.create_or_update_filling(
            db,
            revision_id=revision_id,
            filling_data=fill_data,
            user_id=current_user.id
        )
        
        # Получаем ревизию для переименования папки
        revision = crud_revision.get(db, revision_id)
        if revision:
            # Переименовываем папку с фото на реальные ID
            import os
            temp_dir = Path(f"uploads/revisions/{temp_folder_id}")
            real_dir = Path(f"uploads/revisions/{revision_id}/{current_user.id}")
            
            if temp_dir.exists():
                # Создаем целевую директорию
                real_dir.parent.mkdir(parents=True, exist_ok=True)
                
                # Обновляем пути в БД
                new_photo_paths = []
                for old_path in photo_paths:
                    new_path = old_path.replace(temp_folder_id, f"{revision_id}/{current_user.id}")
                    new_photo_paths.append(new_path)
                
                # Обновляем фото в БД
                filling.photos = new_photo_paths
                db.commit()
                
                # Переименовываем папку
                try:
                    os.rename(str(temp_dir), str(real_dir))
                except Exception as e:
                    print(f"Не удалось переименовать папку: {e}")
        
        return filling
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Неверный формат JSON: {str(e)}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка сервера: {str(e)}")


@router.get("/{revision_id}/my-filling", response_model=RevisionFillingResponse)
def get_my_filling(
    revision_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить моё заполнение ревизии"""
    filling = crud_revision.get_user_filling(db, revision_id, current_user.id)
    if not filling:
        raise HTTPException(status_code=404, detail="Заполнение не найдено")
    
    return filling


@router.post("/{revision_id}/verify", response_model=RevisionResponse)
def verify_revision(
    revision_id: int,
    verify_data: RevisionVerify,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Проверить ревизию (сверка с остатками) - только тот, кто запросил"""
    
    # Проверяем права
    if current_user.role == UserRole.MENTOR:
        raise HTTPException(
            status_code=403, 
            detail="Менторы не могут проверять ревизии"
        )
    
    try:
        # Создаем DTO для проверки
        update_data = RevisionUpdate(
            status=RevisionStatus.VERIFIED,
            verification_comment=verify_data.verification_comment
        )
        
        revision = crud_revision.verify_revision(
            db,
            revision_id=revision_id,
            verify_data=update_data,
            verified_by_id=current_user.id
        )
        
        # Добавляем статистику для ответа
        revision.total_filled = result['total_filled'] if (result := crud_revision.get_with_summary(db, revision_id, current_user.id)) else 0
        revision.total_users = len(crud_revision._get_users_for_revision(db, revision))
        revision.is_group_revision = revision.type in [
            RevisionType.GROUP, RevisionType.CLUSTER, RevisionType.CITY, RevisionType.GENERAL
        ]
        
        return revision
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{revision_id}/summary", response_model=RevisionSummaryResponse)
def get_revision_summary(
    revision_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить детальную сводку по ревизии (только для владельца ревизии)"""
    result = crud_revision.get_revision_summary(db, revision_id)
    if not result or not result['revision']:
        raise HTTPException(status_code=404, detail="Ревизия не найдена")
    
    # Проверяем, что текущий пользователь - владелец ревизии
    if result['revision'].requested_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    return result


@router.get("/{revision_id}/discrepancies")
def get_revision_discrepancies(
    revision_id: int,
    by_user: bool = False,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить расхождения по ревизии"""
    revision = crud_revision.get(db, revision_id)
    if not revision:
        raise HTTPException(status_code=404, detail="Ревизия не найдена")
    
    # Проверяем права доступа
    if revision.requested_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    # Проверяем, что ревизия уже проверена
    if revision.status != RevisionStatus.VERIFIED:
        raise HTTPException(
            status_code=400, 
            detail="Ревизия еще не проверена"
        )
    
    # Группируем расхождения по продуктам или пользователям
    from collections import defaultdict
    
    if by_user:
        # По пользователям
        user_discrepancies = defaultdict(list)
        
        for disc in revision.discrepancies:
            user_key = disc.user_id
            if user_key not in user_discrepancies:
                user_discrepancies[user_key] = {
                    "user_id": disc.user_id,
                    "user_name": disc.user.full_name if disc.user else None,
                    "discrepancies": [],
                    "total_discrepancy": 0,
                    "total_positive": 0,
                    "total_negative": 0
                }
            
            user_discrepancies[user_key]["discrepancies"].append({
                "product_id": disc.product_id,
                "product_name": disc.product.name if disc.product else None,
                "product_sku": disc.product.sku if disc.product else None,
                "expected": disc.expected_quantity,
                "actual": disc.actual_quantity,
                "discrepancy": disc.discrepancy,
                "is_positive": disc.is_positive
            })
            
            user_discrepancies[user_key]["total_discrepancy"] += disc.discrepancy
            if disc.is_positive:
                user_discrepancies[user_key]["total_positive"] += disc.discrepancy
            else:
                user_discrepancies[user_key]["total_negative"] += abs(disc.discrepancy)
        
        return list(user_discrepancies.values())
    
    else:
        # По продуктам
        product_discrepancies = defaultdict(list)
        
        for disc in revision.discrepancies:
            product_key = disc.product_id
            if product_key not in product_discrepancies:
                product_discrepancies[product_key] = {
                    "product_id": disc.product_id,
                    "product_name": disc.product.name if disc.product else None,
                    "product_sku": disc.product.sku if disc.product else None,
                    "category_name": disc.product.category.name if disc.product and disc.product.category else None,
                    "discrepancies": [],
                    "total_discrepancy": 0,
                    "total_positive": 0,
                    "total_negative": 0,
                    "users_with_discrepancies": set()
                }
            
            product_discrepancies[product_key]["discrepancies"].append({
                "user_id": disc.user_id,
                "user_name": disc.user.full_name if disc.user else None,
                "expected": disc.expected_quantity,
                "actual": disc.actual_quantity,
                "discrepancy": disc.discrepancy,
                "is_positive": disc.is_positive
            })
            
            product_discrepancies[product_key]["total_discrepancy"] += disc.discrepancy
            if disc.is_positive:
                product_discrepancies[product_key]["total_positive"] += disc.discrepancy
            else:
                product_discrepancies[product_key]["total_negative"] += abs(disc.discrepancy)
            
            product_discrepancies[product_key]["users_with_discrepancies"].add(disc.user_id)
        
        # Преобразуем sets в lists
        for product_id in product_discrepancies:
            product_discrepancies[product_id]["users_with_discrepancies"] = list(
                product_discrepancies[product_id]["users_with_discrepancies"]
            )
            product_discrepancies[product_id]["has_discrepancies"] = (
                product_discrepancies[product_id]["total_discrepancy"] != 0
            )
        
        return list(product_discrepancies.values())


@router.get("/stats/overview")
def get_revisions_overview(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles([UserRole.OWNER, UserRole.ADMIN, UserRole.SENIOR_SELLER]))
):
    """Получить обзор статистики по ревизиям"""
    
    from datetime import datetime, timedelta
    from sqlalchemy import func
    
    # Преобразуем даты
    date_from_dt = None
    date_to_dt = None
    
    if date_from:
        try:
            date_from_dt = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
        except:
            try:
                date_from_dt = datetime.strptime(date_from, '%Y-%m-%d')
            except:
                pass
    else:
        # По умолчанию - последние 30 дней
        date_from_dt = datetime.now() - timedelta(days=30)
    
    if date_to:
        try:
            date_to_dt = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
        except:
            try:
                date_to_dt = datetime.strptime(date_to, '%Y-%m-%d')
            except:
                pass
    else:
        date_to_dt = datetime.now()
    
    from app.models.revision import Revision, RevisionDiscrepancy
    
    # Общая статистика по ревизиям
    total_revisions = db.query(func.count(Revision.id))\
        .filter(
            Revision.requested_at >= date_from_dt,
            Revision.requested_at <= date_to_dt
        )\
        .scalar() or 0
    
    completed_revisions = db.query(func.count(Revision.id))\
        .filter(
            Revision.requested_at >= date_from_dt,
            Revision.requested_at <= date_to_dt,
            Revision.status == RevisionStatus.VERIFIED
        )\
        .scalar() or 0
    
    # Статистика по расхождениям
    total_discrepancies = db.query(func.count(RevisionDiscrepancy.id))\
        .join(Revision)\
        .filter(
            Revision.requested_at >= date_from_dt,
            Revision.requested_at <= date_to_dt,
            Revision.status == RevisionStatus.VERIFIED
        )\
        .scalar() or 0
    
    total_quantity_diff = db.query(func.sum(RevisionDiscrepancy.discrepancy))\
        .join(Revision)\
        .filter(
            Revision.requested_at >= date_from_dt,
            Revision.requested_at <= date_to_dt,
            Revision.status == RevisionStatus.VERIFIED
        )\
        .scalar() or 0
    
    # Статистика по типам ревизий
    revisions_by_type = db.query(
        Revision.type,
        func.count(Revision.id).label('count')
    )\
        .filter(
            Revision.requested_at >= date_from_dt,
            Revision.requested_at <= date_to_dt
        )\
        .group_by(Revision.type)\
        .all()
    
    return {
        "period": {
            "from": date_from_dt.isoformat(),
            "to": date_to_dt.isoformat()
        },
        "total_revisions": total_revisions,
        "completed_revisions": completed_revisions,
        "completion_rate": (completed_revisions / total_revisions * 100) if total_revisions > 0 else 0,
        "total_discrepancies": total_discrepancies,
        "total_quantity_difference": total_quantity_diff,
        "revisions_by_type": [
            {"type": r.type.value, "count": r.count} for r in revisions_by_type
        ]
    }

@router.get("/{revision_id}/discrepancies-by-user")
def get_discrepancies_by_user(
    revision_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить расхождения по пользователям"""
    revision = crud_revision.get(db, revision_id)
    if not revision:
        raise HTTPException(status_code=404, detail="Ревизия не найдена")
    
    # Проверяем права доступа - только владелец ревизии может видеть расхождения
    if revision.requested_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    # Проверяем, что ревизия проверена
    if revision.status != RevisionStatus.VERIFIED:
        raise HTTPException(status_code=400, detail="Ревизия еще не проверена")
    
    # Получаем расхождения по пользователям из базы
    from app.models.revision import RevisionDiscrepancy
    from sqlalchemy import func
    
    # Группируем расхождения по пользователям
    discrepancies_by_user = db.query(
        RevisionDiscrepancy.user_id,
        func.sum(RevisionDiscrepancy.discrepancy).label('total_discrepancy'),
        func.sum(
            func.case(
                (RevisionDiscrepancy.is_positive == True, RevisionDiscrepancy.discrepancy),
                else_=0
            )
        ).label('positive_total'),
        func.sum(
            func.case(
                (RevisionDiscrepancy.is_positive == False, func.abs(RevisionDiscrepancy.discrepancy)),
                else_=0
            )
        ).label('negative_total')
    ).filter(
        RevisionDiscrepancy.revision_id == revision_id
    ).group_by(
        RevisionDiscrepancy.user_id
    ).all()
    
    # Получаем детали для каждого пользователя
    result = []
    for user_data in discrepancies_by_user:
        # Получаем детальные расхождения для этого пользователя
        user_discrepancies = db.query(RevisionDiscrepancy)\
            .options(
                joinedload(RevisionDiscrepancy.product),
                joinedload(RevisionDiscrepancy.user)
            )\
            .filter(
                RevisionDiscrepancy.revision_id == revision_id,
                RevisionDiscrepancy.user_id == user_data.user_id
            )\
            .all()
        
        # Получаем информацию о пользователе
        user = db.query(User).filter(User.id == user_data.user_id).first()
        
        discrepancies_list = []
        for disc in user_discrepancies:
            product = disc.product
            discrepancies_list.append({
                'product_id': disc.product_id,
                'product_name': product.name if product else f'Товар {disc.product_id}',
                'product_sku': product.sku if product else f'SKU{disc.product_id}',
                'expected': disc.expected_quantity,
                'actual': disc.actual_quantity,
                'discrepancy': disc.discrepancy,
                'is_positive': disc.is_positive
            })
        
        result.append({
            'user_id': user_data.user_id,
            'user_name': user.full_name if user else f'Пользователь {user_data.user_id}',
            'total_discrepancy': user_data.total_discrepancy or 0,
            'positive_total': user_data.positive_total or 0,
            'negative_total': user_data.negative_total or 0,
            'discrepancies': discrepancies_list
        })
    
    return result


@router.get("/{revision_id}/discrepancies-by-product")
def get_discrepancies_by_product(
    revision_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить расхождения по продуктам"""
    revision = crud_revision.get(db, revision_id)
    if not revision:
        raise HTTPException(status_code=404, detail="Ревизия не найдена")
    
    # Проверяем права доступа - только владелец ревизии может видеть расхождения
    if revision.requested_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    # Проверяем, что ревизия проверена
    if revision.status != RevisionStatus.VERIFIED:
        raise HTTPException(status_code=400, detail="Ревизия еще не проверена")
    
    # Получаем расхождения по продуктам из базы
    from app.models.revision import RevisionDiscrepancy
    from sqlalchemy import func
    
    # Группируем расхождения по продуктам
    discrepancies_by_product = db.query(
        RevisionDiscrepancy.product_id,
        func.sum(RevisionDiscrepancy.discrepancy).label('total_discrepancy'),
        func.sum(
            func.case(
                (RevisionDiscrepancy.is_positive == True, RevisionDiscrepancy.discrepancy),
                else_=0
            )
        ).label('positive_total'),
        func.sum(
            func.case(
                (RevisionDiscrepancy.is_positive == False, func.abs(RevisionDiscrepancy.discrepancy)),
                else_=0
            )
        ).label('negative_total')
    ).filter(
        RevisionDiscrepancy.revision_id == revision_id
    ).group_by(
        RevisionDiscrepancy.product_id
    ).all()
    
    # Получаем детали для каждого продукта
    result = []
    for product_data in discrepancies_by_product:
        # Получаем детальные расхождения для этого продукта
        product_discrepancies = db.query(RevisionDiscrepancy)\
            .options(
                joinedload(RevisionDiscrepancy.product),
                joinedload(RevisionDiscrepancy.user)
            )\
            .filter(
                RevisionDiscrepancy.revision_id == revision_id,
                RevisionDiscrepancy.product_id == product_data.product_id
            )\
            .all()
        
        # Получаем информацию о продукте
        from app.models.product import Product
        product = db.query(Product)\
            .options(joinedload(Product.category))\
            .filter(Product.id == product_data.product_id)\
            .first()
        
        user_discrepancies_list = []
        for disc in product_discrepancies:
            user = disc.user
            user_discrepancies_list.append({
                'user_id': disc.user_id,
                'user_name': user.full_name if user else f'Пользователь {disc.user_id}',
                'expected': disc.expected_quantity,
                'actual': disc.actual_quantity,
                'discrepancy': disc.discrepancy,
                'is_positive': disc.is_positive
            })
        
        result.append({
            'product_id': product_data.product_id,
            'product_name': product.name if product else f'Товар {product_data.product_id}',
            'product_sku': product.sku if product else f'SKU{product_data.product_id}',
            'category_name': product.category.name if product and product.category else 'Категория',
            'total_discrepancy': product_data.total_discrepancy or 0,
            'positive_total': product_data.positive_total or 0,
            'negative_total': product_data.negative_total or 0,
            'user_discrepancies': user_discrepancies_list
        })
    
    return result
