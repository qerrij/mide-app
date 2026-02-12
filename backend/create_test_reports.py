import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import SessionLocal

def recreate_reports_tables():
    """Пересоздаем таблицы отчетов с новыми статусами и полями"""
    db = SessionLocal()
    try:
        # 1. Удаляем старые таблицы отчетов
        old_tables = [
            "report_products",
            "reports"
        ]
        
        for table in old_tables:
            try:
                db.execute(text(f'DROP TABLE IF EXISTS "{table}" CASCADE'))
            except Exception:
                pass
        
        # 2. Удаляем старый enum тип отчетов
        try:
            db.execute(text('DROP TYPE IF EXISTS reportstatus CASCADE'))
        except Exception:
            pass
        
        db.commit()
        
        # 3. Создаем новый enum тип для статусов отчетов
        try:
            db.execute(text("""
                CREATE TYPE reportstatus AS ENUM (
                    'DRAFT',
                    'SUBMITTED',
                    'AWAITING_FIX',
                    'AWAITING_ACCOUNTANT',
                    'AWAITING_MANAGER',
                    'APPROVED',
                    'REJECTED'
                )
            """))
        except Exception as e:
            print(f"Error creating enum: {e}")
            pass
        
        # 4. Создаем таблицу reports
        try:
            db.execute(text("""
                CREATE TABLE reports (
                    id SERIAL PRIMARY KEY,
                    seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    date TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
                    transfer_amount FLOAT NOT NULL,
                    transfer_photos TEXT[] NOT NULL DEFAULT '{}',
                    status reportstatus NOT NULL DEFAULT 'SUBMITTED',
                    comment TEXT,
                    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    review_date TIMESTAMP WITHOUT TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    
                    -- Поля для бухгалтерской проверки
                    accountant_amount FLOAT,
                    accountant_reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    accountant_comment TEXT,
                    accountant_final_amount FLOAT,
                    accountant_review_date TIMESTAMP WITHOUT TIME ZONE,
                    accountant_status reportstatus,
                    
                    -- Поле для отслеживания, был ли отчет уже на бухгалтерской проверке
                    was_with_accountant BOOLEAN NOT NULL DEFAULT FALSE,
                    
                    CONSTRAINT fk_seller FOREIGN KEY (seller_id) REFERENCES users(id),
                    CONSTRAINT fk_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id),
                    CONSTRAINT fk_accountant_reviewer FOREIGN KEY (accountant_reviewed_by) REFERENCES users(id)
                )
            """))
        except Exception as e:
            print(f"Error creating reports table: {e}")
            raise
        
        # 5. Создаем таблицу report_products
        try:
            db.execute(text("""
                CREATE TABLE report_products (
                    id SERIAL PRIMARY KEY,
                    report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
                    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                    quantity INTEGER NOT NULL DEFAULT 1,
                    sold_amount FLOAT NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    CONSTRAINT fk_report FOREIGN KEY (report_id) REFERENCES reports(id),
                    CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES products(id)
                )
            """))
        except Exception as e:
            print(f"Error creating report_products table: {e}")
            raise
        
        db.commit()
        
        # 6. Создаем индексы для оптимизации запросов
        indexes = [
            ("reports", "seller_id"),
            ("reports", "status"),
            ("reports", "date"),
            ("reports", "created_at"),
            ("reports", "reviewed_by"),
            ("reports", "accountant_reviewed_by"),
            ("reports", "accountant_status"),
            ("report_products", "report_id"),
            ("report_products", "product_id")
        ]
        
        for table, column in indexes:
            try:
                idx_name = f"idx_{table}_{column}"
                db.execute(text(f'CREATE INDEX IF NOT EXISTS {idx_name} ON {table} ({column})'))
            except Exception:
                pass
        
        db.commit()
        return True
            
    except Exception as e:
        db.rollback()
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

def main():
    try:
        recreate_reports_tables()
    except Exception:
        pass

if __name__ == "__main__":
    main()