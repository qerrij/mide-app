// services/CachedServices.ts
import { userService } from '../api/userService';
import { productService } from '../api/productService';
import { groupService } from '../api/groupService';
import { clusterService } from '../api/clusterService';

class CachedServices {
  private userNamesCache = new Map<number, string>();
  private usersNamesCache = new Map<string, Record<number, string>>();
  private productsCache: any[] | null = null;
  private categoriesCache: any[] | null = null;
  private groupsCache = new Map<number, any>();
  private clustersCache = new Map<number, any>();

  // ================ ПОЛЬЗОВАТЕЛИ ================
  async getUserName(userId: number): Promise<string> {
    if (this.userNamesCache.has(userId)) {
      return this.userNamesCache.get(userId)!;
    }
    
    try {
      const name = await userService.getUserName(userId);
      this.userNamesCache.set(userId, name);
      return name;
    } catch (error) {
      console.error('Error getting user name:', error);
      return `Пользователь ${userId}`;
    }
  }

  async getUsersNames(userIds: number[]): Promise<Record<number, string>> {
    const cacheKey = userIds.sort().join(',');
    
    if (this.usersNamesCache.has(cacheKey)) {
      return this.usersNamesCache.get(cacheKey)!;
    }
    
    try {
      const names = await userService.getUsersNames(userIds);
      this.usersNamesCache.set(cacheKey, names);
      
      // Также кэшируем индивидуальные имена
      Object.entries(names).forEach(([id, name]) => {
        this.userNamesCache.set(Number(id), name as string);
      });
      
      return names;
    } catch (error) {
      console.error('Error getting users names:', error);
      return userIds.reduce((acc, id) => ({
        ...acc,
        [id]: `Пользователь ${id}`
      }), {});
    }
  }

  // ================ ТОВАРЫ И КАТЕГОРИИ ================
  async getAllProducts(): Promise<any[]> {
    if (this.productsCache) {
      return this.productsCache;
    }
    
    try {
      const products = await productService.getAllProducts();
      this.productsCache = products;
      return products;
    } catch (error) {
      console.error('Error getting products:', error);
      return [];
    }
  }

  async getAllCategories(): Promise<any[]> {
    if (this.categoriesCache) {
      return this.categoriesCache;
    }
    
    try {
      const categories = await productService.getAllCategories();
      this.categoriesCache = categories;
      return categories;
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  }

  // ================ ГРУППЫ И КУСТЫ ================
  async getGroupById(groupId: number): Promise<any> {
    if (this.groupsCache.has(groupId)) {
      return this.groupsCache.get(groupId)!;
    }
    
    try {
      const group = await groupService.getGroupById(groupId);
      this.groupsCache.set(groupId, group);
      return group;
    } catch (error) {
      console.error('Error getting group:', error);
      return { id: groupId, name: `Группа ${groupId}` };
    }
  }

  async getClusterById(clusterId: number): Promise<any> {
    if (this.clustersCache.has(clusterId)) {
      return this.clustersCache.get(clusterId)!;
    }
    
    try {
      const cluster = await clusterService.getClusterById(clusterId);
      this.clustersCache.set(clusterId, cluster);
      return cluster;
    } catch (error) {
      console.error('Error getting cluster:', error);
      return { id: clusterId, name: `Куст ${clusterId}` };
    }
  }

  // ================ ОЧИСТКА КЭША ================
  clearCache(): void {
    this.userNamesCache.clear();
    this.usersNamesCache.clear();
    this.productsCache = null;
    this.categoriesCache = null;
    this.groupsCache.clear();
    this.clustersCache.clear();
  }

  clearUserCache(): void {
    this.userNamesCache.clear();
    this.usersNamesCache.clear();
  }

  clearProductsCache(): void {
    this.productsCache = null;
    this.categoriesCache = null;
  }
}

export const cachedServices = new CachedServices();