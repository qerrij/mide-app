from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func
from typing import List, Optional
from app.models.report import Report, ReportProduct, ReportStatus
from app.models.user import User, UserRole
from app.models.product import Product
from app.schemas.report import ReportCreate, ReportUpdate, ReportFilter
from datetime import datetime


class CRUDReport:
    def get(self, db: Session, report_id: int) -> Optional[Report]:
        return db.query(Report)\
            .options(
                joinedload(Report.products).joinedload(ReportProduct.product),
                joinedload(Report.seller)
            )\
            .filter(Report.id == report_id)\
            .first()
    
    def get_all(
        self, 
        db: Session, 
        skip: int = 0, 
        limit: int = 100
    ) -> List[Report]:
        return db.query(Report)\
            .options(
                joinedload(Report.products).joinedload(ReportProduct.product),
                joinedload(Report.seller)
            )\
            .offset(skip)\
            .limit(limit)\
            .all()
    
    def get_all_with_filters(
        self, 
        db: Session, 
        filters: ReportFilter,
        current_user: User
    ) -> List[Report]:
        query = db.query(Report)\
            .options(
                joinedload(Report.products).joinedload(ReportProduct.product),
                joinedload(Report.seller)
            )
        
        # Фильтрация по роли пользователя
        if current_user.role == UserRole.SELLER:
            query = query.filter(Report.seller_id == current_user.id)
        elif current_user.role == UserRole.MENTOR:
            # Ментор видит отчеты своих подопечных
            subquery = db.query(User.id).filter(User.mentor_id == current_user.id).subquery()
            query = query.filter(Report.seller_id.in_(subquery))
        elif current_user.role == UserRole.SENIOR_SELLER:
            # Старший продавец видит отчеты своего куста
            subquery = db.query(User.id).filter(User.cluster_id == current_user.cluster_id).subquery()
            query = query.filter(Report.seller_id.in_(subquery))
        elif current_user.role == UserRole.ADMIN:
            # Администратор видит отчеты своих кустов
            if current_user.admin_clusters:
                import json
                try:
                    admin_clusters = json.loads(current_user.admin_clusters)
                    subquery = db.query(User.id).filter(User.cluster_id.in_(admin_clusters)).subquery()
                    query = query.filter(Report.seller_id.in_(subquery))
                except:
                    pass
        
        if filters.seller_id:
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
        
        query = query.order_by(Report.date.desc())
        
        return query.offset(filters.skip).limit(filters.limit).all()
    
    def create(
        self, 
        db: Session, 
        *, 
        report_in: ReportCreate, 
        seller_id: int,
        photo_paths: List[str]  
    ) -> Report:
        """Создать новый отчет"""
        
        db_report = Report(
            seller_id=seller_id,
            transfer_amount=report_in.transfer_amount,
            comment=report_in.comment,
            status=ReportStatus.SUBMITTED,
            transfer_photos=photo_paths,
            accountant_amount=report_in.accountant_amount  # <-- ДОБАВИТЬ ЭТУ СТРОКУ
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
    
    def delete(self, db: Session, report_id: int) -> bool:
        db_report = self.get(db, report_id)
        if not db_report:
            return False
        
        db.delete(db_report)
        db.commit()
        return True
    
    def get_stats(self, db: Session, user_id: int) -> dict:
        """Получить статистику по отчетам пользователя"""
        stats = {
            "total_reports": 0,
            "submitted": 0,
            "approved": 0,
            "rejected": 0,
            "total_amount": 0.0
        }
        
        reports = db.query(Report).filter(Report.seller_id == user_id).all()
        
        if not reports:
            return stats
        
        stats["total_reports"] = len(reports)
        
        for report in reports:
            if report.status == ReportStatus.SUBMITTED:
                stats["submitted"] += 1
            elif report.status == ReportStatus.APPROVED:
                stats["approved"] += 1
                stats["total_amount"] += report.transfer_amount
            elif report.status == ReportStatus.REJECTED:
                stats["rejected"] += 1
        
        return stats


crud_report = CRUDReport()