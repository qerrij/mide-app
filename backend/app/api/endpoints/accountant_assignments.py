from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.accountant_assignment import crud_accountant_assignment
from app.crud.user import crud_user
from app.schemas.user import UserResponse, UserRole
from app.api.dependencies import get_current_user, require_role
from app.models.user import User

router = APIRouter(prefix="/accountant-assignments", tags=["accountant_assignments"])


@router.get("/hierarchy/{accountant_id}", response_model=Dict[str, Any])
def get_accountant_assignment_hierarchy(
    accountant_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    """
    Получить иерархию пользователей для назначения бухгалтеру
    Возвращает структуру с кустами, группами и пользователями
    Пользователи, уже привязанные к другим бухгалтерам, полностью исключены
    """
    try:
        # Проверяем существование бухгалтера
        accountant = db.query(User).filter(
            User.id == accountant_id,
            User.role == UserRole.ACCOUNTANT,
            User.is_active == True
        ).first()
        
        if not accountant:
            raise HTTPException(status_code=404, detail="Бухгалтер не найден")
        
        return crud_accountant_assignment.get_available_users_hierarchy(db, accountant_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{accountant_id}", response_model=UserResponse)
def assign_users_to_accountant(
    accountant_id: int,
    user_ids: List[int] = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    """
    Назначить пользователей бухгалтеру (полная перезапись)
    Передайте пустой массив, чтобы отвязать всех пользователей
    """
    try:
        accountant = crud_accountant_assignment.assign_users_to_accountant(
            db, accountant_id, user_ids
        )
        crud_user._enrich_user_data(db, accountant)
        return accountant
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{accountant_id}/assigned", response_model=List[int])
def get_assigned_users(
    accountant_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    """
    Получить список ID пользователей, привязанных к бухгалтеру
    """
    return list(crud_accountant_assignment.get_accountant_assignments(db, accountant_id))