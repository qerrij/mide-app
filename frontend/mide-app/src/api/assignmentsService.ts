import axiosInstance from './axios';
import { User, UserRole } from '../types';

// Функция для трансформации snake_case в camelCase
const transformUserFromApi = (user: any): User => {
  // Безопасный парсинг admin_clusters
  let adminClusterIds: number[] = [];
  try {
    if (user.admin_clusters && user.admin_clusters.trim() !== '') {
      const parsed = JSON.parse(user.admin_clusters);
      if (Array.isArray(parsed)) {
        adminClusterIds = parsed;
      }
    }
  } catch (error) {
    console.warn('Error parsing admin_clusters:', error);
    // Оставляем пустой массив в случае ошибки
    adminClusterIds = [];
  }

  return {
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    telegram: user.telegram,
    cityId: user.city_id,           
    cityName: user.city_name,
    role: user.role,
    clusterId: user.cluster_id,
    groupId: user.group_id,
    mentorId: user.mentor_id,
    seniorSellerId: user.senior_seller_id,
    adminClusterIds,
    rate: user.rate || 0,
    createdAt: new Date(user.created_at),
    updatedAt: user.updated_at ? new Date(user.updated_at) : undefined,
    lastLogin: user.last_login ? new Date(user.last_login) : undefined,
    groupName: user.group_name,
    clusterName: user.cluster_name,
    mentorName: user.mentor_name,
    seniorSellerName: user.senior_seller_name,
    adminName: user.admin_name,
  };
};

