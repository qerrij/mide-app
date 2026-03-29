from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional, List, Any
from enum import Enum


class SoldProductPeriodType(str, Enum):
    TODAY = "today"
    WEEK = "week"
    MONTH = "month"
    QUARTER = "quarter"
    YEAR = "year"
    CUSTOM = "custom"


class SoldProductTrendType(str, Enum):
    UP = "up"
    DOWN = "down"
    STABLE = "stable"


# ==================== БАЗОВЫЕ СХЕМЫ ====================

class SoldProductPeriodInfo(BaseModel):
    """Информация о периоде для статистики продаж"""
    period: str
    start_date: str
    end_date: str


# ==================== СТАТИСТИКА ПРОДАЖ ПОЛЬЗОВАТЕЛЯ ====================

class UserSoldProductStats(BaseModel):
    """Статистика проданных товаров для конкретного пользователя"""
    user_id: int
    user_name: str
    user_role: Optional[str] = None
    user_city: Optional[str] = None
    total_revenue: float = 0
    total_sales_count: int = 0  # Количество продаж (транзакций)
    total_quantity: int = 0      # Общее количество товаров
    average_revenue: float = 0
    
    class Config:
        from_attributes = True


# ==================== ОБЗОРНАЯ СТАТИСТИКА ПРОДАЖ ====================

class SoldProductsOverviewResponse(BaseModel):
    """Общая статистика по проданным товарам"""
    period: str
    start_date: str
    end_date: str
    
    total_revenue: float
    total_sales_count: int
    total_quantity: int
    average_revenue: float
    active_sellers: int
    
    # Динамика изменений
    revenue_change: Optional[float] = None
    revenue_change_percent: Optional[float] = None
    revenue_trend: Optional[SoldProductTrendType] = None
    
    sales_change: Optional[float] = None
    sales_change_percent: Optional[float] = None
    sales_trend: Optional[SoldProductTrendType] = None
    
    class Config:
        from_attributes = True


# ==================== СТАТИСТИКА ПРОДАЖ ПО ПРОДАВЦАМ ====================

class SellerSoldProductStats(BaseModel):
    """Статистика проданных товаров продавцом"""
    seller_id: int
    seller_name: str
    seller_role: Optional[str] = None
    seller_city: Optional[str] = None
    
    sales_count: int
    total_quantity: int
    total_revenue: float
    average_revenue: float
    
    class Config:
        from_attributes = True


class TopSellersSoldProductsResponse(BaseModel):
    """Топ продавцов по проданным товарам"""
    period: str
    start_date: str
    end_date: str
    sellers: List[SellerSoldProductStats]
    total_sellers: int
    total_revenue: float
    
    class Config:
        from_attributes = True


class SellerSoldProductDetailStats(BaseModel):
    """Детальная статистика проданных товаров конкретного продавца"""
    seller_id: int
    seller_name: str
    seller_role: str
    seller_city: Optional[str] = None
    period: str
    start_date: str
    end_date: str
    
    total_sales: int
    total_quantity: int
    total_revenue: float
    average_revenue: float
    
    top_products: List['SoldProductStats']
    daily_trend: List['SoldProductDailyStats']
    
    class Config:
        from_attributes = True


# ==================== СТАТИСТИКА ПРОДАННЫХ ТОВАРОВ ПО ТОВАРАМ ====================

class SoldProductStats(BaseModel):
    """Статистика по конкретному товару"""
    product_id: int
    product_name: str
    product_sku: str
    category: Optional[str] = None
    
    sales_count: int
    total_quantity: int
    total_revenue: float
    average_price: float
    
    class Config:
        from_attributes = True


class TopSoldProductsResponse(BaseModel):
    """Топ проданных товаров"""
    period: str
    start_date: str
    end_date: str
    products: List[SoldProductStats]
    
    class Config:
        from_attributes = True


# ==================== СТАТИСТИКА ПРОДАННЫХ ТОВАРОВ ПО КАТЕГОРИЯМ ====================

class CategorySoldProductStats(BaseModel):
    """Статистика проданных товаров по категории"""
    category: str
    sales_count: int
    total_quantity: int
    total_revenue: float
    average_price: float
    
    class Config:
        from_attributes = True


class CategoriesSoldProductsResponse(BaseModel):
    """Статистика проданных товаров по категориям"""
    period: str
    start_date: str
    end_date: str
    categories: List[CategorySoldProductStats]
    
    class Config:
        from_attributes = True


# ==================== СТАТИСТИКА ПРОДАННЫХ ТОВАРОВ ПО ГОРОДАМ ====================

class CitySoldProductStats(BaseModel):
    """Статистика проданных товаров по городу"""
    city: str
    sales_count: int
    total_quantity: int
    total_revenue: float
    active_sellers: int
    
    class Config:
        from_attributes = True


class CitiesSoldProductsResponse(BaseModel):
    """Статистика проданных товаров по городам"""
    period: str
    start_date: str
    end_date: str
    cities: List[CitySoldProductStats]
    
    class Config:
        from_attributes = True


# ==================== ДИНАМИКА ПРОДАЖ ====================

class SoldProductDailyStats(BaseModel):
    """Ежедневная статистика проданных товаров"""
    date: str
    sales_count: int
    total_quantity: int
    total_revenue: float
    
    class Config:
        from_attributes = True


class SoldProductsTrendResponse(BaseModel):
    """Динамика продаж"""
    period: str
    start_date: str
    end_date: str
    daily_stats: List[SoldProductDailyStats]
    
    class Config:
        from_attributes = True


# ==================== СРАВНЕНИЕ ПЕРИОДОВ ====================

class SoldProductComparisonMetric(BaseModel):
    """Метрика сравнения продаж"""
    current: float
    previous: float
    change: float
    change_percent: float
    trend: SoldProductTrendType


class SoldProductsComparisonResponse(BaseModel):
    """Сравнение продаж по периодам"""
    current_period: str
    previous_period: str
    
    revenue: SoldProductComparisonMetric
    sales_count: SoldProductComparisonMetric
    quantity: SoldProductComparisonMetric
    
    class Config:
        from_attributes = True


# ==================== КОМПЛЕКСНЫЙ ДАШБОРД ====================

class SoldProductsDashboardResponse(BaseModel):
    """Комплексный дашборд проданных товаров для фронтенда"""
    period: str
    overview: SoldProductsOverviewResponse
    top_sellers: List[SellerSoldProductStats]
    top_products: List[SoldProductStats]
    categories: List[CategorySoldProductStats]
    trend: List[SoldProductDailyStats]
    
    class Config:
        from_attributes = True


# Обновляем ссылки
SellerSoldProductDetailStats.model_rebuild()