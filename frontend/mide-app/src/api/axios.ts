import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Основной instance для JSON данных
const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Интерцептор для добавления токена к запросам
axiosInstance.interceptors.request.use(
  (config) => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        if (userData.access_token) {
          config.headers.Authorization = `Bearer ${userData.access_token}`;
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Интерцептор для обработки ответов
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Проверяем, что это не запрос на логин
    const isLoginRequest = error.config?.url?.includes('/api/auth/login');
    
    // Если 401 Unauthorized и это НЕ запрос на логин - выходим из системы
    if (error.response?.status === 401 && !isLoginRequest) {
      console.log('Unauthorized access detected, logging out...');
      localStorage.removeItem('user');
      // Используем replaceState чтобы не создавать лишнюю запись в истории
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    // Для всех остальных случаев просто возвращаем ошибку
    return Promise.reject(error);
  }
);

// Отдельный instance для форм с файлами
export const axiosMultipartInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

// Применяем те же интерцепторы для multipart instance
axiosMultipartInstance.interceptors.request.use(
  (config) => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        if (userData.access_token) {
          config.headers.Authorization = `Bearer ${userData.access_token}`;
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosMultipartInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/api/auth/login');
    
    if (error.response?.status === 401 && !isLoginRequest) {
      console.log('Unauthorized access detected, logging out...');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;