from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, case, func
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.crud.company import crud_company
from app.api.dependencies import get_current_user, require_roles
from app.models.company import CompanyBalance
from app.models.user import UserRole
from app.models.user import User

router = APIRouter(prefix="/company", tags=["company"])

def get_user_city(current_user) -> Optional[str]:
    """Получить город пользователя из его данных"""
    # Получаем город через связь city_ref
    if current_user and current_user.city_ref:
        return current_user.city_ref.name
    return None

@router.get("/balance")
def get_company_balance(
    city: Optional[str] = Query(None, description="Фильтр по городу"),
    db: Session = Depends(get_db),
    current_user = Depends(require_roles([UserRole.OWNER, UserRole.ACCOUNTANT]))
):
    """Получить текущий баланс компании (общий или по городу)"""
    # Если пользователь бухгалтер, ограничиваем его городом
    if current_user.role == UserRole.ACCOUNTANT:
        user_city = get_user_city(current_user)
        if not user_city:
            raise HTTPException(status_code=403, detail="Бухгалтеру не назначен город")
        # Игнорируем переданный city, используем город бухгалтера
        balance = crud_company.get_balance(db, user_city)
        return {"balance": balance, "city": user_city}
    
    # Для OWNER - используем переданный city или глобальный
    balance = crud_company.get_balance(db, city)
    return {"balance": balance}

@router.get("/balance-by-cities")
def get_balance_by_cities(
    db: Session = Depends(get_db),
    current_user = Depends(require_roles([UserRole.OWNER, UserRole.ACCOUNTANT]))
):
    """Получить баланс по городам"""
    user_city = None
    if current_user.role == UserRole.ACCOUNTANT:
        user_city = get_user_city(current_user)
        if not user_city:
            raise HTTPException(status_code=403, detail="Бухгалтеру не назначен город")
    
    return crud_company.get_balance_by_city(db, user_city)

@router.get("/transactions")
def get_company_transactions(
    operation_type: Optional[str] = Query(None),
    reference_type: Optional[str] = Query(None, description="Фильтр по типу ссылки (REPORT, DEBT_WRITEOFF и т.д.)"),
    city: Optional[str] = Query(None, description="Фильтр по городу"),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    page: int = Query(1, ge=1, description="Номер страницы"),
    page_size: int = Query(50, ge=1, le=100, description="Количество записей на странице"),
    db: Session = Depends(get_db),
    current_user = Depends(require_roles([UserRole.OWNER, UserRole.ACCOUNTANT]))
):
    """Получить транзакции с пагинацией"""
    date_from_dt = None
    date_to_dt = None
    
    if date_from:
        try:
            date_from_dt = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
        except:
            date_from_dt = datetime.strptime(date_from, '%Y-%m-%d')
    
    if date_to:
        try:
            date_to_dt = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
        except:
            date_to_dt = datetime.strptime(date_to, '%Y-%m-%d')
    
    # Для бухгалтера - ограничиваем его городом
    if current_user.role == UserRole.ACCOUNTANT:
        user_city = get_user_city(current_user)
        if not user_city:
            raise HTTPException(status_code=403, detail="Бухгалтеру не назначен город")
        city = user_city
    
    # Получаем общее количество
    count_query = db.query(CompanyBalance)
    if operation_type:
        count_query = count_query.filter(CompanyBalance.operation_type == operation_type)
    if reference_type:
        count_query = count_query.filter(CompanyBalance.reference_type == reference_type)
    if date_from_dt:
        count_query = count_query.filter(CompanyBalance.created_at >= date_from_dt)
    if date_to_dt:
        count_query = count_query.filter(CompanyBalance.created_at <= date_to_dt)
    if city:
        count_query = count_query.filter(CompanyBalance.city == city)
    
    total_count = count_query.count()
    
    # Получаем транзакции с пагинацией
    offset = (page - 1) * page_size
    results = crud_company.get_transactions_with_users(
        db,
        operation_type=operation_type,
        reference_type=reference_type,  # Добавляем фильтрацию по reference_type
        date_from=date_from_dt,
        date_to=date_to_dt,
        city=city,
        limit=page_size,
        offset=offset
    )
    
    transactions = []
    for transaction, created_by_name, created_by_username in results:
        transaction_dict = {
            'id': transaction.id,
            'operation_type': transaction.operation_type,
            'reference_id': transaction.reference_id,
            'created_at': transaction.created_at,
            'created_by': transaction.created_by,
            'created_by_name': created_by_name or f"ID: {transaction.created_by}",
            'created_by_username': created_by_username,
            'amount': transaction.amount,
            'balance': transaction.city_balance if transaction.city else transaction.balance,
            'description': transaction.description,
            'reference_type': transaction.reference_type,
            'city': transaction.city,
            'updated_at': transaction.updated_at
        }
        transactions.append(transaction_dict)
    
    return {
        "items": transactions,
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": (total_count + page_size - 1) // page_size
    }

