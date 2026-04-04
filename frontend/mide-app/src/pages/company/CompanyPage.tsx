import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  Chip,
  Avatar,
  TextField,
  InputAdornment,
  FormControl,
  Alert,
  CircularProgress,
  Stack,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  MenuItem,
  Select,
  Fade,
  useTheme,
  useMediaQuery,
  IconButton,
  SelectChangeEvent,
  Skeleton,
} from '@mui/material';
import {
  Add as AddIcon,
  TrendingUp as IncomeIcon,
  TrendingDown as ExpenseIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  AttachMoney as MoneyIcon,
  History as HistoryIcon,
  SwapHoriz as CorrectionIcon,
  Close as CloseIcon,
  LocationOn as LocationIcon,
  MoreHoriz as MoreIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import {
  CompanyTransaction,
  CompanyBalanceHistory,
  OperationTypeLabels,
  OperationTypeColors,
  OperationTypeIcons,
  UserRole,
} from '../../types';
import { format, startOfDay, endOfDay, subDays, subWeeks, subMonths } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  useDashboardData,
  useTransactions,
  useStats,
  useBalanceByCities,
  useAddIncome,
  useAddExpense,
} from '../../hooks/useCompanyData';

// Типы
type DateRangeType = 'day' | 'week' | 'month' | 'all';

// Интерфейсы для пропсов диалога
interface TransactionDialogProps {
  open: boolean;
  type: 'INCOME' | 'EXPENSE';
  selectedCity: string;
  onClose: () => void;
}

// Мемоизированный компонент диалога
const TransactionDialog: React.FC<TransactionDialogProps> = React.memo(({
  open,
  type,
  selectedCity,
  onClose,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  const addIncome = useAddIncome();
  const addExpense = useAddExpense();
  
  const mutation = type === 'INCOME' ? addIncome : addExpense;
  const isLoading = mutation.isPending;

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Введите корректную сумму');
      return;
    }
    if (!description.trim()) {
      setError('Введите описание операции');
      return;
    }

    setError('');

    try {
      const data = {
        amount: parseFloat(amount),
        description: description.trim(),
        city: selectedCity !== 'all' ? selectedCity : undefined,
      };
      
      await mutation.mutateAsync(data);
      
      setAmount('');
      setDescription('');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка при выполнении операции');
    }
  };

  const handleClose = useCallback(() => {
    if (!isLoading) {
      onClose();
    }
  }, [isLoading, onClose]);

  // Сбрасываем ошибку при открытии/закрытии
  useEffect(() => {
    if (!open) {
      setError('');
      setAmount('');
      setDescription('');
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      PaperProps={{
        sx: {
          borderRadius: 4,
          maxWidth: 520,
          width: '100%',
          m: 2,
          boxShadow: '0 8px 24px rgba(106, 61, 122, 0.15)',
        }
      }}
    >
      <DialogTitle sx={{ p: 2.5, pb: 1, pr: 6 }}>
        <Typography variant="h6" color="#2a0f35" fontWeight={600} sx={{ mb: 0.5 }}>
          {type === 'INCOME' ? 'Добавить доход' : 'Добавить расход'}
        </Typography>
        <Typography variant="body2" color="#4c5454" sx={{ fontSize: '0.85rem' }}>
          {type === 'INCOME' 
            ? 'Пополнение баланса компании' 
            : 'Списание средств с баланса'}
        </Typography>
        {selectedCity !== 'all' && (
          <Chip
            size="small"
            icon={<LocationIcon sx={{ fontSize: 14 }} />}
            label={selectedCity}
            sx={{ mt: 1, backgroundColor: '#f0e6ff', color: '#674fb6' }}
          />
        )}
      </DialogTitle>
      
      <IconButton
        onClick={handleClose}
        sx={{
          position: 'absolute',
          right: 12,
          top: 12,
          color: '#8E8E93',
        }}
      >
        <CloseIcon />
      </IconButton>

      <DialogContent sx={{ p: 2.5, pt: 3 }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="caption" color="#4c5454" sx={{ mb: 0.5, display: 'block', fontWeight: 600, fontSize: '0.75rem' }}>
              СУММА
            </Typography>
            <TextField
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              fullWidth
              required
              disabled={isLoading}
              placeholder="0"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Typography sx={{ color: '#8E8E93', fontSize: 20, fontWeight: 500 }}>₽</Typography>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 4,
                  backgroundColor: '#f8f7fa',
                },
              }}
            />
          </Box>

          <Box>
            <Typography variant="caption" color="#4c5454" sx={{ mb: 0.5, display: 'block', fontWeight: 600, fontSize: '0.75rem' }}>
              ОПИСАНИЕ
            </Typography>
            <TextField
              multiline
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              required
              disabled={isLoading}
              placeholder="Например: Оплата за товар, аренда, зарплата..."
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 4,
                  backgroundColor: '#f8f7fa',
                },
              }}
            />
          </Box>

          {error && (
            <Alert 
              severity="error"
              sx={{ 
                borderRadius: 4,
                backgroundColor: 'rgba(244, 67, 54, 0.08)',
              }}
            >
              {error}
            </Alert>
          )}

          {type === 'EXPENSE' && (
            <Alert 
              severity="warning"
              sx={{ 
                borderRadius: 4,
                backgroundColor: 'rgba(255, 152, 0, 0.08)',
              }}
            >
              Убедитесь, что на балансе достаточно средств
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}>
        <Button
          onClick={handleClose}
          disabled={isLoading}
          sx={{
            borderRadius: 4,
            color: '#4c5454',
            px: 3,
            py: 1,
            textTransform: 'none',
            fontSize: '0.95rem',
            fontWeight: 500,
          }}
        >
          Отмена
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isLoading}
          sx={{
            borderRadius: 4,
            backgroundColor: type === 'INCOME' ? '#4caf50' : '#f44336',
            '&:hover': {
              backgroundColor: type === 'INCOME' ? '#388e3c' : '#d32f2f',
            },
            px: 3,
            py: 1,
            textTransform: 'none',
            fontSize: '0.95rem',
            fontWeight: 500,
            minWidth: 120,
          }}
        >
          {isLoading ? <CircularProgress size={24} color="inherit" /> : (type === 'INCOME' ? 'Добавить' : 'Списать')}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

