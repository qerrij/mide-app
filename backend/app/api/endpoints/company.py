# endpoints/company.py
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.company import crud_company
from app.api.dependencies import get_current_user, require_roles  # Изменен импорт
from app.models.user import UserRole
from datetime import datetime, timedelta

router = APIRouter(prefix="/company", tags=["company"])

@router.get("/balance")
def get_company_balance(
    db: Session = Depends(get_db),
    current_user = Depends(require_roles([UserRole.OWNER, UserRole.ACCOUNTANT]))  # Изменено
):
    """Получить текущий баланс компании"""
    balance = crud_company.get_balance(db)
    return {"balance": balance}

@router.get("/transactions")
def get_company_transactions(
    skip: int = 0,
    limit: int = 100,
    operation_type: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(require_roles([UserRole.OWNER, UserRole.ACCOUNTANT]))  # Изменено
):
    """Получить историю транзакций"""
    # Преобразуем даты
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
    
    transactions = crud_company.get_transactions(
        db,
        skip=skip,
        limit=limit,
        operation_type=operation_type,
        date_from=date_from_dt,
        date_to=date_to_dt
    )
    
    return transactions

@router.get("/balance-history")
def get_balance_history(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user = Depends(require_roles([UserRole.OWNER, UserRole.ACCOUNTANT]))  # Изменено
):
    """Получить историю баланса за последние N дней"""
    history = crud_company.get_balance_history(db, days=days)
    return history

@router.post("/add-income")
def add_company_income(
    amount: float = Query(..., gt=0),
    description: str = Query(...),
    reference_id: Optional[int] = None,
    reference_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles([UserRole.OWNER, UserRole.ACCOUNTANT]))  # Изменено
):
    """Добавить доход в общий банк"""
    try:
        transaction = crud_company.add_income(
            db,
            amount=amount,
            description=description,
            reference_id=reference_id,
            reference_type=reference_type,
            created_by=current_user.id
        )
        return {
            "message": "Доход успешно добавлен",
            "transaction_id": transaction.id,
            "new_balance": transaction.balance
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/add-expense")
def add_company_expense(
    amount: float = Query(..., gt=0),
    description: str = Query(...),
    reference_id: Optional[int] = None,
    reference_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles([UserRole.OWNER, UserRole.ACCOUNTANT]))  # Изменено
):
    """Добавить расход из общего банка"""
    try:
        transaction = crud_company.add_expense(
            db,
            amount=amount,
            description=description,
            reference_id=reference_id,
            reference_type=reference_type,
            created_by=current_user.id
        )
        return {
            "message": "Расход успешно добавлен",
            "transaction_id": transaction.id,
            "new_balance": transaction.balance
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))