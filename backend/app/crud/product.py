from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from app.models.product import Product
from app.models.city import City
from app.schemas.product import ProductCreate, ProductUpdate
from app.crud.city import crud_city


class CRUDProduct:
    def get(self, db: Session, product_id: int) -> Optional[Product]:
        return db.query(Product).options(
            joinedload(Product.category),
            joinedload(Product.city)
        ).filter(
            Product.id == product_id,
            Product.is_active == True
        ).first()
    
    def get_by_sku_and_city(self, db: Session, sku: str, city_id: Optional[int] = None) -> Optional[Product]:
        """Получить товар по SKU и ID города"""
        query = db.query(Product).options(
            joinedload(Product.category),
            joinedload(Product.city)
        ).filter(
            Product.sku == sku,
            Product.is_active == True
        )
        
        if city_id:
            # Сначала ищем товар с конкретным городом
            product = query.filter(Product.city_id == city_id).first()
            if product:
                return product
            # Если не нашли, ищем товар без привязки к городу
            return query.filter(Product.city_id == None).first()
        else:
            return query.filter(Product.city_id == None).first()
    
    def get_all(
        self, 
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        category_id: Optional[int] = None,
        city_id: Optional[int] = None
    ) -> List[Product]:
        """Получить все товары с фильтрацией по категории и городу"""
        query = db.query(Product).options(
            joinedload(Product.category),
            joinedload(Product.city)
        ).filter(Product.is_active == True)
        
        if category_id:
            query = query.filter(Product.category_id == category_id)
        
        if city_id:
            # Показываем товары для конкретного города и товары без привязки к городу
            query = query.filter(
                (Product.city_id == city_id) | (Product.city_id == None)
            )
        
        return query.offset(skip).limit(limit).all()
    
    def create(self, db: Session, product_in: ProductCreate) -> Product:
        """Создать товар"""
        # Проверяем, что город существует, если передан city_id
        if product_in.city_id:
            city = crud_city.get(db, product_in.city_id)
            if not city:
                raise ValueError(f"Город с ID {product_in.city_id} не найден")
        
        # Проверяем уникальность SKU + city_id
        existing = db.query(Product).filter(
            Product.sku == product_in.sku,
            Product.city_id == product_in.city_id
        ).first()
        
        if existing:
            city_name = "всех"
            if product_in.city_id:
                city = crud_city.get(db, product_in.city_id)
                city_name = city.name if city else str(product_in.city_id)
            raise ValueError(f"Товар с SKU {product_in.sku} для города {city_name} уже существует")
        
        db_product = Product(
            name=product_in.name,
            category_id=product_in.category_id,
            price=product_in.price,
            sku=product_in.sku,
            description=product_in.description,
            default_rate=product_in.default_rate,
            city_id=product_in.city_id,
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
        
        # Проверяем существование города, если обновляется city_id
        if 'city_id' in update_data and update_data['city_id']:
            city = crud_city.get(db, update_data['city_id'])
            if not city:
                raise ValueError(f"Город с ID {update_data['city_id']} не найден")
        
        # Если обновляем SKU или город, проверяем уникальность
        if 'sku' in update_data or 'city_id' in update_data:
            new_sku = update_data.get('sku', db_product.sku)
            new_city_id = update_data.get('city_id', db_product.city_id)
            
            existing = db.query(Product).filter(
                Product.sku == new_sku,
                Product.city_id == new_city_id,
                Product.id != product_id
            ).first()
            
            if existing:
                city_name = "всех"
                if new_city_id:
                    city = crud_city.get(db, new_city_id)
                    city_name = city.name if city else str(new_city_id)
                raise ValueError(f"Товар с SKU {new_sku} для города {city_name} уже существует")
        
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