from typing import Dict, List, Optional
from app.models.user import User
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.user import crud_user
from app.schemas.user import UserBasicResponse, UserNameResponse, UserResponse, UserCreate, UserUpdate, UserRole, UsersNamesResponse, UserPasswordChange
from app.api.dependencies import get_current_user, require_role, require_roles

router = APIRouter(prefix="/users", tags=["users"])

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    try:
        user = crud_user.create(db, user_in=user_in, created_by=current_user.id)
        return user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
@router.get("/names", response_model=UsersNamesResponse)
def get_users_names(
    user_ids: str = Query("", description="Список ID пользователей через запятую. Пример: 1,2,3"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Получить ФИО пользователей по списку ID.
    Доступно всем авторизованным пользователям.
    """
    try:
        # Логирование для отладки
        print(f"DEBUG get_users_names: user_ids='{user_ids}'")
        
        if not user_ids or not user_ids.strip():
            return UsersNamesResponse(user_names={})
        
        # Парсим строку с ID
        ids_list = []
        for id_str in user_ids.split(","):
            id_str = id_str.strip()
            if id_str:
                try:
                    user_id = int(id_str)
                    if user_id > 0:
                        ids_list.append(user_id)
                except ValueError:
                    continue
        
        print(f"DEBUG: Parsed IDs: {ids_list}")
        
        if not ids_list:
            return UsersNamesResponse(user_names={})
        
        # Удаляем дубликаты
        unique_ids = list(set(ids_list))
        
        # Получаем пользователей
        users = db.query(User).filter(
            User.id.in_(unique_ids),
            User.is_active == True
        ).all()
        
        # Возвращаем словарь {id: full_name}
        result = {}
        for user in users:
            result[str(user.id)] = user.full_name  # Ключ как строка!
        
        # Добавляем отсутствующие ID с дефолтным значением
        for user_id in unique_ids:
            str_user_id = str(user_id)
            if str_user_id not in result:
                result[str_user_id] = f"Пользователь {user_id}"
        
        return UsersNamesResponse(user_names=result)
        
    except Exception as e:
        error_msg = f"Error getting user names: {str(e)}"
        import traceback
        traceback.print_exc()
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )

@router.get("/{user_id}/name", response_model=UserNameResponse)
def get_user_name(
    user_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Получить ФИО одного пользователя по ID.
    Доступно всем авторизованным пользователям.
    """
    try:
        print(f"DEBUG get_user_name: user_id={user_id}")
        
        user = db.query(User).filter(
            User.id == user_id,
            User.is_active == True
        ).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found"
            )
        
        return UserNameResponse(id=user.id, full_name=user.full_name)
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Error getting user name for ID {user_id}: {str(e)}"
        import traceback
        traceback.print_exc()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_msg
        )

