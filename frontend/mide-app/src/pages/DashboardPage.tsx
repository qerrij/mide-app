import React from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CardActionArea,
  Button,
  Avatar,
} from '@mui/material';
import {
  Assessment,
  Inventory,
  TransferWithinAStation,
  Warning,
  BarChart,
  Person,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { useNavigate } from 'react-router-dom';

const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    {
      title: 'Отчеты',
      icon: <Assessment sx={{ fontSize: 40, color: '#674fb6' }} />,
      path: '/reports',
      roles: [
        UserRole.OWNER,
        UserRole.ADMIN,
        UserRole.SENIOR_SELLER,
        UserRole.MENTOR,
        UserRole.SELLER,
        UserRole.ACCOUNTANT
      ],
      description: 'Создание отчетов о продажах',
      color: '#674fb6',
    },
    {
      title: 'Ревизии',
      icon: <Inventory sx={{ fontSize: 40, color: '#56b8d1' }} />,
      path: '/revisions',
      roles: [
        UserRole.OWNER,
        UserRole.ADMIN,
        UserRole.SENIOR_SELLER,
        UserRole.MENTOR,
        UserRole.SELLER,
      ],
      description: 'Учет товаров и ревизии',
      color: '#56b8d1',
    },
    {
      title: 'Перемещения',
      icon: <TransferWithinAStation sx={{ fontSize: 40, color: '#2a436d' }} />,
      path: '/movements',
      roles: [
        UserRole.OWNER,
        UserRole.ADMIN,
        UserRole.SENIOR_SELLER,
        UserRole.MENTOR,
        UserRole.SELLER,
      ],
      description: 'Перемещение товаров между продавцами',
      color: '#2a436d',
    },
    {
      title: 'Брак',
      icon: <Warning sx={{ fontSize: 40, color: '#ca0ec0' }} />,
      path: '/defects',
      roles: [
        UserRole.OWNER,
        UserRole.ADMIN,
        UserRole.SENIOR_SELLER,
        UserRole.MENTOR,
        UserRole.SELLER,
      ],
      description: 'Учет бракованного товара',
      color: '#ca0ec0',
    },
    {
      title: 'Персонал',
      icon: <Person sx={{ fontSize: 40, color: '#6d3f57' }} />,
      path: '/staff',
      roles: [UserRole.OWNER],
      description: 'Управление сотрудниками',
      color: '#6d3f57',
    },
    {
      title: 'Товары',
      icon: <Inventory sx={{ fontSize: 40, color: '#1976d2' }} />,
      path: '/products',
      roles: [UserRole.OWNER],
      description: 'Управление товарами и остатками',
      color: '#1976d2',
    }
  ];

  const getRoleName = (role: UserRole): string => {
    const names = {
      [UserRole.OWNER]: 'Владелец',
      [UserRole.ADMIN]: 'Администратор',
      [UserRole.SENIOR_SELLER]: 'Старший продавец',
      [UserRole.MENTOR]: 'Наставник',
      [UserRole.SELLER]: 'Продавец',
      [UserRole.ACCOUNTANT]: 'Продавец',
    };
    return names[role];
  };

  const filteredMenuItems = menuItems.filter((item) =>
    item.roles.includes(user?.role || UserRole.SELLER)
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="h4" component="h1" gutterBottom color="#2a0f35">
              Панель управления
            </Typography>
            <Typography variant="subtitle1" color="#4c5454">
              Добро пожаловать, {user?.username} ({getRoleName(user?.role || UserRole.SELLER)})
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }} sx={{ textAlign: { md: 'right' } }}>
            <Button
              variant="outlined"
              onClick={logout}
              sx={{
                borderColor: '#ca0ec0',
                color: '#ca0ec0',
                '&:hover': {
                  borderColor: '#950090',
                  backgroundColor: 'rgba(202, 14, 192, 0.04)',
                },
              }}
            >
              Выйти
            </Button>
          </Grid>
        </Grid>
      </Box>

      <Grid container spacing={3}>
        {filteredMenuItems.map((item, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
            <Card
              sx={{
                height: '100%',
                border: `2px solid ${item.color}20`,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 8px 24px ${item.color}30`,
                },
              }}
            >
              <CardActionArea
                onClick={() => navigate(item.path)}
                sx={{ height: '100%', p: 2 }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar
                      sx={{
                        bgcolor: `${item.color}15`,
                        width: 60,
                        height: 60,
                        mr: 2,
                      }}
                    >
                      {item.icon}
                    </Avatar>
                    <Box>
                      <Typography
                        variant="h6"
                        component="div"
                        sx={{ color: item.color, fontWeight: 600 }}
                      >
                        {item.title}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {item.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Статистика для административных ролей */}
      {(user?.role === UserRole.OWNER ||
        user?.role === UserRole.ADMIN ||
        user?.role === UserRole.SENIOR_SELLER) && (
        <Box sx={{ mt: 6 }}>
          <Typography variant="h5" gutterBottom color="#3f1f4b">
            Быстрый обзор
          </Typography>
          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid size={{ xs: 12, md: 3 }}>
              <Paper
                sx={{
                  p: 3,
                  textAlign: 'center',
                  backgroundColor: '#674fb610',
                  border: '1px solid #674fb630',
                }}
              >
                <Typography variant="h4" color="#674fb6">
                  24
                </Typography>
                <Typography variant="body2" color="#4c5454">
                  Активных продавцов
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Paper
                sx={{
                  p: 3,
                  textAlign: 'center',
                  backgroundColor: '#56b8d110',
                  border: '1px solid #56b8d130',
                }}
              >
                <Typography variant="h4" color="#56b8d1">
                  156
                </Typography>
                <Typography variant="body2" color="#4c5454">
                  Отчетов сегодня
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Paper
                sx={{
                  p: 3,
                  textAlign: 'center',
                  backgroundColor: '#ca0ec010',
                  border: '1px solid #ca0ec030',
                }}
              >
                <Typography variant="h4" color="#ca0ec0">
                  5
                </Typography>
                <Typography variant="body2" color="#4c5454">
                  Новых браков
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Paper
                sx={{
                  p: 3,
                  textAlign: 'center',
                  backgroundColor: '#2a436d10',
                  border: '1px solid #2a436d30',
                }}
              >
                <Typography variant="h4" color="#2a436d">
                  12
                </Typography>
                <Typography variant="body2" color="#4c5454">
                  Перемещений
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}
    </Container>
  );
};

export default DashboardPage;