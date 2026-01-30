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

  // Определяет, какое действие доступно для ревизии
  const getRevisionAction = (revision: Revision): { 
    label: string; 
    action: () => void;
    variant: 'contained' | 'outlined';
    color: 'primary' | 'secondary' | 'success';
  } => {
    if (canUserFillRevision(revision)) {
      return {
        label: 'Заполнить ревизию',
        action: () => navigate(`/revisions/${revision.id}/fill`),
        variant: 'contained' as const,
        color: 'primary' as const
      };
    } else if (canUserVerifyRevision(revision)) {
      return {
        label: 'Проверить ревизию',
        action: () => navigate(`/revisions/${revision.id}`),
        variant: 'contained' as const,
        color: 'success' as const
      };
    } else {
      return {
        label: 'Подробнее',
        action: () => navigate(`/revisions/${revision.id}`),
        variant: 'outlined' as const,
        color: 'primary' as const
      };
    }
  };

  // Фильтрация ревизий
  const filteredRevisions = revisions.filter(revision => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      revision.id.toString().includes(searchTerm) ||
      revision.requestedByName?.toLowerCase().includes(searchLower) ||
      getTargetName(revision).toLowerCase().includes(searchLower) ||
      (revision.comment && revision.comment.toLowerCase().includes(searchLower));
    
    const matchesStatus = statusFilter === 'all' || revision.status === statusFilter;
    const matchesType = typeFilter === 'all' || revision.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

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
          background: 'linear-gradient(135deg, #f9f7fa 0%, #f0edf2 100%)',
          py: 4,
          px: 2,
        }}
      >
        <Container maxWidth="md">
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <CircularProgress sx={{ color: '#674fb6' }} />
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f9f7fa 0%, #f0edf2 100%)',
        py: 4,
        px: 2,
      }}
    >
      <Container maxWidth="md">
        {/* Шапка */}
        <Box sx={{ mb: 4 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12 }}>
              <Typography variant="h4" component="h1" gutterBottom color="#2a0f35" fontWeight={600}>
                Ревизии
              </Typography>
              <Typography variant="subtitle1" color="#4c5454">
                Полный пересчет товаров и сверка остатков
              </Typography>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
                {canRequestRevision && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleRequestRevision}
                    fullWidth
                    sx={{
                      borderRadius: 8,
                      backgroundColor: '#674fb6',
                      '&:hover': { backgroundColor: '#483399' },
                      py: 1.5,
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
                    borderColor: '#674fb6',
                    color: '#674fb6',
                    '&:hover': {
                      borderColor: '#483399',
                      backgroundColor: 'rgba(103, 79, 182, 0.04)',
                    },
                    py: 1.5,
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
              mb: 3, 
              borderRadius: 8,
              backgroundColor: 'rgba(202, 14, 192, 0.1)',
            }}
          >
            {error}
          </Alert>
        )}

        {/* Фильтры */}
        <Paper 
          sx={{ 
            p: 3, 
            mb: 3, 
            borderRadius: 8,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(103, 79, 182, 0.1)',
          }}
        >
          <Stack spacing={3}>
            <TextField
              fullWidth
              placeholder="Поиск ревизий..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#674fb6' }} />
                  </InputAdornment>
                ),
                sx: { borderRadius: 8 }
              }}
            />
            
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: '#4c5454' }}>Статус</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Статус"
                    onChange={(e) => setStatusFilter(e.target.value as RevisionStatus | 'all')}
                    sx={{ borderRadius: 8 }}
                  >
                    <MenuItem value="all">Все</MenuItem>
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
                  <InputLabel sx={{ color: '#4c5454' }}>Тип</InputLabel>
                  <Select
                    value={typeFilter}
                    label="Тип"
                    onChange={(e) => setTypeFilter(e.target.value as RevisionType | 'all')}
                    sx={{ borderRadius: 8 }}
                  >
                    <MenuItem value="all">Все</MenuItem>
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
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setTypeFilter('all');
              }}
              sx={{
                borderRadius: 8,
                borderColor: '#56b8d1',
                color: '#56b8d1',
                '&:hover': {
                  borderColor: '#2a9ab3',
                  backgroundColor: 'rgba(86, 184, 209, 0.04)',
                },
              }}
            >
              Сбросить фильтры
            </Button>
          </Stack>
        </Paper>

        {/* Счетчик ревизий */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" color="#3f1f4b" fontWeight={500}>
            Все ревизии
          </Typography>
          <Chip
            label={`${filteredRevisions.length} из ${revisions.length}`}
            size="small"
            sx={{
              backgroundColor: '#674fb6',
              color: 'white',
              fontWeight: 500,
              borderRadius: 8,
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
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(103, 79, 182, 0.1)',
            }}
          >
            <Typography variant="body1" color="#4c5454">
              Ревизии не найдены
            </Typography>
            <Typography variant="body2" color="#4c5454" sx={{ mt: 1 }}>
              Попробуйте изменить параметры поиска
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={2}>
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
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(103, 79, 182, 0.15)',
                    boxShadow: '0 4px 12px rgba(103, 79, 182, 0.08)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 25px rgba(103, 79, 182, 0.12)',
                      borderColor: 'rgba(103, 79, 182, 0.25)',
                    },
                    ...(userCanFill && {
                      borderLeft: '4px solid #674fb6',
                      backgroundColor: 'rgba(103, 79, 182, 0.02)',
                    }),
                    ...(userCanVerify && {
                      borderLeft: '4px solid #4caf50',
                      backgroundColor: 'rgba(76, 175, 80, 0.02)',
                    }),
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    {/* Заголовок */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" color="#2a0f35" fontWeight={600}>
                          Ревизия #{revision.id}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                          {getTypeIcon(revision.type)}
                          <Typography variant="body2" color="#674fb6" fontWeight={500}>
                            {getRevisionTypeText(revision.type)}
                          </Typography>
                          {(userCanFill || userCanVerify) && (
                            <Chip
                              label={userCanFill ? "Нужно заполнить" : "Нужно проверить"}
                              size="small"
                              sx={{
                                backgroundColor: userCanFill ? 'rgba(103, 79, 182, 0.1)' : 'rgba(76, 175, 80, 0.1)',
                                color: userCanFill ? '#674fb6' : '#4caf50',
                                fontWeight: 500,
                                borderRadius: 6,
                                fontSize: '0.7rem',
                                height: '20px',
                              }}
                            />
                          )}
                        </Stack>
                      </Box>
                      <Chip
                        label={getRevisionStatusText(revision.status)}
                        size="small"
                        sx={{
                          backgroundColor: `${getRevisionStatusColor(revision.status)}15`,
                          color: getRevisionStatusColor(revision.status),
                          fontWeight: 500,
                          borderRadius: 8,
                          fontSize: '0.75rem',
                        }}
                      />
                    </Box>

                    <Divider sx={{ my: 2, opacity: 0.3 }} />

                    {/* Информация */}
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="caption" color="#4c5454" display="block">
                          Запросил
                        </Typography>
                        <Typography variant="body2" color="#2a0f35" fontWeight={500}>
                          {revision.requestedByName}
                        </Typography>
                        {revision.comment && (
                          <Typography variant="caption" color="#4c5454" display="block" sx={{ mt: 0.5 }}>
                            {revision.comment}
                          </Typography>
                        )}
                      </Box>

                      <Box>
                        <Typography variant="caption" color="#4c5454" display="block">
                          Назначение
                        </Typography>
                        <Typography variant="body2" color="#2a0f35" fontWeight={500}>
                          {getTargetName(revision)}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="#4c5454" display="block">
                          Дата запроса
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <ScheduleIcon sx={{ fontSize: 16, color: '#56b8d1' }} />
                          <Typography variant="body2" color="#2a0f35">
                            {formatDate(revision.requestedAt)} в {formatTime(revision.requestedAt)}
                          </Typography>
                        </Stack>
                      </Box>

                      {/* Дополнительная информация */}
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {revision.isGroupRevision && (
                          <Chip
                            icon={<GroupIcon sx={{ fontSize: 14 }} />}
                            label={`${revision.totalFilled || 0}/${revision.totalUsers || 0}`}
                            size="small"
                            sx={{
                              backgroundColor: 'rgba(86, 184, 209, 0.1)',
                              color: '#2a9ab3',
                              borderRadius: 6,
                              fontSize: '0.75rem',
                            }}
                          />
                        )}
                        {hasUserFilled && (
                          <Chip
                            label="Заполнено вами"
                            size="small"
                            sx={{
                              backgroundColor: 'rgba(76, 175, 80, 0.1)',
                              color: '#4caf50',
                              borderRadius: 6,
                              fontSize: '0.75rem',
                            }}
                          />
                        )}
                      </Box>
                    </Stack>
                  </CardContent>

                  <CardActions sx={{ p: 3, pt: 0 }}>
                    <Button
                      fullWidth
                      variant={action.variant}
                      color={action.color}
                      onClick={action.action}
                      sx={{
                        borderRadius: 8,
                        py: 1.5,
                        ...(userCanFill && {
                          backgroundColor: '#674fb6',
                          '&:hover': { backgroundColor: '#483399' },
                        }),
                        ...(userCanVerify && {
                          backgroundColor: '#4caf50',
                          '&:hover': { backgroundColor: '#388e3c' },
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
          <Box sx={{ mt: 6 }}>
            <Typography variant="h5" gutterBottom color="#3f1f4b" fontWeight={600}>
              Статистика
            </Typography>
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid size={{ xs: 6 }}>
                <Paper
                  sx={{
                    p: 2.5,
                    textAlign: 'center',
                    borderRadius: 8,
                    backgroundColor: 'rgba(103, 79, 182, 0.1)',
                    border: '1px solid #674fb630',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="h4" color="#674fb6" fontWeight={600}>
                    {revisions.length}
                  </Typography>
                  <Typography variant="caption" color="#4c5454" sx={{ mt: 0.5 }}>
                    Всего ревизий
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Paper
                  sx={{
                    p: 2.5,
                    textAlign: 'center',
                    borderRadius: 8,
                    backgroundColor: 'rgba(255, 152, 0, 0.1)',
                    border: '1px solid #ff980030',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="h4" color="#ff9800" fontWeight={600}>
                    {revisions.filter(r => r.status === RevisionStatus.REQUESTED).length}
                  </Typography>
                  <Typography variant="caption" color="#4c5454" sx={{ mt: 0.5 }}>
                    Ожидают заполнения
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Paper
                  sx={{
                    p: 2.5,
                    textAlign: 'center',
                    borderRadius: 8,
                    backgroundColor: 'rgba(156, 39, 176, 0.1)',
                    border: '1px solid #9c27b030',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="h4" color="#9c27b0" fontWeight={600}>
                    {revisions.filter(r => r.status === RevisionStatus.COMPLETED).length}
                  </Typography>
                  <Typography variant="caption" color="#4c5454" sx={{ mt: 0.5 }}>
                    Ожидают проверки
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Paper
                  sx={{
                    p: 2.5,
                    textAlign: 'center',
                    borderRadius: 8,
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    border: '1px solid #4caf5030',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="h4" color="#4caf50" fontWeight={600}>
                    {revisions.filter(r => r.status === RevisionStatus.VERIFIED).length}
                  </Typography>
                  <Typography variant="caption" color="#4c5454" sx={{ mt: 0.5 }}>
                    Проверены
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default RevisionsPage;