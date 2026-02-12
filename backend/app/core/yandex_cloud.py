import boto3
from botocore.config import Config
from app.core.config import settings
from typing import Optional, BinaryIO
import os
from pathlib import Path
import uuid
from urllib.parse import urlparse

class YandexCloudStorage:
    """Класс для работы с Yandex Cloud Object Storage"""
    
    def __init__(self):
        self.endpoint_url = settings.YC_ENDPOINT_URL
        self.aws_access_key_id = settings.YC_ACCESS_KEY_ID
        self.aws_secret_access_key = settings.YC_SECRET_ACCESS_KEY
        self.bucket_name = settings.YC_BUCKET_NAME
        self.public_url = settings.YC_PUBLIC_URL
        
        # Инициализация клиента S3
        self.session = boto3.session.Session()
        self.client = self.session.client(
            's3',
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.aws_access_key_id,
            aws_secret_access_key=self.aws_secret_access_key,
            config=Config(signature_version='s3v4'),
            region_name='ru-central1'
        )
    
    def upload_file(self, file_content: bytes, file_path: str, content_type: Optional[str] = None) -> str:
        """
        Загрузить файл в Yandex Cloud
        
        Args:
            file_content: содержимое файла в байтах
            file_path: путь для сохранения в бакете (например, reports/123/image.jpg)
            content_type: MIME тип файла
            
        Returns:
            str: URL загруженного файла
        """
        try:
            # Параметры загрузки
            extra_args = {}
            if content_type:
                extra_args['ContentType'] = content_type
            
            # Загрузка файла
            self.client.put_object(
                Bucket=self.bucket_name,
                Key=file_path,
                Body=file_content,
                **extra_args
            )
            
            # Возвращаем URL файла
            if self.public_url:
                return f"{self.public_url}/{file_path}"
            else:
                return f"{self.endpoint_url}/{self.bucket_name}/{file_path}"
                
        except Exception as e:
            print(f"Ошибка загрузки файла в Yandex Cloud: {e}")
            raise
    
    def delete_file(self, file_path: str) -> bool:
        """
        Удалить файл из Yandex Cloud
        
        Args:
            file_path: путь к файлу в бакете
            
        Returns:
            bool: успешно ли удален файл
        """
        try:
            # Извлекаем ключ из URL если передан полный URL
            key = self._extract_key_from_url(file_path)
            
            self.client.delete_object(
                Bucket=self.bucket_name,
                Key=key
            )
            return True
        except Exception as e:
            print(f"Ошибка удаления файла из Yandex Cloud: {e}")
            return False
    
    def get_file_url(self, file_path: str) -> str:
        """
        Получить публичный URL файла
        
        Args:
            file_path: путь к файлу в бакете или полный URL
            
        Returns:
            str: URL файла
        """
        if file_path.startswith('http'):
            return file_path
        
        if self.public_url:
            return f"{self.public_url}/{file_path}"
        else:
            return f"{self.endpoint_url}/{self.bucket_name}/{file_path}"
    
    def _extract_key_from_url(self, url: str) -> str:
        """Извлечь ключ объекта из URL"""
        if url.startswith('http'):
            # Пытаемся извлечь путь из URL
            parsed = urlparse(url)
            path = parsed.path.lstrip('/')
            
            # Убираем имя бакета из пути если оно есть
            if path.startswith(self.bucket_name):
                path = path[len(self.bucket_name):].lstrip('/')
            
            return path
        return url
    
    def generate_unique_filename(self, original_filename: str) -> str:
        """Генерирует уникальное имя файла"""
        ext = Path(original_filename).suffix.lower()
        if not ext:
            ext = '.jpg'
        return f"{uuid.uuid4().hex}{ext}"


# Создаем глобальный экземпляр
yc_storage = YandexCloudStorage()