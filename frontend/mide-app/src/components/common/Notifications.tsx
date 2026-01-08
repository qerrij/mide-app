import React, { useState } from 'react';
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
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Inventory as InventoryIcon,
  TransferWithinAStation,
  Warning,
  Assessment,
  CheckCircle,
  Cancel,
  PhotoCamera,
  Videocam,
} from '@mui/icons-material';
import { Notification, NotificationType } from '../../types';

const Notifications: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 1,
      userId: 1,
      title: 'Новая ревизия от Ивана Иванова',
      message: 'Продавец Иван Иванов отправил ревизию для проверки. Товары: HQD Crystal Bar - 50 шт, Elf Bar 600 - 30 шт.',
      type: NotificationType.INVENTORY_REVIEW,
      read: false,
      createdAt: new Date(),
      data: {
        seller: 'Иван Иванов',
        items: ['HQD Crystal Bar - 50 шт', 'Elf Bar 600 - 30 шт'],
        photos: 3,
      },
    },
    {
      id: 2,
      userId: 1,
      title: 'Запрос на перемещение от Петра Петрова',
      message: 'Петр Петров хочет передать вам 5 единиц товара HQD Crystal Bar. Проверьте накладную и подтвердите перемещение.',
      type: NotificationType.MOVEMENT_REQUEST,
      read: false,
      createdAt: new Date(Date.now() - 3600000),
      data: {
        from: 'Петр Петров',
        items: ['HQD Crystal Bar - 5 шт'],
        photos: 2,
      },
    },
    {
      id: 3,
      userId: 1,
      title: 'Бракованный товар обнаружен',
      message: 'Обнаружен брак в партии одноразок HQD Crystal Bar. Количество: 5 шт. Причина: неисправный аккумулятор.',
      type: NotificationType.DEFECT_REPORTED,
      read: true,
      createdAt: new Date(Date.now() - 7200000),
      data: {
        product: 'HQD Crystal Bar',
        quantity: 5,
        reason: 'Неисправный аккумулятор',
        photos: 3,
        videos: 1,
      },
    },
  ]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (notification: Notification) => {
    setSelectedNotification(notification);
    markAsRead(notification.id);
  };

  const handleCloseDetails = () => {
    setSelectedNotification(null);
  };

  const markAsRead = (id: number) => {
    setNotifications(notifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
    handleClose();
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.INVENTORY_REVIEW:
        return <InventoryIcon sx={{ color: '#56b8d1' }} />;
      case NotificationType.MOVEMENT_REQUEST:
        return <TransferWithinAStation sx={{ color: '#2a436d' }} />;
      case NotificationType.MOVEMENT_CONFIRMED:
        return <CheckCircle sx={{ color: '#3f1f4b' }} />;
      case NotificationType.MOVEMENT_REJECTED:
        return <Cancel sx={{ color: '#ca0ec0' }} />;
      case NotificationType.DEFECT_REPORTED:
        return <Warning sx={{ color: '#6d3f57' }} />;
      case NotificationType.REPORT_SUBMITTED:
        return <Assessment sx={{ color: '#674fb6' }} />;
      default:
        return <NotificationsIcon />;
    }
  };

  const getNotificationColor = (type: NotificationType): string => {
    const colors = {
      [NotificationType.INVENTORY_REVIEW]: '#56b8d1',
      [NotificationType.MOVEMENT_REQUEST]: '#2a436d',
      [NotificationType.MOVEMENT_CONFIRMED]: '#3f1f4b',
      [NotificationType.MOVEMENT_REJECTED]: '#ca0ec0',
      [NotificationType.DEFECT_REPORTED]: '#6d3f57',
      [NotificationType.REPORT_SUBMITTED]: '#674fb6',
      [NotificationType.SYSTEM]: '#4c5454',
    };
    return colors[type];
  };

  const formatTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} мин. назад`;
    } else if (diffHours < 24) {
      return `${diffHours} ч. назад`;
    } else if (diffDays < 7) {
      return `${diffDays} дн. назад`;
    } else {
      return date.toLocaleDateString('ru-RU');
    }
  };

  const truncateText = (text: string, maxLength: number = 60): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const unreadCount = notifications.filter(n => !n.read).length;

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
            width: 360,
            maxHeight: 480,
            mt: 1.5,
            maxWidth: '90vw',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" sx={{ color: '#2a0f35' }}>
              Уведомления
            </Typography>
            {unreadCount > 0 && (
              <Button size="small" onClick={markAllAsRead}>
                Прочитать все
              </Button>
            )}
          </Box>
          <Divider />
        </Box>

        <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
          {notifications.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" sx={{ color: '#4c5454' }}>
                Нет уведомлений
              </Typography>
            </Box>
          ) : (
            notifications.map((notification) => (
              <Box
                key={notification.id}
                sx={{
                  p: 2,
                  borderBottom: '1px solid #f0f0f0',
                  cursor: 'pointer',
                  backgroundColor: notification.read ? 'transparent' : '#f5f3f6',
                  borderLeft: notification.read ? 'none' : `3px solid ${getNotificationColor(notification.type)}`,
                  '&:hover': {
                    backgroundColor: '#f0f0f0',
                  },
                }}
                onClick={() => handleNotificationClick(notification)}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Avatar
                    sx={{
                      bgcolor: `${getNotificationColor(notification.type)}15`,
                      color: getNotificationColor(notification.type),
                      width: 40,
                      height: 40,
                      flexShrink: 0,
                    }}
                  >
                    {getNotificationIcon(notification.type)}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        color: notification.read ? '#4c5454' : '#2a0f35',
                        fontWeight: notification.read ? 400 : 600,
                        mb: 0.5,
                      }}
                    >
                      {notification.title}
                    </Typography>
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
                    <Typography variant="caption" sx={{ color: '#8a8a8a', display: 'block' }}>
                      {formatTime(notification.createdAt)}
                    </Typography>
                  </Box>
                  {!notification.read && (
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: getNotificationColor(notification.type),
                        flexShrink: 0,
                        mt: 0.5,
                      }}
                    />
                  )}
                </Box>
              </Box>
            ))
          )}
        </Box>

        {notifications.length > 0 && (
          <>
            <Divider />
            <Box sx={{ p: 1, textAlign: 'center' }}>
              <Button size="small" onClick={clearAll} sx={{ color: '#ca0ec0' }}>
                Очистить все
              </Button>
            </Box>
          </>
        )}
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
            <DialogTitle sx={{ backgroundColor: '#f5f3f6', color: '#2a0f35' }}>
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
                  </Typography>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" sx={{ color: '#4c5454', mb: 3, whiteSpace: 'pre-wrap' }}>
                {selectedNotification.message}
              </Typography>

              {selectedNotification.data && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: '#2a0f35', mb: 1 }}>
                    Дополнительная информация:
                  </Typography>
                  {selectedNotification.data.photos && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <PhotoCamera sx={{ color: '#674fb6', fontSize: 20 }} />
                      <Typography variant="body2" sx={{ color: '#4c5454' }}>
                        Фото: {selectedNotification.data.photos} шт.
                      </Typography>
                    </Box>
                  )}
                  {selectedNotification.data.videos && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Videocam sx={{ color: '#2a436d', fontSize: 20 }} />
                      <Typography variant="body2" sx={{ color: '#4c5454' }}>
                        Видео: {selectedNotification.data.videos} шт.
                      </Typography>
                    </Box>
                  )}
                  {selectedNotification.data.items && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ color: '#2a0f35', mb: 1 }}>
                        Товары:
                      </Typography>
                      {selectedNotification.data.items.map((item: string, index: number) => (
                        <Typography key={index} variant="body2" sx={{ color: '#4c5454', pl: 2 }}>
                          • {item}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDetails} sx={{ color: '#4c5454' }}>
                Закрыть
              </Button>
              {(selectedNotification.type === NotificationType.MOVEMENT_REQUEST || 
                selectedNotification.type === NotificationType.INVENTORY_REVIEW) && (
                <Button
                  variant="contained"
                  sx={{
                    backgroundColor: getNotificationColor(selectedNotification.type),
                    '&:hover': {
                      backgroundColor: getNotificationColor(selectedNotification.type),
                      opacity: 0.9,
                    },
                  }}
                >
                  Перейти к проверке
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