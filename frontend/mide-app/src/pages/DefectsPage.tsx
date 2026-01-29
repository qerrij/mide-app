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
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  BarChart as StatsIcon,
  Close as CloseIcon,
  Clear as ClearIcon,
  Warning as WarningIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Pending as PendingIcon,
  Cancel as CancelledIcon,
  TrendingDown as DefectIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { rejectionService } from '../api/rejectionService';
import { Rejection, RejectionStatus, getRejectionStatusText, getRejectionStatusColor, UserRole } from '../types';
import ConfirmationDialog from '../components/rejection/ConfirmationDialog';

const DefectsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [rejections, setRejections] = useState<Rejection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState<RejectionStatus | 'ALL'>('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRejection, setSelectedRejection] = useState<Rejection | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [actionLoading, setActionLoading] = useState(false);
  
  const [filters, setFilters] = useState({
    status: '' as RejectionStatus | '',
    search: '',
  });

  const isAdminOrOwner = user?.role === UserRole.OWNER || user?.role === UserRole.ADMIN;

  const loadRejections = async () => {
    try {
      setLoading(true);
      let data: Rejection[];
      
      if (isAdminOrOwner) {
        const status = filters.status !== '' ? filters.status as RejectionStatus : undefined;
        data = await rejectionService.getAllRejections(0, 100, status);
      } else {
        const status = filters.status !== '' ? filters.status as RejectionStatus : undefined;
        data = await rejectionService.getMyRejections(0, 100, status);
      }
      
      setRejections(data);
    } catch (err: any) {
      showSnackbar(err.response?.data?.detail || 'Ошибка загрузки данных', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRejections();
  }, [filters.status]);

  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const getFilteredRejections = () => {
    let filtered = rejections;
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(rejection =>
        rejection.id.toString().includes(searchLower) ||
        rejection.userName?.toLowerCase().includes(searchLower) ||
        rejection.items.some(item => 
          item.productName?.toLowerCase().includes(searchLower) ||
          item.productSku?.toLowerCase().includes(searchLower)
        )
      );
    }
    
    if (selectedStatus !== 'ALL') {
      filtered = filtered.filter(rejection => rejection.status === selectedStatus);
    }
    
    return filtered;
  };

  const handleDeleteClick = (rejection: Rejection, e: React.MouseEvent) => {
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
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedRejection) return;
    
    try {
      setActionLoading(true);
      await rejectionService.cancelRejection(selectedRejection.id);
      await loadRejections();
      showSnackbar('Брак успешно отменен');
      setDeleteDialogOpen(false);
      setSelectedRejection(null);
    } catch (err: any) {
      showSnackbar(err.response?.data?.detail || 'Ошибка при отмене брака', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewDetails = (rejection: Rejection, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigate(`/defects/${rejection.id}`);
  };

  const getStats = () => {
    return {
      total: rejections.length,
      pending: rejections.filter(r => r.status === RejectionStatus.PENDING).length,
      approved: rejections.filter(r => r.status === RejectionStatus.APPROVED).length,
      rejected: rejections.filter(r => r.status === RejectionStatus.REJECTED).length,
      cancelled: rejections.filter(r => r.status === RejectionStatus.CANCELLED).length,
      totalValue: rejections.reduce((sum, r) => sum + r.totalValue, 0),
    };
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
          sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1000 }}
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
            tooltipTitle="Создать брак"
            onClick={() => navigate('/defects/create')}
          />
          {user?.role !== UserRole.SELLER && (
            <SpeedDialAction
              icon={<StatsIcon />}
              tooltipTitle="Статистика"
              onClick={() => navigate('/defects/stats')}
            />
          )}
          <SpeedDialAction
            icon={<RefreshIcon />}
            tooltipTitle="Обновить"
            onClick={loadRejections}
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
        
        {user?.role !== UserRole.SELLER && (
          <Button
            variant="outlined"
            startIcon={<StatsIcon />}
            onClick={() => navigate('/defects/stats')}
            fullWidth={isTablet}
            size={isTablet ? "small" : "medium"}
          >
            Статистика
          </Button>
        )}
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/defects/create')}
          sx={{
            backgroundColor: '#d32f2f',
            '&:hover': { backgroundColor: '#b71c1c' },
          }}
          fullWidth={isTablet}
          size={isTablet ? "small" : "medium"}
        >
          Создать брак
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadRejections}
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
              <Typography variant="h6">Фильтры браков</Typography>
              <IconButton onClick={() => setFilterDrawerOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
            
            <TextField
              select
              fullWidth
              label="Статус"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as RejectionStatus | '' })}
              sx={{ mb: 2 }}
              size="small"
            >
              <MenuItem value="">Все статусы</MenuItem>
              <MenuItem value={RejectionStatus.PENDING}>На рассмотрении</MenuItem>
              <MenuItem value={RejectionStatus.APPROVED}>Утвержден</MenuItem>
              <MenuItem value={RejectionStatus.REJECTED}>Отклонен</MenuItem>
              <MenuItem value={RejectionStatus.CANCELLED}>Отменен</MenuItem>
            </TextField>
            
            <TextField
              fullWidth
              label="Поиск"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="ID, пользователь, товар..."
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
                onChange={(e) => setFilters({ ...filters, status: e.target.value as RejectionStatus | '' })}
                size="small"
              >
                <MenuItem value="">Все статусы</MenuItem>
                <MenuItem value={RejectionStatus.PENDING}>На рассмотрении</MenuItem>
                <MenuItem value={RejectionStatus.APPROVED}>Утвержден</MenuItem>
                <MenuItem value={RejectionStatus.REJECTED}>Отклонен</MenuItem>
                <MenuItem value={RejectionStatus.CANCELLED}>Отменен</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Поиск"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="ID, пользователь, товар..."
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

  const getStatusIcon = (status: RejectionStatus) => {
    switch (status) {
      case RejectionStatus.PENDING:
        return <PendingIcon />;
      case RejectionStatus.APPROVED:
        return <ApprovedIcon />;
      case RejectionStatus.REJECTED:
        return <RejectedIcon />;
      case RejectionStatus.CANCELLED:
        return <CancelledIcon />;
      default:
        return <WarningIcon />;
    }
  };

  const getStatusActions = (rejection: Rejection) => {
    const actions = [];
    
    actions.push(
      <Tooltip title="Просмотр" key="view">
        <IconButton
          size="small"
          onClick={(e) => handleViewDetails(rejection, e)}
        >
          <ViewIcon />
        </IconButton>
      </Tooltip>
    );
    
    if (rejection.status === RejectionStatus.PENDING && 
        rejection.userId === user?.id) {
      actions.push(
        <Tooltip title="Отменить" key="delete">
          <IconButton
            size="small"
            color="error"
            onClick={(e) => handleDeleteClick(rejection, e)}
          >
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      );
    }
    
    return actions;
  };

  return (
    <Container maxWidth="xl" sx={{ mt: { xs: 2, sm: 4 }, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="h4" component="h1" gutterBottom color="#2a0f35">
              Брак
            </Typography>
            <Typography variant="subtitle1" color="#4c5454">
              Управление учетов бракованных товаров
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
          { 
            count: stats.total, 
            label: 'Всего браков', 
            color: '#d32f2f', 
            icon: <DefectIcon /> 
          },
          { 
            count: stats.pending, 
            label: 'На рассмотрении', 
            color: '#ff9800', 
            icon: <PendingIcon /> 
          },
          { 
            count: stats.approved, 
            label: 'Утверждены', 
            color: '#4caf50', 
            icon: <ApprovedIcon /> 
          },
          { 
            count: stats.rejected, 
            label: 'Отклонены', 
            color: '#f44336', 
            icon: <RejectedIcon /> 
          },
          { 
            count: stats.cancelled, 
            label: 'Отменены', 
            color: '#9e9e9e', 
            icon: <CancelledIcon /> 
          },
          { 
            count: stats.totalValue.toLocaleString('ru-RU', {
              style: 'currency',
              currency: 'RUB',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }), 
            label: 'Общая сумма', 
            color: '#2196f3', 
            icon: '₽'
          },
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
                  {typeof stat.icon === 'string' ? (
                    <Typography variant="h6" sx={{ fontSize: '1.2rem' }}>{stat.icon}</Typography>
                  ) : (
                    stat.icon
                  )}
                </Avatar>
                <Typography variant="h5" color={stat.color} sx={{ 
                  fontSize: typeof stat.icon === 'string' ? '1.2rem' : '1.5rem',
                  fontWeight: 500 
                }}>
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

      {/* Таблица браков */}
      <Paper sx={{ overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: isMobile ? 500 : 'none' }}>
          <Table size={isMobile ? "small" : "medium"}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: isMobile ? 60 : 80 }}>ID</TableCell>
                {isAdminOrOwner && !isMobile && <TableCell>Пользователь</TableCell>}
                <TableCell>Детали</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell>Дата создания</TableCell>
                <TableCell sx={{ width: isMobile ? 80 : 100 }}>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={isMobile ? 5 : (isAdminOrOwner ? 6 : 5)} align="center" sx={{ py: 8 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : getFilteredRejections().length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isMobile ? 5 : (isAdminOrOwner ? 6 : 5)} align="center" sx={{ py: 8 }}>
                    <Typography variant="body1" sx={{ color: '#4c5454' }}>
                      Браков не найдено
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                getFilteredRejections().map((rejection) => (
                  <TableRow
                    key={rejection.id}
                    hover
                    onClick={() => navigate(`/defects/${rejection.id}`)}
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      }
                    }}
                  >
                    <TableCell>#{rejection.id}</TableCell>
                    {isAdminOrOwner && !isMobile && (
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {rejection.userName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#4c5454' }}>
                          {rejection.userRole}
                        </Typography>
                      </TableCell>
                    )}
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                        {rejection.items.length} товар(ов)
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#4c5454', display: 'block' }}>
                        {rejection.totalItems} ед.
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#4c5454', display: 'block' }}>
                        {rejection.totalValue.toLocaleString('ru-RU', {
                          style: 'currency',
                          currency: 'RUB',
                          minimumFractionDigits: 0,
                        })}
                      </Typography>
                      {isMobile && isAdminOrOwner && (
                        <Typography variant="caption" sx={{ color: '#4c5454', display: 'block', mt: 0.5 }}>
                          {rejection.userName}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getRejectionStatusText(rejection.status)}
                        size="small"
                        sx={{
                          backgroundColor: `${getRejectionStatusColor(rejection.status)}20`,
                          color: getRejectionStatusColor(rejection.status),
                          fontSize: '0.75rem',
                          fontWeight: 500,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(rejection.createdAt).toLocaleDateString('ru-RU')}
                      {!isMobile && (
                        <Typography variant="caption" sx={{ display: 'block', color: '#4c5454' }}>
                          {new Date(rejection.createdAt).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {getStatusActions(rejection)}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Модальное окно отмены брака */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        title="Отменить брак"
        message={`Вы уверены, что хотите отменить брак #${selectedRejection?.id}? Это действие нельзя отменить.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDialogOpen(false)}
        loading={actionLoading}
        confirmText="Отменить"
        confirmColor="error"
      />

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

export default DefectsPage;