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
  InputLabel,
  Alert,
  CircularProgress,
  Stack,
  Card,
  CardContent,
  CardActions,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  ChevronRight as ChevronRightIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  LocationCity as CityIcon,
  Home as ClusterIcon,
  Public as PublicIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { revisionService } from '../api/revisionService';
import {
  Revision,
  RevisionStatus,
  RevisionType,
  UserRole,
  getRevisionStatusText,
  getRevisionTypeText,
  getRevisionStatusColor,
  getTargetName as getTargetNameHelper,
} from '../types';

const RevisionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Состояния для фильтров
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<RevisionStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<RevisionType | 'all'>('all');
  
  // Функция для получения имени цели ревизии
  const getTargetName = (revision: Revision): string => {
    return getTargetNameHelper(revision);
  };
  
  // Иконки для типов ревизий
  const getTypeIcon = (type: RevisionType) => {
    switch (type) {
      case RevisionType.USER:
        return <PersonIcon sx={{ fontSize: 18 }} />;
      case RevisionType.GROUP:
        return <GroupIcon sx={{ fontSize: 18 }} />;
      case RevisionType.CLUSTER:
        return <ClusterIcon sx={{ fontSize: 18 }} />;
      case RevisionType.CITY:
        return <CityIcon sx={{ fontSize: 18 }} />;
      case RevisionType.GENERAL:
        return <PublicIcon sx={{ fontSize: 18 }} />;
      default:
        return <PersonIcon sx={{ fontSize: 18 }} />;
    }
  };

  // Загрузка ревизий
  const loadRevisions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let revisionsData: Revision[];
      if (user?.role === UserRole.OWNER) {
        revisionsData = await revisionService.getRevisions(0, 100);
      } else {
        revisionsData = await revisionService.getMyRevisions(0, 100);
      }
      
      setRevisions(revisionsData);
    } catch (err: any) {
      setError(err.message || 'Ошибка при загрузке ревизий');
      console.error('Error loading revisions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRevisions();
  }, [user]);

  // Может ли пользователь запрашивать ревизии
  const canRequestRevision = user?.role && [UserRole.OWNER, UserRole.ADMIN, UserRole.SENIOR_SELLER].includes(user.role);

  // Проверяет, заполнил ли пользователь ревизию
  const hasUserFilledRevision = (revision: Revision): boolean => {
    if (!user) return false;
    return revision.fillings?.some(f => f.userId === user.id && f.isCompleted) || false;
  };

  // Может ли пользователь заполнить ревизию
  const canUserFillRevision = (revision: Revision): boolean => {
    if (!user) return false;
    
    // OWNER и ACCOUNTANT не заполняют ревизии
    if (user.role === UserRole.OWNER || user.role === UserRole.ACCOUNTANT) {
      return false;
    }
    
    // Проверяем статус ревизии
    if (revision.status !== RevisionStatus.REQUESTED && 
        revision.status !== RevisionStatus.IN_PROGRESS) {
      return false;
    }
    
    // Проверяем, заполнил ли уже пользователь эту ревизию
    if (hasUserFilledRevision(revision)) {
      return false;
    }
    
    // Проверяем доступ в зависимости от типа
    if (revision.type === RevisionType.USER) {
      return revision.targetUserId === user.id;
    } else if (revision.type === RevisionType.GROUP) {
      return user.groupId === revision.targetGroupId;
    } else if (revision.type === RevisionType.CLUSTER) {
      return user.clusterId === revision.targetClusterId;
    } else if (revision.type === RevisionType.CITY) {
      return user.city === revision.targetCity;
    } else if (revision.type === RevisionType.GENERAL) {
      return true; // OWNER и ACCOUNTANT уже отсеяны выше
    }
    
    return false;
  };

  // Может ли пользователь проверить ревизию
  const canUserVerifyRevision = (revision: Revision): boolean => {
    if (!user) return false;
    
    // Проверять может только тот, кто запросил ревизию
    return revision.requestedById === user.id && 
           revision.status === RevisionStatus.COMPLETED;
  };

  // Определяет приоритет ревизии (требует действия или нет)
  const getRevisionPriority = (revision: Revision): number => {
    if (canUserFillRevision(revision)) return 1;
    if (canUserVerifyRevision(revision)) return 2;
    return 3;
  };

  // Сортировка ревизий: сначала те, что требуют действий
  const sortRevisions = (revisions: Revision[]): Revision[] => {
    return [...revisions].sort((a, b) => {
      const priorityA = getRevisionPriority(a);
      const priorityB = getRevisionPriority(b);
      if (priorityA !== priorityB) return priorityA - priorityB;
      
      // Если приоритет одинаковый, сортируем по дате (новые сверху)
      return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
    });
  };

  // Определяет, какое действие доступно для ревизии
  const getRevisionAction = (revision: Revision): { 
    label: string; 
    action: () => void;
    variant: 'contained' | 'outlined';
    color: 'primary' | 'secondary' | 'success';
    icon?: React.ReactNode;
  } => {
    if (canUserFillRevision(revision)) {
      return {
        label: 'Заполнить',
        action: () => navigate(`/revisions/${revision.id}/fill`),
        variant: 'contained' as const,
        color: 'primary' as const,
        icon: <AssignmentIcon sx={{ fontSize: 20 }} />
      };
    } else if (canUserVerifyRevision(revision)) {
      return {
        label: 'Проверить',
        action: () => navigate(`/revisions/${revision.id}`),
        variant: 'contained' as const,
        color: 'success' as const,
        icon: <CheckCircleIcon sx={{ fontSize: 20 }} />
      };
    } else {
      return {
        label: 'Подробнее',
        action: () => navigate(`/revisions/${revision.id}`),
        variant: 'outlined' as const,
        color: 'primary' as const,
        icon: <ChevronRightIcon sx={{ fontSize: 20 }} />
      };
    }
  };

  // Фильтрация ревизий
  const filteredRevisions = sortRevisions(revisions.filter(revision => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      revision.id.toString().includes(searchTerm) ||
      revision.requestedByName?.toLowerCase().includes(searchLower) ||
      getTargetName(revision).toLowerCase().includes(searchLower) ||
      (revision.comment && revision.comment.toLowerCase().includes(searchLower));
    
    const matchesStatus = statusFilter === 'all' || revision.status === statusFilter;
    const matchesType = typeFilter === 'all' || revision.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  }));

  // Обработчик создания новой ревизии
  const handleRequestRevision = () => {
    navigate('/revisions/request');
  };

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

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: '#f8f9fa',
          py: 4,
        }}
      >
        <Container maxWidth="lg">
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <CircularProgress sx={{ color: '#007AFF' }} />
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        py: 3,
      }}
    >
      <Container maxWidth="md" sx={{ px: { xs: 1, sm: 3, md: 4 } }}>
        {/* Шапка */}
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12 }}>
              <Typography variant="h5" component="h1" gutterBottom color="#000" fontWeight={600}>
                Ревизии
              </Typography>
              <Typography variant="body2" color="#8E8E93">
                Полный пересчет товаров и сверка остатков
              </Typography>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Stack direction="row" spacing={1.5} justifyContent="space-between" alignItems="center">
                {canRequestRevision && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleRequestRevision}
                    fullWidth
                    sx={{
                      borderRadius: 8,
                      backgroundColor: '#007AFF',
                      '&:hover': { backgroundColor: '#0056CC' },
                      py: 1.2,
                      textTransform: 'none',
                      fontSize: '0.95rem',
                    }}
                  >
                    Запросить
                  </Button>
                )}
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={loadRevisions}
                  fullWidth
                  sx={{
                    borderRadius: 8,
                    borderColor: '#C7C7CC',
                    color: '#007AFF',
                    '&:hover': {
                      borderColor: '#007AFF',
                      backgroundColor: 'rgba(0, 122, 255, 0.04)',
                    },
                    py: 1.2,
                    textTransform: 'none',
                    fontSize: '0.95rem',
                  }}
                >
                  Обновить
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Box>

        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 2, 
              borderRadius: 8,
              backgroundColor: '#FF3B3015',
            }}
          >
            {error}
          </Alert>
        )}

        {/* Фильтры */}
        <Paper 
          sx={{ 
            p: 2, 
            mb: 2, 
            borderRadius: 8,
            backgroundColor: '#fff',
            border: 'none',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <Stack spacing={2}>
            <TextField
              fullWidth
              placeholder="Поиск ревизий..."
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
                  backgroundColor: '#F2F2F7',
                  '& fieldset': { border: 'none' }
                }
              }}
              variant="outlined"
            />
            
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 6 }}>
                <FormControl fullWidth>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as RevisionStatus | 'all')}
                    displayEmpty
                    sx={{ 
                      borderRadius: 8,
                      backgroundColor: '#F2F2F7',
                      '& fieldset': { border: 'none' },
                      fontSize: '0.9rem',
                    }}
                  >
                    <MenuItem value="all">Все статусы</MenuItem>
                    {Object.values(RevisionStatus).map((status) => (
                      <MenuItem key={status} value={status}>
                        {getRevisionStatusText(status)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <FormControl fullWidth>
                  <Select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as RevisionType | 'all')}
                    displayEmpty
                    sx={{ 
                      borderRadius: 8,
                      backgroundColor: '#F2F2F7',
                      '& fieldset': { border: 'none' },
                      fontSize: '0.9rem',
                    }}
                  >
                    <MenuItem value="all">Все типы</MenuItem>
                    {Object.values(RevisionType).map((type) => (
                      <MenuItem key={type} value={type}>
                        {getRevisionTypeText(type)}
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
                setTypeFilter('all');
              }}
              sx={{
                borderRadius: 8,
                color: '#007AFF',
                textTransform: 'none',
                fontSize: '0.9rem',
              }}
            >
              Сбросить фильтры
            </Button>
          </Stack>
        </Paper>

        {/* Счетчик ревизий */}
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" color="#000" fontWeight={500}>
            Все ревизии
          </Typography>
          <Chip
            label={`${filteredRevisions.length}`}
            size="small"
            sx={{
              backgroundColor: '#F2F2F7',
              color: '#8E8E93',
              fontWeight: 500,
              borderRadius: 8,
              fontSize: '0.8rem',
            }}
          />
        </Box>

        {/* Список ревизий */}
        {filteredRevisions.length === 0 ? (
          <Paper
            sx={{
              p: 4,
              textAlign: 'center',
              borderRadius: 8,
              backgroundColor: '#fff',
              border: 'none',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <Typography variant="body1" color="#8E8E93">
              Ревизии не найдены
            </Typography>
            <Typography variant="body2" color="#8E8E93" sx={{ mt: 0.5 }}>
              Попробуйте изменить параметры поиска
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={1.5}>
            {filteredRevisions.map((revision) => {
              const action = getRevisionAction(revision);
              const userCanFill = canUserFillRevision(revision);
              const userCanVerify = canUserVerifyRevision(revision);
              const hasUserFilled = hasUserFilledRevision(revision);
              
              return (
                <Card
                  key={revision.id}
                  sx={{
                    borderRadius: 8,
                    backgroundColor: '#fff',
                    border: 'none',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    },
                    ...((userCanFill || userCanVerify) && {
                      border: '1px solid #007AFF',
                      backgroundColor: '#F0F8FF',
                    }),
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    {/* Заголовок */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box sx={{ flex: 1, mr: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          {getTypeIcon(revision.type)}
                          <Typography variant="subtitle2" color="#007AFF" fontWeight={500}>
                            {getRevisionTypeText(revision.type)}
                          </Typography>
                          <Box sx={{ flex: 1 }} />
                          <Chip
                            label={getRevisionStatusText(revision.status)}
                            size="small"
                            sx={{
                              backgroundColor: `${getRevisionStatusColor(revision.status)}15`,
                              color: getRevisionStatusColor(revision.status),
                              fontWeight: 500,
                              borderRadius: 6,
                              fontSize: '0.7rem',
                              minWidth: 'fit-content',
                            }}
                          />
                        </Box>
                        <Typography variant="h6" color="#000" fontWeight={600} fontSize="1.1rem">
                          Ревизия #{revision.id}
                        </Typography>
                        
                        {(userCanFill || userCanVerify) && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                            <Typography variant="caption" color={userCanFill ? '#FF9500' : '#34C759'} fontWeight={500}>
                              {userCanFill ? 'Требуется заполнить' : 'Требуется проверка'}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>

                    <Divider sx={{ my: 1.5, opacity: 0.1 }} />

                    {/* Информация */}
                    <Stack spacing={1.5}>
                      <Box>
                        <Typography variant="caption" color="#8E8E93" display="block">
                          Запросил
                        </Typography>
                        <Typography variant="body2" color="#000" fontWeight={400}>
                          {revision.requestedByName}
                        </Typography>
                        {revision.comment && (
                          <Typography variant="caption" color="#8E8E93" display="block" sx={{ mt: 0.5 }}>
                            {revision.comment}
                          </Typography>
                        )}
                      </Box>

                      <Box>
                        <Typography variant="caption" color="#8E8E93" display="block">
                          Назначение
                        </Typography>
                        <Typography variant="body2" color="#000" fontWeight={400}>
                          {getTargetName(revision)}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="#8E8E93" display="block">
                          Дата запроса
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <ScheduleIcon sx={{ fontSize: 14, color: '#8E8E93' }} />
                          <Typography variant="body2" color="#000">
                            {formatDate(revision.requestedAt)} в {formatTime(revision.requestedAt)}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Дополнительная информация */}
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {revision.isGroupRevision && (
                          <Chip
                            icon={<GroupIcon sx={{ fontSize: 12 }} />}
                            label={`${revision.totalFilled || 0}/${revision.totalUsers || 0}`}
                            size="small"
                            sx={{
                              backgroundColor: '#F2F2F7',
                              color: '#5AC8FA',
                              borderRadius: 6,
                              fontSize: '0.7rem',
                              height: '20px',
                            }}
                          />
                        )}
                        {hasUserFilled && (
                          <Chip
                            label="Заполнено вами"
                            size="small"
                            sx={{
                              backgroundColor: '#E6F4EA',
                              color: '#34C759',
                              borderRadius: 6,
                              fontSize: '0.7rem',
                              height: '20px',
                            }}
                          />
                        )}
                      </Box>
                    </Stack>
                  </CardContent>

                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Button
                      fullWidth
                      variant={action.variant}
                      color={action.color}
                      startIcon={action.icon}
                      onClick={action.action}
                      sx={{
                        borderRadius: 8,
                        py: 1,
                        textTransform: 'none',
                        fontSize: '0.9rem',
                        ...(userCanFill && {
                          backgroundColor: '#007AFF',
                          '&:hover': { backgroundColor: '#0056CC' },
                        }),
                        ...(userCanVerify && {
                          backgroundColor: '#34C759',
                          '&:hover': { backgroundColor: '#2AA44F' },
                        }),
                      }}
                    >
                      {action.label}
                    </Button>
                  </CardActions>
                </Card>
              );
            })}
          </Stack>
        )}

        {/* Статистика для административных ролей */}
        {(user?.role === UserRole.OWNER || 
          user?.role === UserRole.ADMIN || 
          user?.role === UserRole.SENIOR_SELLER) && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom color="#000" fontWeight={600}>
              Статистика
            </Typography>
            <Grid container spacing={1.5} sx={{ mt: 1 }}>
              {[
                { 
                  label: 'Всего', 
                  value: revisions.length,
                  color: '#007AFF',
                  bgColor: '#F0F8FF',
                },
                { 
                  label: 'Ожидают заполнения', 
                  value: revisions.filter(r => r.status === RevisionStatus.REQUESTED).length,
                  color: '#FF9500',
                  bgColor: '#FFF4E5',
                },
                { 
                  label: 'Ожидают проверки', 
                  value: revisions.filter(r => r.status === RevisionStatus.COMPLETED).length,
                  color: '#AF52DE',
                  bgColor: '#F5E6FF',
                },
                { 
                  label: 'Проверены', 
                  value: revisions.filter(r => r.status === RevisionStatus.VERIFIED).length,
                  color: '#34C759',
                  bgColor: '#E6F4EA',
                },
              ].map((stat, index) => (
                <Grid size={{ xs: 6 }} key={index}>
                  <Paper
                    sx={{
                      p: 2,
                      textAlign: 'center',
                      borderRadius: 8,
                      backgroundColor: stat.bgColor,
                      border: 'none',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography variant="h5" color={stat.color} fontWeight={600}>
                      {stat.value}
                    </Typography>
                    <Typography variant="caption" color="#8E8E93" sx={{ mt: 0.5 }}>
                      {stat.label}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default RevisionsPage;