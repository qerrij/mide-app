import axiosInstance from './axios';
import {
  UserDebtResponse,
  DebtTransactionResponse,
  ManualDebtAdjustmentRequest,
  ManualDebtAdjustmentResponse,
  DebtSummary,
} from '../types';

export const debtService = {
  // Получить мой долг
  getMyDebt: async (): Promise<UserDebtResponse> => {
    try {
      const response = await axiosInstance.get('/api/revisions/debts/my');
      return response.data;
    } catch (error) {
      console.error('Error fetching my debt:', error);
      throw error;
    }
  },

  // Получить долг пользователя по ID
  getUserDebt: async (userId: number): Promise<UserDebtResponse> => {
    try {
      const response = await axiosInstance.get(`/api/revisions/debts/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user debt:', error);
      throw error;
    }
  },

  // Получить все долги (только для руководителей)
  getAllDebts: async (params?: {
    cluster_id?: number;
    group_id?: number;
  }): Promise<DebtSummary[]> => {
    try {
      const response = await axiosInstance.get('/api/revisions/debts/all', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching all debts:', error);
      throw error;
    }
  },

  // Ручная корректировка долга (только OWNER)
  manualAdjustDebt: async (
    userId: number,
    data: ManualDebtAdjustmentRequest
  ): Promise<ManualDebtAdjustmentResponse> => {
    try {
      const response = await axiosInstance.post(`/api/revisions/debts/${userId}/adjust`, data);
      return response.data;
    } catch (error) {
      console.error('Error adjusting debt:', error);
      throw error;
    }
  },

  // Получить историю транзакций
  getDebtTransactions: async (params?: {
    user_id?: number;
    limit?: number;
    skip?: number;
  }): Promise<DebtTransactionResponse[]> => {
    try {
      const response = await axiosInstance.get('/api/revisions/debts/transactions', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching debt transactions:', error);
      throw error;
    }
  },
};