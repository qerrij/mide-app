from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User, UserRole
from app.services.sold_product_statistics import SoldProductStatisticsService
from app.schemas.sold_product_statistics import (
    SoldProductsOverviewResponse, TopSellersSoldProductsResponse,
    TopSoldProductsResponse, CategoriesSoldProductsResponse,
    CitiesSoldProductsResponse, SoldProductsTrendResponse,
    SoldProductsComparisonResponse, SoldProductsDashboardResponse
)

router = APIRouter(prefix="/sold-products-stats", tags=["sold_products_statistics"])


@router.get("/overview", response_model=Optional[SoldProductsOverviewResponse])
def get_sold_products_overview(
    period: str = Query("month", description="Период: today, week, month, quarter, year, custom"),
    custom_start: Optional[date] = None,
    custom_end: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Получить общую статистику по проданным товарам
    
    Доступ:
    - SELLER: только свои продажи
    - MENTOR: свои + подопечных
    - SENIOR_SELLER: продажи своего куста
    - ADMIN: продажи своих кустов
    - OWNER: все продажи
    - ACCOUNTANT: НЕТ ДОСТУПА (403)
    """
    if current_user.role == UserRole.ACCOUNTANT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Бухгалтер не имеет доступа к статистике проданных товаров"
        )
    
    service = SoldProductStatisticsService(db)
    result = service.get_overview(current_user, period, custom_start, custom_end)
    
    if result is None:
        raise HTTPException(status_code=403, detail="Нет доступа к статистике")
    
    return result


@router.get("/sellers/top", response_model=Optional[dict])
def get_top_sellers_by_sold_products(
    period: str = Query("month", description="Период"),
    limit: int = Query(10, ge=1, le=50),
    custom_start: Optional[date] = None,
    custom_end: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить топ продавцов по количеству проданных товаров"""
    if current_user.role == UserRole.ACCOUNTANT:
        raise HTTPException(status_code=403, detail="Нет доступа")
    
    service = SoldProductStatisticsService(db)
    result = service.get_top_sellers(current_user, period, limit, custom_start, custom_end)
    
    if result is None:
        raise HTTPException(status_code=403, detail="Нет доступа")
    
    return result


@router.get("/sellers/{seller_id}")
def get_seller_sold_products_detail(
    seller_id: int,
    period: str = Query("month", description="Период"),
    custom_start: Optional[date] = None,
    custom_end: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить детальную статистику проданных товаров продавца"""
    if current_user.role == UserRole.ACCOUNTANT:
        raise HTTPException(status_code=403, detail="Нет доступа")
    
    service = SoldProductStatisticsService(db)
    result = service.get_seller_detail(current_user, seller_id, period, custom_start, custom_end)
    
    if result is None:
        raise HTTPException(status_code=404, detail="Продавец не найден или нет доступа")
    
    return result


@router.get("/products/top", response_model=Optional[dict])
def get_top_sold_products(
    period: str = Query("month", description="Период"),
    limit: int = Query(10, ge=1, le=50),
    custom_start: Optional[date] = None,
    custom_end: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить топ проданных товаров"""
    if current_user.role == UserRole.ACCOUNTANT:
        raise HTTPException(status_code=403, detail="Нет доступа")
    
    service = SoldProductStatisticsService(db)
    result = service.get_top_products(current_user, period, limit, custom_start, custom_end)
    
    if result is None:
        raise HTTPException(status_code=403, detail="Нет доступа")
    
    return result


@router.get("/categories", response_model=Optional[dict])
def get_sold_products_by_categories(
    period: str = Query("month", description="Период"),
    custom_start: Optional[date] = None,
    custom_end: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить статистику проданных товаров по категориям"""
    if current_user.role == UserRole.ACCOUNTANT:
        raise HTTPException(status_code=403, detail="Нет доступа")
    
    service = SoldProductStatisticsService(db)
    result = service.get_categories_stats(current_user, period, custom_start, custom_end)
    
    if result is None:
        raise HTTPException(status_code=403, detail="Нет доступа")
    
    return result


@router.get("/cities", response_model=Optional[dict])
def get_sold_products_by_cities(
    period: str = Query("month", description="Период"),
    custom_start: Optional[date] = None,
    custom_end: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить статистику проданных товаров по городам"""
    if current_user.role == UserRole.ACCOUNTANT:
        raise HTTPException(status_code=403, detail="Нет доступа")
    
    service = SoldProductStatisticsService(db)
    result = service.get_cities_stats(current_user, period, custom_start, custom_end)
    
    if result is None:
        raise HTTPException(status_code=403, detail="Нет доступа")
    
    return result


@router.get("/trend", response_model=Optional[dict])
def get_sold_products_trend(
    period: str = Query("month", description="Период"),
    custom_start: Optional[date] = None,
    custom_end: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить ежедневную динамику продаж"""
    if current_user.role == UserRole.ACCOUNTANT:
        raise HTTPException(status_code=403, detail="Нет доступа")
    
    service = SoldProductStatisticsService(db)
    result = service.get_daily_trend(current_user, period, custom_start, custom_end)
    
    if result is None:
        raise HTTPException(status_code=403, detail="Нет доступа")
    
    return result


@router.get("/comparison", response_model=Optional[dict])
def compare_sold_products_periods(
    current_period: str = Query("month", description="Текущий период"),
    previous_period: str = Query("month", description="Предыдущий период"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Сравнение продаж с предыдущим периодом"""
    if current_user.role == UserRole.ACCOUNTANT:
        raise HTTPException(status_code=403, detail="Нет доступа")
    
    service = SoldProductStatisticsService(db)
    result = service.get_comparison(current_user, current_period, previous_period)
    
    if result is None:
        raise HTTPException(status_code=403, detail="Нет доступа")
    
    return result


@router.get("/dashboard", response_model=Optional[dict])
def get_sold_products_dashboard(
    period: str = Query("month", description="Период"),
    custom_start: Optional[date] = None,
    custom_end: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить все данные для дашборда проданных товаров одним запросом"""
    if current_user.role == UserRole.ACCOUNTANT:
        raise HTTPException(status_code=403, detail="Нет доступа")
    
    service = SoldProductStatisticsService(db)
    result = service.get_dashboard(current_user, period, custom_start, custom_end)
    
    if result is None:
        raise HTTPException(status_code=403, detail="Нет доступа")
    
    return result


@router.get("/admin/all", response_model=Optional[dict])
def get_all_sold_products_admin(
    period: str = Query("month", description="Период"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Полная статистика проданных товаров для OWNER
    Доступно только OWNER
    """
    if current_user.role != UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Только владелец")
    
    service = SoldProductStatisticsService(db)
    result = service.get_dashboard(current_user, period)
    
    return result