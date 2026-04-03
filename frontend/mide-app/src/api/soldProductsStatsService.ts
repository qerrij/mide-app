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

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

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
  async getOverview(params: {
    period: string;
    custom_start?: string;
    custom_end?: string;
    city_id?: number;  // ДОБАВИТЬ
  }): Promise<SoldProductsOverviewResponse> {
    const cacheKey = `overview:${JSON.stringify(params)}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const response = await api.get('api/sold-products-stats/overview', { params });
    setCached(cacheKey, response.data);
    return response.data;
  },

  async getTrend(params: {
    period: string;
    custom_start?: string;
    custom_end?: string;
    city_id?: number;  // ДОБАВИТЬ
  }): Promise<SoldProductsTrendResponse> {
    const cacheKey = `trend:${JSON.stringify(params)}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const response = await api.get('api/sold-products-stats/trend', { params });
    setCached(cacheKey, response.data);
    return response.data;
  },

  async getTopProducts(params: {
    period: string;
    custom_start?: string;
    custom_end?: string;
    city_id?: number;  // ДОБАВИТЬ
    limit?: number;
  }): Promise<TopSoldProductsResponse> {
    const cacheKey = `top-products:${JSON.stringify(params)}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const response = await api.get('api/sold-products-stats/products/top', { params });
    setCached(cacheKey, response.data);
    return response.data;
  },

  async getCategoriesStats(params: {
    period: string;
    custom_start?: string;
    custom_end?: string;
    city_id?: number;  // ДОБАВИТЬ
  }): Promise<CategoriesSoldProductsResponse> {
    const cacheKey = `categories:${JSON.stringify(params)}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const response = await api.get('api/sold-products-stats/categories', { params });
    setCached(cacheKey, response.data);
    return response.data;
  },

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

  async getCities(): Promise<{ cities: { id: number; name: string }[] }> {
    const cacheKey = 'cities-list';
    const cached = getCached(cacheKey);
    if (cached) return cached;
    
    const response = await api.get('api/sold-products-stats/cities');
    setCached(cacheKey, response.data);
    return response.data;
  },

  async getSellers(params: {
    period: string;
    custom_start?: string;
    custom_end?: string;
    city_id?: number;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    const cacheKey = `sellers:${JSON.stringify(params)}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;
    
    const response = await api.get('api/sold-products-stats/sellers', { params });
    setCached(cacheKey, response.data);
    return response.data;
  },

  async getMyStats(params: {
    period: string;
    custom_start?: string;
    custom_end?: string;
  }): Promise<any> {
    const cacheKey = `my-stats:${JSON.stringify(params)}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;
    
    const response = await api.get('api/sold-products-stats/my-stats', { params });
    setCached(cacheKey, response.data);
    return response.data;
  },

  clearCache() {
    clearCache();
  }
};