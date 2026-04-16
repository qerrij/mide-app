from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from jose import JWTError, jwt
from passlib.context import CryptContext
import secrets
from app.core.config import settings

pwd_context = CryptContext(
    schemes=["sha256_crypt", "md5_crypt", "des_crypt"],
    deprecated="auto",
    sha256_crypt__default_rounds=29000,
)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    if len(password) > 128:
        password = password[:128]
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Создает короткоживущий access token (обычно 15-60 минут)"""
    to_encode = data.copy()
    to_encode["type"] = "access"
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token() -> str:
    """Создает долгоживущий refresh token (случайная строка)"""
    return secrets.token_urlsafe(64)


def create_token_pair(user_id: int, username: str, role: str) -> Tuple[str, str, datetime]:
    """
    Создает пару токенов: access + refresh
    Возвращает: (access_token, refresh_token, refresh_expires_at)
    """
    # Access token - короткий срок
    access_token = create_access_token({
        "sub": username,
        "user_id": user_id,
        "role": role
    })
    
    # Refresh token - долгий срок
    refresh_token = create_refresh_token()
    refresh_expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    return access_token, refresh_token, refresh_expires_at


def decode_access_token(token: str) -> Optional[dict]:
    """Декодирует и проверяет access token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


def verify_token_type(token: str, expected_type: str) -> bool:
    """Проверяет тип токена (access или refresh)"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload.get("type") == expected_type
    except JWTError:
        return False


def get_token_expires_at(token: str) -> Optional[datetime]:
    """Получает время истечения токена"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        exp = payload.get("exp")
        if exp:
            return datetime.fromtimestamp(exp, tz=timezone.utc)
        return None
    except JWTError:
        return None


def is_token_expired(token: str) -> bool:
    """Проверяет, истек ли токен"""
    expires_at = get_token_expires_at(token)
    if expires_at is None:
        return True
    return datetime.now(timezone.utc) > expires_at