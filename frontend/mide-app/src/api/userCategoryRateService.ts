// api/userCategoryRateService.ts
import axiosInstance from './axios';
import { UserCategoryRate, UserCategoryRateCreate } from '../types';

export const userCategoryRateService = {
  /**
   * Получить все ставки пользователя по категориям
   */
  getUserCategoryRates: async (userId: number): Promise<UserCategoryRate[]> => {
    try {
      const response = await axiosInstance.get<any[]>(`/api/users/${userId}/category-rates`);
      return response.data.map((rate: any) => ({
        id: rate.id,
        category_id: rate.category_id,
        category_name: rate.category_name,
        rate: rate.rate,
      }));
    } catch (error) {
      console.error('Error fetching user category rates:', error);
      return [];
    }
  },

  /**
   * Получить ставку пользователя для конкретной категории
   */
  getUserCategoryRate: async (userId: number, categoryId: number): Promise<number> => {
    try {
      const response = await axiosInstance.get<{ rate: number }>(`/api/users/${userId}/category-rates/${categoryId}`);
      return response.data?.rate || 0;
    } catch (error) {
      console.error('Error fetching user category rate:', error);
      return 0;
    }
  },

  /**
   * Массовое обновление ставок пользователя по категориям
   */
  bulkUpdateUserCategoryRates: async (userId: number, rates: UserCategoryRateCreate[]): Promise<UserCategoryRate[]> => {
    try {
      const response = await axiosInstance.post<any[]>(`/api/users/${userId}/category-rates/bulk`, rates);
      return response.data.map((rate: any) => ({
        id: rate.id,
        category_id: rate.category_id,
        category_name: rate.category_name,
        rate: rate.rate,
      }));
    } catch (error) {
      console.error('Error bulk updating user category rates:', error);
      throw error;
    }
  },

  /**
   * Установить ставку для конкретной категории
   */
  setUserCategoryRate: async (userId: number, categoryId: number, rate: number): Promise<UserCategoryRate> => {
    try {
      const response = await axiosInstance.put<any>(`/api/users/${userId}/category-rates/${categoryId}`, { rate });
      return {
        id: response.data.id,
        category_id: response.data.category_id,
        category_name: response.data.category_name,
        rate: response.data.rate,
      };
    } catch (error) {
      console.error('Error setting user category rate:', error);
      throw error;
    }
  },

  /**
   * Удалить ставку для категории
   */
  deleteUserCategoryRate: async (userId: number, categoryId: number): Promise<void> => {
    try {
      await axiosInstance.delete(`/api/users/${userId}/category-rates/${categoryId}`);
    } catch (error) {
      console.error('Error deleting user category rate:', error);
      throw error;
    }
  },

  /**
   * Получить Map ставок пользователя для быстрого доступа
   */
  getUserCategoryRatesMap: async (userId: number): Promise<Map<number, number>> => {
    const rates = await userCategoryRateService.getUserCategoryRates(userId);
    const ratesMap = new Map<number, number>();
    rates.forEach(rate => {
      ratesMap.set(rate.category_id, rate.rate);
    });
    return ratesMap;
  },
};