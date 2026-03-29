from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, asc, and_
from datetime import datetime, timedelta, date
from typing import List, Dict, Optional, Any, Tuple
from app.models.sold_product import SoldProduct, SaleType
from app.models.user import User, UserRole
from app.models.product import Product
from app.models.category import ProductCategory
from app.schemas.sold_product_statistics import (
    CitySoldProductStats, SoldProductsOverviewResponse, SellerSoldProductStats, 
    SoldProductStats, CategorySoldProductStats, 
    SoldProductDailyStats, SoldProductsComparisonResponse,
    SoldProductComparisonMetric, SoldProductTrendType,
    SellerSoldProductDetailStats
)


class SoldProductStatisticsService:
    """
    Сервис для формирования статистики проданных товаров
    Строгое соблюдение прав доступа:
    - SELLER: только свои продажи
    - MENTOR: свои + продажи подопечных
    - SENIOR_SELLER: продажи своего куста
    - ADMIN: продажи своих кустов
    - ACCOUNTANT: НЕТ ДОСТУПА (бухгалтер не продает товары)
    - OWNER: все продажи
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def _check_user_can_view_sold_products(self, user: User) -> bool:
        """
        Проверка, может ли пользователь просматривать статистику проданных товаров
        ACCOUNTANT не имеет доступа
        """
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
    
    def _apply_seller_filter(self, query, user: User):
        """
        Применить фильтр по роли пользователя для статистики проданных товаров
        """
        # Бухгалтер не видит статистику продаж
        if user.role == UserRole.ACCOUNTANT:
            return query.filter(SoldProduct.id == None)
        
        if user.role == UserRole.SELLER:
            return query.filter(SoldProduct.seller_id == user.id)
        
        elif user.role == UserRole.MENTOR:
            # Свои + подопечные
            subquery = self.db.query(User.id).filter(
                User.mentor_id == user.id,
                User.is_active == True
            ).subquery()
            return query.filter(
                (SoldProduct.seller_id == user.id) |
                (SoldProduct.seller_id.in_(subquery))
            )
        
        elif user.role == UserRole.SENIOR_SELLER:
            # Свой куст
            if user.cluster_id:
                subquery = self.db.query(User.id).filter(
                    User.cluster_id == user.cluster_id,
                    User.is_active == True
                ).subquery()
                return query.filter(SoldProduct.seller_id.in_(subquery))
            return query.filter(SoldProduct.seller_id == user.id)
        
        elif user.role == UserRole.ADMIN:
            # Свои кусты
            admin_clusters = []
            if user.admin_clusters:
                import json
                try:
                    admin_clusters = json.loads(user.admin_clusters) if isinstance(user.admin_clusters, str) else user.admin_clusters
                    if not isinstance(admin_clusters, list):
                        admin_clusters = []
                except:
                    admin_clusters = []
            
            if user.cluster_id and user.cluster_id not in admin_clusters:
                admin_clusters.append(user.cluster_id)
            
            if admin_clusters:
                subquery = self.db.query(User.id).filter(
                    User.cluster_id.in_(admin_clusters),
                    User.is_active == True
                ).subquery()
                return query.filter(SoldProduct.seller_id.in_(subquery))
            return query.filter(SoldProduct.seller_id == user.id)
        
        # OWNER видит всё
        return query
    
    def _get_visible_sellers(self, user: User) -> List[int]:
        """Получить список ID продавцов, чьи продажи видит пользователь"""
        if user.role == UserRole.OWNER:
            sellers = self.db.query(User.id).filter(
                User.is_active == True,
                User.role != UserRole.ACCOUNTANT
            ).all()
            return [s[0] for s in sellers]
        
        elif user.role == UserRole.ADMIN:
            admin_clusters = []
            if user.admin_clusters:
                import json
                try:
                    admin_clusters = json.loads(user.admin_clusters) if isinstance(user.admin_clusters, str) else user.admin_clusters
                except:
                    pass
            
            if user.cluster_id:
                admin_clusters.append(user.cluster_id)
            
            if admin_clusters:
                sellers = self.db.query(User.id).filter(
                    User.cluster_id.in_(admin_clusters),
                    User.is_active == True
                ).all()
                return [s[0] for s in sellers]
            return []
        
        elif user.role == UserRole.SENIOR_SELLER and user.cluster_id:
            sellers = self.db.query(User.id).filter(
                User.cluster_id == user.cluster_id,
                User.is_active == True
            ).all()
            return [s[0] for s in sellers]
        
        elif user.role == UserRole.MENTOR:
            sellers = self.db.query(User.id).filter(
                User.mentor_id == user.id,
                User.is_active == True
            ).all()
            return [user.id] + [s[0] for s in sellers]
        
        elif user.role == UserRole.SELLER:
            return [user.id]
        
        return []
    
    # ==================== ОСНОВНАЯ СТАТИСТИКА ПРОДАННЫХ ТОВАРОВ ====================
    
    def get_overview(
        self, 
        user: User,
        period: str = "month",
        custom_start: Optional[date] = None,
        custom_end: Optional[date] = None
    ) -> Optional[SoldProductsOverviewResponse]:
        """Получить общую статистику проданных товаров"""
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
        
        query = self._apply_seller_filter(query, user)
        result = query.first()
        
        return SoldProductsOverviewResponse(
            period=period,
            start_date=start_date.isoformat(),
            end_date=end_date.isoformat(),
            total_revenue=float(result.total_revenue or 0),
            total_sales_count=result.total_sales or 0,
            total_quantity=result.total_quantity or 0,
            average_revenue=float(result.avg_revenue or 0),
            active_sellers=result.active_sellers or 0
        )
    
    def get_top_sellers(
        self, 
        user: User,
        period: str = "month",
        limit: int = 10,
        custom_start: Optional[date] = None,
        custom_end: Optional[date] = None
    ) -> Optional[Dict]:
        """Получить топ продавцов по проданным товарам"""
        if not self._check_user_can_view_sold_products(user):
            return None
        
        start_date, end_date = self.get_date_range(period, custom_start, custom_end)
        
        query = self.db.query(
            SoldProduct.seller_id,
            SoldProduct.seller_name,
            SoldProduct.seller_role,
            SoldProduct.seller_city,
            func.count(SoldProduct.id).label('sales_count'),
            func.sum(SoldProduct.quantity).label('total_quantity'),
            func.sum(SoldProduct.total_amount).label('total_revenue'),
            func.avg(SoldProduct.total_amount).label('average_revenue')
        ).filter(
            SoldProduct.approved_date >= start_date,
            SoldProduct.approved_date < end_date
        )
        
        query = self._apply_seller_filter(query, user)
        query = query.group_by(
            SoldProduct.seller_id,
            SoldProduct.seller_name,
            SoldProduct.seller_role,
            SoldProduct.seller_city
        ).order_by(desc('total_revenue')).limit(limit)
        
        results = query.all()
        
        sellers = [
            SellerSoldProductStats(
                seller_id=r.seller_id,
                seller_name=r.seller_name,
                seller_role=r.seller_role,
                seller_city=r.seller_city,
                sales_count=r.sales_count,
                total_quantity=r.total_quantity,
                total_revenue=float(r.total_revenue or 0),
                average_revenue=float(r.average_revenue or 0)
            )
            for r in results
        ]
        
        return {
            'period': period,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'sellers': sellers,
            'total_sellers': len(sellers),
            'total_revenue': sum(s.total_revenue for s in sellers)
        }
    
    def get_seller_detail(
        self, 
        user: User,
        seller_id: int,
        period: str = "month",
        custom_start: Optional[date] = None,
        custom_end: Optional[date] = None
    ) -> Optional[Dict]:
        """Получить детальную статистику проданных товаров продавца"""
        if not self._check_user_can_view_sold_products(user):
            return None
        
        visible_sellers = self._get_visible_sellers(user)
        if seller_id not in visible_sellers:
            return None
        
        start_date, end_date = self.get_date_range(period, custom_start, custom_end)
        
        seller = self.db.query(User).filter(User.id == seller_id).first()
        if not seller:
            return None
        
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
        
        # Топ проданных товаров
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
            'seller_city': seller.city,
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
                    'sales_count': 0,
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
    
    def get_top_products(
        self, 
        user: User,
        period: str = "month",
        limit: int = 10,
        custom_start: Optional[date] = None,
        custom_end: Optional[date] = None
    ) -> Optional[Dict]:
        """Получить топ проданных товаров"""
        if not self._check_user_can_view_sold_products(user):
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
        
        query = self._apply_seller_filter(query, user)
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
    
    def get_categories_stats(
        self, 
        user: User,
        period: str = "month",
        custom_start: Optional[date] = None,
        custom_end: Optional[date] = None
    ) -> Optional[Dict]:
        """Получить статистику проданных товаров по категориям"""
        if not self._check_user_can_view_sold_products(user):
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
        
        query = self._apply_seller_filter(query, user)
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
    
    def get_cities_stats(
        self, 
        user: User,
        period: str = "month",
        custom_start: Optional[date] = None,
        custom_end: Optional[date] = None
    ) -> Optional[Dict]:
        """Получить статистику проданных товаров по городам"""
        if not self._check_user_can_view_sold_products(user):
            return None
        
        start_date, end_date = self.get_date_range(period, custom_start, custom_end)
        
        query = self.db.query(
            SoldProduct.seller_city,
            func.count(SoldProduct.id).label('sales_count'),
            func.sum(SoldProduct.quantity).label('total_quantity'),
            func.sum(SoldProduct.total_amount).label('total_revenue'),
            func.count(func.distinct(SoldProduct.seller_id)).label('active_sellers')
        ).filter(
            SoldProduct.approved_date >= start_date,
            SoldProduct.approved_date < end_date,
            SoldProduct.seller_city.isnot(None)
        )
        
        query = self._apply_seller_filter(query, user)
        query = query.group_by(SoldProduct.seller_city).order_by(desc('total_revenue'))
        
        results = query.all()
        
        cities = [
            CitySoldProductStats(
                city=r.seller_city,
                sales_count=r.sales_count,
                total_quantity=r.total_quantity,
                total_revenue=float(r.total_revenue or 0),
                active_sellers=r.active_sellers
            )
            for r in results
        ]
        
        return {
            'period': period,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'cities': cities
        }
    
    def get_daily_trend(
        self, 
        user: User,
        period: str = "month",
        custom_start: Optional[date] = None,
        custom_end: Optional[date] = None
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
        
        query = self._apply_seller_filter(query, user)
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
    
    def get_comparison(
        self, 
        user: User,
        current_period: str = "month",
        previous_period: str = "month"
    ) -> Optional[Dict]:
        """Сравнение продаж с предыдущим периодом"""
        if not self._check_user_can_view_sold_products(user):
            return None
        
        start_current, end_current = self.get_date_range(current_period)
        start_previous, end_previous = self.get_date_range(previous_period)
        
        def get_metrics(start, end):
            query = self.db.query(
                func.sum(SoldProduct.total_amount).label('revenue'),
                func.count(SoldProduct.id).label('sales_count'),
                func.sum(SoldProduct.quantity).label('quantity')
            ).filter(
                SoldProduct.approved_date >= start,
                SoldProduct.approved_date < end
            )
            query = self._apply_seller_filter(query, user)
            return query.first()
        
        current = get_metrics(start_current, end_current)
        previous = get_metrics(start_previous, end_previous)
        
        def calculate_metric(current_val, previous_val):
            current_val = float(current_val or 0)
            previous_val = float(previous_val or 0)
            change = current_val - previous_val
            change_percent = (change / previous_val * 100) if previous_val > 0 else 0 if change == 0 else 100 if change > 0 else -100
            trend = SoldProductTrendType.UP if change > 0 else SoldProductTrendType.DOWN if change < 0 else SoldProductTrendType.STABLE
            
            return SoldProductComparisonMetric(
                current=current_val,
                previous=previous_val,
                change=change,
                change_percent=change_percent,
                trend=trend
            )
        
        return {
            'current_period': current_period,
            'previous_period': previous_period,
            'revenue': calculate_metric(current.revenue, previous.revenue),
            'sales_count': calculate_metric(current.sales_count, previous.sales_count),
            'quantity': calculate_metric(current.quantity, previous.quantity)
        }
    
    def get_dashboard(
        self, 
        user: User,
        period: str = "month",
        custom_start: Optional[date] = None,
        custom_end: Optional[date] = None
    ) -> Optional[Dict]:
        """Получить все данные для дашборда проданных товаров одним запросом"""
        if not self._check_user_can_view_sold_products(user):
            return None
        
        overview = self.get_overview(user, period, custom_start, custom_end)
        top_sellers_data = self.get_top_sellers(user, period, 10, custom_start, custom_end)
        top_products_data = self.get_top_products(user, period, 10, custom_start, custom_end)
        categories_data = self.get_categories_stats(user, period, custom_start, custom_end)
        trend_data = self.get_daily_trend(user, period, custom_start, custom_end)
        
        return {
            'period': period,
            'overview': overview,
            'top_sellers': top_sellers_data['sellers'] if top_sellers_data else [],
            'top_products': top_products_data['products'] if top_products_data else [],
            'categories': categories_data['categories'] if categories_data else [],
            'trend': trend_data['daily_stats'] if trend_data else []
        }


sold_product_statistics_service = SoldProductStatisticsService