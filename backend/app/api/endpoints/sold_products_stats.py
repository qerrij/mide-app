from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User, UserRole
from app.services.sold_product_statistics import SoldProductStatisticsService

router = APIRouter(prefix="/sold-products-stats", tags=["sold_products_statistics"])


# ==================== ОБЩАЯ СТАТИСТИКА ====================

@router.get("/overview")
def get_overview(
    period: str = Query("month", description="Период: today, week, month, quarter, year, custom"),
    custom_start: Optional[date] = None,
    custom_end: Optional[date] = None,
    city_id: Optional[int] = Query(None, description="ID города (только для OWNER)"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить общую статистику"""
    if current_user.role == UserRole.ACCOUNTANT:
        raise HTTPException(status_code=403, detail="Нет доступа")
    
    service = SoldProductStatisticsService(db)
    result = service.get_overview(current_user, period, custom_start, custom_end, city_id)
    
    if result is None:
        raise HTTPException(status_code=403, detail="Нет доступа")
    
    return result


@router.get("/trend")
def get_trend(
    period: str = Query("month", description="Период"),
    custom_start: Optional[date] = None,
    custom_end: Optional[date] = None,
    city_id: Optional[int] = Query(None, description="ID города (только для OWNER)"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить динамику продаж"""
    if current_user.role == UserRole.ACCOUNTANT:
        raise HTTPException(status_code=403, detail="Нет доступа")
    
    service = SoldProductStatisticsService(db)
    result = service.get_daily_trend(current_user, period, custom_start, custom_end, city_id)
    
    if result is None:
        raise HTTPException(status_code=403, detail="Нет доступа")
    
    return result


# ==================== ДЛЯ OWNER ====================

@router.get("/cities")
def get_cities(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить список городов для фильтрации (только OWNER)"""
    if current_user.role != UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Только для владельца")
    
    service = SoldProductStatisticsService(db)
    result = service.get_cities_list(current_user)
    
    return {"cities": result or []}


@router.get("/sellers")
def get_sellers(
    period: str = Query("month", description="Период"),
    custom_start: Optional[date] = None,
    custom_end: Optional[date] = None,
    city_id: Optional[int] = Query(None, description="Фильтр по городу"),
    limit: int = Query(100, ge=1, le=1000, description="Лимит записей"),  # Увеличил до 1000
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить список продавцов со статистикой (только OWNER)"""
    if current_user.role != UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Только для владельца")
    
    service = SoldProductStatisticsService(db)
    result = service.get_sellers_stats(
        current_user, period, custom_start, custom_end, 
        city_id, None, limit, offset  # search=None
    )
    
    return result


@router.get("/sellers/{seller_id}")
def get_seller_detail(
    seller_id: int,
    period: str = Query("month", description="Период"),
    custom_start: Optional[date] = None,
    custom_end: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить детальную статистику продавца"""
    if current_user.role == UserRole.ACCOUNTANT:
        raise HTTPException(status_code=403, detail="Нет доступа")
    
    service = SoldProductStatisticsService(db)
    result = service.get_seller_detail(current_user, seller_id, period, custom_start, custom_end)
    
    if result is None:
        raise HTTPException(status_code=404, detail="Продавец не найден или нет доступа")
    
    return result


@router.get("/products/top")
def get_top_products(
    period: str = Query("month", description="Период"),
    custom_start: Optional[date] = None,
    custom_end: Optional[date] = None,
    city_id: Optional[int] = Query(None, description="Фильтр по городу"),
    limit: int = Query(100, ge=1, le=1000, description="Лимит записей"),  # Увеличил до 1000
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить топ товаров (только OWNER)"""
    if current_user.role != UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Только для владельца")
    
    service = SoldProductStatisticsService(db)
    result = service.get_top_products(current_user, period, custom_start, custom_end, city_id, limit)
    
    return result


@router.get("/categories")
def get_categories_stats(
    period: str = Query("month", description="Период"),
    custom_start: Optional[date] = None,
    custom_end: Optional[date] = None,
    city_id: Optional[int] = Query(None, description="Фильтр по городу"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить статистику по категориям (только OWNER)"""
    if current_user.role != UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Только для владельца")
    
    service = SoldProductStatisticsService(db)
    result = service.get_categories_stats(current_user, period, custom_start, custom_end, city_id)
    
    return result


# ==================== ДЛЯ ОБЫЧНЫХ ПОЛЬЗОВАТЕЛЕЙ ====================

@router.get("/my-stats")
def get_my_stats(
    period: str = Query("month", description="Период"),
    custom_start: Optional[date] = None,
    custom_end: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить свою статистику (для SELLER, MENTOR, SENIOR_SELLER, ADMIN)"""
    if current_user.role == UserRole.OWNER:
        raise HTTPException(status_code=400, detail="Используйте /overview для владельца")
    
    if current_user.role == UserRole.ACCOUNTANT:
        raise HTTPException(status_code=403, detail="Нет доступа")
    
    service = SoldProductStatisticsService(db)
    result = service.get_my_stats(current_user, period, custom_start, custom_end)
    
    return result