export const assignmentsService = {
  // ================ НАЗНАЧЕНИЯ ================
  
  // Продавец → Наставник (создает или добавляет в группу)
  assignSellerToMentor: async (sellerId: number, mentorId: number): Promise<User> => {
    const response = await axiosInstance.post<any>(
      `/api/assignments/seller-to-mentor/${sellerId}/${mentorId}`
    );
    return transformUserFromApi(response.data);
  },

  // Продавец → Группа
  assignSellerToGroup: async (sellerId: number, groupId: number): Promise<User> => {
    const response = await axiosInstance.post<any>(
      `/api/assignments/seller-to-group/${sellerId}/${groupId}`
    );
    return transformUserFromApi(response.data);
  },

  // Наставник → Куст
  assignMentorToCluster: async (mentorId: number, clusterId: number): Promise<User> => {
    const response = await axiosInstance.post<any>(
      `/api/assignments/mentor-to-cluster/${mentorId}/${clusterId}`
    );
    return transformUserFromApi(response.data);
  },

  // Старший продавец → Куст
  assignSeniorToCluster: async (seniorId: number, clusterId: number): Promise<User> => {
    const response = await axiosInstance.post<any>(
      `/api/assignments/senior-to-cluster/${seniorId}/${clusterId}`
    );
    return transformUserFromApi(response.data);
  },

  // Группа → Куст
    assignGroupToCluster: async (groupId: number, clusterId: number): Promise<User> => {
    const response = await axiosInstance.post<any>(
        `/api/assignments/group-to-cluster/${groupId}/${clusterId}`
    );
    return transformUserFromApi(response.data);
    },
  // Администратор → Куст
  assignAdminToCluster: async (adminId: number, clusterId: number): Promise<User> => {
    const response = await axiosInstance.post<any>(
      `/api/assignments/admin-to-cluster/${adminId}/${clusterId}`
    );
    return transformUserFromApi(response.data);
  },
  assignMentorToGroup: async (mentorId: number, groupId: number): Promise<User> => {
    const response = await axiosInstance.post<any>(
        `/api/assignments/mentor-to-group/${mentorId}/${groupId}`
    );
    return transformUserFromApi(response.data);
  },

  // ================ ОТВЯЗКИ ================
  
  // Удалить продавца из группы
  removeSellerFromGroup: async (sellerId: number): Promise<User> => {
    const response = await axiosInstance.delete<any>(
      `/api/assignments/remove-seller-from-group/${sellerId}`
    );
    return transformUserFromApi(response.data);
  },

  // Отвязать наставника от группы (удаляет группу)
  removeMentorFromGroup: async (mentorId: number): Promise<User> => {
    const response = await axiosInstance.delete<any>(
      `/api/assignments/remove-mentor-from-group/${mentorId}`
    );
    return transformUserFromApi(response.data);
  },

  // Отвязать старшего продавца от куста
  removeSeniorFromCluster: async (seniorId: number): Promise<User> => {
    const response = await axiosInstance.delete<any>(
      `/api/assignments/remove-senior-from-cluster/${seniorId}`
    );
    return transformUserFromApi(response.data);
  },

  // Убрать куст у администратора
  removeAdminFromCluster: async (adminId: number, clusterId: number): Promise<User> => {
    const response = await axiosInstance.delete<any>(
      `/api/assignments/admin-from-cluster/${adminId}/${clusterId}`
    );
    return transformUserFromApi(response.data);
  },

  // ================ ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ ================
  
  // Получить пользователей по ID куста
  getUsersByCluster: async (clusterId: number): Promise<User[]> => {
    const response = await axiosInstance.get<any[]>('/api/users', {
      params: { cluster_id: clusterId }
    });
    return response.data.map(transformUserFromApi);
  },

  // Получить пользователей по ID группы
  getUsersByGroup: async (groupId: number): Promise<User[]> => {
    const response = await axiosInstance.get<any[]>('/api/users', {
      params: { group_id: groupId }
    });
    return response.data.map(transformUserFromApi);
  },

  // Получить наставников без группы
  getMentorsWithoutGroup: async (): Promise<User[]> => {
    const response = await axiosInstance.get<any[]>('/api/users', {
      params: { role: UserRole.MENTOR }
    });
    const mentors = response.data.map(transformUserFromApi);
    return mentors.filter(mentor => !mentor.groupId);
  },

  // Получить старших продавцов без куста
  getSeniorSellersWithoutCluster: async (): Promise<User[]> => {
    const response = await axiosInstance.get<any[]>('/api/users', {
      params: { role: UserRole.SENIOR_SELLER }
    });
    const seniorSellers = response.data.map(transformUserFromApi);
    return seniorSellers.filter(senior => !senior.clusterId);
  },

  // Получить продавцов без группы
  getSellersWithoutGroup: async (): Promise<User[]> => {
    const response = await axiosInstance.get<any[]>('/api/users', {
      params: { role: UserRole.SELLER }
    });
    const sellers = response.data.map(transformUserFromApi);
    return sellers.filter(seller => !seller.groupId);
  },

  // ================ ПРОСТЫЕ ФУНКЦИИ ОТВЯЗКИ ================
  
  // Отвязать наставника у продавца
  unassignMentorFromSeller: async (sellerId: number): Promise<User> => {
    // Вызываем метод removeSellerFromGroup напрямую
    return assignmentsService.removeSellerFromGroup(sellerId);
  },

  // Отвязать куст у пользователя (наставник/старший продавец)
  unassignClusterFromUser: async (userId: number, userRole: string): Promise<User> => {
    if (userRole === 'MENTOR') {
      // Для наставника нужно отвязать от куста через удаление группы
      const response = await axiosInstance.get<any>(`/api/users/${userId}`);
      const mentor = transformUserFromApi(response.data);
      
      if (mentor.groupId) {
        // Отвязываем через удаление группы
        return assignmentsService.removeMentorFromGroup(userId);
      } else if (mentor.clusterId) {
        // Просто отвязываем от куста (через update)
        const updateResponse = await axiosInstance.put<any>(`/api/users/${userId}`, {
          cluster_id: null,
          senior_seller_id: null
        });
        return transformUserFromApi(updateResponse.data);
      }
    } else if (userRole === 'SENIOR_SELLER') {
      // Для старшего продавца используем специальный эндпоинт
      return assignmentsService.removeSeniorFromCluster(userId);
    }
    
    throw new Error(`Unsupported role for cluster unassignment: ${userRole}`);
  },
};