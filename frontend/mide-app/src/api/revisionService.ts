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
  ProductDiscrepancySummary,
  RevisionEditingStatus,
  StartEditingResponse,
  StopEditingResponse
} from '../types';

const transformRevisionFromApi = (revision: any): Revision => {
  return {
    id: revision.id,
    requestedById: revision.requested_by_id,
    requestedByName: revision.requested_by_name,
    type: revision.type,
    status: revision.status,
    targetUserId: revision.target_user_id,
    targetGroupId: revision.target_group_id,
    targetClusterId: revision.target_cluster_id,
    targetCity: revision.target_city,
    targetUserName: revision.target_user_name,
    targetGroupName: revision.target_group_name,
    targetClusterName: revision.target_cluster_name,
    comment: revision.comment,
    verificationComment: revision.verification_comment,
    verifiedById: revision.verified_by_id,
    verifiedByName: revision.verified_by_name,
    requestedAt: new Date(revision.requested_at),
    completedAt: revision.completed_at ? new Date(revision.completed_at) : undefined,
    verifiedAt: revision.verified_at ? new Date(revision.verified_at) : undefined,
    
    photos: revision.photos || [],
    
    items: (revision.items || []).map((item: any) => ({
      id: item.id,
      productId: item.product_id,
      categoryId: item.category_id,
      quantity: item.quantity,
      actualQuantity: item.actual_quantity,
      productName: item.product_name,
      productSku: item.product_sku,
      categoryName: item.category_name,
    })),
    
    discrepancies: (revision.discrepancies || []).map((disc: any) => ({
      id: disc.id,
      productId: disc.product_id,
      userId: disc.user_id,
      expectedQuantity: disc.expected_quantity,
      actualQuantity: disc.actual_quantity,
      discrepancy: disc.discrepancy,
      isPositive: disc.is_positive,
      productName: disc.product_name,
      productSku: disc.product_sku,
      userName: disc.user_name,
      categoryName: disc.category_name,
    })),
    
    fillings: (revision.fillings || []).map(transformFillingFromApi),
    totalFilled: revision.total_filled || 0,
    totalUsers: revision.total_users || 0,
    isGroupRevision: revision.is_group_revision || 
                     (revision.type && revision.type !== RevisionType.USER)
  };
};

const transformFillingFromApi = (filling: any): RevisionFilling => {
  return {
    id: filling.id,
    revisionId: filling.revision_id,
    userId: filling.user_id,
    userName: filling.user_name,
    status: filling.status,
    photos: filling.photos || [],
    filledAt: filling.filled_at ? new Date(filling.filled_at) : undefined,
    isCompleted: filling.is_completed || false,
    items: (filling.items || []).map((item: any) => ({
      id: item.id,
      productId: item.product_id,
      categoryId: item.category_id,
      quantity: item.quantity,
      productName: item.product_name,
      productSku: item.product_sku,
      categoryName: item.category_name,
    })),
    updatedAt: filling.updated_at ? new Date(filling.updated_at) : undefined,
    lastUpdatedByName: filling.last_updated_by_name,
  };
};

const transformDiscrepancyFromApi = (discrepancy: any): any => {
  return {
    userId: discrepancy.user_id,
    userName: discrepancy.user_name,
    totalDiscrepancy: discrepancy.total_discrepancy || 0,
    positiveTotal: discrepancy.positive_total || 0,
    negativeTotal: discrepancy.negative_total || 0,
    discrepancies: (discrepancy.discrepancies || []).map((disc: any) => ({
      productId: disc.product_id,
      productName: disc.product_name,
      productSku: disc.product_sku,
      expected: disc.expected,
      actual: disc.actual,
      discrepancy: disc.discrepancy || 0,
      isPositive: disc.is_positive || false
    }))
  };
};

const transformProductDiscrepancyFromApi = (discrepancy: any): ProductDiscrepancySummary => {
  return {
    productId: discrepancy.product_id,
    productName: discrepancy.product_name,
    productSku: discrepancy.product_sku,
    categoryName: discrepancy.category_name,
    totalDiscrepancy: discrepancy.total_discrepancy || 0,
    positiveTotal: discrepancy.positive_total || 0,
    negativeTotal: discrepancy.negative_total || 0,
    userDiscrepancies: (discrepancy.user_discrepancies || []).map((ud: any) => ({
      userId: ud.user_id,
      userName: ud.user_name,
      expected: ud.expected,
      actual: ud.actual,
      discrepancy: ud.discrepancy || 0,
      isPositive: ud.is_positive || false
    }))
  };
};

