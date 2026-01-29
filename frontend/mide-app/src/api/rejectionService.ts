import axiosInstance from './axios';
import {
  Rejection,
  RejectionCreate,
  RejectionUpdate,
  RejectionStatus,
  RejectionProductStats,
  RejectionUserStats,
  RejectionUserProductStats,
  RejectionDetailedStats,
  AvailableProduct,
  TeamRejectionStats,
  CombinedRejectionStats,
} from '../types';

// Функция для трансформации snake_case в camelCase
const transformRejectionFromApi = (rejection: any): Rejection => {
  return {
    id: rejection.id,
    userId: rejection.user_id,
    userName: rejection.user_name,
    userRole: rejection.user_role,
    comment: rejection.comment,
    status: rejection.status,
    photoPaths: rejection.photo_paths || [],
    videoPaths: rejection.video_paths || [],
    totalItems: rejection.total_items,
    totalValue: rejection.total_value,
    items: (rejection.items || []).map((item: any) => ({
      id: item.id,
      productId: item.product_id,
      productName: item.product_name,
      productSku: item.product_sku,
      categoryName: item.category_name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      totalPrice: item.total_price,
    })),
    createdAt: new Date(rejection.created_at),
    updatedAt: rejection.updated_at ? new Date(rejection.updated_at) : undefined,
    reviewedAt: rejection.reviewed_at ? new Date(rejection.reviewed_at) : undefined,
    reviewedBy: rejection.reviewed_by,
    reviewerName: rejection.reviewer_name,
  };
};

// Функция для трансформации camelCase в snake_case
const transformToSnakeCase = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;
  
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

