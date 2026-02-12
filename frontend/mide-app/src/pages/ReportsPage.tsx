import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Stack,
  Card,
  CardContent,
  CardActions,
  Divider,
  Avatar,
  Badge,
  Fab,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  ChevronRight as ChevronRightIcon,
  Person as PersonIcon,
  Store as StoreIcon,
  SupervisorAccount as SupervisorAccountIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon,
  Warning as WarningIcon,
  Inventory as InventoryIcon,
  AttachMoney as AttachMoneyIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { reportService } from '../api/reportService';
import { productService } from '../api/productService';
import { InventoryItem } from '../types';
import {
  Report,
  ReportStatus,
  UserRole,
  getReportStatusText,
  getReportStatusColor,
  getReportActionText,
} from '../types';

const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userInventory, setUserInventory] = useState<InventoryItem[]>([]);
  
  // Состояния для фильтров
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  
  // Загрузка отчетов
  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const reportsData = await reportService.getReports();
      setReports(reportsData);
      
      // Загружаем инвентарь только для продавца
      if (user?.role === UserRole.SELLER) {
        const inventory = await productService.getMyInventory();
        setUserInventory(inventory.items || []);
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка при загрузке отчетов');
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [user]);

  // Определяет приоритет отчета (требует действия или нет)
  const getReportPriority = (report: Report): number => {
    if (user?.role === UserRole.ACCOUNTANT && report.status === ReportStatus.AWAITING_ACCOUNTANT) return 1;
    if (user?.role === UserRole.SELLER && report.status === ReportStatus.AWAITING_FIX) return 1;
    if ([UserRole.MENTOR, UserRole.SENIOR_SELLER, UserRole.ADMIN, UserRole.OWNER].includes(user?.role as UserRole) 
        && report.status === ReportStatus.AWAITING_MANAGER) return 1;
    return 2;
  };

  // Сортировка отчетов
  const sortReports = (reports: Report[]): Report[] => {
    return [...reports].sort((a, b) => {
      const priorityA = getReportPriority(a);
      const priorityB = getReportPriority(b);
      if (priorityA !== priorityB) return priorityA - priorityB;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  };

  // Фильтрация отчетов
  const filteredReports = sortReports(reports.filter(report => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      report.id.toString().includes(searchTerm) ||
      report.sellerName?.toLowerCase().includes(searchLower) ||
      report.comment?.toLowerCase().includes(searchLower);
    
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }));

  // Обработчик создания нового отчета
  const handleCreateReport = () => {
    navigate('/reports/create');
  };

  // Обработчик действия над отчетом
  const handleReportAction = (report: Report) => {
    if (user?.role === UserRole.ACCOUNTANT && report.status === ReportStatus.AWAITING_ACCOUNTANT) {
      navigate(`/reports/${report.id}/accountant-review`);
    } else if (user?.role === UserRole.SELLER && report.status === ReportStatus.AWAITING_FIX) {
      navigate(`/reports/${report.id}/fix`);
    } else if ([UserRole.MENTOR, UserRole.SENIOR_SELLER, UserRole.ADMIN, UserRole.OWNER].includes(user?.role as UserRole) 
               && report.status === ReportStatus.AWAITING_MANAGER) {
      navigate(`/reports/${report.id}/final-approval`);
    } else {
      navigate(`/reports/${report.id}`);
    }
  };

  // Форматирование даты
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Форматирование времени
  const formatTime = (date: Date): string => {
    return new Date(date).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Получить иконку статуса
  const getStatusIcon = (status: ReportStatus) => {
    switch (status) {
      case ReportStatus.APPROVED:
        return <CheckCircleIcon sx={{ fontSize: 18 }} />;
      case ReportStatus.REJECTED:
        return <CancelIcon sx={{ fontSize: 18 }} />;
      case ReportStatus.AWAITING_FIX:
        return <WarningIcon sx={{ fontSize: 18 }} />;
      case ReportStatus.AWAITING_ACCOUNTANT:
      case ReportStatus.AWAITING_MANAGER:
        return <PendingIcon sx={{ fontSize: 18 }} />;
      default:
        return <ScheduleIcon sx={{ fontSize: 18 }} />;
    }
  };

  // Получить доступное количество товара
  const getAvailableQuantity = (productId: number): number => {
    const item = userInventory.find(i => i.productId === productId);
    return item ? item.quantity - (item.reservedQuantity || 0) : 0;
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', background: '#f5f3f6', py: 4 }}>
        <Container maxWidth="lg">
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <CircularProgress sx={{ color: '#674fb6' }} />
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', py: 3, backgroundColor: '#f5f3f6' }}>
      <Container maxWidth="lg" sx={{ px: { xs: 1, sm: 3, md: 4 } }}>
        {/* Шапка */}
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12 }}>
              <Typography variant="h5" component="h1" gutterBottom color="#2a0f35" fontWeight={600}>
                Отчеты о продажах
              </Typography>
              <Typography variant="body2" color="#4c5454">
                {user?.role === UserRole.SELLER && 'Ваши отчеты и исправления'}
                {user?.role === UserRole.ACCOUNTANT && 'Проверка отчетов бухгалтером'}
                {[UserRole.MENTOR, UserRole.SENIOR_SELLER, UserRole.ADMIN, UserRole.OWNER].includes(user?.role as UserRole) 
                  && 'Утверждение отчетов и контроль'}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Stack direction="row" spacing={1.5} justifyContent="space-between" alignItems="center">
                {user?.role !== UserRole.OWNER && user?.role !== UserRole.ACCOUNTANT && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleCreateReport}
                    fullWidth
                    sx={{
                      borderRadius: 8,
                      backgroundColor: '#674fb6',
                      '&:hover': { backgroundColor: '#483399' },
                      py: 1.2,
                      textTransform: 'none',
                      fontSize: '0.95rem',
                    }}
                  >
                    Создать отчет
                  </Button>
                )}
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={loadReports}
                  fullWidth
                  sx={{
                    borderRadius: 8,
                    borderColor: '#d8d1e0',
                    color: '#674fb6',
                    '&:hover': {
                      borderColor: '#674fb6',
                      backgroundColor: 'rgba(103, 79, 182, 0.04)',
                    },
                    py: 1.2,
                    textTransform: 'none',
                    fontSize: '0.95rem',
                  }}
                >
                  Обновить
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Box>

        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 2, 
              borderRadius: 8,
              backgroundColor: 'rgba(202, 14, 192, 0.08)',
              border: '1px solid rgba(202, 14, 192, 0.2)',
              color: '#ca0ec0',
              '& .MuiAlert-icon': { color: '#ca0ec0' }
            }}
          >
            {error}
          </Alert>
        )}

        {/* Фильтры */}
        <Paper 
          sx={{ 
            p: 2, 
            mb: 2, 
            borderRadius: 8,
            backgroundColor: '#ffffff',
            border: 'none',
            boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
          }}
        >
          <Stack spacing={2}>
            <TextField
              fullWidth
              placeholder="Поиск отчетов..."
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
            />
            
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as ReportStatus | 'all')}
                    displayEmpty
                    sx={{ 
                      borderRadius: 8,
                      backgroundColor: '#f5f3f6',
                      '& fieldset': { border: 'none' },
                      fontSize: '0.9rem',
                    }}
                  >
                    <MenuItem value="all">Все статусы</MenuItem>
                    {Object.values(ReportStatus).map((status) => (
                      <MenuItem key={status} value={status}>
                        {getReportStatusText(status)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Button
              variant="text"
              startIcon={<FilterIcon />}
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              sx={{
                borderRadius: 8,
                color: '#674fb6',
                textTransform: 'none',
                fontSize: '0.9rem',
              }}
            >
              Сбросить фильтры
            </Button>
          </Stack>
        </Paper>

        {/* Счетчик отчетов */}
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" color="#2a0f35" fontWeight={500}>
            Все отчеты
          </Typography>
          <Chip
            label={`${filteredReports.length}`}
            size="small"
            sx={{
              backgroundColor: '#f5f3f6',
              color: '#4c5454',
              fontWeight: 500,
              borderRadius: 8,
              fontSize: '0.8rem',
            }}
          />
        </Box>

        {/* Список отчетов */}
        {filteredReports.length === 0 ? (
          <Paper
            sx={{
              p: 4,
              textAlign: 'center',
              borderRadius: 8,
              backgroundColor: '#ffffff',
              border: 'none',
              boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
            }}
          >
            <Typography variant="body1" color="#4c5454">
              Отчеты не найдены
            </Typography>
            <Typography variant="body2" color="#4c5454" sx={{ mt: 0.5 }}>
              Попробуйте изменить параметры поиска
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={1.5}>
            {filteredReports.map((report) => {
              const priority = getReportPriority(report);
              const requiresAction = priority === 1;
              const actionText = getReportActionText(report.status, user?.role);
              const actionHandler = () => handleReportAction(report);
              
              return (
                <Card
                  key={report.id}
                  sx={{
                    borderRadius: 8,
                    backgroundColor: '#ffffff',
                    border: requiresAction ? '2px solid #674fb6' : 'none',
                    boxShadow: requiresAction 
                      ? '0 8px 24px rgba(103, 79, 182, 0.2)'
                      : '0 4px 12px rgba(106, 61, 122, 0.1)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      boxShadow: requiresAction 
                        ? '0 12px 32px rgba(103, 79, 182, 0.25)'
                        : '0 8px 24px rgba(106, 61, 122, 0.15)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    {/* Заголовок */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box sx={{ flex: 1, mr: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                          {getStatusIcon(report.status)}
                          <Typography variant="subtitle2" color="#674fb6" fontWeight={500}>
                            Отчет #{report.id}
                          </Typography>
                          <Box sx={{ flex: 1 }} />
                          <Chip
                            label={getReportStatusText(report.status)}
                            size="small"
                            sx={{
                              backgroundColor: `${getReportStatusColor(report.status)}15`,
                              color: getReportStatusColor(report.status),
                              fontWeight: 500,
                              borderRadius: 6,
                              fontSize: '0.7rem',
                              minWidth: 'fit-content',
                            }}
                          />
                        </Box>
                        
                        {requiresAction && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                            <Typography variant="caption" color="#674fb6" fontWeight={600}>
                              Требуется действие:
                            </Typography>
                            <Typography variant="caption" color="#4c5454">
                              {actionText}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>

                    <Divider sx={{ my: 1.5, opacity: 0.1 }} />

                    {/* Информация */}
                    <Stack spacing={1.5}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                        <Avatar
                          sx={{ 
                            width: 36, 
                            height: 36, 
                            bgcolor: '#674fb6',
                            flexShrink: 0,
                            fontSize: '0.9rem',
                          }}
                        >
                          {report.sellerName?.charAt(0) || 'П'}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                            Продавец
                          </Typography>
                          <Typography variant="body2" color="#2a0f35" fontWeight={500}>
                            {report.sellerName || `Пользователь ${report.sellerId}`}
                          </Typography>
                        </Box>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                          Товаров в отчете
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <InventoryIcon sx={{ fontSize: 16, color: '#4c5454' }} />
                          <Typography variant="body2" color="#2a0f35">
                            {report.products.reduce((sum, p) => sum + p.quantity, 0)} шт. • {report.products.length} позиций
                          </Typography>
                        </Box>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                          Сумма
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <AttachMoneyIcon sx={{ fontSize: 16, color: '#4c5454' }} />
                          <Typography variant="body2" color="#2a0f35" fontWeight={600}>
                            {report.accountantFinalAmount 
                              ? `${report.accountantFinalAmount.toFixed(2)}₽` 
                              : `${report.accountantAmount?.toFixed(2) || '0.00'}₽`}
                          </Typography>
                          {report.accountantFinalAmount && (
                            <Typography variant="caption" color="#4c5454" sx={{ ml: 0.5 }}>
                              (утв. бухгалтером)
                            </Typography>
                          )}
                        </Box>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                          Дата создания
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <ScheduleIcon sx={{ fontSize: 16, color: '#4c5454' }} />
                          <Typography variant="body2" color="#2a0f35">
                            {formatDate(report.date)} в {formatTime(report.date)}
                          </Typography>
                        </Box>
                      </Box>

                      {report.accountantComment && report.status === ReportStatus.AWAITING_FIX && (
                        <Alert 
                          severity="error" 
                          sx={{ 
                            mt: 1,
                            borderRadius: 6,
                            backgroundColor: 'rgba(244, 67, 54, 0.08)',
                            color: '#f44336',
                            '& .MuiAlert-icon': { color: '#f44336' },
                          }}
                        >
                          <Typography variant="caption" fontWeight={600}>
                            Причина отклонения:
                          </Typography>
                          <Typography variant="caption" display="block">
                            {report.accountantComment}
                          </Typography>
                        </Alert>
                      )}
                    </Stack>
                  </CardContent>

                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Button
                      fullWidth
                      variant={requiresAction ? 'contained' : 'outlined'}
                      color="primary"
                      startIcon={requiresAction ? undefined : <ChevronRightIcon sx={{ fontSize: 20 }} />}
                      onClick={actionHandler}
                      sx={{
                        borderRadius: 8,
                        py: 1,
                        textTransform: 'none',
                        fontSize: '0.9rem',
                        ...(requiresAction && {
                          backgroundColor: '#674fb6',
                          '&:hover': { backgroundColor: '#483399' },
                        }),
                        ...(!requiresAction && {
                          borderColor: '#d8d1e0',
                          color: '#674fb6',
                          '&:hover': {
                            borderColor: '#674fb6',
                            backgroundColor: 'rgba(103, 79, 182, 0.04)',
                          },
                        }),
                      }}
                    >
                      {actionText}
                    </Button>
                  </CardActions>
                </Card>
              );
            })}
          </Stack>
        )}
      </Container>
    </Box>
  );
};

export default ReportsPage;