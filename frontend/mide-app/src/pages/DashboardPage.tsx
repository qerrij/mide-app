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
  ReceiptLong,
  MonetizationOn
} from '@mui/icons-material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
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
      roles: [        
        UserRole.OWNER,
        UserRole.ADMIN,
        UserRole.SENIOR_SELLER,
        UserRole.MENTOR,
        UserRole.SELLER,],
      description: 'Управление товарами и остатками',
      color: '#1976d2',
    },
    {
      title: 'Бухгалтерия',
      icon: <AccountBalanceIcon sx={{ fontSize: 40, color: '#1976d2' }} />,
      path: '/company',
      roles: [UserRole.OWNER, UserRole.ACCOUNTANT],
      description: 'Управление транзакциями',
      color: '#1976d2',
    },
    {
      title: 'Продажи',
      icon: <MonetizationOn sx={{ fontSize: 40, color: '#19d254' }} />,
      path: '/sold-products-stats',
      roles: [        
        UserRole.OWNER,
        UserRole.ADMIN,
        UserRole.SENIOR_SELLER,
        UserRole.MENTOR,
        UserRole.SELLER,],
      description: 'Продажи товаров',
      color: '#19d254',
    },
    {
      title: 'Долг',
      icon: <ReceiptLong sx={{ fontSize: 40, color: '#f44336' }} />,
      path: '/debts',
      roles: [        
        UserRole.OWNER,
        UserRole.ADMIN,
        UserRole.SENIOR_SELLER,
        UserRole.MENTOR,
        UserRole.SELLER,],
      description: 'Управление долгами',
      color: '#f44336',
    }

  ];

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
              Добро пожаловать, {user?.fullName}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }} sx={{ textAlign: { md: 'right' } }}>
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
    </Container>
  );
};

export default DashboardPage;