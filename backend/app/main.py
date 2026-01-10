from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from app.core.config import settings
from app.api.endpoints import auth, users, products, reports, groups, clusters, assignments, categories
from app.database import engine
# from app.models import user, product, report, group, cluster, inventory, company, category
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import os

# Создаем директории для загрузки файлов
os.makedirs("uploads/reports", exist_ok=True)

# Создаем все таблицы в базе данных
# Важно: создавать в правильном порядке чтобы избежать проблем с внешними ключами
# user.Base.metadata.create_all(bind=engine)
# category.Base.metadata.create_all(bind=engine)
# product.Base.metadata.create_all(bind=engine)
# group.Base.metadata.create_all(bind=engine)
# cluster.Base.metadata.create_all(bind=engine)
# inventory.Base.metadata.create_all(bind=engine)
# report.Base.metadata.create_all(bind=engine)
# company.Base.metadata.create_all(bind=engine)

# Создаем FastAPI приложение
app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Создаем директорию для загрузок
uploads_dir = Path("uploads")
uploads_dir.mkdir(exist_ok=True)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Монтируем статические файлы
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Подключаем роутеры
app.include_router(auth.router, prefix="/api/auth")
app.include_router(users.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(groups.router, prefix="/api")
app.include_router(clusters.router, prefix="/api")
app.include_router(assignments.router, prefix="/api")

# Добавьте эти новые роутеры когда создадите их:
from app.api.endpoints import inventory, company
app.include_router(inventory.router, prefix="/api")
app.include_router(company.router, prefix="/api")
app.include_router(categories.router, prefix="/api")


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title=settings.APP_NAME,
        version=app.version,
        description="Reports System API",
        routes=app.routes,
    )
    
    openapi_schema["components"]["securitySchemes"] = {
        "OAuth2PasswordBearer": {
            "type": "oauth2",
            "flows": {
                "password": {
                    "tokenUrl": "/api/auth/login",
                    "scopes": {}
                }
            }
        }
    }
    
    for path in openapi_schema["paths"].values():
        for method in path.values():
            method["security"] = [{"OAuth2PasswordBearer": []}]
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

@app.get("/")
def read_root():
    return {
        "message": "Reports System API",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}