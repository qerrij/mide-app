import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import { CircularProgress, Box } from '@mui/material';

interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({ 
  children, 
  allowedRoles 
}) => {
  const { user, token, isLoading, hasAccess } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsChecking(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Показываем загрузку если еще проверяем
  if (isLoading || isChecking) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Если нет токена и пользователя - редирект на логин
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Проверяем доступ по ролям
  if (!hasAccess(allowedRoles)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};