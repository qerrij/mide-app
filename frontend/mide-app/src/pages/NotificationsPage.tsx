import React, { useState, useEffect } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Badge,
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
  Check,
  Archive,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../api/notificationService';
import {
  Notification,
  NotificationStatus,
  NotificationType,
  getNotificationTypeText,
} from '../types';

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [filters, setFilters] = useState({
    status: '' as NotificationStatus | '',
    type: '' as NotificationType | '',
    unreadOnly: false,
  });
  
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
          filters.status || undefined,
          filters.type || undefined,
          filters.unreadOnly
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
    } finally {
      setLoading(false);
    }
  };

  // Загрузка при монтировании и изменении фильтров
  useEffect(() => {
    loadNotifications(true);
  }, [filters]);

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

  const handleFilterChange = (field: keyof typeof filters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      status: '',
      type: '',
      unreadOnly: false,
    });
  };

  const handleNotificationClick = async (notification: Notification) => {
    setSelectedNotification(notification);
    
    // Помечаем как прочитанное
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
    } catch (error) {
      console.error('Error marking all as read:', error);
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
    } catch (error) {
      console.error('Error deleting notification:', error);
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
    } catch (error) {
      console.error('Error archiving notification:', error);
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
      }
    }
    handleCloseDetails();
  };

  // Вспомогательные функции
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.REVISION_REQUEST:
        return <AssignmentIcon sx={{ color: '#2196f3' }} />;
      case NotificationType.REVISION_COMPLETED:
        return <CheckCircle sx={{ color: '#4caf50' }} />;
      case NotificationType.REVISION_VERIFIED:
        return <AssignmentIcon sx={{ color: '#9c27b0' }} />;
      case NotificationType.REPORT_SUBMITTED:
        return <Assessment sx={{ color: '#ff9800' }} />;
      case NotificationType.REPORT_APPROVED:
        return <CheckCircle sx={{ color: '#4caf50' }} />;
      case NotificationType.REPORT_REJECTED:
        return <Cancel sx={{ color: '#f44336' }} />;
      case NotificationType.REPORT_ACCOUNTANT:
        return <Assessment sx={{ color: '#673ab7' }} />;
      case NotificationType.INVENTORY_LOW:
        return <Warning sx={{ color: '#ff9800' }} />;
      case NotificationType.SYSTEM_MESSAGE:
        return <NotificationsIcon sx={{ color: '#607d8b' }} />;
      default:
        return <NotificationsIcon />;
    }
  };

