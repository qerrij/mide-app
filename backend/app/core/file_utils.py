import os
import uuid
from pathlib import Path
from typing import List, Union
from fastapi import UploadFile
import io


def validate_files(files: List[Union[UploadFile, any]]) -> List[str]:
    """Валидация загружаемых файлов (работает с обоими типами)"""
    errors = []
    
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
            
        valid_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.pdf'}
        file_ext = os.path.splitext(filename)[1].lower()
        
        if file_ext not in valid_extensions:
            errors.append(f"Файл {filename} имеет недопустимое расширение")
            continue
        
        # Проверка размера (максимум 10MB)
        max_size = 10 * 1024 * 1024  
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
                errors.append(f"Файл {filename} слишком большой ({file_size / 1024 / 1024:.1f}MB)")
        except Exception as e:
            print(f"Ошибка проверки размера файла {filename}: {e}")
    
    return errors


def save_uploaded_files(files: List[Union[UploadFile, any]], folder_path: str) -> List[str]:
    """Сохранить загруженные файлы (работает с обоими типами)"""
    saved_paths = []
    
    # Создаем директорию
    base_dir = Path(f"uploads/{folder_path}")
    base_dir.mkdir(parents=True, exist_ok=True)
    
    for file in files:
        filename = None
        if hasattr(file, 'filename'):
            filename = file.filename
        elif hasattr(file, 'name'):
            filename = file.name
        
        if filename:
            # Генерируем уникальное имя файла
            file_ext = os.path.splitext(filename)[1].lower()
            if not file_ext:
                file_ext = '.jpg'
            
            unique_filename = f"{uuid.uuid4().hex}{file_ext}"
            
            # Полный путь сохранения
            file_path = base_dir / unique_filename
            
            try:
                # Получаем содержимое файла
                content = None
                if hasattr(file, 'file'):
                    # Если это UploadFile
                    content = file.file.read()
                elif hasattr(file, 'read'):
                    # Если есть метод read
                    content = file.read()
                else:
                    # Пробуем получить как bytes
                    try:
                        content = bytes(file)
                    except:
                        continue
                
                # Сохраняем файл
                if content:
                    with open(file_path, "wb") as buffer:
                        buffer.write(content)
                    
                    # Восстанавливаем позицию чтения если возможно
                    if hasattr(file, 'seek'):
                        file.seek(0)
                    elif hasattr(file, 'file') and hasattr(file.file, 'seek'):
                        file.file.seek(0)
                    
                    # Сохраняем относительный путь
                    relative_path = f"{folder_path}/{unique_filename}"
                    saved_paths.append(relative_path)
                
            except Exception as e:
                print(f"Ошибка сохранения файла {filename}: {e}")
                import traceback
                traceback.print_exc()
    
    return saved_paths


def save_revision_files(files: List[Union[UploadFile, any]], revision_id: str) -> List[str]:
    """Сохранить файлы ревизии (работает с обоими типами)"""
    saved_paths = []
    
    # Создаем директорию для ревизии
    base_dir = Path(f"uploads/revisions/{revision_id}")
    base_dir.mkdir(parents=True, exist_ok=True)
    
    for file in files:
        filename = None
        if hasattr(file, 'filename'):
            filename = file.filename
        elif hasattr(file, 'name'):
            filename = file.name
        
        if filename:
            # Генерируем уникальное имя файла
            file_ext = os.path.splitext(filename)[1].lower()
            if not file_ext:
                file_ext = '.jpg'
            
            unique_filename = f"{uuid.uuid4().hex}{file_ext}"
            
            # Полный путь сохранения
            file_path = base_dir / unique_filename
            
            try:
                # Получаем содержимое файла
                content = None
                if hasattr(file, 'file'):
                    content = file.file.read()
                elif hasattr(file, 'read'):
                    content = file.read()
                else:
                    try:
                        content = bytes(file)
                    except:
                        continue
                
                # Сохраняем файл
                if content:
                    with open(file_path, "wb") as buffer:
                        buffer.write(content)
                    
                    # Восстанавливаем позицию чтения если возможно
                    if hasattr(file, 'seek'):
                        file.seek(0)
                    
                    # Сохраняем относительный путь
                    relative_path = f"revisions/{revision_id}/{unique_filename}"
                    saved_paths.append(relative_path)
                
            except Exception as e:
                print(f"Ошибка сохранения файла ревизии {filename}: {e}")
    
    return saved_paths


def get_file_url(file_path: str) -> str:
    """Получить URL для файла"""
    if not file_path:
        return ""
    
    return f"/uploads/{file_path}"