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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Add as AddIcon,
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
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { revisionService } from '../../api/revisionService';
import {
  Revision,
  RevisionStatus,
  RevisionType,
  UserRole,
  getRevisionStatusText,
  getRevisionTypeText,
  getRevisionStatusColor,
  getTargetName as getTargetNameHelper,
} from '../../types';

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
  
  // Состояния для диалога отмены
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; revisionId: number | null }>({
    open: false,
    revisionId: null,
  });
  const [cancelComment, setCancelComment] = useState('');
  const [cancelling, setCancelling] = useState(false);
  
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
    
    // Нельзя заполнять отклоненные ревизии
    if (revision.status === RevisionStatus.REJECTED) {
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
      return user.cityName === revision.targetCity;
    } else if (revision.type === RevisionType.GENERAL) {
      return true;
    }
    
    return false;
  };

  // Может ли пользователь проверить ревизию
  const canUserVerifyRevision = (revision: Revision): boolean => {
    if (!user) return false;
    
    // Нельзя проверять отклоненные ревизии
    if (revision.status === RevisionStatus.REJECTED) {
      return false;
    }
    
    // Проверять может только тот, кто запросил ревизию
    return revision.requestedById === user.id && 
           revision.status === RevisionStatus.COMPLETED;
  };

  // Может ли пользователь отменить ревизию
  const canUserCancelRevision = (revision: Revision): boolean => {
    if (!user) return false;
    
    // Нельзя отменить уже проверенную или отклоненную ревизию
    if (revision.status === RevisionStatus.VERIFIED || 
        revision.status === RevisionStatus.REJECTED) {
      return false;
    }
    
    // Отменить может владелец ревизии или OWNER
    return revision.requestedById === user.id || user.role === UserRole.OWNER;
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
    color: 'primary' | 'secondary' | 'success' | 'error';
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
        action: () => navigate(`/revisions/${revision.id}/verify`),
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

  // Обработчик отмены ревизии
  const handleCancelRevision = (revisionId: number) => {
    setCancelDialog({ open: true, revisionId });
    setCancelComment('');
  };

  const handleConfirmCancel = async () => {
    if (!cancelDialog.revisionId) return;
    
    try {
      setCancelling(true);
      await revisionService.cancelRevision(cancelDialog.revisionId, cancelComment);
      
      // Обновляем список ревизий
      await loadRevisions();
      
      setCancelDialog({ open: false, revisionId: null });
      setCancelComment('');
    } catch (err: any) {
      setError(err.message || 'Ошибка при отмене ревизии');
      console.error('Error cancelling revision:', err);
    } finally {
      setCancelling(false);
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
          background: '#f5f3f6',
          py: 4,
        }}
      >
        <Container maxWidth="lg">
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
        py: 3,
        backgroundColor: '#f5f3f6',
      }}
    >
      <Container maxWidth="lg" sx={{ px: { xs: 1, sm: 3, md: 4 } }}>
        {/* Шапка */}
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12 }}>
              <Typography variant="h5" component="h1" gutterBottom color="#2a0f35" fontWeight={600}>
                Ревизии
              </Typography>
              <Typography variant="body2" color="#4c5454">
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
                      backgroundColor: '#674fb6',
                      '&:hover': { backgroundColor: '#483399' },
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
                    borderColor: '#d8d1e0',
                    color: '#674fb6',
                    '&:hover': {
                      borderColor: '#674fb6',
                      backgroundColor: 'rgba(103, 79, 182, 0.04)',
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
              backgroundColor: 'rgba(202, 14, 192, 0.08)',
              border: '1px solid rgba(202, 14, 192, 0.2)',
              color: '#ca0ec0',
              '& .MuiAlert-icon': {
                color: '#ca0ec0',
              }
            }}
            onClose={() => setError(null)}
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
            backgroundColor: '#ffffff',
            border: 'none',
            boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
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
                  backgroundColor: '#f5f3f6',
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
                      backgroundColor: '#f5f3f6',
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
                      backgroundColor: '#f5f3f6',
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
                color: '#674fb6',
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
          <Typography variant="subtitle1" color="#2a0f35" fontWeight={500}>
            Все ревизии
          </Typography>
          <Chip
            label={`${filteredRevisions.length}`}
            size="small"
            sx={{
              backgroundColor: '#f5f3f6',
              color: '#4c5454',
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
              backgroundColor: '#ffffff',
              border: 'none',
              boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
            }}
          >
            <Typography variant="body1" color="#4c5454">
              Ревизии не найдены
            </Typography>
            <Typography variant="body2" color="#4c5454" sx={{ mt: 0.5 }}>
              Попробуйте изменить параметры поиска
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={1.5}>
            {filteredRevisions.map((revision) => {
              const action = getRevisionAction(revision);
              const userCanFill = canUserFillRevision(revision);
              const userCanVerify = canUserVerifyRevision(revision);
              const userCanCancel = canUserCancelRevision(revision);
              const hasUserFilled = hasUserFilledRevision(revision);
              
              return (
                <Card
                  key={revision.id}
                  sx={{
                    borderRadius: 8,
                    backgroundColor: '#ffffff',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      boxShadow: '0 8px 24px rgba(106, 61, 122, 0.15)',
                    },
                    ...((userCanFill || userCanVerify) && {
                      border: '1px solid #674fb6',
                      backgroundColor: '#f9f8fc',
                    }),
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    {/* Заголовок */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box sx={{ flex: 1, mr: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          {getTypeIcon(revision.type)}
                          <Typography variant="subtitle2" color="#674fb6" fontWeight={500}>
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
                        <Typography variant="h6" color="#2a0f35" fontWeight={600} fontSize="1.1rem">
                          Ревизия #{revision.id}
                        </Typography>
                        
                        {(userCanFill || userCanVerify) && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                            <Typography variant="caption" color={userCanFill ? '#6d3f57' : '#3f1f4b'} fontWeight={500}>
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
                        <Typography variant="caption" color="#4c5454" display="block">
                          Запросил
                        </Typography>
                        <Typography variant="body2" color="#2a0f35" fontWeight={400}>
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
                        <Typography variant="body2" color="#2a0f35" fontWeight={400}>
                          {getTargetName(revision)}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="#4c5454" display="block">
                          Дата запроса
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <ScheduleIcon sx={{ fontSize: 14, color: '#4c5454' }} />
                          <Typography variant="body2" color="#2a0f35">
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
                              backgroundColor: '#f5f3f6',
                              color: '#56b8d1',
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
                              backgroundColor: 'rgba(63, 31, 75, 0.1)',
                              color: '#3f1f4b',
                              borderRadius: 6,
                              fontSize: '0.7rem',
                              height: '20px',
                            }}
                          />
                        )}
                      </Box>
                    </Stack>
                  </CardContent>

                  <CardActions sx={{ p: 2, pt: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button
                      variant={action.variant}
                      color={action.color}
                      startIcon={action.icon}
                      onClick={action.action}
                      sx={{
                        flex: 1,
                        borderRadius: 8,
                        py: 1,
                        textTransform: 'none',
                        fontSize: '0.9rem',
                        ...(userCanFill && {
                          backgroundColor: '#674fb6',
                          '&:hover': { backgroundColor: '#483399' },
                        }),
                        ...(userCanVerify && {
                          backgroundColor: '#3f1f4b',
                          '&:hover': { backgroundColor: '#2a0f35' },
                        }),
                      }}
                    >
                      {action.label}
                    </Button>
                    
                    {userCanCancel && (
                      <Tooltip title="Отменить ревизию">
                        <IconButton
                          onClick={() => handleCancelRevision(revision.id)}
                          sx={{
                            color: '#f44336',
                            border: '1px solid rgba(244, 67, 54, 0.5)',
                            borderRadius: '50%',
                            width: 40,
                            height: 40,
                            '&:hover': {
                              backgroundColor: 'rgba(244, 67, 54, 0.04)',
                              border: '1px solid #f44336',
                            },
                          }}
                        >
                          <CancelIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </CardActions>
                </Card>
              );
            })}
          </Stack>
        )}
      </Container>

      {/* Диалог отмены ревизии */}
      <Dialog
        open={cancelDialog.open}
        onClose={() => setCancelDialog({ open: false, revisionId: null })}
        PaperProps={{
          sx: {
            borderRadius: 4,
            maxWidth: 520,
            width: '100%',
            m: 2,
            boxShadow: '0 8px 24px rgba(106, 61, 122, 0.15)',
          }
        }}
      >
        <DialogTitle sx={{ p: 2.5, pb: 1 }}>
          <Typography variant="h6" color="#2a0f35" fontWeight={600} sx={{ mb: 0.5 }}>
            Отмена ревизии
          </Typography>
          <Typography variant="body2" color="#4c5454" sx={{ fontSize: '0.85rem' }}>
            Вы уверены, что хотите отменить эту ревизию?
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 2.5, pt: 2 }}>
          <Stack spacing={2.5}>
            <Box sx={{
              p: 2,
              backgroundColor: 'rgba(244, 67, 54, 0.04)',
              borderRadius: 4,
              border: '1px solid rgba(244, 67, 54, 0.2)',
            }}>
              <Typography variant="body2" color="#f44336" fontWeight={500}>
                Внимание!
              </Typography>
              <Typography variant="caption" color="#4c5454">
                После отмены все заполнения будут удалены. Это действие нельзя отменить.
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="#4c5454" sx={{ mb: 0.5, display: 'block', fontWeight: 600, fontSize: '0.75rem' }}>
                ПРИЧИНА ОТМЕНЫ (НЕОБЯЗАТЕЛЬНО)
              </Typography>
              <TextField
                fullWidth
                placeholder="Укажите причину отмены..."
                value={cancelComment}
                onChange={(e) => setCancelComment(e.target.value)}
                multiline
                rows={3}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 4,
                    backgroundColor: '#f8f7fa',
                  },
                }}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}>
          <Button
            onClick={() => setCancelDialog({ open: false, revisionId: null })}
            sx={{
              borderRadius: 4,
              color: '#4c5454',
              px: 3,
              py: 1,
              textTransform: 'none',
              fontSize: '0.95rem',
              fontWeight: 500,
            }}
          >
            Назад
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmCancel}
            disabled={cancelling}
            sx={{
              borderRadius: 4,
              backgroundColor: '#f44336',
              '&:hover': { backgroundColor: '#d32f2f' },
              px: 3,
              py: 1,
              textTransform: 'none',
              fontSize: '0.95rem',
              fontWeight: 500,
            }}
          >
            {cancelling ? 'Отмена...' : 'Отменить ревизию'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RevisionsPage;