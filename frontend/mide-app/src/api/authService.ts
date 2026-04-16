import axiosInstance from './axios';
import { User, LoginResponse, RefreshTokenResponse } from '../types';

export interface LoginRequest {
  username: string;
  password: string;
}

export const authService = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
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

  refreshToken: async (refreshToken: string): Promise<RefreshTokenResponse> => {
    const response = await axiosInstance.post<RefreshTokenResponse>(
      '/api/auth/refresh',
      { refresh_token: refreshToken }
    );
    return response.data;
  },

  logout: async (refreshToken: string): Promise<void> => {
    await axiosInstance.post('/api/auth/logout', null, {
      params: { refresh_token: refreshToken }
    });
  },

  logoutAll: async (): Promise<void> => {
    await axiosInstance.post('/api/auth/logout-all');
  },

  getCurrentUser: async (): Promise<LoginResponse> => {
    const response = await axiosInstance.get<LoginResponse>('/api/auth/me');
    return response.data;
  },
};