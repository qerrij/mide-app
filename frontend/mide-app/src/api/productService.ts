import axiosInstance from './axios';
import { Product, ProductCategory } from '../types';

export const productService = {
  // Получить все товары
  getAllProducts: async (): Promise<Product[]> => {
    const response = await axiosInstance.get<Product[]>('/api/products');
    return response.data;
  },

  // Получить товар по ID
  getProductById: async (id: number): Promise<Product> => {
    const response = await axiosInstance.get<Product>(`/api/products/${id}`);
    return response.data;
  },
};