const getNotificationColor = (type: NotificationType): string => {
  const colors: Record<NotificationType, string> = {
    [NotificationType.REVISION_REQUEST]: '#2196f3',
    [NotificationType.REVISION_COMPLETED]: '#4caf50',
    [NotificationType.REVISION_VERIFIED]: '#9c27b0',
    [NotificationType.REPORT_SUBMITTED]: '#ff9800',
    [NotificationType.REPORT_APPROVED]: '#4caf50',
    [NotificationType.REPORT_REJECTED]: '#f44336',
    [NotificationType.REPORT_ACCOUNTANT]: '#673ab7',
    [NotificationType.INVENTORY_LOW]: '#ff9800',
    [NotificationType.SYSTEM_MESSAGE]: '#607d8b',
    // Добавьте типы для перемещений
    [NotificationType.TRANSFER_REQUEST]: '#2196f3',
    [NotificationType.TRANSFER_APPROVED]: '#4caf50',
    [NotificationType.TRANSFER_IN_TRANSIT]: '#2196f3',
    [NotificationType.TRANSFER_DISCREPANCY]: '#ff9800',
    [NotificationType.TRANSFER_COMPLETED]: '#4caf50',
    [NotificationType.TRANSFER_REJECTED]: '#f44336',
    [NotificationType.TRANSFER_MANAGER_REQUEST]: '#673ab7',
    [NotificationType.TRANSFER_STATUS]: '#607d8b',
    [NotificationType.OTHER]: '#9e9e9e',
  };
  return colors[type];
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
        return <Chip label="Непрочитано" color="error" size="small" />;
      case NotificationStatus.READ:
        return <Chip label="Прочитано" color="success" size="small" />;
      case NotificationStatus.ARCHIVED:
        return <Chip label="Архив" color="default" size="small" />;
      default:
        return null;
    }
  };

  // Статистика
  const unreadNotifications = notifications.filter(n => n.status === NotificationStatus.UNREAD).length;
  const archivedNotifications = notifications.filter(n => n.status === NotificationStatus.ARCHIVED).length;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Кнопка назад */}
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate(-1)}
        sx={{ mb: 3 }}
      >
        Назад
      </Button>

      {/* Заголовок */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom color="#2a0f35">
          Уведомления
        </Typography>
        <Typography variant="subtitle1" color="#4c5454">
          Все ваши уведомления в одном месте
        </Typography>
      </Box>

      {/* Фильтры */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterList sx={{ color: '#2a0f35' }} />
            <Typography variant="h6" color="#2a0f35">
              Фильтры
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Badge badgeContent={unreadNotifications} color="error" sx={{ mr: 1 }}>
              <Button
                variant={filters.unreadOnly ? "contained" : "outlined"}
                size="small"
                startIcon={filters.unreadOnly ? <Visibility /> : <VisibilityOff />}
                onClick={() => handleFilterChange('unreadOnly', !filters.unreadOnly)}
              >
                Только непрочитанные
              </Button>
            </Badge>
            
            <Button
              variant="outlined"
              size="small"
              onClick={handleClearFilters}
              startIcon={<Clear />}
            >
              Сбросить
            </Button>
          </Box>
        </Box>

        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <FormControl sx={{ minWidth: 200 }} size="small">
            <InputLabel>Статус</InputLabel>
            <Select
              value={filters.status}
              label="Статус"
              onChange={(e: SelectChangeEvent) => handleFilterChange('status', e.target.value)}
            >
              <MenuItem value="">Все статусы</MenuItem>
              <MenuItem value={NotificationStatus.UNREAD}>Непрочитанные</MenuItem>
              <MenuItem value={NotificationStatus.READ}>Прочитанные</MenuItem>
              <MenuItem value={NotificationStatus.ARCHIVED}>Архив</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 200 }} size="small">
            <InputLabel>Тип</InputLabel>
            <Select
              value={filters.type}
              label="Тип"
              onChange={(e: SelectChangeEvent) => handleFilterChange('type', e.target.value)}
            >
              <MenuItem value="">Все типы</MenuItem>
              {Object.values(NotificationType).map(type => (
                <MenuItem key={type} value={type}>
                  {getNotificationTypeText(type)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* Статистика */}
        <Box sx={{ display: 'flex', gap: 3 }}>
          <Chip 
            label={`Всего: ${notifications.length}`}
            color="default"
            variant="outlined"
          />
          <Chip 
            label={`Непрочитано: ${unreadNotifications}`}
            color="error"
            variant={filters.unreadOnly ? "filled" : "outlined"}
          />
          <Chip 
            label={`В архиве: ${archivedNotifications}`}
            color="default"
            variant="outlined"
          />
        </Box>
      </Paper>

      {/* Кнопка пометить все как прочитанные */}
      {unreadNotifications > 0 && (
        <Box sx={{ mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<MarkEmailRead />}
            onClick={handleMarkAllAsRead}
            fullWidth
            sx={{
              backgroundColor: '#4caf50',
              '&:hover': { backgroundColor: '#388e3c' },
            }}
          >
            Пометить все как прочитанные ({unreadNotifications})
          </Button>
        </Box>
      )}

      {/* Список уведомлений */}
      <Paper sx={{ overflow: 'hidden' }}>
        {loading && notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1" sx={{ color: '#4c5454' }}>
              Уведомлений не найдено
            </Typography>
            {filters.status || filters.type || filters.unreadOnly ? (
              <Button 
                variant="outlined" 
                onClick={handleClearFilters}
                sx={{ mt: 2 }}
              >
                Сбросить фильтры
              </Button>
            ) : null}
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {notifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                <ListItem
                  disablePadding
                  sx={{
                    backgroundColor: notification.status === NotificationStatus.UNREAD 
                      ? '#f5f3f6' 
                      : 'transparent',
                    borderLeft: notification.status === NotificationStatus.UNREAD 
                      ? `3px solid ${getNotificationColor(notification.type)}` 
                      : 'none',
                    '&:hover': {
                      backgroundColor: '#f0f0f0',
                    },
                  }}
                >
                  <ListItemButton
                    onClick={() => handleNotificationClick(notification)}
                    sx={{ py: 2 }}
                  >
                    <ListItemIcon sx={{ minWidth: 56 }}>
                      <Avatar
                        sx={{
                          bgcolor: `${getNotificationColor(notification.type)}15`,
                          color: getNotificationColor(notification.type),
                          width: 44,
                          height: 44,
                        }}
                      >
                        {getNotificationIcon(notification.type)}
                      </Avatar>
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                          <Typography variant="subtitle1" sx={{ flex: 1 }}>
                            {notification.title}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            {getStatusChip(notification.status)}
                            <Typography variant="caption" sx={{ color: '#8a8a8a' }}>
                              {formatTime(notification.createdAt)}
                            </Typography>
                          </Box>
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography
                            variant="body2"
                            sx={{
                              color: '#4c5454',
                              mb: 1.5,
                            }}
                          >
                            {notification.message}
                          </Typography>
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                              <Typography variant="caption" sx={{ color: '#8a8a8a' }}>
                                {getNotificationTypeText(notification.type)}
                              </Typography>
                              {notification.senderName && (
                                <>
                                  <Typography variant="caption" sx={{ color: '#8a8a8a' }}>
                                    •
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: '#8a8a8a' }}>
                                    От: {notification.senderName}
                                  </Typography>
                                </>
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
                                  sx={{ color: getNotificationColor(notification.type) }}
                                >
                                  <ArrowForward fontSize="small" />
                                </IconButton>
                              )}
                              
                              {notification.status !== NotificationStatus.ARCHIVED && (
                                <IconButton
                                  size="small"
                                  onClick={(e) => handleArchiveNotification(notification.id, e)}
                                  sx={{ color: '#9e9e9e' }}
                                >
                                  <Archive fontSize="small" />
                                </IconButton>
                              )}
                              
                              <IconButton
                                size="small"
                                onClick={(e) => handleDeleteNotification(notification.id, e)}
                                sx={{ color: '#f44336' }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Box>
                          </Box>
                        </>
                      }
                    />
                  </ListItemButton>
                </ListItem>
                
                {index < notifications.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
        
        {/* Кнопка "Загрузить еще" */}
        {hasMore && notifications.length > 0 && (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Button
              variant="outlined"
              onClick={handleLoadMore}
              disabled={loading}
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
      >
        {selectedNotification && (
          <>
            <DialogTitle sx={{ backgroundColor: '#f5f3f6', color: '#2a0f35' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Avatar
                  sx={{
                    bgcolor: `${getNotificationColor(selectedNotification.type)}15`,
                    color: getNotificationColor(selectedNotification.type),
                  }}
                >
                  {getNotificationIcon(selectedNotification.type)}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6">{selectedNotification.title}</Typography>
                  <Typography variant="caption" sx={{ color: '#8a8a8a' }}>
                    {formatTime(selectedNotification.createdAt)}
                    {selectedNotification.senderName && ` • От: ${selectedNotification.senderName}`}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {getStatusChip(selectedNotification.status)}
                </Box>
              </Box>
            </DialogTitle>
            
            <DialogContent sx={{ pt: 3 }}>
              <Typography variant="body1" sx={{ color: '#4c5454', mb: 3, whiteSpace: 'pre-wrap' }}>
                {selectedNotification.message}
              </Typography>

              {selectedNotification.data && Object.keys(selectedNotification.data).length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: '#2a0f35', mb: 2 }}>
                    Дополнительная информация:
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {Object.entries(selectedNotification.data).map(([key, value]) => {
                      if (key === 'photos' || key === 'items') return null;
                      
                      return (
                        <Box key={key} sx={{ display: 'flex', gap: 1 }}>
                          <Typography variant="body2" sx={{ color: '#2a0f35', minWidth: 120 }}>
                            {key}:
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#4c5454' }}>
                            {Array.isArray(value) 
                              ? value.join(', ') 
                              : typeof value === 'object' 
                                ? JSON.stringify(value) 
                                : String(value)}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              )}
            </DialogContent>
            
            <DialogActions sx={{ p: 2, pt: 1 }}>
              <Button onClick={handleCloseDetails} sx={{ color: '#4c5454' }}>
                Закрыть
              </Button>
              
              <Box sx={{ flex: 1, display: 'flex', gap: 1 }}>
                {selectedNotification.status !== NotificationStatus.ARCHIVED && (
                  <Button
                    variant="outlined"
                    onClick={() => handleArchiveNotification(selectedNotification.id)}
                    startIcon={<Archive />}
                    color="inherit"
                  >
                    В архив
                  </Button>
                )}
                
                <Button
                  variant="outlined"
                  onClick={() => handleDeleteNotification(selectedNotification.id)}
                  startIcon={<Delete />}
                  color="error"
                >
                  Удалить
                </Button>
              </Box>
              
              {selectedNotification.entityType && selectedNotification.entityId && (
                <Button
                  variant="contained"
                  onClick={() => handleNavigateToEntity(selectedNotification)}
                  startIcon={<ArrowForward />}
                  sx={{
                    backgroundColor: getNotificationColor(selectedNotification.type),
                    '&:hover': {
                      backgroundColor: getNotificationColor(selectedNotification.type),
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
    </Container>
  );
};

export default NotificationsPage;