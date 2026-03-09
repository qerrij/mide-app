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
  Alert,
  CircularProgress,
  Stack,
  Card,
  CardContent,
  CardActions,
  Divider,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  ChevronRight as ChevronRightIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Pending as PendingIcon,
  Cancel as CancelledIcon,
  Warning as WarningIcon,
  Inventory as InventoryIcon,
  AttachMoney as AttachMoneyIcon,
  Close as CloseIcon,
  VerifiedUser as VerifiedUserIcon,
  BarChart as StatsIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { rejectionService } from '../../api/rejectionService';
import { Rejection, RejectionStatus, getRejectionStatusText, getRejectionStatusColor, UserRole } from '../../types';

const DefectsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [rejections, setRejections] = useState<Rejection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Состояния для фильтров
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<RejectionStatus | 'all'>('all');
  
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedRejection, setSelectedRejection] = useState<Rejection | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [actionLoading, setActionLoading] = useState(false);

  const isAdminOrOwner = user?.role === UserRole.OWNER || user?.role === UserRole.ADMIN;

  const loadRejections = async () => {
    try {
      setLoading(true);
      setError(null);
      let data: Rejection[];
      
      if (isAdminOrOwner) {
        data = await rejectionService.getAllRejections(0, 100);
      } else {
        data = await rejectionService.getMyRejections(0, 100);
      }
      
      setRejections(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRejections();
  }, []);

  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const handleCancelClick = (rejection: Rejection, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (rejection.status !== RejectionStatus.PENDING) {
      showSnackbar('Можно отменить только браки со статусом "На рассмотрении"', 'error');
      return;
    }
    
    if (rejection.userId !== user?.id) {
      showSnackbar('Вы можете отменять только свои браки', 'error');
      return;
    }
    
    setSelectedRejection(rejection);
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!selectedRejection) return;
    
    try {
      setActionLoading(true);
      await rejectionService.cancelRejection(selectedRejection.id);
      await loadRejections();
      showSnackbar('Брак успешно отменен');
      setCancelDialogOpen(false);
      setSelectedRejection(null);
    } catch (err: any) {
      showSnackbar(err.response?.data?.detail || 'Ошибка при отмене брака', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewDetails = (rejection: Rejection) => {
    navigate(`/defects/${rejection.id}`);
  };

  // Определяет приоритет брака (требует действия или нет)
  const getRejectionPriority = (rejection: Rejection): number => {
    if (rejection.status === RejectionStatus.PENDING) return 1;
    return 2;
  };

  // Сортировка браков
  const sortRejections = (rejections: Rejection[]): Rejection[] => {
    return [...rejections].sort((a, b) => {
      const priorityA = getRejectionPriority(a);
      const priorityB = getRejectionPriority(b);
      if (priorityA !== priorityB) return priorityA - priorityB;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  };

  // Фильтрация браков
  const filteredRejections = sortRejections(rejections.filter(rejection => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      rejection.id.toString().includes(searchTerm) ||
      rejection.userName?.toLowerCase().includes(searchLower) ||
      rejection.items.some(item => 
        item.productName?.toLowerCase().includes(searchLower) ||
        item.productSku?.toLowerCase().includes(searchLower)
      );
    
    const matchesStatus = statusFilter === 'all' || rejection.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }));

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
  const getStatusIcon = (status: RejectionStatus) => {
    switch (status) {
      case RejectionStatus.APPROVED:
        return <ApprovedIcon sx={{ fontSize: 18 }} />;
      case RejectionStatus.REJECTED:
        return <RejectedIcon sx={{ fontSize: 18 }} />;
      case RejectionStatus.PENDING:
        return <PendingIcon sx={{ fontSize: 18 }} />;
      case RejectionStatus.CANCELLED:
        return <CancelledIcon sx={{ fontSize: 18 }} />;
      default:
        return <WarningIcon sx={{ fontSize: 18 }} />;
    }
  };

  // Получить текст действия для кнопки
  const getActionText = (rejection: Rejection): string => {
    if (rejection.status === RejectionStatus.PENDING) {
      return 'На рассмотрении';
    }
    return 'Просмотреть детали';
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', background: '#f5f3f6', py: 4 }}>
        <Container maxWidth="xl">
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <CircularProgress sx={{ color: '#674fb6' }} />
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', py: 3, backgroundColor: '#f5f3f6' }}>
      <Container maxWidth="xl" sx={{ px: { xs: 1, sm: 3, md: 4 } }}>
        {/* Шапка */}
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="h5" component="h1" gutterBottom color="#2a0f35" fontWeight={600}>
                Брак
              </Typography>
              <Typography variant="body2" color="#4c5454">
                Управление учетом бракованных товаров
                {user?.role === UserRole.SELLER && ' — ваши записи о браке'}
                {isAdminOrOwner && ' — все записи о браке'}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack 
                direction="row" 
                spacing={1} 
                sx={{ 
                  justifyContent: { xs: 'flex-start', md: 'flex-end' },
                  flexWrap: 'wrap',
                }}
              >
                <Button
                  variant="outlined"
                  startIcon={<StatsIcon />}
                  onClick={() => navigate('/defects/stats')}
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
                  Статистика
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/defects/create')}
                  sx={{
                    borderRadius: 8,
                    backgroundColor: '#674fb6',
                    '&:hover': { backgroundColor: '#483399' },
                    py: 1.2,
                    textTransform: 'none',
                    fontSize: '0.95rem',
                  }}
                >
                  Создать брак
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
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                placeholder="Поиск по ID, пользователю или товару..."
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
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth size="small">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as RejectionStatus | 'all')}
                  displayEmpty
                  sx={{ 
                    borderRadius: 8,
                    backgroundColor: '#f5f3f6',
                    '& fieldset': { border: 'none' },
                    fontSize: '0.9rem',
                  }}
                >
                  <MenuItem value="all">Все статусы</MenuItem>
                  <MenuItem value={RejectionStatus.PENDING}>На рассмотрении</MenuItem>
                  <MenuItem value={RejectionStatus.APPROVED}>Утвержден</MenuItem>
                  <MenuItem value={RejectionStatus.REJECTED}>Отклонен</MenuItem>
                  <MenuItem value={RejectionStatus.CANCELLED}>Отменен</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <Button
                fullWidth
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
                  height: '40px',
                  backgroundColor: '#f5f3f6',
                  '&:hover': {
                    backgroundColor: '#e8e2ed',
                  }
                }}
              >
                Сбросить
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Счетчик браков */}
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" color="#2a0f35" fontWeight={500}>
            Записи о браке
          </Typography>
          <Chip
            label={`${filteredRejections.length}`}
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

        {/* Список браков в виде карточек */}
        {filteredRejections.length === 0 ? (
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
              Записи о браке не найдены
            </Typography>
            <Typography variant="body2" color="#4c5454" sx={{ mt: 0.5 }}>
              Попробуйте изменить параметры поиска
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={2}>
            {filteredRejections.map((rejection) => {
              const priority = getRejectionPriority(rejection);
              const requiresAction = priority === 1;
              const actionText = getActionText(rejection);
              
              return (
                <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={rejection.id}>
                  <Card
                    sx={{
                      borderRadius: 8,
                      backgroundColor: '#ffffff',
                      border: requiresAction ? '2px solid #674fb6' : 'none',
                      boxShadow: requiresAction 
                        ? '0 8px 24px rgba(103, 79, 182, 0.15)'
                        : '0 4px 12px rgba(106, 61, 122, 0.1)',
                      transition: 'all 0.2s ease',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <CardContent sx={{ 
                      p: 2.5, 
                      display: 'flex', 
                      flexDirection: 'column', 
                      flex: 1,
                      minHeight: 0, // Важно для правильной работы flex-children
                    }}>
                      {/* Шапка с номером и статусом - фиксированная высота */}
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        mb: 2, 
                        flexShrink: 0,
                        height: 32, // Фиксированная высота для шапки
                      }}>
                        <Typography variant="subtitle1" fontWeight={600} color="#2a0f35">
                          Брак #{rejection.id}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {requiresAction && (
                            <Box
                              sx={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                backgroundColor: '#674fb6',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <WarningIcon sx={{ fontSize: 14, color: '#ffffff' }} />
                            </Box>
                          )}
                          <Chip
                            label={getRejectionStatusText(rejection.status)}
                            size="small"
                            sx={{
                              backgroundColor: `${getRejectionStatusColor(rejection.status)}15`,
                              color: getRejectionStatusColor(rejection.status),
                              fontWeight: 600,
                              borderRadius: 6,
                              fontSize: '0.75rem',
                            }}
                          />
                        </Box>
                      </Box>

                      {/* Сумма на карточке - фиксированная высота */}
                      <Box sx={{ 
                        mb: 2, 
                        flexShrink: 0,
                        height: 56, // Фиксированная высота для блока с суммой
                      }}>
                        <Typography variant="caption" color="#8e8e93" sx={{ mb: 0.5, display: 'block' }}>
                          Итоговая сумма
                        </Typography>
                        <Typography variant="h4" fontWeight={600} color="#2a0f35" sx={{ letterSpacing: '-0.5px' }}>
                          {rejection.totalValue.toLocaleString('ru-RU')} ₽
                        </Typography>
                      </Box>

                      {/* Информационный блок с ФИКСИРОВАННОЙ ВЫСОТОЙ - 120px */}
                      <Box sx={{ 
                        height: '120px', // Фиксированная высота для всего блока информации
                        flexShrink: 0,
                        mb: 2
                      }}>
                        {/* Строка создателя */}
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
                          <Avatar
                            sx={{
                              width: 34,
                              height: 34,
                              bgcolor: '#674fb6',
                              fontSize: '0.85rem',
                              flexShrink: 0,
                            }}
                          >
                            {rejection.userName?.charAt(0) || 'П'}
                          </Avatar>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant="caption" color="#8e8e93" display="block" lineHeight={1.2}>
                              Создатель
                            </Typography>
                            <Typography variant="body2" fontWeight={500} color="#2a0f35" noWrap>
                              {rejection.userName || `Пользователь ${rejection.userId}`}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Проверил - всегда занимает место, даже если данных нет */}
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'flex-start', 
                          gap: 1.5, 
                          mb: 1.5,
                          height: 34, // Фиксированная высота строки
                          opacity: rejection.reviewerName ? 1 : 0.4, // Полупрозрачно если нет данных
                        }}>
                          <Box sx={{ width: 34, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                            <VerifiedUserIcon sx={{ fontSize: 20, color: rejection.reviewerName ? '#8e8e93' : '#d8d1e0' }} />
                          </Box>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant="caption" color="#8e8e93" display="block" lineHeight={1.2}>
                              Проверил
                            </Typography>
                            <Typography variant="body2" color="#2a0f35" noWrap>
                              {rejection.reviewerName || '—'} {/* Заглушка когда нет проверяющего */}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Дата создания */}
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                          <Box sx={{ width: 34, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                            <ScheduleIcon sx={{ fontSize: 20, color: '#8e8e93' }} />
                          </Box>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant="caption" color="#8e8e93" display="block" lineHeight={1.2}>
                              Дата создания
                            </Typography>
                            <Typography variant="body2" color="#2a0f35">
                              {formatDate(rejection.createdAt)} в {formatTime(rejection.createdAt)}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>

                      {/* БЛОК С ПОЗИЦИЯМИ - фиксированное положение внизу */}
                      <Box sx={{ 
                        mt: 'auto', // Прижимает к низу
                        mb: 2,
                        width: '100%',
                        flexShrink: 0
                      }}>
                        <Box sx={{ 
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          width: '100%',
                          p: 1.5,
                          backgroundColor: '#f9f7fc',
                          borderRadius: 8,
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <InventoryIcon sx={{ fontSize: 20, color: '#8e8e93' }} />
                            <Typography variant="body2" color="#4c5454" fontWeight={500}>
                              Позиции
                            </Typography>
                          </Box>
                          <Typography variant="body2" fontWeight={600} color="#2a0f35">
                            {rejection.items.length} шт. • {rejection.totalItems} ед.
                          </Typography>
                        </Box>
                      </Box>

                      {/* Кнопки - фиксированная высота */}
                      <CardActions sx={{ 
                        p: 0, 
                        gap: 1, 
                        flexShrink: 0,
                        height: 48, // Фиксированная высота для блока кнопок
                      }}>
                        <Button
                          fullWidth
                          variant={requiresAction ? 'contained' : 'outlined'}
                          startIcon={<ChevronRightIcon sx={{ fontSize: 20 }} />}
                          onClick={() => handleViewDetails(rejection)}
                          sx={{
                            borderRadius: 8,
                            py: 1,
                            textTransform: 'none',
                            fontSize: '0.9rem',
                            height: 48, // Фиксированная высота кнопки
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
                          {requiresAction ? 'Требуется рассмотрение' : actionText}
                        </Button>
                        
                        {rejection.status === RejectionStatus.PENDING && rejection.userId === user?.id && (
                          <Tooltip title="Отменить брак">
                            <Button
                              variant="outlined"
                              color="error"
                              onClick={(e) => handleCancelClick(rejection, e)}
                              sx={{ 
                                minWidth: '48px',
                                width: '48px',
                                height: '48px', // Фиксированная высота кнопки
                                borderRadius: 8,
                                borderColor: '#d8e1e0',
                                color: '#674fb6',
                                '&:hover': {
                                  borderColor: '#674fb6',
                                  backgroundColor: 'rgba(103, 79, 182, 0.04)',
                                },
                              }}
                            >
                              <CloseIcon />
                            </Button>
                          </Tooltip>
                        )}
                      </CardActions>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        {/* Диалог отмены брака */}
        <Dialog
          open={cancelDialogOpen}
          onClose={() => {
            setCancelDialogOpen(false);
            setSelectedRejection(null);
          }}
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
          <DialogTitle sx={{ p: 2.5, pb: 1 }}>
            <Typography variant="h6" color="#2a0f35" fontWeight={600} sx={{ mb: 0.5 }}>
              Отмена брака
            </Typography>
            <Typography variant="body2" color="#4c5454" sx={{ fontSize: '0.85rem' }}>
              Вы уверены, что хотите отменить брак #{selectedRejection?.id}?
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ p: 2.5, pt: 2 }}>
            <Box sx={{ 
              p: 2, 
              backgroundColor: 'rgba(103, 79, 182, 0.04)',
              borderRadius: 4,
              border: '1px solid rgba(103, 79, 182, 0.1)',
            }}>
              <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                СУММА К ОТМЕНЕ
              </Typography>
              <Typography variant="h5" color="#674fb6" fontWeight={700}>
                {selectedRejection?.totalValue.toLocaleString('ru-RU', {
                  style: 'currency',
                  currency: 'RUB',
                  minimumFractionDigits: 0,
                })}
              </Typography>
              <Typography variant="caption" color="#4c5454" display="block" sx={{ mt: 1 }}>
                Это действие нельзя отменить
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}>
            <Button
              onClick={() => {
                setCancelDialogOpen(false);
                setSelectedRejection(null);
              }}
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
              variant="contained"
              onClick={handleCancelConfirm}
              disabled={actionLoading}
              sx={{ 
                borderRadius: 4,
                backgroundColor: '#674fb6',
                '&:hover': { backgroundColor: '#483399' },
                px: 3,
                py: 1,
                textTransform: 'none',
                fontSize: '0.95rem',
                fontWeight: 500,
              }}
            >
              {actionLoading ? <CircularProgress size={24} /> : 'Отменить брак'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default DefectsPage;