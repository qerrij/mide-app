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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Avatar,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from '@mui/material';
import {
  ArrowBack,
  CheckCircle,
  ExpandMore,
  PhotoCamera,
  Person,
  Group,
  LocationCity,
  Home,
  Language,
  People,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { revisionService } from '../api/revisionService';
import {
  Revision,
  RevisionStatus,
  getRevisionStatusText,
  getRevisionTypeText,
  getRevisionStatusColor,
  RevisionFilling,
  isGroupRevision,
  getTargetName,
} from '../types';

const ViewRevisionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState<Revision | null>(null);
  const [userFilling, setUserFilling] = useState<RevisionFilling | null>(null);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{ photos: string[], index: number } | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<number[]>([]);

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
        const revisionData = await revisionService.getRevisionById(revisionId);
        setRevision(revisionData);
        
        // Определяем, является ли пользователь владельцем ревизии
        const isOwner = revisionData.requestedById === user?.id;
        const isGroupRev = isGroupRevision(revisionData.type);
        
        if (isOwner && isGroupRev) {
          // Владелец видит все заполнения
          // Ничего не меняем, fillings уже загружены
        } else {
          // Не владелец - получаем только свое заполнение
          const myFilling = await revisionService.getMyFilling(revisionId);
          setUserFilling(myFilling);
          
          // Обновляем ревизию, оставляя только свое заполнение
          if (myFilling) {
            setRevision({
              ...revisionData,
              fillings: [myFilling],
              totalFilled: 1,
              totalUsers: 1,
            });
          }
        }
        
      } catch (err: any) {
        setError(err.message || 'Ошибка при загрузке ревизии');
        console.error('Error loading revision:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [id, user]);

  // Проверка, является ли пользователь владельцем
  const isOwner = revision?.requestedById === user?.id;
  
  // Проверка, является ли ревизия групповой
  const isGroupRev = revision ? isGroupRevision(revision.type) : false;
  
  // Форматирование даты
  const formatDate = (date?: Date): string => {
    if (!date) return 'Не указано';
    return new Date(date).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Получение иконки типа ревизии
  const getRevisionTypeIcon = (type?: string) => {
    switch (type) {
      case 'USER': return <Person />;
      case 'GROUP': return <Group />;
      case 'CLUSTER': return <Home />;
      case 'CITY': return <LocationCity />;
      case 'GENERAL': return <Language />;
      default: return <Language />;
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

  // Проверка, может ли пользователь проверить ревизию
  const canVerifyRevision = isOwner && revision?.status === RevisionStatus.COMPLETED;

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

  const completedFillings = revision.fillings?.filter(f => f.isCompleted) || [];
  const isRevisionVerified = revision.status === RevisionStatus.VERIFIED;

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      {/* Кнопка назад */}
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/revisions')}
        sx={{ mb: 3 }}
      >
        Назад к ревизиям
      </Button>

      {/* Заголовок */}
      <Box sx={{ mb: 3 }}>
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
              
              {isOwner && isGroupRev && revision.totalFilled !== undefined && (
                <Chip
                  icon={<People />}
                  label={`${revision.totalFilled}/${revision.totalUsers} заполнили`}
                  sx={{ backgroundColor: '#e3f2fd', color: '#1976d2' }}
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
                {revision.requestedByName || `Пользователь ${revision.requestedById}`}
              </Typography>
            </Box>
            
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
          
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ color: '#4c5454', mb: 0.5 }}>
                Цель:
              </Typography>
              <Typography variant="body1">
                {getTargetName(revision)}
              </Typography>
            </Box>
            
            {revision.verifiedAt && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ color: '#4c5454', mb: 0.5 }}>
                  Дата проверки:
                </Typography>
                <Typography variant="body1">
                  {formatDate(revision.verifiedAt)}
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
        
        {revision.verificationComment && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ color: '#4c5454', mb: 0.5 }}>
              Комментарий проверки:
            </Typography>
            <Typography variant="body1">
              {revision.verificationComment}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Блок 2: Статус ревизии */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom color="#2a0f35">
          Статус ревизии
        </Typography>
        
        <Box sx={{ 
          p: 4, 
          backgroundColor: '#f5f5f5',
          borderRadius: 2,
          textAlign: 'center'
        }}>
          {isRevisionVerified ? (
            revision.discrepancies && revision.discrepancies.length > 0 ? (
              <>
                <Typography variant="body1" color="#4c5454" gutterBottom>
                  {revision.discrepancies.some(d => d.isPositive) 
                    ? 'Ревизия в плюсе' 
                    : 'Ревизия в минусе'}
                </Typography>
                <Typography 
                  variant="h1" 
                  color={revision.discrepancies.some(d => d.isPositive) ? '#2196f3' : '#f44336'}
                  sx={{ fontWeight: 'bold' }}
                >
                  {revision.discrepancies.reduce((sum, d) => 
                    sum + d.discrepancy, 0
                  )}
                </Typography>
                <Typography variant="body2" color="#4c5454" sx={{ mt: 1 }}>
                  {revision.discrepancies.filter(d => d.isPositive).length > 0 && 
                    `Излишек: +${revision.discrepancies.filter(d => d.isPositive).reduce((sum, d) => sum + d.discrepancy, 0)} `}
                  {revision.discrepancies.filter(d => !d.isPositive).length > 0 && 
                    `Недостача: -${revision.discrepancies.filter(d => !d.isPositive).reduce((sum, d) => sum + d.discrepancy, 0)}`}
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
                  Расхождений не обнаружено
                </Typography>
              </>
            )
          ) : (
            <>
              <Typography variant="body1" color="#4c5454" gutterBottom>
                {revision.status === RevisionStatus.COMPLETED 
                  ? 'Ревизия заполнена всеми участниками'
                  : 'Ревизия заполняется'}
              </Typography>
              <Typography variant="h3" color="#2a0f35" sx={{ fontWeight: 'bold', mt: 2 }}>
                {getRevisionStatusText(revision.status)}
              </Typography>
              {isOwner && isGroupRev && revision.totalFilled !== undefined && (
                <Typography variant="body2" color="#4c5454" sx={{ mt: 1 }}>
                  {revision.totalFilled} из {revision.totalUsers} заполнили
                </Typography>
              )}
            </>
          )}
        </Box>
      </Paper>

      {/* Блок 3: Данные ревизии */}
      {completedFillings.length > 0 ? (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom color="#2a0f35">
            {isOwner && isGroupRev 
              ? `Данные участников (${completedFillings.length})` 
              : 'Ваши данные'}
          </Typography>
          
          {completedFillings.map((filling) => {
            const isExpanded = expandedUsers.includes(filling.userId);
            const userDiscrepancies = isRevisionVerified 
              ? revision.discrepancies?.filter(d => d.userId === filling.userId) || []
              : [];
              const userTotal = userDiscrepancies.reduce((sum, d) => 
                sum + d.discrepancy, 0  // Просто складываем с учетом знака
              );
            const userIsPositive = userTotal > 0;
            const userIsNegative = userTotal < 0;
            
            return (
              <Accordion 
                key={filling.id} 
                expanded={isExpanded}
                onChange={() => handleAccordionChange(filling.userId)}
                sx={{ mb: 2 }}
              >
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                    <Avatar sx={{ width: 40, height: 40, bgcolor: '#2196f3' }}>
                      {filling.userName?.charAt(0) || 'П'}
                    </Avatar>
                    
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1">
                        {filling.userName || `Пользователь ${filling.userId}`}
                      </Typography>
                      <Typography variant="body2" color="#4c5454">
                        Товары: {filling.items.length} шт. • Фото: {filling.photos.length} шт.
                      </Typography>
                    </Box>
                    
                    {/* Показываем расхождения только если ревизия проверена */}
                    {isRevisionVerified && (
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        {userTotal !== 0 ? (
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
                    )}
                  </Box>
                </AccordionSummary>
                
                <AccordionDetails>
                  {/* Товары */}
                  {filling.items.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" gutterBottom color="#2a0f35">
                        Товары ({filling.items.length})
                      </Typography>
                      
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                              <TableCell>Товар</TableCell>
                              <TableCell align="right">Количество</TableCell>
                              {/* Показываем колонку расхождений только если ревизия проверена */}
                              {isRevisionVerified && (
                                <TableCell align="right">Расхождение</TableCell>
                              )}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {filling.items.map((item, idx) => {
                              const discrepancy = isRevisionVerified
                                ? userDiscrepancies.find(d => d.productId === item.productId)
                                : null;
                              
                              return (
                                <TableRow key={idx} hover>
                                  <TableCell>
                                    <Typography variant="body2">
                                      {item.productName || `Товар ${item.productId}`}
                                    </Typography>
                                    <Typography variant="caption" color="#4c5454" display="block">
                                      {item.productSku || `SKU${item.productId}`}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body2">
                                      {item.quantity} шт.
                                    </Typography>
                                  </TableCell>
                                  {isRevisionVerified && (
                                    <TableCell align="right">
                                      {discrepancy ? (
                                        <Chip
                                          size="small"
                                          label={`${discrepancy.isPositive ? '+' : ''}${discrepancy.discrepancy}`}
                                          sx={{
                                            backgroundColor: discrepancy.isPositive ? '#2196f315' : '#f4433615',
                                            color: discrepancy.isPositive ? '#2196f3' : '#f44336',
                                            fontWeight: 500,
                                          }}
                                        />
                                      ) : (
                                        <Typography variant="body2" color="#4c5454">
                                          -
                                        </Typography>
                                      )}
                                    </TableCell>
                                  )}
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}
                  
                  {/* Фотографии */}
                  {filling.photos.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom color="#2a0f35">
                        Фотографии ({filling.photos.length})
                      </Typography>
                      
                      <Grid container spacing={1}>
                        {filling.photos.map((photo, index) => (
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
                              onClick={() => handleViewPhoto(filling.photos, index)}
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
                  
                  {/* Сообщение если нет товаров и фотографий */}
                  {filling.items.length === 0 && filling.photos.length === 0 && (
                    <Typography variant="body2" color="#4c5454" align="center" sx={{ py: 2 }}>
                      Нет данных для отображения
                    </Typography>
                  )}
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Paper>
      ) : (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Alert severity="info">
            Нет заполненных данных
          </Alert>
        </Paper>
      )}

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

export default ViewRevisionPage;