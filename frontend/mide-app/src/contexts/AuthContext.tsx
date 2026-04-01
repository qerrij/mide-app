import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { authService } from '../api/authService';
import { userService } from '../api/userService'; // Добавляем импорт
import { User, UserRole, LoginResponse } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasAccess: (allowedRoles: UserRole[]) => boolean;
  isLoading: boolean;
  refreshUserData: () => Promise<void>; // Добавляем функцию обновления
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

// Функция для трансформации snake_case в camelCase (упрощенная версия из userService)
const transformUserFromApi = (user: any): User => {
  // Исправленный парсинг admin_clusters
  let adminClusterIds: number[] = [];
  
  try {
    if (user.admin_clusters) {
      if (typeof user.admin_clusters === 'string') {
        if (user.admin_clusters.trim() !== '' && user.admin_clusters.trim() !== '[]') {
          const parsed = JSON.parse(user.admin_clusters);
          if (Array.isArray(parsed)) {
            adminClusterIds = parsed.filter((id: any) => 
              id !== null && id !== undefined && id !== 0 && !isNaN(Number(id))
            ).map((id: any) => Number(id));
          }
        }
      } else if (Array.isArray(user.admin_clusters)) {
        adminClusterIds = user.admin_clusters.filter((id: any) => 
          id !== null && id !== undefined && id !== 0 && !isNaN(Number(id))
        ).map((id: any) => Number(id));
      }
    }
  } catch (error) {
    console.warn('Error parsing admin_clusters:', error, user.admin_clusters);
    adminClusterIds = [];
  }

  return {
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    telegram: user.telegram,
    cityId: user.city_id,           // cityId вместо city
    cityName: user.city_name,
    role: user.role,
    clusterId: user.cluster_id,
    groupId: user.group_id,
    mentorId: user.mentor_id,
    seniorSellerId: user.senior_seller_id,
    adminId: user.admin_id,
    adminClusterIds,
    rate: user.rate || 0,
    createdAt: new Date(user.created_at),
    updatedAt: user.updated_at ? new Date(user.updated_at) : undefined,
    lastLogin: user.last_login ? new Date(user.last_login) : undefined,
    groupName: user.group_name,
    clusterName: user.cluster_name,
    mentorName: user.mentor_name,
    seniorSellerName: user.senior_seller_name,
    adminName: user.admin_name,
  };
};

// Функция для восстановления пользователя из localStorage
const restoreUserFromStorage = (): User | null => {
  const savedUser = localStorage.getItem('user');
  if (savedUser) {
    try {
      const parsed = JSON.parse(savedUser);
      console.log('Raw user from localStorage:', parsed);
      
      if (parsed.user) {
        // Если пользователь уже трансформирован (имеет camelCase поля)
        if ('clusterId' in parsed.user && 'groupId' in parsed.user) {
          console.log('User already has camelCase fields');
          return parsed.user;
        }
        
        // Если пользователь в snake_case - трансформируем
        console.log('Transforming snake_case to camelCase');
        return transformUserFromApi(parsed.user);
      }
    } catch (error) {
      console.error('Error parsing saved user:', error);
    }
  }
  return null;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(restoreUserFromStorage);
  const [token, setToken] = useState<string | null>(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        return parsed.access_token || null;
      } catch (error) {
        console.error('Error parsing saved token:', error);
        return null;
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);

  // Функция для обновления данных пользователя
  const refreshUserData = async (): Promise<void> => {
    if (!token) return;
    
    setIsLoading(true);
    try {
      // Используем userService.getCurrentUser для получения полных данных
      const fullUser = await userService.getCurrentUser();
      console.log('Refreshed user data:', fullUser);
      
      // Обновляем localStorage
      const savedData = localStorage.getItem('user');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        const updatedResponse: LoginResponse = {
          ...parsed,
          user: fullUser
        };
        localStorage.setItem('user', JSON.stringify(updatedResponse));
      }
      
      setUser(fullUser);
    } catch (error) {
      console.error('Error refreshing user data:', error);
      // В случае ошибки можно попробовать загрузить через authService.getCurrentUser
      try {
        const authResponse = await authService.getCurrentUser();
        if (authResponse.user) {
          const transformedUser = transformUserFromApi(authResponse.user);
          setUser(transformedUser);
        }
      } catch (secondError) {
        console.error('Failed to load user via auth service:', secondError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Функция входа
  const login = async (username: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await authService.login(username, password);
      console.log('Login response:', response);
      
      // Трансформируем пользователя если нужно
      let userToSave = response.user;
      if (userToSave && !('clusterId' in userToSave)) {
        console.log('Transforming login response');
        userToSave = transformUserFromApi(userToSave);
      }
      
      const responseToSave: LoginResponse = {
        ...response,
        user: userToSave
      };
      
      console.log('Saving to localStorage:', responseToSave);
      localStorage.setItem('user', JSON.stringify(responseToSave));
      setUser(userToSave);
      setToken(response.access_token);
      
      // После логина обновляем данные через userService для гарантии
      setTimeout(() => {
        refreshUserData();
      }, 100);
      
    } catch (error: any) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Функция выхода
  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Всегда очищаем
      localStorage.removeItem('user');
      setUser(null);
      setToken(null);
      setIsLoading(false);
    }
  };

  // Проверка прав доступа
  const hasAccess = (allowedRoles: UserRole[]): boolean => {
    return user ? allowedRoles.includes(user.role) : false;
  };

  // При монтировании проверяем и обновляем данные пользователя
  useEffect(() => {
    const initAuth = async () => {
      if (token && user) {
        // Проверяем, есть ли у пользователя все необходимые поля
        if (user.clusterId === undefined || user.groupId === undefined) {
          console.log('User data incomplete, refreshing...');
          await refreshUserData();
        }
      } else if (token && !user) {
        // Токен есть, но пользователя нет - загружаем
        setIsLoading(true);
        try {
          await refreshUserData();
        } catch (error) {
          console.error('Failed to load user on mount:', error);
          localStorage.removeItem('user');
          setUser(null);
          setToken(null);
        } finally {
          setIsLoading(false);
        }
      }
    };

    initAuth();
  }, [token]); // Зависимость только от token

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      logout, 
      hasAccess, 
      isLoading,
      refreshUserData 
    }}>
      {children}
    </AuthContext.Provider>
  );
};