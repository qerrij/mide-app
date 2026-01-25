import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  CheckCircle as VerifyIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
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
  
  // Функция для получения имени цели ревизии (теперь использует данные из самой ревизии)
  const getTargetName = (revision: Revision): string => {
    return getTargetNameHelper(revision);
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

  // Может ли пользователь запрашивать ревизии
  const canRequestRevision = user?.role && [UserRole.OWNER, UserRole.ADMIN, UserRole.SENIOR_SELLER].includes(user.role);

  // Может ли пользователь проверять конкретную ревизию
  const canVerifyRevision = (revision: Revision): boolean => {
    if (!user) return false;
    // Проверять может только тот, кто запросил ревизию
    return revision.requestedById === user.id && 
           revision.status === RevisionStatus.COMPLETED;
  };

  // Может ли пользователь заполнять ревизию
  const canFillRevision = (revision: Revision): boolean => {
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
    const hasUserFilling = revision.fillings?.some(
      f => f.userId === user.id && f.isCompleted
    );
    
    // Если уже заполнил - нельзя заполнять снова
    if (hasUserFilling) {
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

  // Проверяет, заполнил ли пользователь ревизию
  const hasUserFilledRevision = (revision: Revision): boolean => {
    if (!user) return false;
    return revision.fillings?.some(f => f.userId === user.id && f.isCompleted) || false;
  };

  // Обработчик создания новой ревизии
  const handleRequestRevision = () => {
    navigate('/revisions/request');
  };

  // Обработчик просмотра ревизии
  const handleViewRevision = (revisionId: number) => {
    navigate(`/revisions/${revisionId}`);
  };

  // Обработчик заполнения ревизии
  const handleFillRevision = (revisionId: number) => {
    navigate(`/revisions/${revisionId}/fill`);
  };

  // Обработчик проверки ревизии
  const handleVerifyRevision = (revisionId: number) => {
    navigate(`/revisions/${revisionId}/verify`);
  };

  // Форматирование даты
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="h4" component="h1" gutterBottom color="#2a0f35">
              Ревизии
            </Typography>
            <Typography variant="subtitle1" color="#4c5454">
              Полный пересчет товаров и сверка остатков
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }} sx={{ textAlign: { md: 'right' } }}>
            {canRequestRevision && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleRequestRevision}
                sx={{
                  backgroundColor: '#2196f3',
                  '&:hover': { backgroundColor: '#1976d2' },
                  mr: 1,
                }}
              >
                Запросить ревизию
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadRevisions}
              sx={{
                borderColor: '#2196f3',
                color: '#2196f3',
                '&:hover': {
                  borderColor: '#1976d2',
                  backgroundColor: 'rgba(33, 150, 243, 0.04)',
                },
              }}
            >
              Обновить
            </Button>
          </Grid>
        </Grid>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Фильтры */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              placeholder="Поиск по ID, имени или комментарию..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Статус</InputLabel>
              <Select
                value={statusFilter}
                label="Статус"
                onChange={(e) => setStatusFilter(e.target.value as RevisionStatus | 'all')}
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
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Тип</InputLabel>
              <Select
                value={typeFilter}
                label="Тип"
                onChange={(e) => setTypeFilter(e.target.value as RevisionType | 'all')}
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
          <Grid size={{ xs: 12, md: 2 }} sx={{ textAlign: 'right' }}>
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setTypeFilter('all');
              }}
            >
              Сбросить
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Таблица ревизий */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f3f6' }}>
              <TableCell sx={{ fontWeight: 'bold', color: '#2a0f35' }}>ID</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#2a0f35' }}>Тип</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#2a0f35' }}>Запросил</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#2a0f35' }}>Назначение</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#2a0f35' }}>Статус</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#2a0f35' }}>Дата запроса</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#2a0f35' }}>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRevisions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  <Typography variant="body1" color="#4c5454">
                    Ревизии не найдены
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredRevisions.map((revision) => (
                <TableRow key={revision.id} hover>
                  <TableCell>#{revision.id}</TableCell>
                  <TableCell>
                    <Chip
                      label={getRevisionTypeText(revision.type)}
                      size="small"
                      sx={{ backgroundColor: '#e3f2fd', color: '#1976d2' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">
                        {revision.requestedByName}
                      </Typography>
                      {revision.comment && (
                        <Typography variant="caption" color="text.secondary">
                          {revision.comment}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {getTargetName(revision)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getRevisionStatusText(revision.status)}
                      size="small"
                      sx={{
                        backgroundColor: `${getRevisionStatusColor(revision.status)}15`,
                        color: getRevisionStatusColor(revision.status),
                        fontWeight: 500,
                      }}
                    />
                    {revision.isGroupRevision && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        {revision.totalFilled || 0}/{revision.totalUsers || 0}
                      </Typography>
                    )}
                    {hasUserFilledRevision(revision) && (
                      <Chip
                        label="Заполнено вами"
                        size="small"
                        sx={{
                          mt: 0.5,
                          backgroundColor: '#4caf5015',
                          color: '#4caf50',
                          fontSize: '0.7rem'
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell>{formatDate(revision.requestedAt)}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="Просмотр">
                        <IconButton
                          size="small"
                          onClick={() => handleViewRevision(revision.id)}
                          sx={{ color: '#2196f3' }}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      
                      {canFillRevision(revision) && (
                        <Tooltip title="Заполнить ревизию">
                          <IconButton
                            size="small"
                            onClick={() => handleFillRevision(revision.id)}
                            sx={{ color: '#9c27b0' }}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      
                      {canVerifyRevision(revision) && (
                        <Tooltip title="Проверить ревизию">
                          <IconButton
                            size="small"
                            onClick={() => handleVerifyRevision(revision.id)}
                            sx={{ color: '#4caf50' }}
                          >
                            <VerifyIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Статистика для административных ролей */}
      {(user?.role === UserRole.OWNER || 
        user?.role === UserRole.ADMIN || 
        user?.role === UserRole.SENIOR_SELLER) && (
        <Box sx={{ mt: 6 }}>
          <Typography variant="h5" gutterBottom color="#3f1f4b">
            Статистика по ревизиям
          </Typography>
          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Paper
                sx={{
                  p: 3,
                  textAlign: 'center',
                  backgroundColor: '#2196f310',
                  border: '1px solid #2196f330',
                }}
              >
                <Typography variant="h4" color="#2196f3">
                  {revisions.length}
                </Typography>
                <Typography variant="body2" color="#4c5454">
                  Всего ревизий
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Paper
                sx={{
                  p: 3,
                  textAlign: 'center',
                  backgroundColor: '#ff980010',
                  border: '1px solid #ff980030',
                }}
              >
                <Typography variant="h4" color="#ff9800">
                  {revisions.filter(r => r.status === RevisionStatus.REQUESTED).length}
                </Typography>
                <Typography variant="body2" color="#4c5454">
                  Ожидают заполнения
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Paper
                sx={{
                  p: 3,
                  textAlign: 'center',
                  backgroundColor: '#9c27b010',
                  border: '1px solid #9c27b030',
                }}
              >
                <Typography variant="h4" color="#9c27b0">
                  {revisions.filter(r => r.status === RevisionStatus.COMPLETED).length}
                </Typography>
                <Typography variant="body2" color="#4c5454">
                  Ожидают проверки
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Paper
                sx={{
                  p: 3,
                  textAlign: 'center',
                  backgroundColor: '#4caf5010',
                  border: '1px solid #4caf5030',
                }}
              >
                <Typography variant="h4" color="#4caf50">
                  {revisions.filter(r => r.status === RevisionStatus.VERIFIED).length}
                </Typography>
                <Typography variant="body2" color="#4c5454">
                  Проверены
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}
    </Container>
  );
};

export default RevisionsPage;