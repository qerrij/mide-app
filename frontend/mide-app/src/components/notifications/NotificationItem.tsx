// components/NotificationItem.tsx
import React from 'react';
import {
  Box,
  Typography,
  Avatar,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { Notification } from '../../types';
import { NotificationColors, NotificationIcons } from '../../utils/notificationUtils';

interface NotificationItemProps {
  notification: Notification;
  onDelete: (id: number) => void;
  onClick: (notification: Notification) => void;
  onNavigate: (notification: Notification) => void;
  formatTime: (date: Date) => string;
  truncateText: (text: string, maxLength: number) => string;
  variant?: 'dropdown' | 'list';
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onDelete,
  onClick,
  onNavigate,
  formatTime,
  truncateText,
  variant = 'dropdown',
}) => {
  const color = NotificationColors[notification.type];
  const Icon = NotificationIcons[notification.type];
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(notification.id);
  };

  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNavigate(notification);
  };

  if (variant === 'list') {
    return (
      <ListItemButton
        onClick={() => onClick(notification)}
        sx={{
          py: 2,
          backgroundColor: notification.status === 'UNREAD' ? '#f5f3f6' : 'transparent',
          borderLeft: notification.status === 'UNREAD' ? `3px solid ${color}` : 'none',
          '&:hover': { backgroundColor: '#f0f0f0' },
        }}
      >
        <ListItemIcon sx={{ minWidth: 56 }}>
          <Avatar
            sx={{
              bgcolor: `${color}15`,
              color: color,
              width: 44,
              height: 44,
            }}
          >
            <Icon />
          </Avatar>
        </ListItemIcon>
        
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Typography variant="subtitle1" sx={{ flex: 1 }}>
                {notification.title}
              </Typography>
              <Typography variant="caption" sx={{ color: '#8a8a8a' }}>
                {formatTime(notification.createdAt)}
              </Typography>
            </Box>
          }
          secondary={
            <>
              <Typography variant="body2" sx={{ color: '#4c5454', mb: 1.5 }}>
                {notification.message}
              </Typography>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  {notification.senderName && (
                    <Typography variant="caption" sx={{ color: '#8a8a8a' }}>
                      От: {notification.senderName}
                    </Typography>
                  )}
                </Box>
                
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {notification.entityType && notification.entityId && (
                    <IconButton
                      size="small"
                      onClick={handleNavigate}
                      sx={{ color }}
                    >
                      <ArrowForwardIcon fontSize="small" />
                    </IconButton>
                  )}
                  
                  <IconButton
                    size="small"
                    onClick={handleDelete}
                    sx={{ color: '#f44336' }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </>
          }
        />
      </ListItemButton>
    );
  }

  // Dropdown вариант
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
      <Box
        className="notification-content"
        sx={{
          backgroundColor: 'white',
          border: notification.status === 'UNREAD' 
            ? `1px solid ${color}30`
            : '1px solid rgba(106, 61, 122, 0.1)',
          boxShadow: '0 2px 8px rgba(106, 61, 122, 0.08)',
          borderRadius: 8,
          position: 'relative',
          zIndex: 1,
          cursor: 'pointer',
        }}
        onClick={() => onClick(notification)}
      >
        <ListItemButton
          sx={{
            p: 2,
            borderRadius: 8,
            backgroundColor: 'transparent',
            '&:hover': { backgroundColor: 'transparent' },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <Avatar
              sx={{
                bgcolor: `${color}15`,
                color,
                width: 40,
                height: 40,
                border: notification.status === 'UNREAD' 
                  ? `1px solid ${color}30`
                  : '1px solid #e0e0e0',
              }}
            >
              <Icon fontSize="small" />
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
                  {notification.type}
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
                  <IconButton
                    size="small"
                    onClick={handleDelete}
                    sx={{ 
                      color: '#f44336',
                      backgroundColor: '#f4433610',
                      width: 28,
                      height: 28,
                      '&:hover': { backgroundColor: '#f4433620' },
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                  {notification.entityType && (
                    <IconButton
                      size="small"
                      onClick={handleNavigate}
                      sx={{ 
                        color,
                        backgroundColor: `${color}10`,
                        width: 28,
                        height: 28,
                        '&:hover': { backgroundColor: `${color}20` },
                      }}
                    >
                      <ArrowForwardIcon fontSize="small" />
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