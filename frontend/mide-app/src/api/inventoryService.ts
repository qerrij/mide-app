import axiosInstance from './axios';
import { InventoryItem, InventoryResponse, ProductReservationsResponse } from '../types';

// Функция для трансформации snake_case в camelCase
const transformInventoryItemFromApi = (item: any): InventoryItem => {
  return {
    id: item.id,
    userId: item.user_id,
    productId: item.product_id,
    quantity: item.quantity,
    reservedQuantity: item.reserved_quantity || 0,
    productName: item.product?.name || item.product_name,
    productSku: item.product?.sku || item.product_sku,
    productPrice: item.product?.price || item.product_price,
    userName: item.user?.full_name || item.user_name,
    createdAt: item.created_at ? new Date(item.created_at) : undefined,
    updatedAt: item.updated_at ? new Date(item.updated_at) : undefined,
  };
};

// Основные методы сервиса
const inventoryServiceMethods = {
  // Получить свой инвентарь
  getMyInventory: async (): Promise<InventoryResponse> => {
    try {
      const response = await axiosInstance.get<any>('/api/inventory/my');
      return {
        quantity: response.data.quantity || 0,
        items: (response.data.items || []).map(transformInventoryItemFromApi)
      };
    } catch (error) {
      console.error('Error fetching my inventory:', error);
      throw error;
    }
  },

  getProductReservations: async (userId: number, productId: number): Promise<ProductReservationsResponse[]> => {
    try {
      const response = await axiosInstance.get<any[]>(`/api/inventory/reservations/${userId}/${productId}`);
      
      return response.data.map(item => ({
        id: item.id,
        userId: item.user_id,
        productId: item.product_id,
        productName: item.product_name,
        productSku: item.product_sku,
        quantity: item.quantity,
        reservationType: item.reservation_type,
        reservationTypeDisplay: item.reservation_type_display,
        reservationId: item.reservation_id,
        entityInfo: item.entity_info,
        entityDetails: item.entity_details ? {
          id: item.entity_details.id,
          title: item.entity_details.title,
          createdAt: item.entity_details.created_at, // Оставляем как есть, имя поля совпадает с интерфейсом
          status: item.entity_details.status,
        } : undefined,
        createdAt: item.created_at, // Оставляем строкой, не преобразуем в Date
        status: item.status,
      }));
    } catch (error) {
      console.error('Error fetching product reservations:', error);
      throw error;
    }
  },

  // Получить инвентарь пользователя (для руководителей)
  getUserInventory: async (userId: number): Promise<InventoryResponse> => {
    try {
      const response = await axiosInstance.get<any>(`/api/inventory/user/${userId}`);
      return {
        quantity: response.data.quantity || 0,
        items: (response.data.items || []).map(transformInventoryItemFromApi)
      };
    } catch (error) {
      console.error('Error fetching user inventory:', error);
      throw error;
    }
  },

  // Получить инвентарь нескольких пользователей
  getUsersInventory: async (userIds: number[]): Promise<Record<number, InventoryResponse>> => {
    try {
      const promises = userIds.map(userId => 
        inventoryServiceMethods.getUserInventory(userId).catch((error: Error) => {
          console.error(`Error fetching inventory for user ${userId}:`, error);
          return { quantity: 0, items: [] };
        })
      );
      
      const results = await Promise.all(promises);
      const inventoryMap: Record<number, InventoryResponse> = {};
      
      userIds.forEach((userId, index) => {
        inventoryMap[userId] = results[index];
      });
      
      return inventoryMap;
    } catch (error) {
      console.error('Error fetching users inventory:', error);
      throw error;
    }
  },

  // Расчет расхождений для ревизии
  calculateDiscrepancies: async (
    revisionId: number,
    revisionItems: Array<{
      productId: number;
      quantity: number;
      productName?: string;
      productSku?: string;
      categoryName?: string;
    }>,
    targetUserIds: number[]
  ): Promise<any[]> => {
    try {
      if (targetUserIds.length === 0) {
        throw new Error('Не указаны пользователи для проверки');
      }
      
      // Получаем инвентарь всех пользователей
      const inventoryMap = await inventoryServiceMethods.getUsersInventory(targetUserIds);
      
      // Расчет расхождений для каждого товара
      const discrepancies = revisionItems.map(item => {
        const productDiscrepancies: any[] = [];
        
        targetUserIds.forEach(userId => {
          const userInventory = inventoryMap[userId];
          const inventoryItem = userInventory.items.find((i: InventoryItem) => i.productId === item.productId);
          const actualQuantity = inventoryItem ? inventoryItem.quantity : 0;
          const discrepancy = actualQuantity - item.quantity;
          
          if (discrepancy !== 0) {
            productDiscrepancies.push({
              userId,
              userName: inventoryItem?.userName || `Пользователь ${userId}`,
              expected: item.quantity,
              actual: actualQuantity,
              discrepancy,
              isPositive: discrepancy > 0,
            });
          }
        });
        
        const totalDiscrepancy = productDiscrepancies.reduce((sum: number, d: any) => sum + d.discrepancy, 0);
        const totalPositive = productDiscrepancies.reduce((sum: number, d: any) => sum + (d.discrepancy > 0 ? d.discrepancy : 0), 0);
        const totalNegative = productDiscrepancies.reduce((sum: number, d: any) => sum + (d.discrepancy < 0 ? Math.abs(d.discrepancy) : 0), 0);
        
        return {
          productId: item.productId,
          productName: item.productName || `Товар ${item.productId}`,
          productSku: item.productSku || `SKU${item.productId}`,
          categoryName: item.categoryName || 'Категория',
          discrepancies: productDiscrepancies,
          totalDiscrepancy,
          totalPositive,
          totalNegative,
          usersWithDiscrepancies: productDiscrepancies.map(d => d.userId),
          hasDiscrepancies: productDiscrepancies.length > 0,
        };
      });
      
      return discrepancies.filter(d => d.hasDiscrepancies);
      
    } catch (error) {
      console.error('Error calculating discrepancies:', error);
      throw error;
    }
  },
  editInventory: async (data: { user_id: number; product_id: number; quantity: number }) => {
    try {
      const response = await axiosInstance.put('/api/inventory/edit', data);
      return response.data;
    } catch (error) {
      console.error('Error editing inventory:', error);
      throw error;
    }
  },
};

export const inventoryService = inventoryServiceMethods;