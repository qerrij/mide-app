import axiosInstance from './axios';
import { Product, ProductCategory, InventoryItem, InventoryResponse } from '../types';

export interface CreateProductData {
  name: string;
  sku: string;
  categoryId: number;
  price: number;
  description?: string;
  city?: string;
  defaultRate?: number;
}

// Функция для трансформации snake_case в camelCase для товара
const transformProductFromApi = (product: any): Product => {
  return {
    id: product.id,
    name: product.name,
    categoryId: product.category_id,
    categoryName: product.category_name || product.category?.name,
    price: product.price,
    sku: product.sku,
    description: product.description,
    city: product.city, // Добавляем city
    defaultRate: product.default_rate, // Добавляем defaultRate
    createdAt: product.created_at ? new Date(product.created_at) : undefined,
    updatedAt: product.updated_at ? new Date(product.updated_at) : undefined,
  };
};

// Функция для трансформации snake_case в camelCase для категории
const transformCategoryFromApi = (category: any): ProductCategory => {
  return {
    id: category.id,
    name: category.name,
    description: category.description,
    isActive: category.is_active,
    createdAt: category.created_at ? new Date(category.created_at) : undefined,
    updatedAt: category.updated_at ? new Date(category.updated_at) : undefined,
  };
};

// Функция для трансформации snake_case в camelCase для инвентаря
const transformInventoryItemFromApi = (item: any): InventoryItem => {
  return {
    id: item.id,
    userId: item.user_id,
    productId: item.product_id,
    quantity: item.quantity,
    reservedQuantity: item.reserved_quantity,
    availableQuantity: item.available_quantity,
    productName: item.product_name,
    productSku: item.product_sku,
    productPrice: item.product_price,
    userName: item.user_name,
    userCity: item.user_city,
    createdAt: item.created_at ? new Date(item.created_at) : undefined,
    updatedAt: item.updated_at ? new Date(item.updated_at) : undefined,
  };
};

// Функция для трансформации в snake_case для отправки на сервер
const transformToSnakeCase = (obj: any): any => {
  const snakeCaseObj: any = {};
  
  Object.keys(obj).forEach(key => {
    // Преобразуем camelCase в snake_case
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    
    // Рекурсивно обрабатываем вложенные объекты
    if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key]) && !(obj[key] instanceof Date)) {
      snakeCaseObj[snakeKey] = transformToSnakeCase(obj[key]);
    } else {
      snakeCaseObj[snakeKey] = obj[key];
    }
  });
  
  return snakeCaseObj;
};

export const productService = {
  // Получить все товары
  getAllProducts: async (categoryId?: number, city?: string): Promise<Product[]> => {
    const params: any = {};
    if (categoryId) params.category_id = categoryId;
    if (city) params.city = city;
    const response = await axiosInstance.get<any[]>('/api/products', { params });
    return response.data.map(transformProductFromApi);
  },

  // Получить товар по ID
  getProductById: async (id: number): Promise<Product> => {
    const response = await axiosInstance.get<any>(`/api/products/${id}`);
    return transformProductFromApi(response.data);
  },

  // Создать товар
  createProduct: async (product: CreateProductData): Promise<Product> => {
    const snakeCaseData = transformToSnakeCase(product);
    const response = await axiosInstance.post<any>('/api/products', snakeCaseData);
    return transformProductFromApi(response.data);
  },

  // Обновить товар
  updateProduct: async (id: number, product: Partial<Product>): Promise<Product> => {
    // Убираем поля, которые не должны обновляться
    const { id: _, categoryName, createdAt, updatedAt, ...updateData } = product;
    const snakeCaseData = transformToSnakeCase(updateData);
    
    const response = await axiosInstance.put<any>(`/api/products/${id}`, snakeCaseData);
    return transformProductFromApi(response.data);
  },

  // Удалить товар
  deleteProduct: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/api/products/${id}`);
  },

  // Получить все категории
  getAllCategories: async (): Promise<ProductCategory[]> => {
    const response = await axiosInstance.get<any[]>('/api/categories');
    return response.data.map(transformCategoryFromApi);
  },

  // Создать категорию
  createCategory: async (category: {
    name: string;
    description?: string;
    isActive?: boolean;
  }): Promise<ProductCategory> => {
    const snakeCaseData = transformToSnakeCase({
      ...category,
      isActive: category.isActive ?? true,
    });
    
    const response = await axiosInstance.post<any>('/api/categories', snakeCaseData);
    return transformCategoryFromApi(response.data);
  },

  // Обновить категорию
  updateCategory: async (id: number, category: Partial<ProductCategory>): Promise<ProductCategory> => {
    // Убираем поля, которые не должны обновляться
    const { id: _, createdAt, updatedAt, ...updateData } = category;
    const snakeCaseData = transformToSnakeCase(updateData);
    
    const response = await axiosInstance.put<any>(`/api/categories/${id}`, snakeCaseData);
    return transformCategoryFromApi(response.data);
  },

  // Удалить категорию
  deleteCategory: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/api/categories/${id}`);
  },

  // Получить общий инвентарь (для OWNER)
  getCompanyInventory: async (params?: {
    page?: number;
    limit?: number;
    user_id?: number;
    category_id?: number;
    product_id?: number;
    city?: string;
  }): Promise<{
    quantity: number;
    total_value: number;
    items: InventoryItem[];
    total_count: number;
    has_more: boolean;
    page: number;
    limit: number;
  }> => {
    const response = await axiosInstance.get<any>('/api/inventory/company-total', { 
      params: {
        page: params?.page ?? 0,
        limit: params?.limit ?? 100,
        user_id: params?.user_id,
        category_id: params?.category_id,
        product_id: params?.product_id,
        city: params?.city,
      }
    });
    
    return {
      quantity: response.data.quantity || 0,
      total_value: response.data.total_value || 0,
      items: (response.data.items || []).map(transformInventoryItemFromApi),
      total_count: response.data.total_count || 0,
      has_more: response.data.has_more ?? false,
      page: response.data.page ?? 0,
      limit: response.data.limit ?? 100,
    };
  },

  getMyInventory: async (): Promise<InventoryResponse> => {
    const response = await axiosInstance.get<any>('/api/inventory/my');
    
    return {
        quantity: response.data.quantity || 0,
        items: (response.data.items || []).map(transformInventoryItemFromApi)
    };
  },

  // Пополнить инвентарь
  replenishInventory: async (data: {
    productId: number;
    quantity: number;
    isNewProduct?: boolean;
    newProductData?: {
      name: string;
      sku: string;
      categoryId: number;
      price: number;
      description?: string;
      city?: string;
      defaultRate?: number;
    };
  }): Promise<any> => {
    const snakeCaseData = transformToSnakeCase(data);
    const response = await axiosInstance.post('/api/inventory/replenish', snakeCaseData);
    return response.data;
  },
};