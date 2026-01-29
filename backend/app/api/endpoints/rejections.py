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
    CombinedRejectionStats, RejectionCreate, RejectionResponse, RejectionUpdate, RejectionUserStats, RejectionUserProductStats,
    RejectionDetailedStats, UserRejectionDetailedStats, UserRejectionStatsDetail
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
    
@router.get("/stats/combined", response_model=CombinedRejectionStats)
def get_combined_rejection_stats(
    user_id: Optional[int] = Query(None, description="ID пользователя (по умолчанию - текущий)"),
    date_from: Optional[date] = Query(None, description="Дата начала периода"),
    date_to: Optional[date] = Query(None, description="Дата окончания периода"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Получить объединенную статистику браков за один запрос
    
    ВНИМАНИЕ: возвращаются только те пользователи и подчиненные, у которых был брак!
    """
    try:
        stats = crud_rejection.get_combined_rejection_stats(
            db=db,
            current_user=current_user,
            user_id=user_id,
            date_from=date_from,
            date_to=date_to
        )
        
        return CombinedRejectionStats(**stats)
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except Exception as e:
        print(f"Error in get_combined_rejection_stats: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении статистики: {str(e)}"
        )


@router.get("/stats/team-detailed", response_model=UserRejectionDetailedStats)
def get_team_detailed_rejection_stats(
    date_from: Optional[date] = Query(None, description="Дата начала периода"),
    date_to: Optional[date] = Query(None, description="Дата окончания периода"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Получить детальную статистику браков для команды
    
    Возвращает полную статистику по текущему пользователю 
    и всем его подчиненным с детализацией по товарам
    
    ВНИМАНИЕ: возвращаются только те подчиненные, у которых был брак!
    """
    try:
        # Получаем статистику текущего пользователя
        user_stats_list = crud_rejection.get_user_rejection_stats(
            db=db,
            current_user=current_user,
            user_id=current_user.id,
            date_from=date_from,
            date_to=date_to
        )
        
        # Базовые данные текущего пользователя
        current_user_info = db.query(User).filter(User.id == current_user.id).first()
        
        user_stat = user_stats_list[0] if user_stats_list else {
            "user_id": current_user.id,
            "user_name": current_user.full_name,
            "user_role": current_user.role.value,
            "cluster_id": current_user.cluster_id,
            "cluster_name": None,
            "total_rejections": 0,
            "total_value": 0,
            "products_count": 0
        }
        
        # Получаем детальную статистику по товарам текущего пользователя
        user_products = crud_rejection.get_user_product_rejection_stats(
            db=db,
            current_user=current_user,
            user_id=current_user.id,
            date_from=date_from,
            date_to=date_to
        )
        
        # Получаем информацию о менторе текущего пользователя
        mentor_name = None
        if current_user_info and current_user_info.mentor_id:
            mentor = db.query(User).filter(User.id == current_user_info.mentor_id).first()
            mentor_name = mentor.full_name if mentor else None
        
        # Формируем детальную статистику текущего пользователя
        current_user_detail = {
            "user_id": user_stat["user_id"],
            "user_name": user_stat["user_name"],
            "user_role": user_stat["user_role"],
            "cluster_id": user_stat["cluster_id"],
            "cluster_name": user_stat["cluster_name"],
            "mentor_id": current_user_info.mentor_id if current_user_info else None,
            "mentor_name": mentor_name,
            "total_rejections": user_stat.get("total_rejections", 0),
            "total_items": sum(p.get("total_rejected", 0) for p in user_products),
            "total_value": user_stat.get("total_value", 0),
            "products_count": len(user_products),
            "products": user_products
        }
        
        # Получаем подчиненных ТОЛЬКО с браком
        subordinates = []
        if current_user.role in [UserRole.OWNER, UserRole.ADMIN, UserRole.MENTOR, UserRole.SENIOR_SELLER]:
            # Получаем ID всех видимых пользователей
            visible_user_ids = crud_rejection._get_visible_user_ids(db, current_user)
            
            # Убираем текущего пользователя из списка
            subordinate_ids = [uid for uid in visible_user_ids if uid != current_user.id]
            
            for sub_id in subordinate_ids:
                # Получаем информацию о подчиненном
                subordinate_user = db.query(User).filter(User.id == sub_id).first()
                if not subordinate_user:
                    continue
                
                # Получаем статистику подчиненного
                sub_stats_list = crud_rejection.get_user_rejection_stats(
                    db=db,
                    current_user=current_user,
                    user_id=sub_id,
                    date_from=date_from,
                    date_to=date_to
                )
                
                # Пропускаем подчиненных без брака
                if not sub_stats_list:
                    continue
                
                sub_stat = sub_stats_list[0]
                
                # Пропускаем подчиненных с нулевой статистикой
                if sub_stat.get("total_rejections", 0) == 0 and sub_stat.get("total_value", 0) == 0:
                    continue
                
                # Получаем детальную статистику по товарам
                sub_products = crud_rejection.get_user_product_rejection_stats(
                    db=db,
                    current_user=current_user,
                    user_id=sub_id,
                    date_from=date_from,
                    date_to=date_to
                )
                
                # Получаем информацию о менторе подчиненного
                sub_mentor_name = None
                if subordinate_user.mentor_id:
                    mentor = db.query(User).filter(User.id == subordinate_user.mentor_id).first()
                    sub_mentor_name = mentor.full_name if mentor else None
                
                # Формируем детальную статистику
                subordinate_detail = {
                    "user_id": sub_stat["user_id"],
                    "user_name": sub_stat["user_name"],
                    "user_role": sub_stat["user_role"],
                    "cluster_id": sub_stat["cluster_id"],
                    "cluster_name": sub_stat["cluster_name"],
                    "mentor_id": subordinate_user.mentor_id,
                    "mentor_name": sub_mentor_name,
                    "total_rejections": sub_stat.get("total_rejections", 0),
                    "total_items": sum(p.get("total_rejected", 0) for p in sub_products),
                    "total_value": sub_stat.get("total_value", 0),
                    "products_count": len(sub_products),
                    "products": sub_products
                }
                
                subordinates.append(subordinate_detail)
        
        # Вычисляем общую статистику
        all_users_data = []
        if current_user_detail["total_rejections"] > 0 or current_user_detail["total_value"] > 0:
            all_users_data.append(current_user_detail)
        all_users_data.extend(subordinates)
        
        total_stats = {
            "total_users": len(all_users_data),
            "total_rejections": sum(u.get("total_rejections", 0) for u in all_users_data),
            "total_items": sum(u.get("total_items", 0) for u in all_users_data),
            "total_value": sum(u.get("total_value", 0) for u in all_users_data),
            "total_products": len(set(
                p["product_id"]
                for u in all_users_data
                for p in u.get("products", [])
            )),
            "date_range": {
                "from": date_from.isoformat() if date_from else None,
                "to": date_to.isoformat() if date_to else None
            }
        }
        
        # Для response_model преобразуем
        current_user_for_response = RejectionUserStats(**{
            "user_id": current_user_detail["user_id"],
            "user_name": current_user_detail["user_name"],
            "user_role": current_user_detail["user_role"],
            "cluster_id": current_user_detail["cluster_id"],
            "cluster_name": current_user_detail["cluster_name"],
            "total_rejections": current_user_detail["total_rejections"],
            "total_value": current_user_detail["total_value"],
            "products_count": current_user_detail["products_count"]
        })
        
        subordinates_for_response = [
            UserRejectionStatsDetail(**sub) for sub in subordinates
        ]
        
        return UserRejectionDetailedStats(
            current_user=current_user_for_response,
            subordinates=subordinates_for_response,
            total_stats=total_stats
        )
        
    except Exception as e:
        print(f"Error in get_team_detailed_rejection_stats: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении статистики: {str(e)}"
        )