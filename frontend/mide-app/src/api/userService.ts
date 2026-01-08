import axiosInstance from './axios';
import { User, CreateUserDto, UpdateUserDto, UserRole } from '../types';

// Функция для трансформации snake_case в camelCase
const transformUserFromApi = (user: any): User => {
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
    adminClusterIds: user.admin_clusters || [],
    createdAt: new Date(user.created_at),
    updatedAt: user.updated_at ? new Date(user.updated_at) : undefined,
    lastLogin: user.last_login ? new Date(user.last_login) : undefined,
  };
};

// Функция для трансформации camelCase в snake_case при отправке
const transformUserToApi = (user: CreateUserDto | UpdateUserDto): any => {
  const transformed: any = {};
  
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
  if ('adminClusterIds' in user && user.adminClusterIds !== undefined) {
    transformed.admin_clusters = user.adminClusterIds;
  }
  if ('username' in user && user.username !== undefined) {
    transformed.username = user.username;
  }
  if ('password' in user && user.password !== undefined) {
    transformed.password = user.password;
  }
  
  return transformed;
};

export const userService = {
  // Получить всех пользователей
  getAllUsers: async (skip: number = 0, limit: number = 100): Promise<User[]> => {
    const response = await axiosInstance.get<any[]>('/api/users', {
      params: { skip, limit }
    });
    return response.data.map(transformUserFromApi);
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

  // Получить наставников без группы
  getMentorsWithoutGroup: async (): Promise<User[]> => {
    const response = await axiosInstance.get<any[]>('/api/users', {
      params: { role: UserRole.MENTOR }
    });
    const users = response.data.map(transformUserFromApi);
    return users.filter(user => !user.groupId);
  },

  // Получить старших продавцов без куста
  getSeniorSellersWithoutCluster: async (): Promise<User[]> => {
    const response = await axiosInstance.get<any[]>('/api/users', {
      params: { role: UserRole.SENIOR_SELLER }
    });
    const users = response.data.map(transformUserFromApi);
    return users.filter(user => !user.clusterId);
  }
};