// Кастомный Tooltip для графика
const CustomAreaTooltip = ({ active, payload, selectedCity }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <Paper
        sx={{
          p: 1.5,
          borderRadius: 2,
          backgroundColor: '#ffffff',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          border: 'none',
        }}
      >
        <Typography variant="caption" color="#4c5454" display="block">
          {data.tooltipLabel || data.displayLabel}
        </Typography>
        <Typography variant="body2" color="#2a0f35" fontWeight={600}>
          {formatAmount(payload[0].value)}
        </Typography>
      </Paper>
    );
  }
  return null;
};

// Кастомный Tooltip для круговой диаграммы
const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <Paper
        sx={{
          p: 1.5,
          borderRadius: 2,
          backgroundColor: '#ffffff',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      >
        <Typography variant="body2" color="#2a0f35" fontWeight={500}>
          {payload[0].name}
        </Typography>
        <Typography variant="body2" fontWeight={600} color={payload[0].payload.color}>
          {formatAmount(payload[0].value)}
        </Typography>
      </Paper>
    );
  }
  return null;
};

// Мемоизированный компонент табов
const ChipTabs: React.FC<{
  value: number;
  onChange: (value: number) => void;
  tabs: Array<{ label: string; icon: React.ReactNode; count: number }>;
}> = React.memo(({ value, onChange, tabs }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        flexWrap: isMobile ? 'nowrap' : 'wrap',
        overflowX: isMobile ? 'auto' : 'visible',
        pb: isMobile ? 1 : 0,
        '&::-webkit-scrollbar': {
          display: 'none',
        },
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
      }}
    >
      {tabs.map((tab, index) => (
        <Chip
          key={index}
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {tab.icon}
              <span>{tab.label}</span>
              <Box
                component="span"
                sx={{
                  backgroundColor: value === index ? 'rgba(255,255,255,0.2)' : '#f0f0f0',
                  borderRadius: 12,
                  px: 0.8,
                  py: 0.3,
                  fontSize: '0.7rem',
                  fontWeight: 500,
                }}
              >
                {tab.count}
              </Box>
            </Box>
          }
          onClick={() => onChange(index)}
          sx={{
            borderRadius: 8,
            height: 40,
            backgroundColor: value === index ? '#674fb6' : '#ffffff',
            color: value === index ? '#ffffff' : '#4c5454',
            border: value === index ? 'none' : '1px solid #e0e0e0',
            '&:hover': {
              backgroundColor: value === index ? '#5539a0' : '#f5f5f5',
            },
            transition: 'all 0.2s ease',
            flexShrink: 0,
            fontWeight: 500,
            '& .MuiChip-label': {
              px: 2,
            },
          }}
        />
      ))}
    </Box>
  );
});

// Функция форматирования суммы
const formatAmount = (amount: number) => {
  const rubles = Math.floor(amount);
  const kopecks = Math.round((amount - rubles) * 100);
  
  if (kopecks > 0) {
    return (
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'baseline' }}>
        <span>{rubles.toLocaleString('ru-RU')} ₽</span>
        <Typography component="span" variant="caption" sx={{ color: '#8E8E93', ml: 0.5 }}>
          ,{kopecks.toString().padStart(2, '0')}
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'baseline' }}>
      <span>{rubles.toLocaleString('ru-RU')} ₽</span>
    </Box>
  );
};

