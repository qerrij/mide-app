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
  Chip,
  Stack,
  Divider,
  Card,
  CardContent,
  IconButton,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery,
  SelectChangeEvent,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  PhotoCamera as PhotoCameraIcon,
  ExitToApp as ExitToAppIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  LocationCity as LocationCityIcon,
  Home as HomeIcon,
  Language as LanguageIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { revisionService } from '../../api/revisionService';
import { productService } from '../../api/productService';
import {
  Revision,
  RevisionStatus,
  Product,
  ProductCategory,
  getRevisionStatusText,
  getRevisionTypeText,
  getRevisionStatusColor,
  canFillRevision,
  getTargetName,
} from '../../types';
import { PhotoViewer } from '../../components/PhotoViewer';

interface PhotoItem {
  file: File | null;
  previewUrl: string;
  isExisting: boolean;
  existingPath?: string;
}

interface SelectedProduct {
  productId: number;
  categoryId: number;
  quantity: number;
  productName: string;
  categoryName: string;
  productSku: string;
}

const FillRevisionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get('edit') === 'true';
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Состояния
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [revision, setRevision] = useState<Revision | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  
  // Для добавления товара
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<string>('');
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [deletedPhotoUrls, setDeletedPhotoUrls] = useState<string[]>([]);
  
  const [existingFilling, setExistingFilling] = useState<any>(null);
  const [photoViewer, setPhotoViewer] = useState<{
    open: boolean;
    photos: string[];
    currentIndex: number;
  }>({
    open: false,
    photos: [],
    currentIndex: 0,
  });
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [exitDialog, setExitDialog] = useState(false);
  const [successDialog, setSuccessDialog] = useState(false);

  const isSavingRef = useRef(false);
  const saveSuccessRef = useRef(false);
  const allowStopEditingOnCleanupRef = useRef(false);
  const photosRef = useRef(photos);
  photosRef.current = photos;

  // Загрузка данных
  useEffect(() => {
    loadData();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id, user, isEditMode]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  useEffect(() => {
    if (isEditMode && id && !existingFilling) {
      revisionService.startEditing(parseInt(id)).catch(err => {
        setError(err.message || 'Ошибка при начале редактирования');
      });
    }
  }, [isEditMode, id]);

  useEffect(() => {
    return () => {
      photosRef.current.forEach(photo => {
        if (!photo.isExisting && photo.previewUrl) {
          URL.revokeObjectURL(photo.previewUrl);
        }
      });
    };
  }, []);

  useEffect(() => {
    if (!isEditMode || !id) return;

    const revisionId = parseInt(id, 10);
    const armTimer = window.setTimeout(() => {
      allowStopEditingOnCleanupRef.current = true;
    }, 0);

    return () => {
      window.clearTimeout(armTimer);
      if (allowStopEditingOnCleanupRef.current && !saveSuccessRef.current) {
        revisionService.stopEditing(revisionId).catch(console.error);
      }
      allowStopEditingOnCleanupRef.current = false;
    };
  }, [isEditMode, id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!id) throw new Error('ID ревизии не указан');
      if (!user?.id) throw new Error('Пользователь не авторизован');
      
      const revisionId = parseInt(id);
      
      const [revisionData, productsData, categoriesData] = await Promise.all([
        revisionService.getRevisionById(revisionId),
        productService.getAllProducts(),
        productService.getAllCategories()
      ]);
      
      if (!canFillRevision(revisionData, user.id) && !isEditMode) {
        throw new Error('У вас нет прав для заполнения этой ревизии');
      }
      
      if (!isEditMode && revisionData.status !== RevisionStatus.REQUESTED && 
          revisionData.status !== RevisionStatus.IN_PROGRESS) {
        throw new Error('Эта ревизия уже заполнена или отменена');
      }
      
      setRevision(revisionData);
      setProducts(productsData);
      setCategories(categoriesData);
      
      try {
        const myFilling = await revisionService.getMyFilling(revisionId);
        if (myFilling && myFilling.isCompleted) {
          setExistingFilling(myFilling);
          
          setSelectedProducts(myFilling.items.map((item: any) => ({
            productId: item.productId,
            categoryId: item.categoryId,
            quantity: item.quantity,
            productName: item.productName || '',
            categoryName: item.categoryName || '',
            productSku: item.productSku || '',
          })));
          
          if (myFilling.photos && myFilling.photos.length > 0) {
            const existingPhotos: PhotoItem[] = myFilling.photos.map((path: string) => ({
              file: null,
              previewUrl: revisionService.getPhotoUrl(path),
              isExisting: true,
              existingPath: path,
            }));
            setPhotos(existingPhotos);
          }
        }
      } catch (fillingError) {
        console.log('No existing filling found');
      }
      
    } catch (err: any) {
      setError(err.message || 'Ошибка при загрузке данных');
      console.error('Error loading revision:', err);
    } finally {
      setLoading(false);
    }
  };

  // Добавление товара
  const handleAddProduct = () => {
    if (!selectedProductId || !quantity || parseInt(quantity) <= 0) {
      setError('Выберите товар и укажите количество');
      return;
    }

    const product = products.find(p => p.id === selectedProductId);
    const category = categories.find(c => c.id === selectedCategoryId);
    
    if (!product || !category) {
      setError('Товар или категория не найдены');
      return;
    }
    
    if (selectedProducts.some(item => item.productId === selectedProductId)) {
      setError('Этот товар уже добавлен в ревизию');
      return;
    }
    
    setSelectedProducts(prev => [...prev, {
      productId: Number(selectedProductId),
      categoryId: Number(selectedCategoryId),
      quantity: parseInt(quantity),
      productName: product.name,
      categoryName: category.name,
      productSku: product.sku,
    }]);
    
    setQuantity('');
    setSelectedProductId('');
    setError(null);
  };

  const handleRemoveProduct = (productId: number) => {
    setSelectedProducts(prev => prev.filter(p => p.productId !== productId));
  };

  const handleQuantityChange = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveProduct(productId);
      return;
    }
    
    setSelectedProducts(prev =>
      prev.map(p =>
        p.productId === productId
          ? { ...p, quantity: newQuantity }
          : p
      )
    );
  };

  // Управление фото
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    
    const newPhotos: PhotoItem[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 10 * 1024 * 1024) {
        setError(`Файл ${file.name} слишком большой (максимум 10MB)`);
        continue;
      }
      
      if (!file.type.startsWith('image/')) {
        setError(`Файл ${file.name} не является изображением`);
        continue;
      }
      
      newPhotos.push({
        file,
        previewUrl: URL.createObjectURL(file),
        isExisting: false,
      });
    }
    
    if (photos.length + newPhotos.length > 10) {
      setError('Максимальное количество фото - 10');
      return;
    }
    
    setPhotos(prev => [...prev, ...newPhotos]);
    setError(null);
  };

  const handleRemovePhoto = (index: number) => {
    const photo = photos[index];
    
    if (photo.isExisting && photo.existingPath) {
      setDeletedPhotoUrls(prev => [...prev, photo.existingPath!]);
    }
    
    if (!photo.isExisting && photo.previewUrl) {
      URL.revokeObjectURL(photo.previewUrl);
    }
    
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleViewPhoto = (photoUrls: string[], index: number) => {
    setPhotoViewer({
      open: true,
      photos: photoUrls,
      currentIndex: index,
    });
  };

  // Валидация шагов
  const validateStep = (stepNumber: number): boolean => {
    setError(null);

    switch (stepNumber) {
      case 0:
        if (selectedProducts.length === 0) {
          setError('Добавьте хотя бы один товар в ревизию');
          return false;
        }
        return true;

      case 1:
        if (photos.length === 0) {
          setError('Добавьте хотя бы одно фото');
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
    const hasChanges = selectedProducts.length > 0 || photos.length > 0;
    
    if (hasChanges && !existingFilling) {
      setExitDialog(true);
    } else {
      handleCancel();
    }
  };

  const handleCancel = async () => {
    if (isEditMode && id) {
      try {
        await revisionService.stopEditing(parseInt(id));
      } catch (error) {
        console.error('Error stopping editing:', error);
      }
    }
    navigate('/revisions');
  };

  const handleSubmit = async () => {
    try {
      if (!user?.id) throw new Error('Пользователь не авторизован');
      
      isSavingRef.current = true;
      setSaving(true);
      setError(null);
      
      const itemsToSend = selectedProducts.map(item => ({
        productId: item.productId,
        categoryId: item.categoryId,
        quantity: item.quantity,
      }));
      
      if (isEditMode && existingFilling) {
        const photoFiles = photos
          .filter(p => !p.isExisting && p.file !== null)
          .map(p => p.file!);
        
        await revisionService.updateFilling(
          parseInt(id!),
          itemsToSend,
          photoFiles,
          deletedPhotoUrls
        );
      } else {
        const photoFiles = photos
          .filter(p => p.file !== null)
          .map(p => p.file!);
        
        await revisionService.fillRevision(
          parseInt(id!),
          itemsToSend,
          photoFiles
        );
      }
      
      saveSuccessRef.current = true;
      setSuccessDialog(true);
      
    } catch (err: any) {
      isSavingRef.current = false;
      setError(err.message || 'Ошибка при сохранении ревизии');
      console.error('Error saving revision:', err);
    } finally {
      setSaving(false);
      setConfirmDialog(false);
    }
  };

  const getRevisionTypeIcon = (type: string) => {
    switch (type) {
      case 'USER': return <PersonIcon />;
      case 'GROUP': return <GroupIcon />;
      case 'CLUSTER': return <HomeIcon />;
      case 'CITY': return <LocationCityIcon />;
      case 'GENERAL': return <LanguageIcon />;
      default: return <LanguageIcon />;
    }
  };

  const getPhotoPreviewUrl = (photo: PhotoItem): string => {
    return photo.previewUrl;
  };

  const filteredProducts = selectedCategoryId === 'all'
    ? products
    : products.filter(p => p.categoryId === selectedCategoryId);

  const newPhotosCount = photos.filter(p => !p.isExisting).length;
  const existingPhotosCount = photos.filter(p => p.isExisting).length;

  const showProductSelect = selectedCategoryId !== 'all';
  const showQuantityAndAdd = showProductSelect && selectedProductId !== '';

  if (loading) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        backgroundColor: '#f5f3f6', 
        pt: { xs: 4, md: 8 }
      }}>
        <Container maxWidth="md">
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <CircularProgress sx={{ color: '#674fb6' }} />
          </Box>
        </Container>
      </Box>
    );
  }

  if (!revision || !user?.id) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        backgroundColor: '#f5f3f6', 
        pt: { xs: 4, md: 8 }
      }}>
        <Container maxWidth="md">
          <Alert severity="error" sx={{ borderRadius: 4 }}>
            Ревизия не найдена или пользователь не авторизован
          </Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      backgroundColor: '#f5f3f6', 
      pt: { xs: 4, md: 8 },
      pb: 4
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
          {/* Заголовок */}
          <Box sx={{ mb: 3 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={handleExitClick}
              sx={{
                mb: 2,
                color: '#674fb6',
                '&:hover': { backgroundColor: 'rgba(103, 79, 182, 0.04)' },
              }}
            >
              Назад к ревизиям
            </Button>
            
            <Typography variant="h5" gutterBottom color="#2a0f35" fontWeight={600}>
              {isEditMode ? 'Редактирование заполнения' : 'Заполнение ревизии'} #{revision.id}
            </Typography>
            
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
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
                label={getTargetName(revision)}
                sx={{ backgroundColor: '#f3e5f5', color: '#7b1fa2' }}
              />
              {existingFilling && (
                <Chip
                  icon={<CheckCircleIcon />}
                  label={isEditMode ? 'Редактирование' : 'Уже заполнено'}
                  sx={{ backgroundColor: '#e8f5e9', color: '#388e3c' }}
                />
              )}
            </Stack>
            
            {existingFilling && !isEditMode && (
              <Alert severity="info" sx={{ mt: 2, borderRadius: 4 }}>
                У вас уже есть сохраненное заполнение этой ревизии. Вы можете отредактировать его со страницы списка ревизий.
              </Alert>
            )}
            
          </Box>

          <Typography variant="h6" gutterBottom color="#2a0f35" fontWeight={600} sx={{ mb: 2 }}>
            {step === 0 && 'Добавление товаров'}
            {step === 1 && 'Фотографии'}
            {step === 2 && 'Подтверждение'}
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
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3, borderRadius: 4 }}>
              {success}
            </Alert>
          )}

          {/* Шаг 1: Выбор товаров */}
          {step === 0 && (
            <>
              {/* Выбор категории */}
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel id="category-label">Категория</InputLabel>
                <Select
                  labelId="category-label"
                  value={selectedCategoryId}
                  label="Категория"
                  onChange={(e: SelectChangeEvent<number | 'all'>) => {
                    setSelectedCategoryId(e.target.value as number | 'all');
                    setSelectedProductId('');
                    setQuantity('');
                  }}
                  MenuProps={{ disableScrollLock: true }}
                  sx={{
                    borderRadius: 4,
                    backgroundColor: '#f8f7fa',
                  }}
                >
                  <MenuItem value="all">Все категории</MenuItem>
                  {categories.map(category => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
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
                    onChange={(e: SelectChangeEvent<number>) => {
                      setSelectedProductId(e.target.value as number);
                      setQuantity('');
                    }}
                    MenuProps={{ disableScrollLock: true }}
                    sx={{
                      borderRadius: 4,
                      backgroundColor: '#f8f7fa',
                    }}
                  >
                    <MenuItem value="">
                      <em>Выберите товар</em>
                    </MenuItem>
                    {filteredProducts.map(product => (
                      <MenuItem 
                        key={product.id} 
                        value={product.id}
                        disabled={selectedProducts.some(p => p.productId === product.id)}
                      >
                        {product.name} ({product.sku})
                        {selectedProducts.some(p => p.productId === product.id) && ' - уже добавлен'}
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
                      onClick={handleAddProduct}
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
              {selectedProducts.length > 0 && (
                <Box sx={{ mt: 4 }}>
                  <Divider sx={{ mb: 3 }} />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" color="#2a0f35" fontWeight={600}>
                      Товары в ревизии ({selectedProducts.length})
                    </Typography>
                    <Chip
                      label={`Итого: ${selectedProducts.reduce((sum, item) => sum + item.quantity, 0)} шт.`}
                      sx={{ backgroundColor: '#e3f2fd', color: '#1976d2' }}
                    />
                  </Box>

                  <Stack spacing={2}>
                    {selectedProducts.map((item) => (
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
                              {item.productName}
                            </Typography>
                            <Typography variant="caption" color="#4c5454">
                              {item.productSku} • {item.categoryName}
                            </Typography>
                          </Grid>

                          <Grid size={{ xs: 8, sm: 5 }}>
                            <TextField
                              label="Количество"
                              type="number"
                              size="small"
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(item.productId, parseInt(e.target.value) || 0)}
                              inputProps={{ min: 1 }}
                              fullWidth
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 4,
                                  backgroundColor: '#ffffff',
                                },
                              }}
                            />
                          </Grid>

                          <Grid size={{ xs: 4, sm: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                              <IconButton
                                size="small"
                                onClick={() => handleRemoveProduct(item.productId)}
                                sx={{ color: '#ca0ec0' }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                          </Grid>
                        </Grid>
                      </Card>
                    ))}
                  </Stack>
                </Box>
              )}
            </>
          )}

          {/* Шаг 2: Фотографии */}
          {step === 1 && (
            <>
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="photo-upload"
                type="file"
                multiple
                onChange={handlePhotoUpload}
              />
              
              <Box
                sx={{
                  border: '2px dashed rgba(103, 79, 182, 0.3)',
                  p: 4,
                  borderRadius: 4,
                  textAlign: 'center',
                  mb: 3,
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
                <PhotoCameraIcon sx={{ fontSize: 48, color: '#674fb6', mb: 1 }} />
                <Typography variant="body1" color="#2a0f35" fontWeight={500}>
                  Загрузить фотографии
                </Typography>
                <Typography variant="caption" color="#4c5454" display="block" sx={{ mt: 1 }}>
                  {photos.length}/10 фотографий • Минимум 1 фото
                </Typography>
              </Box>

              {photos.length > 0 && (
                <>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    {existingPhotosCount > 0 && (
                      <Chip
                        label={`${existingPhotosCount} существ.`}
                        size="small"
                        sx={{ backgroundColor: '#e3f2fd', color: '#1976d2' }}
                      />
                    )}
                    {newPhotosCount > 0 && (
                      <Chip
                        label={`${newPhotosCount} новых`}
                        size="small"
                        sx={{ backgroundColor: '#e8f5e9', color: '#388e3c' }}
                      />
                    )}
                  </Box>

                  <Grid container spacing={1.5}>
                    {photos.map((photo, index) => (
                      <Grid size={{ xs: 6, sm: 4, md: 3 }} key={index}>
                        <Box
                          sx={{
                            position: 'relative',
                            width: '100%',
                            paddingBottom: '100%',
                            borderRadius: 4,
                            overflow: 'hidden',
                            cursor: 'pointer',
                            backgroundImage: `url(${getPhotoPreviewUrl(photo)})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            transition: 'transform 0.2s ease',
                            border: photo.isExisting 
                              ? '2px solid rgba(25, 118, 210, 0.4)' 
                              : '2px solid #674fb6',
                            '&:hover': {
                              transform: { xs: 'none', md: 'scale(1.02)' },
                            },
                          }}
                          onClick={() => handleViewPhoto([getPhotoPreviewUrl(photo)], 0)}
                        >
                          {photo.isExisting && (
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 8,
                                left: 8,
                                backgroundColor: 'rgba(25, 118, 210, 0.8)',
                                color: 'white',
                                fontSize: '0.6rem',
                                px: 1,
                                py: 0.3,
                                borderRadius: 2,
                                zIndex: 1,
                              }}
                            >
                              Существующее
                            </Box>
                          )}
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
                              handleRemovePhoto(index);
                            }}
                          >
                            <CloseIcon sx={{ color: 'white', fontSize: 18 }} />
                          </IconButton>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </>
              )}
            </>
          )}

          {/* Шаг 3: Подтверждение */}
          {step === 2 && (
            <Card sx={{ 
              borderRadius: 4, 
              backgroundColor: 'rgba(63, 31, 75, 0.04)',
              border: '1px solid rgba(63, 31, 75, 0.1)',
            }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle2" color="#2a0f35" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon sx={{ color: '#3f1f4b', fontSize: 20 }} />
                  Сводка по ревизии
                </Typography>
                
                <Divider sx={{ my: 2, borderColor: 'rgba(63, 31, 75, 0.1)' }} />
                
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                      Товаров
                    </Typography>
                    <Typography variant="h6" color="#2a0f35" fontWeight={600}>
                      {selectedProducts.length}
                    </Typography>
                    <Typography variant="caption" color="#4c5454">
                      позиций
                    </Typography>
                  </Grid>
                  
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                      Количество
                    </Typography>
                    <Typography variant="h6" color="#2a0f35" fontWeight={600}>
                      {selectedProducts.reduce((s, p) => s + p.quantity, 0)}
                    </Typography>
                    <Typography variant="caption" color="#4c5454">
                      единиц
                    </Typography>
                  </Grid>
                  
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                      Фотографии
                    </Typography>
                    <Typography variant="h6" color="#2a0f35" fontWeight={600}>
                      {photos.length}
                    </Typography>
                    <Typography variant="caption" color="#4c5454">
                      {newPhotosCount > 0 && `(${newPhotosCount} новых)`}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
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
                disabled={step === 0 && selectedProducts.length === 0}
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
  size="small"  // Делает кнопку компактнее
  onClick={() => setConfirmDialog(true)}
  disabled={saving}
  startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
  sx={{
    borderRadius: 4,
    backgroundColor: '#3f1f4b',
    '&:hover': { backgroundColor: '#2a0f35' },
    px: 3,  // Уменьшите горизонтальные паддинги
    py: 0.5,  // Явно задайте минимальные вертикальные паддинги
    fontSize: '0.875rem',  // Уменьшите размер текста
  }}
>
  {saving ? 'Сохранение...' : isEditMode ? 'Обновить заполнение' : 'Сохранить ревизию'}
</Button>

            )}
          </Box>
        </Paper>
      </Container>

      {/* Диалог подтверждения выхода */}
      <Dialog
        open={exitDialog}
        onClose={() => setExitDialog(false)}
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
            Прервать заполнение?
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 2.5, pt: 2 }}>
          <Typography variant="body1" color="#4c5454">
            Внесенные данные не сохранятся. Вы уверены, что хотите выйти?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1, gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
          <Button
            onClick={() => setExitDialog(false)}
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
              setExitDialog(false);
              handleCancel();
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

      {/* Диалог подтверждения отправки */}
      <Dialog
        open={confirmDialog}
        onClose={() => setConfirmDialog(false)}
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
            Подтверждение отправки
          </Typography>
          <Typography variant="body2" color="#4c5454" sx={{ fontSize: '0.85rem' }}>
            Проверьте данные перед отправкой
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 2.5, pt: 2 }}>
          <Stack spacing={2.5}>
            <Box sx={{ 
              p: 2, 
              backgroundColor: 'rgba(63, 31, 75, 0.04)',
              borderRadius: 4,
              border: '1px solid rgba(63, 31, 75, 0.1)',
            }}>
              <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                ОСНОВНАЯ ИНФОРМАЦИЯ
              </Typography>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid size={{ xs: 4 }}>
                  <Typography variant="body2" color="#4c5454">
                    Товары
                  </Typography>
                  <Typography variant="body1" color="#2a0f35" fontWeight={600}>
                    {selectedProducts.length} поз.
                  </Typography>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Typography variant="body2" color="#4c5454">
                    Количество
                  </Typography>
                  <Typography variant="body1" color="#2a0f35" fontWeight={600}>
                    {selectedProducts.reduce((s, p) => s + p.quantity, 0)} шт.
                  </Typography>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Typography variant="body2" color="#4c5454">
                    Фотографии
                  </Typography>
                  <Typography variant="body1" color="#2a0f35" fontWeight={600}>
                    {photos.length} шт.
                  </Typography>
                  {newPhotosCount > 0 && (
                    <Typography variant="caption" color="#4c5454">
                      ({newPhotosCount} новых)
                    </Typography>
                  )}
                </Grid>
              </Grid>
            </Box>

            <Box sx={{ 
              p: 2, 
              backgroundColor: '#f8f7fa',
              borderRadius: 4,
            }}>
              <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                СОСТАВ РЕВИЗИИ
              </Typography>
              <Stack spacing={1} sx={{ mt: 1 }}>
                {selectedProducts.slice(0, 5).map((item, index) => (
                  <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="#2a0f35">
                      {item.productName}
                    </Typography>
                    <Typography variant="body2" color="#674fb6" fontWeight={600}>
                      {item.quantity} шт.
                    </Typography>
                  </Box>
                ))}
                {selectedProducts.length > 5 && (
                  <Typography variant="caption" color="#4c5454" sx={{ mt: 1 }}>
                    ...и еще {selectedProducts.length - 5} товаров
                  </Typography>
                )}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}>
          <Button
            onClick={() => setConfirmDialog(false)}
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
            disabled={saving}
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
            {saving ? 'Сохранение...' : 'Подтвердить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог успеха */}
      <Dialog
        open={successDialog}
        onClose={() => {
          setSuccessDialog(false);
          navigate(`/revisions/${id}`);
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
            Ревизия сохранена!
          </Typography>
          <Typography variant="body2" color="#4c5454">
            {isEditMode ? 'Заполнение успешно обновлено' : 'Ревизия успешно заполнена'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 4 }}>
          <Button
            variant="contained"
            onClick={() => {
              setSuccessDialog(false);
              navigate(`/revisions/${id}`);
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
            К ревизии
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
        getPhotoUrl={(photo) => photo}
        forceMobile={false}
        disableThumbnails={photoViewer.photos.length <= 1}
      />
    </Box>
  );
};

export default FillRevisionPage;