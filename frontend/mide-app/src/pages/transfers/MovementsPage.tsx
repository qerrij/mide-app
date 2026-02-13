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
  Badge,
  Fab,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Tabs,
  Tab,
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
  TransferWithinAStation as TransferIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  CheckCircle as ApproveIcon,
  PlayArrow as StartIcon,
  LocalShipping as InTransitIcon,
  Assignment as ExecuteIcon,
  AttachMoney as AttachMoneyIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { transferService } from '../../api/transferService';
import { userService } from '../../api/userService';
import {
  Transfer,
  TransferStatus,
  TransferRequestType,
  getTransferStatusText,
  getTransferStatusColor,
  getRequestTypeText,
  UserRole,
} from '../../types';

const MovementsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [managerRequests, setManagerRequests] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [users, setUsers] = useState<{ [key: number]: string }>({});
  
  // Состояния для фильтров
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TransferStatus | 'all'>('all');
  
  // Модальные окна и уведомления
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectManagerDialogOpen, setRejectManagerDialogOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [actionLoading, setActionLoading] = useState(false);

  const loadTransfers = async () => {
    try {
      setLoading(true);
      const [transfersData, requestsData] = await Promise.all([
        transferService.getTransfers(0, 100, statusFilter !== 'all' ? statusFilter : undefined),
        transferService.getManagerRequests()
      ]);
      
      setTransfers(transfersData);
      setManagerRequests(requestsData);
      
      // Загружаем имена пользователей
      const userIds = new Set<number>();
      [...transfersData, ...requestsData].forEach(transfer => {
        userIds.add(transfer.fromUserId);
        userIds.add(transfer.toUserId);
        if (transfer.executorId) userIds.add(transfer.executorId);
        userIds.add(transfer.createdById);
      });
      
      if (userIds.size > 0) {
        const names = await userService.getUsersNames(Array.from(userIds));
        setUsers(names);
      }
    } catch (error) {
      console.error('Error loading transfers:', error);
      showSnackbar('Ошибка загрузки перемещений', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransfers();
  }, [statusFilter]);

  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const openConfirmDialog = (transfer: Transfer, action: 'approve' | 'start') => {
    setSelectedTransfer(transfer);
    setConfirmDialogOpen(true);
  };

  const openRejectDialog = (transfer: Transfer, isManagerRequest: boolean = false) => {
    setSelectedTransfer(transfer);
    setRejectReason('');
    if (isManagerRequest) {
      setRejectManagerDialogOpen(true);
    } else {
      setRejectDialogOpen(true);
    }
  };

  const handleConfirmAction = async () => {
    if (!selectedTransfer) return;
    
    try {
      setActionLoading(true);
      
      if (selectedTransfer.status === TransferStatus.PENDING_APPROVAL) {
        await transferService.approveTransfer(selectedTransfer.id, {
          approved: true,
          notes: 'Подтверждено через интерфейс'
        });
        showSnackbar('Перемещение подтверждено');
      } else if (selectedTransfer.status === TransferStatus.APPROVED) {
        await transferService.startTransfer(selectedTransfer.id);
        showSnackbar('Перемещение начато');
      }
      
      await loadTransfers();
      setConfirmDialogOpen(false);
      setSelectedTransfer(null);
    } catch (error) {
      console.error('Error performing action:', error);
      showSnackbar('Ошибка при выполнении действия', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectAction = async () => {
    if (!selectedTransfer) return;
    
    if (!rejectReason.trim()) {
      showSnackbar('Укажите причину отклонения', 'error');
      return;
    }
    
    try {
      setActionLoading(true);
      
      if (selectedTransfer.requestType === TransferRequestType.MANAGER_REQUEST) {
        await transferService.rejectManagerRequest(selectedTransfer.id, { reason: rejectReason });
        showSnackbar('Запрос отклонен');
      } else {
        await transferService.approveTransfer(selectedTransfer.id, {
          approved: false,
          notes: rejectReason
        });
        showSnackbar('Перемещение отклонено');
      }
      
      await loadTransfers();
      setRejectDialogOpen(false);
      setRejectManagerDialogOpen(false);
      setSelectedTransfer(null);
      setRejectReason('');
    } catch (error) {
      console.error('Error rejecting:', error);
      showSnackbar('Ошибка при отклонении', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecuteManagerRequest = (transferId: number) => {
    navigate(`/movements/${transferId}/execute-manager-request`);
  };

  // Определяет приоритет перемещения (требует действия или нет)
  const getTransferPriority = (transfer: Transfer): number => {
    if (transfer.canApprove && transfer.status === TransferStatus.PENDING_APPROVAL) return 1;
    if (transfer.canExecute && transfer.status === TransferStatus.REQUESTED && 
        transfer.requestType === TransferRequestType.MANAGER_REQUEST) return 1;
    if ((transfer.fromUserId === user?.id || transfer.executorId === user?.id) &&
        transfer.status === TransferStatus.APPROVED) return 1;
    if (transfer.toUserId === user?.id && transfer.status === TransferStatus.IN_TRANSIT) return 1;
    if (transfer.canApprove && transfer.status === TransferStatus.CHECKING) return 1;
    return 2;
  };

  // Сортировка перемещений
  const sortTransfers = (transfers: Transfer[]): Transfer[] => {
    return [...transfers].sort((a, b) => {
      const priorityA = getTransferPriority(a);
      const priorityB = getTransferPriority(b);
      if (priorityA !== priorityB) return priorityA - priorityB;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  };

  // Фильтрация перемещений
  const getFilteredTransfers = () => {
    let filtered = activeTab === 0 ? transfers : managerRequests;
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(transfer =>
        transfer.title.toLowerCase().includes(searchLower) ||
        transfer.description?.toLowerCase().includes(searchLower) ||
        (users[transfer.fromUserId] || '').toLowerCase().includes(searchLower) ||
        (users[transfer.toUserId] || '').toLowerCase().includes(searchLower)
      );
    }
    
    return sortTransfers(filtered);
  };

  const filteredTransfers = getFilteredTransfers();

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
  const getStatusIcon = (status: TransferStatus) => {
    switch (status) {
      case TransferStatus.COMPLETED:
        return <CheckCircleIcon sx={{ fontSize: 18 }} />;
      case TransferStatus.CANCELLED:
      case TransferStatus.REJECTED:
        return <CancelIcon sx={{ fontSize: 18 }} />;
      case TransferStatus.PENDING_APPROVAL:
      case TransferStatus.REQUESTED:
        return <PendingIcon sx={{ fontSize: 18 }} />;
      case TransferStatus.APPROVED:
        return <CheckCircleIcon sx={{ fontSize: 18 }} />;
      case TransferStatus.IN_TRANSIT:
        return <InTransitIcon sx={{ fontSize: 18 }} />;
      case TransferStatus.CHECKING:
        return <WarningIcon sx={{ fontSize: 18 }} />;
      default:
        return <ScheduleIcon sx={{ fontSize: 18 }} />;
    }
  };

  const getActionText = (transfer: Transfer): string => {
    if (transfer.canApprove && transfer.status === TransferStatus.PENDING_APPROVAL) {
      return 'Подтвердить';
    }
    if (transfer.canExecute && transfer.status === TransferStatus.REQUESTED && 
        transfer.requestType === TransferRequestType.MANAGER_REQUEST) {
      return 'Выполнить запрос';
    }
    if ((transfer.fromUserId === user?.id || transfer.executorId === user?.id) &&
        transfer.status === TransferStatus.APPROVED) {
      return 'Начать';
    }
    if (transfer.toUserId === user?.id && transfer.status === TransferStatus.IN_TRANSIT) {
      return 'Принять';
    }
    if (transfer.canApprove && transfer.status === TransferStatus.CHECKING) {
      return 'Проверить';
    }
    return 'Подробнее';
  };

  const handleTransferAction = (transfer: Transfer) => {
    if (transfer.canApprove && transfer.status === TransferStatus.PENDING_APPROVAL) {
      openConfirmDialog(transfer, 'approve');
    } else if (transfer.canExecute && transfer.status === TransferStatus.REQUESTED && 
        transfer.requestType === TransferRequestType.MANAGER_REQUEST) {
      handleExecuteManagerRequest(transfer.id);
    } else if ((transfer.fromUserId === user?.id || transfer.executorId === user?.id) &&
        transfer.status === TransferStatus.APPROVED) {
      openConfirmDialog(transfer, 'start');
    } else if (transfer.toUserId === user?.id && transfer.status === TransferStatus.IN_TRANSIT) {
      navigate(`/movements/${transfer.id}/arrived`);
    } else if (transfer.canApprove && transfer.status === TransferStatus.CHECKING) {
      navigate(`/movements/${transfer.id}/verify-discrepancy`);
    } else {
      navigate(`/movements/${transfer.id}`);
    }
  };

  if (loading && !transfers.length && !managerRequests.length) {
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
                Перемещения товаров
              </Typography>
              <Typography variant="body2" color="#4c5454">
                Управление перемещениями товаров между пользователями
              </Typography>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Stack 
                direction={{ xs: 'column', sm: 'row' }} 
                spacing={{ xs: 1, sm: 1.5 }} 
                justifyContent="space-between" 
                alignItems="stretch"
                sx={{
                  width: '100%',
                }}
              >
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/movements/create')}
                  fullWidth
                  sx={{
                    borderRadius: 8,
                    backgroundColor: '#674fb6',
                    '&:hover': { backgroundColor: '#483399' },
                    py: 1.2,
                    textTransform: 'none',
                    fontSize: { xs: '0.9rem', sm: '0.95rem' },
                    whiteSpace: 'nowrap',
                    flex: { sm: 1 },
                  }}
                >
                  Новое перемещение
                </Button>
                
                {(user?.role === UserRole.OWNER || 
                  user?.role === UserRole.ADMIN || 
                  user?.role === UserRole.SENIOR_SELLER || 
                  user?.role === UserRole.MENTOR) && (
                  <Button
                    variant="contained"
                    startIcon={<SupervisorAccountIcon />}
                    onClick={() => navigate('/movements/create-manager')}
                    fullWidth
                    sx={{
                      borderRadius: 8,
                      backgroundColor: '#9c27b0',
                      '&:hover': { backgroundColor: '#7b1fa2' },
                      py: 1.2,
                      textTransform: 'none',
                      fontSize: { xs: '0.9rem', sm: '0.95rem' },
                      whiteSpace: 'nowrap',
                      flex: { sm: 1 },
                    }}
                  >
                    Запрос руководителя
                  </Button>
                )}
              </Stack>
            </Grid>
          </Grid>
        </Box>

        {/* Табы */}
        <Paper 
          sx={{ 
            mb: 2, 
            borderRadius: 8,
            backgroundColor: '#ffffff',
            border: 'none',
            boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
            overflow: 'hidden'
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontSize: { xs: '0.8rem', sm: '0.9rem' },
                fontWeight: 500,
                color: '#4c5454',
                '&.Mui-selected': {
                  color: '#674fb6',
                },
                minHeight: 56,
                px: { xs: 1, sm: 2 }
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#674fb6',
              },
            }}
          >
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <TransferIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />
                  <span>Все</span>
                  <Chip 
                    label={transfers.length} 
                    size="small" 
                    sx={{ 
                      height: 20, 
                      fontSize: '0.7rem',
                      backgroundColor: activeTab === 0 ? '#674fb6' : '#f5f3f6',
                      color: activeTab === 0 ? '#fff' : '#4c5454',
                      ml: 0.5
                    }} 
                  />
                </Box>
              } 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <SupervisorAccountIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />
                  <span>Запросы</span>
                  <Chip 
                    label={managerRequests.length} 
                    size="small"
                    sx={{ 
                      height: 20, 
                      fontSize: '0.7rem',
                      backgroundColor: activeTab === 1 ? '#674fb6' : '#f5f3f6',
                      color: activeTab === 1 ? '#fff' : '#4c5454',
                      ml: 0.5
                    }}
                  />
                </Box>
              } 
            />
          </Tabs>
        </Paper>

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
              placeholder="Поиск перемещений..."
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
              size={isMobile ? "small" : "medium"}
            />
            
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as TransferStatus | 'all')}
                    displayEmpty
                    size={isMobile ? "small" : "medium"}
                    sx={{ 
                      borderRadius: 8,
                      backgroundColor: '#f5f3f6',
                      '& fieldset': { border: 'none' },
                      fontSize: '0.9rem',
                    }}
                  >
                    <MenuItem value="all">Все статусы</MenuItem>
                    {Object.values(TransferStatus).map((status) => (
                      <MenuItem key={status} value={status}>
                        {getTransferStatusText(status)}
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
                alignSelf: 'flex-start',
              }}
            >
              Сбросить фильтры
            </Button>
          </Stack>
        </Paper>

        {/* Счетчик */}
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" color="#2a0f35" fontWeight={500}>
            {activeTab === 0 ? 'Все перемещения' : 'Запросы от руководителей'}
          </Typography>
          <Chip
            label={`${filteredTransfers.length}`}
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

        {/* Список перемещений */}
        {filteredTransfers.length === 0 ? (
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
              {activeTab === 0 ? 'Перемещения не найдены' : 'Запросы не найдены'}
            </Typography>
            <Typography variant="body2" color="#4c5454" sx={{ mt: 0.5 }}>
              Попробуйте изменить параметры поиска
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={1.5}>
            {filteredTransfers.map((transfer) => {
              const priority = getTransferPriority(transfer);
              const requiresAction = priority === 1;
              const actionText = getActionText(transfer);
              
              return (
                <Card
                  key={transfer.id}
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
                          {getStatusIcon(transfer.status)}
                          <Typography variant="subtitle2" color="#674fb6" fontWeight={500}>
                            {transfer.title}
                          </Typography>
                          <Box sx={{ flex: 1 }} />
                          <Chip
                            label={getRequestTypeText(transfer.requestType)}
                            size="small"
                            sx={{
                              backgroundColor: transfer.requestType === TransferRequestType.USER_REQUEST 
                                ? '#2196f320' 
                                : '#673ab720',
                              color: transfer.requestType === TransferRequestType.USER_REQUEST 
                                ? '#2196f3' 
                                : '#673ab7',
                              fontWeight: 500,
                              borderRadius: 6,
                              fontSize: '0.7rem',
                              minWidth: 'fit-content',
                            }}
                          />
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                          <Chip
                            label={getTransferStatusText(transfer.status)}
                            size="small"
                            sx={{
                              backgroundColor: `${getTransferStatusColor(transfer.status)}15`,
                              color: getTransferStatusColor(transfer.status),
                              fontWeight: 500,
                              borderRadius: 6,
                              fontSize: '0.7rem',
                            }}
                          />
                        </Box>

                        {transfer.status === TransferStatus.PENDING_APPROVAL && 
                         transfer.pendingApprovals.length > 0 && (
                          <Typography variant="caption" sx={{ display: 'block', color: '#ff9800', mt: 0.5 }}>
                            Ожидает: {transfer.pendingApprovals.length}
                          </Typography>
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
                            bgcolor: '#4caf50',
                            flexShrink: 0,
                            fontSize: '0.9rem',
                          }}
                        >
                          <PersonIcon sx={{ fontSize: 18 }} />
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                            Отправитель
                          </Typography>
                          <Typography variant="body2" color="#2a0f35" fontWeight={500}>
                            {users[transfer.fromUserId] || `Пользователь ${transfer.fromUserId}`}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                        <Avatar
                          sx={{ 
                            width: 36, 
                            height: 36, 
                            bgcolor: '#2196f3',
                            flexShrink: 0,
                            fontSize: '0.9rem',
                          }}
                        >
                          <PersonIcon sx={{ fontSize: 18 }} />
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                            Получатель
                          </Typography>
                          <Typography variant="body2" color="#2a0f35" fontWeight={500}>
                            {users[transfer.toUserId] || `Пользователь ${transfer.toUserId}`}
                          </Typography>
                        </Box>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                          Товары
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <InventoryIcon sx={{ fontSize: 16, color: '#4c5454' }} />
                          <Typography variant="body2" color="#2a0f35">
                            {transfer.totalItems || 0} позиций • {transfer.totalQuantity || 0} ед.
                          </Typography>
                        </Box>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                          Дата создания
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <ScheduleIcon sx={{ fontSize: 16, color: '#4c5454' }} />
                          <Typography variant="body2" color="#2a0f35">
                            {formatDate(transfer.createdAt)} в {formatTime(transfer.createdAt)}
                          </Typography>
                        </Box>
                      </Box>

                      {transfer.executorId && (
                        <Box>
                          <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                            Исполнитель
                          </Typography>
                          <Typography variant="body2" color="#2a0f35">
                            {users[transfer.executorId] || `Пользователь ${transfer.executorId}`}
                          </Typography>
                        </Box>
                      )}

                      {transfer.description && (
                        <Box>
                          <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                            Описание
                          </Typography>
                          <Typography variant="body2" color="#2a0f35">
                            {transfer.description}
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </CardContent>

                  <CardActions sx={{ p: 2, pt: 0, flexDirection: 'column', gap: 1 }}>
                    {/* Верхний ряд кнопок */}
                    <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
                      {requiresAction ? (
                        // Для карточек с действием - показываем кнопку действия на всю ширину
                        <Button
                          fullWidth
                          variant="contained"
                          color="primary"
                          onClick={() => handleTransferAction(transfer)}
                          sx={{
                            borderRadius: 8,
                            py: 1,
                            textTransform: 'none',
                            fontSize: '0.9rem',
                            backgroundColor: '#674fb6',
                            '&:hover': { backgroundColor: '#483399' },
                          }}
                        >
                          {actionText}
                        </Button>
                      ) : (
                        // Для карточек без действия - показываем кнопку "Подробнее" на всю ширину
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={<InfoIcon />}
                          onClick={() => navigate(`/movements/${transfer.id}`)}
                          sx={{
                            borderRadius: 8,
                            py: 1,
                            textTransform: 'none',
                            fontSize: '0.9rem',
                            borderColor: '#d8d1e0',
                            color: '#674fb6',
                            '&:hover': {
                              borderColor: '#674fb6',
                              backgroundColor: 'rgba(103, 79, 182, 0.04)',
                            },
                          }}
                        >
                          Подробнее
                        </Button>
                      )}
                    </Box>

                    {/* Нижний ряд для карточек с действием - кнопка "Подробнее" под кнопкой действия */}
                    {requiresAction && (
                      <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={<InfoIcon />}
                          onClick={() => navigate(`/movements/${transfer.id}`)}
                          sx={{
                            borderRadius: 8,
                            py: 1,
                            textTransform: 'none',
                            fontSize: '0.9rem',
                            borderColor: '#d8d1e0',
                            color: '#4c5454',
                            '&:hover': {
                              borderColor: '#674fb6',
                              color: '#674fb6',
                              backgroundColor: 'rgba(103, 79, 182, 0.04)',
                            },
                          }}
                        >
                          Подробнее
                        </Button>

                        {/* Кнопки отклонения (если есть) */}
                        {transfer.canApprove && transfer.status === TransferStatus.PENDING_APPROVAL && (
                          <Tooltip title="Отклонить">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                openRejectDialog(transfer);
                              }}
                              sx={{ 
                                color: '#f44336',
                                border: '1px solid #f44336',
                                borderRadius: 8,
                                p: 1,
                                minWidth: 48,
                                '&:hover': { backgroundColor: 'rgba(244, 67, 54, 0.04)' }
                              }}
                            >
                              <CancelIcon sx={{ fontSize: 20 }} />
                            </IconButton>
                          </Tooltip>
                        )}

                        {transfer.canExecute && transfer.status === TransferStatus.REQUESTED && 
                            transfer.requestType === TransferRequestType.MANAGER_REQUEST && (
                          <Tooltip title="Отклонить запрос">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                openRejectDialog(transfer, true);
                              }}
                              sx={{ 
                                color: '#f44336',
                                border: '1px solid #f44336',
                                borderRadius: 8,
                                p: 1,
                                minWidth: 48,
                                '&:hover': { backgroundColor: 'rgba(244, 67, 54, 0.04)' }
                              }}
                            >
                              <CancelIcon sx={{ fontSize: 20 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    )}
                  </CardActions>
                </Card>
              );
            })}
          </Stack>
        )}

        {/* Модальное окно подтверждения */}
        <Dialog
          open={confirmDialogOpen}
          onClose={() => !actionLoading && setConfirmDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: { borderRadius: 8 }
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>
            {selectedTransfer?.status === TransferStatus.PENDING_APPROVAL 
              ? 'Подтверждение перемещения'
              : 'Начало перемещения'}
          </DialogTitle>
          <DialogContent>
            <Typography sx={{ mb: 2 }}>
              {selectedTransfer?.status === TransferStatus.PENDING_APPROVAL 
                ? `Вы уверены, что хотите подтвердить перемещение "${selectedTransfer?.title}"?`
                : `Вы уверены, что хотите начать перемещение "${selectedTransfer?.title}"?`}
            </Typography>
            {selectedTransfer && (
              <>
                <Typography variant="body2" color="#4c5454">
                  <strong>От:</strong> {users[selectedTransfer.fromUserId] || `Пользователь ${selectedTransfer.fromUserId}`}
                </Typography>
                <Typography variant="body2" color="#4c5454">
                  <strong>Кому:</strong> {users[selectedTransfer.toUserId] || `Пользователь ${selectedTransfer.toUserId}`}
                </Typography>
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 0 }}>
            <Button 
              onClick={() => setConfirmDialogOpen(false)} 
              disabled={actionLoading}
              sx={{ borderRadius: 8, textTransform: 'none' }}
            >
              Отмена
            </Button>
            <Button 
              onClick={handleConfirmAction} 
              variant="contained" 
              disabled={actionLoading}
              sx={{ 
                borderRadius: 8, 
                textTransform: 'none',
                backgroundColor: '#674fb6',
                '&:hover': { backgroundColor: '#483399' },
              }}
            >
              {actionLoading ? <CircularProgress size={24} /> : (
                selectedTransfer?.status === TransferStatus.PENDING_APPROVAL ? 'Подтвердить' : 'Начать'
              )}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Модальное окно отклонения */}
        <Dialog
          open={rejectDialogOpen || rejectManagerDialogOpen}
          onClose={() => !actionLoading && (rejectDialogOpen ? setRejectDialogOpen(false) : setRejectManagerDialogOpen(false))}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: { borderRadius: 8 }
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>
            {rejectManagerDialogOpen ? 'Отклонение запроса от руководителя' : 'Отклонение перемещения'}
          </DialogTitle>
          <DialogContent>
            <Typography sx={{ mb: 2 }}>
              {rejectManagerDialogOpen 
                ? `Укажите причину отклонения запроса "${selectedTransfer?.title}" от руководителя:`
                : `Укажите причину отклонения перемещения "${selectedTransfer?.title}":`}
            </Typography>
            <TextField
              autoFocus
              fullWidth
              multiline
              rows={3}
              placeholder="Причина отклонения..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              disabled={actionLoading}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 8,
                }
              }}
            />
            {rejectManagerDialogOpen && (
              <Alert 
                severity="warning" 
                sx={{ 
                  mt: 2,
                  borderRadius: 8,
                  backgroundColor: 'rgba(255, 152, 0, 0.08)',
                  color: '#ff9800',
                  '& .MuiAlert-icon': { color: '#ff9800' },
                }}
              >
                Отклонение запроса уведомит руководителя о вашем решении.
              </Alert>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 0 }}>
            <Button 
              onClick={() => rejectDialogOpen ? setRejectDialogOpen(false) : setRejectManagerDialogOpen(false)} 
              disabled={actionLoading}
              sx={{ borderRadius: 8, textTransform: 'none' }}
            >
              Отмена
            </Button>
            <Button 
              onClick={handleRejectAction} 
              variant="contained" 
              color="error"
              disabled={actionLoading || !rejectReason.trim()}
              sx={{ 
                borderRadius: 8, 
                textTransform: 'none',
              }}
            >
              {actionLoading ? <CircularProgress size={24} /> : 'Отклонить'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar для уведомлений */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <Alert 
            onClose={handleSnackbarClose} 
            severity={snackbarSeverity}
            sx={{ 
              width: '100%',
              borderRadius: 8,
              backgroundColor: snackbarSeverity === 'success' ? '#4caf50' : '#f44336',
              color: '#fff',
              '& .MuiAlert-icon': { color: '#fff' }
            }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default MovementsPage;