// Мемоизированный компонент выбора даты
const DateRangeSelector: React.FC<{
  value: DateRangeType;
  onChange: (value: DateRangeType) => void;
  customDate: Date;
  onCustomDateChange: (date: Date) => void;
  startDate: Date | null;
  endDate: Date | null;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
  onApplyDateRange: () => void;
  onResetDateRange: () => void;
}> = React.memo(({ 
  value, 
  onChange, 
  customDate, 
  onCustomDateChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onApplyDateRange,
  onResetDateRange
}) => {
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
      <Chip
        label="День"
        onClick={() => onChange('day')}
        sx={{
          borderRadius: 6,
          backgroundColor: value === 'day' ? '#674fb6' : '#f5f3f6',
          color: value === 'day' ? '#ffffff' : '#4c5454',
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: value === 'day' ? '#5539a0' : '#e8e0f0',
          },
        }}
      />
      <Chip
        label="Неделя"
        onClick={() => onChange('week')}
        sx={{
          borderRadius: 6,
          backgroundColor: value === 'week' ? '#674fb6' : '#f5f3f6',
          color: value === 'week' ? '#ffffff' : '#4c5454',
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: value === 'week' ? '#5539a0' : '#e8e0f0',
          },
        }}
      />
      <Chip
        label="Месяц"
        onClick={() => onChange('month')}
        sx={{
          borderRadius: 6,
          backgroundColor: value === 'month' ? '#674fb6' : '#f5f3f6',
          color: value === 'month' ? '#ffffff' : '#4c5454',
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: value === 'month' ? '#5539a0' : '#e8e0f0',
          },
        }}
      />
      <Chip
        label="Все время"
        onClick={() => onChange('all')}
        sx={{
          borderRadius: 6,
          backgroundColor: value === 'all' ? '#674fb6' : '#f5f3f6',
          color: value === 'all' ? '#ffffff' : '#4c5454',
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: value === 'all' ? '#5539a0' : '#e8e0f0',
          },
        }}
      />
      
      {value === 'day' && (
        <TextField
          type="date"
          size="small"
          value={format(customDate, 'yyyy-MM-dd')}
          onChange={(e) => onCustomDateChange(new Date(e.target.value))}
          sx={{
            ml: 1,
            minWidth: 140,
            '& .MuiOutlinedInput-root': {
              borderRadius: 6,
              backgroundColor: '#f5f3f6',
            },
          }}
        />
      )}

      {value === 'all' && (
        <Box sx={{ display: 'flex', gap: 1, ml: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            type="date"
            size="small"
            label="С"
            value={startDate ? format(startDate, 'yyyy-MM-dd') : ''}
            onChange={(e) => onStartDateChange(e.target.value ? new Date(e.target.value) : null)}
            InputLabelProps={{ shrink: true }}
            sx={{
              minWidth: 140,
              '& .MuiOutlinedInput-root': {
                borderRadius: 6,
                backgroundColor: '#f5f3f6',
              },
            }}
          />
          <TextField
            type="date"
            size="small"
            label="По"
            value={endDate ? format(endDate, 'yyyy-MM-dd') : ''}
            onChange={(e) => onEndDateChange(e.target.value ? new Date(e.target.value) : null)}
            InputLabelProps={{ shrink: true }}
            sx={{
              minWidth: 140,
              '& .MuiOutlinedInput-root': {
                borderRadius: 6,
                backgroundColor: '#f5f3f6',
              },
            }}
          />
          <Button
            variant="contained"
            size="small"
            onClick={onApplyDateRange}
            disabled={!startDate || !endDate}
            sx={{
              borderRadius: 6,
              backgroundColor: '#674fb6',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: '#5539a0',
              },
              '&:disabled': {
                backgroundColor: '#e0e0e0',
              },
            }}
          >
            Применить
          </Button>
          {(startDate || endDate) && (
            <IconButton
              size="small"
              onClick={onResetDateRange}
              sx={{
                color: '#8E8E93',
                '&:hover': {
                  color: '#f44336',
                },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      )}
    </Box>
  );
});

// Мемоизированный компонент карточки транзакции
// Мемоизированный компонент карточки транзакции (оригинальный дизайн)
const TransactionCard = React.memo(({ transaction }: { transaction: CompanyTransaction }) => {
  const isIncome = transaction.operation_type === 'INCOME';
  const isExpense = transaction.operation_type === 'EXPENSE';
  const isReportIncome = isIncome && transaction.reference_type === 'REPORT';
  const isDebtWriteoff = isIncome && transaction.reference_type === 'DEBT_WRITEOFF';

  let IconComponent = isIncome ? IncomeIcon : isExpense ? ExpenseIcon : CorrectionIcon;
  let color = '#ff9800';

  if (isReportIncome) {
    color = '#2196f3';
  } else if (isDebtWriteoff) {
    color = '#ff9800'; // Оранжевый для долгов, как и для обычных доходов
  } else if (isIncome) {
    color = '#4caf50';
  } else if (isExpense) {
    color = '#f44336';
  }

  // Определяем текст для отображения в карточке
  let operationLabel = '';
  if (isDebtWriteoff) {
    operationLabel = 'ДОЛГ';
  } else if (isReportIncome) {
    operationLabel = 'ДОХОД (ОТЧЕТ)';
  } else if (isIncome) {
    operationLabel = 'ДОХОД';
  } else {
    operationLabel = 'РАСХОД';
  }

  const formatDate = useCallback((date: string) => {
    return format(new Date(date), 'dd MMM yyyy, HH:mm', { locale: ru });
  }, []);

  return (
    <Fade in timeout={300}>
      <Card
        sx={{
          borderRadius: 8,
          backgroundColor: '#ffffff',
          transition: 'all 0.2s ease',
          height: '100%',
          border: '1px solid #f0f0f0',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 24px rgba(106, 61, 122, 0.15)',
            borderColor: color,
          },
        }}
      >
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            mb: 1.5,
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconComponent sx={{ color, fontSize: 20 }} />
              <Box>
                <Typography variant="caption" color="#8E8E93">
                  {formatDate(transaction.created_at)}
                </Typography>
                <Typography variant="subtitle2" color="#2a0f35" fontWeight={600}>
                  {OperationTypeLabels[transaction.operation_type]}
                </Typography>
              </Box>
            </Box>
            <Typography 
              variant="h6" 
              sx={{ 
                color,
                fontWeight: 700,
              }}
            >
              {isIncome ? '+' : isExpense ? '-' : '±'}
              {formatAmount(transaction.amount)}
            </Typography>
          </Box>

          {transaction.city && (
            <Chip
              size="small"
              icon={<LocationIcon sx={{ fontSize: 14 }} />}
              label={transaction.city}
              sx={{
                mb: 1,
                height: 20,
                fontSize: '0.6rem',
                backgroundColor: '#f0e6ff',
                color: '#674fb6',
              }}
            />
          )}

          <Typography 
            variant="body2" 
            color="#4c5454"
            sx={{ 
              mb: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: 40,
            }}
          >
            {transaction.description}
          </Typography>
          {!transaction.city && (
            <Box sx={{ height: 20, mb: 1 }} />
          )}

          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            pt: 1,
            borderTop: '1px solid #f0f0f0',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="#8E8E93">
                Баланс: {formatAmount(transaction.balance)}
              </Typography>
              
              {transaction.created_by && (
                <Chip
                  label={transaction.created_by_name || `ID: ${transaction.created_by}`}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.6rem',
                    backgroundColor: '#e8e0f0',
                    color: '#674fb6',
                  }}
                />
              )}
            </Box>
            
            {transaction.reference_type && (
              <Chip
                label={transaction.reference_type === 'REPORT' ? 'Отчет' : 
                       transaction.reference_type === 'DEBT_WRITEOFF' ? 'Долг' : 
                       transaction.reference_type}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.6rem',
                  backgroundColor: '#f5f3f6',
                  color: '#4c5454',
                }}
              />
            )}
          </Box>
        </CardContent>
      </Card>
    </Fade>
  );
});

