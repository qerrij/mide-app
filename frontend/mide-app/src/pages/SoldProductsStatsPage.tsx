import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Snackbar,
  InputAdornment,
  alpha,
  useTheme,
  useMediaQuery,
  Skeleton,
  Divider,
  Tooltip,
  Fade,
  Stack,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Tab,
  Tabs,
  Avatar,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  Inventory as ProductIcon,
  Category as CategoryIcon,
  LocationCity as CityIcon,
  CalendarToday as CalendarIcon,
  ShowChart as ChartIcon,
  EmojiEvents as TrophyIcon,
  Storefront as StoreIcon,
  Assessment as StatsIcon,
  Close as CloseIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { soldProductsStatsService } from '../api/soldProductsStatsService';
import {
  SoldProductsDashboardResponse,
  SellerSoldProductStats,
  SoldProductStats,
  CategorySoldProductStats,
  SoldProductDailyStats,
  UserRole,
  SoldProductComparisonMetric,
} from '../types';
import { format, subDays, subMonths, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// Цветовая палитра в стиле предоставленного референса
const colors = {
  primary: '#3f1f4b',
  primaryLight: '#9c7cae',
  primaryBg: '#f8f7fa',
  success: '#4caf50',
  warning: '#ff9800',
  danger: '#f44336',
  info: '#2196f3',
  gray: '#4c5454',
  lightGray: '#f5f3f6',
  border: '#e0e0e0',
  white: '#ffffff',
};

type PeriodType = 'day' | 'week' | 'month' | 'custom';

// Форматирование суммы
const formatAmount = (amount: number) => {
  const rubles = Math.floor(amount);
  const kopecks = Math.round((amount - rubles) * 100);
  
  if (kopecks > 0) {
    return `${rubles.toLocaleString('ru-RU')} ₽ ${kopecks.toString().padStart(2, '0')} коп.`;
  }
  return `${rubles.toLocaleString('ru-RU')} ₽`;
};

// Форматирование числа
const formatNumber = (num: number) => {
  return num.toLocaleString('ru-RU');
};

// Компонент карточки статистики
const StatsCard = ({ title, value, change, icon, color, subtitle }: {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}) => {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;
  
  return (
    <Card sx={{ 
      borderRadius: 8, 
      border: `1px solid ${colors.border}`,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <CardContent sx={{ p: 2.5, flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="body2" sx={{ color: colors.gray, fontWeight: 500 }}>
            {title}
          </Typography>
          <Avatar sx={{ bgcolor: `${color}15`, width: 44, height: 44 }}>
            {icon}
          </Avatar>
        </Box>
        <Typography variant="h4" component="div" fontWeight={700} sx={{ color: colors.primary, mb: 0.5 }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" sx={{ color: colors.gray, display: 'block', mb: 1 }}>
            {subtitle}
          </Typography>
        )}
        {change !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1 }}>
            {isPositive && <ArrowUpIcon sx={{ fontSize: 14, color: colors.success }} />}
            {isNegative && <ArrowDownIcon sx={{ fontSize: 14, color: colors.danger }} />}
            <Typography
              variant="caption"
              sx={{
                color: isPositive ? colors.success : isNegative ? colors.danger : colors.gray,
                fontWeight: 500,
              }}
            >
              {isPositive ? '+' : ''}{change?.toFixed(1)}%
            </Typography>
            <Typography variant="caption" sx={{ color: colors.gray }}>
              к предыдущему периоду
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// Компонент карточки продавца
const SellerCard = ({ seller, rank, onSelect }: { 
  seller: SellerSoldProductStats; 
  rank: number;
  onSelect: (seller: SellerSoldProductStats) => void;
}) => {
  const getRankIcon = () => {
    if (rank === 0) return <TrophyIcon sx={{ fontSize: 20, color: '#FFD700' }} />;
    if (rank === 1) return <TrophyIcon sx={{ fontSize: 20, color: '#C0C0C0' }} />;
    if (rank === 2) return <TrophyIcon sx={{ fontSize: 20, color: '#CD7F32' }} />;
    return <PersonIcon sx={{ fontSize: 18, color: colors.gray }} />;
  };

  return (
    <Card
      sx={{
        borderRadius: 8,
        border: `1px solid ${colors.border}`,
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          borderColor: colors.primary,
        },
      }}
      onClick={() => onSelect(seller)}
    >
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Avatar sx={{ bgcolor: `${colors.primary}10`, width: 44, height: 44 }}>
            {getRankIcon()}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ color: colors.primary }}>
              {seller.seller_name}
            </Typography>
            <Typography variant="caption" sx={{ color: colors.gray }}>
              {seller.seller_role === 'SELLER' ? 'Продавец' : 
               seller.seller_role === 'MENTOR' ? 'Наставник' :
               seller.seller_role === 'SENIOR_SELLER' ? 'Старший продавец' : seller.seller_role}
              {seller.seller_city && ` • ${seller.seller_city}`}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h6" fontWeight={700} sx={{ color: colors.success }}>
              {formatAmount(seller.total_revenue)}
            </Typography>
            <Typography variant="caption" sx={{ color: colors.gray }}>
              {formatNumber(seller.total_quantity)} шт.
            </Typography>
          </Box>
        </Box>
        <Divider sx={{ my: 1.5 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="caption" sx={{ color: colors.gray }}>Продаж</Typography>
            <Typography variant="body2" fontWeight={500}>{formatNumber(seller.sales_count)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: colors.gray }}>Средний чек</Typography>
            <Typography variant="body2" fontWeight={500}>{formatAmount(seller.average_revenue)}</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

// Компонент карточки товара
const ProductCard = ({ product, rank }: { product: SoldProductStats; rank: number }) => {
  return (
    <Card
      sx={{
        borderRadius: 8,
        border: `1px solid ${colors.border}`,
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        },
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
          <Avatar sx={{ bgcolor: `${colors.info}10`, width: 44, height: 44 }}>
            {rank < 3 ? <TrendingUpIcon sx={{ color: colors.warning }} /> : <ProductIcon />}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ color: colors.primary, mb: 0.5 }}>
              {product.product_name}
            </Typography>
            <Typography variant="caption" sx={{ color: colors.gray }}>
              SKU: {product.product_sku}
              {product.category && ` • ${product.category}`}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Box>
            <Typography variant="caption" sx={{ color: colors.gray }}>Продано</Typography>
            <Typography variant="body1" fontWeight={600}>{formatNumber(product.total_quantity)} шт.</Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" sx={{ color: colors.gray }}>Выручка</Typography>
            <Typography variant="body1" fontWeight={600} sx={{ color: colors.success }}>
              {formatAmount(product.total_revenue)}
            </Typography>
            <Typography variant="caption" sx={{ color: colors.gray }}>
              avg {formatAmount(product.average_price)}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

// Детальная статистика продавца
const SellerDetailModal = ({ 
  open, 
  onClose, 
  seller, 
  period,
  customStart,
  customEnd 
}: { 
  open: boolean; 
  onClose: () => void; 
  seller: SellerSoldProductStats | null;
  period: PeriodType;
  customStart: Date | null;
  customEnd: Date | null;
}) => {
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    if (open && seller) {
      loadDetail();
    }
  }, [open, seller, period, customStart, customEnd]);

  const loadDetail = async () => {
    if (!seller) return;
    setLoading(true);
    try {
      const params: any = { period };
      if (period === 'custom' && customStart && customEnd) {
        params.custom_start = format(customStart, 'yyyy-MM-dd');
        params.custom_end = format(customEnd, 'yyyy-MM-dd');
      }
      const data = await soldProductsStatsService.getSellerDetail(seller.seller_id, params);
      setDetail(data);
    } catch (err) {
      console.error('Error loading seller detail:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 8, overflow: 'hidden' }
      }}
    >
      <DialogTitle sx={{ 
        p: 2.5, 
        backgroundColor: colors.primaryBg,
        borderBottom: `1px solid ${colors.border}`
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight={600} sx={{ color: colors.primary }}>
              {seller?.seller_name}
            </Typography>
            <Typography variant="body2" sx={{ color: colors.gray }}>
              {seller?.seller_role === 'SELLER' ? 'Продавец' : 
               seller?.seller_role === 'MENTOR' ? 'Наставник' :
               seller?.seller_role === 'SENIOR_SELLER' ? 'Старший продавец' : seller?.seller_role}
              {seller?.seller_city && ` • ${seller.seller_city}`}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 2.5 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : detail ? (
          <Stack spacing={3}>
            {/* Статистика продавца */}
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <Paper sx={{ p: 2, borderRadius: 8, backgroundColor: colors.primaryBg }}>
                  <Typography variant="caption" sx={{ color: colors.gray }}>Продаж</Typography>
                  <Typography variant="h5" fontWeight={700} sx={{ color: colors.primary }}>
                    {formatNumber(detail.total_sales)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Paper sx={{ p: 2, borderRadius: 8, backgroundColor: colors.primaryBg }}>
                  <Typography variant="caption" sx={{ color: colors.gray }}>Товаров</Typography>
                  <Typography variant="h5" fontWeight={700} sx={{ color: colors.primary }}>
                    {formatNumber(detail.total_quantity)} шт.
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Paper sx={{ p: 2, borderRadius: 8, backgroundColor: colors.primaryBg }}>
                  <Typography variant="caption" sx={{ color: colors.gray }}>Выручка</Typography>
                  <Typography variant="h5" fontWeight={700} sx={{ color: colors.success }}>
                    {formatAmount(detail.total_revenue)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Paper sx={{ p: 2, borderRadius: 8, backgroundColor: colors.primaryBg }}>
                  <Typography variant="caption" sx={{ color: colors.gray }}>Средний чек</Typography>
                  <Typography variant="h5" fontWeight={700} sx={{ color: colors.primary }}>
                    {formatAmount(detail.average_revenue)}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Топ товары продавца */}
            <Box>
              <Typography variant="subtitle1" fontWeight={600} sx={{ color: colors.primary, mb: 2 }}>
                Топ товары
              </Typography>
              <Grid container spacing={1.5}>
                {detail.top_products?.slice(0, 5).map((product: any, idx: number) => (
                  <Grid size={{ xs: 12 }} key={product.product_id}>
                    <Card sx={{ borderRadius: 8, border: `1px solid ${colors.border}` }}>
                      <CardContent sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {product.product_name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: colors.gray }}>
                              {product.product_sku}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="body2" fontWeight={600}>
                              {formatNumber(product.total_quantity)} шт.
                            </Typography>
                            <Typography variant="caption" sx={{ color: colors.success }}>
                              {formatAmount(product.total_revenue)}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Динамика продавца */}
            {detail.daily_trend && detail.daily_trend.length > 0 && (
              <Box>
                <Typography variant="subtitle1" fontWeight={600} sx={{ color: colors.primary, mb: 2 }}>
                  Динамика продаж
                </Typography>
                <Box sx={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={detail.daily_trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fill: colors.gray, fontSize: 11 }}
                        tickFormatter={(value) => format(new Date(value), 'dd.MM')}
                      />
                      <YAxis tick={{ fill: colors.gray, fontSize: 11 }} />
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <Paper sx={{ p: 1, borderRadius: 2 }}>
                                <Typography variant="caption" sx={{ color: colors.gray }}>
                                  {format(new Date(payload[0].payload.date), 'dd MMMM yyyy', { locale: ru })}
                                </Typography>
                                <Typography variant="body2" fontWeight={600}>
                                  Выручка: {formatAmount(payload[0].value)}
                                </Typography>
                              </Paper>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="total_revenue" fill={colors.primary} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Box>
            )}
          </Stack>
        ) : null}
      </DialogContent>
      
      <DialogActions sx={{ p: 2.5, borderTop: `1px solid ${colors.border}` }}>
        <Button
          onClick={onClose}
          variant="contained"
          fullWidth
          sx={{
            borderRadius: 8,
            backgroundColor: colors.primary,
            textTransform: 'none',
            py: 1,
            '&:hover': { backgroundColor: '#2a0f35' },
          }}
        >
          Закрыть
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Модалка статистики по городам
const CitiesStatsModal = ({ 
  open, 
  onClose, 
  period,
  customStart,
  customEnd 
}: { 
  open: boolean; 
  onClose: () => void;
  period: PeriodType;
  customStart: Date | null;
  customEnd: Date | null;
}) => {
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      loadCities();
    }
  }, [open, period, customStart, customEnd]);

  const loadCities = async () => {
    setLoading(true);
    try {
      const params: any = { period };
      if (period === 'custom' && customStart && customEnd) {
        params.custom_start = format(customStart, 'yyyy-MM-dd');
        params.custom_end = format(customEnd, 'yyyy-MM-dd');
      }
      const data = await soldProductsStatsService.getCitiesStats(params);
      setCities(data.cities || []);
    } catch (err) {
      console.error('Error loading cities stats:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 8, overflow: 'hidden' }
      }}
    >
      <DialogTitle sx={{ 
        p: 2.5, 
        backgroundColor: colors.primaryBg,
        borderBottom: `1px solid ${colors.border}`
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={600} sx={{ color: colors.primary }}>
            Статистика по городам
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 2.5 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : cities.length > 0 ? (
          <Stack spacing={1.5}>
            {cities.map((city) => (
              <Card key={city.city} sx={{ borderRadius: 8, border: `1px solid ${colors.border}` }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ color: colors.primary }}>
                      {city.city}
                    </Typography>
                    <Chip 
                      label={`${city.active_sellers} продавцов`}
                      size="small"
                      sx={{ borderRadius: 4, backgroundColor: colors.primaryBg }}
                    />
                  </Box>
                  <Divider sx={{ my: 1.5 }} />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 4 }}>
                      <Typography variant="caption" sx={{ color: colors.gray }}>Продаж</Typography>
                      <Typography variant="body2" fontWeight={600}>{formatNumber(city.sales_count)}</Typography>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Typography variant="caption" sx={{ color: colors.gray }}>Товаров</Typography>
                      <Typography variant="body2" fontWeight={600}>{formatNumber(city.total_quantity)} шт.</Typography>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Typography variant="caption" sx={{ color: colors.gray }}>Выручка</Typography>
                      <Typography variant="body2" fontWeight={600} sx={{ color: colors.success }}>
                        {formatAmount(city.total_revenue)}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}
          </Stack>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography sx={{ color: colors.gray }}>Нет данных за выбранный период</Typography>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 2.5, borderTop: `1px solid ${colors.border}` }}>
        <Button
          onClick={onClose}
          variant="contained"
          fullWidth
          sx={{
            borderRadius: 8,
            backgroundColor: colors.primary,
            textTransform: 'none',
            py: 1,
            '&:hover': { backgroundColor: '#2a0f35' },
          }}
        >
          Закрыть
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Модалка всех продавцов
const AllSellersModal = ({ 
  open, 
  onClose, 
  sellers,
  onSelectSeller,
  period,
  customStart,
  customEnd 
}: { 
  open: boolean; 
  onClose: () => void;
  sellers: SellerSoldProductStats[];
  onSelectSeller: (seller: SellerSoldProductStats) => void;
  period: PeriodType;
  customStart: Date | null;
  customEnd: Date | null;
}) => {
  const [search, setSearch] = useState('');
  
  const filteredSellers = useMemo(() => {
    if (!search) return sellers;
    return sellers.filter(s => 
      s.seller_name.toLowerCase().includes(search.toLowerCase()) ||
      (s.seller_city && s.seller_city.toLowerCase().includes(search.toLowerCase()))
    );
  }, [sellers, search]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 8, overflow: 'hidden' }
      }}
    >
      <DialogTitle sx={{ 
        p: 2.5, 
        backgroundColor: colors.primaryBg,
        borderBottom: `1px solid ${colors.border}`
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight={600} sx={{ color: colors.primary }}>
            Все продавцы
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <TextField
          fullWidth
          size="small"
          placeholder="Поиск по имени или городу..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: colors.gray }} />
              </InputAdornment>
            ),
            sx: { borderRadius: 8, backgroundColor: colors.white }
          }}
        />
      </DialogTitle>
      
      <DialogContent sx={{ p: 2.5 }}>
        {filteredSellers.length > 0 ? (
          <Stack spacing={1.5}>
            {filteredSellers.map((seller, idx) => (
              <Card 
                key={seller.seller_id} 
                sx={{ 
                  borderRadius: 8, 
                  border: `1px solid ${colors.border}`,
                  cursor: 'pointer',
                  '&:hover': { borderColor: colors.primary, backgroundColor: colors.primaryBg }
                }}
                onClick={() => {
                  onSelectSeller(seller);
                  onClose();
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600} sx={{ color: colors.primary }}>
                        {seller.seller_name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: colors.gray }}>
                        {seller.seller_role === 'SELLER' ? 'Продавец' : 
                         seller.seller_role === 'MENTOR' ? 'Наставник' :
                         seller.seller_role === 'SENIOR_SELLER' ? 'Старший продавец' : seller.seller_role}
                        {seller.seller_city && ` • ${seller.seller_city}`}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="h6" fontWeight={700} sx={{ color: colors.success }}>
                        {formatAmount(seller.total_revenue)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: colors.gray }}>
                        {formatNumber(seller.total_quantity)} шт.
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography sx={{ color: colors.gray }}>Продавцы не найдены</Typography>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 2.5, borderTop: `1px solid ${colors.border}` }}>
        <Button
          onClick={onClose}
          variant="outlined"
          fullWidth
          sx={{
            borderRadius: 8,
            borderColor: colors.border,
            textTransform: 'none',
            py: 1,
            color: colors.gray,
            '&:hover': { borderColor: colors.primary, color: colors.primary }
          }}
        >
          Закрыть
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Основной компонент страницы
const SoldProductsStatsPage: React.FC = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isOwner = user?.role === UserRole.OWNER;
  const isManager = [UserRole.ADMIN, UserRole.SENIOR_SELLER, UserRole.MENTOR].includes(user?.role as UserRole);
  const isSeller = user?.role === UserRole.SELLER;
  const isAccountant = user?.role === UserRole.ACCOUNTANT;

  const [period, setPeriod] = useState<PeriodType>('month');
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [tempStart, setTempStart] = useState<Date | null>(null);
  const [tempEnd, setTempEnd] = useState<Date | null>(null);
  const [dashboardData, setDashboardData] = useState<SoldProductsDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeller, setSelectedSeller] = useState<SellerSoldProductStats | null>(null);
  const [sellerModalOpen, setSellerModalOpen] = useState(false);
  const [citiesModalOpen, setCitiesModalOpen] = useState(false);
  const [allSellersModalOpen, setAllSellersModalOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const getDateRange = useCallback((): { start: Date | null; end: Date | null } => {
    const now = new Date();
    switch (period) {
      case 'day':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'week':
        return { start: startOfWeek(now, { locale: ru }), end: endOfWeek(now, { locale: ru }) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'custom':
        return { start: customStart, end: customEnd };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }, [period, customStart, customEnd]);

  const loadData = useCallback(async () => {
    if (isAccountant) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params: { period: string; custom_start?: string; custom_end?: string } = { period };
      if (period === 'custom' && customStart && customEnd) {
        params.custom_start = format(customStart, 'yyyy-MM-dd');
        params.custom_end = format(customEnd, 'yyyy-MM-dd');
      }
      const data = await soldProductsStatsService.getDashboard(params);
      setDashboardData(data);
    } catch (error: any) {
      console.error('Error loading sold products stats:', error);
      setSnackbar({ open: true, message: error.response?.data?.detail || 'Ошибка загрузки данных', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [period, customStart, customEnd, isAccountant]);

  useEffect(() => {
    if (!isAccountant) {
      loadData();
    }
  }, [loadData, isAccountant]);

  const handlePeriodChange = (newPeriod: PeriodType) => {
    setPeriod(newPeriod);
    if (newPeriod !== 'custom') {
      setCustomStart(null);
      setCustomEnd(null);
      setTempStart(null);
      setTempEnd(null);
    }
  };

  const handleApplyCustomRange = () => {
    if (tempStart && tempEnd) {
      setCustomStart(tempStart);
      setCustomEnd(tempEnd);
    }
  };

  const handleResetCustomRange = () => {
    setTempStart(null);
    setTempEnd(null);
    setCustomStart(null);
    setCustomEnd(null);
  };

  const handleSelectSeller = (seller: SellerSoldProductStats) => {
    setSelectedSeller(seller);
    setSellerModalOpen(true);
  };

  const chartData = useMemo(() => {
    if (!dashboardData?.trend) return [];
    return dashboardData.trend.map((item) => ({
      date: format(new Date(item.date), isMobile ? 'dd.MM' : 'dd MMM', { locale: ru }),
      fullDate: item.date,
      revenue: item.total_revenue / 1000,
      quantity: item.total_quantity,
      sales: item.sales_count,
    }));
  }, [dashboardData?.trend, isMobile]);

  const pieData = useMemo(() => {
    if (!dashboardData?.categories) return [];
    const pieColors = [colors.success, colors.info, colors.warning, colors.primary, colors.danger];
    return dashboardData.categories.map((cat, idx) => ({
      name: cat.category,
      value: cat.total_revenue,
      color: pieColors[idx % pieColors.length],
    }));
  }, [dashboardData?.categories]);

  const getPeriodDisplayText = useCallback(() => {
    const { start, end } = getDateRange();
    if (period === 'day') return `за ${format(new Date(), 'dd MMMM yyyy', { locale: ru })}`;
    if (period === 'week') return `с ${format(start!, 'dd MMM', { locale: ru })} по ${format(end!, 'dd MMM', { locale: ru })}`;
    if (period === 'month') return format(start!, 'MMMM yyyy', { locale: ru });
    if (period === 'custom' && customStart && customEnd) {
      return `с ${format(customStart, 'dd.MM.yyyy')} по ${format(customEnd, 'dd.MM.yyyy')}`;
    }
    return 'за период';
  }, [period, customStart, customEnd, getDateRange]);

  // Для бухгалтера - нет доступа
  if (isAccountant) {
    return (
      <Container maxWidth="md" sx={{ mt: 2, mb: 2 }}>
        <Paper sx={{ borderRadius: 8, p: 4, textAlign: 'center' }}>
          <StatsIcon sx={{ fontSize: 48, color: colors.gray, mb: 2 }} />
          <Typography variant="h6" sx={{ color: colors.primary, mb: 1 }}>
            Нет доступа
          </Typography>
          <Typography variant="body2" sx={{ color: colors.gray }}>
            Бухгалтер не имеет доступа к статистике продаж
          </Typography>
        </Paper>
      </Container>
    );
  }

  // Для продавца - только свои продажи
  if (isSeller) {
    return (
      <Container maxWidth="lg" sx={{ mt: 2, mb: 2, px: { xs: 2, sm: 3 } }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" component="h1" fontWeight={600} sx={{ color: colors.primary, mb: 0.5 }}>
            Моя статистика продаж
          </Typography>
          <Typography variant="body2" sx={{ color: colors.gray }}>
            {getPeriodDisplayText()}
          </Typography>
        </Box>

        {/* Выбор периода */}
        <Paper sx={{ borderRadius: 8, p: 2, mb: 3, border: `1px solid ${colors.border}` }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {(['day', 'week', 'month', 'custom'] as PeriodType[]).map((p) => (
              <Chip
                key={p}
                label={p === 'day' ? 'День' : p === 'week' ? 'Неделя' : p === 'month' ? 'Месяц' : 'Свой'}
                onClick={() => handlePeriodChange(p)}
                sx={{
                  borderRadius: 8,
                  backgroundColor: period === p ? colors.primary : colors.white,
                  color: period === p ? colors.white : colors.gray,
                  border: period === p ? 'none' : `1px solid ${colors.border}`,
                  '&:hover': { backgroundColor: period === p ? colors.primary : colors.lightGray },
                }}
              />
            ))}
            {period === 'custom' && (
              <Box sx={{ display: 'flex', gap: 1, ml: 1, flexWrap: 'wrap' }}>
                <TextField
                  type="date"
                  size="small"
                  label="С"
                  value={ tempStart ? format(tempStart, 'yyyy-MM-dd') : ''}
                  onChange={(e) => setTempStart(e.target.value ? new Date(e.target.value) : null)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 140, '& .MuiOutlinedInput-root': { borderRadius: 6 } }}
                />
                <TextField
                  type="date"
                  size="small"
                  label="По"
                  value={tempEnd ? format(tempEnd, 'yyyy-MM-dd') : ''}
                  onChange={(e) => setTempEnd(e.target.value ? new Date(e.target.value) : null)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 140, '& .MuiOutlinedInput-root': { borderRadius: 6 } }}
                />
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleApplyCustomRange}
                  disabled={!tempStart || !tempEnd}
                  sx={{ borderRadius: 8, textTransform: 'none', backgroundColor: colors.primary }}
                >
                  Применить
                </Button>
                {(customStart || customEnd) && (
                  <IconButton size="small" onClick={handleResetCustomRange} sx={{ color: colors.gray }}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            )}
          </Box>
        </Paper>

        {/* Статистика продавца */}
        {loading ? (
          <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 8 }} />
        ) : dashboardData ? (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <StatsCard
                title="Моя выручка"
                value={formatAmount(dashboardData.overview.total_revenue)}
                icon={<StoreIcon sx={{ fontSize: 24, color: colors.success }} />}
                color={colors.success}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <StatsCard
                title="Продано"
                value={`${formatNumber(dashboardData.overview.total_quantity)} шт.`}
                icon={<ProductIcon sx={{ fontSize: 24, color: colors.primary }} />}
                color={colors.primary}
                subtitle={`${formatNumber(dashboardData.overview.total_sales_count)} продаж`}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Paper sx={{ borderRadius: 8, p: 2.5, border: `1px solid ${colors.border}` }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ color: colors.primary, mb: 2 }}>
                  Мои топ товары
                </Typography>
                <Grid container spacing={1.5}>
                  {dashboardData.top_products.slice(0, 5).map((product, idx) => (
                    <Grid size={{ xs: 12 }} key={product.product_id}>
                      <ProductCard product={product} rank={idx} />
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        ) : null}
      </Container>
    );
  }

  // Для руководителей и владельца - полная статистика
  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 2, px: { xs: 2, sm: 3 } }}>
      {/* Шапка */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" component="h1" fontWeight={600} sx={{ color: colors.primary, mb: 0.5 }}>
            Статистика продаж
          </Typography>
          <Typography variant="body2" sx={{ color: colors.gray }}>
            {getPeriodDisplayText()}
          </Typography>
        </Box>
        <IconButton
          onClick={() => loadData()}
          disabled={loading}
          sx={{ backgroundColor: colors.white, borderRadius: 8, width: 40, height: 40, border: `1px solid ${colors.border}` }}
        >
          <RefreshIcon sx={{ fontSize: 20, color: colors.primary }} />
        </IconButton>
      </Box>

      {/* Выбор периода */}
      <Paper sx={{ borderRadius: 8, p: 2, mb: 3, border: `1px solid ${colors.border}` }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {(['day', 'week', 'month', 'custom'] as PeriodType[]).map((p) => (
            <Chip
              key={p}
              label={p === 'day' ? 'День' : p === 'week' ? 'Неделя' : p === 'month' ? 'Месяц' : 'Свой'}
              onClick={() => handlePeriodChange(p)}
              sx={{
                borderRadius: 8,
                backgroundColor: period === p ? colors.primary : colors.white,
                color: period === p ? colors.white : colors.gray,
                border: period === p ? 'none' : `1px solid ${colors.border}`,
                '&:hover': { backgroundColor: period === p ? colors.primary : colors.lightGray },
              }}
            />
          ))}
          {period === 'custom' && (
            <Box sx={{ display: 'flex', gap: 1, ml: 1, flexWrap: 'wrap' }}>
              <TextField
                type="date"
                size="small"
                label="С"
                value={tempStart ? format(tempStart, 'yyyy-MM-dd') : ''}
                onChange={(e) => setTempStart(e.target.value ? new Date(e.target.value) : null)}
                sx={{ minWidth: 140, '& .MuiOutlinedInput-root': { borderRadius: 8 } }}
              />
              <TextField
                type="date"
                size="small"
                label="По"
                value={tempEnd ? format(tempEnd, 'yyyy-MM-dd') : ''}
                onChange={(e) => setTempEnd(e.target.value ? new Date(e.target.value) : null)}
                sx={{ minWidth: 140, '& .MuiOutlinedInput-root': { borderRadius: 8 } }}
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleApplyCustomRange}
                disabled={!tempStart || !tempEnd}
                sx={{ borderRadius: 8, textTransform: 'none', backgroundColor: colors.primary }}
              >
                Применить
              </Button>
              {(customStart || customEnd) && (
                <IconButton size="small" onClick={handleResetCustomRange} sx={{ color: colors.gray }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          )}
        </Box>
      </Paper>

      {loading ? (
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map((i) => (
            <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={i}>
              <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 8 }} />
            </Grid>
          ))}
          <Grid size={{ xs: 12 }}>
            <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 8 }} />
          </Grid>
        </Grid>
      ) : dashboardData ? (
        <>
          {/* Карточки общей статистики */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatsCard
                title="Общая выручка"
                value={formatAmount(dashboardData.overview.total_revenue)}
                change={dashboardData.overview.revenue_change_percent}
                icon={<TrendingUpIcon sx={{ fontSize: 24, color: colors.success }} />}
                color={colors.success}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatsCard
                title="Продаж"
                value={formatNumber(dashboardData.overview.total_sales_count)}
                change={dashboardData.overview.sales_change_percent}
                icon={<StoreIcon sx={{ fontSize: 24, color: colors.primary }} />}
                color={colors.primary}
                subtitle={`${formatNumber(dashboardData.overview.total_quantity)} шт. товаров`}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatsCard
                title="Средний чек"
                value={formatAmount(dashboardData.overview.average_revenue)}
                icon={<ChartIcon sx={{ fontSize: 24, color: colors.warning }} />}
                color={colors.warning}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatsCard
                title="Активных продавцов"
                value={formatNumber(dashboardData.overview.active_sellers)}
                icon={<PersonIcon sx={{ fontSize: 24, color: colors.info }} />}
                color={colors.info}
              />
            </Grid>
          </Grid>

          {/* График динамики */}
          <Paper sx={{ borderRadius: 8, p: 2.5, mb: 3, border: `1px solid ${colors.border}` }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ color: colors.primary, mb: 2 }}>
              Динамика продаж
            </Typography>
            <Box sx={{ height: isMobile ? 250 : 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={colors.primary} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: colors.gray, fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    interval={isMobile ? Math.floor(chartData.length / 6) : 0}
                  />
                  <YAxis 
                    tick={{ fill: colors.gray, fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `${(value).toFixed(0)}K`}
                  />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <Paper sx={{ p: 1.5, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                            <Typography variant="caption" sx={{ color: colors.gray }}>
                              {payload[0]?.payload?.fullDate && format(new Date(payload[0].payload.fullDate), 'dd MMMM yyyy', { locale: ru })}
                            </Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ color: colors.primary }}>
                              Выручка: {formatAmount(payload[0]?.value * 1000 || 0)}
                            </Typography>
                            <Typography variant="caption" sx={{ color: colors.gray }}>
                              Продаж: {payload[0]?.payload?.sales || 0} | Товаров: {payload[0]?.payload?.quantity || 0}
                            </Typography>
                          </Paper>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke={colors.primary} 
                    strokeWidth={2}
                    fill="url(#revenueGradient)" 
                    isAnimationActive={true}
                    dot={{ r: 4, fill: colors.primary, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: colors.primary, stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Paper>

          {/* Две колонки: топ продавцов и топ товаров */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ borderRadius: 8, p: 2.5, border: `1px solid ${colors.border}`, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrophyIcon sx={{ color: colors.warning }} />
                    <Typography variant="subtitle1" fontWeight={600} sx={{ color: colors.primary }}>
                      Топ продавцов
                    </Typography>
                  </Box>
                  {dashboardData.top_sellers.length > 5 && (
                    <Button
                      size="small"
                      onClick={() => setAllSellersModalOpen(true)}
                      sx={{ borderRadius: 8, textTransform: 'none', color: colors.primary }}
                    >
                      Все продавцы
                    </Button>
                  )}
                </Box>
                <Stack spacing={1.5}>
                  {dashboardData.top_sellers.slice(0, 5).map((seller, idx) => (
                    <SellerCard key={seller.seller_id} seller={seller} rank={idx} onSelect={handleSelectSeller} />
                  ))}
                  {dashboardData.top_sellers.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography sx={{ color: colors.gray }}>Нет данных за выбранный период</Typography>
                    </Box>
                  )}
                </Stack>
              </Paper>
            </Grid>
            
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ borderRadius: 8, p: 2.5, border: `1px solid ${colors.border}`, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <TrendingUpIcon sx={{ color: colors.danger }} />
                  <Typography variant="subtitle1" fontWeight={600} sx={{ color: colors.primary }}>
                    Топ товаров
                  </Typography>
                </Box>
                <Stack spacing={1.5}>
                  {dashboardData.top_products.slice(0, 5).map((product, idx) => (
                    <ProductCard key={product.product_id} product={product} rank={idx} />
                  ))}
                  {dashboardData.top_products.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography sx={{ color: colors.gray }}>Нет данных за выбранный период</Typography>
                    </Box>
                  )}
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          {/* Категории и города */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ borderRadius: 8, p: 2.5, border: `1px solid ${colors.border}`, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <CategoryIcon sx={{ color: colors.info }} />
                  <Typography variant="subtitle1" fontWeight={600} sx={{ color: colors.primary }}>
                    Продажи по категориям
                  </Typography>
                </Box>
                {pieData.length > 0 ? (
                  <>
                    <Box sx={{ height: 220 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <Paper sx={{ p: 1, borderRadius: 8 }}>
                                    <Typography variant="body2" fontWeight={600}>{payload[0].name}</Typography>
                                    <Typography variant="caption" sx={{ color: colors.gray }}>
                                      {formatAmount(payload[0].value)}
                                    </Typography>
                                  </Paper>
                                );
                              }
                              return null;
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                    <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
                      {pieData.map((item) => (
                        <Chip
                          key={item.name}
                          label={`${item.name} (${((item.value / pieData.reduce((sum, i) => sum + i.value, 0)) * 100).toFixed(0)}%)`}
                          size="small"
                          sx={{ borderRadius: 6, backgroundColor: `${item.color}10`, color: item.color }}
                        />
                      ))}
                    </Stack>
                  </>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography sx={{ color: colors.gray }}>Нет данных</Typography>
                  </Box>
                )}
              </Paper>
            </Grid>
            
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ borderRadius: 8, p: 2.5, border: `1px solid ${colors.border}`, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CityIcon sx={{ color: colors.info }} />
                    <Typography variant="subtitle1" fontWeight={600} sx={{ color: colors.primary }}>
                      Продажи по городам
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    onClick={() => setCitiesModalOpen(true)}
                    sx={{ borderRadius: 8, textTransform: 'none', color: colors.primary }}
                  >
                    Подробнее
                  </Button>
                </Box>
                {(() => {
                  const cityMap = new Map<string, { revenue: number; sellers: Set<number>; quantity: number }>();
                  dashboardData.top_sellers.forEach(seller => {
                    if (seller.seller_city) {
                      const existing = cityMap.get(seller.seller_city);
                      if (existing) {
                        existing.revenue += seller.total_revenue;
                        existing.quantity += seller.total_quantity;
                        existing.sellers.add(seller.seller_id);
                      } else {
                        cityMap.set(seller.seller_city, {
                          revenue: seller.total_revenue,
                          quantity: seller.total_quantity,
                          sellers: new Set([seller.seller_id]),
                        });
                      }
                    }
                  });
                  
                  const cities = Array.from(cityMap.entries())
                    .map(([city, data]) => ({ city, ...data }))
                    .sort((a, b) => b.revenue - a.revenue)
                    .slice(0, 5);
                  
                  return cities.length > 0 ? (
                    <Stack spacing={1.5}>
                      {cities.map((city) => (
                        <Card key={city.city} sx={{ borderRadius: 8, border: `1px solid ${colors.border}` }}>
                          <CardContent sx={{ p: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                              <Typography variant="subtitle2" fontWeight={600} sx={{ color: colors.primary }}>
                                {city.city}
                              </Typography>
                              <Chip 
                                label={`${city.sellers.size} продавц.`}
                                size="small"
                                sx={{ borderRadius: 4, backgroundColor: colors.primaryBg }}
                              />
                            </Box>
                            <Divider sx={{ my: 1 }} />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Box>
                                <Typography variant="caption" sx={{ color: colors.gray }}>Продано</Typography>
                                <Typography variant="body2" fontWeight={500}>{formatNumber(city.quantity)} шт.</Typography>
                              </Box>
                              <Box sx={{ textAlign: 'right' }}>
                                <Typography variant="caption" sx={{ color: colors.gray }}>Выручка</Typography>
                                <Typography variant="body2" fontWeight={600} sx={{ color: colors.success }}>
                                  {formatAmount(city.revenue)}
                                </Typography>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography sx={{ color: colors.gray }}>Нет данных</Typography>
                    </Box>
                  );
                })()}
              </Paper>
            </Grid>
          </Grid>
        </>
      ) : null}

      {/* Модалки */}
      <SellerDetailModal
        open={sellerModalOpen}
        onClose={() => setSellerModalOpen(false)}
        seller={selectedSeller}
        period={period}
        customStart={customStart}
        customEnd={customEnd}
      />
      
      <CitiesStatsModal
        open={citiesModalOpen}
        onClose={() => setCitiesModalOpen(false)}
        period={period}
        customStart={customStart}
        customEnd={customEnd}
      />
      
      <AllSellersModal
        open={allSellersModalOpen}
        onClose={() => setAllSellersModalOpen(false)}
        sellers={dashboardData?.top_sellers || []}
        onSelectSeller={handleSelectSeller}
        period={period}
        customStart={customStart}
        customEnd={customEnd}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert 
          severity={snackbar.severity}
          sx={{ 
            borderRadius: 8,
            backgroundColor: snackbar.severity === 'success' ? colors.success : colors.danger,
            color: '#fff',
            '& .MuiAlert-icon': { color: '#fff' }
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default SoldProductsStatsPage;