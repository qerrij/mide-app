import api from './axios';
import {
  SoldProductsOverviewResponse,
  TopSellersSoldProductsResponse,
  TopSoldProductsResponse,
  CategoriesSoldProductsResponse,
  CitiesSoldProductsResponse,
  SoldProductsTrendResponse,
  SoldProductsComparisonResponse,
  SellerSoldProductDetailStats,
  SoldProductsDashboardResponse,
} from '../types';

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

export const soldProductsStatsService = {
  // Получить общую статистику
  async getOverview(params: {
    period: string;
    custom_start?: string;
    custom_end?: string;
  }): Promise<SoldProductsOverviewResponse> {
    const cacheKey = `overview:${JSON.stringify(params)}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const response = await api.get('api/sold-products-stats/overview', { params });
    setCached(cacheKey, response.data);
    return response.data;
  },

  // Получить топ продавцов
  async getTopSellers(params: {
    period: string;
    limit?: number;
    custom_start?: string;
    custom_end?: string;
  }): Promise<TopSellersSoldProductsResponse> {
    const cacheKey = `top-sellers:${JSON.stringify(params)}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const response = await api.get('api/sold-products-stats/sellers/top', { params });
    setCached(cacheKey, response.data);
    return response.data;
  },

  // Получить детальную статистику продавца
  async getSellerDetail(
    sellerId: number,
    params: {
      period: string;
      custom_start?: string;
      custom_end?: string;
    }
  ): Promise<SellerSoldProductDetailStats> {
    const cacheKey = `seller-detail:${sellerId}:${JSON.stringify(params)}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const response = await api.get(`api/sold-products-stats/sellers/${sellerId}`, { params });
    setCached(cacheKey, response.data);
    return response.data;
  },

  // Получить топ товаров
  async getTopProducts(params: {
    period: string;
    limit?: number;
    custom_start?: string;
    custom_end?: string;
  }): Promise<TopSoldProductsResponse> {
    const cacheKey = `top-products:${JSON.stringify(params)}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const response = await api.get('api/sold-products-stats/products/top', { params });
    setCached(cacheKey, response.data);
    return response.data;
  },

  // Получить статистику по категориям
  async getCategoriesStats(params: {
    period: string;
    custom_start?: string;
    custom_end?: string;
  }): Promise<CategoriesSoldProductsResponse> {
    const cacheKey = `categories:${JSON.stringify(params)}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const response = await api.get('api/sold-products-stats/categories', { params });
    setCached(cacheKey, response.data);
    return response.data;
  },

  // Получить статистику по городам
  async getCitiesStats(params: {
    period: string;
    custom_start?: string;
    custom_end?: string;
  }): Promise<CitiesSoldProductsResponse> {
    const cacheKey = `cities:${JSON.stringify(params)}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const response = await api.get('api/sold-products-stats/cities', { params });
    setCached(cacheKey, response.data);
    return response.data;
  },

  // Получить ежедневную динамику
  async getTrend(params: {
    period: string;
    custom_start?: string;
    custom_end?: string;
  }): Promise<SoldProductsTrendResponse> {
    const cacheKey = `trend:${JSON.stringify(params)}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const response = await api.get('api/sold-products-stats/trend', { params });
    setCached(cacheKey, response.data);
    return response.data;
  },

  // Получить сравнение периодов
  async getComparison(params: {
    current_period: string;
    previous_period: string;
  }): Promise<SoldProductsComparisonResponse> {
    const cacheKey = `comparison:${JSON.stringify(params)}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const response = await api.get('api/sold-products-stats/comparison', { params });
    setCached(cacheKey, response.data);
    return response.data;
  },

  // Получить полный дашборд
  async getDashboard(params: {
    period: string;
    custom_start?: string;
    custom_end?: string;
  }): Promise<SoldProductsDashboardResponse> {
    const cacheKey = `dashboard:${JSON.stringify(params)}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const response = await api.get('api/sold-products-stats/dashboard', { params });
    setCached(cacheKey, response.data);
    return response.data;
  },

  // Получить все данные для админа (только OWNER)
  async getAllStatsAdmin(params: {
    period: string;
  }): Promise<SoldProductsDashboardResponse> {
    const cacheKey = `admin-all:${JSON.stringify(params)}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const response = await api.get('api/sold-products-stats/admin/all', { params });
    setCached(cacheKey, response.data);
    return response.data;
  },

  // Очистить кэш
  clearCache() {
    clearCache();
  }
};