import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Avatar,
  CircularProgress,
  Tabs,
  Tab,
  Tooltip,
  Alert,
  Badge,
  Snackbar,
  Stack,
  useMediaQuery,
  useTheme,
  Fab,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  PlayArrow as StartIcon,
  LocalShipping as InTransitIcon,
  Check as CompleteIcon,
  Warning as DiscrepancyIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  TransferWithinAStation as TransferIcon,
  SupervisorAccount as ManagerIcon,
  Assignment as ExecuteIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { transferService } from '../api/transferService';
import { userService } from '../api/userService';
import {
  Transfer,
  TransferStatus,
  TransferRequestType,
  getTransferStatusText,
  getTransferStatusColor,
  getRequestTypeText,
  UserRole,
} from '../types';

const MovementsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [managerRequests, setManagerRequests] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<TransferStatus | 'ALL'>('ALL');
  const [activeTab, setActiveTab] = useState(0);
  const [users, setUsers] = useState<{ [key: number]: string }>({});
  const [showFilters, setShowFilters] = useState(false);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  
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
  
  // Фильтры
  const [filters, setFilters] = useState({
    status: '' as TransferStatus | '',
    search: '',
  });

  const loadTransfers = async () => {
    try {
      setLoading(true);
      const [transfersData, requestsData] = await Promise.all([
        transferService.getTransfers(0, 100, filters.status || undefined),
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
  }, [filters.status]);

  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const getFilteredTransfers = () => {
    let filtered = activeTab === 0 ? transfers : managerRequests;
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(transfer =>
        transfer.title.toLowerCase().includes(searchLower) ||
        transfer.description?.toLowerCase().includes(searchLower) ||
        (users[transfer.fromUserId] || '').toLowerCase().includes(searchLower) ||
        (users[transfer.toUserId] || '').toLowerCase().includes(searchLower)
      );
    }
    
    if (selectedStatus !== 'ALL') {
      filtered = filtered.filter(transfer => transfer.status === selectedStatus);
    }
    
    return filtered;
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

  const getStatusActions = (transfer: Transfer) => {
    const actions = [];
    
    // Просмотр всегда доступен
    actions.push(
      <Tooltip title="Просмотр" key="view">
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/movements/${transfer.id}`);
          }}
        >
          <ViewIcon />
        </IconButton>
      </Tooltip>
    );
    
    // Действия для обычных перемещений
    if (transfer.canApprove && transfer.status === TransferStatus.PENDING_APPROVAL) {
      actions.push(
        <Tooltip title="Подтвердить" key="approve">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              openConfirmDialog(transfer, 'approve');
            }}
            sx={{ color: '#4caf50' }}
          >
            <ApproveIcon />
          </IconButton>
        </Tooltip>
      );
      
      actions.push(
        <Tooltip title="Отклонить" key="reject">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              openRejectDialog(transfer);
            }}
            sx={{ color: '#f44336' }}
          >
            <RejectIcon />
          </IconButton>
        </Tooltip>
      );
    }
    
    // Действия для запросов от руководителя
    if (transfer.canExecute && transfer.status === TransferStatus.REQUESTED && 
        transfer.requestType === TransferRequestType.MANAGER_REQUEST) {
      actions.push(
        <Tooltip title="Выполнить запрос" key="execute">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleExecuteManagerRequest(transfer.id);
            }}
            sx={{ color: '#2196f3' }}
          >
            <ExecuteIcon />
          </IconButton>
        </Tooltip>
      );
      
      actions.push(
        <Tooltip title="Отклонить запрос" key="reject-manager">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              openRejectDialog(transfer, true);
            }}
            sx={{ color: '#f44336' }}
          >
            <RejectIcon />
          </IconButton>
        </Tooltip>
      );
    }
    
    if ((transfer.fromUserId === user?.id || transfer.executorId === user?.id) &&
        transfer.status === TransferStatus.APPROVED) {
      actions.push(
        <Tooltip title="Начать перемещение" key="start">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              openConfirmDialog(transfer, 'start');
            }}
            sx={{ color: '#2196f3' }}
          >
            <StartIcon />
          </IconButton>
        </Tooltip>
      );
    }
    
    if (transfer.toUserId === user?.id &&
        transfer.status === TransferStatus.IN_TRANSIT) {
      actions.push(
        <Tooltip title="Принять товар" key="arrived">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/movements/${transfer.id}/arrived`);
            }}
            sx={{ color: '#9c27b0' }}
          >
            <InTransitIcon />
          </IconButton>
        </Tooltip>
      );
    }
    
    if (transfer.canApprove && transfer.status === TransferStatus.CHECKING) {
      actions.push(
        <Tooltip title="Проверить расхождения" key="discrepancy">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/movements/${transfer.id}/verify-discrepancy`);
            }}
            sx={{ color: '#ff9800' }}
          >
            <DiscrepancyIcon />
          </IconButton>
        </Tooltip>
      );
    }
    
    return actions;
  };

  const getStats = () => {
    const stats = {
      pending: transfers.filter(t => t.status === TransferStatus.PENDING_APPROVAL).length,
      approved: transfers.filter(t => t.status === TransferStatus.APPROVED).length,
      inTransit: transfers.filter(t => t.status === TransferStatus.IN_TRANSIT).length,
      completed: transfers.filter(t => t.status === TransferStatus.COMPLETED).length,
      managerRequests: managerRequests.filter(t => t.status === TransferStatus.REQUESTED).length,
    };
    
    return stats;
  };

  const stats = getStats();

  const clearFilters = () => {
    setFilters({ status: '', search: '' });
    setSelectedStatus('ALL');
    if (isMobile) {
      setFilterDrawerOpen(false);
    }
  };

  const renderActionButtons = () => {
    if (isMobile) {
      return (
        <SpeedDial
          ariaLabel="Действия"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          icon={<SpeedDialIcon />}
          open={speedDialOpen}
          onOpen={() => setSpeedDialOpen(true)}
          onClose={() => setSpeedDialOpen(false)}
        >
          <SpeedDialAction
            icon={<FilterIcon />}
            tooltipTitle="Фильтры"
            onClick={() => setFilterDrawerOpen(true)}
          />
          <SpeedDialAction
            icon={<AddIcon />}
            tooltipTitle="Новое перемещение"
            onClick={() => navigate('/movements/create')}
          />
          {(user?.role === UserRole.OWNER || 
            user?.role === UserRole.ADMIN || 
            user?.role === UserRole.SENIOR_SELLER || 
            user?.role === UserRole.MENTOR) && (
            <SpeedDialAction
              icon={<ManagerIcon />}
              tooltipTitle="Запрос от руководителя"
              onClick={() => navigate('/movements/create-manager')}
            />
          )}
          <SpeedDialAction
            icon={<RefreshIcon />}
            tooltipTitle="Обновить"
            onClick={loadTransfers}
          />
        </SpeedDial>
      );
    }

    return (
      <Stack 
        direction={{ xs: 'column', sm: 'row' }} 
        spacing={1} 
        sx={{ 
          width: '100%',
          justifyContent: { xs: 'stretch', sm: 'flex-end' }
        }}
      >
        <Button
          variant="outlined"
          startIcon={<FilterIcon />}
          onClick={() => setShowFilters(!showFilters)}
          fullWidth={isTablet}
          size={isTablet ? "small" : "medium"}
        >
          Фильтры
        </Button>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/movements/create')}
          sx={{
            backgroundColor: '#2a436d',
            '&:hover': { backgroundColor: '#1d2f4d' },
          }}
          fullWidth={isTablet}
          size={isTablet ? "small" : "medium"}
        >
          Новое перемещение
        </Button>
        
        {(user?.role === UserRole.OWNER || 
          user?.role === UserRole.ADMIN || 
          user?.role === UserRole.SENIOR_SELLER || 
          user?.role === UserRole.MENTOR) && (
          <Button
            variant="contained"
            startIcon={<ManagerIcon />}
            onClick={() => navigate('/movements/create-manager')}
            sx={{
              backgroundColor: '#673ab7',
              '&:hover': { backgroundColor: '#512da8' },
            }}
            fullWidth={isTablet}
            size={isTablet ? "small" : "medium"}
          >
            {isTablet ? 'Запрос' : 'Запрос от руководителя'}
          </Button>
        )}
        
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadTransfers}
          fullWidth={isTablet}
          size={isTablet ? "small" : "medium"}
        >
          Обновить
        </Button>
      </Stack>
    );
  };

  const renderFilters = () => {
    if (isMobile) {
      return (
        <Drawer
          anchor="bottom"
          open={filterDrawerOpen}
          onClose={() => setFilterDrawerOpen(false)}
          PaperProps={{
            sx: { 
              borderTopLeftRadius: 16, 
              borderTopRightRadius: 16,
              maxHeight: '80vh'
            }
          }}
        >
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Фильтры</Typography>
              <IconButton onClick={() => setFilterDrawerOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
            
            <TextField
              select
              fullWidth
              label="Статус"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as TransferStatus | '' })}
              sx={{ mb: 2 }}
              size="small"
            >
              <MenuItem value="">Все статусы</MenuItem>
              {Object.values(TransferStatus).map((status) => (
                <MenuItem key={status} value={status}>
                  {getTransferStatusText(status)}
                </MenuItem>
              ))}
            </TextField>
            
            <TextField
              fullWidth
              label="Поиск"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Название, описание, пользователь..."
              sx={{ mb: 2 }}
              size="small"
            />
            
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                onClick={clearFilters}
                fullWidth
                startIcon={<ClearIcon />}
                size="small"
              >
                Сбросить
              </Button>
              <Button
                variant="contained"
                onClick={() => setFilterDrawerOpen(false)}
                fullWidth
                size="small"
              >
                Применить
              </Button>
            </Stack>
          </Box>
        </Drawer>
      );
    }

    return (
      showFilters && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                select
                fullWidth
                label="Статус"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as TransferStatus | '' })}
                size="small"
              >
                <MenuItem value="">Все статусы</MenuItem>
                {Object.values(TransferStatus).map((status) => (
                  <MenuItem key={status} value={status}>
                    {getTransferStatusText(status)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Поиск"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Название, описание, пользователь..."
                size="small"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Button
                fullWidth
                variant="outlined"
                onClick={clearFilters}
                sx={{ height: '40px' }}
                size="small"
              >
                Сбросить фильтры
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )
    );
  };

  return (
    <Container maxWidth="xl" sx={{ mt: { xs: 2, sm: 4 }, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="h4" component="h1" gutterBottom color="#2a0f35">
              Перемещения товаров
            </Typography>
            <Typography variant="subtitle1" color="#4c5454">
              Управление перемещениями товаров между пользователями
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            {renderActionButtons()}
          </Grid>
        </Grid>
      </Box>

      {/* Статистика */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {[
          { count: stats.pending, label: 'Ожидают подтверждения', color: '#ff9800', icon: <TransferIcon /> },
          { count: stats.approved, label: 'Подтверждены', color: '#4caf50', icon: <ApproveIcon /> },
          { count: stats.inTransit, label: 'В пути', color: '#2196f3', icon: <InTransitIcon /> },
          { count: stats.completed, label: 'Завершены', color: '#4caf50', icon: <CompleteIcon /> },
          { count: stats.managerRequests, label: 'Запросы руководителей', color: '#673ab7', icon: <ManagerIcon /> },
          { count: transfers.filter(t => t.status === TransferStatus.CHECKING).length, 
            label: 'Проверка расхождений', color: '#ff9800', icon: <DiscrepancyIcon /> },
        ].map((stat, index) => (
          <Grid size={{ xs: 6, sm: 4, md: 2 }} key={index}>
            <Card>
              <CardContent sx={{ p: 2, textAlign: 'center' }}>
                <Avatar sx={{ 
                  bgcolor: `${stat.color}20`, 
                  color: stat.color, 
                  margin: '0 auto 8px',
                  width: 40,
                  height: 40
                }}>
                  {stat.icon}
                </Avatar>
                <Typography variant="h5" color={stat.color} sx={{ fontSize: '1.5rem' }}>
                  {stat.count}
                </Typography>
                <Typography variant="caption" color="#4c5454" sx={{ 
                  fontSize: '0.75rem',
                  display: 'block',
                  lineHeight: 1.2
                }}>
                  {stat.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Фильтры */}
      {renderFilters()}

      {/* Табы */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          indicatorColor="primary"
          textColor="primary"
          variant={isMobile ? "fullWidth" : "standard"}
        >
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>Все</span>
                {transfers.length > 0 && (
                  <Chip label={transfers.length} size="small" sx={{ height: 20 }} />
                )}
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>Запросы</span>
                {managerRequests.length > 0 && (
                  <Badge 
                    badgeContent={managerRequests.length} 
                    color="primary"
                    sx={{
                      '& .MuiBadge-badge': {
                        fontSize: '0.6rem',
                        height: 16,
                        minWidth: 16,
                      }
                    }}
                  >
                    <ManagerIcon fontSize="small" />
                  </Badge>
                )}
              </Box>
            }
          />
        </Tabs>
      </Paper>

      {/* Таблица перемещений */}
      <Paper sx={{ overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: isMobile ? 500 : 'none' }}>
          <Table size={isMobile ? "small" : "medium"}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: isMobile ? 60 : 80 }}>ID</TableCell>
                <TableCell>Название</TableCell>
                {!isMobile && (
                  <>
                    <TableCell>От</TableCell>
                    <TableCell>Кому</TableCell>
                    <TableCell>Тип</TableCell>
                  </>
                )}
                <TableCell>Статус</TableCell>
                {!isMobile && <TableCell>Товары</TableCell>}
                <TableCell>Дата</TableCell>
                <TableCell sx={{ width: isMobile ? 100 : 120 }}>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={isMobile ? 5 : 9} align="center" sx={{ py: 8 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : getFilteredTransfers().length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isMobile ? 5 : 9} align="center" sx={{ py: 8 }}>
                    <Typography variant="body1" sx={{ color: '#4c5454' }}>
                      {activeTab === 0 ? 'Нет перемещений' : 'Нет запросов от руководителей'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                getFilteredTransfers().map((transfer) => (
                  <TableRow
                    key={transfer.id}
                    hover
                    onClick={() => navigate(`/movements/${transfer.id}`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>#{transfer.id}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {transfer.title}
                      </Typography>
                      {isMobile && (
                        <>
                          <Typography variant="caption" sx={{ color: '#4c5454', display: 'block' }}>
                            От: {users[transfer.fromUserId]?.split(' ')[0] || `ID${transfer.fromUserId}`}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#4c5454', display: 'block' }}>
                            Кому: {users[transfer.toUserId]?.split(' ')[0] || `ID${transfer.toUserId}`}
                          </Typography>
                        </>
                      )}
                      {transfer.description && (
                        <Typography variant="caption" sx={{ color: '#4c5454', display: 'block' }}>
                          {isMobile && transfer.description.length > 30 
                            ? `${transfer.description.substring(0, 30)}...`
                            : transfer.description}
                        </Typography>
                      )}
                    </TableCell>
                    {!isMobile && (
                      <>
                        <TableCell>
                          <Typography variant="body2">
                            {users[transfer.fromUserId] || `Пользователь ${transfer.fromUserId}`}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {users[transfer.toUserId] || `Пользователь ${transfer.toUserId}`}
                          </Typography>
                        </TableCell>
                        <TableCell>
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
                              fontSize: '0.75rem'
                            }}
                          />
                        </TableCell>
                      </>
                    )}
                    <TableCell>
                      <Chip
                        label={getTransferStatusText(transfer.status)}
                        size="small"
                        sx={{
                          backgroundColor: `${getTransferStatusColor(transfer.status)}20`,
                          color: getTransferStatusColor(transfer.status),
                          fontSize: '0.75rem'
                        }}
                      />
                      {transfer.status === TransferStatus.PENDING_APPROVAL && 
                       transfer.pendingApprovals.length > 0 && (
                        <Typography variant="caption" sx={{ display: 'block', color: '#ff9800', mt: 0.5 }}>
                          Ожидает: {transfer.pendingApprovals.length}
                        </Typography>
                      )}
                    </TableCell>
                    {!isMobile && (
                      <TableCell>
                        <Typography variant="body2">
                          {transfer.totalItems || 0} шт.
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#4c5454' }}>
                          {transfer.totalQuantity || 0} ед.
                        </Typography>
                      </TableCell>
                    )}
                    <TableCell>
                      {new Date(transfer.createdAt).toLocaleDateString('ru-RU')}
                      {!isMobile && (
                        <Typography variant="caption" sx={{ display: 'block', color: '#4c5454' }}>
                          {new Date(transfer.createdAt).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {getStatusActions(transfer)}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {managerRequests.length > 0 && activeTab === 1 && !isMobile && (
        <Alert severity="info" sx={{ mt: 3 }}>
          У вас есть {managerRequests.filter(t => t.status === TransferStatus.REQUESTED).length} запросов на перемещение от руководителей, требующие вашего подтверждения или отклонения.
        </Alert>
      )}

      {/* Модальное окно подтверждения */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => !actionLoading && setConfirmDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedTransfer?.status === TransferStatus.PENDING_APPROVAL 
            ? 'Подтверждение перемещения'
            : 'Начало перемещения'}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            {selectedTransfer?.status === TransferStatus.PENDING_APPROVAL 
              ? `Вы уверены, что хотите подтвердить перемещение #${selectedTransfer?.id}?`
              : `Вы уверены, что хотите начать перемещение #${selectedTransfer?.id}?`}
          </Typography>
          {selectedTransfer && (
            <>
              <Typography variant="body2" color="textSecondary">
                <strong>Название:</strong> {selectedTransfer.title}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                <strong>От:</strong> {users[selectedTransfer.fromUserId] || `Пользователь ${selectedTransfer.fromUserId}`}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                <strong>Кому:</strong> {users[selectedTransfer.toUserId] || `Пользователь ${selectedTransfer.toUserId}`}
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)} disabled={actionLoading}>
            Отмена
          </Button>
          <Button 
            onClick={handleConfirmAction} 
            variant="contained" 
            disabled={actionLoading}
            color={selectedTransfer?.status === TransferStatus.PENDING_APPROVAL ? 'success' : 'primary'}
          >
            {actionLoading ? (
              <CircularProgress size={24} />
            ) : selectedTransfer?.status === TransferStatus.PENDING_APPROVAL ? (
              'Подтвердить'
            ) : (
              'Начать'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Модальное окно отклонения перемещения */}
      <Dialog
        open={rejectDialogOpen}
        onClose={() => !actionLoading && setRejectDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Отклонение перемещения</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Укажите причину отклонения перемещения #{selectedTransfer?.id}:
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
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)} disabled={actionLoading}>
            Отмена
          </Button>
          <Button 
            onClick={handleRejectAction} 
            variant="contained" 
            color="error"
            disabled={actionLoading || !rejectReason.trim()}
          >
            {actionLoading ? <CircularProgress size={24} /> : 'Отклонить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Модальное окно отклонения запроса от руководителя */}
      <Dialog
        open={rejectManagerDialogOpen}
        onClose={() => !actionLoading && setRejectManagerDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Отклонение запроса от руководителя</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Укажите причину отклонения запроса #{selectedTransfer?.id} от руководителя:
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            placeholder="Причина отклонения запроса..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            disabled={actionLoading}
          />
          <Alert severity="warning" sx={{ mt: 2 }}>
            Отклонение запроса уведомит руководителя о вашем решении.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectManagerDialogOpen(false)} disabled={actionLoading}>
            Отмена
          </Button>
          <Button 
            onClick={handleRejectAction} 
            variant="contained" 
            color="error"
            disabled={actionLoading || !rejectReason.trim()}
          >
            {actionLoading ? <CircularProgress size={24} /> : 'Отклонить запрос'}
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
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default MovementsPage;