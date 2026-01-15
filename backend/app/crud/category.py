from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.category import ProductCategory


class CRUDCategory:
    def get(self, db: Session, category_id: int) -> Optional[ProductCategory]:
        return db.query(ProductCategory).filter(
            ProductCategory.id == category_id,
            ProductCategory.is_active == True
        ).first()
    
    def get_by_name(self, db: Session, name: str) -> Optional[ProductCategory]:
        return db.query(ProductCategory).filter(
            ProductCategory.name == name,
            ProductCategory.is_active == True
        ).first()
    
    def get_all(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100
    ) -> List[ProductCategory]:
        return db.query(ProductCategory).filter(
            ProductCategory.is_active == True
        ).offset(skip).limit(limit).all()
    
    def create(
        self,
        db: Session,
        name: str,
        description: Optional[str] = None
    ) -> ProductCategory:
        # Проверяем, нет ли уже категории с таким именем
        existing = self.get_by_name(db, name)
        if existing:
            raise ValueError(f"Категория с именем '{name}' уже существует")
        
        category = ProductCategory(
            name=name,
            description=description
        )
        
        db.add(category)
        db.commit()
        db.refresh(category)
        return category
    
    def update(
        self,
        db: Session,
        category_id: int,
        name: Optional[str] = None,
        description: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> Optional[ProductCategory]:
        category = self.get(db, category_id)
        if not category:
            return None
        
        if name and name != category.name:
            # Проверяем, нет ли другой категории с таким именем
            existing = self.get_by_name(db, name)
            if existing and existing.id != category_id:
                raise ValueError(f"Категория с именем '{name}' уже существует")
            category.name = name
        
        if description is not None:
            category.description = description
        
        if is_active is not None:
            category.is_active = is_active
        
        db.commit()
        db.refresh(category)
        return category
    
    def delete(self, db: Session, category_id: int) -> bool:
        category = self.get(db, category_id)
        if not category:
            return False
        
        # Вместо удаления деактивируем
        category.is_active = False
        db.commit()
        return True


crud_category = CRUDCategory()