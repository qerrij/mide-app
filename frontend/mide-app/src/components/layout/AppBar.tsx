import React, { useState, useEffect } from 'react';
import {
  AppBar as MuiAppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Container,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Logout as LogoutIcon,
  Assessment,
  Inventory,
  TransferWithinAStation,
  Warning,
  Warehouse,
  People,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Notifications from '../common/Notifications';

interface AppBarProps {
  onDrawerToggle?: () => void;
  drawerOpen?: boolean;
}

const AppBar: React.FC<AppBarProps> = ({ onDrawerToggle, drawerOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [navMenuAnchor, setNavMenuAnchor] = useState<null | HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [scrollbarWidth, setScrollbarWidth] = useState(0);

  useEffect(() => {
    // Функция для определения ширины скролла
    const getScrollbarWidth = () => {
      // Создаем временный div с прокруткой
      const outer = document.createElement('div');
      outer.style.visibility = 'hidden';
      outer.style.overflow = 'scroll';
      document.body.appendChild(outer);
      
      // Создаем внутренний div
      const inner = document.createElement('div');
      outer.appendChild(inner);
      
      // Вычисляем ширину скролла
      const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
      
      // Удаляем временные элементы
      outer.parentNode?.removeChild(outer);
      
      return scrollbarWidth;
    };

    // Устанавливаем ширину скролла
    setScrollbarWidth(getScrollbarWidth());

    const handleScroll = () => {
      const isScrolled = window.scrollY > 20;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    // Обновляем ширину скролла при изменении размера окна
    const handleResize = () => {
      setScrollbarWidth(getScrollbarWidth());
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [scrolled]);

  const getRoleName = (role?: string): string => {
    const roles: Record<string, string> = {
      'OWNER': 'Владелец',
      'ADMIN': 'Администратор',
      'SENIOR_SELLER': 'Старший продавец',
      'MENTOR': 'Наставник',
      'SELLER': 'Продавец',
      'ACCOUNTANT': 'Бухгалтер',
    };
    return roles[role || 'SELLER'] || 'Пользователь';
  };

  const menuItems = [
    {
      title: 'Панель управления',
      icon: <DashboardIcon />,
      path: '/',
      roles: ['OWNER', 'ADMIN', 'SENIOR_SELLER', 'MENTOR', 'SELLER'],
    },
    {
      title: 'Отчеты',
      icon: <Assessment />,
      path: '/reports',
      roles: ['OWNER', 'ADMIN', 'SENIOR_SELLER', 'MENTOR', 'SELLER', 'ACCOUNTANT'],
    },
    {
      title: 'Ревизии',
      icon: <Inventory />,
      path: '/revisions',
      roles: ['OWNER', 'ADMIN', 'SENIOR_SELLER', 'MENTOR', 'SELLER'],
    },
    {
      title: 'Перемещения',
      icon: <TransferWithinAStation />,
      path: '/movements',
      roles: ['OWNER', 'ADMIN', 'SENIOR_SELLER', 'MENTOR', 'SELLER'],
    },
    {
      title: 'Брак',
      icon: <Warning />,
      path: '/defects',
      roles: ['OWNER', 'ADMIN', 'SENIOR_SELLER', 'MENTOR', 'SELLER'],
    },
    {
      title: 'Товары',
      icon: <Inventory />,
      path: '/products',
      roles: ['OWNER']
    },
  ];

  // Добавляем персонал только для владельца
  if (user?.role === 'OWNER') {
    menuItems.push({
      title: 'Персонал',
      icon: <People />,
      path: '/staff',
      roles: ['OWNER', 'ADMIN'],
    });
  }

  const filteredMenuItems = menuItems.filter(item =>
    item.roles.includes(user?.role || 'SELLER')
  );

  const handleUserMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleNavMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setNavMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setUserMenuAnchor(null);
    setNavMenuAnchor(null);
  };

  const handleNavigation = (path: string) => {
    handleMenuClose();
    navigate(path);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate('/login');
  };

  return (
    <>
      <MuiAppBar
        position="sticky"
        elevation={0}
        sx={{
          backgroundColor: scrolled 
            ? 'rgba(255, 255, 255, 0.9)' 
            : 'transparent',
          backdropFilter: scrolled ? 'blur(8px)' : 'none',
          boxShadow: scrolled 
            ? '0 4px 20px rgba(106, 61, 122, 0.1)' 
            : 'none',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          width: '100%',
        }}
      >
        <Container maxWidth="lg">
          <Toolbar
            sx={{
              width: '100%',
              px: { xs: 1, sm: 3, md: 4 },
              minHeight: 40,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
              }}
            >
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                // Добавляем отступ слева для компенсации скролла на десктопе
                ml: { md: `${scrollbarWidth / 2}px` },
              }}>
                <IconButton
                  color="inherit"
                  edge="start"
                  onClick={handleNavMenuClick}
                  sx={{ 
                    mr: 2,
                    color: '#2a0f35',
                    position: 'relative',
                    width: 40,
                    height: 40,
                    '&:hover': {
                      backgroundColor: 'rgba(106, 61, 122, 0.04)',
                    },
                  }}
                >
                  <MenuIcon
                    sx={{
                      position: 'absolute',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      opacity: navMenuAnchor ? 0 : 1,
                      transform: navMenuAnchor ? 'rotate(-90deg) scale(0.8)' : 'rotate(0deg) scale(1)',
                    }}
                  />
                  
                  <CloseIcon
                    sx={{
                      position: 'absolute',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      opacity: navMenuAnchor ? 1 : 0,
                      transform: navMenuAnchor ? 'rotate(0deg) scale(1)' : 'rotate(90deg) scale(0.8)',
                    }}
                  />
                </IconButton>

                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                  onClick={() => navigate('/')}
                >
                  <Typography 
                    variant="h5" 
                    noWrap 
                    component="div"
                    sx={{ 
                      fontWeight: 600,
                      letterSpacing: '-0.5px',
                      background: 'linear-gradient(135deg, #674fb6 0%, #3f1f4b 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    Mide
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 2,
                // Добавляем отступ справа для компенсации скролла на десктопе
                mr: { md: `${scrollbarWidth / 2}px` },
              }}>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1.5,
                    cursor: 'pointer',
                    px: 2,
                    py: 1,
                    borderRadius: 8,
                    '&:hover': {
                      backgroundColor: 'rgba(106, 61, 122, 0.04)',
                    },
                  }}
                  onClick={handleUserMenuClick}
                >
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      background: 'linear-gradient(135deg, #674fb6 0%, #3f1f4b 100%)',
                      fontSize: '0.875rem',
                      color: '#ffffff',
                    }}
                  >
                    {user?.fullName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: '#2a0f35', 
                        fontWeight: 500,
                        lineHeight: 1.2,
                      }}
                    >
                      {user?.fullName || user?.username}
                    </Typography>
                  </Box>
                </Box>
                
                <Notifications />
              </Box>
            </Box>

            {/* Меню навигации */}
            <Menu
              anchorEl={navMenuAnchor}
              open={Boolean(navMenuAnchor)}
              onClose={handleMenuClose}
              disableScrollLock={true}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
              PaperProps={{
                sx: {
                  mt: 0,
                  ml: -1,
                  minWidth: 250,
                  maxHeight: '70vh',
                  overflow: 'auto',
                  borderRadius: 4,
                  boxShadow: '0 8px 32px rgba(106, 61, 122, 0.2)',
                  border: '1px solid rgba(106, 61, 122, 0.1)',
                  backgroundColor: '#ffffff',
                },
              }}
            >
              <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(106, 61, 122, 0.1)' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2a0f35' }}>
                  Навигация
                </Typography>
              </Box>
              
              {filteredMenuItems.map((item) => (
                <MenuItem
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  selected={location.pathname === item.path}
                  sx={{
                    py: 1.5,
                    px: 2,
                    borderRadius: 2,
                    mx: 1,
                    my: 0.5,
                    '&.Mui-selected': {
                      backgroundColor: '#674fb615',
                      '&:hover': {
                        backgroundColor: '#674fb625',
                      },
                      '& .MuiListItemIcon-root': {
                        color: '#674fb6',
                      },
                    },
                    '&:hover': {
                      backgroundColor: '#f5f3f6',
                    },
                  }}
                >
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    color: location.pathname === item.path ? '#674fb6' : '#2a0f35',
                    mr: 2
                  }}>
                    {item.icon}
                  </Box>
                  <Typography 
                    variant="body2"
                    sx={{ 
                      fontWeight: location.pathname === item.path ? 600 : 400,
                      color: location.pathname === item.path ? '#674fb6' : '#2a0f35',
                    }}
                  >
                    {item.title}
                  </Typography>
                </MenuItem>
              ))}

              <Box sx={{ 
                px: 2, 
                py: 1.5, 
                mt: 1,
                borderTop: '1px solid rgba(106, 61, 122, 0.1)',
              }}>
                <Typography variant="caption" sx={{ color: '#8a8a8a' }}>
                  Система отчетов v1.0
                </Typography>
              </Box>
            </Menu>

            {/* Меню пользователя */}
            <Menu
              anchorEl={userMenuAnchor}
              open={Boolean(userMenuAnchor)}
              disableScrollLock={true}
              onClose={handleMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              PaperProps={{
                sx: {
                  mt: 0,
                  minWidth: 200,
                  borderRadius: 4,
                  boxShadow: '0 8px 32px rgba(106, 61, 122, 0.2)',
                  border: '1px solid rgba(106, 61, 122, 0.1)',
                },
              }}
            >
              <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(106, 61, 122, 0.1)' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2a0f35' }}>
                  {user?.fullName || user?.username}
                </Typography>
                <Typography variant="caption" sx={{ color: '#8a8a8a' }}>
                  Логин: {user?.username}
                </Typography>
              </Box>
              <MenuItem 
                onClick={handleLogout}
                sx={{ 
                  mt: 1,
                  borderRadius: 6,
                  mx: 1,
                  color: '#ca0ec0',
                  '&:hover': {
                    backgroundColor: 'rgba(202, 14, 192, 0.04)',
                  },
                }}
              >
                <LogoutIcon sx={{ mr: 1.5, fontSize: 20 }} />
                Выйти
              </MenuItem>
            </Menu>
          </Toolbar>
        </Container>
      </MuiAppBar>
      
      <Box sx={{ height: 80 }} />
    </>
  );
};

export default AppBar;