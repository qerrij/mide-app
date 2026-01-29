import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  TextField,
  Grid,
  Card,
  CardContent,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Divider,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Stack,
  Alert,
  Avatar,
  Tooltip,
  FormHelperText,
  SelectChangeEvent,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  ArrowBack as BackIcon,
  PhotoCamera as PhotoIcon,
  Videocam as VideoIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Visibility as ViewIcon,
  Inventory as InventoryIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Remove as RemoveIcon,
  PlayArrow as PlayIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { rejectionService } from '../api/rejectionService';
import { AvailableProduct, RejectionItemCreate } from '../types';
import ConfirmationDialog from '../components/rejection/ConfirmationDialog';

const CreateDefectPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [activeStep, setActiveStep] = useState(0);
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
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [videoPreviews, setVideoPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  const getFilteredProducts = () => {
    if (!searchQuery.trim() || !selectedCategory) {
      return productsInCategory;
    }
    
    const query = searchQuery.toLowerCase();
    return productsInCategory.filter(product => 
      product.productName.toLowerCase().includes(query) ||
      product.productSku.toLowerCase().includes(query)
      
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
      
      // Создаем превью для новых фотографий
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
      
      // Проверка расширений
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
      
      // Создаем превью для новых видео
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

  const validateStep = (step: number): boolean => {
    switch (step) {
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
    if (validateStep(activeStep)) {
      setActiveStep((prevStep) => prevStep + 1);
      setError('');
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
    setError('');
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

  const steps = [
    'Выбор товаров',
    'Фото и видео',
    'Подтверждение',
  ];

  const openImageDialog = (preview: string) => {
    setSelectedImage(preview);
  };

  const closeImageDialog = () => {
    setSelectedImage(null);
  };

  const openVideoDialog = (preview: string) => {
    setSelectedVideo(preview);
  };

  const closeVideoDialog = () => {
    setSelectedVideo(null);
  };

  const handleSuccessClose = () => {
    navigate('/defects');
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate('/defects')}
          sx={{ mb: 2 }}
        >
          Назад к бракам
        </Button>
        <Typography variant="h4" component="h1" gutterBottom color="#2a0f35">
          Создание брака
        </Typography>
        <Typography variant="subtitle1" color="#4c5454">
          Заполните информацию о товарах с браком
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Брак успешно создан! Перенаправляем на список браков...
        </Alert>
      )}

      <Stepper activeStep={activeStep} orientation="vertical" sx={{ mb: 4 }}>
        {steps.map((label, index) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
            <StepContent>
              {index === 0 && (
                <Paper sx={{ p: 3, mt: 2 }}>
                  <Typography variant="h6" gutterBottom color="#2a0f35">
                    Добавление товаров с браком
                  </Typography>
                  
                  {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : availableProducts.length === 0 ? (
                    <Alert severity="info" sx={{ mb: 3 }}>
                      У вас нет доступных товаров для брака
                    </Alert>
                  ) : (
                    <>
                      <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid size={{ xs: 12 }}>
                          <FormControl fullWidth>
                            <InputLabel shrink>Категория</InputLabel>
                            <Select
                              value={selectedCategory}
                              label="Категория"
                              onChange={(e: SelectChangeEvent) =>
                                setSelectedCategory(e.target.value)
                              }
                              displayEmpty
                              sx={{ 
                                '& .MuiSelect-select': {
                                  paddingTop: '16px',
                                  paddingBottom: '8px'
                                }
                              }}
                            >
                              <MenuItem value="">
                                <em>Все категории</em>
                              </MenuItem>
                              {categories.map(category => (
                                <MenuItem key={category} value={category}>
                                  {category}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>

                        {selectedCategory && (
                          <>
                            <Grid size={{ xs: 12 }}>
                              <TextField
                                fullWidth
                                placeholder="Поиск товаров по названию или артикулу..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                InputProps={{
                                  startAdornment: (
                                    <InputAdornment position="start">
                                      <SearchIcon />
                                    </InputAdornment>
                                  ),
                                }}
                              />
                            </Grid>

                            <Grid size={{ xs: 12 }}>
                              <FormControl fullWidth>
                                <InputLabel shrink>Товар</InputLabel>
                                <Select
                                  value={selectedProductId}
                                  label="Товар"
                                  onChange={(e: SelectChangeEvent) =>
                                    setSelectedProductId(e.target.value)
                                  }
                                  displayEmpty
                                  sx={{ 
                                    '& .MuiSelect-select': {
                                      paddingTop: '16px',
                                      paddingBottom: '8px'
                                    }
                                  }}
                                >
                                  <MenuItem value="">
                                    <em>Выберите товар</em>
                                  </MenuItem>
                                  {getFilteredProducts().map(product => (
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
                          </>
                        )}
                      </Grid>

                      {/* Выбранные товары */}
                      <Typography variant="subtitle1" gutterBottom color="#2a0f35">
                        Выбранные товары ({selectedItems.length})
                      </Typography>

                      {selectedItems.length === 0 ? (
                        <Alert severity="info" sx={{ mb: 2 }}>
                          Товары не добавлены
                        </Alert>
                      ) : (
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Товар</TableCell>
                                <TableCell>Категория</TableCell>
                                <TableCell align="right">Количество</TableCell>
                                <TableCell align="right">Стоимость</TableCell>
                                <TableCell width={50}></TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {selectedItems.map((item) => {
                                const product = getItemDetails(item.productId);
                                return (
                                  <TableRow key={item.productId} hover>
                                    <TableCell>
                                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                        {product?.productName}
                                      </Typography>
                                      <Typography variant="caption" color="textSecondary">
                                        SKU: {product?.productSku}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Typography variant="body2">
                                        {product?.categoryName || '—'}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                                        <IconButton
                                          size="small"
                                          onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                                        >
                                          <RemoveIcon fontSize="small" />
                                        </IconButton>
                                        <TextField
                                          type="number"
                                          value={item.quantity}
                                          onChange={(e) =>
                                            handleUpdateQuantity(
                                              item.productId,
                                              Number(e.target.value) || 0
                                            )
                                          }
                                          size="small"
                                          sx={{ width: '80px' }}
                                          InputProps={{
                                            inputProps: { 
                                              min: 1, 
                                              max: product?.availableQuantity 
                                            }
                                          }}
                                        />
                                        <IconButton
                                          size="small"
                                          onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                                          disabled={item.quantity >= (product?.availableQuantity || 0)}
                                        >
                                          <AddIcon fontSize="small" />
                                        </IconButton>
                                      </Box>
                                    </TableCell>
                                    <TableCell align="right">
                                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                        {((product?.price || 0) * item.quantity).toLocaleString('ru-RU', {
                                          style: 'currency',
                                          currency: 'RUB',
                                          minimumFractionDigits: 0,
                                        })}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>
                                      <IconButton
                                        size="small"
                                        onClick={() => handleRemoveItem(item.productId)}
                                        color="error"
                                      >
                                        <DeleteIcon />
                                      </IconButton>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                              <TableRow>
                                <TableCell colSpan={3} align="right">
                                  <Typography variant="subtitle2">
                                    Итого:
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2a0f35' }}>
                                    {totalValue.toLocaleString('ru-RU', {
                                      style: 'currency',
                                      currency: 'RUB',
                                      minimumFractionDigits: 0,
                                    })}
                                  </Typography>
                                </TableCell>
                                <TableCell></TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </>
                  )}
                </Paper>
              )}

              {index === 1 && (
                <Paper sx={{ p: 3, mt: 2 }}>
                  <Typography variant="h6" gutterBottom color="#2a0f35">
                    Фотографии и видео брака
                  </Typography>
                  
                  {/* Фотографии */}
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Фотографии *
                    </Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Добавьте фотографии брака. Максимум 10 файлов.
                    </Typography>
                    
                    <Box sx={{ mb: 2 }}>
                      <input
                        accept="image/*"
                        style={{ display: 'none' }}
                        id="photo-upload-step2"
                        type="file"
                        multiple
                        onChange={handlePhotoUpload}
                      />
                      <label htmlFor="photo-upload-step2">
                        <Button
                          variant="outlined"
                          component="span"
                          startIcon={<PhotoIcon />}
                          sx={{ mb: 2 }}
                          disabled={photos.length >= 10}
                        >
                          Добавить фотографии ({photos.length}/10)
                        </Button>
                      </label>
                    </Box>

                    {photoPreviews.length > 0 && (
                      <ImageList cols={4} gap={8} sx={{ mb: 2 }}>
                        {photoPreviews.map((preview, index) => (
                          <ImageListItem key={index}>
                            <Box
                              component="img"
                              src={preview}
                              alt={`Фото ${index + 1}`}
                              sx={{
                                width: '100%',
                                height: 120,
                                objectFit: 'cover',
                                borderRadius: 1,
                                cursor: 'pointer',
                                '&:hover': {
                                  opacity: 0.8,
                                },
                              }}
                              onClick={() => openImageDialog(preview)}
                            />
                            <ImageListItemBar
                              position="top"
                              actionIcon={
                                <Stack direction="row" spacing={0.5}>
                                  <Tooltip title="Просмотр">
                                    <IconButton
                                      size="small"
                                      onClick={() => openImageDialog(preview)}
                                      sx={{ color: 'white', backgroundColor: 'rgba(0,0,0,0.5)' }}
                                    >
                                      <ViewIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Удалить">
                                    <IconButton
                                      size="small"
                                      onClick={() => removePhoto(index)}
                                      sx={{ color: 'white', backgroundColor: 'rgba(0,0,0,0.5)' }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                              }
                              actionPosition="right"
                            />
                          </ImageListItem>
                        ))}
                      </ImageList>
                    )}
                  </Box>

                  {/* Видео */}
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      Видео *
                    </Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Добавьте видео брака. Максимум 5 файлов. Поддерживаемые форматы: {videoExtensions.slice(0, 5).join(', ')}...
                    </Typography>
                    
                    <Box sx={{ mb: 2 }}>
                      <input
                        accept={videoExtensions.join(',')}
                        style={{ display: 'none' }}
                        id="video-upload-step2"
                        type="file"
                        multiple
                        onChange={handleVideoUpload}
                      />
                      <label htmlFor="video-upload-step2">
                        <Button
                          variant="outlined"
                          component="span"
                          startIcon={<VideoIcon />}
                          sx={{ mb: 2 }}
                          disabled={videos.length >= 5}
                        >
                          Добавить видео ({videos.length}/5)
                        </Button>
                      </label>
                    </Box>

                    {videoPreviews.length > 0 && (
                      <Grid container spacing={2}>
                        {videoPreviews.map((preview, index) => (
                          <Grid size={{ xs: 12, sm: 6 }} key={index}>
                            <Paper
                              variant="outlined"
                              sx={{
                                p: 2,
                                position: 'relative',
                                cursor: 'pointer',
                                '&:hover': {
                                  backgroundColor: 'action.hover',
                                },
                              }}
                              onClick={() => openVideoDialog(preview)}
                            >
                              <Box
                                sx={{
                                  position: 'relative',
                                  height: 120,
                                  backgroundColor: 'black',
                                  borderRadius: 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  mb: 1,
                                }}
                              >
                                <Avatar
                                  sx={{
                                    backgroundColor: 'rgba(255,255,255,0.2)',
                                    width: 48,
                                    height: 48,
                                  }}
                                >
                                  <PlayIcon />
                                </Avatar>
                                <Stack direction="row" spacing={0.5} sx={{
                                  position: 'absolute',
                                  top: 4,
                                  right: 4,
                                }}>
                                  <Tooltip title="Просмотр">
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openVideoDialog(preview);
                                      }}
                                      sx={{ 
                                        color: 'white', 
                                        backgroundColor: 'rgba(0,0,0,0.5)',
                                        '&:hover': {
                                          backgroundColor: 'rgba(0,0,0,0.7)',
                                        },
                                      }}
                                    >
                                      <ViewIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Удалить">
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeVideo(index);
                                      }}
                                      sx={{ 
                                        color: 'white', 
                                        backgroundColor: 'rgba(0,0,0,0.5)',
                                        '&:hover': {
                                          backgroundColor: 'rgba(0,0,0,0.7)',
                                        },
                                      }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                              </Box>
                              <Typography variant="caption" noWrap>
                                {videos[index].name}
                              </Typography>
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    )}
                  </Box>

                  <Alert severity="info" sx={{ mt: 3 }}>
                    Для создания брака необходимо добавить минимум одну фотографию и одно видео.
                  </Alert>
                </Paper>
              )}

              {index === 2 && (
                <Paper sx={{ p: 3, mt: 2 }}>
                  <Typography variant="h6" gutterBottom color="#2a0f35">
                    Подтверждение создания брака
                  </Typography>
                  
                  {/* Комментарий */}
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Комментарий (необязательно)
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      placeholder="Опишите причину брака или дополнительные детали..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                  </Box>

                  <Divider sx={{ my: 3 }} />

                  {/* Сводка */}
                  <Typography variant="h6" gutterBottom color="#2a0f35">
                    Сводка
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                            Товары
                          </Typography>
                          <Stack spacing={1}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography>Количество позиций:</Typography>
                              <Typography fontWeight={500}>
                                {selectedItems.length} шт.
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography>Общее количество:</Typography>
                              <Typography fontWeight={500}>
                                {selectedItems.reduce((sum, item) => sum + item.quantity, 0)} ед.
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography>Общая стоимость:</Typography>
                              <Typography fontWeight={500} color="primary">
                                {totalValue.toLocaleString('ru-RU', {
                                  style: 'currency',
                                  currency: 'RUB',
                                  minimumFractionDigits: 0,
                                })}
                              </Typography>
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                    
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                            Медиафайлы
                          </Typography>
                          <Stack spacing={1}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography>Фотографии:</Typography>
                              <Chip
                                label={`${photos.length}/10`}
                                color={photos.length > 0 ? "success" : "error"}
                                size="small"
                                icon={photos.length > 0 ? <CheckIcon /> : undefined}
                              />
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography>Видео:</Typography>
                              <Chip
                                label={`${videos.length}/5`}
                                color={videos.length > 0 ? "success" : "error"}
                                size="small"
                                icon={videos.length > 0 ? <CheckIcon /> : undefined}
                              />
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>

                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      Список товаров:
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Товар</TableCell>
                            <TableCell>Количество</TableCell>
                            <TableCell align="right">Стоимость</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedItems.map((item) => {
                            const product = getItemDetails(item.productId);
                            return (
                              <TableRow key={item.productId}>
                                <TableCell>
                                  <Typography variant="body2">
                                    {product?.productName}
                                  </Typography>
                                  <Typography variant="caption" color="textSecondary">
                                    SKU: {product?.productSku}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2">
                                    {item.quantity} шт.
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2">
                                    {((product?.price || 0) * item.quantity).toLocaleString('ru-RU', {
                                      style: 'currency',
                                      currency: 'RUB',
                                      minimumFractionDigits: 0,
                                    })}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                </Paper>
              )}

              <Box sx={{ mb: 2, mt: 2 }}>
                <div>
                  <Button
                    variant="contained"
                    onClick={activeStep === steps.length - 1 ? () => setConfirmDialogOpen(true) : handleNext}
                    sx={{ mt: 1, mr: 1 }}
                    disabled={
                      loading || 
                      submitting || 
                      success ||
                      (activeStep === 0 && selectedItems.length === 0) ||
                      (activeStep === 1 && (photos.length === 0 || videos.length === 0))
                    }
                    startIcon={activeStep === steps.length - 1 ? <SaveIcon /> : undefined}
                  >
                    {activeStep === steps.length - 1 ? (
                      'Создать брак'
                    ) : (
                      'Далее'
                    )}
                  </Button>
                  <Button
                    disabled={activeStep === 0 || loading || submitting}
                    onClick={handleBack}
                    sx={{ mt: 1, mr: 1 }}
                  >
                    Назад
                  </Button>
                </div>
              </Box>
            </StepContent>
          </Step>
        ))}
      </Stepper>

      {/* Модалка просмотра изображения */}
      <Dialog
        open={!!selectedImage}
        onClose={closeImageDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Просмотр фотографии</Typography>
            <IconButton onClick={closeImageDialog}>
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
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeImageDialog} color="primary">
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>

      {/* Модалка просмотра видео */}
      <Dialog
        open={!!selectedVideo}
        onClose={closeVideoDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Просмотр видео</Typography>
            <IconButton onClick={closeVideoDialog}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedVideo && (
            <video
              src={selectedVideo}
              controls
              style={{ width: '100%', maxHeight: '70vh' }}
            >
              Ваш браузер не поддерживает видео тег.
            </video>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeVideoDialog} color="primary">
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог подтверждения создания */}
      <ConfirmationDialog
        open={confirmDialogOpen}
        title="Подтверждение создания брака"
        message={
          <Box>
            <Typography gutterBottom>
              Вы уверены, что хотите создать брак со следующими параметрами?
            </Typography>
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid size={{ xs: 6 }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Количество товаров
                </Typography>
                <Typography variant="body2">
                  {selectedItems.length} позиций
                </Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Общее количество
                </Typography>
                <Typography variant="body2">
                  {selectedItems.reduce((sum, item) => sum + item.quantity, 0)} ед.
                </Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Фотографии
                </Typography>
                <Typography variant="body2">
                  {photos.length} файлов
                </Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Видео
                </Typography>
                <Typography variant="body2">
                  {videos.length} файлов
                </Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Общая стоимость
                </Typography>
                <Typography variant="body1" fontWeight={500} color="primary">
                  {totalValue.toLocaleString('ru-RU', {
                    style: 'currency',
                    currency: 'RUB',
                    minimumFractionDigits: 0,
                  })}
                </Typography>
              </Grid>
            </Grid>
            {comment && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Комментарий:
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {comment}
                </Typography>
              </Box>
            )}
          </Box>
        }
        onConfirm={handleSubmit}
        onCancel={() => setConfirmDialogOpen(false)}
        confirmText="Создать брак"
        cancelText="Отмена"
        loading={submitting}
      />

      {/* Модалка успешного создания */}
      <Dialog
        open={success}
        onClose={handleSuccessClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Брак успешно создан!</DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CheckCircleIcon sx={{ fontSize: 60, color: '#4caf50', mb: 2 }} />
            <Typography variant="body1" sx={{ mb: 2 }}>
              Брак успешно создан и отправлен на проверку.
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Вы будете перенаправлены на страницу списка браков через 2 секунды.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={handleSuccessClose}
            variant="contained"
            color="primary"
            fullWidth
          >
            Перейти к списку браков
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CreateDefectPage;