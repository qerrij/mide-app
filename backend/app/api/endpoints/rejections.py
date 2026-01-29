from typing import List, Optional
from fastapi import APIRouter, Depends, Form, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session
from datetime import date
import json

from app.database import get_db
from app.models.user import User, UserRole
from app.models.rejection import Rejection, RejectionStatus
from app.api.dependencies import get_current_user, require_roles
from app.schemas.rejection import (
    RejectionCreate, RejectionResponse, RejectionUpdate,
    RejectionProductStats, RejectionUserStats, RejectionUserProductStats,
    RejectionDetailedStats
)
from app.crud.rejection import crud_rejection
from app.core.file_utils import validate_files, save_uploaded_files, get_file_url

router = APIRouter(prefix="/rejections", tags=["rejections"])


@router.get("/available-products", response_model=List[dict])
def get_available_products_for_rejection(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Получить список товаров, доступных для брака у текущего пользователя
    """
    return crud_rejection.get_user_available_products(db, current_user.id)


@router.post("/", response_model=RejectionResponse, status_code=status.HTTP_201_CREATED)
def create_rejection(
    rejection_in_str: str = Form(..., description="Данные брака в JSON формате"),
    photos: List[UploadFile] = File(None, description="Фото брака"),
    videos: List[UploadFile] = File(None, description="Видео брака"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Создать запрос на брак товаров
    """
    # Парсим JSON строку в объект RejectionCreate
    try:
        rejection_data = json.loads(rejection_in_str)
        rejection_in = RejectionCreate(**rejection_data)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Некорректный JSON формат: {str(e)}"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ошибка валидации данных: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ошибка при обработке данных: {str(e)}"
        )
    
    # Валидация файлов
    all_files = []
    if photos:
        all_files.extend(photos)
    if videos:
        all_files.extend(videos)
    
    if all_files:
        errors = validate_files(all_files)
        if errors:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"file_errors": errors}
            )
    
    try:
        # Сохраняем файлы
        photo_paths = []
        video_paths = []
        
        if photos:
            photo_paths = save_uploaded_files(photos, f"rejections/{current_user.id}/photos")
        
        if videos:
            video_paths = save_uploaded_files(videos, f"rejections/{current_user.id}/videos")
        
        # Создаем брак
        rejection = crud_rejection.create(
            db=db,
            user_id=current_user.id,
            rejection_in=rejection_in,
            photo_paths=photo_paths,
            video_paths=video_paths
        )
        
        # Перезагружаем объект со связями
        db.refresh(rejection)
        
        # Загружаем связанные данные
        rejection = crud_rejection.get(db, rejection.id)
        if not rejection:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Не удалось создать запрос на брак"
            )
        
        # Преобразуем объект в словарь для обработки
        rejection_dict = {
            'id': rejection.id,
            'user_id': rejection.user_id,
            'user_name': rejection.user.full_name if rejection.user else None,
            'user_role': rejection.user.role.value if rejection.user else None,
            'comment': rejection.comment,
            'status': rejection.status,
            'total_items': rejection.total_items,
            'total_value': rejection.total_value,
            'created_at': rejection.created_at,
            'updated_at': rejection.updated_at,
            'reviewed_at': rejection.reviewed_at,
            'reviewed_by': rejection.reviewed_by,
            'reviewer_name': rejection.reviewer.full_name if rejection.reviewer else None,
            'items': []
        }
        
        # Обрабатываем пути файлов
        if rejection.photo_paths:
            try:
                paths = json.loads(rejection.photo_paths) if isinstance(rejection.photo_paths, str) else rejection.photo_paths
                if photo_paths:  # Если есть новые фото, обновляем пути с URL
                    paths = photo_paths
                rejection_dict['photo_paths'] = [get_file_url(p) for p in paths]
            except:
                rejection_dict['photo_paths'] = []
        else:
            rejection_dict['photo_paths'] = []
        
        if rejection.video_paths:
            try:
                paths = json.loads(rejection.video_paths) if isinstance(rejection.video_paths, str) else rejection.video_paths
                if video_paths:  # Если есть новые видео, обновляем пути с URL
                    paths = video_paths
                rejection_dict['video_paths'] = [get_file_url(v) for v in paths]
            except:
                rejection_dict['video_paths'] = []
        else:
            rejection_dict['video_paths'] = []
        
        # Обрабатываем items
        for item in rejection.items:
            item_dict = {
                'id': item.id,
                'product_id': item.product_id,
                'quantity': item.quantity,
                'unit_price': item.unit_price,
                'total_price': item.total_price
            }
            
            # Добавляем информацию о товаре если есть
            if item.product:
                item_dict['product_name'] = item.product.name
                item_dict['product_sku'] = item.product.sku
                if item.product.category:
                    item_dict['category_name'] = item.product.category.name
                else:
                    item_dict['category_name'] = None
            else:
                item_dict['product_name'] = None
                item_dict['product_sku'] = None
                item_dict['category_name'] = None
            
            rejection_dict['items'].append(item_dict)
        
        return RejectionResponse(**rejection_dict)
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        print(f"Ошибка при создании брака: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при создании брака: {str(e)}"
        )


