from sqlalchemy import create_engine, text

engine = create_engine("postgresql://postgres:postgres@localhost:5432/reports_db")

with engine.connect() as conn:
    # Очищаем таблицу reports
    conn.execute(text("TRUNCATE TABLE reports CASCADE"))
    conn.commit()

print("✅ Таблица reports очищена!")