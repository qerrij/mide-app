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
  CircularProgress,
  Alert,
  Snackbar,
  useTheme,
  useMediaQuery,
  Skeleton,
  Stack,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Drawer,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  Inventory as ProductIcon,
  Category as CategoryIcon,
  ShowChart as ChartIcon,
  Storefront as StoreIcon,
  Assessment as StatsIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { soldProductsStatsService } from '../api/soldProductsStatsService';
import { UserRole } from '../types';
import { format, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

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

const formatAmount = (amount: number) => {
  return amount.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const formatNumber = (num: number) => num.toLocaleString('ru-RU');

const formatDateRussian = (date: Date, formatStr: string) => {
  return format(date, formatStr, { locale: ru });
};

const StatsCard = ({ title, value, icon, color, subtitle }: any) => {
  return (
    <Card sx={{ borderRadius: 8, border: `1px solid ${colors.border}`, height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="body2" sx={{ color: colors.gray, fontWeight: 500 }}>{title}</Typography>
          <Avatar sx={{ bgcolor: `${color}15`, width: 44, height: 44 }}>{icon}</Avatar>
        </Box>
        <Typography variant="h4" fontWeight={700} sx={{ color: colors.primary, mb: 0.5 }}>{value}</Typography>
        {subtitle && <Typography variant="caption" sx={{ color: colors.gray, display: 'block' }}>{subtitle}</Typography>}
      </CardContent>
    </Card>
  );
};

// Модалка всех продавцов
const AllSellersModal = ({ open, onClose, sellers, total, page, onPageChange, onSelectSeller }: any) => {
  const sellersPerPage = 10;
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 8 } }}>
      <DialogTitle sx={{ p: 2.5, backgroundColor: colors.primaryBg, borderBottom: `1px solid ${colors.border}` }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={600}>Все продавцы ({total})</Typography>
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 2.5 }}>
        <Stack spacing={1.5}>
          {sellers.map((seller: any) => (
            <Card key={seller.seller_id} sx={{ borderRadius: 8, border: `1px solid ${colors.border}`, cursor: 'pointer',
              '&:hover': { borderColor: colors.primary, backgroundColor: colors.primaryBg } }}
              onClick={() => { onSelectSeller(seller); onClose(); }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600}>{seller.seller_name}</Typography>
                    <Typography variant="caption" sx={{ color: colors.gray }}>{seller.seller_city || 'Город не указан'}</Typography>
                  </Box>
                  <Typography variant="h6" fontWeight={700} sx={{ color: colors.success }}>{formatAmount(seller.total_revenue)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Typography variant="caption" sx={{ color: colors.gray }}>Продаж: {formatNumber(seller.sales_count)}</Typography>
                  <Typography variant="caption" sx={{ color: colors.gray }}>Товаров: {formatNumber(seller.total_quantity)} шт.</Typography>
                </Box>
              </CardContent>
            </Card>
          ))}
          {sellers.length === 0 && <Typography sx={{ textAlign: 'center', py: 4, color: colors.gray }}>Нет данных</Typography>}
        </Stack>
        {total > sellersPerPage && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination count={Math.ceil(total / sellersPerPage)} page={page} onChange={(_, p) => onPageChange(p)} />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2.5, borderTop: `1px solid ${colors.border}` }}>
        <Button onClick={onClose} variant="contained" fullWidth sx={{ borderRadius: 8, backgroundColor: colors.primary, textTransform: 'none' }}>
          Закрыть
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Модалка всех товаров
const AllProductsModal = ({ open, onClose, products }: any) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 8 } }}>
      <DialogTitle sx={{ p: 2.5, backgroundColor: colors.primaryBg, borderBottom: `1px solid ${colors.border}` }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={600}>Все товары ({products.length})</Typography>
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 2.5 }}>
        <Stack spacing={1.5}>
          {products.map((product: any) => (
            <Card key={product.product_id} sx={{ borderRadius: 8, border: `1px solid ${colors.border}` }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{product.product_name}</Typography>
                    <Typography variant="caption" sx={{ color: colors.gray }}>SKU: {product.product_sku}</Typography>
                    {product.category && <Typography variant="caption" sx={{ color: colors.gray, display: 'block' }}>{product.category}</Typography>}
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" fontWeight={600}>{formatNumber(product.total_quantity)} шт.</Typography>
                    <Typography variant="caption" sx={{ color: colors.success }}>{formatAmount(product.total_revenue)}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, borderTop: `1px solid ${colors.border}` }}>
        <Button onClick={onClose} variant="contained" fullWidth sx={{ borderRadius: 8, backgroundColor: colors.primary, textTransform: 'none' }}>
          Закрыть
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Модалка деталей продавца
const SellerDetailModal = ({ open, onClose, sellerId, period, customStart, customEnd }: any) => {
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    if (open && sellerId) {
      loadDetail();
    }
  }, [open, sellerId, period, customStart, customEnd]);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const params: any = { period };
      if (period === 'custom' && customStart && customEnd) {
        params.custom_start = format(customStart, 'yyyy-MM-dd');
        params.custom_end = format(customEnd, 'yyyy-MM-dd');
      }
      const data = await soldProductsStatsService.getSellerDetail(sellerId, params);
      setDetail(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 8 } }}>
      <DialogTitle sx={{ p: 2.5, backgroundColor: colors.primaryBg, borderBottom: `1px solid ${colors.border}` }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight={600} sx={{ color: colors.primary }}>{detail?.seller_name}</Typography>
            <Typography variant="body2" sx={{ color: colors.gray }}>
              {detail?.seller_role === 'SELLER' ? 'Продавец' : 
               detail?.seller_role === 'MENTOR' ? 'Наставник' :
               detail?.seller_role === 'SENIOR_SELLER' ? 'Старший продавец' : detail?.seller_role}
              {detail?.seller_city && ` • ${detail.seller_city}`}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 2.5 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        ) : detail ? (
          <Stack spacing={3}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <Paper sx={{ p: 2, borderRadius: 8, backgroundColor: colors.primaryBg }}>
                  <Typography variant="caption" sx={{ color: colors.gray }}>Продаж</Typography>
                  <Typography variant="h5" fontWeight={700}>{formatNumber(detail.total_sales)}</Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Paper sx={{ p: 2, borderRadius: 8, backgroundColor: colors.primaryBg }}>
                  <Typography variant="caption" sx={{ color: colors.gray }}>Товаров</Typography>
                  <Typography variant="h5" fontWeight={700}>{formatNumber(detail.total_quantity)} шт.</Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Paper sx={{ p: 2, borderRadius: 8, backgroundColor: colors.primaryBg }}>
                  <Typography variant="caption" sx={{ color: colors.gray }}>Выручка</Typography>
                  <Typography variant="h5" fontWeight={700} sx={{ color: colors.success }}>{formatAmount(detail.total_revenue)}</Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Paper sx={{ p: 2, borderRadius: 8, backgroundColor: colors.primaryBg }}>
                  <Typography variant="caption" sx={{ color: colors.gray }}>Средний чек</Typography>
                  <Typography variant="h5" fontWeight={700}>{formatAmount(detail.average_revenue)}</Typography>
                </Paper>
              </Grid>
            </Grid>

            {detail.top_products?.length > 0 && (
              <Box>
                <Typography variant="subtitle1" fontWeight={600} sx={{ color: colors.primary, mb: 2 }}>Топ товары</Typography>
                <Stack spacing={1.5}>
                  {detail.top_products.map((product: any) => (
                    <Card key={product.product_id} sx={{ borderRadius: 8, border: `1px solid ${colors.border}` }}>
                      <CardContent sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>{product.product_name}</Typography>
                            <Typography variant="caption" sx={{ color: colors.gray }}>{product.product_sku}</Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="body2" fontWeight={600}>{formatNumber(product.total_quantity)} шт.</Typography>
                            <Typography variant="caption" sx={{ color: colors.success }}>{formatAmount(product.total_revenue)}</Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Box>
            )}

            {detail.daily_trend?.length > 0 && (
              <Box>
                <Typography variant="subtitle1" fontWeight={600} sx={{ color: colors.primary, mb: 2 }}>Динамика продаж</Typography>
                <Box sx={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={detail.daily_trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                      <XAxis dataKey="date" tickFormatter={(v) => formatDateRussian(parseISO(v), 'dd.MM')} />
                      <YAxis tickFormatter={(v) => formatAmount(v)} />
                      <RechartsTooltip content={({ active, payload }) => active && payload?.length ? (
                        <Paper sx={{ p: 1 }}>
                          <Typography variant="caption">{formatDateRussian(parseISO(payload[0].payload.date), 'dd MMMM yyyy')}</Typography>
                          <Typography variant="body2" fontWeight={600}>Выручка: {formatAmount(payload[0].value)}</Typography>
                        </Paper>
                      ) : null} />
                      <Area type="monotone" dataKey="total_revenue" stroke={colors.primary} fill={`${colors.primary}20`} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </Box>
            )}
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ p: 2.5, borderTop: `1px solid ${colors.border}` }}>
        <Button onClick={onClose} variant="contained" fullWidth sx={{ borderRadius: 8, backgroundColor: colors.primary, textTransform: 'none' }}>
          Закрыть
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Компонент для OWNER
const OwnerStatsView: React.FC = () => {
  const [period, setPeriod] = useState<PeriodType>('month');
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [tempStart, setTempStart] = useState<string>('');
  const [tempEnd, setTempEnd] = useState<string>('');
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [cities, setCities] = useState<{ id: number; name: string }[]>([]);
  
  const [overview, setOverview] = useState<any>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [sellersTotal, setSellersTotal] = useState(0);
  const [sellersPage, setSellersPage] = useState(1);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [selectedSellerId, setSelectedSellerId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [allSellersModalOpen, setAllSellersModalOpen] = useState(false);
  const [allProductsModalOpen, setAllProductsModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const sellersPerPage = 10;
  const displayLimit = 3;

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 900);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const loadCities = useCallback(async () => {
    try {
      const data = await soldProductsStatsService.getCities();
      setCities(data.cities || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { period };
      if (period === 'custom' && customStart && customEnd) {
        params.custom_start = format(customStart, 'yyyy-MM-dd');
        params.custom_end = format(customEnd, 'yyyy-MM-dd');
      }
      if (selectedCityId) params.city_id = selectedCityId;
      
      params.limit = sellersPerPage;
      params.offset = (sellersPage - 1) * sellersPerPage;

      const [overviewRes, trendRes, sellersRes, productsRes, categoriesRes] = await Promise.all([
        soldProductsStatsService.getOverview(params),
        soldProductsStatsService.getTrend(params),
        soldProductsStatsService.getSellers({ ...params, limit: 100 }), // берем всех для модалки
        soldProductsStatsService.getTopProducts({ ...params, limit: 100 }), // берем всех для модалки
        soldProductsStatsService.getCategoriesStats(params),
      ]);
      
      setOverview(overviewRes);
      setTrend(trendRes?.daily_stats || []);
      setSellers(sellersRes?.sellers || []);
      setSellersTotal(sellersRes?.total_count || 0);
      setTopProducts(productsRes?.products || []);
      setCategories(categoriesRes?.categories || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [period, customStart, customEnd, selectedCityId, sellersPage]);

  useEffect(() => {
    loadCities();
  }, [loadCities]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handlePeriodChange = (newPeriod: PeriodType) => {
    setPeriod(newPeriod);
    if (newPeriod !== 'custom') {
      setCustomStart(null);
      setCustomEnd(null);
      setTempStart('');
      setTempEnd('');
    }
    setSellersPage(1);
  };

  const handleApplyCustomRange = () => {
    if (tempStart && tempEnd) {
      setCustomStart(parseISO(tempStart));
      setCustomEnd(parseISO(tempEnd));
      setSellersPage(1);
    }
  };

  const handleCityChange = (cityId: number | null) => {
    setSelectedCityId(cityId);
    setSellersPage(1);
  };

  const chartData = useMemo(() => trend.map((item: any) => ({
    date: formatDateRussian(parseISO(item.date), 'dd.MM'),
    fullDate: item.date,
    revenue: item.total_revenue,
  })), [trend]);

  const pieData = useMemo(() => {
    const pieColors = [colors.success, colors.info, colors.warning, colors.primary, colors.danger];
    return categories.map((cat, idx) => ({ name: cat.category, value: cat.total_revenue, color: pieColors[idx % pieColors.length] }));
  }, [categories]);

  const displayedSellers = sellers.slice(0, displayLimit);
  const displayedProducts = topProducts.slice(0, displayLimit);
  const hasMoreSellers = sellers.length > displayLimit;
  const hasMoreProducts = topProducts.length > displayLimit;

  const getPeriodText = () => {
    if (period === 'day') return formatDateRussian(new Date(), 'dd MMMM yyyy');
    if (period === 'week') {
      const start = startOfWeek(new Date(), { locale: ru });
      const end = endOfWeek(new Date(), { locale: ru });
      return `${formatDateRussian(start, 'dd MMM')} - ${formatDateRussian(end, 'dd MMM')}`;
    }
    if (period === 'month') return formatDateRussian(new Date(), 'MMMM yyyy');
    if (period === 'custom' && customStart && customEnd) {
      return `${formatDateRussian(customStart, 'dd.MM.yyyy')} - ${formatDateRussian(customEnd, 'dd.MM.yyyy')}`;
    }
    return 'за период';
  };

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={600} sx={{ color: colors.primary }}>Статистика продаж</Typography>
        <Typography variant="body2" sx={{ color: colors.gray }}>{getPeriodText()}</Typography>
      </Box>

      {/* Панель фильтров */}
      <Paper sx={{ borderRadius: 8, p: 2, mb: 3, border: `1px solid ${colors.border}` }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {(['day', 'week', 'month', 'custom'] as PeriodType[]).map((p) => (
              <Chip key={p} label={p === 'day' ? 'День' : p === 'week' ? 'Неделя' : p === 'month' ? 'Месяц' : 'Свой'}
                onClick={() => handlePeriodChange(p)} sx={{ borderRadius: 8, backgroundColor: period === p ? colors.primary : colors.white,
                color: period === p ? colors.white : colors.gray, border: `1px solid ${colors.border}` }} />
            ))}
          </Box>
          
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Город</InputLabel>
            <Select value={selectedCityId || ''} onChange={(e) => handleCityChange(e.target.value || null)} label="Город">
              <MenuItem value="">Все города</MenuItem>
              {cities.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </Select>
          </FormControl>

          {period === 'custom' && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <TextField
                type="date"
                size="small"
                value={tempStart}
                onChange={(e) => setTempStart(e.target.value)}
                sx={{ minWidth: 150 }}
              />
              <TextField
                type="date"
                size="small"
                value={tempEnd}
                onChange={(e) => setTempEnd(e.target.value)}
                sx={{ minWidth: 150 }}
              />
              <Button variant="contained" size="small" onClick={handleApplyCustomRange} disabled={!tempStart || !tempEnd}
                sx={{ borderRadius: 8, textTransform: 'none', backgroundColor: colors.primary }}>Применить</Button>
            </Box>
          )}

          <IconButton onClick={() => loadAllData()} disabled={loading} sx={{ ml: 'auto', backgroundColor: colors.white, borderRadius: 8, border: `1px solid ${colors.border}` }}>
            <RefreshIcon sx={{ fontSize: 20, color: colors.primary }} />
          </IconButton>
        </Box>
      </Paper>

      {loading ? (
        <Grid container spacing={2}>
          {[1, 2, 3].map(i => <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={i}><Skeleton variant="rectangular" height={160} sx={{ borderRadius: 8 }} /></Grid>)}
          <Grid size={{ xs: 12 }}><Skeleton variant="rectangular" height={300} sx={{ borderRadius: 8 }} /></Grid>
        </Grid>
      ) : overview ? (
        <>
          {/* Карточки статистики */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
              <StatsCard title="Общая выручка" value={formatAmount(overview.total_revenue)}
                icon={<TrendingUpIcon sx={{ fontSize: 24, color: colors.success }} />} color={colors.success} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
              <StatsCard title="Продаж" value={formatNumber(overview.total_sales_count)}
                icon={<StoreIcon sx={{ fontSize: 24, color: colors.primary }} />} color={colors.primary}
                subtitle={`${formatNumber(overview.total_quantity)} шт. товаров`} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
              <StatsCard title="Средний чек" value={formatAmount(overview.average_revenue)}
                icon={<ChartIcon sx={{ fontSize: 24, color: colors.warning }} />} color={colors.warning} />
            </Grid>
          </Grid>

          {/* График динамики */}
          {chartData.length > 0 && (
            <Paper sx={{ borderRadius: 8, p: 2.5, mb: 3, border: `1px solid ${colors.border}` }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ color: colors.primary, mb: 2 }}>Динамика продаж</Typography>
              <Box sx={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs><linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={colors.primary} stopOpacity={0}/>
                    </linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                    <XAxis dataKey="date" tick={{ fill: colors.gray, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v) => formatAmount(v)} tick={{ fill: colors.gray, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip content={({ active, payload }) => active && payload?.length ? (
                      <Paper sx={{ p: 1.5, borderRadius: 8 }}>
                        <Typography variant="caption">{formatDateRussian(parseISO(payload[0].payload.fullDate), 'dd MMMM yyyy')}</Typography>
                        <Typography variant="body2" fontWeight={600}>Выручка: {formatAmount(payload[0].value)}</Typography>
                      </Paper>
                    ) : null} />
                    <Area type="monotone" dataKey="revenue" stroke={colors.primary} strokeWidth={2} fill="url(#revenueGradient)" dot={{ r: 4, fill: colors.primary }} />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          )}

          {/* Две колонки: продавцы и товары - только по 3 элемента + кнопка Все */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ borderRadius: 8, p: 2.5, border: `1px solid ${colors.border}`, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon sx={{ color: colors.info }} />
                    <Typography variant="subtitle1" fontWeight={600}>Продавцы</Typography>
                    <Chip label={sellersTotal} size="small" sx={{ borderRadius: 4 }} />
                  </Box>
                  {hasMoreSellers && (
                    <Button size="small" onClick={() => setAllSellersModalOpen(true)} sx={{ borderRadius: 6, textTransform: 'none' }}>
                      Все →
                    </Button>
                  )}
                </Box>
                <Stack spacing={1.5}>
                  {displayedSellers.map((seller) => (
                    <Card key={seller.seller_id} sx={{ borderRadius: 8, border: `1px solid ${colors.border}`, cursor: 'pointer',
                      '&:hover': { borderColor: colors.primary, backgroundColor: colors.primaryBg } }}
                      onClick={() => { setSelectedSellerId(seller.seller_id); setModalOpen(true); }}>
                      <CardContent sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={600}>{seller.seller_name}</Typography>
                            <Typography variant="caption" sx={{ color: colors.gray }}>{seller.seller_city || 'Город не указан'}</Typography>
                          </Box>
                          <Typography variant="h6" fontWeight={700} sx={{ color: colors.success }}>{formatAmount(seller.total_revenue)}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Typography variant="caption" sx={{ color: colors.gray }}>Продаж: {formatNumber(seller.sales_count)}</Typography>
                          <Typography variant="caption" sx={{ color: colors.gray }}>Товаров: {formatNumber(seller.total_quantity)} шт.</Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                  {displayedSellers.length === 0 && <Typography sx={{ textAlign: 'center', py: 4, color: colors.gray }}>Нет данных</Typography>}
                </Stack>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ borderRadius: 8, p: 2.5, border: `1px solid ${colors.border}`, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ProductIcon sx={{ color: colors.warning }} />
                    <Typography variant="subtitle1" fontWeight={600}>Топ товаров</Typography>
                    <Chip label={topProducts.length} size="small" sx={{ borderRadius: 4 }} />
                  </Box>
                  {hasMoreProducts && (
                    <Button size="small" onClick={() => setAllProductsModalOpen(true)} sx={{ borderRadius: 6, textTransform: 'none' }}>
                      Все →
                    </Button>
                  )}
                </Box>
                <Stack spacing={1.5}>
                  {displayedProducts.map((product) => (
                    <Card key={product.product_id} sx={{ borderRadius: 8, border: `1px solid ${colors.border}` }}>
                      <CardContent sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>{product.product_name}</Typography>
                            <Typography variant="caption" sx={{ color: colors.gray }}>SKU: {product.product_sku}</Typography>
                            {product.category && <Typography variant="caption" sx={{ color: colors.gray, display: 'block' }}>{product.category}</Typography>}
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="body2" fontWeight={600}>{formatNumber(product.total_quantity)} шт.</Typography>
                            <Typography variant="caption" sx={{ color: colors.success }}>{formatAmount(product.total_revenue)}</Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                  {displayedProducts.length === 0 && <Typography sx={{ textAlign: 'center', py: 4, color: colors.gray }}>Нет данных</Typography>}
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          {/* Категории */}
          {pieData.length > 0 && (
            <Paper sx={{ borderRadius: 8, p: 2.5, border: `1px solid ${colors.border}` }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CategoryIcon sx={{ color: colors.info }} />
                <Typography variant="subtitle1" fontWeight={600}>Продажи по категориям</Typography>
              </Box>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                      {pieData.map((entry, idx) => <Cell key={`cell-${idx}`} fill={entry.color} />)}
                    </Pie>
                    <RechartsTooltip content={({ active, payload }) => active && payload?.length ? (
                      <Paper sx={{ p: 1, borderRadius: 8 }}>
                        <Typography variant="body2" fontWeight={600}>{payload[0].name}</Typography>
                        <Typography variant="caption">{formatAmount(payload[0].value)}</Typography>
                      </Paper>
                    ) : null} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
                {pieData.map((item) => (
                  <Chip key={item.name} label={`${item.name} (${((item.value / pieData.reduce((s, i) => s + i.value, 0)) * 100).toFixed(0)}%)`}
                    size="small" sx={{ borderRadius: 6, backgroundColor: `${item.color}10`, color: item.color }} />
                ))}
              </Stack>
            </Paper>
          )}
        </>
      ) : null}

      {/* Модалки */}
      <AllSellersModal
        open={allSellersModalOpen}
        onClose={() => setAllSellersModalOpen(false)}
        sellers={sellers}
        total={sellersTotal}
        page={sellersPage}
        onPageChange={(p: number) => setSellersPage(p)}
        onSelectSeller={(seller: any) => { setSelectedSellerId(seller.seller_id); setModalOpen(true); }}
      />
      <AllProductsModal
        open={allProductsModalOpen}
        onClose={() => setAllProductsModalOpen(false)}
        products={topProducts}
      />
      <SellerDetailModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        sellerId={selectedSellerId}
        period={period}
        customStart={customStart}
        customEnd={customEnd}
      />
    </>
  );
};

// Компонент для обычных пользователей
const UserStatsView: React.FC = () => {
  const [period, setPeriod] = useState<PeriodType>('month');
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [tempStart, setTempStart] = useState<string>('');
  const [tempEnd, setTempEnd] = useState<string>('');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [allProductsModalOpen, setAllProductsModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { period };
      if (period === 'custom' && customStart && customEnd) {
        params.custom_start = format(customStart, 'yyyy-MM-dd');
        params.custom_end = format(customEnd, 'yyyy-MM-dd');
      }
      const data = await soldProductsStatsService.getMyStats(params);
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [period, customStart, customEnd]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePeriodChange = (newPeriod: PeriodType) => {
    setPeriod(newPeriod);
    if (newPeriod !== 'custom') {
      setCustomStart(null);
      setCustomEnd(null);
      setTempStart('');
      setTempEnd('');
    }
  };

  const handleApplyCustomRange = () => {
    if (tempStart && tempEnd) {
      setCustomStart(parseISO(tempStart));
      setCustomEnd(parseISO(tempEnd));
    }
  };

  const chartData = useMemo(() => (stats?.trend || []).map((item: any) => ({
    date: formatDateRussian(parseISO(item.date), 'dd.MM'),
    fullDate: item.date,
    revenue: item.total_revenue,
  })), [stats?.trend]);

  const displayedProducts = stats?.top_products?.slice(0, 3) || [];
  const hasMoreProducts = stats?.top_products?.length > 3;

  const getPeriodText = () => {
    if (period === 'day') return formatDateRussian(new Date(), 'dd MMMM yyyy');
    if (period === 'week') {
      const start = startOfWeek(new Date(), { locale: ru });
      const end = endOfWeek(new Date(), { locale: ru });
      return `${formatDateRussian(start, 'dd MMM')} - ${formatDateRussian(end, 'dd MMM')}`;
    }
    if (period === 'month') return formatDateRussian(new Date(), 'MMMM yyyy');
    if (period === 'custom' && customStart && customEnd) {
      return `${formatDateRussian(customStart, 'dd.MM.yyyy')} - ${formatDateRussian(customEnd, 'dd.MM.yyyy')}`;
    }
    return 'за период';
  };

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={600} sx={{ color: colors.primary }}>Моя статистика продаж</Typography>
        <Typography variant="body2" sx={{ color: colors.gray }}>{getPeriodText()}</Typography>
      </Box>

      <Paper sx={{ borderRadius: 8, p: 2, mb: 3, border: `1px solid ${colors.border}` }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          {(['day', 'week', 'month', 'custom'] as PeriodType[]).map((p) => (
            <Chip key={p} label={p === 'day' ? 'День' : p === 'week' ? 'Неделя' : p === 'month' ? 'Месяц' : 'Свой'}
              onClick={() => handlePeriodChange(p)} sx={{ borderRadius: 8, backgroundColor: period === p ? colors.primary : colors.white,
              color: period === p ? colors.white : colors.gray, border: `1px solid ${colors.border}` }} />
          ))}
          {period === 'custom' && (
            <Box sx={{ display: 'flex', gap: 1, ml: 1, flexWrap: 'wrap' }}>
              <TextField type="date" size="small" value={tempStart} onChange={(e) => setTempStart(e.target.value)} sx={{ minWidth: 150 }} />
              <TextField type="date" size="small" value={tempEnd} onChange={(e) => setTempEnd(e.target.value)} sx={{ minWidth: 150 }} />
              <Button variant="contained" size="small" onClick={handleApplyCustomRange} disabled={!tempStart || !tempEnd}
                sx={{ borderRadius: 8, textTransform: 'none', backgroundColor: colors.primary }}>Применить</Button>
            </Box>
          )}
          <IconButton onClick={() => loadData()} disabled={loading} sx={{ ml: 'auto', backgroundColor: colors.white, borderRadius: 8, border: `1px solid ${colors.border}` }}>
            <RefreshIcon sx={{ fontSize: 20, color: colors.primary }} />
          </IconButton>
        </Box>
      </Paper>

      {loading ? (
        <Grid container spacing={2}>
          {[1, 2, 3].map(i => <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={i}><Skeleton variant="rectangular" height={160} sx={{ borderRadius: 8 }} /></Grid>)}
        </Grid>
      ) : stats?.overview ? (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
              <StatsCard title="Моя выручка" value={formatAmount(stats.overview.total_revenue)} 
                icon={<StoreIcon sx={{ fontSize: 24, color: colors.success }} />} color={colors.success} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
              <StatsCard title="Продано" value={`${formatNumber(stats.overview.total_quantity)} шт.`} 
                icon={<ProductIcon sx={{ fontSize: 24, color: colors.primary }} />} color={colors.primary}
                subtitle={`${formatNumber(stats.overview.total_sales_count)} продаж`} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
              <StatsCard title="Средний чек" value={formatAmount(stats.overview.average_revenue)} 
                icon={<ChartIcon sx={{ fontSize: 24, color: colors.warning }} />} color={colors.warning} />
            </Grid>
          </Grid>

          {chartData.length > 0 && (
            <Paper sx={{ borderRadius: 8, p: 2.5, mb: 3, border: `1px solid ${colors.border}` }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ color: colors.primary, mb: 2 }}>Динамика продаж</Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs><linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={colors.primary} stopOpacity={0}/>
                    </linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                    <XAxis dataKey="date" tick={{ fill: colors.gray, fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => formatAmount(v)} />
                    <RechartsTooltip content={({ active, payload }) => active && payload?.length ? (
                      <Paper sx={{ p: 1.5, borderRadius: 8 }}>
                        <Typography variant="caption">{formatDateRussian(parseISO(payload[0].payload.fullDate), 'dd MMMM yyyy')}</Typography>
                        <Typography variant="body2" fontWeight={600}>Выручка: {formatAmount(payload[0].value)}</Typography>
                      </Paper>
                    ) : null} />
                    <Area type="monotone" dataKey="revenue" stroke={colors.primary} strokeWidth={2} fill="url(#revenueGradient)" dot={{ r: 4, fill: colors.primary }} />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          )}

          {/* Мои топ товары - только 3 + кнопка Все */}
          {stats.top_products?.length > 0 && (
            <Paper sx={{ borderRadius: 8, p: 2.5, border: `1px solid ${colors.border}` }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>Мои топ товары</Typography>
                {hasMoreProducts && (
                  <Button size="small" onClick={() => setAllProductsModalOpen(true)} sx={{ borderRadius: 6, textTransform: 'none' }}>
                    Все →
                  </Button>
                )}
              </Box>
              <Stack spacing={1.5}>
                {displayedProducts.map((product: any) => (
                  <Card key={product.product_id} sx={{ borderRadius: 8, border: `1px solid ${colors.border}` }}>
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{product.product_name}</Typography>
                          <Typography variant="caption" sx={{ color: colors.gray }}>SKU: {product.product_sku}</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" fontWeight={600}>{formatNumber(product.total_quantity)} шт.</Typography>
                          <Typography variant="caption" sx={{ color: colors.success }}>{formatAmount(product.total_revenue)}</Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Paper>
          )}

          {/* Модалка всех товаров для пользователя */}
          <AllProductsModal
            open={allProductsModalOpen}
            onClose={() => setAllProductsModalOpen(false)}
            products={stats?.top_products || []}
          />

          {stats.overview.total_revenue === 0 && (
            <Paper sx={{ borderRadius: 8, p: 4, textAlign: 'center' }}>
              <StoreIcon sx={{ fontSize: 48, color: colors.gray, mb: 2 }} />
              <Typography variant="h6" sx={{ color: colors.primary }}>Нет продаж</Typography>
              <Typography variant="body2" sx={{ color: colors.gray }}>За выбранный период у вас нет продаж</Typography>
            </Paper>
          )}
        </>
      ) : null}
    </>
  );
};

// Главный компонент
const SoldProductsStatsPage: React.FC = () => {
  const { user } = useAuth();
  
  if (user?.role === UserRole.ACCOUNTANT) {
    return (
      <Container maxWidth="md" sx={{ mt: 2, mb: 2 }}>
        <Paper sx={{ borderRadius: 8, p: 4, textAlign: 'center' }}>
          <StatsIcon sx={{ fontSize: 48, color: colors.gray, mb: 2 }} />
          <Typography variant="h6" sx={{ color: colors.primary }}>Нет доступа</Typography>
          <Typography variant="body2" sx={{ color: colors.gray }}>Бухгалтер не имеет доступа к статистике продаж</Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 2, px: { xs: 2, sm: 3 } }}>
      {user?.role === UserRole.OWNER ? <OwnerStatsView /> : <UserStatsView />}
    </Container>
  );
};

export default SoldProductsStatsPage;