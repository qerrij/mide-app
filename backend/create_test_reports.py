from sqlalchemy import create_engine, text

engine = create_engine("postgresql://postgres:postgres@localhost:5432/reports_db")

with engine.connect() as conn:
    conn.execute(text("SET session_replication_role = 'replica';"))
    
    conn.execute(text("DELETE FROM reports;"))
    conn.execute(text("DELETE FROM report_products;"))
    
    conn.execute(text("ALTER SEQUENCE reports_id_seq RESTART WITH 1;"))
    conn.execute(text("ALTER SEQUENCE report_products_id_seq RESTART WITH 1;"))
    
    conn.execute(text("SET session_replication_role = 'origin';"))
    
    conn.commit()

print("Таблицы reports и report_products очищены.")