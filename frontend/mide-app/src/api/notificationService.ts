import axiosInstance from './axios';
import {
  Notification,
  NotificationSummary,
  NotificationStatus,
  NotificationType
} from '../types';

// Функция для трансформации snake_case в camelCase
const transformNotificationFromApi = (notification: any): Notification => {
  return {
    id: notification.id,
    userId: notification.user_id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    data: notification.data,
    entityType: notification.entity_type,
    entityId: notification.entity_id,
    status: notification.status,
    senderId: notification.sender_id,
    senderName: notification.sender_name,
    priority: notification.priority,
    createdAt: new Date(notification.created_at),
    readAt: notification.read_at ? new Date(notification.read_at) : undefined,
  };
};

export const notificationService = {
  // Получить уведомления пользователя
  getNotifications: async (
    skip: number = 0,
    limit: number = 50,
    status?: NotificationStatus,
    type?: NotificationType,
    unreadOnly: boolean = false
  ): Promise<Notification[]> => {
    const params: any = { skip, limit };
    if (status) params.status = status;
    if (type) params.type = type;
    if (unreadOnly) params.unread_only = true;
    
    const response = await axiosInstance.get<any[]>('/api/notifications', { params });
    return response.data.map(transformNotificationFromApi);
  },

  // Получить сводку по уведомлениям
  getSummary: async (): Promise<NotificationSummary> => {
    const response = await axiosInstance.get<any>('/api/notifications/summary');
    
    return {
      unreadCount: response.data.unread_count || 0,
      lastNotificationAt: response.data.last_notification_at 
        ? new Date(response.data.last_notification_at) 
        : undefined,
      notifications: (response.data.notifications || []).map(transformNotificationFromApi),
    };
  },

  // Получить количество непрочитанных уведомлений
  getUnreadCount: async (): Promise<number> => {
    const response = await axiosInstance.get<{ unread_count: number }>('/api/notifications/unread-count');
    return response.data.unread_count;
  },

  // Пометить уведомление как прочитанное
  markAsRead: async (notificationId: number): Promise<void> => {
    await axiosInstance.post(`/api/notifications/${notificationId}/read`);
  },

  // Пометить все уведомления как прочитанные
  markAllAsRead: async (): Promise<void> => {
    await axiosInstance.post('/api/notifications/read-all');
  },

  // Архивировать уведомление
  markAsArchived: async (notificationId: number): Promise<void> => {
    await axiosInstance.post(`/api/notifications/${notificationId}/archive`);
  },

  // Удалить уведомление
  deleteNotification: async (notificationId: number): Promise<void> => {
    await axiosInstance.delete(`/api/notifications/${notificationId}`);
  },

  // Обновить статус уведомления
  updateNotification: async (
    notificationId: number,
    status: NotificationStatus
  ): Promise<Notification> => {
    const response = await axiosInstance.put<any>(
      `/api/notifications/${notificationId}`,
      { status }
    );
    return transformNotificationFromApi(response.data);
  },
};