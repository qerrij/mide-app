import axiosInstance from './axios';
import { Cluster, CreateClusterDto, UpdateClusterDto } from '../types';

// Функция для трансформации snake_case в camelCase (получение с бэкенда)
const transformClusterFromApi = (cluster: any): Cluster => {
  return {
    id: cluster.id,
    name: cluster.name,
    seniorSellerId: cluster.senior_seller_id,
    adminId: cluster.admin_id,
    description: cluster.description,
    createdAt: new Date(cluster.created_at),
    updatedAt: cluster.updated_at ? new Date(cluster.updated_at) : undefined,
    groupCount: cluster.group_count,
    sellerCount: cluster.seller_count,
    seniorSellerName: cluster.senior_seller_name,
    adminName: cluster.admin_name,
  };
};

// Функция для трансформации camelCase в snake_case (отправка на бэкенд)
const transformClusterToApi = (cluster: CreateClusterDto | UpdateClusterDto): any => {
  const transformed: any = {};
  
  if ('name' in cluster && cluster.name !== undefined) {
    transformed.name = cluster.name;
  }
  if ('seniorSellerId' in cluster && cluster.seniorSellerId !== undefined) {
    transformed.senior_seller_id = cluster.seniorSellerId;
  }
  if ('adminId' in cluster && cluster.adminId !== undefined) {
    transformed.admin_id = cluster.adminId;
  }
  if ('description' in cluster && cluster.description !== undefined) {
    transformed.description = cluster.description;
  }
  
  return transformed;
};

export const clusterService = {
  // Получить все кусты
  getAllClusters: async (skip: number = 0, limit: number = 100): Promise<Cluster[]> => {
    const response = await axiosInstance.get<any[]>('/api/clusters', {
      params: { skip, limit }
    });
    return response.data.map(transformClusterFromApi);
  },

  // Получить куст по ID
  getClusterById: async (id: number): Promise<Cluster> => {
    const response = await axiosInstance.get<any>(`/api/clusters/${id}`);
    return transformClusterFromApi(response.data);
  },

  // Получить куст по ID старшего продавца
  getClusterBySeniorSeller: async (seniorSellerId: number): Promise<Cluster | null> => {
    const response = await axiosInstance.get<any[]>('/api/clusters', {
      params: { senior_seller_id: seniorSellerId }
    });
    if (response.data && response.data.length > 0) {
      return transformClusterFromApi(response.data[0]);
    }
    return null;
  },

  // Получить кусты по ID администратора
  getClustersByAdmin: async (adminId: number): Promise<Cluster[]> => {
    const response = await axiosInstance.get<any[]>('/api/clusters', {
      params: { admin_id: adminId }
    });
    return response.data.map(transformClusterFromApi);
  },

  // Создать куст
  createCluster: async (clusterData: CreateClusterDto): Promise<Cluster> => {
    const transformedData = transformClusterToApi(clusterData);
    const response = await axiosInstance.post<any>('/api/clusters', transformedData);
    return transformClusterFromApi(response.data);
  },

  // Обновить куст
  updateCluster: async (id: number, clusterData: UpdateClusterDto): Promise<Cluster> => {
    const transformedData = transformClusterToApi(clusterData);
    const response = await axiosInstance.put<any>(`/api/clusters/${id}`, transformedData);
    return transformClusterFromApi(response.data);
  },

  // Удалить куст
  deleteCluster: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/api/clusters/${id}`);
  },

  // Добавить группу в куст
  addGroupToCluster: async (clusterId: number, groupId: number): Promise<void> => {
    await axiosInstance.post(`/api/clusters/${clusterId}/groups/${groupId}`);
  },

  // Удалить группу из куста
  removeGroupFromCluster: async (clusterId: number, groupId: number): Promise<void> => {
    await axiosInstance.delete(`/api/clusters/${clusterId}/groups/${groupId}`);
  },
};