export const revisionService = {
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
      return response.data.map(transformRevisionFromApi);
    } catch (error) {
      console.error('Error fetching revisions:', error);
      throw error;
    }
  },

  getMyRevisions: async (skip: number = 0, limit: number = 100): Promise<Revision[]> => {
    try {
      const response = await axiosInstance.get<any[]>('/api/revisions/my', {
        params: { skip, limit }
      });
      return response.data.map(transformRevisionFromApi);
    } catch (error) {
      console.error('Error fetching my revisions:', error);
      throw error;
    }
  },

  getRevisionById: async (id: number): Promise<Revision> => {
    try {
      const response = await axiosInstance.get<any>(`/api/revisions/${id}`);
      return transformRevisionFromApi(response.data);
    } catch (error) {
      console.error('Error fetching revision by ID:', error);
      throw error;
    }
  },

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
      return transformRevisionFromApi(response.data);
    } catch (error) {
      console.error('Error requesting revision:', error);
      throw error;
    }
  },

  fillRevision: async (
    revisionId: number,
    items: Array<{ productId: number; categoryId: number; quantity: number }>,
    photos: File[]
  ): Promise<RevisionFilling> => {
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
        `/api/revisions/${revisionId}/fill`,
        formData
      );
      
      return transformFillingFromApi(response.data);
    } catch (error) {
      console.error('Error filling revision:', error);
      throw error;
    }
  },

  getMyFilling: async (revisionId: number): Promise<RevisionFilling | null> => {
    try {
      const response = await axiosInstance.get<any>(`/api/revisions/${revisionId}/my-filling`);
      return transformFillingFromApi(response.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error('Error fetching my filling:', error);
      throw error;
    }
  },

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
      
      return transformRevisionFromApi(response.data);
    } catch (error) {
      console.error('Error verifying revision:', error);
      throw error;
    }
  },

  getRevisionSummary: async (revisionId: number): Promise<RevisionSummaryResponse> => {
    try {
      const response = await axiosInstance.get<any>(`/api/revisions/${revisionId}/summary`);
      
      return {
        revision: transformRevisionFromApi(response.data.revision),
        productSummary: (response.data.product_summary || []).map((summary: any): ProductSummary => ({
          productId: summary.product_id,
          productName: summary.product_name,
          productSku: summary.product_sku,
          categoryName: summary.category_name,
          totalQuantity: summary.total_quantity,
          userQuantities: (summary.user_quantities || []).map((uq: any) => ({
            userId: uq.user_id,
            userName: uq.user_name,
            quantity: uq.quantity
          }))
        })),
        userDiscrepancies: (response.data.user_discrepancies || []).map((ud: any) => transformDiscrepancyFromApi(ud)),
        productDiscrepancies: (response.data.product_discrepancies || []).map((pd: any) => transformProductDiscrepancyFromApi(pd)),
        totalFilled: response.data.total_filled,
        totalUsers: response.data.total_users
      };
    } catch (error) {
      console.error('Error fetching revision summary:', error);
      throw error;
    }
  },

  getDiscrepancies: async (
    revisionId: number,
    byUser: boolean = false
  ): Promise<UserDiscrepancySummary[] | ProductDiscrepancySummary[]> => {
    try {
      const response = await axiosInstance.get<any>(
        `/api/revisions/${revisionId}/discrepancies?by_user=${byUser}`
      );
      
      if (byUser) {
        return (response.data || []).map((ud: any) => transformDiscrepancyFromApi(ud));
      } else {
        return (response.data || []).map((pd: any) => transformProductDiscrepancyFromApi(pd));
      }
    } catch (error) {
      console.error('Error fetching discrepancies:', error);
      throw error;
    }
  },

  getPhotoUrl: (path: string): string => {
    if (!path) return '';
    
    if (path.startsWith('http')) {
      return path;
    }
    
    let cleanPath = path;
    if (cleanPath.startsWith('uploads/')) {
      cleanPath = cleanPath.substring(8);
    }
    
    return `https://storage.yandexcloud.net/mide-app/${cleanPath}`;
  },

  getDiscrepanciesByUser: async (revisionId: number): Promise<UserDiscrepancySummary[]> => {
    try {
      const response = await axiosInstance.get<any[]>(`/api/revisions/${revisionId}/discrepancies-by-user`);
      return (response.data || []).map((d: any) => transformDiscrepancyFromApi(d));
    } catch (error) {
      console.error('Error fetching discrepancies by user:', error);
      throw error;
    }
  },

  getDiscrepanciesByProduct: async (revisionId: number): Promise<ProductDiscrepancySummary[]> => {
    try {
      const response = await axiosInstance.get<any[]>(`/api/revisions/${revisionId}/discrepancies-by-product`);
      return (response.data || []).map((d: any) => transformProductDiscrepancyFromApi(d));
    } catch (error) {
      console.error('Error fetching discrepancies by product:', error);
      throw error;
    }
  },

  calculateDiscrepancies: async (revisionId: number): Promise<UserDiscrepancySummary[]> => {
    try {
      const response = await axiosInstance.get<any[]>(`/api/revisions/${revisionId}/calculate-discrepancies`);
      return (response.data || []).map((d: any) => transformDiscrepancyFromApi(d));
    } catch (error) {
      console.error('Error calculating discrepancies:', error);
      throw error;
    }
  },

  deleteRevision: async (revisionId: number): Promise<{ success: boolean; message: string; revisionId: number }> => {
    try {
      const response = await axiosInstance.delete(`/api/revisions/${revisionId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting revision:', error);
      throw error;
    }
  },

  revertRevisionChanges: async (revisionId: number): Promise<Revision> => {
    try {
      const response = await axiosInstance.post<any>(
        `/api/revisions/${revisionId}/revert-changes`
      );
      return transformRevisionFromApi(response.data);
    } catch (error) {
      console.error('Error reverting revision changes:', error);
      throw error;
    }
  },

  cancelRevision: async (revisionId: number, cancelComment?: string): Promise<Revision> => {
    try {
      const params = cancelComment ? { cancel_comment: cancelComment } : {};
      const response = await axiosInstance.post<any>(
        `/api/revisions/${revisionId}/cancel`,
        null,
        { params }
      );
      return transformRevisionFromApi(response.data);
    } catch (error) {
      console.error('Error cancelling revision:', error);
      throw error;
    }
  },

  startEditing: async (revisionId: number, sessionDurationMinutes: number = 30): Promise<StartEditingResponse> => {
    try {
      const response = await axiosInstance.post(
        `/api/revisions/${revisionId}/start-editing`,
        null,
        { params: { session_duration_minutes: sessionDurationMinutes } }
      );
      return response.data;
    } catch (error) {
      console.error('Error starting editing:', error);
      throw error;
    }
  },

  stopEditing: async (revisionId: number): Promise<StopEditingResponse> => {
    try {
      const response = await axiosInstance.post(`/api/revisions/${revisionId}/stop-editing`);
      return response.data;
    } catch (error) {
      console.error('Error stopping editing:', error);
      throw error;
    }
  },

  getEditingStatus: async (revisionId: number): Promise<RevisionEditingStatus> => {
    try {
      const response = await axiosInstance.get(`/api/revisions/${revisionId}/editing-status`);
      return response.data;
    } catch (error) {
      console.error('Error fetching editing status:', error);
      throw error;
    }
  },

  updateFilling: async (
    revisionId: number,
    items: Array<{ productId: number; categoryId: number; quantity: number }>,
    photos: File[],
    deletedPhotoUrls: string[] = []
  ): Promise<RevisionFilling> => {
    try {
      const formData = new FormData();
      
      const itemsForApi = items.map(item => ({
        product_id: item.productId,
        category_id: item.categoryId,
        quantity: item.quantity,
      }));
      
      formData.append('items_data', JSON.stringify(itemsForApi));
      
      // Отправляем только новые фото (те, у которых есть размер)
      const newPhotos = photos.filter(photo => photo.size > 0);
      newPhotos.forEach((photo) => {
        formData.append('photos', photo);
      });
      
      // Отправляем список удаленных фото
      if (deletedPhotoUrls.length > 0) {
        formData.append('deleted_photos', JSON.stringify(deletedPhotoUrls));
      }
      
      const response = await axiosMultipartInstance.put<any>(
        `/api/revisions/${revisionId}/fill`,
        formData
      );
      
      return transformFillingFromApi(response.data);
    } catch (error) {
      console.error('Error updating filling:', error);
      throw error;
    }
  },
};