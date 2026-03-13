import React, { useState, useEffect } from 'react';
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
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { companyService } from '../../api/companyService';
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

// Типы
type DateRangeType = 'day' | 'week' | 'month' | 'all';

// Интерфейсы для пропсов диалога
interface TransactionDialogProps {
  open: boolean;
  type: 'INCOME' | 'EXPENSE';
  onClose: () => void;
  onSuccess: () => void;
}

// Компонент диалога для добавления дохода/расхода
const TransactionDialog: React.FC<TransactionDialogProps> = ({
  open,
  type,
  onClose,
  onSuccess,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Введите корректную сумму');
      return;
    }
    if (!description.trim()) {
      setError('Введите описание операции');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (type === 'INCOME') {
        await companyService.addIncome({
          amount: parseFloat(amount),
          description: description.trim(),
        });
      } else {
        await companyService.addExpense({
          amount: parseFloat(amount),
          description: description.trim(),
        });
      }
      
      setAmount('');
      setDescription('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка при выполнении операции');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
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
      </DialogTitle>
      
      <IconButton
        onClick={onClose}
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
              disabled={loading}
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
              disabled={loading}
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
          onClick={onClose}
          disabled={loading}
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
          disabled={loading}
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
          {loading ? <CircularProgress size={24} color="inherit" /> : (type === 'INCOME' ? 'Добавить' : 'Списать')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Кастомный Tooltip для графика
const CustomAreaTooltip = ({ active, payload, label }: any) => {
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

// Компонент кастомных табов в виде чипсов
const ChipTabs: React.FC<{
  value: number;
  onChange: (value: number) => void;
  tabs: Array<{ label: string; icon: React.ReactNode; count: number }>;
}> = ({ value, onChange, tabs }) => {
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
};

// Функция форматирования суммы с копейками
const formatAmount = (amount: number) => {
  const rubles = Math.floor(amount);
  const kopecks = Math.round((amount - rubles) * 100);
  
  if (kopecks > 0) {
    return (
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'baseline' }}>
        <span>₽{rubles.toLocaleString('ru-RU')}</span>
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

// Компонент выбора даты
// Компонент выбора даты
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
  onResetDateRange: () => void; // Новая функция для сброса
}> = ({ 
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
};

// Основной компонент страницы
const CompanyPage: React.FC = () => {
  const { user } = useAuth();
  const canEdit = user?.role === UserRole.OWNER || user?.role === UserRole.ACCOUNTANT;

  // Состояния
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<CompanyTransaction[]>([]);
  const [history, setHistory] = useState<CompanyBalanceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  
  // Фильтры
  const [searchTerm, setSearchTerm] = useState('');
  const [operationFilter, setOperationFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRangeType>('month');
  const [customDate, setCustomDate] = useState<Date>(new Date());
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [tempStartDate, setTempStartDate] = useState<Date | null>(null);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(null);
  const [appliedStartDate, setAppliedStartDate] = useState<Date | null>(null);
  const [appliedEndDate, setAppliedEndDate] = useState<Date | null>(null);
  
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

  // Загрузка данных
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Загружаем баланс
      const balanceData = await companyService.getBalance();
      setBalance(balanceData.balance);
      
      // Загружаем транзакции (последние 100)
      const transactionsData = await companyService.getTransactions({ limit: 100 });
      setTransactions(transactionsData);
      
      // Загружаем историю в зависимости от выбранного периода
      if (dateRange === 'day') {
        // Для дня загружаем почасовую статистику
        const historyData = await companyService.getBalanceHistory({ 
          days: 1,
          granularity: 'hour',
          date: format(customDate, 'yyyy-MM-dd')
        });
        setHistory(historyData);
      } else if (dateRange === 'all') {
        if (appliedStartDate && appliedEndDate) {
          const daysDiff = Math.ceil((appliedEndDate.getTime() - appliedStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          const historyData = await companyService.getBalanceHistory({ 
            days: Math.min(daysDiff, 365), // Не больше 365 дней
            granularity: 'day',
            date: format(appliedStartDate, 'yyyy-MM-dd')
          });
          setHistory(historyData);
        } else {
          // Если даты не выбраны, загружаем за 30 дней по умолчанию
          const historyData = await companyService.getBalanceHistory({ 
            days: 365,
            granularity: 'day'
          });
          setHistory(historyData);
        }
      } else {
        // Для недели/месяца загружаем дневную статистику
        const days = dateRange === 'week' ? 7 : 30;
        const historyData = await companyService.getBalanceHistory({ 
          days,
          granularity: 'day'
        });
        setHistory(historyData);
      }
    } catch (error) {
      console.error('Error loading company data:', error);
      showSnackbar('Ошибка загрузки данных', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateRange, customDate, appliedStartDate, appliedEndDate]);

  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const getFilteredTransactions = () => {
    let filtered = transactions;

    if (activeTab === 1) {
      filtered = filtered.filter(t => t.operation_type === 'INCOME');
    } else if (activeTab === 2) {
      filtered = filtered.filter(t => t.operation_type === 'EXPENSE');
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchLower) ||
        (t.reference_type?.toLowerCase() || '').includes(searchLower)
      );
    }

    if (operationFilter !== 'all') {
      if (operationFilter === 'REPORT_INCOME') {
        filtered = filtered.filter(t => 
          t.operation_type === 'INCOME' && t.reference_type === 'REPORT'
        );
      } else {
        filtered = filtered.filter(t => t.operation_type === operationFilter);
      }
    }

    // Фильтр по дате
    if (dateRange === 'day') {
      const startOfSelectedDay = startOfDay(customDate);
      const endOfSelectedDay = endOfDay(customDate);
      
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.created_at);
        return transactionDate >= startOfSelectedDay && transactionDate <= endOfSelectedDay;
      });
    } else if (dateRange === 'all' && appliedStartDate && appliedEndDate) {
      const startOfSelectedRange = startOfDay(appliedStartDate);
      const endOfSelectedRange = endOfDay(appliedEndDate);
      
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.created_at);
        return transactionDate >= startOfSelectedRange && transactionDate <= endOfSelectedRange;
      });
    }

    return filtered;
  };

  const filteredTransactions = getFilteredTransactions();
  const handleDateRangeChange = (newRange: DateRangeType) => {
    setDateRange(newRange);
    if (newRange !== 'all') {
      setTempStartDate(null);
      setTempEndDate(null);
      setAppliedStartDate(null);
      setAppliedEndDate(null);
    }
  };

  const handleApplyDateRange = () => {
    if (tempStartDate && tempEndDate) {
      setAppliedStartDate(tempStartDate);
      setAppliedEndDate(tempEndDate);
    }
  };

  const handleResetDateRange = () => {
    setTempStartDate(null);
    setTempEndDate(null);
    setAppliedStartDate(null);
    setAppliedEndDate(null);
    loadData();
  };

  useEffect(() => {
    if (dateRange === 'all') {
      setTempStartDate(appliedStartDate);
      setTempEndDate(appliedEndDate);
    }
  }, [dateRange, appliedStartDate, appliedEndDate]);

  const periodStats = {
    totalRegularIncome: filteredTransactions
      .filter(t => t.operation_type === 'INCOME' && t.reference_type !== 'REPORT')
      .reduce((sum, t) => sum + t.amount, 0),
    totalReportIncome: filteredTransactions
      .filter(t => t.operation_type === 'INCOME' && t.reference_type === 'REPORT')
      .reduce((sum, t) => sum + t.amount, 0),
    totalExpense: filteredTransactions
      .filter(t => t.operation_type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0),
    transactionsCount: filteredTransactions.length,
  };
  // Общая статистика (за все время)
  const totalStats = {
    totalIncome: transactions
      .filter(t => t.operation_type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0),
    totalExpense: transactions
      .filter(t => t.operation_type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0),
    transactionsCount: transactions.length,
  };

  const getChartData = () => {
    if (!history || history.length === 0) {
      return [{
        id: 'current',
        displayLabel: dateRange === 'day' 
          ? format(new Date(), 'HH:mm')
          : format(new Date(), 'dd MMM', { locale: ru }),
        balance: balance,
        fullDate: new Date().toISOString(),
        timestamp: new Date().getTime(),
        uniqueKey: `current-${Date.now()}`
      }];
    }

    // Сортируем по дате
    const sortedHistory = [...history].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return sortedHistory.map((item, index) => {
      const date = new Date(item.date);
      const timestamp = date.getTime();
      
      // Создаем уникальный ключ из индекса, timestamp и баланса
      const uniqueKey = `point-${index}-${timestamp}-${item.balance}-${Math.random()}`;
      
      // Для дневного режима
      if (dateRange === 'day') {
        return {
          id: uniqueKey,
          displayLabel: format(date, 'HH:mm'),
          balance: item.balance,
          fullDate: item.date,
          timestamp: timestamp,
          index: index, // Добавляем индекс для отслеживания
          tooltipLabel: format(date, 'dd MMM yyyy, HH:mm:ss', { locale: ru })
        };
      } 
      // Для недели/месяца
      else {
        return {
          id: uniqueKey,
          displayLabel: format(date, 'dd MMM HH:mm', { locale: ru }),
          balance: item.balance,
          fullDate: item.date,
          timestamp: timestamp,
          index: index,
          tooltipLabel: format(date, 'dd MMM yyyy, HH:mm:ss', { locale: ru })
        };
      }
    });
  };

  const chartData = getChartData();

  const pieData = [
    { 
      name: 'Обычные доходы', 
      value: periodStats.totalRegularIncome, 
      color: '#4caf50' // Зеленый
    },
    { 
      name: 'Доходы от отчетов', 
      value: periodStats.totalReportIncome, 
      color: '#2196f3' // Синий
    },
    { 
      name: 'Расходы', 
      value: periodStats.totalExpense, 
      color: '#f44336' // Красный
    },
  ].filter(item => item.value > 0);

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd MMM yyyy, HH:mm', { locale: ru });
  };

  // Конфигурация табов
  const tabs = [
    {
      label: 'Все',
      icon: <HistoryIcon sx={{ fontSize: 18 }} />,
      count: transactions.length,
    },
    {
      label: 'Доходы',
      icon: <IncomeIcon sx={{ fontSize: 18 }} />,
      count: transactions.filter(t => t.operation_type === 'INCOME').length,
    },
    {
      label: 'Расходы',
      icon: <ExpenseIcon sx={{ fontSize: 18 }} />,
      count: transactions.filter(t => t.operation_type === 'EXPENSE').length,
    },
  ];

  if (loading && !transactions.length) {
    return (
      <Box sx={{ minHeight: '100vh', background: '#f5f3f6', py: 2 }}>
        <Container maxWidth="xl">
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <CircularProgress sx={{ color: '#674fb6' }} />
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', py: 2, backgroundColor: '#f5f3f6' }}>
      <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3 } }}>
        {/* Шапка */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          mb: 2
        }}>
          <Box>
            <Typography variant="h5" component="h1" color="#2a0f35" fontWeight={600}>
              Бухгалтерия
            </Typography>
            <Typography variant="body2" color="#4c5454">
              Управление финансами компании
            </Typography>
          </Box>
          <IconButton
            onClick={loadData}
            disabled={loading}
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
              animation: loading ? 'spin 1s linear infinite' : 'none',
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
                Текущий баланс компании
              </Typography>
              <Typography variant="h2" component="div" sx={{ fontWeight: 700, mb: 1, color: '#000000' }}>
                {formatAmount(balance)}
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
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="subtitle1" color="#2a0f35" fontWeight={600}>
                  {dateRange === 'day' 
                    ? `Динамика баланса за ${format(customDate, 'dd MMMM yyyy', { locale: ru })}` 
                    : dateRange === 'week' 
                      ? 'Динамика баланса за неделю'
                      : dateRange === 'month'
                        ? 'Динамика баланса за месяц'
                        : startDate && endDate
                          ? `Динамика баланса с ${format(startDate, 'dd MMM yyyy', { locale: ru })} по ${format(endDate, 'dd MMM yyyy', { locale: ru })}`
                          : 'Динамика баланса за все время'}
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

              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart 
                    data={chartData}
                    key={`${dateRange}-${customDate.toISOString()}-${history.length}`}
                  >
                    <defs>
                      <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#674fb6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#674fb6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="displayLabel"
                      tick={{ fill: '#4c5454', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      interval={dateRange === 'day' ? 2 : 'preserveStartEnd'}
                    />
                    <YAxis 
                      tick={{ fill: '#4c5454', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `${(value / 1000).toFixed(1)}K`}
                    />
                    <Tooltip content={<CustomAreaTooltip />} />
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
                {dateRange === 'day' 
                  ? `Операции за ${format(customDate, 'dd MMM', { locale: ru })}` 
                  : dateRange === 'week' 
                    ? 'Операции за неделю'
                    : dateRange === 'month'
                      ? 'Операции за месяц'
                      : appliedStartDate && appliedEndDate
                        ? `Операции с ${format(appliedStartDate, 'dd MMM', { locale: ru })} по ${format(appliedEndDate, 'dd MMM', { locale: ru })}`
                        : 'Операции за все время'}
              </Typography>
              {pieData.length > 0 ? (
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
                      Обычные доходы: {formatAmount(periodStats.totalRegularIncome)}<br />
                      Доходы от отчетов: {formatAmount(periodStats.totalReportIncome)}<br />
                      Расходы: {formatAmount(periodStats.totalExpense)}
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
            onChange={setActiveTab}
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
            <Grid size={{ xs: 6, md: 3 }}>
              <FormControl fullWidth size="small">
                <Select
                  value={operationFilter}
                  onChange={(e) => setOperationFilter(e.target.value)}
                  sx={{ 
                    borderRadius: 8,
                    backgroundColor: '#f5f3f6',
                    '& fieldset': { border: 'none' },
                  }}
                >
                  <MenuItem value="all">Все типы</MenuItem>
                  <MenuItem value="INCOME">Доходы (все)</MenuItem>
                  <MenuItem value="REPORT_INCOME">Доходы от отчетов</MenuItem>
                  <MenuItem value="EXPENSE">Расходы</MenuItem>
                  <MenuItem value="CORRECTION">Коррекции</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Button
                fullWidth
                variant="text"
                startIcon={<FilterIcon />}
                onClick={() => {
                  setSearchTerm('');
                  setOperationFilter('all');
                  setActiveTab(0);
                }}
                sx={{
                  borderRadius: 8,
                  color: '#674fb6',
                  textTransform: 'none',
                }}
              >
                Сбросить фильтры
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Список транзакций */}
        {filteredTransactions.length === 0 ? (
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
          <Grid container spacing={1.5}>
            {filteredTransactions.map((transaction) => {
              const isIncome = transaction.operation_type === 'INCOME';
              const isExpense = transaction.operation_type === 'EXPENSE';
              const isReportIncome = isIncome && transaction.reference_type === 'REPORT';

              let IconComponent = isIncome ? IncomeIcon : isExpense ? ExpenseIcon : CorrectionIcon;
              let color = '#ff9800';

              if (isReportIncome) {
                color = '#2196f3'; 
              } else if (isIncome) {
                color = '#4caf50'; 
              } else if (isExpense) {
                color = '#f44336'; 
              }
              
              return (
                <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={transaction.id}>
                  <Fade in timeout={300}>
                    <Card
                      sx={{
                        borderRadius: 8,
                        backgroundColor: '#ffffff',
                        transition: 'all 0.2s ease',
                        border: '1px solid #f0f0f0',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 8px 24px rgba(106, 61, 122, 0.15)',
                          borderColor: color,
                        },
                      }}
                    >
                      <CardContent sx={{ p: 2 }}>
                        {/* Верхняя часть с типом и суммой */}
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

                        {/* Описание */}
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

                        {/* Дополнительная информация */}
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
                              label={transaction.reference_type === 'REPORT' ? 'Отчет' : transaction.reference_type}
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
                </Grid>
              );
            })}
          </Grid>
        )}

        {/* Диалоги */}
        <TransactionDialog
          open={incomeDialogOpen}
          type="INCOME"
          onClose={() => setIncomeDialogOpen(false)}
          onSuccess={() => {
            showSnackbar('Доход успешно добавлен', 'success');
            loadData();
          }}
        />

        <TransactionDialog
          open={expenseDialogOpen}
          type="EXPENSE"
          onClose={() => setExpenseDialogOpen(false)}
          onSuccess={() => {
            showSnackbar('Расход успешно добавлен', 'success');
            loadData();
          }}
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