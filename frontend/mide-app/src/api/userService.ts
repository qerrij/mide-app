import axiosInstance from './axios';
import { User, CreateUserDto, UpdateUserDto, UserRole, Group, Cluster } from '../types';

// Функция для трансформации snake_case в camelCase
const transformUserFromApi = (user: any): User => {
  // Безопасный парсинг admin_clusters
  let adminClusterIds: number[] = [];
  try {
    if (user.admin_clusters) {
      // Проверяем тип
      if (typeof user.admin_clusters === 'string') {
        const trimmed = user.admin_clusters.trim();
        if (trimmed !== '' && trimmed !== '[]') {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            adminClusterIds = parsed.filter((id: any) => id !== null && id !== 0 && !isNaN(Number(id)));
          }
        }
      } else if (Array.isArray(user.admin_clusters)) {
        adminClusterIds = user.admin_clusters.filter((id: any) => id !== null && id !== 0 && !isNaN(Number(id)));
      } else if (typeof user.admin_clusters === 'object' && user.admin_clusters !== null) {
        // Если это объект, пытаемся преобразовать в массив
        const values = Object.values(user.admin_clusters);
        adminClusterIds = values
          .filter((id: any) => id !== null && id !== 0 && !isNaN(Number(id)))
          .map((id: any) => Number(id));
      }
    }
  } catch (error) {
    console.warn('Error parsing admin_clusters:', error, user.admin_clusters);
    // Оставляем пустой массив в случае ошибки
    adminClusterIds = [];
  }

  // Преобразуем все ID в числа
  adminClusterIds = adminClusterIds.map(id => Number(id));


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
};


// В конец файла userService.ts добавьте:

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