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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
} from '../types';
import { userService } from '../api/userService';

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
    
    // Обогащаем данные о запросивших
    const enrichedRevisions = await Promise.all(
      revisionsData.map(async (revision) => {
        try {
          // Если имя не полное, пытаемся получить данные пользователя
          if (revision.requestedByName?.startsWith('Пользователь ')) {
            try {
              const userData = await userService.getUserById(revision.requestedById);
              return {
                ...revision,
                requestedByName: userData.fullName || userData.username || revision.requestedByName
              };
            } catch (error) {
              console.error('Error fetching user:', error);
            }
          }
          return revision;
        } catch (error) {
          console.error('Error enriching revision:', error);
          return revision;
        }
      })
    );
    
    setRevisions(enrichedRevisions);
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
      revision.targetUserName?.toLowerCase().includes(searchLower) ||
      revision.targetGroupName?.toLowerCase().includes(searchLower) ||
      revision.targetClusterName?.toLowerCase().includes(searchLower) ||
      revision.targetCity?.toLowerCase().includes(searchLower);
    
    const matchesStatus = statusFilter === 'all' || revision.status === statusFilter;
    const matchesType = typeFilter === 'all' || revision.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Может ли пользователь запрашивать ревизии
  const canRequestRevision = user?.role !== UserRole.MENTOR;

  // Может ли пользователь проверять ревизии
  const canVerifyRevision = user?.role !== UserRole.MENTOR;

  // Может ли пользователь заполнять ревизию
  const canFillRevision = (revision: Revision): boolean => {
    if (!user) return false;
    
    if (user.role === UserRole.OWNER) return false;
    
    switch (revision.type) {
      case RevisionType.USER:
        return revision.targetUserId === user.id;
      case RevisionType.GROUP:
        return user.groupId === revision.targetGroupId;
      case RevisionType.CLUSTER:
        return user.clusterId === revision.targetClusterId;
      case RevisionType.CITY:
        return user.city === revision.targetCity;
      case RevisionType.GENERAL:
        return user.role === UserRole.ADMIN || 
               user.role === UserRole.SENIOR_SELLER || 
               user.role === UserRole.MENTOR || 
               user.role === UserRole.SELLER || 
               user.role === UserRole.ACCOUNTANT;
      default:
        return false;
    }
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

  // Функция для получения отображаемой цели
  const getTargetDisplay = (revision: Revision): string => {
    if (revision.targetUserName) return revision.targetUserName;
    if (revision.targetGroupName) return revision.targetGroupName;
    if (revision.targetClusterName) return revision.targetClusterName;
    if (revision.targetCity) return revision.targetCity;
    if (revision.type === RevisionType.GENERAL) return 'Все пользователи';
    return 'Не указано';
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
              placeholder="Поиск по ID или имени..."
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
              <TableCell sx={{ fontWeight: 'bold', color: '#2a0f35' }}>Статус</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#2a0f35' }}>Дата запроса</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#2a0f35' }}>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRevisions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
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
                    <Typography variant="body2">
                      {revision.requestedByName}
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
                      
                      {revision.status === RevisionStatus.REQUESTED && canFillRevision(revision) && (
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
                      
                      {revision.status === RevisionStatus.COMPLETED && canVerifyRevision && (
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