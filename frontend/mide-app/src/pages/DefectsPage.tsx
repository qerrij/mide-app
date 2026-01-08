import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Card,
  CardContent,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse,
  Badge,
} from '@mui/material';
import {
  Add,
  PhotoCamera,
  Videocam,
  Warning,
  ExpandMore,
  ExpandLess,
  Image,
  Movie,
  CheckCircle,
  Cancel,
  Inventory,
  Person,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { UserRole, ProductCategory, DefectStatus } from '../types';

interface Defect {
  id: number;
  product: string;
  productId: string;
  seller: string;
  sellerId: number;
  quantity: number;
  reason: string;
  date: string;
  status: DefectStatus;
  photos: string[];
  videos: string[];
  reviewedBy?: string;
  reviewDate?: string;
  expanded?: boolean;
}

const DefectsPage: React.FC = () => {
  const { user } = useAuth();
  const [openNewDefectDialog, setOpenNewDefectDialog] = useState(false);
  const [openDefectDetails, setOpenDefectDetails] = useState<Defect | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [defectQuantity, setDefectQuantity] = useState<string>('');
  const [defectReason, setDefectReason] = useState<string>('');
  const [defectPhotos, setDefectPhotos] = useState<File[]>([]);
  const [defectVideos, setDefectVideos] = useState<File[]>([]);
  const [defects, setDefects] = useState<Defect[]>([
    {
      id: 1,
      product: 'HQD Crystal Bar',
      productId: '1',
      seller: 'Иван Иванов',
      sellerId: 1,
      quantity: 5,
      reason: 'Неисправный аккумулятор, не заряжается',
      date: '2024-01-15 10:30',
      status: DefectStatus.PENDING,
      photos: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'],
      videos: ['video1.mp4'],
    },
    {
      id: 2,
      product: 'Elf Bar 600',
      productId: '2',
      seller: 'Петр Петров',
      sellerId: 2,
      quantity: 2,
      reason: 'Протекает жидкость, упаковка повреждена',
      date: '2024-01-14 14:20',
      status: DefectStatus.REVIEWED,
      photos: ['photo4.jpg', 'photo5.jpg'],
      videos: [],
      reviewedBy: 'Администратор',
      reviewDate: '2024-01-14 15:30',
    },
    {
      id: 3,
      product: 'Juicy Bar 30ml',
      productId: '3',
      seller: 'Мария Козлова',
      sellerId: 3,
      quantity: 10,
      reason: 'Не соответствует вкусу, подделка',
      date: '2024-01-13 09:15',
      status: DefectStatus.APPROVED,
      photos: ['photo6.jpg'],
      videos: [],
      reviewedBy: 'Владелец',
      reviewDate: '2024-01-13 11:45',
    },
    {
      id: 4,
      product: 'Pod System X',
      productId: '4',
      seller: 'Алексей Сидоров',
      sellerId: 4,
      quantity: 1,
      reason: 'Не заряжается, не включается',
      date: '2024-01-12 16:45',
      status: DefectStatus.REJECTED,
      photos: ['photo7.jpg', 'photo8.jpg', 'photo9.jpg', 'photo10.jpg'],
      videos: ['video2.mp4', 'video3.mp4'],
      reviewedBy: 'Старший продавец',
      reviewDate: '2024-01-12 17:30',
    },
  ]);

  const mockProducts = [
    { id: '1', name: 'HQD Crystal Bar', category: ProductCategory.DISPOSABLES },
    { id: '2', name: 'Elf Bar 600', category: ProductCategory.DISPOSABLES },
    { id: '3', name: 'Juicy Bar 30ml', category: ProductCategory.LIQUIDS },
    { id: '4', name: 'Pod System X', category: ProductCategory.PODS },
    { id: '5', name: 'Energy Drink 250ml', category: ProductCategory.ENERGY_DRINKS },
  ];

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newPhotos = Array.from(event.target.files).slice(0, 5 - defectPhotos.length);
      setDefectPhotos([...defectPhotos, ...newPhotos]);
    }
  };

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newVideos = Array.from(event.target.files).slice(0, 2 - defectVideos.length);
      setDefectVideos([...defectVideos, ...newVideos]);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setDefectPhotos(defectPhotos.filter((_, i) => i !== index));
  };

  const handleRemoveVideo = (index: number) => {
    setDefectVideos(defectVideos.filter((_, i) => i !== index));
  };

  const handleSubmitDefect = () => {
    if (!selectedProduct || !defectQuantity || !defectReason || defectPhotos.length === 0) {
      alert('Заполните все обязательные поля');
      return;
    }

    const product = mockProducts.find(p => p.name === selectedProduct);
    const newDefect: Defect = {
      id: defects.length + 1,
      product: selectedProduct,
      productId: product?.id || '',
      seller: user?.username || 'Вы',
      sellerId: user?.id || 0,
      quantity: parseInt(defectQuantity),
      reason: defectReason,
      date: new Date().toLocaleString('ru-RU'),
      status: DefectStatus.PENDING,
      photos: defectPhotos.map(p => p.name),
      videos: defectVideos.map(v => v.name),
    };

    setDefects([newDefect, ...defects]);
    setOpenNewDefectDialog(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedProduct('');
    setDefectQuantity('');
    setDefectReason('');
    setDefectPhotos([]);
    setDefectVideos([]);
  };

  const handleDefectAction = (defectId: number, action: DefectStatus) => {
    const reviewedBy = user?.role === UserRole.OWNER ? 'Владелец' :
                      user?.role === UserRole.ADMIN ? 'Администратор' :
                      user?.role === UserRole.SENIOR_SELLER ? 'Старший продавец' :
                      user?.role === UserRole.MENTOR ? 'Наставник' : '';

    setDefects(defects.map(d =>
      d.id === defectId ? {
        ...d,
        status: action,
        reviewedBy,
        reviewDate: new Date().toLocaleString('ru-RU'),
      } : d
    ));
  };

  const toggleDefectExpand = (defectId: number) => {
    setDefects(defects.map(d =>
      d.id === defectId ? { ...d, expanded: !d.expanded } : d
    ));
  };

  const getStatusChip = (status: DefectStatus) => {
    const statusConfig = {
      [DefectStatus.PENDING]: { color: '#ca0ec0', label: 'На рассмотрении', icon: <Warning /> },
      [DefectStatus.REVIEWED]: { color: '#56b8d1', label: 'Просмотрено', icon: <Image /> },
      [DefectStatus.APPROVED]: { color: '#3f1f4b', label: 'Подтверждено', icon: <CheckCircle /> },
      [DefectStatus.REJECTED]: { color: '#6d3f57', label: 'Отклонено', icon: <Cancel /> },
    };

    const config = statusConfig[status];
    return (
      <Chip
        icon={config.icon}
        label={config.label}
        size="small"
        sx={{
          backgroundColor: `${config.color}15`,
          color: config.color,
          border: `1px solid ${config.color}30`,
          fontWeight: 500,
        }}
      />
    );
  };

  const getCategoryColor = (category: ProductCategory): string => {
    const colors = {
      [ProductCategory.DISPOSABLES]: '#674fb6',
      [ProductCategory.LIQUIDS]: '#56b8d1',
      [ProductCategory.CONSUMABLES]: '#2a436d',
      [ProductCategory.PODS]: '#3f1f4b',
      [ProductCategory.ENERGY_DRINKS]: '#6d3f57',
    };
    return colors[category];
  };

  const stats = {
    total: defects.length,
    pending: defects.filter(d => d.status === DefectStatus.PENDING).length,
    approved: defects.filter(d => d.status === DefectStatus.APPROVED).length,
    rejected: defects.filter(d => d.status === DefectStatus.REJECTED).length,
  };

  const pendingDefects = defects.filter(d => d.status === DefectStatus.PENDING);
  const otherDefects = defects.filter(d => d.status !== DefectStatus.PENDING);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4, px: { xs: 1, sm: 2 } }}>
      <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Typography variant="h4" component="h1" color="#2a0f35">
            Учет бракованного товара
          </Typography>
          <Typography variant="body1" color="#4c5454">
            Регистрация и управление бракованным товаром
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }} sx={{ textAlign: { md: 'right' } }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenNewDefectDialog(true)}
            sx={{
              backgroundColor: '#ca0ec0',
              '&:hover': {
                backgroundColor: '#950090',
              },
            }}
          >
            Зарегистрировать брак
          </Button>
        </Grid>
      </Grid>

      {/* Статистика */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card sx={{ backgroundColor: '#ca0ec010', border: '1px solid #ca0ec030' }}>
            <CardContent sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h5" color="#ca0ec0" gutterBottom>
                {stats.pending}
              </Typography>
              <Typography variant="body2" color="#4c5454">
                На рассмотрении
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card sx={{ backgroundColor: '#3f1f4b10', border: '1px solid #3f1f4b30' }}>
            <CardContent sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h5" color="#3f1f4b" gutterBottom>
                {stats.approved}
              </Typography>
              <Typography variant="body2" color="#4c5454">
                Подтверждено
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card sx={{ backgroundColor: '#6d3f5710', border: '1px solid #6d3f5730' }}>
            <CardContent sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h5" color="#6d3f57" gutterBottom>
                {stats.rejected}
              </Typography>
              <Typography variant="body2" color="#4c5454">
                Отклонено
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card sx={{ backgroundColor: '#674fb610', border: '1px solid #674fb630' }}>
            <CardContent sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h5" color="#674fb6" gutterBottom>
                {stats.total}
              </Typography>
              <Typography variant="body2" color="#4c5454">
                Всего заявок
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Ожидающие рассмотрения */}
      {pendingDefects.length > 0 && user?.role !== UserRole.SELLER && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom color="#3f1f4b" sx={{ mb: 2 }}>
            Ожидают рассмотрения
          </Typography>
          <Grid container spacing={2}>
            {pendingDefects.map((defect) => (
              <Grid size={{ xs: 12 }} key={defect.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Person sx={{ color: '#ca0ec0', fontSize: 20 }} />
                          <Typography variant="subtitle1" sx={{ color: '#2a0f35', fontWeight: 600 }}>
                            От: {defect.seller}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Inventory sx={{ color: '#674fb6', fontSize: 20 }} />
                          <Typography variant="subtitle1" sx={{ color: '#2a0f35', fontWeight: 600 }}>
                            Товар: {defect.product}
                          </Typography>
                        </Box>
                      </Box>
                      {getStatusChip(defect.status)}
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="#4c5454" sx={{ mb: 1 }}>
                        Причина брака:
                      </Typography>
                      <Paper sx={{ p: 1.5, backgroundColor: '#f5f3f6' }}>
                        <Typography variant="body2" sx={{ color: '#2a0f35' }}>
                          {defect.reason}
                        </Typography>
                      </Paper>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="#4c5454" sx={{ mb: 1 }}>
                        Количество: 
                        <Chip
                          label={`${defect.quantity} шт.`}
                          size="small"
                          sx={{
                            ml: 1,
                            backgroundColor: '#ca0ec015',
                            color: '#ca0ec0',
                            fontWeight: 500,
                          }}
                        />
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Badge badgeContent={defect.photos.length} color="primary">
                          <PhotoCamera sx={{ color: '#674fb6', fontSize: 20 }} />
                        </Badge>
                        <Badge badgeContent={defect.videos.length} color="secondary">
                          <Videocam sx={{ color: '#2a436d', fontSize: 20 }} />
                        </Badge>
                        <IconButton
                          size="small"
                          onClick={() => setOpenDefectDetails(defect)}
                          sx={{ color: '#2a436d' }}
                        >
                          <Image />
                        </IconButton>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<CheckCircle />}
                          onClick={() => handleDefectAction(defect.id, DefectStatus.APPROVED)}
                          sx={{
                            backgroundColor: '#3f1f4b',
                            '&:hover': { backgroundColor: '#2a0f35' },
                          }}
                        >
                          Подтвердить
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Cancel />}
                          onClick={() => handleDefectAction(defect.id, DefectStatus.REJECTED)}
                          sx={{
                            borderColor: '#6d3f57',
                            color: '#6d3f57',
                            '&:hover': {
                              borderColor: '#4c283a',
                              backgroundColor: 'rgba(109, 63, 87, 0.04)',
                            },
                          }}
                        >
                          Отклонить
                        </Button>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* История заявок */}
      <Typography variant="h6" gutterBottom color="#3f1f4b" sx={{ mb: 2 }}>
        История заявок
      </Typography>
      <Grid container spacing={2}>
        {otherDefects.map((defect) => (
          <Grid size={{ xs: 12 }} key={defect.id}>
            <Card>
              <CardContent>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                  onClick={() => toggleDefectExpand(defect.id)}
                >
                  <Box>
                    <Typography variant="subtitle1" sx={{ color: '#2a0f35', fontWeight: 600 }}>
                      {defect.product} • {defect.seller}
                    </Typography>
                    <Typography variant="body2" color="#4c5454">
                      {defect.date}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {getStatusChip(defect.status)}
                    {defect.expanded ? <ExpandLess /> : <ExpandMore />}
                  </Box>
                </Box>

                <Collapse in={defect.expanded}>
                  <Box sx={{ mt: 2 }}>
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="body2" color="#4c5454" sx={{ mb: 1 }}>
                      Детали:
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Paper sx={{ p: 1.5, backgroundColor: '#f5f3f6' }}>
                          <Typography variant="subtitle2" sx={{ color: '#2a0f35', mb: 1 }}>
                            Причина брака
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#4c5454' }}>
                            {defect.reason}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Paper sx={{ p: 1.5, backgroundColor: '#f5f3f6' }}>
                          <Typography variant="subtitle2" sx={{ color: '#2a0f35', mb: 1 }}>
                            Количество
                          </Typography>
                          <Typography variant="h6" sx={{ color: '#ca0ec0' }}>
                            {defect.quantity} шт.
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>

                    {defect.reviewedBy && (
                      <Paper sx={{ p: 2, mt: 2, backgroundColor: '#56b8d110', border: '1px solid #56b8d130' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Person sx={{ color: '#56b8d1' }} />
                          <Typography variant="subtitle2" sx={{ color: '#2a0f35' }}>
                            Рассмотрено: {defect.reviewedBy}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="#4c5454">
                          Дата: {defect.reviewDate}
                        </Typography>
                      </Paper>
                    )}

                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ color: '#2a0f35', mb: 1 }}>
                        Медиа материалы:
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Chip
                          icon={<PhotoCamera />}
                          label={`${defect.photos.length} фото`}
                          variant="outlined"
                          onClick={() => setOpenDefectDetails(defect)}
                        />
                        {defect.videos.length > 0 && (
                          <Chip
                            icon={<Videocam />}
                            label={`${defect.videos.length} видео`}
                            variant="outlined"
                            onClick={() => setOpenDefectDetails(defect)}
                          />
                        )}
                      </Box>
                    </Box>
                  </Box>
                </Collapse>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Диалог регистрации брака */}
      <Dialog
        open={openNewDefectDialog}
        onClose={() => setOpenNewDefectDialog(false)}
        maxWidth="sm"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            m: { xs: 1, sm: 2 },
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle sx={{ backgroundColor: '#f5f3f6', color: '#2a0f35' }}>
          ⚠️ Регистрация бракованного товара
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Выберите товар</InputLabel>
                <Select
                  value={selectedProduct}
                  label="Выберите товар"
                  onChange={(e) => setSelectedProduct(e.target.value)}
                >
                  {mockProducts.map((product) => (
                    <MenuItem key={product.id} value={product.name}>
                      {product.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Количество бракованного товара"
                value={defectQuantity}
                onChange={(e) => setDefectQuantity(e.target.value)}
                InputProps={{ inputProps: { min: 1 } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Категория"
                value={mockProducts.find(p => p.name === selectedProduct)?.category || ''}
                disabled
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                size="small"
                label="Причина брака"
                value={defectReason}
                onChange={(e) => setDefectReason(e.target.value)}
                placeholder="Опишите подробно причину брака..."
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" gutterBottom color="#3f1f4b">
                Фотографии товара (1-5 фото)
              </Typography>
              <Box sx={{ border: '2px dashed #d7d2d8', p: 2, borderRadius: 1, mb: 2 }}>
                <input
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  id="defect-photo-upload"
                  type="file"
                  onChange={handlePhotoUpload}
                />
                <label htmlFor="defect-photo-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<PhotoCamera />}
                    size="small"
                    sx={{
                      borderColor: '#674fb6',
                      color: '#674fb6',
                      mb: 1,
                    }}
                    disabled={defectPhotos.length >= 5}
                  >
                    Добавить фото ({defectPhotos.length}/5)
                  </Button>
                </label>
                
                {defectPhotos.length > 0 && (
                  <Grid container spacing={1} sx={{ mt: 1 }}>
                    {defectPhotos.map((photo, index) => (
                      <Grid size={{ xs: 6, sm: 4 }} key={index}>
                        <Card variant="outlined">
                          <CardContent sx={{ p: 1, textAlign: 'center' }}>
                            <Typography variant="caption" noWrap fontSize={10}>
                              {photo.name.length > 15 ? photo.name.substring(0, 12) + '...' : photo.name}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() => handleRemovePhoto(index)}
                              sx={{ color: '#ca0ec0', p: 0.5 }}
                            >
                              <Cancel fontSize="small" />
                            </IconButton>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" gutterBottom color="#3f1f4b">
                Видео товара (0-2 видео)
              </Typography>
              <Box sx={{ border: '2px dashed #d7d2d8', p: 2, borderRadius: 1 }}>
                <input
                  accept="video/*"
                  multiple
                  style={{ display: 'none' }}
                  id="defect-video-upload"
                  type="file"
                  onChange={handleVideoUpload}
                />
                <label htmlFor="defect-video-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<Videocam />}
                    size="small"
                    sx={{
                      borderColor: '#2a436d',
                      color: '#2a436d',
                      mb: 1,
                    }}
                    disabled={defectVideos.length >= 2}
                  >
                    Добавить видео ({defectVideos.length}/2)
                  </Button>
                </label>
                
                {defectVideos.length > 0 && (
                  <Grid container spacing={1} sx={{ mt: 1 }}>
                    {defectVideos.map((video, index) => (
                      <Grid size={{ xs: 12, sm: 6 }} key={index}>
                        <Card variant="outlined">
                          <CardContent sx={{ p: 1, textAlign: 'center' }}>
                            <Typography variant="caption" noWrap fontSize={10}>
                              {video.name.length > 15 ? video.name.substring(0, 12) + '...' : video.name}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveVideo(index)}
                              sx={{ color: '#ca0ec0', p: 0.5 }}
                            >
                              <Cancel fontSize="small" />
                            </IconButton>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setOpenNewDefectDialog(false)}
            sx={{ color: '#4c5454' }}
          >
            Отмена
          </Button>
          <Button
            onClick={handleSubmitDefect}
            disabled={!selectedProduct || !defectQuantity || !defectReason || defectPhotos.length === 0}
            variant="contained"
            sx={{
              backgroundColor: '#ca0ec0',
              color: 'white',
              '&:hover': {
                backgroundColor: '#950090',
              },
              '&:disabled': {
                backgroundColor: '#d7d2d8',
              },
            }}
          >
            Отправить заявку
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог просмотра медиа */}
      <Dialog
        open={!!openDefectDetails}
        onClose={() => setOpenDefectDetails(null)}
        maxWidth="md"
        fullWidth
      >
        {openDefectDetails && (
          <>
            <DialogTitle sx={{ backgroundColor: '#f5f3f6', color: '#2a0f35' }}>
              🎬 Медиа материалы брака
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" sx={{ color: '#4c5454', mb: 2 }}>
                {openDefectDetails.product} • {openDefectDetails.seller} • {openDefectDetails.reason}
              </Typography>
              
              {openDefectDetails.photos.length > 0 && (
                <>
                  <Typography variant="h6" sx={{ color: '#2a0f35', mb: 2 }}>
                    Фотографии ({openDefectDetails.photos.length})
                  </Typography>
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    {openDefectDetails.photos.map((photo, index) => (
                      <Grid size={{ xs: 12, sm: 6 }} key={index}>
                        <Card>
                          <CardContent sx={{ p: 2, textAlign: 'center' }}>
                            <Box sx={{ 
                              width: '100%', 
                              height: 200, 
                              backgroundColor: '#f5f3f6',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              mb: 1,
                            }}>
                              <Image sx={{ fontSize: 60, color: '#674fb6', opacity: 0.5 }} />
                            </Box>
                            <Typography variant="body2" color="#4c5454">
                              Фото {index + 1}: {photo}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </>
              )}

              {openDefectDetails.videos.length > 0 && (
                <>
                  <Typography variant="h6" sx={{ color: '#2a0f35', mb: 2 }}>
                    Видео ({openDefectDetails.videos.length})
                  </Typography>
                  <Grid container spacing={2}>
                    {openDefectDetails.videos.map((video, index) => (
                      <Grid size={{ xs: 12, sm: 6 }} key={index}>
                        <Card>
                          <CardContent sx={{ p: 2, textAlign: 'center' }}>
                            <Box sx={{ 
                              width: '100%', 
                              height: 200, 
                              backgroundColor: '#2a436d',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              mb: 1,
                              borderRadius: 1,
                            }}>
                              <Movie sx={{ fontSize: 60, color: 'white', opacity: 0.8 }} />
                            </Box>
                            <Typography variant="body2" color="#4c5454">
                              Видео {index + 1}: {video}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDefectDetails(null)} sx={{ color: '#4c5454' }}>
                Закрыть
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default DefectsPage;