import api from './axios';
import { CompanyTransaction, CompanyBalanceResponse, CompanyBalanceHistory } from '../types';

export const companyService = {
  // Получить текущий баланс (общий или по городу)
  async getBalance(city?: string): Promise<CompanyBalanceResponse> {
    const params = city ? { city } : {};
    const response = await api.get('api/company/balance', { params });
    return response.data;
  },

  // Получить баланс по конкретному городу (новый метод)
  async getBalanceByCity(city: string): Promise<CompanyBalanceResponse> {
    const response = await api.get('api/company/balance', { params: { city } });
    return response.data;
  },

  // Получить историю транзакций с фильтром по городу
  async getTransactions(params?: {
    skip?: number;
    limit?: number;
    operation_type?: string;
    date_from?: string;
    date_to?: string;
    city?: string;
  }): Promise<CompanyTransaction[]> {
    const response = await api.get('api/company/transactions', { params });
    return response.data;
  },

  // Получить историю баланса для графика с фильтром по городу
  async getBalanceHistory(params?: {
    days?: number;
    granularity?: 'hour' | 'day';
    date?: string;
    city?: string;
  }): Promise<CompanyBalanceHistory[]> {
    const defaultParams = { days: 30, granularity: 'day' };
    const response = await api.get('api/company/balance-history', { 
      params: { ...defaultParams, ...params } 
    });
    return response.data;
  },

  // Добавить доход с указанием города
  async addIncome(data: {
    amount: number;
    description: string;
    reference_id?: number;
    reference_type?: string;
    city?: string;
  }): Promise<any> {
    const response = await api.post('api/company/add-income', null, { params: data });
    return response.data;
  },

  // Добавить расход с указанием города
  async addExpense(data: {
    amount: number;
    description: string;
    reference_id?: number;
    reference_type?: string;
    city?: string;
  }): Promise<any> {
    const response = await api.post('api/company/add-expense', null, { params: data });
    return response.data;
  }
};