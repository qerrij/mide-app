import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Avatar,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Tooltip,
  useMediaQuery,
  useTheme,
  Stack,
  Snackbar,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Person as PersonIcon,
  PhotoCamera as PhotoIcon,
  Videocam as VideoIcon,
  Visibility as ViewIcon,
  CheckCircleOutline as ApprovedIcon,
  ErrorOutline as RejectedIcon,
  Pending as PendingIcon,
  Cancel as CancelledIcon,
  TrendingDown as DefectIcon,
  Category as CategoryIcon,
  MonetizationOn as PriceIcon,
  Numbers as QuantityIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { rejectionService } from '../api/rejectionService';
import { Rejection, RejectionStatus, getRejectionStatusText, getRejectionStatusColor, UserRole } from '../types';
import ConfirmationDialog from '../components/rejection/ConfirmationDialog';
import RejectionActionButtons from '../components/rejection/RejectionActionButtons';

const DefectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [rejection, setRejection] = useState<Rejection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning',
  });
  
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusComment, setStatusComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const [selectedMedia, setSelectedMedia] = useState<{ type: 'photo' | 'video', url: string } | null>(null);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');

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
      showSnackbar('Ошибка загрузки данных', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
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
      
      if (status === RejectionStatus.APPROVED) {
        setApproveDialogOpen(false);
        showSnackbar('Брак утвержден', 'success');
      } else {
        setRejectDialogOpen(false);
        showSnackbar('Брак отклонен', 'success');
      }
      setStatusComment('');
    } catch (err: any) {
      showSnackbar(err.response?.data?.detail || 'Ошибка при обновлении статуса', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!rejection) return;
    
    try {
      await rejectionService.cancelRejection(parseInt(id!));
      showSnackbar('Брак отменен', 'success');
      navigate('/defects');
    } catch (err: any) {
      showSnackbar(err.response?.data?.detail || 'Ошибка при отмене брака', 'error');
    }
  };

  const openMediaDialog = (type: 'photo' | 'video', url: string) => {
    setSelectedMedia({ type, url });
  };

  const closeMediaDialog = () => {
    setSelectedMedia(null);
  };

  const openImagePreview = (url: string) => {
    setSelectedImage(url);
    setImagePreviewOpen(true);
  };

  const closeImagePreview = () => {
    setImagePreviewOpen(false);
    setSelectedImage('');
  };

  const getStatusIcon = (status: RejectionStatus) => {
    switch (status) {
      case RejectionStatus.PENDING:
        return <PendingIcon />;
      case RejectionStatus.APPROVED:
        return <ApprovedIcon />;
      case RejectionStatus.REJECTED:
        return <RejectedIcon />;
      case RejectionStatus.CANCELLED:
        return <CancelledIcon />;
      default:
        return <PendingIcon />;
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

  // Функция для получения полного URL медиафайла
  const getMediaUrl = (path: string): string => {
    // Если путь уже содержит полный URL, возвращаем как есть
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) {
      return path;
    }
    
    // Если путь начинается с /uploads/, добавляем базовый URL бэкенда
    if (path.startsWith('/uploads/')) {
      return `http://localhost:8000${path}`;
    }
    
    // Если это просто имя файла, добавляем путь к uploads
    return `http://localhost:8000/uploads/${path}`;
  };

  // Вспомогательные функции для рендеринга
  const renderPhotos = () => {
    if (!rejection?.photoPaths || rejection.photoPaths.length === 0) {
      return null;
    }

    return (
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PhotoIcon sx={{ color: '#1976d2' }} />
                <span>Фотографии брака ({rejection.photoPaths.length})</span>
              </Box>
            }
            titleTypographyProps={{ variant: 'h6', color: '#2a0f35' }}
          />
          <CardContent>
            <ImageList 
              cols={isMobile ? 3 : 4} 
              gap={12}
              sx={{ 
                mb: 2,
                maxHeight: 'none'
              }}
            >
              {rejection.photoPaths.map((path, index) => {
                const url = getMediaUrl(path);
                return (
                  <ImageListItem key={index}>
                    <Box
                      component="img"
                      src={url}
                      alt={`Фото брака ${index + 1}`}
                      loading="lazy"
                      sx={{
                        width: '100%',
                        height: 140,
                        objectFit: 'cover',
                        borderRadius: 1,
                        cursor: 'pointer',
                        '&:hover': {
                          opacity: 0.8,
                        },
                      }}
                      onClick={() => openImagePreview(url)}
                      onError={(e) => {
                        console.error(`Ошибка загрузки фото: ${url}`);
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRkZGRkZGIi8+CjxwYXRoIGQ9Ik03NSAxMjVMMTAwIDEwMEwxMjUgMTI1IiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMiIvPgo8Y2lyY2xlIGN4PSIxMDAiIGN5PSI3NSIgcj0iMjUiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+Cjwvc3ZnPg==';
                      }}
                    />
                    <ImageListItemBar
                      position="top"
                      actionIcon={
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="Просмотр">
                            <IconButton
                              size="small"
                              onClick={() => openImagePreview(url)}
                              sx={{ color: 'white', backgroundColor: 'rgba(0,0,0,0.5)' }}
                            >
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Скачать">
                            <IconButton
                              size="small"
                              onClick={() => window.open(url, '_blank')}
                              sx={{ color: 'white', backgroundColor: 'rgba(0,0,0,0.5)' }}
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      }
                      actionPosition="right"
                    />
                  </ImageListItem>
                );
              })}
            </ImageList>
          </CardContent>
        </Card>
      </Grid>
    );
  };

  const renderVideos = () => {
    if (!rejection?.videoPaths || rejection.videoPaths.length === 0) {
      return null;
    }

    return (
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <VideoIcon sx={{ color: '#9c27b0' }} />
                <span>Видео брака ({rejection.videoPaths.length})</span>
              </Box>
            }
            titleTypographyProps={{ variant: 'h6', color: '#2a0f35' }}
          />
          <CardContent>
            <ImageList 
              cols={isMobile ? 2 : 3} 
              gap={12}
              sx={{ 
                mb: 2,
                maxHeight: 'none'
              }}
            >
              {rejection.videoPaths.map((path, index) => {
                const url = getMediaUrl(path);
                return (
                  <ImageListItem key={index}>
                    <Box
                      component="video"
                      src={url}
                      sx={{
                        width: '100%',
                        height: 200,
                        objectFit: 'cover',
                        borderRadius: 1,
                        cursor: 'pointer',
                        backgroundColor: '#000',
                        '&:hover': {
                          opacity: 0.8,
                        },
                      }}
                      onClick={() => openMediaDialog('video', url)}
                      onError={(e) => {
                        console.error(`Ошибка загрузки видео: ${url}`);
                      }}
                    />
                    <ImageListItemBar
                      position="top"
                      actionIcon={
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="Просмотр">
                            <IconButton
                              size="small"
                              onClick={() => openMediaDialog('video', url)}
                              sx={{ color: 'white', backgroundColor: 'rgba(0,0,0,0.5)' }}
                            >
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Скачать">
                            <IconButton
                              size="small"
                              onClick={() => window.open(url, '_blank')}
                              sx={{ color: 'white', backgroundColor: 'rgba(0,0,0,0.5)' }}
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      }
                      actionPosition="right"
                    />
                    <ImageListItemBar
                      title={`Видео ${index + 1}`}
                      subtitle="Кликните для просмотра"
                      position="below"
                    />
                  </ImageListItem>
                );
              })}
            </ImageList>
          </CardContent>
        </Card>
      </Grid>
    );
  };

  const renderRejectionInfo = () => {
    if (!rejection) return null;

    return (
      <>
        {/* Объединенный блок: Основная информация + Пользователь */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Grid container spacing={3}>
                {/* Левая колонка: Детали */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 3 }}>
                    <Box sx={{ 
                      backgroundColor: '#1976d220', 
                      borderRadius: '50%', 
                      p: 1.5,
                      mr: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <DefectIcon sx={{ color: '#1976d2', fontSize: 24 }} />
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                        Информация о браке
                      </Typography>
                      {rejection.comment && (
                        <Typography variant="body2" sx={{ color: '#4c5454' }}>
                          {rejection.comment}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <QuantityIcon sx={{ mr: 1.5, color: '#2196f3' }} />
                        <Box>
                          <Typography variant="caption" color="textSecondary">
                            Всего товаров
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {rejection.totalItems} ед.
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <PriceIcon sx={{ mr: 1.5, color: '#4caf50' }} />
                        <Box>
                          <Typography variant="caption" color="textSecondary">
                            Общая сумма
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500, color: '#4caf50' }}>
                            {rejection.totalValue.toLocaleString('ru-RU', {
                              style: 'currency',
                              currency: 'RUB',
                              minimumFractionDigits: 0,
                            })}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {rejection.reviewedAt ? (
                          <ApprovedIcon sx={{ mr: 1.5, color: '#4caf50' }} />
                        ) : (
                          <PendingIcon sx={{ mr: 1.5, color: '#ff9800' }} />
                        )}
                        <Box>
                          <Typography variant="caption" color="textSecondary">
                            Статус проверки
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {rejection.reviewedAt 
                              ? `Проверен ${formatDate(rejection.reviewedAt)}`
                              : 'Ожидает проверки'}
                          </Typography>
                          {rejection.reviewerName && (
                            <Typography variant="caption" color="textSecondary">
                              Проверил: {rejection.reviewerName}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                </Grid>

                {/* Правая колонка: Пользователь */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                    Создатель брака
                  </Typography>
                  
                  <Box sx={{ 
                    p: 2, 
                    borderRadius: 2, 
                    border: '1px solid #e0e0e0',
                    backgroundColor: '#f9f9f9',
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ 
                        bgcolor: '#1976d220', 
                        color: '#1976d2',
                        mr: 2,
                        width: 56,
                        height: 56
                      }}>
                        <PersonIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {rejection.userName || `Пользователь ${rejection.userId}`}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                          {rejection.userRole || 'Роль не указана'}
                        </Typography>
                        <Typography variant="caption" color="#666" sx={{ display: 'block' }}>
                          ID пользователя: {rejection.userId}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Товары в браке */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardHeader
              title="Товары в браке"
              subheader={`Всего: ${rejection.totalItems} ед., ${rejection.items.length} позиций`}
              titleTypographyProps={{ variant: 'h6', color: '#2a0f35' }}
            />
            <CardContent>
              <TableContainer>
                <Table size={isMobile ? "small" : "medium"}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Товар</TableCell>
                      <TableCell>Категория</TableCell>
                      <TableCell align="right">Количество</TableCell>
                      <TableCell align="right">Цена за шт.</TableCell>
                      <TableCell align="right">Сумма</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rejection.items.map((item) => (
                      <TableRow key={item.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {item.productName || `Товар #${item.productId}`}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <CategoryIcon sx={{ fontSize: 14, mr: 0.5, color: '#666' }} />
                            <Typography variant="caption" color="textSecondary">
                              {item.categoryName || '—'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {item.quantity} шт.
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ color: '#666' }}>
                            {item.unitPrice.toLocaleString('ru-RU', {
                              style: 'currency',
                              currency: 'RUB',
                              minimumFractionDigits: 0,
                            })}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 500, color: '#d32f2f' }}>
                            {item.totalPrice.toLocaleString('ru-RU', {
                              style: 'currency',
                              currency: 'RUB',
                              minimumFractionDigits: 0,
                            })}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={4} align="right">
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          Итого:
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#d32f2f' }}>
                          {rejection.totalValue.toLocaleString('ru-RU', {
                            style: 'currency',
                            currency: 'RUB',
                            minimumFractionDigits: 0,
                          })}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </>
    );
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!rejection) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">Брак не найден</Alert>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/defects')} sx={{ mt: 2 }}>
          Назад к списку
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Шапка страницы */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate('/defects')}
          sx={{ mb: 2 }}
        >
          Назад к бракам
        </Button>
        
        <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="h4" component="h1" gutterBottom color="#2a0f35">
              Брак #{rejection.id}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 1 }}>
              <Chip
                label={getRejectionStatusText(rejection.status)}
                icon={getStatusIcon(rejection.status)}
                sx={{
                  backgroundColor: `${getRejectionStatusColor(rejection.status)}20`,
                  color: getRejectionStatusColor(rejection.status),
                  fontWeight: 600,
                }}
              />
              <Typography variant="caption" color="textSecondary">
                Создан: {formatDate(rejection.createdAt)}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Основная информация */}
      <Grid container spacing={3}>
        {renderRejectionInfo()}

        {/* Фотографии */}
        {renderPhotos()}

        {/* Видео */}
        {renderVideos()}
      </Grid>

      {/* Плавающие кнопки управления */}
      {canManage && rejection.status === RejectionStatus.PENDING && (
        <RejectionActionButtons
          onApprove={() => setApproveDialogOpen(true)}
          onReject={() => setRejectDialogOpen(true)}
        />
      )}

      {/* Диалог утверждения */}
      <ConfirmationDialog
        open={approveDialogOpen}
        title="Утверждение брака"
        message={
          <Box>
            <Typography gutterBottom>
              Вы уверены, что хотите утвердить этот брак?
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              После утверждения товары будут списаны из инвентаря пользователя.
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Комментарий (необязательно)"
              value={statusComment}
              onChange={(e) => setStatusComment(e.target.value)}
              sx={{ mt: 2 }}
            />
          </Box>
        }
        onConfirm={() => handleStatusUpdate(RejectionStatus.APPROVED)}
        onCancel={() => {
          setApproveDialogOpen(false);
          setStatusComment('');
        }}
        confirmText="Утвердить"
        cancelText="Отмена"
        confirmColor="success"
        loading={submitting}
      />

      {/* Диалог отклонения */}
      <ConfirmationDialog
        open={rejectDialogOpen}
        title="Отклонение брака"
        message={
          <Box>
            <Typography gutterBottom>
              Вы уверены, что хотите отклонить этот брак?
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Брак будет помечен как отклоненный. Товары не будут списаны.
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Комментарий (необязательно)"
              value={statusComment}
              onChange={(e) => setStatusComment(e.target.value)}
              sx={{ mt: 2 }}
            />
          </Box>
        }
        onConfirm={() => handleStatusUpdate(RejectionStatus.REJECTED)}
        onCancel={() => {
          setRejectDialogOpen(false);
          setStatusComment('');
        }}
        confirmText="Отклонить"
        cancelText="Отмена"
        confirmColor="error"
        loading={submitting}
      />

      {/* Диалог отмены */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        title="Отмена брака"
        message="Вы уверены, что хотите отменить этот брак? Это действие нельзя отменить."
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        confirmText="Отменить"
        cancelText="Назад"
        confirmColor="error"
      />

      {/* Модальное окно для просмотра изображений */}
      <Dialog
        open={imagePreviewOpen}
        onClose={closeImagePreview}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Просмотр фотографии</Typography>
            <IconButton onClick={closeImagePreview}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedImage && (
            <Box
              component="img"
              src={selectedImage}
              alt="Просмотр"
              sx={{
                width: '100%',
                height: 'auto',
                maxHeight: '70vh',
                objectFit: 'contain',
              }}
              onError={(e) => {
                console.error(`Ошибка загрузки фото в модальном окне: ${selectedImage}`);
                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRkZGRkZGIi8+CjxwYXRoIGQ9Ik03NSAxMjVMMTAwIDEwMEwxMjUgMTI1IiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMiIvPgo8Y2lyY2xlIGN4PSIxMDAiIGN5PSI3NSIgcj0iMjUiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+Cjwvc3ZnPg==';
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            startIcon={<DownloadIcon />} 
            onClick={() => window.open(selectedImage, '_blank')}
          >
            Скачать
          </Button>
          <Button onClick={closeImagePreview} color="primary">
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>

      {/* Модальное окно для просмотра видео */}
      <Dialog
        open={!!selectedMedia}
        onClose={closeMediaDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {selectedMedia?.type === 'photo' ? 'Просмотр фотографии' : 'Просмотр видео'}
            </Typography>
            <IconButton onClick={closeMediaDialog}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedMedia && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {selectedMedia.type === 'photo' ? (
                <img
                  src={selectedMedia.url}
                  alt="Просмотр фото"
                  style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
                />
              ) : (
                <video
                  src={selectedMedia.url}
                  controls
                  style={{ maxWidth: '100%', maxHeight: '70vh' }}
                >
                  Ваш браузер не поддерживает видео тег.
                </video>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            startIcon={<DownloadIcon />}
            onClick={() => selectedMedia && window.open(selectedMedia.url, '_blank')}
          >
            Скачать
          </Button>
          <Button onClick={closeMediaDialog} color="primary">
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar для уведомлений */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default DefectDetailPage;