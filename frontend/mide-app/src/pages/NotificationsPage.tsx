import React, { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Avatar,
  IconButton,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge,
  alpha,
  useTheme,
  useMediaQuery,
  Fade,
  Zoom,
  Snackbar,
  Alert,
  Stack,
} from '@mui/material';
import {
  ArrowBack,
  Notifications as NotificationsIcon,
  Assignment as AssignmentIcon,
  CheckCircle,
  Cancel,
  Assessment,
  Warning,
  ArrowForward,
  Delete,
  MarkEmailRead,
  FilterList,
  Clear,
  Archive,
  Inventory as InventoryIcon,
  TransferWithinAStation as TransferIcon,
  Error as ErrorIcon,
  CheckCircleOutline,
  PendingActions,
  RemoveCircleOutline,
  Verified,
  Send,
  PublishedWithChanges,
  ReportProblem,
  Info,
  Close as CloseIcon,
  Refresh,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../api/notificationService';
import {
  Notification,
  NotificationStatus,
  NotificationType,
  getNotificationTypeText,
} from '../types';

// iOS стили
const iOSStyles = {
  paper: {
    borderRadius: 8,
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  card: {
    borderRadius: 8,
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)',
    transition: 'transform 0.15s, box-shadow 0.15s',
    '&:hover': {
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    },
  },
  chip: {
    borderRadius: 4,
    height: 24,
    fontWeight: 500,
    fontSize: '0.75rem',
  },
  button: {
    borderRadius: 6,
    textTransform: 'none',
    fontWeight: 600,
    padding: '6px 12px',
  },
  filterChip: {
    borderRadius: 4,
    height: 36,
    fontWeight: 500,
    fontSize: '0.85rem',
    padding: '8px 12px',
  },
  blockChip: {
    borderRadius: 4,
    height: 40,
    fontWeight: 600,
    fontSize: '0.9rem',
    padding: '8px 16px',
  },
  dialog: {
    borderRadius: 4,
    '& .MuiDialog-paper': {
      borderRadius: 4,
      padding: 0,
    },
  },
};

// Определение блоков и соответствующих им типов уведомлений
const NOTIFICATION_BLOCKS = {
  REVISIONS: {
    id: 'revisions',
    label: 'Ревизии',
    icon: <AssignmentIcon />,
    color: '#2196f3',
    types: [
      NotificationType.REVISION_REQUEST,
      NotificationType.REVISION_COMPLETED,
      NotificationType.REVISION_VERIFIED,
    ],
  },
  REPORTS: {
    id: 'reports',
    label: 'Отчеты',
    icon: <Assessment />,
    color: '#ff9800',
    types: [
      NotificationType.REPORT_SUBMITTED,
      NotificationType.REPORT_APPROVED,
      NotificationType.REPORT_REJECTED,
      NotificationType.REPORT_ACCOUNTANT,
      NotificationType.INVENTORY_LOW,
    ],
  },
  TRANSFERS: {
    id: 'transfers',
    label: 'Перемещения',
    icon: <TransferIcon />,
    color: '#673ab7',
    types: [
      NotificationType.TRANSFER_REQUEST,
      NotificationType.TRANSFER_APPROVED,
      NotificationType.TRANSFER_IN_TRANSIT,
      NotificationType.TRANSFER_DISCREPANCY,
      NotificationType.TRANSFER_COMPLETED,
      NotificationType.TRANSFER_REJECTED,
      NotificationType.TRANSFER_MANAGER_REQUEST,
      NotificationType.TRANSFER_STATUS,
    ],
  },
  REJECTIONS: {
    id: 'rejections',
    label: 'Браки',
    icon: <ErrorIcon />,
    color: '#f44336',
    types: [
      NotificationType.REJECTION_REQUEST,
      NotificationType.REJECTION_APPROVED,
      NotificationType.REJECTION_REJECTED,
    ],
  },
  SYSTEM: {
    id: 'system',
    label: 'Системные',
    icon: <Info />,
    color: '#607d8b',
    types: [
      NotificationType.SYSTEM_MESSAGE,
      NotificationType.OTHER,
    ],
  },
} as const;

type BlockId = keyof typeof NOTIFICATION_BLOCKS;

// Type guard для проверки типа уведомления
const isNotificationTypeInBlock = (type: NotificationType, types: readonly NotificationType[]): boolean => {
  return types.includes(type as any);
};

// Маппинг типа уведомления к блоку
const getNotificationBlock = (type: NotificationType): BlockId => {
  for (const [blockId, block] of Object.entries(NOTIFICATION_BLOCKS)) {
    if (isNotificationTypeInBlock(type, block.types)) {
      return blockId as BlockId;
    }
  }
  return 'SYSTEM';
};

// Получение иконки для типа уведомления
const getNotificationIcon = (type: NotificationType) => {
  const iconMap: Record<NotificationType, React.ReactNode> = {
    [NotificationType.REVISION_REQUEST]: <AssignmentIcon />,
    [NotificationType.REVISION_COMPLETED]: <CheckCircleOutline />,
    [NotificationType.REVISION_VERIFIED]: <Verified />,
    [NotificationType.REVISION_UPDATED]: <PublishedWithChanges />,
    [NotificationType.REPORT_SUBMITTED]: <Send />,
    [NotificationType.REPORT_APPROVED]: <CheckCircle />,
    [NotificationType.REPORT_REJECTED]: <Cancel />,
    [NotificationType.REPORT_ACCOUNTANT]: <Assessment />,
    [NotificationType.INVENTORY_LOW]: <Warning />,
    [NotificationType.TRANSFER_REQUEST]: <PublishedWithChanges />,
    [NotificationType.TRANSFER_APPROVED]: <CheckCircle />,
    [NotificationType.TRANSFER_IN_TRANSIT]: <TransferIcon />,
    [NotificationType.TRANSFER_DISCREPANCY]: <Warning />,
    [NotificationType.TRANSFER_COMPLETED]: <CheckCircleOutline />,
    [NotificationType.TRANSFER_REJECTED]: <Cancel />,
    [NotificationType.TRANSFER_MANAGER_REQUEST]: <AssignmentIcon />,
    [NotificationType.TRANSFER_STATUS]: <PublishedWithChanges />,
    [NotificationType.REJECTION_REQUEST]: <ReportProblem />,
    [NotificationType.REJECTION_APPROVED]: <CheckCircle />,
    [NotificationType.REJECTION_REJECTED]: <RemoveCircleOutline />,
    [NotificationType.SYSTEM_MESSAGE]: <NotificationsIcon />,
    [NotificationType.OTHER]: <Info />,
  };
  return iconMap[type] || <NotificationsIcon />;
};

// Получение цвета для типа уведомления
const getNotificationColor = (type: NotificationType): string => {
  const block = NOTIFICATION_BLOCKS[getNotificationBlock(type)];
  return block?.color || '#607d8b';
};

// Компонент бейджей-блоков
interface BlockBadgesProps {
  selectedBlock: BlockId | null;
  onBlockSelect: (blockId: BlockId | null) => void;
}

const BlockBadges: React.FC<BlockBadgesProps> = ({ selectedBlock, onBlockSelect }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        gap: 1, 
        p: 1.5,
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        flexWrap: 'wrap',
      }}
    >
      <Button
        onClick={() => onBlockSelect(null)}
        variant={selectedBlock === null ? 'contained' : 'outlined'}
        startIcon={!isMobile && <FilterList />}
        sx={{
          ...iOSStyles.blockChip,
          minWidth: isMobile ? 60 : 80,
          backgroundColor: selectedBlock === null ? theme.palette.primary.main : 'transparent',
          borderColor: selectedBlock === null ? 'transparent' : alpha(theme.palette.primary.main, 0.3),
          color: selectedBlock === null ? 'white' : theme.palette.text.primary,
          '&:hover': {
            backgroundColor: selectedBlock === null 
              ? theme.palette.primary.dark 
              : alpha(theme.palette.primary.main, 0.08),
          },
        }}
      >
        {isMobile ? 'Все' : 'Все уведомления'}
      </Button>
      
      {Object.entries(NOTIFICATION_BLOCKS).map(([blockId, block]) => (
        <Button
          key={blockId}
          onClick={() => onBlockSelect(blockId as BlockId)}
          variant={selectedBlock === blockId ? 'contained' : 'outlined'}
          startIcon={!isMobile && block.icon}
          sx={{
            ...iOSStyles.blockChip,
            minWidth: isMobile ? 70 : 100,
            backgroundColor: selectedBlock === blockId ? block.color : 'transparent',
            borderColor: selectedBlock === blockId ? 'transparent' : alpha(block.color, 0.3),
            color: selectedBlock === blockId ? 'white' : theme.palette.text.primary,
            '&:hover': {
              backgroundColor: selectedBlock === blockId 
                ? block.color 
                : alpha(block.color, 0.08),
            },
          }}
        >
          {block.label}
        </Button>
      ))}
    </Box>
  );
};

