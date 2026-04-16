from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
from app.models.token import RefreshToken

class CRUDRefreshToken:
    def create(self, db: Session, user_id: int, token: str, expires_at: datetime) -> RefreshToken:
        db_token = RefreshToken(
            user_id=user_id,
            token=token,
            expires_at=expires_at
        )
        db.add(db_token)
        db.commit()
        db.refresh(db_token)
        return db_token
    
    def get_valid_token(self, db: Session, token: str) -> Optional[RefreshToken]:
        """Получить валидный refresh токен"""
        return db.query(RefreshToken).filter(
            RefreshToken.token == token,
            RefreshToken.is_revoked == False,
            RefreshToken.expires_at > datetime.utcnow()
        ).first()
    
    def revoke_token(self, db: Session, token: str) -> bool:
        """Отозвать refresh токен"""
        db_token = db.query(RefreshToken).filter(
            RefreshToken.token == token
        ).first()
        
        if db_token:
            db_token.is_revoked = True
            db_token.revoked_at = datetime.utcnow()
            db.commit()
            return True
        return False
    
    def revoke_all_user_tokens(self, db: Session, user_id: int) -> None:
        """Отозвать все refresh токены пользователя (выход на всех устройствах)"""
        db.query(RefreshToken).filter(
            RefreshToken.user_id == user_id,
            RefreshToken.is_revoked == False
        ).update({
            "is_revoked": True,
            "revoked_at": datetime.utcnow()
        })
        db.commit()

crud_refresh_token = CRUDRefreshToken()