@router.get("/my", response_model=List[RejectionResponse])
def get_my_rejections(
    skip: int = 0,
    limit: int = 100,
    status: Optional[RejectionStatus] = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Получить список моих запросов на брак
    """
    rejections = crud_rejection.get_user_rejections(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        status=status
    )
    
    return [_prepare_rejection_response(rejection, db) for rejection in rejections]


@router.get("/", response_model=List[RejectionResponse])
def get_all_rejections(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[RejectionStatus] = Query(None),
    user_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    product_id: Optional[int] = Query(None),
    cluster_id: Optional[int] = Query(None),
    mentor_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Получить все запросы на брак (с фильтрацией по ролям)
    """
    rejections = crud_rejection.get_all_with_filters(
        db=db,
        current_user=current_user,
        skip=skip,
        limit=limit,
        status=status,
        user_id=user_id,
        date_from=date_from,
        date_to=date_to,
        product_id=product_id,
        cluster_id=cluster_id,
        mentor_id=mentor_id
    )
    
    # Подготавливаем ответ для каждого брака
    return [_prepare_rejection_response(rejection, db) for rejection in rejections]


@router.get("/{rejection_id}", response_model=RejectionResponse)
def get_rejection(
    rejection_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Получить информацию о браке по ID
    """
    rejection = crud_rejection.get(db, rejection_id)
    if not rejection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Запрос на брак не найден"
        )
    
    # Проверка прав доступа
    if current_user.role == UserRole.SELLER and rejection.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к этому запросу на брак"
        )
    
    return _prepare_rejection_response(rejection, db)


@router.put("/{rejection_id}/status", response_model=RejectionResponse)
def update_rejection_status(
    rejection_id: int,
    status_update: RejectionUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Обновить статус брака (только OWNER и ADMIN)
    """
    if not status_update.status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Не указан статус"
        )
    
    # Проверяем права доступа
    if current_user.role not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Только OWNER и ADMIN могут менять статус брака"
        )
    
    rejection = crud_rejection.get(db, rejection_id)
    if not rejection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Запрос на брак не найден"
        )
    
    # Для OWNER - доступ ко всем бракам
    if current_user.role == UserRole.OWNER:
        pass  # Владелец имеет доступ ко всем бракам
    
    # Для ADMIN - проверяем права доступа
    elif current_user.role == UserRole.ADMIN:
        user = db.query(User).filter(User.id == rejection.user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Нет прав для управления этим запросом на брак"
            )
        
        # Получаем список кустов администратора
        admin_clusters = []
        if current_user.admin_clusters:
            if isinstance(current_user.admin_clusters, str):
                try:
                    admin_clusters = json.loads(current_user.admin_clusters)
                except json.JSONDecodeError:
                    admin_clusters = []
            elif isinstance(current_user.admin_clusters, list):
                admin_clusters = current_user.admin_clusters
        
        if not admin_clusters:
            # Если у администратора нет кустов, он не может управлять чужими браками
            if rejection.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Нет прав для управления этим запросом на брак"
                )
        else:
            # Проверяем, принадлежит ли пользователь к кустам администратора
            user_cluster_id = user.cluster_id
            
            # Преобразуем ID кустов в целые числа для сравнения
            try:
                cluster_ids = []
                for cluster_id in admin_clusters:
                    if cluster_id is not None:
                        cluster_ids.append(int(cluster_id))
                
                if not user_cluster_id or int(user_cluster_id) not in cluster_ids:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Нет прав для управления этим запросом на брак"
                    )
            except (ValueError, TypeError):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Нет прав для управления этим запросом на брак"
                )
    
    updated_rejection = crud_rejection.update_status(
        db=db,
        rejection_id=rejection_id,
        status=status_update.status,
        reviewer_id=current_user.id,
        comment=status_update.comment
    )
    
    if not updated_rejection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Запрос на брак не найден"
        )
    
    return _prepare_rejection_response(updated_rejection, db)


