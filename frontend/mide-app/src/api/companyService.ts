// companyService.ts - убираем ручной кеш, оставляем только API вызовы
import api from './axios';
import { CompanyTransaction, CompanyBalanceResponse, CompanyBalanceHistory } from '../types';

export const companyService = {
  async getBalance(city?: string): Promise<CompanyBalanceResponse> {
    const params = city ? { city } : {};
    const response = await api.get('api/company/balance', { params });
    return response.data;
  },

  async getBalanceByCity(city: string): Promise<CompanyBalanceResponse> {
    return this.getBalance(city);
  },

  async getBalanceByCities(): Promise<Array<{ city: string; balance: number }>> {
    const response = await api.get('api/company/balance-by-cities');
    return response.data;
  },

  async getTransactions(params?: {
    operation_type?: string;
    date_from?: string;
    date_to?: string;
    city?: string;
    page?: number;
    page_size?: number;
  }): Promise<{
    items: CompanyTransaction[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  }> {
    const response = await api.get('api/company/transactions', { params });
    return response.data;
  },

  async getDashboardData(params: {
    period: string;
    city?: string;
    date?: string;
    date_from?: string;
    date_to?: string;
    max_points?: number;
  }): Promise<{
    balance: number;
    transactions: CompanyTransaction[];
    history: CompanyBalanceHistory[];
    cities: string[];
  }> {
    const response = await api.get('api/company/dashboard-data', { params });
    return response.data;
  },

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

  async addExpense(data: {
    amount: number;
    description: string;
    reference_id?: number;
    reference_type?: string;
    city?: string;
  }): Promise<any> {
    const response = await api.post('api/company/add-expense', null, { params: data });
    return response.data;
  },

  async getStats(params: {
    period: string;
    city?: string;
    date?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<{
    regular_income: number;
    regular_income_count: number;
    report_income: number;
    report_income_count: number;
    total_expense: number;
    income_count: number;
    expense_count: number;
    total_income: number;
    period_start: string;
    period_end: string;
  }> {
    const response = await api.get('api/company/stats', { params });
    return response.data;
  },
};