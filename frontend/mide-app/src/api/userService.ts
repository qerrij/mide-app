import axiosInstance from './axios';
import { User, CreateUserDto, UpdateUserDto, UserRole, Group, Cluster } from '../types';

// Функция для трансформации snake_case в camelCase
const transformUserFromApi = (user: any): User => {
  // Исправленный парсинг admin_clusters
  let adminClusterIds: number[] = [];
  let accountantUserIds: number[] = [];
  
  try {
    if (user.accountant_user_ids && typeof user.accountant_user_ids === 'string' && user.accountant_user_ids.trim() !== '') {
      const parsed = JSON.parse(user.accountant_user_ids);
      if (Array.isArray(parsed)) {
        accountantUserIds = parsed.filter((id: any) => id && !isNaN(Number(id))).map(Number);
      }
    }
  } catch (error) {
    console.warn('Error parsing accountant_user_ids:', error);
  }

  try {
    if (user.admin_clusters) {
      if (typeof user.admin_clusters === 'string') {
        if (user.admin_clusters.trim() !== '' && user.admin_clusters.trim() !== '[]') {
          const parsed = JSON.parse(user.admin_clusters);
          if (Array.isArray(parsed)) {
            adminClusterIds = parsed.filter((id: any) => 
              id !== null && id !== undefined && id !== 0 && !isNaN(Number(id))
            ).map((id: any) => Number(id));
          }
        }
      } else if (Array.isArray(user.admin_clusters)) {
        adminClusterIds = user.admin_clusters.filter((id: any) => 
          id !== null && id !== undefined && id !== 0 && !isNaN(Number(id))
        ).map((id: any) => Number(id));
      }
    }
  } catch (error) {
    console.warn('Error parsing admin_clusters:', error, user.admin_clusters);
    adminClusterIds = [];
  }

  return {
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    telegram: user.telegram,
    city: user.city,
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
    accountantUserIds,
  };
};

// Функция для трансформации camelCase в snake_case при отправке
const transformUserToApi = (user: CreateUserDto | UpdateUserDto): any => {
  const transformed: any = {};
  
  if ('username' in user && user.username !== undefined) {
    transformed.username = user.username;
  }
  if ('password' in user && user.password !== undefined) {
    transformed.password = user.password;
  }
  if ('fullName' in user && user.fullName !== undefined) {
    transformed.full_name = user.fullName;
  }
  if ('telegram' in user && user.telegram !== undefined) {
    transformed.telegram = user.telegram;
  }
  if ('city' in user && user.city !== undefined) {
    transformed.city = user.city;
  }
  if ('role' in user && user.role !== undefined) {
    transformed.role = user.role;
  }
  if ('rate' in user && user.rate !== undefined) {
    transformed.rate = user.rate;
  }
  
  return transformed;
};

// Типы для ответов от новых эндпоинтов
interface UserNameResponse {
  id: number;
  full_name: string;
}

interface UsersNamesResponse {
  user_names: { [key: string]: string };
}

