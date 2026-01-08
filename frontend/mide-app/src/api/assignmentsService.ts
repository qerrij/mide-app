import axiosInstance from './axios';
import { User } from '../types';

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

export const assignmentsService = {
  assignSellerToMentor: async (sellerId: number, mentorId: number): Promise<User> => {
    const response = await axiosInstance.post<any>(
      `/api/assignments/seller-to-mentor/${sellerId}/${mentorId}`
    );
    return transformUserFromApi(response.data);
  },

  assignSellerToGroup: async (sellerId: number, groupId: number): Promise<User> => {
    const response = await axiosInstance.post<any>(
      `/api/assignments/seller-to-group/${sellerId}/${groupId}`
    );
    return transformUserFromApi(response.data);
  },

  assignMentorToCluster: async (mentorId: number, clusterId: number): Promise<User> => {
    const response = await axiosInstance.post<any>(
      `/api/assignments/mentor-to-cluster/${mentorId}/${clusterId}`
    );
    return transformUserFromApi(response.data);
  },

  assignSeniorToCluster: async (seniorId: number, clusterId: number): Promise<User> => {
    const response = await axiosInstance.post<any>(
      `/api/assignments/senior-to-cluster/${seniorId}/${clusterId}`
    );
    return transformUserFromApi(response.data);
  },

  assignAdminToCluster: async (adminId: number, clusterId: number): Promise<User> => {
    const response = await axiosInstance.post<any>(
      `/api/assignments/admin-to-cluster/${adminId}/${clusterId}`
    );
    return transformUserFromApi(response.data);
  },

  removeAdminFromCluster: async (adminId: number, clusterId: number): Promise<User> => {
    const response = await axiosInstance.delete<any>(
      `/api/assignments/admin-from-cluster/${adminId}/${clusterId}`
    );
    return transformUserFromApi(response.data);
  },

  removeSellerFromGroup: async (sellerId: number): Promise<User> => {
    const response = await axiosInstance.delete<any>(
      `/api/assignments/remove-seller-from-group/${sellerId}`
    );
    return transformUserFromApi(response.data);
  },
};