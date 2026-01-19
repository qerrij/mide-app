import React, { useState, useEffect } from 'react';
import {
  Badge,
  IconButton,
  Menu,
  Typography,
  Box,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  CircularProgress,
  ListItemIcon,
  ListItemText,
  ListItemButton,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Assignment as AssignmentIcon,
  CheckCircle,
  Cancel,
  Assessment,
  Warning,
  ArrowForward,
  MarkEmailRead,
  Delete,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../../api/notificationService';
import {
  Notification,
  NotificationType,
} from '../../types';

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Загрузка уведомлений и счетчика
  const loadData = async () => {
    try {
      setLoading(true);
      const [notificationsData, count] = await Promise.all([
        notificationService.getNotifications(0, 10, undefined, undefined, true),
        notificationService.getUnreadCount()
      ]);
      setNotifications(notificationsData);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Загрузка при монтировании
  useEffect(() => {
    loadData();
  }, []);

  // Обновление при открытии меню
  useEffect(() => {
    if (anchorEl) {
      loadData();
    }
  }, [anchorEl]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notification: Notification) => {
    setSelectedNotification(notification);
    
    // Помечаем как прочитанное
    if (notification.status === 'UNREAD') {
      try {
        await notificationService.markAsRead(notification.id);
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

  const handleNavigateToEntity = (notification: Notification) => {
    if (notification.entityType && notification.entityId) {
      switch (notification.entityType) {
        case 'revision':
          navigate(`/revisions/${notification.entityId}`);
          break;
        case 'report':
          navigate(`/reports/${notification.entityId}`);
          break;
        // Добавьте другие типы сущностей по мере необходимости
      }
    }
    handleClose();
    handleCloseDetails();
  };

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
    const colors = {
      [NotificationType.REVISION_REQUEST]: '#2196f3',
      [NotificationType.REVISION_COMPLETED]: '#4caf50',
      [NotificationType.REVISION_VERIFIED]: '#9c27b0',
      [NotificationType.REPORT_SUBMITTED]: '#ff9800',
      [NotificationType.REPORT_APPROVED]: '#4caf50',
      [NotificationType.REPORT_REJECTED]: '#f44336',
      [NotificationType.REPORT_ACCOUNTANT]: '#673ab7',
      [NotificationType.INVENTORY_LOW]: '#ff9800',
      [NotificationType.SYSTEM_MESSAGE]: '#607d8b',
      [NotificationType.OTHER]: '#9e9e9e',
    };
    return colors[type];
  };

  const formatTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Только что';
    if (diffMins < 60) return `${diffMins} мин. назад`;
    if (diffHours < 24) return `${diffHours} ч. назад`;
    if (diffDays < 7) return `${diffDays} дн. назад`;
    
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const truncateText = (text: string, maxLength: number = 80): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <>
      <IconButton
        onClick={handleClick}
        sx={{
          color: 'white',
          position: 'relative',
        }}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 400,
            height: 'auto',
            maxHeight: 'calc(100vh - 100px)',
            mt: 1.5,
            maxWidth: '90vw',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
        MenuListProps={{
          sx: {
            p: 0,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
          },
        }}
      >
        {/* Заголовок */}
        <Box sx={{ p: 2, pb: 1, flexShrink: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" sx={{ color: '#2a0f35' }}>
              Уведомления
            </Typography>
            {unreadCount > 0 && (
              <Button 
                size="small" 
                onClick={handleMarkAllAsRead}
                startIcon={<MarkEmailRead />}
              >
                Прочитать все
              </Button>
            )}
          </Box>
          <Divider />
        </Box>

        {/* Список уведомлений */}
        <Box sx={{ 
          flex: 1, 
          overflowY: 'auto',
          minHeight: 0, // Важно для flex-контейнера
        }}>
          {loading ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <CircularProgress size={24} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" sx={{ color: '#4c5454' }}>
                Нет уведомлений
              </Typography>
            </Box>
          ) : (
            notifications.map((notification) => (
              <ListItemButton
                key={notification.id}
                sx={{
                  p: 2,
                  borderBottom: '1px solid #f0f0f0',
                  backgroundColor: notification.status === 'UNREAD' ? '#f5f3f6' : 'transparent',
                  borderLeft: notification.status === 'UNREAD' ? `3px solid ${getNotificationColor(notification.type)}` : 'none',
                  '&:hover': {
                    backgroundColor: '#f0f0f0',
                  },
                }}
                onClick={() => handleNotificationClick(notification)}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Avatar
                    sx={{
                      bgcolor: `${getNotificationColor(notification.type)}15`,
                      color: getNotificationColor(notification.type),
                      width: 40,
                      height: 40,
                    }}
                  >
                    {getNotificationIcon(notification.type)}
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography
                      variant="subtitle2"
                      sx={{
                        color: notification.status === 'UNREAD' ? '#2a0f35' : '#4c5454',
                        fontWeight: notification.status === 'UNREAD' ? 600 : 400,
                        mb: 0.5,
                      }}
                    >
                      {notification.title}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography
                        variant="body2"
                        sx={{
                          color: '#4c5454',
                          mb: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {truncateText(notification.message, 80)}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ color: '#8a8a8a' }}>
                          {formatTime(notification.createdAt)}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {notification.entityType && (
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
            ))
          )}
        </Box>

        {/* Кнопка "Все уведомления" - ВСЕГДА показываем */}
        <Box sx={{ 
          flexShrink: 0,
          borderTop: '1px solid #f0f0f0',
        }}>
          <Box sx={{ p: 1.5, textAlign: 'center' }}>
            <Button
              size="small"
              onClick={() => {
                navigate('/notifications');
                handleClose();
              }}
              fullWidth
            >
              Все уведомления
            </Button>
          </Box>
        </Box>
      </Menu>

      {/* Диалог деталей уведомления */}
      <Dialog
        open={!!selectedNotification}
        onClose={handleCloseDetails}
        maxWidth="sm"
        fullWidth
      >
        {selectedNotification && (
          <>
            <DialogTitle sx={{ backgroundColor: '#f5f3f6', color: '#2a0f35', pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    sx={{
                      bgcolor: `${getNotificationColor(selectedNotification.type)}15`,
                      color: getNotificationColor(selectedNotification.type),
                    }}
                  >
                    {getNotificationIcon(selectedNotification.type)}
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{selectedNotification.title}</Typography>
                    <Typography variant="caption" sx={{ color: '#8a8a8a' }}>
                      {formatTime(selectedNotification.createdAt)}
                      {selectedNotification.senderName && ` • От: ${selectedNotification.senderName}`}
                    </Typography>
                  </Box>
                </Box>
                <IconButton
                  size="small"
                  onClick={() => handleDeleteNotification(selectedNotification.id)}
                  sx={{ color: '#f44336' }}
                >
                  <Delete />
                </IconButton>
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
                      // Пропускаем поля, которые не нужно показывать
                      if (typeof value === 'object' && !Array.isArray(value)) {
                        return null;
                      }
                      
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
    </>
  );
};

export default Notifications;