@router.get("/all-basic", response_model=List[UserBasicResponse])
def get_all_users_basic(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить список всех пользователей (только id и ФИО)"""
    try:
        users = db.query(User).filter(User.is_active == True).all()
        return users
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/me", response_model=UserResponse)
def read_current_user(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Обогащаем данные текущего пользователя
    crud_user._enrich_user_data(db, current_user)
    return current_user


@router.get("", response_model=List[UserResponse])
def read_users(
    skip: int = 0,
    limit: int = 100,
    role: Optional[UserRole] = None,
    group_id: Optional[int] = None,
    cluster_id: Optional[int] = None,
    mentor_id: Optional[int] = None,
    senior_seller_id: Optional[int] = None,
    admin_id: Optional[int] = None,
    city_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Получить пользователей с учетом роли текущего пользователя"""
    
    # Сначала обогащаем данные текущего пользователя
    crud_user._enrich_user_data(db, current_user)
    
    # OWNER получает всех пользователей с фильтрами
    if current_user.role == UserRole.OWNER:
        query = db.query(User).filter(User.is_active == True)
        
        if role:
            query = query.filter(User.role == role)
        if group_id:
            query = query.filter(User.group_id == group_id)
        if cluster_id:
            query = query.filter(User.cluster_id == cluster_id)
        if mentor_id:
            query = query.filter(User.mentor_id == mentor_id)
        if senior_seller_id:
            query = query.filter(User.senior_seller_id == senior_seller_id)
        if admin_id:
            query = query.filter(User.admin_id == admin_id)
        if city_id:
            query = query.filter(User.city_id == city_id)
        
        users = query.order_by(User.id).offset(skip).limit(limit).all()
        
        # Обогащаем данные
        enriched_users = []
        for user in users:
            crud_user._enrich_user_data(db, user)
            enriched_users.append(user)
        
        return enriched_users
    
    # ADMIN получает пользователей своих кустов
    elif current_user.role == UserRole.ADMIN:
        # Проверяем admin_clusters - они должны быть обогащены
        admin_clusters = getattr(current_user, 'admin_clusters', [])
        
        if not admin_clusters:
            return []
        
        query = db.query(User).filter(
            User.is_active == True
        )
        
        # Фильтруем по кустам администратора
        if admin_clusters:
            query = query.filter(User.cluster_id.in_(admin_clusters))
        
        if role:
            query = query.filter(User.role == role)
        
        # Дополнительные фильтры для администратора
        if group_id:
            query = query.filter(User.group_id == group_id)
        if mentor_id:
            query = query.filter(User.mentor_id == mentor_id)
        if senior_seller_id:
            query = query.filter(User.senior_seller_id == senior_seller_id)
        if city_id:
            query = query.filter(User.city_id == city_id)
        
        users = query.order_by(User.id).offset(skip).limit(limit).all()
        
        # Обогащаем данные
        enriched_users = []
        for user in users:
            crud_user._enrich_user_data(db, user)
            enriched_users.append(user)
        
        return enriched_users
    
    # SENIOR_SELLER получает пользователей своего куста
    elif current_user.role == UserRole.SENIOR_SELLER:
        if not current_user.cluster_id:
            return []
        
        query = db.query(User).filter(
            User.cluster_id == current_user.cluster_id,
            User.is_active == True
        )
        
        if role:
            query = query.filter(User.role == role)
        if city_id:
            query = query.filter(User.city_id == city_id)
        
        users = query.order_by(User.id).offset(skip).limit(limit).all()
        
        # Обогащаем данные
        enriched_users = []
        for user in users:
            crud_user._enrich_user_data(db, user)
            enriched_users.append(user)
        
        return enriched_users
    
    # MENTOR получает своих подопечных
    elif current_user.role == UserRole.MENTOR:
        query = db.query(User).filter(
            User.mentor_id == current_user.id,
            User.is_active == True
        )
        
        if role:
            query = query.filter(User.role == role)
        if city_id:
            query = query.filter(User.city_id == city_id)
        
        users = query.order_by(User.id).offset(skip).limit(limit).all()
        
        # Обогащаем данные
        enriched_users = []
        for user in users:
            crud_user._enrich_user_data(db, user)
            enriched_users.append(user)
        
        return enriched_users
    
    # SELLER получает только себя
    elif current_user.role == UserRole.SELLER:
        return [current_user]
    
    return []

@router.get("/{user_id}", response_model=UserResponse)
def read_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Обогащаем данные текущего пользователя
    crud_user._enrich_user_data(db, current_user)
    
    user = crud_user.get(db, user_id=user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Проверка прав доступа
    if current_user.role == UserRole.OWNER:
        pass
    elif current_user.role == UserRole.ADMIN:
        admin_clusters = getattr(current_user, 'admin_clusters', [])
        if not admin_clusters:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        
        # Проверяем, что пользователь находится в одном из кустов администратора
        if user.cluster_id not in admin_clusters:
            raise HTTPException(status_code=403, detail="Not enough permissions")
    
    elif current_user.role == UserRole.SENIOR_SELLER:
        if user.cluster_id != current_user.cluster_id:
            raise HTTPException(status_code=403, detail="Not enough permissions")
    
    elif current_user.role == UserRole.MENTOR:
        if user.mentor_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not enough permissions")
    
    elif current_user.role == UserRole.SELLER and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return user

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Владелец может редактировать всех
    if current_user.role != UserRole.OWNER and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Для администратора: проверяем, может ли он редактировать этого пользователя
    if current_user.role == UserRole.ADMIN and current_user.id != user_id:
        crud_user._enrich_user_data(db, current_user)
        admin_clusters = getattr(current_user, 'admin_clusters', [])
        
        target_user = crud_user.get(db, user_id=user_id)
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if target_user.cluster_id not in admin_clusters:
            raise HTTPException(status_code=403, detail="Not enough permissions")
    
    try:
        user = crud_user.update(db, user_id=user_id, user_in=user_in)
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))
):
    try:
        if not crud_user.delete(db, user_id=user_id):
            raise HTTPException(status_code=404, detail="User not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return None

@router.get("/available/mentors", response_model=List[UserResponse])
def get_available_mentors(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Получить список доступных наставников (тех, у кого нет группы)
    """
    if current_user.role not in [UserRole.OWNER, UserRole.ADMIN, UserRole.SENIOR_SELLER]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Для администратора: только наставники из его кустов
    if current_user.role == UserRole.ADMIN:
        crud_user._enrich_user_data(db, current_user)
        admin_clusters = getattr(current_user, 'admin_clusters', [])
        
        if not admin_clusters:
            return []
        
        query = db.query(User).filter(
            User.role == UserRole.MENTOR,
            User.is_active == True,
            User.group_id == None,  # Наставник без группы
            User.cluster_id.in_(admin_clusters)  # Только из кустов администратора
        )
    else:
        # Для OWNER и SENIOR_SELLER: все доступные наставники
        query = db.query(User).filter(
            User.role == UserRole.MENTOR,
            User.is_active == True,
            User.group_id == None  # Наставник без группы
        )
    
    mentors = query.all()
    
    for mentor in mentors:
        crud_user._enrich_user_data(db, mentor)
    
    return mentors

@router.get("/available/senior_sellers", response_model=List[UserResponse])
def get_available_senior_sellers(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Получить список доступных старших продавцов (тех, у кого нет куста)
    """
    if current_user.role not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Находим старших продавцов без куста
    senior_sellers = db.query(User).filter(
        User.role == UserRole.SENIOR_SELLER,
        User.is_active == True,
        User.cluster_id == None  # Старший продавец без куста
    ).all()
    
    for seller in senior_sellers:
        crud_user._enrich_user_data(db, seller)
    
    return senior_sellers


@router.post("/{user_id}/change-password", status_code=status.HTTP_200_OK)
def change_user_password(
    user_id: int,
    password_data: UserPasswordChange,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.OWNER))  # Только OWNER
):
    """
    Смена пароля пользователя (только для владельца системы)
    """
    try:
        # Проверяем существование пользователя
        user = crud_user.get(db, user_id=user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден"
            )
        
        # Меняем пароль
        updated_user = crud_user.change_password(
            db, 
            user_id=user_id, 
            new_password=password_data.password
        )
        
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Не удалось изменить пароль"
            )
        
        return {"message": "Пароль успешно изменен"}
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
@router.get("/me/accountant-info")
def get_my_accountant_info(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Получить информацию о бухгалтере текущего пользователя (доступно всем авторизованным)
    Возвращает id, имя и описание бухгалтера
    """
    # Если у пользователя нет привязанного бухгалтера
    if not current_user.accountant_id:
        return {
            "has_accountant": False,
            "accountant": None
        }
    
    # Получаем бухгалтера
    accountant = db.query(User).filter(
        User.id == current_user.accountant_id,
        User.is_active == True,
        User.role == UserRole.ACCOUNTANT
    ).first()
    
    if not accountant:
        return {
            "has_accountant": False,
            "accountant": None
        }
    
    return {
        "has_accountant": True,
        "accountant": {
            "id": accountant.id,
            "full_name": accountant.full_name,
            "description": accountant.accountant_description
        }
    }