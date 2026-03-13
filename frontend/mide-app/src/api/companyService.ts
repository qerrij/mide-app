import api from './axios';
import { CompanyTransaction, CompanyBalanceResponse, CompanyBalanceHistory } from '../types';

export const companyService = {
  // Получить текущий баланс
  async getBalance(): Promise<CompanyBalanceResponse> {
    const response = await api.get('api/company/balance');
    return response.data;
  },

  // Получить историю транзакций
  async getTransactions(params?: {
    skip?: number;
    limit?: number;
    operation_type?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<CompanyTransaction[]> {
    const response = await api.get('api/company/transactions', { params });
    return response.data;
  },

  // Получить историю баланса для графика (обновленная версия)
  async getBalanceHistory(params?: {
    days?: number;
    granularity?: 'hour' | 'day';
    date?: string;
  }): Promise<CompanyBalanceHistory[]> {
    const defaultParams = { days: 30, granularity: 'day' };
    const response = await api.get('api/company/balance-history', { 
      params: { ...defaultParams, ...params } 
    });
    return response.data;
  },

  // Добавить доход
  async addIncome(data: {
    amount: number;
    description: string;
    reference_id?: number;
    reference_type?: string;
  }): Promise<any> {
    const response = await api.post('api/company/add-income', null, { params: data });
    return response.data;
  },

  // Добавить расход
  async addExpense(data: {
    amount: number;
    description: string;
    reference_id?: number;
    reference_type?: string;
  }): Promise<any> {
    const response = await api.post('api/company/add-expense', null, { params: data });
    return response.data;
  }
};