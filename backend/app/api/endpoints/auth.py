from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.user import crud_user
from app.crud.token import crud_refresh_token
from app.schemas.token import LoginResponse, TokenResponse, RefreshTokenRequest
from app.core.security import create_token_pair, create_access_token, decode_access_token
from app.core.config import settings
from app.core.exceptions import InvalidCredentialsException
from app.api.dependencies import get_current_user

router = APIRouter(tags=["authentication"])

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login",
    scheme_name="JWT"
)


@router.post("/login", response_model=LoginResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Вход в систему — возвращает пару токенов"""
    user = crud_user.authenticate(db, username=form_data.username, password=form_data.password)
    if not user:
        raise InvalidCredentialsException()
    
    crud_user.update_last_login(db, user.id)
    
    # Создаем пару токенов
    access_token, refresh_token, refresh_expires_at = create_token_pair(
        user.id, user.username, user.role.value
    )
    
    # Сохраняем refresh token в БД
    crud_refresh_token.create(db, user.id, refresh_token, refresh_expires_at)
    
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh_access_token(
    refresh_request: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """
    Обновить access token используя refresh token
    Фронтенд должен вызывать этот endpoint когда access token истекает
    """
    # Проверяем refresh token в БД
    db_token = crud_refresh_token.get_valid_token(db, refresh_request.refresh_token)
    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    # Получаем пользователя
    user = crud_user.get(db, db_token.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    # Создаем новый access token
    access_token = create_access_token({
        "sub": user.username,
        "user_id": user.id,
        "role": user.role.value
    })
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_request.refresh_token,  # возвращаем тот же refresh token
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user
    )


@router.post("/logout")
def logout(
    refresh_token: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Выход — отзываем refresh token"""
    crud_refresh_token.revoke_token(db, refresh_token)
    return {"message": "Successfully logged out"}


@router.post("/logout-all")
def logout_all_devices(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Выход на всех устройствах — отзываем все refresh токены пользователя"""
    crud_refresh_token.revoke_all_user_tokens(db, current_user.id)
    return {"message": "Successfully logged out from all devices"}