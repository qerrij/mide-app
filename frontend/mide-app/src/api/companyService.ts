import api from './axios';
import { CompanyTransaction, CompanyBalanceResponse, CompanyBalanceHistory } from '../types';

// Простой кэш для запросов
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

function getCached(key: string) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCached(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
}

function clearCache() {
  cache.clear();
}

export const companyService = {
  // Получить текущий баланс (общий или по городу)
  async getBalance(city?: string): Promise<CompanyBalanceResponse> {
    const cacheKey = `balance:${city || 'global'}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const params = city ? { city } : {};
    const response = await api.get('api/company/balance', { params });
    
    setCached(cacheKey, response.data);
    return response.data;
  },

  // Получить баланс по конкретному городу
  async getBalanceByCity(city: string): Promise<CompanyBalanceResponse> {
    return this.getBalance(city);
  },

  // Получить баланс по городам
  async getBalanceByCities(): Promise<Array<{ city: string; balance: number }>> {
    const cacheKey = 'balance-by-cities';
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const response = await api.get('api/company/balance-by-cities');
    
    setCached(cacheKey, response.data);
    return response.data;
  },

  // Получить все транзакции с фильтрами
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
    const cacheKey = `transactions:${JSON.stringify(params)}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const response = await api.get('api/company/transactions', { params });
    
    setCached(cacheKey, response.data);
    return response.data;
  },

  // Получить историю баланса для графика
  async getBalanceHistory(params?: {
    days?: number;
    granularity?: 'hour' | 'day';
    date?: string;
    city?: string;
    max_points?: number;
  }): Promise<CompanyBalanceHistory[]> {
    const cacheKey = `history:${JSON.stringify(params)}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const defaultParams = { days: 30, granularity: 'day', max_points: 100 };
    const response = await api.get('api/company/balance-history', { 
      params: { ...defaultParams, ...params } 
    });
    
    setCached(cacheKey, response.data);
    return response.data;
  },

  // Получить статистику по городам
  async getStatsByCity(params?: {
    date_from?: string;
    date_to?: string;
  }): Promise<Array<{
    city: string;
    total_income: number;
    total_expense: number;
    transactions_count: number;
  }>> {
    const cacheKey = `stats-by-city:${JSON.stringify(params)}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const response = await api.get('api/company/stats-by-city', { params });
    
    setCached(cacheKey, response.data);
    return response.data;
  },

  // Получить все данные для дашборда одним запросом
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
    const cacheKey = `dashboard:${JSON.stringify(params)}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const response = await api.get('api/company/dashboard-data', { params });
    
    setCached(cacheKey, response.data);
    return response.data;
  },

  // Добавить доход
  async addIncome(data: {
    amount: number;
    description: string;
    reference_id?: number;
    reference_type?: string;
    city?: string;
  }): Promise<any> {
    const response = await api.post('api/company/add-income', null, { params: data });
    clearCache(); // Очищаем кэш после изменений
    return response.data;
  },

  // Добавить расход
  async addExpense(data: {
    amount: number;
    description: string;
    reference_id?: number;
    reference_type?: string;
    city?: string;
  }): Promise<any> {
    const response = await api.post('api/company/add-expense', null, { params: data });
    clearCache(); // Очищаем кэш после изменений
    return response.data;
  },

  // Получить статистику за период
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
    const cacheKey = `stats:${JSON.stringify(params)}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const response = await api.get('api/company/stats', { params });
    
    setCached(cacheKey, response.data);
    return response.data;
  },

  // Очистить кэш
  clearCache() {
    clearCache();
  }
};