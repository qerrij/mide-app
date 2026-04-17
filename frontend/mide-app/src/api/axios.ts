import axios from 'axios';
import { StoredUserData, RefreshTokenResponse } from '../types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Флаг для предотвращения множественных запросов на обновление
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

const getStoredUser = (): StoredUserData | null => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

const saveStoredUser = (data: Partial<StoredUserData>) => {
  const current = getStoredUser() || {} as StoredUserData;
  const updated = { ...current, ...data };
  localStorage.setItem('user', JSON.stringify(updated));
};

const isTokenExpiringSoon = (): boolean => {
  const user = getStoredUser();
  if (!user?.expires_at) return false;
  return Date.now() + 60000 >= user.expires_at;
};

const refreshAccessToken = async (): Promise<string> => {
  const user = getStoredUser();
  if (!user?.refresh_token) {
    throw new Error('No refresh token available');
  }

  try {
    const response = await axios.post<RefreshTokenResponse>(
      `${API_URL}/api/auth/refresh`,
      { refresh_token: user.refresh_token },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const { access_token, refresh_token, expires_in } = response.data;
    
    saveStoredUser({
      access_token,
      refresh_token,
      expires_at: Date.now() + expires_in * 1000,
    });

    return access_token;
  } catch (error) {
    localStorage.removeItem('user');
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw error;
  }
};

// Создаем основной instance
const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Интерцептор запросов для основного instance
axiosInstance.interceptors.request.use(
  async (config) => {
    const user = getStoredUser();
    
    if (user?.access_token) {
      if (isTokenExpiringSoon() && !config.url?.includes('/api/auth/refresh')) {
        try {
          const newToken = await refreshAccessToken();
          config.headers.Authorization = `Bearer ${newToken}`;
        } catch {
          config.headers.Authorization = `Bearer ${user.access_token}`;
        }
      } else {
        config.headers.Authorization = `Bearer ${user.access_token}`;
      }
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Интерцептор ответов для основного instance
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isLoginRequest = originalRequest?.url?.includes('/api/auth/login');
    const isRefreshRequest = originalRequest?.url?.includes('/api/auth/refresh');
    
    if (error.response?.status === 401 && !isLoginRequest && !isRefreshRequest && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();
        
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);

// Создаем multipart instance
export const axiosMultipartInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

// Копируем интерцепторы для multipart instance ПРАВИЛЬНО
// Интерцептор запросов
axiosMultipartInstance.interceptors.request.use(
  async (config) => {
    const user = getStoredUser();
    
    if (user?.access_token) {
      if (isTokenExpiringSoon() && !config.url?.includes('/api/auth/refresh')) {
        try {
          const newToken = await refreshAccessToken();
          config.headers.Authorization = `Bearer ${newToken}`;
        } catch {
          config.headers.Authorization = `Bearer ${user.access_token}`;
        }
      } else {
        config.headers.Authorization = `Bearer ${user.access_token}`;
      }
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Интерцептор ответов для multipart instance
axiosMultipartInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isLoginRequest = originalRequest?.url?.includes('/api/auth/login');
    const isRefreshRequest = originalRequest?.url?.includes('/api/auth/refresh');
    
    if (error.response?.status === 401 && !isLoginRequest && !isRefreshRequest && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosMultipartInstance(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();
        
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        
        return axiosMultipartInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;