import axiosInstance from './axios';
import {
  Transfer,
  TransferDetail,
  TransferCreateDto,
  TransferCreateManagerRequestDto,
  TransferApprovalDto,
  TransferArrivalDto,
  TransferExecuteManagerRequestDto,
  TransferStatus,
  TransferRejectManagerRequestDto,
} from '../types';

// Функция для трансформации snake_case в camelCase
const transformTransferFromApi = (transfer: any): Transfer => {
  return {
    id: transfer.id,
    title: transfer.title,
    description: transfer.description,
    fromUserId: transfer.from_user_id,
    toUserId: transfer.to_user_id,
    executorId: transfer.executor_id,
    requestType: transfer.request_type,
    createdById: transfer.created_by_id,
    status: transfer.status,
    files: transfer.files || [],
    arrivalFiles: transfer.arrival_files || [], 
    discrepancyFiles: transfer.discrepancy_files || [],
    
    discrepancyAcceptedById: transfer.discrepancy_accepted_by_id,
    discrepancyAcceptedAt: transfer.discrepancy_accepted_at ? new Date(transfer.discrepancy_accepted_at) : undefined,
    discrepancyApprovedById: transfer.discrepancy_approved_by_id,
    discrepancyApprovedAt: transfer.discrepancy_approved_at ? new Date(transfer.discrepancy_approved_at) : undefined,
    discrepancyAcceptedByName: transfer.discrepancy_accepted_by_name,
    discrepancyApprovedByName: transfer.discrepancy_approved_by_name,
    
    createdAt: new Date(transfer.created_at),
    approvedAt: transfer.approved_at ? new Date(transfer.approved_at) : undefined,
    startedAt: transfer.started_at ? new Date(transfer.started_at) : undefined,
    arrivedAt: transfer.arrived_at ? new Date(transfer.arrived_at) : undefined,
    completedAt: transfer.completed_at ? new Date(transfer.completed_at) : undefined,
    cancelledAt: transfer.cancelled_at ? new Date(transfer.cancelled_at) : undefined,
    
    createdByName: transfer.created_by_name,
    fromUserName: transfer.from_user_name,
    toUserName: transfer.to_user_name,
    executorName: transfer.executor_name,
    
    fromUserRole: transfer.from_user_role,
    toUserRole: transfer.to_user_role,
    executorRole: transfer.executor_role,
    
    totalItems: transfer.total_items,
    totalQuantity: transfer.total_quantity,
    
    approvalsCount: transfer.approvals_count || 0,
    pendingApprovals: transfer.pending_approvals || [],
    canApprove: transfer.can_approve || false,
    canExecute: transfer.can_execute || false,
    canApproveDiscrepancy: transfer.can_approve_discrepancy || false,
    rejectionReason: transfer.rejection_reason,
  };
};

const transformTransferDetailFromApi = (transfer: any): TransferDetail => {
  const baseTransfer = transformTransferFromApi(transfer);
  
  return {
    ...baseTransfer,
    items: (transfer.items || []).map((item: any) => ({
      id: item.id,
      transferId: item.transfer_id,
      productId: item.product_id,
      expectedQuantity: item.expected_quantity,
      receivedQuantity: item.received_quantity,
      status: item.status,
      notes: item.notes,
      productName: item.product_name,
      productSku: item.product_sku,
      productPrice: item.product_price,
    })),
    discrepancyItems: (transfer.discrepancy_items || []).map((item: any) => ({
      id: item.id,
      productId: item.product_id,
      expectedQuantity: item.expected_quantity,
      actualQuantity: item.actual_quantity,
      discrepancy: item.discrepancy,
      productName: item.product_name,
      productSku: item.product_sku,
      notes: item.notes,
    })),
    discrepancies: transfer.discrepancies,
    approvals: (transfer.approvals || []).map((approval: any) => ({
      id: approval.id,
      userId: approval.user_id,
      approved: approval.approved,
      notes: approval.notes,
      approvedAt: new Date(approval.approved_at),
      userName: approval.user_name,
      userRole: approval.user_role,
    })),
  };
};

