// components/NotificationFilters.tsx
import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Collapse,
  Zoom,
  useTheme,
  useMediaQuery,
  IconButton,
  Divider,
} from '@mui/material';
import {
  FilterList as FilterListIcon,
  Clear as ClearIcon,
  Check as CheckIcon,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowUp as ArrowUpIcon,
  MarkEmailRead as MarkEmailReadIcon,
  Archive as ArchiveIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { NotificationCategories } from '../../utils/notificationUtils';
import { NotificationStatus } from '../../types';

interface NotificationFiltersProps {
  filters: {
    category: string;
    entityStatus: string;  // Статус сущности (запрошена, в пути и т.д.)
    notificationStatus: NotificationStatus | '';  // Статус уведомления (прочитано/непрочитано/архив)
  };
  onFilterChange: (filters: any) => void;
  onApply: () => void;
  onClear: () => void;
  stats: {
    total: number;
    unread: number;
    archived: number;
  };
}

export const NotificationFilters: React.FC<NotificationFiltersProps> = ({
  filters,
  onFilterChange,
  onApply,
  onClear,
  stats,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [expanded, setExpanded] = useState(!isMobile);

  const categories = [
    { value: '', label: 'Все категории' },
    ...Object.entries(NotificationCategories).map(([key, value]) => ({
      value: key,
      label: value.label,
    })),
  ];

  const getEntityStatusOptions = () => {
    if (!filters.category) return [];
    
    const category = NotificationCategories[filters.category];
    if (!category) return [];
    
    return [
      { value: '', label: 'Все статусы' },
      ...category.getStatuses(),
    ];
  };

  const entityStatusOptions = getEntityStatusOptions();
  
  const notificationStatusOptions = [
    { value: '', label: 'Все уведомления' },
    { value: NotificationStatus.UNREAD, label: 'Непрочитанные', color: '#f44336' },
    { value: NotificationStatus.READ, label: 'Прочитанные', color: '#4caf50' },
    { value: NotificationStatus.ARCHIVED, label: 'В архиве', color: '#9e9e9e' },
  ];

  const hasActiveFilters = filters.category || filters.entityStatus || filters.notificationStatus;

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.category) count++;
    if (filters.entityStatus) count++;
    if (filters.notificationStatus) count++;
    return count;
  };

  return (
    <Paper
      sx={{
        mb: 3,
        borderRadius: isMobile ? 0 : 8,
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        border: isMobile ? 'none' : '1px solid rgba(106, 61, 122, 0.1)',
      }}
    >
      {/* Заголовок фильтров */}
      <Box
        onClick={() => isMobile && setExpanded(!expanded)}
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: isMobile ? 'pointer' : 'default',
          backgroundColor: '#f8f6fa',
          borderBottom: expanded ? '1px solid rgba(106, 61, 122, 0.1)' : 'none',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterListIcon sx={{ color: '#2a0f35' }} />
          <Typography variant="h6" sx={{ color: '#2a0f35', fontSize: '1rem', fontWeight: 500 }}>
            Фильтры
          </Typography>
          {hasActiveFilters && (
            <Chip
              label={`Активны (${getActiveFiltersCount()})`}
              size="small"
              sx={{
                backgroundColor: '#674fb6',
                color: 'white',
                height: 20,
                '& .MuiChip-label': { px: 1, fontSize: '0.625rem' },
              }}
            />
          )}
        </Box>
        
        {isMobile && (
          <IconButton size="small" sx={{ color: '#674fb6' }}>
            {expanded ? <ArrowUpIcon /> : <ArrowDownIcon />}
          </IconButton>
        )}
      </Box>

      {/* Контент фильтров */}
      <Collapse in={expanded}>
        <Box sx={{ p: 2 }}>
          {/* Статистика по уведомлениям */}
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              mb: 3,
              flexWrap: 'wrap',
            }}
          >
            <Chip
              label={`Всего: ${stats.total}`}
              variant="outlined"
              size="small"
              sx={{ 
                borderRadius: 6,
                borderColor: '#674fb6',
                color: '#2a0f35',
              }}
            />
            <Chip
              icon={<MarkEmailReadIcon />}
              label={`Новых: ${stats.unread}`}
              color="error"
              size="small"
              variant={filters.notificationStatus === NotificationStatus.UNREAD ? 'filled' : 'outlined'}
              onClick={() => onFilterChange({
                ...filters,
                notificationStatus: filters.notificationStatus === NotificationStatus.UNREAD 
                  ? '' 
                  : NotificationStatus.UNREAD
              })}
              sx={{
                borderRadius: 6,
                cursor: 'pointer',
                '&:hover': { opacity: 0.8 },
                ...(filters.notificationStatus === NotificationStatus.UNREAD && {
                  backgroundColor: '#f44336',
                  color: 'white',
                }),
              }}
            />
            <Chip
              icon={<ArchiveIcon />}
              label={`В архиве: ${stats.archived}`}
              variant="outlined"
              size="small"
              color={filters.notificationStatus === NotificationStatus.ARCHIVED ? 'default' : 'default'}
              onClick={() => onFilterChange({
                ...filters,
                notificationStatus: filters.notificationStatus === NotificationStatus.ARCHIVED 
                  ? '' 
                  : NotificationStatus.ARCHIVED
              })}
              sx={{
                borderRadius: 6,
                cursor: 'pointer',
                borderColor: '#9e9e9e',
                '&:hover': { backgroundColor: '#f5f5f5' },
                ...(filters.notificationStatus === NotificationStatus.ARCHIVED && {
                  backgroundColor: '#9e9e9e',
                  color: 'white',
                  '&:hover': { backgroundColor: '#757575' },
                }),
              }}
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Фильтр по статусу уведомлений (детальный) */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="caption"
              sx={{
                color: '#8a8a8a',
                ml: 1,
                mb: 1,
                display: 'block',
                fontSize: '0.75rem',
              }}
            >
              СТАТУС УВЕДОМЛЕНИЯ
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {notificationStatusOptions.map((status) => (
                <Chip
                  key={status.value}
                  label={status.label}
                  onClick={() => onFilterChange({
                    ...filters,
                    notificationStatus: status.value,
                  })}
                  variant={filters.notificationStatus === status.value ? 'filled' : 'outlined'}
                  sx={{
                    borderRadius: 6,
                    backgroundColor: filters.notificationStatus === status.value 
                      ? status.color || '#674fb6'
                      : 'transparent',
                    borderColor: status.color || '#674fb6',
                    color: filters.notificationStatus === status.value 
                      ? 'white' 
                      : status.color || '#674fb6',
                    '&:hover': {
                      backgroundColor: filters.notificationStatus === status.value 
                        ? status.color || '#563f9a'
                        : `${status.color || '#674fb6'}10`,
                    },
                  }}
                />
              ))}
            </Box>
          </Box>

          {/* Фильтр по категориям */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="caption"
              sx={{
                color: '#8a8a8a',
                ml: 1,
                mb: 1,
                display: 'block',
                fontSize: '0.75rem',
              }}
            >
              КАТЕГОРИЯ
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {categories.map((cat) => (
                <Chip
                  key={cat.value}
                  label={cat.label}
                  onClick={() => {
                    onFilterChange({
                      ...filters,
                      category: cat.value,
                      entityStatus: '', // Сбрасываем статус сущности при смене категории
                    });
                  }}
                  color={filters.category === cat.value ? 'primary' : 'default'}
                  variant={filters.category === cat.value ? 'filled' : 'outlined'}
                  sx={{
                    borderRadius: 6,
                    backgroundColor: filters.category === cat.value 
                      ? '#674fb6' 
                      : 'transparent',
                    borderColor: '#674fb6',
                    color: filters.category === cat.value ? 'white' : '#674fb6',
                    '&:hover': {
                      backgroundColor: filters.category === cat.value 
                        ? '#563f9a' 
                        : '#f0eef7',
                    },
                  }}
                />
              ))}
            </Box>
          </Box>

          {/* Фильтр по статусу сущности (показываем только если выбрана категория) */}
          {filters.category && entityStatusOptions.length > 1 && (
            <Zoom in={true} style={{ transitionDelay: '100ms' }}>
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#8a8a8a',
                    ml: 1,
                    mb: 1,
                    display: 'block',
                    fontSize: '0.75rem',
                  }}
                >
                  СТАТУС {NotificationCategories[filters.category]?.label.toUpperCase()}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {entityStatusOptions.map((status) => (
                    <Chip
                      key={status.value}
                      label={status.label}
                      onClick={() => onFilterChange({
                        ...filters,
                        entityStatus: status.value,
                      })}
                      variant={filters.entityStatus === status.value ? 'filled' : 'outlined'}
                      sx={{
                        borderRadius: 6,
                        backgroundColor: filters.entityStatus === status.value 
                          ? '#4caf50' 
                          : 'transparent',
                        borderColor: '#4caf50',
                        color: filters.entityStatus === status.value ? 'white' : '#4caf50',
                        '&:hover': {
                          backgroundColor: filters.entityStatus === status.value 
                            ? '#388e3c' 
                            : '#e8f5e9',
                        },
                      }}
                    />
                  ))}
                </Box>
              </Box>
            </Zoom>
          )}

          {/* Кнопки действий */}
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              mt: 3,
              flexDirection: isMobile ? 'column' : 'row',
            }}
          >
            <Button
              variant="contained"
              onClick={onApply}
              startIcon={<CheckIcon />}
              fullWidth={isMobile}
              sx={{
                backgroundColor: '#674fb6',
                borderRadius: 8,
                py: 1.5,
                textTransform: 'none',
                '&:hover': { backgroundColor: '#563f9a' },
              }}
            >
              Применить фильтры
            </Button>
            
            {hasActiveFilters && (
              <Button
                variant="outlined"
                onClick={onClear}
                startIcon={<ClearIcon />}
                fullWidth={isMobile}
                sx={{
                  borderColor: '#674fb6',
                  color: '#674fb6',
                  borderRadius: 8,
                  py: 1.5,
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: '#563f9a',
                    backgroundColor: '#f0eef7',
                  },
                }}
              >
                Сбросить все
              </Button>
            )}
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
};