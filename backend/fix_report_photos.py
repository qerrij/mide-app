import boto3
from botocore.config import Config
from app.core.config import settings
from app.database import SessionLocal
from app.models.report import Report
import json

def fix_report_photos():
    """Переместить файлы из temp_ папок в папки с ID отчетов"""
    
    db = SessionLocal()
    
    try:
        # Получаем все отчеты
        reports = db.query(Report).all()
        
        # Инициализируем S3 клиент
        session = boto3.session.Session()
        client = session.client(
            's3',
            endpoint_url=settings.YC_ENDPOINT_URL,
            aws_access_key_id=settings.YC_ACCESS_KEY_ID,
            aws_secret_access_key=settings.YC_SECRET_ACCESS_KEY,
            config=Config(signature_version='s3v4'),
            region_name='ru-central1'
        )
        
        bucket = settings.YC_BUCKET_NAME
        
        for report in reports:
            if not report.transfer_photos:
                continue
            
            new_photo_paths = []
            
            for photo_path in report.transfer_photos:
                # Извлекаем путь из URL если это полный URL
                if photo_path.startswith('http'):
                    import urllib.parse
                    parsed = urllib.parse.urlparse(photo_path)
                    path = parsed.path.lstrip('/')
                    if path.startswith(bucket):
                        path = path[len(bucket):].lstrip('/')
                else:
                    path = photo_path
                
                # Проверяем, есть ли temp_ в пути
                if 'temp_' in path:
                    # Создаем новый путь без temp_
                    new_path = path.replace('temp_', f'{report.id}')
                    
                    try:
                        # Копируем файл
                        client.copy_object(
                            Bucket=bucket,
                            CopySource={'Bucket': bucket, 'Key': path},
                            Key=new_path,
                            ACL='public-read'
                        )
                        
                        # Удаляем старый файл
                        client.delete_object(
                            Bucket=bucket,
                            Key=path
                        )
                        
                        # Формируем новый URL
                        new_url = f"https://storage.yandexcloud.net/{bucket}/{new_path}"
                        new_photo_paths.append(new_url)
                        
                        print(f"✅ Отчет {report.id}: {path} -> {new_path}")
                        
                    except Exception as e:
                        print(f"❌ Отчет {report.id}: ошибка копирования {path}: {e}")
                        new_photo_paths.append(photo_path)
                else:
                    new_photo_paths.append(photo_path)
            
            # Обновляем пути в БД
            if new_photo_paths:
                report.transfer_photos = new_photo_paths
                db.commit()
                print(f"📝 Отчет {report.id}: обновлены пути в БД")
    
    finally:
        db.close()

if __name__ == "__main__":
    fix_report_photos()