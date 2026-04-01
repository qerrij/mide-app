from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.city import City
from app.schemas.city import CityCreate, CityUpdate


class CRUDCity:
    def get(self, db: Session, city_id: int) -> Optional[City]:
        return db.query(City).filter(City.id == city_id, City.is_active == True).first()
    
    def get_by_name(self, db: Session, name: str) -> Optional[City]:
        return db.query(City).filter(City.name == name, City.is_active == True).first()
    
    def get_all(self, db: Session, skip: int = 0, limit: int = 100) -> List[City]:
        return db.query(City).filter(City.is_active == True).offset(skip).limit(limit).all()
    
    def create(self, db: Session, city_in: CityCreate) -> City:
        # Проверяем, не существует ли уже такой город
        existing = self.get_by_name(db, city_in.name)
        if existing:
            raise ValueError(f"Город '{city_in.name}' уже существует")
        
        city = City(
            name=city_in.name,
            region=city_in.region
        )
        db.add(city)
        db.commit()
        db.refresh(city)
        return city
    
    def update(self, db: Session, city_id: int, city_in: CityUpdate) -> Optional[City]:
        city = self.get(db, city_id)
        if not city:
            return None
        
        update_data = city_in.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(city, field, value)
        
        db.commit()
        db.refresh(city)
        return city
    
    def delete(self, db: Session, city_id: int) -> bool:
        city = self.get(db, city_id)
        if not city:
            return False
        
        # Проверяем, есть ли пользователи в этом городе
        if city.users:
            raise ValueError(f"Нельзя удалить город '{city.name}', так как есть пользователи")
        
        city.is_active = False
        db.commit()
        return True
    
    def get_or_create(self, db: Session, city_name: str, region: Optional[str] = None) -> City:
        """Получить город или создать если не существует"""
        city = self.get_by_name(db, city_name)
        if not city:
            city = self.create(db, CityCreate(name=city_name, region=region))
        return city


crud_city = CRUDCity()