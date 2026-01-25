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
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  ArrowBack as BackIcon,
  PhotoCamera as PhotoIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Visibility as ViewIcon,
  Inventory as InventoryIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { transferService } from '../api/transferService';
import { userService } from '../api/userService';
import { productService } from '../api/productService';
import { inventoryService } from '../api/inventoryService';
import {
  TransferItemBase,
  User,
  UserRole,
  Product,
  TransferRequestType,
  InventoryItem,
  getRoleName,
} from '../types';

const CreateTransferPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [userInventory, setUserInventory] = useState<InventoryItem[]>([]);
  const [inventoryProducts, setInventoryProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    fromUserId: user?.id || 0,
    toUserId: 0,
    executorId: undefined as number | undefined,
    requestType: TransferRequestType.USER_REQUEST,
  });
  
  const [items, setItems] = useState<TransferItemBase[]>([
    { productId: 0, expectedQuantity: 1, notes: '' }
  ]);
  
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [searchQuery, setSearchQuery] = useState('');
  
  // Модалки
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [viewImageOpen, setViewImageOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  
  const steps = [
    'Основная информация',
    'Выбор товаров',
    'Фотографии и подтверждение',
  ];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (formData.fromUserId) {
      loadUserInventory();
    }
  }, [formData.fromUserId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const usersData = await userService.getAllUsersBasic();
      
      // Фильтруем пользователей: не показываем себя как получателя
      const availableUsers = usersData
        .map(u => ({
          id: u.id,
          fullName: u.fullName,
          role: u.role,
        } as User))
        .filter(u => u.id !== user?.id);
      
      setUsers(availableUsers);
      
      // Загружаем категории для фильтрации
      const categoriesData = await productService.getAllCategories();
      setCategories(categoriesData);
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

const loadUserInventory = async () => {
  try {
    const inventory = await inventoryService.getMyInventory();
    
    // Фильтруем только товары, которые принадлежат текущему пользователю
    // Используем поле userId вместо ownerId
    const myItems = inventory.items.filter((item: InventoryItem) => 
      item.userId === user?.id
    );
    
    setUserInventory(myItems);
    
    // Загружаем информацию о продуктах
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

  const getFilteredProducts = () => {
    if (!searchQuery.trim()) {
      return inventoryProducts;
    }
    
    const query = searchQuery.toLowerCase();
    return inventoryProducts.filter(product => 
      product.name.toLowerCase().includes(query) ||
      product.sku.toLowerCase().includes(query) ||
      (product.description?.toLowerCase() || '').includes(query)
    );
  };

  const getProductAvailability = (productId: number) => {
    const item = userInventory.find(i => i.productId === productId);
    return item ? item.quantity - (item.reservedQuantity || 0) : 0;
  };

  const validateStep = (step: number): boolean => {
    const newErrors: { [key: string]: string } = {};
    
    if (step === 0) {
      if (!formData.title.trim()) newErrors.title = 'Введите название перемещения';
      if (!formData.toUserId) newErrors.toUserId = 'Выберите получателя';
      if (formData.fromUserId === formData.toUserId) {
        newErrors.toUserId = 'Получатель не может быть отправителем';
      }
    }
    
    if (step === 1) {
      if (items.length === 0) {
        newErrors.items = 'Добавьте хотя бы один товар';
      }
      
      items.forEach((item, index) => {
        if (!item.productId) {
          newErrors[`item${index}_product`] = 'Выберите товар';
        }
        if (!item.expectedQuantity || item.expectedQuantity <= 0) {
          newErrors[`item${index}_quantity`] = 'Введите корректное количество';
        }
        
        const available = getProductAvailability(item.productId);
        if (available < item.expectedQuantity) {
          newErrors[`item${index}_quantity`] = `Недостаточно товара. Доступно: ${available} шт.`;
        }
      });
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(activeStep)) return;
    
    if (activeStep === steps.length - 1) {
      // Проверяем наличие фотографий на последнем шаге
      if (files.length === 0) {
        setErrors({ files: 'Необходимо прикрепить фотографии товаров' });
        return;
      }
      setConfirmDialogOpen(true);
    } else {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(2)) return;
    
    try {
      setSubmitting(true);
      
      const transferData = {
        ...formData,
        items: items.filter(item => item.productId > 0 && item.expectedQuantity > 0),
      };
      
      await transferService.createUserRequest(transferData, files);
      
      setConfirmDialogOpen(false);
      setSuccessDialogOpen(true);
      
    } catch (error: any) {
      console.error('Error creating transfer:', error);
      setConfirmDialogOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddItem = () => {
    setItems([...items, { productId: 0, expectedQuantity: 1, notes: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: keyof TransferItemBase, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
    
    if (errors[`item${index}_${field}`]) {
      const newErrors = { ...errors };
      delete newErrors[`item${index}_${field}`];
      setErrors(newErrors);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      
      for (const file of newFiles) {
        if (!file.type.startsWith('image/')) {
          alert(`Файл "${file.name}" не является изображением. Разрешены только файлы изображений (JPEG, PNG, GIF, WebP).`);
          return;
        }
        
        if (file.size > 10 * 1024 * 1024) {
          alert(`Файл "${file.name}" слишком большой. Максимальный размер файла: 10MB.`);
          return;
        }
      }
      
      if (files.length + newFiles.length > 10) {
        alert('Максимальное количество файлов: 10');
        return;
      }
      
      setFiles([...files, ...newFiles]);
      
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      setFilePreviews([...filePreviews, ...newPreviews]);
      
      if (errors.files) {
        const newErrors = { ...errors };
        delete newErrors.files;
        setErrors(newErrors);
      }
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    const newPreviews = [...filePreviews];
    
    URL.revokeObjectURL(newPreviews[index]);
    
    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);
    
    setFiles(newFiles);
    setFilePreviews(newPreviews);
  };

  const getProductName = (productId: number) => {
    const product = inventoryProducts.find(p => p.id === productId);
    return product ? product.name : `Товар #${productId}`;
  };

  const getProductSku = (productId: number) => {
    const product = inventoryProducts.find(p => p.id === productId);
    return product ? product.sku : '';
  };

  const getProductCategoryName = (productId: number) => {
    const product = inventoryProducts.find(p => p.id === productId);
    if (!product) return '';
    
    const category = categories.find(c => c.id === product.categoryId);
    return category ? category.name : '';
  };

  const openImageDialog = (preview: string) => {
    setSelectedImage(preview);
    setViewImageOpen(true);
  };

  const closeImageDialog = () => {
    setViewImageOpen(false);
    setSelectedImage('');
  };

  const handleSuccessClose = () => {
    setSuccessDialogOpen(false);
    navigate('/movements');
  };

  if (loading && !users.length) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate('/movements')}
          sx={{ mb: 2 }}
        >
          Назад к перемещениям
        </Button>
        <Typography variant="h4" component="h1" gutterBottom color="#2a0f35">
          Создание перемещения
        </Typography>
        <Typography variant="subtitle1" color="#4c5454">
          Заполните информацию о перемещении товаров
        </Typography>
      </Box>

      {!user?.id && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Пользователь не авторизован
        </Alert>
      )}

      <Stepper activeStep={activeStep} orientation="vertical" sx={{ mb: 4 }}>
        {steps.map((label, index) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
            <StepContent>
              {index === 0 && (
                <Paper sx={{ p: 3, mt: 2 }}>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        label="Название перемещения *"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        error={!!errors.title}
                        helperText={errors.title}
                        placeholder="Например: Перемещение товаров в магазин №1"
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        label="Описание"
                        multiline
                        rows={3}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Дополнительная информация о перемещении..."
                      />
                    </Grid>
                    
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Card variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                          Отправитель
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PersonIcon color="primary" />
                          <Typography variant="body1" fontWeight={500}>
                            {user?.fullName || 'Вы'}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="textSecondary">
                          ID: {user?.id} • {getRoleName(user?.role || UserRole.SELLER)}
                        </Typography>
                      </Card>
                    </Grid>
                    
                    <Grid size={{ xs: 12, md: 6 }}>
                      <FormControl fullWidth error={!!errors.toUserId}>
                        <InputLabel>Получатель *</InputLabel>
                        <Select
                          value={formData.toUserId}
                          label="Получатель *"
                          onChange={(e) => setFormData({ ...formData, toUserId: Number(e.target.value) })}
                        >
                          <MenuItem value={0}>Выберите получателя</MenuItem>
                          {users.map((u) => (
                            <MenuItem key={u.id} value={u.id}>
                              {u.fullName} ({getRoleName(u.role)})
                            </MenuItem>
                          ))}
                        </Select>
                        {errors.toUserId && (
                          <Typography color="error" variant="caption">
                            {errors.toUserId}
                          </Typography>
                        )}
                      </FormControl>
                    </Grid>
                    
                    <Grid size={{ xs: 12, md: 6 }}>
                      <FormControl fullWidth>
                        <InputLabel>Курьер</InputLabel>
                        <Select
                          value={formData.executorId || ''}
                          label="Курьер"
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            executorId: e.target.value ? Number(e.target.value) : undefined 
                          })}
                        >
                          <MenuItem value="">Не указан (отправитель)</MenuItem>
                          {users.map((u) => (
                            <MenuItem key={u.id} value={u.id}>
                              {u.fullName} ({getRoleName(u.role)})
                            </MenuItem>
                          ))}
                        </Select>
                        <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                          Кто будет физически перемещать товары
                        </Typography>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Paper>
              )}
              
              {index === 1 && (
                <Paper sx={{ p: 3, mt: 2 }}>
                  <Typography variant="h6" gutterBottom color="#2a0f35">
                    Выбор товаров из вашего инвентаря
                  </Typography>
                  
                  {userInventory.length === 0 ? (
                    <Alert severity="info" sx={{ mb: 3 }}>
                      Ваш инвентарь пуст. Невозможно создать перемещение без товаров.
                    </Alert>
                  ) : (
                    <>
                      <TextField
                        fullWidth
                        placeholder="Поиск товаров по названию или артикулу..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        sx={{ mb: 3 }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon />
                            </InputAdornment>
                          ),
                        }}
                      />
                      
                      {errors.items && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                          {errors.items}
                        </Alert>
                      )}
                      
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Товар *</TableCell>
                              <TableCell>Категория</TableCell>
                              <TableCell>Артикул</TableCell>
                              <TableCell>Доступно</TableCell>
                              <TableCell>Количество *</TableCell>
                              <TableCell>Примечание</TableCell>
                              <TableCell width={50}></TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {items.map((item, index) => {
                              const available = getProductAvailability(item.productId);
                              const isInvalid = available < item.expectedQuantity;
                              const product = inventoryProducts.find(p => p.id === item.productId);
                              
                              return (
                                <TableRow key={index}>
                                  <TableCell>
                                    <FormControl fullWidth error={!!errors[`item${index}_product`]}>
                                      <Select
                                        value={item.productId}
                                        onChange={(e) => handleItemChange(index, 'productId', Number(e.target.value))}
                                        size="small"
                                        displayEmpty
                                      >
                                        <MenuItem value={0}>
                                          <em>Выберите товар</em>
                                        </MenuItem>
                                        {getFilteredProducts().map((product) => {
                                          const availableQty = getProductAvailability(product.id);
                                          return (
                                            <MenuItem 
                                              key={product.id} 
                                              value={product.id}
                                              disabled={availableQty === 0}
                                            >
                                              {product.name} {availableQty === 0 && '(нет в наличии)'}
                                            </MenuItem>
                                          );
                                        })}
                                      </Select>
                                      {errors[`item${index}_product`] && (
                                        <Typography color="error" variant="caption">
                                          {errors[`item${index}_product`]}
                                        </Typography>
                                      )}
                                    </FormControl>
                                  </TableCell>
                                  <TableCell>
                                    {product ? getProductCategoryName(product.id) : '-'}
                                  </TableCell>
                                  <TableCell>
                                    {product ? product.sku : '-'}
                                  </TableCell>
                                  <TableCell>
                                    {item.productId > 0 ? (
                                      <Chip
                                        label={`${available} шт.`}
                                        size="small"
                                        color={
                                          available === 0 ? 'error' : 
                                          available < item.expectedQuantity ? 'warning' : 'success'
                                        }
                                        variant={isInvalid ? 'outlined' : 'filled'}
                                      />
                                    ) : '-'}
                                  </TableCell>
                                  <TableCell>
                                    <TextField
                                      type="number"
                                      value={item.expectedQuantity}
                                      onChange={(e) => handleItemChange(index, 'expectedQuantity', Number(e.target.value))}
                                      size="small"
                                      error={!!errors[`item${index}_quantity`] || isInvalid}
                                      helperText={
                                        errors[`item${index}_quantity`] || 
                                        (isInvalid ? `Максимум: ${available} шт.` : '')
                                      }
                                      inputProps={{ 
                                        min: 1,
                                        max: available
                                      }}
                                      sx={{ width: '100px' }}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <TextField
                                      value={item.notes || ''}
                                      onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                                      size="small"
                                      placeholder="Примечание"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleRemoveItem(index)}
                                      disabled={items.length === 1}
                                      color="error"
                                    >
                                      <DeleteIcon />
                                    </IconButton>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      
                      <Button
                        startIcon={<AddIcon />}
                        onClick={handleAddItem}
                        sx={{ mt: 2 }}
                        disabled={getFilteredProducts().length === 0}
                      >
                        Добавить товар
                      </Button>
                      
                      <Divider sx={{ my: 3 }} />
                      
                      <Alert severity="info">
                        Вы можете выбрать только товары, которые есть в вашем инвентаре.
                        Доступное количество учитывает уже зарезервированные товары.
                      </Alert>
                    </>
                  )}
                </Paper>
              )}
              
              {index === 2 && (
                <Paper sx={{ p: 3, mt: 2 }}>
                  <Typography variant="h6" gutterBottom color="#2a0f35">
                    Фотографии товаров *
                  </Typography>
                  
                  {errors.files && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {errors.files}
                    </Alert>
                  )}
                  
                  <Alert severity="warning" sx={{ mb: 3 }}>
                    Для создания перемещения необходимо прикрепить фотографии всех товаров.
                    Разрешены только изображения (JPEG, PNG, GIF, WebP), максимум 10 файлов по 10MB каждый.
                  </Alert>
                  
                  <Box sx={{ mb: 3 }}>
                    <input
                      accept="image/*"
                      style={{ display: 'none' }}
                      id="photo-upload"
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                    />
                    <label htmlFor="photo-upload">
                      <Button
                        variant="contained"
                        component="span"
                        startIcon={<PhotoIcon />}
                        sx={{ mb: 2 }}
                      >
                        Загрузить фотографии
                      </Button>
                    </label>
                    
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 2 }}>
                      Загружено фотографий: {files.length} из 10
                    </Typography>
                    
                    {filePreviews.length > 0 && (
                      <ImageList cols={4} gap={8} sx={{ mb: 2 }}>
                        {filePreviews.map((preview, index) => (
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
                                  <IconButton
                                    size="small"
                                    onClick={() => openImageDialog(preview)}
                                    sx={{ color: 'white', backgroundColor: 'rgba(0,0,0,0.5)' }}
                                  >
                                    <ViewIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => removeFile(index)}
                                    sx={{ color: 'white', backgroundColor: 'rgba(0,0,0,0.5)' }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Stack>
                              }
                              actionPosition="right"
                            />
                            <Typography variant="caption" sx={{ 
                              display: 'block',
                              textAlign: 'center',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              px: 1
                            }}>
                              {files[index].name}
                            </Typography>
                          </ImageListItem>
                        ))}
                      </ImageList>
                    )}
                  </Box>
                  
                  <Divider sx={{ my: 3 }} />
                  
                  <Typography variant="h6" gutterBottom color="#2a0f35">
                    Подтверждение перемещения
                  </Typography>
                  
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                            Отправитель
                          </Typography>
                          <Typography variant="body1" fontWeight={500}>
                            {user?.fullName}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {getRoleName(user?.role || UserRole.SELLER)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                            Получатель
                          </Typography>
                          <Typography variant="body1" fontWeight={500}>
                            {users.find(u => u.id === formData.toUserId)?.fullName || 'Не указан'}
                          </Typography>
                          {formData.toUserId > 0 && (
                            <Typography variant="caption" color="textSecondary">
                              {getRoleName(users.find(u => u.id === formData.toUserId)?.role || UserRole.SELLER)}
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                  
                  {formData.executorId && formData.executorId !== user?.id && (
                    <Card variant="outlined" sx={{ mb: 3 }}>
                      <CardContent>
                        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                          Курьер
                        </Typography>
                        <Typography variant="body1">
                          {users.find(u => u.id === formData.executorId)?.fullName}
                        </Typography>
                      </CardContent>
                    </Card>
                  )}
                  
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Товары для перемещения:
                  </Typography>
                  <TableContainer sx={{ mb: 3 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Товар</TableCell>
                          <TableCell>Категория</TableCell>
                          <TableCell>Артикул</TableCell>
                          <TableCell align="right">Количество</TableCell>
                          <TableCell>Примечание</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {items.filter(item => item.productId > 0).map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{getProductName(item.productId)}</TableCell>
                            <TableCell>{getProductCategoryName(item.productId)}</TableCell>
                            <TableCell>{getProductSku(item.productId)}</TableCell>
                            <TableCell align="right">
                              <Chip
                                label={`${item.expectedQuantity} шт.`}
                                size="small"
                                color={
                                  getProductAvailability(item.productId) < item.expectedQuantity 
                                    ? 'error' 
                                    : 'primary'
                                }
                              />
                            </TableCell>
                            <TableCell>{item.notes || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              )}
              
              <Box sx={{ mb: 2, mt: 2 }}>
                <div>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    sx={{ mt: 1, mr: 1 }}
                    disabled={loading || (activeStep === 1 && userInventory.length === 0)}
                    startIcon={activeStep === steps.length - 1 ? <SaveIcon /> : undefined}
                  >
                    {activeStep === steps.length - 1 ? (
                      'Создать перемещение'
                    ) : (
                      'Далее'
                    )}
                  </Button>
                  <Button
                    disabled={activeStep === 0 || loading}
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

      {/* Модалка подтверждения создания */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => !submitting && setConfirmDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Подтверждение создания перемещения</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Вы уверены, что хотите создать перемещение со следующими параметрами?
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>
              <Typography variant="subtitle2" color="textSecondary">
                Отправитель
              </Typography>
              <Typography variant="body2">
                {user?.fullName}
              </Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="subtitle2" color="textSecondary">
                Получатель
              </Typography>
              <Typography variant="body2">
                {users.find(u => u.id === formData.toUserId)?.fullName}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" color="textSecondary">
                Количество товаров
              </Typography>
              <Typography variant="body2">
                {items.filter(item => item.productId > 0).length} позиций, 
                всего {items.reduce((sum, item) => sum + item.expectedQuantity, 0)} единиц
              </Typography>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" color="textSecondary">
                Фотографии
              </Typography>
              <Typography variant="body2">
                {files.length} файлов
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={() => setConfirmDialogOpen(false)} 
            variant="outlined"
            disabled={submitting}
          >
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            {submitting ? 'Создание...' : 'Создать перемещение'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Модалка успешного создания */}
      <Dialog
        open={successDialogOpen}
        onClose={handleSuccessClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Перемещение успешно создано!</DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CheckCircleIcon sx={{ fontSize: 60, color: '#4caf50', mb: 2 }} />
            <Typography variant="body1" sx={{ mb: 2 }}>
              Перемещение "{formData.title}" успешно создано и отправлено на подтверждение руководителю.
            </Typography>
            <Typography variant="body2" color="textSecondary">
              ID перемещения будет присвоен после подтверждения руководителем.
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
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>

      {/* Модалка просмотра изображения */}
      <Dialog
        open={viewImageOpen}
        onClose={closeImageDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Просмотр изображения</Typography>
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
    </Container>
  );
};

export default CreateTransferPage;