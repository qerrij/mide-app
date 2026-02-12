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
  Inventory as InventoryIcon,
  CheckCircle as CheckCircleIcon,
  PhotoCamera as PhotoCameraIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { productService } from '../api/productService';
import { reportService } from '../api/reportService';
import { Product, ProductCategory, InventoryItem, Report } from '../types';
import { PhotoViewer } from '../components/PhotoViewer';

interface SelectedProduct {
  productId: number;
  quantity: number;
  soldAmount: number;
  availableQuantity: number;
  productName: string;
  productPrice: number;
}

const FixReportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Состояния
  const [step, setStep] = useState(0);
  const [report, setReport] = useState<Report | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [userInventory, setUserInventory] = useState<InventoryItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<string>('');
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [accountantAmount, setAccountantAmount] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successDialog, setSuccessDialog] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [exitDialog, setExitDialog] = useState(false);
  const [photoViewer, setPhotoViewer] = useState<{
    open: boolean;
    photos: string[];
    currentIndex: number;
  }>({
    open: false,
    photos: [],
    currentIndex: 0,
  });

  // Ставка текущего пользователя
  const sellerRate = user?.rate || 0;

  // Загрузка данных
  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      
      if (!id) throw new Error('ID отчета не указан');
      
      const [reportData, productsData, categoriesData, inventoryData] = await Promise.all([
        reportService.getReportById(parseInt(id)),
        productService.getAllProducts(),
        productService.getAllCategories(),
        productService.getMyInventory(),
      ]);
      
      // Проверяем, что отчет принадлежит пользователю и требует исправления
      if (reportData.sellerId !== user?.id) {
        navigate('/reports');
        return;
      }
      
      if (reportData.status !== 'AWAITING_FIX') {
        navigate(`/reports/${id}`);
        return;
      }
      
      setReport(reportData);
      setProducts(productsData);
      setCategories(categoriesData);
      setUserInventory(inventoryData.items || []);
      
      // Загружаем существующие товары из отчета, НО СТАВИМ ЦЕНУ ТОВАРА ИЗ КАТАЛОГА
      const existingProducts: SelectedProduct[] = reportData.products.map(p => {
        const inventoryItem = inventoryData.items?.find(i => i.productId === p.productId);
        const availableQuantity = inventoryItem 
          ? inventoryItem.quantity - (inventoryItem.reservedQuantity || 0) 
          : 0;
        
        // Берем цену из каталога товаров
        const product = productsData.find(prod => prod.id === p.productId);
        const catalogPrice = product?.price || 0;
        
        return {
          productId: p.productId,
          quantity: p.quantity,
          soldAmount: catalogPrice, // СТАВИМ ЦЕНУ ИЗ КАТАЛОГА, а не сохраненную в отчете
          availableQuantity,
          productName: product?.name || `Товар ${p.productId}`,
          productPrice: catalogPrice,
        };
      });
      
      setSelectedProducts(existingProducts);
      setAccountantAmount(reportData.accountantAmount?.toString() || '');
      setComment(reportData.comment || '');
      
    } catch (err: any) {
      setError(err.message || 'Ошибка при загрузке данных');
    } finally {
      setLoadingData(false);
    }
  };

  // Получить доступное количество товара
  const getAvailableQuantity = (productId: number): number => {
    const item = userInventory.find(i => i.productId === productId);
    return item ? item.quantity - (item.reservedQuantity || 0) : 0;
  };

  // Фильтрация доступных товаров для пользователя
  const getAvailableProductsForUser = (): Product[] => {
    return products.filter(product => {
      const availableQty = getAvailableQuantity(product.id);
      return availableQty > 0;
    });
  };

  // Получить уникальные категории из доступных товаров
  const getAvailableCategories = (): ProductCategory[] => {
    const availableProducts = getAvailableProductsForUser();
    const categoryIds = new Set(availableProducts.map(p => p.categoryId));
    return categories.filter(cat => categoryIds.has(cat.id));
  };

  // Добавить товар
  const handleAddProduct = () => {
    if (!selectedProductId || !quantity || parseInt(quantity) <= 0) {
      setError('Выберите товар и укажите количество');
      return;
    }

    const product = products.find(p => p.id === selectedProductId);
    if (!product) {
      setError('Товар не найден');
      return;
    }

    const availableQuantity = getAvailableQuantity(product.id);
    const newQuantity = parseInt(quantity, 10);

    if (newQuantity > availableQuantity) {
      setError(`Доступно только ${availableQuantity} шт. товара "${product.name}"`);
      return;
    }

    const existingItem = selectedProducts.find(p => p.productId === product.id);
    
    if (existingItem) {
      if (existingItem.quantity + newQuantity > availableQuantity) {
        setError(`Всего доступно ${availableQuantity} шт. Уже добавлено ${existingItem.quantity} шт.`);
        return;
      }
      
      setSelectedProducts(prev =>
        prev.map(p =>
          p.productId === product.id
            ? { ...p, quantity: p.quantity + newQuantity }
            : p
        )
      );
    } else {
      setSelectedProducts(prev => [...prev, {
        productId: product.id,
        quantity: newQuantity,
        soldAmount: product.price,
        availableQuantity,
        productName: product.name,
        productPrice: product.price,
      }]);
    }

    setQuantity('');
    setSelectedProductId('');
    setError(null);
  };

  // Удалить товар
  const handleRemoveProduct = (productId: number) => {
    setSelectedProducts(prev => prev.filter(p => p.productId !== productId));
  };

  // Изменить количество
  const handleQuantityChange = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveProduct(productId);
      return;
    }

    const product = selectedProducts.find(p => p.productId === productId);
    if (product && newQuantity > product.availableQuantity) {
      setError(`Доступно только ${product.availableQuantity} шт.`);
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

  // Изменить сумму продажи
  const handleSoldAmountChange = (productId: number, soldAmount: number) => {
    setSelectedProducts(prev =>
      prev.map(p =>
        p.productId === productId
          ? { ...p, soldAmount: Math.max(0, soldAmount) }
          : p
      )
    );
  };

  // Добавить фото
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newPhotos = Array.from(event.target.files);
      
      if (photos.length + newPhotos.length > 5) {
        setError('Максимум 5 фотографий');
        return;
      }
      
      setPhotos(prev => [...prev, ...newPhotos]);
      setError(null);
    }
  };

  // Удалить фото
  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Просмотр фото
  const handleViewPhoto = (photos: string[], index: number) => {
    setPhotoViewer({
      open: true,
      photos,
      currentIndex: index,
    });
  };

  // Обработчик изменения суммы перевода
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAccountantAmount(value);
    }
  };

  // Отправить исправленный отчет
  const handleSubmit = async () => {
    if (!validateStep(2) || !report) return;

    try {
      setLoading(true);
      setError(null);

      const reportProducts = selectedProducts.map(p => ({
        productId: p.productId,
        quantity: p.quantity,
        soldAmount: p.soldAmount,
      }));

      const amount = parseFloat(accountantAmount) || 0;

      await reportService.fixReport(
        report.id,
        reportProducts,
        amount,
        photos,
        comment || undefined
      );

      setSuccessDialog(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка при исправлении отчета');
    } finally {
      setLoading(false);
      setConfirmDialog(false);
    }
  };

  // Валидация шагов
  const validateStep = (stepNumber: number): boolean => {
    setError(null);

    switch (stepNumber) {
      case 0:
        if (selectedProducts.length === 0) {
          setError('Добавьте хотя бы один товар');
          return false;
        }
        
        for (const product of selectedProducts) {
          if (product.quantity > product.availableQuantity) {
            setError(`Недостаточно товара "${product.productName}"`);
            return false;
          }
        }
        return true;

      case 1:
        if (photos.length === 0) {
          setError('Прикрепите фотографии перевода');
          return false;
        }
        return true;

      case 2:
        const amount = parseFloat(accountantAmount);
        if (accountantAmount === '' || isNaN(amount) || amount <= 0) {
          setError('Укажите корректную сумму перевода');
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  // Фильтрация доступных товаров по категории
  const availableProducts = getAvailableProductsForUser();
  const availableCategories = getAvailableCategories();
  
  const filteredProducts = selectedCategoryId === 'all'
    ? availableProducts
    : availableProducts.filter(p => p.categoryId === selectedCategoryId);

  // Группировка по категориям для отображения
  const productsByCategory = filteredProducts.reduce((acc, product) => {
    const categoryName = categories.find(c => c.id === product.categoryId)?.name || `Категория ${product.categoryId}`;
    if (!acc[categoryName]) acc[categoryName] = [];
    acc[categoryName].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  // Общая сумма за товары (с учетом ставки продавца)
  const totalProductAmount = selectedProducts.reduce((sum, p) => {
    const amountPerUnit = p.soldAmount - sellerRate;
    return sum + (p.quantity * Math.max(0, amountPerUnit));
  }, 0);

  // Кнопки навигации
  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  // Обработчик выхода
  const handleExit = () => {
    const hasChanges = 
      JSON.stringify(selectedProducts.map(p => ({ 
        productId: p.productId, 
        quantity: p.quantity, 
        soldAmount: p.soldAmount 
      }))) !== 
      JSON.stringify(report?.products.map(p => ({ 
        productId: p.productId, 
        quantity: p.quantity, 
        soldAmount: p.soldAmount 
      }))) ||
      photos.length > 0 ||
      comment !== (report?.comment || '') ||
      accountantAmount !== (report?.accountantAmount?.toString() || '');
    
    if (hasChanges) {
      setExitDialog(true);
    } else {
      navigate(`/reports/${id}`);
    }
  };

  // Создание временных URL для фото
  const getPhotoPreviewUrl = (photo: File): string => {
    return URL.createObjectURL(photo);
  };

  // Валидация суммы перевода
  const isAmountValid = accountantAmount !== '' && !isNaN(parseFloat(accountantAmount)) && parseFloat(accountantAmount) > 0;

  if (loadingData) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f3f6', pt: 8 }}>
        <Container maxWidth="md">
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <CircularProgress sx={{ color: '#674fb6' }} />
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f3f6', pt: 8 }}>
      {/* Простая кнопка назад над формой слева */}
      <Container maxWidth="md" sx={{ px: { xs: 1, sm: 2, md: 3 }, mb: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleExit}
          sx={{
            borderRadius: 4,
            color: '#674fb6',
            textTransform: 'none',
            fontSize: '0.95rem',
            px: 2,
            py: 1,
            border: '1px solid rgba(103, 79, 182, 0.2)',
            '&:hover': {
              backgroundColor: 'rgba(103, 79, 182, 0.04)',
              border: '1px solid rgba(103, 79, 182, 0.3)',
            },
          }}
        >
          К отчету
        </Button>
      </Container>

      <Container 
        maxWidth="md" 
        sx={{ 
          px: { xs: 1, sm: 2, md: 3 },
        }}
      >
        {report?.accountantComment && (
          <Alert
            severity="error"
            sx={{
              mb: 3,
              borderRadius: 4,
              backgroundColor: 'rgba(244, 67, 54, 0.08)',
              border: '1px solid rgba(244, 67, 54, 0.2)',
              color: '#f44336',
              '& .MuiAlert-icon': { color: '#f44336' },
            }}
          >
            <Typography variant="subtitle2" fontWeight={600}>
              Причина отклонения бухгалтером:
            </Typography>
            <Typography variant="body2">
              {report.accountantComment}
            </Typography>
          </Alert>
        )}

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
            {step === 0 && 'Изменить товары в отчете'}
            {step === 1 && 'Фотографии перевода'}
            {step === 2 && 'Изменить информацию о переводе'}
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

          {/* Шаг 1: Выбор товаров */}
          {step === 0 && (
            <>
              {availableProducts.length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: 4, mb: 3 }}>
                  У вас нет доступных товаров для отчета
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
                      onChange={(e: SelectChangeEvent<number | 'all'>) => 
                        setSelectedCategoryId(e.target.value as number | 'all')
                      }
                      sx={{
                        borderRadius: 4,
                        backgroundColor: '#f8f7fa',
                      }}
                    >
                      <MenuItem value="all">Все категории</MenuItem>
                      {availableCategories.map(category => (
                        <MenuItem key={category.id} value={category.id}>
                          {category.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Выбор товара и количество */}
                  <Grid container spacing={2} sx={{ mb: 4 }}>
                    <Grid size={{ xs: 12, md: 7 }}>
                      <FormControl fullWidth>
                        <InputLabel id="product-label">Товар</InputLabel>
                        <Select
                          labelId="product-label"
                          value={selectedProductId}
                          label="Товар"
                          onChange={(e: SelectChangeEvent<number>) => 
                            setSelectedProductId(e.target.value as number)
                          }
                          sx={{
                            borderRadius: 4,
                            backgroundColor: '#f8f7fa',
                          }}
                        >
                          <MenuItem value="">
                            <em>Выберите товар</em>
                          </MenuItem>
                          {filteredProducts.map(product => {
                            const available = getAvailableQuantity(product.id);
                            return (
                              <MenuItem key={product.id} value={product.id}>
                                {product.name} (SKU: {product.sku}) - {available} шт.
                              </MenuItem>
                            );
                          })}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 8, md: 3 }}>
                      <TextField
                        fullWidth
                        label="Количество"
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        disabled={!selectedProductId}
                        inputProps={{ min: 1 }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 4,
                            backgroundColor: '#f8f7fa',
                          },
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 4, md: 2 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleAddProduct}
                        disabled={!selectedProductId || !quantity || parseInt(quantity) <= 0}
                        sx={{
                          borderRadius: 4,
                          backgroundColor: '#674fb6',
                          '&:hover': { backgroundColor: '#483399' },
                          height: '56px',
                        }}
                      >
                        Добавить
                      </Button>
                    </Grid>
                  </Grid>

                  {/* Список добавленных товаров */}
                  {selectedProducts.length > 0 && (
                    <Box sx={{ mt: 4 }}>
                      <Divider sx={{ mb: 3 }} />
                      
                      <Typography variant="subtitle1" color="#2a0f35" fontWeight={600} sx={{ mb: 2 }}>
                        Товары в отчете ({selectedProducts.length})
                      </Typography>

                      <Stack spacing={2}>
                        {selectedProducts.map((item) => {
                          const amountAfterCommission = item.soldAmount - sellerRate;
                          const totalAfterCommission = amountAfterCommission * item.quantity;
                          
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
                                <Grid size={{ xs: 12, sm: 4 }}>
                                  <Typography variant="body2" fontWeight={600} color="#2a0f35">
                                    {item.productName}
                                  </Typography>
                                  <Typography variant="caption" color="#4c5454">
                                    Цена: {item.productPrice}₽ • Доступно: {item.availableQuantity} шт.
                                  </Typography>
                                </Grid>

                                <Grid size={{ xs: 6, sm: 3 }}>
                                  <TextField
                                    label="Кол-во"
                                    type="number"
                                    size="small"
                                    value={item.quantity}
                                    onChange={(e) => handleQuantityChange(item.productId, parseInt(e.target.value) || 0)}
                                    inputProps={{ min: 1, max: item.availableQuantity }}
                                    error={item.quantity > item.availableQuantity}
                                    helperText={item.quantity > item.availableQuantity ? `Макс: ${item.availableQuantity}` : ''}
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
                                  <TextField
                                    label="Цена продажи"
                                    type="number"
                                    size="small"
                                    value={item.soldAmount}
                                    onChange={(e) => handleSoldAmountChange(item.productId, parseFloat(e.target.value) || 0)}
                                    InputProps={{
                                      endAdornment: <InputAdornment position="end">₽</InputAdornment>,
                                    }}
                                    fullWidth
                                    sx={{
                                      '& .MuiOutlinedInput-root': {
                                        borderRadius: 4,
                                        backgroundColor: '#ffffff',
                                      },
                                    }}
                                  />
                                </Grid>

                                <Grid size={{ xs: 12, sm: 2 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                    <Box sx={{ textAlign: 'right', mr: 1 }}>
                                      <Typography variant="body2" fontWeight={600} color="#674fb6">
                                        {totalAfterCommission.toFixed(2)}₽
                                      </Typography>
                                      {sellerRate > 0 && (
                                        <Typography variant="caption" color="#4c5454" display="block">
                                          {amountAfterCommission.toFixed(2)}₽/шт
                                        </Typography>
                                      )}
                                    </Box>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleRemoveProduct(item.productId)}
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
                    </Box>
                  )}
                </>
              )}
            </>
          )}

          {/* Шаг 2: Фотографии - без фона и подписей */}
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
                  cursor: photos.length >= 5 ? 'not-allowed' : 'pointer',
                  opacity: photos.length >= 5 ? 0.6 : 1,
                  transition: 'all 0.2s',
                  '&:hover': photos.length < 5 ? {
                    borderColor: '#674fb6',
                    backgroundColor: 'rgba(103, 79, 182, 0.02)',
                  } : {},
                }}
                onClick={() => {
                  if (photos.length < 5) {
                    document.getElementById('photo-upload')?.click();
                  }
                }}
              >
                <PhotoCameraIcon sx={{ fontSize: 48, color: '#674fb6', mb: 1 }} />
                <Typography variant="body1" color="#2a0f35" fontWeight={500}>
                  {photos.length > 0 ? 'Добавить еще фотографии' : 'Прикрепить фотографии перевода'}
                </Typography>
                <Typography variant="caption" color="#4c5454" display="block" sx={{ mt: 1 }}>
                  {photos.length}/5 фотографий • Нажмите для загрузки
                </Typography>
              </Box>

              {/* Новые фотографии */}
              {photos.length > 0 && (
                <Grid container spacing={1.5}>
                  {photos.map((photo, index) => {
                    const photoUrl = getPhotoPreviewUrl(photo);
                    
                    return (
                      <Grid size={{ xs: 6, sm: 4, md: 3 }} key={`new-${index}`}>
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
                          onClick={() => handleViewPhoto([photoUrl], 0)}
                        >
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
                    );
                  })}
                </Grid>
              )}
            </>
          )}

          {/* Шаг 3: Информация о переводе */}
          {step === 2 && (
            <Stack spacing={3}>
              <TextField
                fullWidth
                label="Сумма перевода *"
                type="text"
                value={accountantAmount}
                onChange={handleAmountChange}
                placeholder="0.00"
                InputProps={{
                  endAdornment: <InputAdornment position="end">₽</InputAdornment>,
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 4,
                    backgroundColor: '#f8f7fa',
                  },
                }}
                error={accountantAmount !== '' && !isAmountValid}
                helperText={accountantAmount !== '' && !isAmountValid ? 'Введите корректную сумму' : ''}
              />

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
                    <CheckCircleIcon sx={{ color: '#3f1f4b', fontSize: 20 }} />
                    Сводка по отчету
                  </Typography>
                  
                  <Divider sx={{ my: 2, borderColor: 'rgba(63, 31, 75, 0.1)' }} />
                  
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6, sm: 3 }}>
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
                    
                    <Grid size={{ xs: 6, sm: 3 }}>
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
                    
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                        Сумма за товары
                      </Typography>
                      <Typography variant="h6" color="#674fb6" fontWeight={600}>
                        {totalProductAmount.toFixed(2)}₽
                      </Typography>
                      {sellerRate > 0 && (
                        <Typography variant="caption" color="#4c5454">
                          после комиссии
                        </Typography>
                      )}
                    </Grid>
                    
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                        Фотографии
                      </Typography>
                      <Typography variant="h6" color="#2a0f35" fontWeight={600}>
                        {photos.length}
                      </Typography>
                      <Typography variant="caption" color="#4c5454">
                        шт.
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed rgba(63, 31, 75, 0.2)' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="#4c5454">
                        Сумма перевода:
                      </Typography>
                      <Typography variant="h5" color="#3f1f4b" fontWeight={700}>
                        {accountantAmount ? parseFloat(accountantAmount).toFixed(2) : '0.00'}₽
                      </Typography>
                    </Box>
                    {comment && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontWeight: 600 }}>
                          КОММЕНТАРИЙ
                        </Typography>
                        <Typography variant="body2" color="#2a0f35" sx={{ backgroundColor: '#ffffff', p: 1.5, borderRadius: 4 }}>
                          {comment}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Stack>
          )}

          {/* Кнопки навигации */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            {step > 0 && (
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
                onClick={() => setConfirmDialog(true)}
                disabled={loading || !isAmountValid}
                sx={{
                  borderRadius: 4,
                  backgroundColor: '#3f1f4b',
                  '&:hover': { backgroundColor: '#2a0f35' },
                  px: 4,
                }}
              >
                {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Отправить исправленный отчет'}
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
            Прервать исправление?
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 2.5, pt: 2 }}>
          <Typography variant="body1" color="#4c5454">
            Внесенные изменения не сохранятся. Вы уверены, что хотите выйти?
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
              navigate(`/reports/${id}`);
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
            Проверьте исправленные данные перед отправкой
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
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" color="#4c5454">
                    Сумма перевода
                  </Typography>
                  <Typography variant="h6" color="#3f1f4b" fontWeight={700}>
                    {accountantAmount ? parseFloat(accountantAmount).toFixed(2) : '0.00'} ₽
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" color="#4c5454">
                    К получению
                  </Typography>
                  <Typography variant="h6" color="#674fb6" fontWeight={700}>
                    {totalProductAmount.toFixed(2)} ₽
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            <Box sx={{ 
              p: 2, 
              backgroundColor: '#f8f7fa',
              borderRadius: 4,
            }}>
              <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                СОСТАВ ОТЧЕТА
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
            disabled={loading}
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
            Отправить исправленный отчет
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог успеха */}
      <Dialog
        open={successDialog}
        onClose={() => {
          setSuccessDialog(false);
          navigate('/reports');
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
            Отчет исправлен!
          </Typography>
          <Typography variant="body2" color="#4c5454">
            Бухгалтер приступит к повторной проверке
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 4 }}>
          <Button
            variant="contained"
            onClick={() => {
              setSuccessDialog(false);
              navigate('/reports');
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
            К списку отчетов
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

export default FixReportPage;