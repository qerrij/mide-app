import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
  Button,
  Stack,
  Chip,
  LinearProgress,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  ShoppingBasket as ProductIcon,
  Category as CategoryIcon,
  AttachMoney as MoneyIcon,
  Numbers as NumbersIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { rejectionService } from '../api/rejectionService';
import {
  RejectionProductStats,
  RejectionUserStats,
  RejectionUserProductStats,
  RejectionDetailedStats,
  UserRole,
} from '../types';

const DefectStatsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [detailedStats, setDetailedStats] = useState<RejectionDetailedStats | null>(null);
  const [period, setPeriod] = useState('all_time');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  
  const [productStats, setProductStats] = useState<RejectionProductStats[]>([]);
  const [userStats, setUserStats] = useState<RejectionUserStats[]>([]);
  const [userProductStats, setUserProductStats] = useState<RejectionUserProductStats[]>([]);
  
  const [expandedUser, setExpandedUser] = useState<number | null>(null);

  const isAdminOrOwner = user?.role === UserRole.OWNER || user?.role === UserRole.ADMIN;
  const isSeniorSeller = user?.role === UserRole.SENIOR_SELLER;
  const isMentor = user?.role === UserRole.MENTOR;

  useEffect(() => {
    loadAllStats();
  }, [period, dateFrom, dateTo]);

  const loadAllStats = async () => {
    try {
      setLoading(true);
      
      // Загружаем общую статистику
      const detailed = await rejectionService.getDetailedStats(
        period,
        dateFrom || undefined,
        dateTo || undefined
      );
      setDetailedStats(detailed);
      
      // Загружаем статистику по товарам
      const productStatsData = await rejectionService.getProductStats(
        undefined,
        undefined,
        dateFrom || undefined,
        dateTo || undefined
      );
      setProductStats(productStatsData || []);
      
      // Загружаем статистику по пользователям
      const userStatsData = await rejectionService.getUserStats(
        undefined,
        dateFrom || undefined,
        dateTo || undefined
      );
      setUserStats(userStatsData || []);
      
      // Загружаем детальную статистику по пользователям и товарам
      const userProductStatsData = await rejectionService.getUserProductStats(
        undefined,
        undefined,
        undefined,
        undefined,
        dateFrom || undefined,
        dateTo || undefined
      );
      setUserProductStats(userProductStatsData || []);
      
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка загрузки статистики');
      setDetailedStats(null);
      setProductStats([]);
      setUserStats([]);
      setUserProductStats([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUserExpand = (userId: number) => {
    setExpandedUser(expandedUser === userId ? null : userId);
  };

  const formatCurrency = (value: number | undefined) => {
    const safeValue = value || 0;
    return safeValue.toLocaleString('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    });
  };

  const getFilteredUserStats = () => {
    if (isAdminOrOwner) {
      return userStats; // Админы и владельцы видят всех
    } else if (isSeniorSeller || isMentor) {
      // Старшие продавцы и менторы видят себя
      return userStats.filter(stat => stat.userId === user?.id);
    } else {
      // Обычные продавцы видят только себя
      return userStats.filter(stat => stat.userId === user?.id);
    }
  };

  const getUserProducts = (userId: number) => {
    return userProductStats.filter(stat => stat.userId === userId);
  };

  const getTopProducts = (limit: number = 5) => {
    return (productStats || [])
      .sort((a, b) => (b.totalRejected || 0) - (a.totalRejected || 0))
      .slice(0, limit);
  };

  const handleResetFilters = () => {
    setPeriod('all_time');
    setDateFrom('');
    setDateTo('');
  };

  const filteredUserStats = getFilteredUserStats();
  const topProducts = getTopProducts(10);

  return (
    <Box>
      {/* Заголовок */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate('/defects')}
        >
          Назад
        </Button>
        <Typography variant="h4" component="h1" align="center" sx={{ flexGrow: 1 }}>
          Статистика браков
        </Typography>
        <Box sx={{ width: 100 }} /> {/* Для выравнивания */}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Фильтры */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Период</InputLabel>
                <Select
                  value={period}
                  label="Период"
                  onChange={(e: SelectChangeEvent) => setPeriod(e.target.value)}
                >
                  <MenuItem value="all_time">За все время</MenuItem>
                  <MenuItem value="month">По месяцам</MenuItem>
                  <MenuItem value="year">По годам</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                label="Дата с"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                label="Дата по"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Stack direction="row" spacing={1}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<FilterIcon />}
                  onClick={handleResetFilters}
                >
                  Сбросить
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={loadAllStats}
                  disabled={loading}
                >
                  Обновить
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {loading ? (
        <Box sx={{ my: 4 }}>
          <LinearProgress />
          <Typography align="center" sx={{ mt: 2 }}>
            Загрузка статистики...
          </Typography>
        </Box>
      ) : (
        <>
          {/* Общая статистика */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Stack alignItems="center" spacing={1}>
                  <NumbersIcon color="primary" sx={{ fontSize: 40 }} />
                  <Typography variant="h5" fontWeight="bold">
                    {detailedStats?.totalRejectedItems || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" align="center">
                    Всего браковано товаров
                  </Typography>
                </Stack>
              </Paper>
            </Grid>
            
            <Grid size={{ xs: 6, sm: 3 }}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Stack alignItems="center" spacing={1}>
                  <MoneyIcon color="secondary" sx={{ fontSize: 40 }} />
                  <Typography variant="h5" fontWeight="bold" color="secondary">
                    {formatCurrency(detailedStats?.totalValue)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" align="center">
                    Общая стоимость брака
                  </Typography>
                </Stack>
              </Paper>
            </Grid>
            
            <Grid size={{ xs: 6, sm: 3 }}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Stack alignItems="center" spacing={1}>
                  <PersonIcon sx={{ fontSize: 40, color: '#4caf50' }} />
                  <Typography variant="h5" fontWeight="bold">
                    {detailedStats?.totalUsers || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" align="center">
                    Пользователей отправили брак
                  </Typography>
                </Stack>
              </Paper>
            </Grid>
            
            <Grid size={{ xs: 6, sm: 3 }}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Stack alignItems="center" spacing={1}>
                  <ProductIcon sx={{ fontSize: 40, color: '#ff9800' }} />
                  <Typography variant="h5" fontWeight="bold">
                    {detailedStats?.totalProducts || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" align="center">
                    Уникальных товаров в браке
                  </Typography>
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          {/* Топ товаров */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CategoryIcon /> Топ бракованных товаров
              </Typography>
              
              {topProducts.length > 0 ? (
                <Grid container spacing={2}>
                  {topProducts.map((product, index) => (
                    <Grid key={product.productId || index} size={{ xs: 12, sm: 6, lg: 4 }}>
                      <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                        <Stack spacing={1}>
                          <Typography variant="subtitle1" fontWeight="medium" noWrap>
                            {index + 1}. {product.productName || 'Неизвестный товар'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            SKU: {product.productSku || '—'}
                          </Typography>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Chip 
                              label={product.categoryName || 'Без категории'} 
                              size="small" 
                              variant="outlined" 
                            />
                            <Typography variant="body2">
                              {product.usersCount || 0} чел.
                            </Typography>
                          </Stack>
                          <Divider />
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Stack>
                              <Typography variant="body2" color="text.secondary">
                                Количество
                              </Typography>
                              <Typography variant="h6">
                                {product.totalRejected || 0} шт.
                              </Typography>
                            </Stack>
                            <Stack alignItems="flex-end">
                              <Typography variant="body2" color="text.secondary">
                                Стоимость
                              </Typography>
                              <Typography variant="h6" color="error">
                                {formatCurrency(product.totalValue)}
                              </Typography>
                            </Stack>
                          </Stack>
                        </Stack>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography color="text.secondary" align="center" sx={{ py: 3 }}>
                  Нет данных о бракованных товарах
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* Статистика по пользователям */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon /> Статистика по пользователям
              </Typography>
              
              {filteredUserStats.length > 0 ? (
                <Stack spacing={2}>
                  {filteredUserStats.map((userStat) => {
                    const userProducts = getUserProducts(userStat.userId);
                    const isExpanded = expandedUser === userStat.userId;
                    
                    return (
                      <Accordion 
                        key={userStat.userId}
                        expanded={isExpanded}
                        onChange={() => handleUserExpand(userStat.userId)}
                      >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Stack direction="row" alignItems="center" spacing={2} sx={{ width: '100%' }}>
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography variant="subtitle1">
                                {userStat.userName || `Пользователь #${userStat.userId}`}
                              </Typography>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Chip 
                                  label={userStat.userRole || 'Не указано'} 
                                  size="small" 
                                  variant="outlined" 
                                />
                                {userStat.clusterName && (
                                  <Chip 
                                    label={userStat.clusterName} 
                                    size="small" 
                                    color="default"
                                    variant="outlined"
                                  />
                                )}
                              </Stack>
                            </Box>
                            <Stack alignItems="flex-end" spacing={0.5}>
                              <Typography variant="body2" color="text.secondary">
                                Браков: {userStat.totalRejections || 0}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Товаров: {userStat.productsCount || 0}
                              </Typography>
                              <Typography variant="h6" color="error">
                                {formatCurrency(userStat.totalValue)}
                              </Typography>
                            </Stack>
                          </Stack>
                        </AccordionSummary>
                        
                        <AccordionDetails>
                          {userProducts.length > 0 ? (
                            <Grid container spacing={2}>
                              {userProducts.map((productStat) => (
                                <Grid key={`${userStat.userId}-${productStat.productId}`} size={{ xs: 12, sm: 6, md: 4 }}>
                                  <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Stack spacing={1}>
                                      <Typography variant="subtitle2" fontWeight="medium">
                                        {productStat.productName || 'Неизвестный товар'}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        SKU: {productStat.productSku || '—'}
                                      </Typography>
                                      {productStat.categoryName && (
                                        <Chip 
                                          label={productStat.categoryName} 
                                          size="small" 
                                          variant="outlined"
                                          sx={{ alignSelf: 'flex-start' }}
                                        />
                                      )}
                                      <Stack direction="row" justifyContent="space-between" alignItems="flex-end" sx={{ mt: 1 }}>
                                        <Stack>
                                          <Typography variant="body2" color="text.secondary">
                                            Количество
                                          </Typography>
                                          <Typography variant="h6">
                                            {productStat.totalRejected || 0} шт.
                                          </Typography>
                                        </Stack>
                                        <Stack alignItems="flex-end">
                                          <Typography variant="body2" color="text.secondary">
                                            Стоимость
                                          </Typography>
                                          <Typography variant="h6" color="error">
                                            {formatCurrency(productStat.totalValue)}
                                          </Typography>
                                        </Stack>
                                      </Stack>
                                    </Stack>
                                  </Paper>
                                </Grid>
                              ))}
                            </Grid>
                          ) : (
                            <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
                              Нет детальной информации по товарам
                            </Typography>
                          )}
                          
                          {/* Сводка по пользователю */}
                          <Paper variant="outlined" sx={{ p: 2, mt: 2, backgroundColor: 'grey.50' }}>
                            <Grid container spacing={2}>
                              <Grid size={{ xs: 6, sm: 3 }}>
                                <Stack alignItems="center">
                                  <Typography variant="caption" color="text.secondary">
                                    Всего браков
                                  </Typography>
                                  <Typography variant="h5" fontWeight="bold">
                                    {userStat.totalRejections || 0}
                                  </Typography>
                                </Stack>
                              </Grid>
                              <Grid size={{ xs: 6, sm: 3 }}>
                                <Stack alignItems="center">
                                  <Typography variant="caption" color="text.secondary">
                                    Уникальных товаров
                                  </Typography>
                                  <Typography variant="h5" fontWeight="bold">
                                    {userStat.productsCount || 0}
                                  </Typography>
                                </Stack>
                              </Grid>
                              <Grid size={{ xs: 6, sm: 3 }}>
                                <Stack alignItems="center">
                                  <Typography variant="caption" color="text.secondary">
                                    Общее количество
                                  </Typography>
                                  <Typography variant="h5" fontWeight="bold">
                                    {userProducts.reduce((sum, p) => sum + (p.totalRejected || 0), 0)} шт.
                                  </Typography>
                                </Stack>
                              </Grid>
                              <Grid size={{ xs: 6, sm: 3 }}>
                                <Stack alignItems="center">
                                  <Typography variant="caption" color="text.secondary">
                                    Общая стоимость
                                  </Typography>
                                  <Typography variant="h5" fontWeight="bold" color="error">
                                    {formatCurrency(userStat.totalValue)}
                                  </Typography>
                                </Stack>
                              </Grid>
                            </Grid>
                          </Paper>
                        </AccordionDetails>
                      </Accordion>
                    );
                  })}
                </Stack>
              ) : (
                <Typography color="text.secondary" align="center" sx={{ py: 3 }}>
                  {user?.role === UserRole.SELLER 
                    ? 'У вас еще нет данных о браках'
                    : 'Нет данных по пользователям'
                  }
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* Сводная информация */}
          {detailedStats && (
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Сводная информация
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Средняя стоимость брака на пользователя
                      </Typography>
                      <Typography variant="h6" color="error">
                        {detailedStats.totalUsers > 0 
                          ? formatCurrency((detailedStats.totalValue || 0) / detailedStats.totalUsers)
                          : formatCurrency(0)
                        }
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Среднее количество товаров на брак
                      </Typography>
                      <Typography variant="h6">
                        {detailedStats.totalUsers > 0 
                          ? Math.round((detailedStats.totalRejectedItems || 0) / detailedStats.totalUsers)
                          : 0
                        } шт.
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Средняя стоимость товара в браке
                      </Typography>
                      <Typography variant="h6" color="error">
                        {detailedStats.totalRejectedItems > 0 
                          ? formatCurrency((detailedStats.totalValue || 0) / detailedStats.totalRejectedItems)
                          : formatCurrency(0)
                        }
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Всего заявок на брак
                      </Typography>
                      <Typography variant="h6">
                        {userStats.reduce((sum, user) => sum + (user.totalRejections || 0), 0)}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </Box>
  );
};

export default DefectStatsPage;