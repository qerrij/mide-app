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
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Divider,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Stack,
  Chip,
  SelectChangeEvent,
  TextField,
  useTheme,
  useMediaQuery,
  Fab,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  ArrowBack as BackIcon,
  PhotoCamera as PhotoIcon,
  Videocam as VideoIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Remove as RemoveIcon,
  PlayArrow as PlayIcon,
  Inventory as InventoryIcon,
  Info as InfoIcon,
  ExitToApp as ExitToAppIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { rejectionService } from '../../api/rejectionService';
import { AvailableProduct, RejectionItemCreate } from '../../types';

const CreateDefectPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [step, setStep] = useState(0);
  const [availableProducts, setAvailableProducts] = useState<AvailableProduct[]>([]);
  const [selectedItems, setSelectedItems] = useState<RejectionItemCreate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [videoPreviews, setVideoPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);

  // Поддерживаемые расширения видеофайлов
  const videoExtensions = [
    '.mp4', '.m4v', '.m4a', '.mov', '.qt', '.avi', '.wmv', '.asf',
    '.flv', '.f4v', '.webm', '.ogv', '.3gp', '.3g2', '.mpeg',
    '.mpg', '.mpe', '.m1v', '.m2v', '.mkv', '.divx', '.vob'
  ];

  useEffect(() => {
    loadAvailableProducts();
  }, []);

  useEffect(() => {
    if (availableProducts.length > 0) {
      const uniqueCategories = Array.from(
        new Set(availableProducts.map(p => p.categoryName || 'Без категории'))
      );
      setCategories(uniqueCategories);
    }
  }, [availableProducts]);

  // Скролл к верху страницы при смене шага
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const loadAvailableProducts = async () => {
    try {
      setLoading(true);
      const products = await rejectionService.getAvailableProducts();
      setAvailableProducts(products);
      setError('');
    } catch (err: any) {
      setError('Ошибка загрузки доступных товаров');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedProduct = () => {
    if (!selectedProductId) return null;
    const productId = parseInt(selectedProductId, 10);
    return availableProducts.find(p => p.productId === productId);
  };

  // Фильтрация доступных товаров по категории
  const getAvailableProductsForCategory = (): AvailableProduct[] => {
    if (!selectedCategoryId) return [];
    return availableProducts.filter(
      p => (p.categoryName || 'Без категории') === selectedCategoryId
    );
  };

  const handleAddItem = () => {
    if (!selectedProductId || !quantity || parseInt(quantity) <= 0) {
      setError('Выберите товар и укажите количество');
      return;
    }

    const product = getSelectedProduct();
    if (!product) {
      setError('Товар не найден');
      return;
    }

    const productId = parseInt(selectedProductId, 10);
    const existingItemIndex = selectedItems.findIndex(
      item => item.productId === productId
    );

    const newQuantity = parseInt(quantity, 10);
    const availableQty = product.availableQuantity;
    const currentQty = existingItemIndex >= 0 ? selectedItems[existingItemIndex].quantity : 0;

    if (currentQty + newQuantity > availableQty) {
      setError(`Доступно только ${availableQty} единиц этого товара`);
      return;
    }

    if (existingItemIndex >= 0) {
      const updatedItems = [...selectedItems];
      updatedItems[existingItemIndex].quantity += newQuantity;
      setSelectedItems(updatedItems);
    } else {
      setSelectedItems([
        ...selectedItems,
        { productId, quantity: newQuantity },
      ]);
    }

    setQuantity('');
    setSelectedProductId('');
    setError('');
  };

  const handleRemoveItem = (productId: number) => {
    setSelectedItems(selectedItems.filter(item => item.productId !== productId));
  };

  const handleUpdateQuantity = (productId: number, newQuantity: number) => {
    const product = availableProducts.find(p => p.productId === productId);
    if (!product) return;

    if (newQuantity > product.availableQuantity) {
      setError(`Доступно только ${product.availableQuantity} единиц этого товара`);
      return;
    }

    if (newQuantity <= 0) {
      handleRemoveItem(productId);
      return;
    }

    setSelectedItems(
      selectedItems.map(item =>
        item.productId === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newPhotos = Array.from(files);
      if (photos.length + newPhotos.length > 10) {
        setError('Максимум 10 фотографий');
        return;
      }
      
      setPhotos([...photos, ...newPhotos]);
      
      newPhotos.forEach(photo => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPhotoPreviews(prev => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(photo);
      });
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newVideos = Array.from(files);
      
      const invalidVideos = newVideos.filter(video => {
        const extension = '.' + video.name.split('.').pop()?.toLowerCase();
        return !videoExtensions.includes(extension || '');
      });

      if (invalidVideos.length > 0) {
        setError(`Неподдерживаемые форматы видео: ${invalidVideos.map(v => v.name).join(', ')}`);
        return;
      }

      if (videos.length + newVideos.length > 5) {
        setError('Максимум 5 видео');
        return;
      }
      
      setVideos([...videos, ...newVideos]);
      
      newVideos.forEach(video => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setVideoPreviews(prev => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(video);
      });
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
    setPhotoPreviews(photoPreviews.filter((_, i) => i !== index));
  };

  const removeVideo = (index: number) => {
    setVideos(videos.filter((_, i) => i !== index));
    setVideoPreviews(videoPreviews.filter((_, i) => i !== index));
  };

  const getItemDetails = (productId: number) => {
    return availableProducts.find(p => p.productId === productId);
  };

  const calculateTotal = () => {
    return selectedItems.reduce((total, item) => {
      const product = getItemDetails(item.productId);
      return total + (product?.price || 0) * item.quantity;
    }, 0);
  };

  const validateStep = (stepNumber: number): boolean => {
    setError('');

    switch (stepNumber) {
      case 0:
        if (selectedItems.length === 0) {
          setError('Добавьте хотя бы один товар');
          return false;
        }
        return true;
      case 1:
        if (photos.length === 0) {
          setError('Добавьте хотя бы одну фотографию');
          return false;
        }
        if (videos.length === 0) {
          setError('Добавьте хотя бы одно видео');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleExitClick = () => {
    const hasData = selectedItems.length > 0 || photos.length > 0 || videos.length > 0 || comment;
    if (hasData) {
      setExitDialogOpen(true);
    } else {
      navigate('/defects');
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError('');

      const rejectionData = {
        items: selectedItems,
        comment: comment || undefined,
      };

      await rejectionService.createRejection(rejectionData, photos, videos);
      
      setSuccessDialogOpen(true);
      setTimeout(() => {
        navigate('/defects');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка при создании брака');
    } finally {
      setSubmitting(false);
    }
  };

  const getPhotoPreviewUrl = (photo: File): string => {
    return URL.createObjectURL(photo);
  };

  const getVideoPreviewUrl = (video: File): string => {
    return URL.createObjectURL(video);
  };

  const openImageDialog = (preview: string) => {
    setSelectedImage(preview);
  };

  const closeImageDialog = () => {
    setSelectedImage(null);
  };

  const openVideoDialog = (preview: string) => {
    setSelectedVideo(preview);
    setVideoDialogOpen(true);
  };

  const closeVideoDialog = () => {
    setSelectedVideo(null);
    setVideoDialogOpen(false);
  };

  const totalValue = calculateTotal();
  const filteredProducts = getAvailableProductsForCategory();
  const showProductSelect = selectedCategoryId !== '';
  const showQuantityAndAdd = showProductSelect && selectedProductId !== '';

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      backgroundColor: '#f5f3f6', 
      pt: { xs: 4, md: 8 }
    }}>

      <Container 
        maxWidth="md" 
        sx={{ 
          px: { xs: 1, sm: 2, md: 3 },
        }}
      >

        <Paper
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 8,
            backgroundColor: '#ffffff',
            boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
            width: '100%',
          }}
        >
          <Typography variant="h5" gutterBottom color="#2a0f35" fontWeight={600} sx={{ mb: 3 }}>
            {step === 0 && 'Выбор товаров с браком'}
            {step === 1 && 'Фотографии и видео брака'}
            {step === 2 && 'Подтверждение создания брака'}
          </Typography>

          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                borderRadius: 4,
                backgroundColor: 'rgba(202, 14, 192, 0.08)',
                border: '1px solid rgba(202, 14, 192, 0.2)',
                color: '#ca0ec0',
                '& .MuiAlert-icon': { color: '#ca0ec0' },
              }}
              onClose={() => setError('')}
            >
              {error}
            </Alert>
          )}

          {/* Шаг 1: Выбор товаров */}
          {step === 0 && (
            <>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress sx={{ color: '#674fb6' }} />
                </Box>
              ) : availableProducts.length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: 4, mb: 3 }}>
                  У вас нет доступных товаров для брака
                </Alert>
              ) : (
                <>
                  {/* Выбор категории */}
                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel id="category-label">Категория</InputLabel>
                    <Select
                      labelId="category-label"
                      value={selectedCategoryId}
                      label="Категория"
                      onChange={(e: SelectChangeEvent) => {
                        setSelectedCategoryId(e.target.value);
                        setSelectedProductId('');
                        setQuantity('');
                      }}
                      MenuProps={{
                        disableScrollLock: true,
                      }}
                      sx={{
                        borderRadius: 4,
                        backgroundColor: '#f8f7fa',
                      }}
                    >
                      <MenuItem value="">
                        <em>Выберите категорию</em>
                      </MenuItem>
                      {categories.map(category => (
                        <MenuItem key={category} value={category}>
                          {category}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Выбор товара */}
                  {showProductSelect && (
                    <FormControl fullWidth sx={{ mb: 3 }}>
                      <InputLabel id="product-label">Товар</InputLabel>
                      <Select
                        labelId="product-label"
                        value={selectedProductId}
                        label="Товар"
                        onChange={(e: SelectChangeEvent) => {
                          setSelectedProductId(e.target.value);
                          setQuantity('');
                        }}
                        MenuProps={{
                          disableScrollLock: true,
                        }}
                        sx={{
                          borderRadius: 4,
                          backgroundColor: '#f8f7fa',
                        }}
                      >
                        <MenuItem value="">
                          <em>Выберите товар</em>
                        </MenuItem>
                        {filteredProducts.map(product => (
                          <MenuItem key={product.productId} value={product.productId.toString()}>
                            {product.productName} - {product.availableQuantity} шт.
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}

                  {/* Количество и кнопка добавления */}
                  {showQuantityAndAdd && (
                    <Grid container spacing={2} sx={{ mb: 4 }}>
                      <Grid size={{ xs: 8, sm: 9, md: 10 }}>
                        <TextField
                          fullWidth
                          label="Количество"
                          type="number"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          inputProps={{ min: 1 }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 4,
                              backgroundColor: '#f8f7fa',
                            },
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 4, sm: 3, md: 2 }}>
                        <Button
                          fullWidth
                          variant="contained"
                          onClick={handleAddItem}
                          disabled={!quantity || parseInt(quantity) <= 0}
                          sx={{
                            borderRadius: 4,
                            backgroundColor: '#674fb6',
                            '&:hover': { backgroundColor: '#483399' },
                            height: '56px',
                            minWidth: { xs: 'auto', sm: '100px' },
                            px: { xs: 1, sm: 2 },
                            fontSize: { xs: '0.8rem', sm: '0.875rem' },
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <AddIcon sx={{ 
                            mr: { xs: 0.5, sm: 1 },
                            fontSize: { xs: 18, sm: 20 }
                          }} />
                          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                            Добавить
                          </Box>
                        </Button>
                      </Grid>
                    </Grid>
                  )}

                  {/* Список добавленных товаров */}
                  {selectedItems.length > 0 && (
                    <Box sx={{ mt: 4 }}>
                      <Divider sx={{ mb: 3 }} />
                      
                      <Typography variant="subtitle1" color="#2a0f35" fontWeight={600} sx={{ mb: 2 }}>
                        Добавленные товары ({selectedItems.length})
                      </Typography>

                      <Stack spacing={2}>
                        {selectedItems.map((item) => {
                          const product = getItemDetails(item.productId);
                          return (
                            <Card
                              key={item.productId}
                              sx={{
                                p: 2,
                                borderRadius: 4,
                                backgroundColor: '#f8f7fa',
                                border: '1px solid rgba(103, 79, 182, 0.1)',
                              }}
                            >
                              <Grid container spacing={2} alignItems="center">
                                <Grid size={{ xs: 12, sm: 5 }}>
                                  <Typography variant="body2" fontWeight={600} color="#2a0f35">
                                    {product?.productName}
                                  </Typography>
                                  <Typography variant="caption" color="#4c5454">
                                    {product?.categoryName || 'Без категории'}
                                  </Typography>
                                </Grid>

                                <Grid size={{ xs: 6, sm: 4 }}>
                                  <TextField
                                    label="Кол-во"
                                    type="number"
                                    size="small"
                                    value={item.quantity}
                                    onChange={(e) => handleUpdateQuantity(item.productId, parseInt(e.target.value) || 0)}
                                    inputProps={{ min: 1, max: product?.availableQuantity }}
                                    error={item.quantity > (product?.availableQuantity || 0)}
                                    helperText={item.quantity > (product?.availableQuantity || 0) ? `Макс: ${product?.availableQuantity}` : ''}
                                    fullWidth
                                    sx={{
                                      '& .MuiOutlinedInput-root': {
                                        borderRadius: 4,
                                        backgroundColor: '#ffffff',
                                      },
                                    }}
                                  />
                                </Grid>

                                <Grid size={{ xs: 6, sm: 3 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                    <Box sx={{ textAlign: 'right', mr: 1 }}>
                                      <Typography variant="body2" fontWeight={600} color="#d32f2f">
                                        {((product?.price || 0) * item.quantity).toLocaleString('ru-RU')} ₽
                                      </Typography>
                                      <Typography variant="caption" color="#4c5454" display="block">
                                        {product?.price?.toLocaleString('ru-RU')} ₽/шт
                                      </Typography>
                                    </Box>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleRemoveItem(item.productId)}
                                      sx={{ color: '#ca0ec0' }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Box>
                                </Grid>
                              </Grid>
                            </Card>
                          );
                        })}
                      </Stack>

                      {/* Итоговая сумма */}
                      <Card
                        sx={{
                          mt: 2,
                          p: 2,
                          borderRadius: 4,
                          backgroundColor: '#ffebee',
                          border: '1px solid #ffcdd2',
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body1" color="#b3261e" fontWeight={600}>
                            Общая сумма брака:
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
                    </Box>
                  )}
                </>
              )}
            </>
          )}

          {/* Шаг 2: Фотографии и видео */}
          {step === 1 && (
            <>
              {/* Фотографии */}
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="photo-upload"
                type="file"
                multiple
                onChange={handlePhotoUpload}
              />
              
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle1" color="#2a0f35" fontWeight={600} gutterBottom>
                  Фотографии *
                </Typography>
                
                <Box
                  sx={{
                    border: '2px dashed rgba(103, 79, 182, 0.3)',
                    p: 3,
                    borderRadius: 4,
                    textAlign: 'center',
                    mb: 2,
                    backgroundColor: '#f8f7fa',
                    cursor: photos.length >= 10 ? 'not-allowed' : 'pointer',
                    opacity: photos.length >= 10 ? 0.6 : 1,
                    transition: 'all 0.2s',
                    '&:hover': photos.length < 10 ? {
                      borderColor: '#674fb6',
                      backgroundColor: 'rgba(103, 79, 182, 0.02)',
                    } : {},
                  }}
                  onClick={() => {
                    if (photos.length < 10) {
                      document.getElementById('photo-upload')?.click();
                    }
                  }}
                >
                  <PhotoIcon sx={{ fontSize: 40, color: '#674fb6', mb: 1 }} />
                  <Typography variant="body2" color="#2a0f35" fontWeight={500}>
                    {photos.length > 0 ? 'Добавить еще фотографии' : 'Прикрепить фотографии брака'}
                  </Typography>
                  <Typography variant="caption" color="#4c5454" display="block" sx={{ mt: 1 }}>
                    {photos.length}/10 фотографий • Нажмите для загрузки
                  </Typography>
                </Box>

                {photos.length > 0 && (
                  <Grid container spacing={1.5}>
                    {photos.map((photo, index) => {
                      const photoUrl = getPhotoPreviewUrl(photo);
                      
                      return (
                        <Grid size={{ xs: 6, sm: 4, md: 3 }} key={index}>
                          <Box
                            sx={{
                              position: 'relative',
                              width: '100%',
                              paddingBottom: '100%',
                              borderRadius: 4,
                              overflow: 'hidden',
                              cursor: 'pointer',
                              backgroundImage: `url(${photoUrl})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              transition: 'transform 0.2s ease',
                              '&:hover': {
                                transform: { xs: 'none', md: 'scale(1.02)' },
                              },
                            }}
                            onClick={() => openImageDialog(photoUrl)}
                          >
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 8,
                                left: 8,
                                backgroundColor: 'rgba(103, 79, 182, 0.9)',
                                borderRadius: 4,
                                px: 1,
                                py: 0.5,
                                zIndex: 1,
                              }}
                            >
                              <Typography variant="caption" sx={{ color: 'white', fontWeight: 600 }}>
                                Фото
                              </Typography>
                            </Box>
                            <IconButton
                              size="small"
                              sx={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                backgroundColor: 'rgba(42, 15, 53, 0.6)',
                                backdropFilter: 'blur(4px)',
                                zIndex: 1,
                                '&:hover': { backgroundColor: 'rgba(42, 15, 53, 0.8)' },
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                removePhoto(index);
                              }}
                            >
                              <CloseIcon sx={{ color: 'white', fontSize: 16 }} />
                            </IconButton>
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>
                )}
              </Box>

              {/* Видео */}
              <input
                accept={videoExtensions.join(',')}
                style={{ display: 'none' }}
                id="video-upload"
                type="file"
                multiple
                onChange={handleVideoUpload}
              />
              
              <Box>
                <Typography variant="subtitle1" color="#2a0f35" fontWeight={600} gutterBottom>
                  Видео *
                </Typography>
                
                <Box
                  sx={{
                    border: '2px dashed rgba(103, 79, 182, 0.3)',
                    p: 3,
                    borderRadius: 4,
                    textAlign: 'center',
                    mb: 2,
                    backgroundColor: '#f8f7fa',
                    cursor: videos.length >= 5 ? 'not-allowed' : 'pointer',
                    opacity: videos.length >= 5 ? 0.6 : 1,
                    transition: 'all 0.2s',
                    '&:hover': videos.length < 5 ? {
                      borderColor: '#674fb6',
                      backgroundColor: 'rgba(103, 79, 182, 0.02)',
                    } : {},
                  }}
                  onClick={() => {
                    if (videos.length < 5) {
                      document.getElementById('video-upload')?.click();
                    }
                  }}
                >
                  <VideoIcon sx={{ fontSize: 40, color: '#674fb6', mb: 1 }} />
                  <Typography variant="body2" color="#2a0f35" fontWeight={500}>
                    {videos.length > 0 ? 'Добавить еще видео' : 'Прикрепить видео брака'}
                  </Typography>
                  <Typography variant="caption" color="#4c5454" display="block" sx={{ mt: 1 }}>
                    {videos.length}/5 видео • Нажмите для загрузки
                  </Typography>
                </Box>

                {videos.length > 0 && (
                  <Grid container spacing={1.5}>
                    {videos.map((video, index) => {
                      const videoUrl = getVideoPreviewUrl(video);
                      
                      return (
                        <Grid size={{ xs: 12, sm: 6 }} key={index}>
                          <Box
                            sx={{
                              position: 'relative',
                              width: '100%',
                              height: 160,
                              borderRadius: 4,
                              overflow: 'hidden',
                              cursor: 'pointer',
                              backgroundColor: '#000',
                              transition: 'transform 0.2s ease',
                              '&:hover': {
                                transform: { xs: 'none', md: 'scale(1.01)' },
                              },
                            }}
                            onClick={() => openVideoDialog(videoUrl)}
                          >
                            <video
                              src={videoUrl}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 8,
                                left: 8,
                                backgroundColor: 'rgba(103, 79, 182, 0.9)',
                                borderRadius: 4,
                                px: 1,
                                py: 0.5,
                                zIndex: 1,
                              }}
                            >
                              <Typography variant="caption" sx={{ color: 'white', fontWeight: 600 }}>
                                Видео
                              </Typography>
                            </Box>
                            <Box
                              sx={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                backgroundColor: 'rgba(42, 15, 53, 0.6)',
                                borderRadius: '50%',
                                width: 48,
                                height: 48,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backdropFilter: 'blur(4px)',
                                zIndex: 1,
                              }}
                            >
                              <PlayIcon sx={{ color: 'white', fontSize: 24 }} />
                            </Box>
                            <IconButton
                              size="small"
                              sx={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                backgroundColor: 'rgba(42, 15, 53, 0.6)',
                                backdropFilter: 'blur(4px)',
                                zIndex: 1,
                                '&:hover': { backgroundColor: 'rgba(42, 15, 53, 0.8)' },
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                removeVideo(index);
                              }}
                            >
                              <CloseIcon sx={{ color: 'white', fontSize: 16 }} />
                            </IconButton>
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>
                )}
              </Box>
            </>
          )}

          {/* Шаг 3: Подтверждение */}
          {step === 2 && (
            <Stack spacing={3}>
              <TextField
                fullWidth
                label="Комментарий (необязательно)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                multiline
                rows={3}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 4,
                    backgroundColor: '#f8f7fa',
                  },
                }}
              />

              <Card sx={{ 
                borderRadius: 4, 
                backgroundColor: 'rgba(63, 31, 75, 0.04)',
                border: '1px solid rgba(63, 31, 75, 0.1)',
              }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="subtitle2" color="#2a0f35" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <InventoryIcon sx={{ color: '#3f1f4b', fontSize: 20 }} />
                    Сводка по браку
                  </Typography>
                  
                  <Divider sx={{ my: 2, borderColor: 'rgba(63, 31, 75, 0.1)' }} />
                  
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                        Позиций
                      </Typography>
                      <Typography variant="h6" color="#2a0f35" fontWeight={600}>
                        {selectedItems.length}
                      </Typography>
                    </Grid>
                    
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                        Количество
                      </Typography>
                      <Typography variant="h6" color="#2a0f35" fontWeight={600}>
                        {selectedItems.reduce((s, p) => s + p.quantity, 0)}
                      </Typography>
                    </Grid>
                    
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                        Фотографии
                      </Typography>
                      <Typography variant="h6" color="#2a0f35" fontWeight={600}>
                        {photos.length}
                      </Typography>
                    </Grid>
                    
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                        Видео
                      </Typography>
                      <Typography variant="h6" color="#2a0f35" fontWeight={600}>
                        {videos.length}
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed rgba(63, 31, 75, 0.2)' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body1" color="#4c5454">
                        Общая сумма брака:
                      </Typography>
                      <Typography variant="h5" color="#d32f2f" fontWeight={700}>
                        {totalValue.toLocaleString('ru-RU', {
                          style: 'currency',
                          currency: 'RUB',
                          minimumFractionDigits: 0,
                        })}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              <Alert severity="info" sx={{ borderRadius: 4 }}>
                После создания брак будет отправлен на проверку
              </Alert>
            </Stack>
          )}

          {/* Кнопки навигации */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            {step > 0 ? (
              <Button
                variant="outlined"
                onClick={handleBack}
                sx={{
                  borderRadius: 4,
                  borderColor: '#d8d1e0',
                  color: '#674fb6',
                  '&:hover': {
                    borderColor: '#674fb6',
                    backgroundColor: 'rgba(103, 79, 182, 0.04)',
                  },
                }}
              >
                Назад
              </Button>
            ) : (
              <Button
                variant="outlined"
                onClick={handleExitClick}
                sx={{
                  borderRadius: 4,
                  borderColor: '#d8d1e0',
                  color: '#ca0ec0',
                  '&:hover': {
                    borderColor: '#ca0ec0',
                    backgroundColor: 'rgba(202, 14, 192, 0.04)',
                  },
                }}
              >
                Выйти
              </Button>
            )}
            
            <Box sx={{ flex: 1 }} />
            
            {step < 2 ? (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={step === 0 && selectedItems.length === 0}
                sx={{
                  borderRadius: 4,
                  backgroundColor: '#674fb6',
                  '&:hover': { backgroundColor: '#483399' },
                  px: 4,
                }}
              >
                Далее
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={() => setConfirmDialogOpen(true)}
                disabled={submitting}
                sx={{
                  borderRadius: 4,
                  backgroundColor: '#3f1f4b',
                  '&:hover': { backgroundColor: '#2a0f35' },
                  px: 4,
                }}
              >
                {submitting ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Создать брак'}
              </Button>
            )}
          </Box>
        </Paper>
      </Container>

      {/* Диалог подтверждения выхода */}
      <Dialog
        open={exitDialogOpen}
        onClose={() => setExitDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 4,
            maxWidth: { xs: '90%', sm: 450 },
            width: '100%',
            m: 2,
          },
        }}
      >
        <DialogTitle sx={{ p: 2.5, pb: 1 }}>
          <Typography variant="h6" color="#2a0f35" fontWeight={600}>
            Прервать создание брака?
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 2.5, pt: 2 }}>
          <Typography variant="body1" color="#4c5454">
            Введенные данные не сохранятся. Вы уверены, что хотите выйти?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1, gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
          <Button
            onClick={() => setExitDialogOpen(false)}
            sx={{
              borderRadius: 4,
              color: '#4c5454',
              px: 3,
              py: 1,
              textTransform: 'none',
              fontSize: { xs: '0.85rem', sm: '0.95rem' },
              fontWeight: 500,
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            Продолжить
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setExitDialogOpen(false);
              navigate('/defects');
            }}
            sx={{
              borderRadius: 4,
              backgroundColor: '#ca0ec0',
              '&:hover': { backgroundColor: '#950090' },
              px: 3,
              py: 1,
              textTransform: 'none',
              fontSize: { xs: '0.85rem', sm: '0.95rem' },
              fontWeight: 500,
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            Выйти
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог подтверждения создания */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 4,
            maxWidth: 520,
            width: '100%',
            m: 2,
            boxShadow: '0 8px 24px rgba(106, 61, 122, 0.15)',
          },
        }}
      >
        <DialogTitle sx={{ p: 2.5, pb: 1 }}>
          <Typography variant="h6" color="#2a0f35" fontWeight={600} sx={{ mb: 0.5 }}>
            Подтверждение создания брака
          </Typography>
          <Typography variant="body2" color="#4c5454" sx={{ fontSize: '0.85rem' }}>
            Проверьте данные перед отправкой
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

            <Box sx={{ 
              p: 2, 
              backgroundColor: '#f8f7fa',
              borderRadius: 4,
            }}>
              <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                СОСТАВ БРАКА
              </Typography>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid size={{ xs: 4 }}>
                  <Typography variant="body2" color="#4c5454">
                    Позиции
                  </Typography>
                  <Typography variant="body1" color="#2a0f35" fontWeight={600}>
                    {selectedItems.length}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Typography variant="body2" color="#4c5454">
                    Количество
                  </Typography>
                  <Typography variant="body1" color="#2a0f35" fontWeight={600}>
                    {selectedItems.reduce((s, p) => s + p.quantity, 0)} шт.
                  </Typography>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Typography variant="body2" color="#4c5454">
                    Медиа
                  </Typography>
                  <Typography variant="body1" color="#2a0f35" fontWeight={600}>
                    {photos.length + videos.length} файлов
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            {comment && (
              <Box sx={{ 
                p: 2, 
                backgroundColor: '#f8f7fa',
                borderRadius: 4,
              }}>
                <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                  КОММЕНТАРИЙ
                </Typography>
                <Typography variant="body2" color="#2a0f35">
                  {comment}
                </Typography>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}>
          <Button
            onClick={() => setConfirmDialogOpen(false)}
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
            onClick={handleSubmit}
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
            {submitting ? 'Создание...' : 'Создать брак'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог успеха */}
      <Dialog
        open={successDialogOpen}
        onClose={() => {
          setSuccessDialogOpen(false);
          navigate('/defects');
        }}
        PaperProps={{
          sx: {
            borderRadius: 4,
            maxWidth: 400,
            width: '100%',
            m: 2,
            boxShadow: '0 8px 24px rgba(106, 61, 122, 0.15)',
          },
        }}
      >
        <DialogContent sx={{ textAlign: 'center', py: 4, px: 3 }}>
          <CheckCircleIcon sx={{ fontSize: 80, color: '#3f1f4b', mb: 2 }} />
          <Typography variant="h5" color="#2a0f35" fontWeight={600} gutterBottom>
            Брак создан!
          </Typography>
          <Typography variant="body2" color="#4c5454">
            Брак отправлен на проверку
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 4 }}>
          <Button
            variant="contained"
            onClick={() => {
              setSuccessDialogOpen(false);
              navigate('/defects');
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
            К списку браков
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог просмотра изображения */}
      <Dialog
        open={!!selectedImage}
        onClose={closeImageDialog}
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
            Просмотр фотографии
          </Typography>
          <IconButton onClick={closeImageDialog}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 2, backgroundColor: '#000' }}>
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
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Диалог просмотра видео */}
      <Dialog
        open={videoDialogOpen}
        onClose={closeVideoDialog}
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
          <IconButton onClick={closeVideoDialog}>
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
      </Dialog>
    </Box>
  );
};

export default CreateDefectPage;