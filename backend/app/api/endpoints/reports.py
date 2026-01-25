import json
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.inventory import crud_inventory
from app.crud.company import crud_company
from app.crud.report import crud_report
from app.crud.product import crud_product
from app.crud.notification import crud_notification
from app.schemas.report import (
    ReportCreate, ReportUpdate, ReportResponse, 
    ReportFilter, ReportProductCreate, ReportStatus
)
from app.schemas.notification import NotificationType
from app.api.dependencies import get_current_user, require_roles
from app.models.user import User, UserRole
from app.models.report import Report, ReportStatus as ReportStatusModel
from app.core.file_utils import save_uploaded_files, validate_files
from datetime import datetime

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/", response_model=List[ReportResponse])
def get_reports(
    skip: int = 0,
    limit: int = 100,
    seller_id: Optional[int] = None,
    status: Optional[ReportStatus] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Получить отчеты с простыми фильтрами
    """
    # Преобразуем строки дат в datetime
    date_from_dt = None
    date_to_dt = None
    
    if date_from:
        try:
            date_from_dt = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
        except:
            try:
                date_from_dt = datetime.strptime(date_from, '%Y-%m-%dT%H:%M:%S')
            except:
                pass
    
    if date_to:
        try:
            date_to_dt = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
        except:
            try:
                date_to_dt = datetime.strptime(date_to, '%Y-%m-%dT%H:%M:%S')
            except:
                pass
    
    # Создаем фильтр
    from app.schemas.report import ReportFilter
    filters = ReportFilter(
        skip=skip,
        limit=limit,
        seller_id=seller_id,
        status=status,
        date_from=date_from_dt,
        date_to=date_to_dt,
    )
    
    reports = crud_report.get_all_with_filters(db, filters=filters, current_user=current_user)
    return reports


@router.get("/{report_id}", response_model=ReportResponse)
def get_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Получить отчет по ID
    """
    report = crud_report.get(db, report_id=report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Проверка доступа
    if current_user.role != UserRole.OWNER:
        if current_user.role == UserRole.SELLER and report.seller_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        # Здесь можно добавить проверки для других ролей
    
    return report


@router.post("/", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    products_data: str = Form(...),
    accountant_amount: float = Form(...),  # Новая сумма
    comment: str = Form(None),
    photos: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Создать новый отчет (все кроме OWNER)
    """
    # Разрешаем всем кроме OWNER создавать отчеты
    if current_user.role == UserRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Owner cannot create reports"
        )
    
    try:
        # Парсим JSON с товарами
        import json
        products_json = json.loads(products_data)
        
        # Проверяем что все товары существуют
        report_products = []
        total_amount = 0
        
        for product_item in products_json:
            product_id = product_item.get('productId') or product_item.get('product_id')
            quantity = product_item.get('quantity', 1)
            sold_amount = product_item.get('soldAmount') or product_item.get('sold_amount')
            
            # Проверяем существование товара
            db_product = crud_product.get(db, product_id)
            if not db_product:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Product with ID {product_id} not found"
                )
            
            # Если цена не указана, используем цену товара
            if not sold_amount or sold_amount == 0:
                sold_amount = db_product.price
            
            # Создаем объект продукта отчета
            report_product = ReportProductCreate(
                product_id=product_id,
                quantity=quantity,
                sold_amount=sold_amount
            )
            
            report_products.append(report_product)
            total_amount += sold_amount * quantity
        
        # Проверяем фото
        if not photos:
            raise HTTPException(
                status_code=400,
                detail="At least one photo is required"
            )
        
        # Валидируем файлы
        errors = validate_files(photos)
        if errors:
            raise HTTPException(
                status_code=400,
                detail="; ".join(errors)
            )
        
        # Создаем временный ID для папки
        import uuid
        temp_report_id = str(uuid.uuid4().hex)[:8]
        
        # Сохраняем фото
        photo_paths = save_uploaded_files(photos, f"reports/{temp_report_id}")
        try:
            crud_inventory.reserve_products_for_report(db, current_user.id, products_json)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        
        # Создаем DTO для отчета
        report_in = ReportCreate(
            transfer_amount=total_amount,
            comment=comment,
            accountant_amount=accountant_amount,  # Сохраняем сумму бухгалтера
            products=report_products
        )
                
        # Создаем отчет через CRUD
        db_report = crud_report.create(
            db, 
            report_in=report_in, 
            seller_id=current_user.id,
            photo_paths=photo_paths  # Передаем список строк
        )
        
        # Переименовываем папку с фото на реальный ID отчета
        import os
        temp_dir = Path(f"uploads/reports/{temp_report_id}")
        real_dir = Path(f"uploads/reports/{db_report.id}")
        
        if temp_dir.exists():
            # Обновляем пути в БД
            new_photo_paths = []
            for old_path in photo_paths:
                new_path = old_path.replace(temp_report_id, str(db_report.id))
                new_photo_paths.append(new_path)
            
            # Обновляем фото в БД (перезаписываем список)
            db_report.transfer_photos = new_photo_paths
            db.commit()
            
            # Переименовываем папку
            try:
                os.rename(str(temp_dir), str(real_dir))
            except Exception as e:
                print(f"Не удалось переименовать папку: {e}")
        
        # Создаем уведомления
        # self._create_report_notifications(db, db_report, current_user)
        
        # Загружаем связанные данные для ответа
        db.refresh(db_report)
                
        return db_report
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON format: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")
    
def _create_report_notifications(self, db: Session, report, current_user):
    """Создать уведомления о новом отчете"""
    notifications_data = []
        
    # Уведомляем наставника (если есть)
    if current_user.mentor_id:
        notifications_data.append({
            'user_id': current_user.mentor_id,
            'type': NotificationType.REPORT_SUBMITTED,
            'title': 'Новый отчет',
            'message': f'{current_user.full_name} отправил новый отчет на сумму {report.transfer_amount} руб.',
            'data': {
                'report_id': report.id,
                'seller_id': current_user.id,
                'seller_name': current_user.full_name,
                'amount': report.transfer_amount,
                'date': report.date.isoformat() if report.date else None
            },
            'entity_type': 'report',
            'entity_id': report.id,
            'priority': 3
        })
        
    # Уведомляем старшего продавца (если есть и не совпадает с наставником)
    if current_user.senior_seller_id and current_user.senior_seller_id != current_user.mentor_id:
        notifications_data.append({
            'user_id': current_user.senior_seller_id,
            'type': NotificationType.REPORT_SUBMITTED,
            'title': 'Новый отчет в кусте',
            'message': f'{current_user.full_name} отправил новый отчет на сумму {report.transfer_amount} руб.',
            'data': {
                'report_id': report.id,
                'seller_id': current_user.id,
                'seller_name': current_user.full_name,
                'amount': report.transfer_amount,
                'date': report.date.isoformat() if report.date else None
            },
            'entity_type': 'report',
            'entity_id': report.id,
            'priority': 3
        })
        
    # Уведомляем администратора куста (если есть)
    if current_user.cluster_id:
        from app.models.cluster import Cluster
        cluster = db.query(Cluster).filter(Cluster.id == current_user.cluster_id).first()
        if cluster and cluster.admin_id and cluster.admin_id not in [current_user.mentor_id, current_user.senior_seller_id]:
            notifications_data.append({
                'user_id': cluster.admin_id,
                'type': NotificationType.REPORT_SUBMITTED,
                'title': 'Новый отчет в кусте',
                'message': f'{current_user.full_name} отправил новый отчет на сумму {report.transfer_amount} руб.',
                'data': {
                    'report_id': report.id,
                    'seller_id': current_user.id,
                    'seller_name': current_user.full_name,
                    'amount': report.transfer_amount,
                    'date': report.date.isoformat() if report.date else None
                },
                'entity_type': 'report',
                'entity_id': report.id,
                'priority': 3
            })
        
    # Создаем уведомления
    if notifications_data:
        crud_notification.create_multiple(
            db,
            notifications_data=notifications_data,
            sender_id=current_user.id
        )

@router.put("/{report_id}", response_model=ReportResponse)
def update_report(
    report_id: int,
    report_in: ReportUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles([UserRole.OWNER, UserRole.ADMIN, UserRole.SENIOR_SELLER]))
):
    """
    Обновить отчет (изменить статус, добавить комментарий)
    Только OWNER, ADMIN, SENIOR_SELLER
    """
    report = crud_report.update(db, report_id=report_id, report_in=report_in)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles([UserRole.OWNER]))
):
    """
    Удалить отчет (только OWNER)
    """
    if not crud_report.delete(db, report_id=report_id):
        raise HTTPException(status_code=404, detail="Report not found")
    return None


@router.get("/stats/my", response_model=dict)
def get_my_stats(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Получить статистику по своим отчетам
    """
    return crud_report.get_stats(db, user_id=current_user.id)


@router.get("/stats/seller/{seller_id}", response_model=dict)
def get_seller_stats(
    seller_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles([UserRole.OWNER, UserRole.ADMIN, UserRole.SENIOR_SELLER, UserRole.MENTOR]))
):
    """
    Получить статистику по отчетам продавца
    Только для руководителей
    """
    return crud_report.get_stats(db, user_id=seller_id)


@router.get("/accountant/pending", response_model=List[ReportResponse])
def get_pending_accountant_reports(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить отчеты, ожидающие проверки бухгалтером"""
    if current_user.role != UserRole.ACCOUNTANT:
        raise HTTPException(status_code=403, detail="Только для бухгалтера")
    
    reports = db.query(Report).filter(
        Report.accountant_status == None,  # Еще не проверял бухгалтер
        Report.status == ReportStatus.SUBMITTED  # Отчет отправлен
    ).offset(skip).limit(limit).all()
    
    return reports


@router.post("/{report_id}/accountant-review", response_model=ReportResponse)
def accountant_review_report(
    report_id: int,
    action: str = Form(...),  # "approve" или "reject"
    final_amount: Optional[float] = Form(None),
    comment: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Проверка отчета бухгалтером"""
    if current_user.role != UserRole.ACCOUNTANT:
        raise HTTPException(status_code=403, detail="Только для бухгалтера")
    
    report = crud_report.get(db, report_id=report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if action == "approve":
        if not final_amount:
            raise HTTPException(status_code=400, detail="Требуется указать окончательную сумму")
        
        report.accountant_status = ReportStatus.APPROVED
        report.accountant_final_amount = final_amount
        report.accountant_comment = comment
        report.accountant_reviewed_by = current_user.id
        report.accountant_review_date = datetime.now()
        
    elif action == "reject":
        report.accountant_status = ReportStatus.REJECTED
        report.accountant_comment = comment
        report.accountant_reviewed_by = current_user.id
        report.accountant_review_date = datetime.now()
        
        # Освобождаем зарезервированные товары
        products_data = [
            {
                "product_id": rp.product_id,
                "quantity": rp.quantity
            }
            for rp in report.products
        ]
        crud_inventory.release_reserved_products(db, report.seller_id, products_data)
    
    else:
        raise HTTPException(status_code=400, detail="Неверное действие")
    
    # Создаем уведомление для продавца
    notification_data = {
        'user_id': report.seller_id,
        'type': NotificationType.REPORT_ACCOUNTANT,
        'title': 'Отчет проверен бухгалтером',
        'message': f'Ваш отчет #{report_id} {"утвержден" if action == "approve" else "отклонен"} бухгалтером.',
        'data': {
            'report_id': report_id,
            'action': action,
            'final_amount': final_amount if action == "approve" else None,
            'comment': comment
        },
        'entity_type': 'report',
        'entity_id': report_id,
        'priority': 3
    }
    
    crud_notification.create(db, notification_in=notification_data, sender_id=current_user.id)
    
    # Уведомляем наставника и старшего продавца
    seller = db.query(User).filter(User.id == report.seller_id).first()
    if seller:
        notifications_data = []
        
        if seller.mentor_id:
            notifications_data.append({
                'user_id': seller.mentor_id,
                'type': NotificationType.REPORT_ACCOUNTANT,
                'title': 'Отчет проверен бухгалтером',
                'message': f'Отчет #{report_id} продавца {seller.full_name} {"утвержден" if action == "approve" else "отклонен"} бухгалтером.',
                'data': {
                    'report_id': report_id,
                    'seller_id': seller.id,
                    'seller_name': seller.full_name,
                    'action': action,
                    'final_amount': final_amount if action == "approve" else None
                },
                'entity_type': 'report',
                'entity_id': report_id,
                'priority': 3
            })
        
        if seller.senior_seller_id and seller.senior_seller_id != seller.mentor_id:
            notifications_data.append({
                'user_id': seller.senior_seller_id,
                'type': NotificationType.REPORT_ACCOUNTANT,
                'title': 'Отчет проверен бухгалтером',
                'message': f'Отчет #{report_id} продавца {seller.full_name} {"утвержден" if action == "approve" else "отклонен"} бухгалтером.',
                'data': {
                    'report_id': report_id,
                    'seller_id': seller.id,
                    'seller_name': seller.full_name,
                    'action': action,
                    'final_amount': final_amount if action == "approve" else None
                },
                'entity_type': 'report',
                'entity_id': report_id,
                'priority': 3
            })
        
        if notifications_data:
            crud_notification.create_multiple(
                db,
                notifications_data=notifications_data,
                sender_id=current_user.id
            )
    
    db.commit()
    db.refresh(report)
    return report


@router.post("/{report_id}/final-approval", response_model=ReportResponse)
def final_approve_report(
    report_id: int,
    action: str = Form(...),  # "approve" или "reject"
    comment: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Финальное утверждение отчета руководителем"""
    from app.models.user import User
    
    report = crud_report.get(db, report_id=report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Проверяем права доступа
    has_access = False
    if current_user.role == UserRole.OWNER:
        has_access = True
    elif current_user.role == UserRole.ADMIN:
        # Проверяем, относится ли продавец к кустам админа
        seller = db.query(User).filter(User.id == report.seller_id).first()
        if seller and current_user.admin_clusters:
            try:
                admin_clusters = json.loads(current_user.admin_clusters)
                if seller.cluster_id in admin_clusters:
                    has_access = True
            except:
                pass
    elif current_user.role == UserRole.SENIOR_SELLER:
        seller = db.query(User).filter(User.id == report.seller_id).first()
        if seller and seller.cluster_id == current_user.cluster_id:
            has_access = True
    elif current_user.role == UserRole.MENTOR:
        seller = db.query(User).filter(User.id == report.seller_id).first()
        if seller and seller.mentor_id == current_user.id:
            has_access = True
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    if action == "approve":
        if report.accountant_status != ReportStatus.APPROVED:
            raise HTTPException(status_code=400, detail="Отчет должен быть сначала утвержден бухгалтером")
        
        if not report.accountant_final_amount:
            raise HTTPException(status_code=400, detail="Бухгалтер должен указать окончательную сумму")
        
        report.status = ReportStatus.APPROVED
        report.reviewed_by = current_user.id
        report.review_date = datetime.now()
        report.comment = comment
        
        # Списываем товары окончательно
        products_data = [
            {
                "product_id": rp.product_id,
                "quantity": rp.quantity
            }
            for rp in report.products
        ]
        crud_inventory.finalize_report_products(db, report.seller_id, products_data)
        
        # Добавляем деньги в общий банк
        description = f"Отчет #{report_id} от {report.seller.full_name}. Продано товаров на сумму: {report.accountant_final_amount}"
        crud_company.add_income(
            db,
            amount=report.accountant_final_amount,
            description=description,
            reference_id=report_id,
            reference_type="REPORT",
            created_by=current_user.id
        )
        
    elif action == "reject":
        report.status = ReportStatus.REJECTED
        report.reviewed_by = current_user.id
        report.review_date = datetime.now()
        report.comment = comment
        
        # Освобождаем зарезервированные товары
        products_data = [
            {
                "product_id": rp.product_id,
                "quantity": rp.quantity
            }
            for rp in report.products
        ]
        crud_inventory.release_reserved_products(db, report.seller_id, products_data)
    
    else:
        raise HTTPException(status_code=400, detail="Неверное действие")
    
    # Создаем уведомление для продавца
    notification_type = NotificationType.REPORT_APPROVED if action == "approve" else NotificationType.REPORT_REJECTED
    notification_data = {
        'user_id': report.seller_id,
        'type': notification_type,
        'title': f'Отчет {"" if action == "approve" else "не "}утвержден',
        'message': f'Ваш отчет #{report_id} {"утвержден" if action == "approve" else "отклонен"} руководителем.',
        'data': {
            'report_id': report_id,
            'action': action,
            'comment': comment,
            'reviewed_by': current_user.full_name
        },
        'entity_type': 'report',
        'entity_id': report_id,
        'priority': 3
    }
    
    crud_notification.create(db, notification_in=notification_data, sender_id=current_user.id)
    
    db.commit()
    db.refresh(report)
    return report