import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
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
  Person as PersonIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { transferService } from '../../api/transferService';
import { userService } from '../../api/userService';
import { productService } from '../../api/productService';
import { inventoryService } from '../../api/inventoryService';
import {
  TransferItemBase,
  User,
  UserRole,
  Product,
  TransferRequestType,
  InventoryItem,
  getRoleName,
} from '../../types';
import { PhotoViewer } from '../../components/PhotoViewer';

interface SelectedProduct {
  productId: number;
  expectedQuantity: number;
  availableQuantity: number;
  productName: string;
  notes: string;
  sku: string;
  categoryName: string;
}

const CreateTransferPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Состояния
  const [step, setStep] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [userInventory, setUserInventory] = useState<InventoryItem[]>([]);
  const [inventoryProducts, setInventoryProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<string>('');
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [comment, setComment] = useState<string>('');
  
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [successDialog, setSuccessDialog] = useState(false);
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

  // Данные формы
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    fromUserId: user?.id || 0,
    toUserId: 0,
    executorId: undefined as number | undefined,
  });

  // Загрузка данных
  useEffect(() => {
    loadData();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Скролл к верху страницы при смене шага
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  useEffect(() => {
    if (formData.fromUserId) {
      loadUserInventory();
    }
  }, [formData.fromUserId]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      
      const [usersData, categoriesData] = await Promise.all([
        userService.getAllUsersBasic(),
        productService.getAllCategories(),
      ]);
      
      // Фильтруем пользователей: не показываем себя как получателя
      const availableUsers = usersData
        .map(u => ({
          id: u.id,
          fullName: u.fullName,
          role: u.role,
        } as User))
        .filter(u => u.id !== user?.id);
      
      setUsers(availableUsers);
      setCategories(categoriesData);
      
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Ошибка при загрузке данных');
    } finally {
      setLoadingData(false);
    }
  };

  const loadUserInventory = async () => {
    try {
      const inventory = await inventoryService.getMyInventory();
      
      const myItems = inventory.items.filter((item: InventoryItem) => 
        item.userId === user?.id
      );
      
      setUserInventory(myItems);
      
      if (myItems.length > 0) {
        const productPromises = myItems.map(async (item: InventoryItem) => {
          try {
            const product = await productService.getProductById(item.productId);
            return product;
          } catch (error) {
            console.error(`Error loading product ${item.productId}:`, error);
            return null;
          }
        });
        
        const products = (await Promise.all(productPromises)).filter(Boolean) as Product[];
        setInventoryProducts(products);
      } else {
        setInventoryProducts([]);
      }
      
    } catch (error) {
      console.error('Error loading inventory:', error);
      setUserInventory([]);
      setInventoryProducts([]);
    }
  };

  // Получить доступное количество товара
  const getAvailableQuantity = (productId: number): number => {
    const item = userInventory.find(i => i.productId === productId);
    return item ? item.quantity - (item.reservedQuantity || 0) : 0;
  };

  // Фильтрация доступных товаров для пользователя
  const getAvailableProductsForUser = (): Product[] => {
    return inventoryProducts.filter(product => {
      const availableQty = getAvailableQuantity(product.id);
      return availableQty > 0;
    });
  };

  // Получить уникальные категории из доступных товаров
  const getAvailableCategories = (): any[] => {
    const availableProducts = getAvailableProductsForUser();
    const categoryIds = new Set(availableProducts.map(p => p.categoryId));
    return categories.filter(cat => categoryIds.has(cat.id));
  };

  // Получить информацию о товаре
  const getProductInfo = (productId: number): { name: string; sku: string; categoryName: string } => {
    const product = inventoryProducts.find(p => p.id === productId);
    if (!product) return { name: '', sku: '', categoryName: '' };
    
    const category = categories.find(c => c.id === product.categoryId);
    return {
      name: product.name,
      sku: product.sku,
      categoryName: category ? category.name : '',
    };
  };

  // Добавить товар
  const handleAddProduct = () => {
    if (!selectedProductId || !quantity || parseInt(quantity) <= 0) {
      setError('Выберите товар и укажите количество');
      return;
    }

    const product = inventoryProducts.find(p => p.id === selectedProductId);
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
      if (existingItem.expectedQuantity + newQuantity > availableQuantity) {
        setError(`Всего доступно ${availableQuantity} шт. Уже добавлено ${existingItem.expectedQuantity} шт.`);
        return;
      }
      
      setSelectedProducts(prev =>
        prev.map(p =>
          p.productId === product.id
            ? { ...p, expectedQuantity: p.expectedQuantity + newQuantity }
            : p
        )
      );
    } else {
      const productInfo = getProductInfo(product.id);
      setSelectedProducts(prev => [...prev, {
        productId: product.id,
        expectedQuantity: newQuantity,
        availableQuantity,
        productName: productInfo.name,
        notes: '',
        sku: productInfo.sku,
        categoryName: productInfo.categoryName,
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
          ? { ...p, expectedQuantity: newQuantity }
          : p
      )
    );
  };

  // Изменить примечание
  const handleNotesChange = (productId: number, notes: string) => {
    setSelectedProducts(prev =>
      prev.map(p =>
        p.productId === productId
          ? { ...p, notes }
          : p
      )
    );
  };

  // Добавить фото
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newPhotos = Array.from(event.target.files);
      
      // Проверяем тип файлов
      for (const file of newPhotos) {
        if (!file.type.startsWith('image/')) {
          setError(`Файл "${file.name}" не является изображением`);
          return;
        }
        if (file.size > 10 * 1024 * 1024) {
          setError(`Файл "${file.name}" слишком большой. Максимум 10MB`);
          return;
        }
      }
      
      if (photos.length + newPhotos.length > 10) {
        setError('Максимум 10 фотографий');
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

  // Создание временных URL для фото
  const getPhotoPreviewUrl = (photo: File): string => {
    return URL.createObjectURL(photo);
  };

  // Отправить перемещение
  const handleSubmit = async () => {
    if (!validateStep(2)) return;

    try {
      setLoading(true);
      setError(null);

      const transferData = {
        title: formData.title,
        description: formData.description || '',
        fromUserId: formData.fromUserId,
        toUserId: formData.toUserId,
        executorId: formData.executorId,
        requestType: TransferRequestType.USER_REQUEST,
        items: selectedProducts.map(p => ({
          productId: p.productId,
          expectedQuantity: p.expectedQuantity,
          notes: p.notes || undefined,
        })),
      };

      await transferService.createUserRequest(transferData, photos);
      
      setSuccessDialog(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка при создании перемещения');
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
        if (!formData.title.trim()) {
          setError('Введите название перемещения');
          return false;
        }
        if (!formData.toUserId) {
          setError('Выберите получателя');
          return false;
        }
        if (formData.fromUserId === formData.toUserId) {
          setError('Получатель не может быть отправителем');
          return false;
        }
        return true;

      case 1:
        if (selectedProducts.length === 0) {
          setError('Добавьте хотя бы один товар');
          return false;
        }
        return true;

      case 2:
        if (photos.length === 0) {
          setError('Прикрепите фотографии товаров');
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
    const hasData = formData.title || formData.description || formData.toUserId || 
                   selectedProducts.length > 0 || photos.length > 0 || comment;
    if (hasData) {
      setExitDialog(true);
    } else {
      navigate('/movements');
    }
  };

  // Показываем блок добавления товара только когда выбрана категория
  const showProductSelect = selectedCategoryId !== 'all';
  const showQuantityAndAdd = showProductSelect && selectedProductId !== '';

  const totalItems = selectedProducts.reduce((sum, p) => sum + p.expectedQuantity, 0);

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
            {step === 0 && 'Основная информация'}
            {step === 1 && 'Выбор товаров'}
            {step === 2 && 'Фотографии и подтверждение'}
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

          {/* Шаг 1: Основная информация */}
          {step === 0 && (
            <Stack spacing={3}>
              <TextField
                fullWidth
                label="Название перемещения *"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Например: Перемещение товаров в магазин №1"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 4,
                    backgroundColor: '#f8f7fa',
                  },
                }}
              />

              <TextField
                fullWidth
                label="Описание"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={3}
                placeholder="Дополнительная информация о перемещении..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 4,
                    backgroundColor: '#f8f7fa',
                  },
                }}
              />

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined" sx={{ 
                    p: 2, 
                    borderRadius: 4,
                    borderColor: 'rgba(103, 79, 182, 0.2)',
                    backgroundColor: '#f8f7fa',
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <PersonIcon sx={{ color: '#674fb6' }} />
                      <Typography variant="subtitle2" color="#2a0f35" fontWeight={600}>
                        Отправитель
                      </Typography>
                    </Box>
                    <Typography variant="body1" fontWeight={500} color="#2a0f35">
                      {user?.fullName || 'Вы'}
                    </Typography>
                    <Typography variant="caption" color="#4c5454">
                      ID: {user?.id} • {getRoleName(user?.role || UserRole.SELLER)}
                    </Typography>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel id="recipient-label">Получатель *</InputLabel>
                    <Select
                      labelId="recipient-label"
                      value={formData.toUserId}
                      label="Получатель *"
                      onChange={(e: SelectChangeEvent<number>) => setFormData({ ...formData, toUserId: Number(e.target.value) })}
                      sx={{
                        borderRadius: 4,
                        backgroundColor: '#f8f7fa',
                      }}
                    >
                      <MenuItem value={0}>Выберите получателя</MenuItem>
                      {users.map((u) => (
                        <MenuItem key={u.id} value={u.id}>
                          {u.fullName} ({getRoleName(u.role)})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <FormControl fullWidth>
                    <InputLabel id="executor-label">Курьер</InputLabel>
                    <Select
                      labelId="executor-label"
                      value={formData.executorId || ''}
                      label="Курьер"
                      onChange={(e: SelectChangeEvent<number>) => setFormData({ 
                        ...formData, 
                        executorId: e.target.value ? Number(e.target.value) : undefined 
                      })}
                      sx={{
                        borderRadius: 4,
                        backgroundColor: '#f8f7fa',
                      }}
                    >
                      <MenuItem value="">Не указан (отправитель)</MenuItem>
                      {users.map((u) => (
                        <MenuItem key={u.id} value={u.id}>
                          {u.fullName} ({getRoleName(u.role)})
                        </MenuItem>
                      ))}
                    </Select>
                    <Typography variant="caption" color="#4c5454" sx={{ mt: 1 }}>
                      Кто будет физически перемещать товары
                    </Typography>
                  </FormControl>
                </Grid>
              </Grid>
            </Stack>
          )}

          {/* Шаг 2: Выбор товаров */}
          {step === 1 && (
            <>
              {loadingData ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress sx={{ color: '#674fb6' }} />
                </Box>
              ) : (
                <>
                  {availableProducts.length === 0 ? (
                    <Alert severity="info" sx={{ borderRadius: 4, mb: 3 }}>
                      Ваш инвентарь пуст. Невозможно создать перемещение без товаров.
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
                          onChange={(e: SelectChangeEvent<number | 'all'>) => {
                            setSelectedCategoryId(e.target.value as number | 'all');
                            setSelectedProductId('');
                            setQuantity('');
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
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                      <span>{product.name}</span>
                                      <Chip 
                                        label={`${available} шт.`} 
                                        size="small" 
                                        sx={{ 
                                          ml: 2, 
                                          backgroundColor: available > 0 ? 'rgba(103, 79, 182, 0.1)' : 'rgba(202, 14, 192, 0.1)',
                                          color: available > 0 ? '#674fb6' : '#ca0ec0',
                                        }} 
                                      />
                                    </Box>
                                  </MenuItem>
                                );
                              })}
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
                            
                            <Typography variant="subtitle1" color="#2a0f35" fontWeight={600} sx={{ mb: 2 }}>
                              Добавленные товары ({selectedProducts.length})
                            </Typography>

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
                                <Box sx={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between', 
                                  alignItems: 'center',
                                  mb: 1.5
                                }}>
                                  <Box>
                                    <Typography variant="body2" fontWeight={600} color="#2a0f35">
                                      {item.productName}
                                    </Typography>
                                    <Typography variant="caption" color="#4c5454">
                                      Арт: {item.sku} • {item.categoryName}
                                    </Typography>
                                  </Box>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleRemoveProduct(item.productId)}
                                    sx={{ 
                                      color: '#ca0ec0',
                                      backgroundColor: 'rgba(202, 14, 192, 0.08)',
                                      '&:hover': {
                                        backgroundColor: 'rgba(202, 14, 192, 0.15)',
                                      },
                                      p: 1,
                                    }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Box>

                                <Grid container spacing={1.5}>
                                  <Grid size={{ xs: 5, sm: 4 }}>
                                    <TextField
                                      label="Кол-во"
                                      type="number"
                                      size="small"
                                      value={item.expectedQuantity}
                                      onChange={(e) => handleQuantityChange(item.productId, parseInt(e.target.value) || 0)}
                                      inputProps={{ min: 1, max: item.availableQuantity }}
                                      error={item.expectedQuantity > item.availableQuantity}
                                      helperText={item.expectedQuantity > item.availableQuantity ? `Макс: ${item.availableQuantity}` : ''}
                                      fullWidth
                                      sx={{
                                        '& .MuiOutlinedInput-root': {
                                          borderRadius: 4,
                                          backgroundColor: '#ffffff',
                                          fontSize: { xs: '0.85rem', sm: '0.95rem' },
                                        },
                                        '& .MuiInputLabel-root': {
                                          fontSize: { xs: '0.8rem', sm: '0.9rem' },
                                        },
                                      }}
                                    />
                                  </Grid>
                                  <Grid size={{ xs: 7, sm: 8 }}>
                                    <TextField
                                      label="Примечание"
                                      size="small"
                                      value={item.notes}
                                      onChange={(e) => handleNotesChange(item.productId, e.target.value)}
                                      placeholder="Необязательно"
                                      fullWidth
                                      sx={{
                                        '& .MuiOutlinedInput-root': {
                                          borderRadius: 4,
                                          backgroundColor: '#ffffff',
                                          fontSize: { xs: '0.85rem', sm: '0.95rem' },
                                        },
                                        '& .MuiInputLabel-root': {
                                          fontSize: { xs: '0.8rem', sm: '0.9rem' },
                                        },
                                      }}
                                    />
                                  </Grid>
                                </Grid>
                              </Card>
                            ))}
                          </Stack>
                        </Box>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}

          {/* Шаг 3: Фотографии и подтверждение */}
          {step === 2 && (
            <Stack spacing={3}>
              {/* Загрузка фото */}
              <Box>
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
                    {photos.length > 0 ? 'Добавить еще фотографии' : 'Прикрепить фотографии товаров'}
                  </Typography>
                  <Typography variant="caption" color="#4c5454" display="block" sx={{ mt: 1 }}>
                    {photos.length}/10 фотографий • Максимум 10MB на файл
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
              </Box>

              <Divider />

              {/* Сводка по перемещению */}
              <Card sx={{ 
                borderRadius: 4, 
                backgroundColor: 'rgba(63, 31, 75, 0.04)',
                border: '1px solid rgba(63, 31, 75, 0.1)',
              }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="subtitle2" color="#2a0f35" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleIcon sx={{ color: '#3f1f4b', fontSize: 20 }} />
                    Сводка по перемещению
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
                        {totalItems}
                      </Typography>
                      <Typography variant="caption" color="#4c5454">
                        единиц
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
                    
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                        Получатель
                      </Typography>
                      <Typography variant="h6" color="#674fb6" fontWeight={600} sx={{ fontSize: '1rem' }}>
                        {users.find(u => u.id === formData.toUserId)?.fullName?.split(' ')[0] || 'Не выбран'}
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed rgba(63, 31, 75, 0.2)' }}>
                    <Typography variant="body2" color="#2a0f35" fontWeight={500}>
                      {formData.title}
                    </Typography>
                    {formData.description && (
                      <Typography variant="caption" color="#4c5454" sx={{ mt: 1, display: 'block' }}>
                        {formData.description}
                      </Typography>
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
                disabled={
                  (step === 0 && (!formData.title || !formData.toUserId)) ||
                  (step === 1 && selectedProducts.length === 0)
                }
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
                disabled={loading || photos.length === 0}
                sx={{
                  borderRadius: 4,
                  backgroundColor: '#3f1f4b',
                  '&:hover': { backgroundColor: '#2a0f35' },
                  px: 4,
                }}
              >
                {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Создать перемещение'}
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
            Прервать создание?
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
              navigate('/movements');
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
            Подтверждение создания
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
              <Typography variant="body2" color="#2a0f35" fontWeight={500} sx={{ mb: 1 }}>
                {formData.title}
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="#4c5454" display="block">
                    Отправитель
                  </Typography>
                  <Typography variant="body2" color="#2a0f35">
                    {user?.fullName}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="#4c5454" display="block">
                    Получатель
                  </Typography>
                  <Typography variant="body2" color="#2a0f35">
                    {users.find(u => u.id === formData.toUserId)?.fullName}
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
                СОСТАВ ПЕРЕМЕЩЕНИЯ
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
                    {totalItems} шт.
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
            Создать перемещение
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог успеха */}
      <Dialog
        open={successDialog}
        onClose={() => {
          setSuccessDialog(false);
          navigate('/movements');
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
            Перемещение создано!
          </Typography>
          <Typography variant="body2" color="#4c5454">
            Заявка отправлена на подтверждение руководителю
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 4 }}>
          <Button
            variant="contained"
            onClick={() => {
              setSuccessDialog(false);
              navigate('/movements');
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
            К списку перемещений
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

export default CreateTransferPage;