def _prepare_rejection_response(rejection: Rejection, db: Session) -> dict:
    """Подготовить ответ для запроса на брак"""
    # Если связи не загружены, загружаем их
    if not rejection.user or not rejection.items:
        # Перезагружаем объект со связями
        rejection = crud_rejection.get(db, rejection.id)
        if not rejection:
            return None
    
    response_dict = {
        'id': rejection.id,
        'user_id': rejection.user_id,
        'user_name': rejection.user.full_name if rejection.user else None,
        'user_role': rejection.user.role.value if rejection.user else None,
        'comment': rejection.comment,
        'status': rejection.status,
        'total_items': rejection.total_items,
        'total_value': rejection.total_value,
        'created_at': rejection.created_at,
        'updated_at': rejection.updated_at,
        'reviewed_at': rejection.reviewed_at,
        'reviewed_by': rejection.reviewed_by,
        'reviewer_name': rejection.reviewer.full_name if rejection.reviewer else None,
        'items': []
    }
    
    # Обрабатываем пути файлов
    if rejection.photo_paths:
        try:
            paths = json.loads(rejection.photo_paths) if isinstance(rejection.photo_paths, str) else rejection.photo_paths
            response_dict['photo_paths'] = [get_file_url(p) for p in paths]
        except:
            response_dict['photo_paths'] = []
    else:
        response_dict['photo_paths'] = []
    
    if rejection.video_paths:
        try:
            paths = json.loads(rejection.video_paths) if isinstance(rejection.video_paths, str) else rejection.video_paths
            response_dict['video_paths'] = [get_file_url(v) for v in paths]
        except:
            response_dict['video_paths'] = []
    else:
        response_dict['video_paths'] = []
    
    # Обрабатываем items
    for item in rejection.items:
        item_dict = {
            'id': item.id,
            'product_id': item.product_id,
            'quantity': item.quantity,
            'unit_price': item.unit_price,
            'total_price': item.total_price
        }
        
        # Загружаем product если не загружен
        if not item.product:
            from app.models.product import Product
            item.product = db.query(Product).filter(Product.id == item.product_id).first()
        
        # Добавляем информацию о товаре если есть
        if item.product:
            item_dict['product_name'] = item.product.name
            item_dict['product_sku'] = item.product.sku
            
            # Загружаем category если не загружена
            if not hasattr(item.product, 'category') or not item.product.category:
                from app.models.product import ProductCategory
                item.product.category = db.query(ProductCategory).filter(
                    ProductCategory.id == item.product.category_id
                ).first()
            
            if item.product.category:
                item_dict['category_name'] = item.product.category.name
            else:
                item_dict['category_name'] = None
        else:
            item_dict['product_name'] = None
            item_dict['product_sku'] = None
            item_dict['category_name'] = None
        
        response_dict['items'].append(item_dict)
    
    return response_dict


