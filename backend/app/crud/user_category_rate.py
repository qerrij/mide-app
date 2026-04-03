from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.user_category_rate import UserCategoryRate
from app.schemas.user_category_rate import UserCategoryRateCreate


class CRUDUserCategoryRate:
    
    def get_by_user(self, db: Session, user_id: int) -> List[UserCategoryRate]:
        """Получить все ставки пользователя по категориям"""
        return db.query(UserCategoryRate).filter(
            UserCategoryRate.user_id == user_id
        ).all()
    
    def get_by_category(
        self, 
        db: Session, 
        user_id: int, 
        category_id: int
    ) -> Optional[UserCategoryRate]:
        """Получить ставку пользователя для конкретной категории"""
        return db.query(UserCategoryRate).filter(
            UserCategoryRate.user_id == user_id,
            UserCategoryRate.category_id == category_id
        ).first()
    
    def get_rate_for_product(
        self, 
        db: Session, 
        user_id: int, 
        product_category_id: Optional[int]
    ) -> float:
        """
        Получить ставку для товара:
        1. Если есть ставка для категории товара - используем её
        2. Иначе ставка = 0
        """
        if not product_category_id:
            return 0.0
        
        category_rate = self.get_by_category(db, user_id, product_category_id)
        if category_rate:
            return category_rate.rate
        
        return 0.0
    
    def create_or_update(
        self, 
        db: Session, 
        user_id: int, 
        category_id: int, 
        rate: float
    ) -> UserCategoryRate:
        """Создать или обновить ставку для категории"""
        existing = self.get_by_category(db, user_id, category_id)
        
        if existing:
            existing.rate = rate
            db.commit()
            db.refresh(existing)
            return existing
        else:
            new_rate = UserCategoryRate(
                user_id=user_id,
                category_id=category_id,
                rate=rate
            )
            db.add(new_rate)
            db.commit()
            db.refresh(new_rate)
            return new_rate
    
    def bulk_create_or_update(
        self, 
        db: Session, 
        user_id: int, 
        rates: List[UserCategoryRateCreate]
    ) -> List[UserCategoryRate]:
        """Массовое создание/обновление ставок"""
        result = []
        
        # Получаем существующие ставки
        existing_rates = {r.category_id: r for r in self.get_by_user(db, user_id)}
        
        for rate_data in rates:
            if rate_data.category_id in existing_rates:
                # Обновляем существующую
                existing = existing_rates[rate_data.category_id]
                existing.rate = rate_data.rate
                result.append(existing)
            else:
                # Создаем новую
                new_rate = UserCategoryRate(
                    user_id=user_id,
                    category_id=rate_data.category_id,
                    rate=rate_data.rate
                )
                db.add(new_rate)
                result.append(new_rate)
        
        # Удаляем ставки, которых нет в новом списке
        new_category_ids = {r.category_id for r in rates}
        for cat_id, existing in existing_rates.items():
            if cat_id not in new_category_ids:
                db.delete(existing)
        
        db.commit()
        
        for rate in result:
            db.refresh(rate)
        
        return result
    
    def delete(self, db: Session, user_id: int, category_id: int) -> bool:
        """Удалить ставку для категории"""
        rate = self.get_by_category(db, user_id, category_id)
        if rate:
            db.delete(rate)
            db.commit()
            return True
        return False
    
    def delete_all_for_user(self, db: Session, user_id: int) -> bool:
        """Удалить все ставки пользователя"""
        rates = self.get_by_user(db, user_id)
        for rate in rates:
            db.delete(rate)
        db.commit()
        return True


crud_user_category_rate = CRUDUserCategoryRate()