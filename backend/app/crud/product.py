from sqlalchemy.orm import Session
from typing import Optional, List
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate


class CRUDProduct:
    def get(self, db: Session, product_id: int) -> Optional[Product]:
        return db.query(Product).filter(
            Product.id == product_id,
            Product.is_active == True
        ).first()
    
    def get_by_sku_and_city(self, db: Session, sku: str, city: Optional[str] = None) -> Optional[Product]:
        """Получить товар по SKU и городу"""
        query = db.query(Product).filter(
            Product.sku == sku,
            Product.is_active == True
        )
        
        if city:
            # Сначала ищем товар с конкретным городом
            product = query.filter(Product.city == city).first()
            if product:
                return product
            # Если не нашли, ищем товар без привязки к городу
            return query.filter(Product.city == None).first()
        else:
            return query.filter(Product.city == None).first()
    
    def get_all(
        self, 
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        category_id: Optional[int] = None,
        city: Optional[str] = None
    ) -> List[Product]:
        """Получить все товары с фильтрацией по категории и городу"""
        query = db.query(Product).filter(Product.is_active == True)
        
        if category_id:
            query = query.filter(Product.category_id == category_id)
        
        if city:
            # Показываем товары для конкретного города и товары без привязки к городу
            query = query.filter(
                (Product.city == city) | (Product.city == None)
            )
        
        return query.offset(skip).limit(limit).all()
    
    def create(self, db: Session, product_in: ProductCreate) -> Product:
        """Создать товар"""
        # Проверяем уникальность SKU + city
        existing = db.query(Product).filter(
            Product.sku == product_in.sku,
            Product.city == product_in.city
        ).first()
        
        if existing:
            raise ValueError(f"Товар с SKU {product_in.sku} для города {product_in.city or 'всех'} уже существует")
        
        db_product = Product(
            name=product_in.name,
            category_id=product_in.category_id,
            price=product_in.price,
            sku=product_in.sku,
            description=product_in.description,
            default_rate=product_in.default_rate,
            city=product_in.city,
            is_active=True
        )
        
        db.add(db_product)
        db.commit()
        db.refresh(db_product)
        
        return db_product
    
    def update(self, db: Session, product_id: int, product_in: ProductUpdate) -> Optional[Product]:
        """Обновить товар"""
        db_product = self.get(db, product_id)
        if not db_product:
            return None
        
        update_data = product_in.model_dump(exclude_unset=True)
        
        # Если обновляем SKU или город, проверяем уникальность
        if 'sku' in update_data or 'city' in update_data:
            new_sku = update_data.get('sku', db_product.sku)
            new_city = update_data.get('city', db_product.city)
            
            existing = db.query(Product).filter(
                Product.sku == new_sku,
                Product.city == new_city,
                Product.id != product_id
            ).first()
            
            if existing:
                raise ValueError(f"Товар с SKU {new_sku} для города {new_city or 'всех'} уже существует")
        
        for field, value in update_data.items():
            setattr(db_product, field, value)
        
        db.commit()
        db.refresh(db_product)
        
        return db_product
    
    def delete(self, db: Session, product_id: int) -> bool:
        """Мягкое удаление товара"""
        db_product = self.get(db, product_id)
        if not db_product:
            return False
        
        db_product.is_active = False
        db.commit()
        return True


crud_product = CRUDProduct()