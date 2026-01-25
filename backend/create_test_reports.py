import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from sqlalchemy.orm import Session
from sqlalchemy import text, inspect
from app.database import SessionLocal, engine

def create_new_transfer_tables():
    """Создаем новые таблицы перемещений с исправленной структурой"""
    db = SessionLocal()
    try:
        # 1. Удаляем старые таблицы если они существуют
        old_tables = [
            "transfer_files",
            "transfer_executor_approvals", 
            "transfer_manager_approvals",
            "transfer_discrepancy_items",
            "transfer_items",
            "transfers",
            "transfer_approvals"
        ]
        
        for table in old_tables:
            try:
                db.execute(text(f'DROP TABLE IF EXISTS "{table}" CASCADE'))
            except Exception:
                pass
        
        # 2. Удаляем старые enum типы
        old_enums = [
            "transferstatus",
            "transferitemstatus"
        ]
        
        for enum_type in old_enums:
            try:
                db.execute(text(f'DROP TYPE IF EXISTS {enum_type} CASCADE'))
            except Exception:
                pass
        
        db.commit()
        
        # 3. Создаем новые enum типы
        try:
            db.execute(text("""
                CREATE TYPE transferstatus AS ENUM (
                    'REQUESTED',
                    'PENDING_APPROVAL',
                    'APPROVED',
                    'IN_TRANSIT',
                    'ARRIVED',
                    'CHECKING',
                    'COMPLETED',
                    'REJECTED',
                    'CANCELLED'
                )
            """))
        except Exception:
            pass
        
        try:
            db.execute(text("""
                CREATE TYPE transferitemstatus AS ENUM (
                    'EXPECTED',
                    'RECEIVED',
                    'MISSING',
                    'EXCESS',
                    'REJECTED'
                )
            """))
        except Exception:
            pass
        
        # 4. Создаем новые таблицы с обновленными полями для отслеживания расхождений
        try:
            db.execute(text("""
                CREATE TABLE transfers (
                    id SERIAL PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    created_by_id INTEGER NOT NULL REFERENCES users(id),
                    from_user_id INTEGER NOT NULL REFERENCES users(id),
                    to_user_id INTEGER NOT NULL REFERENCES users(id),
                    executor_id INTEGER REFERENCES users(id),
                    request_type VARCHAR(50) NOT NULL DEFAULT 'user_request',
                    status transferstatus NOT NULL DEFAULT 'REQUESTED',
                    files JSON NOT NULL DEFAULT '[]',
                    arrival_files JSON NOT NULL DEFAULT '[]',
                    discrepancy_files JSON NOT NULL DEFAULT '[]',
                    rejection_reason TEXT,
                    discrepancy_accepted_by_id INTEGER REFERENCES users(id),
                    discrepancy_accepted_at TIMESTAMP WITH TIME ZONE,
                    discrepancy_approved_by_id INTEGER REFERENCES users(id),
                    discrepancy_approved_at TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    approved_at TIMESTAMP WITH TIME ZONE,
                    started_at TIMESTAMP WITH TIME ZONE,
                    arrived_at TIMESTAMP WITH TIME ZONE,
                    completed_at TIMESTAMP WITH TIME ZONE,
                    cancelled_at TIMESTAMP WITH TIME ZONE
                )
            """))
        except Exception:
            pass
        
        try:
            db.execute(text("""
                CREATE TABLE transfer_items (
                    id SERIAL PRIMARY KEY,
                    transfer_id INTEGER NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
                    product_id INTEGER NOT NULL REFERENCES products(id),
                    expected_quantity INTEGER NOT NULL,
                    received_quantity INTEGER DEFAULT 0,
                    status transferitemstatus NOT NULL DEFAULT 'EXPECTED',
                    notes TEXT
                )
            """))
        except Exception:
            pass
        
        try:
            db.execute(text("""
                CREATE TABLE transfer_discrepancy_items (
                    id SERIAL PRIMARY KEY,
                    transfer_id INTEGER NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
                    product_id INTEGER NOT NULL REFERENCES products(id),
                    expected_quantity INTEGER NOT NULL,
                    actual_quantity INTEGER NOT NULL,
                    discrepancy INTEGER NOT NULL,
                    notes TEXT
                )
            """))
        except Exception:
            pass
        
        try:
            db.execute(text("""
                CREATE TABLE transfer_approvals (
                    id SERIAL PRIMARY KEY,
                    transfer_id INTEGER NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    approved BOOLEAN NOT NULL,
                    notes TEXT,
                    approved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    CONSTRAINT uq_transfer_user UNIQUE (transfer_id, user_id)
                )
            """))
        except Exception:
            pass
        
        db.commit()
        
        # 5. Создаем индексы
        indexes = [
            ("transfers", "created_by_id"),
            ("transfers", "from_user_id"),
            ("transfers", "to_user_id"),
            ("transfers", "executor_id"),
            ("transfers", "status"),
            ("transfers", "request_type"),
            ("transfers", "created_at"),
            ("transfers", "discrepancy_accepted_by_id"),
            ("transfers", "discrepancy_approved_by_id"),
            ("transfer_items", "transfer_id"),
            ("transfer_items", "product_id"),
            ("transfer_items", "status"),
            ("transfer_discrepancy_items", "transfer_id"),
            ("transfer_discrepancy_items", "product_id"),
            ("transfer_approvals", "transfer_id"),
            ("transfer_approvals", "user_id"),
            ("transfer_approvals", "approved")
        ]
        
        for table, column in indexes:
            try:
                idx_name = f"idx_{table}_{column}"
                db.execute(text(f'CREATE INDEX IF NOT EXISTS {idx_name} ON {table} ({column})'))
            except Exception:
                pass
        
        db.commit()
        
        return True
            
    except Exception:
        db.rollback()
        return False
    finally:
        db.close()

def main():
    try:
        success = create_new_transfer_tables()
    except Exception:
        pass

if __name__ == "__main__":
    main()