@router.get("/dashboard-data")
def get_dashboard_data(
    period: str = Query("month", regex="^(day|week|month|all)$"),
    city: Optional[str] = Query(None, description="Фильтр по городу"),
    date: Optional[str] = Query(None, description="Дата для режима 'day'"),
    date_from: Optional[str] = Query(None, description="Начальная дата для произвольного периода"),
    date_to: Optional[str] = Query(None, description="Конечная дата для произвольного периода"),
    max_points: int = Query(100, ge=10, le=200, description="Максимум точек на графике"),
    transactions_limit: int = Query(50, ge=1, le=100, description="Лимит транзакций для дашборда"),
    db: Session = Depends(get_db),
    current_user = Depends(require_roles([UserRole.OWNER, UserRole.ACCOUNTANT]))
):
    """Единый эндпоинт для дашборда - оптимизированная версия"""
    
    # Для бухгалтера - ограничиваем его городом
    if current_user.role == UserRole.ACCOUNTANT:
        user_city = get_user_city(current_user)
        if not user_city:
            raise HTTPException(status_code=403, detail="Бухгалтеру не назначен город")
        city = user_city
    
    # Получаем баланс (быстро, из кэша)
    balance = crud_company.get_balance(db, city)
    
    # Определяем даты
    end_date = datetime.now()
    if end_date.tzinfo is not None:
        end_date = end_date.replace(tzinfo=None)
    
    if period == 'day' and date:
        try:
            target_date = datetime.fromisoformat(date.replace('Z', '+00:00'))
        except:
            target_date = datetime.strptime(date, '%Y-%m-%d')
        
        if target_date.tzinfo is not None:
            target_date = target_date.replace(tzinfo=None)
        
        start_date = datetime(target_date.year, target_date.month, target_date.day, 0, 0, 0)
        end_date = start_date + timedelta(days=1)
        
        # Для дня используем агрегированные данные по часам
        history = get_hourly_aggregated_balance(db, start_date, end_date, city)
        
    elif period == 'week':
        start_date = end_date - timedelta(days=7)
        start_date = datetime(start_date.year, start_date.month, start_date.day, 0, 0, 0)
        # Для недели - агрегированные данные по дням
        history = get_daily_aggregated_balance(db, start_date, end_date, city, max_points)
        
    elif period == 'month':
        start_date = end_date - timedelta(days=30)
        start_date = datetime(start_date.year, start_date.month, start_date.day, 0, 0, 0)
        history = get_daily_aggregated_balance(db, start_date, end_date, city, max_points)
        
    else:  # period == 'all'
        if date_from and date_to:
            try:
                start_date = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
                end_date = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            except:
                start_date = datetime.strptime(date_from, '%Y-%m-%d')
                end_date = datetime.strptime(date_to, '%Y-%m-%d')
            
            if start_date.tzinfo is not None:
                start_date = start_date.replace(tzinfo=None)
            if end_date.tzinfo is not None:
                end_date = end_date.replace(tzinfo=None)
            
            end_date = end_date + timedelta(days=1)
            days = (end_date - start_date).days
            history = get_daily_aggregated_balance(db, start_date, end_date, city, max_points)
        else:
            # Для "все время" - последние 500 транзакций для графика с агрегацией
            history = get_daily_aggregated_balance(db, datetime(2020, 1, 1), end_date, city, max_points)
    
    # Получаем последние транзакции (ограниченное количество)
    transactions_data = db.query(
        CompanyBalance
    ).filter(
        CompanyBalance.city == city if city else True
    ).order_by(
        CompanyBalance.created_at.desc()
    ).limit(transactions_limit).all()
    
    transactions = []
    for transaction in transactions_data:
        # Получаем имя создателя одним запросом (можно оптимизировать с join)
        created_by_name = None
        if transaction.created_by:
            user = db.query(User.full_name).filter(User.id == transaction.created_by).first()
            created_by_name = user[0] if user else None
            
        transactions.append({
            'id': transaction.id,
            'operation_type': transaction.operation_type,
            'created_at': transaction.created_at,
            'amount': transaction.amount,
            'balance': transaction.city_balance if transaction.city else transaction.balance,
            'description': transaction.description,
            'reference_type': transaction.reference_type,
            'city': transaction.city,
            'created_by': transaction.created_by,
            'created_by_name': created_by_name or f"ID: {transaction.created_by}" if transaction.created_by else None
        })
    
    # Получаем список городов
    if current_user.role == UserRole.OWNER:
        cities_query = db.query(CompanyBalance.city).filter(
            CompanyBalance.city.isnot(None)
        ).distinct().all()
        cities = [c[0] for c in cities_query]
    else:
        cities = [city] if city else []
    
    return {
        "balance": balance,
        "transactions": transactions,
        "history": history,
        "cities": cities,
        "has_more": len(transactions) == transactions_limit
    }


