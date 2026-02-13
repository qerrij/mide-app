import React, { useState, useEffect, useRef } from 'react';
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Avatar,
  Stack,
  Fade,
} from '@mui/material';
import {
  ArrowBack,
  CheckCircle,
  Cancel,
  ExpandMore,
  ArrowUpward,
  ArrowDownward,
  PhotoCamera,
  Person,
  Group,
  LocationCity,
  Home,
  Language,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { revisionService } from '../../api/revisionService';
import { userService } from '../../api/userService';
import {
  Revision,
  RevisionStatus,
  getRevisionStatusText,
  getRevisionTypeText,
  getRevisionStatusColor,
  UserDiscrepancySummary,
  getTargetName,
} from '../../types';

const VerifyRevisionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [revision, setRevision] = useState<Revision | null>(null);
  const [requestedByName, setRequestedByName] = useState<string>('');
  const [discrepancies, setDiscrepancies] = useState<UserDiscrepancySummary[]>([]);
  
  const [verificationComment, setVerificationComment] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{ photos: string[], index: number } | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<number[]>([]);
  
  const confirmationRef = useRef<HTMLDivElement>(null);
  const [showConfirmButton, setShowConfirmButton] = useState(true);

  // Загрузка данных ревизии
  useEffect(() => {
    const loadRevision = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!id) {
          throw new Error('ID ревизии не указан');
        }
        
        const revisionData = await revisionService.getRevisionById(parseInt(id));
        
        if (revisionData.status !== RevisionStatus.COMPLETED) {
          throw new Error('Эта ревизия не готова к проверке');
        }
        
        if (user?.id !== revisionData.requestedById) {
          throw new Error('Только тот, кто запросил ревизию, может её проверять');
        }
        setRequestedByName(revisionData.requestedByName || `Пользователь ${revisionData.requestedById}`);
        
        setRevision(revisionData);
        
        // Получаем расхождения с сервера
        try {
          const calculatedDiscrepancies = await revisionService.calculateDiscrepancies(parseInt(id));
          setDiscrepancies(calculatedDiscrepancies);
        } catch (error) {
          console.error('Error calculating discrepancies:', error);
          setDiscrepancies([]);
        }
        
      } catch (err: any) {
        setError(err.message || 'Ошибка при загрузке ревизии');
        console.error('Error loading revision:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadRevision();
  }, [id, user]);

  // Эффект для отслеживания скролла
  useEffect(() => {
    const handleScroll = () => {
      if (!confirmationRef.current) return;
      
      const confirmationSection = confirmationRef.current;
      const scrollPosition = window.scrollY + window.innerHeight;
      const sectionTop = confirmationSection.offsetTop;
      const sectionHeight = confirmationSection.offsetHeight;
      
      if (scrollPosition > sectionTop + sectionHeight / 2) {
        setShowConfirmButton(false);
      } else {
        setShowConfirmButton(true);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Общий итог из серверных данных
  const getTotalDiscrepancy = () => {
    if (discrepancies.length === 0) return { total: 0, positive: 0, negative: 0 };
    
    const total = discrepancies.reduce((sum, ud) => sum + ud.totalDiscrepancy, 0);
    const positive = discrepancies.reduce((sum, ud) => sum + ud.positiveTotal, 0);
    const negative = discrepancies.reduce((sum, ud) => sum + ud.negativeTotal, 0);
    
    return { total, positive, negative };
  };

  // Получение расхождений для пользователя
  const getUserDiscrepancy = (userId: number) => {
    const userDiscrepancy = discrepancies.find(d => d.userId === userId);
    if (!userDiscrepancy) return { total: 0, positive: 0, negative: 0 };
    
    return {
      total: userDiscrepancy.totalDiscrepancy,
      positive: userDiscrepancy.positiveTotal,
      negative: userDiscrepancy.negativeTotal,
    };
  };

  // Получение ожидаемого количества из заполнения пользователя
  const getExpectedQuantity = (userId: number, productId: number): number => {
    const userFilling = revision?.fillings.find(f => f.userId === userId);
    if (!userFilling) return 0;
    
    const item = userFilling.items.find(i => i.productId === productId);
    return item?.quantity || 0;
  };

  // Проверка ревизии
  const handleVerifyRevision = async () => {
    try {
      if (!revision || !id) return;
      
      setVerifying(true);
      setError(null);
      setShowConfirmDialog(true);
      
    } catch (err: any) {
      setError(err.message || 'Ошибка при проверке ревизии');
      console.error('Error verifying revision:', err);
    } finally {
      setVerifying(false);
    }
  };

  // Подтверждение проверки
  const handleConfirmVerification = async () => {
    try {
      setVerifying(true);
      
      if (!revision || !id) return;
      
      await revisionService.verifyRevision(
        parseInt(id),
        verificationComment || 'Ревизия проверена'
      );
      
      setShowConfirmDialog(false);
      setSuccess(true);
      
      setTimeout(() => {
        navigate(`/revisions/${revision.id}`);
      }, 2000);
      
    } catch (err: any) {
      setError(err.message || 'Ошибка при проверке ревизии');
      console.error('Error confirming verification:', err);
    } finally {
      setVerifying(false);
    }
  };

  // Просмотр фото
  const handleViewPhoto = (photos: string[], index: number) => {
    setSelectedPhoto({ photos, index });
    setShowPhotoDialog(true);
  };

  // Обработка раскрытия/закрытия аккордеона
  const handleAccordionChange = (userId: number) => {
    setExpandedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
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

  // Функция для прокрутки к блоку подтверждения
  const scrollToConfirmation = () => {
    if (confirmationRef.current) {
      confirmationRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!revision) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          Ревизия не найдена
        </Alert>
      </Container>
    );
  }

  const totalDiscrepancy = getTotalDiscrepancy();
  const completedFillings = revision.fillings.filter(f => f.isCompleted);
  const isPositiveTotal = totalDiscrepancy.total > 0;
  const isNegativeTotal = totalDiscrepancy.total < 0;

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      {/* Кнопка назад */}
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate(`/revisions/${revision.id}`)}
        sx={{ mb: 3 }}
      >
        Назад к ревизии
      </Button>

      {/* Заголовок */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom color="#2a0f35">
          Проверка ревизии #{revision.id}
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
          <Chip
            icon={<Group />}
            label={`${completedFillings.length}/${revision.fillings.length} заполнили`}
            sx={{ backgroundColor: '#e3f2fd', color: '#1976d2' }}
          />
        </Stack>
      </Box>

      {/* Сообщения об ошибках/успехе */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Ревизия успешно проверена! Вы будете перенаправлены...
        </Alert>
      )}

      {/* Блок 1: Информация о ревизии */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom color="#2a0f35">
          Информация о ревизии
        </Typography>
        
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ color: '#4c5454', mb: 0.5 }}>
                Запросил:
              </Typography>
              <Typography variant="body1">
                {requestedByName}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ color: '#4c5454', mb: 0.5 }}>
                Цель:
              </Typography>
              <Typography variant="body1">
                {getTargetName(revision)}
              </Typography>
            </Box>
          </Grid>
          
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ color: '#4c5454', mb: 0.5 }}>
                Дата запроса:
              </Typography>
              <Typography variant="body1">
                {formatDate(revision.requestedAt)}
              </Typography>
            </Box>
            
            {revision.completedAt && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ color: '#4c5454', mb: 0.5 }}>
                  Дата заполнения:
                </Typography>
                <Typography variant="body1">
                  {formatDate(revision.completedAt)}
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
        
        {revision.comment && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ color: '#4c5454', mb: 0.5 }}>
              Комментарий:
            </Typography>
            <Typography variant="body1">
              {revision.comment}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Блок 2: Общий итог ревизии */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom color="#2a0f35">
          Общий итог ревизии
        </Typography>
        
        <Box sx={{ 
          p: 4, 
          backgroundColor: isPositiveTotal ? '#2196f315' : 
                         isNegativeTotal ? '#f4433615' : '#4caf5015',
          borderRadius: 2,
          textAlign: 'center'
        }}>
          {totalDiscrepancy.total !== 0 ? (
            <>
              <Typography variant="body1" color="#4c5454" gutterBottom>
                {isPositiveTotal ? 'Заполнено больше инвентаря на' : 'Заполнено меньше инвентаря на'}
              </Typography>
              <Typography 
                variant="h1" 
                color={isPositiveTotal ? '#2196f3' : '#f44336'}
                sx={{ fontWeight: 'bold' }}
              >
                {isPositiveTotal ? '+' : ''}{totalDiscrepancy.total}
              </Typography>
              <Typography variant="body2" color="#4c5454" sx={{ mt: 1 }}>
                {totalDiscrepancy.positive > 0 && `Плюс: +${totalDiscrepancy.positive} `}
                {totalDiscrepancy.negative > 0 && `Минус: -${totalDiscrepancy.negative}`}
              </Typography>
            </>
          ) : (
            <>
              <Typography variant="body1" color="#4c5454" gutterBottom>
                Ревизия сбалансирована
              </Typography>
              <Typography variant="h1" color="#4caf50" sx={{ fontWeight: 'bold' }}>
                0
              </Typography>
              <Typography variant="body2" color="#4c5454" sx={{ mt: 1 }}>
                Заполненное количество соответствует инвентарю
              </Typography>
            </>
          )}
        </Box>
      </Paper>

      {/* Блок 3: Детали по участникам */}
      {discrepancies.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom color="#2a0f35">
            Расхождения по участникам ({discrepancies.length})
          </Typography>
          
          {discrepancies.map((userDiscrepancy) => {
            const userFilling = revision.fillings.find(f => f.userId === userDiscrepancy.userId);
            const isExpanded = expandedUsers.includes(userDiscrepancy.userId);
            const userTotal = userDiscrepancy.totalDiscrepancy;
            const userIsPositive = userTotal > 0;
            const userIsNegative = userTotal < 0;
            const hasDiscrepancies = userDiscrepancy.discrepancies.length > 0;
            
            return (
              <Accordion 
                key={userDiscrepancy.userId} 
                expanded={isExpanded}
                onChange={() => handleAccordionChange(userDiscrepancy.userId)}
                sx={{ mb: 2 }}
              >
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                    <Avatar sx={{ width: 40, height: 40, bgcolor: '#2196f3' }}>
                      {userDiscrepancy.userName?.charAt(0) || 'П'}
                    </Avatar>
                    
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1">
                        {userDiscrepancy.userName || `Пользователь ${userDiscrepancy.userId}`}
                      </Typography>
                      <Typography variant="body2" color="#4c5454">
                        Товары: {userFilling?.items.length || 0} шт. • 
                        Фото: {userFilling?.photos.length || 0} шт. • 
                        {hasDiscrepancies ? ' Есть расхождения' : ' Нет расхождений'}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      {hasDiscrepancies ? (
                        <Chip
                          label={`${userIsPositive ? '+' : ''}${userTotal}`}
                          sx={{
                            backgroundColor: userIsPositive ? '#2196f315' : '#f4433615',
                            color: userIsPositive ? '#2196f3' : '#f44336',
                            fontWeight: 600,
                            fontSize: '1rem',
                            minWidth: 80
                          }}
                        />
                      ) : (
                        <Chip
                          label="Нет расхождений"
                          sx={{ backgroundColor: '#4caf5015', color: '#4caf50' }}
                        />
                      )}
                    </Box>
                  </Box>
                </AccordionSummary>
                
                <AccordionDetails>
                  {/* Таблица расхождений */}
                  {hasDiscrepancies && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" gutterBottom color="#2a0f35">
                        Детали расхождений
                      </Typography>
                      
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                              <TableCell>Товар</TableCell>
                              <TableCell align="right">Заполнено</TableCell>
                              <TableCell align="center">Расхождение</TableCell>
                              <TableCell align="center">Статус</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {userDiscrepancy.discrepancies.map((disc, idx) => {
                              const expectedQuantity = getExpectedQuantity(userDiscrepancy.userId, disc.productId);
                              const discrepancy = disc.discrepancy || 0;
                              const isPositive = discrepancy > 0;
                              const isZero = discrepancy === 0;
                              
                              return (
                                <TableRow 
                                  key={idx} 
                                  hover
                                  sx={{
                                    backgroundColor: isPositive ? '#2196f308' : 
                                                  isZero ? '#fafafa' : '#f4433608'
                                  }}
                                >
                                  <TableCell>
                                    <Box>
                                      <Typography variant="body2">
                                        {disc.productName || `Товар ${disc.productId}`}
                                      </Typography>
                                      <Typography variant="caption" color="#4c5454" display="block">
                                        {disc.productSku || `SKU${disc.productId}`}
                                      </Typography>
                                    </Box>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body2">
                                      {expectedQuantity} шт.
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="center">
                                    {!isZero ? (
                                      <Chip
                                        size="small"
                                        icon={isPositive ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />}
                                        label={`${isPositive ? '+' : ''}${disc.discrepancy}`}
                                        sx={{
                                          backgroundColor: isPositive ? '#2196f315' : '#f4433615',
                                          color: isPositive ? '#2196f3' : '#f44336',
                                          fontWeight: 600,
                                          minWidth: 60
                                        }}
                                      />
                                    ) : (
                                      <Chip
                                        size="small"
                                        label="0"
                                        sx={{
                                          backgroundColor: '#e0e0e0',
                                          color: '#616161',
                                          fontWeight: 600,
                                          minWidth: 60
                                        }}
                                      />
                                    )}
                                  </TableCell>
                                  <TableCell align="center">
                                    {!isZero ? (
                                      <Chip
                                        size="small"
                                        label={isPositive ? 'Излишек' : 'Недостача'}
                                        sx={{
                                          backgroundColor: isPositive ? '#2196f315' : '#f4433615',
                                          color: isPositive ? '#2196f3' : '#f44336',
                                          fontSize: '0.7rem',
                                        }}
                                      />
                                    ) : (
                                      <Chip
                                        size="small"
                                        label="Нет расхождений"
                                        sx={{
                                          backgroundColor: '#4caf5015',
                                          color: '#4caf50',
                                          fontSize: '0.7rem',
                                        }}
                                      />
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                            
                            {/* Итоговая строка */}
                            <TableRow sx={{ backgroundColor: '#fafafa', fontWeight: 'bold' }}>
                              <TableCell>
                                <Typography variant="subtitle2">
                                  Итого:
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="subtitle2">
                                  {userFilling?.items.reduce((sum, item) => sum + item.quantity, 0) || 0} шт.
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                {userTotal !== 0 ? (
                                  <Chip
                                    size="small"
                                    icon={userIsPositive ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />}
                                    label={`${userIsPositive ? '+' : ''}${userTotal}`}
                                    sx={{
                                      backgroundColor: userIsPositive ? '#2196f315' : '#f4433615',
                                      color: userIsPositive ? '#2196f3' : '#f44336',
                                      fontWeight: 700,
                                      fontSize: '0.875rem',
                                      minWidth: 60
                                    }}
                                  />
                                ) : (
                                  <Chip
                                    size="small"
                                    label="0"
                                    sx={{
                                      backgroundColor: '#e0e0e0',
                                      color: '#616161',
                                      fontWeight: 700,
                                      fontSize: '0.875rem',
                                      minWidth: 60
                                    }}
                                  />
                                )}
                              </TableCell>
                              <TableCell align="center">
                                {userTotal !== 0 ? (
                                  <Chip
                                    size="small"
                                    label={userIsPositive ? 'В плюсе' : 'В минусе'}
                                    sx={{
                                      backgroundColor: userIsPositive ? '#2196f315' : '#f4433615',
                                      color: userIsPositive ? '#2196f3' : '#f44336',
                                      fontWeight: 600,
                                      fontSize: '0.7rem',
                                    }}
                                  />
                                ) : (
                                  <Chip
                                    size="small"
                                    label="Сбалансирован"
                                    sx={{
                                      backgroundColor: '#4caf5015',
                                      color: '#4caf50',
                                      fontWeight: 600,
                                      fontSize: '0.7rem',
                                    }}
                                  />
                                )}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>
                      
                    </Box>
                  )}
                  
                  {/* Фотографии */}
                  {userFilling?.photos && userFilling.photos.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom color="#2a0f35">
                        Фотографии ({userFilling.photos.length})
                      </Typography>
                      
                      <Grid container spacing={1}>
                        {userFilling.photos.map((photo, index) => (
                          <Grid size={{ xs: 6, sm: 4, md: 3 }} key={index}>
                            <Box
                              sx={{
                                position: 'relative',
                                height: 100,
                                backgroundImage: `url(${revisionService.getPhotoUrl(photo)})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                borderRadius: 1,
                                cursor: 'pointer',
                                '&:hover': {
                                  opacity: 0.9,
                                },
                              }}
                              onClick={() => handleViewPhoto(userFilling.photos, index)}
                            >
                              <Box
                                sx={{
                                  position: 'absolute',
                                  top: 4,
                                  right: 4,
                                  backgroundColor: 'rgba(0,0,0,0.5)',
                                  borderRadius: '50%',
                                  p: 0.5,
                                }}
                              >
                                <PhotoCamera sx={{ color: 'white', fontSize: 12 }} />
                              </Box>
                            </Box>
                            <Typography variant="caption" align="center" display="block" sx={{ mt: 0.5 }}>
                              Фото {index + 1}
                            </Typography>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Paper>
      )}

      {/* Блок 4: Подтверждение проверки */}
      <Paper sx={{ p: 3, mb: 3 }} ref={confirmationRef}>
        <Typography variant="h6" gutterBottom color="#2a0f35">
          Подтверждение проверки
        </Typography>
        
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
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            color="error"
            startIcon={<Cancel />}
            onClick={() => navigate(`/revisions/${revision.id}`)}
            disabled={verifying}
            sx={{ flex: 1 }}
          >
            Отмена
          </Button>
          
          <Button
            variant="contained"
            color="success"
            startIcon={verifying ? <CircularProgress size={20} /> : <CheckCircle />}
            onClick={handleVerifyRevision}
            disabled={verifying || revision.status !== RevisionStatus.COMPLETED}
            sx={{ flex: 1 }}
          >
            {verifying ? 'Проверяю...' : 'Проверить ревизию'}
          </Button>
        </Box>
        
        {revision.status !== RevisionStatus.COMPLETED && (
          <Typography variant="caption" color="#f44336" sx={{ mt: 2, display: 'block' }}>
            Ревизия еще не заполнена всеми участниками
          </Typography>
        )}
      </Paper>

      {/* Кнопка подтверждения в правом нижнем углу */}
      <Fade in={showConfirmButton} timeout={300}>
        <Box sx={{ 
          position: 'fixed', 
          bottom: 24, 
          right: 24,
          zIndex: 1000,
          opacity: showConfirmButton ? 1 : 0,
          transition: 'opacity 300ms ease-in-out',
          pointerEvents: showConfirmButton ? 'auto' : 'none'
        }}>
          <Button
            variant="contained"
            color="success"
            size="large"
            startIcon={<CheckCircle />}
            onClick={scrollToConfirmation}
            disabled={verifying || revision.status !== RevisionStatus.COMPLETED}
            sx={{
              boxShadow: 3,
              borderRadius: 2,
              px: 3,
              py: 1.5,
              fontSize: '1rem',
              '&:hover': {
                boxShadow: 6,
              }
            }}
          >
            К проверке
          </Button>
        </Box>
      </Fade>

      {/* Диалог подтверждения проверки */}
      <Dialog
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Подтверждение проверки ревизии
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Вы уверены, что хотите завершить проверку ревизии #{revision.id}?
          </Typography>
          
          {totalDiscrepancy.total !== 0 && (
            <Alert 
              severity={isPositiveTotal ? "warning" : "info"} 
              sx={{ mb: 2 }}
            >
              {isPositiveTotal 
                ? `Заполнено больше инвентаря на +${totalDiscrepancy.total} (излишек). Данные будут зафиксированы.`
                : `Заполнено меньше инвентаря на ${totalDiscrepancy.total} (недостача). Данные будут зафиксированы.`
              }
            </Alert>
          )}
          
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Комментарий проверки"
            value={verificationComment}
            onChange={(e) => setVerificationComment(e.target.value)}
            placeholder="Укажите комментарий..."
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setShowConfirmDialog(false)}
            disabled={verifying}
          >
            Отмена
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleConfirmVerification}
            disabled={verifying}
            startIcon={verifying ? <CircularProgress size={20} /> : <CheckCircle />}
          >
            {verifying ? 'Сохраняю...' : 'Подтвердить проверку'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог фото */}
      <Dialog
        open={showPhotoDialog}
        onClose={() => setShowPhotoDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Просмотр фотографии
        </DialogTitle>
        <DialogContent>
          {selectedPhoto && selectedPhoto.photos[selectedPhoto.index] && (
            <Box
              sx={{
                width: '100%',
                maxHeight: '70vh',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <img
                src={revisionService.getPhotoUrl(selectedPhoto.photos[selectedPhoto.index])}
                alt={`Фото ${selectedPhoto.index + 1}`}
                style={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain',
                }}
              />
            </Box>
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