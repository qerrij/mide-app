from pathlib import Path
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional, Dict, Any
from sqlalchemy import and_, or_, func
from datetime import datetime
import json
from fastapi import UploadFile
from app.models.transfer import (
    Transfer, TransferItem, TransferDiscrepancyItem, 
    TransferApproval, TransferStatus, TransferItemStatus
)
from app.models.user import User, UserRole
from app.models.inventory import UserInventory
from app.models.cluster import Cluster
from app.models.group import Group
from app.crud.notification import crud_notification
from app.crud.inventory import crud_inventory
from app.core.file_utils import save_uploaded_files, validate_files


class CRUDTransfer:
    def get(self, db: Session, transfer_id: int, current_user_id: Optional[int] = None) -> Optional[Transfer]:
        """Получить перемещение с флагом can_approve для конкретного пользователя"""
        transfer = db.query(Transfer).options(
            joinedload(Transfer.items).joinedload(TransferItem.product),
            joinedload(Transfer.discrepancy_items).joinedload(TransferDiscrepancyItem.product),
            joinedload(Transfer.approvals).joinedload(TransferApproval.user)
        ).filter(Transfer.id == transfer_id).first()
        
        if transfer:
            # Обогащаем данные
            transfer = self._enrich_transfer_data(db, transfer)
            
            # Добавляем флаги если передан current_user_id
            if current_user_id:
                transfer = self._set_user_flags(db, transfer, current_user_id)
        
        return transfer
    
    def _set_user_flags(self, db: Session, transfer: Transfer, user_id: int) -> Transfer:
        """Установить флаги для текущего пользователя"""
        # Сначала сбрасываем флаги
        transfer.can_approve = False
        transfer.can_execute = False
        transfer.can_approve_discrepancy = False 
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return transfer
        
        # Для обычных перемещений в статусе PENDING_APPROVAL
        if transfer.status == TransferStatus.PENDING_APPROVAL:
            # Проверяем есть ли пользователь в pending_approvals
            # ЛЮБОЙ из pending_approvals может подтвердить
            if user_id in transfer.pending_approvals:
                transfer.can_approve = True
            else:
                # Также проверяем старым способом для совместимости
                transfer.can_approve = self._is_user_manager(db, user_id, transfer.from_user_id)
        
        # Для проверки расхождений
        elif transfer.status == TransferStatus.CHECKING:
            # Только определенные роли могут подтверждать расхождения
            allowed_roles = [UserRole.OWNER, UserRole.ADMIN, UserRole.SENIOR_SELLER]
            if user.role in allowed_roles:
                # Проверяем есть ли пользователь в pending_approvals (руководители получателя)
                if user_id in transfer.pending_approvals:
                    transfer.can_approve = True
                    transfer.can_approve_discrepancy = True
                else:
                    # Также проверяем старым способом для совместимости
                    if self._is_user_manager(db, user_id, transfer.to_user_id):
                        transfer.can_approve = True
                        transfer.can_approve_discrepancy = True
        
        # Для запросов от руководителя (manager_request)
        if transfer.request_type == "manager_request" and transfer.status == TransferStatus.REQUESTED:
            transfer.can_execute = (transfer.from_user_id == user_id)
        
        return transfer
    
    def get_user_transfers(
        self,
        db: Session,
        user_id: int,
        skip: int = 0,
        limit: int = 100,
        status: Optional[TransferStatus] = None,
        include_for_approval: bool = True
    ) -> List[Transfer]:
        """Получить все перемещения пользователя: свои + для подтверждения если руководитель"""
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return []
        
        query = db.query(Transfer).options(
            joinedload(Transfer.items).joinedload(TransferItem.product)
        )
        
        conditions = []
        
        # 1. Всегда показываем перемещения где пользователь участник
        participant_conditions = [
            Transfer.created_by_id == user_id,
            Transfer.from_user_id == user_id,
            Transfer.to_user_id == user_id,
            Transfer.executor_id == user_id
        ]
        conditions.append(or_(*participant_conditions))
        
        # 2. Если пользователь руководитель и нужно включить перемещения для подтверждения
        if include_for_approval and user.role in [UserRole.OWNER, UserRole.ADMIN, UserRole.SENIOR_SELLER, UserRole.MENTOR]:
            # Получаем ID всех подчиненных
            subordinate_ids = self._get_subordinate_users(db, user_id)
            
            if subordinate_ids:
                # Добавляем перемещения подчиненных
                subordinate_conditions = [
                    Transfer.from_user_id.in_(subordinate_ids),
                    Transfer.created_by_id.in_(subordinate_ids)
                ]
                conditions.append(or_(*subordinate_conditions))
        
        # Объединяем все условия через OR
        if conditions:
            query = query.filter(or_(*conditions))
        
        # Фильтр по статусу
        if status:
            query = query.filter(Transfer.status == status)
        
        # Получаем перемещения
        transfers = query.order_by(Transfer.created_at.desc()).offset(skip).limit(limit).all()
        
        # Обогащаем данные и добавляем флаги
        enriched_transfers = []
        for transfer in transfers:
            enriched_transfer = self._enrich_transfer_data(db, transfer)
            
            # Устанавливаем флаги для пользователя
            enriched_transfer = self._set_user_flags(db, enriched_transfer, user_id)
            
            enriched_transfers.append(enriched_transfer)
        
        return enriched_transfers
    
    def get_manager_requests_for_user(
        self,
        db: Session,
        user_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[Transfer]:
        """Получить запросы на перемещение от руководителей для конкретного пользователя"""
        transfers = db.query(Transfer).filter(
            Transfer.request_type == "manager_request",
            Transfer.from_user_id == user_id,
            Transfer.status == TransferStatus.REQUESTED
        ).options(
            joinedload(Transfer.items).joinedload(TransferItem.product)
        ).order_by(Transfer.created_at.desc()).offset(skip).limit(limit).all()
        
        # Обогащаем данные
        enriched_transfers = []
        for transfer in transfers:
            enriched_transfer = self._enrich_transfer_data(db, transfer)
            enriched_transfer.can_execute = True  # Пользователь может выполнить/отклонить
            enriched_transfers.append(enriched_transfer)
        
        return enriched_transfers
    
    def create_user_request(
        self,
        db: Session,
        *,
        transfer_in: Dict[str, Any],
        items: List[Dict[str, Any]],
        files: Optional[List[Any]] = None,
        created_by_id: int
    ) -> Transfer:
        """Создать запрос на перемещение от пользователя"""
        try:
            from_user_id = transfer_in['from_user_id']
            to_user_id = transfer_in['to_user_id']
            
            # ПРОВЕРКА: файлы обязательны для пользовательских запросов
            if not files or len(files) == 0:
                raise ValueError("Для создания перемещения необходимо прикрепить фотографии товаров")
            
            # Валидация файлов
            errors = validate_files(files)
            if errors:
                raise ValueError(f"Ошибки валидации файлов: {', '.join(errors)}")
            
            # Проверяем наличие товаров у отправителя
            for item in items:
                product_id = item['product_id']
                quantity = item['expected_quantity']
                
                inventory = crud_inventory.get_user_product_quantity(db, from_user_id, product_id)
                if inventory < quantity:
                    raise ValueError(f"Недостаточно товара ID {product_id} у отправителя. Доступно: {inventory}, требуется: {quantity}")
            
            # 🔴 ИСПРАВЛЕНИЕ: Сначала создаем перемещение, чтобы получить ID
            db_transfer = Transfer(
                title=transfer_in['title'],
                description=transfer_in.get('description'),
                created_by_id=created_by_id,
                from_user_id=from_user_id,
                to_user_id=to_user_id,
                executor_id=transfer_in.get('executor_id'),
                request_type="user_request",
                status=TransferStatus.REQUESTED,
                files=[],  # Пока пустой массив
                discrepancy_files=[]
            )
            
            db.add(db_transfer)
            db.flush()  # Получаем ID, но не коммитим полностью
            
            # 🔴 ИСПРАВЛЕНИЕ: Сохраняем файлы сразу в правильную папку, используя ID
            folder_path = f"transfers/{db_transfer.id}"
            saved_files = save_uploaded_files(files, folder_path)
            
            # Если не сохранилось ни одного файла
            if not saved_files:
                raise ValueError("Не удалось сохранить файлы")
            
            # 🔴 ИСПРАВЛЕНИЕ: Обновляем поле files с правильными путями
            db_transfer.files = saved_files
            
            # Создаем товары и считаем статистику
            total_items = 0
            total_quantity = 0
            for item in items:
                db_item = TransferItem(
                    transfer_id=db_transfer.id,
                    product_id=item['product_id'],
                    expected_quantity=item['expected_quantity'],
                    notes=item.get('notes')
                )
                db.add(db_item)
                total_items += 1
                total_quantity += item['expected_quantity']
            
            # Определяем нужна ли проверка руководителя
            creator = db.query(User).filter(User.id == created_by_id).first()
            if self._is_in_same_zone(db, creator, from_user_id, to_user_id):
                # Если создатель - руководитель для обоих пользователей
                db_transfer.status = TransferStatus.APPROVED
                db_transfer.approved_at = datetime.now()
                
                # Создаем запись о подтверждении
                approval = TransferApproval(
                    transfer_id=db_transfer.id,
                    user_id=creator.id,
                    approved=True,
                    notes="Автоподтверждение: руководитель создал запрос"
                )
                db.add(approval)
            else:
                # Иначе нужна проверка руководителя
                db_transfer.status = TransferStatus.PENDING_APPROVAL
            
            db.commit()
            db.refresh(db_transfer)
            
            # Если сразу APPROVED, резервируем товары и уведомляем отправителя
            if db_transfer.status == TransferStatus.APPROVED:
                self._reserve_items(db, db_transfer)
                self._notify_approved_to_sender(db, db_transfer)
            else:
                # Уведомляем руководителей о необходимости подтверждения
                self._notify_created(db, db_transfer)
            
            # Обогащаем данные перед возвратом
            return self._enrich_transfer_data(db, db_transfer, total_items, total_quantity)
            
        except Exception as e:
            print(f"ERROR: Ошибка создания перемещения: {e}")
            import traceback
            traceback.print_exc()
            db.rollback()
            raise
    
    def create_manager_request(
        self,
        db: Session,
        *,
        transfer_in: Dict[str, Any],
        items: List[Dict[str, Any]],
        created_by_id: int
    ) -> Transfer:
        """Создать запрос на перемещение от руководителя"""
        try:
            from_user_id = transfer_in['from_user_id']
            
            # Создаем перемещение со статусом REQUESTED
            db_transfer = Transfer(
                title=transfer_in['title'],
                description=transfer_in.get('description'),
                created_by_id=created_by_id,
                from_user_id=from_user_id,
                to_user_id=transfer_in['to_user_id'],
                request_type="manager_request",
                status=TransferStatus.REQUESTED,  # Ожидает подтверждения от исполнителя
                files=[],
                discrepancy_files=[]
            )
            
            db.add(db_transfer)
            db.flush()
            
            # Создаем товары
            total_items = 0
            total_quantity = 0
            for item in items:
                db_item = TransferItem(
                    transfer_id=db_transfer.id,
                    product_id=item['product_id'],
                    expected_quantity=item['expected_quantity'],
                    notes=item.get('notes')
                )
                db.add(db_item)
                total_items += 1
                total_quantity += item['expected_quantity']
            
            db.commit()
            db.refresh(db_transfer)
            
            # Отправляем уведомление тому, кто должен подтвердить и выполнить
            self._notify_manager_request(db, db_transfer)
            
            # Обогащаем данные перед возвратом
            return self._enrich_transfer_data(db, db_transfer, total_items, total_quantity)
            
        except Exception as e:
            print(f"ERROR: Ошибка создания запроса руководителя: {e}")
            db.rollback()
            raise
    
    def execute_manager_request(
        self,
        db: Session,
        transfer_id: int,
        executor_id: Optional[int],
        files: Optional[List[UploadFile]] = None,
        notes: Optional[str] = None,
        executed_by_id: int = None
    ) -> Transfer:
        """Подтвердить и выполнить запрос перемещения от руководителя"""
        try:
            transfer = self.get(db, transfer_id)
            if not transfer or transfer.request_type != "manager_request":
                raise ValueError("Неверный запрос перемещения")
            
            if transfer.status != TransferStatus.REQUESTED:
                raise ValueError("Запрос уже обработан")
            
            # Проверяем что подтверждает именно тот, у кого запросили товары
            if transfer.from_user_id != executed_by_id:
                raise ValueError("Только отправитель может подтвердить этот запрос")
            
            # ПРОВЕРКА: файлы обязательны при выполнении запроса от руководителя
            if not files or len(files) == 0:
                raise ValueError("Для выполнения запроса необходимо прикрепить фотографии товаров")
            
            # Валидация файлов
            errors = validate_files(files)
            if errors:
                raise ValueError(f"Ошибки валидации файлов: {', '.join(errors)}")
            
            # Проверяем наличие товаров
            for item in transfer.items:
                inventory = crud_inventory.get_user_product_quantity(db, transfer.from_user_id, item.product_id)
                if inventory < item.expected_quantity:
                    raise ValueError(f"Недостаточно товара {item.product_id} у отправителя. Доступно: {inventory}, требуется: {item.expected_quantity}")
            
            # Сохраняем файлы
            folder_path = f"transfers/{transfer_id}"
            saved_files = save_uploaded_files(files, folder_path)
            
            # Обновляем перемещение
            transfer.executor_id = executor_id
            
            # Добавляем новые файлы к существующим
            current_files = transfer.files or []
            current_files.extend(saved_files)
            transfer.files = current_files
            if not hasattr(transfer, 'discrepancy_files') or transfer.discrepancy_files is None:
                transfer.discrepancy_files = []
            
            # Проверяем нужна ли проверка руководителя
            if self._is_in_same_zone(db, transfer.created_by, transfer.from_user_id, transfer.to_user_id):
                # Если руководитель создавший запрос - тот же, кто должен подтвердить,
                # то автоматически подтверждаем
                transfer.status = TransferStatus.APPROVED
                transfer.approved_at = datetime.now()
                
                # Создаем запись о подтверждении руководителем
                approval = TransferApproval(
                    transfer_id=transfer.id,
                    user_id=transfer.created_by_id,
                    approved=True,
                    notes="Автоподтверждение: руководитель создал запрос"
                )
                db.add(approval)
            else:
                # Иначе нужна проверка другого руководителя
                transfer.status = TransferStatus.PENDING_APPROVAL
            
            if notes:
                if transfer.description:
                    transfer.description += f"\n\nКомментарий при подтверждении: {notes}"
                else:
                    transfer.description = f"Комментарий при подтверждении: {notes}"
            
            db.commit()
            db.refresh(transfer)
            
            # Если сразу APPROVED, резервируем товары
            if transfer.status == TransferStatus.APPROVED:
                self._reserve_items(db, transfer)
                self._notify_approved_to_sender(db, transfer)
            else:
                # Уведомляем руководителей о необходимости подтверждения
                self._notify_created(db, transfer)
            
            return self._enrich_transfer_data(db, transfer)
            
        except Exception as e:
            print(f"ERROR: Ошибка выполнения запроса: {e}")
            db.rollback()
            raise
    
    def reject_manager_request(
        self,
        db: Session,
        transfer_id: int,
        user_id: int,
        reason: Optional[str] = None
    ) -> bool:
        """Отклонить запрос перемещения от руководителя"""
        try:
            transfer = self.get(db, transfer_id)
            if not transfer or transfer.request_type != "manager_request":
                return False
            
            if transfer.status != TransferStatus.REQUESTED:
                return False
            
            # Проверяем что отклоняет именно тот, у кого запросили товары
            if transfer.from_user_id != user_id:
                return False
            
            # Отклоняем запрос
            transfer.status = TransferStatus.REJECTED
            transfer.rejection_reason = reason
            
            # Создаем запись о подтверждении (отклонении)
            approval = TransferApproval(
                transfer_id=transfer.id,
                user_id=user_id,
                approved=False,
                notes=f"Отклонено пользователем: {reason}" if reason else "Отклонено пользователем"
            )
            db.add(approval)
            
            db.commit()
            
            # Отправляем уведомление создателю запроса (руководителю)
            notifications = [{
                'user_id': transfer.created_by_id,
                'type': 'TRANSFER_REJECTED',
                'title': 'Запрос на перемещение отклонен',
                'message': f'Ваш запрос на перемещение #{transfer.id} отклонен пользователем',
                'entity_type': 'transfer',
                'entity_id': transfer.id,
                'priority': 4
            }]
            
            crud_notification.create_multiple(db, notifications_data=notifications)
            
            return True
            
        except Exception as e:
            print(f"ERROR: Ошибка отклонения запроса: {e}")
            db.rollback()
            return False
    
    def _is_in_same_zone(self, db: Session, user: User, from_user_id: int, to_user_id: int) -> bool:
        """Проверить находятся ли оба пользователя в одной зоне влияния"""
        if not user:
            return False
        
        # Владелец и админ всегда в своей зоне
        if user.role in [UserRole.OWNER, UserRole.ADMIN]:
            return True
        
        from_user = db.query(User).filter(User.id == from_user_id).first()
        to_user = db.query(User).filter(User.id == to_user_id).first()
        
        if not from_user or not to_user:
            return False
        
        if user.role == UserRole.MENTOR:
            # Оба продавца у этого ментора
            return (from_user.mentor_id == user.id and to_user.mentor_id == user.id)
        
        elif user.role == UserRole.SENIOR_SELLER:
            # Оба в одном кусте
            return (from_user.cluster_id == user.cluster_id and 
                    to_user.cluster_id == user.cluster_id)
        
        return False
    
    def approve(
        self,
        db: Session,
        transfer_id: int,
        user_id: int,
        approved: bool,
        notes: Optional[str] = None
    ) -> bool:
        """Подтвердить или отклонить перемещение (для руководителей отправителя)"""
        try:
            transfer = self.get(db, transfer_id)
            if not transfer or transfer.status != TransferStatus.PENDING_APPROVAL:
                return False
            
            # Проверяем является ли пользователь руководителем для отправителя
            if not self._is_user_manager(db, user_id, transfer.from_user_id):
                print(f"Пользователь {user_id} не является руководителем для {transfer.from_user_id}")
                return False
            
            # Проверяем не подтверждал ли уже этот пользователь
            existing_approval = db.query(TransferApproval).filter(
                TransferApproval.transfer_id == transfer_id,
                TransferApproval.user_id == user_id
            ).first()
            
            if existing_approval:
                return False
            
            # Создаем подтверждение
            approval = TransferApproval(
                transfer_id=transfer_id,
                user_id=user_id,
                approved=approved,
                notes=notes
            )
            db.add(approval)
            
            if not approved:
                transfer.status = TransferStatus.REJECTED
                transfer.rejection_reason = notes
                db.commit()
                self._notify_rejected(db, transfer, user_id)
                return True
            
            # Подтверждаем перемещение - оно готово к отправке
            transfer.status = TransferStatus.APPROVED
            transfer.approved_at = datetime.now()
            db.commit()
            
            # Резервируем товары сразу после подтверждения
            self._reserve_items(db, transfer)
            
            # Отправляем уведомление ОТПРАВИТЕЛЮ, что он может начать перемещение
            self._notify_approved_to_sender(db, transfer)
            return True
            
        except Exception as e:
            print(f"ERROR: Ошибка подтверждения: {e}")
            db.rollback()
            return False
    
    def start_transfer(self, db: Session, transfer_id: int, user_id: int) -> bool:
        """Начать выполнение перемещения (отправитель начинает перемещение)"""
        try:
            transfer = self.get(db, transfer_id)
            if not transfer:
                return False
            
            # Проверяем что перемещение подтверждено и ожидает отправки
            if transfer.status != TransferStatus.APPROVED:
                return False
            
            # Проверяем что пользователь - отправитель или исполнитель
            allowed_users = [transfer.from_user_id]
            if transfer.executor_id:
                allowed_users.append(transfer.executor_id)
            
            if user_id not in allowed_users:
                return False
            
            # Меняем статус на "В пути"
            transfer.status = TransferStatus.IN_TRANSIT
            transfer.started_at = datetime.now()
            db.commit()
            
            # Отправляем уведомление получателю
            self._notify_in_transit(db, transfer)
            return True
            
        except Exception as e:
            print(f"ERROR: Ошибка начала перемещения: {e}")
            db.rollback()
            return False
    
    def mark_arrived(
        self,
        db: Session,
        transfer_id: int,
        to_user_id: int,
        action: str,
        items: Optional[List[Dict]] = None,
        notes: Optional[str] = None,
        files: Optional[List[UploadFile]] = None
    ) -> bool:
        """Отметить прибытие товара"""
        try:
            transfer = self.get(db, transfer_id)
            if not transfer:
                return False
            
            if transfer.status != TransferStatus.IN_TRANSIT:
                return False
            
            if transfer.to_user_id != to_user_id:
                return False
            
            transfer.arrived_at = datetime.now()
            
            if action == "accept":
                # 🔴 ACCEPT: файлы ОБЯЗАТЕЛЬНЫ, items ОБЯЗАТЕЛЬНЫ
                if not files or len(files) == 0:
                    raise ValueError("Для приема товара необходимо прикрепить фотографии")
                
                if not items or len(items) == 0:
                    raise ValueError("Необходимо указать полученное количество для каждого товара")
                
                # Валидация файлов
                errors = validate_files(files)
                if errors:
                    raise ValueError(f"Ошибки валидации файлов: {', '.join(errors)}")
                
                # Сохраняем файлы в arrival_files
                folder_path = f"transfers/{transfer_id}/arrival"
                saved_files = save_uploaded_files(files, folder_path)
                current_arrival_files = transfer.arrival_files or []
                current_arrival_files.extend(saved_files)
                transfer.arrival_files = current_arrival_files
                
                # Проверяем все товары
                for item_data in items:
                    product_id = item_data.get('product_id')
                    actual_quantity = item_data.get('actual_quantity', 0)
                    
                    if actual_quantity < 0:
                        raise ValueError(f"Количество товара ID {product_id} не может быть отрицательным")
                    
                    transfer_item = next((ti for ti in transfer.items if ti.product_id == product_id), None)
                    if not transfer_item:
                        raise ValueError(f"Товар ID {product_id} не найден в перемещении")
                    
                    # Проверяем что у отправителя достаточно товара для списания
                    available_quantity = crud_inventory.get_user_product_quantity(
                        db, transfer.from_user_id, product_id
                    )
                    
                    if actual_quantity > available_quantity:
                        raise ValueError(
                            f"У отправителя недостаточно товара ID {product_id}. "
                            f"Доступно всего: {available_quantity}, требуется списать: {actual_quantity}"
                        )
                
                # Обрабатываем полученные количества
                for item_data in items:
                    product_id = item_data.get('product_id')
                    actual_quantity = item_data.get('actual_quantity', 0)
                    item_notes = item_data.get('notes')
                    
                    transfer_item = next((ti for ti in transfer.items if ti.product_id == product_id), None)
                    if transfer_item:
                        transfer_item.received_quantity = actual_quantity
                        
                        # Определяем статус
                        if actual_quantity == transfer_item.expected_quantity:
                            transfer_item.status = TransferItemStatus.RECEIVED
                        elif actual_quantity < transfer_item.expected_quantity:
                            transfer_item.status = TransferItemStatus.MISSING
                        else:
                            transfer_item.status = TransferItemStatus.EXCESS
                        
                        # Создаем запись о расхождении если есть разница
                        if actual_quantity != transfer_item.expected_quantity:
                            disc_item = TransferDiscrepancyItem(
                                transfer_id=transfer.id,
                                product_id=product_id,
                                expected_quantity=transfer_item.expected_quantity,
                                actual_quantity=actual_quantity,
                                discrepancy=actual_quantity - transfer_item.expected_quantity,
                                notes=item_notes
                            )
                            db.add(disc_item)
                
                # Проверяем есть ли расхождения
                has_discrepancies = any(
                    item.received_quantity != item.expected_quantity 
                    for item in transfer.items
                )
                
                if has_discrepancies:
                    transfer.status = TransferStatus.CHECKING
                    transfer.discrepancy_accepted_by_id = to_user_id
                    transfer.discrepancy_accepted_at = datetime.now()
                    self._notify_discrepancies(db, transfer)
                else:
                    # Если расхождений нет, завершаем перемещение сразу
                    transfer.status = TransferStatus.ARRIVED
                    self._complete_transfer(db, transfer)
                    
            elif action == "discrepancy":
                # 🔴 DISCREPANCY: файлы ОБЯЗАТЕЛЬНЫ, items ОБЯЗАТЕЛЬНЫ
                if not files or len(files) == 0:
                    raise ValueError("Для расхождений необходимо прикрепить фотографии")
                
                if not items or len(items) == 0:
                    raise ValueError("Для расхождений необходимо указать полученное количество")
                
                # Валидация файлов
                errors = validate_files(files)
                if errors:
                    raise ValueError(f"Ошибки валидации файлов: {', '.join(errors)}")
                
                # Проверяем все товары
                for item_data in items:
                    product_id = item_data.get('product_id')
                    actual_quantity = item_data.get('actual_quantity', 0)
                    
                    if actual_quantity < 0:
                        raise ValueError(f"Количество товара ID {product_id} не может быть отрицательным")
                    
                    transfer_item = next((ti for ti in transfer.items if ti.product_id == product_id), None)
                    if not transfer_item:
                        raise ValueError(f"Товар ID {product_id} не найден в перемещении")
                    
                    # Проверяем что у отправителя достаточно товара
                    available_quantity = crud_inventory.get_user_product_quantity(
                        db, transfer.from_user_id, product_id
                    )
                    
                    if actual_quantity > available_quantity:
                        raise ValueError(
                            f"У отправителя недостаточно товара ID {product_id}. "
                            f"Доступно: {available_quantity}, требуется: {actual_quantity}"
                        )
                
                # Сохраняем файлы для расхождений в discrepancy_files
                folder_path = f"transfers/{transfer_id}/discrepancies"
                saved_files = save_uploaded_files(files, folder_path)
                current_discrepancy_files = transfer.discrepancy_files or []
                current_discrepancy_files.extend(saved_files)
                transfer.discrepancy_files = current_discrepancy_files
                
                transfer.status = TransferStatus.CHECKING
                transfer.discrepancy_accepted_by_id = to_user_id
                transfer.discrepancy_accepted_at = datetime.now()
                
                # Обрабатываем товары
                for item_data in items:
                    product_id = item_data.get('product_id')
                    actual_quantity = item_data.get('actual_quantity', 0)
                    item_notes = item_data.get('notes')
                    
                    transfer_item = next((ti for ti in transfer.items if ti.product_id == product_id), None)
                    if transfer_item:
                        transfer_item.received_quantity = actual_quantity
                        
                        if actual_quantity == transfer_item.expected_quantity:
                            transfer_item.status = TransferItemStatus.RECEIVED
                        elif actual_quantity < transfer_item.expected_quantity:
                            transfer_item.status = TransferItemStatus.MISSING
                        else:
                            transfer_item.status = TransferItemStatus.EXCESS
                        
                        # Создаем запись о расхождении если есть разница
                        if actual_quantity != transfer_item.expected_quantity:
                            disc_item = TransferDiscrepancyItem(
                                transfer_id=transfer.id,
                                product_id=product_id,
                                expected_quantity=transfer_item.expected_quantity,
                                actual_quantity=actual_quantity,
                                discrepancy=actual_quantity - transfer_item.expected_quantity,
                                notes=item_notes
                            )
                            db.add(disc_item)
                
                self._notify_discrepancies(db, transfer)
                
            elif action == "reject":
                # 🔴 REJECT: файлы НЕ ЗАГРУЖАЮТСЯ, items НЕ НУЖНЫ
                # Просто отмечаем все товары как отклоненные
                
                for item in transfer.items:
                    item.status = TransferItemStatus.REJECTED
                    item.received_quantity = 0
                
                transfer.status = TransferStatus.REJECTED
                transfer.rejection_reason = notes
                
                # Возвращаем зарезервированные товары отправителю
                self._return_items(db, transfer)
                
                # Отправляем уведомления
                self._notify_rejected(db, transfer, to_user_id)
            
            else:
                raise ValueError(f"Неизвестное действие: {action}")
            
            db.commit()
            return True
            
        except ValueError as e:
            raise e
        except Exception as e:
            print(f"ERROR: Ошибка отметки прибытия: {e}")
            import traceback
            traceback.print_exc()
            db.rollback()
            return False
    
    def approve_discrepancy(
        self,
        db: Session,
        transfer_id: int,
        user_id: int,
        approved: bool,
        notes: Optional[str] = None
    ) -> bool:
        try:
            transfer = self.get(db, transfer_id)
            if not transfer or transfer.status != TransferStatus.CHECKING:
                return False
            
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return False
            
            # ИЗМЕНЕНИЕ: Разрешаем подтверждать расхождения только владельцам, админам и старшим продавцам
            allowed_roles = [UserRole.OWNER, UserRole.ADMIN, UserRole.SENIOR_SELLER]
            if user.role not in allowed_roles:
                print(f"Пользователь с ролью {user.role} не может подтверждать расхождения")
                return False
            
            # Проверяем является ли пользователь руководителем для ПОЛУЧАТЕЛЯ
            if not self._is_user_manager(db, user_id, transfer.to_user_id):
                print(f"Пользователь {user_id} не является руководителем для получателя {transfer.to_user_id}")
                return False
            
            # 🔴 ИСПРАВЛЕНИЕ: Проверяем существующие подтверждения
            existing_approval = db.query(TransferApproval).filter(
                TransferApproval.transfer_id == transfer_id,
                TransferApproval.user_id == user_id
            ).first()
            
            if existing_approval:
                # Если уже есть подтверждение от этого пользователя
                if existing_approval.approved:
                    # Проверяем, связано ли оно с расхождениями
                    if 'расхождени' in (existing_approval.notes or '').lower():
                        # Уже подтверждал расхождения
                        return False
                    else:
                        # Это было подтверждение на создание, можно обновить
                        existing_approval.notes = f"Подтверждение перемещения и расхождений: {notes}" if notes else "Подтверждение перемещения и расхождений"
                else:
                    # Уже отклонил - нельзя изменить
                    return False
            else:
                # Создаем новое подтверждение
                approval = TransferApproval(
                    transfer_id=transfer_id,
                    user_id=user_id,
                    approved=approved,
                    notes=f"Подтверждение расхождений: {notes}" if notes else "Подтверждение расхождений"
                )
                db.add(approval)
            
            if not approved:
                transfer.status = TransferStatus.REJECTED
                transfer.rejection_reason = notes
                self._return_items(db, transfer)
                db.commit()
                self._notify_rejected(db, transfer, user_id)
                return True
            
            transfer.discrepancy_approved_by_id = user_id
            transfer.discrepancy_approved_at = datetime.now()
            self._complete_transfer_with_discrepancies(db, transfer)
            return True
            
        except Exception as e:
            print(f"ERROR: {e}")
            import traceback
            traceback.print_exc()
            db.rollback()
            return False
    
    def _is_user_manager(self, db: Session, user_id: int, target_user_id: int) -> bool:
        """Проверить является ли пользователь руководителем для другого пользователя"""
        if user_id == target_user_id:
            return False
        
        target_user = db.query(User).filter(User.id == target_user_id).first()
        if not target_user:
            return False
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        # Владелец - руководитель для всех
        if user.role == UserRole.OWNER:
            return True
        
        # Админ - руководитель для пользователей в своих кустах
        if user.role == UserRole.ADMIN:
            if user.admin_clusters:
                admin_clusters = []
                try:
                    admin_clusters = json.loads(user.admin_clusters)
                except:
                    admin_clusters = []
                
                if target_user.cluster_id in admin_clusters:
                    return True
            
            # Также если админ указан как admin в кусте пользователя
            if target_user.cluster_id:
                cluster = db.query(Cluster).filter(Cluster.id == target_user.cluster_id).first()
                if cluster and cluster.admin_id == user_id:
                    return True
        
        # Проверяем прямые связи руководитель-подчиненный
        if user.role == UserRole.MENTOR:
            return target_user.mentor_id == user_id
        
        if user.role == UserRole.SENIOR_SELLER:
            # Старший продавец для продавцов в своем кусте
            if target_user.cluster_id == user.cluster_id:
                return True
        
        return False
    
    def _get_subordinate_users(self, db: Session, user_id: int) -> List[int]:
        """Получить ID всех подчиненных пользователей"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return []
        
        subordinate_ids = []
        
        if user.role == UserRole.OWNER:
            # Владелец видит всех
            all_users = db.query(User.id).filter(User.is_active == True).all()
            subordinate_ids = [uid[0] for uid in all_users]
        
        elif user.role == UserRole.ADMIN:
            # Админ видит пользователей в своих кустах
            admin_clusters = []
            if user.admin_clusters:
                try:
                    admin_clusters = json.loads(user.admin_clusters)
                except:
                    admin_clusters = []
            
            if admin_clusters:
                # Получаем всех пользователей в кустах админа
                cluster_users = db.query(User.id).filter(
                    User.cluster_id.in_(admin_clusters),
                    User.is_active == True
                ).all()
                subordinate_ids = [uid[0] for uid in cluster_users]
            
            # Также получаем пользователей через связи кустов (если админ указан в кусте)
            cluster_admin_users = db.query(User.id).join(
                Cluster, Cluster.id == User.cluster_id
            ).filter(
                Cluster.admin_id == user_id,
                User.is_active == True
            ).all()
            
            cluster_admin_ids = [uid[0] for uid in cluster_admin_users]
            subordinate_ids.extend(cluster_admin_ids)
        
        elif user.role == UserRole.SENIOR_SELLER:
            # Старший продавец видит пользователей в своем кусте
            if user.cluster_id:
                cluster_users = db.query(User.id).filter(
                    User.cluster_id == user.cluster_id,
                    User.is_active == True
                ).all()
                subordinate_ids = [uid[0] for uid in cluster_users]
        
        elif user.role == UserRole.MENTOR:
            # Ментор видит своих продавцов
            sellers = db.query(User.id).filter(
                User.mentor_id == user_id,
                User.is_active == True
            ).all()
            subordinate_ids = [uid[0] for uid in sellers]
        
        # Убираем дубликаты и самого пользователя
        subordinate_ids = list(set(subordinate_ids))
        if user_id in subordinate_ids:
            subordinate_ids.remove(user_id)
        
        return subordinate_ids
    
    def _get_user_managers(self, db: Session, user_id: int) -> List[User]:
        """Получить всех руководителей пользователя по иерархии"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return []
        
        managers = []
        visited = set()
        
        # 1. Прямой ментор
        if user.mentor_id:
            mentor = db.query(User).filter(User.id == user.mentor_id).first()
            if mentor and mentor.id not in visited:
                managers.append(mentor)
                visited.add(mentor.id)
        
        # 2. Старший продавец через куст
        if user.cluster_id:
            cluster = db.query(Cluster).filter(Cluster.id == user.cluster_id).first()
            if cluster and cluster.senior_seller_id:
                senior_seller = db.query(User).filter(User.id == cluster.senior_seller_id).first()
                if senior_seller and senior_seller.id not in visited:
                    managers.append(senior_seller)
                    visited.add(senior_seller.id)
        
        # 3. Админ через куст
        if user.cluster_id:
            cluster = db.query(Cluster).filter(Cluster.id == user.cluster_id).first()
            if cluster and cluster.admin_id:
                admin = db.query(User).filter(User.id == cluster.admin_id).first()
                if admin and admin.id not in visited:
                    managers.append(admin)
                    visited.add(admin.id)
        
        # 4. Все админы у которых этот куст в admin_clusters
        all_admins = db.query(User).filter(
            User.role == UserRole.ADMIN,
            User.is_active == True
        ).all()
        
        for admin in all_admins:
            if admin.id not in visited and admin.admin_clusters:
                admin_clusters = []
                try:
                    admin_clusters = json.loads(admin.admin_clusters)
                except:
                    admin_clusters = []
                
                if user.cluster_id in admin_clusters:
                    managers.append(admin)
                    visited.add(admin.id)
        
        # 5. Владелец
        owner = db.query(User).filter(User.role == UserRole.OWNER, User.is_active == True).first()
        if owner and owner.id not in visited:
            managers.append(owner)
            visited.add(owner.id)
        
        return managers
    
    def _reserve_items(self, db: Session, transfer: Transfer):
        """Резервировать товары"""
        for item in transfer.items:
            crud_inventory.update_inventory(
                db,
                user_id=transfer.from_user_id,
                product_id=item.product_id,
                quantity_change=-item.expected_quantity,
                reserved_change=item.expected_quantity
            )
    
    def _complete_transfer(self, db: Session, transfer: Transfer):
        """Завершить перемещение (без расхождений) с учетом фактического количества"""
        for item in transfer.items:
            # Получаем ФАКТИЧЕСКОЕ количество
            received_qty = item.received_quantity or 0
            expected_qty = item.expected_quantity
            
            if received_qty > 0:
                # 1. Снимаем резервирование у отправителя (все ожидаемое)
                crud_inventory.update_inventory(
                    db,
                    user_id=transfer.from_user_id,
                    product_id=item.product_id,
                    quantity_change=0,
                    reserved_change=-expected_qty
                )
                
                # 2. Если фактическое НЕ РАВНО ожидаемому
                if received_qty != expected_qty:
                    # Рассчитываем разницу
                    diff = received_qty - expected_qty
                    
                    if diff > 0:  # Избыток
                        # Списываем избыток у отправителя
                        crud_inventory.update_inventory(
                            db,
                            user_id=transfer.from_user_id,
                            product_id=item.product_id,
                            quantity_change=-diff
                        )
                    else:  # Недостача (diff < 0)
                        # Возвращаем недостачу отправителю
                        return_qty = abs(diff)
                        crud_inventory.update_inventory(
                            db,
                            user_id=transfer.from_user_id,
                            product_id=item.product_id,
                            quantity_change=return_qty
                        )
                
                # 3. Добавляем получателю фактически полученное
                crud_inventory.update_inventory(
                    db,
                    user_id=transfer.to_user_id,
                    product_id=item.product_id,
                    quantity_change=received_qty
                )
            else:
                # Если ничего не получено, просто возвращаем товар отправителю
                crud_inventory.update_inventory(
                    db,
                    user_id=transfer.from_user_id,
                    product_id=item.product_id,
                    quantity_change=expected_qty,
                    reserved_change=-expected_qty
                )
        
        transfer.status = TransferStatus.COMPLETED
        transfer.completed_at = datetime.now()
        db.commit()
        
        self._notify_completed(db, transfer)
    
    def _complete_transfer_with_discrepancies(self, db: Session, transfer: Transfer):
        """Завершить перемещение с учетом расхождений (после подтверждения руководителем)"""
        try:
            for item in transfer.items:
                received_qty = item.received_quantity or 0
                expected_qty = item.expected_quantity
                
                if received_qty > 0:
                    # 1. Снимаем резервирование у отправителя (все ожидаемое)
                    crud_inventory.update_inventory(
                        db,
                        user_id=transfer.from_user_id,
                        product_id=item.product_id,
                        quantity_change=0,
                        reserved_change=-expected_qty
                    )
                    
                    # 2. Если есть расхождение
                    if received_qty != expected_qty:
                        diff = received_qty - expected_qty
                        
                        if diff > 0:  # Избыток
                            # Списываем избыток у отправителя
                            crud_inventory.update_inventory(
                                db,
                                user_id=transfer.from_user_id,
                                product_id=item.product_id,
                                quantity_change=-diff
                            )
                        else:  # Недостача (diff < 0)
                            # Возвращаем недостачу отправителю
                            return_qty = abs(diff)
                            crud_inventory.update_inventory(
                                db,
                                user_id=transfer.from_user_id,
                                product_id=item.product_id,
                                quantity_change=return_qty
                            )
                    
                    # 3. Добавляем получателю фактически полученное
                    crud_inventory.update_inventory(
                        db,
                        user_id=transfer.to_user_id,
                        product_id=item.product_id,
                        quantity_change=received_qty
                    )
                else:
                    # Если ничего не получено, возвращаем товар отправителю
                    crud_inventory.update_inventory(
                        db,
                        user_id=transfer.from_user_id,
                        product_id=item.product_id,
                        quantity_change=expected_qty,
                        reserved_change=-expected_qty
                    )
            
            transfer.status = TransferStatus.COMPLETED
            transfer.completed_at = datetime.now()
            db.commit()
            
            self._notify_completed(db, transfer)
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise
    
    def _return_items(self, db: Session, transfer: Transfer):
        """Вернуть товары"""
        for item in transfer.items:
            crud_inventory.update_inventory(
                db,
                user_id=transfer.from_user_id,
                product_id=item.product_id,
                quantity_change=item.expected_quantity,
                reserved_change=-item.expected_quantity
            )
    
    def _enrich_transfer_data(self, db: Session, transfer: Transfer, total_items: int = None, total_quantity: int = None) -> Transfer:
        """Обогатить данные перемещения"""
        # Если статистика не передана, считаем ее
        if total_items is None or total_quantity is None:
            items = db.query(TransferItem).filter(TransferItem.transfer_id == transfer.id).all()
            total_items = len(items)
            total_quantity = sum(item.expected_quantity for item in items)
        
        # Устанавливаем статистику
        transfer.total_items = total_items
        transfer.total_quantity = total_quantity
        
        # Добавляем информацию о пользователях
        from_user = db.query(User).filter(User.id == transfer.from_user_id).first()
        to_user = db.query(User).filter(User.id == transfer.to_user_id).first()
        created_by = db.query(User).filter(User.id == transfer.created_by_id).first()
        
        if from_user:
            transfer.from_user_name = from_user.full_name
            transfer.from_user_role = from_user.role
        
        if to_user:
            transfer.to_user_name = to_user.full_name
            transfer.to_user_role = to_user.role
        
        if created_by:
            transfer.created_by_name = created_by.full_name
        
        if transfer.executor_id:
            executor = db.query(User).filter(User.id == transfer.executor_id).first()
            if executor:
                transfer.executor_name = executor.full_name
                transfer.executor_role = executor.role
        
        if transfer.discrepancy_accepted_by_id:
            accepted_by = db.query(User).filter(User.id == transfer.discrepancy_accepted_by_id).first()
            if accepted_by:
                transfer.discrepancy_accepted_by_name = accepted_by.full_name
        
        if transfer.discrepancy_approved_by_id:
            approved_by = db.query(User).filter(User.id == transfer.discrepancy_approved_by_id).first()
            if approved_by:
                transfer.discrepancy_approved_by_name = approved_by.full_name
        
        # Инициализируем флаги как False по умолчанию
        if not hasattr(transfer, 'can_approve'):
            transfer.can_approve = False
        if not hasattr(transfer, 'can_execute'):
            transfer.can_execute = False
        
        # Инициализируем файлы если нет или None
        if not hasattr(transfer, 'files') or transfer.files is None:
            transfer.files = []
        if not hasattr(transfer, 'arrival_files') or transfer.arrival_files is None:
            transfer.arrival_files = []
        if not hasattr(transfer, 'discrepancy_files') or transfer.discrepancy_files is None:
            transfer.discrepancy_files = []
        
        # Подсчитываем подтверждения
        approvals = db.query(TransferApproval).filter(
            TransferApproval.transfer_id == transfer.id
        ).all()
        
        transfer.approvals_count = len([a for a in approvals if a.approved])
        
        # Получаем ID руководителей ожидающих подтверждения
        if transfer.status == TransferStatus.PENDING_APPROVAL:
            managers = self._get_user_managers(db, transfer.from_user_id)
        elif transfer.status == TransferStatus.CHECKING:
            managers = self._get_user_managers(db, transfer.to_user_id)
        else:
            managers = []
        
        manager_ids = [m.id for m in managers]
        
        # ИСКЛЮЧАЕМ уже подтвердивших руководителей
        approved_manager_ids = [a.user_id for a in approvals if a.approved]
        
        # Оставляем только тех руководителей, которые еще не подтвердили
        transfer.pending_approvals = [mid for mid in manager_ids if mid not in approved_manager_ids]
        
        return transfer
    
    # ===== МЕТОДЫ УВЕДОМЛЕНИЙ =====
    
    def _notify_created(self, db: Session, transfer: Transfer):
        """Уведомления о создании перемещения"""
        notifications = []
        
        # Если нужно подтверждение руководителей
        if transfer.status == TransferStatus.PENDING_APPROVAL:
            managers = self._get_user_managers(db, transfer.from_user_id)
            for manager in managers:
                notifications.append({
                    'user_id': manager.id,
                    'type': 'TRANSFER_REQUEST',
                    'title': f'Требуется подтверждение перемещения',
                    'message': f'Перемещение #{transfer.id} от {transfer.from_user_name if hasattr(transfer, "from_user_name") else "пользователя"} требует вашего подтверждения',
                    'entity_type': 'transfer',
                    'entity_id': transfer.id,
                    'priority': 4
                })
        
        # Исполнителю
        if transfer.executor_id and transfer.executor_id != transfer.from_user_id:
            notifications.append({
                'user_id': transfer.executor_id,
                'type': 'TRANSFER_REQUEST',
                'title': f'Вас назначили исполнителем перемещения',
                'message': f'Перемещение #{transfer.id} требует вашего участия',
                'entity_type': 'transfer',
                'entity_id': transfer.id,
                'priority': 3
            })
        
        # Получателю
        notifications.append({
            'user_id': transfer.to_user_id,
            'type': 'TRANSFER_REQUEST',
            'title': f'Вам направлено перемещение',
            'message': f'Перемещение #{transfer.id} от {transfer.from_user_name if hasattr(transfer, "from_user_name") else "пользователя"} направлено вам',
            'entity_type': 'transfer',
            'entity_id': transfer.id,
            'priority': 3
        })
        
        if notifications:
            crud_notification.create_multiple(
                db,
                notifications_data=notifications,
                sender_id=transfer.created_by_id
            )
    
    def _notify_manager_request(self, db: Session, transfer: Transfer):
        """Уведомление о запросе перемещения от руководителя"""
        notifications = []
        
        # Тому, кто должен выполнить (отправитель)
        notifications.append({
            'user_id': transfer.from_user_id,
            'type': 'TRANSFER_MANAGER_REQUEST',
            'title': f'Запрос на перемещение от руководителя',
            'message': f'Руководитель запросил у вас перемещение товаров. Подтвердите или отклоните запрос.',
            'entity_type': 'transfer',
            'entity_id': transfer.id,
            'priority': 4
        })
        
        if notifications:
            crud_notification.create_multiple(
                db,
                notifications_data=notifications,
                sender_id=transfer.created_by_id
            )
    
    def _notify_approved_to_sender(self, db: Session, transfer: Transfer):
        """Уведомление отправителю, что перемещение подтверждено и можно начинать"""
        notifications = []
        
        # Уведомляем отправителя
        notifications.append({
            'user_id': transfer.from_user_id,
            'type': 'TRANSFER_APPROVED',
            'title': 'Перемещение подтверждено',
            'message': f'Перемещение #{transfer.id} подтверждено. Вы можете начать отправку товаров.',
            'entity_type': 'transfer',
            'entity_id': transfer.id,
            'priority': 3
        })
        
        # Уведомляем исполнителя если есть
        if transfer.executor_id and transfer.executor_id != transfer.from_user_id:
            notifications.append({
                'user_id': transfer.executor_id,
                'type': 'TRANSFER_APPROVED',
                'title': 'Перемещение подтверждено',
                'message': f'Перемещение #{transfer.id} подтверждено. Вы можете начать отправку товаров.',
                'entity_type': 'transfer',
                'entity_id': transfer.id,
                'priority': 3
            })
        
        if notifications:
            crud_notification.create_multiple(db, notifications_data=notifications)
    
    def _notify_approved(self, db: Session, transfer: Transfer):
        """Уведомления всем участникам о подтверждении перемещения"""
        notifications = []
        
        # Создателю (если не отправитель)
        if transfer.created_by_id != transfer.from_user_id:
            notifications.append({
                'user_id': transfer.created_by_id,
                'type': 'TRANSFER_STATUS',
                'title': 'Перемещение подтверждено',
                'message': f'Перемещение #{transfer.id} подтверждено руководителем',
                'entity_type': 'transfer',
                'entity_id': transfer.id,
                'priority': 3
            })
        
        # Получателю
        notifications.append({
            'user_id': transfer.to_user_id,
            'type': 'TRANSFER_STATUS',
            'title': 'Перемещение подтверждено',
            'message': f'Перемещение #{transfer.id} подтверждено руководителем',
            'entity_type': 'transfer',
            'entity_id': transfer.id,
            'priority': 3
        })
        
        if notifications:
            crud_notification.create_multiple(db, notifications_data=notifications)
    
    def _notify_in_transit(self, db: Session, transfer: Transfer):
        """Уведомление о начале перемещения (товар в пути)"""
        notifications = []
        
        # Уведомляем получателя
        notifications.append({
            'user_id': transfer.to_user_id,
            'type': 'TRANSFER_IN_TRANSIT',
            'title': 'Товар в пути',
            'message': f'Товары по перемещению #{transfer.id} отправлены вам. Подготовьтесь к приему.',
            'entity_type': 'transfer',
            'entity_id': transfer.id,
            'priority': 3
        })
        
        # Уведомляем создателя если он не отправитель
        if transfer.created_by_id != transfer.from_user_id:
            notifications.append({
                'user_id': transfer.created_by_id,
                'type': 'SYSTEM_MESSAGE',
                'title': 'Перемещение начато',
                'message': f'Перемещение #{transfer.id} началось.',
                'entity_type': 'transfer',
                'entity_id': transfer.id,
                'priority': 3
            })
        
        if notifications:
            crud_notification.create_multiple(db, notifications_data=notifications)
    
    def _notify_discrepancies(self, db: Session, transfer: Transfer):
        """Уведомления о расхождениях руководителям получателя"""
        managers = self._get_user_managers(db, transfer.to_user_id)
        
        notifications = []
        for manager in managers:
            notifications.append({
                'user_id': manager.id,
                'type': 'TRANSFER_DISCREPANCY',
                'title': 'Обнаружены расхождения в перемещении',
                'message': f'В перемещении #{transfer.id} обнаружены расхождения. Требуется ваша проверка.',
                'entity_type': 'transfer',
                'entity_id': transfer.id,
                'priority': 4
            })
        
        if notifications:
            crud_notification.create_multiple(db, notifications_data=notifications)
    
    def _notify_completed(self, db: Session, transfer: Transfer):
        """Уведомления о завершении перемещения"""
        notifications = []
        
        # Собираем всех получателей уведомлений
        recipients = set()
        
        # Руководители отправителя
        for manager in self._get_user_managers(db, transfer.from_user_id):
            recipients.add(manager.id)
        
        # Руководители получателя
        for manager in self._get_user_managers(db, transfer.to_user_id):
            recipients.add(manager.id)
        
        # Участники перемещения
        participants = [
            transfer.created_by_id,
            transfer.from_user_id,
            transfer.to_user_id
        ]
        if transfer.executor_id:
            participants.append(transfer.executor_id)
        
        # Добавляем всех участников
        for user_id in participants:
            if user_id:
                recipients.add(user_id)
        
        # Создаем уведомления для всех уникальных получателей
        for user_id in recipients:
            notifications.append({
                'user_id': user_id,
                'type': 'TRANSFER_COMPLETED',
                'title': 'Перемещение завершено',
                'message': f'Перемещение #{transfer.id} успешно завершено',
                'entity_type': 'transfer',
                'entity_id': transfer.id,
                'priority': 3
            })
        
        if notifications:
            crud_notification.create_multiple(db, notifications_data=notifications)
    
    def _notify_rejected(self, db: Session, transfer: Transfer, rejected_by_id: int):
        """Уведомления об отклонении"""
        notifications = []
        
        # Участникам перемещения
        participants = [
            transfer.created_by_id,
            transfer.from_user_id,
            transfer.to_user_id
        ]
        
        if transfer.executor_id:
            participants.append(transfer.executor_id)
        
        for user_id in set(participants):
            if user_id and user_id != rejected_by_id:
                notifications.append({
                    'user_id': user_id,
                    'type': 'TRANSFER_REJECTED',
                    'title': 'Перемещение отклонено',
                    'message': f'Перемещение #{transfer.id} отклонено',
                    'entity_type': 'transfer',
                    'entity_id': transfer.id,
                    'priority': 4
                })
        
        if notifications:
            crud_notification.create_multiple(db, notifications_data=notifications)


crud_transfer = CRUDTransfer()