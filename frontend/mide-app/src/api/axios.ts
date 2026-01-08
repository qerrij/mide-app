import axios from 'axios';

const API_URL = 'http://localhost:8000';

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
      const userData = JSON.parse(userStr);
      if (userData.access_token) {
        config.headers.Authorization = `Bearer ${userData.access_token}`;
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
    // Если 401 Unauthorized - выходим из системы
    if (error.response?.status === 401) {
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
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
      const userData = JSON.parse(userStr);
      if (userData.access_token) {
        config.headers.Authorization = `Bearer ${userData.access_token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default axiosInstance;