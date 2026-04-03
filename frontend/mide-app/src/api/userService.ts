import axiosInstance from './axios';
import { User, CreateUserDto, UpdateUserDto, UserRole, Group, Cluster, UserCategoryRate, UserCategoryRateCreate } from '../types';

// Функция для трансформации snake_case в camelCase
const transformUserFromApi = (user: any): User => {
  // Парсим admin_clusters
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

  // Парсим category_rates
  let categoryRates: UserCategoryRate[] = [];
  if (user.category_rates && Array.isArray(user.category_rates)) {
    categoryRates = user.category_rates.map((rate: any) => ({
      id: rate.id,
      category_id: rate.category_id,
      category_name: rate.category_name,
      rate: rate.rate,
    }));
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
    categoryRates,
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
  if ('cityId' in user && user.cityId !== undefined) {
    transformed.city_id = user.cityId;
  }
  if ('role' in user && user.role !== undefined) {
    transformed.role = user.role;
  }
  if ('rate' in user && user.rate !== undefined) {
    transformed.rate = user.rate;
  }
  if ('clusterId' in user && user.clusterId !== undefined) {
    transformed.cluster_id = user.clusterId;
  }
  if ('groupId' in user && user.groupId !== undefined) {
    transformed.group_id = user.groupId;
  }
  if ('mentorId' in user && user.mentorId !== undefined) {
    transformed.mentor_id = user.mentorId;
  }
  if ('seniorSellerId' in user && user.seniorSellerId !== undefined) {
    transformed.senior_seller_id = user.seniorSellerId;
  }
  if ('adminId' in user && user.adminId !== undefined) {
    transformed.admin_id = user.adminId;
  }
  if ('adminClusterIds' in user && user.adminClusterIds !== undefined) {
    transformed.admin_clusters = user.adminClusterIds;
  }
  if ('accountantUserIds' in user && user.accountantUserIds !== undefined) {
    transformed.accountant_user_ids = user.accountantUserIds;
  }
  if ('isActive' in user && user.isActive !== undefined) {
    transformed.is_active = user.isActive;
  }
  if ('categoryRates' in user && user.categoryRates !== undefined) {
    transformed.category_rates = user.categoryRates;
  }
  
  return transformed;
};

// Типы для ответов от эндпоинтов
interface UserNameResponse {
  id: number;
  full_name: string;
}

interface UsersNamesResponse {
  user_names: { [key: string]: string };
}

export const userService = {
  getAllUsers: async (skip: number = 0, limit: number = 100): Promise<User[]> => {
    try {
      const response = await axiosInstance.get<any[]>('/api/users', {
        params: { skip, limit }
      });
      return response.data.map(transformUserFromApi);
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  getUserById: async (id: number): Promise<User> => {
    const response = await axiosInstance.get<any>(`/api/users/${id}`);
    return transformUserFromApi(response.data);
  },

  createUser: async (userData: CreateUserDto): Promise<User> => {
    const transformedData = transformUserToApi(userData);
    const response = await axiosInstance.post<any>('/api/users', transformedData);
    return transformUserFromApi(response.data);
  },

  updateUser: async (id: number, userData: UpdateUserDto): Promise<User> => {
    const transformedData = transformUserToApi(userData);
    const response = await axiosInstance.put<any>(`/api/users/${id}`, transformedData);
    return transformUserFromApi(response.data);
  },

  deleteUser: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/api/users/${id}`);
  },

  getAvailableMentors: async (): Promise<User[]> => {
    const response = await axiosInstance.get<any[]>('/api/users/available/mentors');
    return response.data.map(transformUserFromApi);
  },

  getAvailableSeniorSellers: async (): Promise<User[]> => {
    const response = await axiosInstance.get<any[]>('/api/users/available/senior_sellers');
    return response.data.map(transformUserFromApi);
  },

  getSellersWithoutGroup: async (): Promise<User[]> => {
    const response = await axiosInstance.get<any[]>('/api/users', {
      params: { role: UserRole.SELLER }
    });
    const users = response.data.map(transformUserFromApi);
    return users.filter(user => !user.groupId);
  },

  getCurrentUser: async (): Promise<User> => {
    try {
      const response = await axiosInstance.get<any>('/api/auth/me');
      return transformUserFromApi(response.data.user);
    } catch (error) {
      throw error;
    }
  },
  
  getUsersNames: async (userIds: number[]): Promise<{ [userId: number]: string }> => {
    try {
      if (userIds.length === 0) {
        return {};
      }
      
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
      
      const idsString = uniqueIds.join(',');
      const response = await axiosInstance.get<UsersNamesResponse>(
        '/api/users/names',
        { 
          params: { user_ids: idsString },
          timeout: 5000
        }
      );
      
      const result: { [userId: number]: string } = {};
      
      if (response.data && response.data.user_names) {
        for (const [key, value] of Object.entries(response.data.user_names)) {
          const userId = parseInt(key, 10);
          if (!isNaN(userId) && typeof value === 'string') {
            result[userId] = value;
          }
        }
      }
      
      uniqueIds.forEach(userId => {
        if (!(userId in result)) {
          result[userId] = `Пользователь ${userId}`;
        }
      });
      
      return result;
    } catch (error: any) {
      console.error('Error fetching user names:', error);
      const result: { [userId: number]: string } = {};
      userIds.forEach(userId => {
        result[userId] = `Пользователь ${userId}`;
      });
      return result;
    }
  },

  getUserName: async (userId: number): Promise<string> => {
    try {
      const response = await axiosInstance.get<UserNameResponse>(
        `/api/users/${userId}/name`
      );
      return response.data.full_name;
    } catch (error: any) {
      console.error(`Error fetching user name for ID ${userId}:`, error);
      return `Пользователь ${userId}`;
    }
  },
  
  getCachedUserName: async (userId: number): Promise<string> => {
    const cacheKey = `user_name_${userId}`;
    const cached = sessionStorage.getItem(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    try {
      const userName = await userService.getUserName(userId);
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