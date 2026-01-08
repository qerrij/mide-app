import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { authService } from '../api/authService';
import { User, UserRole, LoginResponse } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasAccess: (allowedRoles: UserRole[]) => boolean;
  isLoading: boolean;
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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    // Восстанавливаем пользователя из localStorage
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsed: LoginResponse = JSON.parse(savedUser);
      return parsed.user || null;
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsed: LoginResponse = JSON.parse(savedUser);
      return parsed.access_token || null;
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(false);

  // Функция входа
  const login = async (username: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await authService.login(username, password);
      
      // Сохраняем данные
      localStorage.setItem('user', JSON.stringify(response));
      setUser(response.user);
      setToken(response.access_token);
    } catch (error: any) {
      console.error('Login failed:', error);
      throw error; // Пробрасываем ошибку для обработки в компоненте
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
      // Всегда очищаем localStorage и состояние
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

  // При монтировании проверяем токен
  useEffect(() => {
    const checkAuth = async () => {
      if (token && !user) {
        setIsLoading(true);
        try {
          const response = await authService.getCurrentUser();
          localStorage.setItem('user', JSON.stringify(response));
          setUser(response.user);
          setToken(response.access_token);
        } catch (error) {
          console.error('Failed to get current user:', error);
          localStorage.removeItem('user');
          setUser(null);
          setToken(null);
        } finally {
          setIsLoading(false);
        }
      }
    };

    checkAuth();
  }, [token, user]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      logout, 
      hasAccess, 
      isLoading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};