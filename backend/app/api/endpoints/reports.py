import json
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.crud.inventory import crud_inventory
from app.crud.company import crud_company
from app.crud.report import crud_report
from app.crud.product import crud_product
from app.crud.user_category_rate import crud_user_category_rate
from app.crud.notification import crud_notification
from app.models.city import City
from app.models.product import Product
from app.schemas.report import (
    ReportCreate, ReportUpdate, ReportResponse, 
    ReportFilter, ReportProductCreate, ReportStatus, ReportsPaginatedResponse
)
from app.schemas.notification import NotificationType
from app.api.dependencies import get_current_user, require_roles
from app.models.user import User, UserRole
from app.models.report import Report, ReportProduct, ReportStatus as ReportStatusModel
from app.models.cluster import Cluster
from app.core.file_utils import save_uploaded_files, validate_files, delete_file


router = APIRouter(prefix="/reports", tags=["reports"])


# ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

def _parse_date(date_str: Optional[str]) -> Optional[datetime]:
    """Парсинг строки даты"""
    if not date_str:
        return None
    
    try:
        return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
    except:
        try:
            return datetime.strptime(date_str, '%Y-%m-%dT%H:%M:%S')
        except:
            try:
                return datetime.strptime(date_str, '%Y-%m-%d')
            except:
                return None


def _check_manager_access(db: Session, report: Report, user: User) -> bool:
    """Проверить, имеет ли пользователь права на утверждение отчета"""
    # Нельзя утверждать свой собственный отчет
    if report.seller_id == user.id:
        return False
    
    # OWNER имеет полный доступ
    if user.role == UserRole.OWNER:
        return True
    
    seller = db.query(User).filter(User.id == report.seller_id).first()
    if not seller:
        return False
    
    # ADMIN - проверяем по кластерам
    if user.role == UserRole.ADMIN:
        # Получаем все кластеры, к которым имеет доступ админ
        admin_cluster_ids = []
        
        # 1. Кластеры из поля admin_clusters (JSON массив)
        if user.admin_clusters:
            try:
                if isinstance(user.admin_clusters, str):
                    parsed = json.loads(user.admin_clusters)
                    if isinstance(parsed, list):
                        admin_cluster_ids.extend(parsed)
                elif isinstance(user.admin_clusters, list):
                    admin_cluster_ids.extend(user.admin_clusters)
            except Exception as e:
                print(f"Error parsing admin_clusters: {e}")
        
        # 2. Кластеры, где пользователь является прямым администратором
        if user.cluster_id:
            admin_cluster_ids.append(user.cluster_id)
        
        # Проверяем, входит ли кластер продавца в список доступных
        if admin_cluster_ids and seller.cluster_id:
            return seller.cluster_id in admin_cluster_ids
        
        return False
    
    # SENIOR_SELLER - проверяем по кластеру
    if user.role == UserRole.SENIOR_SELLER:
        return seller.cluster_id == user.cluster_id
    
    # MENTOR - проверяем по наставничеству
    if user.role == UserRole.MENTOR:
        return seller.mentor_id == user.id
    
    return False

def _calculate_product_rate(db: Session, product: Product, seller: User) -> float:
    """
    Рассчитать ставку для товара в порядке приоритета:
    1. Если у товара есть default_rate - используем его
    2. Иначе если у продавца есть ставка для категории этого товара - используем её
    3. Иначе ставка = 0
    """
    # Приоритет 1: Ставка товара (если задана владельцем)
    if product.default_rate is not None and product.default_rate > 0:
        return product.default_rate
    
    # Приоритет 2: Ставка продавца для категории товара
    category_id = product.category_id if product.category else None
    if category_id:
        category_rate = crud_user_category_rate.get_rate_for_product(
            db, 
            seller.id, 
            category_id
        )
        if category_rate > 0:
            return category_rate
    
    # Приоритет 3: Ставка 0
    return 0.0


# ==================== УВЕДОМЛЕНИЯ ====================

