from sqlalchemy.orm import Session
from typing import Optional, List
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate


class CRUDProduct:
    def get(self, db: Session, product_id: int) -> Optional[Product]:
        return db.query(Product).filter(Product.id == product_id).first()
    
    def get_by_sku(self, db: Session, sku: str) -> Optional[Product]:
        return db.query(Product).filter(Product.sku == sku).first()
    
    def get_all(
        self, 
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        category: Optional[str] = None
    ) -> List[Product]:
        query = db.query(Product)
        
        if category:
            query = query.filter(Product.category == category)
        
        return query.offset(skip).limit(limit).all()
    
    def create(self, db: Session, product_in: ProductCreate) -> Product:
        # Проверяем уникальность SKU
        existing = self.get_by_sku(db, product_in.sku)
        if existing:
            raise ValueError(f"Product with SKU {product_in.sku} already exists")
        
        db_product = Product(**product_in.dict())
        db.add(db_product)
        db.commit()
        db.refresh(db_product)
        return db_product
    
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
        return db_product
    
    def delete(self, db: Session, product_id: int) -> bool:
        db_product = self.get(db, product_id)
        if not db_product:
            return False
        
        db.delete(db_product)
        db.commit()
        return True


crud_product = CRUDProduct()