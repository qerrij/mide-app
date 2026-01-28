import axiosInstance from './axios';
import { axiosMultipartInstance } from './axios';
import { 
  Report, 
  ReportUpdateDto, 
  ReportFilter, 
  ReportStats, 
  ReportProductResponse,
  ReportCreateDto,
  ReportStatus,
  AccountantReportStatus
} from '../types';

// Функция для трансформации snake_case в camelCase для отчета
const transformReportFromApi = (report: any): Report => {
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
    transferPhotos: report.transfer_photos || [],
    status: report.status,
    comment: report.comment,
    reviewedBy: report.reviewed_by,
    reviewDate: report.review_date ? new Date(report.review_date) : undefined,
    
    // Новые поля бухгалтера
    accountantAmount: report.accountant_amount,
    accountantStatus: report.accountant_status,
    accountantComment: report.accountant_comment,
    accountantFinalAmount: report.accountant_final_amount,
    accountantReviewedBy: report.accountant_reviewed_by,
    accountantReviewDate: report.accountant_review_date ? new Date(report.accountant_review_date) : undefined,
    accountantName: report.accountant_name,
    
    createdAt: new Date(report.created_at),
    updatedAt: report.updated_at ? new Date(report.updated_at) : undefined,
  };
};

export const reportService = {
  // Получить отчеты с фильтрацией
  getReports: async (filters: ReportFilter = {}): Promise<Report[]> => {
    const params: any = { ...filters };
    
    // Убираем undefined значения
    Object.keys(params).forEach(key => {
      if (params[key] === undefined || params[key] === null) {
        delete params[key];
      }
    });
    
    const response = await axiosInstance.get<any[]>('/api/reports', {
      params
    });
    
    // Преобразуем все отчеты из snake_case в camelCase
    return response.data.map(transformReportFromApi);
  },

  // Получить отчет по ID
  getReportById: async (id: number): Promise<Report> => {
    const response = await axiosInstance.get<any>(`/api/reports/${id}`);
    return transformReportFromApi(response.data);
  },

  // Создать отчет с фото и суммой для бухгалтера
  createReport: async (
    products: Array<{ productId: number; quantity: number; soldAmount: number }>,
    accountantAmount: number,  // НОВЫЙ ПАРАМЕТР
    photos: File[],
    comment?: string
  ): Promise<Report> => {
    const formData = new FormData();
    
    // Добавляем товары как JSON
    const productsForApi = products.map(p => ({
      product_id: p.productId,
      quantity: p.quantity,
      sold_amount: p.soldAmount,
    }));
    
    formData.append('products_data', JSON.stringify(productsForApi));
    
    // Добавляем сумму для бухгалтера
    formData.append('accountant_amount', accountantAmount.toString());
    
    // Добавляем комментарий
    if (comment) {
      formData.append('comment', comment);
    }
    
    // Добавляем фото (максимум 5)
    photos.slice(0, 5).forEach(photo => {
      formData.append('photos', photo);
    });
    
    const response = await axiosMultipartInstance.post<any>('/api/reports', formData);
    
    return transformReportFromApi(response.data);
  },

  // Обновить статус отчета (для руководителей)
  updateReport: async (id: number, reportData: ReportUpdateDto): Promise<Report> => {
    const dataForApi: any = {};
    if (reportData.status) dataForApi.status = reportData.status;
    if (reportData.comment) dataForApi.comment = reportData.comment;
    if (reportData.reviewedBy) dataForApi.reviewed_by = reportData.reviewedBy;
    
    const response = await axiosInstance.put<any>(`/api/reports/${id}`, dataForApi);
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

  // Получить отчеты, ожидающие проверки бухгалтером
  getPendingAccountantReports: async (skip: number = 0, limit: number = 100): Promise<Report[]> => {
    const response = await axiosInstance.get<any[]>('/api/reports/accountant/pending', {
      params: { skip, limit }
    });
    return response.data.map(transformReportFromApi);
  },

  // Получить статистику
  getMyStats: async (): Promise<ReportStats> => {
    const response = await axiosInstance.get<ReportStats>('/api/reports/stats/my');
    return response.data;
  },

  // Получить статистику продавца
  getSellerStats: async (sellerId: number): Promise<ReportStats> => {
    const response = await axiosInstance.get<ReportStats>(`/api/reports/stats/seller/${sellerId}`);
    return response.data;
  },

  // Получить URL для фото
  getPhotoUrl: (photoPath: string): string => {
    if (!photoPath) return '';
    
    // Если уже полный URL
    if (photoPath.startsWith('http')) {
      return photoPath;
    }
    
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    
    // Убираем лишний uploads/ если есть
    let cleanPath = photoPath;
    if (cleanPath.startsWith('uploads/')) {
      cleanPath = cleanPath.substring(8); // Убираем 'uploads/'
    }
    
    // Формируем полный URL
    return `${API_URL}/uploads/${cleanPath}`;
  },
};