FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p uploads

CMD ["sh", "-c", "python -c \"import sys; sys.path.append('.'); exec(open('scripts/init_db.py').read())\" && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}"]