import React from 'react';
import {
  AppBar as MuiAppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Notifications from '../common/Notifications';

interface AppBarProps {
  onDrawerToggle?: () => void;
}

const AppBar: React.FC<AppBarProps> = ({ onDrawerToggle }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const getRoleName = (role?: string): string => {
    const roles: Record<string, string> = {
      'OWNER': 'Владелец',
      'ADMIN': 'Администратор',
      'SENIOR_SELLER': 'Старший продавец',
      'MENTOR': 'Наставник',
      'SELLER': 'Продавец',
    };
    return roles[role || 'SELLER'] || 'Пользователь';
  };

  return (
    <MuiAppBar
      position="fixed"
      sx={{
        backgroundColor: '#2a436d',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        boxShadow: '0 2px 8px rgba(42, 67, 109, 0.3)',
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          edge="start"
          onClick={onDrawerToggle}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            flexGrow: 1,
          }}
          onClick={() => navigate('/')}
        >
          <DashboardIcon sx={{ mr: 1 }} />
          <Typography variant="h6" noWrap component="div">
            Система отчетов
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" sx={{ color: '#d7d2d8' }}>
            {user?.username} • {getRoleName(user?.role)}
          </Typography>
          <Notifications />
        </Box>
      </Toolbar>
    </MuiAppBar>
  );
};

export default AppBar;