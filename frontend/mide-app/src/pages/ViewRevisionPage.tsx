import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Card,
  CardContent,
  Stack,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  Avatar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from '@mui/material';
import {
  ArrowBack,
  CheckCircle,
  PhotoCamera,
  ExpandMore,
  ArrowUpward,
  ArrowDownward,
  Person,
  Group,
  LocationCity,
  Home,
  Language,
  Visibility,
  People,
  Add,
  Remove,
  TrendingUp,
  TrendingDown,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { revisionService } from '../api/revisionService';
import {
  Revision,
  RevisionStatus,
  UserRole,
  getRevisionStatusText,
  getRevisionTypeText,
  getRevisionStatusColor,
  RevisionFilling,
  RevisionSummaryResponse,
  ProductSummary,
  UserDiscrepancySummary,
  ProductDiscrepancySummary,
  isGroupRevision,
  getTargetName,
  canVerifyRevision as canVerifyRevisionHelper,
} from '../types';

const ViewRevisionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedFilling, setSelectedFilling] = useState<RevisionFilling | null>(null);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [revisionSummary, setRevisionSummary] = useState<RevisionSummaryResponse | null>(null);
  
  // Загрузка данных ревизии
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!id) {
          throw new Error('ID ревизии не указан');
        }
        
        const revisionId = parseInt(id);
        
        // Для владельца ревизии загружаем полную сводку
        if (user?.role !== UserRole.MENTOR) {
          try {
            const summary = await revisionService.getRevisionSummary(revisionId);
            setRevisionSummary(summary);
            
            // Устанавливаем первое заполнение по умолчанию
            if (summary.revision.fillings.length > 0) {
              setSelectedFilling(summary.revision.fillings[0]);
            }
          } catch (error: any) {
            // Если нет прав на сводку, загружаем обычную ревизию
            console.log('No access to summary, loading basic revision');
            await loadBasicRevision(revisionId);
          }
        } else {
          // Для ментора загружаем обычную ревизию
          await loadBasicRevision(revisionId);
        }
        
      } catch (err: any) {
        setError(err.message || 'Ошибка при загрузке ревизии');
        console.error('Error loading revision:', err);
      } finally {
        setLoading(false);
      }
    };
    
    const loadBasicRevision = async (revisionId: number) => {
      const revision = await revisionService.getRevisionById(revisionId);
      // Создаем минимальную сводку
      setRevisionSummary({
        revision,
        productSummary: [],
        userDiscrepancies: [],
        productDiscrepancies: [],
        totalFilled: revision.fillings?.filter(f => f.isCompleted).length || 0,
        totalUsers: revision.totalUsers || 1,
      });
      
      // Получаем свое заполнение
      const myFilling = await revisionService.getMyFilling(revisionId);
      if (myFilling) {
        setSelectedFilling(myFilling);
      }
    };
    
    loadData();
  }, [id, user]);

  // Определяем, является ли текущий пользователь владельцем ревизии
  const isOwner = revisionSummary?.revision.requestedById === user?.id;
  
  // Проверяем, может ли пользователь проверять эту ревизию
  const canVerifyRevision = revisionSummary && user?.id 
  ? canVerifyRevisionHelper(revisionSummary.revision, user.id) 
  : false;
  
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

  // Просмотр фото
  const handleViewPhoto = (index: number) => {
    setSelectedPhotoIndex(index);
    setShowPhotoDialog(true);
  };

  // Функция для отображения фото
  const renderPhoto = (photoPath: string, index: number) => {
    const photoUrl = revisionService.getPhotoUrl(photoPath);
    
    return (
      <Grid size={{ xs: 6, sm: 4, md: 3 }} key={index}>
        <Card>
          <CardContent sx={{ p: 1 }}>
            <Box
              sx={{
                height: 120,
                backgroundImage: `url(${photoUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: 1,
                mb: 1,
                cursor: 'pointer',
              }}
              onClick={() => handleViewPhoto(index)}
            />
            <Typography variant="caption" align="center" display="block">
              Фото {index + 1}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    );
  };

  // Функция для получения иконки типа ревизии
  const getRevisionTypeIcon = (type: string) => {
    switch (type) {
      case 'USER': return <Person />;
      case 'GROUP': return <Group />;
      case 'CLUSTER': return <Home />;
      case 'CITY': return <LocationCity />;
      case 'GENERAL': return <Language />;
      default: return <Language />;
    }
  };

  // Получение общего расхождения по всей ревизии
  const getTotalDiscrepancy = () => {
    if (!revisionSummary) return { total: 0, positive: 0, negative: 0 };
    
    const userDiscrepancies = revisionSummary.userDiscrepancies;
    
    const total = userDiscrepancies.reduce((sum, ud) => sum + ud.totalDiscrepancy, 0);
    const positive = userDiscrepancies.reduce((sum, ud) => sum + ud.positiveTotal, 0);
    const negative = userDiscrepancies.reduce((sum, ud) => sum + ud.negativeTotal, 0);
    
    return { total, positive, negative };
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

  if (!revisionSummary) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          Ревизия не найдена
        </Alert>
      </Container>
    );
  }

  const revision = revisionSummary.revision;
  const isGroupRev = isGroupRevision(revision.type);
  const totalDiscrepancy = getTotalDiscrepancy();

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Шапка */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/revisions')}
          sx={{ mb: 2 }}
        >
          Назад к ревизиям
        </Button>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom color="#2a0f35">
              Ревизия #{revision.id}
              {!isOwner && (
                <Typography variant="subtitle1" color="#4c5454" sx={{ mt: 1 }}>
                  {isGroupRev ? 'Ваши данные' : 'Просмотр ревизии'}
                </Typography>
              )}
            </Typography>
            
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Chip
                icon={getRevisionTypeIcon(revision.type)}
                label={getRevisionTypeText(revision.type)}
                sx={{ backgroundColor: '#e3f2fd', color: '#1976d2' }}
              />
              <Chip
                label={getRevisionStatusText(revision.status)}
                sx={{
                  backgroundColor: `${getRevisionStatusColor(revision.status)}15`,
                  color: getRevisionStatusColor(revision.status),
                  fontWeight: 500,
                }}
              />
              
              {isOwner && isGroupRev && (
                <Chip
                  icon={<People />}
                  label={`${revisionSummary.totalFilled}/${revisionSummary.totalUsers} заполнили`}
                  sx={{ backgroundColor: '#e3f2fd', color: '#1976d2' }}
                />
              )}
              
              {revision.status === RevisionStatus.VERIFIED && isOwner && (
                <Chip
                  icon={totalDiscrepancy.total >= 0 ? <TrendingUp /> : <TrendingDown />}
                  label={`${totalDiscrepancy.total >= 0 ? '+' : ''}${totalDiscrepancy.total}`}
                  sx={{
                    backgroundColor: totalDiscrepancy.total >= 0 ? '#2196f315' : '#f4433615',
                    color: totalDiscrepancy.total >= 0 ? '#2196f3' : '#f44336',
                    fontWeight: 600,
                  }}
                />
              )}
            </Stack>
          </Box>
          
          {canVerifyRevision && (
            <Button
              variant="contained"
              startIcon={<CheckCircle />}
              onClick={() => navigate(`/revisions/${revision.id}/verify`)}
              sx={{
                backgroundColor: '#4caf50',
                '&:hover': { backgroundColor: '#388e3c' },
              }}
            >
              Проверить ревизию
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Информационная карточка */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="subtitle1" gutterBottom color="#2a0f35" sx={{ fontWeight: 600 }}>
              Основная информация
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Typography variant="body2" sx={{ color: '#4c5454', minWidth: 140 }}>
                  Запросил:
                </Typography>
                <Typography variant="body2">
                  {revision.requestedByName}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Typography variant="body2" sx={{ color: '#4c5454', minWidth: 140 }}>
                  Дата запроса:
                </Typography>
                <Typography variant="body2">
                  {formatDate(revision.requestedAt)}
                </Typography>
              </Box>
              
              {revision.completedAt && (
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Typography variant="body2" sx={{ color: '#4c5454', minWidth: 140 }}>
                    Дата заполнения:
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(revision.completedAt)}
                  </Typography>
                </Box>
              )}
              
              {revision.verifiedAt && (
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Typography variant="body2" sx={{ color: '#4c5454', minWidth: 140 }}>
                    Дата проверки:
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(revision.verifiedAt)}
                  </Typography>
                </Box>
              )}
              
              {revision.verifiedByName && (
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Typography variant="body2" sx={{ color: '#4c5454', minWidth: 140 }}>
                    Проверил:
                  </Typography>
                  <Typography variant="body2">
                    {revision.verifiedByName}
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>
          
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="subtitle1" gutterBottom color="#2a0f35" sx={{ fontWeight: 600 }}>
              {getRevisionTypeText(revision.type)}
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Typography variant="body2" sx={{ color: '#4c5454', minWidth: 140 }}>
                  Цель:
                </Typography>
                <Typography variant="body2">
                  {getTargetName(revision)}
                </Typography>
              </Box>
              
              {revision.comment && (
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Typography variant="body2" sx={{ color: '#4c5454', minWidth: 140 }}>
                    Комментарий:
                  </Typography>
                  <Typography variant="body2">
                    {revision.comment}
                  </Typography>
                </Box>
              )}
              
              {revision.verificationComment && (
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Typography variant="body2" sx={{ color: '#4c5454', minWidth: 140 }}>
                    Комментарий проверки:
                  </Typography>
                  <Typography variant="body2">
                    {revision.verificationComment}
                  </Typography>
                </Box>
              )}
              
              {/* Общее расхождение */}
              {revision.status === RevisionStatus.VERIFIED && isOwner && (
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <Typography variant="body2" sx={{ color: '#4c5454', minWidth: 140 }}>
                    Общее расхождение:
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Chip
                      icon={<Add />}
                      label={`+${totalDiscrepancy.positive}`}
                      size="small"
                      sx={{ backgroundColor: '#2196f315', color: '#2196f3' }}
                    />
                    <Chip
                      icon={<Remove />}
                      label={`-${totalDiscrepancy.negative}`}
                      size="small"
                      sx={{ backgroundColor: '#f4433615', color: '#f44336' }}
                    />
                    <Chip
                      label={`Итого: ${totalDiscrepancy.total >= 0 ? '+' : ''}${totalDiscrepancy.total}`}
                      size="small"
                      sx={{
                        backgroundColor: totalDiscrepancy.total >= 0 ? '#2196f315' : '#f4433615',
                        color: totalDiscrepancy.total >= 0 ? '#2196f3' : '#f44336',
                        fontWeight: 600,
                      }}
                    />
                  </Stack>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Блок выбора заполнения для владельца групповой ревизии */}
      {isOwner && isGroupRev && revision.fillings.length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <People sx={{ color: '#2196f3' }} />
            <Typography variant="subtitle1" sx={{ color: '#2a0f35' }}>
              Заполнения пользователей:
            </Typography>
            
            <FormControl sx={{ minWidth: 200, ml: 2 }}>
              <InputLabel>Выберите пользователя</InputLabel>
              <Select
                value={selectedFilling?.id || ''}
                label="Выберите пользователя"
                onChange={(e) => {
                  const fillingId = Number(e.target.value);
                  const filling = revision.fillings.find(f => f.id === fillingId);
                  setSelectedFilling(filling || null);
                }}
              >
                {revision.fillings.map((filling) => (
                  <MenuItem key={filling.id} value={filling.id}>
                    {filling.userName || `Пользователь ${filling.userId}`}
                    {filling.isCompleted ? ' ✓' : ' ⏳'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Chip
              label={`Заполнили: ${revision.fillings.filter(f => f.isCompleted).length}/${revision.fillings.length}`}
              sx={{ backgroundColor: '#e3f2fd', color: '#1976d2' }}
            />
          </Box>
        </Paper>
      )}

      {/* Вкладки */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={isOwner && isGroupRev ? "Выбранное заполнение" : "Товары"} />
          {isOwner && isGroupRev && <Tab label="Все заполнения" />}
          {revision.status === RevisionStatus.VERIFIED && isOwner && <Tab label="Расхождения" />}
          {isOwner && <Tab label="Общая статистика" />}
          <Tab label="Фотографии" />
        </Tabs>
        
        <Box sx={{ p: 3 }}>
          {/* Вкладка выбранного заполнения/товаров */}
          {activeTab === 0 && (
            <>
              {selectedFilling ? (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" color="#2a0f35">
                      {isOwner && isGroupRev 
                        ? `Заполнение пользователя: ${selectedFilling.userName}`
                        : 'Ваши товары'}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Chip
                        label={`${selectedFilling.items.length} товаров`}
                        sx={{ backgroundColor: '#e3f2fd', color: '#1976d2' }}
                      />
                      {selectedFilling.photos.length > 0 && (
                        <Chip
                          icon={<PhotoCamera />}
                          label={`${selectedFilling.photos.length} фото`}
                          sx={{ backgroundColor: '#e8f5e9', color: '#4caf50' }}
                        />
                      )}
                    </Stack>
                  </Box>
                  
                  {selectedFilling.items.length === 0 ? (
                    <Alert severity="info">
                      Нет данных о товарах
                    </Alert>
                  ) : (
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow sx={{ backgroundColor: '#f5f3f6' }}>
                            <TableCell sx={{ fontWeight: 'bold', color: '#2a0f35' }}>Товар</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', color: '#2a0f35' }}>Артикул</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', color: '#2a0f35' }}>Категория</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', color: '#2a0f35' }}>Количество</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedFilling.items.map((item, index) => (
                            <TableRow key={index} hover>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {item.productName || `Товар ${item.productId}`}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="#4c5454">
                                  {item.productSku || `SKU${item.productId}`}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {item.categoryName || 'Категория'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {item.quantity} шт.
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </>
              ) : (
                <Alert severity="info">
                  {isGroupRev ? 'Нет заполнений' : 'Нет данных о товарах'}
                </Alert>
              )}
            </>
          )}
          
          {/* Вкладка всех заполнений (только для владельца групповой ревизии) */}
          {activeTab === 1 && isOwner && isGroupRev && (
            <>
              <Typography variant="h6" gutterBottom color="#2a0f35">
                Все заполнения ({revision.fillings.length})
              </Typography>
              
              {revision.fillings.length === 0 ? (
                <Alert severity="info">
                  Нет заполнений
                </Alert>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {revision.fillings.map((filling) => (
                    <Accordion key={filling.id}>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ width: 40, height: 40, bgcolor: '#2196f3' }}>
                              {filling.userName?.charAt(0) || 'П'}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle1">
                                {filling.userName || `Пользователь ${filling.userId}`}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Заполнил: {filling.filledAt ? formatDate(filling.filledAt) : 'Не заполнено'}
                              </Typography>
                            </Box>
                          </Box>
                          <Stack direction="row" spacing={1}>
                            <Chip
                              label={filling.isCompleted ? 'Заполнено ✓' : 'Не заполнено'}
                              size="small"
                              sx={{
                                backgroundColor: filling.isCompleted ? '#e8f5e9' : '#ffebee',
                                color: filling.isCompleted ? '#4caf50' : '#f44336',
                              }}
                            />
                            <Chip
                              label={`${filling.items.length} товаров`}
                              size="small"
                              sx={{ backgroundColor: '#e3f2fd', color: '#1976d2' }}
                            />
                          </Stack>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {/* Фотографии пользователя */}
                          {filling.photos.length > 0 && (
                            <>
                              <Typography variant="subtitle2" color="#2a0f35">
                                Фотографии:
                              </Typography>
                              <Grid container spacing={1}>
                                {filling.photos.slice(0, 3).map((photo, index) => renderPhoto(photo, index))}
                                {filling.photos.length > 3 && (
                                  <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                                    <Card sx={{ height: '100%' }}>
                                      <CardContent sx={{ 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        height: 120 
                                      }}>
                                        <Typography variant="h4" color="primary">
                                          +{filling.photos.length - 3}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          еще фото
                                        </Typography>
                                      </CardContent>
                                    </Card>
                                  </Grid>
                                )}
                              </Grid>
                            </>
                          )}
                          
                          {/* Товары пользователя */}
                          {filling.items.length > 0 ? (
                            <TableContainer>
                              <Table size="small">
                                <TableHead>
                                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Товар</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Количество</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {filling.items.map((item, index) => (
                                    <TableRow key={index}>
                                      <TableCell>
                                        <Typography variant="body2">
                                          {item.productName || `Товар ${item.productId}`}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          {item.productSku || `SKU${item.productId}`}
                                        </Typography>
                                      </TableCell>
                                      <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                          {item.quantity} шт.
                                        </Typography>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          ) : (
                            <Alert severity="info">
                              Нет данных о товарах
                            </Alert>
                          )}
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Box>
              )}
            </>
          )}
          
          {/* Вкладка расхождений (только для владельца проверенной ревизии) */}
          {activeTab === 2 && revision.status === RevisionStatus.VERIFIED && isOwner && (
            <>
              <Typography variant="h6" gutterBottom color="#2a0f35">
                Расхождения по пользователям
              </Typography>
              
              {revisionSummary.userDiscrepancies.length === 0 ? (
                <Alert severity="success">
                  Расхождений нет
                </Alert>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {/* Общая статистика */}
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#2196f310' }}>
                        <Typography variant="h5" color="#2196f3">
                          {revisionSummary.userDiscrepancies.length}
                        </Typography>
                        <Typography variant="body2" color="#4c5454">
                          Пользователей с расхождениями
                        </Typography>
                      </Paper>
                    </Grid>
                    
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#4caf5010' }}>
                        <Typography variant="h5" color="#4caf50">
                          +{totalDiscrepancy.positive}
                        </Typography>
                        <Typography variant="body2" color="#4c5454">
                          Общий плюс
                        </Typography>
                      </Paper>
                    </Grid>
                    
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#f4433610' }}>
                        <Typography variant="h5" color="#f44336">
                          -{totalDiscrepancy.negative}
                        </Typography>
                        <Typography variant="body2" color="#4c5454">
                          Общий минус
                        </Typography>
                      </Paper>
                    </Grid>
                    
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: totalDiscrepancy.total >= 0 ? '#4caf5010' : '#f4433610' }}>
                        <Typography variant="h5" color={totalDiscrepancy.total >= 0 ? '#4caf50' : '#f44336'}>
                          {totalDiscrepancy.total >= 0 ? '+' : ''}{totalDiscrepancy.total}
                        </Typography>
                        <Typography variant="body2" color="#4c5454">
                          Итог
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                  
                  {/* Детали по пользователям */}
                  {revisionSummary.userDiscrepancies.map((userDisc) => (
                    <Accordion key={userDisc.userId}>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ width: 40, height: 40, bgcolor: userDisc.totalDiscrepancy >= 0 ? '#4caf50' : '#f44336' }}>
                              {userDisc.userName?.charAt(0) || 'П'}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle1">
                                {userDisc.userName || `Пользователь ${userDisc.userId}`}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {userDisc.discrepancies.length} расхождений
                              </Typography>
                            </Box>
                          </Box>
                          <Stack direction="row" spacing={1}>
                            <Chip
                              icon={<Add />}
                              label={`+${userDisc.positiveTotal}`}
                              size="small"
                              sx={{ backgroundColor: '#2196f315', color: '#2196f3' }}
                            />
                            <Chip
                              icon={<Remove />}
                              label={`-${userDisc.negativeTotal}`}
                              size="small"
                              sx={{ backgroundColor: '#f4433615', color: '#f44336' }}
                            />
                            <Chip
                              label={`Итого: ${userDisc.totalDiscrepancy >= 0 ? '+' : ''}${userDisc.totalDiscrepancy}`}
                              size="small"
                              sx={{
                                backgroundColor: userDisc.totalDiscrepancy >= 0 ? '#2196f315' : '#f4433615',
                                color: userDisc.totalDiscrepancy >= 0 ? '#2196f3' : '#f44336',
                                fontWeight: 600,
                              }}
                            />
                          </Stack>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                <TableCell sx={{ fontWeight: 'bold' }}>Товар</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Ожидалось</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Фактически</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Разница</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {userDisc.discrepancies.map((disc, index) => (
                                <TableRow key={index}>
                                  <TableCell>
                                    <Typography variant="body2">
                                      {disc.productName || `Товар ${disc.productId}`}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2">
                                      {disc.expected} шт.
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2">
                                      {disc.actual} шт.
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      icon={disc.isPositive ? <ArrowUpward /> : <ArrowDownward />}
                                      label={`${disc.isPositive ? '+' : ''}${disc.discrepancy}`}
                                      size="small"
                                      sx={{
                                        backgroundColor: disc.isPositive ? '#2196f315' : '#f4433615',
                                        color: disc.isPositive ? '#2196f3' : '#f44336',
                                      }}
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Box>
              )}
            </>
          )}
          
          {/* Вкладка общей статистики (только для владельца) */}
          {activeTab === 3 && isOwner && (
            <>
              <Typography variant="h6" gutterBottom color="#2a0f35">
                Общая статистика по товарам
              </Typography>
              
              {revisionSummary.productSummary.length === 0 ? (
                <Alert severity="info">
                  Нет данных для статистики
                </Alert>
              ) : (
                <>
                  {/* Сводная информация */}
                  <Box sx={{ mb: 3 }}>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#2196f310' }}>
                          <Typography variant="h5" color="#2196f3">
                            {revisionSummary.totalFilled}
                          </Typography>
                          <Typography variant="body2" color="#4c5454">
                            Заполнили из {revisionSummary.totalUsers}
                          </Typography>
                        </Paper>
                      </Grid>
                      
                      <Grid size={{ xs: 6, md: 3 }}>
                        <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#9c27b010' }}>
                          <Typography variant="h5" color="#9c27b0">
                            {revisionSummary.productSummary.length}
                          </Typography>
                          <Typography variant="body2" color="#4c5454">
                            Уникальных товаров
                          </Typography>
                        </Paper>
                      </Grid>
                      
                      <Grid size={{ xs: 6, md: 3 }}>
                        <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#4caf5010' }}>
                          <Typography variant="h5" color="#4caf50">
                            {revisionSummary.productSummary.reduce((sum, item) => sum + item.totalQuantity, 0)}
                          </Typography>
                          <Typography variant="body2" color="#4c5454">
                            Всего товаров
                          </Typography>
                        </Paper>
                      </Grid>
                      
                      <Grid size={{ xs: 6, md: 3 }}>
                        <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#ff980010' }}>
                          <Typography variant="h5" color="#ff9800">
                            {revisionSummary.productSummary.reduce((sum, item) => sum + item.userQuantities.length, 0)}
                          </Typography>
                          <Typography variant="body2" color="#4c5454">
                            Записей по товарам
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Box>
                  
                  {/* Таблица общей статистики */}
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f3f6' }}>
                          <TableCell sx={{ fontWeight: 'bold', color: '#2a0f35' }}>Товар</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', color: '#2a0f35' }}>Артикул</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', color: '#2a0f35' }}>Категория</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', color: '#2a0f35' }}>Общее количество</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', color: '#2a0f35' }}>Пользователей с товаром</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', color: '#2a0f35' }}>Среднее на пользователя</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {revisionSummary.productSummary.map((item, index) => (
                          <TableRow key={index} hover>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {item.productName || `Товар ${item.productId}`}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="#4c5454">
                                {item.productSku || `SKU${item.productId}`}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {item.categoryName || 'Категория'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {item.totalQuantity} шт.
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={`${item.userQuantities.length} чел.`}
                                sx={{ backgroundColor: '#e3f2fd', color: '#1976d2' }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {Math.round(item.totalQuantity / item.userQuantities.length)} шт.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </>
          )}
          
          {/* Вкладка фотографий */}
          {activeTab === 4 && (
            <>
              <Typography variant="h6" gutterBottom color="#2a0f35">
                Фотографии
                {selectedFilling && (
                  <Typography variant="body2" color="text.secondary">
                    {selectedFilling.userName || 'Ваши фотографии'}
                  </Typography>
                )}
              </Typography>
              
              {selectedFilling?.photos && selectedFilling.photos.length > 0 ? (
                <Grid container spacing={2}>
                  {selectedFilling.photos.map((photo, index) => renderPhoto(photo, index))}
                </Grid>
              ) : (
                <Alert severity="info">
                  Нет фотографий
                </Alert>
              )}
            </>
          )}
        </Box>
      </Paper>

      {/* Диалог просмотра фото */}
      <Dialog 
        open={showPhotoDialog} 
        onClose={() => setShowPhotoDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Просмотр фотографии
          {selectedFilling && (
            <Typography variant="body2" color="text.secondary">
              {selectedFilling.userName}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedFilling?.photos && selectedFilling.photos[selectedPhotoIndex] && (
            <img
              src={revisionService.getPhotoUrl(selectedFilling.photos[selectedPhotoIndex])}
              alt={`Фото ${selectedPhotoIndex + 1}`}
              style={{ width: '100%', height: 'auto', borderRadius: 8 }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default ViewRevisionPage;