def get_hourly_aggregated_balance(db: Session, start_date: datetime, end_date: datetime, city: Optional[str] = None) -> List[dict]:
    """Получить агрегированные почасовые данные баланса для дня"""
    from sqlalchemy import func, case
    
    # Получаем начальный баланс на начало дня
    initial_balance_query = db.query(
        func.sum(
            case(
                (CompanyBalance.operation_type == 'INCOME', CompanyBalance.amount),
                (CompanyBalance.operation_type == 'EXPENSE', -CompanyBalance.amount),
                else_=0
            )
        )
    ).filter(
        CompanyBalance.created_at < start_date
    )
    if city:
        initial_balance_query = initial_balance_query.filter(CompanyBalance.city == city)
    
    initial_balance = initial_balance_query.scalar() or 0
    
    # Агрегируем транзакции по часам
    query = db.query(
        func.date_part('hour', CompanyBalance.created_at).label('hour'),
        func.sum(
            case(
                (CompanyBalance.operation_type == 'INCOME', CompanyBalance.amount),
                (CompanyBalance.operation_type == 'EXPENSE', -CompanyBalance.amount),
                else_=0
            )
        ).label('change')
    ).filter(
        CompanyBalance.created_at >= start_date,
        CompanyBalance.created_at < end_date
    )
    
    if city:
        query = query.filter(CompanyBalance.city == city)
    
    hourly_changes = query.group_by('hour').order_by('hour').all()
    
    # Формируем точки для графика
    history = []
    current_balance = initial_balance
    
    for hour in range(24):
        # Находим изменение за этот час
        change = next((c[1] for c in hourly_changes if int(c[0]) == hour), 0)
        current_balance += change
        
        date_point = start_date + timedelta(hours=hour)
        history.append({
            'date': date_point.isoformat(),
            'balance': current_balance,
            'city': city
        })
    
    return history


