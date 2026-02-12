import React, { useState, useEffect, useRef } from 'react';
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
  Slide,
  IconButtonProps,
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
  LocalShipping,
  TransferWithinAStation,
  Inventory,
  Check,
  Error,
  AllInbox,
  DeleteForever,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../../api/notificationService';
import {
  Notification,
  NotificationType,
  getNotificationTypeText,
} from '../../types';

interface SwipeableNotificationProps {
  notification: Notification;
  onDelete: (id: number) => void;
  onClick: (notification: Notification) => void;
  onNavigate: (notification: Notification) => void;
  getNotificationColor: (type: NotificationType) => string;
  getNotificationIcon: (type: NotificationType) => React.ReactNode;
  formatTime: (date: Date) => string;
  truncateText: (text: string, maxLength: number) => string;
}

const SwipeableNotification: React.FC<SwipeableNotificationProps> = ({
  notification,
  onDelete,
  onClick,
  onNavigate,
  getNotificationColor,
  getNotificationIcon,
  formatTime,
  truncateText,
}) => {
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const touchStartX = useRef(0);
  const touchMoveX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const DELETE_THRESHOLD = -80; // Порог для удаления (пиксели)
  const DELETE_LIMIT = -120; // Максимальный свайп
  const ANIMATION_DURATION = 200; // Длительность анимации (мс)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    
    touchMoveX.current = e.touches[0].clientX;
    const diff = touchMoveX.current - touchStartX.current;
    
    // Ограничиваем свайп только влево (отрицательные значения)
    let newTranslateX = Math.max(Math.min(diff, 0), DELETE_LIMIT);
    
    // Добавляем сопротивление при приближении к порогу удаления
    if (newTranslateX < DELETE_THRESHOLD) {
      newTranslateX = DELETE_THRESHOLD + (newTranslateX - DELETE_THRESHOLD) * 0.7;
    }
    
    setTranslateX(newTranslateX);
    
    // Показываем кнопку удаления, если превышен порог
    if (newTranslateX <= DELETE_THRESHOLD) {
      setShowDelete(true);
    } else {
      setShowDelete(false);
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    
    if (translateX <= DELETE_THRESHOLD) {
      // Если свайпнули достаточно далеко, удаляем
      handleDelete();
    } else {
      // Возвращаем на место с анимацией
      setTranslateX(0);
      setShowDelete(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Только левая кнопка мыши
    touchStartX.current = e.clientX;
    setIsSwiping(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSwiping) return;
    
    touchMoveX.current = e.clientX;
    const diff = touchMoveX.current - touchStartX.current;
    
    let newTranslateX = Math.max(Math.min(diff, 0), DELETE_LIMIT);
    
    if (newTranslateX < DELETE_THRESHOLD) {
      newTranslateX = DELETE_THRESHOLD + (newTranslateX - DELETE_THRESHOLD) * 0.7;
    }
    
    setTranslateX(newTranslateX);
    
    if (newTranslateX <= DELETE_THRESHOLD) {
      setShowDelete(true);
    } else {
      setShowDelete(false);
    }
  };

  const handleMouseUp = () => {
    setIsSwiping(false);
    
    if (translateX <= DELETE_THRESHOLD) {
      handleDelete();
    } else {
      setTranslateX(0);
      setShowDelete(false);
    }
  };

  const handleDelete = () => {
    setIsDeleting(true);
    
    // Анимация удаления
    setTimeout(() => {
      onDelete(notification.id);
    }, ANIMATION_DURATION);
  };

  const handleClick = () => {
    if (!isSwiping && translateX === 0) {
      onClick(notification);
    }
  };

  // Очищаем слушатели при размонтировании
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isSwiping) {
        setIsSwiping(false);
        if (translateX <= DELETE_THRESHOLD) {
          handleDelete();
        } else {
          setTranslateX(0);
          setShowDelete(false);
        }
      }
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isSwiping) {
        handleMouseMove(e as unknown as React.MouseEvent);
      }
    };

    if (isSwiping) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('mousemove', handleGlobalMouseMove);
    }

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [isSwiping, translateX]);

  return (
    <Box
      sx={{
        mb: 1.5,
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
        '&:hover': {
          '& .notification-content': {
            boxShadow: '0 4px 12px rgba(106, 61, 122, 0.12)',
            transform: 'translateY(-1px)',
            backgroundColor: notification.status === 'UNREAD' ? '#fcfaff' : '#fafafa',
          },
        },
      }}
    >
      {/* Фон для удаления (красный шлейф) */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#f4433615',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingLeft: 2,
          opacity: showDelete ? 1 : 0,
          transform: showDelete ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'all 0.3s ease',
          borderRadius: 8,
          border: '1px solid #f4433630',
        }}
      >
        <DeleteForever sx={{ color: '#f44336' }} />
      </Box>

      {/* Контент уведомления */}
      <Box
        ref={containerRef}
        className="notification-content"
        sx={{
          backgroundColor: 'white',
          border: notification.status === 'UNREAD' 
            ? `1px solid ${getNotificationColor(notification.type)}30`
            : '1px solid rgba(106, 61, 122, 0.1)',
          boxShadow: '0 2px 8px rgba(106, 61, 122, 0.08)',
          borderRadius: 8,
          transform: `translateX(${translateX}px)`,
          transition: isSwiping ? 'none' : `transform ${ANIMATION_DURATION}ms ease`,
          position: 'relative',
          zIndex: 1,
          cursor: 'pointer',
          userSelect: 'none',
          opacity: isDeleting ? 0 : 1,
          transformOrigin: 'left center',
          ...(isDeleting && {
            transform: `translateX(-100%) scale(0.8)`,
            transition: `all ${ANIMATION_DURATION}ms ease`,
          }),
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
      >
        <ListItemButton
          sx={{
            p: 2,
            borderRadius: 8,
            backgroundColor: 'transparent',
            '&:hover': {
              backgroundColor: 'transparent',
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <Avatar
              sx={{
                bgcolor: `${getNotificationColor(notification.type)}15`,
                color: getNotificationColor(notification.type),
                width: 40,
                height: 40,
                border: notification.status === 'UNREAD' 
                  ? `1px solid ${getNotificationColor(notification.type)}30`
                  : '1px solid #e0e0e0',
              }}
            >
              {getNotificationIcon(notification.type)}
            </Avatar>
          </ListItemIcon>
          <ListItemText
            primary={
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: notification.status === 'UNREAD' ? '#2a0f35' : '#4c5454',
                    fontWeight: notification.status === 'UNREAD' ? 600 : 400,
                    fontSize: '0.875rem',
                    lineHeight: 1.2,
                    mb: 0.5,
                  }}
                >
                  {getNotificationTypeText(notification.type)}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: '#4c5454',
                    fontSize: '0.8125rem',
                    lineHeight: 1.4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    mb: 1,
                  }}
                >
                  {truncateText(notification.message, 70)}
                </Typography>
              </Box>
            }
            secondary={
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: '#8a8a8a', fontSize: '0.75rem' }}>
                  {formatTime(notification.createdAt)}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {notification.entityType && (
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate(notification);
                      }}
                      sx={{ 
                        color: getNotificationColor(notification.type),
                        backgroundColor: `${getNotificationColor(notification.type)}10`,
                        width: 28,
                        height: 28,
                        '&:hover': {
                          backgroundColor: `${getNotificationColor(notification.type)}20`,
                        },
                      }}
                    >
                      <ArrowForward fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </Box>
            }
          />
        </ListItemButton>
      </Box>
    </Box>
  );
};

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

  useEffect(() => {
    loadData();
  }, []);

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

  const handleDeleteNotification = async (notificationId: number) => {
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (selectedNotification?.id === notificationId) {
        setSelectedNotification(null);
      }
      // Обновляем счетчик непрочитанных
      setUnreadCount(prev => {
        const deletedNotification = notifications.find(n => n.id === notificationId);
        return deletedNotification && deletedNotification.status === 'UNREAD' 
          ? Math.max(0, prev - 1) 
          : prev;
      });
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
        case 'transfer':
          navigate(`/movements/${notification.entityId}`);
          break;
      }
    }
    handleClose();
    handleCloseDetails();
  };

  const handleAllNotificationsClick = () => {
    navigate('/notifications');
    handleClose();
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
      
      case NotificationType.TRANSFER_REQUEST:
        return <TransferWithinAStation sx={{ color: '#2196f3' }} />;
      case NotificationType.TRANSFER_APPROVED:
        return <CheckCircle sx={{ color: '#4caf50' }} />;
      case NotificationType.TRANSFER_IN_TRANSIT:
        return <LocalShipping sx={{ color: '#2196f3' }} />;
      case NotificationType.TRANSFER_DISCREPANCY:
        return <Warning sx={{ color: '#ff9800' }} />;
      case NotificationType.TRANSFER_COMPLETED:
        return <Check sx={{ color: '#4caf50' }} />;
      case NotificationType.TRANSFER_REJECTED:
        return <Error sx={{ color: '#f44336' }} />;
      case NotificationType.TRANSFER_MANAGER_REQUEST:
        return <TransferWithinAStation sx={{ color: '#673ab7' }} />;
      case NotificationType.TRANSFER_STATUS:
        return <NotificationsIcon sx={{ color: '#607d8b' }} />;
      
      case NotificationType.OTHER:
        return <NotificationsIcon />;
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
          color: '#2a0f35',
          position: 'relative',
          backgroundColor: '#ffffff',
          border: '1px solid rgba(106, 61, 122, 0.1)',
          width: 44,
          height: 44,
          borderRadius: '50%',
          '&:hover': {
            backgroundColor: '#f5f3f6',
          },
        }}
      >
        <Badge 
          badgeContent={unreadCount} 
          color="error"
          sx={{
            '& .MuiBadge-badge': {
              fontSize: '0.6rem',
              height: 18,
              minWidth: 18,
              top: 2,
              right: 2,
              backgroundColor: '#ca0ec0',
            },
          }}
        >
          <NotificationsIcon sx={{ fontSize: 20 }} />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        disableScrollLock={true}
        PaperProps={{
          sx: {
            width: 420,
            height: 'auto',
            maxHeight: 'calc(100vh - 100px)',
            mt: 1,
            borderRadius: 8,
            boxShadow: '0 8px 32px rgba(106, 61, 122, 0.2)',
            border: '1px solid rgba(106, 61, 122, 0.1)',
            backgroundColor: '#ffffff',
            overflow: 'hidden',
          },
        }}
      >
        {/* Заголовок */}
        <Box sx={{ 
          p: 2, 
          pb: 1, 
          backgroundColor: 'transparent',
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2" sx={{ color: '#2a0f35', fontWeight: 600, fontSize: '1rem' }}>
              Уведомления
            </Typography>
            {unreadCount > 0 && (
              <Button 
                size="small" 
                onClick={handleMarkAllAsRead}
                sx={{ 
                  color: '#674fb6', 
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  textTransform: 'none',
                  borderRadius: 6,
                  px: 1.5,
                  py: 0.5,
                  '&:hover': {
                    backgroundColor: '#674fb610',
                  },
                }}
              >
                Прочитать все
              </Button>
            )}
          </Box>
        </Box>

        {/* Список уведомлений */}
        <Box sx={{ 
          height: 400,
          overflowY: 'auto',
          px: 1.5,
          py: 1,
          backgroundColor: 'transparent',
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
            borderRadius: 8,
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#674fb640',
            borderRadius: 8,
          },
        }}>
          {loading ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <CircularProgress size={24} sx={{ color: '#674fb6' }} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ 
              p: 3, 
              textAlign: 'center',
              backgroundColor: 'transparent',
            }}>
              <Typography variant="body2" sx={{ color: '#4c5454' }}>
                Нет уведомлений
              </Typography>
            </Box>
          ) : (
            notifications.map((notification) => (
              <SwipeableNotification
                key={notification.id}
                notification={notification}
                onDelete={handleDeleteNotification}
                onClick={handleNotificationClick}
                onNavigate={handleNavigateToEntity}
                getNotificationColor={getNotificationColor}
                getNotificationIcon={getNotificationIcon}
                formatTime={formatTime}
                truncateText={truncateText}
              />
            ))
          )}
        </Box>

        {/* Кнопка "Все уведомления" */}
        <Box sx={{ 
          p: 1.5,
          backgroundColor: 'transparent',
        }}>
          <Button
            size="medium"
            onClick={handleAllNotificationsClick}
            fullWidth
            startIcon={<AllInbox />}
            sx={{
              color: '#674fb6',
              textTransform: 'none',
              borderRadius: 8,
              backgroundColor: '#f5f3f6',
              height: 40,
              fontSize: '0.875rem',
              fontWeight: 500,
              border: '1px solid rgba(106, 61, 122, 0.1)',
              '&:hover': {
                backgroundColor: '#674fb615',
                boxShadow: '0 2px 8px rgba(106, 61, 122, 0.12)',
              },
            }}
          >
            Все уведомления
          </Button>
        </Box>
      </Menu>

      <Dialog
        open={!!selectedNotification}
        onClose={handleCloseDetails}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 8,
            boxShadow: '0 8px 32px rgba(106, 61, 122, 0.2)',
            border: '1px solid rgba(106, 61, 122, 0.1)',
            backgroundColor: '#ffffff',
          },
        }}
      >
        {selectedNotification && (
          <>
            <DialogTitle sx={{ 
              backgroundColor: 'transparent', 
              color: '#2a0f35', 
              pb: 1,
              borderBottom: '1px solid rgba(106, 61, 122, 0.1)',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    sx={{
                      bgcolor: `${getNotificationColor(selectedNotification.type)}15`,
                      color: getNotificationColor(selectedNotification.type),
                      border: `1px solid ${getNotificationColor(selectedNotification.type)}30`,
                    }}
                  >
                    {getNotificationIcon(selectedNotification.type)}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                      {getNotificationTypeText(selectedNotification.type)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#8a8a8a' }}>
                      {formatTime(selectedNotification.createdAt)}
                      {selectedNotification.senderName && ` • От: ${selectedNotification.senderName}`}
                    </Typography>
                  </Box>
                </Box>
                <IconButton
                  size="small"
                  onClick={() => handleDeleteNotification(selectedNotification.id)}
                  sx={{ 
                    color: '#f44336',
                    backgroundColor: '#f4433610',
                    '&:hover': {
                      backgroundColor: '#f4433620',
                    },
                  }}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
              <Typography variant="body1" sx={{ color: '#4c5454', mb: 3, whiteSpace: 'pre-wrap' }}>
                {selectedNotification.message}
              </Typography>

              {selectedNotification.data && Object.keys(selectedNotification.data).length > 0 && (
                <Box sx={{ 
                  mt: 2, 
                  p: 2, 
                  borderRadius: 8,
                  backgroundColor: '#f5f3f6',
                  border: '1px solid rgba(106, 61, 122, 0.1)',
                }}>
                  <Typography variant="subtitle2" sx={{ color: '#2a0f35', mb: 2, fontWeight: 600 }}>
                    Дополнительная информация:
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {Object.entries(selectedNotification.data).map(([key, value]) => {
                      if (typeof value === 'object' && !Array.isArray(value)) {
                        return null;
                      }
                      
                      return (
                        <Box key={key} sx={{ display: 'flex', gap: 1 }}>
                          <Typography variant="body2" sx={{ color: '#2a0f35', minWidth: 120, fontWeight: 500 }}>
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
              <Button 
                onClick={handleCloseDetails} 
                sx={{ 
                  color: '#4c5454',
                  textTransform: 'none',
                  borderRadius: 6,
                  px: 2,
                  '&:hover': {
                    backgroundColor: '#f5f3f6',
                  },
                }}
              >
                Закрыть
              </Button>
              {selectedNotification.entityType && selectedNotification.entityId && (
                <Button
                  variant="contained"
                  onClick={() => handleNavigateToEntity(selectedNotification)}
                  sx={{
                    backgroundColor: getNotificationColor(selectedNotification.type),
                    color: '#ffffff',
                    textTransform: 'none',
                    borderRadius: 6,
                    px: 2,
                    '&:hover': {
                      backgroundColor: getNotificationColor(selectedNotification.type),
                      opacity: 0.9,
                      boxShadow: '0 4px 12px rgba(106, 61, 122, 0.2)',
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