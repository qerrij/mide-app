import axiosInstance from './axios';
import { axiosMultipartInstance } from './axios';
import {
  Revision,
  RevisionRequestDto,
  RevisionFilling,
  RevisionFillingCreateDto,
  RevisionVerifyDto,
  RevisionStatus,
  RevisionType,
  RevisionSummaryResponse,
  ProductSummary,
  UserDiscrepancySummary,
  ProductDiscrepancySummary
} from '../types';

// Функция для трансформации snake_case в camelCase
const transformRevisionFromApi = (revision: any): Revision => {
  // Базовые поля ревизии
  const baseRevision = {
    id: revision.id,
    requestedById: revision.requested_by_id,
    requestedByName: revision.requested_by_name || revision.requested_by?.full_name,
    type: revision.type,
    status: revision.status,
    targetUserId: revision.target_user_id,
    targetGroupId: revision.target_group_id,
    targetClusterId: revision.target_cluster_id,
    targetCity: revision.target_city,
    targetUserName: revision.target_user_name || revision.target_user?.full_name,
    targetGroupName: revision.target_group_name || revision.target_group?.name,
    targetClusterName: revision.target_cluster_name || revision.target_cluster?.name,
    comment: revision.comment,
    verificationComment: revision.verification_comment,
    verifiedById: revision.verified_by_id,
    verifiedByName: revision.verified_by_name || revision.verified_by?.full_name,
    requestedAt: new Date(revision.requested_at),
    completedAt: revision.completed_at ? new Date(revision.completed_at) : undefined,
    verifiedAt: revision.verified_at ? new Date(revision.verified_at) : undefined,
    
    // Для обратной совместимости
    photos: revision.photos || [],
    items: (revision.items || []).map((item: any) => ({
      id: item.id,
      productId: item.product_id,
      categoryId: item.category_id,
      quantity: item.quantity,
      actualQuantity: item.actual_quantity,
      productName: item.product_name || item.product?.name,
      productSku: item.product_sku || item.product?.sku,
      categoryName: item.category_name || item.product?.category?.name,
    })),
    discrepancies: (revision.discrepancies || []).map((disc: any) => ({
      id: disc.id,
      productId: disc.product_id,
      userId: disc.user_id,
      expectedQuantity: disc.expected_quantity,
      actualQuantity: disc.actual_quantity,
      discrepancy: disc.discrepancy,
      isPositive: disc.is_positive,
      productName: disc.product_name || disc.product?.name,
      productSku: disc.product_sku || disc.product?.sku,
      userName: disc.user_name || disc.user?.full_name,
      categoryName: disc.category_name || disc.product?.category?.name,
    })),
  };
  
  // Добавляем новые поля для групповых ревизий
  const enhancedRevision: Revision = {
    ...baseRevision,
    fillings: (revision.fillings || []).map((filling: any) => transformFillingFromApi(filling)),
    totalFilled: revision.total_filled,
    totalUsers: revision.total_users,
    isGroupRevision: revision.is_group_revision || 
                     (revision.type && revision.type !== RevisionType.USER)
  };
  
  return enhancedRevision;
};

const transformFillingFromApi = (filling: any): RevisionFilling => {
  return {
    id: filling.id,
    revisionId: filling.revision_id,
    userId: filling.user_id,
    userName: filling.user_name || filling.user?.full_name,
    status: filling.status,
    photos: filling.photos || [],
    filledAt: filling.filled_at ? new Date(filling.filled_at) : undefined,
    isCompleted: filling.is_completed || false,
    items: (filling.items || []).map((item: any) => ({
      id: item.id,
      productId: item.product_id,
      categoryId: item.category_id,
      quantity: item.quantity,
      productName: item.product_name || item.product?.name,
      productSku: item.product_sku || item.product?.sku,
      categoryName: item.category_name || item.product?.category?.name,
    }))
  };
};

const transformFillingToApi = (filling: RevisionFillingCreateDto): any => {
  return {
    user_id: filling.userId,
    photos: filling.photos,
    items: filling.items.map(item => ({
      product_id: item.productId,
      category_id: item.categoryId,
      quantity: item.quantity
    }))
  };
};

// Функция для обогащения данных товаров
const enrichProductsData = async (revision: any): Promise<any> => {
  try {
    const { productService } = await import('./productService');
    
    const enriched = { ...revision };

    // Обогащаем данные о товарах в заполнениях
    if (revision.fillings && revision.fillings.length > 0) {
      try {
        const allProducts = await productService.getAllProducts();
        const allCategories = await productService.getAllCategories();
        
        enriched.fillings = revision.fillings.map((filling: any) => ({
          ...filling,
          items: filling.items.map((item: any) => {
            const product = allProducts.find(p => p.id === item.product_id);
            const category = allCategories.find(c => c.id === item.category_id);
            
            return {
              ...item,
              product_name: product?.name || item.product_name,
              product_sku: product?.sku || item.product_sku,
              category_name: category?.name || item.category_name,
            };
          })
        }));
      } catch (error) {
        console.error('Error enriching filling products:', error);
      }
    }

    return enriched;
  } catch (error) {
    console.error('Error in enrichProductsData:', error);
    return revision;
  }
};