def get_daily_aggregated_balance(db: Session, start_date: datetime, end_date: datetime, city: Optional[str] = None, max_points: int = 100) -> List[dict]:
    """Получить агрегированные данные баланса по дням"""
    from sqlalchemy import func, case
    
    # Получаем начальный баланс
    initial_balance_query = db.query(
        func.sum(
            case(
                (CompanyBalance.operation_type == 'INCOME', CompanyBalance.amount),
                (CompanyBalance.operation_type == 'EXPENSE', -CompanyBalance.amount),
                else_=0
            )
        )
    ).filter(
        CompanyBalance.created_at < start_date
    )
    if city:
        initial_balance_query = initial_balance_query.filter(CompanyBalance.city == city)
    
    initial_balance = initial_balance_query.scalar() or 0
    
    # Агрегируем по дням
    query = db.query(
        func.date_trunc('day', CompanyBalance.created_at).label('day'),
        func.sum(
            case(
                (CompanyBalance.operation_type == 'INCOME', CompanyBalance.amount),
                (CompanyBalance.operation_type == 'EXPENSE', -CompanyBalance.amount),
                else_=0
            )
        ).label('change')
    ).filter(
        CompanyBalance.created_at >= start_date,
        CompanyBalance.created_at < end_date
    )
    
    if city:
        query = query.filter(CompanyBalance.city == city)
    
    daily_changes = query.group_by('day').order_by('day').all()
    
    # Формируем точки
    history = []
    current_balance = initial_balance
    total_days = len(daily_changes)
    
    # Если дней слишком много, прореживаем
    step = max(1, total_days // max_points)
    
    for idx, (day, change) in enumerate(daily_changes):
        current_balance += change
        if idx % step == 0 or idx == total_days - 1:
            history.append({
                'date': day.isoformat(),
                'balance': current_balance,
                'city': city
            })
    
    return history

@router.post("/add-income")
def add_company_income(
    amount: float = Query(..., gt=0),
    description: str = Query(...),
    city: Optional[str] = Query(None, description="Город, к которому относится доход"),
    reference_id: Optional[int] = None,
    reference_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles([UserRole.OWNER, UserRole.ACCOUNTANT]))
):
    """Добавить доход"""
    # Для бухгалтера - принудительно используем его город
    if current_user.role == UserRole.ACCOUNTANT:
        user_city = get_user_city(current_user)
        if not user_city:
            raise HTTPException(status_code=403, detail="Бухгалтеру не назначен город")
        city = user_city
    
    try:
        transaction = crud_company.add_income(
            db,
            amount=amount,
            description=description,
            reference_id=reference_id,
            reference_type=reference_type,
            created_by=current_user.id,
            city=city
        )
        return {
            "message": "Доход успешно добавлен",
            "transaction_id": transaction.id,
            "new_balance": transaction.city_balance if city else transaction.balance,
            "city": transaction.city
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/add-expense")
def add_company_expense(
    amount: float = Query(..., gt=0),
    description: str = Query(...),
    city: Optional[str] = Query(None, description="Город, к которому относится расход"),
    reference_id: Optional[int] = None,
    reference_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles([UserRole.OWNER, UserRole.ACCOUNTANT]))
):
    """Добавить расход"""
    # Для бухгалтера - принудительно используем его город
    if current_user.role == UserRole.ACCOUNTANT:
        user_city = get_user_city(current_user)
        if not user_city:
            raise HTTPException(status_code=403, detail="Бухгалтеру не назначен город")
        city = user_city
    
    try:
        transaction = crud_company.add_expense(
            db,
            amount=amount,
            description=description,
            reference_id=reference_id,
            reference_type=reference_type,
            created_by=current_user.id,
            city=city
        )
        return {
            "message": "Расход успешно добавлен",
            "transaction_id": transaction.id,
            "new_balance": transaction.city_balance if city else transaction.balance,
            "city": transaction.city
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    

@router.get("/stats")
def get_company_stats(
    period: str = Query("month", regex="^(day|week|month|all)$"),
    city: Optional[str] = Query(None, description="Фильтр по городу"),
    date: Optional[str] = Query(None, description="Дата для режима 'day'"),
    date_from: Optional[str] = Query(None, description="Начальная дата для произвольного периода"),
    date_to: Optional[str] = Query(None, description="Конечная дата для произвольного периода"),
    db: Session = Depends(get_db),
    current_user = Depends(require_roles([UserRole.OWNER, UserRole.ACCOUNTANT]))
):
    """Получить статистику доходов/расходов за период"""
    
    # Для бухгалтера - ограничиваем его городом
    if current_user.role == UserRole.ACCOUNTANT:
        user_city = get_user_city(current_user)
        if not user_city:
            raise HTTPException(status_code=403, detail="Бухгалтеру не назначен город")
        city = user_city
    
    # Определяем период
    end_date = datetime.now()
    if end_date.tzinfo is not None:
        end_date = end_date.replace(tzinfo=None)
    
    if period == 'day':
        if date:
            try:
                target_date = datetime.fromisoformat(date.replace('Z', '+00:00'))
            except:
                target_date = datetime.strptime(date, '%Y-%m-%d')
        else:
            target_date = end_date
        
        if target_date.tzinfo is not None:
            target_date = target_date.replace(tzinfo=None)
            
        start_date = datetime(target_date.year, target_date.month, target_date.day, 0, 0, 0)
        end_date = start_date + timedelta(days=1)
    elif period == 'week':
        start_date = end_date - timedelta(days=7)
        start_date = datetime(start_date.year, start_date.month, start_date.day, 0, 0, 0)
    elif period == 'month':
        start_date = end_date - timedelta(days=30)
        start_date = datetime(start_date.year, start_date.month, start_date.day, 0, 0, 0)
    elif period == 'all' and date_from and date_to:
        try:
            start_date = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            end_date = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
        except:
            start_date = datetime.strptime(date_from, '%Y-%m-%d')
            end_date = datetime.strptime(date_to, '%Y-%m-%d') + timedelta(days=1)
        
        if start_date.tzinfo is not None:
            start_date = start_date.replace(tzinfo=None)
        if end_date.tzinfo is not None:
            end_date = end_date.replace(tzinfo=None)
    else:
        start_date = datetime(2020, 1, 1)
    
    # Запрос со всей статистикой
    query = db.query(
        func.sum(
            case(
                (CompanyBalance.operation_type == 'INCOME', CompanyBalance.amount),
                else_=0
            )
        ).label('total_income'),
        func.sum(
            case(
                (and_(
                    CompanyBalance.operation_type == 'INCOME',
                    CompanyBalance.reference_type == 'REPORT'
                ), CompanyBalance.amount),
                else_=0
            )
        ).label('report_income'),
        func.sum(
            case(
                (and_(
                    CompanyBalance.operation_type == 'INCOME',
                    CompanyBalance.reference_type == 'DEBT_WRITEOFF'
                ), CompanyBalance.amount),
                else_=0
            )
        ).label('debt_income'),  # Добавляем доходы от долгов
        func.sum(
            case(
                (CompanyBalance.operation_type == 'EXPENSE', CompanyBalance.amount),
                else_=0
            )
        ).label('total_expense'),
        func.sum(
            case(
                (CompanyBalance.operation_type == 'INCOME', 1),
                else_=0
            )
        ).label('income_count'),
        func.sum(
            case(
                (and_(
                    CompanyBalance.operation_type == 'INCOME',
                    CompanyBalance.reference_type == 'REPORT'
                ), 1),
                else_=0
            )
        ).label('report_income_count'),
        func.sum(
            case(
                (and_(
                    CompanyBalance.operation_type == 'INCOME',
                    CompanyBalance.reference_type == 'DEBT_WRITEOFF'
                ), 1),
                else_=0
            )
        ).label('debt_income_count'),  # Добавляем количество доходов от долгов
        func.sum(
            case(
                (CompanyBalance.operation_type == 'EXPENSE', 1),
                else_=0
            )
        ).label('expense_count')
    ).filter(
        CompanyBalance.created_at >= start_date,
        CompanyBalance.created_at <= end_date
    )
    
    if city:
        query = query.filter(CompanyBalance.city == city)
    
    result = query.first()
    
    total_income = float(result[0] if result and result[0] is not None else 0)
    report_income = float(result[1] if result and result[1] is not None else 0)
    debt_income = float(result[2] if result and result[2] is not None else 0)  # Добавляем
    total_expense = float(result[3] if result and result[3] is not None else 0)
    income_count = int(result[4] if result and result[4] is not None else 0)
    report_income_count = int(result[5] if result and result[5] is not None else 0)
    debt_income_count = int(result[6] if result and result[6] is not None else 0)  # Добавляем
    expense_count = int(result[7] if result and result[7] is not None else 0)
    
    regular_income = total_income - report_income - debt_income  # Обычные доходы без отчетов и долгов
    regular_income_count = income_count - report_income_count - debt_income_count
    
    return {
        "regular_income": regular_income,
        "regular_income_count": regular_income_count,
        "report_income": report_income,
        "report_income_count": report_income_count,
        "debt_income": debt_income,  # Добавляем в ответ
        "debt_income_count": debt_income_count,  # Добавляем в ответ
        "total_expense": total_expense,
        "income_count": income_count,
        "expense_count": expense_count,
        "total_income": total_income,
        "period_start": start_date.isoformat(),
        "period_end": end_date.isoformat()
    }