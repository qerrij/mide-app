from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, case
from typing import List, Optional
from app.models.cluster import Cluster
from app.models.report import Report, ReportProduct, ReportStatus
from app.models.user import User, UserRole
from app.models.product import Product
from app.schemas.report import ReportCreate, ReportUpdate, ReportFilter
from datetime import datetime
from app.core.file_utils import save_uploaded_files, delete_file
import json


class CRUDReport:
    def get(self, db: Session, report_id: int) -> Optional[Report]:
        """Получить отчет по ID"""
        return db.query(Report)\
            .options(
                joinedload(Report.products).joinedload(ReportProduct.product),
                joinedload(Report.seller),
                joinedload(Report.accountant)
            )\
            .filter(Report.id == report_id)\
            .first()
    
    def get_all_with_filters(
        self, 
        db: Session, 
        filters: ReportFilter,
        current_user: User
    ) -> List[Report]:
        """Получить отчеты с фильтрацией и сортировкой по роли"""
        query = db.query(Report)\
            .options(
                joinedload(Report.products).joinedload(ReportProduct.product),
                joinedload(Report.seller),
                joinedload(Report.accountant)
            )
        
        # Фильтрация по роли пользователя
        query = self._apply_role_filters(db, query, current_user)
        
        # Дополнительные фильтры
        if filters.seller_id and current_user.role != UserRole.SELLER:
            query = query.filter(Report.seller_id == filters.seller_id)
        
        if filters.status:
            query = query.filter(Report.status == filters.status)
        
        if filters.date_from:
            query = query.filter(Report.date >= filters.date_from)
        
        if filters.date_to:
            query = query.filter(Report.date <= filters.date_to)
        
        if filters.cluster_id:
            subquery = db.query(User.id).filter(User.cluster_id == filters.cluster_id).subquery()
            query = query.filter(Report.seller_id.in_(subquery))
        
        if filters.mentor_id:
            subquery = db.query(User.id).filter(User.mentor_id == filters.mentor_id).subquery()
            query = query.filter(Report.seller_id.in_(subquery))
        
        if filters.admin_id:
            admin = db.query(User).filter(User.id == filters.admin_id).first()
            if admin and admin.admin_clusters:
                try:
                    admin_clusters = json.loads(admin.admin_clusters)
                    subquery = db.query(User.id).filter(User.cluster_id.in_(admin_clusters)).subquery()
                    query = query.filter(Report.seller_id.in_(subquery))
                except:
                    pass
        
        # Применяем сортировку по приоритету для роли
        query = self._apply_priority_sorting(query, current_user.role, filters.sort_by)
        
        return query.offset(filters.skip).limit(filters.limit).all()
    
    def _apply_role_filters(self, db: Session, query, current_user: User):
        """Применить фильтры в зависимости от роли"""
        if current_user.role == UserRole.SELLER:
            # Продавец видит только свои отчеты
            return query.filter(Report.seller_id == current_user.id)
        
        elif current_user.role == UserRole.MENTOR:
            # Наставник видит:
            # 1. Свои собственные отчеты (как продавец)
            # 2. Отчеты своих подопечных
            subquery = db.query(User.id).filter(User.mentor_id == current_user.id).subquery()
            return query.filter(
                (Report.seller_id == current_user.id) |  # Свои отчеты
                (Report.seller_id.in_(subquery))         # Отчеты подопечных
            )
        
        elif current_user.role == UserRole.SENIOR_SELLER:
            # Старший продавец видит:
            # 1. Свои собственные отчеты (как продавец)
            # 2. Отчеты продавцов своего куста
            if current_user.cluster_id:
                subquery = db.query(User.id).filter(User.cluster_id == current_user.cluster_id).subquery()
                return query.filter(
                    (Report.seller_id == current_user.id) |  # Свои отчеты
                    (Report.seller_id.in_(subquery))         # Отчеты куста
                )
            # Если нет куста, только свои отчеты
            return query.filter(Report.seller_id == current_user.id)
        
        elif current_user.role == UserRole.ADMIN:
            # Администратор видит:
            # 1. Свои собственные отчеты (если он также продавец)
            # 2. Отчеты продавцов из своих кустов (admin_clusters)
            # 3. Отчеты продавцов из кустов, где он admin_id (Cluster.admin_id)
            
            admin_cluster_ids = []
            
            # Получаем кусты из admin_clusters (JSON поле)
            if current_user.admin_clusters:
                try:
                    admin_clusters = json.loads(current_user.admin_clusters)
                    if isinstance(admin_clusters, list):
                        admin_cluster_ids.extend(admin_clusters)
                except:
                    pass
            
            # Получаем кусты, где пользователь является admin_id
            cluster_as_admin = db.query(Cluster.id).filter(Cluster.admin_id == current_user.id).all()
            admin_cluster_ids.extend([c[0] for c in cluster_as_admin])
            
            # Убираем дубликаты
            admin_cluster_ids = list(set(admin_cluster_ids))
            
            if admin_cluster_ids:
                # Получаем всех продавцов из этих кустов
                subquery = db.query(User.id).filter(
                    User.cluster_id.in_(admin_cluster_ids)
                ).subquery()
                
                return query.filter(
                    (Report.seller_id == current_user.id) |  # Свои отчеты
                    (Report.seller_id.in_(subquery))         # Отчеты из кустов
                )
            else:
                # Если нет кустов, показываем только свои отчеты
                return query.filter(Report.seller_id == current_user.id)
        
        elif current_user.role == UserRole.ACCOUNTANT:
            # Бухгалтер видит все отчеты
            return query
        
        # OWNER видит все
        return query
    
    def _apply_priority_sorting(self, query, role: UserRole, sort_by: str):
        """Применить сортировку по приоритету для конкретной роли"""
        from sqlalchemy import case
        
        if role == UserRole.SELLER:
            # Для продавца: сначала AWAITING_FIX, потом по дате
            priority_case = case(
                (Report.status == ReportStatus.AWAITING_FIX, 1),
                else_=2
            )
            return query.order_by(priority_case, Report.date.desc())
        
        elif role == UserRole.ACCOUNTANT:
            # Для бухгалтера: сначала AWAITING_ACCOUNTANT, потом остальные
            priority_case = case(
                (Report.status == ReportStatus.AWAITING_ACCOUNTANT, 1),
                else_=2
            )
            return query.order_by(priority_case, Report.date.desc())
        
        elif role in [UserRole.MENTOR, UserRole.SENIOR_SELLER, UserRole.ADMIN, UserRole.OWNER]:
            # Для руководителей: сначала AWAITING_MANAGER, потом AWAITING_FIX, потом остальные
            priority_case = case(
                (Report.status == ReportStatus.AWAITING_MANAGER, 1),
                (Report.status == ReportStatus.AWAITING_FIX, 2),
                else_=3
            )
            return query.order_by(priority_case, Report.date.desc())
        
        else:
            # По умолчанию по дате
            if sort_by == "date":
                return query.order_by(Report.date.desc())
            elif sort_by == "amount":
                return query.order_by(Report.transfer_amount.desc())
            else:
                return query.order_by(Report.date.desc())
    
    def create(
        self, 
        db: Session, 
        *, 
        report_in: ReportCreate, 
        seller_id: int,
        photo_paths: List[str],
        status: ReportStatus = ReportStatus.AWAITING_ACCOUNTANT
    ) -> Report:
        """Создать новый отчет"""
        db_report = Report(
            seller_id=seller_id,
            transfer_amount=report_in.transfer_amount,
            comment=report_in.comment,
            status=status,
            transfer_photos=photo_paths,
            accountant_amount=report_in.accountant_amount,
            was_with_accountant=False
        )
        
        db.add(db_report)
        db.commit()
        db.refresh(db_report)
        
        for product_in in report_in.products:
            db_product_report = ReportProduct(
                report_id=db_report.id,
                product_id=product_in.product_id,
                quantity=product_in.quantity,
                sold_amount=product_in.sold_amount
            )
            db.add(db_product_report)
        
        db.commit()
        
        db_report = self.get(db, db_report.id)
        return db_report
    
    def update(
        self, 
        db: Session, 
        *, 
        report_id: int, 
        report_in: ReportUpdate
    ) -> Optional[Report]:
        """Обновить отчет"""
        db_report = self.get(db, report_id)
        if not db_report:
            return None
        
        update_data = report_in.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(db_report, field, value)
        
        if 'status' in update_data and update_data['status'] in [ReportStatus.APPROVED, ReportStatus.REJECTED]:
            db_report.review_date = datetime.now()
        
        db.commit()
        db.refresh(db_report)
        return db_report
    
    def fix_report(
        self,
        db: Session,
        *,
        report_id: int,
        report_in: ReportCreate,
        photo_paths: List[str],
        seller_id: int
    ) -> Optional[Report]:
        """Исправить отклоненный отчет, сохраняя старые фотографии и добавляя новые"""
        db_report = self.get(db, report_id)
        if not db_report:
            return None
        
        # Удаляем старые товары
        for product in db_report.products:
            db.delete(product)
        db.commit()
        
        # Сохраняем старые фотографии и добавляем новые (НЕ удаляем старые)
        existing_photos = db_report.transfer_photos or []
        all_photos = existing_photos + photo_paths  # Объединяем старые и новые фото
        
        # Обновляем отчет
        db_report.transfer_amount = report_in.transfer_amount
        db_report.transfer_photos = all_photos  # Сохраняем все фото
        db_report.comment = report_in.comment
        db_report.accountant_amount = report_in.accountant_amount
        db_report.status = ReportStatus.AWAITING_ACCOUNTANT
        db_report.accountant_status = None
        db_report.accountant_comment = None
        db_report.accountant_final_amount = None
        db_report.accountant_reviewed_by = None
        db_report.accountant_review_date = None
        db_report.was_with_accountant = True
        
        db.commit()
        
        # Добавляем новые товары
        for product_in in report_in.products:
            db_product_report = ReportProduct(
                report_id=db_report.id,
                product_id=product_in.product_id,
                quantity=product_in.quantity,
                sold_amount=product_in.sold_amount
            )
            db.add(db_product_report)
        
        db.commit()
        
        return self.get(db, db_report.id)
    
    def delete(self, db: Session, report_id: int) -> bool:
        """Удалить отчет и все связанные файлы"""
        db_report = self.get(db, report_id)
        if not db_report:
            return False
        
        # Удаляем файлы
        if db_report.transfer_photos:
            for photo_path in db_report.transfer_photos:
                delete_file(photo_path)
        
        db.delete(db_report)
        db.commit()
        return True
    
    def get_stats(self, db: Session, user_id: int) -> dict:
        """Получить статистику по отчетам пользователя"""
        stats = {
            "total_reports": 0,
            "awaiting_fix": 0,
            "awaiting_accountant": 0,
            "awaiting_manager": 0,
            "approved": 0,
            "rejected": 0,
            "total_amount": 0.0
        }
        
        reports = db.query(Report).filter(Report.seller_id == user_id).all()
        
        if not reports:
            return stats
        
        stats["total_reports"] = len(reports)
        
        for report in reports:
            if report.status == ReportStatus.AWAITING_FIX:
                stats["awaiting_fix"] += 1
            elif report.status == ReportStatus.AWAITING_ACCOUNTANT:
                stats["awaiting_accountant"] += 1
            elif report.status == ReportStatus.AWAITING_MANAGER:
                stats["awaiting_manager"] += 1
            elif report.status == ReportStatus.APPROVED:
                stats["approved"] += 1
                stats["total_amount"] += report.accountant_final_amount or 0
            elif report.status == ReportStatus.REJECTED:
                stats["rejected"] += 1
        
        return stats


crud_report = CRUDReport()