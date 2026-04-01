from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.city import crud_city
from app.schemas.city import CityCreate, CityUpdate, CityResponse
from app.api.dependencies import get_current_user, require_role
from app.models.user import UserRole

router = APIRouter(prefix="/cities", tags=["cities"])


@router.get("", response_model=List[CityResponse])
def get_cities(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить список всех городов (доступно всем авторизованным)"""
    return crud_city.get_all(db, skip=skip, limit=limit)


@router.post("", response_model=CityResponse, status_code=status.HTTP_201_CREATED)
def create_city(
    city_in: CityCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    """Создать город (только OWNER)"""
    try:
        return crud_city.create(db, city_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{city_id}", response_model=CityResponse)
def update_city(
    city_id: int,
    city_in: CityUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    """Обновить город (только OWNER)"""
    city = crud_city.update(db, city_id, city_in)
    if not city:
        raise HTTPException(status_code=404, detail="Город не найден")
    return city


@router.delete("/{city_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_city(
    city_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    """Удалить город (только OWNER)"""
    try:
        if not crud_city.delete(db, city_id):
            raise HTTPException(status_code=404, detail="Город не найден")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return None