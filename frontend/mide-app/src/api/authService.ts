import axiosInstance from './axios';
import { User } from '../types';

// Типы для авторизации
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// Сервис авторизации
export const authService = {
  // Вход в систему - используем URL encoded
  login: async (username: string, password: string): Promise<LoginResponse> => {
    // Формируем данные в формате URL encoded
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    
    const response = await axiosInstance.post<LoginResponse>(
      '/api/auth/login',
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    return response.data;
  },

  // Выход из системы
  logout: async (): Promise<void> => {
    await axiosInstance.post('/api/auth/logout');
  },

  // Получить текущего пользователя
  getCurrentUser: async (): Promise<LoginResponse> => {
    const response = await axiosInstance.get<LoginResponse>('/api/auth/me');
    return response.data;
  },
};