@router.delete("/{rejection_id}/cancel", status_code=status.HTTP_204_NO_CONTENT)
def cancel_rejection(
    rejection_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Отменить свой запрос на брак (только если статус PENDING)
    """
    success = crud_rejection.cancel_rejection(db, rejection_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Невозможно отменить запрос на брак"
        )
    
    return None


@router.get("/stats/products", response_model=List[RejectionProductStats])
def get_product_rejection_stats(
    product_id: Optional[int] = Query(None, description="ID товара для фильтрации"),
    category_id: Optional[int] = Query(None, description="ID категории для фильтрации"),
    date_from: Optional[date] = Query(None, description="Дата начала периода"),
    date_to: Optional[date] = Query(None, description="Дата окончания периода"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Получить статистику браков по товарам
    
    Показывает сколько каждого товара было браковано (только утвержденные браки)
    """
    try:
        stats = crud_rejection.get_product_rejection_stats(
            db=db,
            current_user=current_user,
            product_id=product_id,
            category_id=category_id,
            date_from=date_from,
            date_to=date_to
        )
        
        return stats
        
    except Exception as e:
        print(f"Error in get_product_rejection_stats: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении статистики: {str(e)}"
        )


@router.get("/stats/users", response_model=List[RejectionUserStats])
def get_user_rejection_stats(
    user_id: Optional[int] = Query(None, description="ID пользователя для детальной статистики"),
    date_from: Optional[date] = Query(None, description="Дата начала периода"),
    date_to: Optional[date] = Query(None, description="Дата окончания периода"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Получить статистику браков по пользователям
    
    Показывает сколько каждый пользователь браковал товаров (только утвержденные браки)
    """
    try:
        stats = crud_rejection.get_user_rejection_stats(
            db=db,
            current_user=current_user,
            user_id=user_id,
            date_from=date_from,
            date_to=date_to
        )
        
        return stats
        
    except Exception as e:
        print(f"Error in get_user_rejection_stats: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении статистики: {str(e)}"
        )


@router.get("/stats/user-products", response_model=List[RejectionUserProductStats])
def get_user_product_rejection_stats(
    user_id: Optional[int] = Query(None, description="ID пользователя"),
    product_id: Optional[int] = Query(None, description="ID товара для фильтрации"),
    category_id: Optional[int] = Query(None, description="ID категории для фильтрации"),
    product_name: Optional[str] = Query(None, description="Название товара (поиск)"),
    date_from: Optional[date] = Query(None, description="Дата начала периода"),
    date_to: Optional[date] = Query(None, description="Дата окончания периода"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Получить детальную статистику браков по пользователю и товарам
    
    Показывает сколько каждого товара браковал конкретный пользователь
    (или все пользователи, если user_id не указан)
    Фильтрация по товару, категории, названию товара
    """
    try:
        stats = crud_rejection.get_user_product_rejection_stats(
            db=db,
            current_user=current_user,
            user_id=user_id,
            product_id=product_id,
            category_id=category_id,
            product_name=product_name,
            date_from=date_from,
            date_to=date_to
        )
        
        return stats
        
    except Exception as e:
        print(f"Error in get_user_product_rejection_stats: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении статистики: {str(e)}"
        )


@router.get("/stats/detailed", response_model=RejectionDetailedStats)
def get_detailed_rejection_stats(
    period: str = Query("all_time", description="Период: month, year, all_time"),
    date_from: Optional[date] = Query(None, description="Дата начала периода"),
    date_to: Optional[date] = Query(None, description="Дата окончания периода"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Получить детальную сводную статистику по бракам
    
    Общее количество бракованных товаров, стоимость, пользователей, товаров
    При period='month' добавляется статистика по месяцам
    """
    try:
        if period not in ["month", "year", "all_time"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Период должен быть: month, year или all_time"
            )
        
        stats = crud_rejection.get_detailed_rejection_stats(
            db=db,
            current_user=current_user,
            period=period,
            date_from=date_from,
            date_to=date_to
        )
        
        return stats
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_detailed_rejection_stats: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении статистики: {str(e)}"
        )