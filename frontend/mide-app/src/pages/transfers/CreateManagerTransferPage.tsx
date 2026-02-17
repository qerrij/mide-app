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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  SelectChangeEvent,
  Avatar,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  Inventory as InventoryIcon,
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
  InventoryItem,
  getRoleName,
} from '../../types';

interface SelectedProduct {
  productId: number;
  expectedQuantity: number;
  availableQuantity: number;
  productName: string;
  notes: string;
  sku: string;
  categoryName: string;
  categoryId?: number;
}

const CreateManagerTransferPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Состояния шагов
  const [step, setStep] = useState(0);
  
  // Состояния загрузки
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Данные
  const [users, setUsers] = useState<User[]>([]);
  const [subordinateUsers, setSubordinateUsers] = useState<User[]>([]);
  const [senderInventory, setSenderInventory] = useState<InventoryItem[]>([]);
  const [inventoryProducts, setInventoryProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  // Выбор товаров
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<string>('');
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  
  // Данные формы
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    fromUserId: 0,
    toUserId: 0,
  });
  
  // Диалоги
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [successDialog, setSuccessDialog] = useState(false);
  const [exitDialog, setExitDialog] = useState(false);

  // Загрузка данных при монтировании
  useEffect(() => {
    loadData();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Скролл к верху при смене шага
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Загрузка инвентаря отправителя
  useEffect(() => {
    if (formData.fromUserId) {
      loadSenderInventory();
    } else {
      setSenderInventory([]);
      setInventoryProducts([]);
      setSelectedProducts([]);
    }
  }, [formData.fromUserId]);

  // Загрузка подчиненных пользователей
  useEffect(() => {
    if (user) {
      loadSubordinateUsers();
    }
  }, [user, users]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      
      const [usersData, productsData, categoriesData] = await Promise.all([
        userService.getAllUsersBasic(),
        productService.getAllProducts(),
        productService.getAllCategories(),
      ]);
      
      const fullUsers = usersData.map(u => ({
        id: u.id,
        fullName: u.fullName,
        role: u.role,
      } as User));
      
      setUsers(fullUsers);
      setInventoryProducts(productsData);
      setCategories(categoriesData);
      
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Ошибка при загрузке данных');
    } finally {
      setLoadingData(false);
    }
  };

  const loadSubordinateUsers = async () => {
    try {
      // В реальном приложении здесь должен быть API эндпоинт для получения подчиненных
      // Пока фильтруем на основе ролей для демонстрации
      const allUsers = await userService.getAllUsers();
      const subordinates = allUsers.filter(u => {
        if (user?.role === UserRole.OWNER) return true;
        if (user?.role === UserRole.ADMIN) return true;
        if (user?.role === UserRole.SENIOR_SELLER) {
          return u.role === UserRole.SELLER || u.role === UserRole.MENTOR;
        }
        if (user?.role === UserRole.MENTOR) {
          return u.role === UserRole.SELLER;
        }
        return false;
      });
      
      setSubordinateUsers(subordinates);
    } catch (error) {
      console.error('Error loading subordinates:', error);
    }
  };

  const loadSenderInventory = async () => {
    try {
      const inventory = await inventoryService.getUserInventory(formData.fromUserId);
      setSenderInventory(inventory.items || []);
      
      // Сбрасываем выбранные товары при смене отправителя
      setSelectedProducts([]);
      setSelectedCategoryId('all');
      setSelectedProductId('');
      setQuantity('');
      
    } catch (error) {
      console.error('Error loading sender inventory:', error);
      setSenderInventory([]);
    }
  };

  // Получить доступное количество товара у отправителя
  const getAvailableQuantity = (productId: number): number => {
    const item = senderInventory.find(i => i.productId === productId);
    return item ? item.quantity - (item.reservedQuantity || 0) : 0;
  };

  // Фильтрация доступных товаров для отправителя
  const getAvailableProductsForSender = (): Product[] => {
    return inventoryProducts.filter(product => {
      const availableQty = getAvailableQuantity(product.id);
      return availableQty > 0;
    });
  };

  // Получить уникальные категории из доступных товаров
  const getAvailableCategories = (): any[] => {
    const availableProducts = getAvailableProductsForSender();
    const categoryIds = new Set(availableProducts.map(p => p.categoryId));
    return categories.filter(cat => categoryIds.has(cat.id));
  };

  // Получить информацию о товаре
  const getProductInfo = (productId: number): { name: string; sku: string; categoryName: string; categoryId?: number } => {
    const product = inventoryProducts.find(p => p.id === productId);
    if (!product) return { name: '', sku: '', categoryName: '' };
    
    const category = categories.find(c => c.id === product.categoryId);
    return {
      name: product.name,
      sku: product.sku,
      categoryName: category ? category.name : '',
      categoryId: product.categoryId,
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
        categoryId: productInfo.categoryId,
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

  // Валидация шагов
  const validateStep = (stepNumber: number): boolean => {
    setError(null);

    switch (stepNumber) {
      case 0:
        if (!formData.title.trim()) {
          setError('Введите название запроса');
          return false;
        }
        if (!formData.fromUserId) {
          setError('Выберите у кого запросить товары');
          return false;
        }
        if (!formData.toUserId) {
          setError('Выберите кому направить товары');
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
        return true;

      default:
        return true;
    }
  };

  // Навигация по шагам
  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  // Отправка формы
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
        items: selectedProducts.map(p => ({
          productId: p.productId,
          expectedQuantity: p.expectedQuantity,
          notes: p.notes || undefined,
        })),
      };

      await transferService.createManagerRequest(transferData);
      
      setSuccessDialog(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Ошибка при создании запроса');
    } finally {
      setLoading(false);
      setConfirmDialog(false);
    }
  };

  // Обработчик выхода
  const handleExitClick = () => {
    const hasData = formData.title || formData.description || formData.fromUserId || 
                   formData.toUserId || selectedProducts.length > 0;
    if (hasData) {
      setExitDialog(true);
    } else {
      navigate('/movements');
    }
  };

  // Получение имени пользователя по ID
  const getUserName = (userId: number): string => {
    const foundUser = users.find(u => u.id === userId);
    return foundUser ? foundUser.fullName : 'Не выбран';
  };

  // Доступные товары и категории
  const availableProducts = getAvailableProductsForSender();
  const availableCategories = getAvailableCategories();
  
  const filteredProducts = selectedCategoryId === 'all'
    ? availableProducts
    : availableProducts.filter(p => p.categoryId === selectedCategoryId);

  // Показываем блок добавления товара только когда выбрана категория
  const showProductSelect = selectedCategoryId !== 'all' && availableProducts.length > 0;
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
            {step === 2 && 'Подтверждение запроса'}
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

          {/* ШАГ 1: Основная информация */}
          {step === 0 && (
            <Stack spacing={3}>
              <TextField
                fullWidth
                label="Название запроса *"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Например: Запрос товаров для магазина"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 4,
                    backgroundColor: '#f8f7fa',
                  },
                }}
              />

              <TextField
                fullWidth
                label="Описание запроса"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={3}
                placeholder="Укажите цель и особенности перемещения..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 4,
                    backgroundColor: '#f8f7fa',
                  },
                }}
              />

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel id="from-user-label">У кого запросить товары *</InputLabel>
                    <Select
                      labelId="from-user-label"
                      value={formData.fromUserId}
                      label="У кого запросить товары *"
                      onChange={(e: SelectChangeEvent<number>) => setFormData({ ...formData, fromUserId: Number(e.target.value) })}
                      sx={{
                        borderRadius: 4,
                        backgroundColor: '#f8f7fa',
                      }}
                    >
                      <MenuItem value={0}>Выберите пользователя</MenuItem>
                      {subordinateUsers.map((u) => (
                        <MenuItem key={u.id} value={u.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PersonIcon fontSize="small" sx={{ color: '#674fb6' }} />
                            <span>{u.fullName}</span>
                            <Chip 
                              label={getRoleName(u.role)} 
                              size="small" 
                              sx={{ 
                                ml: 1, 
                                backgroundColor: 'rgba(103, 79, 182, 0.1)',
                                color: '#674fb6',
                                fontSize: '0.7rem',
                              }} 
                            />
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel id="to-user-label">Кому направить товары *</InputLabel>
                    <Select
                      labelId="to-user-label"
                      value={formData.toUserId}
                      label="Кому направить товары *"
                      onChange={(e: SelectChangeEvent<number>) => setFormData({ ...formData, toUserId: Number(e.target.value) })}
                      sx={{
                        borderRadius: 4,
                        backgroundColor: '#f8f7fa',
                      }}
                    >
                      <MenuItem value={0}>Выберите пользователя</MenuItem>
                      {users
                        .filter(u => u.id !== formData.fromUserId)
                        .map((u) => (
                          <MenuItem key={u.id} value={u.id}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <PersonIcon fontSize="small" sx={{ color: '#3f1f4b' }} />
                              <span>{u.fullName}</span>
                              <Chip 
                                label={getRoleName(u.role)} 
                                size="small" 
                                sx={{ 
                                  ml: 1, 
                                  backgroundColor: 'rgba(63, 31, 75, 0.1)',
                                  color: '#3f1f4b',
                                  fontSize: '0.7rem',
                                }} 
                              />
                            </Box>
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                </Grid>

                {formData.fromUserId > 0 && (
                  <Grid size={{ xs: 12 }}>
                    <Card variant="outlined" sx={{ 
                      p: 2, 
                      borderRadius: 4,
                      borderColor: 'rgba(103, 79, 182, 0.2)',
                      backgroundColor: '#f8f7fa',
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <InventoryIcon sx={{ color: '#674fb6' }} />
                        <Typography variant="subtitle2" color="#2a0f35" fontWeight={600}>
                          Информация об отправителе
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="#4c5454">
                        У пользователя <strong>{getUserName(formData.fromUserId)}</strong> в наличии{' '}
                        <strong>{senderInventory.length}</strong> позиций товаров.
                        {senderInventory.length === 0 && ' Нет доступных товаров для перемещения.'}
                      </Typography>
                    </Card>
                  </Grid>
                )}
              </Grid>
            </Stack>
          )}

          {/* ШАГ 2: Выбор товаров */}
          {step === 1 && (
            <>
              {loadingData ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress sx={{ color: '#674fb6' }} />
                </Box>
              ) : (
                <>
                  {!formData.fromUserId ? (
                    <Alert severity="info" sx={{ borderRadius: 4 }}>
                      Сначала выберите отправителя на предыдущем шаге
                    </Alert>
                  ) : availableProducts.length === 0 ? (
                    <Alert severity="warning" sx={{ borderRadius: 4 }}>
                      У выбранного пользователя нет доступных товаров для перемещения
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
                                {/* Название товара и кнопка удаления в одной строке */}
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

                                {/* Поля ввода: количество и примечание в одной строке на десктопе, в две строки на мобилке */}
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

          {/* ШАГ 3: Подтверждение запроса */}
          {step === 2 && (
            <Stack spacing={3}>
              {/* Карточки пользователей */}
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card sx={{ 
                    borderRadius: 4, 
                    backgroundColor: 'rgba(103, 79, 182, 0.04)',
                    border: '1px solid rgba(103, 79, 182, 0.2)',
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Avatar sx={{ bgcolor: '#674fb6', width: 32, height: 32 }}>
                          <PersonIcon fontSize="small" />
                        </Avatar>
                        <Typography variant="subtitle1" color="#2a0f35" fontWeight={600}>
                          Отправитель
                        </Typography>
                      </Box>
                      <Typography variant="body1" fontWeight={500} color="#2a0f35">
                        {getUserName(formData.fromUserId)}
                      </Typography>
                      <Typography variant="caption" color="#4c5454">
                        Запросить товары у этого пользователя
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Card sx={{ 
                    borderRadius: 4, 
                    backgroundColor: 'rgba(63, 31, 75, 0.04)',
                    border: '1px solid rgba(63, 31, 75, 0.2)',
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Avatar sx={{ bgcolor: '#3f1f4b', width: 32, height: 32 }}>
                          <PersonIcon fontSize="small" />
                        </Avatar>
                        <Typography variant="subtitle1" color="#2a0f35" fontWeight={600}>
                          Получатель
                        </Typography>
                      </Box>
                      <Typography variant="body1" fontWeight={500} color="#2a0f35">
                        {getUserName(formData.toUserId)}
                      </Typography>
                      <Typography variant="caption" color="#4c5454">
                        Направить товары этому пользователю
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Divider />

              {/* Сводка по запросу */}
              <Card sx={{ 
                borderRadius: 4, 
                backgroundColor: 'rgba(63, 31, 75, 0.04)',
                border: '1px solid rgba(63, 31, 75, 0.1)',
              }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="subtitle2" color="#2a0f35" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleIcon sx={{ color: '#3f1f4b', fontSize: 20 }} />
                    Сводка по запросу
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
                        {totalItems}
                      </Typography>
                      <Typography variant="caption" color="#4c5454">
                        единиц
                      </Typography>
                    </Grid>
                    
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                        Название
                      </Typography>
                      <Typography variant="body2" color="#2a0f35" fontWeight={500} noWrap>
                        {formData.title}
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  {formData.description && (
                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed rgba(63, 31, 75, 0.2)' }}>
                      <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                        Описание
                      </Typography>
                      <Typography variant="body2" color="#2a0f35">
                        {formData.description}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* Список товаров для подтверждения */}
              <Box>
                <Typography variant="subtitle2" color="#2a0f35" fontWeight={600} sx={{ mb: 2 }}>
                  Товары в запросе:
                </Typography>
                <Stack spacing={1.5}>
                  {selectedProducts.map((item) => (
                    <Box
                      key={item.productId}
                      sx={{
                        p: 2,
                        borderRadius: 4,
                        backgroundColor: '#f8f7fa',
                        border: '1px solid rgba(103, 79, 182, 0.1)',
                      }}
                    >
                      <Grid container spacing={1} alignItems="center">
                        <Grid size={{ xs: 8 }}>
                          <Typography variant="body2" fontWeight={500} color="#2a0f35">
                            {item.productName}
                          </Typography>
                          <Typography variant="caption" color="#4c5454">
                            Арт: {item.sku}
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 4 }}>
                          <Chip
                            label={`${item.expectedQuantity} шт.`}
                            size="small"
                            sx={{
                              backgroundColor: '#674fb6',
                              color: 'white',
                              fontWeight: 500,
                              width: '100%',
                            }}
                          />
                        </Grid>
                        {item.notes && (
                          <Grid size={{ xs: 12 }}>
                            <Typography variant="caption" color="#4c5454" sx={{ fontStyle: 'italic' }}>
                              Примечание: {item.notes}
                            </Typography>
                          </Grid>
                        )}
                      </Grid>
                    </Box>
                  ))}
                </Stack>
              </Box>
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
                  (step === 0 && (!formData.title || !formData.fromUserId || !formData.toUserId)) ||
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
                disabled={loading}
                sx={{
                  borderRadius: 4,
                  backgroundColor: '#3f1f4b',
                  '&:hover': { backgroundColor: '#2a0f35' },
                  px: 4,
                }}
              >
                {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Создать запрос'}
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

      {/* Диалог подтверждения создания */}
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
                    {getUserName(formData.fromUserId)}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="#4c5454" display="block">
                    Получатель
                  </Typography>
                  <Typography variant="body2" color="#2a0f35">
                    {getUserName(formData.toUserId)}
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
                СОСТАВ ЗАПРОСА
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
                    Статус
                  </Typography>
                  <Typography variant="body1" color="#2a0f35" fontWeight={600}>
                    Ожидание
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            <Typography variant="caption" color="#4c5454" sx={{ textAlign: 'center' }}>
              После создания запроса, пользователь {getUserName(formData.fromUserId).split(' ')[0]} 
              получит уведомление и должен будет подтвердить наличие товаров.
            </Typography>
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
            Создать запрос
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
            Запрос создан!
          </Typography>
          <Typography variant="body2" color="#4c5454">
            Пользователь {getUserName(formData.fromUserId).split(' ')[0]} получит уведомление
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
    </Box>
  );
};

export default CreateManagerTransferPage;