def _notify_accountants_about_new_report(db: Session, report: Report, seller: User):
    """Уведомить бухгалтеров о новом отчете"""
    accountants = db.query(User).filter(User.role == UserRole.ACCOUNTANT).all()
    
    notifications_data = []
    for accountant in accountants:
        notifications_data.append({
            'user_id': accountant.id,
            'type': NotificationType.REPORT_SUBMITTED,
            'title': 'Новый отчет на проверку',
            'message': f'Продавец {seller.full_name} создал отчет №{report.id} на сумму {report.transfer_amount} руб. Требуется проверка.',
            'data': {
                'report_id': report.id,
                'seller_id': seller.id,
                'seller_name': seller.full_name,
                'amount': report.transfer_amount,
                'date': report.date.isoformat() if report.date else None,
                'requires_action': True
            },
            'entity_type': 'report',
            'entity_id': report.id,
            'priority': 4
        })
    
    if notifications_data:
        crud_notification.create_multiple(
            db,
            notifications_data=notifications_data,
            sender_id=seller.id
        )


def _notify_accountants_about_fixed_report(db: Session, report: Report, seller: User):
    """Уведомить бухгалтеров об исправленном отчете"""
    accountants = db.query(User).filter(User.role == UserRole.ACCOUNTANT).all()
    
    notifications_data = []
    for accountant in accountants:
        notifications_data.append({
            'user_id': accountant.id,
            'type': NotificationType.REPORT_SUBMITTED,
            'title': 'Отчет исправлен и требует проверки',
            'message': f'Продавец {seller.full_name} исправил отчет №{report.id} и отправил на повторную проверку.',
            'data': {
                'report_id': report.id,
                'seller_id': seller.id,
                'seller_name': seller.full_name,
                'amount': report.transfer_amount,
                'date': datetime.now().isoformat(),
                'is_fix': True,
                'requires_action': True
            },
            'entity_type': 'report',
            'entity_id': report.id,
            'priority': 4
        })
    
    if notifications_data:
        crud_notification.create_multiple(
            db,
            notifications_data=notifications_data,
            sender_id=seller.id
        )


def _notify_managers_about_ready_report(db: Session, report: Report, accountant: User):
    """Уведомить руководителей о том, что отчет готов к проверке"""
    seller = db.query(User).filter(User.id == report.seller_id).first()
    if not seller:
        return
    
    notifications_data = []
    
    # Наставник
    if seller.mentor_id:
        notifications_data.append({
            'user_id': seller.mentor_id,
            'type': NotificationType.REPORT_ACCOUNTANT,
            'title': 'Отчет ожидает вашей проверки',
            'message': f'Отчет №{report.id} продавца {seller.full_name} проверен бухгалтером и ожидает вашего утверждения.',
            'data': {
                'report_id': report.id,
                'seller_id': seller.id,
                'seller_name': seller.full_name,
                'final_amount': report.accountant_final_amount,
                'requires_action': True
            },
            'entity_type': 'report',
            'entity_id': report.id,
            'priority': 4
        })
    
    # Старший продавец
    if seller.senior_seller_id and seller.senior_seller_id != seller.mentor_id:
        notifications_data.append({
            'user_id': seller.senior_seller_id,
            'type': NotificationType.REPORT_ACCOUNTANT,
            'title': 'Отчет ожидает вашей проверки',
            'message': f'Отчет №{report.id} продавца {seller.full_name} проверен бухгалтером и ожидает вашего утверждения.',
            'data': {
                'report_id': report.id,
                'seller_id': seller.id,
                'seller_name': seller.full_name,
                'final_amount': report.accountant_final_amount,
                'requires_action': True
            },
            'entity_type': 'report',
            'entity_id': report.id,
            'priority': 4
        })
    
    # Администратор куста
    if seller.cluster_id:
        cluster = db.query(Cluster).filter(Cluster.id == seller.cluster_id).first()
        if cluster and cluster.admin_id:
            notifications_data.append({
                'user_id': cluster.admin_id,
                'type': NotificationType.REPORT_ACCOUNTANT,
                'title': 'Отчет ожидает проверки',
                'message': f'Отчет №{report.id} продавца {seller.full_name} проверен бухгалтером и ожидает утверждения.',
                'data': {
                    'report_id': report.id,
                    'seller_id': seller.id,
                    'seller_name': seller.full_name,
                    'final_amount': report.accountant_final_amount,
                    'requires_action': True
                },
                'entity_type': 'report',
                'entity_id': report.id,
                'priority': 3
            })
    
    if notifications_data:
        crud_notification.create_multiple(
            db,
            notifications_data=notifications_data,
            sender_id=accountant.id
        )