export const userService = {
  // Получить всех пользователей
  getAllUsers: async (skip: number = 0, limit: number = 100): Promise<User[]> => {
    try {
      const response = await axiosInstance.get<any[]>('/api/users', {
        params: { skip, limit }
      });
      
      // Добавим отладочную информацию
      console.log('Users response:', response.data);
      
      return response.data.map(transformUserFromApi);
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  // Получить пользователя по ID
  getUserById: async (id: number): Promise<User> => {
    const response = await axiosInstance.get<any>(`/api/users/${id}`);
    return transformUserFromApi(response.data);
  },

  // Создать пользователя
  createUser: async (userData: CreateUserDto): Promise<User> => {
    const transformedData = transformUserToApi(userData);
    const response = await axiosInstance.post<any>('/api/users', transformedData);
    return transformUserFromApi(response.data);
  },

  // Обновить пользователя
  updateUser: async (id: number, userData: UpdateUserDto): Promise<User> => {
    const transformedData = transformUserToApi(userData);
    const response = await axiosInstance.put<any>(`/api/users/${id}`, transformedData);
    return transformUserFromApi(response.data);
  },

  // Удалить пользователя
  deleteUser: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/api/users/${id}`);
  },

  // Получить доступных наставников (без группы)
  getAvailableMentors: async (): Promise<User[]> => {
    const response = await axiosInstance.get<any[]>('/api/users/available/mentors');
    return response.data.map(transformUserFromApi);
  },

  // Получить доступных старших продавцов (без куста)
  getAvailableSeniorSellers: async (): Promise<User[]> => {
    const response = await axiosInstance.get<any[]>('/api/users/available/senior_sellers');
    return response.data.map(transformUserFromApi);
  },

  // Получить продавцов без группы
  getSellersWithoutGroup: async (): Promise<User[]> => {
    const response = await axiosInstance.get<any[]>('/api/users', {
      params: { role: UserRole.SELLER }
    });
    const users = response.data.map(transformUserFromApi);
    return users.filter(user => !user.groupId);
  },

  // Получить текущего пользователя
  getCurrentUser: async (): Promise<User> => {
    try {
      // Используем эндпоинт /api/auth/me
      const response = await axiosInstance.get<any>('/api/auth/me');
      return transformUserFromApi(response.data.user);
    } catch (error) {
      throw error;
    }
  },
  
  // Получить ФИО пользователей по списку ID
  getUsersNames: async (userIds: number[]): Promise<{ [userId: number]: string }> => {
    try {
      if (userIds.length === 0) {
        return {};
      }
      
      // Удаляем дубликаты и фильтруем валидные ID
      const uniqueIds: number[] = [];
      const seen = new Set<number>();
      for (const id of userIds) {
        if (id > 0 && !seen.has(id)) {
          seen.add(id);
          uniqueIds.push(id);
        }
      }
      
      if (uniqueIds.length === 0) {
        return {};
      }
      
      // Преобразуем в строку через запятую
      const idsString = uniqueIds.join(',');
      
      console.log('Fetching user names for IDs:', idsString);
      
      const response = await axiosInstance.get<UsersNamesResponse>(
        '/api/users/names',
        { 
          params: { user_ids: idsString },
          timeout: 5000
        }
      );
      
      console.log('User names response:', response.data);
      
      const result: { [userId: number]: string } = {};
      
      // Обрабатываем ответ
      if (response.data && response.data.user_names) {
        for (const [key, value] of Object.entries(response.data.user_names)) {
          const userId = parseInt(key, 10);
          if (!isNaN(userId) && typeof value === 'string') {
            result[userId] = value;
          }
        }
      }
      
      // Добавляем дефолтные значения для отсутствующих ID
      uniqueIds.forEach(userId => {
        if (!(userId in result)) {
          result[userId] = `Пользователь ${userId}`;
        }
      });
      
      return result;
    } catch (error: any) {
      console.error('Error fetching user names:', error);
      console.error('Error details:', error.response?.data);
      
      // Возвращаем дефолтные значения при ошибке
      const result: { [userId: number]: string } = {};
      userIds.forEach(userId => {
        result[userId] = `Пользователь ${userId}`;
      });
      
      return result;
    }
  },

  // Получить ФИО одного пользователя по ID
  getUserName: async (userId: number): Promise<string> => {
    try {
      console.log(`Fetching user name for ID: ${userId}`);
      
      const response = await axiosInstance.get<UserNameResponse>(
        `/api/users/${userId}/name`
      );
      
      console.log(`User name response for ${userId}:`, response.data);
      
      return response.data.full_name;
    } catch (error: any) {
      console.error(`Error fetching user name for ID ${userId}:`, error);
      return `Пользователь ${userId}`;
    }
  },
  
  // Оптимизированная версия для получения одного имени (с кешированием)
  getCachedUserName: async (userId: number): Promise<string> => {
    // Простая реализация кеширования в памяти
    const cacheKey = `user_name_${userId}`;
    const cached = sessionStorage.getItem(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    try {
      const userName = await userService.getUserName(userId);
      // Сохраняем в sessionStorage на время сессии
      sessionStorage.setItem(cacheKey, userName);
      return userName;
    } catch (error) {
      return `Пользователь ${userId}`;
    }
  },
    getAllUsersBasic: async (): Promise<Array<{
    id: number;
    fullName: string;
    role: UserRole;
  }>> => {
    try {
      const response = await axiosInstance.get<any[]>('/api/users/all-basic');
      // console.log(response.data)
      // Трансформируем из snake_case в camelCase
      return response.data.map(user => ({
        id: user.id,
        fullName: user.full_name,
        role: user.role,
      }));
    } catch (error) {
      console.error('Error fetching all users basic:', error);
      throw error;
    }
  },
  changeUserPassword: async (userId: number, newPassword: string): Promise<{ message: string }> => {
    try {
      const response = await axiosInstance.post<{ message: string }>(
        `/api/users/${userId}/change-password`,
        { password: newPassword }
      );
      return response.data;
    } catch (error) {
      console.error('Error changing user password:', error);
      throw error;
    }
  },
};

// Вспомогательные функции для работы со связями пользователей
export const getUserRelations = (
  user: User,
  allUsers: User[],
  groups: Group[],
  clusters: Cluster[]
) => {
  const group = user.groupId ? groups.find(g => g.id === user.groupId) : null;
  const cluster = user.clusterId ? clusters.find(c => c.id === user.clusterId) : null;
  const mentor = user.mentorId ? allUsers.find(u => u.id === user.mentorId) : null;
  const seniorSeller = user.seniorSellerId ? allUsers.find(u => u.id === user.seniorSellerId) : null;
  
  return {
    group,
    cluster,
    mentor,
    seniorSeller,
    isInGroup: !!group,
    isInCluster: !!cluster,
    hasMentor: !!mentor,
    hasSeniorSeller: !!seniorSeller,
  };
};

export const getAvailableMentorsForAssignment = (allUsers: User[], groups: Group[]) => {
  return allUsers.filter(u => 
    u.role === UserRole.MENTOR && 
    (!groups.some(g => g.mentorId === u.id)) // Наставник без группы
  );
};

export const getAvailableSeniorSellersForAssignment = (allUsers: User[], clusters: Cluster[]) => {
  return allUsers.filter(u => 
    u.role === UserRole.SENIOR_SELLER && 
    (!clusters.some(c => c.seniorSellerId === u.id)) // Старший продавец без куста
  );
};

export const getSellersWithoutGroup = (allUsers: User[]) => {
  return allUsers.filter(u => 
    u.role === UserRole.SELLER && 
    !u.groupId
  );
};

export const getMentorsWithoutGroup = (allUsers: User[]) => {
  return allUsers.filter(u => 
    u.role === UserRole.MENTOR && 
    !u.groupId
  );
};

export const getSeniorSellersWithoutCluster = (allUsers: User[]) => {
  return allUsers.filter(u => 
    u.role === UserRole.SENIOR_SELLER && 
    !u.clusterId
  );
};