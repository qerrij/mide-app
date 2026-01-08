import os
import uuid
from pathlib import Path
from typing import List
from fastapi import UploadFile
# from PIL import Image
import io


def validate_files(files: List[UploadFile]) -> List[str]:
    """Валидация загружаемых файлов"""
    errors = []
    
    for file in files:
        if not file.filename:
            errors.append(f"Файл без имени не разрешен")
            continue
            
        valid_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'}
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        if file_ext not in valid_extensions:
            errors.append(f"Файл {file.filename} имеет недопустимое расширение")
            continue
        
        # (максимум 10MB)
        max_size = 10 * 1024 * 1024  
        try:
            file.file.seek(0, 2)  
            file_size = file.file.tell()
            file.file.seek(0)  
            
            if file_size > max_size:
                errors.append(f"Файл {file.filename} слишком большой ({file_size / 1024 / 1024:.1f}MB)")
        except:
            pass
    
    return errors


def save_uploaded_files(files: List[UploadFile], report_id: str) -> List[str]:
    """Сохранить загруженные файлы и вернуть список путей"""
    saved_paths = []
    
    # Создаем директорию для отчета
    base_dir = Path(f"uploads/reports/{report_id}")
    base_dir.mkdir(parents=True, exist_ok=True)
    
    for file in files:
        if file.filename:
            # Генерируем уникальное имя файла
            file_ext = os.path.splitext(file.filename)[1].lower()
            if not file_ext:
                file_ext = '.jpg'
            
            unique_filename = f"{uuid.uuid4().hex}{file_ext}"
            
            # Полный путь сохранения
            file_path = base_dir / unique_filename
            
            try:
                # Сохраняем файл
                with open(file_path, "wb") as buffer:
                    content = file.file.read()
                    buffer.write(content)
                
                # Сохраняем относительный путь
                relative_path = f"reports/{report_id}/{unique_filename}"
                saved_paths.append(relative_path)
                
                
            except Exception as e:
                print(f"Ошибка сохранения файла {file.filename}: {e}")
    
    return saved_paths


def get_file_url(file_path: str) -> str:
    """Получить URL для файла"""
    if not file_path:
        return ""
    
    return f"/uploads/{file_path}"