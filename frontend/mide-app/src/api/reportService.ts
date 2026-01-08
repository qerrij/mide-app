import axiosInstance from './axios';
import { axiosMultipartInstance } from './axios';
import { Report, ReportUpdateDto, ReportFilter, ReportStats, ReportProductResponse } from '../types';

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
    createdAt: new Date(report.created_at),
    updatedAt: report.updated_at ? new Date(report.updated_at) : undefined,
  };
};

// Функция для трансформации camelCase в snake_case при отправке
const transformReportToApi = (report: any): any => {
  return {
    seller_id: report.sellerId,
    products_data: JSON.stringify(report.products),
    comment: report.comment,
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

  // Создать отчет с фото
  createReport: async (
    products: Array<{ productId: number; quantity: number; soldAmount: number }>,
    photos: File[],
    comment?: string
  ): Promise<Report> => {
    const formData = new FormData();
    
    // Добавляем товары как JSON (уже в snake_case)
    const productsForApi = products.map(p => ({
      product_id: p.productId,
      quantity: p.quantity,
      sold_amount: p.soldAmount,
    }));
    
    formData.append('products_data', JSON.stringify(productsForApi));
    
    // Добавляем комментарий
    if (comment) {
      formData.append('comment', comment);
    }
    
    // Добавляем фото (максимум 5)
    photos.slice(0, 5).forEach(photo => {
      formData.append('photos', photo);
    });
    
    const response = await axiosMultipartInstance.post<any>('/api/reports', formData);
    
    // Преобразуем ответ из snake_case в camelCase
    return transformReportFromApi(response.data);
  },

  // Обновить статус отчета
  updateReport: async (id: number, reportData: ReportUpdateDto): Promise<Report> => {
    // Преобразуем camelCase в snake_case для отправки
    const dataForApi: any = {};
    if (reportData.status) dataForApi.status = reportData.status;
    if (reportData.comment) dataForApi.comment = reportData.comment;
    if (reportData.reviewedBy) dataForApi.reviewed_by = reportData.reviewedBy;
    
    const response = await axiosInstance.put<any>(`/api/reports/${id}`, dataForApi);
    return transformReportFromApi(response.data);
  },

  // Удалить отчет
  deleteReport: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/api/reports/${id}`);
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
    
    if (photoPath.startsWith('http')) {
      return photoPath;
    }
    
    // Проверяем разные варианты путей
    if (photoPath.startsWith('uploads/')) {
      return `http://localhost:8000/${photoPath}`;
    }
    
    if (photoPath.startsWith('reports/')) {
      return `http://localhost:8000/uploads/${photoPath}`;
    }
    
    // По умолчанию
    return `http://localhost:8000/uploads/${photoPath}`;
  },
};