export const revisionService = {
  // Получить все ревизии
  getRevisions: async (
    skip: number = 0,
    limit: number = 100,
    filters?: {
      status?: RevisionStatus;
      type?: RevisionType;
      targetUserId?: number;
      targetGroupId?: number;
      targetClusterId?: number;
      requestedById?: number;
      dateFrom?: string;
      dateTo?: string;
    }
  ): Promise<Revision[]> => {
    const params: any = { skip, limit, ...filters };
    
    Object.keys(params).forEach(key => {
      if (params[key] === undefined || params[key] === null) {
        delete params[key];
      }
    });
    
    try {
      const response = await axiosInstance.get<any[]>('/api/revisions', { params });
      
      // Обогащаем данные
      const enrichedRevisions = await Promise.all(
        response.data.map(async (revision) => {
          try {
            return await enrichProductsData(revision);
          } catch (error) {
            console.error('Error enriching revision:', error);
            return revision;
          }
        })
      );
      
      return enrichedRevisions.map(transformRevisionFromApi);
    } catch (error) {
      console.error('Error fetching revisions:', error);
      throw error;
    }
  },

  // Получить мои ревизии
  getMyRevisions: async (skip: number = 0, limit: number = 100): Promise<Revision[]> => {
    try {
      const response = await axiosInstance.get<any[]>('/api/revisions/my', {
        params: { skip, limit }
      });
      
      const enrichedRevisions = await Promise.all(
        response.data.map(async (revision) => {
          try {
            return await enrichProductsData(revision);
          } catch (error) {
            console.error('Error enriching revision:', error);
            return revision;
          }
        })
      );
      
      return enrichedRevisions.map(transformRevisionFromApi);
    } catch (error) {
      console.error('Error fetching my revisions:', error);
      throw error;
    }
  },

  // Получить ревизию по ID
  getRevisionById: async (id: number): Promise<Revision> => {
    try {
      const response = await axiosInstance.get<any>(`/api/revisions/${id}`);
      const enrichedRevision = await enrichProductsData(response.data);
      return transformRevisionFromApi(enrichedRevision);
    } catch (error) {
      console.error('Error fetching revision by ID:', error);
      throw error;
    }
  },

  // Запросить ревизию
  requestRevision: async (revisionData: RevisionRequestDto): Promise<Revision> => {
    try {
      const response = await axiosInstance.post<any>('/api/revisions/request', {
        type: revisionData.type,
        target_user_id: revisionData.targetUserId,
        target_group_id: revisionData.targetGroupId,
        target_cluster_id: revisionData.targetClusterId,
        target_city: revisionData.targetCity,
        comment: revisionData.comment,
      });
      
      const enrichedRevision = await enrichProductsData(response.data);
      return transformRevisionFromApi(enrichedRevision);
    } catch (error) {
      console.error('Error requesting revision:', error);
      throw error;
    }
  },

  // Заполнить ревизию (НОВАЯ версия)
  fillRevision: async (
    revisionId: number,
    items: Array<{ productId: number; categoryId: number; quantity: number }>,
    photos: File[],
    userId: number
  ): Promise<RevisionFilling> => {
    try {
      const formData = new FormData();
      
      // Преобразуем items
      const itemsForApi = items.map(item => ({
        product_id: item.productId,
        category_id: item.categoryId,
        quantity: item.quantity,
      }));
      
      formData.append('items_data', JSON.stringify(itemsForApi));
      
      // Добавляем фото
      photos.forEach((photo) => {
        formData.append('photos', photo);
      });
      
      const response = await axiosMultipartInstance.post<any>(
        `/api/revisions/${revisionId}/fill`,
        formData
      );
      
      // Обогащаем данные о товарах
      const enrichedFilling = await (async () => {
        try {
          const { productService } = await import('./productService');
          const allProducts = await productService.getAllProducts();
          const allCategories = await productService.getAllCategories();
          
          return {
            ...response.data,
            items: response.data.items.map((item: any) => {
              const product = allProducts.find(p => p.id === item.product_id);
              const category = allCategories.find(c => c.id === item.category_id);
              
              return {
                ...item,
                product_name: product?.name || item.product_name,
                product_sku: product?.sku || item.product_sku,
                category_name: category?.name || item.category_name,
              };
            })
          };
        } catch (error) {
          console.error('Error enriching filling:', error);
          return response.data;
        }
      })();
      
      return transformFillingFromApi(enrichedFilling);
    } catch (error) {
      console.error('Error filling revision:', error);
      throw error;
    }
  },

  // Получить мое заполнение ревизии
  getMyFilling: async (revisionId: number): Promise<RevisionFilling | null> => {
    try {
      const response = await axiosInstance.get<any>(`/api/revisions/${revisionId}/my-filling`);
      
      // Обогащаем данные о товарах
      const enrichedFilling = await (async () => {
        try {
          const { productService } = await import('./productService');
          const allProducts = await productService.getAllProducts();
          const allCategories = await productService.getAllCategories();
          
          return {
            ...response.data,
            items: response.data.items.map((item: any) => {
              const product = allProducts.find(p => p.id === item.product_id);
              const category = allCategories.find(c => c.id === item.category_id);
              
              return {
                ...item,
                product_name: product?.name || item.product_name,
                product_sku: product?.sku || item.product_sku,
                category_name: category?.name || item.category_name,
              };
            })
          };
        } catch (error) {
          console.error('Error enriching filling:', error);
          return response.data;
        }
      })();
      
      return transformFillingFromApi(enrichedFilling);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // Заполнение не найдено
      }
      console.error('Error fetching my filling:', error);
      throw error;
    }
  },

  // Проверить ревизию (только владелец)
  verifyRevision: async (
    revisionId: number,
    verificationComment?: string
  ): Promise<Revision> => {
    try {
      const verifyData = verificationComment ? { verification_comment: verificationComment } : {};
      
      const response = await axiosInstance.post<any>(
        `/api/revisions/${revisionId}/verify`,
        verifyData
      );
      
      const enrichedRevision = await enrichProductsData(response.data);
      return transformRevisionFromApi(enrichedRevision);
    } catch (error) {
      console.error('Error verifying revision:', error);
      throw error;
    }
  },

  // Получить сводку по ревизии (только для владельца)
  getRevisionSummary: async (revisionId: number): Promise<RevisionSummaryResponse> => {
    try {
      const response = await axiosInstance.get<any>(`/api/revisions/${revisionId}/summary`);
      
      // Обогащаем данные о товарах
      const enrichedData = await (async () => {
        try {
          const { productService } = await import('./productService');
          const allProducts = await productService.getAllProducts();
          const allCategories = await productService.getAllCategories();
          
          const enrichedRevision = transformRevisionFromApi(response.data.revision);
          
          const enrichedProductSummary = response.data.product_summary.map((summary: any) => {
            const product = allProducts.find(p => p.id === summary.product_id);
            const category = allCategories.find(c => c.id === product?.categoryId);
            
            return {
              productId: summary.product_id,
              productName: product?.name || summary.product_name,
              productSku: product?.sku || summary.product_sku,
              categoryName: category?.name || summary.category_name,
              totalQuantity: summary.total_quantity,
              userQuantities: summary.user_quantities.map((uq: any) => ({
                userId: uq.user_id,
                userName: uq.user_name,
                quantity: uq.quantity
              }))
            };
          });
          
          const enrichedUserDiscrepancies = response.data.user_discrepancies.map((ud: any) => {
            return {
              userId: ud.user_id,
              userName: ud.user_name,
              totalDiscrepancy: ud.total_discrepancy,
              positiveTotal: ud.positive_total,
              negativeTotal: ud.negative_total,
              discrepancies: ud.discrepancies.map((d: any) => {
                const product = allProducts.find(p => p.id === d.product_id);
                
                return {
                  productId: d.product_id,
                  productName: product?.name || d.product_name,
                  expected: d.expected,
                  actual: d.actual,
                  discrepancy: d.discrepancy,
                  isPositive: d.is_positive
                };
              })
            };
          });
          
          const enrichedProductDiscrepancies = response.data.product_discrepancies.map((pd: any) => {
            const product = allProducts.find(p => p.id === pd.product_id);
            const category = allCategories.find(c => c.id === product?.categoryId);
            
            return {
              productId: pd.product_id,
              productName: product?.name || pd.product_name,
              totalDiscrepancy: pd.total_discrepancy,
              positiveTotal: pd.positive_total,
              negativeTotal: pd.negative_total,
              userDiscrepancies: pd.user_discrepancies.map((ud: any) => ({
                userId: ud.user_id,
                userName: ud.user_name,
                expected: ud.expected,
                actual: ud.actual,
                discrepancy: ud.discrepancy,
                isPositive: ud.is_positive
              }))
            };
          });
          
          return {
            revision: enrichedRevision,
            productSummary: enrichedProductSummary,
            userDiscrepancies: enrichedUserDiscrepancies,
            productDiscrepancies: enrichedProductDiscrepancies,
            totalFilled: response.data.total_filled,
            totalUsers: response.data.total_users
          };
          
        } catch (error) {
          console.error('Error enriching summary:', error);
          return response.data;
        }
      })();
      
      return enrichedData;
    } catch (error) {
      console.error('Error fetching revision summary:', error);
      throw error;
    }
  },

  // Получить расхождения по ревизии
  getDiscrepancies: async (
    revisionId: number,
    byUser: boolean = false
  ): Promise<UserDiscrepancySummary[] | ProductDiscrepancySummary[]> => {
    try {
        const response = await axiosInstance.get<any>(
          `/api/revisions/${revisionId}/discrepancies?by_user=${byUser}`
        );
      
      // Обогащаем данные о товарах
      const enrichedData = await (async () => {
        try {
          const { productService } = await import('./productService');
          const allProducts = await productService.getAllProducts();
          const allCategories = await productService.getAllCategories();
          
          if (byUser) {
            return response.data.map((ud: any) => ({
              userId: ud.user_id,
              userName: ud.user_name,
              totalDiscrepancy: ud.total_discrepancy,
              positiveTotal: ud.positive_total,
              negativeTotal: ud.negative_total,
              discrepancies: ud.discrepancies.map((d: any) => {
                const product = allProducts.find(p => p.id === d.product_id);
                
                return {
                  productId: d.product_id,
                  productName: product?.name || d.product_name,
                  expected: d.expected,
                  actual: d.actual,
                  discrepancy: d.discrepancy,
                  isPositive: d.is_positive
                };
              })
            }));
          } else {
            return response.data.map((pd: any) => {
              const product = allProducts.find(p => p.id === pd.product_id);
              const category = allCategories.find(c => c.id === product?.categoryId);
              
              return {
                productId: pd.product_id,
                productName: product?.name || pd.product_name,
                totalDiscrepancy: pd.total_discrepancy,
                positiveTotal: pd.positive_total,
                negativeTotal: pd.negative_total,
                userDiscrepancies: pd.user_discrepancies.map((ud: any) => ({
                  userId: ud.user_id,
                  userName: ud.user_name,
                  expected: ud.expected,
                  actual: ud.actual,
                  discrepancy: ud.discrepancy,
                  isPositive: ud.is_positive
                }))
              };
            });
          }
        } catch (error) {
          console.error('Error enriching discrepancies:', error);
          return response.data;
        }
      })();
      
      return enrichedData;
    } catch (error) {
      console.error('Error fetching discrepancies:', error);
      throw error;
    }
  },

  // Получить URL для фото
  getPhotoUrl: (photoPath: string): string => {
    if (!photoPath) return '';
    
    if (photoPath.startsWith('http')) {
      return photoPath;
    }
    
    if (photoPath.startsWith('uploads/')) {
      return `http://localhost:8000/${photoPath}`;
    }
    
    if (photoPath.startsWith('revisions/')) {
      return `http://localhost:8000/uploads/${photoPath}`;
    }
    
    return `http://localhost:8000/uploads/${photoPath}`;
  },

  // Старая версия заполнения (для обратной совместимости)
  fillRevisionOld: async (
    revisionId: number,
    items: Array<{ productId: number; categoryId: number; quantity: number }>,
    photos: File[],
  ): Promise<Revision> => {
    try {
      const formData = new FormData();
      
      const itemsForApi = items.map(item => ({
        product_id: item.productId,
        category_id: item.categoryId,
        quantity: item.quantity,
      }));
      
      formData.append('items_data', JSON.stringify(itemsForApi));
      
      photos.forEach((photo) => {
        formData.append('photos', photo);
      });
      
      const response = await axiosMultipartInstance.post<any>(
        `/api/revisions/${revisionId}/fill-old`,
        formData
      );
      
      const enrichedRevision = await enrichProductsData(response.data);
      return transformRevisionFromApi(enrichedRevision);
    } catch (error) {
      console.error('Error filling revision (old):', error);
      throw error;
    }
  },
  // Получить расхождения по пользователям
  getDiscrepanciesByUser: async (revisionId: number): Promise<UserDiscrepancySummary[]> => {
    try {
      const response = await axiosInstance.get<any[]>(`/api/revisions/${revisionId}/discrepancies-by-user`);
      return response.data;
    } catch (error) {
      console.error('Error fetching discrepancies by user:', error);
      throw error;
    }
  },

  // Получить расхождения по продуктам
  getDiscrepanciesByProduct: async (revisionId: number): Promise<ProductDiscrepancySummary[]> => {
    try {
      const response = await axiosInstance.get<any[]>(`/api/revisions/${revisionId}/discrepancies-by-product`);
      return response.data;
    } catch (error) {
      console.error('Error fetching discrepancies by product:', error);
      throw error;
    }
  },
};