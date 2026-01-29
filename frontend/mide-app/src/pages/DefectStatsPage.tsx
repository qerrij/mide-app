import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Alert,
  TextField,
  Stack,
  CircularProgress,
  Avatar,
  useMediaQuery,
  useTheme,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Person as PersonIcon,
  ShoppingBasket as ProductIcon,
  Category as CategoryIcon,
  AttachMoney as MoneyIcon,
  Numbers as NumbersIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Group as GroupIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Info as InfoIcon,
  CalendarToday as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Inventory as InventoryIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { rejectionService } from '../api/rejectionService';
import {
  CombinedRejectionStats,
  TeamRejectionStats,
  UserRole,
  RejectionUserProductStats,
} from '../types';

// Компонент для табов
const TabPanel = ({ children, value, index }: { children?: React.ReactNode; index: number; value: number }) => {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: { xs: 1, md: 2 } }}>{children}</Box>}
    </div>
  );
};

// Компонент для карточек статистики
const StatCard = ({ 
  title, 
  value, 
  icon, 
  color = '#2c3e50',
  bgColor = '#f8f9fa',
  dense = false 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ReactNode; 
  color?: string;
  bgColor?: string;
  dense?: boolean;
}) => (
  <Paper 
    sx={{ 
      p: dense ? 1.5 : 2,
      height: '100%',
      backgroundColor: bgColor,
      borderRadius: 2,
      border: '1px solid #e0e0e0',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      minHeight: dense ? 'auto' : 120,
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
      <Box sx={{ 
        color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        mr: 1,
        fontSize: dense ? '1rem' : '1.25rem'
      }}>
        {icon}
      </Box>
      <Typography 
        variant={dense ? "caption" : "body2"} 
        color="text.secondary"
        sx={{ 
          lineHeight: 1.2,
          flex: 1,
          fontSize: dense ? '0.75rem' : '0.875rem'
        }}
      >
        {title}
      </Typography>
    </Box>
    <Typography 
      variant={dense ? "h6" : "h5"} 
      fontWeight="600"
      color={color}
      sx={{ 
        textAlign: 'right',
        fontSize: dense ? '1rem' : '1.5rem',
        wordBreak: 'break-word',
        lineHeight: 1.2
      }}
    >
      {value}
    </Typography>
  </Paper>
);

// Компонент для карточки товара
const ProductCard = ({ product }: { product: RejectionUserProductStats }) => (
  <Paper 
    variant="outlined" 
    sx={{ 
      p: 1.5,
      borderRadius: 2,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    <Box sx={{ mb: 1 }}>
      <Typography 
        variant="subtitle2" 
        fontWeight={600}
        sx={{ 
          fontSize: '0.875rem',
          lineHeight: 1.3,
          mb: 0.5
        }}
      >
        {product.productName}
      </Typography>
      <Typography 
        variant="caption" 
        color="text.secondary"
        sx={{ fontSize: '0.75rem' }}
      >
        SKU: {product.productSku}
      </Typography>
    </Box>
    
    {product.categoryName && (
      <Chip 
        label={product.categoryName} 
        size="small" 
        sx={{ 
          backgroundColor: '#f5f5f5',
          color: '#666',
          fontSize: '0.75rem',
          height: 20,
          mb: 1.5,
          '& .MuiChip-label': {
            px: 1
          }
        }}
      />
    )}
    
    <Box sx={{ mt: 'auto' }}>
      <Grid container spacing={1}>
        <Grid size={{ xs: 6 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
              Количество
            </Typography>
            <Typography variant="body2" fontWeight={600} color="#2c3e50">
              {product.totalRejected} шт.
            </Typography>
          </Box>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
              Стоимость
            </Typography>
            <Typography variant="body2" fontWeight={600} color="#2c3e50">
              {product.totalValue?.toLocaleString('ru-RU')} ₽
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Box>
  </Paper>
);

// Компонент для подчиненного в аккордеоне
const SubordinateAccordion = ({ subordinate, index }: { subordinate: any, index: number }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Accordion 
      expanded={expanded}
      onChange={() => setExpanded(!expanded)}
      sx={{ 
        borderRadius: 2,
        mb: 2,
        '&:before': { display: 'none' },
        '&.Mui-expanded': {
          margin: 0,
          marginBottom: 2
        }
      }}
    >
      <AccordionSummary 
        expandIcon={<ExpandMoreIcon />}
        sx={{ 
          borderRadius: 2,
          backgroundColor: '#f8f9fa',
          '&:hover': { backgroundColor: '#e9ecef' },
          '&.Mui-expanded': {
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
          }
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          width: '100%',
          pr: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ 
              bgcolor: '#e9ecef', 
              color: '#2c3e50',
              width: 40,
              height: 40
            }}>
              <PersonIcon />
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight={600} color="#2c3e50">
                {subordinate.userName}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                {subordinate.userRole && (
                  <Chip 
                    label={subordinate.userRole} 
                    size="small" 
                    sx={{ 
                      backgroundColor: '#e9ecef', 
                      color: '#2c3e50',
                      fontSize: '0.75rem'
                    }}
                  />
                )}
                {subordinate.clusterName && (
                  <Chip 
                    label={`Куст: ${subordinate.clusterName}`}
                    size="small"
                    sx={{ 
                      backgroundColor: '#f8f9fa', 
                      color: '#666',
                      fontSize: '0.75rem'
                    }}
                  />
                )}
              </Box>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box sx={{ textAlign: 'center', minWidth: 80 }}>
              <Typography variant="caption" color="text.secondary">
                Браков
              </Typography>
              <Typography variant="h6" fontWeight={700} color={subordinate.totalRejections > 0 ? '#d32f2f' : '#2c3e50'}>
                {subordinate.totalRejections}
              </Typography>
            </Box>
            
            <Box sx={{ textAlign: 'center', minWidth: 80 }}>
              <Typography variant="caption" color="text.secondary">
                Стоимость
              </Typography>
              <Typography variant="h6" fontWeight={600} color="#2c3e50">
                {subordinate.totalValue?.toLocaleString('ru-RU')} ₽
              </Typography>
            </Box>
          </Box>
        </Box>
      </AccordionSummary>
      
      <AccordionDetails sx={{ pt: 3, pb: 3 }}>
        {/* Детали по товарам */}
        {subordinate.products.length > 0 ? (
          <>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 3 }}>
              Товары в браке ({subordinate.products.length})
            </Typography>
            <Grid container spacing={2}>
              {subordinate.products.map((product: RejectionUserProductStats) => (
                <Grid key={product.productId} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                  <ProductCard product={product} />
                </Grid>
              ))}
            </Grid>
          </>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <InventoryIcon sx={{ fontSize: 48, color: '#bdbdbd', mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Нет детальной информации по товарам
            </Typography>
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

const DefectStatsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  
  const [combinedStats, setCombinedStats] = useState<CombinedRejectionStats | null>(null);
  const [teamStats, setTeamStats] = useState<TeamRejectionStats | null>(null);
  
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [expandedUser, setExpandedUser] = useState<number | null>(null);

  const isAdminOrOwner = user?.role === UserRole.OWNER || user?.role === UserRole.ADMIN;
  const isSeniorSeller = user?.role === UserRole.SENIOR_SELLER;
  const isMentor = user?.role === UserRole.MENTOR;
  const hasSubordinates = isAdminOrOwner || isSeniorSeller || isMentor;

  useEffect(() => {
    loadStats();
  }, [tabValue, dateFrom, dateTo]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (tabValue === 0) {
        const stats = await rejectionService.getCombinedStats(
          undefined,
          dateFrom || undefined,
          dateTo || undefined
        );
        setCombinedStats(stats);
      } else if (tabValue === 1) {
        const stats = await rejectionService.getTeamDetailedStats(
          dateFrom || undefined,
          dateTo || undefined
        );
        setTeamStats(stats);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка загрузки статистики');
      setCombinedStats(null);
      setTeamStats(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDateRange = () => {
    if (!combinedStats?.summary.dateRange.from && !combinedStats?.summary.dateRange.to) {
      return 'За все время';
    }
    
    const from = combinedStats?.summary.dateRange.from 
      ? new Date(combinedStats.summary.dateRange.from).toLocaleDateString('ru-RU')
      : '';
    const to = combinedStats?.summary.dateRange.to
      ? new Date(combinedStats.summary.dateRange.to).toLocaleDateString('ru-RU')
      : 'по настоящее время';
    
    return `${from} ${to ? `— ${to}` : ''}`;
  };

  const handleResetFilters = () => {
    setDateFrom('');
    setDateTo('');
  };

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 3 } }}>
      {/* Заголовок и навигация */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'flex-start',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 2, sm: 3 },
          mb: 3 
        }}>
          <Button
            startIcon={<BackIcon />}
            onClick={() => navigate('/defects')}
            size={isMobile ? "small" : "medium"}
            sx={{ 
              color: '#2c3e50',
              alignSelf: { xs: 'flex-start', sm: 'center' },
              whiteSpace: 'nowrap',
              minWidth: 'auto',
              px: { xs: 1, sm: 2 }
            }}
          >
            Назад
          </Button>
          
          <Typography 
            variant="h4" 
            component="h1" 
            sx={{ 
              fontWeight: 600,
              color: '#2c3e50',
              textAlign: { xs: 'center', sm: 'left' },
              flex: 1,
              fontSize: { xs: '1.5rem', md: '2rem' }
            }}
          >
            Статистика браков
          </Typography>
        </Box>

        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3, borderRadius: 1 }}
            onClose={() => setError('')}
          >
            {error}
          </Alert>
        )}
      </Box>

      {/* Фильтры */}
      <Card sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#2c3e50' }}>
            Фильтры
          </Typography>
          
          <Grid container spacing={2} alignItems="flex-end">
            <Grid size={{ xs: 12, sm: 5, md: 3 }}>
              <TextField
                fullWidth
                label="Дата с"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
                InputProps={{
                  startAdornment: <CalendarIcon sx={{ mr: 1, color: '#666', fontSize: '1rem' }} />,
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 5, md: 3 }}>
              <TextField
                fullWidth
                label="Дата по"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
                InputProps={{
                  startAdornment: <CalendarIcon sx={{ mr: 1, color: '#666', fontSize: '1rem' }} />,
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 2, md: 6 }}>
              <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={handleResetFilters}
                  size="small"
                  sx={{ 
                    borderColor: '#e0e0e0',
                    color: '#666',
                    px: { xs: 1, sm: 2 }
                  }}
                >
                  Сбросить
                </Button>
                <Button
                  variant="contained"
                  onClick={loadStats}
                  disabled={loading}
                  size="small"
                  sx={{ 
                    backgroundColor: '#2c3e50',
                    color: 'white',
                    px: { xs: 1, sm: 2 },
                    '&:hover': {
                      backgroundColor: '#1a252f',
                    }
                  }}
                >
                  Применить
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Табы */}
      <Box sx={{ 
        display: 'flex', 
        gap: 1, 
        mb: 3,
        overflowX: 'auto',
        '&::-webkit-scrollbar': { display: 'none' }
      }}>
        <Button
          variant={tabValue === 0 ? 'contained' : 'outlined'}
          startIcon={<PersonIcon />}
          onClick={() => setTabValue(0)}
          sx={{
            flexShrink: 0,
            borderRadius: 1,
            px: { xs: 2, sm: 3 },
            py: 1,
            minWidth: { xs: 'auto', sm: 140 },
            ...(tabValue === 0 && {
              backgroundColor: '#2c3e50',
              color: 'white',
              '&:hover': {
                backgroundColor: '#1a252f',
              }
            }),
            ...(tabValue !== 0 && {
              borderColor: '#e0e0e0',
              color: '#666',
            })
          }}
        >
          Моя статистика
        </Button>
        
        {hasSubordinates && (
          <Button
            variant={tabValue === 1 ? 'contained' : 'outlined'}
            startIcon={<GroupIcon />}
            onClick={() => setTabValue(1)}
            sx={{
              flexShrink: 0,
              borderRadius: 1,
              px: { xs: 2, sm: 3 },
              py: 1,
              minWidth: { xs: 'auto', sm: 140 },
              ...(tabValue === 1 && {
                backgroundColor: '#2c3e50',
                color: 'white',
                '&:hover': {
                  backgroundColor: '#1a252f',
                }
              }),
              ...(tabValue !== 1 && {
                borderColor: '#e0e0e0',
                color: '#666',
              })
            }}
          >
            Подчиненные
          </Button>
        )}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
          <CircularProgress size={48} />
          <Typography variant="body1" sx={{ mt: 3, color: '#666' }}>
            Загрузка...
          </Typography>
        </Box>
      ) : (
        <>
          {/* Моя статистика */}
          <TabPanel value={tabValue} index={0}>
            {combinedStats ? (
              <Stack spacing={3}>
                {/* Информация о пользователе */}
                <Card sx={{ borderRadius: 2 }}>
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid size={{ xs: 12, md: 8 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                          <Avatar sx={{ 
                            bgcolor: '#e9ecef', 
                            color: '#2c3e50',
                            width: 48,
                            height: 48
                          }}>
                            <PersonIcon />
                          </Avatar>
                          <Box>
                            <Typography variant="h6" color="#2c3e50" sx={{ fontWeight: 600 }}>
                              {combinedStats.userStats.userName}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                              <Chip 
                                label={combinedStats.userStats.userRole || 'Роль не указана'} 
                                size="small" 
                                sx={{ 
                                  backgroundColor: '#e9ecef', 
                                  color: '#2c3e50',
                                  fontSize: '0.75rem'
                                }}
                              />
                              {combinedStats.userStats.clusterName && (
                                <Chip 
                                  label={`Куст: ${combinedStats.userStats.clusterName}`}
                                  size="small"
                                  sx={{ 
                                    backgroundColor: '#f8f9fa', 
                                    color: '#666',
                                    fontSize: '0.75rem'
                                  }}
                                />
                              )}
                            </Box>
                          </Box>
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Paper 
                          sx={{ 
                            p: 2,
                            borderRadius: 2,
                            backgroundColor: combinedStats.summary.hasRejections ? '#fff3e0' : '#e8f5e9',
                            border: `1px solid ${combinedStats.summary.hasRejections ? '#ffb74d' : '#c8e6c9'}`,
                          }}
                        >
                          <Stack direction="row" alignItems="center" spacing={1}>
                            {combinedStats.summary.hasRejections ? (
                              <>
                                <TrendingUpIcon sx={{ color: '#ed6c02', fontSize: '1.25rem' }} />
                                <Typography variant="body2" color="#ed6c02" sx={{ fontWeight: 500 }}>
                                  Есть брак в периоде
                                </Typography>
                              </>
                            ) : (
                              <>
                                <CheckCircleIcon sx={{ color: '#2e7d32', fontSize: '1.25rem' }} />
                                <Typography variant="body2" color="#2e7d32" sx={{ fontWeight: 500 }}>
                                  Брака нет
                                </Typography>
                              </>
                            )}
                          </Stack>
                        </Paper>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Основные метрики */}
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <StatCard
                      title="Всего браков"
                      value={combinedStats.userStats.totalRejections}
                      icon={<NumbersIcon />}
                      color="#2c3e50"
                    />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <StatCard
                      title="Товаров в браке"
                      value={combinedStats.userProductsStats.reduce((sum, p) => sum + p.totalRejected, 0)}
                      icon={<InventoryIcon />}
                      color="#2c3e50"
                    />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <StatCard
                      title="Уникальных товаров"
                      value={combinedStats.userStats.productsCount}
                      icon={<ProductIcon />}
                      color="#2c3e50"
                    />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <StatCard
                      title="Общая стоимость"
                      value={`${combinedStats.userStats.totalValue?.toLocaleString('ru-RU')} ₽`}
                      icon={<MoneyIcon />}
                      color="#2c3e50"
                    />
                  </Grid>
                </Grid>

                {/* Товары в браке */}
                {combinedStats.userProductsStats.length > 0 ? (
                  <Card sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                      <Typography variant="h6" sx={{ mb: 2, color: '#2c3e50' }}>
                        Товары в браке ({combinedStats.userProductsStats.length})
                      </Typography>
                      
                      <Grid container spacing={2}>
                        {combinedStats.userProductsStats.map((product) => (
                          <Grid key={product.productId} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                            <ProductCard product={product} />
                          </Grid>
                        ))}
                      </Grid>
                    </CardContent>
                  </Card>
                ) : (
                  <Card sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ p: { xs: 3, md: 4 }, textAlign: 'center' }}>
                      <InventoryIcon sx={{ fontSize: 48, color: '#bdbdbd', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        Нет товаров в браке
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        В выбранный период не было забракованных товаров
                      </Typography>
                    </CardContent>
                  </Card>
                )}

                {/* Информация о периоде */}
                <Box sx={{ 
                  p: 2, 
                  borderRadius: 2,
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #e0e0e0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <InfoIcon sx={{ color: '#666', fontSize: '1rem' }} />
                  <Typography variant="body2" color="text.secondary">
                    Период: <strong>{formatDateRange()}</strong>
                  </Typography>
                </Box>
              </Stack>
            ) : (
              <Card sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: { xs: 3, md: 4 }, textAlign: 'center' }}>
                  <WarningIcon sx={{ fontSize: 48, color: '#ff9800', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Нет данных
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Измените фильтры или выберите другой период
                  </Typography>
                </CardContent>
              </Card>
            )}
          </TabPanel>

          {/* Статистика подчиненных */}
          <TabPanel value={tabValue} index={1}>
            {teamStats ? (
              <Stack spacing={3}>
                {/* Общая статистика команды */}
                <Card sx={{ borderRadius: 2 }}>
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Typography variant="h6" sx={{ mb: 2, color: '#2c3e50' }}>
                      Статистика команды ({teamStats.totalStats.totalUsers})
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <StatCard
                          dense={isMobile}
                          title="Всего браков"
                          value={teamStats.totalStats.totalRejections}
                          icon={<NumbersIcon />}
                        />
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <StatCard
                          dense={isMobile}
                          title="Товаров в браке"
                          value={teamStats.totalStats.totalItems}
                          icon={<InventoryIcon />}
                        />
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <StatCard
                          dense={isMobile}
                          title="Уникальных товаров"
                          value={teamStats.totalStats.totalProducts}
                          icon={<ProductIcon />}
                        />
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <StatCard
                          dense={isMobile}
                          title="Общая стоимость"
                          value={`${teamStats.totalStats.totalValue?.toLocaleString('ru-RU')} ₽`}
                          icon={<MoneyIcon />}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Моя статистика в команде */}
                <Card sx={{ borderRadius: 2 }}>
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Typography variant="h6" sx={{ mb: 2, color: '#2c3e50' }}>
                      Моя статистика
                    </Typography>
                    
                    <Paper 
                      sx={{ 
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: '#f8f9fa',
                        border: '1px solid #e0e0e0',
                      }}
                    >
                      <Grid container spacing={2} alignItems="center">
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ 
                              bgcolor: '#2c3e50', 
                              color: 'white',
                              width: 48,
                              height: 48
                            }}>
                              <PersonIcon />
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle1" fontWeight={600}>
                                {teamStats.currentUser.userName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {teamStats.currentUser.userRole}
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                        
                        <Grid size={{ xs: 4, md: 2 }}>
                          <Stack alignItems="center">
                            <Typography variant="caption" color="text.secondary">
                              Браков
                            </Typography>
                            <Typography variant="h5" fontWeight={700} color={teamStats.currentUser.totalRejections > 0 ? '#d32f2f' : '#2c3e50'}>
                              {teamStats.currentUser.totalRejections}
                            </Typography>
                          </Stack>
                        </Grid>
                        
                        <Grid size={{ xs: 4, md: 2 }}>
                          <Stack alignItems="center">
                            <Typography variant="caption" color="text.secondary">
                              Товаров
                            </Typography>
                            <Typography variant="h5" fontWeight={600} color="#2c3e50">
                              {teamStats.currentUser.productsCount}
                            </Typography>
                          </Stack>
                        </Grid>
                        
                        <Grid size={{ xs: 4, md: 2 }}>
                          <Stack alignItems="flex-end">
                            <Typography variant="caption" color="text.secondary">
                              Стоимость
                            </Typography>
                            <Typography variant="h5" fontWeight={600} color="#2c3e50">
                              {teamStats.currentUser.totalValue?.toLocaleString('ru-RU')} ₽
                            </Typography>
                          </Stack>
                        </Grid>
                      </Grid>
                    </Paper>
                  </CardContent>
                </Card>

                {/* Статистика подчиненных */}
                {teamStats.subordinates.length > 0 ? (
                  <Card sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                      <Typography variant="h6" sx={{ mb: 3, color: '#2c3e50' }}>
                        Подчиненные ({teamStats.subordinates.length})
                      </Typography>
                      
                      <Stack spacing={0}>
                        {teamStats.subordinates.map((subordinate, index) => (
                          <SubordinateAccordion 
                            key={subordinate.userId}
                            subordinate={subordinate}
                            index={index}
                          />
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                ) : (
                  <Card sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ p: { xs: 3, md: 4 }, textAlign: 'center' }}>
                      <GroupIcon sx={{ fontSize: 48, color: '#bdbdbd', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        Нет подчиненных с браком
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        В выбранный период подчиненные не отправляли брак
                      </Typography>
                    </CardContent>
                  </Card>
                )}
              </Stack>
            ) : (
              <Card sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: { xs: 3, md: 4 }, textAlign: 'center' }}>
                  <WarningIcon sx={{ fontSize: 48, color: '#ff9800', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Нет данных по подчиненным
                  </Typography>
                </CardContent>
              </Card>
            )}
          </TabPanel>
        </>
      )}
    </Container>
  );
};

export default DefectStatsPage;