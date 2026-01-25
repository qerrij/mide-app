from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate


class CRUDProduct:
    def get(self, db: Session, product_id: int) -> Optional[Product]:
        return db.query(Product).options(
            joinedload(Product.category)  # Загружаем категорию через relationship
        ).filter(
            Product.id == product_id,
            Product.is_active == True
        ).first()
    
    def get_by_sku(self, db: Session, sku: str) -> Optional[Product]:
        return db.query(Product).options(
            joinedload(Product.category)
        ).filter(
            Product.sku == sku,
            Product.is_active == True
        ).first()
    
    def get_all(
        self, 
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        category_id: Optional[int] = None
    ) -> List[Product]:
        query = db.query(Product).options(
            joinedload(Product.category)
        ).filter(Product.is_active == True)
        
        if category_id:
            query = query.filter(Product.category_id == category_id)
        
        return query.offset(skip).limit(limit).all()
    
    def create(self, db: Session, product_in: ProductCreate) -> Product:
        # Проверяем уникальность SKU
        existing = self.get_by_sku(db, product_in.sku)
        if existing:
            raise ValueError(f"Product with SKU {product_in.sku} already exists")
        
        db_product = Product(
            name=product_in.name,
            category_id=product_in.category_id,
            price=product_in.price,
            sku=product_in.sku,
            description=product_in.description,
            is_active=True
        )
        
        db.add(db_product)
        db.commit()
        db.refresh(db_product)
        # После коммита нужно снова загрузить с категорией
        db.refresh(db_product)
        return self.get(db, db_product.id)  # Загружаем с категорией
    
    def update(self, db: Session, product_id: int, product_in: ProductUpdate) -> Optional[Product]:
        db_product = self.get(db, product_id)
        if not db_product:
            return None
        
        update_data = product_in.dict(exclude_unset=True)
        
        # Проверяем уникальность SKU при обновлении
        if "sku" in update_data and update_data["sku"] != db_product.sku:
            existing = self.get_by_sku(db, update_data["sku"])
            if existing:
                raise ValueError(f"Product with SKU {update_data['sku']} already exists")
        
        for field, value in update_data.items():
            setattr(db_product, field, value)
        
        db.commit()
        db.refresh(db_product)
        return self.get(db, product_id)  # Загружаем с категорией после обновления
    
    def delete(self, db: Session, product_id: int) -> bool:
        db_product = self.get(db, product_id)
        if not db_product:
            return False
        
        db_product.is_active = False
        db.commit()
        return True


crud_product = CRUDProduct()