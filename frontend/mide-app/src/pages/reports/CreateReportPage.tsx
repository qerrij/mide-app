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
  Inventory as InventoryIcon,
  CheckCircle as CheckCircleIcon,
  PhotoCamera as PhotoCameraIcon,
  Info as InfoIcon,
  ExitToApp as ExitToAppIcon,
  AccountBalance as AccountBalanceIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { productService } from '../../api/productService';
import { reportService } from '../../api/reportService';
import { userService } from '../../api/userService';
import { userCategoryRateService } from '../../api/userCategoryRateService';
import { assignmentsService } from '../../api/assignmentsService';
import { Product, ProductCategory, InventoryItem, UserCategoryRate, User } from '../../types';
import { PhotoViewer } from '../../components/PhotoViewer';

interface SelectedProduct {
  productId: number;
  quantity: number;
  soldAmount: number;
  availableQuantity: number;
  productName: string;
  productPrice: number;
  productDefaultRate?: number;
  effectiveRate: number;
  categoryId: number;
}

const CreateReportPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Состояния
  const [step, setStep] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [userInventory, setUserInventory] = useState<InventoryItem[]>([]);
  const [userCategoryRates, setUserCategoryRates] = useState<Map<number, number>>(new Map());
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<string>('');
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [accountantAmount, setAccountantAmount] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  
  // Новое состояние для бухгалтера
  const [accountantInfo, setAccountantInfo] = useState<{
    id: number;
    fullName: string;
    description: string | null;
  } | null>(null);
  const [loadingAccountant, setLoadingAccountant] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
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

  // Загрузка данных
  useEffect(() => {
    loadData();
    loadUserRates();
    loadAccountantInfo();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const loadData = async () => {
    try {
      setLoadingProducts(true);
      
      const [productsData, categoriesData, inventoryData] = await Promise.all([
        productService.getAllProducts(),
        productService.getAllCategories(),
        productService.getMyInventory(),
      ]);
      
      setProducts(productsData);
      setCategories(categoriesData);
      setUserInventory(inventoryData.items || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Ошибка при загрузке данных');
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadUserRates = async () => {
    if (!user) return;
    
    try {
      const rates = await userCategoryRateService.getUserCategoryRates?.(user.id);
      if (rates && Array.isArray(rates)) {
        const ratesMap = new Map<number, number>();
        rates.forEach((rate: UserCategoryRate) => {
          ratesMap.set(rate.category_id, rate.rate);
        });
        setUserCategoryRates(ratesMap);
      }
    } catch (err) {
      console.error('Error loading user rates:', err);
    }
  };

  const loadAccountantInfo = async () => {
    if (!user) return;
    
    setLoadingAccountant(true);
    try {
      // Используем новый метод userService
      const response = await userService.getMyAccountantInfo();
      
      if (response.has_accountant && response.accountant) {
        setAccountantInfo({
          id: response.accountant.id,
          fullName: response.accountant.full_name,
          description: response.accountant.description,
        });
      } else {
        setAccountantInfo(null);
      }
    } catch (err) {
      console.error('Error loading accountant info:', err);
      setAccountantInfo(null);
    } finally {
      setLoadingAccountant(false);
    }
  };

  // Расчет эффективной ставки для товара
  const calculateEffectiveRate = (product: Product): number => {
    // 1. Приоритет: ставка товара (если задана владельцем)
    if (product.defaultRate && product.defaultRate > 0) {
      return product.defaultRate;
    }
    
    // 2. Приоритет: ставка продавца для категории товара
    const categoryRate = userCategoryRates.get(product.categoryId);
    if (categoryRate && categoryRate > 0) {
      return categoryRate;
    }
    
    // 3. Приоритет: ставка 0
    return 0;
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

    const effectiveRate = calculateEffectiveRate(product);
    const existingItem = selectedProducts.find(p => p.productId === product.id);
    
    if (existingItem) {
      if (existingItem.quantity + newQuantity > availableQuantity) {
        setError(`Всего доступно ${availableQuantity} шт. Уже добавлено ${existingItem.quantity} шт.`);
        return;
      }
      
      setSelectedProducts(prev =>
        prev.map(p =>
          p.productId === product.id
            ? { ...p, quantity: p.quantity + newQuantity, effectiveRate }
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
        productDefaultRate: product.defaultRate,
        effectiveRate,
        categoryId: product.categoryId,
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

  // Отправить отчет
  const handleSubmit = async () => {
    if (!validateStep(2)) return;

    try {
      setLoading(true);
      setError(null);

      const reportProducts = selectedProducts.map(p => ({
        productId: p.productId,
        quantity: p.quantity,
        soldAmount: p.soldAmount,
      }));

      const amount = parseFloat(accountantAmount) || 0;

      await reportService.createReport(
        reportProducts,
        amount,
        photos,
        comment || undefined
      );

      setSuccessDialog(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка при создании отчета');
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

  // Общая сумма за товары (с учетом эффективной ставки)
  const totalProductAmount = selectedProducts.reduce((sum, p) => {
    const amountPerUnit = p.soldAmount - p.effectiveRate;
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
  const handleExitClick = () => {
    const hasData = selectedProducts.length > 0 || photos.length > 0 || comment || accountantAmount !== '';
    if (hasData) {
      setExitDialog(true);
    } else {
      navigate('/reports');
    }
  };

  // Создание временных URL для фото
  const getPhotoPreviewUrl = (photo: File): string => {
    return URL.createObjectURL(photo);
  };

  // Валидация суммы перевода
  const isAmountValid = accountantAmount !== '' && !isNaN(parseFloat(accountantAmount)) && parseFloat(accountantAmount) > 0;

  // Показываем блок добавления товара только когда выбрана категория
  const showProductSelect = selectedCategoryId !== 'all';
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
            {step === 0 && 'Выбор товаров'}
            {step === 1 && 'Фотографии перевода'}
            {step === 2 && 'Информация о переводе'}
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
              {loadingProducts ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress sx={{ color: '#674fb6' }} />
                </Box>
              ) : (
                <>
                  {availableProducts.length === 0 ? (
                    <Alert severity="info" sx={{ borderRadius: 4, mb: 3 }}>
                      У вас нет доступных товаров для отчета
                    </Alert>
                  ) : (
                    <>
                      {/* Выбор категории - всегда отображается */}
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
                          MenuProps={{
                            disableScrollLock: true,
                          }}
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

                      {/* Выбор товара - появляется после выбора категории */}
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
                            {filteredProducts.map(product => {
                              const available = getAvailableQuantity(product.id);
                              return (
                                <MenuItem key={product.id} value={product.id}>
                                  {product.name} - {available} шт.
                                </MenuItem>
                              );
                            })}
                          </Select>
                        </FormControl>
                      )}

                      {/* Количество и кнопка добавления - появляются после выбора товара */}
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
                          
                          <Typography variant="subtitle1" color="#2a0f35" fontWeight={600} sx={{ mb: 2 }}>
                            Добавленные товары ({selectedProducts.length})
                          </Typography>

                          <Stack spacing={2}>
                            {selectedProducts.map((item) => {
                              const amountAfterRate = item.soldAmount - item.effectiveRate;
                              const totalAfterRate = amountAfterRate * item.quantity;
                              
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
                                        Цена: {item.productPrice}₽
                                      </Typography>
                                      {item.effectiveRate > 0 && (
                                        <Typography variant="caption" color="#ca0ec0" display="block">
                                          Ставка: {item.effectiveRate}₽/шт
                                        </Typography>
                                      )}
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
                                            {totalAfterRate.toFixed(2)}₽
                                          </Typography>
                                          {item.effectiveRate > 0 && (
                                            <Typography variant="caption" color="#4c5454" display="block">
                                              {amountAfterRate.toFixed(2)}₽/шт
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
                      <Typography variant="caption" color="#4c5454">
                        после вычета ставок
                      </Typography>
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
                  
                  {/* НОВЫЙ БЛОК: Информация о бухгалтере */}
                  {!loadingAccountant && accountantInfo && (
                    <Box sx={{ 
                      mt: 2, 
                      pt: 2, 
                      borderTop: '1px dashed rgba(63, 31, 75, 0.2)',
                      backgroundColor: 'rgba(255, 152, 0, 0.05)',
                      borderRadius: 2,
                      p: 1.5,
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <AccountBalanceIcon sx={{ color: '#ff9800', fontSize: 20 }} />
                        <Typography variant="subtitle2" color="#ff9800" fontWeight={600}>
                          Реквизиты для перевода
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="#2a0f35" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {accountantInfo.description || `Бухгалтер: ${accountantInfo.fullName}\nРеквизиты не указаны. Уточните у бухгалтера.`}
                      </Typography>
                    </Box>
                  )}
                  
                  {!loadingAccountant && !accountantInfo && (
                    <Box sx={{ 
                      mt: 2, 
                      pt: 2, 
                      borderTop: '1px dashed rgba(63, 31, 75, 0.2)',
                      backgroundColor: 'rgba(244, 67, 54, 0.05)',
                      borderRadius: 2,
                      p: 1.5,
                    }}>
                      <Typography variant="body2" color="#f44336" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <InfoIcon sx={{ fontSize: 18 }} />
                        Внимание: Вам не назначен бухгалтер. Уточните реквизиты для перевода у руководителя.
                      </Typography>
                    </Box>
                  )}
                  
                  {loadingAccountant && (
                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed rgba(63, 31, 75, 0.2)', textAlign: 'center' }}>
                      <CircularProgress size={24} sx={{ color: '#ff9800' }} />
                      <Typography variant="caption" color="#4c5454" display="block">
                        Загрузка реквизитов...
                      </Typography>
                    </Box>
                  )}
                  
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
                onClick={() => setConfirmDialog(true)}
                disabled={loading || !isAmountValid}
                sx={{
                  borderRadius: 4,
                  backgroundColor: '#3f1f4b',
                  '&:hover': { backgroundColor: '#2a0f35' },
                  px: 4,
                }}
              >
                {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Отправить отчет'}
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
            Введенные данные не сохранятся. Вы уверены, что хотите выйти?
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
              navigate('/reports');
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

            {/* Добавляем информацию о бухгалтере в диалог подтверждения */}
            {accountantInfo && (
              <Box sx={{ 
                p: 2, 
                backgroundColor: 'rgba(255, 152, 0, 0.05)',
                borderRadius: 4,
                border: '1px solid rgba(255, 152, 0, 0.2)',
              }}>
                <Typography variant="caption" color="#ff9800" display="block" gutterBottom sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                  РЕКВИЗИТЫ ДЛЯ ПЕРЕВОДА
                </Typography>
                <Typography variant="body2" color="#2a0f35" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {accountantInfo.description || `Бухгалтер: ${accountantInfo.fullName}\nРеквизиты не указаны. Уточните у бухгалтера.`}
                </Typography>
              </Box>
            )}

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
            Отправить отчет
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
            Отчет отправлен!
          </Typography>
          <Typography variant="body2" color="#4c5454">
            Бухгалтер приступит к проверке в ближайшее время
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

export default CreateReportPage;