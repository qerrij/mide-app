import axiosInstance from './axios';
import { Group, CreateGroupDto, UpdateGroupDto } from '../types';

// Функция для трансформации snake_case в camelCase (получение с бэкенда)
const transformGroupFromApi = (group: any): Group => {
  return {
    id: group.id,
    name: group.name,
    mentorId: group.mentor_id,
    clusterId: group.cluster_id,
    seniorSellerId: group.senior_seller_id,
    description: group.description,
    createdAt: new Date(group.created_at),
    updatedAt: group.updated_at ? new Date(group.updated_at) : undefined,
    sellerCount: group.seller_count,
    mentorName: group.mentor_name,
  };
};

// Функция для трансформации camelCase в snake_case (отправка на бэкенд)
const transformGroupToApi = (group: CreateGroupDto | UpdateGroupDto): any => {
  const transformed: any = {};
  
  if ('name' in group && group.name !== undefined) {
    transformed.name = group.name;
  }
  if ('mentorId' in group && group.mentorId !== undefined) {
    transformed.mentor_id = group.mentorId;
  }
  if ('clusterId' in group && group.clusterId !== undefined) {
    transformed.cluster_id = group.clusterId;
  }
  if ('seniorSellerId' in group && group.seniorSellerId !== undefined) {
    transformed.senior_seller_id = group.seniorSellerId;
  }
  if ('description' in group && group.description !== undefined) {
    transformed.description = group.description;
  }
  
  return transformed;
};

export const groupService = {
  // Получить все группы
  getAllGroups: async (skip: number = 0, limit: number = 100): Promise<Group[]> => {
    const response = await axiosInstance.get<any[]>('/api/groups', {
      params: { skip, limit }
    });
    return response.data.map(transformGroupFromApi);
  },

  // Получить группу по ID
  getGroupById: async (id: number): Promise<Group> => {
    const response = await axiosInstance.get<any>(`/api/groups/${id}`);
    return transformGroupFromApi(response.data);
  },

  // Получить группы по ID куста
  getGroupsByCluster: async (clusterId: number): Promise<Group[]> => {
    const response = await axiosInstance.get<any[]>('/api/groups', {
      params: { cluster_id: clusterId }
    });
    return response.data.map(transformGroupFromApi);
  },

  // Получить группу по ID наставника
  getGroupByMentor: async (mentorId: number): Promise<Group | null> => {
    const response = await axiosInstance.get<any[]>('/api/groups', {
      params: { mentor_id: mentorId }
    });
    if (response.data && response.data.length > 0) {
      return transformGroupFromApi(response.data[0]);
    }
    return null;
  },

  // Создать группу
  createGroup: async (groupData: CreateGroupDto): Promise<Group> => {
    const transformedData = transformGroupToApi(groupData);
    const response = await axiosInstance.post<any>('/api/groups', transformedData);
    return transformGroupFromApi(response.data);
  },

  // Обновить группу
  updateGroup: async (id: number, groupData: UpdateGroupDto): Promise<Group> => {
    const transformedData = transformGroupToApi(groupData);
    const response = await axiosInstance.put<any>(`/api/groups/${id}`, transformedData);
    return transformGroupFromApi(response.data);
  },

  // Удалить группу
  deleteGroup: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/api/groups/${id}`);
  },

  // Добавить продавца в группу
  addSellerToGroup: async (groupId: number, sellerId: number): Promise<void> => {
    await axiosInstance.post(`/api/groups/${groupId}/sellers/${sellerId}`);
  },

  // Удалить продавца из группы
  removeSellerFromGroup: async (groupId: number, sellerId: number): Promise<void> => {
    await axiosInstance.delete(`/api/groups/${groupId}/sellers/${sellerId}`);
  },
  
};

