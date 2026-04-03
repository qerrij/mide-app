from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, asc, and_
from datetime import datetime, timedelta, date
from typing import List, Dict, Optional, Any, Tuple
from app.models.sold_product import SoldProduct, SaleType
from app.models.user import User, UserRole
from app.models.product import Product
from app.models.category import ProductCategory
from app.models.city import City
from app.schemas.sold_product_statistics import (
    SoldProductsOverviewResponse, SellerSoldProductStats, 
    SoldProductStats, CategorySoldProductStats, 
    SoldProductDailyStats, SellerSoldProductDetailStats
)


class SoldProductStatisticsService:
    """
    Сервис для формирования статистики проданных товаров
    ПРАВИЛА ДОСТУПА:
    - OWNER: все продажи + фильтрация по городу
    - Все остальные: только свои продажи
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def _check_user_can_view_sold_products(self, user: User) -> bool:
        """Проверка, может ли пользователь просматривать статистику"""
        if user.role == UserRole.ACCOUNTANT:
            return False
        return True
    
    def get_date_range(
        self, 
        period: str = "month", 
        custom_start: Optional[date] = None,
        custom_end: Optional[date] = None
    ) -> Tuple[datetime, datetime]:
        """Получить даты для фильтрации"""
        now = datetime.now()
        
        if period == "today":
            start = datetime(now.year, now.month, now.day, 0, 0, 0)
            end = start + timedelta(days=1)
        elif period == "week":
            start = now - timedelta(days=now.weekday())
            start = datetime(start.year, start.month, start.day, 0, 0, 0)
            end = start + timedelta(days=7)
        elif period == "month":
            start = datetime(now.year, now.month, 1, 0, 0, 0)
            if now.month == 12:
                end = datetime(now.year + 1, 1, 1, 0, 0, 0)
            else:
                end = datetime(now.year, now.month + 1, 1, 0, 0, 0)
        elif period == "quarter":
            quarter = (now.month - 1) // 3
            start_month = quarter * 3 + 1
            start = datetime(now.year, start_month, 1, 0, 0, 0)
            if start_month == 10:
                end = datetime(now.year + 1, 1, 1, 0, 0, 0)
            else:
                end = datetime(now.year, start_month + 3, 1, 0, 0, 0)
        elif period == "year":
            start = datetime(now.year, 1, 1, 0, 0, 0)
            end = datetime(now.year + 1, 1, 1, 0, 0, 0)
        elif period == "custom" and custom_start and custom_end:
            start = datetime.combine(custom_start, datetime.min.time())
            end = datetime.combine(custom_end, datetime.max.time())
        else:
            start = datetime(now.year, now.month, 1, 0, 0, 0)
            if now.month == 12:
                end = datetime(now.year + 1, 1, 1, 0, 0, 0)
            else:
                end = datetime(now.year, now.month + 1, 1, 0, 0, 0)
        
        return start, end
    
    def _apply_filters(self, query, user: User, city_id: Optional[int] = None):
        """
        Применить фильтры по пользователю и городу
        """
        if user.role == UserRole.OWNER:
            # OWNER: фильтр по городу (если указан)
            if city_id:
                return query.filter(SoldProduct.seller_city_id == city_id)
            return query
        else:
            # Обычные пользователи: только свои продажи
            return query.filter(SoldProduct.seller_id == user.id)
    
    def _get_seller_city_name(self, seller_id: int) -> Optional[str]:
        """Получить название города продавца"""
        user = self.db.query(User).filter(User.id == seller_id).first()
        if user and user.city_id:
            city = self.db.query(City).filter(City.id == user.city_id).first()
            return city.name if city else None
        return None
    
    # ==================== ОБЩАЯ СТАТИСТИКА ====================
    
    def get_overview(
        self, 
        user: User,
        period: str = "month",
        custom_start: Optional[date] = None,
        custom_end: Optional[date] = None,
        city_id: Optional[int] = None
    ) -> Optional[SoldProductsOverviewResponse]:
        """Получить общую статистику"""
        if not self._check_user_can_view_sold_products(user):
            return None
        
        start_date, end_date = self.get_date_range(period, custom_start, custom_end)
        
        query = self.db.query(
            func.count(SoldProduct.id).label('total_sales'),
            func.sum(SoldProduct.total_amount).label('total_revenue'),
            func.avg(SoldProduct.total_amount).label('avg_revenue'),
            func.sum(SoldProduct.quantity).label('total_quantity'),
            func.count(func.distinct(SoldProduct.seller_id)).label('active_sellers')
        ).filter(
            SoldProduct.approved_date >= start_date,
            SoldProduct.approved_date < end_date
        )
        
        query = self._apply_filters(query, user, city_id)
        result = query.first()
        
        # Для динамики изменений (только для OWNER)
        revenue_change = None
        sales_change = None
        
        if user.role == UserRole.OWNER:
            # Получаем предыдущий период для сравнения
            duration = (end_date - start_date).days
            prev_start = start_date - timedelta(days=duration)
            prev_end = start_date
            
            prev_query = self.db.query(
                func.sum(SoldProduct.total_amount).label('prev_revenue'),
                func.count(SoldProduct.id).label('prev_sales')
            ).filter(
                SoldProduct.approved_date >= prev_start,
                SoldProduct.approved_date < prev_end
            )
            prev_query = self._apply_filters(prev_query, user, city_id)
            prev_result = prev_query.first()
            
            if prev_result.prev_revenue and prev_result.prev_revenue > 0:
                revenue_change = ((float(result.total_revenue or 0) - float(prev_result.prev_revenue)) / float(prev_result.prev_revenue)) * 100
            if prev_result.prev_sales and prev_result.prev_sales > 0:
                sales_change = ((result.total_sales or 0) - prev_result.prev_sales) / prev_result.prev_sales * 100
        
        return SoldProductsOverviewResponse(
            period=period,
            start_date=start_date.isoformat(),
            end_date=end_date.isoformat(),
            total_revenue=float(result.total_revenue or 0),
            total_sales_count=result.total_sales or 0,
            total_quantity=result.total_quantity or 0,
            average_revenue=float(result.avg_revenue or 0),
            active_sellers=result.active_sellers or 0,
            revenue_change_percent=revenue_change,
            sales_change_percent=sales_change
        )
    
    # ==================== ДИНАМИКА ПРОДАЖ ====================
    
    def get_daily_trend(
        self, 
        user: User,
        period: str = "month",
        custom_start: Optional[date] = None,
        custom_end: Optional[date] = None,
        city_id: Optional[int] = None
    ) -> Optional[Dict]:
        """Получить ежедневную динамику продаж"""
        if not self._check_user_can_view_sold_products(user):
            return None
        
        start_date, end_date = self.get_date_range(period, custom_start, custom_end)
        
        query = self.db.query(
            func.date(SoldProduct.approved_date).label('date'),
            func.count(SoldProduct.id).label('sales_count'),
            func.sum(SoldProduct.quantity).label('total_quantity'),
            func.sum(SoldProduct.total_amount).label('total_revenue')
        ).filter(
            SoldProduct.approved_date >= start_date,
            SoldProduct.approved_date < end_date
        )
        
        query = self._apply_filters(query, user, city_id)
        query = query.group_by(func.date(SoldProduct.approved_date)).order_by(func.date(SoldProduct.approved_date))
        
        results = query.all()
        
        daily_stats = [
            SoldProductDailyStats(
                date=r.date.isoformat() if r.date else None,
                sales_count=r.sales_count,
                total_quantity=r.total_quantity,
                total_revenue=float(r.total_revenue or 0)
            )
            for r in results
        ]
        
        return {
            'period': period,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'daily_stats': daily_stats
        }
    
    # ==================== ПРОДАВЦЫ (только для OWNER) ====================
    
    def get_sellers_stats(
        self, 
        user: User,
        period: str = "month",
        custom_start: Optional[date] = None,
        custom_end: Optional[date] = None,
        city_id: Optional[int] = None,
        search: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> Optional[Dict]:
        """
        Получить статистику по продавцам с пагинацией и поиском
        Доступно только для OWNER
        """
        if user.role != UserRole.OWNER:
            return None
        
        start_date, end_date = self.get_date_range(period, custom_start, custom_end)
        
        # Базовый запрос
        query = self.db.query(
            SoldProduct.seller_id,
            SoldProduct.seller_name,
            SoldProduct.seller_role,
            func.count(SoldProduct.id).label('sales_count'),
            func.sum(SoldProduct.quantity).label('total_quantity'),
            func.sum(SoldProduct.total_amount).label('total_revenue'),
            func.avg(SoldProduct.total_amount).label('average_revenue')
        ).filter(
            SoldProduct.approved_date >= start_date,
            SoldProduct.approved_date < end_date
        )
        
        # Фильтр по городу
        if city_id:
            query = query.filter(SoldProduct.seller_city_id == city_id)
        
        query = query.group_by(
            SoldProduct.seller_id,
            SoldProduct.seller_name,
            SoldProduct.seller_role,
        )
        
        # Поиск по имени
        if search:
            query = query.filter(SoldProduct.seller_name.ilike(f'%{search}%'))
        
        # Общее количество
        total_count = query.count()
        
        # Пагинация и сортировка
        results = query.order_by(desc('total_revenue')).offset(offset).limit(limit).all()
        
        sellers = []
        for r in results:
            city_name = self._get_seller_city_name(r.seller_id)
            
            # Получаем динамику продавца за период
            trend_query = self.db.query(
                func.date(SoldProduct.approved_date).label('date'),
                func.sum(SoldProduct.total_amount).label('revenue')
            ).filter(
                SoldProduct.seller_id == r.seller_id,
                SoldProduct.approved_date >= start_date,
                SoldProduct.approved_date < end_date
            ).group_by(func.date(SoldProduct.approved_date)).order_by(func.date(SoldProduct.approved_date))
            
            trend = [
                {'date': t.date.isoformat(), 'revenue': float(t.revenue or 0)}
                for t in trend_query.all()
            ]
            
            sellers.append({
                'seller_id': r.seller_id,
                'seller_name': r.seller_name,
                'seller_role': r.seller_role,
                'seller_city': city_name,
                'sales_count': r.sales_count,
                'total_quantity': r.total_quantity,
                'total_revenue': float(r.total_revenue or 0),
                'average_revenue': float(r.average_revenue or 0),
                'trend': trend
            })
        
        return {
            'period': period,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'sellers': sellers,
            'total_count': total_count,
            'limit': limit,
            'offset': offset
        }
    
    def get_seller_detail(
        self, 
        user: User,
        seller_id: int,
        period: str = "month",
        custom_start: Optional[date] = None,
        custom_end: Optional[date] = None
    ) -> Optional[Dict]:
        """Получить детальную статистику продавца"""
        if not self._check_user_can_view_sold_products(user):
            return None
        
        # Проверка доступа: OWNER или сам продавец
        if user.role != UserRole.OWNER and user.id != seller_id:
            return None
        
        start_date, end_date = self.get_date_range(period, custom_start, custom_end)
        
        seller = self.db.query(User).filter(User.id == seller_id).first()
        if not seller:
            return None
        
        # Название города
        city_name = None
        if seller.city_id:
            city = self.db.query(City).filter(City.id == seller.city_id).first()
            city_name = city.name if city else None
        
        # Общая статистика
        stats = self.db.query(
            func.count(SoldProduct.id).label('total_sales'),
            func.sum(SoldProduct.quantity).label('total_quantity'),
            func.sum(SoldProduct.total_amount).label('total_revenue'),
            func.avg(SoldProduct.total_amount).label('average_revenue')
        ).filter(
            SoldProduct.seller_id == seller_id,
            SoldProduct.approved_date >= start_date,
            SoldProduct.approved_date < end_date
        ).first()
        
        # Топ товаров
        product_stats = self.db.query(
            SoldProduct.product_id,
            SoldProduct.product_name,
            SoldProduct.product_sku,
            SoldProduct.product_category_name,
            func.sum(SoldProduct.quantity).label('quantity'),
            func.sum(SoldProduct.total_amount).label('revenue'),
            func.avg(SoldProduct.unit_price).label('avg_price')
        ).filter(
            SoldProduct.seller_id == seller_id,
            SoldProduct.approved_date >= start_date,
            SoldProduct.approved_date < end_date
        ).group_by(
            SoldProduct.product_id,
            SoldProduct.product_name,
            SoldProduct.product_sku,
            SoldProduct.product_category_name
        ).order_by(desc('revenue')).limit(10).all()
        
        # Ежедневная динамика
        daily_trend = self.db.query(
            func.date(SoldProduct.approved_date).label('date'),
            func.count(SoldProduct.id).label('sales_count'),
            func.sum(SoldProduct.quantity).label('total_quantity'),
            func.sum(SoldProduct.total_amount).label('total_revenue')
        ).filter(
            SoldProduct.seller_id == seller_id,
            SoldProduct.approved_date >= start_date,
            SoldProduct.approved_date < end_date
        ).group_by(func.date(SoldProduct.approved_date)).order_by(func.date(SoldProduct.approved_date)).all()
        
        return {
            'seller_id': seller_id,
            'seller_name': seller.full_name,
            'seller_role': seller.role.value,
            'seller_city': city_name,
            'period': period,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'total_sales': stats.total_sales or 0,
            'total_quantity': stats.total_quantity or 0,
            'total_revenue': float(stats.total_revenue or 0),
            'average_revenue': float(stats.average_revenue or 0),
            'top_products': [
                {
                    'product_id': p.product_id,
                    'product_name': p.product_name,
                    'product_sku': p.product_sku,
                    'category': p.product_category_name,
                    'total_quantity': p.quantity,
                    'total_revenue': float(p.revenue or 0),
                    'average_price': float(p.avg_price or 0)
                }
                for p in product_stats
            ],
            'daily_trend': [
                {
                    'date': d.date.isoformat(),
                    'sales_count': d.sales_count,
                    'total_quantity': d.total_quantity,
                    'total_revenue': float(d.total_revenue or 0)
                }
                for d in daily_trend
            ]
        }
    
    # ==================== ТОВАРЫ (только для OWNER) ====================
    
    def get_top_products(
        self, 
        user: User,
        period: str = "month",
        custom_start: Optional[date] = None,
        custom_end: Optional[date] = None,
        city_id: Optional[int] = None,
        limit: int = 10
    ) -> Optional[Dict]:
        """Получить топ проданных товаров (только для OWNER)"""
        if user.role != UserRole.OWNER:
            return None
        
        start_date, end_date = self.get_date_range(period, custom_start, custom_end)
        
        query = self.db.query(
            SoldProduct.product_id,
            SoldProduct.product_name,
            SoldProduct.product_sku,
            SoldProduct.product_category_name,
            func.count(SoldProduct.id).label('sales_count'),
            func.sum(SoldProduct.quantity).label('total_quantity'),
            func.sum(SoldProduct.total_amount).label('total_revenue'),
            func.avg(SoldProduct.unit_price).label('average_price')
        ).filter(
            SoldProduct.approved_date >= start_date,
            SoldProduct.approved_date < end_date
        )
        
        if city_id:
            query = query.filter(SoldProduct.seller_city_id == city_id)
        
        query = query.group_by(
            SoldProduct.product_id,
            SoldProduct.product_name,
            SoldProduct.product_sku,
            SoldProduct.product_category_name
        ).order_by(desc('total_revenue')).limit(limit)
        
        results = query.all()
        
        products = [
            SoldProductStats(
                product_id=r.product_id,
                product_name=r.product_name,
                product_sku=r.product_sku,
                category=r.product_category_name,
                sales_count=r.sales_count,
                total_quantity=r.total_quantity,
                total_revenue=float(r.total_revenue or 0),
                average_price=float(r.average_price or 0)
            )
            for r in results
        ]
        
        return {
            'period': period,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'products': products
        }
    
    # ==================== КАТЕГОРИИ (только для OWNER) ====================
    
    def get_categories_stats(
        self, 
        user: User,
        period: str = "month",
        custom_start: Optional[date] = None,
        custom_end: Optional[date] = None,
        city_id: Optional[int] = None
    ) -> Optional[Dict]:
        """Получить статистику по категориям (только для OWNER)"""
        if user.role != UserRole.OWNER:
            return None
        
        start_date, end_date = self.get_date_range(period, custom_start, custom_end)
        
        query = self.db.query(
            SoldProduct.product_category_name,
            func.count(SoldProduct.id).label('sales_count'),
            func.sum(SoldProduct.quantity).label('total_quantity'),
            func.sum(SoldProduct.total_amount).label('total_revenue'),
            func.avg(SoldProduct.unit_price).label('average_price')
        ).filter(
            SoldProduct.approved_date >= start_date,
            SoldProduct.approved_date < end_date,
            SoldProduct.product_category_name.isnot(None)
        )
        
        if city_id:
            query = query.filter(SoldProduct.seller_city_id == city_id)
        
        query = query.group_by(SoldProduct.product_category_name).order_by(desc('total_revenue'))
        
        results = query.all()
        
        categories = [
            CategorySoldProductStats(
                category=r.product_category_name,
                sales_count=r.sales_count,
                total_quantity=r.total_quantity,
                total_revenue=float(r.total_revenue or 0),
                average_price=float(r.average_price or 0)
            )
            for r in results
        ]
        
        return {
            'period': period,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'categories': categories
        }
    
    # ==================== ГОРОДА (только для OWNER) ====================
    
    def get_cities_list(self, user: User) -> Optional[List[Dict]]:
        """Получить список городов для фильтрации (только для OWNER)"""
        if user.role != UserRole.OWNER:
            return None
        
        cities = self.db.query(City).filter(City.is_active == True).order_by(City.name).all()
        return [{'id': c.id, 'name': c.name} for c in cities]
    
    # ==================== ДЛЯ ОБЫЧНЫХ ПОЛЬЗОВАТЕЛЕЙ ====================
    
    def get_my_stats(
        self, 
        user: User,
        period: str = "month",
        custom_start: Optional[date] = None,
        custom_end: Optional[date] = None
    ) -> Optional[Dict]:
        """Получить полную статистику для текущего пользователя (не OWNER)"""
        if user.role == UserRole.OWNER or user.role == UserRole.ACCOUNTANT:
            return None
        
        start_date, end_date = self.get_date_range(period, custom_start, custom_end)
        
        # Общая статистика
        overview = self.db.query(
            func.count(SoldProduct.id).label('total_sales'),
            func.sum(SoldProduct.total_amount).label('total_revenue'),
            func.avg(SoldProduct.total_amount).label('avg_revenue'),
            func.sum(SoldProduct.quantity).label('total_quantity'),
        ).filter(
            SoldProduct.seller_id == user.id,
            SoldProduct.approved_date >= start_date,
            SoldProduct.approved_date < end_date
        ).first()
        
        # Динамика
        trend = self.db.query(
            func.date(SoldProduct.approved_date).label('date'),
            func.count(SoldProduct.id).label('sales_count'),
            func.sum(SoldProduct.quantity).label('total_quantity'),
            func.sum(SoldProduct.total_amount).label('total_revenue')
        ).filter(
            SoldProduct.seller_id == user.id,
            SoldProduct.approved_date >= start_date,
            SoldProduct.approved_date < end_date
        ).group_by(func.date(SoldProduct.approved_date)).order_by(func.date(SoldProduct.approved_date)).all()
        
        # Топ товаров
        top_products = self.db.query(
            SoldProduct.product_id,
            SoldProduct.product_name,
            SoldProduct.product_sku,
            SoldProduct.product_category_name,
            func.sum(SoldProduct.quantity).label('total_quantity'),
            func.sum(SoldProduct.total_amount).label('total_revenue'),
            func.avg(SoldProduct.unit_price).label('average_price')
        ).filter(
            SoldProduct.seller_id == user.id,
            SoldProduct.approved_date >= start_date,
            SoldProduct.approved_date < end_date
        ).group_by(
            SoldProduct.product_id,
            SoldProduct.product_name,
            SoldProduct.product_sku,
            SoldProduct.product_category_name
        ).order_by(desc('total_revenue')).limit(10).all()
        
        return {
            'period': period,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'overview': {
                'total_revenue': float(overview.total_revenue or 0),
                'total_sales_count': overview.total_sales or 0,
                'total_quantity': overview.total_quantity or 0,
                'average_revenue': float(overview.avg_revenue or 0),
            },
            'trend': [
                {
                    'date': t.date.isoformat(),
                    'sales_count': t.sales_count,
                    'total_quantity': t.total_quantity,
                    'total_revenue': float(t.total_revenue or 0)
                }
                for t in trend
            ],
            'top_products': [
                SoldProductStats(
                    product_id=p.product_id,
                    product_name=p.product_name,
                    product_sku=p.product_sku,
                    category=p.product_category_name,
                    sales_count=0,
                    total_quantity=p.total_quantity,
                    total_revenue=float(p.total_revenue or 0),
                    average_price=float(p.average_price or 0)
                )
                for p in top_products
            ]
        }


sold_product_statistics_service = SoldProductStatisticsService