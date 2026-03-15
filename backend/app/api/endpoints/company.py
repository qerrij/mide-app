from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.company import crud_company
from app.api.dependencies import get_current_user, require_roles
from app.models.company import CompanyBalance
from app.models.user import User, UserRole
from datetime import datetime, timedelta

router = APIRouter(prefix="/company", tags=["company"])

@router.get("/balance")
def get_company_balance(
    city: Optional[str] = Query(None, description="Фильтр по городу"),
    db: Session = Depends(get_db),
    current_user = Depends(require_roles([UserRole.OWNER, UserRole.ACCOUNTANT]))
):
    """Получить текущий баланс компании (общий или по городу)"""
    balance = crud_company.get_balance(db, city)
    return {"balance": balance}

@router.get("/balance-by-cities")
def get_balance_by_cities(
    db: Session = Depends(get_db),
    current_user = Depends(require_roles([UserRole.OWNER, UserRole.ACCOUNTANT]))
):
    """Получить баланс по городам"""
    return crud_company.get_balance_by_city(db)

@router.get("/transactions")
def get_company_transactions(
    skip: int = 0,
    limit: int = 100,
    operation_type: Optional[str] = Query(None),
    city: Optional[str] = Query(None, description="Фильтр по городу"),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(require_roles([UserRole.OWNER, UserRole.ACCOUNTANT]))
):
    """Получить историю транзакций с информацией о создателе и фильтром по городу"""
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
    
    # Получаем транзакции с информацией о пользователе и фильтром по городу
    results = crud_company.get_transactions_with_users(
        db,
        skip=skip,
        limit=limit,
        operation_type=operation_type,
        date_from=date_from_dt,
        date_to=date_to_dt,
        city=city
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
            'balance': transaction.balance,
            'description': transaction.description,
            'reference_type': transaction.reference_type,
            'city': transaction.city,
            'updated_at': transaction.updated_at
        }
        transactions.append(transaction_dict)
    
    return transactions

@router.get("/stats-by-city")
def get_stats_by_city(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(require_roles([UserRole.OWNER, UserRole.ACCOUNTANT]))
):
    """Получить статистику доходов/расходов по городам за период"""
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
    
    return crud_company.get_stats_by_city(db, date_from_dt, date_to_dt)

@router.get("/balance-history")
def get_balance_history(
    days: int = Query(30, ge=1, le=365),
    granularity: str = Query("day", regex="^(hour|day)$"),
    date: Optional[str] = Query(None),
    city: Optional[str] = Query(None, description="Фильтр по городу"),
    db: Session = Depends(get_db),
    current_user = Depends(require_roles([UserRole.OWNER, UserRole.ACCOUNTANT]))
):
    """
    Получить историю баланса
    - granularity='day': данные по дням (все транзакции)
    - granularity='hour': почасовая статистика за указанную дату (все транзакции)
    """
    if granularity == 'hour':
        if date:
            try:
                target_date = datetime.fromisoformat(date)
            except:
                target_date = datetime.strptime(date, '%Y-%m-%d')
        else:
            target_date = datetime.now()
        
        history = crud_company.get_hourly_balance_history(db, target_date, city)
    else:
        history = crud_company.get_balance_history(db, days=days, city=city)
    
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
    """Добавить доход в общий банк с указанием города"""
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
            "new_balance": transaction.balance,
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
    """Добавить расход из общего банка с указанием города"""
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
            "new_balance": transaction.balance,
            "city": transaction.city
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))