import os
import uuid
from pathlib import Path
from typing import List, Union, Optional
from fastapi import UploadFile
import io
from app.core.yandex_cloud import yc_storage


def validate_files(files: List[Union[UploadFile, any]]) -> List[str]:
    """Валидация загружаемых файлов (работает с обоими типами)"""
    errors = []
    
    # Расширенные списки разрешенных расширений
    image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.heic', '.heif', '.tiff', '.tif'}
    video_extensions = {'.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv', '.m4v', '.mpg', '.mpeg', '.3gp'}
    document_extensions = {'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt'}
    
    # Объединяем все разрешенные расширения
    valid_extensions = image_extensions | video_extensions | document_extensions
    
    for file in files:
        # Проверяем есть ли имя файла
        filename = None
        if hasattr(file, 'filename'):
            filename = file.filename
        elif hasattr(file, 'name'):
            filename = file.name
        
        if not filename:
            errors.append(f"Файл без имени не разрешен")
            continue
        
        # Получаем расширение файла
        file_ext = Path(filename).suffix.lower()
        
        if not file_ext:
            errors.append(f"Файл {filename} не имеет расширения")
            continue
        
        if file_ext not in valid_extensions:
            errors.append(f"Файл {filename} имеет недопустимое расширение {file_ext}")
            continue
        
        # Проверка размера (максимум 100MB для видео, 10MB для остальных)
        max_size = 1000 * 1024 * 1024 if file_ext in video_extensions else 10 * 1024 * 1024
        
        try:
            if hasattr(file, 'file'):
                file.file.seek(0, 2)  
                file_size = file.file.tell()
                file.file.seek(0)  
            elif hasattr(file, 'size'):
                file_size = file.size
            else:
                # Пытаемся определить размер другим способом
                try:
                    content = file.read() if hasattr(file, 'read') else b''
                    file_size = len(content)
                    if hasattr(file, 'seek'):
                        file.seek(0)
                except:
                    file_size = 0
            
            if file_size > max_size:
                size_mb = file_size / 1024 / 1024
                max_mb = max_size / 1024 / 1024
                errors.append(f"Файл {filename} слишком большой ({size_mb:.1f}MB). Максимум: {max_mb}MB")
        
        except Exception as e:
            print(f"Ошибка проверки размера файла {filename}: {e}")
    
    return errors


def save_uploaded_files(files: List[Union[UploadFile, any]], folder_path: str) -> List[str]:
    """
    Сохранить загруженные файлы в Yandex Cloud
    ПОЛНОСТЬЮ СОХРАНЯЕТ СТАРЫЙ ИНТЕРФЕЙС, но сохраняет в облако
    """
    saved_paths = []
    
    for file in files:
        filename = None
        if hasattr(file, 'filename'):
            filename = file.filename
        elif hasattr(file, 'name'):
            filename = file.name
        
        if not filename:
            continue
        
        try:
            # Получаем содержимое файла
            content = None
            if hasattr(file, 'file'):
                content = file.file.read()
                file.file.seek(0)
            elif hasattr(file, 'read'):
                content = file.read()
                file.seek(0)
            else:
                try:
                    content = bytes(file)
                except:
                    continue
            
            if content:
                # Генерируем уникальное имя файла
                file_ext = os.path.splitext(filename)[1].lower()
                if not file_ext:
                    file_ext = '.jpg'
                
                unique_filename = f"{uuid.uuid4().hex}{file_ext}"
                
                # Полный путь в бакете
                cloud_path = f"{folder_path}/{unique_filename}"
                
                # Загружаем в Yandex Cloud
                file_url = yc_storage.upload_file(
                    file_content=content,
                    file_path=cloud_path
                )
                
                # СОХРАНЯЕМ ОТНОСИТЕЛЬНЫЙ ПУТЬ для обратной совместимости
                # Важно: сохраняем именно путь, а не URL
                relative_path = f"{folder_path}/{unique_filename}"
                saved_paths.append(relative_path)
                
                print(f"Файл {filename} загружен в Yandex Cloud: {cloud_path}")
                
        except Exception as e:
            print(f"Ошибка сохранения файла {filename}: {e}")
            import traceback
            traceback.print_exc()
    
    return saved_paths


def save_revision_files(files: List[Union[UploadFile, any]], revision_id: str) -> List[str]:
    """Сохранить файлы ревизии в Yandex Cloud"""
    return save_uploaded_files(files, f"revisions/{revision_id}")


def get_file_url(file_path: str) -> str:
    """
    Получить URL для файла из Yandex Cloud
    ПОЛНОСТЬЮ СОХРАНЯЕТ СТАРЫЙ ИНТЕРФЕЙС
    """
    if not file_path:
        return ""
    
    # Если это уже полный URL, возвращаем как есть
    if file_path.startswith('http'):
        return file_path
    
    # Иначе формируем URL из относительного пути
    return yc_storage.get_file_url(file_path)


def delete_file(file_path: str) -> bool:
    """
    Удалить файл из Yandex Cloud
    НОВЫЙ МЕТОД для удаления файлов
    """
    if not file_path:
        return False
    
    try:
        return yc_storage.delete_file(file_path)
    except Exception as e:
        print(f"Ошибка удаления файла {file_path}: {e}")
        return False