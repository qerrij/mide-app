from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.user import crud_user
from app.schemas.user import LoginResponse, Token
from app.core.security import create_access_token
from app.core.config import settings
from app.core.exceptions import InvalidCredentialsException
from app.api.dependencies import get_current_user

router = APIRouter(tags=["authentication"])

# Добавляем OAuth2 схему для Swagger UI
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login",
    scheme_name="JWT"
)


@router.post("/login", response_model=LoginResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    OAuth2 совместимый endpoint для входа.
    """
    user = crud_user.authenticate(db, username=form_data.username, password=form_data.password)
    if not user:
        raise InvalidCredentialsException()
    
    # Обновляем время последнего входа
    crud_user.update_last_login(db, user.id)
    
    # Создаем токен
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id, "role": user.role.value},
        expires_delta=access_token_expires
    )
    
    return LoginResponse(
        access_token=access_token,
        user=user
    )


@router.post("/logout")
def logout(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=LoginResponse)
def read_users_me(current_user = Depends(get_current_user)):
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": current_user.username, "user_id": current_user.id, "role": current_user.role.value},
        expires_delta=access_token_expires
    )
    
    return LoginResponse(
        access_token=access_token,
        user=current_user
    )