import axiosInstance from './axios';
import { 
  AccountantAssignmentHierarchy,
  AccountantAssignmentCluster,
  AccountantAssignmentGroup,
  AccountantAssignmentUser,
  CheckConflictResponse,
  User,
  UserRole
} from '../types';

const transformUserFromApi = (user: any): User => {
  let adminClusterIds: number[] = [];
  let accountantUserIds: number[] = [];
  
  try {
    if (user.admin_clusters && typeof user.admin_clusters === 'string' && user.admin_clusters.trim() !== '') {
      const parsed = JSON.parse(user.admin_clusters);
      if (Array.isArray(parsed)) {
        adminClusterIds = parsed.filter((id: any) => id && !isNaN(Number(id))).map(Number);
      }
    }
    
    if (user.accountant_user_ids && typeof user.accountant_user_ids === 'string' && user.accountant_user_ids.trim() !== '') {
      const parsed = JSON.parse(user.accountant_user_ids);
      if (Array.isArray(parsed)) {
        accountantUserIds = parsed.filter((id: any) => id && !isNaN(Number(id))).map(Number);
      }
    }
  } catch (error) {
    console.warn('Error parsing user data:', error);
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
    accountantUserIds,
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

// Функция для преобразования пользователя в иерархии
const transformHierarchyUser = (user: any): AccountantAssignmentUser => {
  if (!user) return null as any;
  return {
    id: user.id,
    fullName: user.full_name,
    role: user.role,
    isAssigned: user.is_assigned
  };
};

// Функция для преобразования группы в иерархии
const transformHierarchyGroup = (group: any): AccountantAssignmentGroup => {
  if (!group) return null as any;
  return {
    id: group.id,
    name: group.name,
    mentor: transformHierarchyUser(group.mentor),
    sellers: (group.sellers || []).map((seller: any) => transformHierarchyUser(seller)),
    allUserIds: group.all_user_ids || [],
    assignedCount: group.assigned_count || 0
  };
};

// Функция для преобразования куста в иерархии
const transformHierarchyCluster = (cluster: any): AccountantAssignmentCluster => {
  if (!cluster) return null as any;
  return {
    id: cluster.id,
    name: cluster.name,
    seniorSeller: transformHierarchyUser(cluster.senior_seller),
    groups: (cluster.groups || []).map((group: any) => transformHierarchyGroup(group)),
    allUserIds: cluster.all_user_ids || [],
    assignedCount: cluster.assigned_count || 0
  };
};

// Функция для преобразования всей иерархии
const transformHierarchyFromApi = (data: any): AccountantAssignmentHierarchy => {
  return {
    clusters: (data.clusters || []).map((cluster: any) => transformHierarchyCluster(cluster)),
    unassignedGroups: (data.unassigned_groups || []).map((group: any) => transformHierarchyGroup(group)),
    unassignedUsers: (data.unassigned_users || []).map((user: any) => transformHierarchyUser(user))
  };
};

export const accountantAssignmentService = {
  // Получить иерархию доступных пользователей для назначения бухгалтеру
  getAssignmentHierarchy: async (accountantId: number): Promise<AccountantAssignmentHierarchy> => {
    const response = await axiosInstance.get(`/api/accountant-assignments/hierarchy/${accountantId}`);
    // Преобразуем snake_case в camelCase
    return transformHierarchyFromApi(response.data);
  },

  // Назначить пользователей бухгалтеру (полная перезапись)
  assignUsersToAccountant: async (accountantId: number, userIds: number[]): Promise<User> => {
    const response = await axiosInstance.post(
      `/api/accountant-assignments/${accountantId}`,
      { user_ids: userIds }
    );
    return transformUserFromApi(response.data);
  },

  // Добавить пользователей к существующим назначениям
  addUsersToAccountant: async (accountantId: number, userIds: number[]): Promise<User> => {
    const response = await axiosInstance.post(
      `/api/accountant-assignments/${accountantId}/add`,
      { user_ids: userIds }
    );
    return transformUserFromApi(response.data);
  },

  // Удалить пользователей из назначений
  removeUsersFromAccountant: async (accountantId: number, userIds: number[]): Promise<User> => {
    const response = await axiosInstance.delete(
      `/api/accountant-assignments/${accountantId}/remove`,
      { data: { user_ids: userIds } }
    );
    return transformUserFromApi(response.data);
  },

  // Получить ID привязанных пользователей
  getAssignedUsers: async (accountantId: number): Promise<number[]> => {
    const response = await axiosInstance.get(`/api/accountant-assignments/${accountantId}/assigned`);
    return response.data;
  },

  // Проверить конфликты перед назначением
  checkConflicts: async (userIds: number[], excludeAccountantId?: number): Promise<CheckConflictResponse> => {
    const params: any = { user_ids: userIds.join(',') };
    if (excludeAccountantId) {
      params.exclude_accountant_id = excludeAccountantId;
    }
    const response = await axiosInstance.get('/api/accountant-assignments/check-conflicts', { params });
    return response.data;
  }
};