// Функция для трансформации camelCase в snake_case
const transformToSnakeCase = (obj: any): any => {
  const snakeCaseObj: any = {};
  
  Object.keys(obj).forEach(key => {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    
    if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key]) && !(obj[key] instanceof Date)) {
      snakeCaseObj[snakeKey] = transformToSnakeCase(obj[key]);
    } else if (Array.isArray(obj[key])) {
      snakeCaseObj[snakeKey] = obj[key].map((item: any) => 
        typeof item === 'object' ? transformToSnakeCase(item) : item
      );
    } else {
      snakeCaseObj[snakeKey] = obj[key];
    }
  });
  
  return snakeCaseObj;
};

export const transferService = {
  // Получить все перемещения пользователя
  getTransfers: async (
    skip: number = 0,
    limit: number = 100,
    status?: TransferStatus
  ): Promise<Transfer[]> => {
    const params: any = { skip, limit };
    if (status) params.status = status;
    
    const response = await axiosInstance.get<any[]>('/transfers', { params });
    return response.data.map(transformTransferFromApi);
  },

  // Получить запросы от руководителей
  getManagerRequests: async (
    skip: number = 0,
    limit: number = 100
  ): Promise<Transfer[]> => {
    const response = await axiosInstance.get<any[]>('/transfers/manager-requests', {
      params: { skip, limit }
    });
    return response.data.map(transformTransferFromApi);
  },

  // Получить детали перемещения
  getTransferById: async (transferId: number): Promise<TransferDetail> => {
    const response = await axiosInstance.get<any>(`/transfers/${transferId}`);
    return transformTransferDetailFromApi(response.data);
  },

  // Создать запрос на перемещение от пользователя
  createUserRequest: async (data: TransferCreateDto, files?: File[]): Promise<Transfer> => {
    const formData = new FormData();
    
    formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    formData.append('from_user_id', data.fromUserId.toString());
    formData.append('to_user_id', data.toUserId.toString());
    if (data.executorId) formData.append('executor_id', data.executorId.toString());
    
    // Добавляем товары в формате JSON
    formData.append('items_json', JSON.stringify(data.items.map(item => ({
      product_id: item.productId,
      expected_quantity: item.expectedQuantity,
      notes: item.notes
    }))));
    
    // Проверяем обязательные файлы
    if (!files || files.length === 0) {
      throw new Error('Для создания перемещения необходимо прикрепить фотографии товаров');
    }
    
    // Добавляем файлы
    files.forEach(file => {
      formData.append('files', file);
    });
    
    const response = await axiosInstance.post<any>('/transfers/user-request', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return transformTransferFromApi(response.data);
  },

getPhotoUrl: (path: string): string => {
  if (!path) return '';
  
  if (path.startsWith('http')) {
    return path;
  }
  
  let cleanPath = path;
  
  if (cleanPath.startsWith('uploads/')) {
    cleanPath = cleanPath.substring(8);
  }
  
  if (cleanPath.startsWith('transfers/')) {
    cleanPath = cleanPath; 
  }
  
  if (!cleanPath.startsWith('transfers/')) {
    cleanPath = `transfers/${cleanPath}`;
  }
  
  return `https://storage.yandexcloud.net/mide-app/${cleanPath}`;
},

  // Создать запрос на перемещение от руководителя
  createManagerRequest: async (data: TransferCreateManagerRequestDto): Promise<Transfer> => {
    const snakeCaseData = transformToSnakeCase(data);
    const response = await axiosInstance.post<any>('/transfers/manager-request', snakeCaseData);
    return transformTransferFromApi(response.data);
  },

  // Подтвердить и выполнить запрос от руководителя
  executeManagerRequest: async (
    transferId: number,
    data: TransferExecuteManagerRequestDto,
    files?: File[]
  ): Promise<Transfer> => {
    const formData = new FormData();
    
    if (data.executorId) {
      formData.append('executor_id', data.executorId.toString());
    }
    if (data.notes) {
      formData.append('notes', data.notes);
    }
    
    // Проверяем обязательные файлы
    if (!files || files.length === 0) {
      throw new Error('Для выполнения запроса необходимо прикрепить фотографии товаров');
    }
    
    files.forEach(file => {
      formData.append('files', file);
    });
    
    const response = await axiosInstance.post<any>(
      `/transfers/${transferId}/execute-manager-request`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    return transformTransferFromApi(response.data);
  },

  // Отклонить запрос от руководителя
  rejectManagerRequest: async (
    transferId: number,
    data: TransferRejectManagerRequestDto
  ): Promise<{ message: string }> => {
    const snakeCaseData = transformToSnakeCase(data);
    const response = await axiosInstance.post(`/transfers/${transferId}/reject-manager-request`, snakeCaseData);
    return response.data;
  },

  // Подтвердить или отклонить перемещение
  approveTransfer: async (transferId: number, data: TransferApprovalDto): Promise<{ message: string }> => {
    const snakeCaseData = transformToSnakeCase(data);
    const response = await axiosInstance.post(`/transfers/${transferId}/approve`, snakeCaseData);
    return response.data;
  },

  // Начать перемещение
  startTransfer: async (transferId: number): Promise<{ message: string }> => {
    const response = await axiosInstance.post(`/transfers/${transferId}/start`);
    return response.data;
  },

  // Отметить прибытие
  markArrived: async (
    transferId: number, 
    data: TransferArrivalDto, 
    files: File[]
  ): Promise<{ message: string }> => {
    const formData = new FormData();
    
    formData.append('action', data.action);
    
    if (data.action !== 'reject') {
      if (!data.items || data.items.length === 0) {
        throw new Error('Необходимо указать полученное количество для каждого товара');
      }
      
      formData.append('items_json', JSON.stringify(data.items.map(item => ({
        product_id: item.productId,
        actual_quantity: item.actualQuantity,
        notes: item.notes
      }))));
    } else {
      formData.append('items_json', JSON.stringify([]));
    }
    
    if (data.notes) {
      formData.append('notes', data.notes);
    }
    
    if (data.action !== 'reject' && (!files || files.length === 0)) {
      throw new Error('Для приема товара необходимо прикрепить фотографии');
    }
    
    if (files && files.length > 0) {
      files.forEach(file => {
        formData.append('files', file);
      });
    }
    
    const response = await axiosInstance.post(
      `/transfers/${transferId}/arrived`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  // Подтвердить расхождения
  approveDiscrepancy: async (transferId: number, data: TransferApprovalDto): Promise<{ message: string }> => {
    const snakeCaseData = transformToSnakeCase(data);
    const response = await axiosInstance.post(`/transfers/${transferId}/approve-discrepancy`, snakeCaseData);
    return response.data;
  },

  // Обновить перемещение
  updateTransfer: async (transferId: number, data: Partial<Transfer>): Promise<Transfer> => {
    // Убираем поля, которые не должны обновляться
    const { id, createdAt, approvedAt, startedAt, arrivedAt, completedAt, cancelledAt, 
           arrivalFiles, discrepancyFiles, ...updateData } = data;
    const snakeCaseData = transformToSnakeCase(updateData);
    
    const response = await axiosInstance.put<any>(`/transfers/${transferId}`, snakeCaseData);
    return transformTransferFromApi(response.data);
  },

  // Удалить перемещение
  deleteTransfer: async (transferId: number): Promise<void> => {
    await axiosInstance.delete(`/transfers/${transferId}`);
  },

  // Получить инвентарь пользователя для проверки наличия товаров
  getUserInventory: async (userId: number): Promise<any> => {
    const response = await axiosInstance.get(`/inventory/user/${userId}`);
    return response.data;
  },
};