def _notify_seller_about_rejection(db: Session, report: Report, reviewer: User, is_accountant: bool = False):
    """Уведомить продавца об отклонении отчета"""
    role = "бухгалтером" if is_accountant else "руководителем"
    comment = report.accountant_comment if is_accountant else report.comment
    
    notification_data = {
        'user_id': report.seller_id,
        'type': NotificationType.REPORT_REJECTED,
        'title': 'Отчет требует исправления' if is_accountant else 'Отчет отклонен',
        'message': f'Ваш отчет №{report.id} отклонен {role}. {"Требуется исправить отчет." if is_accountant else ""}',
        'data': {
            'report_id': report.id,
            'action': 'reject',
            'comment': comment,
            'reviewed_by': reviewer.full_name,
            'requires_fix': is_accountant
        },
        'entity_type': 'report',
        'entity_id': report.id,
        'priority': 4 if is_accountant else 3
    }
    
    crud_notification.create(db, notification_in=notification_data, sender_id=reviewer.id)


def _notify_seller_about_approval(db: Session, report: Report, reviewer: User):
    """Уведомить продавца об утверждении отчета"""
    notification_data = {
        'user_id': report.seller_id,
        'type': NotificationType.REPORT_APPROVED,
        'title': 'Отчет утвержден',
        'message': f'Ваш отчет №{report.id} утвержден руководителем {reviewer.full_name}.',
        'data': {
            'report_id': report.id,
            'action': 'approve',
            'comment': report.comment,
            'reviewed_by': reviewer.full_name,
            'final_amount': report.accountant_final_amount
        },
        'entity_type': 'report',
        'entity_id': report.id,
        'priority': 3
    }
    
    crud_notification.create(db, notification_in=notification_data, sender_id=reviewer.id)

def enrich_report_response(report):
    """Обогащает отчет данными о продавце, бухгалтере и продуктах"""
    if report:
        # Продавец
        if report.seller and not hasattr(report, 'seller_name'):
            report.seller_name = report.seller.full_name
        
        # Бухгалтер
        if report.accountant and not hasattr(report, 'accountant_name'):
            report.accountant_name = report.accountant.full_name
        
        # Продукты
        if report.products:
            for product_report in report.products:
                if product_report.product:
                    if hasattr(product_report.product, 'category') and product_report.product.category:
                        product_report.product.category_name = product_report.product.category.name
    return report

def enrich_reports_response(reports):
    """Обогащает список отчетов"""
    for report in reports:
        enrich_report_response(report)
    return reports


# ==================== ОСНОВНЫЕ ЭНДПОИНТЫ ====================