// Компонент статус-фильтров
interface StatusFiltersProps {
  selectedBlock: BlockId | null;
  selectedType: NotificationType | '';
  onTypeSelect: (type: NotificationType | '') => void;
  onApply: () => void;
  onClear: () => void;
}

const StatusFilters: React.FC<StatusFiltersProps> = ({
  selectedBlock,
  selectedType,
  onTypeSelect,
  onApply,
  onClear,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const availableTypes = useMemo(() => {
    if (!selectedBlock) return [];
    return NOTIFICATION_BLOCKS[selectedBlock].types;
  }, [selectedBlock]);

  if (!selectedBlock) return null;

  return (
    <Box sx={{ p: 1.5, backgroundColor: alpha(theme.palette.primary.light, 0.02) }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
        ТИП УВЕДОМЛЕНИЯ
      </Typography>
      
      <Box sx={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: 1, 
        mb: 2,
        maxHeight: 'none', // Убираем ограничение высоты
        overflowY: 'visible', // Убираем скролл
      }}>
        <Chip
          label="Все"
          onClick={() => onTypeSelect('')}
          variant={selectedType === '' ? 'filled' : 'outlined'}
          color={selectedType === '' ? 'primary' : 'default'}
          sx={iOSStyles.filterChip}
        />
        {availableTypes.map(type => (
          <Chip
            key={type}
            label={getNotificationTypeText(type)}
            onClick={() => onTypeSelect(type)}
            variant={selectedType === type ? 'filled' : 'outlined'}
            color={selectedType === type ? 'primary' : 'default'}
            sx={iOSStyles.filterChip}
          />
        ))}
      </Box>
      
      <Box sx={{ 
        display: 'flex', 
        gap: 1.5, 
        alignItems: 'center',
        flexDirection: isMobile ? 'column' : 'row',
      }}>
        <Button
          variant="contained"
          onClick={onApply}
          disabled={!selectedType}
          sx={{ 
            ...iOSStyles.filterChip,
            minWidth: isMobile ? '100%' : 140,
            backgroundColor: NOTIFICATION_BLOCKS[selectedBlock]?.color,
            color: 'white',
            fontWeight: 600,
            '&:hover': {
              backgroundColor: NOTIFICATION_BLOCKS[selectedBlock]?.color,
              opacity: 0.9,
            },
            '&.Mui-disabled': {
              backgroundColor: alpha(NOTIFICATION_BLOCKS[selectedBlock]?.color, 0.3),
              color: alpha('#fff', 0.5),
            },
          }}
        >
          Применить фильтр
        </Button>
        <Button
          variant="outlined"
          onClick={onClear}
          startIcon={<Clear />}
          sx={{ 
            ...iOSStyles.filterChip,
            minWidth: isMobile ? '100%' : 100,
            borderColor: alpha(theme.palette.text.primary, 0.2),
          }}
        >
          Сбросить
        </Button>
      </Box>
    </Box>
  );
};

// Основной компонент страницы
const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Фильтры
  const [selectedBlock, setSelectedBlock] = useState<BlockId | null>(null);
  const [selectedType, setSelectedType] = useState<NotificationType | ''>('');
  const [appliedType, setAppliedType] = useState<NotificationType | ''>('');
  const [statusFilter, setStatusFilter] = useState<NotificationStatus | ''>('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  
  // Пагинация
  const [skip, setSkip] = useState(0);
  const limit = 20;
  const [hasMore, setHasMore] = useState(true);

  // Загрузка данных
  const loadNotifications = async (reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
        setSkip(0);
      }
      
      const currentSkip = reset ? 0 : skip;
      
      const [notificationsData, count] = await Promise.all([
        notificationService.getNotifications(
          currentSkip,
          limit,
          statusFilter || undefined,
          appliedType || undefined,
          unreadOnly
        ),
        notificationService.getUnreadCount()
      ]);
      
      if (reset) {
        setNotifications(notificationsData);
      } else {
        setNotifications(prev => [...prev, ...notificationsData]);
      }
      
      setUnreadCount(count);
      setHasMore(notificationsData.length === limit);
      
    } catch (error) {
      console.error('Error loading notifications:', error);
      setError('Ошибка загрузки уведомлений');
    } finally {
      setLoading(false);
    }
  };

  // Загрузка при монтировании и изменении фильтров
  useEffect(() => {
    loadNotifications(true);
  }, [statusFilter, appliedType, unreadOnly]);

  // Загрузка следующей страницы
  useEffect(() => {
    if (skip > 0) {
      loadNotifications(false);
    }
  }, [skip]);

  // Обработчики
  const handleLoadMore = () => {
    setSkip(prev => prev + limit);
  };

  const handleBlockSelect = (blockId: BlockId | null) => {
    setSelectedBlock(blockId);
    setSelectedType('');
    setAppliedType('');
  };

  const handleApplyTypeFilter = () => {
    setAppliedType(selectedType);
  };

  const handleClearTypeFilter = () => {
    setSelectedType('');
    setAppliedType('');
  };

  const handleClearAllFilters = () => {
    setSelectedBlock(null);
    setSelectedType('');
    setAppliedType('');
    setStatusFilter('');
    setUnreadOnly(false);
  };

  const handleNotificationClick = async (notification: Notification) => {
    setSelectedNotification(notification);
    
    if (notification.status === NotificationStatus.UNREAD) {
      try {
        await notificationService.markAsRead(notification.id);
        setNotifications(prev => 
          prev.map(n => 
            n.id === notification.id 
              ? { ...n, status: NotificationStatus.READ } 
              : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
  };

  const handleCloseDetails = () => {
    setSelectedNotification(null);
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => 
        prev.map(n => ({ ...n, status: NotificationStatus.READ }))
      );
      setUnreadCount(0);
      setSuccessMessage('Все уведомления помечены как прочитанные');
    } catch (error) {
      console.error('Error marking all as read:', error);
      setError('Ошибка при отметке уведомлений');
    }
  };

  const handleDeleteNotification = async (notificationId: number, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (selectedNotification?.id === notificationId) {
        setSelectedNotification(null);
      }
      setSuccessMessage('Уведомление удалено');
    } catch (error) {
      console.error('Error deleting notification:', error);
      setError('Ошибка при удалении уведомления');
    }
  };

  const handleArchiveNotification = async (notificationId: number, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    
    try {
      await notificationService.markAsArchived(notificationId);
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, status: NotificationStatus.ARCHIVED } 
            : n
        )
      );
      setSuccessMessage('Уведомление архивировано');
    } catch (error) {
      console.error('Error archiving notification:', error);
      setError('Ошибка при архивации уведомления');
    }
  };

  const handleNavigateToEntity = (notification: Notification) => {
    if (notification.entityType && notification.entityId) {
      switch (notification.entityType) {
        case 'revision':
          navigate(`/revisions/${notification.entityId}`);
          break;
        case 'report':
          navigate(`/reports/${notification.entityId}`);
          break;
        case 'transfer':
          navigate(`/movements/${notification.entityId}`);
          break;
        case 'rejection':
          navigate(`/defects/${notification.entityId}`);
          break;
      }
    }
    handleCloseDetails();
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusChip = (status: NotificationStatus) => {
    switch (status) {
      case NotificationStatus.UNREAD:
        return <Chip label="Новое" color="error" size="small" sx={{ borderRadius: 4, height: 24 }} />;
      case NotificationStatus.READ:
        return <Chip label="Прочитано" variant="outlined" size="small" sx={{ borderRadius: 4, height: 24 }} />;
      case NotificationStatus.ARCHIVED:
        return <Chip label="Архив" variant="outlined" size="small" sx={{ borderRadius: 4, height: 24 }} />;
      default:
        return null;
    }
  };

  const activeFiltersCount = [
    appliedType,
    statusFilter,
    unreadOnly,
  ].filter(Boolean).length;

  return (
    <Container 
      maxWidth="lg" 
      sx={{ 
        mt: { xs: 1, sm: 2, md: 4 }, 
        mb: { xs: 1, sm: 2, md: 4 },
        px: { xs: 1, sm: 2, md: 3 },
      }}
    >
      {/* Шапка с кнопкой назад */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          sx={{ ...iOSStyles.button }}
        >
          Назад
        </Button>
        
        <IconButton onClick={() => loadNotifications(true)} disabled={loading}>
          <Refresh />
        </IconButton>
      </Box>

      {/* Заголовок */}
      <Box sx={{ mb: 3 }}>
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom 
          sx={{ 
            color: '#2a0f35',
            fontSize: { xs: '1.75rem', sm: '2rem', md: '2.25rem' },
          }}
        >
          Уведомления
        </Typography>
        <Typography 
          variant="subtitle1" 
          sx={{ 
            color: '#4c5454',
            fontSize: { xs: '0.9rem', sm: '1rem' },
          }}
        >
          {unreadCount > 0 
            ? `У вас ${unreadCount} непрочитанных уведомлений` 
            : 'Новых уведомлений нет'}
        </Typography>
      </Box>

      {/* Фильтры */}
      <Paper elevation={0} sx={{ ...iOSStyles.paper, mb: 3 }}>
        <BlockBadges 
          selectedBlock={selectedBlock} 
          onBlockSelect={handleBlockSelect}
        />
        
        {selectedBlock && (
          <StatusFilters
            selectedBlock={selectedBlock}
            selectedType={selectedType}
            onTypeSelect={setSelectedType}
            onApply={handleApplyTypeFilter}
            onClear={handleClearTypeFilter}
          />
        )}
        
        {/* Дополнительные фильтры */}
        <Box sx={{ p: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Chip
            label="Только непрочитанные"
            onClick={() => setUnreadOnly(!unreadOnly)}
            variant={unreadOnly ? 'filled' : 'outlined'}
            color={unreadOnly ? 'error' : 'default'}
            sx={iOSStyles.filterChip}
          />
          
          <Chip
            label={statusFilter === NotificationStatus.ARCHIVED ? 'В архиве' : 'Скрыть архив'}
            onClick={() => setStatusFilter(
              statusFilter === NotificationStatus.ARCHIVED ? '' : NotificationStatus.ARCHIVED
            )}
            variant={statusFilter === NotificationStatus.ARCHIVED ? 'filled' : 'outlined'}
            color="default"
            sx={iOSStyles.filterChip}
          />
          
          {activeFiltersCount > 0 && (
            <Button
              onClick={handleClearAllFilters}
              startIcon={<Clear />}
              sx={{ 
                ...iOSStyles.filterChip, 
                ml: 'auto',
                minWidth: isMobile ? '100%' : 120,
                mt: isMobile ? 1 : 0,
                borderColor: alpha(theme.palette.error.main, 0.3),
                color: theme.palette.error.main,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.error.main, 0.05),
                  borderColor: theme.palette.error.main,
                },
              }}
            >
              Сбросить все
            </Button>
          )}
        </Box>
      </Paper>

      {/* Кнопка пометить все как прочитанные */}
      {unreadCount > 0 && (
        <Box sx={{ mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<MarkEmailRead />}
            onClick={handleMarkAllAsRead}
            fullWidth
            sx={{
              ...iOSStyles.button,
              height: 48,
              backgroundColor: '#4caf50',
              '&:hover': { backgroundColor: '#388e3c' },
            }}
          >
            Пометить все как прочитанные ({unreadCount})
          </Button>
        </Box>
      )}

      {/* Список уведомлений */}
      <Paper elevation={0} sx={iOSStyles.paper}>
        {loading && notifications.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress size={40} sx={{ color: '#2a0f35' }} />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <NotificationsIcon sx={{ fontSize: 48, color: alpha('#2a0f35', 0.2), mb: 2 }} />
            <Typography variant="h6" sx={{ color: '#4c5454', mb: 1 }}>
              Уведомлений не найдено
            </Typography>
            <Typography variant="body2" sx={{ color: '#8a8a8a', mb: 2 }}>
              {activeFiltersCount > 0 
                ? 'Попробуйте сбросить фильтры' 
                : 'Здесь будут появляться новые уведомления'}
            </Typography>
            {activeFiltersCount > 0 && (
              <Button 
                variant="outlined" 
                onClick={handleClearAllFilters}
                sx={{ ...iOSStyles.button, height: 40 }}
              >
                Сбросить фильтры
              </Button>
            )}
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {notifications.map((notification, index) => {
              const block = NOTIFICATION_BLOCKS[getNotificationBlock(notification.type)];
              
              return (
                <React.Fragment key={notification.id}>
                  <ListItem
                    disablePadding
                    sx={{
                      backgroundColor: notification.status === NotificationStatus.UNREAD 
                        ? alpha(block.color, 0.05)
                        : 'transparent',
                      transition: 'background-color 0.2s',
                      '&:hover': {
                        backgroundColor: alpha(block.color, 0.1),
                      },
                    }}
                  >
                    <ListItemButton
                      onClick={() => handleNotificationClick(notification)}
                      sx={{ py: { xs: 1.5, sm: 2 } }}
                    >
                      <ListItemIcon sx={{ minWidth: { xs: 48, sm: 56 } }}>
                        <Avatar
                          sx={{
                            bgcolor: alpha(block.color, 0.1),
                            color: block.color,
                            width: { xs: 40, sm: 44 },
                            height: { xs: 40, sm: 44 },
                          }}
                        >
                          {getNotificationIcon(notification.type)}
                        </Avatar>
                      </ListItemIcon>
                      
                      <ListItemText
                        primary={
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: { xs: 'column', sm: 'row' },
                            alignItems: { xs: 'flex-start', sm: 'center' },
                            gap: { xs: 1, sm: 2 },
                            mb: 0.5,
                          }}>
                            <Typography 
                              variant="subtitle1" 
                              sx={{ 
                                flex: 1,
                                fontWeight: notification.status === NotificationStatus.UNREAD ? 600 : 400,
                                fontSize: { xs: '0.95rem', sm: '1rem' },
                              }}
                            >
                              {notification.title}
                            </Typography>
                            <Box sx={{ 
                              display: 'flex', 
                              gap: 1, 
                              alignItems: 'center',
                              flexWrap: 'wrap',
                            }}>
                              {getStatusChip(notification.status)}
                              <Typography 
                                variant="caption" 
                                sx={{ color: '#8a8a8a', whiteSpace: 'nowrap' }}
                              >
                                {formatTime(notification.createdAt)}
                              </Typography>
                            </Box>
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography
                              variant="body2"
                              sx={{
                                color: '#4c5454',
                                mb: 1,
                                fontSize: { xs: '0.85rem', sm: '0.875rem' },
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {notification.message}
                            </Typography>
                            
                            <Box sx={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: 1,
                            }}>
                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <Chip
                                  label={block.label}
                                  size="small"
                                  sx={{
                                    ...iOSStyles.chip,
                                    backgroundColor: alpha(block.color, 0.1),
                                    color: block.color,
                                    fontWeight: 500,
                                    borderRadius: 4,
                                    height: 24,
                                  }}
                                />
                                {notification.senderName && (
                                  <Typography variant="caption" sx={{ color: '#8a8a8a' }}>
                                    от {notification.senderName}
                                  </Typography>
                                )}
                              </Box>
                              
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                {notification.entityType && notification.entityId && (
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleNavigateToEntity(notification);
                                    }}
                                    sx={{ 
                                      color: block.color,
                                      '&:hover': { backgroundColor: alpha(block.color, 0.1) },
                                    }}
                                  >
                                    <ArrowForward fontSize="small" />
                                  </IconButton>
                                )}
                                
                                {notification.status !== NotificationStatus.ARCHIVED && (
                                  <IconButton
                                    size="small"
                                    onClick={(e) => handleArchiveNotification(notification.id, e)}
                                    sx={{ 
                                      color: '#9e9e9e',
                                      '&:hover': { backgroundColor: alpha('#9e9e9e', 0.1) },
                                    }}
                                  >
                                    <Archive fontSize="small" />
                                  </IconButton>
                                )}
                                
                                <IconButton
                                  size="small"
                                  onClick={(e) => handleDeleteNotification(notification.id, e)}
                                  sx={{ 
                                    color: '#f44336',
                                    '&:hover': { backgroundColor: alpha('#f44336', 0.1) },
                                  }}
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Box>
                            </Box>
                          </Box>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                  
                  {index < notifications.length - 1 && <Divider />}
                </React.Fragment>
              );
            })}
          </List>
        )}
        
        {/* Кнопка "Загрузить еще" */}
        {hasMore && notifications.length > 0 && (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Button
              variant="outlined"
              onClick={handleLoadMore}
              disabled={loading}
              sx={{ ...iOSStyles.button, height: 40 }}
            >
              {loading ? 'Загрузка...' : 'Загрузить еще'}
            </Button>
          </Box>
        )}
      </Paper>

      {/* Диалог деталей уведомления */}
      <Dialog
        open={!!selectedNotification}
        onClose={handleCloseDetails}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            m: 2,
            boxShadow: '0 8px 24px rgba(106, 61, 122, 0.15)',
          },
        }}
      >
        {selectedNotification && (
          <>
            <DialogTitle sx={{ 
              p: { xs: 2, sm: 2.5 }, 
              pb: 1,
              backgroundColor: alpha(
                NOTIFICATION_BLOCKS[getNotificationBlock(selectedNotification.type)].color,
                0.05
              ),
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: alpha(
                      NOTIFICATION_BLOCKS[getNotificationBlock(selectedNotification.type)].color,
                      0.1
                    ),
                    color: NOTIFICATION_BLOCKS[getNotificationBlock(selectedNotification.type)].color,
                    width: 48,
                    height: 48,
                  }}
                >
                  {getNotificationIcon(selectedNotification.type)}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ color: '#2a0f35', fontWeight: 600 }}>
                    {selectedNotification.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#8a8a8a' }}>
                    {formatTime(selectedNotification.createdAt)}
                    {selectedNotification.senderName && ` • от ${selectedNotification.senderName}`}
                  </Typography>
                </Box>
                <IconButton onClick={handleCloseDetails} size="small">
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            
            <DialogContent sx={{ p: { xs: 2, sm: 2.5 }, pt: 2 }}>
              <Typography 
                variant="body1" 
                sx={{ 
                  color: '#4c5454', 
                  whiteSpace: 'pre-wrap',
                  fontSize: { xs: '0.95rem', sm: '1rem' },
                }}
              >
                {selectedNotification.message}
              </Typography>
            </DialogContent>
            
            <DialogActions sx={{ p: { xs: 2, sm: 2.5 }, pt: 1, gap: 1 }}>
              {selectedNotification.status !== NotificationStatus.ARCHIVED && (
                <Button
                  variant="outlined"
                  onClick={() => handleArchiveNotification(selectedNotification.id)}
                  sx={{ ...iOSStyles.button, height: 40 }}
                >
                  Архив
                </Button>
              )}
              
              <Button
                variant="outlined"
                onClick={() => handleDeleteNotification(selectedNotification.id)}
                startIcon={<Delete />}
                color="error"
                sx={{ ...iOSStyles.button, height: 40 }}
              >
                Удалить
              </Button>
              
              {selectedNotification.entityType && selectedNotification.entityId && (
                <Button
                  variant="contained"
                  onClick={() => handleNavigateToEntity(selectedNotification)}
                  startIcon={<ArrowForward />}
                  sx={{
                    ...iOSStyles.button,
                    height: 40,
                    ml: 'auto',
                    backgroundColor: NOTIFICATION_BLOCKS[getNotificationBlock(selectedNotification.type)].color,
                    '&:hover': {
                      backgroundColor: NOTIFICATION_BLOCKS[getNotificationBlock(selectedNotification.type)].color,
                      opacity: 0.9,
                    },
                  }}
                >
                  Перейти
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Уведомления об успехе/ошибке */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage(null)}
        TransitionComponent={Zoom}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          severity="success" 
          sx={{ 
            borderRadius: 4,
            boxShadow: '0 4px 12px rgba(76, 175, 80, 0.2)',
          }}
          onClose={() => setSuccessMessage(null)}
        >
          {successMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={3000}
        onClose={() => setError(null)}
        TransitionComponent={Zoom}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          severity="error" 
          sx={{ 
            borderRadius: 4,
            boxShadow: '0 4px 12px rgba(244, 67, 54, 0.2)',
          }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default NotificationsPage;