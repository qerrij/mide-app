import axiosInstance from './axios';
import {
  UserDebtsResponse,
  DebtTransaction,
  DebtStatistics,
} from '../types';

export const debtService = {
  // Получить мои долги
  getMyDebts: async (): Promise<UserDebtsResponse> => {
    try {
      const response = await axiosInstance.get('/api/revisions/debts/my');
      return response.data;
    } catch (error) {
      console.error('Error fetching my debts:', error);
      throw error;
    }
  },

  // Получить долги пользователя
  getUserDebts: async (userId: number): Promise<UserDebtsResponse> => {
    try {
      const response = await axiosInstance.get(`/api/revisions/debts/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user debts:', error);
      throw error;
    }
  },

  // Получить все долги (только для руководителей)
  getAllDebts: async (params?: {
    role?: string;
    cluster_id?: number;
    group_id?: number;
  }): Promise<any[]> => {
    try {
      const response = await axiosInstance.get('/api/revisions/debts/all', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching all debts:', error);
      throw error;
    }
  },

  // Получить историю транзакций
  getDebtTransactions: async (params?: {
    user_id?: number;
    product_id?: number;
    limit?: number;
    skip?: number;
  }): Promise<DebtTransaction[]> => {
    try {
      const response = await axiosInstance.get('/api/revisions/debts/transactions', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching debt transactions:', error);
      throw error;
    }
  },

  // Получить статистику по долгам
  getDebtStatistics: async (params?: {
    cluster_id?: number;
    group_id?: number;
  }): Promise<DebtStatistics> => {
    try {
      const response = await axiosInstance.get('/api/revisions/debts/stats', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching debt statistics:', error);
      throw error;
    }
  },
};