import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  IconButton,
  Paper,
  Stack,
  Divider,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  PhotoCamera as PhotoIcon,
  Videocam as VideoIcon,
  Delete as DeleteIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { rejectionService } from '../api/rejectionService';
import { AvailableProduct, RejectionItemCreate } from '../types';
import ConfirmationDialog from '../components/rejection/ConfirmationDialog';

const CreateDefectPage: React.FC = () => {
  const navigate = useNavigate();
  const [availableProducts, setAvailableProducts] = useState<AvailableProduct[]>([]);
  const [selectedItems, setSelectedItems] = useState<RejectionItemCreate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [productsInCategory, setProductsInCategory] = useState<AvailableProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [success, setSuccess] = useState(false);

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

  useEffect(() => {
    if (selectedCategory) {
      const filtered = availableProducts.filter(
        p => (p.categoryName || 'Без категории') === selectedCategory
      );
      setProductsInCategory(filtered);
      setSelectedProductId('');
    } else {
      setProductsInCategory([]);
      setSelectedProductId('');
    }
  }, [selectedCategory, availableProducts]);

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
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newVideos = Array.from(files);
      if (videos.length + newVideos.length > 5) {
        setError('Максимум 5 видео');
        return;
      }
      setVideos([...videos, ...newVideos]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const removeVideo = (index: number) => {
    setVideos(videos.filter((_, i) => i !== index));
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

  const validateForm = () => {
    if (selectedItems.length === 0) {
      setError('Добавьте хотя бы один товар');
      return false;
    }

    if (photos.length === 0) {
      setError('Добавьте хотя бы одну фотографию');
      return false;
    }

    if (videos.length === 0) {
      setError('Добавьте хотя бы одно видео');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      setError('');

      const rejectionData = {
        items: selectedItems,
        comment: comment || undefined,
      };

      await rejectionService.createRejection(rejectionData, photos, videos);
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/defects');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка при создании брака');
    } finally {
      setSubmitting(false);
    }
  };

  const totalValue = calculateTotal();

  return (
    <Box>
      <Button
        startIcon={<BackIcon />}
        onClick={() => navigate('/defects')}
        sx={{ mb: 3 }}
      >
        Назад к списку
      </Button>

      <Typography variant="h4" component="h1" gutterBottom>
        Создание брака
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Брак успешно создан! Перенаправляем на список браков...
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Левая колонка - добавление товаров */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Добавить товары
              </Typography>

              {loading ? (
                <Box sx={{ my: 2 }}>
                  <LinearProgress />
                  <Typography align="center" sx={{ mt: 1 }}>
                    Загрузка товаров...
                  </Typography>
                </Box>
              ) : availableProducts.length === 0 ? (
                <Alert severity="info">
                  У вас нет доступных товаров для брака
                </Alert>
              ) : (
                <>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                      <FormControl fullWidth>
                        <InputLabel>Категория</InputLabel>
                        <Select
                          value={selectedCategory}
                          label="Категория"
                          onChange={(e: SelectChangeEvent) =>
                            setSelectedCategory(e.target.value)
                          }
                        >
                          {categories.map(category => (
                            <MenuItem key={category} value={category}>
                              {category}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                      <FormControl fullWidth disabled={!selectedCategory}>
                        <InputLabel>Товар</InputLabel>
                        <Select
                          value={selectedProductId}
                          label="Товар"
                          onChange={(e: SelectChangeEvent) =>
                            setSelectedProductId(e.target.value)
                          }
                          displayEmpty
                        >
                          <MenuItem value="">
                            <em>Выберите товар</em>
                          </MenuItem>
                          {productsInCategory.map(product => (
                            <MenuItem key={product.productId} value={product.productId.toString()}>
                              {product.productName} (SKU: {product.productSku}) - 
                              Доступно: {product.availableQuantity} шт.
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid size={{ xs: 8 }}>
                      <TextField
                        fullWidth
                        label="Количество"
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        disabled={!selectedProductId}
                        InputProps={{
                          inputProps: { min: 1 }
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleAddItem}
                        disabled={!selectedProductId || !quantity || parseInt(quantity) <= 0}
                        sx={{ height: '56px' }}
                      >
                        Добавить
                      </Button>
                    </Grid>
                  </Grid>
                </>
              )}
            </CardContent>
          </Card>

          {/* Выбранные товары */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Выбранные товары ({selectedItems.length})
              </Typography>

              {selectedItems.length === 0 ? (
                <Alert severity="info">Товары не добавлены</Alert>
              ) : (
                <Stack spacing={2}>
                  {selectedItems.map((item) => {
                    const product = getItemDetails(item.productId);
                    return (
                      <Paper key={item.productId} variant="outlined" sx={{ p: 2 }}>
                        <Grid container alignItems="center" spacing={2}>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <Typography variant="subtitle1">
                              {product?.productName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              SKU: {product?.productSku} | 
                              Категория: {product?.categoryName}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 6, sm: 3 }}>
                            <TextField
                              fullWidth
                              label="Кол-во"
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateQuantity(
                                  item.productId,
                                  Number(e.target.value) || 0
                                )
                              }
                              InputProps={{
                                inputProps: { min: 1, max: product?.availableQuantity }
                              }}
                            />
                          </Grid>
                          <Grid size={{ xs: 4, sm: 2 }}>
                            <Typography variant="body2">
                              {((product?.price || 0) * item.quantity).toLocaleString('ru-RU', {
                                style: 'currency',
                                currency: 'RUB',
                                minimumFractionDigits: 0,
                              })}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 2, sm: 1 }}>
                            <IconButton
                              color="error"
                              onClick={() => handleRemoveItem(item.productId)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Grid>
                        </Grid>
                      </Paper>
                    );
                  })}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Правая колонка - фото/видео и комментарий */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Фотографии (обязательно)
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Добавьте фотографии брака. Максимум 10 файлов.
              </Typography>

              <Box sx={{ mb: 2 }}>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="photo-upload"
                  type="file"
                  multiple
                  onChange={handlePhotoUpload}
                />
                <label htmlFor="photo-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<PhotoIcon />}
                    fullWidth
                  >
                    Добавить фотографии
                  </Button>
                </label>
              </Box>

              {photos.length > 0 && (
                <Grid container spacing={1}>
                  {photos.map((photo, index) => (
                    <Grid size={{ xs: 6, sm: 4 }} key={index}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1,
                          position: 'relative',
                          height: 100,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removePhoto(index)}
                          sx={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            zIndex: 1,
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                        <Typography variant="caption" noWrap>
                          {photo.name}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Видео (обязательно)
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Добавьте видео брака. Максимум 5 файлов.
              </Typography>

              <Box sx={{ mb: 2 }}>
                <input
                  accept="video/*"
                  style={{ display: 'none' }}
                  id="video-upload"
                  type="file"
                  multiple
                  onChange={handleVideoUpload}
                />
                <label htmlFor="video-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<VideoIcon />}
                    fullWidth
                  >
                    Добавить видео
                  </Button>
                </label>
              </Box>

              {videos.length > 0 && (
                <Grid container spacing={1}>
                  {videos.map((video, index) => (
                    <Grid size={{ xs: 12, sm: 6 }} key={index}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1,
                          position: 'relative',
                          height: 60,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeVideo(index)}
                          sx={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            zIndex: 1,
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                        <Typography variant="caption" noWrap>
                          {video.name}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Комментарий
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Описание брака (необязательно)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Итоговая информация */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Итоговая информация
              </Typography>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Количество товаров:</Typography>
                  <Typography fontWeight="bold">
                    {selectedItems.reduce((sum, item) => sum + item.quantity, 0)} шт.
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Общая стоимость:</Typography>
                  <Typography fontWeight="bold" color="primary">
                    {totalValue.toLocaleString('ru-RU', {
                      style: 'currency',
                      currency: 'RUB',
                      minimumFractionDigits: 0,
                    })}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Фотографии:</Typography>
                  <Chip
                    label={`${photos.length}/10`}
                    color={photos.length > 0 ? "success" : "error"}
                    size="small"
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Видео:</Typography>
                  <Chip
                    label={`${videos.length}/5`}
                    color={videos.length > 0 ? "success" : "error"}
                    size="small"
                  />
                </Box>
                <Divider />
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={
                    selectedItems.length === 0 ||
                    photos.length === 0 ||
                    videos.length === 0 ||
                    submitting ||
                    success
                  }
                  onClick={() => setConfirmDialogOpen(true)}
                >
                  {submitting ? 'Отправка...' : 'Отправить на проверку'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <ConfirmationDialog
        open={confirmDialogOpen}
        title="Подтверждение отправки"
        message={
          <Box>
            <Typography gutterBottom>
              Вы уверены, что хотите отправить брак на проверку?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              После отправки вы сможете отменить брак только до момента его проверки администратором.
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Детали:</Typography>
              <Typography variant="body2">
                • Товаров: {selectedItems.length} позиций
              </Typography>
              <Typography variant="body2">
                • Общее количество: {selectedItems.reduce((sum, item) => sum + item.quantity, 0)} шт.
              </Typography>
              <Typography variant="body2">
                • Общая стоимость: {totalValue.toLocaleString('ru-RU', {
                  style: 'currency',
                  currency: 'RUB',
                  minimumFractionDigits: 0,
                })}
              </Typography>
            </Box>
          </Box>
        }
        onConfirm={handleSubmit}
        onCancel={() => setConfirmDialogOpen(false)}
        confirmText="Отправить"
        cancelText="Отмена"
      />
    </Box>
  );
};

export default CreateDefectPage;