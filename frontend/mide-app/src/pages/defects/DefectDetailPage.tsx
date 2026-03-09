import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Chip,
  Stack,
  Card,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Fab,
  useTheme,
  useMediaQuery,
  IconButton,
  Paper,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon,
  PhotoCamera as PhotoCameraIcon,
  Videocam as VideoIcon,
  Schedule as ScheduleIcon,
  Inventory as InventoryIcon,
  Category as CategoryIcon,
  Close as CloseIcon,
  Download as DownloadIcon,
  CheckCircleOutline as ApprovedIcon,
  ErrorOutline as RejectedIcon,
  Pending as PendingIcon,
  Cancel as CancelledIcon,
  TrendingDown as DefectIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { PhotoViewer } from '../../components/PhotoViewer';
import { useAuth } from '../../contexts/AuthContext';
import { rejectionService } from '../../api/rejectionService';
import { Rejection, RejectionStatus, getRejectionStatusText, getRejectionStatusColor, UserRole } from '../../types';

// Компонент для карточки товара - уменьшенная ширина
const ProductCard = ({ item }: { item: any }) => {
  const total = item.totalPrice ?? (item.quantity || 0) * (item.unitPrice || 0);

  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        borderRadius: 7,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#fff8f8',
        boxShadow: '0 6px 24px rgba(211, 47, 47, 0.08)',
        transition: 'all 0.25s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 32px rgba(211, 47, 47, 0.18)',
        },
      }}
    >
      {/* Верхняя строка */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Chip
          label={item.categoryName || 'Без категории'}
          size="small"
          sx={{
            borderRadius: 4,
            fontWeight: 700,
            backgroundColor: '#ffdad6',
            color: '#b3261e',
            letterSpacing: 0.5,
          }}
        />

        <Typography
          variant="caption"
          sx={{
            color: '#6b7280',
            fontWeight: 500,
          }}
        >
          ID: {item.productId}
        </Typography>
      </Box>

      {/* Название */}
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          mb: 1,
          lineHeight: 1.3,
          color: '#1c1b1f',
        }}
      >
        {item.productName || `Товар #${item.productId}`}
      </Typography>

      {/* Поставщик */}
      {item.supplier && (
        <Typography
          variant="body2"
          sx={{
            color: '#5f6368',
            mb: 2,
          }}
        >
          Поставщик: {item.supplier}
        </Typography>
      )}

      {/* Количество и цена */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="caption" sx={{ color: '#6b7280' }}>
            Количество
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 700, color: '#b3261e' }}
          >
            {item.quantity} шт.
          </Typography>
        </Box>

        <Box textAlign="right">
          <Typography variant="caption" sx={{ color: '#6b7280' }}>
            Цена за шт.
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {item.unitPrice?.toLocaleString('ru-RU')} ₽
          </Typography>
        </Box>
      </Box>

      {/* Итоговая сумма */}
      <Box
        sx={{
          mt: 'auto',
          p: 2,
          borderRadius: 5,
          backgroundColor: '#ffdad6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: '#7f1d1d',
          }}
        >
          Итого
        </Typography>

        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
            color: '#b3261e',
          }}
        >
          {total.toLocaleString('ru-RU')} ₽
        </Typography>
      </Box>
    </Paper>
  );
};

const DefectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [rejection, setRejection] = useState<Rejection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [statusComment, setStatusComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const [photoViewer, setPhotoViewer] = useState<{
    open: boolean;
    photos: string[];
    currentIndex: number;
  }>({
    open: false,
    photos: [],
    currentIndex: 0,
  });

  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<string>('');

  // Аккордеоны раскрыты по умолчанию
  const [expandedItems, setExpandedItems] = useState(true);
  const [expandedMedia, setExpandedMedia] = useState(true);

  const isAdminOrOwner = user?.role === UserRole.OWNER || user?.role === UserRole.ADMIN;
  const canManage = isAdminOrOwner || (user?.role === UserRole.SENIOR_SELLER && rejection?.status === RejectionStatus.PENDING);

  useEffect(() => {
    if (id) {
      loadRejection();
    }
  }, [id]);

  const loadRejection = async () => {
    try {
      setLoading(true);
      const data = await rejectionService.getRejectionById(parseInt(id!));
      setRejection(data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status: RejectionStatus.APPROVED | RejectionStatus.REJECTED) => {
    if (!rejection) return;
    
    try {
      setSubmitting(true);
      await rejectionService.updateRejectionStatus(
        parseInt(id!),
        status,
        statusComment || undefined
      );
      await loadRejection();
      
      setSuccessMessage(status === RejectionStatus.APPROVED ? 'Брак утвержден' : 'Брак отклонен');
      setSuccessDialogOpen(true);
      
      setApproveDialogOpen(false);
      setRejectDialogOpen(false);
      setStatusComment('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка при обновлении статуса');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!rejection) return;
    
    try {
      await rejectionService.cancelRejection(parseInt(id!));
      setSuccessMessage('Брак отменен');
      setSuccessDialogOpen(true);
      setTimeout(() => navigate('/defects'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка при отмене брака');
    }
  };

  const handleViewPhoto = (photos: string[], index: number) => {
    const photoUrls = photos.map(path => getMediaUrl(path));
    setPhotoViewer({
      open: true,
      photos: photoUrls,
      currentIndex: index,
    });
  };

  const handleViewVideo = (url: string) => {
    setSelectedVideo(url);
    setVideoDialogOpen(true);
  };

  const getStatusIcon = (status: RejectionStatus) => {
    switch (status) {
      case RejectionStatus.PENDING:
        return <PendingIcon sx={{ fontSize: 18 }} />;
      case RejectionStatus.APPROVED:
        return <ApprovedIcon sx={{ fontSize: 18 }} />;
      case RejectionStatus.REJECTED:
        return <RejectedIcon sx={{ fontSize: 18 }} />;
      case RejectionStatus.CANCELLED:
        return <CancelledIcon sx={{ fontSize: 18 }} />;
      default:
        return <PendingIcon sx={{ fontSize: 18 }} />;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateTime = (date?: Date): string => {
    if (!date) return 'Не указано';
    return formatDate(date);
  };

  const getMediaUrl = (path: string): string => {
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) {
      return path;
    }
    
    if (path.startsWith('/uploads/')) {
      return `http://localhost:8000${path}`;
    }
    
    return `http://localhost:8000/uploads/${path}`;
  };

  const hasPhotos = rejection?.photoPaths && rejection.photoPaths.length > 0;
  const hasVideos = rejection?.videoPaths && rejection.videoPaths.length > 0;
  const hasMedia = hasPhotos || hasVideos;
  const totalMediaCount = (rejection?.photoPaths?.length || 0) + (rejection?.videoPaths?.length || 0);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', background: '#f5f3f6', py: 4 }}>
        <Container maxWidth="xl">
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <CircularProgress sx={{ color: '#674fb6' }} />
          </Box>
        </Container>
      </Box>
    );
  }

  if (!rejection) {
    return (
      <Box sx={{ minHeight: '100vh', background: '#f5f3f6', py: 4 }}>
        <Container maxWidth="xl">
          <Alert severity="error" sx={{ borderRadius: 4 }}>
            Брак не найден
          </Alert>
        </Container>
      </Box>
    );
  }

  const totalValue = rejection.totalValue || 0;
  const isNegativeTotal = true; // Брак всегда отрицательный

  return (
    <Box sx={{ minHeight: '100vh', py: 3, backgroundColor: '#f5f3f6' }}>
      {/* Плавающая кнопка назад для мобильных */}
      {isMobile && (
        <Fab
          onClick={() => navigate('/defects')}
          sx={{
            position: 'fixed',
            top: 64,
            left: 16,
            zIndex: 1000,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.9)' },
            width: 44,
            height: 44,
            mt: 1,
          }}
        >
          <ArrowBackIcon sx={{ color: 'rgba(103, 79, 182, 0.8)', fontSize: 22 }} />
        </Fab>
      )}

      <Container maxWidth="xl" sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
        {/* Кнопка назад для десктопа */}
        {!isMobile && (
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/defects')}
            sx={{
              borderRadius: 4,
              color: '#674fb6',
              textTransform: 'none',
              fontSize: '0.9rem',
              mb: 3,
              px: 2,
              py: 1,
              border: '1px solid rgba(103, 79, 182, 0.2)',
              '&:hover': {
                backgroundColor: 'rgba(103, 79, 182, 0.04)',
                border: '1px solid rgba(103, 79, 182, 0.3)',
              },
            }}
          >
            Назад к бракам
          </Button>
        )}

        {isMobile && <Box sx={{ height: 16, mb: 2 }} />}

        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 3,
              borderRadius: 4,
              backgroundColor: 'rgba(202, 14, 192, 0.08)',
              border: '1px solid rgba(202, 14, 192, 0.2)',
              color: '#ca0ec0',
            }}
          >
            {error}
          </Alert>
        )}

        {/* Основная информация */}
        <Card sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 8, boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)' }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h5" component="h1" color="#2a0f35" fontWeight={600} gutterBottom>
              Брак #{rejection.id}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Chip
                label={getRejectionStatusText(rejection.status)}
                icon={getStatusIcon(rejection.status)}
                size="small"
                sx={{
                  backgroundColor: `${getRejectionStatusColor(rejection.status)}15`,
                  color: getRejectionStatusColor(rejection.status),
                  fontWeight: 500,
                  borderRadius: 6,
                }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <ScheduleIcon sx={{ fontSize: 16, color: '#4c5454', opacity: 0.7 }} />
                <Typography variant="caption" color="#4c5454">
                  {formatDateTime(rejection.createdAt)}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Stack spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <Avatar sx={{ width: 44, height: 44, bgcolor: '#674fb6' }}>
                {rejection.userName?.charAt(0)?.toUpperCase() || 'П'}
              </Avatar>
              <Box>
                <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontSize: '0.7rem', letterSpacing: 0.5 }}>
                  СОЗДАТЕЛЬ БРАКА
                </Typography>
                <Typography variant="body1" color="#2a0f35" fontWeight={600}>
                  {rejection.userName || `Пользователь ${rejection.userId}`}
                </Typography>
                <Typography variant="caption" color="#666" sx={{ display: 'block', mt: 0.5 }}>
                  ID пользователя: {rejection.userId}
                </Typography>
              </Box>
            </Box>

            {rejection.comment && (
              <Box sx={{ p: 2, backgroundColor: '#f5f3f6', borderRadius: 8 }}>
                <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontSize: '0.7rem', fontWeight: 500, letterSpacing: 0.5 }}>
                  КОММЕНТАРИЙ
                </Typography>
                <Typography variant="body2" color="#2a0f35" sx={{ whiteSpace: 'pre-wrap' }}>
                  {rejection.comment}
                </Typography>
              </Box>
            )}

            {rejection.reviewedAt && rejection.reviewerName && (
              <Box sx={{ p: 2, backgroundColor: '#f5f3f6', borderRadius: 8 }}>
                <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontSize: '0.7rem', fontWeight: 500, letterSpacing: 0.5 }}>
                  ПРОВЕРКА
                </Typography>
                <Typography variant="body2" color="#2a0f35">
                  Проверен {formatDateTime(rejection.reviewedAt)}
                </Typography>
                <Typography variant="caption" color="#666">
                  Проверил: {rejection.reviewerName}
                </Typography>
              </Box>
            )}
          </Stack>
        </Card>

        {/* Общий итог брака */}
        <Card
          sx={{
            p: { xs: 2, sm: 2.5 },
            mb: 3,
            borderRadius: 8,
            backgroundColor: '#ffffff',
            boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: isNegativeTotal
                ? 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)'
                : 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
              opacity: 0.7,
              zIndex: 0,
            }}
          />

          <Box sx={{ position: 'relative', zIndex: 1, py: { xs: 2, sm: 3 } }}>
            <Typography variant="body2" color="#4c5454" gutterBottom>
              Общая сумма брака
            </Typography>

            <Typography
              variant="h1"
              color={isNegativeTotal ? '#d32f2f' : '#2e7d32'}
              sx={{
                fontWeight: 'bold',
                my: 1,
                fontSize: { xs: '3rem', sm: '4rem' }
              }}
            >
              {totalValue.toLocaleString('ru-RU', {
                style: 'currency',
                currency: 'RUB',
                minimumFractionDigits: 0,
              })}
            </Typography>

            <Typography variant="caption" color="#4c5454">
              Всего товаров: {rejection.totalItems} ед., {rejection.items.length} позиций
            </Typography>
          </Box>
        </Card>

        {/* Данные по товарам - Аккордеон (раскрыт по умолчанию) */}
        <Card sx={{
          mb: 3,
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
        }}>
          <Box sx={{ p: { xs: 2, sm: 2.5 }, pb: 2, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <InventoryIcon sx={{ color: '#674fb6' }} />
                <Typography variant="subtitle1" color="#2a0f35" fontWeight={600}>
                  Товары в браке
                </Typography>
              </Box>
              <Chip
                label={rejection.items.length}
                size="small"
                sx={{
                  backgroundColor: '#f5f3f6',
                  color: '#4c5454',
                  fontWeight: 500,
                  borderRadius: 8,
                }}
              />
            </Box>
          </Box>

          <Box sx={{ width: '100%' }}>
            <Accordion
              expanded={expandedItems}
              onChange={() => setExpandedItems(!expandedItems)}
              sx={{
                boxShadow: 'none',
                '&:before': { display: 'none' },
                '&.Mui-expanded': { margin: 0 },
                backgroundColor: 'transparent',
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  minHeight: 64,
                  '&.Mui-expanded': { minHeight: 64 },
                  px: { xs: 2, sm: 2.5 },
                  py: 1.5,
                  borderTop: '1px solid rgba(0,0,0,0.05)',
                  cursor: 'pointer',
                }}
              >
                <Typography variant="body2" color="#2a0f35" fontWeight={500}>
                  Список товаров ({rejection.items.length})
                </Typography>
              </AccordionSummary>

              <AccordionDetails sx={{ px: { xs: 2, sm: 2.5 }, pb: 3, backgroundColor: '#f5f3f6' }}>
                <Grid container spacing={1.5} justifyContent="start">
                  {rejection.items.map((item) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={item.id}>
                      <ProductCard item={item} />
                    </Grid>
                  ))}
                </Grid>

                {/* Итоговая строка */}
                <Card
                  sx={{
                    mt: 2,
                    p: 2,
                    borderRadius: 7,
                    backgroundColor: '#ffffff',
                    boxShadow: '0 2px 8px rgba(106, 61, 122, 0.08)',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle2" color="#2a0f35" fontWeight={600}>
                      Итого по браку:
                    </Typography>
                    <Typography variant="h6" color="#d32f2f" fontWeight={700}>
                      {totalValue.toLocaleString('ru-RU', {
                        style: 'currency',
                        currency: 'RUB',
                        minimumFractionDigits: 0,
                      })}
                    </Typography>
                  </Box>
                </Card>
              </AccordionDetails>
            </Accordion>
          </Box>
        </Card>

        {/* Медиа файлы - единый блок (фото и видео вместе) */}
        {hasMedia && (
          <Card sx={{
            mb: 3,
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
          }}>
            <Box sx={{ p: { xs: 2, sm: 2.5 }, pb: 2, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <PhotoCameraIcon sx={{ color: '#674fb6' }} />
                    <VideoIcon sx={{ color: '#674fb6' }} />
                  </Box>
                  <Typography variant="subtitle1" color="#2a0f35" fontWeight={600}>
                    Медиафайлы
                  </Typography>
                </Box>
                <Chip
                  label={totalMediaCount}
                  size="small"
                  sx={{
                    backgroundColor: '#f5f3f6',
                    color: '#4c5454',
                    fontWeight: 500,
                    borderRadius: 8,
                  }}
                />
              </Box>
            </Box>

            <Box sx={{ width: '100%' }}>
              <Accordion
                expanded={expandedMedia}
                onChange={() => setExpandedMedia(!expandedMedia)}
                sx={{
                  boxShadow: 'none',
                  '&:before': { display: 'none' },
                  '&.Mui-expanded': { margin: 0 },
                  backgroundColor: 'transparent',
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    minHeight: 64,
                    '&.Mui-expanded': { minHeight: 64 },
                    px: { xs: 2, sm: 2.5 },
                    py: 1.5,
                    borderTop: '1px solid rgba(0,0,0,0.05)',
                    cursor: 'pointer',
                  }}
                >
                  <Typography variant="body2" color="#2a0f35" fontWeight={500}>
                    Просмотр ({totalMediaCount} файлов)
                  </Typography>
                </AccordionSummary>

                <AccordionDetails sx={{ px: { xs: 2, sm: 2.5 }, pb: 3, backgroundColor: '#f5f3f6' }}>
                  <Grid container spacing={2}>
                    {/* Фотографии */}
                    {hasPhotos && rejection.photoPaths?.map((path, index) => {
                      const url = getMediaUrl(path);
                      return (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={`photo-${index}`}>
                          <Box
                            onClick={() => handleViewPhoto(rejection.photoPaths || [], index)}
                            sx={{
                              width: '100%',
                              height: 200,
                              borderRadius: 8,
                              overflow: 'hidden',
                              cursor: 'pointer',
                              backgroundColor: '#ffffff',
                              backgroundImage: `url(${url})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              transition: 'transform 0.2s ease',
                              '&:hover': {
                                transform: { xs: 'none', md: 'scale(1.01)' },
                              },
                              position: 'relative',
                              border: '1px solid rgba(103, 79, 182, 0.1)',
                            }}
                          >
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 12,
                                right: 12,
                                backgroundColor: 'rgba(42, 15, 53, 0.6)',
                                borderRadius: '50%',
                                p: 0.8,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 32,
                                height: 32,
                                backdropFilter: 'blur(4px)',
                              }}
                            >
                              <PhotoCameraIcon sx={{ color: 'white', fontSize: 18 }} />
                            </Box>
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 12,
                                left: 12,
                                backgroundColor: 'rgba(103, 79, 182, 0.9)',
                                borderRadius: 4,
                                px: 1,
                                py: 0.5,
                              }}
                            >
                              <Typography variant="caption" sx={{ color: 'white', fontWeight: 600 }}>
                                Фото
                              </Typography>
                            </Box>
                            {rejection.photoPaths && rejection.photoPaths.length > 1 && (
                              <Box
                                sx={{
                                  position: 'absolute',
                                  bottom: 12,
                                  right: 12,
                                  backgroundColor: 'rgba(42, 15, 53, 0.7)',
                                  backdropFilter: 'blur(4px)',
                                  borderRadius: 6,
                                  px: 1.5,
                                  py: 0.5,
                                }}
                              >
                                <Typography variant="caption" sx={{ color: 'white', fontWeight: 600 }}>
                                  {index + 1} / {rejection.photoPaths.length}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </Grid>
                      );
                    })}

                    {/* Видео */}
                    {hasVideos && rejection.videoPaths?.map((path, index) => {
                      const url = getMediaUrl(path);
                      return (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={`video-${index}`}>
                          <Box
                            onClick={() => handleViewVideo(url)}
                            sx={{
                              width: '100%',
                              height: 200,
                              borderRadius: 8,
                              overflow: 'hidden',
                              cursor: 'pointer',
                              backgroundColor: '#000',
                              transition: 'transform 0.2s ease',
                              '&:hover': {
                                transform: { xs: 'none', md: 'scale(1.01)' },
                              },
                              position: 'relative',
                              border: '1px solid rgba(103, 79, 182, 0.1)',
                            }}
                          >
                            <video
                              src={url}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                              onError={(e) => console.error(`Ошибка загрузки видео: ${url}`)}
                            />
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 12,
                                right: 12,
                                backgroundColor: 'rgba(42, 15, 53, 0.6)',
                                borderRadius: '50%',
                                p: 0.8,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 32,
                                height: 32,
                                backdropFilter: 'blur(4px)',
                              }}
                            >
                              <VideoIcon sx={{ color: 'white', fontSize: 18 }} />
                            </Box>
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 12,
                                left: 12,
                                backgroundColor: 'rgba(103, 79, 182, 0.9)',
                                borderRadius: 4,
                                px: 1,
                                py: 0.5,
                              }}
                            >
                              <Typography variant="caption" sx={{ color: 'white', fontWeight: 600 }}>
                                Видео
                              </Typography>
                            </Box>
                            {rejection.videoPaths && rejection.videoPaths.length > 1 && (
                              <Box
                                sx={{
                                  position: 'absolute',
                                  bottom: 12,
                                  right: 12,
                                  backgroundColor: 'rgba(42, 15, 53, 0.7)',
                                  backdropFilter: 'blur(4px)',
                                  borderRadius: 6,
                                  px: 1.5,
                                  py: 0.5,
                                }}
                              >
                                <Typography variant="caption" sx={{ color: 'white', fontWeight: 600 }}>
                                  {index + 1} / {rejection.videoPaths.length}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Box>
          </Card>
        )}

        {/* Кнопки действий */}
        {canManage && rejection.status === RejectionStatus.PENDING && (
          <Box sx={{
            display: 'flex',
            gap: 2,
            justifyContent: 'center',
            flexDirection: { xs: 'row', md: 'row' },
            mb: 2,
          }}>
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={() => setRejectDialogOpen(true)}
              disabled={submitting}
              sx={{
                borderRadius: 4,
                px: 4,
                py: 1.2,
                fontSize: '0.95rem',
                fontWeight: 600,
                borderWidth: 1.5,
                borderColor: 'rgba(103, 79, 182, 0.5)',
                color: '#674fb6',
                '&:hover': {
                  borderWidth: 1.5,
                  borderColor: '#674fb6',
                  backgroundColor: 'rgba(103, 79, 182, 0.04)',
                },
              }}
            >
              Отклонить
            </Button>
            <Button
              variant="contained"
              startIcon={<CheckCircleIcon />}
              onClick={() => setApproveDialogOpen(true)}
              disabled={submitting}
              sx={{
                borderRadius: 4,
                backgroundColor: '#3f1f4b',
                '&:hover': { backgroundColor: '#2a0f35' },
                px: 4,
                py: 1.2,
                fontSize: '0.95rem',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(63, 31, 75, 0.25)',
              }}
            >
              Утвердить
            </Button>
          </Box>
        )}
      </Container>

      {/* Диалог утверждения */}
      <Dialog
        open={approveDialogOpen}
        onClose={() => {
          setApproveDialogOpen(false);
          setStatusComment('');
        }}
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
            Утверждение брака
          </Typography>
          <Typography variant="body2" color="#4c5454" sx={{ fontSize: '0.85rem' }}>
            Вы уверены, что хотите утвердить этот брак?
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 2.5, pt: 2 }}>
          <Stack spacing={2.5}>
            <Box sx={{
              p: 2,
              backgroundColor: 'rgba(211, 47, 47, 0.04)',
              borderRadius: 4,
              border: '1px solid #d32f2f20',
            }}>
              <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                СУММА БРАКА
              </Typography>
              <Typography variant="h5" color="#d32f2f" fontWeight={700}>
                {totalValue.toLocaleString('ru-RU', {
                  style: 'currency',
                  currency: 'RUB',
                  minimumFractionDigits: 0,
                })}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="#4c5454" sx={{ mb: 0.5, display: 'block', fontWeight: 600, fontSize: '0.75rem' }}>
                КОММЕНТАРИЙ (НЕОБЯЗАТЕЛЬНО)
              </Typography>
              <TextField
                fullWidth
                placeholder="Дополнительная информация по утверждению"
                value={statusComment}
                onChange={(e) => setStatusComment(e.target.value)}
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
            onClick={() => {
              setApproveDialogOpen(false);
              setStatusComment('');
            }}
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
            Отмена
          </Button>
          <Button
            variant="contained"
            onClick={() => handleStatusUpdate(RejectionStatus.APPROVED)}
            disabled={submitting}
            sx={{
              borderRadius: 4,
              backgroundColor: '#3f1f4b',
              '&:hover': { backgroundColor: '#2a0f35' },
              px: 3,
              py: 1,
              textTransform: 'none',
              fontSize: '0.95rem',
              fontWeight: 500,
            }}
          >
            {submitting ? 'Сохранение...' : 'Утвердить брак'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог отклонения */}
      <Dialog
        open={rejectDialogOpen}
        onClose={() => {
          setRejectDialogOpen(false);
          setStatusComment('');
        }}
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
            Отклонение брака
          </Typography>
          <Typography variant="body2" color="#4c5454" sx={{ fontSize: '0.85rem' }}>
            Вы уверены, что хотите отклонить этот брак?
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 2.5, pt: 2 }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="caption" color="#4c5454" sx={{ mb: 0.5, display: 'block', fontWeight: 600, fontSize: '0.75rem' }}>
                КОММЕНТАРИЙ (НЕОБЯЗАТЕЛЬНО)
              </Typography>
              <TextField
                fullWidth
                placeholder="Причина отклонения"
                value={statusComment}
                onChange={(e) => setStatusComment(e.target.value)}
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
            onClick={() => {
              setRejectDialogOpen(false);
              setStatusComment('');
            }}
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
            Отмена
          </Button>
          <Button
            variant="contained"
            onClick={() => handleStatusUpdate(RejectionStatus.REJECTED)}
            disabled={submitting}
            sx={{
              borderRadius: 4,
              backgroundColor: '#ca0ec0',
              '&:hover': { backgroundColor: '#950090' },
              px: 3,
              py: 1,
              textTransform: 'none',
              fontSize: '0.95rem',
              fontWeight: 500,
            }}
          >
            {submitting ? 'Сохранение...' : 'Отклонить брак'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог успеха */}
      <Dialog
        open={successDialogOpen}
        onClose={() => {
          setSuccessDialogOpen(false);
          if (successMessage === 'Брак отменен') {
            navigate('/defects');
          }
        }}
        PaperProps={{
          sx: {
            borderRadius: 4,
            maxWidth: 400,
            width: '100%',
            m: 2,
            boxShadow: '0 8px 24px rgba(106, 61, 122, 0.15)',
          }
        }}
      >
        <DialogContent sx={{ textAlign: 'center', py: 4, px: 3 }}>
          <CheckCircleIcon sx={{ fontSize: 80, color: '#3f1f4b', mb: 2 }} />
          <Typography variant="h5" color="#2a0f35" fontWeight={600} gutterBottom>
            {successMessage}
          </Typography>
          <Typography variant="body2" color="#4c5454">
            Статус брака обновлен
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 4 }}>
          <Button
            variant="contained"
            onClick={() => {
              setSuccessDialogOpen(false);
              if (successMessage !== 'Брак отменен') {
                // Остаемся на странице
              } else {
                navigate('/defects');
              }
            }}
            sx={{
              borderRadius: 4,
              backgroundColor: '#674fb6',
              '&:hover': { backgroundColor: '#483399' },
              px: 4,
              py: 1,
              textTransform: 'none',
              fontSize: '0.95rem',
              fontWeight: 500,
            }}
          >
            {successMessage === 'Брак отменен' ? 'К списку браков' : 'Продолжить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Просмотр фото */}
      <PhotoViewer
        open={photoViewer.open}
        photos={photoViewer.photos}
        currentIndex={photoViewer.currentIndex}
        onClose={() => setPhotoViewer(prev => ({ ...prev, open: false }))}
        onIndexChange={(index) => setPhotoViewer(prev => ({ ...prev, currentIndex: index }))}
        getPhotoUrl={(url) => url}
        forceMobile={false}
        disableThumbnails={photoViewer.photos.length <= 1}
      />

      {/* Диалог просмотра видео */}
      <Dialog
        open={videoDialogOpen}
        onClose={() => setVideoDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            overflow: 'hidden',
          }
        }}
      >
        <DialogTitle sx={{ 
          p: 2, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '1px solid rgba(0,0,0,0.05)'
        }}>
          <Typography variant="h6" color="#2a0f35" fontWeight={600}>
            Просмотр видео
          </Typography>
          <IconButton onClick={() => setVideoDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 2, backgroundColor: '#000' }}>
          {selectedVideo && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <video
                src={selectedVideo}
                controls
                style={{ maxWidth: '100%', maxHeight: '70vh' }}
              >
                Ваш браузер не поддерживает видео тег.
              </video>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          <Button 
            startIcon={<DownloadIcon />}
            onClick={() => selectedVideo && window.open(selectedVideo, '_blank')}
            sx={{
              borderRadius: 4,
              color: '#674fb6',
              textTransform: 'none',
            }}
          >
            Скачать
          </Button>
          <Button 
            onClick={() => setVideoDialogOpen(false)} 
            color="primary"
            sx={{
              borderRadius: 4,
              textTransform: 'none',
            }}
          >
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DefectDetailPage;