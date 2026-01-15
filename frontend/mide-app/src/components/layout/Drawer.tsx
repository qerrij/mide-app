import React from 'react';
import {
  Drawer as MuiDrawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Avatar,
  Typography,
} from '@mui/material';
import {
  Assessment,
  Inventory,
  TransferWithinAStation,
  Warning,
  Dashboard,
  Warehouse,
  People,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole, getRoleName } from '../../types';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
}

const Drawer: React.FC<DrawerProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const menuItems = [
    {
      title: 'Панель управления',
      icon: <Dashboard />,
      path: '/',
      roles: [UserRole.OWNER, UserRole.ADMIN, UserRole.SENIOR_SELLER, UserRole.MENTOR, UserRole.SELLER],
    },
    {
      title: 'Отчеты',
      icon: <Assessment />,
      path: '/reports',
      roles: [UserRole.OWNER, UserRole.ADMIN, UserRole.SENIOR_SELLER, UserRole.MENTOR, UserRole.SELLER],
    },
    {
      title: 'Ревизии',
      icon: <Inventory />,
      path: '/inventory',
      roles: [UserRole.OWNER, UserRole.ADMIN, UserRole.SENIOR_SELLER, UserRole.MENTOR],
    },
    {
      title: 'Перемещения',
      icon: <TransferWithinAStation />,
      path: '/movements',
      roles: [UserRole.OWNER, UserRole.ADMIN, UserRole.SENIOR_SELLER, UserRole.MENTOR, UserRole.SELLER],
    },
    {
      title: 'Брак',
      icon: <Warning />,
      path: '/defects',
      roles: [UserRole.OWNER, UserRole.ADMIN, UserRole.SENIOR_SELLER, UserRole.MENTOR, UserRole.SELLER],
    },
    {
      title: 'Остатки',
      icon: <Warehouse />,
      path: '/stock',
      roles: [UserRole.OWNER, UserRole.ADMIN, UserRole.SENIOR_SELLER, UserRole.MENTOR],
    },
    {
      title: 'Товары',
      icon: <Inventory />,
      path: '/products',
      roles: [UserRole.OWNER]
    },
  ];

  // Добавляем персонал только для админа и владельца
  if (user?.role === UserRole.ADMIN || user?.role === UserRole.OWNER) {
    menuItems.push({
      title: 'Персонал',
      icon: <People />,
      path: '/staff',
      roles: [UserRole.OWNER, UserRole.ADMIN],
    });
  }

  const filteredMenuItems = menuItems.filter(item =>
    item.roles.includes(user?.role || UserRole.SELLER)
  );

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <MuiDrawer
      variant="temporary"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{
        '& .MuiDrawer-paper': {
          width: 280,
          backgroundColor: '#f5f3f6',
          borderRight: '1px solid #e0e0e0',
          boxSizing: 'border-box',
          height: 'calc(100% - 64px)', // Вычитаем высоту AppBar
          top: 64, // Сдвигаем вниз на высоту AppBar
          mt: 0,
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar
            sx={{
              bgcolor: '#674fb6',
              width: 48,
              height: 48,
              mr: 2,
            }}
          >
            {user?.username?.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="subtitle1" sx={{ color: '#2a0f35', fontWeight: 600 }}>
              {user?.username}
            </Typography>
            <Typography variant="body2" sx={{ color: '#4c5454' }}>
              {getRoleName(user?.role || UserRole.SELLER)}
            </Typography>
          </Box>
        </Box>
        <Divider />
      </Box>

      <List sx={{ flex: 1 }}>
        {filteredMenuItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleNavigation(item.path)}
              sx={{
                mb: 0.5,
                mx: 1,
                borderRadius: 1,
                '&.Mui-selected': {
                  backgroundColor: '#674fb615',
                  '&:hover': {
                    backgroundColor: '#674fb625',
                  },
                  '& .MuiListItemIcon-root': {
                    color: '#674fb6',
                  },
                  '& .MuiListItemText-primary': {
                    color: '#674fb6',
                    fontWeight: 600,
                  },
                },
              }}
            >
              <ListItemIcon sx={{ color: '#4c5454' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.title}
                primaryTypographyProps={{
                  sx: { color: '#2a0f35' },
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* Footer с информацией о версии */}
      <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
        <Typography variant="caption" sx={{ color: '#8a8a8a' }}>
          Система отчетов v1.0
        </Typography>
      </Box>
    </MuiDrawer>
  );
};

export default Drawer;