// Скелетон для загрузки
const DashboardSkeleton = () => (
  <Box sx={{ minHeight: '100vh', py: 2, backgroundColor: '#f5f3f6' }}>
    <Container maxWidth="xl">
      <Skeleton variant="text" width={200} height={40} sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 8, mb: 3 }} />
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 8 }} />
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 8 }} />
        </Grid>
      </Grid>
      <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 8 }} />
    </Container>
  </Box>
);

// Основной компонент страницы
const CompanyPage: React.FC = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const canEdit = user?.role === UserRole.OWNER || user?.role === UserRole.ACCOUNTANT;
  const isOwner = user?.role === UserRole.OWNER;
  const isAccountant = user?.role === UserRole.ACCOUNTANT;

  // Состояния для фильтров
  const [activeTab, setActiveTab] = useState(0);
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeType>('month');
  const [customDate, setCustomDate] = useState<Date>(new Date());
  const [tempStartDate, setTempStartDate] = useState<Date | null>(null);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(null);
  const [appliedStartDate, setAppliedStartDate] = useState<Date | null>(null);
  const [appliedEndDate, setAppliedEndDate] = useState<Date | null>(null);
  const [transactionsPage, setTransactionsPage] = useState(1);
  
  // Диалоги
  const [incomeDialogOpen, setIncomeDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  
  // Уведомления
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Для бухгалтера принудительно устанавливаем его город
  useEffect(() => {
    if (isAccountant && user && user.cityName) {
      setSelectedCity(user.cityName);
    }
  }, [isAccountant, user]);

  // Получаем данные для дашборда
  const dashboardFilters = useMemo(() => {
    let period = dateRange;
    let date = undefined;
    let date_from = undefined;
    let date_to = undefined;
    
    if (dateRange === 'day') {
      date = format(customDate, 'yyyy-MM-dd');
    } else if (dateRange === 'all' && appliedStartDate && appliedEndDate) {
      date_from = format(appliedStartDate, 'yyyy-MM-dd');
      date_to = format(appliedEndDate, 'yyyy-MM-dd');
      period = 'all';
    }
    
    const maxPoints = dateRange === 'all' ? 200 : 100;
    
    return {
      period,
      city: isAccountant && user?.cityName ? user.cityName : (selectedCity !== 'all' ? selectedCity : undefined),
      date,
      date_from,
      date_to,
      max_points: maxPoints,
    };
  }, [dateRange, customDate, appliedStartDate, appliedEndDate, selectedCity, isAccountant, user]);

  const { 
    data: dashboardData, 
    isLoading: dashboardLoading,
    refetch: refetchDashboard,
    isFetching: dashboardFetching,
  } = useDashboardData(dashboardFilters);

  // Получаем статистику
  const statsParams = useMemo(() => {
    let params: any = {
      period: dateRange,
      city: isAccountant && user?.cityName ? user.cityName : (selectedCity !== 'all' ? selectedCity : undefined),
    };

    if (dateRange === 'day') {
      params.date = format(customDate, 'yyyy-MM-dd');
    } else if (dateRange === 'all' && appliedStartDate && appliedEndDate) {
      params.date_from = format(appliedStartDate, 'yyyy-MM-dd');
      params.date_to = format(appliedEndDate, 'yyyy-MM-dd');
    }

    return params;
  }, [dateRange, customDate, appliedStartDate, appliedEndDate, selectedCity, isAccountant, user]);

  const { data: periodStats, isLoading: statsLoading } = useStats(statsParams);

  // Получаем транзакции
  const transactionsFilters = useMemo(() => {
    let params: any = {
      page: transactionsPage,
      page_size: 50,
      city: isAccountant && user?.cityName ? user.cityName : (selectedCity !== 'all' ? selectedCity : undefined),
    };

    if (activeTab === 1) {
      params.operation_type = 'INCOME';
    } else if (activeTab === 2) {
      params.operation_type = 'INCOME';
      params.reference_type = 'REPORT';
    } else if (activeTab === 3) {
      params.operation_type = 'EXPENSE';
    }

    // Добавляем фильтры по дате
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (dateRange === 'day') {
      const selectedDate = new Date(customDate);
      const dayStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      
      params.date_from = format(dayStart, 'yyyy-MM-dd');
      params.date_to = format(dayEnd, 'yyyy-MM-dd');
    } else if (dateRange === 'week') {
      const end = new Date();
      const start = subDays(end, 7);
      const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      const endDateNext = new Date(endDate);
      endDateNext.setDate(endDateNext.getDate() + 1);
      
      params.date_from = format(startDate, 'yyyy-MM-dd');
      params.date_to = format(endDateNext, 'yyyy-MM-dd');
    } else if (dateRange === 'month') {
      const end = new Date();
      const start = subMonths(end, 1);
      const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      const endDateNext = new Date(endDate);
      endDateNext.setDate(endDateNext.getDate() + 1);
      
      params.date_from = format(startDate, 'yyyy-MM-dd');
      params.date_to = format(endDateNext, 'yyyy-MM-dd');
    } else if (dateRange === 'all' && appliedStartDate && appliedEndDate) {
      const startDate = new Date(appliedStartDate);
      const endDate = new Date(appliedEndDate);
      const endDateNext = new Date(endDate);
      endDateNext.setDate(endDateNext.getDate() + 1);
      
      params.date_from = format(startDate, 'yyyy-MM-dd');
      params.date_to = format(endDateNext, 'yyyy-MM-dd');
    }

    return params;
  }, [selectedCity, activeTab, dateRange, customDate, appliedStartDate, appliedEndDate, transactionsPage, isAccountant, user]);

  const { 
    data: transactionsData, 
    isLoading: transactionsLoading,
    isFetching: transactionsFetching,
  } = useTransactions(transactionsFilters);

  // Получаем список городов (только для OWNER)
  const { data: citiesData } = useBalanceByCities(isOwner);

  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCityChange = (event: SelectChangeEvent) => {
    setSelectedCity(event.target.value);
    setTransactionsPage(1);
  };

  const handleRefresh = () => {
    refetchDashboard();
    showSnackbar('Данные обновляются...', 'success');
  };

  // Фильтрация транзакций по поиску на клиенте
  const filteredTransactions = useMemo(() => {
    const transactions = transactionsData?.items || [];
    if (!searchTerm) return transactions;
    
    const searchLower = searchTerm.toLowerCase();
    return transactions.filter(t => 
      t.description.toLowerCase().includes(searchLower) ||
      (t.reference_type?.toLowerCase() || '').includes(searchLower)
    );
  }, [transactionsData?.items, searchTerm]);

  const chartData = useMemo(() => {
    const history = dashboardData?.history || [];
    const balance = dashboardData?.balance || 0;
    
    if (!history || history.length === 0) {
      return [{
        id: 'current',
        index: 0,
        displayLabel: dateRange === 'day' 
          ? format(new Date(), 'HH:mm')
          : format(new Date(), 'dd MMM', { locale: ru }),
        balance: balance,
        date: new Date().toISOString(),
        city: selectedCity !== 'all' ? selectedCity : undefined,
        timestamp: new Date().getTime(),
        tooltipLabel: format(new Date(), 'dd MMM yyyy, HH:mm:ss', { locale: ru }),
        uniqueKey: `current-${Date.now()}`
      }];
    }

    return history.map((item, index) => {
      const date = new Date(item.date);
      
      return {
        ...item,
        index,
        displayLabel: dateRange === 'day' 
          ? format(date, 'HH:mm')
          : format(date, 'dd MMM', { locale: ru }),
        tooltipLabel: format(date, 'dd MMM yyyy, HH:mm:ss', { locale: ru }),
        timestamp: date.getTime(),
        uniqueKey: `point-${index}-${date.getTime()}`
      };
    });
  }, [dashboardData?.history, dashboardData?.balance, dateRange, selectedCity]);

  const totalStats = useMemo(() => ({
    totalIncome: (transactionsData?.items || [])
      .filter(t => t.operation_type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0),
    totalExpense: (transactionsData?.items || [])
      .filter(t => t.operation_type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0),
    transactionsCount: transactionsData?.items?.length || 0,
  }), [transactionsData?.items]);

  const pieData = useMemo(() => [
    { 
      name: 'Обычные доходы', 
      value: periodStats?.regular_income || 0, 
      color: '#4caf50' 
    },
    { 
      name: 'Доходы от отчетов', 
      value: periodStats?.report_income || 0, 
      color: '#2196f3' 
    },
    { 
      name: 'Расходы', 
      value: periodStats?.total_expense || 0, 
      color: '#f44336' 
    },
  ].filter(item => item.value > 0), [periodStats]);

  const tabs = useMemo(() => [
    {
      label: 'Все',
      icon: <HistoryIcon sx={{ fontSize: 18 }} />,
      count: (periodStats?.income_count || 0) + (periodStats?.expense_count || 0),
    },
    {
      label: 'Доходы',
      icon: <IncomeIcon sx={{ fontSize: 18 }} />,
      count: periodStats?.income_count || 0,
    },
    {
      label: 'Доходы от отчетов',
      icon: <IncomeIcon sx={{ fontSize: 18 }} />,
      count: periodStats?.report_income_count || 0,
    },
    {
      label: 'Расходы',
      icon: <ExpenseIcon sx={{ fontSize: 18 }} />,
      count: periodStats?.expense_count || 0,
    },
  ], [periodStats]);

  const handleDateRangeChange = (newRange: DateRangeType) => {
    setDateRange(newRange);
    if (newRange !== 'all') {
      setTempStartDate(null);
      setTempEndDate(null);
      setAppliedStartDate(null);
      setAppliedEndDate(null);
    }
    setTransactionsPage(1);
  };

  const handleApplyDateRange = () => {
    if (tempStartDate && tempEndDate) {
      setAppliedStartDate(tempStartDate);
      setAppliedEndDate(tempEndDate);
      setTransactionsPage(1);
    }
  };

  const handleResetDateRange = () => {
    setTempStartDate(null);
    setTempEndDate(null);
    setAppliedStartDate(null);
    setAppliedEndDate(null);
    setTransactionsPage(1);
  };

  useEffect(() => {
    if (dateRange === 'all') {
      setTempStartDate(appliedStartDate);
      setTempEndDate(appliedEndDate);
    }
  }, [dateRange, appliedStartDate, appliedEndDate]);

  // Сбрасываем страницу при смене фильтров
  useEffect(() => {
    setTransactionsPage(1);
  }, [activeTab, dateRange, customDate, appliedStartDate, appliedEndDate, selectedCity]);

  const isLoading = dashboardLoading || statsLoading;
  const isFetching = dashboardFetching || transactionsFetching;

  if (isLoading && !dashboardData) {
    return <DashboardSkeleton />;
  }

  return (
    <Box sx={{ minHeight: '100vh', py: 2, backgroundColor: '#f5f3f6' }}>
      <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3 } }}>
        {/* Шапка */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          mb: 2,
          flexWrap: 'wrap',
          gap: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="h5" component="h1" color="#2a0f35" fontWeight={600}>
                Бухгалтерия
                {selectedCity !== 'all' && selectedCity && (
                  <Box component="span" sx={{ color: '#674fb6', ml: 1 }}>
                    {selectedCity}
                  </Box>
                )}
              </Typography>
              <Typography variant="body2" color="#4c5454">
                Управление финансами компании
              </Typography>
            </Box>
            
            {/* Селект городов - показываем только для OWNER */}
            {isOwner && citiesData && (
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <Select
                  value={selectedCity}
                  onChange={handleCityChange}
                  displayEmpty
                  startAdornment={<LocationIcon sx={{ mr: 1, color: '#8E8E93', fontSize: 20 }} />}
                  sx={{
                    borderRadius: 8,
                    backgroundColor: '#ffffff',
                    height: 40,
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#e0e0e0',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#674fb6',
                    },
                  }}
                >
                  <MenuItem value="all">Все города</MenuItem>
                  {citiesData.map((city: { city: string; balance: number }) => (
                    <MenuItem key={city.city} value={city.city}>{city.city}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {isFetching && (
              <CircularProgress size={20} sx={{ color: '#674fb6', ml: 1 }} />
            )}
          </Box>

          <IconButton
            onClick={handleRefresh}
            disabled={isFetching}
            sx={{
              backgroundColor: '#ffffff',
              borderRadius: '50%',
              width: 40,
              height: 40,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              '&:hover': {
                backgroundColor: '#f5f3f6',
              },
            }}
          >
            <RefreshIcon sx={{ 
              color: '#674fb6',
              animation: isFetching ? 'spin 1s linear infinite' : 'none',
              '@keyframes spin': {
                '0%': { transform: 'rotate(0deg)' },
                '100%': { transform: 'rotate(360deg)' }
              }
            }} />
          </IconButton>
        </Box>

        {/* Баланс */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 8,
            backgroundColor: '#ffffff',
            border: '1px solid #f0f0f0',
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" color="#4c5454" sx={{ mb: 1 }}>
                Текущий баланс
                {selectedCity !== 'all' && ` г. ${selectedCity}`}
              </Typography>
              <Typography variant="h2" component="div" sx={{ fontWeight: 700, mb: 1, color: '#000000' }}>
                {formatAmount(dashboardData?.balance || 0)}
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <IncomeIcon sx={{ fontSize: 18, color: '#4caf50' }} />
                  <Typography variant="body2" color="#4c5454">
                    Всего доходов: {formatAmount(totalStats.totalIncome)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ExpenseIcon sx={{ fontSize: 18, color: '#f44336' }} />
                  <Typography variant="body2" color="#4c5454">
                    Всего расходов: {formatAmount(totalStats.totalExpense)}
                  </Typography>
                </Box>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              {canEdit && (
                <Stack 
                  direction={{ xs: 'column', sm: 'row' }} 
                  spacing={1.5}
                  justifyContent={{ md: 'flex-end' }}
                >
                  <Button
                    onClick={() => setIncomeDialogOpen(true)}
                    sx={{
                      flex: 1,
                      borderRadius: 8,
                      backgroundColor: '#F0F0F0',
                      color: '#4CAF50',
                      textTransform: 'none',
                      py: 1.5,
                      justifyContent: 'flex-start',
                      '&:hover': {
                        backgroundColor: '#E8E8E8',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          bgcolor: '#4CAF50',
                          color: '#ffffff',
                        }}
                      >
                        <IncomeIcon sx={{ fontSize: 18 }} />
                      </Avatar>
                      <Typography fontWeight={500}>Доход</Typography>
                    </Box>
                  </Button>
                  <Button
                    onClick={() => setExpenseDialogOpen(true)}
                    sx={{
                      flex: 1,
                      borderRadius: 8,
                      backgroundColor: '#F0F0F0',
                      color: '#f44336',
                      textTransform: 'none',
                      py: 1.5,
                      justifyContent: 'flex-start',
                      '&:hover': {
                        backgroundColor: '#E8E8E8',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          bgcolor: '#f44336',
                          color: '#ffffff',
                        }}
                      >
                        <ExpenseIcon sx={{ fontSize: 18 }} />
                      </Avatar>
                      <Typography fontWeight={500}>Расход</Typography>
                    </Box>
                  </Button>
                </Stack>
              )}
            </Grid>
          </Grid>
        </Paper>

        {/* Графики */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 8,
                backgroundColor: '#ffffff',
                height: '100%',
                boxShadow: 'none',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="subtitle1" color="#2a0f35" fontWeight={600}>
                  {selectedCity !== 'all' ? `Динамика баланса г. ${selectedCity} ` : 'Динамика баланса '}
                  {dateRange === 'day' 
                    ? `за ${format(customDate, 'dd MMMM yyyy', { locale: ru })}` 
                    : dateRange === 'week' 
                      ? 'за неделю'
                      : dateRange === 'month'
                        ? 'за месяц'
                        : appliedStartDate && appliedEndDate
                          ? `с ${format(appliedStartDate, 'dd MMM yyyy', { locale: ru })} по ${format(appliedEndDate, 'dd MMM yyyy', { locale: ru })}`
                          : 'за все время'}
                </Typography>
                <DateRangeSelector
                  value={dateRange}
                  onChange={handleDateRangeChange}
                  customDate={customDate}
                  onCustomDateChange={setCustomDate}
                  startDate={tempStartDate} 
                  endDate={tempEndDate}
                  onStartDateChange={setTempStartDate}
                  onEndDateChange={setTempEndDate}
                  onApplyDateRange={handleApplyDateRange} 
                  onResetDateRange={handleResetDateRange}
                />
              </Box>

              {dashboardLoading ? (
                <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 8 }} />
              ) : (
                <Box sx={{ height: 300, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart 
                      data={chartData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                    >
                      <defs>
                        <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#674fb6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#674fb6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      
                      <XAxis 
                        dataKey="index"
                        type="number"
                        domain={[0, chartData.length - 1]}
                        tickFormatter={(value) => {
                          const point = chartData[value];
                          if (!point) return '';
                          
                          const step = Math.max(1, Math.floor(chartData.length / (isMobile ? 8 : 12)));
                          if (value % step === 0 || value === chartData.length - 1) {
                            return point.displayLabel;
                          }
                          return '';
                        }}
                        tick={{ fill: '#4c5454', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                      />
                      
                      <YAxis 
                        tick={{ fill: '#4c5454', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => `${(value / 1000).toFixed(1)}K`}
                      />
                      
                      <Tooltip content={<CustomAreaTooltip selectedCity={selectedCity} />} />
                      
                      <Area 
                        type="monotone" 
                        dataKey="balance" 
                        stroke="#674fb6" 
                        strokeWidth={2}
                        fill="url(#balanceGradient)" 
                        isAnimationActive={true}
                        connectNulls={true}
                        dot={{ r: 4, fill: '#674fb6', strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: '#674fb6', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 8,
                backgroundColor: '#ffffff',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Typography variant="subtitle1" color="#2a0f35" fontWeight={600} sx={{ mb: 2 }}>
                {selectedCity !== 'all' ? `Операции г. ${selectedCity} ` : 'Операции '}
                {dateRange === 'day' 
                  ? `за ${format(customDate, 'dd MMM', { locale: ru })}` 
                  : dateRange === 'week' 
                    ? 'за неделю'
                    : dateRange === 'month'
                      ? 'за месяц'
                      : appliedStartDate && appliedEndDate
                        ? `с ${format(appliedStartDate, 'dd MMM', { locale: ru })} по ${format(appliedEndDate, 'dd MMM', { locale: ru })}`
                        : 'за все время'}
              </Typography>
              {statsLoading ? (
                <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 8 }} />
              ) : pieData.length > 0 ? (
                <>
                  <Box sx={{ height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                  <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 1, flexWrap: 'wrap' }}>
                    {pieData.map((item) => (
                      <Box key={item.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: 2, backgroundColor: item.color }} />
                        <Typography variant="caption" color="#4c5454">
                          {item.name}: {((item.value / pieData.reduce((sum, i) => sum + i.value, 0)) * 100).toFixed(1)}%
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                  <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #f0f0f0' }}>
                    <Typography variant="body2" color="#4c5454" align="center">
                        Обычные доходы: {formatAmount(periodStats?.regular_income || 0)}<br />
                        Доходы от отчетов: {formatAmount(periodStats?.report_income || 0)}<br />
                        Расходы: {formatAmount(periodStats?.total_expense || 0)}<br />
                    </Typography>
                  </Box>
                </>
              ) : (
                <Box sx={{ 
                  height: 200, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: 1
                }}>
                  <HistoryIcon sx={{ fontSize: 48, color: '#d8d1e0' }} />
                  <Typography variant="body2" color="#4c5454" textAlign="center">
                    Нет операций за выбранный период
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Кастомные табы в виде чипсов */}
        <Box sx={{ mb: 3 }}>
          <ChipTabs
            value={activeTab}
            onChange={(value) => {
              setActiveTab(value);
              setTransactionsPage(1);
            }}
            tabs={tabs}
          />
        </Box>

        {/* Фильтры */}
        <Paper 
          sx={{ 
            p: 2, 
            mb: 3, 
            borderRadius: 8,
            backgroundColor: '#ffffff',
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                placeholder="Поиск по описанию..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#8E8E93' }} />
                    </InputAdornment>
                  ),
                  sx: { 
                    borderRadius: 8,
                    backgroundColor: '#f5f3f6',
                    '& fieldset': { border: 'none' }
                  }
                }}
                variant="outlined"
                size="small"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="body2" color="#4c5454" align="right">
                Показано {filteredTransactions.length} из {transactionsData?.total || 0} операций
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* Список транзакций */}
        {transactionsLoading && !transactionsData ? (
          <Grid container spacing={1.5}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={i}>
                <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 8 }} />
              </Grid>
            ))}
          </Grid>
        ) : filteredTransactions.length === 0 ? (
          <Paper
            sx={{
              p: 4,
              textAlign: 'center',
              borderRadius: 8,
              backgroundColor: '#ffffff',
            }}
          >
            <HistoryIcon sx={{ fontSize: 48, color: '#d8d1e0', mb: 1 }} />
            <Typography variant="body1" color="#4c5454">
              Операции не найдены
            </Typography>
            <Typography variant="body2" color="#4c5454" sx={{ mt: 0.5 }}>
              {dateRange === 'day' 
                ? `За ${format(customDate, 'dd MMMM yyyy', { locale: ru })} нет операций`
                : 'Попробуйте изменить параметры поиска'}
            </Typography>
          </Paper>
        ) : (
          <>
            <Grid container spacing={1.5}>
              {filteredTransactions.map((transaction) => (
                <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={transaction.id}>
                  <TransactionCard transaction={transaction} />
                </Grid>
              ))}
            </Grid>
            {transactionsFetching && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={30} />
              </Box>
            )}
            {!transactionsFetching && transactionsData && transactionsPage >= (transactionsData.total_pages || 1) && transactionsData.total > 0 && (
              <Typography variant="body2" color="#4c5454" align="center" sx={{ mt: 2 }}>
                Загружены все операции ({transactionsData.total})
              </Typography>
            )}
          </>
        )}

        {/* Диалоги */}
        <TransactionDialog
          open={incomeDialogOpen}
          type="INCOME"
          selectedCity={selectedCity}
          onClose={() => setIncomeDialogOpen(false)}
        />

        <TransactionDialog
          open={expenseDialogOpen}
          type="EXPENSE"
          selectedCity={selectedCity}
          onClose={() => setExpenseDialogOpen(false)}
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
              backgroundColor: snackbar.severity === 'success' ? '#4caf50' : '#f44336',
              color: '#fff',
              '& .MuiAlert-icon': { color: '#fff' }
            }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default CompanyPage;