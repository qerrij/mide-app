from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from app.models.product import Product
from app.models.inventory import UserInventory, InventoryReservation
from app.schemas.product import ProductCreate, ProductUpdate


class CRUDProduct:
    def get(self, db: Session, product_id: int) -> Optional[Product]:
        return db.query(Product).options(
            joinedload(Product.category)
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
        db.refresh(db_product)
        return self.get(db, db_product.id)
    
    def update(self, db: Session, product_id: int, product_in: ProductUpdate) -> Optional[Product]:
        db_product = self.get(db, product_id)
        if not db_product:
            return None
        
        update_data = product_in.dict(exclude_unset=True)
        
        if "sku" in update_data and update_data["sku"] != db_product.sku:
            existing = self.get_by_sku(db, update_data["sku"])
            if existing:
                raise ValueError(f"Product with SKU {update_data['sku']} already exists")
        
        for field, value in update_data.items():
            setattr(db_product, field, value)
        
        db.commit()
        db.refresh(db_product)
        return self.get(db, product_id)
    
    def delete(self, db: Session, product_id: int) -> bool:
        """Удалить товар (мягкое удаление) + удалить все остатки и резервы"""
        db_product = db.query(Product).filter(Product.id == product_id).first()
        if not db_product:
            return False
        
        try:
            reservations_deleted = db.query(InventoryReservation).filter(
                InventoryReservation.product_id == product_id
            ).delete(synchronize_session=False)
            
            inventory_deleted = db.query(UserInventory).filter(
                UserInventory.product_id == product_id
            ).delete(synchronize_session=False)
            
            # Мягкое удаление самого товара
            db_product.is_active = False
            
            db.commit()
            
            return True
            
        except Exception as e:
            db.rollback()
            raise e
    
    def hard_delete(self, db: Session, product_id: int) -> bool:
        """
        Полное удаление товара из БД (только для отладки, не использовать в production)
        """
        db_product = db.query(Product).filter(Product.id == product_id).first()
        if not db_product:
            return False
        
        try:
            # Удаляем все резервы
            db.query(InventoryReservation).filter(
                InventoryReservation.product_id == product_id
            ).delete(synchronize_session=False)
            
            # Удаляем все остатки
            db.query(UserInventory).filter(
                UserInventory.product_id == product_id
            ).delete(synchronize_session=False)
            
            # Удаляем сам товар
            db.delete(db_product)
            
            db.commit()
            return True
            
        except Exception as e:
            db.rollback()
            raise e


crud_product = CRUDProduct()