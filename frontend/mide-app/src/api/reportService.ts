import axiosInstance from './axios';
import { axiosMultipartInstance } from './axios';
import { 
  Report, 
  ReportUpdateDto, 
  ReportFilter, 
  ReportStats, 
  ReportProductResponse,
  ReportCreateDto,
  ReportFixDto,
  ReportStatus
} from '../types';

// Функция для трансформации snake_case в camelCase для отчета
const transformReportFromApi = (report: any): Report => {
  const transferPhotos = report.transfer_photos || [];
  
  return {
    id: report.id,
    sellerId: report.seller_id,
    sellerName: report.seller_name,
    date: new Date(report.date),
    products: (report.products || []).map((product: any): ReportProductResponse => ({
      id: product.id,
      productId: product.product_id,
      product: product.product,
      quantity: product.quantity,
      soldAmount: product.sold_amount,
    })),
    transferAmount: report.transfer_amount,
    transferPhotos: transferPhotos,
    status: report.status,
    comment: report.comment,
    reviewedBy: report.reviewed_by,
    reviewDate: report.review_date ? new Date(report.review_date) : undefined,
    
    accountantAmount: report.accountant_amount,
    accountantStatus: report.accountant_status,
    accountantComment: report.accountant_comment,
    accountantFinalAmount: report.accountant_final_amount,
    accountantReviewedBy: report.accountant_reviewed_by,
    accountantReviewDate: report.accountant_review_date ? new Date(report.accountant_review_date) : undefined,
    accountantName: report.accountant_name,
    wasWithAccountant: report.was_with_accountant || false,
    
    createdAt: new Date(report.created_at),
    updatedAt: report.updated_at ? new Date(report.updated_at) : undefined,
  };
};

export const reportService = {
  // Получить отчеты с фильтрацией
  getReports: async (filters: ReportFilter = {}): Promise<Report[]> => {
    const params: any = { ...filters };
    
    Object.keys(params).forEach(key => {
      if (params[key] === undefined || params[key] === null) {
        delete params[key];
      }
    });
    
    const response = await axiosInstance.get<any[]>('/api/reports', { params });
    return response.data.map(transformReportFromApi);
  },

  // Получить отчет по ID
  getReportById: async (id: number): Promise<Report> => {
    const response = await axiosInstance.get<any>(`/api/reports/${id}`);
    return transformReportFromApi(response.data);
  },

  // Создать отчет
  createReport: async (
    products: Array<{ productId: number; quantity: number; soldAmount: number }>,
    accountantAmount: number,
    photos: File[],
    comment?: string
  ): Promise<Report> => {
    const formData = new FormData();
    
    const productsForApi = products.map(p => ({
      product_id: p.productId,
      quantity: p.quantity,
      sold_amount: p.soldAmount,
    }));
    
    formData.append('products_data', JSON.stringify(productsForApi));
    formData.append('accountant_amount', accountantAmount.toString());
    
    if (comment) {
      formData.append('comment', comment);
    }
    
    photos.slice(0, 5).forEach(photo => {
      formData.append('photos', photo);
    });
    
    const response = await axiosMultipartInstance.post<any>('/api/reports', formData);
    return transformReportFromApi(response.data);
  },

  // Исправить отклоненный отчет
  fixReport: async (
    reportId: number,
    products: Array<{ productId: number; quantity: number; soldAmount: number }>,
    accountantAmount: number,
    photos: File[],
    comment?: string
  ): Promise<Report> => {
    const formData = new FormData();
    
    const productsForApi = products.map(p => ({
      product_id: p.productId,
      quantity: p.quantity,
      sold_amount: p.soldAmount,
    }));
    
    formData.append('products_data', JSON.stringify(productsForApi));
    formData.append('accountant_amount', accountantAmount.toString());
    
    if (comment) {
      formData.append('comment', comment);
    }
    
    photos.slice(0, 5).forEach(photo => {
      formData.append('photos', photo);
    });
    
    const response = await axiosMultipartInstance.post<any>(`/api/reports/${reportId}/fix`, formData);
    return transformReportFromApi(response.data);
  },

  // Проверка отчета бухгалтером
  reviewByAccountant: async (
    reportId: number,
    action: 'approve' | 'reject',
    finalAmount?: number,
    comment?: string
  ): Promise<Report> => {
    const formData = new FormData();
    formData.append('action', action);
    
    if (action === 'approve' && finalAmount !== undefined) {
      formData.append('final_amount', finalAmount.toString());
    }
    
    if (comment) {
      formData.append('comment', comment);
    }
    
    const response = await axiosMultipartInstance.post<any>(
      `/api/reports/${reportId}/accountant-review`,
      formData
    );
    return transformReportFromApi(response.data);
  },

  // Финальное утверждение отчета руководителем
  finalApproveReport: async (
    reportId: number,
    action: 'approve' | 'reject',
    comment?: string
  ): Promise<Report> => {
    const formData = new FormData();
    formData.append('action', action);
    
    if (comment) {
      formData.append('comment', comment);
    }
    
    const response = await axiosMultipartInstance.post<any>(
      `/api/reports/${reportId}/final-approval`,
      formData
    );
    return transformReportFromApi(response.data);
  },

  // Получить статистику
  getMyStats: async (): Promise<ReportStats> => {
    const response = await axiosInstance.get<ReportStats>('/api/reports/stats/my');
    return response.data;
  },

  // Получить URL фото
  getPhotoUrl: (path: string): string => {
    if (path.startsWith('http')) return path;
    return `https://storage.yandexcloud.net/mide-app/${path}`;
  },
};