@router.get("", response_model=ReportsPaginatedResponse)  # Используем правильную модель
def get_reports(
    skip: int = 0,
    limit: int = Query(50, ge=1, le=100, description="Количество записей на странице"),
    page: int = Query(1, ge=1, description="Номер страницы"),
    seller_id: Optional[int] = None,
    status: Optional[ReportStatus] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    sort_by: str = Query("priority", description="Сортировка: priority, date, amount"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Получить отчеты с фильтрацией и сортировкой по приоритету
    """
    date_from_dt = _parse_date(date_from)
    date_to_dt = _parse_date(date_to)
    
    # Вычисляем offset
    offset = (page - 1) * limit
    
    filters = ReportFilter(
        skip=offset,
        limit=limit,
        seller_id=seller_id,
        status=status,
        date_from=date_from_dt,
        date_to=date_to_dt,
        sort_by=sort_by
    )
    
    reports, total_count = crud_report.get_all_with_filters(db, filters=filters, current_user=current_user)
    
    # Обогащаем отчеты данными
    enriched_reports = enrich_reports_response(reports)
    
    return {
        "items": enriched_reports,
        "total": total_count,
        "page": page,
        "page_size": limit,
        "total_pages": (total_count + limit - 1) // limit
    }


@router.get("/{report_id}", response_model=ReportResponse)
def get_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить отчет по ID"""
    report = crud_report.get(db, report_id=report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Проверка доступа
    if current_user.role == UserRole.SELLER and report.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return enrich_report_response(report)


@router.post("", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    products_data: str = Form(...),
    accountant_amount: float = Form(...),
    comment: str = Form(None),
    photos: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Создать новый отчет
    Доступно: SELLER, MENTOR, SENIOR_SELLER, ADMIN
    """
    if current_user.role == UserRole.OWNER or current_user.role == UserRole.ACCOUNTANT:
        raise HTTPException(status_code=403, detail="Эта роль не может создавать отчеты")
    
    try:
        # Парсим товары
        products_json = json.loads(products_data)
        report_products = []
        total_amount = 0
        
        # Получаем ставку продавца
        for product_item in products_json:
            product_id = product_item.get('productId') or product_item.get('product_id')
            quantity = product_item.get('quantity', 1)
            sold_amount = product_item.get('soldAmount') or product_item.get('sold_amount')
            
            db_product = crud_product.get(db, product_id)
            if not db_product:
                raise HTTPException(status_code=400, detail=f"Product {product_id} not found")
            
            if not sold_amount or sold_amount == 0:
                sold_amount = db_product.price
            
            # Рассчитываем ставку для товара
            rate = _calculate_product_rate(db, db_product, current_user)
            amount_after_rate = max(0, sold_amount - rate)
            
            report_products.append({
                'product_id': product_id,
                'quantity': quantity,
                'sold_amount': amount_after_rate
            })
            total_amount += amount_after_rate * quantity
        
        # Проверяем фото
        if not photos:
            raise HTTPException(status_code=400, detail="At least one photo is required")
        
        errors = validate_files(photos)
        if errors:
            raise HTTPException(status_code=400, detail="; ".join(errors))
        
        # Создаем отчет (СНАЧАЛА создаем, чтобы получить ID)
        db_report = Report(
            seller_id=current_user.id,
            transfer_amount=total_amount,
            comment=comment,
            status=ReportStatus.AWAITING_ACCOUNTANT,
            transfer_photos=[],
            accountant_amount=accountant_amount,
            was_with_accountant=False
        )
        db.add(db_report)
        db.commit()
        db.refresh(db_report)
        
        # Сохраняем фото с ID отчета
        photo_paths = save_uploaded_files(photos, f"reports/{db_report.id}")
        db_report.transfer_photos = photo_paths
        db.commit()
        
        # Добавляем товары
        for product_in in report_products:
            db_product_report = ReportProduct(
                report_id=db_report.id,
                product_id=product_in['product_id'],
                quantity=product_in['quantity'],
                sold_amount=product_in['sold_amount']
            )
            db.add(db_product_report)
        
        db.commit()
        
        try:
            crud_inventory.reserve_products_for_report(
                db, 
                user_id=current_user.id, 
                products=products_json,
                report_id=db_report.id  # Передаем ID созданного отчета
            )
        except ValueError as e:
            # Если не удалось зарезервировать, удаляем отчет
            db.delete(db_report)
            db.commit()
            raise HTTPException(status_code=400, detail=str(e))
        
        # Уведомляем бухгалтеров
        _notify_accountants_about_new_report(db, db_report, current_user)
        
        db_report = crud_report.get(db, db_report.id)
        return enrich_report_response(db_report)
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error creating report: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


@router.post("/{report_id}/fix", response_model=ReportResponse)
async def fix_report(
    report_id: int,
    products_data: str = Form(...),
    accountant_amount: float = Form(...),
    comment: Optional[str] = Form(None),
    photos: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Исправить отклоненный бухгалтером отчет
    Доступно только продавцу, которому принадлежит отчет
    """
    report = crud_report.get(db, report_id=report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Проверяем, что отчет принадлежит текущему пользователю
    if report.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Вы не можете исправлять чужие отчеты")
    
    # Проверяем, что отчет требует исправления
    if report.status != ReportStatus.AWAITING_FIX:
        raise HTTPException(status_code=400, detail="Этот отчет не требует исправления")
    
    try:
        # Парсим товары
        products_json = json.loads(products_data)
        report_products = []
        total_amount = 0
        
        # Получаем ставку продавца
        seller_rate = current_user.rate or 0.0
        
        for product_item in products_json:
            product_id = product_item.get('productId') or product_item.get('product_id')
            quantity = product_item.get('quantity', 1)
            sold_amount = product_item.get('soldAmount') or product_item.get('sold_amount')
            
            db_product = crud_product.get(db, product_id)
            if not db_product:
                raise HTTPException(status_code=400, detail=f"Product {product_id} not found")
            
            if not sold_amount or sold_amount == 0:
                sold_amount = db_product.price
            
            # Вычитаем ставку продавца
            amount_after_rate = max(0, sold_amount - seller_rate)
            
            report_products.append(ReportProductCreate(
                product_id=product_id,
                quantity=quantity,
                sold_amount=amount_after_rate
            ))
            total_amount += amount_after_rate * quantity
        
        # Проверяем фото
        if not photos:
            raise HTTPException(status_code=400, detail="Требуется прикрепить фотографии при исправлении отчета")
        
        errors = validate_files(photos)
        if errors:
            raise HTTPException(status_code=400, detail="; ".join(errors))
        
        # Сохраняем новые фото
        new_photo_paths = save_uploaded_files(photos, f"reports/{report_id}")
        
        # Удаляем старые товары
        for product in report.products:
            db.delete(product)
        db.commit()
        
        # Обновляем отчет, СОХРАНЯЯ старые фото и ДОБАВЛЯЯ новые
        existing_photos = report.transfer_photos or []
        all_photos = existing_photos + new_photo_paths
        
        report.transfer_amount = total_amount
        report.transfer_photos = all_photos
        report.comment = comment
        report.accountant_amount = accountant_amount
        report.status = ReportStatus.AWAITING_ACCOUNTANT
        report.accountant_status = None
        report.accountant_comment = None
        report.accountant_final_amount = None
        report.accountant_reviewed_by = None
        report.accountant_review_date = None
        report.was_with_accountant = True
        
        db.commit()
        
        # Добавляем новые товары
        for product_in in report_products:
            db_product_report = ReportProduct(
                report_id=report.id,
                product_id=product_in.product_id,
                quantity=product_in.quantity,
                sold_amount=product_in.sold_amount
            )
            db.add(db_product_report)
        
        db.commit()
        
        # 🔴 ИСПРАВЛЕНИЕ: Резервируем товары заново с использованием нового метода
        try:
            for product_in in report_products:
                crud_inventory.reserve_for_report(
                    db,
                    user_id=current_user.id,
                    product_id=product_in.product_id,
                    quantity=product_in.quantity,
                    report_id=report.id
                )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        
        # Уведомляем бухгалтеров об исправленном отчете
        _notify_accountants_about_fixed_report(db, report, current_user)
        
        db.refresh(report)
        return enrich_report_response(report)
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error fixing report: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


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
    
    # Проверяем, что отчет ожидает проверки бухгалтера
    if report.status != ReportStatus.AWAITING_ACCOUNTANT:
        raise HTTPException(status_code=400, detail="Отчет не ожидает проверки бухгалтера")
    
    if report.accountant_reviewed_by is not None:
        raise HTTPException(status_code=400, detail="Отчет уже проверен бухгалтером")
    
    if action == "approve":
        if not final_amount:
            raise HTTPException(status_code=400, detail="Требуется указать окончательную сумму")
        
        # Обновляем поля бухгалтерской проверки
        report.accountant_status = ReportStatus.APPROVED
        report.accountant_final_amount = final_amount
        report.accountant_comment = comment
        report.accountant_reviewed_by = current_user.id
        report.accountant_review_date = datetime.now()
        report.was_with_accountant = True
        
        # Меняем статус отчета на ожидание руководителя
        report.status = ReportStatus.AWAITING_MANAGER
        
        db.commit()
        
        # Перезагружаем отчет со всеми связанными объектами
        report = crud_report.get(db, report_id=report_id)
        
        # Уведомляем руководителей
        _notify_managers_about_ready_report(db, report, current_user)
        
    elif action == "reject":
        # Обновляем поля бухгалтерской проверки
        report.accountant_status = ReportStatus.REJECTED
        report.accountant_comment = comment
        report.accountant_reviewed_by = current_user.id
        report.accountant_review_date = datetime.now()
        report.was_with_accountant = True
        
        # Меняем статус на ожидание исправления
        report.status = ReportStatus.AWAITING_FIX
        
        db.commit()
        
        # Перезагружаем отчет со всеми связанными объектами
        report = crud_report.get(db, report_id=report_id)
        
        # Освобождаем зарезервированные товары
        crud_inventory.release_report_reservations(db, report.seller_id, report.id)
        
        # Уведомляем ТОЛЬКО продавца об отклонении
        _notify_seller_about_rejection(db, report, current_user, is_accountant=True)
    
    else:
        raise HTTPException(status_code=400, detail="Неверное действие")
    
    # Обогащаем ответ данными
    return enrich_report_response(report)


@router.post("/{report_id}/final-approval", response_model=ReportResponse)
def final_approve_report(
    report_id: int,
    action: str = Form(...),  # "approve" или "reject"
    comment: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Финальное утверждение отчета руководителем"""
    report = crud_report.get(db, report_id=report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Проверяем, что отчет ожидает проверки руководителя
    if report.status != ReportStatus.AWAITING_MANAGER:
        raise HTTPException(status_code=400, detail="Отчет не ожидает проверки руководителя")
    
    # Проверяем, что бухгалтер утвердил отчет
    if report.accountant_status != ReportStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Отчет должен быть сначала утвержден бухгалтером")
    
    # Проверяем права доступа
    has_access = _check_manager_access(db, report, current_user)
    if not has_access:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    if action == "approve":
        try:
            # Освобождаем зарезервированные товары
            crud_inventory.finalize_report_reservations(db, report.seller_id, report.id)
            
            # СОЗДАЕМ ЗАПИСИ О ПРОДАННЫХ ТОВАРАХ (до изменения статуса)
            sold_count = crud_inventory.finalize_report_sales(
                db, 
                report_id=report.id, 
                approved_by=current_user.id
            )
            
            # ИЗМЕНЕНИЕ ЗДЕСЬ: Берем город продавца, а не бухгалтера
            seller_city = None
            if report.seller and report.seller.city_id:
                city = db.query(City).filter(City.id == report.seller.city_id).first()
                if city:
                    seller_city = city.name
            else:
                # Если у продавца нет города, пробуем взять город из кластера
                if report.seller and report.seller.cluster_id:
                    cluster = db.query(Cluster).filter(Cluster.id == report.seller.cluster_id).first()
                    if cluster and cluster.city_id:
                        city = db.query(City).filter(City.id == cluster.city_id).first()
                        if city:
                            seller_city = city.name
            
            # Добавляем деньги в общий банк с городом продавца
            description = f"Отчет №{report_id} от {report.seller.full_name}. Продано товаров на сумму: {report.accountant_final_amount}"
            crud_company.add_income(
                db,
                amount=report.accountant_final_amount,
                description=description,
                reference_id=report_id,
                reference_type="REPORT",
                created_by=report.accountant_reviewed_by,
                city=seller_city  # ИСПРАВЛЕНО: теперь город продавца
            )
            
            # ТОЛЬКО ПОСЛЕ ВСЕХ УСПЕШНЫХ ОПЕРАЦИЙ меняем статус
            report.status = ReportStatus.APPROVED
            report.reviewed_by = current_user.id
            report.review_date = datetime.now()
            report.comment = comment
            
            db.commit()
            
            # Уведомляем продавца об утверждении
            _notify_seller_about_approval(db, report, current_user)
            
        except Exception as e:
            db.rollback()
            print(f"Error in final approval: {e}")
            import traceback
            traceback.print_exc()
            raise HTTPException(
                status_code=400, 
                detail=f"Ошибка при утверждении отчета: {str(e)}"
            )
        
    elif action == "reject":
        report.status = ReportStatus.REJECTED
        report.reviewed_by = current_user.id
        report.review_date = datetime.now()
        report.comment = comment
        
        db.commit()
        
        # Перезагружаем отчет со всеми связанными объектами
        report = crud_report.get(db, report_id=report_id)
        
        # Освобождаем зарезервированные товары
        crud_inventory.release_report_reservations(db, report.seller_id, report.id)
        
        # Уведомляем продавца об отклонении
        _notify_seller_about_rejection(db, report, current_user, is_accountant=False)
    
    else:
        raise HTTPException(status_code=400, detail="Неверное действие")
    
    # Обогащаем ответ данными
    return enrich_report_response(report)

@router.put("/{report_id}", response_model=ReportResponse)
def update_report(
    report_id: int,
    report_in: ReportUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles([UserRole.OWNER, UserRole.ADMIN, UserRole.SENIOR_SELLER]))
):
    """Обновить отчет (изменить статус, добавить комментарий)"""
    report = crud_report.update(db, report_id=report_id, report_in=report_in)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    enrich_report_response(report)


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles([UserRole.OWNER]))
):
    """Удалить отчет (только OWNER)"""
    if not crud_report.delete(db, report_id=report_id):
        raise HTTPException(status_code=404, detail="Report not found")
    return None


@router.get("/stats/my", response_model=dict)
def get_my_stats(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить статистику по своим отчетам"""
    return crud_report.get_stats(db, user_id=current_user.id)