export const rejectionService = {
  // Получить доступные товары для брака
  getAvailableProducts: async (): Promise<AvailableProduct[]> => {
    const response = await axiosInstance.get('/rejections/available-products');
    return response.data.map((product: any) => ({
      productId: product.product_id,
      productName: product.product_name,
      productSku: product.product_sku,
      categoryId: product.category_id,
      categoryName: product.category_name,
      availableQuantity: product.available_quantity,
      price: product.price,
    }));
  },

  // Получить мои браки
  getMyRejections: async (
    skip: number = 0,
    limit: number = 100,
    status?: RejectionStatus
  ): Promise<Rejection[]> => {
    const params: any = { skip, limit };
    if (status) params.status = status;
    
    const response = await axiosInstance.get('/rejections/my', { params });
    return response.data.map(transformRejectionFromApi);
  },

  // Получить все браки (с учетом прав доступа)
  getAllRejections: async (
    skip: number = 0,
    limit: number = 100,
    status?: RejectionStatus,
    userId?: number,
    dateFrom?: string,
    dateTo?: string,
    productId?: number,
    clusterId?: number,
    mentorId?: number
  ): Promise<Rejection[]> => {
    const params: any = { skip, limit };
    if (status) params.status = status;
    if (userId) params.userId = userId;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    if (productId) params.productId = productId;
    if (clusterId) params.clusterId = clusterId;
    if (mentorId) params.mentorId = mentorId;
    
    const response = await axiosInstance.get('/rejections', { params });
    return response.data.map(transformRejectionFromApi);
  },

  // Получить брак по ID
  getRejectionById: async (rejectionId: number): Promise<Rejection> => {
    const response = await axiosInstance.get(`/rejections/${rejectionId}`);
    return transformRejectionFromApi(response.data);
  },

  // Создать брак
  createRejection: async (
    data: RejectionCreate,
    photos: File[],
    videos: File[]
  ): Promise<Rejection> => {
    const formData = new FormData();
    
    // Добавляем данные брака в JSON формате
    const rejectionData = {
      items: data.items.map(item => ({
        product_id: item.productId,
        quantity: item.quantity,
      })),
      comment: data.comment,
    };
    
    formData.append('rejection_in_str', JSON.stringify(rejectionData));
    
    // Добавляем фото
    photos.forEach(photo => {
      formData.append('photos', photo);
    });
    
    // Добавляем видео
    videos.forEach(video => {
      formData.append('videos', video);
    });
    
    const response = await axiosInstance.post('/rejections', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return transformRejectionFromApi(response.data);
  },

  // Обновить статус брака
  updateRejectionStatus: async (
    rejectionId: number,
    status: RejectionStatus,
    comment?: string
  ): Promise<Rejection> => {
    const data: any = { status };
    if (comment) data.comment = comment;
    
    const response = await axiosInstance.put(
      `/rejections/${rejectionId}/status`,
      transformToSnakeCase(data)
    );
    
    return transformRejectionFromApi(response.data);
  },

  // Отменить брак (пользователь может отменить свой PENDING брак)
  cancelRejection: async (rejectionId: number): Promise<void> => {
    await axiosInstance.delete(`/rejections/${rejectionId}/cancel`);
  },

  // НОВЫЕ МЕТОДЫ ДЛЯ СТАТИСТИКИ
  
  // Получить объединенную статистику
  getCombinedStats: async (
    userId?: number,
    dateFrom?: string,
    dateTo?: string
  ): Promise<CombinedRejectionStats> => {
    const params: any = {};
    if (userId) params.userId = userId;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    
    const response = await axiosInstance.get('/rejections/stats/combined', { params });
    
    // Трансформируем поля из snake_case
    const data = response.data;
    return {
      userStats: {
        userId: data.user_stats.user_id,
        userName: data.user_stats.user_name,
        userRole: data.user_stats.user_role,
        clusterId: data.user_stats.cluster_id,
        clusterName: data.user_stats.cluster_name,
        totalRejections: data.user_stats.total_rejections,
        totalValue: data.user_stats.total_value,
        productsCount: data.user_stats.products_count,
      },
      userProductsStats: (data.user_products_stats || []).map((item: any) => ({
        userId: item.user_id,
        userName: item.user_name,
        productId: item.product_id,
        productName: item.product_name,
        productSku: item.product_sku,
        categoryId: item.category_id,
        categoryName: item.category_name,
        totalRejected: item.total_rejected,
        totalValue: item.total_value,
      })),
      subordinatesStats: (data.subordinates_stats || []).map((sub: any) => ({
        userId: sub.user_id,
        userName: sub.user_name,
        userRole: sub.user_role,
        clusterId: sub.cluster_id,
        clusterName: sub.cluster_name,
        totalRejections: sub.total_rejections,
        totalValue: sub.total_value,
        productsCount: sub.products_count,
      })),
      summary: {
        totalUsers: data.summary.total_users,
        totalRejections: data.summary.total_rejections,
        totalValue: data.summary.total_value,
        totalItems: data.summary.total_items,
        totalProducts: data.summary.total_products,
        hasRejections: data.summary.has_rejections,
        dateRange: {
          from: data.summary.date_range?.from,
          to: data.summary.date_range?.to,
        },
      },
    };
  },

  // Получить детальную статистику по команде
  getTeamDetailedStats: async (
    dateFrom?: string,
    dateTo?: string
  ): Promise<TeamRejectionStats> => {
    const params: any = {};
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    
    const response = await axiosInstance.get('/rejections/stats/team-detailed', { params });
    
    const data = response.data;
    return {
      currentUser: {
        userId: data.current_user.user_id,
        userName: data.current_user.user_name,
        userRole: data.current_user.user_role,
        clusterId: data.current_user.cluster_id,
        clusterName: data.current_user.cluster_name,
        totalRejections: data.current_user.total_rejections,
        totalValue: data.current_user.total_value,
        productsCount: data.current_user.products_count,
      },
      subordinates: (data.subordinates || []).map((sub: any) => ({
        userId: sub.user_id,
        userName: sub.user_name,
        userRole: sub.user_role,
        clusterId: sub.cluster_id,
        clusterName: sub.cluster_name,
        mentorId: sub.mentor_id,
        mentorName: sub.mentor_name,
        totalRejections: sub.total_rejections,
        totalItems: sub.total_items,
        totalValue: sub.total_value,
        productsCount: sub.products_count,
        products: (sub.products || []).map((product: any) => ({
          userId: product.user_id,
          userName: product.user_name,
          productId: product.product_id,
          productName: product.product_name,
          productSku: product.product_sku,
          categoryId: product.category_id,
          categoryName: product.category_name,
          totalRejected: product.total_rejected,
          totalValue: product.total_value,
        })),
      })),
      totalStats: {
        totalUsers: data.total_stats.total_users,
        totalRejections: data.total_stats.total_rejections,
        totalItems: data.total_stats.total_items,
        totalValue: data.total_stats.total_value,
        totalProducts: data.total_stats.total_products,
        dateRange: {
          from: data.total_stats.date_range?.from,
          to: data.total_stats.date_range?.to,
        },
      },
    };
  },

  // СТАРЫЕ МЕТОДЫ (можно оставить для обратной совместимости или удалить)
  getProductStats: async (
    productId?: number,
    categoryId?: number,
    dateFrom?: string,
    dateTo?: string
  ): Promise<RejectionProductStats[]> => {
    const params: any = {};
    if (productId) params.productId = productId;
    if (categoryId) params.categoryId = categoryId;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    
    const response = await axiosInstance.get('/rejections/stats/products', { params });
    return response.data.map((item: any) => ({
      productId: item.product_id,
      productName: item.product_name,
      productSku: item.product_sku,
      categoryId: item.category_id,
      categoryName: item.category_name,
      totalRejected: item.total_rejected,
      totalValue: item.total_value,
      usersCount: item.users_count,
    }));
  },

  getUserStats: async (
    userId?: number,
    dateFrom?: string,
    dateTo?: string
  ): Promise<RejectionUserStats[]> => {
    const params: any = {};
    if (userId) params.userId = userId;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    
    const response = await axiosInstance.get('/rejections/stats/users', { params });
    return response.data.map((item: any) => ({
      userId: item.user_id,
      userName: item.user_name,
      userRole: item.user_role,
      clusterId: item.cluster_id,
      clusterName: item.cluster_name,
      totalRejections: item.total_rejections,
      totalValue: item.total_value,
      productsCount: item.products_count,
    }));
  },

  getUserProductStats: async (
    userId?: number,
    productId?: number,
    categoryId?: number,
    productName?: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<RejectionUserProductStats[]> => {
    const params: any = {};
    if (userId) params.userId = userId;
    if (productId) params.productId = productId;
    if (categoryId) params.categoryId = categoryId;
    if (productName) params.productName = productName;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    
    const response = await axiosInstance.get('/rejections/stats/user-products', { params });
    return response.data.map((item: any) => ({
      userId: item.user_id,
      userName: item.user_name,
      productId: item.product_id,
      productName: item.product_name,
      productSku: item.product_sku,
      categoryId: item.category_id,
      categoryName: item.category_name,
      totalRejected: item.total_rejected,
      totalValue: item.total_value,
    }));
  },

  getDetailedStats: async (
    period: string = 'all_time',
    dateFrom?: string,
    dateTo?: string
  ): Promise<RejectionDetailedStats> => {
    const params: any = { period };
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    
    const response = await axiosInstance.get('/rejections/stats/detailed', { params });
    return {
      period: response.data.period,
      totalRejectedItems: response.data.total_rejected_items,
      totalValue: response.data.total_value,
      totalUsers: response.data.total_users,
      totalProducts: response.data.total_products,
      byMonth: response.data.by_month?.map((month: any) => ({
        month: month.month,
        items: month.items,
        value: month.value,
        users: month.users,
      })),
    };
  },
};