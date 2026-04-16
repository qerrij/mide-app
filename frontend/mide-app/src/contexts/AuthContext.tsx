import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { authService } from '../api/authService';
import { userService } from '../api/userService';
import { User, UserRole, LoginResponse, StoredUserData } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;  // Добавлено
  hasAccess: (allowedRoles: UserRole[]) => boolean;
  isLoading: boolean;
  refreshUserData: () => Promise<void>;
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

const ACCESS_TOKEN_EXPIRE_MINUTES = 30; // Должно совпадать с бекендом

// Функция для трансформации snake_case в camelCase
const transformUserFromApi = (user: any): User => {
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

  // Парсинг accountant_user_ids если есть
  let accountantUserIds: number[] = [];
  try {
    if (user.accountant_user_ids) {
      if (typeof user.accountant_user_ids === 'string') {
        accountantUserIds = JSON.parse(user.accountant_user_ids);
      } else if (Array.isArray(user.accountant_user_ids)) {
        accountantUserIds = user.accountant_user_ids;
      }
    }
  } catch {
    accountantUserIds = [];
  }

  // Парсинг category_rates если есть
  const categoryRates = user.category_rates?.map((rate: any) => ({
    id: rate.id,
    category_id: rate.category_id,
    category_name: rate.category_name,
    rate: rate.rate,
  })) || [];

  return {
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    telegram: user.telegram,
    cityId: user.city_id,
    cityName: user.city_name,
    role: user.role,
    rate: user.rate || 0,
    categoryRates,
    accountantDescription: user.accountant_description,
    clusterId: user.cluster_id,
    groupId: user.group_id,
    mentorId: user.mentor_id,
    seniorSellerId: user.senior_seller_id,
    adminId: user.admin_id,
    adminClusterIds,
    accountantUserIds,
    accountantId: user.accountant_id,
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

// Функция для восстановления данных из localStorage
const restoreStoredData = (): StoredUserData | null => {
  const savedUser = localStorage.getItem('user');
  if (savedUser) {
    try {
      const parsed = JSON.parse(savedUser);
      
      // Проверяем наличие необходимых полей для новой системы
      if (parsed.access_token && parsed.user) {
        // Если нет refresh_token (старая версия) — считаем данные невалидными
        if (!parsed.refresh_token) {
          console.warn('Old auth data format detected, please login again');
          localStorage.removeItem('user');
          return null;
        }
        
        // Трансформируем пользователя если нужно
        let user = parsed.user;
        if (!('clusterId' in user)) {
          user = transformUserFromApi(user);
        }
        
        return {
          access_token: parsed.access_token,
          refresh_token: parsed.refresh_token,
          user: user,
          expires_at: parsed.expires_at || Date.now() + ACCESS_TOKEN_EXPIRE_MINUTES * 60 * 1000,
        };
      }
    } catch (error) {
      console.error('Error parsing saved user:', error);
    }
  }
  return null;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [storedData, setStoredData] = useState<StoredUserData | null>(restoreStoredData);
  const [user, setUser] = useState<User | null>(() => restoreStoredData()?.user || null);
  const [token, setToken] = useState<string | null>(() => restoreStoredData()?.access_token || null);
  const [isLoading, setIsLoading] = useState(false);


  // Обновление данных пользователя
  const refreshUserData = async (): Promise<void> => {
    if (!token) return;
    
    setIsLoading(true);
    try {
      const fullUser = await userService.getCurrentUser();      
      const savedData = localStorage.getItem('user');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        const updatedData = {
          ...parsed,
          user: fullUser
        };
        localStorage.setItem('user', JSON.stringify(updatedData));
        setStoredData(updatedData);
      }
      
      setUser(fullUser);
    } catch (error) {
      console.error('Error refreshing user data:', error);
      try {
        const authResponse = await authService.getCurrentUser();
        if (authResponse.user) {
          const transformedUser = transformUserFromApi(authResponse.user);
          setUser(transformedUser);
          
          // Обновляем storedData
          const savedData = localStorage.getItem('user');
          if (savedData) {
            const parsed = JSON.parse(savedData);
            parsed.user = transformedUser;
            localStorage.setItem('user', JSON.stringify(parsed));
            setStoredData(parsed);
          }
        }
      } catch (secondError) {
        console.error('Failed to load user via auth service:', secondError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Вход
  const login = async (username: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await authService.login(username, password);
      
      // Трансформируем пользователя если нужно
      let userToSave = response.user;
      if (userToSave && !('clusterId' in userToSave)) {
        userToSave = transformUserFromApi(userToSave);
      }
      
      const dataToSave: StoredUserData = {
        access_token: response.access_token,
        refresh_token: response.refresh_token,
        user: userToSave,
        expires_at: Date.now() + ACCESS_TOKEN_EXPIRE_MINUTES * 60 * 1000,
      };
      
      localStorage.setItem('user', JSON.stringify(dataToSave));
      setStoredData(dataToSave);
      setUser(userToSave);
      setToken(response.access_token);
      
      // После логина обновляем данные через userService
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

  // Выход (только текущее устройство)
  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const currentData = storedData || restoreStoredData();
      if (currentData?.refresh_token) {
        await authService.logout(currentData.refresh_token);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('user');
      setStoredData(null);
      setUser(null);
      setToken(null);
      setIsLoading(false);
    }
  };

  // Выход на всех устройствах
  const logoutAll = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await authService.logoutAll();
    } catch (error) {
      console.error('Logout all error:', error);
    } finally {
      localStorage.removeItem('user');
      setStoredData(null);
      setUser(null);
      setToken(null);
      setIsLoading(false);
    }
  };

  // Проверка прав доступа
  const hasAccess = (allowedRoles: UserRole[]): boolean => {
    return user ? allowedRoles.includes(user.role) : false;
  };

  // При монтировании проверяем и обновляем данные
  useEffect(() => {
    const initAuth = async () => {
      const saved = restoreStoredData();
      
      if (saved) {
        setStoredData(saved);
        setUser(saved.user);
        setToken(saved.access_token);
        
        // Проверяем, есть ли у пользователя все необходимые поля
        if (saved.user.clusterId === undefined || saved.user.groupId === undefined) {
          console.log('User data incomplete, refreshing...');
          await refreshUserData();
        }
      }
    };

    initAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      logout,
      logoutAll,
      hasAccess, 
      isLoading,
      refreshUserData 
    }}>
      {children}
    </AuthContext.Provider>
  );
};