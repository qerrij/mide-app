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
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  Card,
  CardContent,
} from '@mui/material';
import {
  ArrowBack,
  CheckCircle,
  ExpandMore,
  ArrowUpward,
  ArrowDownward,
  PhotoCamera,
  Add,
  Remove,
  Person,
  Group,
  LocationCity,
  Home,
  Language,
  TrendingUp,
  TrendingDown,
  People,
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
  UserDiscrepancySummary,
  ProductDiscrepancySummary,
  canVerifyRevision,
  getTargetName,
} from '../types';

const VerifyRevisionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [revision, setRevision] = useState<Revision | null>(null);
  const [userDiscrepancies, setUserDiscrepancies] = useState<UserDiscrepancySummary[]>([]);
  const [productDiscrepancies, setProductDiscrepancies] = useState<ProductDiscrepancySummary[]>([]);
  
  const [verificationComment, setVerificationComment] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [selectedFilling, setSelectedFilling] = useState<number | null>(null);

  // Загрузка данных ревизии
  useEffect(() => {
    const loadRevision = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!id) {
          throw new Error('ID ревизии не указан');
        }
        
        if (!user?.id) {
          throw new Error('Пользователь не авторизован');
        }
        
        const revisionData = await revisionService.getRevisionById(parseInt(id));
        
        // Проверяем, можно ли проверять эту ревизию
        if (revisionData.status !== RevisionStatus.COMPLETED) {
          throw new Error('Эта ревизия не готова к проверке');
        }
        
        // Проверяем права пользователя
        if (!canVerifyRevision(revisionData, user.id)) {
          throw new Error('Только тот, кто запросил ревизию, может её проверять');
        }
        
        // Загружаем расхождения если ревизия уже проверена
        if (revisionData.status === RevisionStatus.VERIFIED) {
          try {
            const [userDisc, productDisc] = await Promise.all([
              revisionService.getDiscrepanciesByUser(parseInt(id)),
              revisionService.getDiscrepanciesByProduct(parseInt(id))
            ]);
            setUserDiscrepancies(userDisc);
            setProductDiscrepancies(productDisc);
          } catch (discError) {
            console.log('Расхождения еще не рассчитаны или недоступны');
          }
        }
        
        // Устанавливаем первое заполнение по умолчанию
        if (revisionData.fillings.length > 0) {
          setSelectedFilling(revisionData.fillings[0].id);
        }
        
        setRevision(revisionData);
        
      } catch (err: any) {
        setError(err.message || 'Ошибка при загрузке ревизии');
        console.error('Error loading revision:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadRevision();
  }, [id, user]);

  // Проверка ревизии
  const handleVerifyRevision = async () => {
    try {
      if (!revision || !id || !user?.id) return;
      
      setVerifying(true);
      setError(null);
      
      await revisionService.verifyRevision(
        parseInt(id),
        verificationComment || 'Ревизия проверена'
      );
      
      // После проверки загружаем расхождения
      const [userDisc, productDisc] = await Promise.all([
        revisionService.getDiscrepanciesByUser(parseInt(id)),
        revisionService.getDiscrepanciesByProduct(parseInt(id))
      ]);
      
      setUserDiscrepancies(userDisc);
      setProductDiscrepancies(productDisc);
      
      // Обновляем данные ревизии
      const updatedRevision = await revisionService.getRevisionById(parseInt(id));
      setRevision(updatedRevision);
      
      setSuccess(true);
      
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
      
    } catch (err: any) {
      setError(err.message || 'Ошибка при проверке ревизии');
    } finally {
      setVerifying(false);
    }
  };

  // Получение общего расхождения
  const getTotalDiscrepancy = () => {
    if (userDiscrepancies.length === 0) return { total: 0, positive: 0, negative: 0 };
    
    const total = userDiscrepancies.reduce((sum, ud) => sum + ud.totalDiscrepancy, 0);
    const positive = userDiscrepancies.reduce((sum, ud) => sum + ud.positiveTotal, 0);
    const negative = userDiscrepancies.reduce((sum, ud) => sum + ud.negativeTotal, 0);
    
    return { total, positive, negative };
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
      <Grid size={{ xs: 6, sm: 4 }} key={index}>
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

  // Получение выбранного заполнения
  const getSelectedFilling = () => {
    if (!revision || !selectedFilling) return null;
    return revision.fillings.find(f => f.id === selectedFilling);
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

  if (!revision) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          Ревизия не найдена
        </Alert>
      </Container>
    );
  }

  const selectedFillingData = getSelectedFilling();
  const totalDiscrepancy = getTotalDiscrepancy();
  const isVerified = revision.status === RevisionStatus.VERIFIED;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Шапка */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(`/revisions/${revision.id}`)}
          sx={{ mb: 2 }}
        >
          Назад к ревизии
        </Button>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom color="#2a0f35">
              {isVerified ? 'Проверка завершена' : 'Проверка ревизии'} #{revision.id}
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
              
              {/* Индикатор заполнений для групповых ревизий */}
              {revision.type !== 'USER' && (
                <Chip
                  icon={<People />}
                  label={`${revision.fillings.filter(f => f.isCompleted).length}/${revision.fillings.length} заполнили`}
                  sx={{ backgroundColor: '#e3f2fd', color: '#1976d2' }}
                />
              )}
              
              {/* Общее расхождение если ревизия проверена */}
              {isVerified && (
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
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Ревизия успешно проверена! Расхождения рассчитаны.
        </Alert>
      )}

      {/* Вкладки */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Проверка" />
          {isVerified && <Tab label="Расхождения по пользователям" />}
          {isVerified && <Tab label="Расхождения по товарам" />}
          {revision.type !== 'USER' && <Tab label="Заполнения" />}
          <Tab label="Фотографии" />
        </Tabs>
        
        <Box sx={{ p: 3 }}>
          {/* Вкладка проверки */}
          {activeTab === 0 && (
            <Grid container spacing={3}>
              {/* Левая колонка: информация */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" gutterBottom color="#2a0f35">
                    Информация о ревизии
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Typography variant="body2" sx={{ color: '#4c5454', minWidth: 120 }}>
                        Запросил:
                      </Typography>
                      <Typography variant="body2">
                        {revision.requestedByName}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Typography variant="body2" sx={{ color: '#4c5454', minWidth: 120 }}>
                        Цель:
                      </Typography>
                      <Typography variant="body2">
                        {getTargetName(revision)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Typography variant="body2" sx={{ color: '#4c5454', minWidth: 120 }}>
                        Дата запроса:
                      </Typography>
                      <Typography variant="body2">
                        {formatDate(revision.requestedAt)}
                      </Typography>
                    </Box>
                    
                    {revision.completedAt && (
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Typography variant="body2" sx={{ color: '#4c5454', minWidth: 120 }}>
                          Дата заполнения:
                        </Typography>
                        <Typography variant="body2">
                          {formatDate(revision.completedAt)}
                        </Typography>
                      </Box>
                    )}
                    
                    {revision.comment && (
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Typography variant="body2" sx={{ color: '#4c5454', minWidth: 120 }}>
                          Комментарий:
                        </Typography>
                        <Typography variant="body2">
                          {revision.comment}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Paper>
                
                {/* Статистика заполнений */}
                {revision.type !== 'USER' && (
                  <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom color="#2a0f35">
                      Статистика заполнений
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6 }}>
                        <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#2196f310' }}>
                          <Typography variant="h5" color="#2196f3">
                            {revision.fillings.filter(f => f.isCompleted).length}
                          </Typography>
                          <Typography variant="body2" color="#4c5454">
                            Заполнили
                          </Typography>
                        </Paper>
                      </Grid>
                      
                      <Grid size={{ xs: 6 }}>
                        <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#9c27b010' }}>
                          <Typography variant="h5" color="#9c27b0">
                            {revision.fillings.length}
                          </Typography>
                          <Typography variant="body2" color="#4c5454">
                            Всего должны
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Paper>
                )}
              </Grid>
              
              {/* Правая колонка: проверка */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 3, backgroundColor: isVerified ? '#e8f5e9' : '#f5f5f5' }}>
                  <Typography variant="h6" gutterBottom color="#2a0f35">
                    {isVerified ? 'Проверка завершена' : 'Проверка ревизии'}
                  </Typography>
                  
                  {isVerified ? (
                    <>
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" gutterBottom color="#2a0f35">
                          Результаты проверки:
                        </Typography>
                        
                        <Grid container spacing={1} sx={{ mb: 2 }}>
                          <Grid size={{ xs: 6 }}>
                            <Paper sx={{ p: 2, backgroundColor: '#2196f315' }}>
                              <Typography variant="body2" color="#2196f3" align="center">
                                <Add fontSize="small" /> Плюс: +{totalDiscrepancy.positive}
                              </Typography>
                            </Paper>
                          </Grid>
                          
                          <Grid size={{ xs: 6 }}>
                            <Paper sx={{ p: 2, backgroundColor: '#f4433615' }}>
                              <Typography variant="body2" color="#f44336" align="center">
                                <Remove fontSize="small" /> Минус: -{totalDiscrepancy.negative}
                              </Typography>
                            </Paper>
                          </Grid>
                          
                          <Grid size={{ xs: 12 }}>
                            <Paper sx={{ 
                              p: 2, 
                              backgroundColor: totalDiscrepancy.total >= 0 ? '#4caf5010' : '#f4433610',
                              mt: 1
                            }}>
                              <Typography 
                                variant="h6" 
                                color={totalDiscrepancy.total >= 0 ? '#4caf50' : '#f44336'} 
                                align="center"
                              >
                                Итого: {totalDiscrepancy.total >= 0 ? '+' : ''}{totalDiscrepancy.total}
                              </Typography>
                            </Paper>
                          </Grid>
                        </Grid>
                        
                        {revision.verificationComment && (
                          <Alert severity="info" sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              Комментарий проверки:
                            </Typography>
                            {revision.verificationComment}
                          </Alert>
                        )}
                      </Box>
                      
                      <Button
                        fullWidth
                        variant="outlined"
                        onClick={() => setActiveTab(1)}
                      >
                        Посмотреть детальные расхождения
                      </Button>
                    </>
                  ) : (
                    <>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Комментарий проверки"
                        value={verificationComment}
                        onChange={(e) => setVerificationComment(e.target.value)}
                        placeholder="Укажите комментарий к проверке..."
                        sx={{ mb: 3 }}
                      />
                      
                      <Button
                        fullWidth
                        variant="contained"
                        color="success"
                        size="large"
                        startIcon={verifying ? <CircularProgress size={20} /> : <CheckCircle />}
                        onClick={handleVerifyRevision}
                        disabled={verifying}
                        sx={{
                          backgroundColor: '#4caf50',
                          '&:hover': { backgroundColor: '#388e3c' },
                        }}
                      >
                        {verifying ? 'Проверка...' : 'Проверить ревизию'}
                      </Button>
                      
                      <Typography variant="caption" color="#4c5454" sx={{ mt: 2, display: 'block' }}>
                        При проверке система сравнит данные ревизии с остатками продавцов
                      </Typography>
                    </>
                  )}
                </Paper>
              </Grid>
            </Grid>
          )}
          
          {/* Вкладка расхождений по пользователям */}
          {activeTab === 1 && isVerified && (
            <>
              <Typography variant="h6" gutterBottom color="#2a0f35">
                Расхождения по пользователям
              </Typography>
              
              {userDiscrepancies.length === 0 ? (
                <Alert severity="success">
                  Расхождений не обнаружено
                </Alert>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {/* Общая статистика */}
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#2196f310' }}>
                        <Typography variant="h5" color="#2196f3">
                          {userDiscrepancies.length}
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
                      <Paper sx={{ 
                        p: 2, 
                        textAlign: 'center', 
                        backgroundColor: totalDiscrepancy.total >= 0 ? '#4caf5010' : '#f4433610' 
                      }}>
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
                  {userDiscrepancies.map((userDisc) => (
                    <Accordion key={userDisc.userId}>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ 
                              width: 40, 
                              height: 40, 
                              bgcolor: userDisc.totalDiscrepancy >= 0 ? '#4caf50' : '#f44336' 
                            }}>
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
                              icon={<Add fontSize="small" />}
                              label={`+${userDisc.positiveTotal}`}
                              size="small"
                              sx={{ backgroundColor: '#2196f315', color: '#2196f3' }}
                            />
                            <Chip
                              icon={<Remove fontSize="small" />}
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
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Ожидаемо</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Фактически</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Разница</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {userDisc.discrepancies.map((disc, idx) => (
                                <TableRow key={idx}>
                                  <TableCell>
                                    <Typography variant="body2">
                                      {disc.productName || `Товар ${disc.productId}`}
                                    </Typography>
                                    {disc.productSku && (
                                      <Typography variant="caption" color="text.secondary">
                                        {disc.productSku}
                                      </Typography>
                                    )}
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body2">
                                      {disc.expected} шт.
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body2">
                                      {disc.actual} шт.
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Chip
                                      size="small"
                                      icon={disc.isPositive ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />}
                                      label={`${disc.isPositive ? '+' : ''}${disc.discrepancy}`}
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
          
          {/* Вкладка расхождений по товарам */}
          {activeTab === 2 && isVerified && (
            <>
              <Typography variant="h6" gutterBottom color="#2a0f35">
                Расхождения по товарам
              </Typography>
              
              {productDiscrepancies.length === 0 ? (
                <Alert severity="success">
                  Расхождений не обнаружено
                </Alert>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {productDiscrepancies.map((productDisc) => (
                    <Accordion key={productDisc.productId}>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <Box>
                            <Typography variant="subtitle1">
                              {productDisc.productName || `Товар ${productDisc.productId}`}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {productDisc.productSku || `SKU${productDisc.productId}`} • {productDisc.categoryName}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={1}>
                            <Chip
                              icon={<Add fontSize="small" />}
                              label={`+${productDisc.positiveTotal}`}
                              size="small"
                              sx={{ backgroundColor: '#2196f315', color: '#2196f3' }}
                            />
                            <Chip
                              icon={<Remove fontSize="small" />}
                              label={`-${productDisc.negativeTotal}`}
                              size="small"
                              sx={{ backgroundColor: '#f4433615', color: '#f44336' }}
                            />
                            <Chip
                              label={`Итого: ${productDisc.totalDiscrepancy >= 0 ? '+' : ''}${productDisc.totalDiscrepancy}`}
                              size="small"
                              sx={{
                                backgroundColor: productDisc.totalDiscrepancy >= 0 ? '#2196f315' : '#f4433615',
                                color: productDisc.totalDiscrepancy >= 0 ? '#2196f3' : '#f44336',
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
                                <TableCell sx={{ fontWeight: 'bold' }}>Пользователь</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Ожидаемо</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Фактически</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Разница</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {productDisc.userDiscrepancies.map((userDisc, idx) => (
                                <TableRow key={idx}>
                                  <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Avatar sx={{ width: 24, height: 24, bgcolor: '#2196f3' }}>
                                        {userDisc.userName?.charAt(0) || 'П'}
                                      </Avatar>
                                      <Typography variant="body2">
                                        {userDisc.userName || `Пользователь ${userDisc.userId}`}
                                      </Typography>
                                    </Box>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body2">
                                      {userDisc.expected} шт.
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body2">
                                      {userDisc.actual} шт.
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Chip
                                      size="small"
                                      icon={userDisc.isPositive ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />}
                                      label={`${userDisc.isPositive ? '+' : ''}${userDisc.discrepancy}`}
                                      sx={{
                                        backgroundColor: userDisc.isPositive ? '#2196f315' : '#f4433615',
                                        color: userDisc.isPositive ? '#2196f3' : '#f44336',
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
          
          {/* Вкладка заполнений */}
          {activeTab === 3 && revision.type !== 'USER' && (
            <>
              <Typography variant="h6" gutterBottom color="#2a0f35">
                Заполнения пользователей ({revision.fillings.length})
              </Typography>
              
              {revision.fillings.length === 0 ? (
                <Alert severity="info">
                  Нет заполнений
                </Alert>
              ) : (
                <Grid container spacing={2}>
                  {revision.fillings.map((filling) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={filling.id}>
                      <Card 
                        sx={{ 
                          cursor: 'pointer',
                          border: selectedFilling === filling.id ? '2px solid #2196f3' : '1px solid #e0e0e0',
                          height: '100%'
                        }}
                        onClick={() => setSelectedFilling(filling.id)}
                      >
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Avatar sx={{ width: 40, height: 40, bgcolor: filling.isCompleted ? '#4caf50' : '#ff9800' }}>
                              {filling.userName?.charAt(0) || 'П'}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="subtitle1">
                                {filling.userName || `Пользователь ${filling.userId}`}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {filling.isCompleted ? 'Заполнено' : 'Не заполнено'}
                              </Typography>
                            </Box>
                            {filling.isCompleted && <CheckCircle sx={{ color: '#4caf50' }} />}
                          </Box>
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">
                              {filling.items.length} товаров
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {filling.photos.length} фото
                            </Typography>
                          </Box>
                          
                          {filling.filledAt && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                              {formatDate(filling.filledAt)}
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </>
          )}
          
          {/* Вкладка фотографий */}
          {activeTab === 4 && (
            <>
              <Typography variant="h6" gutterBottom color="#2a0f35">
                Фотографии
                {selectedFillingData && (
                  <Typography variant="body2" color="text.secondary">
                    {selectedFillingData.userName}
                  </Typography>
                )}
              </Typography>
              
              {selectedFillingData && selectedFillingData.photos.length > 0 ? (
                <Grid container spacing={2}>
                  {selectedFillingData.photos.map((photo, index) => renderPhoto(photo, index))}
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

      {/* Диалог фото */}
      <Dialog
        open={showPhotoDialog}
        onClose={() => setShowPhotoDialog(false)}
        maxWidth="lg"
      >
        <DialogTitle>
          Фотография {selectedPhotoIndex + 1} из {selectedFillingData?.photos.length || 0}
          {selectedFillingData && (
            <Typography variant="body2" color="text.secondary">
              {selectedFillingData.userName}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedFillingData && selectedFillingData.photos[selectedPhotoIndex] && (
            <img
              src={revisionService.getPhotoUrl(selectedFillingData.photos[selectedPhotoIndex])}
              alt={`Фото ${selectedPhotoIndex + 1}`}
              style={{ width: '100%', height: 'auto', borderRadius: 8 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPhotoDialog(false)}>
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default VerifyRevisionPage;